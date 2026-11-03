
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import SummaryCards from "@/component/SummaryCards";
import StatsCards from "@/component/StatsCards";
import MonthlyChart from "@/component/MonthlyChart";
import ProgressCard from "@/component/ProgressCard";
import CourseDistribution from "@/component/CourseDistribution";
import RecentActivityTable from "@/component/RecentActivityTable";
import RecentLeads from "./Recentleads";
import LeadPipeline from "./Leadpipeline";
import TopCounsellors from "@/component/TopCounsellors";
import SourceDistributionChart from "@/component/SourceDistributionChart";
import TopEngaged from "@/component/TopEngaged";
import DashboardSkeleton from "@/component/DashboardSkeleton";
import BackButton from "@/lib/BackButton";

import { RefreshCcw, Tag, TrendingUp } from "lucide-react";

// ==========================================
// TAG DISTRIBUTION
// ==========================================
function TagDistribution({ data = [] }) {
  if (!data.length) return null;

  const total = data.reduce(
    (sum, item) => sum + (Number(item.count) || 0),
    0
  );

  return (
    <section className="mt-5 bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Lead Tags Distribution
          </h3>

          <p className="text-xs text-gray-500 mt-1">
            Breakdown of leads by assigned tags
          </p>
        </div>

        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100">
          <Tag size={17} className="text-gray-600" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {data.map((item, index) => {
          const count = Number(item.count) || 0;

          const percentage = total
            ? Math.round((count / total) * 100)
            : 0;

          return (
            <div
              key={`${item.tag}-${index}`}
              className="rounded-xl border border-gray-100 bg-gray-50 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-700 truncate">
                  {item.tag || "Unknown"}
                </span>

                <Tag
                  size={13}
                  className="text-gray-400 shrink-0"
                />
              </div>

              <p className="text-2xl font-semibold text-gray-900 mt-3">
                {count}
              </p>

              <div className="mt-3 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gray-800 transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <p className="text-[11px] text-gray-500 mt-2">
                {percentage}% of tagged leads
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ==========================================
// ENGAGEMENT OVERVIEW
// ==========================================
function EngagementOverview({ data = [] }) {
  if (!data.length) return null;

  return (
    <section className="mt-5 bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={17} className="text-gray-600" />

        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Engagement Overview
          </h3>

          <p className="text-xs text-gray-500 mt-1">
            Lead engagement by activity type
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {data.map((item, index) => (
          <div
            key={`${item.type}-${index}`}
            className="border border-gray-100 rounded-lg p-3"
          >
            <p className="text-xs text-gray-500 capitalize">
              {(item.type || "Unknown").replaceAll("_", " ")}
            </p>

            <p className="text-xl font-semibold text-gray-900 mt-2">
              {Number(item.count) || 0}
            </p>

            <p className="text-xs text-gray-500 mt-1">
              Score: {Number(item.score) || 0}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ==========================================
// DASHBOARD PAGE
// ==========================================
export default function DashboardPage({ id }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const requestRef = useRef(0);

  // ==========================================
  // LOAD DASHBOARD
  // ==========================================
  const loadDashboard = useCallback(async () => {
    const requestId = ++requestRef.current;

    setLoading(true);
    setError("");

    try {
      const url = id
        ? `/api/dashboard/counsellor/${encodeURIComponent(id)}`
        : "/api/dashboard";

      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
            data.message ||
            "Unable to load dashboard"
        );
      }

      // Ignore stale responses
      if (requestId !== requestRef.current) return;

      setDashboard({
        ...data,

        summary: data.summary || {},

        // Pipeline
        pipelineTotal: Number(data.pipelineTotal) || 0,

        leadStatus: Array.isArray(data.leadStatus)
          ? data.leadStatus.map((stage) => ({
              ...stage,
              count: Number(stage.count) || 0,
              tags: Array.isArray(stage.tags)
                ? stage.tags.map((tag) => ({
                    ...tag,
                    tag: tag.tag || "",
                    count: Number(tag.count) || 0,
                  }))
                : [],
            }))
          : [],

        tagDistribution: Array.isArray(data.tagDistribution)
          ? data.tagDistribution
          : [],

        monthlyLeadChart: Array.isArray(data.monthlyLeadChart)
          ? data.monthlyLeadChart
          : [],

        callSummary: data.callSummary || {},

        engagementAnalytics: Array.isArray(data.engagementAnalytics)
          ? data.engagementAnalytics
          : [],

        courseDistribution: Array.isArray(data.courseDistribution)
          ? data.courseDistribution
          : [],

        sourceDistribution: Array.isArray(data.sourceDistribution)
          ? data.sourceDistribution
          : [],

        topCounsellors: Array.isArray(data.topCounsellors)
          ? data.topCounsellors
          : [],

        recentLeads: Array.isArray(data.recentLeads)
          ? data.recentLeads
          : [],

        recentActivities: Array.isArray(data.recentActivities)
          ? data.recentActivities
          : [],

        topEngagedLeads: Array.isArray(data.topEngagedLeads)
          ? data.topEngagedLeads
          : [],
      });
    } catch (err) {
      console.error("Dashboard error:", err);

      if (requestId !== requestRef.current) return;

      setError(
        err.message || "Something went wrong"
      );
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }, [id]);

  // ==========================================
  // INITIAL LOAD
  // ==========================================
  useEffect(() => {
    loadDashboard();

    return () => {
      requestRef.current += 1;
    };
  }, [loadDashboard]);

  // ==========================================
  // INITIAL LOADING
  // ==========================================
  if (loading && !dashboard) {
    return <DashboardSkeleton />;
  }

  // ==========================================
  // ERROR STATE
  // ==========================================
  if (!dashboard) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-500">
          {error || "Unable to load dashboard"}
        </p>

        <button
          onClick={loadDashboard}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Try Again"}
        </button>
      </div>
    );
  }

  // ==========================================
  // DASHBOARD DATA
  // ==========================================
  const {
    summary = {},
    pipelineTotal = 0,
    leadStatus = [],
    tagDistribution = [],
    monthlyLeadChart = [],
    callSummary = {},
    engagementAnalytics = [],
    courseDistribution = [],
    sourceDistribution = [],
    topCounsellors = [],
    recentLeads = [],
    recentActivities = [],
    topEngagedLeads = [],
  } = dashboard;

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="min-h-screen">

      {/* HEADER */}
      <div className="flex flex-row items-center justify-between gap-3 mb-4">
        <BackButton />

        <button
          onClick={loadDashboard}
          disabled={loading}
          className="flex items-center rounded-lg gap-2 px-4 py-2 text-xs cursor-pointer font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm w-fit disabled:opacity-50"
        >
          <RefreshCcw
            size={16}
            className={loading ? "animate-spin" : ""}
          />

          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* SUMMARY CARDS */}
      <SummaryCards summary={summary} />

      {/* MONTHLY CHART, PIPELINE AND STATS */}
      <div className="grid lg:grid-cols-6">
        <div className="lg:col-span-2">
          <MonthlyChart data={monthlyLeadChart} />
        </div>

        <div className="lg:col-span-2">
          <LeadPipeline
            data={leadStatus}
            totalLeads={pipelineTotal}
          />
        </div>

        <div className="flex flex-col lg:col-span-2">
          <ProgressCard
            conversionRate={summary.conversionRate || 0}
          />

          <StatsCards callSummary={callSummary} />
        </div>
      </div>

      {/* COURSE DISTRIBUTION, COUNSELLORS, LEADS AND ACTIVITY */}
      <div className="grid lg:grid-cols-3">
        <div className="flex flex-col h-fit">
          <CourseDistribution courses={courseDistribution} />

          {!id && (
            <TopCounsellors
              counsellors={topCounsellors}
            />
          )}
        </div>

        <RecentLeads leads={recentLeads} />

        <RecentActivityTable
          activities={recentActivities}
        />
      </div>

      {/* TAG DISTRIBUTION */}
      <TagDistribution data={tagDistribution} />

      {/* SOURCE DISTRIBUTION */}
      {!id && (
        <SourceDistributionChart
          rawData={sourceDistribution}
        />
      )}

      {/* ENGAGEMENT ANALYTICS */}
      <EngagementOverview data={engagementAnalytics} />

      {/* TOP ENGAGED LEADS */}
      {topEngagedLeads.length > 0 && (
        <div className="mt-5">
          <TopEngaged leads={topEngagedLeads} />
        </div>
      )}
    </div>
  );
}
