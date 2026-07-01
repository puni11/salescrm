import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req) {
  try {
    const body = await req.json();

    const { secret, row } = body;

    if (!secret) {
      return NextResponse.json(
        {
          success: false,
          message: "Secret is required",
        },
        { status: 401 }
      );
    }

    if (!row) {
      return NextResponse.json(
        {
          success: false,
          message: "Row data is missing",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;

    const internalDB = client.db("internal");
    const salesDB = client.db("sales");

    // Find Integration
    const integration = await internalDB
      .collection("google_sheet_integrations")
      .findOne({
        secret,
        active: true,
      });

    if (!integration) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid integration",
        },
        { status: 401 }
      );
    }

    // Build CRM Lead using saved mapping
    const lead = {};

    Object.entries(integration.mapping || {}).forEach(
      ([crmField, googleColumn]) => {
        lead[crmField] = row[googleColumn] || "";
      }
    );

    lead.updatedAt = new Date();

    // Duplicate check
    const duplicateField =
      lead.phone
        ? { phone: lead.phone }
        : lead.email
        ? { email: lead.email }
        : null;

    if (!duplicateField) {
      return NextResponse.json(
        {
          success: false,
          message: "Phone or Email mapping is required.",
        },
        { status: 400 }
      );
    }

    const existing = await salesDB
      .collection("dm")
      .findOne(duplicateField);

    if (existing) {
      await salesDB.collection("dm").updateOne(
        {
          _id: existing._id,
        },
        {
          $set: lead,
        }
      );

      return NextResponse.json({
        success: true,
        action: "updated",
      });
    }

    lead.createdAt = new Date();

    await salesDB.collection("dm").insertOne(lead);

    return NextResponse.json({
      success: true,
      action: "created",
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}