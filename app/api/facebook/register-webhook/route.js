import { NextResponse } from "next/server";

export async function POST() {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v25.0/${process.env.META_APP_ID}/subscriptions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          object: "page",
          callback_url: `${process.env.APP_URL}/api/facebook/webhook`,
          verify_token: process.env.FACEBOOK_VERIFY_TOKEN,
          fields: "leadgen",
          include_values: "true",
          access_token: `${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`,
        }),
      }
    );

    const data = await response.json();

    console.log(data);

    return NextResponse.json(data);
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      {
        status: 500,
      }
    );
  }
}