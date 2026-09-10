import { NextResponse } from "next/server";

export async function GET(request) {
  console.log("========================================");
  console.log("ENV CHECK START");
  console.log("========================================");

  console.log("VERCEL_ENV:", process.env.VERCEL_ENV);
  console.log("VERCEL_URL:", process.env.VERCEL_URL);
  console.log("VERCEL_GIT_COMMIT_REF:", process.env.VERCEL_GIT_COMMIT_REF);

  const envVariables = [
    "MONGODB_URI",

    "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    "VAPID_PRIVATE_KEY",
    "VAPID_EMAIL",

    "GOOGLE_PRIVATE_KEY",
    "GOOGLE_CLIENT_EMAIL",

    "META_APP_ID",
    "META_APP_SECRET",
    "META_ID",
    "META_SECRET_KEY",

    "APP_URL",
    "NEXT_PUBLIC_APP_URL",

    "FACEBOOK_PAGE_ACCESS_TOKEN",
    "FACEBOOK_VERIFY_TOKEN",
    "FACEBOOK_PAGE_ID",
    "FACEBOOK_CONFIGURATION_ID",

    "NEXTAUTH_URL",
    "NEXTAUTH_SECRET",

    "CRON_SECRET",

    "SMTP_USER",
    "SMTP_PASS",

    "WHATSAPP_API",
    "WHATSAPP_API_URL",

    "ADMIN_KEY",
  ];

  const result = {};

  for (const name of envVariables) {
    const value = process.env[name];

    console.log(
      `[ENV] ${name}:`,
      value ? `EXISTS (length: ${value.length})` : "MISSING"
    );

    result[name] = {
      exists: Boolean(value),
      length: value?.length || 0,
    };
  }

  console.log("========================================");
  console.log("ENV CHECK END");
  console.log("========================================");

  return NextResponse.json({
    success: true,

    environment: process.env.VERCEL_ENV || "local",
    branch: process.env.VERCEL_GIT_COMMIT_REF || null,

    variables: result,
  });
}
