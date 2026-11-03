
import { after, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const DB_NAME = "sales";

export async function POST(request) {
  let db;
  let insertedId;

  try {
    const body = await request.json();

    const {
      leadId,
      batchId,
      batchName = "",
      courseName,
      demoMode,
    } = body;
console.log("Received POST request body:", courseName);
    if (!leadId || !ObjectId.isValid(leadId)) {
      return NextResponse.json(
        { success: false, message: "Invalid lead ID" },
        { status: 400 }
      );
    }

    if (!batchId) {
      return NextResponse.json(
        { success: false, message: "Please select a batch" },
        { status: 400 }
      );
    }

    if (!["Online", "Offline"].includes(demoMode)) {
      return NextResponse.json(
        { success: false, message: "Invalid demo mode" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    db = client.db(DB_NAME);

    const leadObjectId = new ObjectId(leadId);

    const lead = await db.collection("dm").findOne({
      _id: leadObjectId,
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );
    }

    // Prevent duplicate pending requests for the same lead and batch
    const existingRequest = await db.collection("demoRequests").findOne({
      leadId: leadObjectId,
      batchId: String(batchId),
      status: "pending",
    });

    if (existingRequest) {
      return NextResponse.json(
        {
          success: false,
          message: "A pending demo request already exists for this batch.",
        },
        { status: 409 }
      );
    }

    const now = new Date();
let cleanedPhone = lead.mobile?.replace(/\D/g, "") || lead.phone?.replace(/\D/g, "");

    const demoRequest = {
      leadId: leadObjectId,
      leadName: lead.name || lead.fullName || "",
      leadPhone: lead.mobile || lead.phone || "",
      leadEmail: lead.email || "",

      batchId: String(batchId),
      batchName,
      courseName,

      demoMode,
      status: "pending",

      requestedAt: now,
      completedAt: null,

      createdAt: now,
      updatedAt: now,
    };

    const result = await db
      .collection("demoRequests")
      .insertOne(demoRequest);

    insertedId = result.insertedId;

    // Update lead tag only after inserting the request
    const leadUpdate = await db.collection("dm").updateOne(
      { _id: leadObjectId },
      {
        $set: {
          tags: ["Demo req"],
          updatedAt: now,
        },
      }
    );

    if (!leadUpdate.matchedCount) {
      await db.collection("demoRequests").deleteOne({
        _id: insertedId,
      });

      return NextResponse.json(
        { success: false, message: "Could not update lead" },
        { status: 500 }
      );
    }
 after(async () => {
      try {
        const whatsappUrl = `${process.env.WHATSAPP_API_URL}?api_key=${process.env.WHATSAPP_API}&templatename=demo_requested&country=India&is_media=false&camp_name=form_submission&mobile_numbers=${cleanedPhone}&variables=${encodeURIComponent(`${lead.name || lead.fullName || ""},${courseName}`)}`;
        
        console.log("WhatsApp URL [Background]:", whatsappUrl);
        const whatsappRes = await fetch(whatsappUrl);
        const whatsappData = await whatsappRes.text();
        
        console.log("WhatsApp Status [Background]:", whatsappRes.status);
        console.log("WhatsApp Response [Background]:", whatsappData);
      } catch (error) {
        // Errors here won't crash the user's request since it already completed
        console.error("WhatsApp API Error [Background]:", error);
      }
    });
    return NextResponse.json(
      {
        success: true,
        message: "Demo request created successfully",
        data: {
          _id: insertedId,
          ...demoRequest,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create demo request error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to create demo request" },
      { status: 500 }
    );
  }
}

// Mark the latest pending demo request as completed
export async function PATCH(request) {
  try {
    const { leadId } = await request.json();

    if (!leadId || !ObjectId.isValid(leadId)) {
      return NextResponse.json(
        { success: false, message: "Invalid lead ID" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const leadObjectId = new ObjectId(leadId);
    const now = new Date();

    const pendingRequest = await db.collection("demoRequests").findOne(
      {
        leadId: leadObjectId,
        status: "pending",
      },
      {
        sort: { requestedAt: -1 },
      }
    );

    if (!pendingRequest) {
      return NextResponse.json(
        {
          success: false,
          message: "No pending demo request found for this lead.",
        },
        { status: 404 }
      );
    }

    const result = await db.collection("demoRequests").updateOne(
      {
        _id: pendingRequest._id,
        status: "pending",
      },
      {
        $set: {
          status: "completed",
          completedAt: now,
          updatedAt: now,
        },
      }
    );

    if (!result.modifiedCount) {
      return NextResponse.json(
        {
          success: false,
          message: "Demo request was already completed.",
        },
        { status: 409 }
      );
    }

    await db.collection("dm").updateOne(
      { _id: leadObjectId },
      {
        $set: {
          tags: ["Demo Done"],
          updatedAt: now,
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Demo marked as completed",
      requestId: pendingRequest._id,
      status: "completed",
    });
  } catch (error) {
    console.error("Complete demo request error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to complete demo request" },
      { status: 500 }
    );
  }
}

// Get demo requests (optional: filter by leadId)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const filter = {};

    if (leadId) {
      if (!ObjectId.isValid(leadId)) {
        return NextResponse.json(
          { success: false, message: "Invalid lead ID" },
          { status: 400 }
        );
      }

      filter.leadId = new ObjectId(leadId);
    }

    const requests = await db
      .collection("demoRequests")
      .find(filter)
      .sort({ requestedAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error("Fetch demo requests error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch demo requests" },
      { status: 500 }
    );
  }
}
