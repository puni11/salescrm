
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [fbIntegration, setFbIntegration] = useState(null);
  const [googleAdsIntegration, setGoogleAdsIntegration] = useState(null);
  const [error, setError] = useState("");

  const loadIntegrations = useCallback(async () => {
    try {
      setError("");

      const [fbRes, googleRes] = await Promise.all([
        fetch("/api/facebook/integration", {
          cache: "no-store",
        }),
        fetch("/api/google-ads/integration", {
          cache: "no-store",
        }),
      ]);

      if (!fbRes.ok || !googleRes.ok) {
        throw new Error("Failed to load integrations");
      }

      const [fbData, googleData] = await Promise.all([
        fbRes.json(),
        googleRes.json(),
      ]);

      setFbIntegration(fbData);
      setGoogleAdsIntegration(googleData);
    } catch (err) {
      console.error("Integration loading error:", err);
      setError("Unable to load integration details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  const formatDate = (date) => {
    if (!date) return "N/A";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "N/A";

    return parsedDate.toLocaleString();
  };

  const StatusBadge = ({ connected, label }) => (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        connected
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {label || (connected ? "Connected" : "Disconnected")}
    </span>
  );

  const InfoRow = ({ label, value, valueClass = "text-gray-900" }) => (
    <div className="flex justify-between items-center gap-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xs font-medium text-right ${valueClass}`}>
        {value}
      </p>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8 flex justify-center items-center h-64 text-gray-500">
        Loading integrations...
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Integrations
          </h1>

          <p className="text-gray-500 mt-2">
            Manage your connected portals and services.
          </p>
        </div>

        <button
          onClick={loadIntegrations}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
        >
          Refresh Status
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
          <button
            onClick={loadIntegrations}
            className="ml-3 underline font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* ================================= */}
        {/* FACEBOOK LEAD ADS */}
        {/* ================================= */}

        <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">

          <div className="p-6 flex-grow">

            <div className="flex justify-between items-start gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                Facebook Lead Ads
              </h2>

              <StatusBadge
                connected={fbIntegration?.status === "connected"}
              />
            </div>

            <div className="mt-6 space-y-4">

              <InfoRow
                label="Facebook Page"
                value={fbIntegration?.pageName || "Not Connected"}
              />

              {fbIntegration?.status === "connected" && (
                <>
                  <InfoRow
                    label="Connected On"
                    value={formatDate(fbIntegration.connectedAt)}
                  />

                  <InfoRow
                    label="Token Expires"
                    value={formatDate(fbIntegration.tokenExpiresAt)}
                  />

                  <InfoRow
                    label="Remaining"
                    value={
                      `${fbIntegration.expiresIn?.days ?? 0} days ${
                        fbIntegration.expiresIn?.hours ?? 0
                      } hrs`
                    }
                    valueClass={
                      fbIntegration.needsReconnect
                        ? "text-red-600"
                        : "text-green-600"
                    }
                  />

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
                className="flex-1 text-center bg-[#05335c] hover:bg-[#05335c]/90 text-white py-3 text-sm"
              >
                Manage Forms
              </Link>

              <Link
                href="/settings/integrations/facebook"
                className="flex-1 text-center hover:bg-gray-100 py-3 text-sm"
              >
                {fbIntegration?.status === "connected"
                  ? "Reconnect"
                  : "Connect"}
              </Link>

            </div>
          </div>

        </div>

        {/* ================================= */}
        {/* GOOGLE ADS */}
        {/* ================================= */}

        <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">

          <div className="p-6 flex-grow">

            <div className="flex justify-between items-start gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                Google Ads
              </h2>

              <StatusBadge
                connected={googleAdsIntegration?.status === "connected"}
              />
            </div>

            <p className="text-sm text-gray-600 mt-3">
              Track conversions and sync your Google search campaigns.
            </p>

            {googleAdsIntegration?.status === "connected" ? (
              <div className="mt-6 space-y-4">

                <InfoRow
                  label="Connected On"
                  value={formatDate(googleAdsIntegration.connectedAt)}
                />

                <InfoRow
                  label="Access Token"
                  value={
                    googleAdsIntegration.tokenExpired
                      ? "Expired"
                      : "Active"
                  }
                  valueClass={
                    googleAdsIntegration.tokenExpired
                      ? "text-red-600"
                      : "text-green-600"
                  }
                />

                <InfoRow
                  label="Token Expires"
                  value={formatDate(googleAdsIntegration.tokenExpiresAt)}
                />

                <InfoRow
                  label="Refresh Token"
                  value={
                    googleAdsIntegration.hasRefreshToken
                      ? "Available"
                      : "Not Available"
                  }
                  valueClass={
                    googleAdsIntegration.hasRefreshToken
                      ? "text-green-600"
                      : "text-red-600"
                  }
                />

                {googleAdsIntegration.tokenExpired &&
                  googleAdsIntegration.hasRefreshToken && (
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                      <p className="text-sm text-blue-800">
                        Access token expired. A refresh token
                        is available for renewing access.
                      </p>
                    </div>
                  )}

                {googleAdsIntegration.needsReconnect && (
                  <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                    <p className="text-sm text-yellow-800">
                      Please reconnect your Google Ads account.
                    </p>
                  </div>
                )}

              </div>
            ) : (
              <div className="mt-6 rounded-lg bg-gray-50 border border-gray-200 p-4">
                <p className="text-sm text-gray-500">
                  Google Ads account is not connected.
                </p>
              </div>
            )}

          </div>

          <div className="border-t border-gray-200 bg-gray-50">
            <Link
              href="/settings/integrations/google-ads/forms"
              className="block text-center py-3 text-sm font-medium text-[#05335c] hover:bg-gray-100"
            >
              {googleAdsIntegration?.status === "connected"
                ? "Manage Integration"
                : "Connect Google Ads"}
            </Link>
          </div>

        </div>

        {/* ================================= */}
        {/* LINKEDIN LEAD GEN */}
        {/* ================================= */}

        <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden opacity-75 hover:opacity-100">

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
              Set Up Integration →
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
