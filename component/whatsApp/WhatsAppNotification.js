
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import {
  playWhatsAppSound,
  unlockWhatsAppSound,
} from "./notificationSound";

const TOAST_MS = 6000;
const RESUME_MS = 3000;

const TOAST_SHADOW =
  "shadow-[rgba(15,15,15,0.05)_0_0_0_1px,rgba(15,15,15,0.1)_0_3px_6px,rgba(15,15,15,0.2)_0_9px_24px]";

export default function WhatsAppNotification({ session }) {
  const router = useRouter();

  const [notification, setNotification] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundLoaded, setSoundLoaded] = useState(false);

  const notificationTimer = useRef(null);
  const processedMessages = useRef(new Set());
  const pendingMessages = useRef(new Set());

  const currentUserId = String(session?.user?.id || "");
  const role = String(session?.user?.role || "")
    .toLowerCase()
    .trim();

  const isAdmin = role === "admin";

  // Load sound preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem(
        "whatsapp_sound_enabled"
      );

      if (saved !== null) {
        setSoundEnabled(saved === "true");
      }
    } catch (error) {
      console.error("Sound preference error:", error);
    }

    setSoundLoaded(true);
  }, []);

  // Unlock browser audio after user interaction
  useEffect(() => {
    const unlock = () => {
      unlockWhatsAppSound();
    };

    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const clearTimer = useCallback(() => {
    if (notificationTimer.current) {
      clearTimeout(notificationTimer.current);
      notificationTimer.current = null;
    }
  }, []);

  const closeNotification = useCallback(() => {
    setNotification(null);
    clearTimer();
  }, [clearTimer]);

  const scheduleDismiss = useCallback(
    (id, ms) => {
      clearTimer();

      notificationTimer.current = setTimeout(() => {
        setNotification((current) =>
          current?.id === id ? null : current
        );

        notificationTimer.current = null;
      }, ms);
    },
    [clearTimer]
  );

  // Normalize customer number
  const normalizeMobile = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    return digits.length >= 10 ? digits.slice(-10) : "";
  };

  // Fetch lead details from MongoDB
  const getLeadDetails = async (mobile) => {
    try {
      const response = await fetch(
        `/api/whatsapp/notification-lead?mobile=${encodeURIComponent(mobile)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(`Lead lookup failed: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !result.found) {
        return null;
      }

      return result.data;
    } catch (error) {
      console.error("Notification lead lookup error:", error);
      return null;
    }
  };

  // Incoming socket message
  useEffect(() => {
    if (!currentUserId || !soundLoaded) return;

    const handleIncoming = async (event) => {
      try {
        let data = event.detail;

        // Support payload format:
        // ["live_msg", { ... }]
        if (Array.isArray(data)) {
          if (data[0] !== "live_msg") return;
          data = data[1];
        }

        if (!data || typeof data !== "object") return;

        // Only incoming messages
        if (data.type && data.type !== "received") return;

        const messageId = String(
          data.message_id ||
          data.messageId ||
          data.id ||
          ""
        );

        if (!messageId) {
          console.warn("Missing WhatsApp message ID:", data);
          return;
        }

        // Prevent duplicate events
        if (
          processedMessages.current.has(messageId) ||
          pendingMessages.current.has(messageId)
        ) {
          return;
        }

        // IMPORTANT:
        // send_from is the customer number.
        // Do not use send_to because it is your business number.
        const mobile = normalizeMobile(data.send_from);

        if (!mobile) {
          console.warn("Invalid sender number:", data);
          return;
        }

        pendingMessages.current.add(messageId);

        console.log("Incoming WhatsApp message:", {
          messageId,
          mobile,
          currentUserId,
          role,
        });

        // Find matching CRM lead
        const lead = await getLeadDetails(mobile);

        // If lead exists, check MongoDB assignment
        if (lead) {
          const assignedToId = String(
            lead.assignedToId || ""
          );

          const isAssignedToCurrentUser =
            assignedToId === currentUserId;

          // Admin sees all known leads.
          // Counsellor sees only their assigned leads.
          if (!isAdmin && !isAssignedToCurrentUser) {
            console.log(
              "Notification skipped: Lead assigned to another counsellor",
              {
                leadName: lead.name,
                assignedToId,
                currentUserId,
              }
            );

            processedMessages.current.add(messageId);
            pendingMessages.current.delete(messageId);
            return;
          }
        } else {
          // Unknown leads are visible to admins only
          if (!isAdmin) {
            console.log(
              "Unknown lead notification skipped for counsellor:",
              mobile
            );

            processedMessages.current.add(messageId);
            pendingMessages.current.delete(messageId);
            return;
          }
        }

        // Determine display name
        const leadName = lead?.name ||
          data.send_from_id ||
          "Unknown Lead";

        const messageText =
          data.text ||
          data.message ||
          data.body ||
          data.caption ||
          "New WhatsApp message";

        processedMessages.current.add(messageId);

        pendingMessages.current.delete(messageId);

        // Prevent cache from growing indefinitely
        if (processedMessages.current.size > 500) {
          const first = processedMessages.current.values().next().value;
          processedMessages.current.delete(first);
        }

        // Show notification
        setNotification({
          id: messageId,
          leadId: lead?._id || null,
          mobile,
          name: leadName,
          message:
            typeof messageText === "string"
              ? messageText
              : "New WhatsApp message",
        });

        // Play sound
        if (soundEnabled) {
          playWhatsAppSound();
        }

        scheduleDismiss(messageId, TOAST_MS);

      } catch (error) {
        console.error(
          "WhatsApp notification handler error:",
          error
        );
      } finally {
        // Ensure failed lookups do not leave messages stuck.
        const detail = Array.isArray(event.detail)
          ? event.detail[1]
          : event.detail;

        const id = String(
          detail?.message_id ||
          detail?.messageId ||
          detail?.id ||
          ""
        );

        if (id) {
          pendingMessages.current.delete(id);
        }
      }
    };

    window.addEventListener(
      "crm:whatsapp-incoming",
      handleIncoming
    );

    return () => {
      window.removeEventListener(
        "crm:whatsapp-incoming",
        handleIncoming
      );
    };
  }, [
    currentUserId,
    isAdmin,
    role,
    soundEnabled,
    soundLoaded,
    scheduleDismiss,
  ]);

  // Cleanup
  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  // Open WhatsApp chat
  const openChat = () => {
    if (!notification?.mobile) return;

    const params = new URLSearchParams({
      mobile: notification.mobile,
      name: notification.name || "Unknown Lead",
    });

    if (notification.leadId) {
      params.set("leadId", notification.leadId);
    }

    closeNotification();

    router.push(`/whatsapp?${params.toString()}`);
  };

  // Toggle sound
  const toggleSound = async () => {
    const nextValue = !soundEnabled;

    setSoundEnabled(nextValue);

    try {
      localStorage.setItem(
        "whatsapp_sound_enabled",
        String(nextValue)
      );
    } catch (error) {
      console.error(error);
    }

    if (nextValue) {
      await unlockWhatsAppSound();
      playWhatsAppSound();
    }
  };

  const initial =
    (notification?.name || "W")
      .trim()
      .charAt(0)
      .toUpperCase() || "W";

  return (
    <>
      <style>{`
        @keyframes wa-toast-in {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .wa-toast-in {
          animation: wa-toast-in 180ms
            cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }

        @media (prefers-reduced-motion: reduce) {
          .wa-toast-in {
            animation: none;
          }
        }
      `}</style>

      {/* Sound toggle */}
      <button
        onClick={toggleSound}
        title={
          soundEnabled
            ? "Mute message sound"
            : "Turn on message sound"
        }
        aria-pressed={soundEnabled}
        className="fixed top-10 right-12 z-[99999] inline-flex items-center gap-1.5 border border-gray-200 rounded-md bg-white px-2.5 py-1.5 text-[13px] font-medium text-[#37352F] shadow-sm transition-colors hover:bg-[#F7F6F3] dark:bg-[#252525] dark:text-[#E6E6E5] dark:hover:bg-[#2F2F2F]"
      >
        {soundEnabled ? (
          <Volume2 size={14} />
        ) : (
          <VolumeX size={14} />
        )}

        {soundEnabled ? "Sound on" : "Sound off"}
      </button>

      {/* Notification toast */}
      {notification && (
        <div
          className="fixed right-5 top-5 z-[99998] w-[360px] max-w-[calc(100vw-24px)]"
          role="status"
          aria-live="polite"
        >
          <div
            key={notification.id}
            onClick={openChat}
            onMouseEnter={clearTimer}
            onMouseLeave={() =>
              scheduleDismiss(notification.id, RESUME_MS)
            }
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openChat();
              }

              if (e.key === "Escape") {
                closeNotification();
              }
            }}
            className={`wa-toast-in group relative cursor-pointer rounded-lg bg-white p-3 text-[#37352F] transition-colors hover:bg-[#FBFBFA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2]/50 dark:bg-[#252525] dark:text-[#E6E6E5] dark:hover:bg-[#2B2B2B] ${TOAST_SHADOW}`}
          >
            <div className="flex items-start gap-2.5">

              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#E7F3F8] text-[13px] font-semibold text-[#183347] dark:bg-[#1F3A47] dark:text-[#A8D4E8]">
                  {initial}
                </div>

                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-1 ring-black/5 dark:bg-[#252525]">
                  <MessageCircle
                    size={10}
                    className="text-[#0F7B6C]"
                    strokeWidth={2.5}
                  />
                </span>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 pr-5">
                  <p className="truncate text-[14px] font-semibold leading-5">
                    {notification.name}
                  </p>

                  <span className="shrink-0 text-[12px] text-[#37352F]/50 dark:text-white/40">
                    now
                  </span>
                </div>

                <p className="mt-0.5 line-clamp-2 break-words text-[14px] leading-5 text-[#37352F]/70 dark:text-white/60">
                  {notification.message}
                </p>

                <div className="mt-2.5 flex items-center gap-2">
                  <span className="inline-flex items-center rounded-[4px] bg-[#37352F]/[0.06] px-1.5 py-0.5 text-[12px] font-medium text-[#37352F]/80 dark:bg-white/10 dark:text-white/80">
                    Reply
                  </span>

                  <span className="text-[12px] text-[#37352F]/45 dark:text-white/35">
                    New WhatsApp message
                  </span>
                </div>
              </div>
            </div>

            {/* Close */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeNotification();
              }}
              aria-label="Dismiss notification"
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded text-[#37352F]/45 opacity-0 transition hover:bg-[#37352F]/[0.08] hover:text-[#37352F] focus:opacity-100 group-hover:opacity-100 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
