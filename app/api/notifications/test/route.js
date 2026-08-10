import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { sendPushNotification } from "@/lib/sendPushNotification";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { success: false },
      { status: 401 }
    );
  }

  const result = await sendPushNotification({
    userId: session.user.id,
    title: "CRM Notification",
    body: "Welcome to Push Notifications 🎉",
    url: "/dashboard",
  });
console.log(result)
  return NextResponse.json({
    success: true,
  });
}