"use client";

import { useEffect } from "react";
import { urlBase64ToUint8Array } from "@/lib/push";
export default function usePushNotifications() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    try {
      await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker Registered");
    } catch (err) {
      console.error(err);
    }
  }

 async function enableNotifications() {
  if (!("Notification" in window)) return false;

  const permission = await Notification.requestPermission();

  console.log(permission);

  if (permission !== "granted") {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      ),
    });
  }

  await fetch("/api/notifications/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subscription,
      browser:
        navigator.userAgentData?.brands
          ?.map((b) => b.brand)
          .join(", ") || "Unknown",
      platform: navigator.platform,
      userAgent: navigator.userAgent,
    }),
  });

  return true;
}
  return {
    enableNotifications,
  };
}