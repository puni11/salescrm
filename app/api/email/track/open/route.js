import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get("leadId");

    if (!leadId) {
      return new Response(null, { status: 204 });
    }

    const client = await clientPromise;
    const db = client.db("sales");

    const existing = await db.collection("engagements").findOne({
      leadId: new ObjectId(leadId),
      type: "EMAIL_OPEN",
    });

    if (!existing) {
      await db.collection("engagements").insertOne({
        leadId: new ObjectId(leadId),
        type: "EMAIL_OPEN",
        score: 5,
        createdAt: new Date(),
        ip:
          req.headers.get("x-forwarded-for") ||
          req.headers.get("x-real-ip"),
        userAgent: req.headers.get("user-agent"),
      });

      await db.collection("dm").updateOne(
        { _id: new ObjectId(leadId) },
        {
          $inc: {
            score: 5,
          },
        }
      );
    }

    const pixel = Buffer.from(
      "R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
      "base64"
    );

    return new Response(pixel, {
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    return new Response(null, { status: 204 });
  }
}