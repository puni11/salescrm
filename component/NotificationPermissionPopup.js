"use client";

import { useState } from "react";

export default function NotificationPermissionPopup({
  open,
  onEnable,
  onLater,
}) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleEnable = async () => {
    try {
      setLoading(true);
      await onEnable();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Area with Soft Background */}
        <div className="bg-blue-50/40 p-6 pb-4 sm:p-8 sm:pb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 ring-8 ring-blue-50">
            <svg 
              className="h-8 w-8 text-blue-600" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth="1.5" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <h2 id="modal-title" className="text-2xl font-bold text-gray-900">
            Never Miss a Beat
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Enable notifications to stay instantly updated on your most important CRM activities.
          </p>
        </div>

        {/* Feature Checklist */}
        <div className="px-6 py-2 sm:px-8">
          <div className="space-y-3">
            {[
              "New Lead Assigned",
              "Follow-up Reminders",
              "WhatsApp Replies",
              "Meeting Notifications",
            ].map((item, idx) => (
              <div key={idx} className="flex items-center text-sm font-medium text-gray-700">
                <svg 
                  className="mr-3 h-5 w-5 flex-shrink-0 text-green-500" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  strokeWidth="2.5" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons (Footer) */}
        <div className="mt-6 border-t border-gray-100 bg-gray-50 px-6 py-5 sm:flex sm:flex-row-reverse sm:px-8">
          <button
            type="button"
            onClick={handleEnable}
            disabled={loading}
            className="inline-flex w-full min-w-[140px] items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 sm:ml-3 sm:w-auto"
          >
            {loading ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Enabling...
              </>
            ) : (
              "Enable Now"
            )}
          </button>
          
          <button
            type="button"
            onClick={onLater}
            disabled={loading}
            className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 transition-all hover:bg-gray-50 sm:mt-0 sm:w-auto"
          >
            Maybe Later
          </button>
        </div>

      </div>
    </div>
  );
}