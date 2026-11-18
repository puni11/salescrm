import { NextResponse } from "next/server";
import { googleAdsRequest } from "@/lib/googleAdsApi";
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

    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;

    if (!customerId) {
      return NextResponse.json(
        { error: "Google Ads customer ID is not configured" },
        { status: 500 }
      );
    }

    const query = `
      SELECT
        asset.id,
        asset.resource_name,
        asset.name,
        asset.type,
        asset.lead_form_asset.headline,
        asset.lead_form_asset.business_name,
        asset.lead_form_asset.description,
        asset.lead_form_asset.fields,
        asset.lead_form_asset.custom_question_fields
      FROM asset
      WHERE asset.type = LEAD_FORM
    `;

    const data = await googleAdsRequest({
      endpoint: `customers/${customerId}/googleAds:search`,
      method: "POST",
      body: {
        query,
      },
    });

    const forms = (data.results || []).map((row) => {
      const asset = row.asset;
      const leadForm = asset.leadFormAsset || {};

      return {
        id: asset.id,
        resourceName: asset.resourceName,
        name: asset.name,
        headline: leadForm.headline,
        businessName: leadForm.businessName,
        description: leadForm.description,
        fields: leadForm.fields || [],
        customQuestions: leadForm.customQuestionFields || [],
      };
    });

    return NextResponse.json({
      success: true,
      customerId,
      count: forms.length,
      forms,
    });
  } catch (error) {
    console.error("Google Ads lead forms error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}