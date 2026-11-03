
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

// ==========================================
// PIPELINE STATUS AND TAG CONFIGURATION
// ==========================================

const STATUS_TAGS = {
  "New Lead": [],
  Cold: [
    "Connected -Dropped Whatsapp",
    "Tried But Didn’t Connected",
    "Not Interested",
  ],
  Warm: [
    "Call after sometime",
    "Price Issue",
    "Timing Issues",
    "Counselled - Now Not Interested",
    "Follow Up",
  ],
  Hot: [
    "Interested",
    "Demo req",
    "Demo Done",
    "Walk in",
    "Next Batch",
    "Waiting for approval",
  ],
  Registered: ["Fees topups"],
  Invalid: ["Not relevant", "Invalid No"],
  "Other Course": [],
  "Looking For a job": [],
};

// ==========================================
// HELPERS
// ==========================================

const normalizeText = (value) =>
  String(value ?? "").trim();

const getTagValue = (tag) => {
  if (tag && typeof tag === "object") {
    return normalizeText(tag.name ?? tag.label ?? "");
  }

  return normalizeText(tag);
};

const normalizeTagKey = (tag) =>
  normalizeText(getTagValue(tag))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const CONVERTED_STATUSES = [
  "Admission Done",
  "Converted",
  "Registered",
  "Closed Won",
];

const SPECIAL_COUNSELLOR_ID = "6a87f6bcdde10a504a995702";

const SPECIAL_COURSES = [
  "Azure + Azure DevOps",
  "RedHat + CKA Affordable Certification",
  "GenAi",
];

// ==========================================
// GET COUNSELLOR DASHBOARD
// ==========================================

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    // ==========================================
    // VALIDATE COUNSELLOR
    // ==========================================

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid counsellor ID",
        },
        { status: 400 }
      );
    }

    const counsellorObjectId = new ObjectId(id);
    const counsellorIdString = id;

    // ==========================================
    // DATABASE CONNECTION
    // ==========================================

    const client = await clientPromise;

    const salesDB = client.db("sales");
    const internalDB = client.db("internal");

    const dm = salesDB.collection("dm");
    const callLogs = salesDB.collection("call_logs");
    const engagement = salesDB.collection("engagement");
    const whatsapp = salesDB.collection("whatsapp_logs");
    const followUp = salesDB.collection("followUp");
    const users = internalDB.collection("users");

    // ==========================================
    // COUNSELLOR DETAILS
    // ==========================================

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

    // ==========================================
    // DATE RANGES
    // ==========================================

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

    // ==========================================
    // COUNSELLOR FILTERS
    // ==========================================

    let leadFilter;

    if (id === SPECIAL_COUNSELLOR_ID) {
      leadFilter = {
        course: {
          $in: SPECIAL_COURSES,
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

    // ==========================================
    // PARALLEL DATABASE QUERIES
    // ==========================================

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

      pipelineAggregation,
      tagDistribution,

      monthlyLeads,
      courseDistribution,
      sourceDistribution,

      callAnalytics,
      engagementAnalytics,

      recentLeads,
      recentCalls,
      recentWhatsapp,
      recentComments,

      topEngagedLeads,
      conversion,
    ] = await Promise.all([

      // ==========================================
      // TOTAL LEADS
      // ==========================================

      dm.countDocuments(leadFilter),

      // ==========================================
      // TODAY LEADS
      // ==========================================

      dm.countDocuments({
        ...leadFilter,
        createdAt: {
          $gte: today,
          $lt: tomorrow,
        },
      }),

      // ==========================================
      // MONTH LEADS
      // ==========================================

      dm.countDocuments({
        ...leadFilter,
        createdAt: {
          $gte: monthStart,
        },
      }),

      // ==========================================
      // TOTAL CALLS
      // ==========================================

      callLogs.countDocuments(callFilter),

      // ==========================================
      // TODAY CALLS
      // ==========================================

      callLogs.countDocuments({
        ...callFilter,
        createdAt: {
          $gte: today,
          $lt: tomorrow,
        },
      }),

      // ==========================================
      // TOTAL WHATSAPP MESSAGES
      // ==========================================

      dm.aggregate([
        {
          $match: leadFilter,
        },
        {
          $lookup: {
            from: "whatsapp_logs",
            localField: "_id",
            foreignField: "leadId",
            as: "messages",
          },
        },
        {
          $project: {
            count: {
              $size: "$messages",
            },
          },
        },
        {
          $group: {
            _id: null,
            count: {
              $sum: "$count",
            },
          },
        },
      ]).toArray(),

      // ==========================================
      // TODAY FOLLOW UPS
      // ==========================================

      dm.aggregate([
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
      ]).toArray(),

      // ==========================================
      // TOTAL ENGAGEMENT SCORE
      // ==========================================

      dm.aggregate([
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
      ]).toArray(),

      // ==========================================
      // AVERAGE LEAD SCORE
      // ==========================================

      dm.aggregate([
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
      ]).toArray(),

      // ==========================================
      // LEAD PIPELINE
      // STATUS + TAG COUNTS
      // ==========================================

      dm.aggregate([
        {
          $match: leadFilter,
        },
        {
          $project: {
            status: {
              $trim: {
                input: {
                  $ifNull: ["$status", ""],
                },
              },
            },
            tags: {
              $cond: [
                {
                  $isArray: "$tags",
                },
                "$tags",
                [],
              ],
            },
          },
        },
        {
          $facet: {
            // STATUS COUNTS
            statusCounts: [
              {
                $group: {
                  _id: "$status",
                  count: {
                    $sum: 1,
                  },
                },
              },
            ],

            // TAG COUNTS INSIDE EACH STATUS
            tagCounts: [
              {
                $unwind: "$tags",
              },
              {
                $project: {
                  status: 1,
                  tag: {
                    $cond: [
                      {
                        $eq: [
                          {
                            $type: "$tags",
                          },
                          "object",
                        ],
                      },
                      {
                        $ifNull: [
                          "$tags.name",
                          {
                            $ifNull: [
                              "$tags.label",
                              "",
                            ],
                          },
                        ],
                      },
                      "$tags",
                    ],
                  },
                },
              },
              {
                $project: {
                  status: 1,
                  tag: {
                    $trim: {
                      input: {
                        $convert: {
                          input: "$tag",
                          to: "string",
                          onError: "",
                          onNull: "",
                        },
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  tag: {
                    $ne: "",
                  },
                },
              },
              {
                $group: {
                  _id: {
                    status: "$status",
                    tag: "$tag",
                  },
                  count: {
                    $sum: 1,
                  },
                },
              },
            ],
          },
        },
      ]).toArray(),

      // ==========================================
      // OVERALL TAG DISTRIBUTION
      // ==========================================

      dm.aggregate([
        {
          $match: leadFilter,
        },
        {
          $project: {
            tags: {
              $cond: [
                {
                  $isArray: "$tags",
                },
                "$tags",
                [],
              ],
            },
          },
        },
        {
          $unwind: "$tags",
        },
        {
          $project: {
            tag: {
              $cond: [
                {
                  $eq: [
                    {
                      $type: "$tags",
                    },
                    "object",
                  ],
                },
                {
                  $ifNull: [
                    "$tags.name",
                    "$tags.label",
                  ],
                },
                "$tags",
              ],
            },
          },
        },
        {
          $project: {
            tag: {
              $trim: {
                input: {
                  $convert: {
                    input: "$tag",
                    to: "string",
                    onError: "",
                    onNull: "",
                  },
                },
              },
            },
          },
        },
        {
          $match: {
            tag: {
              $ne: "",
            },
          },
        },
        {
          $group: {
            _id: "$tag",
            count: {
              $sum: 1,
            },
          },
        },
        {
          $project: {
            _id: 0,
            tag: "$_id",
            count: 1,
          },
        },
        {
          $sort: {
            count: -1,
          },
        },
      ]).toArray(),

      // ==========================================
      // MONTHLY LEADS
      // ==========================================

      dm.aggregate([
        {
          $match: {
            ...leadFilter,
            createdAt: {
              $type: "date",
            },
          },
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
      ]).toArray(),

      // ==========================================
      // COURSE DISTRIBUTION
      // ==========================================

      dm.aggregate([
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
      ]).toArray(),

      // ==========================================
      // SOURCE DISTRIBUTION
      // ==========================================

      dm.aggregate([
        {
          $match: leadFilter,
        },
        {
          $group: {
            _id: {
              $ifNull: ["$source", "Unknown"],
            },
            count: {
              $sum: 1,
            },
          },
        },
        {
          $project: {
            _id: 0,
            source: "$_id",
            count: 1,
          },
        },
        {
          $sort: {
            count: -1,
          },
        },
      ]).toArray(),

      // ==========================================
      // CALL ANALYTICS
      // ==========================================

      callLogs.aggregate([
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
      ]).toArray(),

      // ==========================================
      // ENGAGEMENT ANALYTICS
      // ==========================================

      dm.aggregate([
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
            _id: "$engagements.type",
            count: {
              $sum: 1,
            },
            score: {
              $sum: "$engagements.score",
            },
          },
        },
        {
          $project: {
            _id: 0,
            type: "$_id",
            count: 1,
            score: 1,
          },
        },
      ]).toArray(),

      // ==========================================
      // RECENT LEADS
      // ==========================================

      dm.find(
        leadFilter,
        {
          projection: {
            name: 1,
            phone: 1,
            status: 1,
            tags: 1,
            course: 1,
            source: 1,
            assignedTo: 1,
            createdAt: 1,
          },
        }
      )
        .sort({
          createdAt: -1,
        })
        .limit(10)
        .toArray(),

      // ==========================================
      // RECENT CALLS
      // ==========================================

      callLogs.find(callFilter)
        .sort({
          call_time: -1,
        })
        .limit(10)
        .toArray(),

      // ==========================================
      // RECENT WHATSAPP
      // ==========================================

      dm.aggregate([
        {
          $match: leadFilter,
        },
        {
          $lookup: {
            from: "whatsapp_logs",
            localField: "_id",
            foreignField: "leadId",
            as: "messages",
          },
        },
        {
          $unwind: "$messages",
        },
        {
          $addFields: {
            "messages.leadName": "$name",
            "messages.leadPhone": "$phone",
          },
        },
        {
          $replaceRoot: {
            newRoot: "$messages",
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
      ]).toArray(),

      // ==========================================
      // RECENT COMMENTS
      // ==========================================

      dm.aggregate([
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
      ]).toArray(),

      // ==========================================
      // TOP ENGAGED LEADS
      // ==========================================

      dm.aggregate([
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
            tags: {
              $first: "$tags",
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
            tags: 1,
            course: 1,
          },
        },
      ]).toArray(),

      // ==========================================
      // CONVERSION DATA
      // ==========================================

      Promise.all([
        dm.countDocuments(leadFilter),

        dm.countDocuments({
          ...leadFilter,
          status: {
            $in: CONVERTED_STATUSES,
          },
        }),
      ]),
    ]);

    // ==========================================
    // FORMAT PIPELINE DATA
    // ==========================================

    const pipelineFacet = pipelineAggregation[0] || {};

    const statusCountMap = new Map(
      (pipelineFacet.statusCounts || []).map((item) => [
        normalizeText(item._id),
        item.count,
      ])
    );

    // ==========================================
    // NORMALIZED TAG COUNT MAP
    // ==========================================

    const tagCountMap = new Map();

    (pipelineFacet.tagCounts || []).forEach((item) => {
      const status = normalizeText(item._id.status);
      const tagKey = normalizeTagKey(item._id.tag);

      const key = `${status}|||${tagKey}`;

      tagCountMap.set(
        key,
        (tagCountMap.get(key) || 0) + item.count
      );
    });

    // ==========================================
    // BUILD LEAD STATUS RESPONSE
    // ==========================================

    const leadStatus = Object.entries(STATUS_TAGS).map(
      ([status, configuredTags]) => ({
        status,

        count: statusCountMap.get(status) || 0,

        tags: configuredTags.map((tag) => {
          const key = `${status}|||${normalizeTagKey(tag)}`;

          return {
            tag,
            count: tagCountMap.get(key) || 0,
          };
        }),
      })
    );

    const pipelineTotal = leadStatus.reduce(
      (sum, item) => sum + item.count,
      0
    );

    // ==========================================
    // MONTHLY LEADS CHART
    // ==========================================

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
          m._id.year === now.getFullYear() &&
          m._id.month === i
      );

      monthlyLeadChart.push({
        month: months[i],
        year: now.getFullYear(),
        leads: found ? found.leads : 0,
      });
    }

    // ==========================================
    // CALL SUMMARY
    // ==========================================

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

    // ==========================================
    // RECENT ACTIVITIES
    // ==========================================

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
        phone: x.phone || x.leadPhone,
        lead: x.leadName,
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

    // ==========================================
    // RESPONSE
    // ==========================================

    return NextResponse.json({
      success: true,

      counsellor: {
        id: counsellor._id.toString(),
        name: counsellor.name,
        email: counsellor.email,
        role: counsellor.role,
      },

      // ==========================================
      // SUMMARY
      // ==========================================

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

        averageLeadScore: Math.round(
          avgLeadScoreAgg[0]?.avg || 0
        ),

        conversionRate: conversion[0]
          ? Number(
              (
                (conversion[1] / conversion[0]) *
                100
              ).toFixed(2)
            )
          : 0,
      },

      // ==========================================
      // PIPELINE
      // ==========================================

      pipelineTotal,
      leadStatus,

      // ==========================================
      // DISTRIBUTIONS
      // ==========================================

      tagDistribution,
      courseDistribution,
      sourceDistribution,

      // ==========================================
      // ANALYTICS
      // ==========================================

      monthlyLeadChart,
      callSummary,
      engagementAnalytics,

      // ==========================================
      // RECENT DATA
      // ==========================================

      recentLeads,
      recentActivities,

      // ==========================================
      // TOP ENGAGED LEADS
      // ==========================================

      topEngagedLeads,
    });

  } catch (err) {
    console.error("Counsellor dashboard error:", err);

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}
