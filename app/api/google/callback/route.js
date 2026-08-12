import { oauth2Client } from "@/lib/google";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const session = await getServerSession(authOptions); 
    const code = searchParams.get("code");

    // This should come from your authentication/session
    const userId = session.user.id;

    if (!code) {
      return NextResponse.json(
        { error: "Authorization code missing" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID missing" },
        { status: 400 }
      );
    }

    const { tokens } = await oauth2Client.getToken(code);

    const profile = jwt.decode(tokens.id_token);

  const client = await clientPromise;
    const internalDB = client.db("internal");
 const collection = internalDB.collection("google_integration");
    const existing = await collection.findOne({
      userId: new ObjectId(userId),
    });

    await collection.updateOne(
      {
        userId: new ObjectId(userId),
      },
      {
        $set: {
          provider: "google",

          googleId: profile.sub,

          email: profile.email,

          name: profile.name,

          picture: profile.picture,

          accessToken: tokens.access_token,

          refreshToken:
            tokens.refresh_token ||
            existing?.refreshToken ||
            null,

          expiryDate: new Date(tokens.expiry_date),

          connected: true,

          updatedAt: new Date(),

          ...(existing
            ? {}
            : {
                connectedAt: new Date(),
              }),
        },
      },
      {
        upsert: true,
      }
    );

    return NextResponse.redirect(
      "http://localhost:3000/settings/integrations?success=true"
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}