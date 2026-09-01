import React from 'react';
import { 
  Users, 
  UserPlus, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  BookOpen, 
  Share2, 
  Building2,
  Calendar1
} from "lucide-react";

// --- Compact Trend Badge ---
const TrendBadge = ({ trend }) => {
  if (trend === undefined || trend === null) return null;
  
  const isPositive = trend > 0;
  const isNegative = trend < 0;
  
  return (
    <div className="flex items-center gap-1 text-[11px]">
      {isPositive && (
        <span className="flex items-center font-medium text-emerald-600 bg-emerald-50/50 px-1 py-0.5 rounded w-fit">
          <TrendingUp size={12} className="mr-0.5" />
          {trend}%
        </span>
      )}
      {isNegative && (
        <span className="flex items-center font-medium text-rose-600 bg-rose-50/50 px-1 py-0.5 rounded w-fit">
          <TrendingDown size={12} className="mr-0.5" />
          {Math.abs(trend)}%
        </span>
      )}
      {trend === 0 && (
        <span className="flex items-center font-medium text-gray-500 bg-gray-50 px-1 py-0.5 rounded">
          <Minus size={12} className="mr-0.5" />
          0%
        </span>
      )}
      <span className="text-gray-400">Past 7d</span>
    </div>
  );
};


// --- Main Compact Stats Component ---
export default function DashboardStats({ stats }) {
  if (!stats) return null;
const grrasCount =
  stats?.froms?.find((item) => item.name === "GRRAS")?.count || 0;

const ap2vCount =
  stats?.froms?.find((item) => item.name === "ap2v")?.count || 0;
  return (
    <div className="px-4 sm:px-8 py-2 space-y-4 mt-3">
      
      {/* SECTION 1: Primary Overview Cards (Denser) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        
        {/* Total Leads */}
        <div className="grid grid-cols-2 sm:grid-cols-4 col-span-3">
        <div className="bg-white p-3.5 border border-dashed border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06)] transition-all duration-200">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-1.5">
              <Users size={14} className="text-gray-800" />
              <h2 className="text-xs font-bold text-gray-800">Total Leads</h2>
              <div>
                
              </div>
            </div>
            
          </div>
          <div className='flex flex-col sm:flex-row gap-2 justify-between'>
          <h3 className="text-3xl font-semibold text-gray-900 tracking-tight mb-2">
            {stats.totalLeads?.count || 0}
          </h3>
          
          <TrendBadge trend={stats.totalLeads?.trend} />
          </div>
        </div>

        {/* New Leads */}
        <div className="bg-white p-3.5 border-dashed border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06)] transition-all duration-200">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-1.5">
              <UserPlus size={14} className="text-gray-800" />
              <h2 className="text-xs font-bold text-gray-800">Untouched</h2>
            </div>
            
          </div>
          <div className='flex lex-col sm:flex-row gap-2 justify-between'>
          <h3 className="text-3xl font-semibold text-gray-900 tracking-tight mb-2">
            {stats.newLeads?.count || 0}
          </h3>
          <TrendBadge trend={stats.newLeads?.trend} />
          </div>
        </div>
        {/* GRRAS Leads */}
<div className="bg-white p-3.5 border-dashed border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06)] transition-all duration-200">
  <div className="flex justify-between items-start mb-2">
    <div className="flex items-center gap-1.5">
      <Building2 size={14} className="text-gray-400" />
      <h2 className="text-xs font-medium text-gray-600">GRRAS Leads</h2>
    </div>
  </div>

  <h3 className="text-3xl font-semibold text-gray-900 tracking-tight mb-2">
    {grrasCount}
  </h3>
</div>

{/* AP2V Leads */}
<div className="bg-white p-3.5 border-dashed border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06)] transition-all duration-200">
  <div className="flex justify-between items-start mb-2">
    <div className="flex items-center gap-1.5">
      <UserPlus size={14} className="text-gray-400" />
      <h2 className="text-xs font-medium text-gray-600">AP2V Leads</h2>
    </div>
  </div>

  <h3 className="text-3xl font-semibold text-gray-900 tracking-tight mb-2">
    {ap2vCount}
  </h3>
</div>

        </div>
        <div className='col-span-2'>
            {stats.sources && stats.sources.length > 0 && (
          <div>
            <h3 className="text-[14px] font-bold text-gray-800  tracking-wider mb-3">Top Sources</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6">
              {stats.sources.slice(0, 6).map((source) => (
                <div key={source.name} className="bg-white p-3 border border-dashed border-gray-200">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Share2 size={12} className="text-gray-400" />
                    <h2 className="text-[11px] font-medium text-gray-500 truncate leading-none">{source.name}</h2>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 leading-none">{source.count}</h3>
                </div>
              ))}
            </div>
          </div>
        )}
        
        </div>
      </div>

      {/* SECTION 2: Top Sources & Courses (Compact Grids) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Top Sources */}
         {stats.courses && stats.courses.length > 0 && (
          <div>
            <h3 className="text-[14px] font-bold text-gray-800  tracking-wider mb-3">Lead Status</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 mb-3">
  {Object.entries(stats.statuses)
    .filter((_, index) => index !== 5)
.slice(3, 8)
    .map(([name, count]) => (
      <div
        key={name}
        className="bg-white p-3  border border-dashed border-gray-200"
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <BookOpen size={12} className="text-gray-400" />

          <h2 className="text-[11px] font-medium text-gray-500 truncate leading-none">
            {name || "Not Provided"}
          </h2>
        </div>

        <h3 className="text-xl font-semibold text-gray-800 leading-none">
          {count}
        </h3>
      </div>
    ))}
    <div
        className="bg-white p-3  border border-dashed border-gray-200"
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <Calendar1 size={12} className="text-gray-400" />

          <h2 className="text-[11px] font-medium text-gray-500  leading-none">
            Today Follow Up
          </h2>
        </div>

        <h3 className="text-xl font-semibold text-gray-800 leading-none">
          {stats.todayFollowUps}
        </h3>
      </div>
</div>
          </div>
        )}

        {/* Top Courses */}
       
        
      </div>
    </div>
  );
}