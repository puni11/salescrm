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

    const { followUpDate, followUpTime, comment } = body;

    // Validate date
    if (!followUpDate) {
      return NextResponse.json(
        {
          success: false,
          message: "Follow-up date is required",
        },
        { status: 400 }
      );
    }

    // Validate time
    if (!followUpTime) {
      return NextResponse.json(
        {
          success: false,
          message: "Follow-up time is required",
        },
        { status: 400 }
      );
    }

    // Validate date format
    let incomingDate = new Date(followUpDate);

    if (isNaN(incomingDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid follow-up date",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // TIMEZONE FIX: Normalize to exactly 12:00 PM (Noon) IST
    // This guarantees the date stays in the middle of the day 
    // and avoids crossing midnight boundaries into tomorrow.
    // ---------------------------------------------------------
    const istOffset = 5.5 * 60 * 60 * 1000;
    
    // Check if the incoming date already includes the offset/timezone,
    // but to be absolutely safe against purely local midnight dates string:
    const year = incomingDate.getFullYear();
    const month = incomingDate.getMonth();
    const date = incomingDate.getDate();

    // Create a new Date strictly set to 12:00 PM IST (which is 06:30 AM UTC).
    // This perfectly centers it in the middle of your target IST day.
    const followUpDateObj = new Date(Date.UTC(year, month, date, 6, 30, 0, 0));


    // Connect MongoDB
    const client = await clientPromise;
    const db = client.db("sales");

    const leadsCollection = db.collection("dm");
    const followUpCollection = db.collection("followUp");

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
    // Create follow-up document
    // -----------------------------------

    const followUpData = {
      leadId: leadId,
      status: "Pending",
      followUpDate: followUpDateObj, // Now perfectly aligned to Noon IST
      followUpTime: followUpTime,
      comment: comment?.trim() || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert into followUp collection
    const saveRes = await followUpCollection.insertOne(followUpData);

    if (!saveRes.acknowledged) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to create follow-up",
        },
        { status: 500 }
      );
    }

    // -----------------------------------
    // Update lead status in dm
    // -----------------------------------

    const result = await leadsCollection.updateOne(
      {
        _id: leadId,
      },
      {
        $set: {
          status: "Follow Up",
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

    // Get created follow-up
    const followUp = await followUpCollection.findOne({
      _id: saveRes.insertedId,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Follow-up saved successfully",
        data: {
          lead: updatedLead,
          followUp: followUp,
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