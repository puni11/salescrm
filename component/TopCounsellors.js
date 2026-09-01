"use client";

import { initials, avatarColor } from "@/lib/Dashboardutils";

const RANK_BADGE = ["bg-amber-100 text-amber-700", "bg-gray-100 text-gray-600", "bg-orange-50 text-orange-600"];

export default function TopCounsellors({ counsellors }) {
  const list = (counsellors || []).filter((c) => c.name).sort((a, b) => b.assignedLeads - a.assignedLeads);
  const max = Math.max(...list.map((c) => c.assignedLeads), 1);

  return (
    <div className="bg-gray-50 border border-dashed border-gray-200  p-5 h-full">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Counsellors Lead</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {list.map((c, i) => {
          const color = avatarColor(c.name);
          return (
            <div key={c.name} className="flex items-center gap-3">
              <span
                className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  RANK_BADGE[i] || "bg-gray-50 text-gray-400"
                }`}
              >
                {i + 1}
              </span>
              <div className={`w-8 h-8 ${color.bg} ${color.text} flex items-center justify-center text-[11px] font-semibold shrink-0`}>
                {initials(c.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                <div className="w-full h-1 bg-gray-100 overflow-hidden mt-1">
                  <div
                    className="h-full bg-blue-600"
                    style={{ width: `${(c.assignedLeads / max) * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-900 shrink-0">{c.assignedLeads}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}