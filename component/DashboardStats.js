import React from "react";
import {
  Users,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  CalendarDays,
} from "lucide-react";

// --- Minimal trend text ---
const TrendBadge = ({ trend }) => {
  if (trend === undefined || trend === null) return null;

  const isPositive = trend > 0;
  const isNegative = trend < 0;

  const color = isPositive
    ? "text-[#0F7B6C]"
    : isNegative
      ? "text-[#E03E3E]"
      : "text-[#9B9A97]";

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className={`inline-flex items-center gap-0.5 font-medium ${color}`}>
        <Icon size={12} />
        {Math.abs(trend)}%
      </span>
      <span className="text-[#C7C6C3]">7d</span>
    </span>
  );
};

// --- Single metric ---
function Metric({ icon: Icon, label, value, trend, first }) {
  return (
    <div
      className={`min-w-0 px-4 py-1 ${
        first ? "pl-0" : "sm:border-l sm:border-[#E9E9E7]"
      }`}
    >
      <div className="flex items-center gap-1.5 text-[13px] text-[#787774]">
        <Icon size={14} className="shrink-0 text-[#9B9A97]" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
        <span className="text-[26px] font-semibold leading-none tracking-tight tabular-nums text-[#37352F]">
          {value}
        </span>
        <TrendBadge trend={trend} />
      </div>
    </div>
  );
}

// --- Inline label + values row ---
function InlineRow({ label, items }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="w-24 shrink-0 text-[13px] text-[#9B9A97]">{label}</span>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {items.map(({ name, count }) => (
          <span key={name} className="text-[13px] text-[#787774]">
            {name}
            <span className="ml-1.5 font-medium tabular-nums text-[#37352F]">
              {count}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// --- Main Minimal Stats Component ---
export default function DashboardStats({ stats }) {
  if (!stats) return null;

  const grrasCount =
    stats?.froms?.find((item) => item.name === "GRRAS")?.count || 0;

  const ap2vCount =
    stats?.froms?.find((item) => item.name === "ap2v")?.count || 0;

  const sourceItems = (stats.sources || []).slice(0, 6);

  const statusItems = Object.entries(stats.statuses || {})
    .filter((_, index) => index !== 5)
    .slice(3, 8)
    .map(([name, count]) => ({ name: name || "Not Provided", count }));

  return (
    <div
      className="space-y-4"
      
    >
      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
        <Metric
          first
          icon={Users}
          label="Total leads"
          value={stats.totalLeads?.count || 0}
          trend={stats.totalLeads?.trend}
        />
        <Metric
          icon={UserPlus}
          label="Untouched"
          value={stats.newLeads?.count || 0}
          trend={stats.newLeads?.trend}
        />
        <Metric icon={Building2} label="GRRAS" value={grrasCount} />
        <Metric icon={Building2} label="AP2V" value={ap2vCount} />
        {stats.courses && stats.courses.length > 0 && (
          <Metric
            icon={CalendarDays}
            label="Today follow up"
            value={stats.todayFollowUps ?? 0}
          />
        )}
      </div>

      {/* Breakdowns */}
      {(sourceItems.length > 0 ||
        (stats.courses && stats.courses.length > 0 && statusItems.length > 0)) && (
        <div className="space-y-1.5 border-t border-[#E9E9E7] pt-3">
          {sourceItems.length > 0 && (
            <InlineRow label="Top sources" items={sourceItems} />
          )}

          {stats.courses &&
            stats.courses.length > 0 &&
            statusItems.length > 0 && (
              <InlineRow label="Lead status" items={statusItems} />
            )}
        </div>
      )}
    </div>
  );
}