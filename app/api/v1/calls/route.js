import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";

export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
    } catch (err) {
      return NextResponse.json(
        { success: false, message: "Invalid Token" },
        { status: 401 }
      );
    }

    const {
      phone,
      duration_seconds,
      call_time,
      call_type,
      status,
    } = await req.json();

    const client = await clientPromise;
    const db = client.db("sales");

    const callLog = {
      userId: decoded.id, // or decoded._id depending on your JWT
      phone,
      duration_seconds,
      call_time: new Date(call_time),
      call_type,
      status,
      createdAt: new Date(),
    };

    const result = await db.collection("call_logs").insertOne(callLog);

    return NextResponse.json({
      success: true,
      id: result.insertedId,
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