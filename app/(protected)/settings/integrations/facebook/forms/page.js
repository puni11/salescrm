"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function FacebookFormsPage() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForms();
  }, []);

  async function loadForms() {
    setLoading(true);
    try {
      const res = await fetch("/api/facebook/forms");
      const data = await res.json();
      setForms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8">
      
      {/* Page Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Facebook Lead Forms
          </h1>
          <p className="text-gray-500 mt-2">
            Manage all Facebook Lead Forms connected to your CRM.
          </p>
        </div>

        <button
          onClick={loadForms}
          disabled={loading}
          className="px-5 py-2.5 rounded-lg bg-[#05335c] text-white font-medium hover:bg-[#05335c]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Refreshing..." : "Refresh Forms"}
        </button>
      </div>

      {/* State Handling: Loading, Empty, or Data Grid */}
      {loading && forms.length === 0 ? (
        <div className="flex justify-center items-center h-64 text-gray-500 rounded-xl border border-dashed border-gray-300">
          Loading Forms...
        </div>
      ) : forms.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center flex flex-col items-center justify-center">
          <h2 className="text-xl font-semibold text-gray-900">
            No Forms Found
          </h2>
          <p className="text-gray-500 mt-2 max-w-sm">
            It looks like you don't have any lead forms available. Create a Lead Form in Facebook Lead Ads to see it here.
          </p>
        </div>
      ) : (
        /* Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {forms.map((form) => (
            <div 
              key={form.id} 
              className="flex flex-col bg-white rounded-md border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
            >
              {/* Card Content */}
              <div className="p-6 flex-grow">
                <div className="flex justify-between items-start mb-2 gap-4">
                  <h2 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {form.name}
                  </h2>
                  <span
                    className={`px-2.5 py-1 rounded-sm text-xs font-medium whitespace-nowrap ${
                      form.status === "ACTIVE"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-gray-100 text-gray-600 border border-gray-200"
                    }`}
                  >
                    {form.status === "ACTIVE" ? "Active" : "Inactive"}
                  </span>
                </div>
                {/* Info Block */}
                <div className="flex gap-4 ">
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1">
                    Form ID - 
                  </p>
                  <p className="text-xs font-medium text-gray-900 font-mono">
                    {form.id}
                  </p>
                </div>
              </div>

              {/* Card Footer / Action */}
              <div className="border-t border-gray-100 p-0.5 bg-gray-50/50">
                <Link 
                  href={`/settings/integrations/facebook/forms/${form.id}`}
                  className="w-full flex justify-start items-center px-4 py-2 text-xs font-medium text-blue-800 hover:text-blue-9000 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  Configure Form &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}