'use client'
import React, { useState, useEffect } from "react";
import { 
  Search, Filter, X, CheckCircle, 
  AlertCircle, Clock, Phone, User, Calendar,
  PhoneIncoming, PhoneOutgoing, PhoneMissed, UserMinus, Activity,
  RefreshCw
} from "lucide-react";
import BackButton from "@/lib/BackButton";
import { useRouter } from "next/navigation";

// --- CUSTOM HOOKS ---
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// --- MOCK API REQUESTER ---
const apiRequest = async (url, options = {}) => {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    });
    if (res.status === 401 || res.status === 403) return { unauthorized: true };
    const data = await res.json();
    return { data, error: !res.ok };
  } catch (err) {
    console.error("API Error:", err);
    return { error: true, message: err.message };
  }
};

// --- CONSTANTS ---
const CALL_TYPES = ["Inbound", "Outbound", "Missed"];

export default function CallLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [counsellors, setCounsellors] = useState([]);
  const [stats, setStats] = useState(null);
  const router = useRouter();
  // UI States
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  
  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  
  const [courseFilter, setCourseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [callTypeFilter, setCallTypeFilter] = useState("");
  const [selectedCounsellor, setSelectedCounsellor] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  
  const pageSize = 20;

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, callTypeFilter, courseFilter, selectedCounsellor, fromDate, toDate]);

  useEffect(() => {
    fetchCounsellors();
  }, []);

  async function fetchCounsellors() {
    try {
      const res = await fetch("/api/cousellors"); // Adjust if your endpoint is different
      const data = await res.json();
      if (data.success) {
        setCounsellors(data.data);
      }
    } catch (error) {
      console.error("Error fetching counsellors:", error);
    }
  }

  // --- API INTEGRATION ---
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        pageSize,
        search: debouncedSearch,
        ...(fromDate && { from: fromDate }),
        ...(toDate && { to: toDate }),
        ...(statusFilter && { status: statusFilter }),
        ...(courseFilter && { course: courseFilter }),
        ...(callTypeFilter && { callType: callTypeFilter }),
        ...(selectedCounsellor && { counsellor: selectedCounsellor }),
      });

      // NOTE: Adjust this route if your API is named differently (e.g., /api/calls)
      const res = await apiRequest(`/api/call-logs?${params.toString()}`);

      if (res.unauthorized) {
        setUnauthorized(true);
        return;
      }

      if (!res.error && res.data?.success) {
        setLogs(res.data.data || []);
        setPages(res.data.totalPages || 0);
        setStats(res.data.stats || null);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, statusFilter, callTypeFilter, courseFilter, selectedCounsellor, fromDate, toDate]);

  // --- HELPERS ---
  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return "N/A";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const getStatusColor = (status) => {
    if (!status) return "bg-gray-100 text-gray-800";
    const s = status.toLowerCase();
    if (s.includes("answered") || s.includes("connected") || s.includes("converted")) return "bg-green-100 text-green-800";
    if (s.includes("missed") || s.includes("failed") || s.includes("invalid")) return "bg-red-100 text-red-800";
    if (s.includes("voicemail") || s.includes("interested")) return "bg-yellow-100 text-yellow-800";
    return "bg-blue-100 text-blue-800";
  };

  // Reusable Filter Render Logic
  const renderFilters = (isMobile = false) => {
    const inputClasses = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500";
    const wrapperClasses = isMobile ? "flex flex-col gap-1.5 mt-2 first:mt-0" : "flex items-center gap-2";
    const labelClasses = "text-xs font-bold uppercase tracking-wide text-gray-500";

    const MobileLabel = ({ text }) => (
      isMobile ? <label className={labelClasses}>{text}</label> : null
    );

    return (
      <>
        {/* Custom Date Range */}
        <div className={wrapperClasses}>
          <MobileLabel text="Date Range" />
          <div className="flex w-full items-center gap-2">
            <input 
              type="date" 
              value={fromDate} 
              onChange={(e) => setFromDate(e.target.value)} 
              className={`flex-1 ${inputClasses}`} 
            />
            <span className="text-sm font-medium text-gray-400">to</span>
            <input 
              type="date" 
              value={toDate} 
              onChange={(e) => setToDate(e.target.value)} 
              className={`flex-1 ${inputClasses}`} 
            />
          </div>
        </div>

        {/* Call Type */}
        <div className={wrapperClasses}>
          <MobileLabel text="Call Type" />
          <select 
            value={callTypeFilter} 
            onChange={(e) => setCallTypeFilter(e.target.value)} 
            className={inputClasses}
          >
            <option value="">All Call Types</option>
            {CALL_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Course */}
        <div className={wrapperClasses}>
          <MobileLabel text="Course" />
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className={inputClasses}
          >
            <option value="">All Courses</option>
            <option value="Digital Marketing">Digital Marketing</option>
            <option value="Azure + Azure DevOps">Azure + Azure DevOps</option>
          </select>
        </div>

        {/* Counsellor */}
        <div className={wrapperClasses}>
          <MobileLabel text="Counsellor" />
          <select
            value={selectedCounsellor}
            onChange={(e) => setSelectedCounsellor(e.target.value)}
            className={inputClasses}
          >
            <option value="">All Counsellors</option>
            {counsellors.map((counsellor) => (
              <option key={counsellor.id || counsellor.name} value={counsellor.name}>
                {counsellor.name}
              </option>
            ))}
          </select>
        </div>
      </>
    );
  };

  if (unauthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-500 mt-2">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900 px-4 py-8 ">
        <div className="flex flex-row gap-3">
      <BackButton />
<button
  onClick={() => router.refresh()}
  className={`flex items-center rounded-lg gap-2 px-4 py-2 text-xs cursor-pointer font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm w-fit `}
>
  <RefreshCw size={16} />
  Refresh
</button>
      </div>
      {/* Header */}
      <header className=" px-4 sm:px-8 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Logs</h1>
          <p className="text-sm text-gray-500 mt-1">View and monitor all calling activity.</p>
        </div>
        <div className="relative flex-grow w-full md:w-auto md:max-w-md flex items-center gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search phone, name, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button
            onClick={() => setIsMobileFiltersOpen(true)}
            className="md:hidden flex-shrink-0 p-2.5 bg-gray-50 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 hover:text-blue-600 transition-colors"
          >
            <Filter size={20} />
          </button>
        </div>
      </header>
      <div className="hidden md:flex bg-white px-4 sm:px-8 py-4 border-b border-gray-200 gap-3 flex-wrap items-center shadow-sm z-10">
        {renderFilters(false)}
      </div>
{/* --- SUMMARY CARDS GRID --- */}
{/* --- MINIMALIST SUMMARY CARDS --- */}
{stats && (
  <div className="px-4 sm:px-8 py-8 ">
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
      
      {/* Total Calls */}
      <div className="group bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-4">
 <div className="w-10 h-10 rounded-lg bg-gray-50/50 flex items-center justify-center text-gray-600 group-hover:bg-gray-50 transition-colors">          <Activity size={18} strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-3xl font-semibold text-gray-900 tracking-tight">{stats.totalCalls}</h3>
          <p className="text-[13px] font-medium text-gray-400 mt-1">Total Calls</p>
        </div>
      </div>

      {/* Incoming */}
      <div className="group bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-4">
 <div className="w-10 h-10 rounded-lg bg-gray-50/50 flex items-center justify-center text-gray-600 group-hover:bg-gray-50 transition-colors">          <PhoneIncoming size={18} strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-3xl font-semibold text-gray-900 tracking-tight">{stats.incomingCalls}</h3>
          <p className="text-[13px] font-medium text-gray-400 mt-1">Incoming</p>
        </div>
      </div>

      {/* Outgoing */}
      <div className="group bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-4">
 <div className="w-10 h-10 rounded-lg bg-gray-50/50 flex items-center justify-center text-gray-600 group-hover:bg-gray-50 transition-colors">          <PhoneOutgoing size={18} strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-3xl font-semibold text-gray-900 tracking-tight">{stats.outgoingCalls}</h3>
          <p className="text-[13px] font-medium text-gray-400 mt-1">Outgoing</p>
        </div>
      </div>

      {/* Missed */}
      <div className="group bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-4">
        <div className="w-10 h-10 rounded-lg bg-gray-50/50 flex items-center justify-center text-gray-600 group-hover:bg-gray-50 transition-colors">
          <PhoneMissed size={18} strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-3xl font-semibold text-gray-900 tracking-tight">{stats.missedCalls}</h3>
          <p className="text-[13px] font-medium text-gray-400 mt-1">Missed Calls</p>
        </div>
      </div>

      {/* Unregistered */}
      <div className="group bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-4">
        <div className="w-10 h-10 rounded-lg bg-gray-50/50 flex items-center justify-center text-gray-600 group-hover:bg-gray-50 transition-colors">
          <UserMinus size={18} strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-3xl font-semibold text-gray-900 tracking-tight">{stats.unregisteredCalls}</h3>
          <p className="text-[13px] font-medium text-gray-400 mt-1">Unregistered</p>
        </div>
      </div>

    </div>
  </div>
)}
      {/* Filters Bar (Desktop) */}
      

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto p-2 sm:p-8 relative">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                 
                  <th className="px-6 py-4">Lead Details</th>
                  <th className="px-6 py-4">Call Details</th>
                   <th className="px-6 py-4">Call Time & Type</th>
                  <th className="px-6 py-4">Course & Counsellor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  // Skeleton Loader
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 bg-gray-200 rounded-full w-24"></div>
                      </td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  // Empty State
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <Filter className="h-10 w-10 text-gray-300 mb-3" />
                        <p className="text-lg font-medium text-gray-900">No call logs found</p>
                        <p className="text-sm">Try adjusting your filters or search query.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  // Data Rows
                  logs.map((log) => {
                    const parsedDate = log.call_time ? new Date(log.call_time) : null;
                    const lead = log.lead || {};

                    return (
                      <tr key={log._id} className="hover:bg-blue-50 transition-colors">
                      
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {lead.name ? (
                            <>
                              <div className="font-medium text-gray-900">{lead.name}</div>
                              <div className="text-gray-500 text-xs mt-1">{lead.phone} - {lead.email || 'No email'}</div>
                            </>
                          ) : (
                            <span className="text-gray-900">
                              {log.phone || 'Unknown Lead'}
                              <div className="text-gray-500 text-xs mt-1">Number Not Registered</div>
                            </span>
                          )}
                        </td>
                       
                          <td className="px-6 py-4">
                          {parsedDate ? (
                            <>
                              <div className="text-gray-900 flex items-center gap-1">
                                <Calendar size={14} className="text-gray-400"/>
                                {parsedDate.toLocaleDateString()}
                              </div>
                              <div className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                                <Clock size={14} className="text-gray-400"/>
                                {parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-900 capitalize">{log.call_type || 'Call Not Connected'}</div>
                          <div className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                            <Clock size={12}/> {formatDuration(log.duration_seconds)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-900 font-medium">{lead.course || 'N/A'}</div>
                          <div className="text-gray-500 text-xs mt-1">
  Agent: {log.counsellorName || 'Unknown'}
</div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Pagination Controls */}
        {!loading && pages > 1 && (
          <div className="flex justify-between items-center mt-6">
            <p className="text-sm text-gray-500">
              Page {page} of {pages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 bg-white text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page === pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 bg-white text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      {/* --- MOBILE FILTERS DRAWER (Bottom Sheet) --- */}
      <div
        className={`fixed inset-0 z-[70] md:hidden transition-opacity duration-300 ${
          isMobileFiltersOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
          onClick={() => setIsMobileFiltersOpen(false)}
        />
        <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 transform p-5 pb-8 ${isMobileFiltersOpen ? "translate-y-0" : "translate-y-full" }`}>
          <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Filter size={20} className="text-blue-600"/>
              Filters
            </h2>
            <button
              onClick={() => setIsMobileFiltersOpen(false)}
              className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto px-1">
            {renderFilters(true)}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={() => setIsMobileFiltersOpen(false)}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}