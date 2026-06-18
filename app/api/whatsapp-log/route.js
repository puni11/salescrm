import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req) {
  try {
    const body = await req.json();

    const { leadId, phone, message, sentAt } = body;

    const client = await clientPromise;
    const db = client.db("sales");

    await db.collection("whatsapp_logs").insertOne({
      leadId,
      phone,
      message,
      sentAt: new Date(sentAt),
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "WhatsApp log saved",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}