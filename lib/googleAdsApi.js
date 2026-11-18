import { getGoogleAdsAccessToken } from "@/lib/googleAdsToken";

const API_VERSION = "v26";

export async function googleAdsRequest({
  endpoint,
  method = "GET",
  body,
  customerId,
}) {
  const accessToken = await getGoogleAdsAccessToken();

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  // For calls made through a manager account, add login-customer-id.
  if (customerId) {
    headers["login-customer-id"] = customerId.replace(/-/g, "");
  }

  const response = await fetch(
    `https://googleads.googleapis.com/${API_VERSION}/${endpoint}`,
    {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
  "Google Ads API error:",
  JSON.stringify(data, null, 2)
);

    throw new Error(
      data.error?.message || "Google Ads API request failed"
    );
  }

  return data;
}