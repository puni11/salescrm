import { NextResponse } from "next/server";
import crypto from "crypto";
import clientPromise from "@/lib/mongodb";
import { generateGoogleSheetScript } from "@/lib/googleSheetTemplate";
export async function POST(req) {
  try {
    const { sheetUrl, sheetName } = await req.json();

    if (!sheetUrl || !sheetName) {
      return NextResponse.json(
        {
          success: false,
          message: "Sheet URL and Sheet Name are required",
        },
        { status: 400 }
      );
    }

    // Extract Spreadsheet ID
    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);

    if (!match) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Google Sheet URL",
        },
        { status: 400 }
      );
    }

    const spreadsheetId = match[1];

    // Generate Secret
    const secret = crypto.randomBytes(32).toString("hex");

    const companyId = "grras";
const webhook =
  `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google-sheet/webhook`;

    const db = (await clientPromise).db("internal");
const script = generateGoogleSheetScript({
  webhook,
  secret,
  sheetName,
});
    await db.collection("facebook_integrations").insertOne({
      companyId,
      type: "google-sheet",
      spreadsheetId,
      sheetName,
      secret,
      webhook,
      script,
      active: true,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      spreadsheetId,
      secret,
      webhook,
      script,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 }
    );
  }
}