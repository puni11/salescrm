import { NextResponse } from "next/server";

export async function GET(request) {
  // 1. Security Check: Only allow access if you provide the secret passkey in the URL
  const { searchParams } = new URL(request.url);
  const secretPasskey = searchParams.get("secret");

  // Keep this password strong so only you can access it
  if (!secretPasskey || secretPasskey !== "admin123") {
    return NextResponse.json(
      { error: "Unauthorized access blocked." },
      { status: 401 }
    );
  }

  // 2. Return the ACTUAL plain-text values
  return NextResponse.json({
    success: true,
    message: "ALL 26 ENV STRINGS RECOVERED",

   
  });
}
