"use client";

import React from "react";
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
  BriefcaseBusiness
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
        collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto ml-1"
      }`}
    >
      {label}
    </span>
  </Link>
);

export default function Sidebar({ session, collapsed, setCollapsed }) {
  const pathname = usePathname();

  return (
    <div
      className={`h-screen bg-[#05335c] border-r border-gray-200 transition-all duration-300 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)]
      ${collapsed ? "w-20" : "w-64"}`}
    >
      {/* Header & Toggle */}
      <div className={`h-16 flex items-center p-4 border-b border-gray-100 transition-all ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden pl-2">
        
            <Image src={'/logo.avif'} width={300} height={100} alt="logo" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg text-gray-300 hover:bg-gray-50 hover:text-gray-900 transition-colors shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
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
         {session?.user?.role === 'admin' && (
          <NavItem 
            href="/staff" 
            icon={BriefcaseBusiness} 
            label="staff" 
            collapsed={collapsed} 
            active={pathname.includes("/staff")}
          />
        )}
      </nav>

      {/* Footer / Profile Section */}
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} mb-3`}>
          {/* Avatar - Always visible */}
          <Link href="/profile" className="shrink-0">
              {session?.user?.role === 'admin' ?
              <Image src={'/own.avif'} height={32} width={32} alt="admin" className="rounded-full" />
              :<div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-inner hover:opacity-90 transition-opacity">
             <span className="text-amber-50 font-bold text-lg">
                {session?.user?.name?.charAt(0).toUpperCase() || "A"}
              </span> 
            </div>}
          </Link>
          
          {/* User Info - Hidden when collapsed */}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <Link href="/profile" className="block group">
                <p className="text-sm font-bold text-gray-900 truncate group-hover:text-amber-700 transition-colors">
                  {session?.user?.name || "Admin"}
                </p>
                <p className="text-xs font-medium text-gray-500 truncate capitalize">
                  {session?.user?.role || "Administrator"}
                </p>
              </Link>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <button 
          onClick={() => signOut()}
          title={collapsed ? "Log out" : undefined}
          className={`
            flex items-center justify-center gap-2 w-full p-2.5 rounded-lg transition-all duration-200 font-medium
            ${collapsed 
              ? "text-gray-400 hover:text-red-600 hover:bg-red-50" 
              : "text-gray-600 bg-white border border-gray-200 shadow-sm hover:border-red-200 hover:text-red-600 hover:bg-red-50"
            }
          `}
        >
          <LogOutIcon size={18} className={collapsed ? "" : "text-gray-400 group-hover:text-red-500"} />
          {!collapsed && <span className="text-sm">Log out</span>}
        </button>
      </div>
    </div>
  );
}