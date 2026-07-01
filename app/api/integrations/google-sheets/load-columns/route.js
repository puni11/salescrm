import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";

export async function POST(req) {
  try {
    const { sheetUrl, sheetName } = await req.json();

    if (!sheetUrl?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Google Sheet URL is required.",
        },
        { status: 400 }
      );
    }

    if (!sheetName?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Sheet name is required.",
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
          message: "Invalid Google Sheet URL.",
        },
        { status: 400 }
      );
    }

    const spreadsheetId = match[1];

    const sheets = await getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`,
    });

    const headers = (response.data.values?.[0] || []).map((header) =>
      String(header).trim()
    );

    return NextResponse.json({
      success: true,
      spreadsheetId,
      sheetName,
      headers,
      totalColumns: headers.length,
    });
  } catch (error) {
    console.error("Load Columns Error:", error);

    let message = "Something went wrong.";

    if (error.message.includes("Unable to parse range")) {
      message = "Sheet name not found. Please check the sheet tab name.";
    } else if (error.message.includes("Requested entity was not found")) {
      message = "Spreadsheet not found.";
    } else if (
      error.message.includes("The caller does not have permission")
    ) {
      message =
        "Please share the Google Sheet with the service account email.";
    } else if (error.message) {
      message = error.message;
    }

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status: 500,
      }
    );
  }
}