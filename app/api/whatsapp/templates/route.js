
import { NextResponse } from "next/server";

const BASE_URL = "https://aigreentick.com/api/v1";

export async function GET(request) {
  try {
    const token = process.env.GREEN_TICK_API_TOKEN;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "GREEN_TICK_API_TOKEN is missing" },
        { status: 500 }
      );
    }

    const incomingUrl = new URL(request.url);

    const page = incomingUrl.searchParams.get("page") || "1";
    const perPage = incomingUrl.searchParams.get("per_page") || "10";
    const search = incomingUrl.searchParams.get("search") || "";
    const category = incomingUrl.searchParams.get("category") || "";
    const status = incomingUrl.searchParams.get("status") || "";

    const apiUrl = new URL(`${BASE_URL}/wa-templates`);

    apiUrl.searchParams.set("type", "fetch_list");
    apiUrl.searchParams.set("page", page);
    apiUrl.searchParams.set("per_page", perPage);

    if (search) apiUrl.searchParams.set("search", search);
    if (category) apiUrl.searchParams.set("category", category);
    if (status) apiUrl.searchParams.set("status", status);

    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const text = await response.text();

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      result = { success: false, message: text || "Invalid provider response" };
    }

    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error("WhatsApp templates API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Unable to fetch templates",
      },
      { status: 500 }
    );
  }
}
