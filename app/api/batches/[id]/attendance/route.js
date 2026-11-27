
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const DB_NAME = "sales";
const ATTENDANCE_COLLECTION = "batch_tool_attendance";

const str = (value) => (value == null ? "" : String(value));

const fail = (message, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

function validDate(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  );
}

async function authorizeTrainer() {
  const session = await getServerSession(authOptions);

  const role = session?.user?.role;
  const userId = str(session?.user?.id);

  if (
    !userId ||
    !["trainer", "trainerManager"].includes(role)
  ) {
    return { error: fail("Unauthorized", 401) };
  }

  return {
    trainerId: userId,
    role,
    isTrainerManager: role === "trainerManager",
  };
}

async function getContext(params) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    return { error: fail("Invalid batch ID") };
  }

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const batchId = new ObjectId(id);

  const batch = await db.collection("batches").findOne({
    _id: batchId,
  });

  if (!batch) {
    return { error: fail("Batch not found", 404) };
  }

  return {
    db,
    batch,
    batchId,
  };
}

async function getEligibleStudents(db, batchId, toolId) {
  const assignments = await db
    .collection("student_batch_assignments")
    .find({
      batchId,
      toolIds: {
        $in: [toolId, new ObjectId(toolId)],
      },
    })
    .toArray();

  const studentIds = assignments
    .map((item) => item.studentId)
    .filter((id) => id && ObjectId.isValid(str(id)))
    .map((id) => new ObjectId(str(id)));

  if (!studentIds.length) {
    return [];
  }

  const students = await db
    .collection("dm")
    .find({
      _id: { $in: studentIds },
    })
    .project({
      name: 1,
      phone: 1,
      email: 1,
    })
    .toArray();

  const studentMap = new Map(
    students.map((student) => [
      str(student._id),
      student,
    ])
  );

  return assignments.map((assignment) => {
    const studentId = str(assignment.studentId);
    const student = studentMap.get(studentId);

    return {
      studentId,
      name: student?.name || "Unknown student",
      phone: student?.phone
        ? String(student.phone)
        : "",
      email: student?.email || "",
    };
  });
}

async function validateTrainerTool(batch, toolId, trainerId) {
  if (!ObjectId.isValid(toolId)) {
    return "Invalid tool ID";
  }

  if (!ObjectId.isValid(trainerId)) {
    return "Invalid trainer ID";
  }

  const assigned = (
    batch.toolTrainerAssignments || []
  ).some(
    (item) =>
      str(item.toolId) === toolId &&
      str(item.trainerId) === trainerId
  );

  if (!assigned) {
    return "This tool is not assigned to this trainer";
  }

  return null;
}

// GET
// /api/batches/[id]/attendance
// ?toolId=TOOL_ID
// &date=YYYY-MM-DD
// &fromDate=YYYY-MM-DD
// &toDate=YYYY-MM-DD

export async function GET(request, { params }) {
  try {
    const auth = await authorizeTrainer();

    if (auth.error) {
      return auth.error;
    }

    const context = await getContext(params);

    if (context.error) {
      return context.error;
    }

    const { db, batch, batchId } = context;

    const { searchParams } = new URL(request.url);

    const toolId = searchParams.get("toolId") || "";
    const date = searchParams.get("date") || "";

    const fromDate =
      searchParams.get("fromDate") || date;

    const toDate =
      searchParams.get("toDate") || date;

    const trainerId = auth.trainerId;

    if (
      !validDate(date) ||
      !validDate(fromDate) ||
      !validDate(toDate) ||
      fromDate > toDate
    ) {
      return fail("Valid attendance dates are required");
    }

    const trainerError = await validateTrainerTool(
      batch,
      toolId,
      trainerId
    );

    if (trainerError) {
      return fail(trainerError, 403);
    }

    const students = await getEligibleStudents(
      db,
      batchId,
      toolId
    );

    // Get attendance for selected date
    const saved = await db
      .collection(ATTENDANCE_COLLECTION)
      .findOne({
        batchId,
        toolId,
        date,
      });

    const attendanceMap = new Map(
      (saved?.records || []).map((record) => [
        str(record.studentId),
        record.status,
      ])
    );

    // Get attendance history for the planning date range
    const history = await db
      .collection(ATTENDANCE_COLLECTION)
      .find({
        batchId,
        toolId,
        date: {
          $gte: fromDate,
          $lte: toDate,
        },
      })
      .toArray();

    const stats = history.reduce(
      (total, day) => {
        total.daysMarked += 1;

        for (const record of day.records || []) {
          if (record.status === "present") {
            total.present += 1;
          }

          if (record.status === "absent") {
            total.absent += 1;
          }
        }

        return total;
      },
      {
        daysMarked: 0,
        present: 0,
        absent: 0,
      }
    );

    const markedCount = stats.present + stats.absent;

    stats.percentage = markedCount
      ? Math.round(
          (stats.present / markedCount) * 100
        )
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        batchId: str(batchId),
        toolId,
        date,

        students: students.map((student) => ({
          ...student,
          attendanceStatus:
            attendanceMap.get(student.studentId) ||
            "unmarked",
        })),

        stats,

        savedAt: saved?.updatedAt || null,
      },
    });
  } catch (error) {
    console.error(
      "Get tool attendance error:",
      error
    );

    return fail(
      error.message || "Unable to fetch attendance",
      500
    );
  }
}

// POST
// /api/batches/[id]/attendance
//
// Body:
// {
//   toolId: "...",
//   date: "YYYY-MM-DD",
//   records: [
//     { studentId: "...", status: "present" },
//     { studentId: "...", status: "absent" }
//   ]
// }

export async function POST(request, { params }) {
  try {
    const auth = await authorizeTrainer();

    if (auth.error) {
      return auth.error;
    }

    const context = await getContext(params);

    if (context.error) {
      return context.error;
    }

    const { db, batch, batchId } = context;

    const body = await request.json();

    const toolId = str(body.toolId);
    const date = body.date;
    const trainerId = auth.trainerId;
    const records = body.records;

    if (!validDate(date)) {
      return fail("A valid attendance date is required");
    }

    if (!Array.isArray(records) || records.length === 0) {
      return fail("Attendance records are required");
    }

    const trainerError = await validateTrainerTool(
      batch,
      toolId,
      trainerId
    );

    if (trainerError) {
      return fail(trainerError, 403);
    }

    const eligibleStudents = await getEligibleStudents(
      db,
      batchId,
      toolId
    );

    const eligibleIds = new Set(
      eligibleStudents.map(
        (student) => student.studentId
      )
    );

    const seen = new Set();
    const normalizedRecords = [];

    for (const record of records) {
      const studentId = str(record.studentId);
      const status = str(record.status).toLowerCase();

      if (
        !ObjectId.isValid(studentId) ||
        !eligibleIds.has(studentId)
      ) {
        return fail(
          `Student ${studentId || "unknown"} is not assigned to this tool`
        );
      }

      if (seen.has(studentId)) {
        return fail(
          "Duplicate student attendance record"
        );
      }

      if (!["present", "absent"].includes(status)) {
        return fail(
          "Every student must be marked present or absent"
        );
      }

      seen.add(studentId);

      normalizedRecords.push({
        studentId,
        status,
      });
    }

    // Ensure every assigned student is marked
    if (seen.size !== eligibleIds.size) {
      return fail(
        "Please mark attendance for every student assigned to this tool"
      );
    }

    const now = new Date();

    await db
      .collection(ATTENDANCE_COLLECTION)
      .updateOne(
        {
          batchId,
          toolId,
          date,
        },
        {
          $set: {
            records: normalizedRecords,
            markedBy: trainerId,
            updatedAt: now,
          },
          $setOnInsert: {
            batchId,
            toolId,
            date,
            createdAt: now,
          },
        },
        {
          upsert: true,
        }
      );

    const present = normalizedRecords.filter(
      (item) => item.status === "present"
    ).length;

    const absent = normalizedRecords.filter(
      (item) => item.status === "absent"
    ).length;

    return NextResponse.json({
      success: true,
      message: "Attendance saved successfully",

      data: {
        batchId: str(batchId),
        toolId,
        date,
        total: normalizedRecords.length,
        present,
        absent,
      },
    });
  } catch (error) {
    console.error(
      "Save tool attendance error:",
      error
    );

    return fail(
      error.message || "Unable to save attendance",
      500
    );
  }
}
