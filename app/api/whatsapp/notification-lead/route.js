
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const DB_NAME = "sales";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mobile = searchParams.get("mobile");

    if (!mobile) {
      return NextResponse.json(
        { success: false, message: "Mobile number required" },
        { status: 400 }
      );
    }

    const digits = mobile.replace(/\D/g, "").slice(-10);

    if (digits.length !== 10) {
      return NextResponse.json(
        { success: false, message: "Invalid mobile number" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Match phone numbers stored with +91, 91, or without country code.
    const phoneRegex = new RegExp(`${digits}$`);

    const lead = await db.collection("dm").findOne(
      {
        $or: [
          { phone: { $regex: phoneRegex } },
          { mobile: { $regex: phoneRegex } },
        ],
      },
      {
        projection: {
          name: 1,
          fullName: 1,
          phone: 1,
          mobile: 1,
          assignedTo: 1,
        },
      }
    );

    if (!lead) {
      return NextResponse.json({
        success: true,
        found: false,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      found: true,
      data: {
        _id: lead._id.toString(),
        name: lead.name || lead.fullName || "Unknown Lead",
        phone: lead.phone || lead.mobile || "",
        assignedToId:
          lead.assignedTo?._id?.toString() || null,
        assignedToName: lead.assignedTo?.name || "",
      },
    });
  } catch (error) {
    console.error("WhatsApp notification lead lookup:", error);

    return NextResponse.json(
      { success: false, message: "Lead lookup failed" },
      { status: 500 }
    );
  }
}
