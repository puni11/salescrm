import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

function getLast7DaysTemplate() {
  const map = {};

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);

    const key = d.toISOString().split("T")[0];

    map[key] = {
      date: key,
      CALL: 0,
      WHATSAPP: 0,
      NOTE: 0,
    };
  }

  return map;
}

function pct(current, previous) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const { searchParams } = new URL(request.url);

    const limit = parseInt(
      searchParams.get("limit") || "50",
      10
    );

    // --------------------------------------------------
    // Validate counsellor ID
    // --------------------------------------------------

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid counsellor ID",
        },
        { status: 400 }
      );
    }

    const counsellorId = id;
    const counsellorObjectId = new ObjectId(id);

    // --------------------------------------------------
    // Database
    // --------------------------------------------------

    const client = await clientPromise;

    const salesDb = client.db("sales");
    const internalDb = client.db("internal");

    // --------------------------------------------------
    // Base filters
    // --------------------------------------------------

    // call_logs stores counsellor ID directly
    const callMatch = {
      userId: counsellorId,
    };

    // dm stores counsellor inside assignedTo._id
    const dmMatch = {
      "assignedTo._id": counsellorObjectId,
    };

    // --------------------------------------------------
    // Date ranges
    // --------------------------------------------------

    const now = new Date();

    // End of today
    const today = new Date(now);
    today.setHours(23, 59, 59, 999);

    // Last 7 days including today
    const currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - 6);
    currentStart.setHours(0, 0, 0, 0);

    // Previous 7 days
    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 7);

    const previousEnd = new Date(currentStart);
    previousEnd.setMilliseconds(-1);

    // --------------------------------------------------
    // Helper for WhatsApp lookup
    // --------------------------------------------------

    const whatsappLeadLookup = {
      $lookup: {
        from: "dm",

        let: {
          leadId: {
            $convert: {
              input: "$leadId",
              to: "objectId",
              onError: null,
              onNull: null,
            },
          },
        },

        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ["$_id", "$$leadId"],
                  },
                  {
                    $eq: [
                      "$assignedTo._id",
                      counsellorObjectId,
                    ],
                  },
                ],
              },
            },
          },
        ],

        as: "leadData",
      },
    };

    // --------------------------------------------------
    // Get all required data
    // --------------------------------------------------

    const [
      callLogs,
      whatsappLogs,
      leadComments,

      // Total
      totalCalls,
      totalWhatsapp,
      totalNotesAgg,

      // Trends
      callTrend,
      whatsappTrend,
      noteTrend,

      // Current 7 days
      currentCalls,
      previousCalls,

      currentWhatsapp,
      previousWhatsapp,

      currentNotesAgg,
      previousNotesAgg,
    ] = await Promise.all([

      // ==================================================
      // RECENT CALLS
      // ==================================================

      salesDb
        .collection("call_logs")
        .aggregate([
          {
            $match: callMatch,
          },

          {
            $sort: {
              createdAt: -1,
            },
          },

          {
            $limit: limit,
          },

          {
            $lookup: {
              from: "dm",

              localField: "phone",

              foreignField: "phone",

              as: "leadData",
            },
          },
        ])
        .toArray(),

      // ==================================================
      // RECENT WHATSAPP
      // ==================================================

      salesDb
        .collection("whatsapp_logs")
        .aggregate([
          {
            $sort: {
              createdAt: -1,
            },
          },

          whatsappLeadLookup,

          // Only WhatsApp messages whose lead belongs
          // to this counsellor
          {
            $match: {
              "leadData.0": {
                $exists: true,
              },
            },
          },

          {
            $limit: limit,
          },
        ])
        .toArray(),

      // ==================================================
      // RECENT NOTES
      // ==================================================

      salesDb
        .collection("dm")
        .aggregate([
          {
            $match: dmMatch,
          },

          {
            $unwind: "$comments",
          },

          {
            $sort: {
              "comments.createdAt": -1,
            },
          },

          {
            $limit: limit,
          },
        ])
        .toArray(),

      // ==================================================
      // TOTAL CALLS
      // ==================================================

      salesDb
        .collection("call_logs")
        .countDocuments(callMatch),

      // ==================================================
      // TOTAL WHATSAPP
      // ==================================================

      salesDb
        .collection("whatsapp_logs")
        .aggregate([
          whatsappLeadLookup,

          {
            $match: {
              "leadData.0": {
                $exists: true,
              },
            },
          },

          {
            $count: "total",
          },
        ])
        .toArray(),

      // ==================================================
      // TOTAL NOTES
      // ==================================================

      salesDb
        .collection("dm")
        .aggregate([
          {
            $match: dmMatch,
          },

          {
            $unwind: "$comments",
          },

          {
            $count: "total",
          },
        ])
        .toArray(),

      // ==================================================
      // CALL TREND
      // ==================================================

      salesDb
        .collection("call_logs")
        .aggregate([
          {
            $match: {
              ...callMatch,

              createdAt: {
                $gte: currentStart,
                $lte: today,
              },
            },
          },

          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                },
              },

              count: {
                $sum: 1,
              },
            },
          },
        ])
        .toArray(),

      // ==================================================
      // WHATSAPP TREND
      // ==================================================

      salesDb
        .collection("whatsapp_logs")
        .aggregate([
          {
            $match: {
              createdAt: {
                $gte: currentStart,
                $lte: today,
              },
            },
          },

          whatsappLeadLookup,

          {
            $match: {
              "leadData.0": {
                $exists: true,
              },
            },
          },

          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                },
              },

              count: {
                $sum: 1,
              },
            },
          },
        ])
        .toArray(),

      // ==================================================
      // NOTE TREND
      // ==================================================

      salesDb
        .collection("dm")
        .aggregate([
          {
            $match: dmMatch,
          },

          {
            $unwind: "$comments",
          },

          {
            $match: {
              "comments.createdAt": {
                $gte: currentStart,
                $lte: today,
              },
            },
          },

          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$comments.createdAt",
                },
              },

              count: {
                $sum: 1,
              },
            },
          },
        ])
        .toArray(),

      // ==================================================
      // CURRENT CALLS - LAST 7 DAYS
      // ==================================================

      salesDb
        .collection("call_logs")
        .countDocuments({
          ...callMatch,

          createdAt: {
            $gte: currentStart,
            $lte: today,
          },
        }),

      // ==================================================
      // PREVIOUS CALLS - PREVIOUS 7 DAYS
      // ==================================================

      salesDb
        .collection("call_logs")
        .countDocuments({
          ...callMatch,

          createdAt: {
            $gte: previousStart,
            $lte: previousEnd,
          },
        }),

      // ==================================================
      // CURRENT WHATSAPP - LAST 7 DAYS
      // ==================================================

      salesDb
        .collection("whatsapp_logs")
        .aggregate([
          {
            $match: {
              createdAt: {
                $gte: currentStart,
                $lte: today,
              },
            },
          },

          whatsappLeadLookup,

          {
            $match: {
              "leadData.0": {
                $exists: true,
              },
            },
          },

          {
            $count: "total",
          },
        ])
        .toArray(),

      // ==================================================
      // PREVIOUS WHATSAPP - PREVIOUS 7 DAYS
      // ==================================================

      salesDb
        .collection("whatsapp_logs")
        .aggregate([
          {
            $match: {
              createdAt: {
                $gte: previousStart,
                $lte: previousEnd,
              },
            },
          },

          whatsappLeadLookup,

          {
            $match: {
              "leadData.0": {
                $exists: true,
              },
            },
          },

          {
            $count: "total",
          },
        ])
        .toArray(),

      // ==================================================
      // CURRENT NOTES
      // ==================================================

      salesDb
        .collection("dm")
        .aggregate([
          {
            $match: dmMatch,
          },

          {
            $unwind: "$comments",
          },

          {
            $match: {
              "comments.createdAt": {
                $gte: currentStart,
                $lte: today,
              },
            },
          },

          {
            $count: "total",
          },
        ])
        .toArray(),

      // ==================================================
      // PREVIOUS NOTES
      // ==================================================

      salesDb
        .collection("dm")
        .aggregate([
          {
            $match: dmMatch,
          },

          {
            $unwind: "$comments",
          },

          {
            $match: {
              "comments.createdAt": {
                $gte: previousStart,
                $lte: previousEnd,
              },
            },
          },

          {
            $count: "total",
          },
        ])
        .toArray(),
    ]);

    // --------------------------------------------------
    // Extract counts
    // --------------------------------------------------

    const totalWhatsappCount =
      totalWhatsapp[0]?.total || 0;

    const noteTotal =
      totalNotesAgg[0]?.total || 0;

    const currentWhatsappCount =
      currentWhatsapp[0]?.total || 0;

    const previousWhatsappCount =
      previousWhatsapp[0]?.total || 0;

    const currentNotes =
      currentNotesAgg[0]?.total || 0;

    const previousNotes =
      previousNotesAgg[0]?.total || 0;

    // --------------------------------------------------
    // Build trends
    // --------------------------------------------------

    const trends = getLast7DaysTemplate();

    callTrend.forEach((item) => {
      if (trends[item._id]) {
        trends[item._id].CALL = item.count;
      }
    });

    whatsappTrend.forEach((item) => {
      if (trends[item._id]) {
        trends[item._id].WHATSAPP = item.count;
      }
    });

    noteTrend.forEach((item) => {
      if (trends[item._id]) {
        trends[item._id].NOTE = item.count;
      }
    });

    // --------------------------------------------------
    // Get counsellor user
    // --------------------------------------------------

    const user = await internalDb
      .collection("users")
      .findOne(
        {
          _id: counsellorObjectId,
        },
        {
          projection: {
            name: 1,
          },
        }
      );

    const counsellorName =
      user?.name || "Unknown";

    // --------------------------------------------------
    // Format CALL interactions
    // --------------------------------------------------

    const calls = callLogs.map((call) => ({
      id: call._id.toString(),

      interactionType: "CALL",

      details: `${call.call_type || "Unknown"} Call - ${
        call.status || "Unknown"
      }`,

      leadName:
        call.leadData?.[0]?.name ||
        "Unknown Lead",

      phone: call.phone,

      counsellorName,

      timestamp: call.createdAt,
    }));

    // --------------------------------------------------
    // Format WHATSAPP interactions
    // --------------------------------------------------

    const wa = whatsappLogs.map((item) => {
      const lead = item.leadData?.[0];

      return {
        id: item._id.toString(),

        interactionType: "WHATSAPP",

        details:
          item.message ||
          item.text ||
          "WhatsApp message",

        leadName:
          lead?.name ||
          "Unknown Lead",

        phone:
          item.phone ||
          lead?.phone ||
          "",

        counsellorName:
          lead?.assignedTo?.name ||
          counsellorName,

        timestamp: item.createdAt,
      };
    });

    // --------------------------------------------------
    // Format NOTES
    // --------------------------------------------------

    const notes = leadComments.map((item) => ({
      id:
        item._id.toString() +
        String(item.comments.createdAt),

      interactionType: "NOTE",

      details:
        item.comments?.text ||
        "",

      leadName:
        item.name ||
        "Unknown Lead",

      phone:
        item.phone ||
        "",

      counsellorName:
        item.comments?.createdBy?.name ||
        counsellorName,

      timestamp:
        item.comments.createdAt,
    }));

    // --------------------------------------------------
    // Combine all interactions
    // --------------------------------------------------

    const data = [
      ...calls,
      ...wa,
      ...notes,
    ]
      .sort(
        (a, b) =>
          new Date(b.timestamp) -
          new Date(a.timestamp)
      )
      .slice(0, limit);

    // --------------------------------------------------
    // Stats
    // --------------------------------------------------

    const total =
      totalCalls +
      totalWhatsappCount +
      noteTotal;

    const currentTotal =
      currentCalls +
      currentWhatsappCount +
      currentNotes;

    const previousTotal =
      previousCalls +
      previousWhatsappCount +
      previousNotes;

    // --------------------------------------------------
    // Response
    // --------------------------------------------------

    return NextResponse.json({
      success: true,

      counsellor: {
        id: counsellorId,

        name: counsellorName,
      },

      stats: {
        // ----------------------------------------------
        // Lifetime totals
        // ----------------------------------------------

        total,

        byType: {
          CALL: totalCalls,

          WHATSAPP:
            totalWhatsappCount,

          NOTE: noteTotal,
        },

        // ----------------------------------------------
        // Last 7 days
        // ----------------------------------------------

        last7Days: {
          CALL: currentCalls,

          WHATSAPP:
            currentWhatsappCount,

          NOTE: currentNotes,

          TOTAL: currentTotal,
        },

        // ----------------------------------------------
        // Comparison
        // ----------------------------------------------

        comparison: {
          CALL: {
            current: currentCalls,

            previous: previousCalls,

            change: pct(
              currentCalls,
              previousCalls
            ),
          },

          WHATSAPP: {
            current:
              currentWhatsappCount,

            previous:
              previousWhatsappCount,

            change: pct(
              currentWhatsappCount,
              previousWhatsappCount
            ),
          },

          NOTE: {
            current: currentNotes,

            previous: previousNotes,

            change: pct(
              currentNotes,
              previousNotes
            ),
          },

          TOTAL: {
            current: currentTotal,

            previous: previousTotal,

            change: pct(
              currentTotal,
              previousTotal
            ),
          },
        },

        // ----------------------------------------------
        // 7-day trend
        // ----------------------------------------------

        trends:
          Object.values(trends),
      },

      // ----------------------------------------------
      // Recent interactions
      // ----------------------------------------------

      data,
    });
  } catch (error) {
    console.error(
      "Interaction dashboard API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          "Failed to fetch interactions",

        message:
          error?.message,
      },
      {
        status: 500,
      }
    );
  }
}