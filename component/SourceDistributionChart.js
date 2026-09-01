"use client";

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function SourceDistributionChart({ rawData = [] }) {
  // Consolidate data and calculate the header stats dynamically
  const { chartData, top3Total, otherTotal } = useMemo(() => {
    if (!Array.isArray(rawData)) {
      return { chartData: [], top3Total: 0, otherTotal: 0 };
    }

    const groupedData = {};

    rawData.forEach((item) => {
      const rawSource = item.source || "";
      const lowerSource = rawSource.toLowerCase().trim();
      let groupName = rawSource.trim();

      // Grouping logic
      if (["facebook lead form", "facebook", "fb", "facebook lead ads"].includes(lowerSource)) {
        groupName = "Facebook";
      } else if (["ig", "instagram"].includes(lowerSource)) {
        groupName = "Instagram";
      } else if (lowerSource === "website") {
        groupName = "Website";
      } else if (lowerSource.includes("direct")) {
        groupName = "Direct";
      } else if (lowerSource.includes("urvashi")) {
        groupName = "Urvashi leads";
      } else if (lowerSource === "") {
        groupName = "Unspecified";
      }

      if (!groupedData[groupName]) {
        groupedData[groupName] = 0;
      }
      groupedData[groupName] += item.count || 0;
    });

    // Convert to array and sort descending by count
    const sortedData = Object.keys(groupedData)
      .map((key) => ({
        source: key,
        count: groupedData[key],
      }))
      .sort((a, b) => b.count - a.count);

    // Calculate totals for the header boxes
    let top3 = 0;
    let others = 0;

    sortedData.forEach((item, index) => {
      if (index < 3) {
        top3 += item.count;
      } else {
        others += item.count;
      }
    });

    return { chartData: sortedData, top3Total: top3, otherTotal: others };
  }, [rawData]);

  // A formatter to truncate very long text on the X-axis so it doesn't overlap
  const formatXAxis = (tickItem) => {
    if (typeof tickItem === 'string' && tickItem.length > 10) {
      return `${tickItem.substring(0, 10)}...`;
    }
    return tickItem;
  };

  return (
    <div className="w-full max-w-5xl bg-white border border-dashed border-gray-200 font-sans overflow-hidden">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row border-b border-gray-200">
        
        {/* Title & Subtitle */}
        <div className="flex-1 p-6 flex flex-col justify-center">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Lead Source Distribution - Interactive
          </h2>
          <p className="text-gray-500 mt-1 text-sm">
            Showing total leads for the period
          </p>
        </div>

        {/* Stats Boxes */}
        <div className="flex flex-row border-t md:border-t-0 md:border-l border-gray-200 bg-white">
          <div className="px-8 py-5 flex flex-col justify-center items-center border-r border-gray-200 min-w-[180px]">
            <span className="text-sm text-gray-500 whitespace-nowrap mb-1">
              Top 3 Source Total
            </span>
            <span className="text-4xl font-extrabold text-black">
              {top3Total.toLocaleString()}
            </span>
          </div>
          <div className="px-8 py-5 flex flex-col justify-center items-center min-w-[180px]">
            <span className="text-sm text-gray-500 whitespace-nowrap mb-1">
              All Other Source Total
            </span>
            <span className="text-4xl font-extrabold text-black">
              {otherTotal.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="w-full h-[400px] pt-8 px-4 pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
          >
            {/* Solid horizontal lines, no vertical lines */}
            <CartesianGrid strokeDasharray="0" vertical={false} stroke="#f3f4f6" />
            
            <XAxis
              dataKey="source"
              axisLine={{ stroke: '#9ca3af' }} // Bottom grey axis line
              tickLine={{ stroke: '#9ca3af' }}
              tick={{ fill: '#6b7280', fontSize: 13 }}
              tickFormatter={formatXAxis}
              tickMargin={12}
              interval="preserveEnd"
            />
            
            {/* Hide Y-Axis completely as shown in the image */}
            <YAxis hide={true} />
            
            <Tooltip
              cursor={{ fill: "#f9fafb" }}
              contentStyle={{ 
                borderRadius: "4px", 
                border: "1px solid #e5e7eb", 
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)" 
              }}
            />
            
            <Bar
              dataKey="count"
              fill="#3b82f6" // The specific Google/Tailwind blue color
              barSize={28}   // Width of the vertical bars
              radius={[2, 2, 0, 0]} // Very slight rounding on the top only
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}