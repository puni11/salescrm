
"use client";

import { getAigreentickSocket } from "@/lib/aigreentick-socket";
import { useEffect } from "react";

export default function WhatsAppGlobalListener() {
  useEffect(() => {
    const socket = getAigreentickSocket();

    if (!socket) return;

    const handleConnect = () => {
      console.log("Aigreentick global listener connected:", socket.id);
    };

    const handleDisconnect = (reason) => {
      console.log("Aigreentick disconnected:", reason);
    };

   
const handleLiveMessage = async (data) => {
  console.log("GLOBAL WHATSAPP MESSAGE:", data);

  if (data?.type !== "received") return;
  if (!data?.message_id) return;

  try {
    const response = await fetch("/api/whatsapp/incoming", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error("WhatsApp processing failed:", result);
      return;
    }

    if (!result.matched) {
      console.log("No matching CRM lead found");
      return;
    }

    window.dispatchEvent(
      new CustomEvent("crm:whatsapp-incoming", {
        detail: {
          ...data,
          leadId: result.leadId,
          assignedUserId: result.assignedUserId,
        },
      })
    );
  } catch (error) {
    console.error("WhatsApp incoming processing error:", error);
  }
};


    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("live_msg", handleLiveMessage);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("live_msg", handleLiveMessage);
    };
  }, []);

  return null;
}
