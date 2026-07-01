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
       {/* Facebook Lead Ads */}
<div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">

  <div className="p-6 flex-grow">

    <div className="flex justify-between items-start">

      <div>

        <h2 className="text-lg font-semibold">
          Facebook Lead Ads
        </h2>

      </div>

      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${
          fbIntegration?.status === "connected"
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}
      >
        {fbIntegration?.status === "connected"
          ? "Connected"
          : "Disconnected"}
      </span>

    </div>

    <div className="mt-6 space-y-4">

      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500">
          Facebook Page
        </p>

        <p className="text-xs font-medium">
          {fbIntegration?.pageName || "Not Connected"}
        </p>
      </div>

      {fbIntegration?.status === "connected" && (
        <>
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">
              Token Expires
            </p>

            <p className="text-xs font-medium">
              {new Date(
                fbIntegration.tokenExpiresAt
              ).toLocaleDateString()}
            </p>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">
              Remaining
            </p>

            <p
              className={`text-xs font-medium ${
                fbIntegration.needsReconnect
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              {fbIntegration.expiresIn.days} days{" "}
              {fbIntegration.expiresIn.hours} hrs
            </p>
          </div>

          {fbIntegration.needsReconnect && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">

              <p className="text-sm text-yellow-800">

                Your Facebook token will expire soon.
                Please reconnect your account.

              </p>

            </div>
          )}
        </>
      )}

    </div>

  </div>

  <div className="border-t border-gray-200 bg-gray-50">

    <div className="flex">

      <Link
        href="/settings/integrations/facebook/forms"
        className="flex-1 text-center bg-[#05335c] hover:bg-[#05335c]/90 text-white py-2"
      >
        Manage Forms
      </Link>

      <Link
        href="/settings/integrations/facebook"
        className="flex-1 text-center hover:bg-gray-100 py-2"
      >
        {fbIntegration?.status === "connected"
          ? "Reconnect"
          : "Connect"}
      </Link>

    </div>

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