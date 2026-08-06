import { NextResponse } from "next/server";
import { runAgent } from "@/lib/ai/agent";
import { buildContext } from "@/lib/ai/context/buildContext";
export async function POST(req) {
  try {
    const { message } = await req.json();
const context = buildContext();
    const answer = await runAgent({
      message,
      context,
    });

    return NextResponse.json({
      success: true,
      answer,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}