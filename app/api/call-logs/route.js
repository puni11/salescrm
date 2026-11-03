import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/*
 * PREREQUISITES (run once in mongosh) -- see bottom of file for the script.
 *   - call_logs.phone10 and dm.phone10 must exist (last 10 digits of phone)
 *   - dm index   { phone10: 1, createdAt: -1 }
 *   - call_logs indexes { call_time: -1, _id: -1 }, { call_type: 1, call_time: -1 }
 *   - New writes to both collections must set phone10 (see toPhone10 helper).
 * Requires MongoDB 5.0+ ($lookup with localField/foreignField + pipeline).
 */

const AGG_OPTS = { allowDiskUse: true, maxTimeMS: 30000 };

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
const rx = (text) => ({ $regex: escapeRegex(text), $options: "i" });

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

// Indexed join on phone10. Uses dm {phone10:1, createdAt:-1}.
const leadStages = (projection) => [
  {
    $lookup: {
      from: "dm",
      localField: "phone10",
      foreignField: "phone10",
      pipeline: [
        // guards against null/missing phone10 matching null/missing phone10
        { $match: { phone10: { $type: "string" } } },
        { $sort: { createdAt: -1 } },
        { $limit: 1 },
        { $project: projection },
      ],
      as: "lead",
    },
  },
  { $unwind: { path: "$lead", preserveNullAndEmptyArrays: true } },
];

const ROW_PROJECT = {
  _id: 1,
  phone: 1,
  call_type: 1,
  duration_seconds: 1,
  call_time: 1,
  status: 1,
  createdAt: 1,
  userId: 1,
  lead: { $ifNull: ["$lead", {}] },
};

const getDaysAgoSkippingSunday = (start, days) => {
  const d = new Date(start);
  let count = 0;
  while (count < days) {
    d.setDate(d.getDate() - 1);
    if (d.getDay() !== 0) count++;
  }
  return d;
};

const calcTrend = (current, previous) => {
  const cur = current || 0;
  const prev = previous || 0;
  if (prev > 0) return Number((((cur - prev) / prev) * 100).toFixed(2));
  if (cur > 0) return 100;
  return 0;
};

// One generated $group instead of 30 hand-written blocks
const buildStatsGroup = (fourDaysAgo, eightDaysAgo) => {
  const notSunday = { $ne: [{ $dayOfWeek: "$call_time" }, 1] };
  const inCur = { $and: [{ $gte: ["$call_time", fourDaysAgo] }, notSunday] };
  const inPrev = {
    $and: [
      { $gte: ["$call_time", eightDaysAgo] },
      { $lt: ["$call_time", fourDaysAgo] },
      notSunday,
    ],
  };
  const typeIs = (t) => ({ $eq: ["$call_type", t] });
  const cnt = (cond) => ({ $sum: { $cond: [cond, 1, 0] } });

  const metrics = {
    total: { name: "totalCalls", cond: null },
    incoming: { name: "incomingCalls", cond: typeIs("INCOMING") },
    outgoing: { name: "outgoingCalls", cond: typeIs("OUTGOING") },
    missed: { name: "missedCalls", cond: typeIs("MISSED") },
    unregistered: { name: "unregisteredCalls", cond: { $not: ["$lead._id"] } },
  };

  const group = {
    _id: null,
    averageCallTime: { $avg: "$duration_seconds" },
    c4_avgTime: { $avg: { $cond: [inCur, "$duration_seconds", null] } },
    p4_avgTime: { $avg: { $cond: [inPrev, "$duration_seconds", null] } },
  };

  for (const [key, { name, cond }] of Object.entries(metrics)) {
    group[name] = cnt(cond ?? true);
    group[`c4_${key}`] = cnt(cond ? { $and: [inCur, cond] } : inCur);
    group[`p4_${key}`] = cnt(cond ? { $and: [inPrev, cond] } : inPrev);
  }
  return group;
};

export async function GET(req) {
  try {
    const { searchParams: sp } = new URL(req.url);

    const page = Math.max(1, parseInt(sp.get("page") || "1") || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(sp.get("pageSize") || "20") || 20)
    );
    const skip = (page - 1) * pageSize;

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
    const sortOrder = sp.get("sortOrder") === "asc" ? 1 : -1;

    const client = await clientPromise;
    const calls = client.db("sales").collection("call_logs");
    const users = client.db("internal").collection("users");

    const now = new Date();
    const fourDaysAgo = getDaysAgoSkippingSunday(now, 4);
    const eightDaysAgo = getDaysAgoSkippingSunday(fourDaysAgo, 4);

    // --------------------------------------------------
    // 1. Filters that only need call_logs fields.
    //    These run BEFORE any join so they can use indexes
    //    and shrink the set that gets joined.
    // --------------------------------------------------
    const callMatch = {};

    if (callType) {
      const map = { Inbound: "INCOMING", Outbound: "OUTGOING", Missed: "MISSED" };
      callMatch.call_type = map[callType] || callType;
    }
    if (status) callMatch.status = status;

    if (from || to) {
      callMatch.call_time = {};
      if (from) callMatch.call_time.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        callMatch.call_time.$lte = end;
      }
    }

    if (minDuration !== null && minDuration !== "") {
      callMatch.duration_seconds = { ...callMatch.duration_seconds, $gte: Number(minDuration) };
    }
    if (maxDuration !== null && maxDuration !== "") {
      callMatch.duration_seconds = { ...callMatch.duration_seconds, $lte: Number(maxDuration) };
    }

    // --------------------------------------------------
    // 2. Filters that need the joined lead (course, counsellor, search)
    // --------------------------------------------------
    const idsByName = async (regex) =>
      (await users.find({ name: regex }).project({ _id: 1 }).toArray()).map((u) =>
        u._id.toString()
      );

    const [counsellorIds, searchUserIds] = await Promise.all([
      counsellor ? idsByName(rx(counsellor)) : [],
      search ? idsByName(rx(search)) : [],
    ]);

    const leadAnd = [];

    if (course) leadAnd.push({ "lead.course": rx(course) });

    if (counsellor) {
      const or = [{ "lead.assignedTo.name": rx(counsellor) }];
      if (counsellorIds.length) or.push({ userId: { $in: counsellorIds } });
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
      if (searchUserIds.length) or.push({ userId: { $in: searchUserIds } });
      leadAnd.push({ $or: or });
    }

    // --------------------------------------------------
    // 3. Sorting
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
      counsellor: "lead.assignedTo.name",
    };
    const sortField = allowedSortFields[sortBy] || "call_time";
    // _id tiebreaker keeps pagination stable
    const sortStage = { $sort: { [sortField]: sortOrder, _id: sortOrder } };

    const needsLeadFirst = leadAnd.length > 0 || sortField.startsWith("lead.");
    const statsGroup = buildStatsGroup(fourDaysAgo, eightDaysAgo);

    let rows;
    let total;
    let rawStats;

    if (needsLeadFirst) {
      // Slow path: must join before filtering/sorting, but call-level filters
      // already narrowed the input and the join is now index-backed.
      const prefix = [
        ...(Object.keys(callMatch).length ? [{ $match: callMatch }] : []),
        ...leadStages(LEAD_FIELDS),
        ...(leadAnd.length ? [{ $match: { $and: leadAnd } }] : []),
      ];

      const [res] = await calls
        .aggregate(
          [
            ...prefix,
            {
              $facet: {
                data: [sortStage, { $skip: skip }, { $limit: pageSize }, { $project: ROW_PROJECT }],
                stats: [{ $group: statsGroup }],
                totalCount: [{ $count: "count" }],
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
      // Fast path: sort + paginate on call_logs (index), THEN join only the
      // page's rows. Stats and count run in parallel.
      const hasMatch = Object.keys(callMatch).length > 0;

      const [data, count, statsArr] = await Promise.all([
        calls
          .aggregate(
            [
              ...(hasMatch ? [{ $match: callMatch }] : []),
              sortStage,
              { $skip: skip },
              { $limit: pageSize },
              ...leadStages(LEAD_FIELDS),
              { $project: ROW_PROJECT },
            ],
            AGG_OPTS
          )
          .toArray(),
        hasMatch ? calls.countDocuments(callMatch) : calls.estimatedDocumentCount(),
        calls
          .aggregate(
            [
              ...(hasMatch ? [{ $match: callMatch }] : []),
              // lightweight join: only needed for "unregisteredCalls"
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

    const stats = {
      totalCalls: {
        count: rawStats.totalCalls || 0,
        trend: calcTrend(rawStats.c4_total, rawStats.p4_total),
      },
      incomingCalls: {
        count: rawStats.incomingCalls || 0,
        trend: calcTrend(rawStats.c4_incoming, rawStats.p4_incoming),
      },
      outgoingCalls: {
        count: rawStats.outgoingCalls || 0,
        trend: calcTrend(rawStats.c4_outgoing, rawStats.p4_outgoing),
      },
      missedCalls: {
        count: rawStats.missedCalls || 0,
        trend: calcTrend(rawStats.c4_missed, rawStats.p4_missed),
      },
      unregisteredCalls: {
        count: rawStats.unregisteredCalls || 0,
        trend: calcTrend(rawStats.c4_unregistered, rawStats.p4_unregistered),
      },
      averageCallTime: {
        count: Number((rawStats.averageCallTime || 0).toFixed(2)),
        trend: calcTrend(rawStats.c4_avgTime, rawStats.p4_avgTime),
      },
    };

    // --------------------------------------------------
    // 4. Counsellor names for the page's rows
    // --------------------------------------------------
    const objectIds = [
      ...new Set(rows.map((r) => r.userId?.toString()).filter(Boolean)),
    ]
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    const userMap = {};
    if (objectIds.length > 0) {
      const found = await users
        .find({ _id: { $in: objectIds } })
        .project({ name: 1 })
        .toArray();
      found.forEach((u) => (userMap[u._id.toString()] = u.name));
    }

    rows.forEach((row) => {
      row.counsellorName =
        (row.userId && userMap[row.userId.toString()]) ||
        row.lead?.assignedTo?.name ||
        "Unknown";
    });

    const totalPages = Math.ceil(total / pageSize);

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
    console.error(error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
