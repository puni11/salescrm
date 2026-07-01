import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";

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

    const sheets = await getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    return NextResponse.json({
      success: true,
      spreadsheetId,
      rows: response.data.values || [],
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}