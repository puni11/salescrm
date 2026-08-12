import { NextResponse } from "next/server";
import { createTestEvent } from "@/lib/googleCalendar";

export async function GET() {
  try {
    const event = await createTestEvent(
      "6a081b1fd31bcee0c79ac873"
    );

    return NextResponse.json(event);
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: err.message,
      },
      {
        status: 500,
      }
    );
  }
}