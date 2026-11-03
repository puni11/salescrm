'use client'
import React, { useState, useEffect, useRef } from "react";
import {
  Search, Filter, X, RefreshCw, AlertCircle, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Minus, Activity, Clock,
  PhoneIncoming, PhoneOutgoing, PhoneMissed, UserMinus,
  User, Calendar, Phone, BookOpen,
  Smartphone,
  Headphones,
} from "lucide-react";
import BackButton from "@/lib/BackButton";
import { fetchCounsellors } from "@/lib/helper/helper";

/* ---------- Notion-style tokens ---------- */
const FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';
const BORDER = "border-[rgba(55,53,47,0.09)]";
const BORDER_STRONG = "border-[rgba(55,53,47,0.16)]";
const MUTED = "text-[rgba(55,53,47,0.65)]";
const FAINT = "text-[rgba(55,53,47,0.5)]";
const HOVER = "hover:bg-[rgba(55,53,47,0.06)]";

const TAG = {
  gray: "bg-[#e3e2e0] text-[#32302c]",
  green: "bg-[#dbeddb] text-[#1c3829]",
  blue: "bg-[#d3e5ef] text-[#183347]",
  red: "bg-[#ffe2dd] text-[#5d1715]",
  orange: "bg-[#fadec9] text-[#49290e]",
  purple: "bg-[#e8deee] text-[#412454]",
};

const CALL_TYPES = ["Inbound", "Outbound", "Missed"];
const CALL_TYPE_TAG = {
  INCOMING: { label: "Inbound", color: "green" },
  OUTGOING: { label: "Outbound", color: "blue" },
  MISSED: { label: "Missed", color: "red" },
};

/* ---------- Hooks / helpers ---------- */
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const apiRequest = async (url, options = {}) => {
  try {
    const res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
    if (res.status === 401 || res.status === 403) return { unauthorized: true };
    const data = await res.json();
    return { data, error: !res.ok };
  } catch (err) {
    if (err.name === "AbortError") return { aborted: true, error: true };
    console.error("API Error:", err);
    return { error: true, message: err.message };
  }
};

const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return "N/A";
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
};

const formatTime = (totalSeconds) => {
  if (!totalSeconds) return "0m 0s";
  return `${Math.floor(totalSeconds / 60)}m ${Math.round(totalSeconds % 60)}s`;
};

const getDaysAgoSkippingSunday = (start, days) => {
  const d = new Date(start);
  let count = 0;
  while (count < days) {
    d.setDate(d.getDate() - 1);
    if (d.getDay() !== 0) count++;
  }
  return d;
};

const trendWindowLabel = (fromDate, toDate) => {
  const opts = { month: "short", day: "numeric" };
  if (fromDate || toDate) {
    const f = fromDate ? new Date(fromDate).toLocaleDateString("en-US", opts) : "Start";
    const t = toDate ? new Date(toDate).toLocaleDateString("en-US", opts) : "Today";
    return `Selected: ${f} – ${t}`;
  }
  const now = new Date();
  const start = getDaysAgoSkippingSunday(now, 4);
  return `${start.toLocaleDateString("en-US", opts)} – ${now.toLocaleDateString("en-US", opts)}`;
};

/* ---------- Small components (defined outside so they don't remount) ---------- */
const Tag = ({ color = "gray", children }) => (
  <span
    className={`inline-flex items-center rounded px-1.5 text-[13px] leading-[20px] whitespace-nowrap ${TAG[color]}`}
  >
    {children}
  </span>
);

const TrendLine = ({ trend, label }) => {
  if (trend === undefined || trend === null) return null;
  const up = trend > 0;
  const down = trend < 0;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs">
      <span
        className={`inline-flex items-center gap-0.5 font-medium ${
          up ? "text-[#0f7b6c]" : down ? "text-[#e03e3e]" : FAINT
        }`}
      >
        {up ? <TrendingUp size={12} /> : down ? <TrendingDown size={12} /> : <Minus size={12} />}
        {Math.abs(trend)}%
      </span>
      <span className={FAINT}>{label}</span>
    </div>
  );
};

const STAT_CARDS = [
  { key: "totalCalls", label: "Total calls", icon: Activity },
  { key: "averageCallTime", label: "Avg. call time", icon: Clock, format: formatTime },
  { key: "incomingCalls", label: "Incoming", icon: PhoneIncoming },
  { key: "outgoingCalls", label: "Outgoing", icon: PhoneOutgoing },
  { key: "missedCalls", label: "Missed", icon: PhoneMissed },
  { key: "unregisteredCalls", label: "Unregistered", icon: UserMinus },
];

const Th = ({ icon: Icon, children }) => (
  <th className={`px-2 py-1.5 text-[13px] font-normal whitespace-nowrap ${FAINT}`}>
    <span className="inline-flex items-center gap-1.5">
      <Icon size={14} />
      {children}
    </span>
  </th>
);

/* ---------- Page ---------- */
export default function CallLogsPage({ id, session }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true); // logs request only
  const [error, setError] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [counsellors, setCounsellors] = useState([]);
  const [stats, setStats] = useState(null);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const [courseFilter, setCourseFilter] = useState("");
  const [callTypeFilter, setCallTypeFilter] = useState("");
  const [selectedCounsellor, setSelectedCounsellor] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const pageSize = 20;

  // Used to ignore responses from older requests
  const reqRef = useRef(0);
  const abortRef = useRef(null);

  // FIX: counsellors loading must NOT control the table's loading state.
  // Previously setLoading was passed in, so loading flipped to false while
  // the logs request was still running -> "No call logs found" flashed.
  useEffect(() => {
    if (!id) fetchCounsellors(setCounsellors, () => {});
  }, [id]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const fetchLogs = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const reqId = ++reqRef.current;

    setLoading(true);
    setError(false);

    try {
      const params = new URLSearchParams({
        page,
        pageSize,
        search: debouncedSearch,
        ...(fromDate && { from: fromDate }),
        ...(toDate && { to: toDate }),
        ...(courseFilter && { course: courseFilter }),
        ...(callTypeFilter && { callType: callTypeFilter }),
        ...(selectedCounsellor && { counsellor: selectedCounsellor }),
      });

      const url = id
        ? `/api/call-logs/${id}?${params.toString()}`
        : `/api/call-logs?${params.toString()}`;

      const res = await apiRequest(url, { signal: controller.signal });
      if (reqId !== reqRef.current) return; // a newer request took over

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
        setError(true);
      }
    } catch (err) {
      if (reqId === reqRef.current) {
        console.error("Failed to fetch logs", err);
        setLogs([]);
        setError(true);
      }
    } finally {
      if (reqId === reqRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, callTypeFilter, courseFilter, selectedCounsellor, fromDate, toDate]);

  // Reset page in the same event that changes a filter -> only one request fires
  const onFilter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const hasFilters = Boolean(
    search || courseFilter || callTypeFilter || selectedCounsellor || fromDate || toDate
  );

  const clearFilters = () => {
    setSearch("");
    setCourseFilter("");
    setCallTypeFilter("");
    setSelectedCounsellor("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const windowLabel = trendWindowLabel(fromDate, toDate);

  /* ---------- Filters ---------- */
  const fieldClasses = `h-8 rounded-md border ${BORDER_STRONG} bg-white px-2 text-[13px] text-[#37352f] outline-none transition-colors ${HOVER} focus:ring-2 focus:ring-[#2383e2]/40`;

  const renderFilters = (isMobile = false) => {
    const wrap = isMobile ? "flex flex-col gap-1.5" : "flex items-center";
    const Label = ({ text }) =>
      isMobile ? <label className={`text-xs ${FAINT}`}>{text}</label> : null;

    return (
      <>
        <div className={wrap}>
          <Label text="Date range" />
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              aria-label="From date"
              value={fromDate}
              onChange={onFilter(setFromDate)}
              className={`${fieldClasses} ${isMobile ? "flex-1" : ""}`}
            />
            <span className={`text-[13px] ${FAINT}`}>to</span>
            <input
              type="date"
              aria-label="To date"
              value={toDate}
              onChange={onFilter(setToDate)}
              className={`${fieldClasses} ${isMobile ? "flex-1" : ""}`}
            />
          </div>
        </div>

        <div className={wrap}>
          <Label text="Call type" />
          <select value={callTypeFilter} onChange={onFilter(setCallTypeFilter)} className={fieldClasses}>
            <option value="">All call types</option>
            {CALL_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className={wrap}>
          <Label text="Course" />
          <select value={courseFilter} onChange={onFilter(setCourseFilter)} className={fieldClasses}>
            <option value="">All courses</option>
            <option value="Digital Marketing">Digital Marketing</option>
            <option value="Azure + Azure DevOps">Azure + Azure DevOps</option>
          </select>
        </div>

        {!id && (
          <div className={wrap}>
            <Label text="Counsellor" />
            <select value={selectedCounsellor} onChange={onFilter(setSelectedCounsellor)} className={fieldClasses}>
              <option value="">All counsellors</option>
              {counsellors.map((c) => (
                <option key={c.id || c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </>
    );
  };

  /* ---------- Unauthorized ---------- */
  if (unauthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white" style={{ fontFamily: FONT }}>
        <div className="text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-[#e03e3e]" />
          <h1 className="text-xl font-semibold text-[#37352f]">Access denied</h1>
          <p className={`mt-1 text-sm ${MUTED}`}>You don&apos;t have permission to view this page.</p>
        </div>
      </div>
    );
  }

  /* ---------- Render ---------- */
  return (
    <div className="min-h-screen bg-white text-[#37352f]">
      <div className="mx-auto w-full px-4 pb-20 pt-4 sm:px-10 lg:px-16">
        {/* Top bar */}
        <div className="flex items-center gap-2">
          <BackButton />
          <button
            onClick={fetchLogs}
            disabled={loading}
            className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[13px] ${MUTED} transition-colors ${HOVER} disabled:opacity-50`}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
        <h1 className="mt-3 text-[40px] font-bold leading-[1.2] tracking-[-0.01em]">Call logs</h1>
        <p className={`mt-1 text-[15px] ${MUTED}`}>View and monitor all calling activity.</p>

        {/* Stats strip */}
        <div className={`mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-md border ${BORDER} bg-[rgba(55,53,47,0.09)] md:grid-cols-3 xl:grid-cols-6`}>
          {STAT_CARDS.map(({ key, label, icon: Icon, format }) => {
            const s = stats?.[key];
            return (
              <div key={key} className="bg-white px-4 py-3.5">
                <div className={`flex items-center gap-1.5 text-[13px] ${MUTED}`}>
                  <Icon size={14} />
                  {label}
                </div>
                {stats ? (
                  <>
                    <div className="mt-1.5 text-[28px] font-semibold leading-8 tracking-tight">
                      {format ? format(s?.count || 0) : s?.count || 0}
                    </div>
                    <TrendLine trend={s?.trend} label={windowLabel} />
                  </>
                ) : (
                  <div className="mt-2 animate-pulse space-y-2">
                    <div className="h-7 w-16 rounded bg-[rgba(55,53,47,0.08)]" />
                    <div className="h-3 w-24 rounded bg-[rgba(55,53,47,0.06)]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className={`mt-8 flex flex-wrap items-center gap-2 border-b ${BORDER} pb-2`}>
          <div className="hidden flex-wrap items-center gap-2 md:flex">
            {renderFilters(false)}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className={`inline-flex h-8 items-center gap-1 rounded-md px-2 text-[13px] text-[#e03e3e] transition-colors hover:bg-[#ffe2dd]/60`}
              >
                <X size={14} />
                Clear
              </button>
            )}
          </div>

          <div className="flex w-full items-center gap-2 md:ml-auto md:w-auto">
            <div className="relative w-full md:w-64">
              <Search size={15} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${FAINT}`} />
              <input
                type="text"
                placeholder="Search phone, name, email…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className={`h-8 w-full rounded-md border ${BORDER_STRONG} bg-[rgba(55,53,47,0.03)] pl-8 pr-2 text-[13px] outline-none transition-colors placeholder:text-[rgba(55,53,47,0.4)] focus:bg-white focus:ring-2 focus:ring-[#2383e2]/40`}
              />
            </div>
            <button
              onClick={() => setIsMobileFiltersOpen(true)}
              aria-label="Open filters"
              className={`relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${BORDER_STRONG} ${MUTED} transition-colors ${HOVER} md:hidden`}
            >
              <Filter size={15} />
              {hasFilters && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#2383e2]" />}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className={`border-b ${BORDER}`}>
                <Th icon={User}>Lead</Th>
                <Th icon={Smartphone}>Mobile</Th>
                <Th icon={Calendar}>Call time</Th>
                <Th icon={Phone}>Type &amp; duration</Th>
                <Th icon={Phone}>Course &amp; counsello</Th>
                <Th icon={Headphones}>Counsellor</Th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className={`animate-pulse border-b ${BORDER}`}>
                    <td className="px-2 py-3">
                      <div className="mb-2 h-4 w-40 rounded bg-[rgba(55,53,47,0.08)]" />
                      <div className="h-3 w-56 rounded bg-[rgba(55,53,47,0.06)]" />
                    </td>
                    <td className="px-2 py-3">
                      <div className="mb-2 h-4 w-28 rounded bg-[rgba(55,53,47,0.08)]" />
                      <div className="h-3 w-16 rounded bg-[rgba(55,53,47,0.06)]" />
                    </td>
                    <td className="px-2 py-3">
                      <div className="mb-2 h-4 w-20 rounded bg-[rgba(55,53,47,0.08)]" />
                      <div className="h-3 w-14 rounded bg-[rgba(55,53,47,0.06)]" />
                    </td>
                    <td className="px-2 py-3">
                      <div className="mb-2 h-4 w-32 rounded bg-[rgba(55,53,47,0.08)]" />
                      <div className="h-3 w-24 rounded bg-[rgba(55,53,47,0.06)]" />
                    </td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={4} className="px-2 py-16 text-center">
                    <AlertCircle className="mx-auto mb-2 h-6 w-6 text-[#e03e3e]" />
                    <p className="text-[15px] font-medium">Couldn&apos;t load call logs</p>
                    <p className={`mt-1 text-[13px] ${MUTED}`}>Check your connection and try again.</p>
                    <button
                      onClick={fetchLogs}
                      className={`mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border ${BORDER_STRONG} px-3 text-[13px] transition-colors ${HOVER}`}
                    >
                      <RefreshCw size={13} />
                      Try again
                    </button>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-16 text-center">
                    <p className="text-[15px] font-medium">No call logs found</p>
                    <p className={`mt-1 text-[13px] ${MUTED}`}>
                      {hasFilters ? "Try changing or clearing your filters." : "New calls will appear here."}
                    </p>
                    {hasFilters && (
                      <button
                        onClick={clearFilters}
                        className={`mt-3 inline-flex h-8 items-center rounded-md border ${BORDER_STRONG} px-3 text-[13px] transition-colors ${HOVER}`}
                      >
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const date = log.call_time ? new Date(log.call_time) : null;
                  const lead = log.lead || {};
                  const type = CALL_TYPE_TAG[log.call_type];
                  const agent = log.counsellorName || "Unknown";

                  return (
                    <tr key={log._id} className={`border-b ${BORDER} transition-colors hover:bg-[rgba(55,53,47,0.03)]`}>
                      <td className="px-2 py-2.5 align-top">
                        {lead.name ? (
                          <>
                            <div className="text-[14px] font-medium">{lead.name}</div>
                            <div className={`mt-0.5 text-xs ${MUTED}`}>
                             {lead.email || "No email"}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-[14px] font-medium">{log.phone || "Unknown number"}</div>
                            <div className="mt-1">
                              <Tag color="orange">Not registered</Tag>
                            </div>
                          </>
                        )}
                      </td>
   <td className="px-2 py-2.5 align-top whitespace-nowrap">

                        <div className={`mt-1 flex items-center gap-1 text-xs ${MUTED}`}>
                          <Clock size={12} />
                          {(log.phone)}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 align-top whitespace-nowrap">
                        {date ? (
                          <>
                            <div className="text-[14px]">
                              {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </div>
                            <div className={`mt-0.5 text-xs ${MUTED}`}>
                              {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </>
                        ) : (
                          <span className={FAINT}>—</span>
                        )}
                      </td>

                      <td className="px-2 py-2.5 align-top whitespace-nowrap">
                        <Tag color={type?.color || "gray"}>{type?.label || log.call_type || "Not connected"}</Tag>
                        <div className={`mt-1 flex items-center gap-1 text-xs ${MUTED}`}>
                          <Clock size={12} />
                          {formatDuration(log.duration_seconds)}
                        </div>
                      </td>

                      <td className="px-2 py-2.5 align-top">
                        {lead.course ? <Tag color="purple">{lead.course}</Tag> : <span className={FAINT}>—</span>}
                       
                      </td>
                      <td className="px-2 py-2.5 align-top">
                        <div className={`mt-1 flex items-center gap-1.5 text-xs ${MUTED}`}>
                          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#e3e2e0] text-[10px] font-medium text-[#32302c]">
                            {agent.charAt(0).toUpperCase()}
                          </span>
                          {id? session.user.name : agent}
                        </div>
                       
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && !error && pages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className={`text-[13px] ${MUTED}`}>
              Page {page} of {pages}
            </p>
            <div className="flex gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className={`inline-flex h-8 items-center gap-1 rounded-md border ${BORDER_STRONG} px-2.5 text-[13px] transition-colors ${HOVER} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
              >
                <ChevronLeft size={14} />
                Previous
              </button>
              <button
                disabled={page === pages}
                onClick={() => setPage((p) => p + 1)}
                className={`inline-flex h-8 items-center gap-1 rounded-md border ${BORDER_STRONG} px-2.5 text-[13px] transition-colors ${HOVER} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile filters sheet */}
      <div
        className={`fixed inset-0 z-[70] md:hidden transition-opacity duration-200 ${
          isMobileFiltersOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="absolute inset-0 bg-black/30" onClick={() => setIsMobileFiltersOpen(false)} />
        <div
          className={`absolute inset-x-0 bottom-0 rounded-t-xl bg-white p-4 pb-6 shadow-[0_-8px_30px_rgba(15,15,15,0.15)] transition-transform duration-200 ${
            isMobileFiltersOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className={`mb-4 flex items-center justify-between border-b ${BORDER} pb-3`}>
            <h2 className="text-[15px] font-semibold">Filters</h2>
            <button
              onClick={() => setIsMobileFiltersOpen(false)}
              aria-label="Close filters"
              className={`rounded-md p-1.5 ${MUTED} ${HOVER}`}
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">{renderFilters(true)}</div>

          <div className="mt-5 flex gap-2">
            {hasFilters && (
              <button
                onClick={clearFilters}
                className={`h-9 flex-1 rounded-md border ${BORDER_STRONG} text-[14px] ${HOVER}`}
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setIsMobileFiltersOpen(false)}
              className="h-9 flex-1 rounded-md bg-[#2383e2] text-[14px] font-medium text-white transition-colors hover:bg-[#0b6fd1]"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}