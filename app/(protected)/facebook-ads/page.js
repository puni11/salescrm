"use client";

import BackButton from "@/lib/BackButton";
import { useCallback, useEffect, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Facebook Ads dashboard — redesigned                                */
/*  1. Hero: the 5 numbers that decide the next action                */
/*  2. Priorities: per-ad numbers first, all-ads totals as context    */
/*  3. Stacked funnel + status mix + campaign area chart + scatter    */
/*  4. Insights + ad health                                           */
/*  5. Leaderboard, trends, full table, lead details                  */
/* ------------------------------------------------------------------ */

const COLORS = {
  "New Lead": "#3b82f6",
  "Call Back": "#f59e0b",
  Interested: "#8b5cf6",
  "Course Interested": "#a855f7",
  "Follow Up": "#f97316",
  "Demo Requested": "#06b6d4",
  Converted: "#059669",
  Registered: "#22c55e",
  Invalid: "#ef4444",
  "Not Interested": "#94a3b8",
};
const WARM = ["Interested", "Course Interested", "Demo Requested", "Follow Up", "Registered", "Converted"];
const WON = ["Registered", "Converted"];
const PENDING = ["New Lead", "Call Back"];

const num = (v) => (Number(v) || 0).toLocaleString("en-IN");
const pct = (a, b) => (b ? (Number(a || 0) / Number(b)) * 100 : 0);
const pctText = (a, b, d = 1) => `${pct(a, b).toFixed(d)}%`;
const sum = (s, keys) => keys.reduce((t, k) => t + (Number(s?.[k]) || 0), 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmtDate = (v) => {
  const d = new Date(v);
  return !v || Number.isNaN(d.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
};
const txt = (v, fallback = "—") =>
  v == null || v === "" ? fallback : typeof v === "object" ? v.name || v.$oid || fallback : String(v);

function adMetrics(ad) {
  const s = ad.statuses || {};
  const total = Number(ad.totalLeads) || 0;
  const warm = sum(s, WARM);
  const won = sum(s, WON);
  return {
    total, warm, won,
    invalid: Number(s.Invalid) || 0,
    pending: sum(s, PENDING),
    lost: Number(s["Not Interested"]) || 0,
    warmRate: pct(warm, total),
    wonRate: pct(won, total),
    invalidRate: pct(s.Invalid || 0, total),
  };
}

/* ------------------------------ Primitives ------------------------------ */

function Panel({ title, subtitle, right, children, className = "", dark = false }) {
  return (
    <section
      className={`min-w-0 rounded-[20px] border p-4 sm:p-5 ${
        dark
          ? "border-white/10 bg-[#111015] text-white shadow-[0_12px_32px_-16px_rgba(0,0,0,0.6)]"
          : "border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-16px_rgba(16,24,40,0.12)]"
      } ${className}`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className={`text-[15px] font-semibold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>{title}</h2>
          {subtitle && <p className={`mt-0.5 text-xs leading-5 ${dark ? "text-slate-400" : "text-slate-500"}`}>{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Pill({ status }) {
  const c = COLORS[status] || "#64748b";
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: `${c}1a`, color: c }}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c }} />
      {status}
    </span>
  );
}

function Bar({ value, max, color, height = "h-2" }) {
  return (
    <div className={`${height} overflow-hidden rounded-full bg-slate-100`}>
      <div className="h-full rounded-full transition-all" style={{ width: `${clamp((value / Math.max(max, 1)) * 100, value > 0 ? 3 : 0, 100)}%`, background: color }} />
    </div>
  );
}

/* ------------------------------ Funnel: stacked layers ------------------------------ */
/* The silhouette is illustrative (classic marketing funnel).
   The numbers beside each layer are the real data. */

const FUNNEL_SHADES = [
  ["#e3e8f2", "#334155"],
  ["#d0d8e8", "#334155"],
  ["#bcc8de", "#1e293b"],
  ["#a2b1cf", "#1e293b"],
  ["#8497bb", "#ffffff"],
  ["#667ca6", "#ffffff"],
];

function FunnelStack({ stages }) {
  const top = Math.max(stages[0]?.value || 1, 1);
  const n = stages.length;
  const widthAt = (i) => 100 - (i * 70) / n; // 100% at the rim, 30% at the neck

  return (
    <div className="pt-3">
      {stages.map((st, i) => {
        const a = ((100 - widthAt(i)) / 2).toFixed(2);
        const b = ((100 - widthAt(i + 1)) / 2).toFixed(2);
        const [bg, fg] = FUNNEL_SHADES[Math.min(i, FUNNEL_SHADES.length - 1)];
        const prev = i ? stages[i - 1] : null;
        const lost = prev ? Math.max(0, prev.value - st.value) : 0;
        return (
          <div key={st.short} className="flex items-center gap-3 sm:gap-5" style={{ marginTop: i ? 6 : 0 }}>
            <div className="relative w-[46%] max-w-[280px] shrink-0">
              {i === 0 && (
                <div className="absolute inset-x-0 -top-3 h-6 rounded-[50%] border border-slate-200" style={{ background: "#eef1f7" }} />
              )}
              <div
                className="relative flex h-[54px] items-center justify-center px-2 text-center text-[11px] font-semibold sm:text-xs"
                style={{
                  background: bg,
                  color: fg,
                  clipPath: `polygon(${a}% 0, ${100 - a}% 0, ${100 - b}% 100%, ${b}% 100%)`,
                }}
              >
                {st.short}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-lg font-semibold tabular-nums text-slate-900">{num(st.value)}</span>
                <span className="text-xs font-medium text-slate-500">{pctText(st.value, top, 1)} of all leads</span>
              </div>
              <p className="truncate text-[11px] text-slate-500" title={st.label}>
                {st.label}
                {lost > 0 && (
                  <span className="text-rose-500"> · −{num(lost)} ({pctText(lost, prev.value, 0)}) vs {prev.short.toLowerCase()}</span>
                )}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------ Charts ------------------------------ */

function Donut({ counts, total }) {
  const entries = Object.entries(counts || {}).filter(([, v]) => Number(v) > 0).sort((a, b) => b[1] - a[1]);
  const R = 62, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex items-center justify-center">
      <div className="w-full max-w-[190px]">
        <svg viewBox="0 0 160 160" className="w-full">
          <circle cx="80" cy="80" r={R} fill="none" stroke="#f1f5f9" strokeWidth="16" />
          {entries.map(([k, v]) => {
            const len = (Number(v) / Math.max(total, 1)) * C;
            const dashOffset = offset;
            offset += len;
            return (
              <circle key={k} cx="80" cy="80" r={R} fill="none" stroke={COLORS[k] || "#94a3b8"} strokeWidth="16"
                strokeDasharray={`${Math.max(len - 1.5, 0)} ${C}`} strokeDashoffset={-dashOffset} transform="rotate(-90 80 80)" strokeLinecap="butt">
                <title>{`${k}: ${num(v)} (${pctText(v, total, 1)})`}</title>
              </circle>
            );
          })}
          <text x="80" y="76" textAnchor="middle" className="fill-slate-900 text-[22px] font-semibold">{num(total)}</text>
          <text x="80" y="94" textAnchor="middle" className="fill-slate-500 text-[9px] tracking-wide">TOTAL LEADS</text>
        </svg>
      </div>
    </div>
  );
}

function StatusBars({ counts, total }) {
  const entries = Object.entries(counts || {}).filter(([, v]) => Number(v) > 0).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  if (!entries.length) return <p className="py-4 text-center text-sm text-slate-500">No status data available yet.</p>;
  return (
    <ul className="mt-4 space-y-2.5 border-t border-slate-100 pt-4">
      {entries.map(([k, v]) => (
        <li key={k} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
          <span className="flex min-w-0 items-center gap-2 text-xs text-slate-600">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[4px]" style={{ background: COLORS[k] || "#94a3b8" }} />
            <span className="truncate">{k}</span>
          </span>
          <span className="text-xs font-semibold tabular-nums text-slate-900">{num(v)} · {pctText(v, total, 0)}</span>
          <div className="col-span-2"><Bar value={v} max={max} color={COLORS[k] || "#94a3b8"} height="h-1.5" /></div>
        </li>
      ))}
    </ul>
  );
}

/* ---- Campaign outcomes: smooth area chart (dark) ---- */

const OUTCOME_SERIES = [
  { key: "won", label: "Won", color: "#a3e635" },
  { key: "warm", label: "Warm only", color: "#a78bfa" },
  { key: "pending", label: "Pending", color: "#38bdf8" },
  { key: "lost", label: "Not interested", color: "#fb923c" },
  { key: "invalid", label: "Invalid", color: "#f87171" },
];

// Monotone cubic interpolation: smooth curves that never overshoot below zero.
function monotoneSegs(pts) {
  const n = pts.length;
  if (n < 2) return [];
  const dx = [], m = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0]);
    m.push((pts[i + 1][1] - pts[i][1]) / dx[i]);
  }
  const t = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  return pts.slice(0, -1).map((p, i) => {
    const q = pts[i + 1], h = dx[i] / 3;
    return [[p[0] + h, p[1] + t[i] * h], [q[0] - h, q[1] - t[i + 1] * h], q];
  });
}
const fwdPath = (pts) =>
  pts.length < 2 ? "" : `M${pts[0][0]},${pts[0][1]}` + monotoneSegs(pts).map(([a, b, c]) => `C${a[0]},${a[1]} ${b[0]},${b[1]} ${c[0]},${c[1]}`).join("");
const revPath = (pts) =>
  pts.length < 2 ? "" : monotoneSegs(pts).map(([a, b], i) => [b, a, pts[i]]).reverse().map(([c1, c2, e]) => `C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${e[0]},${e[1]}`).join("");
const niceStep = (v) => {
  const p = 10 ** Math.floor(Math.log10(Math.max(v, 1)));
  const f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
};

function CampaignAreaChart({ ads }) {
  const [mode, setMode] = useState("overlay");
  const [hidden, setHidden] = useState({});
  const [hover, setHover] = useState(null);
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(99);

  const groups = useMemo(() => {
    const map = {};
    for (const a of ads) {
      const name = a.campaignName || "Unknown campaign";
      const g = (map[name] ||= { name, won: 0, warm: 0, pending: 0, lost: 0, invalid: 0, total: 0 });
      const m = adMetrics(a);
      g.won += m.won;
      g.warm += Math.max(0, m.warm - m.won);
      g.pending += m.pending;
      g.lost += m.lost;
      g.invalid += m.invalid;
      g.total += m.total;
    }
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 12);
  }, [ads]);

  const end = Math.min(to, groups.length - 1);
  const start = Math.max(0, Math.min(from, end - 1));
  const view = groups.slice(start, end + 1);
  const n = view.length;
  const active = OUTCOME_SERIES.filter((s) => !hidden[s.key]);

  const layers = [];
  let base = new Array(n).fill(0);
  for (const s of active) {
    const lo = mode === "stacked" ? base : new Array(n).fill(0);
    const hi = view.map((g, i) => lo[i] + g[s.key]);
    layers.push({ s, lo, hi });
    if (mode === "stacked") base = hi;
  }
  const maxVal = Math.max(0, ...layers.flatMap((l) => l.hi));
  const step = niceStep(maxVal / 4);
  const yMax = step * 4;

  const W = 760, H = 340, L = 38, R = 16, T = 14, B = 66;
  const X = (i) => (n < 2 ? L + (W - L - R) / 2 : L + (i * (W - L - R)) / (n - 1));
  const Y = (v) => H - B - (v / yMax) * (H - T - B);
  const hv = hover != null && hover < n ? hover : null;

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(n < 2 ? 0 : clamp(Math.round(((px - L) / (W - L - R)) * (n - 1)), 0, n - 1));
  };

  const toggle = (
    <div className="flex rounded-full border border-white/15 p-0.5 text-xs font-medium">
      {[["overlay", "Overlay"], ["stacked", "Stacked"]].map(([key, label]) => (
        <button key={key} onClick={() => setMode(key)} className={`rounded-full px-3 py-1 transition ${mode === key ? "bg-lime-300 text-black" : "text-slate-300 hover:text-white"}`}>
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <Panel dark title="Campaign outcomes" subtitle="Per campaign · hover for exact counts · click a legend item to hide it" right={toggle}>
      <style>{`
        .dual-range{position:absolute;inset:0;width:100%;height:100%;margin:0;appearance:none;-webkit-appearance:none;background:transparent;pointer-events:none}
        .dual-range::-webkit-slider-thumb{-webkit-appearance:none;pointer-events:auto;width:10px;height:24px;border-radius:4px;background:#bef264;cursor:ew-resize;border:0}
        .dual-range::-moz-range-thumb{pointer-events:auto;width:10px;height:24px;border-radius:4px;background:#bef264;cursor:ew-resize;border:0}
      `}</style>

      <div className="mb-2 flex flex-wrap justify-end gap-x-4 gap-y-1.5">
        {OUTCOME_SERIES.map((s) => (
          <button key={s.key} onClick={() => setHidden((h) => ({ ...h, [s.key]: !h[s.key] }))} className={`flex items-center gap-1.5 text-xs transition ${hidden[s.key] ? "text-slate-600 line-through" : "text-slate-300"}`}>
            <span className="h-2 w-2 rounded-full" style={{ background: hidden[s.key] ? "#475569" : s.color }} />
            {s.label}
          </button>
        ))}
      </div>

      {n === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">No campaign data available.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-pan-y select-none" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="Campaign outcomes area chart">
              <defs>
                {OUTCOME_SERIES.map((s) => (
                  <linearGradient key={s.key} id={`co-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity={mode === "stacked" ? 0.55 : 0.4} />
                    <stop offset="100%" stopColor={s.color} stopOpacity={mode === "stacked" ? 0.15 : 0.03} />
                  </linearGradient>
                ))}
              </defs>

              {[0, 1, 2, 3, 4].map((k) => (
                <g key={k}>
                  <line x1={L} x2={W - R} y1={Y(k * step)} y2={Y(k * step)} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 5" />
                  <text x={L - 8} y={Y(k * step) + 4} textAnchor="end" fill="#94a3b8" fontSize="11">{num(k * step)}</text>
                </g>
              ))}

              {view.map((g, i) => (
                <text key={g.name} x={X(i)} y={H - B + 18} transform={`rotate(-28 ${X(i)} ${H - B + 18})`} textAnchor="end" fill="#94a3b8" fontSize="10.5">
                  {g.name.length > 18 ? `${g.name.slice(0, 17)}…` : g.name}
                  <title>{g.name}</title>
                </text>
              ))}

              {layers.map(({ s, lo, hi }) => {
                const topPts = hi.map((v, i) => [X(i), Y(v)]);
                const botPts = lo.map((v, i) => [X(i), Y(v)]);
                const area = n > 1 ? `${fwdPath(topPts)}L${botPts[n - 1][0]},${botPts[n - 1][1]}${revPath(botPts)}Z` : "";
                return (
                  <g key={s.key}>
                    {area && <path d={area} fill={`url(#co-${s.key})`} />}
                    {n > 1 && <path d={fwdPath(topPts)} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" />}
                    {topPts.map(([cx, cy], i) => (
                      <circle key={i} cx={cx} cy={cy} r={hv === i ? 4.5 : 3} fill={s.color} stroke="#111015" strokeWidth="1.5" />
                    ))}
                  </g>
                );
              })}

              {hv != null && (() => {
                const g = view[hv];
                const cx = X(hv), w = 200, h = 46 + active.length * 17;
                const tx = cx + 14 + w > W - 4 ? cx - 14 - w : cx + 14;
                const ty = T + 4;
                return (
                  <g pointerEvents="none">
                    <line x1={cx} x2={cx} y1={T} y2={H - B} stroke="rgba(255,255,255,0.28)" strokeDasharray="3 3" />
                    <rect x={tx} y={ty} width={w} height={h} rx="8" fill="#1c1b22" stroke="rgba(255,255,255,0.14)" />
                    <text x={tx + 12} y={ty + 19} fill="#fff" fontSize="12" fontWeight="600">{g.name.length > 26 ? `${g.name.slice(0, 25)}…` : g.name}</text>
                    <text x={tx + 12} y={ty + 34} fill="#94a3b8" fontSize="10.5">{num(g.total)} leads · {pctText(g.won, g.total, 1)} won</text>
                    {active.map((s, k) => (
                      <g key={s.key}>
                        <circle cx={tx + 16} cy={ty + 50 + k * 17} r="3.5" fill={s.color} />
                        <text x={tx + 26} y={ty + 54 + k * 17} fill="#cbd5e1" fontSize="11">{s.label}</text>
                        <text x={tx + w - 12} y={ty + 54 + k * 17} fill="#fff" fontSize="11" fontWeight="600" textAnchor="end">{num(g[s.key])}</text>
                      </g>
                    ))}
                  </g>
                );
              })()}
            </svg>
          </div>
        </div>
      )}

      {groups.length > 3 && (
        <div className="mt-2">
          <div className="relative h-6 rounded-md bg-white/5">
            <div className="absolute inset-y-0 rounded-md bg-lime-300/20" style={{ left: `${(start / (groups.length - 1)) * 100}%`, right: `${100 - (end / (groups.length - 1)) * 100}%` }} />
            <input type="range" className="dual-range" min={0} max={groups.length - 1} value={start} aria-label="Zoom start" onChange={(e) => setFrom(Math.min(Number(e.target.value), end - 1))} />
            <input type="range" className="dual-range" min={0} max={groups.length - 1} value={end} aria-label="Zoom end" onChange={(e) => setTo(Math.max(Number(e.target.value), start + 1))} />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">Showing campaigns {start + 1}–{end + 1} of {groups.length} (top 12 by lead volume). Drag the handles to zoom.</p>
        </div>
      )}
      <p className="mt-1 text-[11px] text-slate-500">Each point is one campaign, not a date. The curve just connects campaigns so the shape is easy to compare.</p>
    </Panel>
  );
}

function Scatter({ ads, onPick }) {
  const pts = ads.filter((a) => Number(a.totalLeads) >= 5).map((a) => ({ a, m: adMetrics(a) }));
  const maxX = Math.max(10, ...pts.map((p) => p.m.total));
  const avgWarm = pts.length ? pts.reduce((t, p) => t + p.m.warmRate, 0) / pts.length : 50;
  const W = 520, H = 300, P = 40;
  const x = (v) => P + (v / maxX) * (W - P - 18);
  const y = (v) => H - P - (v / 100) * (H - P - 28);
  return (
    <div>
      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Ad lead volume versus warm lead rate chart">
          {[0, 25, 50, 75, 100].map((t) => (
            <g key={t}><line x1={P} x2={W - 14} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeDasharray="4 4" /><text x={P - 7} y={y(t) + 3} textAnchor="end" className="fill-slate-400 text-[10px]">{t}%</text></g>
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}><line x1={x(t * maxX)} x2={x(t * maxX)} y1={12} y2={H - P} stroke="#f1f5f9" /><text x={x(t * maxX)} y={H - P + 15} textAnchor="middle" className="fill-slate-400 text-[10px]">{Math.round(t * maxX)}</text></g>
          ))}
          <line x1={P} x2={W - 14} y1={y(avgWarm)} y2={y(avgWarm)} stroke="#c4b5fd" strokeDasharray="6 4" strokeWidth="1.2" />
          <text x={W - 16} y={y(avgWarm) - 5} textAnchor="end" className="fill-violet-500 text-[9px]">avg warm {avgWarm.toFixed(0)}%</text>
          <text x={W / 2} y={H - 4} textAnchor="middle" className="fill-slate-500 text-[10px]">Total leads →</text>
          <text x={x(maxX * 0.78)} y={22} textAnchor="middle" className="fill-emerald-600 text-[9px] font-medium">SCALE ↑</text>
          <text x={x(maxX * 0.22)} y={22} textAnchor="middle" className="fill-violet-600 text-[9px] font-medium">SMALL BUT STRONG ↑</text>
          {pts.map(({ a, m }) => (
            <circle key={a.adId} cx={x(m.total)} cy={y(m.warmRate)} r={5 + Math.min(6, Math.sqrt(m.won) * 2)} fill={m.won > 0 ? "#6366f1" : "#cbd5e1"} fillOpacity=".55" stroke={m.won > 0 ? "#4f46e5" : "#94a3b8"} strokeWidth="1.2" className="cursor-pointer hover:fill-opacity-95" onClick={() => onPick(String(a.adId))}>
              <title>{`${a.adName}\n${num(m.total)} leads · ${m.warmRate.toFixed(1)}% warm · ${num(m.won)} won`}</title>
            </circle>
          ))}
        </svg>
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-500">Bigger dots = more wins. Top-right is where to put more budget. Top-left is worth testing at higher volume. Ads under 5 leads are excluded.</p>
    </div>
  );
}

function TrendChart({ ads }) {
  const days = useMemo(() => {
    const counts = new Map();
    for (const a of ads) {
      const d = a.latestLead?.createdAt ? new Date(a.latestLead.createdAt) : null;
      if (!d || Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      const prev = counts.get(key) || { label, value: 0 };
      counts.set(key, { label, value: prev.value + 1 });
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-14).map(([, v]) => v);
  }, [ads]);
  const max = Math.max(1, ...days.map((d) => d.value));
  const W = 620, H = 220, left = 32, bottom = 34, top = 14, right = 14;
  const x = (i) => left + (days.length <= 1 ? (W - left - right) / 2 : i * (W - left - right) / (days.length - 1));
  const y = (v) => H - bottom - (v / max) * (H - top - bottom);
  const path = days.map((d, i) => `${i ? "L" : "M"} ${x(i)} ${y(d.value)}`).join(" ");
  const area = days.length ? `${path} L ${x(days.length - 1)} ${H - bottom} L ${x(0)} ${H - bottom} Z` : "";
  if (!days.length) return <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">Recent timestamps will appear here when lead activity is available.</div>;
  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}><line x1={left} x2={W - right} y1={y(t * max)} y2={y(t * max)} stroke="#e2e8f0" strokeDasharray="3 4" /><text x={left - 7} y={y(t * max) + 3} textAnchor="end" className="fill-slate-400 text-[10px]">{Math.round(t * max)}</text></g>
        ))}
        <path d={area} fill="url(#trendFill)" />
        <path d={path} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {days.map((d, i) => (
          <g key={d.label}><circle cx={x(i)} cy={y(d.value)} r="3.5" fill="#6366f1" stroke="white" strokeWidth="1.5"><title>{`${d.label}: ${d.value} latest leads`}</title></circle><text x={x(i)} y={H - 13} textAnchor="middle" className="fill-slate-500 text-[9px]">{d.label}</text></g>
        ))}
      </svg>
    </div>
  );
}

function WinRateDistribution({ ads }) {
  const buckets = useMemo(() => {
    const defs = [
      { label: "0% won", test: (r) => r === 0 },
      { label: "1–10% won", test: (r) => r > 0 && r <= 10 },
      { label: "10–25% won", test: (r) => r > 10 && r <= 25 },
      { label: "25%+ won", test: (r) => r > 25 },
    ];
    const qualified = ads.filter((a) => Number(a.totalLeads) >= 10);
    return defs.map((d) => {
      const list = qualified.filter((a) => d.test(adMetrics(a).wonRate));
      return { ...d, ads: list.length, leads: list.reduce((t, a) => t + Number(a.totalLeads || 0), 0) };
    });
  }, [ads]);
  const max = Math.max(1, ...buckets.map((b) => b.ads));
  return (
    <div className="space-y-3.5">
      {buckets.map((b) => (
        <div key={b.label}>
          <div className="mb-1.5 flex justify-between gap-2 text-xs"><span className="font-medium text-slate-700">{b.label}</span><span className="tabular-nums text-slate-500">{b.ads} ads · {num(b.leads)} leads</span></div>
          <Bar value={b.ads} max={max} color={b.label === "25%+ won" ? "#059669" : b.label === "0% won" ? "#ef4444" : "#6366f1"} height="h-2.5" />
        </div>
      ))}
      <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">Only ads with 10+ leads are counted, so a single lucky lead can’t distort the picture.</p>
    </div>
  );
}

function CampaignQuality({ ads, onPick }) {
  const rows = useMemo(() => {
    const map = {};
    for (const a of ads) {
      const name = a.campaignName || "Unknown campaign";
      const g = (map[name] ||= { total: 0, won: 0, ad: a });
      const m = adMetrics(a);
      g.total += m.total; g.won += m.won;
      if (m.won >= adMetrics(g.ad).won) g.ad = a;
    }
    return Object.entries(map).map(([name, g]) => ({ name, ...g, rate: pct(g.won, g.total) }))
      .sort((a, b) => b.won - a.won).slice(0, 6);
  }, [ads]);
  if (!rows.length) return <p className="py-6 text-center text-sm text-slate-500">No campaign data available.</p>;
  return (
    <div className="space-y-3.5">
      {rows.map((r) => (
        <button key={r.name} onClick={() => onPick(String(r.ad.adId))} className="block w-full rounded-xl p-2 text-left transition hover:bg-slate-50">
          <div className="mb-1.5 flex justify-between gap-2 text-xs"><span className="min-w-0 truncate font-medium text-slate-700" title={r.name}>{r.name}</span><span className="shrink-0 font-semibold tabular-nums text-slate-900">{r.rate.toFixed(1)}% won · {num(r.won)} / {num(r.total)}</span></div>
          <Bar value={r.rate} max={Math.max(10, ...rows.map((x) => x.rate))} color="#10b981" />
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ Leaderboard + health ------------------------------ */

function Leaderboard({ ads, onPick, selected }) {
  const [mode, setMode] = useState("won");
  const modes = {
    won: { label: "Wins", note: "Registered + converted" },
    quality: { label: "Quality", note: "Warm-lead rate · 10+ leads only" },
    volume: { label: "Volume", note: "Total leads generated" },
  };
  const rows = useMemo(() => {
    const withM = ads.map((a) => ({ a, m: adMetrics(a) }));
    if (mode === "quality") return withM.filter((r) => r.m.total >= 10).sort((x, y) => y.m.warmRate - x.m.warmRate).slice(0, 8);
    if (mode === "volume") return withM.filter((r) => r.m.total > 0).sort((x, y) => y.m.total - x.m.total).slice(0, 8);
    return withM.filter((r) => r.m.won > 0).sort((x, y) => y.m.won - x.m.won).slice(0, 8);
  }, [ads, mode]);
  const score = (m) => (mode === "quality" ? m.warmRate : mode === "volume" ? m.total : m.won);
  const show = (m) => (mode === "quality" ? `${m.warmRate.toFixed(0)}% warm` : mode === "volume" ? `${num(m.total)} leads` : `${num(m.won)} won`);
  const max = Math.max(1, ...rows.map((r) => score(r.m)));
  const colors = ["#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#c4b5fd", "#ddd6fe", "#e0e7ff", "#e2e8f0"];
  return (
    <Panel title="Ad performance leaderboard" subtitle={modes[mode].note} right={
      <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-medium">
        {Object.entries(modes).map(([key, v]) => (
          <button key={key} onClick={() => setMode(key)} className={`rounded-lg px-2.5 py-1.5 transition sm:px-3 ${mode === key ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>{v.label}</button>
        ))}
      </div>
    }>
      {rows.length ? (
        <div className="space-y-1">
          {rows.map(({ a, m }, i) => (
            <button key={a.adId} onClick={() => onPick(String(a.adId))} className={`block w-full rounded-xl p-2.5 text-left transition hover:bg-slate-50 ${selected === String(a.adId) ? "bg-indigo-50 ring-1 ring-indigo-200" : ""}`}>
              <div className="mb-2 flex items-start gap-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${i === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{a.adName || "Unnamed ad"}</span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">{show(m)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{a.campaignName || "Campaign not available"} · {num(m.total)} leads · {m.wonRate.toFixed(1)}% won</p>
                </div>
              </div>
              <div className="ml-10"><Bar value={score(m)} max={max} color={colors[Math.min(i, colors.length - 1)]} /></div>
            </button>
          ))}
        </div>
      ) : <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">No ads qualify for this leaderboard view yet.</div>}
    </Panel>
  );
}

function AdHealth({ ads, onPick }) {
  const [mode, setMode] = useState("invalid");
  const modes = {
    invalid: { label: "Most invalid", color: "#f87171" },
    wins: { label: "Most wins", color: "#10b981" },
    quality: { label: "Warm rate", color: "#6366f1" },
  };
  const rows = useMemo(() => [...ads].map((a) => ({ a, m: adMetrics(a) }))
    .filter(({ m }) => m.total >= 10)
    .sort((x, y) => mode === "wins" ? y.m.won - x.m.won : mode === "quality" ? y.m.warmRate - x.m.warmRate : y.m.invalid - x.m.invalid)
    .slice(0, 5), [ads, mode]);
  const value = (m) => (mode === "wins" ? m.won : mode === "quality" ? m.warmRate : m.invalid);
  const max = Math.max(1, ...rows.map(({ m }) => value(m)));
  const color = modes[mode].color;
  return (
    <div>
      <div className="mb-3 flex rounded-xl bg-slate-100 p-1 text-xs font-medium">
        {Object.entries(modes).map(([key, v]) => (
          <button key={key} onClick={() => setMode(key)} className={`flex-1 rounded-lg px-2 py-1.5 transition ${mode === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>{v.label}</button>
        ))}
      </div>
      <div className="space-y-3">
        {rows.map(({ a, m }) => (
          <button key={a.adId} onClick={() => onPick(String(a.adId))} className="block w-full rounded-lg p-2 text-left transition hover:bg-slate-50">
            <div className="mb-1.5 flex items-center justify-between gap-2"><span className="min-w-0 truncate text-xs font-medium text-slate-700" title={a.adName}>{a.adName || "Unnamed ad"}</span><span className="shrink-0 text-xs font-semibold tabular-nums" style={{ color }}>{mode === "quality" ? `${value(m).toFixed(1)}%` : num(value(m))}</span></div>
            <Bar value={value(m)} max={max} color={color} />
            <div className="mt-1 text-[10px] text-slate-400">{num(m.total)} leads · {m.wonRate.toFixed(1)}% won · {m.invalidRate.toFixed(1)}% invalid</div>
          </button>
        ))}
        {!rows.length && <p className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">At least 10 leads per ad are needed for a meaningful comparison.</p>}
      </div>
    </div>
  );
}

/* ------------------------------ Insights ------------------------------ */

function InsightCard({ tone, kicker, title, metric, detail, actionLabel, onAction }) {
  const tones = {
    red: { ring: "border-rose-200", badge: "bg-rose-100 text-rose-700", btn: "bg-rose-600 hover:bg-rose-700" },
    green: { ring: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700", btn: "bg-emerald-600 hover:bg-emerald-700" },
    indigo: { ring: "border-indigo-200", badge: "bg-indigo-100 text-indigo-700", btn: "bg-indigo-600 hover:bg-indigo-700" },
    amber: { ring: "border-amber-200", badge: "bg-amber-100 text-amber-800", btn: "bg-amber-600 hover:bg-amber-700" },
  }[tone] || {};
  return (
    <div className={`rounded-2xl border bg-white p-4 ${tones.ring}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${tones.badge}`}>{kicker}</span>
        {metric && <span className="text-sm font-bold tabular-nums text-slate-900">{metric}</span>}
      </div>
      <h3 className="mt-2.5 text-sm font-semibold leading-snug text-slate-900">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
      {actionLabel && onAction && <button onClick={onAction} className={`mt-3 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition ${tones.btn}`}>{actionLabel}</button>}
    </div>
  );
}

function InsightsPanel({ total, invalid, topWins, topQuality, topPending, mostInvalid, onPick }) {
  const allInvalidRate = pct(invalid, total);
  const pick = (ad) => ad && onPick(String(ad.adId));
  const worst = mostInvalid && adMetrics(mostInvalid).invalid > 0 ? mostInvalid : null;
  const wm = worst ? adMetrics(worst) : null;
  const pm = topPending ? adMetrics(topPending) : null;
  const hasPending = pm && pm.pending > 0;
  const winM = topWins ? adMetrics(topWins) : null;
  const hasWin = winM && winM.won > 0;
  const qm = topQuality ? adMetrics(topQuality) : null;

  return (
    <div className="grid grid-cols-4 gap-3 space-y-3">
      <InsightCard
        tone={!wm ? "green" : wm.invalidRate > 12 ? "red" : wm.invalidRate > 6 ? "amber" : "green"}
        kicker={wm && wm.invalidRate > 12 ? "FIX FIRST" : "LEAD QUALITY"}
        title={worst ? `${worst.adName} has the most invalid leads` : "No ad has enough leads to flag yet"}
        metric={wm ? `${num(wm.invalid)} invalid` : undefined}
        detail={worst
          ? `${wm.invalidRate.toFixed(1)}% of this ad’s ${num(worst.totalLeads)} leads. Across all ads, ${num(invalid)} leads (${allInvalidRate.toFixed(1)}%) are invalid. Check targeting, form fields and audience overlap before spending more here.`
          : "Once an ad passes 20 leads, its invalid rate becomes a reliable signal."}
        actionLabel={worst ? "Inspect this ad →" : undefined}
        onAction={worst ? () => pick(worst) : undefined}
      />
      <InsightCard
        tone="amber"
        kicker="FOLLOW UP NOW"
        title={hasPending ? `${num(pm.pending)} leads in ${topPending.adName} are waiting for contact` : "Nothing waiting"}
        metric={hasPending ? `${num(pm.pending)} pending` : undefined}
        detail={hasPending ? "This is the biggest single queue. New Lead + Call Back leads go cold fastest — work this list before launching anything new." : "No pending leads in the current results."}
        actionLabel={hasPending ? "Open pending ad →" : undefined}
        onAction={hasPending ? () => pick(topPending) : undefined}
      />
      <InsightCard
        tone="green"
        kicker="SCALE THIS"
        title={hasWin ? `${topWins.adName} is winning most` : "No wins yet"}
        metric={hasWin ? `${num(winM.won)} won` : undefined}
        detail={hasWin ? `${winM.wonRate.toFixed(1)}% of its ${num(topWins.totalLeads)} leads registered or converted. This is the creative and audience to put more budget behind.` : "No registered or converted leads are recorded yet. Review follow-up speed and qualification before judging creative."}
        actionLabel={hasWin ? "See its leads →" : undefined}
        onAction={hasWin ? () => pick(topWins) : undefined}
      />
      <InsightCard
        tone="indigo"
        kicker="QUALITY SIGNAL"
        title={topQuality ? `${topQuality.adName} has the warmest audience` : "Need more data"}
        metric={qm ? `${qm.warmRate.toFixed(1)}% warm` : undefined}
        detail={topQuality ? `Warm rate across ${num(topQuality.totalLeads)} leads. Warmth alone isn’t a win — compare it with wins before scaling.` : "Need an ad with 10+ leads to compare warm-lead quality fairly."}
        actionLabel={topQuality ? "Compare this ad →" : undefined}
        onAction={topQuality ? () => pick(topQuality) : undefined}
      />
      <p className="px-1 text-[11px] leading-4 text-slate-400">Suggested order of action: waste first, then waiting leads, then what to scale. Every number on a card belongs to the ad named on it.</p>
    </div>
  );
}

/* ------------------------------ Main page ------------------------------ */

export default function FacebookAdsPage() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedAdId, setSelectedAdId] = useState("");
  const [leadStatus, setLeadStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadStats = useCallback(async (q = "") => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("search", q.trim());
      const res = await fetch(`/api/facebook-ads?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Unable to load ad statistics.");
      setData(json);
    } catch (e) { setError(e.message || "Something went wrong."); }
    finally { setLoading(false); }
  }, []);

  const loadAdLeads = useCallback(async (adId) => {
    if (!adId) {
      setSelectedAdId(""); setLeadStatus("All");
      setData((current) => current ? { ...current, leads: [] } : current);
      return;
    }
    setSelectedAdId(adId); setLeadStatus("All"); setDetailsLoading(true); setError("");
    try {
      const res = await fetch(`/api/facebook-ads?${new URLSearchParams({ adId })}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Unable to load lead details.");
      setData((current) => current ? { ...current, leads: json.leads || [], leadDetailsLimit: json.leadDetailsLimit } : json);
    } catch (e) { setError(e.message || "Unable to load lead details."); }
    finally { setDetailsLoading(false); }
  }, []);

  // Opens an ad's leads and scrolls to them, so every "inspect" button visibly does something.
  const openAd = useCallback((id) => {
    loadAdLeads(id);
    setTimeout(() => document.getElementById("lead-details")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  }, [loadAdLeads]);

  useEffect(() => {
    const timer = setTimeout(() => loadStats(search), 250);
    return () => clearTimeout(timer);
  }, [search, loadStats]);

  const ads = data?.ads || [];
  const summary = data?.summary || { totalLeads: 0, totalAds: 0, statusCounts: {} };
  const sc = summary.statusCounts || {};
  const total = Number(summary.totalLeads) || 0;
  const won = sum(sc, WON);
  const warm = sum(sc, WARM);
  const pending = sum(sc, PENDING);
  const invalid = Number(sc.Invalid) || 0;
  const valid = Math.max(0, total - invalid);
  const contacted = Math.max(0, valid - pending);

  const stages = useMemo(() => [
    { short: "All leads", label: "All leads received", value: total },
    { short: "Valid", label: "Valid, not marked invalid", value: valid },
    { short: "Contacted", label: "Moved past New Lead / Call Back", value: contacted },
    { short: "Warm", label: "Showing real interest", value: warm },
    { short: "Won", label: "Registered or converted", value: won },
    { short: "Converted", label: "Fully converted", value: Number(sc.Converted) || 0 },
  ], [sc, total, valid, contacted, warm, won]);

  const biggestDrop = useMemo(() => stages.slice(1)
    .map((s, i) => ({ from: stages[i], to: s, lost: stages[i].value - s.value }))
    .sort((a, b) => b.lost - a.lost)[0], [stages]);

  const statusCols = Object.keys(COLORS);
  const selectedAd = ads.find((a) => String(a.adId) === selectedAdId);
  const recent = useMemo(() => ads.filter((a) => a.latestLead?.createdAt)
    .sort((a, b) => new Date(b.latestLead.createdAt) - new Date(a.latestLead.createdAt)).slice(0, 5), [ads]);
  const cleanest = useMemo(() => [...ads].filter((a) => a.totalLeads >= 20).sort((a, b) => adMetrics(a).invalidRate - adMetrics(b).invalidRate).slice(0, 4), [ads]);
  const mostInvalid = useMemo(() => [...ads].filter((a) => a.totalLeads >= 20).sort((a, b) => adMetrics(b).invalid - adMetrics(a).invalid)[0], [ads]);
  const topWins = useMemo(() => [...ads].sort((a, b) => adMetrics(b).won - adMetrics(a).won)[0], [ads]);
  const topQuality = useMemo(() => [...ads].filter((a) => a.totalLeads >= 10).sort((a, b) => adMetrics(b).warmRate - adMetrics(a).warmRate)[0], [ads]);
  const topPending = useMemo(() => [...ads].sort((a, b) => adMetrics(b).pending - adMetrics(a).pending)[0], [ads]);
  const largestStatus = Object.entries(sc).sort((a, b) => (b[1] || 0) - (a[1] || 0))[0];
  const allLeads = data?.leads || [];
  const leadStatuses = useMemo(() => ["All", ...new Set(allLeads.map((l) => txt(l.status, "Unassigned")))], [allLeads]);
  const filteredLeads = leadStatus === "All" ? allLeads : allLeads.filter((l) => txt(l.status, "Unassigned") === leadStatus);

  const heroKpis = [
    { label: "Total leads", value: num(total), sub: `${num(summary.totalAds)} ads in results`, rate: null, color: "#818cf8" },
    { label: "Registered / converted", value: num(won), sub: `${pctText(won, total, 1)} win rate`, rate: pct(won, total), color: "#34d399" },
    { label: "Warm leads", value: num(warm), sub: `${pctText(warm, total, 1)} of all leads`, rate: pct(warm, total), color: "#c084fc" },
    { label: "Awaiting contact", value: num(pending), sub: "New lead + call back — act first", rate: pct(pending, total), color: "#fbbf24" },
    { label: "Invalid leads", value: num(invalid), sub: `${pctText(invalid, total, 1)} of all leads`, rate: pct(invalid, total), color: "#f87171" },
  ];

  // Each priority leads with the named ad's own numbers; all-ads totals are context only.
  const pm = topPending ? adMetrics(topPending) : null;
  const im = mostInvalid ? adMetrics(mostInvalid) : null;
  const wm = topWins ? adMetrics(topWins) : null;
  const priorities = [
    {
      tone: "amber", title: "Follow up", target: pm?.pending > 0 ? topPending : null,
      big: pm?.pending > 0 ? `${num(pm.pending)} waiting` : "Nothing waiting",
      scope: pm && `${pctText(pm.pending, pm.total, 0)} of this ad’s ${num(pm.total)} leads`,
      overall: `All ads: ${num(pending)} awaiting contact (${pctText(pending, total, 0)})`,
      btn: "Open queue", empty: "No pending leads.",
    },
    {
      tone: "rose", title: "Fix targeting", target: im?.invalid > 0 ? mostInvalid : null,
      big: im?.invalid > 0 ? `${im.invalidRate.toFixed(0)}% invalid` : "No ad flagged",
      scope: im && `${num(im.invalid)} of ${num(im.total)} leads in this ad`,
      overall: `All ads: ${num(invalid)} invalid (${pctText(invalid, total, 1)})`,
      btn: "Inspect this ad", empty: "Needs an ad with 20+ leads.",
    },
    {
      tone: "emerald", title: "Scale what works", target: wm?.won > 0 ? topWins : null,
      big: wm?.won > 0 ? `${num(wm.won)} won` : "No wins yet",
      scope: wm && `${wm.wonRate.toFixed(1)}% of this ad’s ${num(wm.total)} leads`,
      overall: `All ads: ${num(won)} won (${pctText(won, total, 1)})`,
      btn: "See winning ad", empty: "No registered or converted leads.",
    },
  ];
  const priorityStyles = {
    amber: "border-amber-200 bg-amber-50/60",
    rose: "border-rose-200 bg-rose-50/60",
    emerald: "border-emerald-200 bg-emerald-50/60",
  };

  return (
    <main className="min-h-screen text-slate-900 font-sans">
      <div className="mx-auto max-w-[1600px] space-y-5">

        {/* HERO */}
        <header className="relative overflow-hidden p-5 text-black  ">
          
            <BackButton/>
          <div className="relative mt-2  flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl mt-2  font-semibold tracking-tight sm:text-[32px] sm:leading-9">Facebook Ads analytics</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-800">Lead quality first, volume second. The funnel shows where leads drop off — the cards above it tell you what to do about it.</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
              <div className="relative min-w-0 flex-1 xl:w-72">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-800">⌕</span>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ad, campaign or ID" className="w-full rounded-xl border border-black/15 bg-white/10 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white/15 focus:ring-4 focus:ring-indigo-500/20" />
              </div>
              <button onClick={() => loadStats(search)} disabled={loading} className="rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-slate-50 transition hover:bg-gray-900 disabled:cursor-wait disabled:opacity-60">{loading ? "Refreshing…" : "↻ Refresh"}</button>
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {heroKpis.map((k) => (
              <div key={k.label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                <div className="text-xs font-medium text-slate-700">{k.label}</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-[28px]">{k.value}</div>
                <div className="mt-1 truncate text-xs text-slate-600">{k.sub}</div>
                {k.rate != null && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/15"><div className="h-full rounded-full" style={{ width: `${clamp(k.rate, 2, 100)}%`, background: k.color }} /></div>}
              </div>
            ))}
          </div>
        </header>

        {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><span>{error}</span><button onClick={() => loadStats(search)} className="font-semibold underline">Try again</button></div>}

        {loading && !data ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200" />)}</div>
        ) : (
          <>
 <Panel title="Insights" subtitle="Each card is about the ad it names">
                  <InsightsPanel total={total} invalid={invalid} topWins={topWins} topQuality={topQuality} topPending={topPending} mostInvalid={mostInvalid} onPick={openAd} />
                </Panel>
            {/* PIPELINE + INSIGHTS */}
            <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-12">
              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:col-span-8">
                <Panel title="Lead funnel" subtitle="Layer shape is illustrative · numbers are real">
                  <FunnelStack stages={stages} />
                  {biggestDrop && biggestDrop.lost > 0 && (
                    <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                      Biggest loss: <span className="font-semibold text-slate-900">{biggestDrop.from.short} → {biggestDrop.to.short}</span>, {num(biggestDrop.lost)} leads ({pctText(biggestDrop.lost, biggestDrop.from.value, 0)}). Overall, <span className="font-semibold text-slate-900">{pctText(won, total, 2)}</span> of leads are registered or converted.
                    </div>
                  )}
                </Panel>
                  <Panel title="Cleanest ads" subtitle="Lowest invalid-lead rate, minimum 20 leads" className="mt-0">
                  <div className="space-y-3">
                    {cleanest.map((a) => {
                      const m = adMetrics(a);
                      return (
                        <button key={a.adId} onClick={() => openAd(String(a.adId))} className="block w-full rounded-lg p-2 text-left transition hover:bg-slate-50">
                          <div className="mb-1.5 flex justify-between gap-2"><span className="min-w-0 truncate text-xs font-medium text-slate-700" title={a.adName}>{a.adName || "Unnamed ad"}</span><span className="shrink-0 text-xs font-semibold tabular-nums text-emerald-600">{m.invalidRate.toFixed(1)}% invalid</span></div>
                          <Bar value={m.invalidRate} max={Math.max(10, ...cleanest.map((x) => adMetrics(x).invalidRate))} color="#10b981" />
                          <div className="mt-1 text-[10px] text-slate-400">{num(m.total)} leads · {m.wonRate.toFixed(1)}% won</div>
                        </button>
                      );
                    })}
                    {!cleanest.length && <p className="py-4 text-sm text-slate-500">No ad has 20+ leads yet.</p>}
                  </div>
                </Panel>
                <div className="min-w-0 sm:col-span-2">
                  <CampaignAreaChart ads={ads} />
                </div>
                
                <div className="min-w-0 sm:col-span-1">
                  <Panel title="Lead volume vs. quality" subtitle="Each dot is an ad · higher means a stronger warm-lead rate · bigger means more wins">
                    <Scatter ads={ads} onPick={openAd} />
                  </Panel>
                </div>
                <Panel title="Win-rate distribution" subtitle="How many ads actually convert?">
                <WinRateDistribution ads={ads} />
              </Panel>
              <Panel title="Campaign win rate" subtitle="Which campaigns turn leads into wins?">
                <CampaignQuality ads={ads} onPick={openAd} />
              </Panel>
             <Panel title="Latest activity" subtitle="Most recent lead timestamp available for each ad">
                  <div className="space-y-1">
                    {recent.map((a) => (
                      <button key={a.adId} onClick={() => openAd(String(a.adId))} className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl p-2 text-left transition hover:bg-slate-50">
                        <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{txt(a.latestLead?.name, a.adName || "Unnamed lead")}</p><p className="mt-0.5 text-xs text-slate-500">{fmtDate(a.latestLead?.createdAt)} · {a.adName || "Unnamed ad"}</p></div>
                        <Pill status={txt(a.latestLead?.status, "Unassigned")} />
                      </button>
                    ))}
                    {!recent.length && <p className="py-4 text-sm text-slate-500">No recent lead timestamps are available.</p>}
                  </div>
                </Panel>
              </div>

              <div className="min-w-0 space-y-4 xl:col-span-4">
                <Panel title="Ad health" subtitle="Top 5 ads · 10+ leads only · click to inspect">
                  <AdHealth ads={ads} onPick={openAd} />
                </Panel>
                 <Panel title="Lead status mix" subtitle="Share of leads by their current status">
                  <Donut counts={sc} total={total} />
                  <p className="mt-3 text-center text-xs text-slate-500">Largest status: <span className="font-semibold text-slate-900">{largestStatus?.[0] || "—"}</span> ({largestStatus ? pctText(largestStatus[1], total, 0) : "—"})</p>
                  <StatusBars counts={sc} total={total} />
                </Panel>
               <div className="sm:col-span-3"><Leaderboard ads={ads} onPick={openAd} selected={selectedAdId} /></div>
                
              </div>
            </div>

            {/* MORE CHARTS */}
            <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
              
              
            </div>

         

            {/* TABLE */}
            <Panel title="All ads" subtitle="Select any ad row to inspect its individual leads. Scroll horizontally for all status columns." right={<span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{num(ads.length)} ads</span>}>
              <div className="max-h-[65vh] overflow-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-xs text-slate-600"><tr>
                    <th className="sticky left-0 z-20 min-w-[240px] bg-slate-50 px-4 py-3 font-semibold">Ad</th><th className="min-w-[190px] px-4 py-3 font-semibold">Campaign</th><th className="px-4 py-3 text-right font-semibold">Leads</th>
                    {statusCols.map((s) => <th key={s} className="whitespace-nowrap px-3 py-3 text-right font-semibold" style={{ color: COLORS[s] }}>{s}</th>)}
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">Latest lead</th>
                  </tr></thead>
                  <tbody>{ads.map((a) => {
                    const id = String(a.adId);
                    return (
                      <tr key={id} onClick={() => openAd(id)} className={`cursor-pointer border-t border-slate-100 transition hover:bg-indigo-50/60 ${selectedAdId === id ? "bg-indigo-50" : "bg-white"}`}>
                        <td className={`sticky left-0 px-4 py-3 ${selectedAdId === id ? "bg-indigo-50" : "bg-white"}`}><div className="max-w-[220px] truncate font-medium text-slate-900">{a.adName || "Unnamed ad"}</div><div className="mt-1 font-mono text-[10px] text-slate-400">{id}</div></td>
                        <td className="px-4 py-3"><div className="max-w-[220px] truncate text-slate-600" title={a.campaignName}>{a.campaignName || "—"}</div></td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{num(a.totalLeads)}</td>
                        {statusCols.map((s) => { const v = Number(a.statuses?.[s]) || 0; const share = pct(v, a.totalLeads); return <td key={s} className="px-3 py-3 text-right tabular-nums" style={{ background: v ? `${COLORS[s]}${Math.round(Math.min(share * 1.3 + 8, 48)).toString(16).padStart(2, "0")}` : undefined, color: v ? "#334155" : "#cbd5e1" }}>{v || "–"}</td>; })}
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(a.latestLead?.createdAt)}</td>
                      </tr>
                    );
                  })}
                  {!ads.length && <tr><td colSpan={statusCols.length + 4} className="p-10 text-center text-slate-500">No ads match this search.</td></tr>}</tbody>
                </table>
              </div>
            </Panel>

            {/* LEAD DETAILS */}
            {selectedAdId && (
              <div id="lead-details">
                <Panel title={`Leads from ${selectedAd?.adName || "selected ad"}`} subtitle={`${selectedAd?.campaignName || ""} · ID ${selectedAdId}`} right={<button onClick={() => loadAdLeads("")} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Close details ×</button>}>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {leadStatuses.map((s) => (
                      <button key={s} onClick={() => setLeadStatus(s)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${leadStatus === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{s}</button>
                    ))}
                  </div>
                  {detailsLoading ? <div className="h-40 animate-pulse rounded-xl bg-slate-100" /> : filteredLeads.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No leads match this filter for this ad.</p> : (
                    <div className="max-h-[60vh] overflow-auto rounded-xl border border-slate-200">
                      <table className="w-full min-w-[900px] text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs text-slate-600"><tr>{["Name", "Phone", "Email", "Course", "Status", "Assigned to", "Created"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
                        <tbody>{filteredLeads.map((l, i) => <tr key={txt(l._id, i)} className="border-t border-slate-100 hover:bg-slate-50"><td className="px-4 py-3 font-medium">{txt(l.name, "Unnamed")}</td><td className="whitespace-nowrap px-4 py-3">{txt(l.phone)}</td><td className="px-4 py-3">{txt(l.email)}</td><td className="px-4 py-3">{txt(l.course)}</td><td className="px-4 py-3"><Pill status={txt(l.status, "Unassigned")} /></td><td className="px-4 py-3">{txt(l.assignedTo)}</td><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(l.createdAt)}</td></tr>)}</tbody>
                      </table>
                    </div>
                  )}
                  <p className="mt-3 text-xs text-slate-500">Showing {num(filteredLeads.length)} of up to {num(data?.leadDetailsLimit || 500)} leads for this ad.</p>
                </Panel>
              </div>
            )}
          </>
        )}
        <footer className="pb-2 text-center text-[11px] text-slate-400">Facebook Ads analytics · Metrics reflect the data returned by your current API.</footer>
      </div>
    </main>
  );
}