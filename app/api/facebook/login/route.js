import { NextResponse } from "next/server";

export async function GET() {
  const appId = process.env.META_APP_ID;

  const redirectUri = `${process.env.APP_URL}/api/facebook/callback`;

  const scope = [
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_metadata",
    "pages_manage_ads",
    "ads_management",
    "ads_read",
    "business_management",
    "leads_retrieval",
  ].join(",");

  const url =
    `https://www.facebook.com/v25.0/dialog/oauth` +
    `?client_id=${appId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${scope}` +
    `&response_type=code`;

  return NextResponse.redirect(url);
}