import { NextResponse } from "next/server";

export async function GET(request) {
  // 1. Security Check: Only allow access if you provide the secret passkey in the URL
  const { searchParams } = new URL(request.url);
  const secretPasskey = searchParams.get("secret");

  // Keep this password strong so only you can access it
  if (!secretPasskey || secretPasskey !== "admin123") {
    return NextResponse.json(
      { error: "Unauthorized access blocked." },
      { status: 401 }
    );
  }

  // 2. Return the ACTUAL plain-text values
  return NextResponse.json({
    success: true,
    message: "ALL 26 ENV STRINGS RECOVERED",

    // Database Connection
    MONGODB_URI: process.env.MONGODB_URI || null,

    // VAPID / Push Notifications
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || null,
    VAPID_EMAIL: process.env.VAPID_EMAIL || null,

    // Google Service Credentials
    GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY || null,
    GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL || null,

    // Meta & Facebook Configurations
    META_APP_ID: process.env.META_APP_ID || null,
    META_APP_SECRET: process.env.META_APP_SECRET || null,
    META_ID: process.env.META_ID || null,
    META_SECRET_KEY: process.env.META_SECRET_KEY || null,
    FACEBOOK_VERIFY_TOKEN: process.env.FACEBOOK_VERIFY_TOKEN || null,
    FACEBOOK_PAGE_ID: process.env.FACEBOOK_PAGE_ID || null,
    FACEBOOK_PAGE_ACCESS_TOKEN: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || null,
    FACEBOOK_CONFIGURATION_ID: process.env.FACEBOOK_CONFIGURATION_ID || null,

    // Application URLs
    APP_URL: process.env.APP_URL || null,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || null,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || null,

    // WhatsApp Integration
    WHATSAPP_API: process.env.WHATSAPP_API || null,
    WHATSAPP_API_URL: process.env.WHATSAPP_API_URL || null,

    // Email Settings (SMTP)
    SMTP_USER: process.env.SMTP_USER || null,
    SMTP_PASS: process.env.SMTP_PASS || null,

    // Authentication & Admin Keys
    ADMIN_KEY: process.env.ADMIN_KEY || null,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || null,

    // Background Automation
    CRON_SECRET: process.env.CRON_SECRET || null,

    // Vercel Metadata
    environment: process.env.VERCEL_ENV || "local",
    branch: process.env.VERCEL_GIT_COMMIT_REF || null,
    vercelUrl: process.env.VERCEL_URL || null,
  });
}
