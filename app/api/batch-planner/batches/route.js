import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Optional batch-list endpoint. It returns batch metadata only.
 * If your CRM already has a suitable /api/batches endpoint, the page can use it instead.
 */
export async function GET(request) {
  const session = await getServerSession(authOptions);
  if(!session){
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await clientPromise;
    const batches = await client.db("sales").collection("batches")
      .find({}, { projection: { name: 1, startingDate: 1, status: 1, courseId: 1 } })
      .sort({ startingDate: -1, _id: -1 })
      .limit(500)
      .toArray();

    return NextResponse.json({
      success: true,
      data: batches.map((batch) => ({
        _id: String(batch._id),
        name: batch.name || "Untitled batch",
        startingDate: batch.startingDate || "",
        status: batch.status || "",
      })),
    });
  } catch (error) {
    console.error("GET /api/batch-planner/batches:", error);
    return NextResponse.json({ success: false, message: "Unable to load batches." }, { status: 500 });
  }
}
