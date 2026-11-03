"use client";

import { useState } from "react";

const STATUS_TAGS = {
  "New Lead": [],
  Cold: [
    "Connected -Dropped Whatsapp",
    "Tried But Didn’t Connected",
    "Not Interested",
  ],
  Warm: [
    "Call after sometime",
    "Price Issue",
    "Timing Issues",
    "Counselled - Now Not Interested",
    "Follow Up",
  ],
  Hot: [
    "Interested",
    "Demo req",
    "Demo Done",
    "Walk in",
    "Next Batch",
    "Waiting for approval",
  ],
  Registered: [],
};

// dark = edge shade, mid = centre highlight, top = colour of the funnel's rim
const PALETTE = {
  "New Lead": { dark: "#334155", mid: "#7c8ba1", top: "#1e293b" },
  Cold: { dark: "#1d4ed8", mid: "#60a5fa", top: "#1e3a8a" },
  Warm: { dark: "#c2410c", mid: "#fb923c", top: "#7c2d12" },
  Hot: { dark: "#be123c", mid: "#fb7185", top: "#881337" },
  Registered: { dark: "#047857", mid: "#34d399", top: "#064e3b" },
};

// Funnel geometry (SVG units)
const VB_W = 360;
const CX = VB_W / 2;
const TOP_W = 340;
const BOTTOM_W = 120;
const BAND_H = 72;
const RY = 16; // ellipse depth that gives the 3D curve

export default function LeadPipeline({ data = [] }) {
  const [activeStage, setActiveStage] = useState(null);

  const stages = Object.keys(STATUS_TAGS)
    .map((status) => {
      const statusData = data.find((item) => item.status === status);

      if (!statusData || Number(statusData.count) <= 0) return null;

      const tagCounts = new Map(
        (statusData.tags || []).map((item) => [
          item.tag,
          Number(item.count) || 0,
        ])
      );

      return {
        status,
        count: Number(statusData.count) || 0,
        tags: STATUS_TAGS[status].map((tag) => ({
          tag,
          count: tagCounts.get(tag) || 0,
        })),
      };
    })
    .filter(Boolean);

  if (!stages.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900">Lead Pipeline</h3>
        <p className="text-xs text-gray-500 mt-3">
          No pipeline data available.
        </p>
      </div>
    );
  }

  const n = stages.length;
  const totalLeads = stages.reduce((sum, s) => sum + s.count, 0);
  const VB_H = RY + n * BAND_H + RY + 22; // + room for floor shadow

  const widthAt = (i) => TOP_W - ((TOP_W - BOTTOM_W) * i) / n;

  const geometry = stages.map((stage, i) => {
    const wt = widthAt(i);
    const wb = widthAt(i + 1);
    const yt = RY + i * BAND_H;
    const yb = yt + BAND_H;
    const d =
      `M ${CX - wt / 2} ${yt} A ${wt / 2} ${RY} 0 0 0 ${CX + wt / 2} ${yt} ` +
      `L ${CX + wb / 2} ${yb} A ${wb / 2} ${RY} 0 0 1 ${CX - wb / 2} ${yb} Z`;
    const cy = yt + BAND_H / 2 + RY / 2;
    return { stage, d, cy, yb, wt, wb };
  });

  const firstCy = geometry[0].cy;
  const lastCy = geometry[n - 1].cy;
  const pct = (y) => (y / VB_H) * 100;

  const activeIndex = stages.findIndex((s) => s.status === activeStage);
  const activeStageData = activeIndex >= 0 ? stages[activeIndex] : null;
  const showAbove = activeIndex >= n - 1 && n > 1;

  return (
    <section className="bg-white border border-gray-200 r p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Lead Pipeline</h3>
        <p className="text-xs text-gray-500 mt-1">
          Hover over a stage to see its tags
        </p>
      </div>

      <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-3 sm:gap-6 items-stretch">
        {/* ---------- Funnel ---------- */}
        <div className="relative">
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="w-full h-auto block"
            role="img"
            aria-label="Lead pipeline funnel"
          >
            <defs>
              {stages.map(({ status }) => (
                <linearGradient
                  key={status}
                  id={`lp-grad-${status.replace(/\s/g, "")}`}
                  x1="0"
                  x2="1"
                  y1="0"
                  y2="0"
                >
                  <stop offset="0%" stopColor={PALETTE[status].dark} />
                  <stop offset="35%" stopColor={PALETTE[status].mid} />
                  <stop offset="65%" stopColor={PALETTE[status].mid} />
                  <stop offset="100%" stopColor={PALETTE[status].dark} />
                </linearGradient>
              ))}
              <filter id="lp-blur" x="-20%" y="-100%" width="140%" height="300%">
                <feGaussianBlur stdDeviation="5" />
              </filter>
              <filter id="lp-text" x="-10%" y="-10%" width="120%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.35" />
              </filter>
            </defs>

            {/* floor shadow */}
            <ellipse
              cx={CX}
              cy={VB_H - 10}
              rx={BOTTOM_W / 2 + 10}
              ry="6"
              fill="#000"
              opacity="0.22"
              filter="url(#lp-blur)"
            />

            {/* bands: drawn bottom → top so each upper curve overlaps the next */}
            {[...geometry].reverse().map(({ stage, d }) => {
              const isActive = activeStage === stage.status;
              const dimmed = activeStage && !isActive;
              return (
                <path
                  key={stage.status}
                  d={d}
                  fill={`url(#lp-grad-${stage.status.replace(/\s/g, "")})`}
                  stroke="#fff"
                  strokeWidth="1.5"
                  strokeOpacity="0.55"
                  style={{
                    opacity: dimmed ? 0.55 : 1,
                    transition: "opacity 150ms, filter 150ms",
                    filter: isActive ? "brightness(1.08)" : "none",
                    cursor: "pointer",
                  }}
                  onMouseEnter={() => setActiveStage(stage.status)}
                  onMouseLeave={() => setActiveStage(null)}
                />
              );
            })}

            {/* rim of the funnel */}
            <ellipse
              cx={CX}
              cy={RY}
              rx={TOP_W / 2}
              ry={RY}
              fill={PALETTE[stages[0].status].top}
            />
            <ellipse
              cx={CX}
              cy={RY - 2}
              rx={TOP_W / 2 - 6}
              ry={RY - 4}
              fill="#fff"
              opacity="0.08"
            />

            {/* labels */}
            {geometry.map(({ stage, cy }) => (
              <g
                key={stage.status}
                pointerEvents="none"
                filter="url(#lp-text)"
                fill="#fff"
                textAnchor="middle"
              >
                <text
                  x={CX}
                  y={cy - 3}
                  fontSize="15"
                  fontWeight="700"
                  letterSpacing="0.5"
                >
                  {stage.status.toUpperCase()}
                </text>
                <text x={CX} y={cy + 15} fontSize="13" fontWeight="600" opacity="0.95">
                  {stage.count.toLocaleString("en-IN")}
                </text>
              </g>
            ))}
          </svg>

          {/* Tooltip */}
          {activeStageData && activeStageData.tags.length > 0 && (
            <div
              className="absolute left-1/2 w-64 max-w-[90%] -translate-x-1/2 bg-white border border-gray-200 rounded-xl shadow-xl p-3 pointer-events-none"
              style={{
                zIndex: 50,
                ...(showAbove
                  ? { bottom: `${100 - pct(geometry[activeIndex].yb - BAND_H + RY)}%` }
                  : { top: `${pct(geometry[activeIndex].yb)}%` }),
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-900">
                  {activeStageData.status} tags
                </p>
                <span className="text-[10px] font-semibold text-gray-500">
                  {activeStageData.count.toLocaleString("en-IN")} leads
                </span>
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {activeStageData.tags.map((item) => (
                  <div
                    key={item.tag}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-xs text-gray-600">{item.tag}</span>
                    <span className="text-xs font-semibold text-gray-900 bg-gray-100 rounded-md px-2 py-1">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ---------- Legend timeline ---------- */}
        <div className="relative">
          {/* vertical line */}
          <div
            className="absolute w-px bg-gray-400"
            style={{
              left: 8,
              top: `${pct(firstCy)}%`,
              height: `${pct(lastCy) - pct(firstCy)}%`,
            }}
          />

          {geometry.map(({ stage, cy }) => {
            const isActive = activeStage === stage.status;
            const c = PALETTE[stage.status];
            return (
              <button
                type="button"
                key={stage.status}
                className="absolute left-0 right-0 flex items-center gap-3 text-left -translate-y-1/2 outline-none focus-visible:ring-2 focus-visible:ring-gray-400 rounded"
                style={{ top: `${pct(cy)}%` }}
                onMouseEnter={() => setActiveStage(stage.status)}
                onMouseLeave={() => setActiveStage(null)}
                onFocus={() => setActiveStage(stage.status)}
                onBlur={() => setActiveStage(null)}
              >
                <span
                  className="shrink-0 w-4 h-4 rounded-full border border-white shadow-md transition-transform"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, ${c.mid}, ${c.dark})`,
                    transform: isActive ? "scale(1.3)" : "scale(1)",
                  }}
                />
                <span className="min-w-0">
                  <span className="block text-xs sm:text-sm font-bold text-gray-900 leading-tight">
                    {stage.status}
                  </span>
                  <span className="block text-[11px] text-gray-500">
                    {stage.count.toLocaleString("en-IN")} leads ·{" "}
                    {Math.round((stage.count / totalLeads) * 100)}%
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
        <span>Total displayed leads</span>
        <span className="font-semibold text-gray-900">
          {totalLeads.toLocaleString("en-IN")}
        </span>
      </div>
    </section>
  );
}