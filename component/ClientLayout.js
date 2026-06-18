"use client";

import { useState } from "react";
import Sidebar from "@/component/Sidebar";

export default function ClientLayout({ session, children }) {
  const [collapsed, setCollapsed] = useState(false);

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