import { NextResponse } from "next/server";
import { getCalendarClient } from "@/lib/googleCalendar";

export async function GET() {
  try {
    const userId = "6a081b1fd31bcee0c79ac873"; // Replace later with logged-in user's ID

    const calendar = await getCalendarClient(userId);

    const response = await calendar.calendarList.list();

    return NextResponse.json(response.data);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}