import { NextResponse } from "next/server";
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

// Normalize tag names to avoid spacing,
// hyphen and capitalization mismatches.
const normalizeTagKey = (tag) =>
  normalizeText(getTagValue(tag))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export async function GET() {
  try {
    const client = await clientPromise;

    const salesDB = client.db("sales");
    const internalDB = client.db("internal");

    const dm = salesDB.collection("dm");
    const callLogs = salesDB.collection("call_logs");
    const engagement = salesDB.collection("engagement");
    const whatsapp = salesDB.collection("whatsapp_logs");
    const users = internalDB.collection("users");
    const followUp = salesDB.collection("followUp");

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
    // PARALLEL DATABASE QUERIES
    // ==========================================

    const [
      totalLeads,
      todayLeads,
      monthLeads,
      totalCalls,
      todayCalls,
      totalWhatsapp,
      activeCounsellors,
      engagementScoreAgg,
      avgLeadScoreAgg,
      pipelineAggregation,
      tagDistribution,
      monthlyLeads,
      courseDistribution,
      sourceDistribution,
      callAnalytics,
      engagementAnalytics,
      topCounsellors,
      recentLeads,
      recentCalls,
      recentWhatsapp,
      recentComments,
      topEngagedLeads,
      conversion,
      todayFollowUps,
    ] = await Promise.all([

      // ==========================================
      // TOTAL LEADS
      // ==========================================
      dm.countDocuments(),

      // ==========================================
      // TODAY'S LEADS
      // ==========================================
      dm.countDocuments({
        createdAt: {
          $gte: today,
          $lt: tomorrow,
        },
      }),

      // ==========================================
      // MONTHLY LEADS
      // ==========================================
      dm.countDocuments({
        createdAt: {
          $gte: monthStart,
        },
      }),

      // ==========================================
      // TOTAL CALLS
      // ==========================================
      callLogs.countDocuments(),

      // ==========================================
      // TODAY'S CALLS
      // ==========================================
      callLogs.countDocuments({
        createdAt: {
          $gte: today,
          $lt: tomorrow,
        },
      }),

      // ==========================================
      // TOTAL WHATSAPP MESSAGES
      // ==========================================
      whatsapp.countDocuments(),

      // ==========================================
      // ACTIVE COUNSELLORS
      // ==========================================
      users.countDocuments({
        role: "counsellor",
        isBlocked: false,
      }),

      // ==========================================
      // TOTAL ENGAGEMENT SCORE
      // ==========================================
      engagement.aggregate([
        {
          $group: {
            _id: null,
            score: {
              $sum: "$score",
            },
          },
        },
      ]).toArray(),

      // ==========================================
      // AVERAGE LEAD SCORE
      // ==========================================
      engagement.aggregate([
        {
          $group: {
            _id: "$leadId",
            score: {
              $sum: "$score",
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
      // COUNT STATUS AND TAGS
      // ==========================================
      dm.aggregate([
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

            // Count leads in each status
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

            // Count individual tags within each status
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
      engagement.aggregate([
        {
          $group: {
            _id: "$type",

            count: {
              $sum: 1,
            },

            score: {
              $sum: "$score",
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
      // TOP COUNSELLORS
      // ==========================================
      dm.aggregate([
        {
          $group: {
            _id: "$assignedTo.name",

            assignedLeads: {
              $sum: 1,
            },
          },
        },

        {
          $project: {
            _id: 0,
            name: "$_id",
            assignedLeads: 1,
          },
        },

        {
          $sort: {
            assignedLeads: -1,
          },
        },
      ]).toArray(),

      // ==========================================
      // RECENT LEADS
      // ==========================================
      dm.find(
        {},
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
      callLogs.find({})
        .sort({
          call_time: -1,
        })
        .limit(10)
        .toArray(),

      // ==========================================
      // RECENT WHATSAPP
      // ==========================================
      whatsapp.find({})
        .sort({
          sentAt: -1,
        })
        .limit(10)
        .toArray(),

      // ==========================================
      // RECENT COMMENTS
      // ==========================================
      dm.aggregate([
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
      engagement.aggregate([
        {
          $group: {
            _id: "$leadId",

            score: {
              $sum: "$score",
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
          $lookup: {
            from: "dm",
            localField: "_id",
            foreignField: "_id",
            as: "lead",
          },
        },

        {
          $unwind: "$lead",
        },

        {
          $project: {
            _id: 0,
            score: 1,
            name: "$lead.name",
            phone: "$lead.phone",
            status: "$lead.status",
            tags: "$lead.tags",
            course: "$lead.course",
          },
        },
      ]).toArray(),

      // ==========================================
      // CONVERSION
      // ==========================================
      Promise.all([
        dm.countDocuments(),

        dm.countDocuments({
          status: {
            $in: [
              "Admission Done",
              "Converted",
              "Registered",
              "Closed Won",
            ],
          },
        }),
      ]),

      // ==========================================
      // TODAY'S FOLLOW-UPS
      // ==========================================
      followUp.countDocuments({
        followUpDate: {
          $gte: today,
          $lt: tomorrow,
        },
      }),
    ]);

    // ==========================================
    // FORMAT PIPELINE DATA USING STATUS_TAGS
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

    // Total leads across all configured pipeline statuses
    const pipelineTotal = leadStatus.reduce(
      (sum, item) => sum + item.count,
      0
    );

    // ==========================================
    // MONTHLY CHART
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

    let totalAvg = 0;

    callAnalytics.forEach((c) => {
      const type = (c._id || "").toUpperCase();

      if (type === "INCOMING") {
        callSummary.incoming = c.total;
      }

      if (type === "OUTGOING") {
        callSummary.outgoing = c.total;
      }

      if (type === "MISSED") {
        callSummary.missed = c.total;
      }

      if (type === "REJECTED") {
        callSummary.rejected = c.total;
      }

      totalAvg += c.avgDuration || 0;
    });

    if (callAnalytics.length) {
      callSummary.averageDuration = Math.round(
        totalAvg / callAnalytics.length
      );
    }

    // ==========================================
    // RECENT ACTIVITIES
    // ==========================================
    const recentActivities = [
      ...recentCalls.map((x) => ({
        type: "CALL",
        phone: x.phone,
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
        time: x.createdAt,
      })),
    ]
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

      summary: {
        totalLeads,
        todayLeads,
        monthLeads,
        totalCalls,
        todayCalls,
        totalWhatsapp,
        todayFollowUps,
        activeCounsellors,

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

      // Pipeline counts
      pipelineTotal,
      leadStatus,

      // Other dashboard analytics
      tagDistribution,
      monthlyLeadChart,
      callSummary,
      engagementAnalytics,
      courseDistribution,
      sourceDistribution,
      topCounsellors,
      recentLeads,
      recentActivities,
      topEngagedLeads,
    });
  } catch (err) {
    console.error("Dashboard API error:", err);

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