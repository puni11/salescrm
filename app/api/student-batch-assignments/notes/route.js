

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const dynamic = "force-dynamic";

const DB_NAME = "sales";
const COLLECTION = "student_batch_assignments";

export async function POST(request) {
  try {
    // ================= AUTH =================
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // ================= BODY =================
    const body = await request.json();

    const studentId = String(body.studentId || "").trim();
    const batchId = String(body.batchId || "").trim();

    // Allow empty notes to clear previously saved notes.
    const notes =
      typeof body.notes === "string" ? body.notes.trim() : null;

    // ================= VALIDATION =================
    if (!ObjectId.isValid(studentId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid student ID is required",
        },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(batchId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid batch ID is required",
        },
        { status: 400 }
      );
    }

    if (notes === null) {
      return NextResponse.json(
        {
          success: false,
          message: "Notes must be provided as text",
        },
        { status: 400 }
      );
    }

    if (notes.length > 2000) {
      return NextResponse.json(
        {
          success: false,
          message: "Notes cannot exceed 2000 characters",
        },
        { status: 400 }
      );
    }

    // ================= DATABASE =================
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const collection = db.collection(COLLECTION);

    const filter = {
      studentId: new ObjectId(studentId),
      batchId: new ObjectId(batchId),
    };

    // ================= CHECK ASSIGNMENT =================
    const existing = await collection.findOne(filter);

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Student batch assignment not found",
        },
        { status: 404 }
      );
    }

    // ================= UPDATE NOTES =================
    const now = new Date();

    await collection.updateOne(
      filter,
      {
        $set: {
          notes,
          updatedAt: now,
        },
      }
    );

    // ================= FETCH UPDATED ASSIGNMENT =================
    const updated = await collection.findOne(filter);

    // ================= RESPONSE =================
    return NextResponse.json({
      success: true,
      message: "Assignment notes saved successfully",
      data: {
        studentId,
        batchId,
        notes: updated?.notes || "",
        updatedAt: updated?.updatedAt || now,
      },
    });

  } catch (error) {
    console.error("SAVE ASSIGNMENT NOTES ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to save assignment notes",
      },
      { status: 500 }
    );
  }
}
