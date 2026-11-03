"use client";

import { io } from "socket.io-client";

let socket = null;

export function getAigreentickSocket() {
  if (typeof window === "undefined") return null;

  if (!socket) {
    socket = io("https://socket.aigreentick.com", {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: false,
    });
  }

  return socket;
}