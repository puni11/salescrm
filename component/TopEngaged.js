"use client";

import { Flame } from "lucide-react";
import { initials, avatarColor } from "@/lib/Dashboardutils";

export default function TopEngaged({ leads }) {
  const list = leads || [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Top Engaged Leads</h3>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-8 gap-2">
          <div className="w-10 h-10 rounded-full bg-gray-50 text-gray-300 flex items-center justify-center">
            <Flame size={18} />
          </div>
          <p className="text-sm text-gray-400">No engagement data yet</p>
          <p className="text-xs text-gray-300">Scores will appear once leads start engaging</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((lead, i) => {
            const color = avatarColor(lead.name);
            return (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${color.bg} ${color.text} flex items-center justify-center text-[11px] font-semibold`}>
                  {initials(lead.name)}
                </div>
                <p className="text-sm font-medium text-gray-900 flex-1 truncate">{lead.name}</p>
                <span className="text-xs font-semibold text-orange-600">{lead.engagementScore}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}