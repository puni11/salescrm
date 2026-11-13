
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// ---------------------------------------------
// CONFIG
// ---------------------------------------------

const AGG_OPTS = {
  allowDiskUse: true,
  maxTimeMS: 30000,
};

const CALL_TYPES = [
  "INCOMING",
  "OUTGOING",
  "MISSED",
  "REJECTED",
];

// ---------------------------------------------
// HELPERS
// ---------------------------------------------

const escapeRegex = (text) =>
  text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

const rx = (text) => ({
  $regex: escapeRegex(text),
  $options: "i",
});

const LEAD_FIELDS = {
  _id: 1,
  name: 1,
  email: 1,
  phone: 1,
  course: 1,
  status: 1,
  assignedTo: 1,
  source: 1,
  createdAt: 1,
};

// ---------------------------------------------
// LEAD LOOKUP
// ---------------------------------------------

const leadStages = (projection) => [
  {
    $lookup: {
      from: "dm",
      localField: "phone10",
      foreignField: "phone10",
      pipeline: [
        {
          $match: {
            phone10: { $type: "string" },
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $limit: 1,
        },
        {
          $project: projection,
        },
      ],
      as: "lead",
    },
  },
  {
    $unwind: {
      path: "$lead",
      preserveNullAndEmptyArrays: true,
    },
  },
];

// ---------------------------------------------
// ROW PROJECTION
// ---------------------------------------------

const ROW_PROJECT = {
  _id: 1,
  phone: 1,
  call_type: 1,
  duration_seconds: 1,
  call_time: 1,
  status: 1,
  createdAt: 1,
  userId: 1,
  lead: {
    $ifNull: ["$lead", {}],
  },
};

// ---------------------------------------------
// DATE HELPERS
// ---------------------------------------------

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

const calcTrend = (current, previous) => {
  const cur = current || 0;
  const prev = previous || 0;

  if (prev > 0) {
    return Number(
      (((cur - prev) / prev) * 100).toFixed(2)
    );
  }

  if (cur > 0) return 100;

  return 0;
};

// ---------------------------------------------
// STATS AGGREGATION
// ---------------------------------------------

const buildStatsGroup = (fourDaysAgo, eightDaysAgo) => {
  const notSunday = {
    $ne: [
      { $dayOfWeek: "$call_time" },
      1,
    ],
  };

  const inCur = {
    $and: [
      { $gte: ["$call_time", fourDaysAgo] },
      notSunday,
    ],
  };

  const inPrev = {
    $and: [
      { $gte: ["$call_time", eightDaysAgo] },
      { $lt: ["$call_time", fourDaysAgo] },
      notSunday,
    ],
  };

  const typeIs = (type) => ({
    $eq: ["$call_type", type],
  });

  const cnt = (cond) => ({
    $sum: {
      $cond: [cond, 1, 0],
    },
  });

  // Duration safely defaults to zero.
  const duration = {
    $ifNull: ["$duration_seconds", 0],
  };

  const sumDuration = (condition) => ({
    $sum: {
      $cond: [
        condition,
        duration,
        0,
      ],
    },
  });

  // NULL, missing and unknown types
  // are categorized as OTHER.
  const isOther = {
    $not: [
      {
        $in: [
          {
            $ifNull: ["$call_type", null],
          },
          CALL_TYPES,
        ],
      },
    ],
  };

  const metrics = {
    total: {
      name: "totalCalls",
      cond: null,
    },

    incoming: {
      name: "incomingCalls",
      cond: typeIs("INCOMING"),
    },

    outgoing: {
      name: "outgoingCalls",
      cond: typeIs("OUTGOING"),
    },

    missed: {
      name: "missedCalls",
      cond: typeIs("MISSED"),
    },

    rejected: {
      name: "rejectedCalls",
      cond: typeIs("REJECTED"),
    },

    other: {
      name: "otherCalls",
      cond: isOther,
    },

    unregistered: {
      name: "unregisteredCalls",
      cond: {
        $not: ["$lead._id"],
      },
    },
  };

  const group = {
    _id: null,

    // Average duration in seconds
    averageCallTime: {
      $avg: "$duration_seconds",
    },

    c4_avgTime: {
      $avg: {
        $cond: [
          inCur,
          "$duration_seconds",
          null,
        ],
      },
    },

    p4_avgTime: {
      $avg: {
        $cond: [
          inPrev,
          "$duration_seconds",
          null,
        ],
      },
    },

    // Actual total call duration in seconds
    totalCallTime: {
      $sum: duration,
    },

    // Current period total duration
    c4_totalCallTime: sumDuration(inCur),

    // Previous period total duration
    p4_totalCallTime: sumDuration(inPrev),
  };

  // Generate count and trend fields
  for (const [key, { name, cond }] of Object.entries(metrics)) {
    const condition = cond ?? true;

    group[name] = cnt(condition);

    group[`c4_${key}`] = cnt(
      cond
        ? { $and: [inCur, cond] }
        : inCur
    );

    group[`p4_${key}`] = cnt(
      cond
        ? { $and: [inPrev, cond] }
        : inPrev
    );
  }

  return group;
};

// ---------------------------------------------
// GET API
// ---------------------------------------------

export async function GET(req) {
  try {
    const { searchParams: sp } = new URL(req.url);

    // -----------------------------------------
    // PAGINATION
    // -----------------------------------------

    const page = Math.max(
      1,
      parseInt(sp.get("page") || "1") || 1
    );

    const pageSize = Math.min(
      100,
      Math.max(
        1,
        parseInt(sp.get("pageSize") || "20") || 20
      )
    );

    const skip = (page - 1) * pageSize;

    // -----------------------------------------
    // FILTERS
    // -----------------------------------------

    const search = sp.get("search")?.trim() || "";
    const course = sp.get("course") || "";
    const counsellor = sp.get("counsellor") || "";
    const callType = sp.get("callType") || "";
    const status = sp.get("status") || "";

    const from = sp.get("from");
    const to = sp.get("to");

    const minDuration = sp.get("minDuration");
    const maxDuration = sp.get("maxDuration");

    const sortBy = sp.get("sortBy") || "call_time";

    const sortOrder =
      sp.get("sortOrder") === "asc" ? 1 : -1;

    // -----------------------------------------
    // DATABASE
    // -----------------------------------------

    const client = await clientPromise;

    const calls = client
      .db("sales")
      .collection("call_logs");

    const users = client
      .db("internal")
      .collection("users");

    // -----------------------------------------
    // TREND DATE RANGES
    // -----------------------------------------

    const now = new Date();

    const fourDaysAgo = getDaysAgoSkippingSunday(
      now,
      4
    );

    const eightDaysAgo = getDaysAgoSkippingSunday(
      fourDaysAgo,
      4
    );

    // -----------------------------------------
    // CALL LOG FILTERS
    // -----------------------------------------

    const callMatch = {};

    if (callType) {
      const map = {
        Inbound: "INCOMING",
        Outbound: "OUTGOING",
        Missed: "MISSED",
        Rejected: "REJECTED",
      };

      callMatch.call_type =
        map[callType] || callType;
    }

    if (status) {
      callMatch.status = status;
    }

    // Date filter
    if (from || to) {
      callMatch.call_time = {};

      if (from) {
        callMatch.call_time.$gte = new Date(from);
      }

      if (to) {
        const end = new Date(to);

        end.setHours(23, 59, 59, 999);

        callMatch.call_time.$lte = end;
      }
    }

    // Duration filter
    if (minDuration !== null && minDuration !== "") {
      callMatch.duration_seconds = {
        ...callMatch.duration_seconds,
        $gte: Number(minDuration),
      };
    }

    if (maxDuration !== null && maxDuration !== "") {
      callMatch.duration_seconds = {
        ...callMatch.duration_seconds,
        $lte: Number(maxDuration),
      };
    }

    // -----------------------------------------
    // LEAD-BASED FILTERS
    // -----------------------------------------

    const idsByName = async (regex) =>
      (
        await users
          .find({ name: regex })
          .project({ _id: 1 })
          .toArray()
      ).map((u) => u._id.toString());

    const [counsellorIds, searchUserIds] =
      await Promise.all([
        counsellor
          ? idsByName(rx(counsellor))
          : [],

        search
          ? idsByName(rx(search))
          : [],
      ]);

    const leadAnd = [];

    if (course) {
      leadAnd.push({
        "lead.course": rx(course),
      });
    }

    if (counsellor) {
      const or = [
        {
          "lead.assignedTo.name": rx(counsellor),
        },
      ];

      if (counsellorIds.length) {
        or.push({
          userId: {
            $in: counsellorIds,
          },
        });
      }

      leadAnd.push({ $or: or });
    }

    if (search) {
      const r = rx(search);

      const or = [
        { phone: r },
        { "lead.phone": r },
        { "lead.name": r },
        { "lead.email": r },
        { "lead.course": r },
      ];

      if (searchUserIds.length) {
        or.push({
          userId: {
            $in: searchUserIds,
          },
        });
      }

      leadAnd.push({ $or: or });
    }

    // -----------------------------------------
    // SORTING
    // -----------------------------------------

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
      allowedSortFields[sortBy] || "call_time";

    const sortStage = {
      $sort: {
        [sortField]: sortOrder,
        _id: sortOrder,
      },
    };

    const needsLeadFirst =
      leadAnd.length > 0 ||
      sortField.startsWith("lead.");

    const statsGroup = buildStatsGroup(
      fourDaysAgo,
      eightDaysAgo
    );

    let rows;
    let total;
    let rawStats;

    // -----------------------------------------
    // AGGREGATION
    // -----------------------------------------

    if (needsLeadFirst) {
      // Lead lookup before filtering
      const prefix = [
        ...(Object.keys(callMatch).length
          ? [{ $match: callMatch }]
          : []),

        ...leadStages(LEAD_FIELDS),

        ...(leadAnd.length
          ? [{ $match: { $and: leadAnd } }]
          : []),
      ];

      const [res] = await calls
        .aggregate(
          [
            ...prefix,

            {
              $facet: {
                data: [
                  sortStage,
                  { $skip: skip },
                  { $limit: pageSize },
                  { $project: ROW_PROJECT },
                ],

                stats: [
                  { $group: statsGroup },
                ],

                totalCount: [
                  { $count: "count" },
                ],
              },
            },
          ],
          AGG_OPTS
        )
        .toArray();

      rows = res?.data || [];

      rawStats = res?.stats?.[0] || {};

      total = res?.totalCount?.[0]?.count || 0;

    } else {
      // Fast path: paginate before lead lookup
      const hasMatch =
        Object.keys(callMatch).length > 0;

      const [data, count, statsArr] =
        await Promise.all([
          calls
            .aggregate(
              [
                ...(hasMatch
                  ? [{ $match: callMatch }]
                  : []),

                sortStage,

                { $skip: skip },

                { $limit: pageSize },

                ...leadStages(LEAD_FIELDS),

                { $project: ROW_PROJECT },
              ],
              AGG_OPTS
            )
            .toArray(),

          hasMatch
            ? calls.countDocuments(callMatch)
            : calls.estimatedDocumentCount(),

          calls
            .aggregate(
              [
                ...(hasMatch
                  ? [{ $match: callMatch }]
                  : []),

                ...leadStages({ _id: 1 }),

                { $group: statsGroup },
              ],
              AGG_OPTS
            )
            .toArray(),
        ]);

      rows = data;

      total = count;

      rawStats = statsArr[0] || {};
    }

    // -----------------------------------------
    // RESPONSE STATS
    // -----------------------------------------

    const stats = {
      totalCalls: {
        count: rawStats.totalCalls || 0,

        trend: calcTrend(
          rawStats.c4_total,
          rawStats.p4_total
        ),
      },

      incomingCalls: {
        count: rawStats.incomingCalls || 0,

        trend: calcTrend(
          rawStats.c4_incoming,
          rawStats.p4_incoming
        ),
      },

      outgoingCalls: {
        count: rawStats.outgoingCalls || 0,

        trend: calcTrend(
          rawStats.c4_outgoing,
          rawStats.p4_outgoing
        ),
      },

      missedCalls: {
        count: rawStats.missedCalls || 0,

        trend: calcTrend(
          rawStats.c4_missed,
          rawStats.p4_missed
        ),
      },

      rejectedCalls: {
        count: rawStats.rejectedCalls || 0,

        trend: calcTrend(
          rawStats.c4_rejected,
          rawStats.p4_rejected
        ),
      },

      otherCalls: {
        count: rawStats.otherCalls || 0,

        trend: calcTrend(
          rawStats.c4_other,
          rawStats.p4_other
        ),
      },

      unregisteredCalls: {
        count: rawStats.unregisteredCalls || 0,

        trend: calcTrend(
          rawStats.c4_unregistered,
          rawStats.p4_unregistered
        ),
      },

      averageCallTime: {
        count: Number(
          (rawStats.averageCallTime ?? 0).toFixed(2)
        ),

        trend: calcTrend(
          rawStats.c4_avgTime,
          rawStats.p4_avgTime
        ),
      },

      totalCallTime: {
        count: Number(
          (rawStats.totalCallTime || 0).toFixed(2)
        ),

        trend: calcTrend(
          rawStats.c4_totalCallTime,
          rawStats.p4_totalCallTime
        ),
      },
    };

    // -----------------------------------------
    // COUNSELLOR NAMES
    // -----------------------------------------

    const objectIds = [
      ...new Set(
        rows
          .map((r) => r.userId?.toString())
          .filter(Boolean)
      ),
    ]
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    const userMap = {};

    if (objectIds.length > 0) {
      const found = await users
        .find({
          _id: {
            $in: objectIds,
          },
        })
        .project({ name: 1 })
        .toArray();

      found.forEach((u) => {
        userMap[u._id.toString()] = u.name;
      });
    }

    rows.forEach((row) => {
      row.counsellorName =
        (row.userId &&
          userMap[row.userId.toString()]) ||
        row.lead?.assignedTo?.name ||
        "Unknown";
    });

    // -----------------------------------------
    // PAGINATION RESPONSE
    // -----------------------------------------

    const totalPages = Math.ceil(
      total / pageSize
    );

    // -----------------------------------------
    // FINAL RESPONSE
    // -----------------------------------------

    return NextResponse.json({
      success: true,

      stats,

      page,
      pageSize,

      total,
      totalPages,

      hasNextPage: page < totalPages,

      hasPreviousPage: page > 1,

      data: rows,
    });

  } catch (error) {
    console.error("Call logs API error:", error);

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
