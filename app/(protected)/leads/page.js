'use client'
import React, { useState, useEffect, useRef } from "react";
import {exportToExcel} from "@/lib/exportToExcel";
import { 
  Search, Filter, Plus,
  EditIcon,
  SheetIcon,
  
} from "lucide-react";
import toast from "react-hot-toast";
import DashboardStats from "@/component/DashboardStats";
import Link from "next/link";
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
const PROFILES = ["student", "fresher", "professional", "business", "other", ];

const STATUS_OPTIONS = [
  "New Lead",
  "Not Interested",
  "Invalid",
  "Call Back",
  "Registered",
];

const INTERESTED_STATUSES = [
  "Course Interested",
  "Follow Up",
  "Other Course Interested",
];
const FROM_TYPES = [
  "GRRAS",
  "ap2v",
];
const SOURCE_TYPES = [
  "Direct",
  "Google",
  "Facebook",
  "Instagram",
  "LinkedIn",
  "Twitter",
  "Referral",
  "GS1"
];
// --- MAIN APPLICATION COMPONENT ---
export default function App() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [isStatusOpen, setIsStatusOpen] = useState(false);
const [isInterestedOpen, setIsInterestedOpen] = useState(false);
    const [counsellors, setCounsellors] = useState([]);
  const [selectedCounsellor, setSelectedCounsellor] = useState("");
  const [stats, setStats] = useState(null);
  const [fromFilter, setFromFilter] = useState("All");
const statusDropdownRef = useRef(null);

  // Modals & Drawers
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [courseFilter, setCourseFilter] = useState("All");
  const [course, setCourse] = useState([])
  // Filters & Pagination
  const [sort, setSort] = useState("newest"); // newest | oldest | name
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [search, setSearch] = useState("");
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [otherCourse, setOtherCourse] = useState(false);
  const [changeCounsellorModal, setChangeCounsellorModal] =  useState(false)
  const debouncedSearch = useDebounce(search, 500);
  const [deleteModal, setDeleteModal] = useState({
  open: false,
  id: null,
});
  const [statusFilter, setStatusFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [profileFilter, setProfileFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All"); // All, Today, Last3, Last7, Last30
  const [limit, setLimit] = useState(10);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, sourceFilter, profileFilter, dateFilter, fromFilter, courseFilter, limit]);
  useEffect(() => {
    fetchCounsellors(setCounsellors, setLoading);
    fetchCourse(setCourse, setLoading)
  }, []);

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
    console.log("FILTER CHANGED:", {
    statusFilter,
    page,
  });
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, statusFilter, sourceFilter, fromFilter, profileFilter, dateFilter, sort, fromDate, toDate, courseFilter, selectedCounsellor, limit]);

  // 2. Update Lead Status
  const updateLeadStatus = async (id, newStatus) => {
    setLeads(leads.map(l => getLeadId(l) === id ? { ...l, status: newStatus } : l));
    
    const res = await apiRequest(`/api/contact/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });

    if (res.error) {
      alert("Failed to update status. Please try again.");
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
        setIsInterestedOpen(false);
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
      body: JSON.stringify(formattedData)
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

  const getStatusColor = (status) => {
    switch(status) {
      case "New Lead": return "bg-blue-100 text-blue-800";
      case "Interested": return "bg-green-100 text-green-800";
      case "Converted": return "bg-emerald-100 text-emerald-800";
      case "Call Back": return "bg-yellow-100 text-yellow-800";
      case "Not Interested": return "bg-gray-100 text-gray-800";
      case "Invalid": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };
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
  // Extract repeated styles to keep the JSX clean
  const inputClasses = "w-full rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500";
  const wrapperClasses = isMobile ? "flex flex-col gap-1.5 mt-2 first:mt-0" : "flex items-center gap-2";
  const labelClasses = "text-xs font-bold uppercase tracking-wide text-gray-500";

  // Helper function to render mobile labels consistently
  const MobileLabel = ({ text }) => (
    isMobile ? <label className={labelClasses}>{text}</label> : null
  );

  return (
    <>
      {/* Quick Date */}
      <div className={wrapperClasses}>
        <MobileLabel text="Quick Date" />
        <select 
          value={dateFilter} 
          onChange={(e) => setDateFilter(e.target.value)} 
          className={inputClasses}
        >
          <option value="All">All Time</option>
          <option value="Today">Today</option>
          <option value="Last3">Last 3 Days</option>
          <option value="Last7">Last 7 Days</option>
          <option value="Last30">Last 30 Days</option>
        </select>
      </div>

      {/* Custom Date Range */}
      <div className={wrapperClasses}>
        <MobileLabel text="Custom Date Range" />
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

      {/* Sort By */}
      <div className={wrapperClasses}>
        <MobileLabel text="Sort By" />
        <select 
          value={sort} 
          onChange={(e) => setSort(e.target.value)} 
          className={inputClasses}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">Name (A-Z)</option>
        </select>
      </div>

<div
className={`${wrapperClasses} relative status-filter-container`}>
  <MobileLabel text="Status" />

  <div className="relative">
    {/* Main dropdown button */}
    <button
      type="button"
      onClick={() => setIsStatusOpen(!isStatusOpen)}
      className={`${inputClasses} w-full flex items-center justify-between text-left`}
    >
      <span>{statusFilter || "All Statuses"}</span>

      <svg
        className={`w-4 h-4 transition-transform ${
          isStatusOpen ? "rotate-180" : ""
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>

    {isStatusOpen && (
      <div className="absolute z-50 mt-1 w-full min-w-[220px] rounded-lg border border-gray-200 bg-white shadow-lg">

        {/* All */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("All");
            setIsStatusOpen(false);
            setIsInterestedOpen(false);
          }}
          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 ${
            statusFilter === "All"
              ? "bg-gray-50 font-medium"
              : ""
          }`}
        >
          All Statuses
        </button>

        {/* Normal statuses */}
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => {
              setStatusFilter(status);
              setIsStatusOpen(false);
              setIsInterestedOpen(false);
            }}
            className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 ${
              statusFilter === status
                ? "bg-gray-50 font-medium"
                : ""
            }`}
          >
            {status}
          </button>
        ))}

        {/* Interested */}
        <div
          className="relative"
          onMouseEnter={() => setIsInterestedOpen(true)}
          onMouseLeave={() => setIsInterestedOpen(false)}
        >
          <button
            type="button"
            className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 flex items-center justify-between"
          >
            <span>Interested</span>

            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          {/* Interested submenu */}
          {isInterestedOpen && (
            <div className="absolute left-50 -top-20 ml-1 w-[220px] rounded-lg border border-gray-200 bg-white shadow-lg">

              {INTERESTED_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setStatusFilter(status);
                    setIsStatusOpen(false);
                    setIsInterestedOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg ${
                    statusFilter === status
                      ? "bg-gray-50 font-medium"
                      : ""
                  }`}
                >
                  {status}
                </button>
              ))}

            </div>
          )}
        </div>
      </div>
    )}
  </div>
</div>

      {/* Course */}
      <div className={wrapperClasses}>
        <MobileLabel text="Course" />
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className={inputClasses}
        >
          <option value="All">All Courses</option>
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
          className={inputClasses}
        >
          <option value="All">All Sources</option>
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
          className={inputClasses}
        >
          <option value="">
            {loading ? "Loading..." : "Select Counsellor"}
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
          className={inputClasses}
        >
          <option value="All">All Profiles</option>
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
    className={inputClasses}
  >
    <option value="All">All Websites</option>

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

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900 bg-gray-50/50">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-8 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track your platform inquiries.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center">
         <div className="relative flex-grow w-full md:w-auto md:max-w-md flex items-center gap-2 px-4 py-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search name, email, phone..."
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
        <div className="flex items-center gap-3 mr-2 ">
          <button 
            onClick={() => setIsAddLeadOpen(true)}
            className="flex items-center  gap-2 px-4 py-2 bg-[#05335c] text-white rounded-lg cursor-pointer hover:bg-[#103758] font-medium transition-colors shadow-sm"
          >
            <Plus size={18} />
            Add Lead
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => exportToExcel(leads)}
            className="flex items-center  gap-2 px-8 py-2 border border-gray-200 bg-gray-50 text-black rounded-lg cursor-pointer hover:bg-gray-100 font-medium transition-colors shadow-sm"
          >
            <SheetIcon size={18} />
            Export Excel
          </button>
        </div>
        <div className="flex gap-3 flex-wrap items-center ml-4">
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
            <option value={200}>200 per page</option>
            <option value={500}>500 per page</option>
          </select>
        </div>
        </div>
      </header>

       {stats && <DashboardStats stats={stats} />}
      {/* Filters Bar (Desktop & Search Combo) */}
      <div className="bg-white px-4 sm:px-8 py-4 border-b border-gray-200  gap-4 items-center shadow-sm z-10">
        {/* 🔍 Search & Mobile Filter Button */}
       

        {/* Desktop Filters Wrapper */}
        <div className="hidden md:flex gap-3 flex-wrap items-center">
          {renderFilters(false)}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto p-2 sm:p-8 relative">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Name & Contact</th>
                  <th className="px-6 py-4">Course & Source</th>
                   <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Assigned To</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4">Last Comment</th>
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
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 bg-gray-200 rounded-full w-24"></div>
                      </td>
                    </tr>
                  ))
                ) : leads.length === 0 ? (
                  // Empty State
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <Filter className="h-10 w-10 text-gray-300 mb-3" />
                        <p className="text-lg font-medium text-gray-900">No leads found</p>
                        <p className="text-sm">Try adjusting your filters or search query.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  // Data Rows
                  leads.map((lead) => {
                    const leadId = getLeadId(lead);
                    const parsedDate = typeof lead.createdAt === 'object' && lead.createdAt !== null 
                                       ? new Date(lead.createdAt.$date) 
                                       : new Date(lead.createdAt);

                    return (
                      <tr 
                        key={leadId} 
                        onClick={() => setSelectedLeadId(leadId)}
                        className="hover:bg-blue-50 cursor-pointer transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 group-hover:text-blue-700">{lead.name} {lead.from && "-"} {lead.from &&  <span className="text-xs font-light bg-red-50 text-red-600 px-2 py-0.5 rounded-sm shadow">{lead.from}</span>}</div>
                          <div className="text-gray-500 text-xs mt-1">{lead.email}</div>
                          <div className="text-gray-500 text-xs">{lead.phone}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 capitalize">{lead.course || 'N/A'}</div>
                          
                            <div className="text-emerald-600 text-xs mt-1 flex items-center gap-1">{lead.source ? lead.source.charAt(0).toUpperCase() + lead.source.slice(1) : 'Direct'}</div>
                         
                        </td>
                          <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(lead.status || "New Lead")}`}>
                            {lead.status || "New Lead"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-900">{lead.assignedTo?.name ? lead.assignedTo.name : "No Counsellor"}</div>
                          <div onClick={() => {
    setChangeCounsellorModal(true);
    setSelectedLeadId(leadId);
  }} className="text-gray-500 text-xs mt-1 flex items-center gap-1"><EditIcon size={12} /> Change</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-900">{parsedDate.toLocaleDateString()}</div>
                          <div className="text-gray-500 text-xs mt-1">{parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td className="px-6 py-4">
  {lead.comments?.length > 0 ? (
    <>
      <div className="text-gray-900 whitespace-pre-wrap truncate max-w-xs">
        {lead.comments[lead.comments.length - 1].text}
      </div>

      <div className="text-gray-500 text-xs mt-1">
        {new Date(
          lead.comments[lead.comments.length - 1].createdAt
        ).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })}
        {" - "}
        {lead.comments[lead.comments.length - 1].createdBy?.name}
      </div>
    </>
  ) : (
    <div className="text-gray-500">No comments</div>
  )}
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

      {/* --- SIDEBAR (Lead Details) --- */}
      {selectedLead && (
        <LeadDetails  selectedLead={selectedLead}
  setSelectedLeadId={setSelectedLeadId}
  setDeleteModal={setDeleteModal}
  getLeadId={getLeadId}
  updateLeadStatus={updateLeadStatus}
  addComment={addComment}
  setIsWhatsAppModalOpen={setIsWhatsAppModalOpen}
  formatDate={formatDate}
  setFollowUpOpen={setFollowUpOpen}
  setOtherCourse = {setOtherCourse}
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
    toast={toast}
  />
      )} 
      {followUpOpen && <FolloUpModal selectedLead={selectedLeadId} setFollowUpOpen={setFollowUpOpen} />}
      {otherCourse &&  <OtherCourseModal selectedLead={selectedLeadId} setOtherCourse={setOtherCourse} course={course} />}
      {changeCounsellorModal &&  <ChangeCounsellor selectedLead={selectedLeadId} counsellor={counsellors} setChangeCounsellorModal={setChangeCounsellorModal} />}
      <MobileFilter
  isMobileFiltersOpen={isMobileFiltersOpen}
  setIsMobileFiltersOpen={setIsMobileFiltersOpen}
  renderFilters={renderFilters}
/>
    </div>
  );
}