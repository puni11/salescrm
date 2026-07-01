import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req) {
  try {
    const body = await req.json();

    // Security
    if (body.secret !== process.env.GOOGLE_SHEET_SECRET) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const db = (await clientPromise).db("sales");

    const lead = {
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      course: body.course,
      source: body.source || "Google Sheet",
      status: body.status || "New Lead",
      updatedAt: new Date(),
    };

    await db.collection("dm").updateOne(
      { phone: lead.phone }, // Use phone as unique key
      {
        $set: lead,
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
      },
      { status: 500 }
    );
  }
}