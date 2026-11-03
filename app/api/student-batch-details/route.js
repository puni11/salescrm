
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const idString = (value) => value?.toString?.() || "";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    if (!studentId || !ObjectId.isValid(studentId)) {
      return NextResponse.json(
        { success: false, message: "Invalid student ID" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("sales");

    // 1. Fetch student
    const student = await db.collection("dm").findOne({
      _id: new ObjectId(studentId),
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    // 2. Fetch all student batch assignments
    const assignments = await db
      .collection("student_batch_assignments")
      .find({
        studentId: new ObjectId(studentId),
      })
      .sort({ assignedAt: -1 })
      .toArray();

    // 3. Return empty assignments if student has no batches
    if (!assignments.length) {
      return NextResponse.json({
        success: true,
        assigned: false,
        data: {
          student: {
            id: idString(student._id),
            name: student.name || "",
            phone: student.phone || "",
            email: student.email || "",
            status: student.status || "",
          },
          assignments: [],
          totalAssignments: 0,
          batchSummary: {
            totalFee: 0,
            paidFee: 0,
            balanceDue: 0,
          },
        },
      });
    }

    // 4. Collect all batch, course, tool and trainer IDs
    const batchIds = [
      ...new Map(
        assignments.map((item) => [
          idString(item.batchId),
          item.batchId,
        ])
      ).values(),
    ].filter((id) => ObjectId.isValid(idString(id)))
      .map((id) => new ObjectId(idString(id)));

    const courseIds = [
      ...new Set(
        assignments
          .map((item) => idString(item.courseId))
          .filter(ObjectId.isValid)
      ),
    ].map((id) => new ObjectId(id));

    // 5. Fetch related data
    const [batches, tools, trainers, courses] = await Promise.all([
      db.collection("batches")
        .find({ _id: { $in: batchIds } })
        .toArray(),

      db.collection("tools").find({}).toArray(),

      db.collection("trainers").find({}).toArray(),

      db.collection("courses").find({
        _id: { $in: courseIds },
      }).toArray(),
    ]);

    // 6. Create lookup maps
    const batchMap = new Map(
      batches.map((batch) => [
        idString(batch._id),
        batch,
      ])
    );

    const toolMap = new Map(
      tools.map((tool) => [
        idString(tool._id),
        {
          id: idString(tool._id),
          name: tool.name || "Unnamed tool",
        },
      ])
    );

    const trainerMap = new Map(
      trainers.map((trainer) => [
        idString(trainer._id),
        {
          id: idString(trainer._id),
          name: trainer.name || "Unnamed trainer",
        },
      ])
    );

    const courseMap = new Map(
      courses.map((course) => [
        idString(course._id),
        course.name || "Unknown course",
      ])
    );

    // 7. Format each assignment independently
    const formattedAssignments = assignments.map((assignment) => {
      const batchId = idString(assignment.batchId);
      const batch = batchMap.get(batchId);

      const totalFee = Number(assignment.totalFee) || 0;
      const paidFee = Number(assignment.paidFee) || 0;
      const balanceDue = Math.max(totalFee - paidFee, 0);

      let paymentStatus = "due";

      if (totalFee > 0 && paidFee >= totalFee) {
        paymentStatus = "paid";
      } else if (paidFee > 0) {
        paymentStatus = "partial";
      }

      const selectedToolIds = (assignment.toolIds || []).map(idString);

      const selectedTools = selectedToolIds.map((id) =>
        toolMap.get(id) || {
          id,
          name: "Unknown tool",
        }
      );

      const toolTrainerAssignments = (
        assignment.toolTrainerAssignments || []
      ).map((item) => ({
        toolId: idString(item.toolId),

        toolName:
          toolMap.get(idString(item.toolId))?.name ||
          "Unknown tool",

        trainerId: idString(item.trainerId),

        trainerName:
          trainerMap.get(idString(item.trainerId))?.name ||
          "Unknown trainer",
      }));

      return {
        id: idString(assignment._id),

        batchId,

        batchAvailable: Boolean(batch),

        mode: assignment.mode || "full_course",

        assignedAt: assignment.assignedAt || null,

        totalFee,
        paidFee,
        balanceDue,
        paymentStatus,

        selectedToolIds,
        selectedTools,

        toolTrainerAssignments,

        batch: batch
          ? {
              id: idString(batch._id),
              name: batch.name || "Unnamed batch",

              startingDate: batch.startingDate || null,

              status: batch.status || "upcoming",

              courseId: idString(batch.courseId),

              courseName:
                courseMap.get(idString(batch.courseId)) ||
                courseMap.get(idString(assignment.courseId)) ||
                "Unknown course",

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

                toolName:
                  toolMap.get(idString(item.toolId))?.name ||
                  "Unknown tool",

                trainerId: idString(item.trainerId),

                trainerName:
                  trainerMap.get(idString(item.trainerId))?.name ||
                  "Unknown trainer",
              })),
            }
          : null,
      };
    });

    // 8. Calculate overall student fee summary
    const batchSummary = formattedAssignments.reduce(
      (summary, assignment) => ({
        totalFee: summary.totalFee + assignment.totalFee,
        paidFee: summary.paidFee + assignment.paidFee,
        balanceDue: summary.balanceDue + assignment.balanceDue,
      }),
      {
        totalFee: 0,
        paidFee: 0,
        balanceDue: 0,
      }
    );

    // 9. Response
    return NextResponse.json({
      success: true,
      assigned: true,

      data: {
        student: {
          id: idString(student._id),
          name: student.name || "",
          phone: student.phone || "",
          email: student.email || "",
          status: student.status || "",
        },

        totalAssignments: formattedAssignments.length,

        batchSummary,

        assignments: formattedAssignments,
      },
    });
  } catch (error) {
    console.error("Student batch details error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch batch details",
      },
      { status: 500 }
    );
  }
}
