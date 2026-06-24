import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { after } from "next/server";
import { sendMail } from "@/lib/sendMail";
import welcomeHtml from "@/lib/emailHtml/welcomeHtml";
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

   

    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const search = searchParams.get("search") || "";

    const sort = searchParams.get("sort");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const campaign = searchParams.get("campaign");
    const dateFilter = searchParams.get("dateFilter");

    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db("sales");

    const query = {};

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
    if (source) query.source = source;
    if (campaign) query.campaign = campaign;

    // Custom date range
    if (fromDate || toDate) {
      query.createdAt = {};

      if (fromDate) {
        query.createdAt.$gte = new Date(fromDate);
      }

      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        query.createdAt.$lte = to;
      }
    }

    // Quick filters
    else if (dateFilter && dateFilter !== "All") {
      const now = new Date();
      const from = new Date();

      if (dateFilter === "Today") {
        from.setHours(0, 0, 0, 0);
      } else if (dateFilter === "Last3") {
        from.setDate(now.getDate() - 3);
      } else if (dateFilter === "Last7") {
        from.setDate(now.getDate() - 7);
      } else if (dateFilter === "Last30") {
        from.setDate(now.getDate() - 30);
      }

      query.createdAt = { $gte: from };
    }

    // Sorting
    let sortOption = { createdAt: -1 };

    if (sort === "oldest") sortOption = { createdAt: 1 };
    if (sort === "name") sortOption = { name: 1 };

    const contactsRaw = await db
      .collection("dm")
      .find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .toArray();

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

    const total = await db.collection("dm").countDocuments(query);

    return Response.json({
      data: contacts,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        error: "Failed to fetch leads",
      },
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

  course = "Azure + Azure DevOps",
  level = "",

  source = "",
  medium = "",
  campaign = "",
  term = "",
  content = "",
  gclid = "",
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
      ip,
      userAgent,
      status: "New Lead",
    };

    const leadsCollection = db.collection("dm");
    const existingLead = await leadsCollection.findOne({
      $or: [{ email: trimmedEmail }, { phone: cleanedPhone }]
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
        const whatsappUrl = `${process.env.WHATSAPP_API_URL}?api_key=${process.env.WHATSAPP_API}&templatename=whatsapp_dm_lead_submissions&country=India&is_media=false&camp_name=dm_lead_form_submission&mobile_numbers=${cleanedPhone}&variables=${encodeURIComponent(trimmedName)}`;
        
        console.log("WhatsApp URL [Background]:", whatsappUrl);
        const whatsappRes = await fetch(whatsappUrl);
        const whatsappData = await whatsappRes.text();
        
        console.log("WhatsApp Status [Background]:", whatsappRes.status);
        console.log("WhatsApp Response [Background]:", whatsappData);
        await sendMail({
      to: trimmedEmail,
      subject: `Thank You For Your Enquiry for ${course ? course : 'Digital Marekting'} Course`,
      html: welcomeHtml(trimmedName, leadId),
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