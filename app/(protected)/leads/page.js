'use client'
import React, { useState, useEffect } from "react";
import { 
  Search, Filter, Plus, Upload, X, MessageSquare, 
  Calendar, User, Phone, Mail, CheckCircle, 
  AlertCircle, ArrowDownToLine, TargetIcon,
  Activity, Globe, Info, Clock, ShieldCheck
} from "lucide-react";

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
const PROFILES = ["student", "professional", "business", "other"];

const STATUSES = [
  "New Lead", 
  "Interested", 
  "Not Interested", 
  "Invalid", 
  "Converted", 
  "Call Back"
];

// --- MAIN APPLICATION COMPONENT ---
export default function App() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  
  // Modals
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  // Filters & Pagination
  const [sort, setSort] = useState("newest"); // newest | oldest | name
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  
  const [statusFilter, setStatusFilter] = useState("All");
  const [profileFilter, setProfileFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All"); // All, Today, Last3, Last7, Last30
  const limit = 10;

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, profileFilter, dateFilter]);

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
        ...(dateFilter !== "All" && { dateFilter })
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
  }, [page, debouncedSearch, statusFilter, profileFilter, dateFilter, sort, fromDate, toDate]);

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
  };

  // 4. Add New Lead
  const handleAddLead = async (newLeadData) => {
    setLoading(true);
    // Convert string 'on' to boolean for consent if passing via formData
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

  // 5. Import CSV
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/contact/import', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        alert("Leads imported successfully!");
        setIsImportOpen(false);
        fetchLeads();
      } else {
        alert("Import failed. Please check your file format.");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred during import.");
    } finally {
      setIsImporting(false);
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
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track your platform inquiries.</p>
        </div>
        <div className="flex items-center gap-3">
         
          <button 
            onClick={() => setIsAddLeadOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
          >
            <Plus size={18} />
            Add Lead
          </button>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="bg-white px-8 py-4 border-b border-gray-200 flex flex-wrap justify-between gap-4 items-center shadow-sm z-10">
        {/* 🔍 Search */}
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex gap-3 flex-wrap items-center">
          {/* 📅 Quick Date Filter */}
          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="All">All Time</option>
            <option value="Today">Today</option>
            <option value="Last3">Last 3 Days</option>
            <option value="Last7">Last 7 Days</option>
            <option value="Last30">Last 30 Days</option>
          </select>

          {/* 📆 Custom Date Range */}
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />

          {/* 🔽 Sorting */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name (A-Z)</option>
          </select>

          {/* Existing Filters */}
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="All">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select 
            value={profileFilter} 
            onChange={(e) => setProfileFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="All">All Profiles</option>
            {PROFILES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto p-8 relative">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Name & Contact</th>
                  <th className="px-6 py-4">Profile & Consent</th>
                  <th className="px-6 py-4">Source & Campaign</th>
                  <th className="px-6 py-4">Created Date</th>
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
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
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
                          <div className="text-gray-900">{lead.source ? lead.source.charAt(0).toUpperCase() + lead.source.slice(1) : 'Direct'}</div>
                          <div className="text-gray-500 text-xs mt-1">{lead.medium || 'None'} {lead.campaign && `- ${lead.campaign}`}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-900">{parsedDate.toLocaleDateString()}</div>
                          <div className="text-gray-500 text-xs mt-1">{parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
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
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setSelectedLeadId(null)}
          />
          {/* Sidebar Panel */}
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform flex flex-col border-l border-gray-200">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-semibold text-gray-900">Lead Details</h2>
              <button 
                onClick={() => setSelectedLeadId(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Sidebar Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Profile Section */}
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
                {/* SOURCE */}
                <div className="flex items-center text-sm text-gray-600">
                  <Globe size={16} className="mr-3 text-gray-400" />
                  <span className="flex flex-col">
                    <span className="text-xs text-gray-400 uppercase">Source</span>
                    <span className="font-medium text-gray-900">
                      {selectedLead.source ? selectedLead.source.charAt(0).toUpperCase() + selectedLead.source.slice(1) : "Direct"}
                    </span>
                  </span>
                </div>

                {/* MEDIUM */}
                <div className="flex items-center text-sm text-gray-600">
                  <Activity size={16} className="mr-3 text-gray-400" />
                  <span className="flex flex-col">
                    <span className="text-xs text-gray-400 uppercase">Medium</span>
                    <span className="font-medium text-gray-900">
                      {selectedLead.medium ? selectedLead.medium.charAt(0).toUpperCase() + selectedLead.medium.slice(1) : "None"}
                    </span>
                  </span>
                </div>

                {/* CAMPAIGN */}
                <div className="flex items-center text-sm text-gray-600">
                  <TargetIcon size={16} className="mr-3 text-gray-400" />
                  <span className="flex flex-col">
                    <span className="text-xs text-gray-400 uppercase">Campaign</span>
                    <span className="font-medium text-gray-900">
                      {selectedLead.campaign ? selectedLead.campaign.charAt(0).toUpperCase() + selectedLead.campaign.slice(1) : "N/A"}
                    </span>
                  </span>
                </div>

                {/* TERM / KEYWORD */}
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

              {/* Status Update */}
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

              {/* Meta & System Info */}
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

              {/* Comments Section */}
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
                          {new Date(c.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment Input */}
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

            </div>
          </div>
        </>
      )}

      {/* --- ADD LEAD MODAL --- */}
      {isAddLeadOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                  <input required name="email" type="email" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Phone Number *</label>
                  <input required name="phone" type="tel" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
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

      {/* --- IMPORT CSV MODAL --- */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Import Leads</h2>
              <button onClick={() => !isImporting && setIsImportOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer group">
              <button
                onClick={() => window.open("/api/contact/sample-csv")}
                className="mb-3 text-sm text-blue-600 hover:underline font-medium"
              >
                Download Sample CSV
              </button>
              {isImporting ? (
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-sm font-medium text-gray-900">Uploading File...</p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <ArrowDownToLine size={24} />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Click to upload or drag and drop</h3>
                  <p className="text-xs text-gray-500">CSV or Excel files only</p>
                  <input type="file" accept=".csv, .xlsx, .xls" className="hidden" id="fileUpload" onChange={handleImport} />
                  <button onClick={() => document.getElementById('fileUpload').click()} className="mt-4 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg shadow-sm group-hover:border-blue-500 transition-colors">
                    Browse Files
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}