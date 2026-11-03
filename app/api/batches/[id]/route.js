import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const DB_NAME = "sales";
const COLLECTIONS = {
  batches: "batches",
  assignments: "student_batch_assignments",
  students: "dm",
  tools: "tools",
  trainers: "trainers",
  courses: "courses",
};

const str = (value) => (value == null ? "" : String(value));

const toObjectId = (value) =>
  ObjectId.isValid(value) ? new ObjectId(value) : null;

const fail = (message, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

function paymentSummary(assignment) {
  const payments = Array.isArray(assignment.payments)
    ? assignment.payments
    : [];

  const legacyPaid =
    Number(
      assignment.legacyPaidFee ??
        (assignment.payments ? 0 : assignment.paidFee)
    ) || 0;

  const paymentTotal = payments.reduce(
    (sum, payment) => sum + (Number(payment.amount) || 0),
    0
  );

  const totalFee = Number(assignment.totalFee) || 0;
  const paidFee = legacyPaid + paymentTotal;

  return {
    totalFee,
    paidFee,
    balanceDue: Math.max(totalFee - paidFee, 0),
    paymentStatus:
      totalFee > 0 && paidFee >= totalFee
        ? "paid"
        : paidFee > 0
          ? "partial"
          : "due",
    payments: payments.map((payment) => ({
      id: str(payment._id || payment.id),
      amount: Number(payment.amount) || 0,
      paidAt: payment.paidAt || null,
      createdAt: payment.createdAt || null,
    })),
  };
}

// Batch-level completion map from the batch document: toolId -> completedAt.
function batchCompletionMap(batch) {
  const list = Array.isArray(batch.toolCompletions) ? batch.toolCompletions : [];
  return new Map(list.map((item) => [str(item.toolId), item.completedAt || null]));
}

// A student's progress, derived from the batch's completed tools.
// Their batch is complete when every tool they are enrolled in is complete.
function completionSummary(assignment, completionMap) {
  const toolIds = (assignment.toolIds || []).map(str);
  const completedToolIds = toolIds.filter((id) => completionMap.has(id));
  const batchCompleted =
    toolIds.length > 0 && completedToolIds.length === toolIds.length;

  const times = completedToolIds
    .map((id) => completionMap.get(id))
    .filter(Boolean)
    .map((value) => new Date(value).getTime());

  return {
    completedToolIds,
    batchCompleted,
    batchCompletedAt:
      batchCompleted && times.length ? new Date(Math.max(...times)) : null,
    progress: { done: completedToolIds.length, total: toolIds.length },
  };
}

// Saves batchCompleted on every student assignment of this batch,
// based on which batch tools are completed.
async function syncStudentsCompletion(assignments, batchId, batch, now) {
  const completionMap = batchCompletionMap(batch);
  const list = await assignments.find({ batchId }).toArray();

  for (const doc of list) {
    const summary = completionSummary(doc, completionMap);
    if (summary.batchCompleted === Boolean(doc.batchCompleted)) continue;

    await assignments.updateOne(
      { _id: doc._id },
      {
        $set: {
          batchCompleted: summary.batchCompleted,
          batchCompletedAt: summary.batchCompletedAt,
          updatedAt: now,
        },
      }
    );
  }
}

async function getDb() {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

// GET: Complete batch details.
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const batchObjectId = toObjectId(id);

    if (!batchObjectId) return fail("Invalid batch ID");

    const db = await getDb();

    const batch = await db
      .collection(COLLECTIONS.batches)
      .findOne({ _id: batchObjectId });

    if (!batch) return fail("Batch not found", 404);

    const assignments = await db
      .collection(COLLECTIONS.assignments)
      .find({ batchId: batchObjectId })
      .sort({ assignedAt: -1 })
      .toArray();

    const studentIds = [
      ...new Set([
        ...(batch.studentIds || []).map(str),
        ...assignments.map((item) => str(item.studentId)),
      ]),
    ].filter(ObjectId.isValid);

    const toolIds = [...new Set((batch.tools || []).map(str))];

    const trainerIds = [
      ...new Set([
        ...(batch.trainers || []).map(str),
        ...(batch.toolTrainerAssignments || []).map((item) =>
          str(item.trainerId)
        ),
      ]),
    ].filter(ObjectId.isValid);

    const [students, tools, trainers, course] = await Promise.all([
      studentIds.length
        ? db
            .collection(COLLECTIONS.students)
            .find({ _id: { $in: studentIds.map((sid) => new ObjectId(sid)) } })
            .toArray()
        : [],

      toolIds.length
        ? db
            .collection(COLLECTIONS.tools)
            .find({ _id: { $in: toolIds.map((tid) => new ObjectId(tid)) } })
            .toArray()
        : [],

      trainerIds.length
        ? db
            .collection(COLLECTIONS.trainers)
            .find({ _id: { $in: trainerIds.map((tid) => new ObjectId(tid)) } })
            .toArray()
        : [],

      batch.courseId && ObjectId.isValid(str(batch.courseId))
        ? db.collection(COLLECTIONS.courses).findOne({
            _id: new ObjectId(str(batch.courseId)),
          })
        : null,
    ]);

    const studentMap = new Map(
      students.map((student) => [str(student._id), student])
    );
    const toolMap = new Map(tools.map((tool) => [str(tool._id), tool]));
    const trainerMap = new Map(
      trainers.map((trainer) => [str(trainer._id), trainer])
    );

    const completionMap = batchCompletionMap(batch);

    const formattedTools = (batch.tools || []).map((toolId) => {
      const tid = str(toolId);
      const tool = toolMap.get(tid);

      const assignedTrainers = (batch.toolTrainerAssignments || [])
        .filter((item) => str(item.toolId) === tid)
        .map((item) => {
          const trainerId = str(item.trainerId);
          return {
            trainerId,
            trainerName: trainerMap.get(trainerId)?.name || "Unknown trainer",
          };
        });

      return {
        id: tid,
        name: tool?.name || "Unknown tool",
        status: tool?.status || "unknown",
        completed: completionMap.has(tid),
        completedAt: completionMap.get(tid) || null,
        trainers: assignedTrainers,
      };
    });

    const formattedStudents = assignments.map((assignment) => {
      const studentId = str(assignment.studentId);
      const student = studentMap.get(studentId);
      const completion = completionSummary(assignment, completionMap);

      const assignedToolIds = (assignment.toolIds || []).map(str);

      const assignedTools = assignedToolIds.map((toolId) => {
        const tool = toolMap.get(toolId);

        const trainerAssignments = (
          assignment.toolTrainerAssignments?.length
            ? assignment.toolTrainerAssignments
            : batch.toolTrainerAssignments || []
        )
          .filter((item) => str(item.toolId) === toolId)
          .map((item) => {
            const trainerId = str(item.trainerId);
            return {
              trainerId,
              trainerName:
                trainerMap.get(trainerId)?.name || "Unknown trainer",
            };
          });

        return {
          id: toolId,
          name: tool?.name || "Unknown tool",
          trainers: trainerAssignments,
        };
      });

      return {
        assignmentId: str(assignment._id),
        studentId,
        name: student?.name || "Student not found",
        email: student?.email || "",
        phone: student?.phone ? String(student.phone) : "",
        studentStatus: student?.status || "",
        course: student?.course || "",
        assignedAt: assignment.assignedAt || assignment.createdAt || null,
        mode: assignment.mode || "full_course",
        tools: assignedTools,
        toolIds: assignedToolIds,
        batchCompleted: completion.batchCompleted,
        batchCompletedAt: completion.batchCompletedAt,
        progress: completion.progress,
        ...paymentSummary(assignment),
      };
    });

    const totalFees = formattedStudents.reduce((s, x) => s + x.totalFee, 0);
    const totalPaid = formattedStudents.reduce((s, x) => s + x.paidFee, 0);
    const totalBalance = formattedStudents.reduce(
      (s, x) => s + x.balanceDue,
      0
    );

    const formattedBatch = {
      id: str(batch._id),
      name: batch.name || "",
      courseId: str(batch.courseId),
      courseName: course?.name || "Unknown course",
      startingDate: batch.startingDate || "",
      startingTime: batch.startingTime || "",
      status: batch.status || "upcoming",
      fee: Number(batch.fee) || 0,
      studentCount: formattedStudents.length,
      tools: formattedTools,
      students: formattedStudents,
      trainers: (batch.trainers || []).map((trainerId) => {
        const tid = str(trainerId);
        return {
          id: tid,
          name: trainerMap.get(tid)?.name || "Unknown trainer",
        };
      }),
      toolTrainerAssignments: (batch.toolTrainerAssignments || []).map(
        (item) => ({
          toolId: str(item.toolId),
          trainerId: str(item.trainerId),
          toolName: toolMap.get(str(item.toolId))?.name || "Unknown tool",
          trainerName:
            trainerMap.get(str(item.trainerId))?.name || "Unknown trainer",
        })
      ),
      createdAt: batch.createdAt || null,
      updatedAt: batch.updatedAt || null,
      financials: { totalFees, totalPaid, totalBalance },
    };

    return NextResponse.json({ success: true, data: formattedBatch });
  } catch (error) {
    console.error("Get batch details error:", error);
    return fail(error.message || "Failed to fetch batch details", 500);
  }
}

// PATCH: Edit batch, student assignment, complete tools, or remove items.
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const batchObjectId = toObjectId(id);

    if (!batchObjectId) return fail("Invalid batch ID");

    const body = await request.json();
    const db = await getDb();
    const batches = db.collection(COLLECTIONS.batches);
    const assignments = db.collection(COLLECTIONS.assignments);

    const batch = await batches.findOne({ _id: batchObjectId });

    if (!batch) return fail("Batch not found", 404);

    const now = new Date();

    // ---------- Update batch information ----------
    if (body.action === "update_batch") {
      const update = {};

      if (typeof body.name === "string" && body.name.trim()) {
        update.name = body.name.trim();
      }

      if (body.startingDate !== undefined) {
        if (
          typeof body.startingDate !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(body.startingDate)
        ) {
          return fail("Invalid starting date");
        }
        update.startingDate = body.startingDate;
      }

      if (body.startingTime !== undefined) {
        if (
          typeof body.startingTime !== "string" ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.startingTime)
        ) {
          return fail("Invalid starting time");
        }
        update.startingTime = body.startingTime;
      }

      if (body.status !== undefined) {
        const allowed = ["active", "inactive", "upcoming", "completed"];
        if (!allowed.includes(body.status)) {
          return fail("Invalid batch status");
        }
        update.status = body.status;
      }

      if (body.fee !== undefined) {
        const fee = Number(body.fee);
        if (!Number.isFinite(fee) || fee < 0) {
          return fail("Invalid batch fee");
        }
        update.fee = fee;
      }

      if (body.tools !== undefined) {
        if (
          !Array.isArray(body.tools) ||
          !body.tools.every(
            (item) => typeof item === "string" && ObjectId.isValid(item)
          )
        ) {
          return fail("Invalid tools list");
        }
        update.tools = [...new Set(body.tools)];
      }

      if (body.trainers !== undefined) {
        if (
          !Array.isArray(body.trainers) ||
          !body.trainers.every(
            (item) => typeof item === "string" && ObjectId.isValid(item)
          )
        ) {
          return fail("Invalid trainers list");
        }
        update.trainers = [...new Set(body.trainers)];
      }

      if (body.toolTrainerAssignments !== undefined) {
        if (
          !Array.isArray(body.toolTrainerAssignments) ||
          !body.toolTrainerAssignments.every(
            (item) =>
              ObjectId.isValid(item.toolId) && ObjectId.isValid(item.trainerId)
          )
        ) {
          return fail("Invalid tool trainer assignments");
        }
        update.toolTrainerAssignments = body.toolTrainerAssignments.map(
          (item) => ({ toolId: item.toolId, trainerId: item.trainerId })
        );
      }

      update.updatedAt = now;

      await batches.updateOne({ _id: batchObjectId }, { $set: update });

      return NextResponse.json({
        success: true,
        message: "Batch updated successfully",
      });
    }

    // ---------- Edit a student's assignment ----------
    if (body.action === "update_student") {
      const studentObjectId = toObjectId(body.studentId);
      if (!studentObjectId) return fail("Invalid student ID");

      const filter = { batchId: batchObjectId, studentId: studentObjectId };
      const existing = await assignments.findOne(filter);

      if (!existing) return fail("Student assignment not found", 404);

      const update = { updatedAt: now };

      if (body.mode !== undefined) {
        if (!["full_course", "selected_tools"].includes(body.mode)) {
          return fail("Invalid assignment mode");
        }
        update.mode = body.mode;
      }

      if (body.toolIds !== undefined) {
        if (
          !Array.isArray(body.toolIds) ||
          !body.toolIds.every(
            (toolId) =>
              typeof toolId === "string" &&
              ObjectId.isValid(toolId) &&
              (batch.tools || []).map(str).includes(toolId)
          )
        ) {
          return fail("Invalid student tools");
        }
        update.toolIds = [...new Set(body.toolIds)];
      }

      if (body.totalFee !== undefined) {
        const totalFee = Number(body.totalFee);
        const summary = paymentSummary(existing);

        if (
          !Number.isFinite(totalFee) ||
          totalFee < 0 ||
          totalFee < summary.paidFee
        ) {
          return fail("Total fee cannot be less than fees already paid");
        }
        update.totalFee = totalFee;
      }

      await assignments.updateOne(filter, { $set: update });

      // Keep batchCompleted correct after mode/tool changes.
      await syncStudentsCompletion(assignments, batchObjectId, batch, now);

      const saved = await assignments.findOne(filter);

      return NextResponse.json({
        success: true,
        message: "Student assignment updated successfully",
        data: {
          studentId: str(saved.studentId),
          ...paymentSummary(saved),
        },
      });
    }

    // ---------- Mark a batch tool completed (applies to all its students) ----------
    if (body.action === "complete_batch_tool" || body.action === "reopen_batch_tool") {
      const toolId = str(body.toolId);

      if (!ObjectId.isValid(toolId)) return fail("Invalid tool ID");

      if (!(batch.tools || []).map(str).includes(toolId)) {
        return fail("Tool is not part of this batch");
      }

      const completing = body.action === "complete_batch_tool";

      if (completing) {
        // The $ne guard makes a double click or double request harmless.
        await batches.updateOne(
          { _id: batchObjectId, "toolCompletions.toolId": { $ne: toolId } },
          {
            $push: { toolCompletions: { toolId, completedAt: now } },
            $set: { updatedAt: now },
          }
        );
      } else {
        await batches.updateOne(
          { _id: batchObjectId },
          {
            $pull: { toolCompletions: { toolId } },
            $set: { updatedAt: now },
          }
        );
      }

      // Re-read the batch, then update every student's batchCompleted flag.
      const fresh = await batches.findOne({ _id: batchObjectId });
      await syncStudentsCompletion(assignments, batchObjectId, fresh, now);

      const finished = await assignments.countDocuments({
        batchId: batchObjectId,
        batchCompleted: true,
      });

      return NextResponse.json({
        success: true,
        message: completing
          ? `Tool marked completed for all its students. ${finished} student(s) have completed the batch.`
          : "Tool reopened for all its students",
        data: { toolId, finishedStudents: finished },
      });
    }

    // ---------- Remove student from the batch ----------
    if (body.action === "remove_student") {
      const studentObjectId = toObjectId(body.studentId);
      if (!studentObjectId) return fail("Invalid student ID");

      const result = await assignments.deleteOne({
        batchId: batchObjectId,
        studentId: studentObjectId,
      });

      if (!result.deletedCount) {
        return fail("Student assignment not found", 404);
      }

      await batches.updateOne(
        { _id: batchObjectId },
        {
          $pull: { studentIds: studentObjectId },
          $set: { updatedAt: now },
        }
      );

      return NextResponse.json({
        success: true,
        message: "Student removed from batch",
      });
    }

    // ---------- Remove a tool from the batch and student assignments ----------
    if (body.action === "remove_tool") {
      const toolId = str(body.toolId);
      if (!ObjectId.isValid(toolId)) return fail("Invalid tool ID");

      const remainingAssignments = (batch.toolTrainerAssignments || []).filter(
        (item) => str(item.toolId) !== toolId
      );

      await batches.updateOne(
        { _id: batchObjectId },
        {
          $pull: { tools: toolId, toolCompletions: { toolId } },
          $set: {
            toolTrainerAssignments: remainingAssignments,
            updatedAt: now,
          },
        }
      );

      await assignments.updateMany(
        { batchId: batchObjectId },
        {
          $pull: { toolIds: toolId },
          $set: { updatedAt: now },
        }
      );

      const fresh = await batches.findOne({ _id: batchObjectId });
      await syncStudentsCompletion(assignments, batchObjectId, fresh, now);

      return NextResponse.json({
        success: true,
        message: "Tool removed from batch and student assignments",
      });
    }

    // ---------- Remove a trainer from the batch ----------
    if (body.action === "remove_trainer") {
      const trainerId = str(body.trainerId);
      if (!ObjectId.isValid(trainerId)) return fail("Invalid trainer ID");

      const remainingAssignments = (batch.toolTrainerAssignments || []).filter(
        (item) => str(item.trainerId) !== trainerId
      );

      await batches.updateOne(
        { _id: batchObjectId },
        {
          $pull: { trainers: trainerId },
          $set: {
            toolTrainerAssignments: remainingAssignments,
            updatedAt: now,
          },
        }
      );

      return NextResponse.json({
        success: true,
        message: "Trainer removed from batch assignments",
      });
    }

    return fail("Unknown action");
  } catch (error) {
    console.error("Update batch details error:", error);
    return fail(error.message || "Failed to update batch", 500);
  }
}