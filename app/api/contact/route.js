import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { after, NextResponse } from "next/server";
import { sendMail } from "@/lib/sendMail";
import { ObjectId } from "mongodb";
import welcomeHtml from "@/lib/emailHtml/welcomeHtml";
import { getLeadAssignment } from "@/lib/leadAssignment";
const SOURCE_TYPES = [
  "Direct",
  "Google",
  "Facebook",
  "Instagram",
  "LinkedIn",
  "Twitter",
  "Referral",
  "GS1"
];
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ success: false, message: "You are Not Authorised" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const search = searchParams.get("search") || "";
    const course = searchParams.get("course") || "";
    const sort = searchParams.get("sort");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const campaign = searchParams.get("campaign");
    const dateFilter = searchParams.get("dateFilter");
    const counsellorId = searchParams.get("counsellorId") || "";

    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db("sales");

    const query = {};
    if (session.user.role !== "admin") {
      query["assignedTo._id"] = new ObjectId(session.user.id);
    }

    // Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { profile: { $regex: search, $options: "i" } },
        { ip: { $regex: search, $options: "i" } },
      ];
    }

    // Filters
    if (status) query.status = status;
    if (campaign) query.campaign = campaign;
    if (counsellorId) query["assignedTo._id"] = new ObjectId(counsellorId);

    // Source Filter Logic
    const SOURCE_TYPES = [
      "Direct", "Google", "Facebook", "Instagram", "LinkedIn", "Twitter", "Referral", "GS1"
    ];

    if (source && source !== "All") {
      if (source === "Referral") {
        const excludedSources = SOURCE_TYPES.filter(s => s !== "Referral");
        query.source = {
          $exists: true,
          $nin: [
            null, "", ...excludedSources.map(s => new RegExp(`^${s}`, "i"))
          ]
        };
      } else if (source.toLowerCase() === "instagram" || source.toLowerCase() === "ig") {
        // 👇 NEW: Catches "Instagram", "instagram", "IG", "ig", etc.
        query.source = { 
          $regex: "^(Instagram|IG)", 
          $options: "i" 
        };
      } else {
        query.source = { $regex: `^${source}`, $options: "i" };
      }
    }

    if (course) {
      query.course = course;
    }

    // ------------------------------------------
    // STATS PREPARATION (Base Query without dates for accurate trends)
    // ------------------------------------------
    const baseQuery = { ...query }; 
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 14);

    // Custom date range
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        query.createdAt.$lte = to;
      }
    }
    // Quick filters
    else if (dateFilter && dateFilter !== "All") {
      const from = new Date();
      if (dateFilter === "Today") from.setHours(0, 0, 0, 0);
      else if (dateFilter === "Last3") from.setDate(now.getDate() - 3);
      else if (dateFilter === "Last7") from.setDate(now.getDate() - 7);
      else if (dateFilter === "Last30") from.setDate(now.getDate() - 30);
      query.createdAt = { $gte: from };
    }

    // Sorting
    let sortOption = { createdAt: -1 };
    if (sort === "oldest") sortOption = { createdAt: 1 };
    if (sort === "name") sortOption = { name: 1 };

    // ------------------------------------------
    // STATS AGGREGATION PIPELINE
    // ------------------------------------------
    const statsPipeline = [
      { $match: baseQuery }, // Base query to ensure 7-day history is available
      {
        $facet: {
          // ... inside your statsPipeline $facet
          overall: [
            {
              $group: {
                _id: null,
                totalLeads: { $sum: 1 },
                newLeads: {
                  $sum: {
                    $cond: [{ $in: ["$status", ["New Lead", "untouched", "New Leads", "New"]] }, 1, 0]
                  }
                },
                // Total Leads Trends
                c7_total: { $sum: { $cond: [{ $gte: ["$createdAt", sevenDaysAgo] }, 1, 0] } },
                p7_total: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $gte: ["$createdAt", fourteenDaysAgo] },
                          { $lt: ["$createdAt", sevenDaysAgo] }
                        ]
                      }, 1, 0
                    ]
                  }
                },
                // 👇 NEW: New Leads Trends
                c7_newLeads: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $in: ["$status", ["New Lead", "untouched", "New Leads", "New"]] },
                          { $gte: ["$createdAt", sevenDaysAgo] }
                        ]
                      }, 1, 0
                    ]
                  }
                },
                p7_newLeads: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $in: ["$status", ["New Lead", "untouched", "New Leads", "New"]] },
                          { $gte: ["$createdAt", fourteenDaysAgo] },
                          { $lt: ["$createdAt", sevenDaysAgo] }
                        ]
                      }, 1, 0
                    ]
                  }
                }
              }
            }
          ],
          sources: [
            {
              $project: {
                normalizedSource: {
                  $switch: {
                    branches: [
                      { case: { $regexMatch: { input: { $ifNull: ["$source", ""] }, regex: /^IG$/i } }, then: "Instagram" },
                      { case: { $regexMatch: { input: { $ifNull: ["$source", ""] }, regex: /^Instagram/i } }, then: "Instagram" },
                      { case: { $regexMatch: { input: { $ifNull: ["$source", ""] }, regex: /^Facebook/i } }, then: "Facebook" },
                      { case: { $regexMatch: { input: { $ifNull: ["$source", ""] }, regex: /^Google/i } }, then: "Google" },
                      { case: { $regexMatch: { input: { $ifNull: ["$source", ""] }, regex: /^LinkedIn/i } }, then: "LinkedIn" },
                      { case: { $regexMatch: { input: { $ifNull: ["$source", ""] }, regex: /^Twitter/i } }, then: "Twitter" },
                      { case: { $regexMatch: { input: { $ifNull: ["$source", ""] }, regex: /^Direct/i } }, then: "Direct" },
                      { case: { $regexMatch: { input: { $ifNull: ["$source", ""] }, regex: /^GS1/i } }, then: "GS1" },
                    ],
                    default: "Referral"
                  }
                }
              }
            },
            {
              $group: {
                _id: "$normalizedSource",
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } }
          ],
          courses: [
            {
              $group: {
                _id: { $cond: [{ $or: [{ $eq: ["$course", null] }, { $eq: ["$course", ""] }] }, "Unknown", "$course"] },
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } }
          ]
        }
      }
    ];

    // Execute queries in parallel for maximum performance
    const [contactsRaw, total, statsRaw] = await Promise.all([
      db.collection("dm").find(query).sort(sortOption).skip(skip).limit(limit).toArray(),
      db.collection("dm").countDocuments(query),
      db.collection("dm").aggregate(statsPipeline).toArray()
    ]);

    // Format Data
    const contacts = contactsRaw.map((item) => ({
      ...item,
      profile: item.profile || "",
      source: item.source || "",
      medium: item.medium || "",
      campaign: item.campaign || "",
      term: item.term || "",
      content: item.content || "",
      gclid: item.gclid || "",
      status: item.status || "New Lead",
    }));

    // Format Stats
    const rawAggregate = statsRaw[0] || {};
    const overallStats = rawAggregate.overall?.[0] || {};
    
    // Trend Calculation helper
    const calcTrend = (cur, prev) => {
      const current = cur || 0;
      const previous = prev || 0;
      if (previous > 0) return Number((((current - previous) / previous) * 100).toFixed(2));
      if (current > 0) return 100;
      return 0;
    };

    const finalStats = {
      totalLeads: {
        count: overallStats.totalLeads || 0,
        trend: calcTrend(overallStats.c7_total, overallStats.p7_total)
      },
      // 👇 NEW: Structured New Leads
      newLeads: {
        count: overallStats.newLeads || 0,
        trend: calcTrend(overallStats.c7_newLeads, overallStats.p7_newLeads)
      },
      sources: (rawAggregate.sources || []).map(s => ({ name: s._id, count: s.count })),
      courses: (rawAggregate.courses || []).map(c => ({ name: c._id, count: c.count })),
    }

    return NextResponse.json({
      success: true,
      stats: finalStats, // Added to the response
      data: contacts,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const body = await req.json();
    const {
  fullName,
  email,
  phone,
  profile = "",
  consent = false,

  course,
  level = "",

  source = "",
  medium = "",
  campaign = "",
  term = "",
  content = "",
  gclid = "",
  fbclid="",
  landing_page="",
  page_path="",
  referrer="",
} = body || {};

    // --- Validation ---
    const trimmedName = fullName?.trim();
    const trimmedEmail = email?.trim();
    let cleanedPhone = phone?.replace(/\D/g, "");

    if (cleanedPhone?.startsWith("91") && cleanedPhone.length > 10) {
      cleanedPhone = cleanedPhone.slice(-10);
    }

    if (!trimmedName || !trimmedEmail || !cleanedPhone) {
      return new Response(JSON.stringify({ success: false, error: "Name, Email and Phone are required" }), { status: 400, headers: corsHeaders });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid email address" }), { status: 400, headers: corsHeaders });
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(cleanedPhone)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid mobile number" }), { status: 400, headers: corsHeaders });
    }

    if (!consent) {
      return new Response(JSON.stringify({ success: false, error: "Consent is required" }), { status: 400, headers: corsHeaders });
    }

    // --- Visitor Details ---
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip") || "Unknown";
    const userAgent = req.headers.get("user-agent") || "Unknown";

    // --- Database Operations ---
    const client = await clientPromise;
    const db = client.db("sales");
const assignedTo = getLeadAssignment(course);

    const leadData = {
      name: trimmedName,
      email: trimmedEmail,
      phone: cleanedPhone,
      profile: profile || "",
      consent: Boolean(consent),
      source: source || "",
      medium: medium || "",
      campaign: campaign || "",
      course: course || "",
      level : level || "",
      term: term || "",
      content: content || "",
      gclid: gclid || "",
      fbclid: fbclid || "",
      landing_page: landing_page || "",
      page_path: page_path || "",
      referrer: referrer || "",
      ip,
      userAgent,
      status: "New Lead",
      assignedTo: assignedTo || null,
    };

    const leadsCollection = db.collection("dm");
   const existingLead = await leadsCollection.findOne({
      $or: [{ email: trimmedEmail }, { phone: cleanedPhone }],
      course: course || ""
    });

    let leadId;
    let isUpdate = false;

    if (existingLead) {
      await leadsCollection.updateOne(
        { _id: existingLead._id },
        {
          $set: { ...leadData, updatedAt: new Date() },
          $inc: { submissionCount: 1 },
        }
      );
      leadId = existingLead._id;
      isUpdate = true;
    } else {
      const insertResult = await leadsCollection.insertOne({
        ...leadData,
        submissionCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      leadId = insertResult.insertedId;
    }

    // --- 2. Defer Background Task using after() ---
    // This executes AFTER the response is sent to the client
    after(async () => {
      try {
        const whatsappUrl = `${process.env.WHATSAPP_API_URL}?api_key=${process.env.WHATSAPP_API}&templatename=new_form_submission&country=India&is_media=false&camp_name=form_submission&mobile_numbers=${cleanedPhone}&variables=${encodeURIComponent(`${trimmedName},${course}`)}`;
        
        console.log("WhatsApp URL [Background]:", whatsappUrl);
        const whatsappRes = await fetch(whatsappUrl);
        const whatsappData = await whatsappRes.text();
        
        console.log("WhatsApp Status [Background]:", whatsappRes.status);
        console.log("WhatsApp Response [Background]:", whatsappData);
        await sendMail({
      to: trimmedEmail,
      subject: `Thank You For Your Enquiry for ${course ? course : 'Digital Marekting'} Course`,
      html: welcomeHtml(trimmedName, course, leadId),
    });
      } catch (error) {
        // Errors here won't crash the user's request since it already completed
        console.error("WhatsApp API Error [Background]:", error);
      }
    });

    // --- Immediate Response ---
    return new Response(
      JSON.stringify({
        success: true,
        insertedId: leadId,
        message: isUpdate ? "Lead updated successfully" : "Lead created successfully",
      }),
      {
        status: isUpdate ? 200 : 201,
        headers: corsHeaders,
      }
    );

  } catch (error) {
    console.error("Server Error:", error);
    return new Response(JSON.stringify({ success: false, error: "Server error. Please try again later." }), { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}