"use client";

export default function ProgressCard({ conversionRate }) {
  const pct = Math.round((conversionRate || 0) * 100);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="bg-white border border-dashed border-gray-100 shadow-sm px-4 py-2 h-full flex flex-col items-center justify-center">
      <h3 className="text-base font-semibold text-gray-900 self-start mb-2">Conversion Rate</h3>

      <div className="relative w-[120px] h-[120px] mt-1">
        <svg width="120" height="120" viewBox="0 0 100 100" className="-rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#F1F2F4" strokeWidth="10" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#2563EB"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-900">{pct}%</span>
          <span className="text-[10px] text-gray-400">converted</span>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-3 text-center">Leads that reached "Converted" status</p>
    </div>
  );
}