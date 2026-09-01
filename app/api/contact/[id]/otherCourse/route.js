import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export async function POST(request, { params }) {
  try {
    const { id } = await params;

    // Validate Lead ID
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid lead ID",
        },
        { status: 400 }
      );
    }

    // Get request body
    const body = await request.json();

    const { otherCourse } = body;

    // Validate date
    if (!otherCourse) {
      return NextResponse.json(
        {
          success: false,
          message: "Follow-up date is required",
        },
        { status: 400 }
      );
    }


    // Connect MongoDB
    const client = await clientPromise;
    const db = client.db("sales");

    const leadsCollection = db.collection("dm");

    const leadId = new ObjectId(id);

    // Check lead exists
    const lead = await leadsCollection.findOne({
      _id: leadId,
    });

    if (!lead) {
      return NextResponse.json(
        {
          success: false,
          message: "Lead not found",
        },
        { status: 404 }
      );
    }

 


    // -----------------------------------

    const result = await leadsCollection.updateOne(
      {
        _id: leadId,
      },
      {
        $set: {
          course: otherCourse,
          status: "New Lead",
          updatedAt: new Date(),
        },
      }
    );

    if (!result.acknowledged) {
      return NextResponse.json(
        {
          success: false,
          message: "Follow-up created but failed to update lead status",
        },
        { status: 500 }
      );
    }

    // Get updated lead
    const updatedLead = await leadsCollection.findOne({
      _id: leadId,
    });


    return NextResponse.json(
      {
        success: true,
        message: "Follow-up saved successfully",
        data: {
          lead: updatedLead,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("FOLLOW_UP_API_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}