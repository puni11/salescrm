import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
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
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
  return Response.json(
    { success: false, message: "Unauthorized" },
    { status: 401 }
  );
}
const token = authHeader.split(" ")[1];
let user;
try {
  user = jwt.verify(token, process.env.NEXTAUTH_SECRET);
} catch (err) {
  return Response.json(
    { success: false, message: "Invalid or expired token" },
    { status: 401 }
  );
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
    if (user.role !== "admin") {
      query["assignedTo._id"] = new ObjectId(user.id);
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
    if (source) query.source = source;
    if (campaign) query.campaign = campaign;
    if (counsellorId) query["assignedTo._id"] = new ObjectId(counsellorId);
    // --- UPDATED STATUS FILTER LOGIC ---
    if (source && source !== "All") {
      if (source === "Referral") {
        // Remove "Referral" so we don't accidentally exclude it
        const excludedSources = SOURCE_TYPES.filter(s => s !== "Referral");
        
        query.source = {
          $exists: true,
          $nin: [
            null,
            "", // Catch empty strings
            ...excludedSources.map(s => new RegExp(`^${s}`, "i"))
          ]
        };
      } else {
        query.source = {
          $regex: `^${source}`,
          $options: "i"
        };
      }
    }
    // -----------------------------------

    if (course) {
      query.course = course;
    }

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