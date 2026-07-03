import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { randomUUID } from "crypto";

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email and password are required",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("internal");

    const user = await db.collection("users").findOne({
      email,
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid credentials",
        },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid credentials",
        },
        { status: 401 }
      );
    }

    if (user.isBlocked) {
      return NextResponse.json(
        {
          success: false,
          message: "Account blocked",
        },
        { status: 403 }
      );
    }

    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          lastLogin: new Date(),
        },
      }
    );

    const sessionId = randomUUID();

    const token = jwt.sign(
      {
        id: user._id.toString(),
        name: user.name,
        role: user.role,
        sessionId,
      },
      process.env.NEXTAUTH_SECRET,
      {
        expiresIn: "30d",
      }
    );

    // limit 2 devices
    const activeSessions = await db
      .collection("adminSessions2")
      .find({
        userId: new ObjectId(user._id),
        isActive: true,
      })
      .sort({ createdAt: 1 })
      .toArray();

    if (activeSessions.length >= 2) {
      await db.collection("adminSessions2").updateOne(
        {
          _id: activeSessions[0]._id,
        },
        {
          $set: {
            isActive: false,
          },
        }
      );
    }

    await db.collection("adminSessions2").insertOne({
      userId: new ObjectId(user._id),
      sessionId,
      ipAddress:
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown",
      userAgent: req.headers.get("user-agent") || "Android",
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      platform: "android",
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
      },
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