import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const search = searchParams.get("search")?.trim() || "";
    const course = searchParams.get("course") || "";
    const counsellor = searchParams.get("counsellor") || "";
    const callType = searchParams.get("callType") || "";
    const status = searchParams.get("status") || "";

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const minDuration = searchParams.get("minDuration");
    const maxDuration = searchParams.get("maxDuration");

    const sortBy = searchParams.get("sortBy") || "call_time";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    const client = await clientPromise;
    const db = client.db("sales");
    const usersDb = client.db("internal");

    const getDaysAgoSkippingSunday = (start, days) => {
      const d = new Date(start);
      let count = 0;

      while (count < days) {
        d.setDate(d.getDate() - 1);

        if (d.getDay() !== 0) {
          count++;
        }
      }

      return d;
    };

    const now = new Date();
    const fourDaysAgo = getDaysAgoSkippingSunday(now, 4);
    const eightDaysAgo = getDaysAgoSkippingSunday(fourDaysAgo, 4);

    const pipeline = [];

    // ------------------------------------------
    // Normalize Call Phone Safely
    // Handles string, long, int, double, null, etc.
    // ------------------------------------------

    pipeline.push({
      $addFields: {
        normalizedPhone: {
          $let: {
            vars: {
              phoneStr: {
                $convert: {
                  input: "$phone",
                  to: "string",
                  onError: "",
                  onNull: "",
                },
              },
            },

            in: {
              $cond: [
                {
                  $eq: ["$$phoneStr", ""],
                },

                null,

                {
                  $substrCP: [
                    "$$phoneStr",

                    {
                      $max: [
                        0,
                        {
                          $subtract: [
                            {
                              $strLenCP: "$$phoneStr",
                            },
                            10,
                          ],
                        },
                      ],
                    },

                    10,
                  ],
                },
              ],
            },
          },
        },
      },
    });

    // ------------------------------------------
    // Lookup Lead
    // ------------------------------------------

    pipeline.push({
      $lookup: {
        from: "dm",

        let: {
          phone: "$normalizedPhone",
        },

        pipeline: [
          {
            // ------------------------------------------
            // Normalize Lead Phone Safely
            // ------------------------------------------

            $addFields: {
              normalizedPhone: {
                $let: {
                  vars: {
                    phoneStr: {
                      $convert: {
                        input: "$phone",
                        to: "string",
                        onError: "",
                        onNull: "",
                      },
                    },
                  },

                  in: {
                    $cond: [
                      {
                        $eq: ["$$phoneStr", ""],
                      },

                      null,

                      {
                        $substrCP: [
                          "$$phoneStr",

                          {
                            $max: [
                              0,
                              {
                                $subtract: [
                                  {
                                    $strLenCP: "$$phoneStr",
                                  },
                                  10,
                                ],
                              },
                            ],
                          },

                          10,
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },

          {
            $match: {
              $expr: {
                $eq: [
                  "$normalizedPhone",
                  "$$phone",
                ],
              },
            },
          },

          {
            $sort: {
              createdAt: -1,
            },
          },

          {
            $limit: 1,
          },

          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
              phone: 1,
              course: 1,
              status: 1,
              assignedTo: 1,
              source: 1,
              createdAt: 1,
            },
          },
        ],

        as: "lead",
      },
    });

    // ------------------------------------------
    // Unwind Lead
    // ------------------------------------------

    pipeline.push({
      $unwind: {
        path: "$lead",
        preserveNullAndEmptyArrays: true,
      },
    });

    // ------------------------------------------
    // Filters
    // ------------------------------------------

    const escapeRegex = (text) =>
      text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

    const match = {};

    // Call Type

    if (callType) {
      const callTypeMap = {
        Inbound: "INCOMING",
        Outbound: "OUTGOING",
        Missed: "MISSED",
      };

      match.call_type =
        callTypeMap[callType] || callType;
    }

    // Status

    if (status) {
      match.status = status;
    }

    // Date Range

    if (from || to) {
      match.call_time = {};

      if (from) {
        match.call_time.$gte = new Date(from);
      }

      if (to) {
        const end = new Date(to);

        end.setHours(
          23,
          59,
          59,
          999
        );

        match.call_time.$lte = end;
      }
    }

    // Minimum Duration

    if (
      minDuration !== null &&
      minDuration !== undefined &&
      minDuration !== ""
    ) {
      match.duration_seconds = {
        ...(match.duration_seconds || {}),
        $gte: Number(minDuration),
      };
    }

    // Maximum Duration

    if (
      maxDuration !== null &&
      maxDuration !== undefined &&
      maxDuration !== ""
    ) {
      match.duration_seconds = {
        ...(match.duration_seconds || {}),
        $lte: Number(maxDuration),
      };
    }

    // ------------------------------------------
    // Combined Filters
    // ------------------------------------------

    match.$and = [];

    // ------------------------------------------
    // Course Filter
    // ------------------------------------------

    if (course) {
      match.$and.push({
        "lead.course": {
          $regex: escapeRegex(course),
          $options: "i",
        },
      });
    }

    // ------------------------------------------
    // Counsellor Filter
    // ------------------------------------------

    if (counsellor) {
      const counsellorRegex = {
        $regex: escapeRegex(counsellor),
        $options: "i",
      };

      const matchedCounsellors =
        await usersDb
          .collection("users")
          .find({
            name: counsellorRegex,
          })
          .project({
            _id: 1,
          })
          .toArray();

      const counsellorIds =
        matchedCounsellors.map(
          (user) => user._id.toString()
        );

      const counsellorOr = [
        {
          "lead.assignedTo.name":
            counsellorRegex,
        },
      ];

      if (counsellorIds.length > 0) {
        counsellorOr.push({
          userId: {
            $in: counsellorIds,
          },
        });
      }

      match.$and.push({
        $or: counsellorOr,
      });
    }

    // ------------------------------------------
    // Global Search
    // ------------------------------------------

    if (search) {
      const searchRegex = {
        $regex: escapeRegex(search),
        $options: "i",
      };

      const matchedSearchUsers =
        await usersDb
          .collection("users")
          .find({
            name: searchRegex,
          })
          .project({
            _id: 1,
          })
          .toArray();

      const searchUserIds =
        matchedSearchUsers.map(
          (user) => user._id.toString()
        );

      const searchOr = [
        {
          phone: searchRegex,
        },
        {
          "lead.phone": searchRegex,
        },
        {
          "lead.name": searchRegex,
        },
        {
          "lead.email": searchRegex,
        },
        {
          "lead.course": searchRegex,
        },
      ];

      if (searchUserIds.length > 0) {
        searchOr.push({
          userId: {
            $in: searchUserIds,
          },
        });
      }

      match.$and.push({
        $or: searchOr,
      });
    }

    // Remove empty $and

    if (match.$and.length === 0) {
      delete match.$and;
    }

    if (Object.keys(match).length > 0) {
      pipeline.push({
        $match: match,
      });
    }

    // ------------------------------------------
    // Sorting
    // ------------------------------------------

    const allowedSortFields = {
      call_time: "call_time",
      duration_seconds: "duration_seconds",
      createdAt: "createdAt",
      call_type: "call_type",
      status: "status",
      name: "lead.name",
      email: "lead.email",
      course: "lead.course",
      counsellor: "lead.assignedTo.name",
    };

    const sortField =
      allowedSortFields[sortBy] ||
      "call_time";

    pipeline.push({
      $sort: {
        [sortField]: sortOrder,
      },
    });

    // ------------------------------------------
    // Pagination + Analytics
    // ------------------------------------------

    pipeline.push({
      $facet: {
        data: [
          {
            $skip:
              (page - 1) * pageSize,
          },

          {
            $limit: pageSize,
          },

          {
            $project: {
              _id: 1,
              phone: 1,
              call_type: 1,
              duration_seconds: 1,
              call_time: 1,
              status: 1,
              createdAt: 1,
              userId: 1,

              lead: {
                _id: "$lead._id",
                name: "$lead.name",
                email: "$lead.email",
                phone: "$lead.phone",
                course: "$lead.course",
                status: "$lead.status",
                source: "$lead.source",
                createdAt:
                  "$lead.createdAt",
                assignedTo:
                  "$lead.assignedTo",
              },
            },
          },
        ],

        stats: [
          {
            $group: {
              _id: null,

              totalCalls: {
                $sum: 1,
              },

              incomingCalls: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$call_type",
                        "INCOMING",
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              outgoingCalls: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$call_type",
                        "OUTGOING",
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              missedCalls: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$call_type",
                        "MISSED",
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              unregisteredCalls: {
                $sum: {
                  $cond: [
                    {
                      $not: [
                        "$lead._id",
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              averageCallTime: {
                $avg:
                  "$duration_seconds",
              },

              c4_total: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $gte: [
                            "$call_time",
                            fourDaysAgo,
                          ],
                        },
                        {
                          $ne: [
                            {
                              $dayOfWeek:
                                "$call_time",
                            },
                            1,
                          ],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              c4_incoming: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $gte: [
                            "$call_time",
                            fourDaysAgo,
                          ],
                        },
                        {
                          $ne: [
                            {
                              $dayOfWeek:
                                "$call_time",
                            },
                            1,
                          ],
                        },
                        {
                          $eq: [
                            "$call_type",
                            "INCOMING",
                          ],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              c4_outgoing: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $gte: [
                            "$call_time",
                            fourDaysAgo,
                          ],
                        },
                        {
                          $ne: [
                            {
                              $dayOfWeek:
                                "$call_time",
                            },
                            1,
                          ],
                        },
                        {
                          $eq: [
                            "$call_type",
                            "OUTGOING",
                          ],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              c4_missed: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $gte: [
                            "$call_time",
                            fourDaysAgo,
                          ],
                        },
                        {
                          $ne: [
                            {
                              $dayOfWeek:
                                "$call_time",
                            },
                            1,
                          ],
                        },
                        {
                          $eq: [
                            "$call_type",
                            "MISSED",
                          ],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              c4_unregistered: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $gte: [
                            "$call_time",
                            fourDaysAgo,
                          ],
                        },
                        {
                          $ne: [
                            {
                              $dayOfWeek:
                                "$call_time",
                            },
                            1,
                          ],
                        },
                        {
                          $not: [
                            "$lead._id",
                          ],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              c4_avgTime: {
                $avg: {
                  $cond: [
                    {
                      $and: [
                        {
                          $gte: [
                            "$call_time",
                            fourDaysAgo,
                          ],
                        },
                        {
                          $ne: [
                            {
                              $dayOfWeek:
                                "$call_time",
                            },
                            1,
                          ],
                        },
                      ],
                    },
                    "$duration_seconds",
                    null,
                  ],
                },
              },

              p4_total: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $gte: [
                            "$call_time",
                            eightDaysAgo,
                          ],
                        },
                        {
                          $lt: [
                            "$call_time",
                            fourDaysAgo,
                          ],
                        },
                        {
                          $ne: [
                            {
                              $dayOfWeek:
                                "$call_time",
                            },
                            1,
                          ],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              p4_incoming: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $gte: [
                            "$call_time",
                            eightDaysAgo,
                          ],
                        },
                        {
                          $lt: [
                            "$call_time",
                            fourDaysAgo,
                          ],
                        },
                        {
                          $ne: [
                            {
                              $dayOfWeek:
                                "$call_time",
                            },
                            1,
                          ],
                        },
                        {
                          $eq: [
                            "$call_type",
                            "INCOMING",
                          ],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              p4_outgoing: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $gte: [
                            "$call_time",
                            eightDaysAgo,
                          ],
                        },
                        {
                          $lt: [
                            "$call_time",
                            fourDaysAgo,
                          ],
                        },
                        {
                          $ne: [
                            {
                              $dayOfWeek:
                                "$call_time",
                            },
                            1,
                          ],
                        },
                        {
                          $eq: [
                            "$call_type",
                            "OUTGOING",
                          ],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              p4_missed: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $gte: [
                            "$call_time",
                            eightDaysAgo,
                          ],
                        },
                        {
                          $lt: [
                            "$call_time",
                            fourDaysAgo,
                          ],
                        },
                        {
                          $ne: [
                            {
                              $dayOfWeek:
                                "$call_time",
                            },
                            1,
                          ],
                        },
                        {
                          $eq: [
                            "$call_type",
                            "MISSED",
                          ],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              p4_unregistered: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $gte: [
                            "$call_time",
                            eightDaysAgo,
                          ],
                        },
                        {
                          $lt: [
                            "$call_time",
                            fourDaysAgo,
                          ],
                        },
                        {
                          $ne: [
                            {
                              $dayOfWeek:
                                "$call_time",
                            },
                            1,
                          ],
                        },
                        {
                          $not: [
                            "$lead._id",
                          ],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              p4_avgTime: {
                $avg: {
                  $cond: [
                    {
                      $and: [
                        {
                          $gte: [
                            "$call_time",
                            eightDaysAgo,
                          ],
                        },
                        {
                          $lt: [
                            "$call_time",
                            fourDaysAgo,
                          ],
                        },
                        {
                          $ne: [
                            {
                              $dayOfWeek:
                                "$call_time",
                            },
                            1,
                          ],
                        },
                      ],
                    },
                    "$duration_seconds",
                    null,
                  ],
                },
              },
            },
          },
        ],

        totalCount: [
          {
            $count: "count",
          },
        ],
      },
    });

    // ------------------------------------------
    // Execute Aggregation
    // ------------------------------------------

    const result = await db
      .collection("call_logs")
      .aggregate(pipeline)
      .toArray();

    const rows =
      result[0]?.data || [];

    const total =
      result[0]?.totalCount?.[0]?.count ||
      0;

    // ------------------------------------------
    // Trend Calculation
    // ------------------------------------------

    const calcTrend = (
      current,
      previous
    ) => {
      const cur = current || 0;
      const prev = previous || 0;

      if (prev > 0) {
        return Number(
          (
            ((cur - prev) / prev) *
            100
          ).toFixed(2)
        );
      }

      if (cur > 0) {
        return 100;
      }

      return 0;
    };

    const rawStats =
      result[0]?.stats?.[0] || {};

    const stats = {
      totalCalls: {
        count:
          rawStats.totalCalls || 0,

        trend: calcTrend(
          rawStats.c4_total,
          rawStats.p4_total
        ),
      },

      incomingCalls: {
        count:
          rawStats.incomingCalls || 0,

        trend: calcTrend(
          rawStats.c4_incoming,
          rawStats.p4_incoming
        ),
      },

      outgoingCalls: {
        count:
          rawStats.outgoingCalls || 0,

        trend: calcTrend(
          rawStats.c4_outgoing,
          rawStats.p4_outgoing
        ),
      },

      missedCalls: {
        count:
          rawStats.missedCalls || 0,

        trend: calcTrend(
          rawStats.c4_missed,
          rawStats.p4_missed
        ),
      },

      unregisteredCalls: {
        count:
          rawStats.unregisteredCalls || 0,

        trend: calcTrend(
          rawStats.c4_unregistered,
          rawStats.p4_unregistered
        ),
      },

      averageCallTime: {
        count: Number(
          (
            rawStats.averageCallTime ||
            0
          ).toFixed(2)
        ),

        trend: calcTrend(
          rawStats.c4_avgTime,
          rawStats.p4_avgTime
        ),
      },
    };

    // ------------------------------------------
    // Fetch Counsellor Names
    // ------------------------------------------

    const uniqueUserIds = [
      ...new Set(
        rows
          .map((row) => row.userId)
          .filter(Boolean)
      ),
    ];

    if (uniqueUserIds.length > 0) {
      const objectIdsToFetch =
        uniqueUserIds.reduce(
          (acc, id) => {
            const strId =
              id.toString();

            if (
              ObjectId.isValid(strId)
            ) {
              acc.push(
                new ObjectId(strId)
              );
            }

            return acc;
          },
          []
        );

      const users = await usersDb
        .collection("users")
        .find({
          _id: {
            $in: objectIdsToFetch,
          },
        })
        .project({
          name: 1,
        })
        .toArray();

      const userMap = {};

      users.forEach((user) => {
        userMap[
          user._id.toString()
        ] = user.name;
      });

      rows.forEach((row) => {
        if (
          row.userId &&
          userMap[
            row.userId.toString()
          ]
        ) {
          row.counsellorName =
            userMap[
              row.userId.toString()
            ];
        } else {
          row.counsellorName =
            row.lead?.assignedTo?.name ||
            "Unknown";
        }
      });
    } else {
      rows.forEach((row) => {
        row.counsellorName =
          row.lead?.assignedTo?.name ||
          "Unknown";
      });
    }

    return NextResponse.json({
      success: true,
      stats,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(
        total / pageSize
      ),
      hasNextPage:
        page <
        Math.ceil(total / pageSize),
      hasPreviousPage:
        page > 1,
      data: rows,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}