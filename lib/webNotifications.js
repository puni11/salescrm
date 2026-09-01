"use client";

import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
} from "firebase/messaging";

import app from "./firebase";

const VAPID_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export async function setupWebNotifications() {
  try {
    if (typeof window === "undefined") {
      return null;
    }

    if (!("Notification" in window)) {
      console.log(
        "Browser notifications are not supported"
      );

      return null;
    }

    const supported =
      await isSupported();

    if (!supported) {
      console.log(
        "Firebase Messaging is not supported"
      );

      return null;
    }

    /*
     * Ask user for notification permission
     */
    const permission =
      await Notification.requestPermission();

    console.log(
      "Notification permission:",
      permission
    );

    if (permission !== "granted") {
      console.log(
        "Notification permission denied"
      );

      return null;
    }

    /*
     * Register Firebase service worker
     */
    const registration =
      await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );

    console.log(
      "Firebase service worker registered:",
      registration
    );

    /*
     * Get Firebase Messaging instance
     */
    const messaging =
      getMessaging(app);

    /*
     * Get browser FCM token
     */
    const token =
      await getToken(
        messaging,
        {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration:
            registration,
        }
      );

    console.log(
      "=============================="
    );

    console.log(
      "WEB FCM TOKEN:"
    );

    console.log(token);

    console.log(
      "=============================="
    );

    /*
     * Foreground notification
     */
    onMessage(
      messaging,
      (payload) => {
        console.log(
          "Foreground FCM message:",
          payload
        );

        /*
         * We'll add the browser popup
         * here after token registration
         * is working.
         */
      }
    );

    return token;

  } catch (error) {
    console.error(
      "Web FCM setup error:",
      error
    );

    return null;
  }
}