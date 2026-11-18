import { NextResponse } from "next/server";
import { saveGoogleAdsLead } from "@/component/saveGoogleAdsLead";

export async function POST(req) {
  try {
    const body = await req.json();

    console.log("Google Ads Webhook Received");
    console.log(JSON.stringify(body, null, 2));

    // Verify Google webhook key
    if (body.google_key !== process.env.GOOGLE_ADS_WEBHOOK_KEY) {
      console.error("Invalid Google Ads webhook key");

      return NextResponse.json(
        { message: "Invalid webhook key" },
        { status: 401 }
      );
    }

    // Ignore test leads for CRM insertion
    if (body.is_test === true) {
      console.log("Google Ads test webhook received");

      return NextResponse.json({
        success: true,
        message: "Test webhook received successfully",
      });
    }

    const result = await saveGoogleAdsLead(body);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Google Ads Webhook Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}