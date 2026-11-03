
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const COLLECTION = "student_fee_reminders";
const ASSIGNMENTS = "student_batch_assignments";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const studentId = searchParams.get("studentId");
    const batchId = searchParams.get("batchId");

    if (!studentId || !batchId) {
      return NextResponse.json(
        { success: false, message: "Student ID and Batch ID are required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(studentId) || !ObjectId.isValid(batchId)) {
      return NextResponse.json(
        { success: false, message: "Invalid student or batch ID" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("sales");

    const reminders = await db.collection(COLLECTION)
      .find({
        studentId: new ObjectId(studentId),
        batchId: new ObjectId(batchId),
      })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      reminders: reminders.map((reminder) => ({
        ...reminder,
        _id: reminder._id.toString(),
        studentId: reminder.studentId?.toString(),
        batchId: reminder.batchId?.toString(),
      })),
    });
  } catch (error) {
    console.error("GET FEE REMINDERS ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch reminders" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      studentId,
      batchId,
      title,
      message = "",
      dueDate,
      frequency = "once",
      channel = "manual",
    } = body;

    if (!studentId || !batchId || !dueDate) {
      return NextResponse.json(
        {
          success: false,
          message: "Student, batch and due date are required",
        },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(studentId) || !ObjectId.isValid(batchId)) {
      return NextResponse.json(
        { success: false, message: "Invalid student or batch ID" },
        { status: 400 }
      );
    }

    const allowedFrequencies = ["once", "weekly", "monthly"];
    const allowedChannels = ["manual", "whatsapp", "email", "sms"];

    if (!allowedFrequencies.includes(frequency)) {
      return NextResponse.json(
        { success: false, message: "Invalid reminder frequency" },
        { status: 400 }
      );
    }

    if (!allowedChannels.includes(channel)) {
      return NextResponse.json(
        { success: false, message: "Invalid reminder channel" },
        { status: 400 }
      );
    }

    const parsedDueDate = new Date(dueDate);

    if (Number.isNaN(parsedDueDate.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid due date" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("sales");

    const assignment = await db.collection(ASSIGNMENTS).findOne({
      studentId: new ObjectId(studentId),
      batchId: new ObjectId(batchId),
    });

    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "Batch assignment not found" },
        { status: 404 }
      );
    }

    const payments = Array.isArray(assignment.payments)
      ? assignment.payments
      : [];

    const legacyPaidFee = Number(assignment.legacyPaidFee || 0);

    const paymentsTotal = payments.reduce(
      (total, payment) => total + Number(payment.amount || 0),
      0
    );

    const totalFee = Number(assignment.totalFee || 0);
    const paidFee = legacyPaidFee + paymentsTotal;
    const balanceDue = Math.max(0, totalFee - paidFee);

    if (balanceDue <= 0) {
      return NextResponse.json(
        { success: false, message: "No outstanding balance for this batch" },
        { status: 400 }
      );
    }

    const reminder = {
      studentId: new ObjectId(studentId),
      batchId: new ObjectId(batchId),
      title: String(title || "Fee payment reminder").trim(),
      message: String(message).trim(),
      dueDate: parsedDueDate,
      frequency,
      channel,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection(COLLECTION).insertOne(reminder);

    return NextResponse.json({
      success: true,
      message: "Reminder created successfully",
      reminder: {
        ...reminder,
        _id: result.insertedId.toString(),
        studentId,
        batchId,
      },
    });
  } catch (error) {
    console.error("POST FEE REMINDER ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Failed to create reminder" },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Valid reminder ID is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("sales");

    const result = await db.collection(COLLECTION).deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Reminder not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Reminder deleted successfully",
    });
  } catch (error) {
    console.error("DELETE FEE REMINDER ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete reminder" },
      { status: 500 }
    );
  }
}
