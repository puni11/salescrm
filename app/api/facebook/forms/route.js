import { getPageAccessToken } from "@/lib/facebook/getPageAccessToken";
import { NextResponse } from "next/server";

export async function GET() {
  const pageAccessToken = await getPageAccessToken(process.env.FACEBOOK_PAGE_ID);
  try {
    const response = await fetch(
      `https://graph.facebook.com/v25.0/${process.env.FACEBOOK_PAGE_ID}/leadgen_forms?fields=id,name,status,locale,created_time&access_token=${pageAccessToken}`
    );

    const data = await response.json();

    if (data.error) {
      return NextResponse.json(data, { status: 400 });
    }

    return NextResponse.json(data.data || []);
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}