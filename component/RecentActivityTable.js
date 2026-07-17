"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Filter,
  Phone,
  MessageCircle,
  MessageSquare,
  HistoryIcon,
} from "lucide-react";

export default function RecentActivityTable({ activities = [] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return activities.filter((item) => {
      const q = search.toLowerCase();
      return (
        (item.phone || "").toLowerCase().includes(q) ||
        (item.lead || "").toLowerCase().includes(q) ||
        (item.comment || "").toLowerCase().includes(q) ||
        (item.message || "").toLowerCase().includes(q)
      );
    });
  }, [activities, search]);

  const getBadgeStyle = (type) => {
    switch (type) {
      case "CALL":
        return { icon: Phone, bg: "bg-blue-50 text-blue-600" };
      case "WHATSAPP":
        return { icon: MessageCircle, bg: "bg-green-50 text-green-600" };
      default:
        return { icon: MessageSquare, bg: "bg-orange-50 text-orange-600" };
    }
  };

  return (
    <div className="bg-white rounded-[8px] border border-gray-100 shadow-sm p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Recent Activities</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Latest calls, WhatsApp messages and notes
          </p>
        </div>

        <div className="flex gap-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400/50 w-full md:w-64 transition-all"
            />
          </div>
          <button className="px-4 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 flex items-center gap-2 transition-colors">
            <HistoryIcon size={16} />
            See All
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="text-gray-400 border-b border-gray-100">
              <th className="pb-3 font-medium px-2">Type</th>
              <th className="pb-3 font-medium px-2">Lead Name</th>
              <th className="pb-3 font-medium px-2">Phone</th>
              <th className="pb-3 font-medium px-2 w-[250px]">Details</th>
              <th className="pb-3 font-medium px-2 text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((activity, index) => {
              const { icon: Icon, bg } = getBadgeStyle(activity.type);
              const detailsText = activity.comment || activity.message || "Call Activity";

              return (
                <tr
                  key={index}
                  className="hover:bg-gray-50/50 transition-colors group/row"
                >
                  {/* Type Badge */}
                  <td className="py-3 px-2">
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${bg}`}
                    >
                      <Icon size={14} strokeWidth={2.5} />
                      <span className="text-xs font-semibold tracking-wide">
                        {activity.type}
                      </span>
                    </div>
                  </td>

                  {/* Lead Name */}
                  <td className="py-3 px-2 font-medium text-gray-900">
                    {activity.lead || "-"}
                  </td>

                  {/* Phone */}
                  <td className="py-3 px-2 text-gray-500">
                    {activity.phone}
                  </td>

                  {/* Truncated Details with Popover */}
                  <td className="py-3 px-2 max-w-[250px]">
                    <div className="relative group/tooltip flex items-center">
                      <p className="truncate text-gray-600 cursor-default">
                        {detailsText}
                      </p>
                      
                      {/* CSS-Only Tooltip Popover */}
                      <div className="absolute bottom-full left-0 mb-2 hidden group-hover/tooltip:block z-10 w-max max-w-xs pointer-events-none">
                        <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl leading-relaxed">
                          {detailsText}
                          {/* Tooltip Arrow */}
                          <svg className="absolute text-gray-900 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                            <polygon className="fill-current" points="0,0 127.5,127.5 255,0" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Time */}
                  <td className="py-3 px-2 text-gray-400 text-right whitespace-nowrap text-xs">
                    {new Date(activity.time).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              );
            })}
            
            {filtered.length === 0 && (
              <tr>
                <td colSpan="5" className="py-8 text-center text-gray-400">
                  No recent activities found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}