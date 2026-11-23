
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("sales");

    const integration = await db
      .collection("google_ads_integrations")
      .findOne({
        integrationId: "google_ads_main",
      });

    if (!integration) {
      return NextResponse.json({
        status: "disconnected",
        message: "Google Ads is not connected",
      });
    }

    const now = new Date();
    const expiry = integration.expiresAt
      ? new Date(integration.expiresAt)
      : null;

    const remainingMs = expiry
      ? expiry.getTime() - now.getTime()
      : null;

    const isExpired =
      remainingMs !== null && remainingMs <= 0;

    const remainingDays =
      remainingMs !== null
        ? Math.max(
            0,
            Math.floor(remainingMs / (1000 * 60 * 60 * 24))
          )
        : null;

    const remainingHours =
      remainingMs !== null
        ? Math.max(
            0,
            Math.floor(
              (remainingMs % (1000 * 60 * 60 * 24)) /
                (1000 * 60 * 60)
            )
          )
        : null;

    const connected = integration.status === "connected";

    return NextResponse.json({
      status: connected ? "connected" : "disconnected",

      integrationId: integration.integrationId,

      connectedAt: integration.connectedAt,
      updatedAt: integration.updatedAt,

      tokenExpiresAt: integration.expiresAt,

      tokenExpired: isExpired,

      expiresIn: {
        days: remainingDays,
        hours: remainingHours,
      },

      hasRefreshToken: Boolean(
        integration.refreshTokenEncrypted?.encrypted
      ),

      needsReconnect:
        !connected ||
        (!integration.refreshTokenEncrypted?.encrypted &&
          isExpired),
    });
  } catch (error) {
    console.error("Google Ads integration error:", error);

    return NextResponse.json(
      { error: "Failed to fetch Google Ads integration" },
      { status: 500 }
    );
  }
}
