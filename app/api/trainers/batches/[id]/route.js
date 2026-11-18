import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const DB_NAME = "sales";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid trainer ID",
        },
        { status: 400 }
      );
    }

    const trainerId = id;
    const trainerObjectId = new ObjectId(id);

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const batchesCollection = db.collection("batches");

    const batches = await batchesCollection
      .aggregate([
        // Find batches assigned to this trainer
        {
          $match: {
            $or: [
              { trainers: trainerId },
              {
                "toolTrainerAssignments.trainerId": trainerId,
              },
            ],
          },
        },

        // Course details
        {
          $lookup: {
            from: "offeringCourses",
            let: {
              courseId: "$courseId",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [
                      "$_id",
                      {
                        $convert: {
                          input: "$$courseId",
                          to: "objectId",
                          onError: null,
                          onNull: null,
                        },
                      },
                    ],
                  },
                },
              },
            ],
            as: "courseDetails",
          },
        },

        {
          $unwind: {
            path: "$courseDetails",
            preserveNullAndEmptyArrays: true,
          },
        },

        // Trainer details
        {
          $lookup: {
            from: "trainers",
            let: {
              trainerIds: "$trainers",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: [
                      { $toString: "$_id" },
                      "$$trainerIds",
                    ],
                  },
                },
              },
            ],
            as: "trainerDetails",
          },
        },

        // Tools details
        {
          $lookup: {
            from: "tools",
            let: {
              toolIds: "$tools",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: [
                      "$_id",
                      {
                        $map: {
                          input: "$$toolIds",
                          as: "toolId",
                          in: {
                            $convert: {
                              input: "$$toolId",
                              to: "objectId",
                              onError: null,
                              onNull: null,
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            ],
            as: "toolDetails",
          },
        },

        // Demo requests for this batch
        {
          $lookup: {
            from: "demoRequests",
            let: {
              batchId: {
                $toString: "$_id",
              },
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$batchId", "$$batchId"],
                  },
                },
              },
              {
                $sort: {
                  requestedAt: -1,
                },
              },
            ],
            as: "demoRequests",
          },
        },

        // Final response structure
        {
          $project: {
            _id: 1,
            name: 1,
            courseId: 1,
            startingDate: 1,
            status: 1,
            createdAt: 1,
            updatedAt: 1,

            trainers: 1,
            toolTrainerAssignments: 1,
            tools: 1,
            studentIds: 1,

            studentCount: {
              $size: {
                $ifNull: ["$studentIds", []],
              },
            },

            course: "$courseDetails",

            trainersDetails: "$trainerDetails",

            toolsDetails: "$toolDetails",

            demoRequests: 1,

            demoRequestCount: {
              $size: {
                $ifNull: ["$demoRequests", []],
              },
            },
          },
        },

        {
          $sort: {
            startingDate: -1,
            createdAt: -1,
          },
        },
      ])
      .toArray();

    return NextResponse.json({
      success: true,
      trainerId,
      count: batches.length,
      data: batches,
    });
  } catch (error) {
    console.error("Get trainer batches error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch trainer batches",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}