import { Activity, BookAIcon, Briefcase, Calendar, CalendarCheck, Clock, Globe, History, Info, Mail, MessageCircle, MessageSquare, Phone, ShieldCheck, TargetIcon, Trash2Icon, User2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function LeadDetails({
  selectedLead,
  setSelectedLeadId,
  setDeleteModal,
  getLeadId,
  updateLeadStatus,
  addComment,
  setIsWhatsAppModalOpen,
  formatDate,
  setFollowUpOpen,
  setOtherCourse,
  course,
  STATUSES,
}){
  const [isLeadStatusOpen, setIsLeadStatusOpen] = useState(false);
const [isLeadInterestedOpen, setIsLeadInterestedOpen] = useState(false);
    return(
        <>
                  <div 
                    className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 transition-opacity"
                    onClick={() => setSelectedLeadId(null)}
                  />
                  <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform flex flex-col border-l border-gray-200">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex gap-2">              <h2 className="text-xl font-semibold text-gray-900">Lead Details</h2>
                    
                    <Link href={`/leads/timeline/${selectedLead._id}`} className="flex gap-1 bg-red-100 items-center text-xs px-2 rounded-md text-red-600">
                            <History size={16} className=" text-red-400" />
                            See Lead Timeline
                          </Link>
                    </div>
                      <div>
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
                       <div className="relative w-full">
  <button
    type="button"
    onClick={() => setIsLeadStatusOpen(!isLeadStatusOpen)}
    className={`w-full p-3 rounded-lg border-2 outline-none font-medium text-sm transition-colors cursor-pointer flex items-center justify-between ${
      selectedLead.status === "Registered"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : selectedLead.status === "Invalid"
        ? "border-red-200 bg-red-50 text-red-800"
        : selectedLead.status === "Follow Up"
        ? "border-yellow-200 bg-yellow-50 text-yellow-800"
        : "border-gray-200 bg-white text-gray-800"
    }`}
  >
    <span>
      {selectedLead.status || "New Lead"}
    </span>

    <svg
      className={`w-4 h-4 transition-transform ${
        isLeadStatusOpen ? "rotate-180" : ""
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

  {isLeadStatusOpen && (
    <div className="absolute z-[100] mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-xl overflow-visible">

      {/* Normal statuses */}
      {[
        "New Lead",
        "Not Interested",
        "Invalid",
        "Call Back",
        "Registered",
      ].map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => {
            updateLeadStatus(
              getLeadId(selectedLead),
              status
            );

            setIsLeadStatusOpen(false);
            setIsLeadInterestedOpen(false);
          }}
          className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-100 transition-colors ${
            selectedLead.status === status
              ? "bg-gray-50 font-semibold"
              : ""
          }`}
        >
          {status}
        </button>
      ))}

      {/* Interested */}
      <div
        className="relative"
        onMouseEnter={() => setIsLeadInterestedOpen(true)}
        onMouseLeave={() => setIsLeadInterestedOpen(false)}
      >
        <button
          type="button"
          className="w-full px-4 py-3 text-left text-sm hover:bg-gray-100 flex items-center justify-between"
        >
          <span>
            {[
              "Course Interested",
              "Follow Up",
              "Other Course Interested",
            ].includes(selectedLead.status)
              ? selectedLead.status
              : "Interested"}
          </span>

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
        {isLeadInterestedOpen && (
          <div className="absolute right-5 -top-20 ml-1 w-[230px] rounded-lg border border-gray-200 bg-white shadow-xl">

            {[
              "Course Interested",
              "Follow Up",
              "Other Course Interested",
            ].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  if (status === "Follow Up") {
                    setFollowUpOpen(true);
                  } else if (status === "Other Course Interested") {
                    setOtherCourse(true)
                  } else {
                    updateLeadStatus(
                      getLeadId(selectedLead),
                      status
                    );
                  }

                  setIsLeadStatusOpen(false);
                  setIsLeadInterestedOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-100 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  selectedLead.status === status
                    ? "bg-gray-50 font-semibold"
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
        
                      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
                        <div>
                          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1 mb-1"><User2 size={14}/> Profile Type</div>
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
    )
}