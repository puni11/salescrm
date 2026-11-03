
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

function normalizePhone(phone = "") {
  let digits = String(phone).replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  if (digits.length > 10) {
    digits = digits.slice(-10);
  }

  return digits;
}

export async function POST(req) {
  try {
    const body = await req.json();

    // Only process incoming messages
    if (body?.type !== "received") {
      return NextResponse.json({
        success: true,
        ignored: true,
        message: "Not an incoming message",
      });
    }

    const messageId = String(body.message_id || "").trim();
    const phone10 = normalizePhone(body.send_from);

    if (!messageId || !phone10 || phone10.length !== 10) {
      return NextResponse.json(
        { success: false, message: "Invalid message ID or sender number" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("sales");

    const dmCollection = db.collection("dm");
    const logsCollection = db.collection("whatsapp_logs");

    // Find the lead
    let lead = await dmCollection.findOne({ phone10 });

    // Fallback for records without phone10
    if (!lead) {
      const phoneVariants = [
        phone10,
        `91${phone10}`,
        `+91${phone10}`,
      ];

      lead = await dmCollection.findOne({
        phone: { $in: phoneVariants },
      });
    }

    if (!lead) {
      return NextResponse.json({
        success: true,
        matched: false,
        message: "No matching CRM lead found",
      });
    }

    const assignedUserId = lead.assignedTo?._id
      ? String(lead.assignedTo._id)
      : null;

    // Prevent duplicate message insertion
    const existingMessage = await logsCollection.findOne({
      message_id: messageId,
    });

    if (existingMessage) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        leadId: String(lead._id),
        assignedUserId,
      });
    }

    const now = new Date();

    const log = {
      leadId: String(lead._id),
      phone: `91${phone10}`,
      message: String(body.text || ""),
      type: "incoming",
      message_id: messageId,
      contact_id: body.contact_id || null,
      sentAt: now,
      createdAt: now,
    };

    await logsCollection.insertOne(log);

    return NextResponse.json({
      success: true,
      matched: true,
      leadId: String(lead._id),
      assignedUserId,
    });
  } catch (error) {
    console.error("WHATSAPP INCOMING API ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Failed to process incoming message" },
      { status: 500 }
    );
  }
}
