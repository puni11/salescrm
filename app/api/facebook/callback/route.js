import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          message: "Authorization code not found.",
        },
        {
          status: 400,
        }
      );
    }

    // Exchange code for short-lived user token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v25.0/oauth/access_token?` +
        `client_id=${process.env.META_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(
          `${process.env.APP_URL}/api/facebook/callback`
        )}` +
        `&client_secret=${process.env.META_APP_SECRET}` +
        `&code=${code}`
    );

    const token = await tokenResponse.json();

    console.log("Short Lived Token");
    console.log(token);

    if (token.error) {
      return NextResponse.json(token, {
        status: 400,
      });
    }

    return NextResponse.json(token);
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
        message: err.message,
      },
      {
        status: 500,
      }
    );
  }
}