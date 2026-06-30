import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("internal");

    const fields = await db
      .collection("crm_fields")
      .find(
        {
          active: true,
          module: "lead",
        },
        {
          projection: {
            _id: 0,
            label: 1,
            value: 1,
            type: 1,
            group: 1,
          },
        }
      )
      .sort({ group: 1, label: 1 })
      .toArray();

    return NextResponse.json(fields);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}