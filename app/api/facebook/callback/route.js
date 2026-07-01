import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          message: "Authorization code not found.",
        },
        {
          status: 400,
        }
      );
    }

    // Exchange code for User Token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v25.0/oauth/access_token` +
        `?client_id=${process.env.META_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(
          `${process.env.APP_URL}/api/facebook/callback`
        )}` +
        `&client_secret=${process.env.META_APP_SECRET}` +
        `&code=${code}`
    );

    const token = await tokenResponse.json();

    if (token.error) {
      return NextResponse.json(token, {
        status: 400,
      });
    }

    // Fetch all pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v25.0/me/accounts?access_token=${token.access_token}`
    );

    const pages = await pagesResponse.json();

    if (pages.error) {
      return NextResponse.json(pages, {
        status: 400,
      });
    }

    // Find only GRRAS Page
    const page = pages.data.find(
      (p) => p.id === "1039043886110312"
    );

    if (!page) {
      return NextResponse.json(
        {
          success: false,
          message: "GRRAS Facebook Page not found.",
        },
        {
          status: 404,
        }
      );
    }

    const client = await clientPromise;
    const db = client.db("internal");

    const expiresAt = new Date(
      Date.now() + token.expires_in * 1000
    );

    await db.collection("facebook_pages").updateOne(
      {
        pageId: page.id,
      },
      {
        $set: {
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: page.access_token,
          userAccessToken: token.access_token,
          userTokenExpiresAt: expiresAt,
          connected: true,
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

    return NextResponse.redirect(
      `${process.env.APP_URL}/settings/integrations/facebook?success=true`
    );
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
        message: err.message,
      },
      {
        status: 500,
      }
    );
  }
}