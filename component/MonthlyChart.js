"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";

const ACCENT = "#ff5a00";
const PLOT_HEIGHT = 230; // height of the stem area
const LABEL_SPACE = 40; // room above the tallest stem for the hover label

export default function MonthlyChart({ data }) {
  const [active, setActive] = useState(null);

  const chartData = (data || []).map((d) => ({
    label: String(d.month).slice(0, 3).toUpperCase(),
    leads: d.leads,
  }));

  const max = Math.max(...chartData.map((d) => d.leads), 1);
  const totalLeads = chartData.reduce((sum, d) => sum + d.leads, 0);
  const peak = chartData.reduce(
    (m, d) => (d.leads > m.leads ? d : m),
    { label: "-", leads: 0 }
  );

  return (
    <div className="h-full border border-dashed border-gray-300 p-5">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Leads Overview</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Jan – Dec {data?.[0]?.year || ""}
          </p>
        </div>
        <Link href="/leads" className="flex items-center gap-2 bg-black/5 px-3 py-1.5 text-xs text-gray-700">
          <span className="h-2 w-2 rounded-full" style={{ background: ACCENT }} />
          Leads
        </Link>
      </div>

      {/* Lollipop chart */}
      <div className="flex w-full" onMouseLeave={() => setActive(null)}>
        {chartData.map((d, i) => {
          const isActive = active === i;
          const dimmed = active !== null && !isActive;
          const stemHeight = (d.leads / max) * (PLOT_HEIGHT - LABEL_SPACE);

          return (
            <div
              key={d.label + i}
              tabIndex={0}
              role="button"
              aria-label={`${d.label}: ${d.leads} leads`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(isActive ? null : i)}
              className="flex flex-1 cursor-pointer flex-col items-center outline-none"
            >
              {/* Plot area */}
              <div
                className="relative flex w-full justify-center"
                style={{ height: PLOT_HEIGHT }}
              >
                <motion.div
                  className="absolute bottom-0 w-[1.5px]"
                  style={{ background: ACCENT }}
                  initial={{ height: 0 }}
                  animate={{ height: stemHeight, opacity: dimmed ? 0.35 : 1 }}
                  transition={{
                    height: { duration: 0.8, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] },
                    opacity: { duration: 0.2 },
                  }}
                >
                  {/* Dot */}
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
                    <motion.div
                      className="h-3 w-3 rounded-full"
                      style={{ background: ACCENT }}
                      initial={{ scale: 0 }}
                      animate={{ scale: isActive ? 1.9 : 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 22,
                        delay: isActive || active !== null ? 0 : i * 0.05 + 0.5,
                      }}
                    />
                  </div>

                  {/* Hover label above the dot */}
                  <AnimatePresence>
                    {isActive && (
                      <div className="absolute bottom-full left-1/2 mb-4 -translate-x-1/2">
                        <motion.div
                          className="whitespace-nowrap text-center text-[10px] font-medium uppercase tracking-widest text-gray-900"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          transition={{ duration: 0.18 }}
                        >
                          {d.leads.toLocaleString("en-IN")} Leads
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              {/* Vertical month label */}
              <div
                className="mt-3 flex h-12 items-start justify-center text-[11px] font-medium uppercase tracking-wider transition-colors"
                style={{
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  color: isActive ? "#111827" : "#6b7280",
                }}
              >
                {d.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 flex items-center gap-8 border-t border-black/10 pt-4">
        <div>
          <div className="text-xs text-gray-500">Total Leads</div>
          <div className="text-lg font-semibold text-gray-900">
            {totalLeads.toLocaleString("en-IN")}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Peak Month</div>
          <div className="text-lg font-semibold text-gray-900">
            {peak.label}{" "}
            <span className="text-sm font-normal text-gray-500">({peak.leads})</span>
          </div>
        </div>
      </div>
    </div>
  );
}