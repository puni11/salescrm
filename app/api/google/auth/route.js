import { NextResponse } from "next/server";
import { oauth2Client } from "@/lib/google";

export async function GET() {
    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent", // Required to receive refresh token
        scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar",
        ],
    });

    return NextResponse.redirect(url);
}