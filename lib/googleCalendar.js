import { google } from "googleapis";
import clientPromise from "./mongodb";
import { ObjectId } from "mongodb";

export async function getCalendarClient(userId) {

    const client = await clientPromise;
const internalDB = client.db("internal");

const integration = await internalDB
  .collection("google_integration")
  .findOne({
    userId: new ObjectId(userId),
    connected: true,
  });

  if (!integration) {
    throw new Error("Google Calendar not connected");
  }

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  auth.setCredentials({
    access_token: integration.accessToken,
    refresh_token: integration.refreshToken,
  });

  // Refresh token automatically if expired
  const { credentials } = await auth.refreshAccessToken();

 if (credentials.access_token) {
  await internalDB
    .collection("google_integrations")
    .updateOne(
      { _id: integration._id },
      {
        $set: {
          accessToken: credentials.access_token,
          expiryDate: new Date(credentials.expiry_date),
        },
      }
    );
}

  auth.setCredentials({
    access_token: credentials.access_token,
    refresh_token: integration.refreshToken,
  });

  return google.calendar({
    version: "v3",
    auth,
  });
} 

export async function createTestEvent(userId) {
  const calendar = await getCalendarClient(userId);

  const start = new Date();
  start.setMinutes(start.getMinutes() + 5);

  const end = new Date(start.getTime() + 30 * 60 * 1000);

  const response = await calendar.events.insert({
    calendarId: "primary",

    requestBody: {
      summary: "CRM Test Follow-up",

      description: "This event was created from my CRM.",

      start: {
        dateTime: start.toISOString(),
        timeZone: "Asia/Kolkata",
      },

      end: {
        dateTime: end.toISOString(),
        timeZone: "Asia/Kolkata",
      },

      reminders: {
        useDefault: false,
        overrides: [
          {
            method: "popup",
            minutes: 1,
          },
        ],
      },
    },
  });

  return response.data;
}