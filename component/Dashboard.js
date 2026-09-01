"use client";

import { useEffect, useState } from "react";
import SummaryCards from "@/component/SummaryCards";
import StatsCards from "@/component/StatsCards";
import MonthlyChart from "@/component/MonthlyChart";
import ProgressCard from "@/component/ProgressCard";
import CourseDistribution from "@/component/CourseDistribution";
import RecentActivityTable from "@/component/RecentActivityTable";
import RecentLeads from "./Recentleads";
import LeadPipeline from "./Leadpipeline";
import TopCounsellors from "@/component/TopCounsellors";
import TopEngaged from "@/component/TopEngaged";
import DashboardSkeleton from "@/component/DashboardSkeleton";
import { RefreshCcw } from "lucide-react";
import BackButton from "@/lib/BackButton";

export default function DashboardPage({id}) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    setLoading(true);
    try {
      const res = await fetch(`${id? `/api/dashboard/counsellor/${id}` : "/api/dashboard"}`);
      const data = await res.json();

      if (data.success) {
        setDashboard(data);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading || !dashboard) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen">
      <div className="flex flex-row items-center justify-between gap-3 mb-4">
        <BackButton />
        <button
          onClick={() => loadDashboard()}
          className="flex items-center rounded-lg gap-2 px-4 py-2 text-xs cursor-pointer font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm w-fit"
        >
          <RefreshCcw size={16} />
          Refresh
        </button>
      </div>

      {/* Top stat cards — mirrors the "Total Leads / Contacts / Deals / Revenue" row */}
      <SummaryCards summary={dashboard.summary} />

      {/* Leads Overview chart + Lead Pipeline funnel — mirrors "Sales Overview / Deals Pipeline" */}
      <div className="grid lg:grid-cols-4">
        <div className="lg:col-span-2">
          <MonthlyChart data={dashboard.monthlyLeadChart} />
        </div>
        <div>
          <LeadPipeline data={dashboard.leadStatus} />
        </div>
        <div className="flex flex-col">
          
        <ProgressCard conversionRate={dashboard.summary.conversionRate} />
        
        <StatsCards callSummary={dashboard.callSummary} />
        </div>
      </div>

      {/* Recent Leads + Recent Activity — mirrors "Recent Leads / Tasks & Activity" */}
      <div className="grid lg:grid-cols-3">
        <div className="flex flex-col h-fit">
        <CourseDistribution courses={dashboard.courseDistribution} />
        
        {!id && <TopCounsellors counsellors={dashboard.topCounsellors} />}
      </div>
        <RecentLeads leads={dashboard.recentLeads} />
        <RecentActivityTable activities={dashboard.recentActivities} />
      </div>

      {/* Secondary metrics not shown in the reference image but present in your data */}
      
    </div>
  );
}