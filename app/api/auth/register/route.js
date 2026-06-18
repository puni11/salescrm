import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const body = await req.json();
    const { fullName, mobile, email, password, role, key } = body;
    if(key!==process.env.ADMIN_KEY){
         return NextResponse.json(
        { success: false, message: "Admin Key Not Matched" },
        { status: 409 }
      );
    }
    // Basic validation
    if (!fullName || !mobile || !email || !password || !role || !key) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("internal");

    // 🔥 Check if mobile already exists
    const existingUser = await db.collection("users").findOne({
      email: email.trim(),
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email already registered" },
        { status: 400 }
      );
    }

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.collection("users").insertOne({
      name: fullName.trim(),
      mobile: mobile.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: role,
      tokenVersion:0,
      isBlocked:false,
      lastPasswordChange: new Date(),
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
    });

  } catch (error) {
    console.error("Register Error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}