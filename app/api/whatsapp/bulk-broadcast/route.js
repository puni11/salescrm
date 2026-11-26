
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE = "https://aigreentick.com/api/v1";
const TOKEN = process.env.GREEN_TICK_API_TOKEN;
const COUNTRY_ID = Number(process.env.WA_COUNTRY_ID || 98);

const json = (data, status = 200) =>
  NextResponse.json(data, { status });

const digits = (value) => String(value || "").replace(/\D/g, "");
const last10 = (value) => digits(value).slice(-10);

export async function POST(request) {
  try {
    if (!TOKEN) {
      return json(
        { success: false, message: "Green Tick API token is missing" },
        500
      );
    }

    const body = await request.json();

    const {
      templateId,
      templateName = "",
      campName = "",
      recipients = [],
      mediaUrl = "",
      mediaType = "",
    } = body;

    if (!Number(templateId)) {
      return json(
        { success: false, message: "Select a valid template" },
        400
      );
    }

    if (!Array.isArray(recipients) || !recipients.length) {
      return json(
        { success: false, message: "No recipients selected" },
        400
      );
    }

    // Validate and deduplicate recipients
    const unique = new Map();

    for (const recipient of recipients) {
      const mobile = last10(recipient.mobile);

      if (mobile.length !== 10) continue;

      if (!unique.has(mobile)) {
        unique.set(mobile, {
          mobile,
          name: String(recipient.name || mobile),
          variables: recipient.variables || {},
        });
      }
    }

    const validRecipients = [...unique.values()];

    if (!validRecipients.length) {
      return json(
        { success: false, message: "No valid mobile numbers found" },
        400
      );
    }

    const results = [];

    // Send individually to support recipient-specific variables
    for (const recipient of validRecipients) {
      try {
        const response = await fetch(`${BASE}/broadcast`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(30000),
          body: JSON.stringify({
            template_id: Number(templateId),
            country_id: COUNTRY_ID,
            camp_name: String(
              campName || `Bulk campaign - ${templateName || templateId}`
            ).slice(0, 100),
            mobile_numbers: [recipient.mobile],
            is_media: Boolean(mediaUrl),
            media_type: mediaType || "",
            media_url: mediaUrl || "",
            schedule_date: "",
            variables: recipient.variables,
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data?.message || `Green Tick error ${response.status}`
          );
        }

        results.push({
          mobile: recipient.mobile,
          name: recipient.name,
          success: true,
          response: data,
        });
      } catch (error) {
        results.push({
          mobile: recipient.mobile,
          name: recipient.name,
          success: false,
          message: error.message || "Sending failed",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.length - successCount;

    // Save outgoing logs
    try {
      const { default: clientPromise } = await import("@/lib/mongodb");
      const client = await clientPromise;
      const db = client.db("sales");

      const now = new Date();

      const logs = results.map((item) => ({
        phone: item.mobile,
        message: `Bulk WhatsApp template: ${templateName || templateId}`,
        type: "outgoing",
        sentAt: now,
        createdAt: now,
        template_id: Number(templateId),
        template_name: templateName,
        campaign_name: campName || "",
        ...(item.success
          ? { deliveryRequest: true }
          : { sendError: item.message }),
      }));

      if (logs.length) {
        await db.collection("whatsapp_logs").insertMany(logs);
      }
    } catch (logError) {
      console.error("Bulk WhatsApp logging error:", logError);
    }

    return json({
      success: failedCount === 0,
      message: `${successCount} sent, ${failedCount} failed`,
      total: results.length,
      successCount,
      failedCount,
      results,
    });
  } catch (error) {
    console.error("Bulk WhatsApp API:", error);

    return json(
      {
        success: false,
        message: error.message || "Bulk broadcast failed",
      },
      500
    );
  }
}
