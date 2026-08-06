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

  if (!("Notification" in window)) return;

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    return;
  }

  const registration = await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    ),
  });

  console.log(subscription);
}
  return {
    enableNotifications,
  };
}