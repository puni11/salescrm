
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
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    const status = searchParams.get("status");
    const courseId = searchParams.get("courseId");

    const { collection } = await getCollection();
 
    // =========================================
    // VALIDATION
    // =========================================

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

    // =========================================
    // BUILD FILTER
    // =========================================

    const filter = {};

    if (id) filter._id = new ObjectId(id);
    if (status) filter.status = status;
    if (courseId) filter.courseId = courseId;

    // =========================================
    // SESSION PIPELINE
    // =========================================

    const buildSessionPipeline = (sessionStatus, sortOrder) => [
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ["$batchId", "$$batchObjectId"] },
              { $eq: ["$status", sessionStatus] },
            ],
          },
        },
      },

      { $sort: sortOrder },
      { $limit: 1 },

      // =========================================
      // TOOL LOOKUP
      // =========================================

      {
        $lookup: {
          from: "tools",
          let: {
            sessionToolId: "$toolId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [
                    { $toString: "$_id" },
                    "$$sessionToolId",
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                shortName: 1,
              },
            },
          ],
          as: "toolDetails",
        },
      },

      // =========================================
      // TRAINER LOOKUP
      // =========================================

      {
        $lookup: {
          from: "trainers",
          let: {
            sessionToolId: "$toolId",
            assignments: "$$batchAssignments",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: [
                    { $toString: "$_id" },
                    {
                      $map: {
                        input: {
                          $filter: {
                            input: {
                              $ifNull: ["$$assignments", []],
                            },
                            as: "assignment",
                            cond: {
                              $eq: [
                                "$$assignment.toolId",
                                "$$sessionToolId",
                              ],
                            },
                          },
                        },
                        as: "assignment",
                        in: "$$assignment.trainerId",
                      },
                    },
                  ],
                },
              },
            },
            { $limit: 1 },
            {
              $project: {
                _id: 1,
                name: 1,
              },
            },
          ],
          as: "trainerDetails",
        },
      },

      // =========================================
      // FORMAT PUBLIC SESSION
      // =========================================

      {
        $project: {
          _id: 1,
          date: 1,

          endDate: {
            $ifNull: ["$endDate", "$date"],
          },

          time: 1,
          status: 1,

          toolName: {
            $ifNull: [
              { $arrayElemAt: ["$toolDetails.name", 0] },
              "N/A",
            ],
          },

          toolShortName: {
            $ifNull: [
              { $arrayElemAt: ["$toolDetails.shortName", 0] },
              "",
            ],
          },

          trainerName: {
            $ifNull: [
              { $arrayElemAt: ["$trainerDetails.name", 0] },
              "N/A",
            ],
          },
        },
      },
    ];

    // =========================================
    // FETCH BATCHES
    // =========================================

    const batches = await collection.aggregate([
      {
        $match: filter,
      },

      // =========================================
      // UPCOMING SESSION
      // =========================================

      {
        $lookup: {
          from: "sessions",
          let: {
            batchObjectId: "$_id",
            batchAssignments: {
              $ifNull: ["$toolTrainerAssignments", []],
            },
          },
          pipeline: buildSessionPipeline("upcoming", {
            date: 1,
            time: 1,
          }),
          as: "upcomingSessions",
        },
      },

      // =========================================
      // ONGOING SESSION
      // =========================================

      {
        $lookup: {
          from: "sessions",
          let: {
            batchObjectId: "$_id",
            batchAssignments: {
              $ifNull: ["$toolTrainerAssignments", []],
            },
          },
          pipeline: buildSessionPipeline("ongoing", {
            date: -1,
            time: -1,
          }),
          as: "ongoingSessions",
        },
      },

      // =========================================
      // ADD SESSION DATA
      // =========================================

      {
        $addFields: {
          latestUpcomingSession: {
            $ifNull: [
              { $arrayElemAt: ["$upcomingSessions", 0] },
              null,
            ],
          },

          latestOngoingSession: {
            $ifNull: [
              { $arrayElemAt: ["$ongoingSessions", 0] },
              null,
            ],
          },
        },
      },

      // =========================================
      // ONLY UPCOMING / ONGOING BATCHES
      // =========================================

      {
        $match: {
          $or: [
            { latestUpcomingSession: { $ne: null } },
            { latestOngoingSession: { $ne: null } },
          ],
        },
      },

      // =========================================
      // PUBLIC BATCH FIELDS
      // =========================================

      {
        $project: {
          _id: 1,
          name: 1,
          batchName: 1,
          courseId: 1,
          status: 1,

          startingDate: 1,
          endingDate: 1,
          startingTime: 1,
          endingTime: 1,

          latestUpcomingSession: 1,
          latestOngoingSession: 1,

          createdAt: 1,
        },
      },

      { $sort: { createdAt: -1 } },
    ]).toArray();

    // =========================================
    // FORMAT PUBLIC RESPONSE
    // =========================================

    const publicBatches = batches.map((batch) => ({
      _id: batch._id,

      name: batch.name || batch.batchName || "Untitled Batch",

      courseId: batch.courseId || null,

      status: batch.status || null,

      startingDate: batch.startingDate || null,
      endingDate: batch.endingDate || null,

      startingTime: batch.startingTime || null,
      endingTime: batch.endingTime || null,

      latestUpcomingSession: batch.latestUpcomingSession
        ? {
            date: batch.latestUpcomingSession.date,
            endDate: batch.latestUpcomingSession.endDate,
            time: batch.latestUpcomingSession.time,
            status: batch.latestUpcomingSession.status,
            toolName: batch.latestUpcomingSession.toolName,
            toolShortName: batch.latestUpcomingSession.toolShortName,
            trainerName: batch.latestUpcomingSession.trainerName,
          }
        : null,

      latestOngoingSession: batch.latestOngoingSession
        ? {
            date: batch.latestOngoingSession.date,
            endDate: batch.latestOngoingSession.endDate,
            time: batch.latestOngoingSession.time,
            status: batch.latestOngoingSession.status,
            toolName: batch.latestOngoingSession.toolName,
            toolShortName: batch.latestOngoingSession.toolShortName,
            trainerName: batch.latestOngoingSession.trainerName,
          }
        : null,
    }));

    // =========================================
    // SINGLE BATCH RESPONSE
    // =========================================

    if (id) {
      if (!publicBatches.length) {
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
        data: publicBatches[0],
      });
    }

    // =========================================
    // ALL PUBLIC BATCHES
    // =========================================

    return NextResponse.json(
      {
        success: true,
        count: publicBatches.length,
        data: publicBatches,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );

  } catch (error) {
    console.error("Public batches API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch public batches",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}
