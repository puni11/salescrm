// lib/security.js

import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://www.ap2v.com", // Change this
  "https://www.ap2v.com/",
];

export function validateOrigin(req) {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  if (!origin) {
    return {
      valid: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Origin header missing.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  if (!ALLOWED_ORIGINS.includes(origin)) {
    return {
      valid: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Unauthorized origin.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  if (
    referer &&
    !ALLOWED_ORIGINS.some((allowed) =>
      referer.startsWith(allowed)
    )
  ) {
    return {
      valid: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Unauthorized referer.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  return {
    valid: true,
    origin,
  };
}

export function getClientIP(req) {
  const forwarded = req.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return (
    req.headers.get("x-real-ip") ||
    "Unknown"
  );
}

export function getUserAgent(req) {
  return req.headers.get("user-agent") || "";
}

export async function checkDuplicate(
  db,
  phone,
  minutes = 5
) {
  const duplicate = await db
    .collection("dm")
    .findOne({
      phone,
      createdAt: {
        $gte: new Date(
          Date.now() - minutes * 60 * 1000
        ),
      },
    });

  return duplicate;
}

export async function saveEnquiry(
  db,
  data
) {
  return db
    .collection("dm")
    .insertOne({
      ...data,
      createdAt: new Date(),
    });
}