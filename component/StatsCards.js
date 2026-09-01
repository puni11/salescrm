"use client";

import { PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneOff, Clock } from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";

export default function StatsCards({ callSummary }) {
  const cs = callSummary || {};
  
  // Extract values, default to 0
  const incoming = cs.incoming || 0;
  const outgoing = cs.outgoing || 0;
  const missed = cs.missed || 0;
  const rejected = cs.rejected || 0;
  
  const totalCalls = incoming + outgoing + missed + rejected;
  const handledCalls = incoming + outgoing; // Used for the "handled" text

  // Center text (e.g., Answered/Handled rate)
  const successRate = totalCalls > 0 ? Math.round((handledCalls / totalCalls) * 100) : 0;

  // Data for the radial chart (ordered from innermost ring to outermost ring)
  const chartData = [
    { name: "Rejected", value: totalCalls ? (rejected / totalCalls) * 100 : 0, fill: "url(#gradRejected)" },
    { name: "Missed", value: totalCalls ? (missed / totalCalls) * 100 : 0, fill: "url(#gradMissed)" },
    { name: "Outgoing", value: totalCalls ? (outgoing / totalCalls) * 100 : 0, fill: "url(#gradOutgoing)" },
    { name: "Incoming", value: totalCalls ? (incoming / totalCalls) * 100 : 0, fill: "url(#gradIncoming)" },
  ];

  // Mapping for the side legend
  const ROWS = [
    { key: "incoming", label: "Incoming", count: incoming, dot: "bg-[#ff5874]" },
    { key: "outgoing", label: "Outgoing", count: outgoing, dot: "bg-[#2e93fb]" },
    { key: "missed", label: "Missed", count: missed, dot: "bg-[#ffb429]" },
    { key: "rejected", label: "Rejected", count: rejected, dot: "bg-gray-300" },
  ];

  return (
    <div className="bg-gray-50 border-dashed border border-gray-200 px-5 pt-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold text-gray-900">Call Summary</h3>
        <div className="flex items-center gap-1 text-[10px] text-gray-400 bg-white px-2 py-1 rounded border border-gray-100">
          <Clock size={12} />
          Avg {cs.averageDuration ?? 0}s
        </div>
      </div>

      <div className="flex-1 flex items-center justify-between gap-2 mt-2">
        
        {/* Radial Chart Container */}
        <div className="relative w-[150px] h-[150px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart 
              cx="50%" 
              cy="50%" 
              innerRadius="40%" 
              outerRadius="100%" 
              barSize={10} 
              data={chartData}
              startAngle={90} 
              endAngle={-270}
            >
              <defs>
                {/* Outer Ring */}
                <linearGradient id="gradIncoming" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ff5874" />
                  <stop offset="100%" stopColor="#ffa07a" />
                </linearGradient>
                {/* Middle Ring */}
                <linearGradient id="gradOutgoing" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#3ae2ce" />
                  <stop offset="100%" stopColor="#2e93fb" />
                </linearGradient>
                {/* Inner Ring */}
                <linearGradient id="gradMissed" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ffb429" />
                  <stop offset="100%" stopColor="#ff782c" />
                </linearGradient>
                {/* Innermost Ring (Added for 4th stat) */}
                <linearGradient id="gradRejected" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#e5e7eb" />
                  <stop offset="100%" stopColor="#9ca3af" />
                </linearGradient>
              </defs>
              
              {/* Force the domain to exactly 100% so bars fill proportionately */}
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              
              <RadialBar 
                minAngle={15} 
                background={{ fill: '#f1f3f5' }} 
                clockWise 
                dataKey="value" 
                cornerRadius={20} 
              />
            </RadialBarChart>
          </ResponsiveContainer>

          {/* Absolute Center Text styling identically to the image */}
          <div className="absolute inset-0 flex items-center justify-center">
            
            <span className="text-md font-light text-gray-600 tracking-tight flex items-start mt-1">
              {successRate}
              <span className="text-[9px] font-medium mt-2">%</span>
            </span>
          </div>
        
        </div>

        {/* Legend Grid */}
        <div className="flex-1 grid grid-cols-2 gap-y-4 gap-x-2 pl-2">
          {ROWS.map((row) => (
            <div key={row.key} className="flex flex-col">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-2.5 h-2.5 rounded-full ${row.dot}`} />
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{row.label}</span>
              </div>
              <div className="text-sm font-bold text-gray-900 pl-4">
                {row.count.toLocaleString("en-IN")}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 pt-1 pb-1 border-t border-gray-100 text-[11px] text-gray-400 text-center font-medium">
        {handledCalls.toLocaleString("en-IN")} total calls handled (30 Days)
      </div>
    </div>
  );
}