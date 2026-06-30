import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const code = searchParams.get("code");

  const error = searchParams.get("error");

  return NextResponse.json({
    code,
    error,
  });
}