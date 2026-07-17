"use client";

import { useEffect, useState } from "react";
import SummaryCards from "@/component/SummaryCards";
import StatsCards from "@/component/StatsCards";
import MonthlyChart from "@/component/MonthlyChart";
import ProgressCard from "@/component/ProgressCard";
import CourseDistribution from "@/component/CourseDistribution";
import RecentActivityTable from "@/component/RecentActivityTable";
import TopCounsellors from "@/component/TopCounsellors";
import TopEngaged from "@/component/TopEngaged";
import DashboardSkeleton from "@/component/DashboardSkeleton";
import { RefreshCcw } from "lucide-react";
import BackButton from "@/lib/BackButton";

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    setLoading(true)
    try {
      const res = await fetch("/api/dashboard");
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

  if (loading) {
    return (
      <DashboardSkeleton />
    );
  }

  return (
    <div className=" min-h-screen p-6">
 <div className="flex flex-row gap-3 mb-4">
      <BackButton />
<button
  onClick={() => loadDashboard()}
  className={`flex items-center rounded-lg gap-2 px-4 py-2 text-xs cursor-pointer font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm w-fit `}
>
  <RefreshCcw size={16} />
  Refresh
</button>
      </div>
      <SummaryCards summary={dashboard.summary} />

      <div className="grid lg:grid-cols-3 gap-4 mt-4">

        <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <StatsCards summary={dashboard.summary} />

          <ProgressCard
            conversionRate={dashboard.summary.conversionRate}
          />
          </div>
          <RecentActivityTable
            activities={dashboard.recentActivities}
          />

        </div>

        <div className="space-y-6">

          <MonthlyChart
            data={dashboard.monthlyLeadChart}
          />

          <CourseDistribution
            courses={dashboard.courseDistribution}
          />

          <TopCounsellors
            counsellors={dashboard.topCounsellors}
          />

          <TopEngaged
            leads={dashboard.topEngagedLeads}
          />

        </div>

      </div>

    </div>
  );
}