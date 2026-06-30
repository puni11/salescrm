import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const client = await clientPromise;

    const db = client.db("internal");

    const integration = await db
      .collection("facebook_integrations")
      .findOne();

    if (!integration) {
      return NextResponse.json({
        status: "disconnected",
      });
    }

    return NextResponse.json(integration);
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