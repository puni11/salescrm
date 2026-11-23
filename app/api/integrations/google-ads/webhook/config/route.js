import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const webhookKey = process.env.GOOGLE_ADS_WEBHOOK_KEY;

    if (!webhookKey) {
      return NextResponse.json(
        { error: "GOOGLE_ADS_WEBHOOK_KEY is not configured" },
        { status: 500 }
      );
    }

    const origin = new URL(request.url).origin;

    return NextResponse.json({
      success: true,
      webhookUrl: `${origin}/api/integrations/google-ads/webhook`,
      webhookKey,
    });
  } catch (error) {
    console.error("Google Ads webhook config error:", error);

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}