import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { encryptToken } from "@/lib/googleAdsEncryption";

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.json(
      { error: "Google authorization failed", details: error },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: "Authorization code missing" },
      { status: 400 }
    );
  }

  try {
    const tokenResponse = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_ADS_CLIENT_ID,
          client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
          redirect_uri: process.env.GOOGLE_ADS_REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      }
    );

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Google token exchange failed:", tokens);

      return NextResponse.json(
        { error: "Failed to exchange authorization code" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("sales");

    const collection = db.collection("google_ads_integrations");

    const existing = await collection.findOne({
      integrationId: "google_ads_main",
    });

    const now = new Date();

    const encryptedAccessToken = encryptToken(tokens.access_token);

    // Google may not return a refresh token on subsequent authorizations.
    const encryptedRefreshToken = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : existing?.refreshTokenEncrypted || null;

    await collection.updateOne(
      { integrationId: "google_ads_main" },
      {
        $set: {
          accessTokenEncrypted: encryptedAccessToken,
          refreshTokenEncrypted: encryptedRefreshToken,

          expiresAt: new Date(
            Date.now() + (tokens.expires_in || 3600) * 1000
          ),

          tokenType: tokens.token_type,
          scope: tokens.scope,

          status: "connected",
          updatedAt: now,
        },

        $setOnInsert: {
          integrationId: "google_ads_main",
          connectedAt: now,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: "Google Ads connected and tokens securely saved",
      connected: true,
      refreshTokenSaved: Boolean(encryptedRefreshToken),
    });
  } catch (error) {
    console.error("Google Ads callback error:", error);

    return NextResponse.json(
      { error: "Failed to save Google Ads connection" },
      { status: 500 }
    );
  }
}