
"use client";

import { useEffect, useState } from "react";
import { getAigreentickSocket } from "@/lib/aigreentick-socket";

export default function SocketConnectionTest() {
  const [status, setStatus] = useState("Connecting...");
  const [socketId, setSocketId] = useState("");
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const socket = getAigreentickSocket();
    if (!socket) return;

    const onConnect = () => {
      setStatus("Connected");
      setSocketId(socket.id);
      setError("");
    };

    const onDisconnect = (reason) => {
      setStatus("Disconnected");
      console.log("Socket disconnected:", reason);
    };

    const onConnectError = (err) => {
      setStatus("Connection failed");
      setError(err.message);
      console.error(err);
    };

    // Listen for Aigreentick WhatsApp messages
    const onLiveMessage = (data) => {
      console.log("LIVE MESSAGE RECEIVED:", data);

      setMessages((previous) => [
        {
          ...data,
          receivedAt: new Date().toLocaleTimeString(),
        },
        ...previous,
      ]);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("live_msg", onLiveMessage);

    if (socket.connected) {
      onConnect();
    } else {
      socket.connect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("live_msg", onLiveMessage);
    };
  }, []);

  return (
    <div className="space-y-4 rounded-xl border bg-white p-5">
      <div className="flex items-center gap-2">
        <span
          className={`h-3 w-3 rounded-full ${
            status === "Connected"
              ? "bg-green-500"
              : "bg-red-500"
          }`}
        />

        <span className="font-semibold">
          Aigreentick Socket: {status}
        </span>
      </div>

      {socketId && (
        <p className="text-sm text-gray-500">
          Socket ID: {socketId}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <div className="border-t pt-4">
        <div className="mb-3 flex justify-between">
          <h3 className="font-semibold">Live WhatsApp Messages</h3>
          <span className="text-sm text-gray-500">
            {messages.length} received
          </span>
        </div>

        {messages.length === 0 ? (
          <p className="text-sm text-gray-400">
            Waiting for incoming messages...
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div
                key={`${message.message_id || index}-${index}`}
                className="rounded-lg border bg-gray-50 p-3"
              >
                <div className="flex justify-between">
                  <span className="text-sm font-semibold">
                    {message.send_from}
                  </span>
                  <span className="text-xs text-gray-500">
                    {message.receivedAt}
                  </span>
                </div>

                <p className="mt-2 text-sm">
                  {message.text || "Media message"}
                </p>

                <p className="mt-2 text-xs text-gray-500">
                  Contact ID: {message.contact_id}
                </p>

                <p className="text-xs text-gray-500">
                  Type: {message.type}
                </p>

                <details className="mt-2">
                  <summary className="cursor-pointer text-xs">
                    Full payload
                  </summary>
                  <pre className="mt-2 overflow-auto text-xs">
                    {JSON.stringify(message, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
