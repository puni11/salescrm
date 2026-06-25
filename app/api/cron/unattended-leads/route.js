import { NextResponse } from "next/server";

export async function GET(req) {
  const auth = req.headers.get("authorization");

  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized",
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Authorized Cron Request",
    time: new Date(),
  });
}