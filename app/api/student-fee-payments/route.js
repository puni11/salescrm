
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const COLLECTION = "student_batch_assignments";

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

    const assignment = await db.collection(COLLECTION).findOne({
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

    const paidFee = legacyPaidFee + paymentsTotal;
    const totalFee = Number(assignment.totalFee || 0);
    const balanceDue = Math.max(0, totalFee - paidFee);

    const paymentStatus =
      balanceDue <= 0
        ? "paid"
        : paidFee > 0
          ? "partial"
          : "pending";

    return NextResponse.json({
      success: true,
      fee: {
        totalFee,
        paidFee,
        balanceDue,
        paymentStatus,
      },
      legacyPaidFee,
      payments: payments
        .map((payment, index) => ({
          id: payment._id?.toString() || String(index),
          amount: Number(payment.amount || 0),
          paidAt: payment.paidAt || payment.createdAt || null,
          note: payment.note || "",
          createdAt: payment.createdAt || null,
        }))
        .sort(
          (a, b) =>
            new Date(b.paidAt || 0).getTime() -
            new Date(a.paidAt || 0).getTime()
        ),
    });
  } catch (error) {
    console.error("GET STUDENT FEE PAYMENTS ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch payments" },
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
      amount,
      paidAt,
      note = "",
    } = body;

    if (!studentId || !batchId || !amount) {
      return NextResponse.json(
        { success: false, message: "Student, batch and amount are required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(studentId) || !ObjectId.isValid(batchId)) {
      return NextResponse.json(
        { success: false, message: "Invalid student or batch ID" },
        { status: 400 }
      );
    }

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json(
        { success: false, message: "Enter a valid payment amount" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("sales");
    const collection = db.collection(COLLECTION);

    const assignment = await collection.findOne({
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

    const existingPayments = payments.reduce(
      (total, payment) => total + Number(payment.amount || 0),
      0
    );

    const totalFee = Number(assignment.totalFee || 0);
    const alreadyPaid = legacyPaidFee + existingPayments;
    const balanceDue = Math.max(0, totalFee - alreadyPaid);

    if (paymentAmount > balanceDue) {
      return NextResponse.json(
        {
          success: false,
          message: `Maximum payable amount is ${balanceDue}`,
          balanceDue,
        },
        { status: 400 }
      );
    }

    const payment = {
      _id: new ObjectId(),
      amount: paymentAmount,
      paidAt: paidAt ? new Date(paidAt) : new Date(),
      note: String(note).trim(),
      createdAt: new Date(),
    };

    const newPaidFee = alreadyPaid + paymentAmount;
    const newBalanceDue = Math.max(0, totalFee - newPaidFee);

    const paymentStatus =
      newBalanceDue <= 0
        ? "paid"
        : "partial";

    await collection.updateOne(
      { _id: assignment._id },
      {
        $push: { payments: payment },
        $set: {
          paidFee: newPaidFee,
          balanceDue: newBalanceDue,
          paymentStatus,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Payment added successfully",
      payment: {
        id: payment._id.toString(),
        amount: payment.amount,
        paidAt: payment.paidAt,
        note: payment.note,
      },
      fee: {
        totalFee,
        paidFee: newPaidFee,
        balanceDue: newBalanceDue,
        paymentStatus,
      },
    });
  } catch (error) {
    console.error("POST STUDENT FEE PAYMENT ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Failed to add payment" },
      { status: 500 }
    );
  }
}
