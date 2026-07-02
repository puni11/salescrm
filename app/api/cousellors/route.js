import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb"; // Update the path if needed

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("internal"); // Uses the DB from your connection string

    const counsellors = await db
      .collection("users")
      .find(
        {
          role: "counsellor",
          isBlocked: false,
        },
        {
          projection: {
            _id: 1,
            name: 1,
          },
        }
      )
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: counsellors.map((user) => ({
        id: user._id.toString(),
        name: user.name,
      })),
    });
  } catch (error) {
    console.error("Error fetching counsellors:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch counsellors",
      },
      { status: 500 }
    );
  }
}