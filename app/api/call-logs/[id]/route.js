import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Counsellor ID is required",
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const search = searchParams.get("search")?.trim() || "";
    const course = searchParams.get("course") || "";
    const callType = searchParams.get("callType") || "";
    const status = searchParams.get("status") || "";

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const minDuration = searchParams.get("minDuration");
    const maxDuration = searchParams.get("maxDuration");

    const sortBy = searchParams.get("sortBy") || "call_time";

    const sortOrder =
      searchParams.get("sortOrder") === "asc" ? 1 : -1;

    const client = await clientPromise;
    const db = client.db("sales");

    // --------------------------------------------------
    // DATE HELPERS
    // --------------------------------------------------

    const getDaysAgoSkippingSunday = (start, days) => {
      const d = new Date(start);
      let count = 0;

      while (count < days) {
        d.setDate(d.getDate() - 1);

        // Sunday = 0
        if (d.getDay() !== 0) {
          count++;
        }
      }

      return d;
    };

    const now = new Date();

    const fourDaysAgo = getDaysAgoSkippingSunday(now, 4);

    const eightDaysAgo = getDaysAgoSkippingSunday(
      fourDaysAgo,
      4
    );

    const pipeline = [];

    // --------------------------------------------------
    // 1. NORMALIZE CALL PHONE
    // Handles:
    // String
    // Number
    // Long
    // Null
    // Invalid values
    // --------------------------------------------------

    pipeline.push({
      $addFields: {
        normalizedPhone: {
          $let: {
            vars: {
              phoneString: {
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
                  $eq: ["$$phoneString", ""],
                },

                null,

                {
                  $substrCP: [
                    "$$phoneString",

                    {
                      $max: [
                        0,

                        {
                          $subtract: [
                            {
                              $strLenCP:
                                "$$phoneString",
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

    // --------------------------------------------------
    // 2. LOOKUP LEAD
    // --------------------------------------------------

    pipeline.push({
      $lookup: {
        from: "dm",

        let: {
          phone: "$normalizedPhone",
        },

        pipeline: [
          // ----------------------------------------------
          // NORMALIZE LEAD PHONE
          // ----------------------------------------------

          {
            $addFields: {
              normalizedPhone: {
                $let: {
                  vars: {
                    phoneString: {
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
                        $eq: [
                          "$$phoneString",
                          "",
                        ],
                      },

                      null,

                      {
                        $substrCP: [
                          "$$phoneString",

                          {
                            $max: [
                              0,

                              {
                                $subtract: [
                                  {
                                    $strLenCP:
                                      "$$phoneString",
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

          // ----------------------------------------------
          // MATCH PHONE
          // ----------------------------------------------

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

          // ----------------------------------------------
          // LATEST LEAD FIRST
          // ----------------------------------------------

          {
            $sort: {
              createdAt: -1,
            },
          },

          {
            $limit: 1,
          },

          // ----------------------------------------------
          // LEAD FIELDS
          // ----------------------------------------------

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

    // --------------------------------------------------
    // 3. UNWIND LEAD
    // --------------------------------------------------

    pipeline.push({
      $unwind: {
        path: "$lead",
        preserveNullAndEmptyArrays: true,
      },
    });

    // --------------------------------------------------
    // 4. FILTERS
    // --------------------------------------------------

    const escapeRegex = (text) =>
      text.replace(
        /[-[\]{}()*+?.,\\^$|#\s]/g,
        "\\$&"
      );

    const match = {};

    // --------------------------------------------------
    // ONLY SHOW CALLS FOR THIS COUNSELLOR
    // --------------------------------------------------

    match.userId = id;

    // --------------------------------------------------
    // CALL TYPE
    // --------------------------------------------------

    if (callType) {
      const callTypeMap = {
        Inbound: "INCOMING",
        Outbound: "OUTGOING",
        Missed: "MISSED",
      };

      match.call_type =
        callTypeMap[callType] || callType;
    }

    // --------------------------------------------------
    // STATUS
    // --------------------------------------------------

    if (status) {
      match.status = status;
    }

    // --------------------------------------------------
    // DATE FILTER
    // --------------------------------------------------

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

    // --------------------------------------------------
    // MIN DURATION
    // --------------------------------------------------

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

    // --------------------------------------------------
    // MAX DURATION
    // --------------------------------------------------

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

    // --------------------------------------------------
    // COMBINED FILTERS
    // --------------------------------------------------

    match.$and = [];

    // --------------------------------------------------
    // COURSE FILTER
    // --------------------------------------------------

    if (course) {
      match.$and.push({
        "lead.course": {
          $regex: escapeRegex(course),
          $options: "i",
        },
      });
    }

    // --------------------------------------------------
    // GLOBAL SEARCH
    // --------------------------------------------------

    if (search) {
      const searchRegex = {
        $regex: escapeRegex(search),
        $options: "i",
      };

      match.$and.push({
        $or: [
          { phone: searchRegex },
          { "lead.phone": searchRegex },
          { "lead.name": searchRegex },
          { "lead.email": searchRegex },
          { "lead.course": searchRegex },
        ],
      });
    }

    // Remove empty $and
    if (match.$and.length === 0) {
      delete match.$and;
    }

    // --------------------------------------------------
    // APPLY MATCH
    // --------------------------------------------------

    pipeline.push({
      $match: match,
    });

    // --------------------------------------------------
    // SORTING
    // --------------------------------------------------

    const allowedSortFields = {
      call_time: "call_time",
      duration_seconds: "duration_seconds",
      createdAt: "createdAt",
      call_type: "call_type",
      status: "status",
      name: "lead.name",
      email: "lead.email",
      course: "lead.course",
    };

    const sortField =
      allowedSortFields[sortBy] ||
      "call_time";

    pipeline.push({
      $sort: {
        [sortField]: sortOrder,
      },
    });

    // --------------------------------------------------
    // PAGINATION + STATS
    // --------------------------------------------------

    pipeline.push({
      $facet: {
        // ----------------------------------------------
        // DATA
        // ----------------------------------------------

        data: [
          {
            $skip: (page - 1) * pageSize,
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
                createdAt: "$lead.createdAt",
                assignedTo: "$lead.assignedTo",
              },
            },
          },
        ],

        // ----------------------------------------------
        // STATS
        // ----------------------------------------------

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
                      $not: ["$lead._id"],
                    },
                    1,
                    0,
                  ],
                },
              },

              averageCallTime: {
                $avg: "$duration_seconds",
              },

              // ------------------------------------------
              // CURRENT 4 DAYS
              // ------------------------------------------

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
                          $not: ["$lead._id"],
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

              // ------------------------------------------
              // PREVIOUS 4 DAYS
              // ------------------------------------------

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

        // ----------------------------------------------
        // TOTAL COUNT
        // ----------------------------------------------

        totalCount: [
          {
            $count: "count",
          },
        ],
      },
    });

    // --------------------------------------------------
    // EXECUTE
    // --------------------------------------------------

    const result = await db
      .collection("call_logs")
      .aggregate(pipeline)
      .toArray();

    const rows = result[0]?.data || [];

    const total =
      result[0]?.totalCount?.[0]?.count || 0;

    // --------------------------------------------------
    // TREND CALCULATION
    // --------------------------------------------------

    const calcTrend = (current, previous) => {
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
        count: rawStats.totalCalls || 0,
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
            rawStats.averageCallTime || 0
          ).toFixed(2)
        ),

        trend: calcTrend(
          rawStats.c4_avgTime,
          rawStats.p4_avgTime
        ),
      },
    };

    // --------------------------------------------------
    // ADD COUNSELLOR ID TO RESPONSE
    // --------------------------------------------------

    rows.forEach((row) => {
      row.counsellorId = id;
    });

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return NextResponse.json({
      success: true,

      counsellorId: id,

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
    console.error(
      "Call logs API error:",
      error
    );

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