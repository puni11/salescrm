import { jwtVerify } from "jose";
import { NextResponse } from "next/server";

/**
 * CRM auth adapter.
 * Change this function only if your CRM uses a different cookie/session helper.
 * Never accept a userId supplied by the client.
 */
export async function getPlannerUserId(request) {
  const token = request.cookies.get("accessToken")?.value;
  const secret =
    process.env.ACCESS_TOKEN_SECRET ||
    process.env.JWT_ACCESS_SECRET ||
    process.env.NEXTAUTH_SECRET;

  if (!token || !secret) return null;

  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    const userId = payload.sub || payload.userId || payload.id;
    return userId ? String(userId) : null;
  } catch {
    return null;
  }
}

export function unauthorized() {
  return NextResponse.json(
    { success: false, message: "Unauthorized. Please sign in again." },
    { status: 401 }
  );
}
