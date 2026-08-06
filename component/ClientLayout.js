"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/component/Sidebar";
import usePushNotifications from "@/hooks/usePushNotifications";
import NotificationPermissionPopup from "./NotificationPermissionPopup";
export default function ClientLayout({ session, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [showNotificationPopup, setShowNotificationPopup] = useState(true);

const { enableNotifications } = usePushNotifications();
  return (
    <div className="flex h-screen overflow-hidden font-sans w-full">
      
      {/* Sidebar Component */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} session={session} />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto font-sans">

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}