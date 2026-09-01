"use client";

import { Users, Phone, MessageCircle, UserCheck, ArrowUpRight } from "lucide-react";
import { formatNumber } from "@/lib/Dashboardutils";

const CARD_STYLES = {
  blue: { iconBg: "bg-blue-50", iconText: "text-blue-600" },
  green: { iconBg: "bg-emerald-50", iconText: "text-emerald-600" },
  purple: { iconBg: "bg-violet-50", iconText: "text-violet-600" },
  orange: { iconBg: "bg-amber-50", iconText: "text-amber-600" },
  gray:{ iconBg: "bg-gray-50", iconText: "text-gray-600" },
};

function Card({ icon: Icon, color, label, value, change, today }) {
  const style = CARD_STYLES[color];
  return (
    <div className="bg-gray-50 border border-gray-200 border-dashed p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${style.iconBg} ${style.iconText} flex items-center justify-center`}>
          <Icon size={18} strokeWidth={2.2} />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div>
        <div className="text-2xl font-semibold text-gray-900">{formatNumber(value)}</div>
        <div className="flex justify-between">
        {change != null && (
          <div className="flex items-center gap-1 mt-1 text-xs font-medium text-emerald-600">
            <ArrowUpRight size={13} strokeWidth={2.5} />
            <span>{change}</span>
          </div>
        )}
        {today != null && (
          <div className="flex items-center gap-1 mt-1 text-xs font-medium text-red-600">
            <ArrowUpRight size={13} strokeWidth={2.5} />
            <span>{today}</span>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default function SummaryCards({ summary }) {
  if (!summary) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 ">
      <Card
        icon={Users}
        color="blue"
        label="Total Leads"
        value={summary.totalLeads}
        change={`+${formatNumber(summary.monthLeads)} this month`}
        today={`+${formatNumber(summary.todayLeads)} today`}
      />
      <Card
        icon={Phone}
        color="green"
        label="Total Calls"
        value={summary.totalCalls}
        change={summary.todayCalls ? `+${summary.todayCalls} today` : null}
      />
      <Card
        icon={MessageCircle}
        color="purple"
        label="Total WhatsApp"
        value={summary.totalWhatsapp}
      />
      <Card
        icon={UserCheck}
        color="gray"
        label="Today Follow Ups"
        value={summary.todayFollowUps}
      />
       <Card
        icon={UserCheck}
        color="orange"
        label="Active Counsellors"
        value={summary.activeCounsellors}
      />
    </div>
  );
}