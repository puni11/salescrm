import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Use existing ADMIN_KEY to protect this route
    const providedKey = searchParams.get("key");

    if (
      !providedKey ||
      !process.env.ADMIN_KEY ||
      providedKey !== process.env.ADMIN_KEY
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const envVariables = [
      // Database
      "MONGODB_URI",

      // Push Notifications
      "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
      "VAPID_PRIVATE_KEY",
      "VAPID_EMAIL",

      // Google
      "GOOGLE_PRIVATE_KEY",
      "GOOGLE_CLIENT_EMAIL",

      // Meta
      "META_APP_ID",
      "META_APP_SECRET",
      "META_ID",
      "META_SECRET_KEY",

      // Facebook
      "FACEBOOK_PAGE_ACCESS_TOKEN",
      "FACEBOOK_VERIFY_TOKEN",
      "FACEBOOK_PAGE_ID",
      "FACEBOOK_CONFIGURATION_ID",

      // Application
      "APP_URL",
      "NEXT_PUBLIC_APP_URL",

      // NextAuth
      "NEXTAUTH_URL",
      "NEXTAUTH_SECRET",

      // Cron
      "CRON_SECRET",

      // SMTP
      "SMTP_USER",
      "SMTP_PASS",

      // WhatsApp
      "WHATSAPP_API",
      "WHATSAPP_API_URL",

      // Admin
      "ADMIN_KEY",
    ];

    const variables = {};

    for (const name of envVariables) {
      const value = process.env[name];

      variables[name] = {
        exists: !!value,
        length: value?.length || 0,
        preview: value
          ? value.length > 8
            ? `${value.slice(0, 4)}****${value.slice(-4)}`
            : "********"
          : null,
      };
    }

    const available = envVariables.filter(
      (name) => !!process.env[name]
    ).length;

    const missing = envVariables.filter(
      (name) => !process.env[name]
    );

    return NextResponse.json({
      success: true,

      vercel: {
        environment: process.env.VERCEL_ENV || "local",
        branch: process.env.VERCEL_GIT_COMMIT_REF || null,
        url: process.env.VERCEL_URL || null,
      },

      summary: {
        total: envVariables.length,
        available,
        missing: missing.length,
      },

      missingVariables: missing,

      variables,
    });
  } catch (error) {
    console.error("ENV CHECK ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Environment check failed",
      },
      { status: 500 }
    );
  }
}
