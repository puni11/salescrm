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
        
        // 2. The Dashboard Statistics
        stats: [
          {
            $group: {
              _id: null,
              totalCalls: { $sum: 1 },
              incomingCalls: {
                $sum: { $cond: [{ $eq: ["$call_type", "INCOMING"] }, 1, 0] }
              },
              outgoingCalls: {
                $sum: { $cond: [{ $eq: ["$call_type", "OUTGOING"] }, 1, 0] }
              },
              missedCalls: {
                $sum: { $cond: [{ $eq: ["$call_type", "MISSED"] }, 1, 0] }
              },
              unregisteredCalls: {
                $sum: { $cond: [{ $not: ["$lead._id"] }, 1, 0] } // Counts if lead._id is missing
              }
            }
          }
        ],

        // 3. For Pagination Logic
        totalCount: [{ $count: "count" }],
      },
    });

    // ------------------------------------------
    // Execute Aggregation
    // ------------------------------------------

    const result = await db.collection("call_logs").aggregate(pipeline).toArray();
    const rows = result[0]?.data || [];
    const total = result[0]?.totalCount?.[0]?.count || 0;
    
    // Extract stats (fallback to 0s if empty)
    const stats = result[0]?.stats?.[0] || {
      totalCalls: 0,
      incomingCalls: 0,
      outgoingCalls: 0,
      missedCalls: 0,
      unregisteredCalls: 0
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