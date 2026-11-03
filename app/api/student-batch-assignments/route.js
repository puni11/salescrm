
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const DB_NAME = "sales";
const STUDENT_COLLECTION = "dm";
const BATCH_COLLECTION = "batches";
const ASSIGNMENT_COLLECTION = "student_batch_assignments";

const ALLOWED_STATUSES = ["registered", "converted"];

async function getDb() {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

const idString = (value) => (value == null ? "" : String(value));

function calculatePayment(totalFee, payments = [], legacyPaidFee = 0) {
  const total = Math.max(Number(totalFee) || 0, 0);
  const legacyPaid = Math.max(Number(legacyPaidFee) || 0, 0);

  const paymentTotal = (Array.isArray(payments) ? payments : []).reduce(
    (sum, payment) => sum + Math.max(Number(payment.amount) || 0, 0),
    0
  );

  const paid = legacyPaid + paymentTotal;
  const balanceDue = Math.max(total - paid, 0);

  let paymentStatus = "due";

  if (total > 0 && paid >= total) {
    paymentStatus = "paid";
  } else if (paid > 0) {
    paymentStatus = "partial";
  }

  return {
    totalFee: total,
    paidFee: paid,
    balanceDue,
    paymentStatus,
    legacyPaidFee: legacyPaid,
  };
}

function normalizePayments(payments) {
  return (Array.isArray(payments) ? payments : []).map((payment) => ({
    id: idString(payment._id || payment.id),
    amount: Number(payment.amount) || 0,
    paidAt: payment.paidAt || payment.paymentDate || null,
    createdAt: payment.createdAt || null,
  }));
}

// GET: Students, batches and all batch assignments with payment history.
export async function GET() {
  try {
    const db = await getDb();

    const [
      students,
      batches,
      tools,
      courses,
      trainers,
      assignments,
    ] = await Promise.all([
      db.collection(STUDENT_COLLECTION)
        .find({
          status: { $regex: /^(registered|converted)$/i },
        })
        .sort({ createdAt: -1 })
        .toArray(),

      db.collection(BATCH_COLLECTION)
        .find({})
        .sort({ startingDate: 1 })
        .toArray(),

      db.collection("tools").find({}).toArray(),
      db.collection("courses").find({}).toArray(),
      db.collection("trainers").find({}).toArray(),

      db.collection(ASSIGNMENT_COLLECTION)
        .find({})
        .sort({ assignedAt: -1 })
        .toArray(),
    ]);

    const toolMap = new Map(
      tools.map((tool) => [
        idString(tool._id),
        {
          id: idString(tool._id),
          name: tool.name || "Unnamed tool",
        },
      ])
    );

    const courseMap = new Map(
      courses.map((course) => [
        idString(course._id),
        course.name || "Unnamed course",
      ])
    );

    const trainerMap = new Map(
      trainers.map((trainer) => [
        idString(trainer._id),
        trainer.name || "Unnamed trainer",
      ])
    );

    const formattedBatches = batches.map((batch) => ({
      id: idString(batch._id),
      name: batch.name || "Unnamed batch",
      courseId: idString(batch.courseId),
      courseName:
        courseMap.get(idString(batch.courseId)) || "Unknown course",
      startingDate: batch.startingDate || "",
      status: batch.status || "upcoming",
      fee: Number(batch.fee) || 0,

      tools: (batch.tools || []).map((toolId) => {
        const id = idString(toolId);

        return toolMap.get(id) || {
          id,
          name: "Unknown tool",
        };
      }),

      toolTrainerAssignments: (
        batch.toolTrainerAssignments || []
      ).map((item) => ({
        toolId: idString(item.toolId),
        trainerId: idString(item.trainerId),
        trainerName:
          trainerMap.get(idString(item.trainerId)) || "Unknown trainer",
      })),
    }));

    const batchMap = new Map(
      formattedBatches.map((batch) => [batch.id, batch])
    );

    const assignmentsByStudent = new Map();

    for (const assignment of assignments) {
      const studentId = idString(assignment.studentId);
      const batch = batchMap.get(idString(assignment.batchId));

      const payments = normalizePayments(assignment.payments);

      const paymentInfo = calculatePayment(
        assignment.totalFee,
        payments,
        assignment.legacyPaidFee ??
          (assignment.payments ? 0 : assignment.paidFee)
      );

      const formatted = {
        ...assignment,

        id: idString(assignment._id),
        studentId,
        batchId: idString(assignment.batchId),

        batchName:
          batch?.name || assignment.batchName || "Batch unavailable",

        courseId: idString(assignment.courseId),

        mode: assignment.mode || "full_course",

        toolIds: (assignment.toolIds || []).map(idString),

        toolNames: (assignment.toolIds || []).map(
          (toolId) =>
            toolMap.get(idString(toolId))?.name || "Unknown tool"
        ),

        payments,

        ...paymentInfo,

        toolTrainerAssignments: (
          assignment.toolTrainerAssignments || []
        ).map((item) => ({
          toolId: idString(item.toolId),

          toolName:
            toolMap.get(idString(item.toolId))?.name || "Unknown tool",

          trainerId: idString(item.trainerId),

          trainerName:
            trainerMap.get(idString(item.trainerId)) || "Unknown trainer",
        })),
      };

      if (!assignmentsByStudent.has(studentId)) {
        assignmentsByStudent.set(studentId, []);
      }

      assignmentsByStudent.get(studentId).push(formatted);
    }

    const formattedStudents = students.map((student) => ({
      id: idString(student._id),
      name: student.name || "",
      email: student.email || "",
      phone: student.phone ? String(student.phone) : "",
      status: student.status,
      course: student.course || "",
      createdAt: student.createdAt || null,

      batchAssignments:
        assignmentsByStudent.get(idString(student._id)) || [],
    }));

    return NextResponse.json({
      success: true,
      data: {
        students: formattedStudents,
        batches: formattedBatches,
      },
    });
  } catch (error) {
    console.error("Fetch student assignments error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message || "Failed to fetch students and batches",
      },
      { status: 500 }
    );
  }
}

// POST: Create/update a student's batch assignment and append dated payments.
export async function POST(request) {
  try {
    const body = await request.json();

    const studentId = idString(body.studentId);
    const batchId = idString(body.batchId);
    const mode = body.mode;

    if (
      !ObjectId.isValid(studentId) ||
      !ObjectId.isValid(batchId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid student and batch IDs are required",
        },
        { status: 400 }
      );
    }

    if (!["full_course", "selected_tools"].includes(mode)) {
      return NextResponse.json(
        {
          success: false,
          message: "Choose full course or selected tools",
        },
        { status: 400 }
      );
    }

    const totalFee = Number(body.totalFee ?? 0);

    if (!Number.isFinite(totalFee) || totalFee < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Total fee must be a valid non-negative number",
        },
        { status: 400 }
      );
    }

    const db = await getDb();

    const studentObjectId = new ObjectId(studentId);
    const batchObjectId = new ObjectId(batchId);

    const [student, batch] = await Promise.all([
      db.collection(STUDENT_COLLECTION).findOne({
        _id: studentObjectId,
      }),

      db.collection(BATCH_COLLECTION).findOne({
        _id: batchObjectId,
      }),
    ]);

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

   

    if (!batch) {
      return NextResponse.json(
        { success: false, message: "Batch not found" },
        { status: 404 }
      );
    }

    if (
      ["inactive", "completed"].includes(
        String(batch.status || "").toLowerCase()
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cannot assign students to an inactive or completed batch",
        },
        { status: 400 }
      );
    }

    const batchToolIds = (batch.tools || []).map(idString);

    let toolIds;

    if (mode === "full_course") {
      toolIds = batchToolIds;
    } else {
      const selectedToolIds = body.toolIds;

      if (
        !Array.isArray(selectedToolIds) ||
        selectedToolIds.length === 0 ||
        !selectedToolIds.every(
          (id) => typeof id === "string" && ObjectId.isValid(id)
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Select at least one valid tool",
          },
          { status: 400 }
        );
      }

      toolIds = [...new Set(selectedToolIds)];

      if (toolIds.some((id) => !batchToolIds.includes(id))) {
        return NextResponse.json(
          {
            success: false,
            message: "Selected tools must belong to this batch",
          },
          { status: 400 }
        );
      }
    }

    if (toolIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "This batch has no tools assigned",
        },
        { status: 400 }
      );
    }

    const toolTrainerAssignments = (
      batch.toolTrainerAssignments || []
    )
      .filter((item) => toolIds.includes(idString(item.toolId)))
      .map((item) => ({
        toolId: idString(item.toolId),
        trainerId: idString(item.trainerId),
      }));

    const collection = db.collection(ASSIGNMENT_COLLECTION);

    const filter = {
      studentId: studentObjectId,
      batchId: batchObjectId,
    };

    const existing = await collection.findOne(filter);
    const now = new Date();

    // Keep existing payments and preserve old undated paid amounts.
    const legacyPaidFee =
      Number(
        existing?.legacyPaidFee ??
          (existing && !Array.isArray(existing.payments)
            ? existing.paidFee
            : 0)
      ) || 0;

    const payments = Array.isArray(existing?.payments)
      ? [...existing.payments]
      : [];

    let newPaymentAmount = 0;

    if (
      body.paymentAmount !== undefined &&
      body.paymentAmount !== null &&
      body.paymentAmount !== ""
    ) {
      newPaymentAmount = Number(body.paymentAmount);
    } else if (
      body.paidFee !== undefined &&
      body.paidFee !== null &&
      body.paidFee !== ""
    ) {
      // Backward compatibility with the old cumulative paidFee field.
      const requestedPaid = Number(body.paidFee);

      const currentPaid =
        legacyPaidFee +
        payments.reduce(
          (sum, payment) => sum + (Number(payment.amount) || 0),
          0
        );

      newPaymentAmount = requestedPaid - currentPaid;
    }

    if (
      !Number.isFinite(newPaymentAmount) ||
      newPaymentAmount < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment amount must be a valid non-negative number",
        },
        { status: 400 }
      );
    }

    if (newPaymentAmount > 0) {
      const paidAt = body.paymentDate
        ? new Date(body.paymentDate)
        : now;

      if (Number.isNaN(paidAt.getTime())) {
        return NextResponse.json(
          {
            success: false,
            message: "Please provide a valid payment date",
          },
          { status: 400 }
        );
      }

      payments.push({
        _id: new ObjectId(),
        amount: newPaymentAmount,
        paidAt,
        createdAt: now,
      });
    }

    const paymentInfo = calculatePayment(
      totalFee,
      payments,
      legacyPaidFee
    );

    if (paymentInfo.paidFee > totalFee) {
      return NextResponse.json(
        {
          success: false,
          message: "Total payments cannot exceed the total fee",
        },
        { status: 400 }
      );
    }

    const update = {
      studentId: studentObjectId,
      batchId: batchObjectId,

      batchName: batch.name || "Unnamed batch",
      courseId: batch.courseId || null,

      mode,
      toolIds,
      toolTrainerAssignments,

      totalFee,
      legacyPaidFee,
      payments,

      paidFee: paymentInfo.paidFee,
      balanceDue: paymentInfo.balanceDue,
      paymentStatus: paymentInfo.paymentStatus,

      updatedAt: now,
    };

    await collection.updateOne(
      filter,
      {
        $set: update,
        $setOnInsert: {
          createdAt: now,
          assignedAt: now,
        },
      },
      { upsert: true }
    );
await db.collection(BATCH_COLLECTION).updateOne(
  { _id: batchObjectId },
  {
    $addToSet: {
      studentIds: studentObjectId,
    },
  }
);
    const saved = await collection.findOne(filter);

    return NextResponse.json({
      success: true,

      message:
        newPaymentAmount > 0
          ? "Batch assignment and payment saved successfully"
          : existing
            ? "Batch assignment updated successfully"
            : "New batch assigned successfully",

      data: {
        id: idString(saved?._id),
        studentId,
        batchId,
        batchName: batch.name || "Unnamed batch",
        mode,
        toolIds,
        toolTrainerAssignments,

        payments: normalizePayments(saved?.payments),

        ...calculatePayment(
          saved?.totalFee,
          saved?.payments,
          saved?.legacyPaidFee
        ),

        assignedAt:
          saved?.assignedAt || saved?.createdAt || now,
      },
    });
  } catch (error) {
    console.error("Assign batch/payment error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message || "Failed to save batch assignment",
      },
      { status: 500 }
    );
  }
}

// DELETE: Remove only one student's specific batch assignment.
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);

    const studentId = searchParams.get("studentId");
    const batchId = searchParams.get("batchId");

    if (
      !studentId ||
      !batchId ||
      !ObjectId.isValid(studentId) ||
      !ObjectId.isValid(batchId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid student ID and batch ID are required",
        },
        { status: 400 }
      );
    }

    const db = await getDb();

    const result = await db
      .collection(ASSIGNMENT_COLLECTION)
      .deleteOne({
        studentId: new ObjectId(studentId),
        batchId: new ObjectId(batchId),
      });

    if (!result.deletedCount) {
      return NextResponse.json(
        {
          success: false,
          message: "Batch assignment not found",
        },
        { status: 404 }
      );
    }
await db.collection(BATCH_COLLECTION).updateOne(
  { _id: new ObjectId(batchId) },
  {
    $pull: {
      studentIds: new ObjectId(studentId),
    },
  }
);
    return NextResponse.json({
      success: true,
      message: "Student batch assignment removed successfully",
    });
  } catch (error) {
    console.error("Remove batch assignment error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to remove batch assignment",
      },
      { status: 500 }
    );
  }
}
