import React from 'react';
import { 
  Users, 
  UserPlus, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  BookOpen, 
  Share2 
} from "lucide-react";

// --- Compact Trend Badge ---
const TrendBadge = ({ trend }) => {
  if (trend === undefined || trend === null) return null;
  
  const isPositive = trend > 0;
  const isNegative = trend < 0;
  
  return (
    <div className="flex items-center gap-1 text-[11px]">
      {isPositive && (
        <span className="flex items-center font-medium text-emerald-600 bg-emerald-50/50 px-1 py-0.5 rounded">
          <TrendingUp size={12} className="mr-0.5" />
          {trend}%
        </span>
      )}
      {isNegative && (
        <span className="flex items-center font-medium text-rose-600 bg-rose-50/50 px-1 py-0.5 rounded">
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

  return (
    <div className="px-4 sm:px-8 py-2 space-y-4">
      
      {/* SECTION 1: Primary Overview Cards (Denser) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        
        {/* Total Leads */}
        <div className="bg-white p-3.5 rounded-lg border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06)] transition-all duration-200">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-1.5">
              <Users size={14} className="text-gray-400" />
              <h2 className="text-xs font-medium text-gray-600">Total Leads</h2>
            </div>
            
          </div>
          <h3 className="text-3xl font-semibold text-gray-900 tracking-tight mb-2">
            {stats.totalLeads?.count || 0}
          </h3>
          <TrendBadge trend={stats.totalLeads?.trend} />
        </div>

        {/* New Leads */}
        <div className="bg-white p-3.5 rounded-lg border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06)] transition-all duration-200">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-1.5">
              <UserPlus size={14} className="text-gray-400" />
              <h2 className="text-xs font-medium text-gray-600">Lead With No Status Change</h2>
            </div>
            
          </div>
          <h3 className="text-3xl font-semibold text-gray-900 tracking-tight mb-2">
            {stats.newLeads?.count || 0}
          </h3>
          <TrendBadge trend={stats.newLeads?.trend} />
        </div>
        <div className='col-span-3'>
            {stats.sources && stats.sources.length > 0 && (
          <div>
            <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Top Sources</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {stats.sources.slice(0, 6).map((source) => (
                <div key={source.name} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
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
         {stats.courses && stats.courses.length > 0 && (
          <div>
            <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-3">Top Courses</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {stats.courses.slice(0, 6).map((course) => (
                <div key={course.name} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <BookOpen size={12} className="text-gray-400" />
                    <h2 className="text-[11px] font-medium text-gray-500 truncate leading-none">{course.name || course.name==="" ? course.name : "Not Provided"}</h2>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 leading-none">{course.count}</h3>
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
        

        {/* Top Courses */}
       
        
      </div>
    </div>
  );
}