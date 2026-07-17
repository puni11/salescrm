import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid Lead ID" },
        { status: 400 }
      );
    }

    const client = await clientPromise;

    const salesDB = client.db("sales");
    const internalDB = client.db("internal");

    const dmCollection = salesDB.collection("dm");
    const callCollection = salesDB.collection("call_logs");
    const whatsappCollection = salesDB.collection("whatsapp_logs");
    const engagementCollection = salesDB.collection("engagements");
    const usersCollection = internalDB.collection("users");

    // Lead
    const lead = await dmCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );
    }

    // Normalize lead phone
    const normalizedPhone = (lead.phone || "")
      .replace(/\D/g, "")
      .slice(-10);

    // Common phone formats
    const phoneVariants = [
      normalizedPhone,
      `+91${normalizedPhone}`,
      `91${normalizedPhone}`,
      `0${normalizedPhone}`,
    ];

    // Fetch data
    const [calls, whatsapp, engagements] = await Promise.all([
      callCollection.find({ phone: { $in: phoneVariants } }).toArray(),
      whatsappCollection.find({ phone: { $in: phoneVariants } }).toArray(),
      engagementCollection.find({ leadId: lead._id }).toArray(),
    ]);

    // Counsellor map
    const userIds = [
      ...new Set(
        [...calls, ...whatsapp]
          .map((x) => x.userId)
          .filter(Boolean)
      ),
    ];

    const counsellorMap = {};

    if (userIds.length) {
      const users = await usersCollection
        .find({
          _id: {
            $in: userIds
              .filter((x) => ObjectId.isValid(x))
              .map((x) => new ObjectId(x)),
          },
        })
        .toArray();

      users.forEach((u) => {
        counsellorMap[u._id.toString()] = u.name;
      });
    }

    const timeline = [];

    timeline.push({
      id: lead._id.toString(),
      type: "LEAD_CREATED",
      title: "Lead Created",
      description: `Lead created from ${lead.source}`,
      timestamp: lead.createdAt,
    });

    calls.forEach((call) => {
      timeline.push({
        id: call._id.toString(),
        type: "CALL",
        title: `${call.call_type} Call`,
        description:
          call.duration_seconds > 0
            ? `Duration: ${call.duration_seconds} sec`
            : "No Conversation",
        counsellor: counsellorMap[call.userId] || "Unknown",
        status: call.status,
        timestamp: call.call_time || call.createdAt,
      });
    });

    whatsapp.forEach((msg) => {
      timeline.push({
        id: msg._id.toString(),
        type: "WHATSAPP",
        title: "WhatsApp",
        description:
          msg.templateName ||
          msg.message ||
          "WhatsApp Interaction",
        counsellor: counsellorMap[msg.userId] || "Unknown",
        status: msg.status,
        timestamp: msg.createdAt,
      });
    });

    engagements.forEach((eng) => {
      timeline.push({
        id: eng._id.toString(),
        type: eng.type,
        title: eng.type.replace(/_/g, " "),
        description: `Lead Score +${eng.score}`,
        score: eng.score,
        timestamp: eng.createdAt,
      });
    });

    timeline.sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    return NextResponse.json({
      success: true,
      lead: {
        id: lead._id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        status: lead.status,
        course: lead.course,
        source: lead.source,
        assignedTo: lead.assignedTo?.name || null,
      },
      totalInteractions: timeline.length,
      timeline,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
        message: err.message,
      },
      {
        status: 500,
      }
    );
  }
}