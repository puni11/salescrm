import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import clientPromise from "@/lib/mongodb";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const {
      subscription,
      browser,
      platform,
      userAgent,
    } = await req.json();

    if (!subscription?.endpoint) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid subscription",
        },
        {
          status: 400,
        }
      );
    }

    const client = await clientPromise;

    const db = client.db("sales");

    await db.collection("push_subscriptions").updateOne(
      {
        endpoint: subscription.endpoint,
      },
      {
        $set: {
          userId: session.user.id,
          endpoint: subscription.endpoint,
          subscription,
          browser,
          platform,
          userAgent,
          lastSeen: new Date(),
          updatedAt: new Date(),
        },

        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      {
        upsert: true,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Subscription Saved",
    });
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