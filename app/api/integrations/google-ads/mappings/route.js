import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const COLLECTION = "google_ads_form_mappings";

const DEFAULTS = {
  course: "",
  status: "New Lead",
  source: "Google Ads",
  profile: "student",
};

// GET: Fetch mapping for a particular form
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const formResourceName = searchParams.get("formResourceName");

    if (!formResourceName) {
      return NextResponse.json(
        { error: "formResourceName is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("internal");

    const savedMapping = await db.collection(COLLECTION).findOne({
      formResourceName,
    });

    if (!savedMapping) {
      return NextResponse.json({
        success: true,
        mapping: null,
        defaults: DEFAULTS,
        enabled: false,
      });
    }

    return NextResponse.json({
      success: true,
      mapping: savedMapping.mapping || {},
      defaults: {
        ...DEFAULTS,
        ...(savedMapping.defaults || {}),
      },
      enabled: savedMapping.enabled ?? true,
      form: {
        formId: savedMapping.formId,
        formName: savedMapping.formName,
        formResourceName: savedMapping.formResourceName,
      },
    });
  } catch (error) {
    console.error("Google Ads mapping GET error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// POST: Save mapping for a particular form
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      formResourceName,
      formId,
      formName,
      mapping,
      defaults,
      enabled,
    } = body;

    if (!formResourceName) {
      return NextResponse.json(
        { message: "formResourceName is required" },
        { status: 400 }
      );
    }

    if (!mapping || typeof mapping !== "object") {
      return NextResponse.json(
        { message: "Invalid mapping" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("internal");

    const now = new Date();

    const document = {
      formResourceName,
      formId: formId || null,
      formName: formName || "",
      mapping,
      defaults: {
        ...DEFAULTS,
        ...(defaults || {}),
      },
      enabled: enabled !== false,
      updatedAt: now,
    };

    await db.collection(COLLECTION).updateOne(
      { formResourceName },
      {
        $set: document,
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: "Google Ads mapping saved successfully",
    });
  } catch (error) {
    console.error("Google Ads mapping POST error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}