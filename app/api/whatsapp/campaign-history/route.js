
import { NextResponse } from "next/server";

const API_BASE = "https://aigreentick.com/api/v1";
const REPLIES_BASE = "https://api.aigreentick.com/api/v1";

const ENDPOINTS = {
  wa: {
    base: API_BASE,
    path: "wa",
  },
  report: {
    base: API_BASE,
    path: "report",
  },
  replies: {
    base: REPLIES_BASE,
    path: "template-replies",
  },
  shortUrls: {
    base: REPLIES_BASE,
    path: "template-short-urls",
  },
  shortUrlStats: {
    base: REPLIES_BASE,
    path: "template-short-urls/stats",
  },
  shortUrlClicks: {
    base: REPLIES_BASE,
    path: "template-short-urls/clicks",
  },
};

export async function GET(request) {
  try {
    const token = process.env.GREEN_TICK_API_TOKEN;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "GREEN_TICK_API_TOKEN is missing",
        },
        { status: 500 }
      );
    }

    const incomingUrl = new URL(request.url);
    const resource = incomingUrl.searchParams.get("resource") || "report";

    const endpoint = ENDPOINTS[resource];

    if (!endpoint) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid resource: ${resource}`,
        },
        { status: 400 }
      );
    }

    // IMPORTANT: No leading slash in endpoint.path
    const upstreamUrl = `${endpoint.base}/${endpoint.path}`;

    const url = new URL(upstreamUrl);

    // Forward query parameters
    incomingUrl.searchParams.forEach((value, key) => {
      if (key !== "resource" && value !== "") {
        url.searchParams.set(key, value);
      }
    });

    console.log("Green Tick API:", url.toString());

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const responseText = await response.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      data = {
        success: false,
        message: responseText || "Invalid provider response",
      };
    }

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("Green Tick Campaign History Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
