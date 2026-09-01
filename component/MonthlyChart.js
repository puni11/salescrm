"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

// 1. Custom Tooltip matching the white box with the decorative bottom bar
function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-4 flex flex-col items-center min-w-[140px] -translate-y-8 z-50">
      <div className="text-xl font-bold text-gray-900 tracking-tight">
        {payload[0].value.toLocaleString("en-US")}
      </div>
      <div className="text-xs text-gray-500 font-medium mt-0.5 mb-3">
        Leads
      </div>
      {/* Decorative progress bar matching the image */}
      <div className="w-full h-[3px] bg-blue-50 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full w-[65%]"></div>
      </div>
    </div>
  );
}

// 2. Custom Active Dot (renders the vertical line and target-style dot)
const CustomActiveDot = (props) => {
  const { cx, cy } = props;
  return (
    <g>
      {/* Vertical solid line dropping down from the point */}
      {/* (Extended height ensures it reaches the bottom of the chart area) */}
      <line x1={cx} y1={cy} x2={cx} y2={800} stroke="#3b82f6" strokeWidth={2} />
      
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={7} fill="#ffffff" stroke="#3b82f6" strokeWidth={2.5} />
      
      {/* Inner solid dot */}
      <circle cx={cx} cy={cy} r={2.5} fill="#3b82f6" />
    </g>
  );
};

export default function MonthlyChart({ data }) {
  const chartData = (data || []).map((d) => ({
    label: `${d.month}`,
    leads: d.leads,
  }));

  const totalLeads = chartData.reduce((sum, d) => sum + d.leads, 0);
  const activeMonths = chartData.filter((d) => d.leads > 0);
  const peak = activeMonths.reduce(
    (max, d) => (d.leads > max.leads ? d : max),
    { label: "-", leads: 0 }
  );

  return (
    <div className="bg-white border border-gray-200 border-dashed p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Leads Overview</h3>
          <p className="text-xs text-gray-400 mt-0.5">Jan – Dec {data?.[0]?.year || ""}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-100 px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          Leads
        </div>
      </div>

      {/* --- CHART SECTION --- */}
      <div className="h-[250px] w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {/* Very light soft blue gradient under the main line */}
              <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Dotted horizontal grid lines */}
            <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="3 3" />
            
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
              tickMargin={12}
            />
            
            <YAxis
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
              tickMargin={12}
              tickFormatter={(val) => (val === 0 ? "0" : `${val}`)}
            />
            
            {/* Disabled default cursor since the line is drawn in CustomActiveDot */}
            <Tooltip content={<CustomTooltip />} cursor={false} />
            
            <Area
              type="monotone"
              dataKey="leads"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#colorBlue)"
              dot={false} /* Removes regular dots completely */
              activeDot={<CustomActiveDot />} /* Shows target dot + line on hover */
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {/* ----------------------------- */}

      <div className="flex items-center gap-8 mt-4 pt-4 border-t border-gray-50">
        <div>
          <div className="text-xs text-gray-400">Total Leads</div>
          <div className="text-lg font-semibold text-gray-900">{totalLeads.toLocaleString("en-IN")}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Peak Month</div>
          <div className="text-lg font-semibold text-gray-900">
            {peak.label} <span className="text-sm font-normal text-gray-400">({peak.leads})</span>
          </div>
        </div>
      </div>
    </div>
  );
}