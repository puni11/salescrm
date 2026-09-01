import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export async function POST(request, { params }) {
  try {
    const { id } = await params;

    const body = await request.json();

    const {
      counsellorId,
      counsellorName,
    } = body;

    // Validate Lead ID
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid lead ID.",
        },
        { status: 400 }
      );
    }

    // Validate Counsellor
    if (!counsellorId || !counsellorName) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Counsellor ID and name are required.",
        },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(counsellorId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid counsellor ID.",
        },
        { status: 400 }
      );
    }

    // Connect MongoDB
    const client = await clientPromise;

    const db = client.db("sales");

    // Change this collection name if needed
    const contactsCollection =
      db.collection("dm");

    // Update assigned counsellor
    const result =
      await contactsCollection.updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: {
            assignedTo: {
              _id: new ObjectId(
                counsellorId
              ),
              name: counsellorName,
            },
            updatedAt: new Date(),
          },
        }
      );

    // Lead not found
    if (result.matchedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Lead not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Counsellor changed successfully.",
        data: {
          leadId: id,
          counsellorId,
          counsellorName,
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error(
      "Change counsellor error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to change counsellor.",
      },
      { status: 500 }
    );
  }
}