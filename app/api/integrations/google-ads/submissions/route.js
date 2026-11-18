import { NextResponse } from "next/server";
import { googleAdsRequest } from "@/lib/googleAdsApi";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import clientPromise from "@/lib/mongodb";

export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const days = Math.min(
      Math.max(Number(searchParams.get("days")) || 30, 1),
      90
    );

    // Get enabled mappings only
    const client = await clientPromise;
    const db = client.db("internal");

    const configuredForms = await db
      .collection("google_ads_form_mappings")
      .find({ enabled: true })
      .toArray();

    if (configuredForms.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No enabled Google Ads forms configured",
        count: 0,
        submissions: [],
      });
    }

    const enabledFormResources = configuredForms.map(
      (form) => form.formResourceName
    );

    // Date range
    const today = new Date();
    const startDate = new Date();

    startDate.setDate(today.getDate() - days);

    const formatDate = (date) =>
      date.toISOString().slice(0, 10);

    const start = formatDate(startDate);
    const end = formatDate(today);

    const query = `
      SELECT
        lead_form_submission_data.id,
        lead_form_submission_data.resource_name,
        lead_form_submission_data.asset,
        lead_form_submission_data.campaign,
        lead_form_submission_data.ad_group,
        lead_form_submission_data.ad_group_ad,
        lead_form_submission_data.submission_date_time,
        lead_form_submission_data.gclid,
        lead_form_submission_data.lead_form_submission_fields,
        lead_form_submission_data.custom_lead_form_submission_fields
      FROM lead_form_submission_data
      WHERE lead_form_submission_data.submission_date_time
      BETWEEN '${start}' AND '${end}'
    `;

    const data = await googleAdsRequest({
      endpoint: `customers/${customerId}/googleAds:search`,
      method: "POST",
      body: { query },
    });

    const allSubmissions = data.results || [];

    // Only include submissions belonging to enabled forms
    const submissions = allSubmissions.filter((row) => {
      const assetResourceName =
        row.leadFormSubmissionData?.asset;

      return enabledFormResources.includes(assetResourceName);
    });

    return NextResponse.json({
      success: true,
      customerId,
      dateRange: {
        start,
        end,
      },
      enabledForms: configuredForms.length,
      totalFetched: allSubmissions.length,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    console.error("Google Ads submissions error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}