import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("sales");

    // India timezone: UTC + 5:30
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);

    const year = istNow.getUTCFullYear();
    const month = istNow.getUTCMonth();
    const date = istNow.getUTCDate();

    // Exact Start of Today in IST (converted to UTC for MongoDB)
    const startOfDayIST = new Date(
      Date.UTC(year, month, date, 0, 0, 0, 0) - istOffset
    );

    // Exact Start of Tomorrow in IST (converted to UTC for MongoDB)
    const startOfTomorrowIST = new Date(
      Date.UTC(year, month, date + 1, 0, 0, 0, 0) - istOffset
    );

    const followups = await db
      .collection("followUp")
      .aggregate([
        {
          $match: {
            followUpDate: {
              $gte: startOfDayIST,
              $lt: startOfTomorrowIST, // Strictly less than tomorrow
            },
          },
        },
        {
          $lookup: {
            from: "dm",
            localField: "leadId",
            foreignField: "_id",
            as: "lead",
          },
        },
        {
          $unwind: "$lead",
        },
        {
          $project: {
            _id: 1,
            name: "$lead.name",
            phone: "$lead.phone",
            course: "$lead.course",
            leadStatus: "$lead.status",
            followUpStatus: "$status",
            followUpDate: 1,
            followUpTime: 1,
            comment: 1,
          },
        },
        {
          $sort: {
            followUpDate: 1,
          },
        },
      ])
      .toArray();
    return NextResponse.json({
      success: true,
      count: followups.length,
      data: followups,
    });
  } catch (error) {
    console.error("Today's follow-ups error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch today's follow-ups",
      },
      { status: 500 }
    );
  }
}