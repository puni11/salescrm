import { NextResponse } from "next/server";
import { getGoogleAdsAccessToken } from "@/lib/googleAdsToken";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const accessToken = await getGoogleAdsAccessToken();

    return NextResponse.json({
      success: true,
      connected: true,
      tokenAvailable: Boolean(accessToken),
      message: "Google Ads access token is valid",
    });
  } catch (error) {
    console.error("Google Ads status check:", error);

    return NextResponse.json(
      {
        success: false,
        connected: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}