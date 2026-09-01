"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/component/Sidebar";
import usePushNotifications from "@/hooks/usePushNotifications";
import NotificationPermissionPopup from "./NotificationPermissionPopup";
import useDailyFollowups from "@/hooks/useDailyFollowups";
import DailyFollowupScreen from "./DailyFollowupScreen";
export default function ClientLayout({ session, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
    const {
    followups,
    showFollowups,
    closeFollowups,
  } = useDailyFollowups();
  
useEffect(() => {
  if (!("Notification" in window)) return;

  console.log("Permission:", Notification.permission);

  switch (Notification.permission) {
    case "default":
      setShowNotificationPopup(true);
      break;

    case "granted":
      setShowNotificationPopup(false);
      break;

    case "denied":
      setShowNotificationPopup(false);
      break;
  }
}, []);
const { enableNotifications } = usePushNotifications();
  return (
    <div className="flex h-screen overflow-hidden font-sans w-full">
      
      {/* Sidebar Component */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} session={session} />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto font-sans">

        <div className="p-6">{children}</div>
      </div>
    <NotificationPermissionPopup
  open={showNotificationPopup}
  onEnable={async () => {
    const success = await enableNotifications();

    if (success) {
      setShowNotificationPopup(false);
    }
  }}
  onLater={() => setShowNotificationPopup(false)}
/>
{showFollowups && (
        <DailyFollowupScreen
          followups={followups}
          onClose={closeFollowups}
        />
      )}
    </div>
  );
}