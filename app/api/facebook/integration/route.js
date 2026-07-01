import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("internal");

    const integration = await db
      .collection("facebook_pages")
      .findOne({ connected: true });

    if (!integration) {
      return NextResponse.json({
        status: "disconnected",
      });
    }

    const now = new Date();
    const expiry = new Date(integration.userTokenExpiresAt);

    const remainingMs = expiry.getTime() - now.getTime();

    const remainingDays = Math.max(
      0,
      Math.floor(remainingMs / (1000 * 60 * 60 * 24))
    );

    const remainingHours = Math.max(
      0,
      Math.floor(
        (remainingMs % (1000 * 60 * 60 * 24)) /
          (1000 * 60 * 60)
      )
    );

    return NextResponse.json({
      status: integration.connected ? "connected" : "disconnected",

      pageName: integration.pageName,
      pageId: integration.pageId,

      connectedAt: integration.createdAt,

      tokenExpiresAt: integration.userTokenExpiresAt,

      expiresIn: {
        days: remainingDays,
        hours: remainingHours,
      },

      needsReconnect: remainingDays <= 7,

      lastUpdated: integration.updatedAt,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: err.message,
      },
      {
        status: 500,
      }
    );
  }
}