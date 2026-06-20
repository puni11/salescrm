import { google } from "googleapis";

async function getAccessToken() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  const { token } = await oauth2Client.getAccessToken();

  return token;
}

export async function GET() {
  try {
    const token = await getAccessToken();

    // Accounts
    const accountsRes = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const accountsData = await accountsRes.json();
console.log(accountsData)
    if (!accountsData.accounts?.length) {
      return Response.json({
        success: false,
        message: "No Google Business accounts found",
      });
    }

    const accountId = accountsData.accounts[0].name.split("/")[1];

    // Locations
    const locationsRes = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const locationsData = await locationsRes.json();

    const location = locationsData.locations?.[0];

    if (!location) {
      return Response.json({
        success: false,
        message: "No locations found",
      });
    }

    const locationId = location.name.split("/")[1];

    // Reviews
    const reviewsRes = await fetch(
      `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const reviewsData = await reviewsRes.json();

    return Response.json({
      success: true,
      account: accountsData.accounts[0],
      location,
      reviews: reviewsData.reviews || [],
      raw: reviewsData,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}