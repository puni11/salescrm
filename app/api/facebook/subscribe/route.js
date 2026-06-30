import { NextResponse } from "next/server";
const PAGE_ID = "1039043886110312";

export async function POST() {
  const response = await fetch(
    `https://graph.facebook.com/v25.0/${PAGE_ID}/subscribed_apps`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        subscribed_fields: "leadgen",
        access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
      }),
    }
  );

  const data = await response.json();

  return NextResponse.json(data);
}