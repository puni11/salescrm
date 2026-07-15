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
    
    // ⚠️ REPLACE THIS WITH YOUR ACTUAL USERS DATABASE NAME
    const usersDb = client.db("internal"); 

    // ------------------------------------------
    // PRE-FETCH: Find User IDs if searching/filtering by counsellor
    // ------------------------------------------
    let preFetchedUserIds = [];
    if (counsellor || search) {
      const userFilterOr = [];
      if (counsellor) userFilterOr.push({ name: { $regex: counsellor, $options: "i" } });
      if (search) userFilterOr.push({ name: { $regex: search, $options: "i" } });

      if (userFilterOr.length > 0) {
        const matchedUsers = await usersDb
          .collection("users")
          .find({ $or: userFilterOr })
          .project({ _id: 1 })
          .toArray();
        
        preFetchedUserIds = matchedUsers.map(u => u._id.toString());
      }
    }
const getDaysAgoSkippingSunday = (start, days) => {
      let d = new Date(start);
      let count = 0;
      while (count < days) {
        d.setDate(d.getDate() - 1);
        if (d.getDay() !== 0) count++; 
      }
      return d;
    };

    const now = new Date();
    const fourDaysAgo = getDaysAgoSkippingSunday(now, 4);
    const eightDaysAgo = getDaysAgoSkippingSunday(fourDaysAgo, 4);

    const pipeline = [];

    // ------------------------------------------
    // Normalize Call Phone
    // ------------------------------------------

    pipeline.push({
      $addFields: {
        normalizedPhone: {
          $cond: [
            {
              $or: [
                { $eq: ["$phone", null] },
                { $eq: ["$phone", ""] }
              ]
            },
            null,
            {
              $substrCP: [
                "$phone",
                { $max: [0, { $subtract: [{ $strLenCP: "$phone" }, 10] }] },
                10
              ]
            }
          ]
        }
      }
    });

    // ------------------------------------------
    // Lookup Lead
    // ------------------------------------------

    pipeline.push({
      $lookup: {
        from: "dm",
        let: { phone: "$normalizedPhone" },
        pipeline: [
          {
            $addFields: {
              normalizedPhone: {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$phone", null] },
                      { $eq: ["$phone", ""] }
                    ]
                  },
                  null,
                  {
                    $substrCP: [
                      "$phone",
                      { $max: [0, { $subtract: [{ $strLenCP: "$phone" }, 10] }] },
                      10
                    ]
                  }
                ]
              }
            }
          },
          {
            $match: {
              $expr: { $eq: ["$normalizedPhone", "$$phone"] }
            }
          },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
          {
            $project: {
              _id: 1, name: 1, email: 1, phone: 1, course: 1,
              status: 1, assignedTo: 1, source: 1, createdAt: 1
            }
          }
        ],
        as: "lead"
      }
    });

    pipeline.push({
      $unwind: {
        path: "$lead",
        preserveNullAndEmptyArrays: true
      }
    });

    // ------------------------------------------
    // Filters
    // ------------------------------------------

    const match = {};

    if (callType) {
      // Map frontend filters to DB values
      const callTypeMap = {
        "Inbound": "INCOMING",
        "Outbound": "OUTGOING",
        "Missed": "MISSED"
      };
      match.call_type = callTypeMap[callType] || callType;
    }

    if (status) match.status = status;

    if (course) {
      match["lead.course"] = { $regex: course, $options: "i" };
    }

    if (from || to) {
      match.call_time = {};
      if (from) match.call_time.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        match.call_time.$lte = end;
      }
    }

    if (minDuration !== null && minDuration !== undefined && minDuration !== "") {
      match.duration_seconds = { ...(match.duration_seconds || {}), $gte: Number(minDuration) };
    }

    if (maxDuration !== null && maxDuration !== undefined && maxDuration !== "") {
      match.duration_seconds = { ...(match.duration_seconds || {}), $lte: Number(maxDuration) };
    }

    if (search || counsellor) {
      match.$or = [];

      if (counsellor) {
        match.$or.push({ "lead.assignedTo.name": { $regex: counsellor, $options: "i" } });
      }

      if (search) {
        match.$or.push(
          { phone: { $regex: search, $options: "i" } },
          { "lead.phone": { $regex: search, $options: "i" } },
          { "lead.name": { $regex: search, $options: "i" } },
          { "lead.email": { $regex: search, $options: "i" } },
          { "lead.course": { $regex: search, $options: "i" } }
        );
      }

      if (preFetchedUserIds.length > 0) {
        match.$or.push({ userId: { $in: preFetchedUserIds } });
      }

      if (match.$or.length === 0) delete match.$or;
    }

    if (Object.keys(match).length) {
      pipeline.push({ $match: match });
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

    const sortField = allowedSortFields[sortBy] || "call_time";

    pipeline.push({
      $sort: { [sortField]: sortOrder },
    });

    // ------------------------------------------
    // Pagination + Analytics Stats
    // ------------------------------------------

    pipeline.push({
      $facet: {
        // 1. The Paginated Data
        data: [
          { $skip: (page - 1) * pageSize },
          { $limit: pageSize },
          {
            $project: {
              _id: 1, phone: 1, call_type: 1, duration_seconds: 1,
              call_time: 1, status: 1, createdAt: 1, userId: 1,
              lead: {
                _id: "$lead._id", name: "$lead.name", email: "$lead.email",
                phone: "$lead.phone", course: "$lead.course", status: "$lead.status",
                source: "$lead.source", createdAt: "$lead.createdAt", assignedTo: "$lead.assignedTo",
              },
            },
          },
        ],
        
       // 2. The Dashboard Statistics (Overall + 4-Day Trends, Skipping Sundays)
        stats: [
          {
            $group: {
              _id: null,
              
              // --- OVERALL TOTALS (Respects user filters, Includes all days) ---
              totalCalls: { $sum: 1 },
              incomingCalls: { $sum: { $cond: [{ $eq: ["$call_type", "INCOMING"] }, 1, 0] } },
              outgoingCalls: { $sum: { $cond: [{ $eq: ["$call_type", "OUTGOING"] }, 1, 0] } },
              missedCalls: { $sum: { $cond: [{ $eq: ["$call_type", "MISSED"] }, 1, 0] } },
              unregisteredCalls: { $sum: { $cond: [{ $not: ["$lead._id"] }, 1, 0] } },
              averageCallTime: { $avg: "$duration_seconds" },

              // --- CURRENT 4 DAYS (Skipping Sunday) ---
              c4_total: { $sum: { $cond: [{ $and: [{ $gte: ["$call_time", fourDaysAgo] }, { $ne: [{ $dayOfWeek: "$call_time" }, 1] }] }, 1, 0] } },
              c4_incoming: { $sum: { $cond: [{ $and: [{ $gte: ["$call_time", fourDaysAgo] }, { $ne: [{ $dayOfWeek: "$call_time" }, 1] }, { $eq: ["$call_type", "INCOMING"] }] }, 1, 0] } },
              c4_outgoing: { $sum: { $cond: [{ $and: [{ $gte: ["$call_time", fourDaysAgo] }, { $ne: [{ $dayOfWeek: "$call_time" }, 1] }, { $eq: ["$call_type", "OUTGOING"] }] }, 1, 0] } },
              c4_missed: { $sum: { $cond: [{ $and: [{ $gte: ["$call_time", fourDaysAgo] }, { $ne: [{ $dayOfWeek: "$call_time" }, 1] }, { $eq: ["$call_type", "MISSED"] }] }, 1, 0] } },
              c4_unregistered: { $sum: { $cond: [{ $and: [{ $gte: ["$call_time", fourDaysAgo] }, { $ne: [{ $dayOfWeek: "$call_time" }, 1] }, { $not: ["$lead._id"] }] }, 1, 0] } },
              c4_avgTime: { $avg: { $cond: [{ $and: [{ $gte: ["$call_time", fourDaysAgo] }, { $ne: [{ $dayOfWeek: "$call_time" }, 1] }] }, "$duration_seconds", null] } },

              // --- PREVIOUS 4 DAYS (Skipping Sunday) ---
              p4_total: { $sum: { $cond: [{ $and: [{ $gte: ["$call_time", eightDaysAgo] }, { $lt: ["$call_time", fourDaysAgo] }, { $ne: [{ $dayOfWeek: "$call_time" }, 1] }] }, 1, 0] } },
              p4_incoming: { $sum: { $cond: [{ $and: [{ $gte: ["$call_time", eightDaysAgo] }, { $lt: ["$call_time", fourDaysAgo] }, { $ne: [{ $dayOfWeek: "$call_time" }, 1] }, { $eq: ["$call_type", "INCOMING"] }] }, 1, 0] } },
              p4_outgoing: { $sum: { $cond: [{ $and: [{ $gte: ["$call_time", eightDaysAgo] }, { $lt: ["$call_time", fourDaysAgo] }, { $ne: [{ $dayOfWeek: "$call_time" }, 1] }, { $eq: ["$call_type", "OUTGOING"] }] }, 1, 0] } },
              p4_missed: { $sum: { $cond: [{ $and: [{ $gte: ["$call_time", eightDaysAgo] }, { $lt: ["$call_time", fourDaysAgo] }, { $ne: [{ $dayOfWeek: "$call_time" }, 1] }, { $eq: ["$call_type", "MISSED"] }] }, 1, 0] } },
              p4_unregistered: { $sum: { $cond: [{ $and: [{ $gte: ["$call_time", eightDaysAgo] }, { $lt: ["$call_time", fourDaysAgo] }, { $ne: [{ $dayOfWeek: "$call_time" }, 1] }, { $not: ["$lead._id"] }] }, 1, 0] } },
              p4_avgTime: { $avg: { $cond: [{ $and: [{ $gte: ["$call_time", eightDaysAgo] }, { $lt: ["$call_time", fourDaysAgo] }, { $ne: [{ $dayOfWeek: "$call_time" }, 1] }] }, "$duration_seconds", null] } }
            }
          }
        ],

        // 3. For Pagination Logic
        totalCount: [{ $count: "count" }],
      },
    });

 
    
    // Build the final, clean stats object to send to the frontend
   
    const result = await db.collection("call_logs").aggregate(pipeline).toArray();
    const rows = result[0]?.data || [];
    const total = result[0]?.totalCount?.[0]?.count || 0;
    
    // Extract stats (fallback to 0s if empty)
// Helper function to calculate percentage trend safely
    const calcTrend = (current, previous) => {
      const cur = current || 0;
      const prev = previous || 0;
      if (prev > 0) return Number((((cur - prev) / prev) * 100).toFixed(2));
      if (cur > 0) return 100; // 100% increase if previous was 0 but we have calls now
      return 0;
    };

    const rawStats = result[0]?.stats?.[0] || {};
    
    // Build the final, clean stats object to send to the frontend
    const stats = {
      totalCalls: {
        count: rawStats.totalCalls || 0,
        trend: calcTrend(rawStats.c4_total, rawStats.p4_total)
      },
      incomingCalls: {
        count: rawStats.incomingCalls || 0,
        trend: calcTrend(rawStats.c4_incoming, rawStats.p4_incoming)
      },
      outgoingCalls: {
        count: rawStats.outgoingCalls || 0,
        trend: calcTrend(rawStats.c4_outgoing, rawStats.p4_outgoing)
      },
      missedCalls: {
        count: rawStats.missedCalls || 0,
        trend: calcTrend(rawStats.c4_missed, rawStats.p4_missed)
      },
      unregisteredCalls: {
        count: rawStats.unregisteredCalls || 0,
        trend: calcTrend(rawStats.c4_unregistered, rawStats.p4_unregistered)
      },
      averageCallTime: {
        count: Number((rawStats.averageCallTime || 0).toFixed(2)),
        trend: calcTrend(rawStats.c4_avgTime, rawStats.p4_avgTime)
      }
    };

    // Remove the _id from the stats object to keep it clean for frontend
    delete stats._id;

    // ------------------------------------------
    // APPLICATION LEVEL JOIN: Fetch User Names
    // ------------------------------------------
    
    const uniqueUserIds = [...new Set(rows.map(row => row.userId).filter(Boolean))];

    if (uniqueUserIds.length > 0) {
      const objectIdsToFetch = uniqueUserIds.reduce((acc, id) => {
        const strId = id.toString();
        if (ObjectId.isValid(strId)) {
          acc.push(new ObjectId(strId));
        }
        return acc;
      }, []);

      const users = await usersDb
        .collection("users")
        .find({ _id: { $in: objectIdsToFetch } })
        .project({ name: 1 })
        .toArray();

      const userMap = {};
      users.forEach(u => {
        userMap[u._id.toString()] = u.name;
      });

      rows.forEach(row => {
        if (row.userId && userMap[row.userId.toString()]) {
          row.counsellorName = userMap[row.userId.toString()];
        } else {
          row.counsellorName = row.lead?.assignedTo?.name || "Unknown";
        }
      });
    } else {
      rows.forEach(row => {
        row.counsellorName = row.lead?.assignedTo?.name || "Unknown";
      });
    }

    return NextResponse.json({
      success: true,
      stats, // <--- New Stats Object Sent to Frontend
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasNextPage: page < Math.ceil(total / pageSize),
      hasPreviousPage: page > 1,
      data: rows,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}