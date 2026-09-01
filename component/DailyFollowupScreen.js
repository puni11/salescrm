"use client";

import { X, Clock, Mail, BookOpen, MessageSquare, ArrowRight } from "lucide-react";

export default function DailyFollowupScreen({
  followups,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[90vh] bg-white rounded-sm shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-300">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Today's Follow-ups
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              {followups.length} follow-up
              {followups.length !== 1 ? "s" : ""} scheduled for today
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-sm hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Follow-ups */}
        <div className="p-6 overflow-y-auto max-h-[65vh] space-y-4 grid grid-cols-1 sm:grid-cols-2 gap-2">

          {followups.map((followup) => (
            <div
              key={followup._id}
              className="border border-gray-200 rounded-sm p-5 bg-gray-50 hover:shadow-sm transition"
            >

              {/* Name + Status */}
              
              <div className="flex items-start justify-between gap-4">

                <div>
                    
                  <div className="flex gap-2 items-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {followup.name}
                  </h3>
                  <span
                  className={`px-2 py-0.5 rounded-xs text-xs font-medium ${
                    followup.leadStatus === "Follow Up"
                      ? "bg-gray-200 text-gray-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {followup.followUpStatus}
                </span> 
               
                  </div>
<div className="flex gap-2 justify-between">
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    <Mail size={12} />
                    {followup.phone || "No Phone"}
                  </div>
                   <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    <BookOpen size={12} />
                    {followup.course || "No Phone"}
                  </div>
                  </div>
               
                </div>

                

              </div>

              {/* Course */}
             

              {/* Comment */}
              {followup.comment && (
                <div className="mt-2 mb-2 bg-white rounded-ms p-3">
                  <div className="flex gap-2">
                    <MessageSquare
                      size={16}
                      className="text-gray-700 mt-0.5"
                    />

                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">
                        Follow-up Comment
                      </p>

                      <p className="text-xs text-gray-700">
                        {followup.comment}
                      </p>
                    </div>
                  </div>
                </div>
              )}
 <span className="text-xs text-gray-500 mt-2 bg-green-50 border border-green-200 px-3 py-0.5 text-green-800"> Follow Up Time -  {followup.followUpTime}</span>
            </div>
          ))}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-300 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-black flex gap-1 items-center text-white rounded-sm text-sm font-medium hover:bg-gray-800"
          >
            Continue to CRM <ArrowRight size={16} />
          </button>
        </div>

      </div>
    </div>
  );
}