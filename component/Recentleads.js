"use client";

import { initials, avatarColor, timeAgo, statusStyle } from "@/lib/Dashboardutils";
import Link from "next/link";

export default function RecentLeads({ leads }) {
  const list = leads || [];

  return (
    <div className="bg-gray-50 border border-dashed border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Recent Leads</h3>
        <Link href='/leads' className="text-xs font-medium text-blue-600 hover:text-blue-700">View All</Link>
      </div>

      <div className="flex flex-col divide-y divide-gray-50">
        {list.length === 0 && (
          <p className="text-sm text-gray-400 py-6 text-center">No recent leads yet.</p>
        )}
        {list.slice(0, 6).map((lead) => {
          const color = avatarColor(lead.name || lead.phone);
          return (
            <div key={lead._id} className="flex items-center gap-3 py-3">
              <div
                className={`w-9 h-9 rounded-full ${color.bg} ${color.text} flex items-center justify-center text-xs font-semibold shrink-0`}
              >
                {initials(lead.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{lead.name || "Unknown"}</p>
                <p className="text-xs text-gray-400 truncate">{lead.course || lead.phone}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-[11px] font-medium px-2 py-0.5 ${statusStyle(lead.status)}`}>
                  {lead.status || "Unassigned"}
                </span>
                <span className="text-[11px] text-gray-400">{timeAgo(lead.createdAt)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}