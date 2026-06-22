import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

const CONFIG = {
  call: {
    score: 20,
    redirect: "tel:+919145840133",
  },
  whatsapp: {
    score: 25,
    redirect:
      "https://wa.me/919145840133",
  },
  website: {
    score: 10,
    redirect:
      "https://digital-marketing.grras.com/",
  },
};

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const leadId = searchParams.get("leadId");
  const action = searchParams.get("action");

  if (!leadId || !CONFIG[action]) {
    return NextResponse.redirect(
      "https://digital-marketing.grras.com/"
    );
  }

  const client = await clientPromise;
  const db = client.db("sales");

  const existing =
    await db.collection("engagements").findOne({
      leadId: new ObjectId(leadId),
      type: action.toUpperCase(),
    });

  if (!existing) {
    await db.collection("engagements").insertOne({
      leadId: new ObjectId(leadId),
      type: action.toUpperCase(),
      score: CONFIG[action].score,
      createdAt: new Date(),
    });

    await db.collection("dm").updateOne(
      { _id: new ObjectId(leadId) },
      {
        $inc: {
          score: CONFIG[action].score,
        },
      }
    );
  }

  return NextResponse.redirect(
    CONFIG[action].redirect
  );
}