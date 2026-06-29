import { NextResponse } from "next/server";

export async function GET() {
  const url = new URL("https://www.facebook.com/v25.0/dialog/oauth");

  url.searchParams.set("client_id", process.env.META_ID);

  url.searchParams.set(
    "redirect_uri",
    `${process.env.NEXTAUTH_URL}/api/facebook/callback`
  );

  url.searchParams.set(
    "configuration_id",
    process.env.FACEBOOK_CONFIGURATION_ID
  );

  url.searchParams.set("response_type", "code");

  return NextResponse.redirect(url);
}