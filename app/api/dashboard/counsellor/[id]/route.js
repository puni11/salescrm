import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    // ==============================
    // VALIDATE COUNSELLOR ID
    // ==============================

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid counsellor ID",
        },
        { status: 400 }
      );
    }

    // dm.assignedTo._id is ObjectId
    const counsellorObjectId = new ObjectId(id);

    // call_logs.userId is String
    const counsellorIdString = id;

    // ==============================
    // DATABASE CONNECTION
    // ==============================

    const client = await clientPromise;

    const salesDB = client.db("sales");
    const internalDB = client.db("internal");

    const dm = salesDB.collection("dm");
    const callLogs = salesDB.collection("call_logs");
    const engagement = salesDB.collection("engagement");
    const whatsapp = salesDB.collection("whatsapp_logs");
    const followUp = salesDB.collection("followUp");

    const users = internalDB.collection("users");

    // ==============================
    // CHECK COUNSELLOR
    // ==============================

    const counsellor = await users.findOne(
      {
  _id: counsellorObjectId,
  role: {
    $in: ["counsellor", "manager"],
  },
},
      {
        projection: {
          name: 1,
          email: 1,
          role: 1,
        },
      }
    );

    if (!counsellor) {
      return NextResponse.json(
        {
          success: false,
          message: "Counsellor not found",
        },
        { status: 404 }
      );
    }

    // ==============================
    // DATE RANGES
    // ==============================

    const now = new Date();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    // ==============================
    // FILTERS
    // ==============================

   const SPECIAL_COUNSELLOR_ID = "6a87f6bcdde10a504a995702";

const specialCourses = [
  "Azure + Azure DevOps",
  "RedHat + CKA Affordable Certification",
];

let leadFilter;

if (id === SPECIAL_COUNSELLOR_ID) {
  leadFilter = {
    course: {
      $in: specialCourses,
    },
  };
} else {
  leadFilter = {
    "assignedTo._id": counsellorObjectId,
  };
}
    const callFilter = {
      userId: counsellorIdString,
    };

    // ==============================
    // DASHBOARD QUERIES
    // ==============================

    const [
      totalLeads,
      todayLeads,
      monthLeads,

      totalCalls,
      todayCalls,

      totalWhatsapp,
      todayFollowUps,

      engagementScoreAgg,
      avgLeadScoreAgg,

      leadStatus,
      monthlyLeads,
      courseDistribution,

      callAnalytics,

      recentLeads,
      recentCalls,
      recentWhatsapp,
      recentComments,

      topEngagedLeads,

      conversion,
    ] = await Promise.all([
      // ============================
      // TOTAL LEADS
      // ============================

      dm.countDocuments(leadFilter),

      // ============================
      // TODAY LEADS
      // ============================

      dm.countDocuments({
        ...leadFilter,
        createdAt: {
          $gte: today,
          $lt: tomorrow,
        },
      }),

      // ============================
      // MONTH LEADS
      // ============================

      dm.countDocuments({
        ...leadFilter,
        createdAt: {
          $gte: monthStart,
        },
      }),

      // ============================
      // TOTAL CALLS
      // ============================

      callLogs.countDocuments(callFilter),

      // ============================
      // TODAY CALLS
      // ============================

      callLogs.countDocuments({
        ...callFilter,
        createdAt: {
          $gte: today,
          $lt: tomorrow,
        },
      }),

      // ============================
      // TOTAL WHATSAPP
      // Assumes whatsapp_logs.leadId
      // ============================

      dm
        .aggregate([
          {
            $match: leadFilter,
          },
          {
            $lookup: {
              from: "whatsapp_logs",
              localField: "_id",
              foreignField: "leadId",
              as: "whatsapp",
            },
          },
          {
            $unwind: "$whatsapp",
          },
          {
            $count: "count",
          },
        ])
        .toArray(),

      // ============================
      // TODAY FOLLOW UPS
      // ============================

      dm
        .aggregate([
          {
            $match: leadFilter,
          },
          {
            $lookup: {
              from: "followUp",
              localField: "_id",
              foreignField: "leadId",
              as: "followups",
            },
          },
          {
            $unwind: "$followups",
          },
          {
            $match: {
              "followups.followUpDate": {
                $gte: today,
                $lt: tomorrow,
              },
            },
          },
          {
            $count: "count",
          },
        ])
        .toArray(),

      // ============================
      // TOTAL ENGAGEMENT SCORE
      // ============================

      dm
        .aggregate([
          {
            $match: leadFilter,
          },
          {
            $lookup: {
              from: "engagement",
              localField: "_id",
              foreignField: "leadId",
              as: "engagements",
            },
          },
          {
            $unwind: "$engagements",
          },
          {
            $group: {
              _id: null,
              score: {
                $sum: "$engagements.score",
              },
            },
          },
        ])
        .toArray(),

      // ============================
      // AVERAGE LEAD SCORE
      // ============================

      dm
        .aggregate([
          {
            $match: leadFilter,
          },
          {
            $lookup: {
              from: "engagement",
              localField: "_id",
              foreignField: "leadId",
              as: "engagements",
            },
          },
          {
            $unwind: "$engagements",
          },
          {
            $group: {
              _id: "$_id",
              score: {
                $sum: "$engagements.score",
              },
            },
          },
          {
            $group: {
              _id: null,
              avg: {
                $avg: "$score",
              },
            },
          },
        ])
        .toArray(),

      // ============================
      // LEAD STATUS DISTRIBUTION
      // ============================

      dm
        .aggregate([
          {
            $match: leadFilter,
          },
          {
            $group: {
              _id: "$status",
              count: {
                $sum: 1,
              },
            },
          },
          {
            $project: {
              _id: 0,
              status: "$_id",
              count: 1,
            },
          },
          {
            $sort: {
              count: -1,
            },
          },
        ])
        .toArray(),

      // ============================
      // MONTHLY LEADS
      // ============================

      dm
        .aggregate([
          {
            $match: leadFilter,
          },
          {
            $group: {
              _id: {
                year: {
                  $year: "$createdAt",
                },
                month: {
                  $month: "$createdAt",
                },
              },
              leads: {
                $sum: 1,
              },
            },
          },
          {
            $sort: {
              "_id.year": 1,
              "_id.month": 1,
            },
          },
        ])
        .toArray(),

      // ============================
      // COURSE DISTRIBUTION
      // ============================

      dm
        .aggregate([
          {
            $match: leadFilter,
          },
          {
            $group: {
              _id: "$course",
              count: {
                $sum: 1,
              },
            },
          },
          {
            $project: {
              _id: 0,
              course: "$_id",
              count: 1,
            },
          },
          {
            $sort: {
              count: -1,
            },
          },
        ])
        .toArray(),

      // ============================
      // CALL ANALYTICS
      // ============================

      callLogs
        .aggregate([
          {
            $match: callFilter,
          },
          {
            $group: {
              _id: "$call_type",
              total: {
                $sum: 1,
              },
              avgDuration: {
                $avg: "$duration_seconds",
              },
            },
          },
        ])
        .toArray(),

      // ============================
      // RECENT LEADS
      // ============================

      dm
        .find(leadFilter, {
          projection: {
            name: 1,
            phone: 1,
            status: 1,
            course: 1,
            assignedTo: 1,
            createdAt: 1,
          },
        })
        .sort({
          createdAt: -1,
        })
        .limit(10)
        .toArray(),

      // ============================
      // RECENT CALLS
      // ============================

      callLogs
        .find(callFilter)
        .sort({
          call_time: -1,
        })
        .limit(10)
        .toArray(),

      // ============================
      // RECENT WHATSAPP
      // ============================

      dm
        .aggregate([
          {
            $match: leadFilter,
          },
          {
            $lookup: {
              from: "whatsapp_logs",
              localField: "_id",
              foreignField: "leadId",
              as: "message",
            },
          },
          {
            $unwind: "$message",
          },
          {
            $replaceRoot: {
              newRoot: "$message",
            },
          },
          {
            $sort: {
              sentAt: -1,
            },
          },
          {
            $limit: 10,
          },
        ])
        .toArray(),

      // ============================
      // RECENT COMMENTS
      // ============================

      dm
        .aggregate([
          {
            $match: leadFilter,
          },
          {
            $unwind: "$comments",
          },
          {
            $project: {
              leadName: "$name",
              phone: "$phone",
              comment: "$comments.text",
              createdAt: "$comments.createdAt",
              createdBy: "$comments.createdBy.name",
            },
          },
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $limit: 10,
          },
        ])
        .toArray(),

      // ============================
      // TOP ENGAGED LEADS
      // ============================

      dm
        .aggregate([
          {
            $match: leadFilter,
          },
          {
            $lookup: {
              from: "engagement",
              localField: "_id",
              foreignField: "leadId",
              as: "engagements",
            },
          },
          {
            $unwind: "$engagements",
          },
          {
            $group: {
              _id: "$_id",
              score: {
                $sum: "$engagements.score",
              },
              name: {
                $first: "$name",
              },
              phone: {
                $first: "$phone",
              },
              status: {
                $first: "$status",
              },
              course: {
                $first: "$course",
              },
            },
          },
          {
            $sort: {
              score: -1,
            },
          },
          {
            $limit: 10,
          },
          {
            $project: {
              _id: 0,
              score: 1,
              name: 1,
              phone: 1,
              status: 1,
              course: 1,
            },
          },
        ])
        .toArray(),

      // ============================
      // CONVERSION DATA
      // ============================

      Promise.all([
        dm.countDocuments(leadFilter),

        dm.countDocuments({
          ...leadFilter,
          status: {
            $in: [
              "Admission Done",
              "Converted",
              "Closed Won",
            ],
          },
        }),
      ]),
    ]);

    // ==============================
    // MONTHLY LEADS CHART
    // ==============================

    const months = [
      "",
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const monthlyLeadChart = [];

    for (let i = 1; i <= 12; i++) {
      const found = monthlyLeads.find(
        (m) =>
          m._id.month === i &&
          m._id.year === now.getFullYear()
      );

      monthlyLeadChart.push({
        month: months[i],
        year: now.getFullYear(),
        leads: found ? found.leads : 0,
      });
    }

    // ==============================
    // CALL SUMMARY
    // ==============================

    const callSummary = {
      incoming: 0,
      outgoing: 0,
      missed: 0,
      rejected: 0,
      averageDuration: 0,
    };

    let totalDurationAverage = 0;

    callAnalytics.forEach((call) => {
      const type = (call._id || "").toUpperCase();

      if (type === "INCOMING") {
        callSummary.incoming = call.total;
      }

      if (type === "OUTGOING") {
        callSummary.outgoing = call.total;
      }

      if (type === "MISSED") {
        callSummary.missed = call.total;
      }

      if (type === "REJECTED") {
        callSummary.rejected = call.total;
      }

      totalDurationAverage += call.avgDuration || 0;
    });

    if (callAnalytics.length > 0) {
      callSummary.averageDuration = Math.round(
        totalDurationAverage / callAnalytics.length
      );
    }

    // ==============================
    // RECENT ACTIVITIES
    // ==============================

    const recentActivities = [
      ...recentCalls.map((x) => ({
        type: "CALL",
        phone: x.phone,
        callType: x.call_type,
        duration: x.duration_seconds,
        time: x.call_time,
      })),

      ...recentWhatsapp.map((x) => ({
        type: "WHATSAPP",
        phone: x.phone,
        time: x.sentAt,
        message: x.message,
      })),

      ...recentComments.map((x) => ({
        type: "COMMENT",
        lead: x.leadName,
        phone: x.phone,
        comment: x.comment,
        createdBy: x.createdBy,
        time: x.createdAt,
      })),
    ]
      .filter((activity) => activity.time)
      .sort(
        (a, b) =>
          new Date(b.time) - new Date(a.time)
      )
      .slice(0, 20);

    // ==============================
    // RESPONSE
    // ==============================

    return NextResponse.json({
      success: true,

      counsellor: {
        id: counsellor._id.toString(),
        name: counsellor.name,
        email: counsellor.email,
      },

      summary: {
        totalLeads,
        todayLeads,
        monthLeads,

        totalCalls,
        todayCalls,

        totalWhatsapp:
          totalWhatsapp[0]?.count || 0,

        todayFollowUps:
          todayFollowUps[0]?.count || 0,

        totalEngagementScore:
          engagementScoreAgg[0]?.score || 0,

        averageLeadScore:
          Math.round(
            avgLeadScoreAgg[0]?.avg || 0
          ),

        conversionRate:
          conversion[0] > 0
            ? Number(
                (
                  (conversion[1] /
                    conversion[0]) *
                  100
                ).toFixed(2)
              )
            : 0,
      },

      leadStatus,

      monthlyLeadChart,

      callSummary,

      courseDistribution,

      recentLeads,

      recentActivities,

      topEngagedLeads,
    });

  } catch (err) {
    console.error(
      "Counsellor dashboard error:",
      err
    );

    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      {
        status: 500,
      }
    );
  }
}