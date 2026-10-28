
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const DB_NAME = "sales";
const STUDENT_COLLECTION = "dm";
const BATCH_COLLECTION = "batches";
const ALLOWED_STATUSES = ["registered", "converted"];

async function getDb() {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

function idString(value) {
  return value == null ? "" : String(value);
}

function getPaymentInfo(totalFee, paidFee) {
  const total = Number(totalFee) || 0;
  const paid = Number(paidFee) || 0;
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
  };
}

/**
 * GET
 * Returns registered/converted students, available batches,
 * course names, tools, trainers and current fee information.
 */
export async function GET() {
  try {
    const db = await getDb();

    const [students, batches, tools, courses, trainers] =
      await Promise.all([
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

      tools: (batch.tools || []).map((toolId) => {
        const id = idString(toolId);

        return (
          toolMap.get(id) || {
            id,
            name: "Unknown tool",
          }
        );
      }),

      toolTrainerAssignments: (
        batch.toolTrainerAssignments || []
      ).map((assignment) => ({
        toolId: idString(assignment.toolId),
        trainerId: idString(assignment.trainerId),
        trainerName:
          trainerMap.get(idString(assignment.trainerId)) ||
          "Unknown trainer",
      })),
    }));

    const formattedStudents = students.map((student) => {
      const assignment = student.batchAssignment || null;

      const batch = assignment
        ? formattedBatches.find(
            (item) =>
              item.id === idString(assignment.batchId)
          )
        : null;

      let formattedAssignment = null;

      if (assignment) {
        const totalFee = Number(assignment.totalFee) || 0;
        const paidFee = Number(assignment.paidFee) || 0;

        const paymentInfo = getPaymentInfo(
          totalFee,
          paidFee
        );

        formattedAssignment = {
          ...assignment,
          batchId: idString(assignment.batchId),
          batchName:
            batch?.name ||
            assignment.batchName ||
            "Batch unavailable",

          courseId: idString(assignment.courseId),

          toolIds: (assignment.toolIds || []).map(idString),

          toolNames: (assignment.toolIds || []).map(
            (toolId) =>
              toolMap.get(idString(toolId))?.name ||
              "Unknown tool"
          ),

          totalFee: paymentInfo.totalFee,
          paidFee: paymentInfo.paidFee,
          balanceDue: paymentInfo.balanceDue,
          paymentStatus: paymentInfo.paymentStatus,
        };
      }

      return {
        id: idString(student._id),
        name: student.name || "",
        email: student.email || "",
        phone: student.phone ? String(student.phone) : "",
        status: student.status,
        course: student.course || "",
        createdAt: student.createdAt || null,
        batchAssignment: formattedAssignment,
      };
    });

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
        message: "Failed to fetch students and batches",
      },
      { status: 500 }
    );
  }
}

/**
 * POST
 * Assigns or updates a student's batch, learning plan,
 * selected tools, trainers and fee/payment information.
 */
export async function POST(request) {
  try {
    const body = await request.json();

    const studentId = idString(body.studentId);
    const batchId = idString(body.batchId);
    const mode = body.mode;
    const selectedToolIds = body.toolIds;

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
    const paidFee = Number(body.paidFee ?? 0);

    if (
      !Number.isFinite(totalFee) ||
      !Number.isFinite(paidFee) ||
      totalFee < 0 ||
      paidFee < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Fees must be valid non-negative numbers",
        },
        { status: 400 }
      );
    }

    if (paidFee > totalFee) {
      return NextResponse.json(
        {
          success: false,
          message: "Paid amount cannot exceed the total fee",
        },
        { status: 400 }
      );
    }

    const db = await getDb();

    const student = await db
      .collection(STUDENT_COLLECTION)
      .findOne({
        _id: new ObjectId(studentId),
      });

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    if (
      !ALLOWED_STATUSES.includes(
        String(student.status || "").toLowerCase()
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only registered or converted students can be assigned",
        },
        { status: 400 }
      );
    }

    const batch = await db
      .collection(BATCH_COLLECTION)
      .findOne({
        _id: new ObjectId(batchId),
      });

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
      if (
        !Array.isArray(selectedToolIds) ||
        selectedToolIds.length === 0 ||
        !selectedToolIds.every(
          (id) =>
            typeof id === "string" &&
            ObjectId.isValid(id)
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

      if (
        toolIds.some((id) => !batchToolIds.includes(id))
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Selected tools must belong to this batch",
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
      .filter((assignment) =>
        toolIds.includes(idString(assignment.toolId))
      )
      .map((assignment) => ({
        toolId: idString(assignment.toolId),
        trainerId: idString(assignment.trainerId),
      }));

    const paymentInfo = getPaymentInfo(totalFee, paidFee);

    const assignment = {
      batchId: batch._id,
      batchName: batch.name,
      courseId: batch.courseId || null,

      mode,
      toolIds,
      toolTrainerAssignments,

      // Fee information persisted in MongoDB.
      ...paymentInfo,

      assignedAt: new Date(),
    };

    await db.collection(STUDENT_COLLECTION).updateOne(
      { _id: student._id },
      {
        $set: {
          batchAssignment: assignment,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Batch assigned successfully",
      data: {
        studentId,
        batchId,
        batchName: batch.name,
        mode,
        toolIds,
        toolTrainerAssignments,
        ...paymentInfo,
      },
    });
  } catch (error) {
    console.error("Assign batch error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to assign batch",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE
 * Removes a student's batch assignment and its associated
 * fee information without deleting the student.
 *
 * DELETE /api/student-batch-assignments?studentId=...
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId || !ObjectId.isValid(studentId)) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid student ID is required",
        },
        { status: 400 }
      );
    }

    const db = await getDb();

    const result = await db
      .collection(STUDENT_COLLECTION)
      .updateOne(
        { _id: new ObjectId(studentId) },
        {
          $unset: {
            batchAssignment: "",
          },
          $set: {
            updatedAt: new Date(),
          },
        }
      );

    if (!result.matchedCount) {
      return NextResponse.json(
        {
          success: false,
          message: "Student not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Batch assignment and associated fee information removed",
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
