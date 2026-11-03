'use client'
import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { exportToExcel } from "@/lib/exportToExcel";
import {
  Search,
  Filter,
  Plus,
  Pencil,
  Sheet,
  ChevronDown,
  ChevronRight,
  Table2,
  Users,
  Type,
  Mail,
  Phone,
  BookOpen,
  Globe,
  CircleDot,
  UserRound,
  CalendarDays,
  MessageSquare,
  Tag,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import DashboardStats from "@/component/DashboardStats";
import useDebounce from "@/lib/useDebounce";
import { apiRequest } from "@/lib/api";
import { fetchCounsellors, fetchCourse, handleDelete } from "@/lib/helper/helper";
import UnAuthorised from "@/component/Unauthorised";
import LeadDetails from "@/component/LeadDetails";
import LeadDelete from "@/component/DeleteLead";
import LeadAdd from "@/component/LeadAdd";
import WhatsAppModel from "@/component/WhatsApp";
import MobileFilter from "@/component/MobileFilters";
import FolloUpModal from "@/component/FolloUpModal";
import OtherCourseModal from "@/component/OtherCourseModal";
import ChangeCounsellor from "@/component/ChangeCounsellorModal";

// --- CONSTANTS ---
const PROFILES = ["student", "fresher", "professional", "business", "other"];

const STATUS_OPTIONS = [
  "New Lead",
  "Cold",
  "Warm",
  "Hot",
  "Registered",
  "Invalid",
  "Other Course",
  "Looking For a job",
];
const STATUS_TAGS = {
  "New Lead": [],
  Cold: [
    "Connected -Dropped Whatsapp",
    "Tried But Didn’t Connected",
    "Not Interested",
  ],
  Warm: [
    "Call after sometime",
    "Price Issue",
    "Timing Issues",
    "Counselled - Now Not Interested",
    "Follow Up",
  ],
  Hot: [
    "Interested",
    "Demo req",
    "Demo Done",
    "Walk in",
    "Next Batch",
    "Waiting for approval",
  ],
  Registered: ["Fees topups"],
  Invalid: ["Not relevant", "Invalid No"],
  "Other Course": [],
  "Looking For a job": [],
};
const FROM_TYPES = ["GRRAS", "ap2v"];
const SOURCE_TYPES = [
  "Direct",
  "Google",
  "Facebook",
  "Instagram",
  "LinkedIn",
  "Twitter",
  "Referral",
  "GS1",
];

// Defaults (a param equal to its default is left out of the URL)
const DEFAULT_LIMIT = 10;
const DEFAULT_SORT = "newest";

// --- NOTION STYLE TOKENS ---
const TAG_COLORS = [
  "bg-[#E3E2E0] text-[#32302C]",
  "bg-[#EEE0DA] text-[#442A1E]",
  "bg-[#FADEC9] text-[#49290E]",
  "bg-[#FDECC8] text-[#402C1B]",
  "bg-[#DBEDDB] text-[#1C3829]",
  "bg-[#D3E5EF] text-[#183347]",
  "bg-[#E8DEEE] text-[#412454]",
  "bg-[#F5E0E9] text-[#4C2337]",
  "bg-[#FFE2DD] text-[#5D1715]",
];

const tagColor = (key = "") => {
  let hash = 0;
  for (const ch of String(key)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TAG_COLORS[hash % TAG_COLORS.length];
};

const STATUS_STYLES = {
  "New Lead": ["bg-[#D3E5EF] text-[#183347]", "bg-[#2383E2]"],
  Cold: ["bg-[#E3E2E0] text-[#32302C]", "bg-[#9B9A97]"],
  Warm: ["bg-[#FDECC8] text-[#402C1B]", "bg-[#CB912F]"],
  Hot: ["bg-[#DBEDDB] text-[#1C3829]", "bg-[#4DAB9A]"],
  Registered: ["bg-[#DBEDDB] text-[#1C3829]", "bg-[#0F7B6C]"],
  Invalid: ["bg-[#FFE2DD] text-[#5D1715]", "bg-[#E03E3E]"],
  "Other Course": ["bg-[#E8DEEE] text-[#412454]", "bg-[#9065B0]"],
  "Looking For a job": ["bg-[#D3E5EF] text-[#183347]", "bg-[#2383E2]"],
};

const getStatusStyle = (status) =>
  STATUS_STYLES[status] || ["bg-[#E3E2E0] text-[#32302C]", "bg-[#9B9A97]"];

const GRID =
  "grid grid-cols-[minmax(140px,0.7fr)_minmax(110px,0.5fr)_140px_minmax(120px,0.7fr)_120px_190px_minmax(110px,1.0fr)_180px_minmax(280px,1.7fr)]";

const hoverBg = "hover:bg-[rgba(55,53,47,0.06)]";

const menuShadow =
  "rgba(15,15,15,0.05) 0 0 0 1px, rgba(15,15,15,0.1) 0 3px 6px, rgba(15,15,15,0.2) 0 9px 24px";

function Tagged({ className = "", children }) {
  return (
    <span
      className={`inline-flex max-w-full shrink-0 items-center truncate rounded-[3px] px-1.5 py-0.5 text-sm leading-5 ${className}`}
    >
      {children}
    </span>
  );
}

function HeadCell({ icon: Icon, last, children }) {
  return (
    <div
      className={`flex h-[34px] items-center gap-1.5 overflow-hidden px-2 text-sm text-[#787774] ${
        last ? "" : "border-r border-[#E9E9E7]"
      }`}
    >
      {Icon && <Icon size={15} className="shrink-0 text-[#9B9A97]" />}
      <span className="truncate">{children}</span>
    </div>
  );
}

function Cell({ last, children, className = "" }) {
  return (
    <div
      className={`flex h-[37px] items-center gap-1 overflow-hidden px-2 text-sm ${
        last ? "" : "border-r border-[#E9E9E7]"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function Empty() {
  return <span className="text-[#C7C6C3]">—</span>;
}

// --- MAIN APPLICATION COMPONENT ---
export default function App({ session }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read the initial value of each filter from the URL (runs once per state)
  const fromUrl = (key, fallback) => searchParams.get(key) || fallback;
  const numFromUrl = (key, fallback) => {
    const n = Number(searchParams.get(key));
    return Number.isInteger(n) && n > 0 ? n : fallback;
  };

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [counsellors, setCounsellors] = useState([]);
  const [selectedCounsellor, setSelectedCounsellor] = useState(() => fromUrl("counsellorId", ""));
  const [stats, setStats] = useState(null);
  const [fromFilter, setFromFilter] = useState(() => fromUrl("from", "All"));
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);

  // Modals & Drawers
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [courseFilter, setCourseFilter] = useState(() => fromUrl("course", "All"));
  const [course, setCourse] = useState([]);
  // Filters & Pagination
  const [sort, setSort] = useState(() => fromUrl("sort", DEFAULT_SORT)); // newest | oldest | name
  const [fromDate, setFromDate] = useState(() => fromUrl("fromDate", ""));
  const [toDate, setToDate] = useState(() => fromUrl("toDate", ""));
  const [page, setPage] = useState(() => numFromUrl("page", 1));
  const [pages, setPages] = useState(0);
  const [search, setSearch] = useState(() => fromUrl("search", ""));
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [otherCourse, setOtherCourse] = useState(false);
  const [changeCounsellorModal, setChangeCounsellorModal] = useState(false);
  const debouncedSearch = useDebounce(search, 500);
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    id: null,
  });
  const [statusFilter, setStatusFilter] = useState(() => fromUrl("status", "All"));
  const [tagFilter, setTagFilter] = useState(() => fromUrl("tag", "All"));
  const availableTags = statusFilter === "All"
    ? [...new Set(Object.values(STATUS_TAGS).flat())]
    : STATUS_TAGS[statusFilter] || [];
  const [sourceFilter, setSourceFilter] = useState(() => fromUrl("source", "All"));
  const [profileFilter, setProfileFilter] = useState(() => fromUrl("profile", "All"));
  const [dateFilter, setDateFilter] = useState(() => fromUrl("dateFilter", "All")); // All, Today, Last3, Last7, Last30
  const [limit, setLimit] = useState(() => numFromUrl("limit", DEFAULT_LIMIT));

  // Reset page to 1 only when a filter actually changes (not on first load,
  // so ?page=3 survives a refresh)
  const prevFilterSig = useRef(null);
  useEffect(() => {
    const sig = JSON.stringify([
      debouncedSearch, statusFilter, tagFilter, sourceFilter, profileFilter, dateFilter,
      fromFilter, courseFilter, selectedCounsellor, sort, fromDate, toDate, limit,
    ]);
    if (prevFilterSig.current !== null && prevFilterSig.current !== sig) {
      setPage(1);
    }
    prevFilterSig.current = sig;
  }, [debouncedSearch, statusFilter, tagFilter, sourceFilter, profileFilter, dateFilter, fromFilter, courseFilter, selectedCounsellor, sort, fromDate, toDate, limit]);

  // Keep the URL in sync with the filters
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter !== "All") params.set("status", statusFilter);
    if (tagFilter !== "All") params.set("tag", tagFilter);
    if (sourceFilter !== "All") params.set("source", sourceFilter);
    if (profileFilter !== "All") params.set("profile", profileFilter);
    if (courseFilter !== "All") params.set("course", courseFilter);
    if (fromFilter !== "All") params.set("from", fromFilter);
    if (dateFilter !== "All") params.set("dateFilter", dateFilter);
    if (selectedCounsellor) params.set("counsellorId", selectedCounsellor);
    if (sort !== DEFAULT_SORT) params.set("sort", sort);
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    if (limit !== DEFAULT_LIMIT) params.set("limit", String(limit));
    if (page > 1) params.set("page", String(page));

    const qs = params.toString();
    const next = qs ? `${pathname}?${qs}` : pathname;
    const current = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    if (next !== current) {
      router.replace(next, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, tagFilter, sourceFilter, profileFilter, courseFilter, fromFilter, dateFilter, selectedCounsellor, sort, fromDate, toDate, limit, page, pathname]);

  useEffect(() => {
    fetchCounsellors(setCounsellors, setLoading);
    fetchCourse(setCourse, setLoading);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  // --- API INTEGRATIONS ---

  // 1. Fetch Leads
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit,
        search: debouncedSearch,
        sort,
        fromDate,
        toDate,
        ...(statusFilter !== "All" && { status: statusFilter }),
        ...(tagFilter !== "All" && { tag: tagFilter }),
        ...(profileFilter !== "All" && { profile: profileFilter }),
        ...(courseFilter !== "All" && { course: courseFilter }),
        ...(dateFilter !== "All" && { dateFilter }),
        ...(sourceFilter !== "All" && { source: sourceFilter }),
        ...(fromFilter !== "All" && { from: fromFilter }),
        ...(selectedCounsellor && { counsellorId: selectedCounsellor }),
      });

      const res = await apiRequest(`/api/contact?${params.toString()}`);

      if (res.unauthorized) {
        setUnauthorized(true);
        return;
      }

      if (!res.error && res.data) {
        const payload = res.data;
        setLeads(payload.data || payload || []);
        setPages(payload.pages || 0);
        setStats(res.data.stats || null);
      }
    } catch (error) {
      console.error("Failed to fetch leads", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, statusFilter, tagFilter, sourceFilter, fromFilter, profileFilter, dateFilter, sort, fromDate, toDate, courseFilter, selectedCounsellor, limit]);

  // 2. Update Lead Status
  const updateLeadStatus = async (id, newStatus, tags) => {
    // Optimistic update keeps the drawer and lead list in sync.
    setLeads((previous) =>
      previous.map((lead) =>
        getLeadId(lead) === id
          ? {
              ...lead,
              status: newStatus,
              ...(Array.isArray(tags) ? { tags } : {}),
            }
          : lead
      )
    );

    const payload = { status: newStatus };
    if (Array.isArray(tags)) payload.tags = tags;

    const res = await apiRequest(`/api/contact/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    if (res.error) {
      alert("Failed to update lead. Please try again.");
      fetchLeads();
    }
  };

  // 3. Add Comment
  const addComment = async (id, text) => {
    if (!text.trim()) return;
    const newComment = { id: Date.now(), text, date: new Date().toISOString() };

    setLeads(leads.map(l => {
      if (getLeadId(l) === id) {
        return { ...l, comments: [...(l.comments || []), newComment] };
      }
      return l;
    }));

    const res = await apiRequest(`/api/contact/${id}/comment`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });

    if (res.error) {
      alert("Failed to add comment.");
      fetchLeads();
    }
    fetchLeads();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Use closest() to check if the click happened inside ANY status dropdown
      if (!event.target.closest('.status-filter-container')) {
        setIsStatusOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 4. Add New Lead
  const handleAddLead = async (newLeadData) => {
    setLoading(true);
    const formattedData = {
      ...newLeadData,
      consent: newLeadData.consent === 'on'
    };

    const res = await apiRequest(`/api/contact/admin`, {
      method: 'POST',
      body: JSON.stringify({
        ...formattedData, id: session.user.id, counsellorName: session.user.name
      })
    });

    if (!res.error) {
      setIsAddLeadOpen(false);
      fetchLeads();
    } else {
      alert("Failed to create lead.");
      setLoading(false);
    }
  };

  // --- HELPERS ---
  const getLeadId = (lead) => typeof lead._id === 'object' && lead._id !== null ? lead._id.$oid : lead._id;

  const formatDate = (value) => {
    if (!value) return "";

    // Excel/Google Sheets serial date
    if (!isNaN(value) && Number(value) > 30000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      return new Date(
        excelEpoch.getTime() + Number(value) * 86400000
      ).toLocaleDateString("en-IN");
    }

    // ISO date or timestamp
    return new Date(value).toLocaleDateString("en-IN");
  };

  // Reusable Filter Render Logic (used in both desktop bar and mobile bottom sheet)
  const renderFilters = (isMobile = false) => {
    const controlClasses = isMobile
      ? "h-9 w-full rounded-[4px] border border-[#E3E2E0] bg-white px-2.5 text-sm text-[#37352F] outline-none focus:border-[#2383E2] focus:ring-2 focus:ring-[#2383E2]/30 disabled:bg-[rgba(55,53,47,0.04)] disabled:text-[#9B9A97]"
      : "h-7 rounded-[4px] border border-[#E3E2E0] bg-white px-2 text-sm text-[#37352F] outline-none transition-colors hover:bg-[rgba(55,53,47,0.04)] focus:ring-2 focus:ring-[#2383E2]/40 disabled:bg-[rgba(55,53,47,0.04)] disabled:text-[#9B9A97]";
    const wrapperClasses = isMobile ? "flex flex-col gap-1.5 mt-3 first:mt-0" : "flex items-center gap-2";
    const labelClasses = "text-xs text-[#787774]";

    const MobileLabel = ({ text }) => (
      isMobile ? <label className={labelClasses}>{text}</label> : null
    );

    const menuItem = (active) =>
      `flex w-full items-center justify-between px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-[rgba(55,53,47,0.06)] ${
        active ? "bg-[rgba(55,53,47,0.05)] font-medium" : ""
      }`;

    return (
      <>
        {/* Quick Date */}
        <div className={wrapperClasses}>
          <MobileLabel text="Quick date" />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className={controlClasses}
          >
            <option value="All">All time</option>
            <option value="Today">Today</option>
            <option value="Last3">Last 3 days</option>
            <option value="Last7">Last 7 days</option>
            <option value="Last30">Last 30 days</option>
          </select>
        </div>

        {/* Custom Date Range */}
        <div className={wrapperClasses}>
          <MobileLabel text="Custom date range" />
          <div className="flex w-full items-center gap-1.5">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={`flex-1 ${controlClasses}`}
            />
            <span className="text-sm text-[#9B9A97]">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className={`flex-1 ${controlClasses}`}
            />
          </div>
        </div>

        {/* Sort By */}
        <div className={wrapperClasses}>
          <MobileLabel text="Sort by" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className={controlClasses}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>

        {/* Status */}
        <div className={`${wrapperClasses} relative status-filter-container`}>
          <MobileLabel text="Status" />

          <div className="relative w-full">
            <button
              type="button"
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              className={`${controlClasses} flex w-full items-center justify-between gap-2 text-left`}
            >
              <span className="truncate">
                {statusFilter === "All" ? "All statuses" : statusFilter}
              </span>
              <ChevronDown
                size={14}
                className={`shrink-0 text-[#9B9A97] transition-transform ${
                  isStatusOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isStatusOpen && (
              <div
                className="absolute left-0 z-50 mt-1 w-full min-w-[220px] rounded-[6px] bg-white py-1"
                style={{ boxShadow: menuShadow }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("All");
                    setTagFilter("All");
                    setIsStatusOpen(false);
                  }}
                  className={menuItem(statusFilter === "All")}
                >
                  All statuses
                </button>

                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setStatusFilter(status);
                      setTagFilter("All");
                      setIsStatusOpen(false);
                      }}
                    className={menuItem(statusFilter === status)}
                  >
                    {status}
                  </button>
                ))}


              </div>
            )}
          </div>
        </div>

        {/* Tags - options depend on selected status */}
        <div className={wrapperClasses}>
          <MobileLabel text="Tags" />
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            disabled={availableTags.length === 0}
            className={controlClasses}
          >
            <option value="All">
              {availableTags.length === 0 ? "No tags for this status" : "All tags"}
            </option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>

        {/* Course */}
        <div className={wrapperClasses}>
          <MobileLabel text="Course" />
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className={controlClasses}
          >
            <option value="All">All courses</option>
            {course.map((item) => (
              <option key={item._id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        {/* Source */}
        <div className={wrapperClasses}>
          <MobileLabel text="Source" />
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className={controlClasses}
          >
            <option value="All">All sources</option>
            {SOURCE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Counsellor */}
        <div className={wrapperClasses}>
          <MobileLabel text="Counsellor" />
          <select
            value={selectedCounsellor}
            onChange={(e) => setSelectedCounsellor(e.target.value)}
            disabled={loading}
            className={controlClasses}
          >
            <option value="">
              {loading ? "Loading..." : "Select counsellor"}
            </option>
            {counsellors.map((counsellor) => (
              <option key={counsellor.id} value={counsellor.id}>
                {counsellor.name}
              </option>
            ))}
          </select>
        </div>

        {/* Profile */}
        <div className={wrapperClasses}>
          <MobileLabel text="Profile" />
          <select
            value={profileFilter}
            onChange={(e) => setProfileFilter(e.target.value)}
            className={controlClasses}
          >
            <option value="All">All profiles</option>
            {PROFILES.map(p => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* From */}
        <div className={wrapperClasses}>
          <MobileLabel text="Website" />
          <select
            value={fromFilter}
            onChange={(e) => setFromFilter(e.target.value)}
            className={controlClasses}
          >
            <option value="All">All websites</option>
            {FROM_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </>
    );
  };

  const selectedLead = leads.find(l => getLeadId(l) === selectedLeadId);

  if (unauthorized) {
    return (
      <UnAuthorised />
    );
  }

  const iconBtn =
    "inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-[#787774] transition-colors hover:bg-[rgba(55,53,47,0.08)]";

  return (
    <div
      className="flex min-h-screen flex-col bg-white text-[#37352F]"
      
    >
      <div className="px-4 py-0 sm:px-8 lg:px-[12px]">
        {/* Title */}
        <div className="flex items-center gap-3">
        
          <h1 className="text-[24px] font-bold leading-tight tracking-[-0.01em] sm:text-[24px]">
            Leads Management
          </h1>
        </div>
        <p className=" mt-1 text-xs text-[#787774]">
          Manage and track your platform inquiries.
        </p>

        {stats && (
          <div className="mt-4">
            <DashboardStats stats={stats} />
          </div>
        )}

        {/* Status tabs + toolbar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 max-w-full items-center gap-1 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => {
                setStatusFilter("All");
                setTagFilter("All");
              }}
              className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-[8px] px-3 text-sm transition-colors ${
                statusFilter === "All"
                  ? "bg-[#F1F1EF] font-medium text-[#37352F]"
                  : "text-[#787774] hover:bg-[rgba(55,53,47,0.06)]"
              }`}
            >
              <Table2 size={15} className="shrink-0" />
              All leads
            </button>

            {STATUS_OPTIONS.map((status) => {
              const [statusPill, statusDot] = getStatusStyle(status);
              const active = statusFilter === status;

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setStatusFilter(status);
                    setTagFilter("All");
                  }}
                  aria-pressed={active}
                  className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] px-2.5 text-sm transition-colors ${
                    active
                      ? `${statusPill} font-medium ring-1 ring-inset ring-black/10`
                      : "text-[#787774] hover:bg-[rgba(55,53,47,0.06)]"
                  }`}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot}`} />
                  {status}
                </button>
              );
            })}

            {(statusFilter !== "All" || tagFilter !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("All");
                  setTagFilter("All");
                }}
                className="ml-1 inline-flex h-8 shrink-0 items-center gap-1 rounded-[6px] px-2 text-xs font-medium text-[#D04437] transition-colors hover:bg-[#FFE2DD]"
                title="Clear status and tag filters"
              >
                <X size={13} />
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {searchOpen || search ? (
              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[#9B9A97]"
                />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onBlur={() => {
                    if (!search) setSearchOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setSearch("");
                      setSearchOpen(false);
                    }
                  }}
                  placeholder="Search name, email, phone..."
                  className="h-7 w-60 rounded-[4px] bg-white pl-7 pr-2 text-sm outline-none ring-1 ring-[#E3E2E0] placeholder:text-[#9B9A97] focus:ring-2 focus:ring-[#2383E2]/50"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search leads"
                className={iconBtn}
              >
                <Search size={16} />
              </button>
            )}

            <button
              onClick={() => setIsMobileFiltersOpen(true)}
              aria-label="Open filters"
              className={`${iconBtn} md:hidden`}
            >
              <Filter size={16} />
            </button>

            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="h-7 cursor-pointer rounded-[4px] bg-transparent px-1.5 text-sm text-[#787774] outline-none hover:bg-[rgba(55,53,47,0.08)]"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
              <option value={200}>200 per page</option>
              <option value={500}>500 per page</option>
            </select>

            {session.user.role === 'admin' && (
              <button
                onClick={() => exportToExcel(leads)}
                className="inline-flex h-7 items-center gap-1.5 rounded-[4px] px-2 text-sm text-[#787774] transition-colors hover:bg-[rgba(55,53,47,0.08)]"
              >
                <Sheet size={15} />
                Export
              </button>
            )}

            <button
              onClick={() => setIsAddLeadOpen(true)}
              className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-[6px] bg-[#2383E2] px-3 text-sm font-medium text-white transition-colors hover:bg-[#0077D4]"
            >
              <Plus size={15} />
              New
            </button>
          </div>
        </div>

        {/* Filter bar (desktop) */}
        <div className="mt-3 hidden flex-wrap items-center gap-2 border-t border-[#E9E9E7] pt-3 md:flex">
          <span className="mr-1 inline-flex items-center gap-1.5 text-sm text-[#787774]">
            <Filter size={14} className="text-[#9B9A97]" />
            Filters
          </span>
          {renderFilters(false)}
        </div>

        {/* Table */}
        <div className="mt-3 overflow-x-auto">
          <div className="min-w-[1820px]">
            <div className={`${GRID} border-y border-[#E9E9E7]`}>
              <HeadCell icon={Type}>Name</HeadCell>
              
              <HeadCell icon={Phone}>Phone</HeadCell>
              <HeadCell icon={BookOpen}>Course</HeadCell>
              <HeadCell icon={Globe}>Source</HeadCell>
              <HeadCell icon={CircleDot}>Status</HeadCell>
              <HeadCell icon={Tag}>Tag</HeadCell>
              <HeadCell icon={UserRound}>Assigned to</HeadCell>
              <HeadCell icon={CalendarDays}>Created</HeadCell>
              <HeadCell icon={MessageSquare} last>Last comment</HeadCell>
            </div>

            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`${GRID} animate-pulse border-b border-[#E9E9E7]`}
                >
                  {Array.from({ length: 9 }).map((__, j) => (
                    <div
                      key={j}
                      className={`flex h-[37px] items-center px-2 ${
                        j === 8 ? "" : "border-r border-[#E9E9E7]"
                      }`}
                    >
                      <div className="h-3.5 w-3/4 rounded-[3px] bg-[rgba(55,53,47,0.08)]" />
                    </div>
                  ))}
                </div>
              ))
            ) : leads.length === 0 ? (
              <div className="border-b border-[#E9E9E7] py-16 text-center">
                <p className="text-sm font-medium">No leads found</p>
                <p className="mt-1 text-sm text-[#787774]">
                  Try adjusting your filters or search query.
                </p>
              </div>
            ) : (
              leads.map((lead) => {
                const leadId = getLeadId(lead);
                const parsedDate = typeof lead.createdAt === 'object' && lead.createdAt !== null
                  ? new Date(lead.createdAt.$date)
                  : new Date(lead.createdAt);
                const validDate = !Number.isNaN(parsedDate.getTime());
                const [statusPill, statusDot] = getStatusStyle(lead.status || "New Lead");
                const lastComment = lead.comments?.length
                  ? lead.comments[lead.comments.length - 1]
                  : null;
                const sourceLabel = lead.source
                  ? lead.source.charAt(0).toUpperCase() + lead.source.slice(1)
                  : 'Direct';

                return (
                  <div
                    key={leadId}
                    onClick={() => session?.user?.role !== 'manager' && setSelectedLeadId(leadId)}
                    className={`group ${GRID} border-b border-[#E9E9E7] transition-colors hover:bg-[rgba(55,53,47,0.03)] ${
                      session?.user?.role !== 'manager' ? "cursor-pointer" : ""
                    }`}
                  >
                    <Cell>
                      <span className="truncate font-medium">{lead.name}</span>
                      {lead.from && (
                        <Tagged className="bg-[#FFE2DD] text-[#5D1715]">
                          {lead.from}
                        </Tagged>
                      )}
                    </Cell>

                    <Cell>
                      {lead.phone ? (
                        <span className="truncate tabular-nums text-[#787774]">
                          {lead.phone}
                        </span>
                      ) : (
                        <Empty />
                      )}
                    </Cell>

                    <Cell>
                      {lead.course ? (
                        <Tagged className={`capitalize`}>
                          {lead.course}
                        </Tagged>
                      ) : (
                        <span className="text-[#C7C6C3]">N/A</span>
                      )}
                    </Cell>

                    <Cell>
                      <Tagged className={''}>{sourceLabel}</Tagged>
                    </Cell>

                    <Cell>
                      <span
                        className={`inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-2 py-0.5 text-sm leading-5 ${statusPill}`}
                      >
                        <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot}`} />
                        <span className="truncate">{lead.status || "New Lead"}</span>
                      </span>
                    </Cell>
 <Cell>
                      <span
                        className={`inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-2 py-0.5 text-sm leading-5 ${statusPill}`}
                      >
                        <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot}`} />
                        <span className="truncate">{lead.tags?.[0] || lead.status}</span>
                      </span>
                    </Cell>
                    <Cell>
                      <span
                        className={`truncate ${
                          lead.assignedTo?.name ? "" : "text-[#C7C6C3]"
                        }`}
                      >
                        {lead.assignedTo?.name ? lead.assignedTo.name : "No counsellor"}
                      </span>
                      {session?.user?.role !== 'manager' && (
                        <button
                          type="button"
                          title="Change counsellor"
                          aria-label="Change counsellor"
                          onClick={(e) => {
                            e.stopPropagation();
                            setChangeCounsellorModal(true);
                            setSelectedLeadId(leadId);
                          }}
                          className={`ml-auto shrink-0 rounded-[4px] p-1 text-[#787774] opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 ${hoverBg}`}
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                    </Cell>

                    <Cell>
                      {validDate ? (
                        <span className="truncate text-[#787774]">
                          {parsedDate.toLocaleDateString()}{" "}
                          <span className="text-[#9B9A97]">
                            {parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </span>
                      ) : (
                        <Empty />
                      )}
                    </Cell>

                    <Cell last>
                      {lastComment ? (
                        <span
                          className="truncate"
                          title={`${lastComment.text}\n${new Date(
                            lastComment.createdAt
                          ).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: true,
                          })}${
                            lastComment.createdBy?.name
                              ? ` - ${lastComment.createdBy.name}`
                              : ""
                          }`}
                        >
                          {lastComment.text}
                        </span>
                      ) : (
                        <span className="text-[#C7C6C3]">No comments</span>
                      )}
                    </Cell>
                  </div>
                );
              })
            )}

            {!loading && (
              <div className="flex items-center gap-x-6 px-2 py-2 text-[13px] text-[#9B9A97]">
                <span>
                  <span className="uppercase tracking-wide">Count</span>
                  <span className="ml-1.5 text-[#37352F]">{leads.length}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Pagination Controls */}
        {!loading && pages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[13px] text-[#9B9A97]">
              Page {page} of {pages}
            </p>
            <div className="flex gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-7 rounded-[4px] border border-[#E3E2E0] bg-white px-3 text-sm transition-colors hover:bg-[rgba(55,53,47,0.06)] disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page === pages}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 rounded-[4px] border border-[#E3E2E0] bg-white px-3 text-sm transition-colors hover:bg-[rgba(55,53,47,0.06)] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- SIDEBAR (Lead Details) --- */}
      {selectedLead && (
        <LeadDetails
          selectedLead={selectedLead}
          setSelectedLeadId={setSelectedLeadId}
          setDeleteModal={setDeleteModal}
          getLeadId={getLeadId}
          updateLeadStatus={updateLeadStatus}
          addComment={addComment}
          setIsWhatsAppModalOpen={setIsWhatsAppModalOpen}
          formatDate={formatDate}
          setFollowUpOpen={setFollowUpOpen}
          setOtherCourse={setOtherCourse}
          course={course}
          STATUSES={STATUS_OPTIONS} />
      )}
      {deleteModal.open && (
        <LeadDelete
          deleteModal={deleteModal}
          setDeleteModal={setDeleteModal}
          handleDelete={handleDelete}
          setSelectedLeadId={setSelectedLeadId}
          setLeads={setLeads}
          toast={toast}
          getLeadId={getLeadId}
        />
      )}
      {/* --- ADD LEAD MODAL --- */}
      {isAddLeadOpen && (
        <LeadAdd
          setIsAddLeadOpen={setIsAddLeadOpen}
          handleAddLead={handleAddLead}
          counsellors={counsellors}
          PROFILES={PROFILES}
          course={course}
        />
      )}

      {/* --- WHATSAPP MODAL --- */}
      {isWhatsAppModalOpen && selectedLead && (
        <WhatsAppModel
          selectedLead={selectedLead}
          setIsWhatsAppModalOpen={setIsWhatsAppModalOpen}
          whatsappMessage={whatsappMessage}
          setWhatsappMessage={setWhatsappMessage}
          session={session}
          course={selectedLead.course}
          toast={toast}
        />
      )}
      {followUpOpen && <FolloUpModal selectedLead={selectedLeadId} setFollowUpOpen={setFollowUpOpen} fetchLeads={fetchLeads} />}
      {otherCourse && <OtherCourseModal selectedLead={selectedLeadId} setOtherCourse={setOtherCourse} course={course} />}
      {changeCounsellorModal && <ChangeCounsellor selectedLead={selectedLeadId} counsellor={counsellors} setChangeCounsellorModal={setChangeCounsellorModal} />}
      <MobileFilter
        isMobileFiltersOpen={isMobileFiltersOpen}
        setIsMobileFiltersOpen={setIsMobileFiltersOpen}
        renderFilters={renderFilters}
      />
    </div>
  );
}