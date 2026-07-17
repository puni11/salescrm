"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Phone,
  MessageCircle,
  Mail,
  Globe,
  UserPlus,
  Activity,
  User,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Clock,
  RefreshCcw
} from "lucide-react";
import Link from "next/link";
import BackButton from "@/lib/BackButton";

// Upgraded Icon Map with color configurations
const getTypeConfig = (type) => {
  switch (type) {
    case "CALL":
      return { icon: Phone, color: "text-blue-500", border: "border-blue-500", bg: "bg-blue-50" };
    case "WHATSAPP":
      return { icon: MessageCircle, color: "text-emerald-500", border: "border-emerald-500", bg: "bg-emerald-50" };
    case "EMAIL_OPEN":
      return { icon: Mail, color: "text-amber-500", border: "border-amber-500", bg: "bg-amber-50" };
    case "WEBSITE":
      return { icon: Globe, color: "text-purple-500", border: "border-purple-500", bg: "bg-purple-50" };
    case "LEAD_CREATED":
      return { icon: UserPlus, color: "text-indigo-500", border: "border-indigo-500", bg: "bg-indigo-50" };
    default:
      return { icon: Activity, color: "text-gray-400", border: "border-gray-300", bg: "bg-gray-50" };
  }
};

export default function LeadTimelinePage() {
  const { id } = useParams();

  // 1. All standard state hooks at the top
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState(null);
  const [timeline, setTimeline] = useState([]);

  async function loadTimeline() {
    setLoading(true)
    try {
      const res = await fetch(`/api/leads/timeline/${id}`);
      const data = await res.json();
      setLead(data.lead);
      setTimeline(data.timeline || []);
    } catch (error) {
      console.error("Failed to load timeline", error);
    } finally {
      setLoading(false);
    }
  }

  // 2. useEffect hook
  useEffect(() => {
    loadTimeline();
  }, []);

  // 3. useMemo hook MUST be before any early returns!
  const groupedTimeline = useMemo(() => {
    return timeline.reduce((acc, item) => {
      const date = new Date(item.timestamp);
      // Format: "Jan 19, 2018"
      const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(item);
      return acc;
    }, {});
  }, [timeline]);

  // 4. NOW it is safe to do an early return for the loading state
  if (loading || !lead) {
    return (
      <div className="p-10 text-center flex flex-col items-center justify-center text-gray-500 h-screen">
        <Activity className="animate-pulse mb-3" size={24} />
        Loading Timeline...
      </div>
    );
  }

  // 5. Main Component Render
  return (
    <div className=" p-6 md:p-10  min-h-screen">
      
      <div className="flex flex-row gap-3 mb-4">
                 <BackButton />
           <button
             onClick={() => loadTimeline()}
             className={`flex items-center rounded-lg gap-2 px-4 py-2 text-xs cursor-pointer font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm w-fit `}
           >
             <RefreshCcw size={16} />
             Refresh
           </button>
                 </div>

      {/* --- LEAD SUMMARY CARD --- */}
      <div className="bg-white border-b-2 border-gray-100 p-6 md:p-8 mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
          {lead.name}
        </h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <div>
            <div className="text-gray-400 font-medium mb-1 uppercase tracking-wider text-xs">Phone</div>
            <div className="font-semibold text-gray-800">{lead.phone}</div>
          </div>
          <div>
            <div className="text-gray-400 font-medium mb-1 uppercase tracking-wider text-xs">Email</div>
            <div className="font-semibold text-gray-800">{lead.email}</div>
          </div>
          <div>
            <div className="text-gray-400 font-medium mb-1 uppercase tracking-wider text-xs">Course</div>
            <div className="font-semibold text-gray-800">{lead.course}</div>
          </div>
          <div>
            <div className="text-gray-400 font-medium mb-1 uppercase tracking-wider text-xs">Assigned</div>
            <div className="font-semibold text-gray-800">{lead.assignedTo}</div>
          </div>
        </div>
      </div>

      {/* --- TIMELINE AREA --- */}
      <div className="relative mt-8">
        
        {/* Continuous Vertical Axis Line */}
        <div className="absolute top-0 bottom-0 left-[108px] w-px bg-gray-200 -ml-[0.5px]"></div>

        {Object.entries(groupedTimeline).map(([date, items]) => (
          <div key={date} className="mb-10 relative">
            
            {/* Date Pill */}
            <div className="relative h-10 mb-6">
              <div className="absolute left-[108px] -translate-x-1/2 z-10 bg-gray-200 text-gray-600 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-sm whitespace-nowrap">
                {date}
              </div>
            </div>

            {/* Daily Activities */}
            <div className="space-y-6">
              {items.map((item) => {
                const config = getTypeConfig(item.type);
                const Icon = config.icon;
                const timeStr = new Date(item.timestamp).toLocaleTimeString("en-US", { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });

                return (
                  <div key={item.id} className="relative flex items-start group">
                    
                    {/* Time Column */}
                    <div className="w-20 shrink-0 text-right text-[11px] font-medium text-gray-500 pt-1.5">
                      {timeStr}
                    </div>
                    
                    {/* Spacer for precise alignment */}
                    <div className="w-4 shrink-0"></div>

                    {/* Timeline Node (Icon) */}
                    <div className={`relative z-10 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center shrink-0 mt-0.5 ${config.border}`}>
                      <Icon size={12} className={config.color} strokeWidth={3} />
                    </div>

                    {/* Spacer */}
                    <div className="w-4 shrink-0"></div>

                    {/* Content Box */}
                    <div className="flex-1 bg-white border border-gray-100 shadow-sm rounded-md px-4 py-3 hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {item.title}
                        </h3>

                        {/* Top-right badges (Status / Score) */}
                        <div className="flex items-center gap-2">
                          {item.status && (
                            <span className="px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[11px] font-semibold tracking-wide">
                              {item.status}
                            </span>
                          )}
                          {item.score && (
                            <span className="px-2.5 py-0.5 rounded-md bg-green-50 text-green-700 text-[11px] font-bold">
                              +{item.score} Score
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Sub-item: Description / Notes */}
                      {item.description && (
                        <div className="mt-3 bg-gray-50 rounded-lg p-3 text-sm text-gray-700 flex items-start gap-2.5 border border-gray-100/50">
                          <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                          <div className="flex items-start gap-2 w-full">
                            <FileText size={14} className="text-blue-400 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{item.description}</span>
                          </div>
                        </div>
                      )}

                      {/* Sub-item: Counsellor context */}
                      {item.counsellor && (
                        <div className="flex items-center gap-1.5 mt-3 text-xs font-medium text-gray-400">
                          <User size={12} />
                          Assigned to {item.counsellor !=='Unknown'? item.counsellor : lead.assignedTo}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}