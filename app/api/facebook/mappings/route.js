import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      pageId,
      formId,
      formName,
      mapping,
      defaults,
    } = body;

    if (!formId) {
      return NextResponse.json(
        {
          success: false,
          message: "Form ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const client = await clientPromise;
    const db = client.db("internal");

    const now = new Date();

    await db.collection("facebook_field_mappings").updateOne(
      {
        formId,
      },
      {
        $set: {
          pageId,
          formId,
          formName,
          mapping,
          defaults, // Save defaults alongside mapping
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      {
        upsert: true,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Field mapping saved successfully.",
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