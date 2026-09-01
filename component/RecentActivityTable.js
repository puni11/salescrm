"use client";

import { Phone, MessageCircle, MessageSquare } from "lucide-react";
import { timeAgo } from "@/lib/Dashboardutils";
import Link from "next/link";

const TYPE_CONFIG = {
  CALL: { icon: Phone, bg: "bg-blue-50", text: "text-blue-600" },
  WHATSAPP: { icon: MessageCircle, bg: "bg-emerald-50", text: "text-emerald-600" },
  COMMENT: { icon: MessageSquare, bg: "bg-amber-50", text: "text-amber-600" },
};

function activityTitle(activity) {
  if (activity.type === "CALL") return `Call · ${activity.phone}`;
  if (activity.type === "WHATSAPP") return `WhatsApp · ${activity.lead || activity.phone}`;
  return activity.lead || activity.phone;
}

function activitySubtitle(activity) {
  return activity.comment || activity.message || "";
}

export default function RecentActivityTable({ activities }) {
  const list = activities || [];

  return (
    <div className="bg-white border border-dashed border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
        <Link href="dashboard/interaction" className="text-xs font-medium text-blue-600 hover:text-blue-700">View All</Link>
      </div>

      <div className="flex flex-col divide-y divide-gray-50">
        {list.length === 0 && (
          <p className="text-sm text-gray-400 py-6 text-center">No recent activity yet.</p>
        )}
        {list.slice(0, 6).map((activity, i) => {
          const config = TYPE_CONFIG[activity.type] || TYPE_CONFIG.COMMENT;
          const Icon = config.icon;
          return (
            <div key={i} className="flex items-start gap-3 py-3">
              <div className={`w-9 h-9 ${config.bg} ${config.text} flex items-center justify-center shrink-0`}>
                <Icon size={16} strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{activityTitle(activity)}</p>
                {activitySubtitle(activity) && (
                  <p className="text-xs text-gray-400 truncate">{activitySubtitle(activity)}</p>
                )}
              </div>
              <span className="text-[11px] text-gray-400 shrink-0 mt-0.5">{timeAgo(activity.time)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}