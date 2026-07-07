'use client'
import React, { useState, useEffect } from "react";
import { 
  Search, Filter, Plus, Upload, X, MessageSquare, 
  Calendar, User, Phone, Mail, CheckCircle, 
  AlertCircle, ArrowDownToLine, TargetIcon,
  Activity, Globe, Info, Clock, ShieldCheck, MessageCircle,
  Briefcase,
  CalendarCheck,
  BookAIcon,
  Trash2Icon
} from "lucide-react";
import toast from "react-hot-toast";

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
const PROFILES = ["student", "fresher", "professional", "business", "other", ];

const STATUSES = [
  "New Lead", 
  "Interested", 
  "Not Interested", 
  "Invalid", 
  "Converted", 
  "Call Back"
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
    const [counsellors, setCounsellors] = useState([]);
  const [selectedCounsellor, setSelectedCounsellor] = useState("");
  // Modals & Drawers
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [courseFilter, setCourseFilter] = useState("All");
  // Filters & Pagination
  const [sort, setSort] = useState("newest"); // newest | oldest | name
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [deleteModal, setDeleteModal] = useState({
  open: false,
  id: null,
});
  const [statusFilter, setStatusFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [profileFilter, setProfileFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All"); // All, Today, Last3, Last7, Last30
  const limit = 10;

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, sourceFilter, profileFilter, dateFilter, courseFilter]);
  useEffect(() => {
    fetchCounsellors();
  }, []);
async function fetchCounsellors() {
    try {
      const res = await fetch("/api/cousellors");
      const data = await res.json();

      if (data.success) {
        setCounsellors(data.data);
      }
    } catch (error) {
      console.error("Error fetching counsellors:", error);
    } finally {
      setLoading(false);
    }
  }
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
  }, [page, debouncedSearch, statusFilter, sourceFilter, profileFilter, dateFilter, sort, fromDate, toDate, courseFilter, selectedCounsellor]);

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
const handleDelete = async (id) => {
  try {
    const res = await fetch(`/api/contact/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to delete lead");
    }

    // Close modal
    setDeleteModal({
      open: false,
      id: null,
    });

    // Close sidebar
    setSelectedLeadId(null);

    // Remove lead from state (no page reload needed)
    setLeads((prev) => prev.filter((lead) => getLeadId(lead) !== id));

    toast.success("Lead deleted successfully");
  } catch (error) {
    console.error(error);
    toast.error(error.message || "Something went wrong");
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
  const inputClasses = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500";
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

      {/* Status */}
      <div className={wrapperClasses}>
        <MobileLabel text="Status" />
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)} 
          className={inputClasses}
        >
          <option value="All">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
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
          <option value="All">All Courses</option>
          <option value="Digital Marketing">Digital Marketing</option>
          <option value="Azure + Azure DevOps">Azure + Azure DevOps</option>
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
    </>
  );
};

  const selectedLead = leads.find(l => getLeadId(l) === selectedLeadId);

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
    <div className="min-h-screen flex flex-col font-sans text-gray-900 bg-gray-50/50">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-8 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track your platform inquiries.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsAddLeadOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#05335c] text-white rounded-lg cursor-pointer hover:bg-[#103758] font-medium transition-colors shadow-sm"
          >
            <Plus size={18} />
            Add Lead
          </button>
        </div>
      </header>
 <div className="relative flex-grow w-full md:w-auto md:max-w-md flex items-center gap-2 px-8 py-4">
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
                  <th className="px-6 py-4">Profile & Consent</th>
                  <th className="px-6 py-4">Course & Level</th>
                  <th className="px-6 py-4">Source & Campaign</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4">Last Comment</th>
                  <th className="px-6 py-4">Status</th>
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
                          <div className="font-medium text-gray-900 group-hover:text-blue-700">{lead.name}</div>
                          <div className="text-gray-500 text-xs mt-1">{lead.email}</div>
                          <div className="text-gray-500 text-xs">{lead.phone}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 capitalize">{lead.profile || 'N/A'}</div>
                          {lead.consent ? (
                            <div className="text-emerald-600 text-xs mt-1 flex items-center gap-1"><CheckCircle size={12}/> Consented</div>
                          ) : (
                            <div className="text-gray-400 text-xs mt-1 flex items-center gap-1">No Consent given</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 capitalize">{lead.course || 'N/A'}</div>
                          
                            <div className="text-emerald-600 text-xs mt-1 flex items-center gap-1">{lead.level || lead.profile}</div>
                         
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-900">{lead.source ? lead.source.charAt(0).toUpperCase() + lead.source.slice(1) : 'Direct'}</div>
                          <div className="text-gray-500 text-xs mt-1">{lead.medium || 'None'} {lead.campaign && `- ${lead.campaign}`}</div>
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
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(lead.status || "New Lead")}`}>
                            {lead.status || "New Lead"}
                          </span>
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
        <>
          <div 
            className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setSelectedLeadId(null)}
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform flex flex-col border-l border-gray-200">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-semibold text-gray-900">Lead Details</h2>
              <button 
                onClick={() => setSelectedLeadId(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <button
  onClick={() =>
    setDeleteModal({
      open: true,
      id: selectedLead._id,
    })
  }
  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
>
  <Trash2Icon size={20} />
</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{selectedLead.name}</h3>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail size={16} className="mr-3 text-gray-400" />
                    <a href={`mailto:${selectedLead.email}`} className="hover:text-blue-600">{selectedLead.email}</a>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone size={16} className="mr-3 text-gray-400" />
                    <a href={`tel:${selectedLead.phone}`} className="hover:text-blue-600">{selectedLead.phone}</a>
                  </div>
                  {selectedLead.company && <div className="flex items-center text-sm text-gray-600">
                    <Briefcase size={16} className="mr-3 text-gray-400" />
                    <span>Company - {selectedLead.company || "N/A"}</span>
                  </div>}
                  {selectedLead.city && <div className="flex items-center text-sm text-gray-600">
                    <Globe size={16} className="mr-3 text-gray-400" />
                    <span> {selectedLead.city || "N/A"}</span>
                  </div>}
                  {selectedLead.prev_course && <div className="flex items-center text-sm text-gray-600">
                    <BookAIcon size={16} className="mr-3 text-gray-400" />
                    <span>Previous Course: {selectedLead.prev_course || "N/A"}</span>
                  </div>}
                   {selectedLead.prev_admission && <div className="flex items-center text-sm text-gray-600">
                    <CalendarCheck size={16} className="mr-3 text-gray-400" />
                    <span>Previous Admission  Date: {formatDate(selectedLead.prev_admission)}</span>
                  </div>}
                 
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar size={16} className="mr-3 text-gray-400" />
                    <span>Created Date: <span className="font-medium text-gray-700">{selectedLead.createdAt && new Date(selectedLead.createdAt).toLocaleString()}</span></span>
                  </div>
                  {selectedLead.updatedAt && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock size={16} className="mr-3 text-gray-400" />
                      <span>Last Updated: <span className="font-medium text-gray-700">{new Date(selectedLead.updatedAt).toLocaleString()}</span></span>
                    </div>
                  )}
                </div>
              </div>

              <hr className="border-gray-100" />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Globe size={16} className="mr-3 text-gray-400" />
                  <span className="flex flex-col">
                    <span className="text-xs text-gray-400 uppercase">Source</span>
                    <span className="font-medium text-gray-900">
                      {selectedLead.source ? selectedLead.source.charAt(0).toUpperCase() + selectedLead.source.slice(1) : "Direct"}
                    </span>
                  </span>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <Activity size={16} className="mr-3 text-gray-400" />
                  <span className="flex flex-col">
                    <span className="text-xs text-gray-400 uppercase">Medium</span>
                    <span className="font-medium text-gray-900">
                      {selectedLead.medium ? selectedLead.medium.charAt(0).toUpperCase() + selectedLead.medium.slice(1) : "None"}
                    </span>
                  </span>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <TargetIcon size={16} className="mr-3 text-gray-400" />
                  <span className="flex flex-col">
                    <span className="text-xs text-gray-400 uppercase">Campaign</span>
                    <span className="font-medium text-gray-900">
                      {selectedLead.campaign ? selectedLead.campaign.charAt(0).toUpperCase() + selectedLead.campaign.slice(1) : "N/A"}
                    </span>
                  </span>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <Info size={16} className="mr-3 text-gray-400" />
                  <span className="flex flex-col">
                    <span className="text-xs text-gray-400 uppercase">Search Term</span>
                    <span className="font-medium text-gray-900">
                      {selectedLead.term || "N/A"}
                    </span>
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Lead Status</label>
                <select 
                  value={selectedLead.status || "New Lead"}
                  onChange={(e) => updateLeadStatus(getLeadId(selectedLead), e.target.value)}
                  className={`w-full p-3 rounded-lg border-2 appearance-none outline-none font-medium text-sm focus:border-blue-500 transition-colors cursor-pointer ${
                    selectedLead.status === "Converted" ? "border-emerald-200 bg-emerald-50 text-emerald-800" :
                    selectedLead.status === "Invalid" ? "border-red-200 bg-red-50 text-red-800" :
                    "border-gray-200 bg-white text-gray-800"
                  }`}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
                <div>
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1 mb-1"><User size={14}/> Profile Type</div>
                  <div className="text-sm font-medium text-gray-900 capitalize">{selectedLead.profile || 'Unknown'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1 mb-1"><ShieldCheck size={14}/> Marketing Consent</div>
                  <div className="text-sm font-medium text-gray-900">{selectedLead.consent ? "Granted" : "Not Provided"}</div>
                </div>
                {(selectedLead.ip || selectedLead.userAgent) && (
                  <div className="mt-4 pt-3 border-t border-blue-100/50">
                    <div className="text-xs text-blue-500 font-medium mb-2">System Tracking Info</div>
                    {selectedLead.ip && <div className="text-xs text-gray-600 break-all"><span className="font-semibold">IP:</span> {selectedLead.ip}</div>}
                    {selectedLead.userAgent && <div className="text-xs text-gray-600 mt-1"><span className="font-semibold">User Agent:</span> {selectedLead.userAgent}</div>}
                    {selectedLead.gclid && <div className="text-xs text-gray-600 mt-1 break-all"><span className="font-semibold">GCLID:</span> {selectedLead.gclid}</div>}
                  </div>
                )}
              </div>

              <hr className="border-gray-100" />

              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageSquare size={16} /> Internal Comments
                </h4>
                
                <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
                  {(!selectedLead.comments || selectedLead.comments.length === 0) ? (
                    <p className="text-sm text-gray-500 italic">No comments yet.</p>
                  ) : (
                    selectedLead.comments.map((c, i) => (
                      <div key={c.id || i} className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                        <p className="text-gray-800 mb-1">{c.text}</p>
                        <p className="text-xs text-gray-400 font-medium">
                          {new Date(c.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.target.elements.comment;
                    addComment(getLeadId(selectedLead), input.value);
                    input.value = "";
                  }}
                  className="flex gap-2"
                >
                  <input 
                    name="comment"
                    type="text" 
                    placeholder="Add a note..." 
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    autoComplete="off"
                  />
                  <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                    Add
                  </button>
                </form>
  
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center">
                  <Phone size={16} className="mr-3 text-gray-400" />
                  <a href={`tel:${selectedLead.phone}`} className="hover:text-blue-600">{selectedLead.phone}</a>
                </div>
                <button 
                  onClick={() => setIsWhatsAppModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-md text-xs font-medium transition-colors border border-green-200"
                >
                  <MessageCircle size={14} />
                  WhatsApp
                </button>
              </div>
            </div>
          </div>
        </>
      )}
{deleteModal.open && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div className="w-[90%] max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <Trash2Icon className="h-8 w-8 text-red-600" />
        </div>
      </div>

      <h3 className="mt-5 text-center text-xl font-bold text-gray-900">
        Delete Lead?
      </h3>

      <p className="mt-2 text-center text-gray-500">
        Are you sure you want to delete this lead?
        <br />
        <span className="font-semibold text-red-600">
          This action cannot be undone.
        </span>
      </p>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() =>
            setDeleteModal({
              open: false,
              id: null,
            })
          }
          className="flex-1 rounded-lg border border-gray-300 py-3 font-medium text-gray-700 transition hover:bg-gray-100"
        >
          Cancel
        </button>

        <button
          onClick={async () => {
            await handleDelete(deleteModal.id);

            setDeleteModal({
              open: false,
              id: null,
            });
          }}
          className="flex-1 rounded-lg bg-red-600 py-3 font-medium text-white transition hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
)}
      {/* --- ADD LEAD MODAL --- */}
      {isAddLeadOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Add New Lead</h2>
              <button onClick={() => setIsAddLeadOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form 
                id="addLeadForm"
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const data = Object.fromEntries(formData.entries());
                  handleAddLead(data);
                }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Full Name *</label>
                  <input required name="name" type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Email *</label>
                  <input name="email" type="email" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Phone Number *</label>
                  <input required name="phone" type="tel" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
  <label className="text-sm font-medium text-gray-700">
    Course *
  </label>
  <select
    required
    name="course"
    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
  >
    <option value="">Select Course...</option>
    <option value="Digital Marketing">
      Digital Marketing
    </option>
    <option value="Azure + Azure DevOps">
      Azure + Azure DevOps
    </option>
  </select>
</div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Profile Type *</label>
                  <select required name="profile" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    <option value="">Select...</option>
                    {PROFILES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>

                <div className="space-y-1 md:col-span-2 flex items-center gap-3">
                  <input type="checkbox" id="consent" name="consent" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" />
                  <label htmlFor="consent" className="text-sm font-medium text-gray-700">User has provided explicit consent to be contacted.</label>
                </div>

                <div className="space-y-1 md:col-span-2 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-3">Optional Tracking Parameters</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input name="source" type="text" placeholder="Source (e.g. Google)" className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    <input name="medium" type="text" placeholder="Medium (e.g. CPC)" className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    <input name="campaign" type="text" placeholder="Campaign Name" className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    <input name="term" type="text" placeholder="Search Term / Keyword" className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>

              </form>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setIsAddLeadOpen(false)} className="px-5 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors">
                Cancel
              </button>
              <button form="addLeadForm" type="submit" className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                Save Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- WHATSAPP MODAL --- */}
      {isWhatsAppModalOpen && selectedLead && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MessageCircle className="text-green-500" /> 
                Message {selectedLead.name}
              </h2>
              <button onClick={() => setIsWhatsAppModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <form
              onSubmit={async (e) => {
                e.preventDefault();

                try {
                  let cleanPhone = selectedLead.phone.replace(/\D/g, "");

                  if (cleanPhone.length === 10) {
                    cleanPhone = `91${cleanPhone}`;
                  }

                  const response = await fetch("/api/whatsapp-log", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      leadId: selectedLead._id,
                      phone: cleanPhone,
                      message: whatsappMessage,
                      sentAt: new Date(),
                    }),
                  });

                  const data = await response.json();

                  if (!response.ok) {
                    throw new Error(data.message || "Failed to save WhatsApp log");
                  }

                  const encodedMessage = encodeURIComponent(whatsappMessage);

                  const whatsappUrl = `https://api.whatsapp.com/send/?phone=${cleanPhone}&text=${encodedMessage}&type=phone_number&app_absent=0`;

                  window.open(whatsappUrl, "_blank");

                  setIsWhatsAppModalOpen(false);
                  setWhatsappMessage("");

                  toast.success("WhatsApp activity logged");
                } catch (error) {
                  console.error(error);
                  toast.error(error.message);
                }
              }}
            >
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Message</label>
                <textarea 
                  required
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  rows={5}
                  placeholder="Type your message here..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none resize-none text-sm"
                />
              </div>
              
              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 mt-2">
                <button 
                  type="button" 
                  onClick={() => setIsWhatsAppModalOpen(false)} 
                  className="px-5 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors shadow-sm flex items-center gap-2"
                >
                  <MessageCircle size={18} />
                  Send via WhatsApp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MOBILE FILTERS DRAWER (Bottom Sheet) --- */}
      <div
        className={`fixed inset-0 z-[70] md:hidden transition-opacity duration-300 ${
          isMobileFiltersOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
          onClick={() => setIsMobileFiltersOpen(false)}
        />

        {/* Sliding Panel */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 transform p-5 pb-8 ${
            isMobileFiltersOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Filter size={20} className="text-blue-600"/>
              Filters & Sorting
            </h2>
            <button
              onClick={() => setIsMobileFiltersOpen(false)}
              className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Filter Content */}
          <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto px-1">
            {renderFilters(true)}
          </div>

          {/* Action Button */}
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