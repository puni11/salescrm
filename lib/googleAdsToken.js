import clientPromise from "@/lib/mongodb";
import { decryptToken, encryptToken } from "@/lib/googleAdsEncryption";

const INTEGRATION_ID = "google_ads_main";

export async function getGoogleAdsAccessToken() {
  const client = await clientPromise;
  const db = client.db();

  const collection = db.collection("google_ads_integrations");

  const integration = await collection.findOne({
    integrationId: INTEGRATION_ID,
    status: "connected",
  });

  if (!integration) {
    throw new Error("Google Ads is not connected");
  }

  // Reuse token if it remains valid for more than 5 minutes
  if (
    integration.expiresAt &&
    integration.expiresAt.getTime() > Date.now() + 5 * 60 * 1000
  ) {
    return decryptToken(integration.accessTokenEncrypted);
  }

  const refreshToken = decryptToken(
    integration.refreshTokenEncrypted
  );

  if (!refreshToken) {
    throw new Error("Google Ads refresh token is missing");
  }

  const response = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    }
  );

  const tokens = await response.json();

  if (!response.ok) {
    console.error("Google Ads token refresh failed:", tokens);

    await collection.updateOne(
      { integrationId: INTEGRATION_ID },
      {
        $set: {
          lastRefreshError: tokens.error || "Token refresh failed",
          lastRefreshAttemptAt: new Date(),
        },
      }
    );

    throw new Error("Failed to refresh Google Ads access token");
  }

  const newAccessToken = encryptToken(tokens.access_token);

  await collection.updateOne(
    { integrationId: INTEGRATION_ID },
    {
      $set: {
        accessTokenEncrypted: newAccessToken,
        expiresAt: new Date(
          Date.now() + (tokens.expires_in || 3600) * 1000
        ),
        updatedAt: new Date(),
        lastRefreshAt: new Date(),
      },
      $unset: {
        lastRefreshError: "",
      },
    }
  );

  return tokens.access_token;
}