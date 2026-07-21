"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  Phone,
  MessageCircle,
  FileText,
  User,
  Calendar,
  Loader2,
  Activity,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCcw
} from "lucide-react";
import BackButton from "@/lib/BackButton";

const formatNumber = (num) => new Intl.NumberFormat("en-IN").format(num || 0);

// Helper for Trend UI
const getTrendUI = (change = 0) => {
  if (change > 0) return { icon: TrendingUp, color: "text-emerald-700 bg-emerald-100", text: `+${change}%` };
  if (change < 0) return { icon: TrendingDown, color: "text-red-700 bg-red-100", text: `${change}%` };
  return { icon: Minus, color: "text-gray-600 bg-gray-100", text: "0%" };
};

export default function CustomerInteractions() {
  const [interactions, setInteractions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
const fetchInteractions = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/dashboard/interaction?limit=100');
        const json = await response.json();
        if (json.success) {
          setInteractions(json.data);
          setStats(json.stats); 
        }
      } catch (error) {
        console.error("Failed to fetch interactions:", error);
      } finally {
        setLoading(false);
      }
    };
  // Fetch data on mount
  useEffect(() => {
    

    fetchInteractions();
  }, []);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter]);

  // Client-side filtering logic
  const filteredInteractions = useMemo(() => {
    return interactions.filter((item) => {
      const q = searchQuery.toLowerCase();
      
      const matchesSearch = 
        (item.leadName || "").toLowerCase().includes(q) ||
        (item.phone || "").toLowerCase().includes(q) ||
        (item.counsellorName || "").toLowerCase().includes(q) ||
        (item.details || "").toLowerCase().includes(q);

      const matchesType = typeFilter === "ALL" || item.interactionType === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [interactions, searchQuery, typeFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredInteractions.length / itemsPerPage) || 1;
  const paginatedInteractions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInteractions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInteractions, currentPage]);

  // Helper for UI styling based on interaction type
  const getTypeConfig = (type) => {
    switch (type) {
      case "CALL":
        return { icon: Phone, bg: "bg-blue-50", text: "text-blue-600", label: "Call" };
      case "WHATSAPP":
        return { icon: MessageCircle, bg: "bg-green-50", text: "text-green-600", label: "WhatsApp" };
      case "NOTE":
        return { icon: FileText, bg: "bg-orange-50", text: "text-orange-600", label: "Note" };
      default:
        return { icon: FileText, bg: "bg-gray-50", text: "text-gray-600", label: "Unknown" };
    }
  };

  return (
    <div className="bg-white p-6 w-full">
      <div className="flex flex-row gap-3 mb-4">
            <BackButton />
      <button
        onClick={() => fetchInteractions()}
        className={`flex items-center rounded-lg gap-2 px-4 py-2 text-xs cursor-pointer font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm w-fit `}
      >
        <RefreshCcw size={16} />
        Refresh
      </button>
            </div>
      {/* --- HEADER --- */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Lead Interactions Timeline</h2>
        <p className="text-gray-500 text-sm mt-1">
          Complete timeline and stats of calls, messages, and notes
        </p>
      </div>

      {/* --- MINI STATS DASHBOARD (Separated Totals & 7-Day Trends) --- */}
      {!loading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 mb-8">
          
          <StatComboCard
            title="Total Interactions"
            icon={Activity}
            iconColor="text-gray-700 bg-gray-100"
            allTime={stats.total}
            last7Days={stats.last7Days?.TOTAL}
            change={stats.comparison?.TOTAL?.change}
          />

          <StatComboCard
            title="Total Calls"
            icon={Phone}
            iconColor="text-blue-600 bg-blue-100"
            allTime={stats.byType?.CALL}
            last7Days={stats.last7Days?.CALL}
            change={stats.comparison?.CALL?.change}
          />

          <StatComboCard
            title="WhatsApp Sent"
            icon={MessageCircle}
            iconColor="text-green-600 bg-green-100"
            allTime={stats.byType?.WHATSAPP}
            last7Days={stats.last7Days?.WHATSAPP}
            change={stats.comparison?.WHATSAPP?.change}
          />

          <StatComboCard
            title="Notes Added"
            icon={FileText}
            iconColor="text-orange-600 bg-orange-100"
            allTime={stats.byType?.NOTE}
            last7Days={stats.last7Days?.NOTE}
            change={stats.comparison?.NOTE?.change}
          />

        </div>
      )}

      {/* --- CONTROLS (Search & Filter) --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start md:items-center gap-4 mb-6 pt-4 border-t border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search leads, counsellors, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="relative w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none w-full sm:w-44 pl-10 pr-8 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-all"
            >
              <option value="ALL">All Interactions</option>
              <option value="CALL">Calls Only</option>
              <option value="WHATSAPP">WhatsApp Only</option>
              <option value="NOTE">Notes Only</option>
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* --- DATA TABLE --- */}
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50/80 text-gray-500 font-medium border-b border-gray-100">
            <tr>
              <th className="py-4 px-4 whitespace-nowrap">Interaction</th>
              <th className="py-4 px-4">Lead Details</th>
              <th className="py-4 px-4 w-[280px]">Activity Details</th>
              <th className="py-4 px-4">Handled By</th>
              <th className="py-4 px-4 text-right">Date & Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            
            {loading ? (
              <tr>
                <td colSpan="5" className="py-20 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <Loader2 className="animate-spin mb-3 text-blue-500" size={28} />
                    <p className="font-medium">Loading interactions data...</p>
                  </div>
                </td>
              </tr>
            ) : paginatedInteractions.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-20 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center">
                    <Search size={32} className="mb-3 text-gray-300" strokeWidth={1.5} />
                    <p className="text-base font-medium text-gray-500">No interactions found</p>
                    <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedInteractions.map((item) => {
                const config = getTypeConfig(item.interactionType);
                const Icon = config.icon;

                return (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors group/row">
                    
                    <td className="py-4 px-4 align-top">
                      <div className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${config.bg} w-max`}>
                        <Icon size={14} className={config.text} strokeWidth={2.5} />
                        <span className={`text-xs font-bold tracking-wide ${config.text}`}>
                          {config.label}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-4 align-top">
                      <p className="font-semibold text-gray-900">{item.leadName}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{item.phone}</p>
                    </td>

                    {/* Details Snippet with Hover Popover */}
                    <td className="py-4 px-4 align-top max-w-[280px]">
                      <div className="relative group/tooltip flex items-center">
                        <p className="text-gray-700 truncate pr-4 cursor-default">
                          {item.details.replace(" - pending", "")}
                        </p>
                        
                        {/* Tooltip Popover */}
                        <div className="absolute z-50 bottom-full left-0 mb-2 hidden group-hover/tooltip:block w-max max-w-xs md:max-w-sm bg-gray-900 text-white text-xs rounded-lg py-2.5 px-3.5 shadow-xl whitespace-normal break-words pointer-events-none">
                          {item.details}
                          {/* Tooltip Arrow */}
                          <svg className="absolute text-gray-900 h-2 w-full left-4 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                            <polygon className="fill-current" points="0,0 127.5,127.5 255,0" />
                          </svg>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 align-top whitespace-nowrap">
                      <div className="flex items-center gap-2 text-gray-600">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                          <User size={14} className="text-gray-500" />
                        </div>
                        <span className="font-medium text-sm">{item.counsellorName}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4 align-top text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 text-gray-500">
                        <Calendar size={14} />
                        <span className="text-sm font-medium">
                          {new Date(item.timestamp).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* --- PAGINATION CONTROLS --- */}
      {!loading && filteredInteractions.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, filteredInteractions.length)}</span> of <span className="font-medium text-gray-900">{filteredInteractions.length}</span> entries
          </p>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            
            <div className="px-4 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-sm font-medium text-gray-700">
              Page {currentPage} of {totalPages}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

// 1. New Combo Card Component for Stats
function StatComboCard({ title, icon: Icon, iconColor, allTime, last7Days, change }) {
  return (
    <div className="rounded-lg border border-gray-100 p-5 transition-shadow hover:shadow-md">
      
      {/* Top Half: All-Time Stats */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${iconColor}`}>
            <Icon size={20} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-700">{title}</p>
            <p className="text-[11px] text-gray-400 uppercase tracking-wider">All Time</p>
          </div>
        </div>
        <div className="text-xl font-bold text-gray-900">{formatNumber(allTime)}</div>
      </div>
      
      {/* Bottom Half: 7-Day Stats with Trend */}
      <div className="pt-3 border-t border-gray-200/60 flex justify-between items-end">
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Last 7 Days</p>
          <p className="text-lg font-bold text-gray-800">{formatNumber(last7Days)}</p>
        </div>
        {change !== undefined && <TrendBadge change={change} />}
      </div>

    </div>
  );
}

// 2. Trend Badge Component
function TrendBadge({ change }) {
  const { icon: Icon, color, text } = getTrendUI(change);
  return (
    <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${color} group relative cursor-default`}>
      <Icon size={12} strokeWidth={2.5} />
      <span className="text-[11px] font-bold">{text}</span>
      
      {/* Tiny hover tooltip explaining the trend */}
      <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block w-max bg-gray-900 text-white text-[10px] rounded px-2 py-1 shadow-lg z-10 pointer-events-none">
        vs previous 7 days
      </div>
    </div>
  );
}