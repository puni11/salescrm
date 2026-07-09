"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Settings, 
  MessageSquareQuote,
  ChevronLeft, 
  Menu,
  ShoppingBag,
  User2,
  FileText,
  File,
  LogOutIcon,
  FileQuestion,
  MailCheck,
  UserCheck,
  UserCircle,
  MailIcon,
  ListChecks,
  BriefcaseBusiness,
  X, // <-- Added X icon for mobile close button
  User2Icon,
  ChevronRight,
  Settings2Icon,
  PhoneCall
} from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";

const NavItem = ({ href, icon: Icon, label, collapsed, active = false }) => (
  <Link
    href={href}
    title={collapsed ? label : undefined}
    className={`
      flex items-center gap-3 px-3 py-2.5 mx-3 rounded-lg transition-all duration-200 group
      ${active 
        ? "bg-gray-50/10 text-gray-50 border border-gray-300/20" 
        : "text-gray-300 hover:bg-gray-50 hover:text-gray-900 border border-transparent"}
    `}
  >
    <div className="shrink-0 flex items-center justify-center">
      <Icon 
        size={20} 
        className={active ? "text-gray-50" : "text-gray-300 group-hover:text-gray-600"} 
      />
    </div>
    <span
      className={`whitespace-nowrap text-sm font-medium tracking-wide transition-all duration-300 ${
        collapsed ? "md:opacity-0 md:w-0 overflow-hidden" : "opacity-100 w-auto ml-1"
      }`}
    >
      {label}
    </span>
  </Link>
);

export default function Sidebar({ session, collapsed, setCollapsed }) {
  const pathname = usePathname();
  
  // New state to control mobile overlay visibility
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Hamburger Button (Floating) - Only visible on small screens */}
      <button 
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 bg-[#05335c] text-white rounded-lg shadow-lg"
      >
        <Menu size={24} />
      </button>

      {/* Mobile Backdrop Overlay with Glass Blur */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 h-screen bg-[#05335c] border-r border-gray-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)]
           transition-all duration-400 ease-in-out flex flex-col
          md:relative md:translate-x-0 
          ${isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full"} 
          ${collapsed ? "md:w-20" : "md:w-64"}
        `}
      >
        {/* Header & Toggle */}
        <div className={`h-16 flex items-center p-4 border-b border-gray-100 transition-all ${collapsed ? "md:justify-center justify-between" : "justify-between"}`}>
          {/* Always show logo on mobile, hide on desktop if collapsed */}
          <div className={`flex items-center gap-2.5 overflow-hidden pl-2 ${collapsed ? "md:hidden block" : "block"}`}>
            <Image
  src="https://openshift.grras.com/frontassets/img/logo.png"
  width={170}
  height={70}
  alt="logo"
  className="w-auto h-10 filter brightness-0 invert"
/>
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-2 rounded-lg text-gray-300 hover:bg-gray-50 hover:text-gray-900 transition-colors shrink-0"
          >
            <X size={20} />
          </button>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:block p-2 rounded-lg text-gray-300 hover:bg-gray-50/20 hover:border hover:text-white border-gray-200/50 hover:text-gray-900 transition-all duration-300 ease-in-out shrink-0"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 space-y-1.5 overflow-y-auto overflow-x-hidden scrollbar-hide">
          <NavItem 
            href="/leads" 
            icon={User2} 
            label="Leads" 
            collapsed={collapsed} 
            active={pathname.includes("/leads")}
          />
           <NavItem 
            href="/call-logs" 
            icon={PhoneCall} 
            label="Call Activity" 
            collapsed={collapsed} 
            active={pathname.includes("/call-logs")}
          />
          {session?.user?.role === 'admin' && (
            <NavItem 
              href="/staff" 
              icon={BriefcaseBusiness} 
              label="Staff" 
              collapsed={collapsed} 
              active={pathname.includes("/staff")}
            />
          )}
          {session?.user?.role === 'admin' && (
            <NavItem 
              href="/settings/integrations" 
              icon={Settings2Icon} 
              label="Integrations" 
              collapsed={collapsed} 
              active={pathname.includes("/settings/integrations")}
            />
          )}
        </nav>

        {/* Footer / Profile Section */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 mt-auto">
          <div className={`flex items-center ${collapsed ? "md:justify-center justify-start" : "gap-3"} mb-3`}>
            {/* Avatar */}
            <Link href="/profile" className="shrink-0">
                {session?.user?.role === 'admin' ? (
                  <div className="h-12 w-12 bg-[#05335c] rounded-full flex justify-center items-center text-white shadow-2xl"><User2Icon /></div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-inner hover:opacity-90 transition-opacity">
                    <span className="text-amber-50 font-bold text-lg">
                      {session?.user?.name?.charAt(0).toUpperCase() || "A"}
                    </span> 
                  </div>
                )}
            </Link>
            
            {/* User Info - Hidden when collapsed on desktop, always visible on mobile */}
            <div className={`flex-1 min-w-0 ${collapsed ? "md:hidden block ml-3" : ""}`}>
              <Link href="/profile" className="block group">
                <p className="text-sm font-bold text-gray-900 truncate group-hover:text-amber-700 transition-colors">
                  {session?.user?.name || "Admin"}
                </p>
                <p className="text-xs font-medium text-gray-500 truncate capitalize">
                  {session?.user?.role || "Administrator"}
                </p>
              </Link>
            </div>
          </div>

          {/* Logout Button */}
          <button 
            onClick={() => signOut()}
            title={collapsed ? "Log out" : undefined}
            className={`
              flex items-center justify-center gap-2 w-full p-2.5 rounded-lg transition-all duration-200 font-medium
              ${collapsed 
                ? "md:text-gray-400 md:hover:text-red-600 md:hover:bg-red-50 text-gray-600 bg-white border border-gray-200" 
                : "text-gray-600 bg-white border border-gray-200 shadow-sm hover:border-red-200 hover:text-red-600 hover:bg-red-50"
              }
            `}
          >
            <LogOutIcon size={18} className={collapsed ? "md:group-hover:text-red-500" : "text-gray-400 group-hover:text-red-500"} />
            <span className={`text-sm ${collapsed ? "md:hidden block" : ""}`}>Log out</span>
          </button>
        </div>
      </div>
    </>
  );
}