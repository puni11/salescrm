
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const COLLECTION = "batches";

const VALID_STATUSES = [
  "active",
  "inactive",
  "upcoming",
  "completed",
];

async function getCollection() {
  const client = await clientPromise;
  const db = client.db("sales");

  return {
    db,
    collection: db.collection(COLLECTION),
  };
}

// Validate and normalize batch data
function validateBatch(body) {
  const name =
    typeof body.name === "string" ? body.name.trim() : "";

  const courseId = String(body.courseId || "");
  const startingDate = body.startingDate;
  const startingTime = body.startingTime;
  const status = body.status ?? "upcoming";
  const tools = body.tools;
  const assignments = body.toolTrainerAssignments;

  if (!name) {
    return { error: "Batch name is required" };
  }

  if (!ObjectId.isValid(courseId)) {
    return { error: "A valid course is required" };
  }

  if (
    typeof startingDate !== "string" ||
    !startingDate.trim() ||
    !/^\d{4}-\d{2}-\d{2}$/.test(startingDate) ||
    Number.isNaN(Date.parse(`${startingDate}T00:00:00`))
  ) {
    return { error: "A valid starting date is required" };
  }

  // Validate starting time (HH:mm, 24-hour format)
  if (
    typeof startingTime !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(startingTime)
  ) {
    return { error: "A valid starting time is required" };
  }

  if (
    !Array.isArray(tools) ||
    tools.length === 0 ||
    !tools.every(
      (id) =>
        typeof id === "string" &&
        ObjectId.isValid(id)
    )
  ) {
    return {
      error: "Select at least one valid tool",
    };
  }

  const uniqueTools = [...new Set(tools)];

  if (uniqueTools.length !== tools.length) {
    return { error: "Duplicate tools are not allowed" };
  }

  if (!Array.isArray(assignments)) {
    return {
      error: "Tool-trainer assignments are required",
    };
  }

  const normalizedAssignments = [];
  const assignedToolIds = new Set();

  for (const item of assignments) {
    if (
      !item ||
      typeof item.toolId !== "string" ||
      typeof item.trainerId !== "string" ||
      !ObjectId.isValid(item.toolId) ||
      !ObjectId.isValid(item.trainerId)
    ) {
      return {
        error: "Every assignment must have valid tool and trainer IDs",
      };
    }

    if (!uniqueTools.includes(item.toolId)) {
      return {
        error: "A trainer is assigned to a tool not selected for this batch",
      };
    }

    if (assignedToolIds.has(item.toolId)) {
      return {
        error: "Each tool can have only one assigned trainer",
      };
    }

    assignedToolIds.add(item.toolId);

    normalizedAssignments.push({
      toolId: item.toolId,
      trainerId: item.trainerId,
    });
  }

  for (const toolId of uniqueTools) {
    if (!assignedToolIds.has(toolId)) {
      return {
        error: "Assign a trainer to every selected tool",
      };
    }
  }

  if (!VALID_STATUSES.includes(status)) {
    return {
      error: "Status must be active, inactive, upcoming, or completed",
    };
  }

  const trainers = [
    ...new Set(
      normalizedAssignments.map((item) => item.trainerId)
    ),
  ];

  return {
    data: {
      name,
      courseId,
      tools: uniqueTools,
      trainers,
      toolTrainerAssignments: normalizedAssignments,
      startingDate,
      startingTime,
      status,
    },
  };
}

// Validate course, tools and trainers
async function validateReferences(db, batch) {
  const course = await db.collection("offeringCourses").findOne({
    _id: new ObjectId(batch.courseId),
  });

  if (!course) {
    return "Selected course does not exist";
  }

  const toolIds = batch.tools.map(
    (id) => new ObjectId(id)
  );

  const foundTools = await db.collection("tools").countDocuments({
    _id: { $in: toolIds },
  });

  if (foundTools !== toolIds.length) {
    return "One or more selected tools do not exist";
  }

  const trainerIds = batch.trainers.map(
    (id) => new ObjectId(id)
  );

  const foundTrainers = await db.collection("trainers")
    .find({
      _id: { $in: trainerIds },
    })
    .toArray();

  if (foundTrainers.length !== trainerIds.length) {
    return "One or more selected trainers do not exist";
  }

  const trainerMap = new Map(
    foundTrainers.map((trainer) => [
      String(trainer._id),
      trainer,
    ])
  );

  for (const assignment of batch.toolTrainerAssignments) {
    const trainer = trainerMap.get(assignment.trainerId);

    if (!trainer) {
      return "Assigned trainer does not exist";
    }

    if (trainer.status !== "active") {
      return `Trainer "${trainer.name}" must be active`;
    }

    const teachesTool = (trainer.tools || []).some(
      (id) => String(id) === assignment.toolId
    );

    if (!teachesTool) {
      return `Trainer "${trainer.name}" does not teach the assigned tool`;
    }
  }

  return null;
}

// Find duplicate batch names
async function findDuplicateName(
  collection,
  name,
  excludeId = null
) {
  const escapedName = name.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const filter = {
    name: {
      $regex: `^${escapedName}$`,
      $options: "i",
    },
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  return collection.findOne(filter);
}

// GET /api/batches
// GET /api/batches?id=BATCH_ID
// GET /api/batches?status=upcoming
// GET /api/batches?courseId=COURSE_ID

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    const status = searchParams.get("status");
    const courseId = searchParams.get("courseId");

    const { collection } = await getCollection();

    if (id && !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid batch ID" },
        { status: 400 }
      );
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid batch status" },
        { status: 400 }
      );
    }

    if (courseId && !ObjectId.isValid(courseId)) {
      return NextResponse.json(
        { success: false, message: "Invalid course ID" },
        { status: 400 }
      );
    }

    const filter = {};

    if (id) filter._id = new ObjectId(id);
    if (status) filter.status = status;
    if (courseId) filter.courseId = courseId;

    // Use consistent local date/time for session comparisons.
    const now = new Date();

    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");

    const currentTime = [
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
    ].join(":");

    const batches = await collection.aggregate([
      {
        $match: filter,
      },

      // Upcoming session
      {
        $lookup: {
          from: "sessions",
          let: { batchObjectId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$batchId", "$$batchObjectId"] },
                    { $ne: ["$status", "completed"] },
                    {
                      $or: [
                        { $gt: ["$date", today] },
                        {
                          $and: [
                            { $eq: ["$date", today] },
                            { $gte: ["$time", currentTime] },
                          ],
                        },
                      ],
                    },
                  ],
                },
              },
            },
            {
              $sort: {
                date: 1,
                time: 1,
              },
            },
            { $limit: 1 },
            {
              $project: {
                _id: 0,
                title: 1,
                date: 1,
                time: 1,
              },
            },
          ],
          as: "upcomingSessions",
        },
      },

      // Latest completed session
      {
        $lookup: {
          from: "sessions",
          let: { batchObjectId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$batchId", "$$batchObjectId"] },
                    { $eq: ["$status", "completed"] },
                  ],
                },
              },
            },
            {
              $sort: {
                date: -1,
                time: -1,
                completedAt: -1,
              },
            },
            { $limit: 1 },
            {
              $project: {
                _id: 0,
                title: 1,
                date: 1,
                time: 1,
                completedAt: 1,
              },
            },
          ],
          as: "finishedSessions",
        },
      },

      // Return both sessions
      {
        $addFields: {
          latestUpcomingSession: {
            $ifNull: [
              { $arrayElemAt: ["$upcomingSessions", 0] },
              null,
            ],
          },

          latestFinishedSession: {
            $ifNull: [
              { $arrayElemAt: ["$finishedSessions", 0] },
              null,
            ],
          },
        },
      },

      {
        $project: {
          upcomingSessions: 0,
          finishedSessions: 0,
        },
      },

      {
        $sort: {
          createdAt: -1,
        },
      },
    ]).toArray();

    if (id) {
      if (!batches.length) {
        return NextResponse.json(
          {
            success: false,
            message: "Batch not found",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: batches[0],
      });
    }

    return NextResponse.json({
      success: true,
      count: batches.length,
      data: batches,
    });

  } catch (error) {
    console.error("Get batches error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch batches",
      },
      { status: 500 }
    );
  }
}

// POST /api/batches

export async function POST(request) {
  try {
    const body = await request.json();
    const validation = validateBatch(body);

    if (validation.error) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error,
        },
        { status: 400 }
      );
    }

    const { db, collection } = await getCollection();
    const batchData = validation.data;

    const referenceError = await validateReferences(
      db,
      batchData
    );

    if (referenceError) {
      return NextResponse.json(
        {
          success: false,
          message: referenceError,
        },
        { status: 400 }
      );
    }

    const duplicate = await findDuplicateName(
      collection,
      batchData.name
    );

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message: "A batch with this name already exists",
        },
        { status: 409 }
      );
    }

    const now = new Date();

    const batch = {
      ...batchData,
      studentIds: [],
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(batch);

    return NextResponse.json(
      {
        success: true,
        message: "Batch created successfully",
        data: {
          _id: result.insertedId,
          ...batch,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create batch error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create batch",
      },
      { status: 500 }
    );
  }
}

// PATCH /api/batches?id=BATCH_ID

export async function PATCH(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid batch ID is required",
        },
        { status: 400 }
      );
    }

    const { db, collection } = await getCollection();
    const objectId = new ObjectId(id);

    const existing = await collection.findOne({
      _id: objectId,
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Batch not found",
        },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Status-only updates
    const suppliedKeys = Object.keys(body);
    const statusOnly =
      suppliedKeys.length === 1 &&
      suppliedKeys[0] === "status";

    if (statusOnly) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid batch status",
          },
          { status: 400 }
        );
      }

      await collection.updateOne(
        { _id: objectId },
        {
          $set: {
            status: body.status,
            updatedAt: new Date(),
          },
        }
      );

      const updatedBatch = await collection.findOne({
        _id: objectId,
      });

      return NextResponse.json({
        success: true,
        message: "Batch status updated successfully",
        data: updatedBatch,
      });
    }

    // Merge existing data with incoming data
    const mergedBody = {
      ...existing,
      ...body,
      name: body.name ?? existing.name,
      courseId: body.courseId ?? existing.courseId,
      startingDate: body.startingDate ?? existing.startingDate,
      startingTime: body.startingTime ?? existing.startingTime,
      tools: body.tools ?? existing.tools,
      toolTrainerAssignments:
        body.toolTrainerAssignments ??
        existing.toolTrainerAssignments,
      status: body.status ?? existing.status,
    };

    const validation = validateBatch(mergedBody);

    if (validation.error) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error,
        },
        { status: 400 }
      );
    }

    const batchData = validation.data;

    const referenceError = await validateReferences(
      db,
      batchData
    );

    if (referenceError) {
      return NextResponse.json(
        {
          success: false,
          message: referenceError,
        },
        { status: 400 }
      );
    }

    const duplicate = await findDuplicateName(
      collection,
      batchData.name,
      objectId
    );

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message: "A batch with this name already exists",
        },
        { status: 409 }
      );
    }

    await collection.updateOne(
      { _id: objectId },
      {
        $set: {
          ...batchData,
          updatedAt: new Date(),
        },
      }
    );

    const updatedBatch = await collection.findOne({
      _id: objectId,
    });

    return NextResponse.json({
      success: true,
      message: "Batch updated successfully",
      data: updatedBatch,
    });
  } catch (error) {
    console.error("Update batch error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update batch",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/batches?id=BATCH_ID

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid batch ID is required",
        },
        { status: 400 }
      );
    }

    const { collection } = await getCollection();

    const result = await collection.deleteOne({
      _id: new ObjectId(id),
    });

    if (!result.deletedCount) {
      return NextResponse.json(
        {
          success: false,
          message: "Batch not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Batch deleted successfully",
    });
  } catch (error) {
    console.error("Delete batch error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete batch",
      },
      { status: 500 }
    );
  }
}
