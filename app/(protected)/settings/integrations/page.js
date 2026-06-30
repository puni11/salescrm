"use client";

import { useEffect, useState } from "react";
import Link from "next/link"; 

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [fbIntegration, setFbIntegration] = useState(null);

  useEffect(() => {
    loadFacebookIntegration();
  }, []);

  async function loadFacebookIntegration() {
    try {
      const res = await fetch("/api/facebook/integration");
      const data = await res.json();
      setFbIntegration(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8 flex justify-center items-center h-64 text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className=" p-8">
      
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Integrations
        </h1>
        <p className="text-gray-500 mt-2">
          Manage your connected portals and services.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* 1. Facebook Lead Ads Card (Dynamic) */}
        <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
          <div className="p-6 flex-grow">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Facebook Lead Ads
              </h2>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  fbIntegration?.status === "active"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-gray-100 text-gray-600 border border-gray-200"
                }`}
              >
                {fbIntegration?.status === "active" ? "Active" : "Inactive"}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Manage and sync your Facebook Lead Ads directly to your system.
            </p>

            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1">
                Connected Page
              </p>
              <p className="text-sm font-medium text-gray-900">
                {fbIntegration?.pageName ?? "Not Connected"}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 p-4 bg-gray-50/50">
            <Link 
              href="/settings/integrations/facebook/forms" 
              className="w-full flex justify-center items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              {fbIntegration?.status === "active" ? "Manage Integration" : "Set Up Integration"} &rarr;
            </Link>
          </div>
        </div>

        {/* 2. Google Ads Card (Static - Inactive) */}
        <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden opacity-75 hover:opacity-100">
          <div className="p-6 flex-grow">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Google Ads
              </h2>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                Inactive
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Track conversions and sync your Google search campaigns.
            </p>

            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1">
                Connected Account
              </p>
              <p className="text-sm font-medium text-gray-500 italic">
                Not Connected
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 p-4 bg-gray-50/50">
            <Link 
              href="/integrations/google" 
              className="w-full flex justify-center items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Set Up Integration &rarr;
            </Link>
          </div>
        </div>

        {/* 3. LinkedIn Lead Gen Card (Static - Inactive) */}
        <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden opacity-75 hover:opacity-100">
          <div className="p-6 flex-grow">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                LinkedIn Lead Gen
              </h2>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                Inactive
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Import leads automatically from your LinkedIn Lead Gen Forms.
            </p>

            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1">
                Connected Page
              </p>
              <p className="text-sm font-medium text-gray-500 italic">
                Not Connected
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 p-4 bg-gray-50/50">
            <Link 
              href="/integrations/linkedin" 
              className="w-full flex justify-center items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Set Up Integration &rarr;
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}