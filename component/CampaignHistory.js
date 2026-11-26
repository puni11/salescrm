"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3, Eye, Search, RefreshCw, ChevronRight, ChevronLeft, CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

/*
  Notion-style palette
  text #37352F · muted #787774 · hover #F7F6F3 · border rgba(55,53,47,.09)
  status: blue #2383E2 · green #448361 · purple #9065B0 · red #E03E3E · amber #CB912F
*/
const COLORS = { sent: "#2383E2", delivered: "#448361", read: "#9065B0", failed: "#E03E3E", pending: "#CB912F" };
const fmtDate = (value) => (value ? new Date(value).toLocaleString() : "—");
const num = (value) => Number(value || 0);
const unwrap = (json) => json?.data?.data ?? json?.data ?? json?.results ?? [];

const BORDER = "border-[rgba(55,53,47,.09)]";
const TH = "px-3 py-2.5 text-xs font-normal text-[#787774] whitespace-nowrap";
const TD = "px-3 py-3 align-middle";
const INPUT = `mt-1 w-full rounded-md border border-[rgba(55,53,47,.16)] bg-white px-2.5 py-1.5 text-sm outline-none transition placeholder:text-[#B4B2AD] focus:ring-2 focus:ring-[#2383E2]/40`;
const GHOST = "rounded-md border border-[rgba(55,53,47,.16)] px-3 py-1.5 text-sm hover:bg-[#F7F6F3] disabled:cursor-not-allowed disabled:opacity-40";

/* ---------------------------- Small pieces ---------------------------- */

function Tag({ children, tone = "gray" }) {
  const tones = {
    green: "bg-[#EDF3EC] text-[#1C3829]", red: "bg-[#FDEBEC] text-[#5D1715]", blue: "bg-[#E7F3F8] text-[#183347]",
    purple: "bg-[#F6F3F9] text-[#492F64]", amber: "bg-[#FBF3DB] text-[#402C1B]", gray: "bg-[#F1F0EE] text-[#5A5955]",
  };
  return <span className={`inline-flex rounded px-1.5 py-0.5 text-xs ${tones[tone]}`}>{children || "N/A"}</span>;
}

function Tabs({ items, value, onChange }) {
  return (
    <nav className={`mb-6 flex gap-1 overflow-x-auto border-b ${BORDER}`} role="tablist">
      {items.map(([id, label]) => (
        <button
          key={id}
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm transition ${
            value === id ? "border-[#37352F] font-medium text-[#37352F]" : "border-transparent text-[#787774] hover:bg-[#F7F6F3] hover:text-[#37352F]"
          }`}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

const Panel = ({ title, aside, children }) => (
  <section className={`mb-6 rounded-lg border ${BORDER} bg-white`}>
    {(title || aside) && (
      <div className={`flex flex-wrap items-center justify-between gap-2 border-b ${BORDER} px-4 py-3`}>
        <h2 className="text-sm font-semibold">{title}</h2>
        {aside}
      </div>
    )}
    {children}
  </section>
);

const Table = ({ min = 700, head, children }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm" style={{ minWidth: min }}>
      <thead className={`border-b ${BORDER}`}>
        <tr>{head.map((x) => <th key={x} className={TH}>{x}</th>)}</tr>
      </thead>
      <tbody className={`divide-y divide-[rgba(55,53,47,.09)]`}>{children}</tbody>
    </table>
  </div>
);

const Empty = ({ cols, children }) => (
  <tr><td colSpan={cols} className="px-3 py-14 text-center text-sm text-[#787774]">{children}</td></tr>
);

const Metric = ({ label, value, sub, color }) => (
  <div className="px-4 py-3">
    <div className="text-xs text-[#787774]">{label}</div>
    <div className="mt-1 text-2xl font-semibold tabular-nums" style={{ color }}>{value}</div>
    {sub && <div className="mt-0.5 text-xs text-[#787774]">{sub}</div>}
  </div>
);

/* ------------------------------ Main ------------------------------ */

export default function CampaignHistory() {
  const [mainTab, setMainTab] = useState("campaigns");
  const [detailTab, setDetailTab] = useState("overview");
  const [campaigns, setCampaigns] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reports, setReports] = useState([]);
  const [replies, setReplies] = useState([]);
  const [shortUrls, setShortUrls] = useState([]);
  const [shortStats, setShortStats] = useState(null);
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [replyOffset, setReplyOffset] = useState(0);
  const [urlOffset] = useState(0);
  const [clickOffset] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [detailSearch, setDetailSearch] = useState("");
  const [account, setSelectedAccount] = useState(null);
  const [pagination, setPagination] = useState(null);

  const api = useCallback(async (resource, params = {}) => {
    const query = new URLSearchParams({ resource, ...Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null)) });
    const response = await fetch(`/api/whatsapp/campaign-history?${query}`, { cache: "no-store" });
    const json = await response.json();
    if (!response.ok || json?.success === false || json?.status === false) throw new Error(json?.message || "Unable to fetch WhatsApp data.");
    return json;
  }, []);

  const loadCampaigns = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [waJson, reportJson] = await Promise.all([
        api("wa", { page }),
        api("report", { search, from, to, type: type === "all" ? "" : type, page, per_page: perPage }),
      ]);
      const waRows = unwrap(waJson);
      const reportRows = unwrap(reportJson);
      setCampaigns(Array.isArray(reportRows) ? reportRows : []);
      setReports(Array.isArray(reportRows) ? reportRows : []);
      if (!selected && Array.isArray(waRows) && waRows.length) setSelectedAccount(waRows[0]);
      setPagination(reportJson?.data || reportJson?.pagination || null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [api, page, perPage, search, from, to, type]);

  const loadAuxiliary = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (mainTab === "replies") {
        const json = await api("replies", { limit: 20, offset: replyOffset });
        setReplies(Array.isArray(json.data) ? json.data : unwrap(json));
        setPagination(json.pagination || null);
      } else if (mainTab === "urls") {
        const [list, stats, clickList] = await Promise.all([
          api("shortUrls", { limit: 100, offset: urlOffset }),
          api("shortUrlStats"),
          api("shortUrlClicks", { limit: 20, offset: clickOffset }),
        ]);
        setShortUrls(Array.isArray(list.data) ? list.data : unwrap(list));
        setShortStats(stats.data || null);
        setClicks(Array.isArray(clickList.data) ? clickList.data : unwrap(clickList));
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [api, mainTab, replyOffset, urlOffset, clickOffset]);

  useEffect(() => { if (mainTab === "campaigns") loadCampaigns(); else loadAuxiliary(); }, [mainTab, loadCampaigns, loadAuxiliary]);

  const openCampaign = (campaign) => { setSelected(campaign); setDetailTab("overview"); setDetailSearch(""); };
  const closeCampaign = () => setSelected(null);

  const totals = useMemo(() => {
    if (!selected) return { total: 0, sent: 0, delivered: 0, read: 0, failed: 0, pending: 0 };
    return {
      total: num(selected.total_report_count ?? selected.total),
      sent: num(selected.sent_count), delivered: num(selected.dlvd_count),
      read: num(selected.read_count), failed: num(selected.failed_count),
      pending: num(selected.pending_count) + num(selected.process_count),
    };
  }, [selected]);
  const pct = (n) => (totals.total ? (n / totals.total) * 100 : 0);

  const recipientRows = useMemo(() => {
    if (!selected) return [];
    const rows = selected.reports || selected.report || selected.details || (selected.single_report ? [selected.single_report] : []);
    return (Array.isArray(rows) ? rows : []).filter((r) => {
      const q = detailSearch.trim().toLowerCase();
      return !q || [r.mobile, r.wa_id, r.message_id, r.status, r.message_status, r.platform, r.agent_name].some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [selected, detailSearch]);

  const pieData = [
    { name: "Delivered", value: totals.delivered, color: COLORS.delivered },
    { name: "Read", value: totals.read, color: COLORS.read },
    { name: "Failed", value: totals.failed, color: COLORS.failed },
    { name: "Sent", value: totals.sent, color: COLORS.sent },
    { name: "Pending", value: totals.pending, color: COLORS.pending },
  ].filter((x) => x.value > 0);
  const barData = [{ name: "Sent", count: totals.sent }, { name: "Delivered", count: totals.delivered }, { name: "Read", count: totals.read }, { name: "Failed", count: totals.failed }];

  const tabs = [["campaigns", "Campaigns"], ["replies", "Template replies"], ["urls", "URL clicks"]];
  const detailTabs = [["overview", "Overview"], ["status", "Status breakdown"], ["failure", "Failure analysis"], ["report", "Detailed report"]];
  const statusTone = (s) => ({ delivered: "green", read: "purple", failed: "red", sent: "blue", accepted: "blue", pending: "amber" }[String(s || "").toLowerCase()] || "gray");
  const bodyText = (c) => c.template?.components?.find((x) => x.type === "BODY")?.text || c.single_report?.type || "—";

  const refresh = () => (mainTab === "campaigns" ? loadCampaigns() : loadAuxiliary());

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-[#37352F] sm:px-6 sm:py-4">
      <div className="mx-auto">
        {/* ---------- Page header ---------- */}
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Campaign history</h1>
              <p className="text-sm text-[#787774]">Track how your WhatsApp campaigns perform.</p>
            </div>
          </div>
          <button onClick={refresh} disabled={loading} className={`flex items-center gap-2 ${GHOST}`}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Refresh
          </button>
        </header>

        <Tabs items={tabs} value={mainTab} onChange={(id) => { setMainTab(id); setSelected(null); }} />

        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-lg bg-[#FDEBEC] px-3 py-2.5 text-sm text-[#9F2F2D]">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />{error}
          </div>
        )}

        {/* ===================== Campaign list ===================== */}
        {mainTab === "campaigns" && !selected && (
          <>
            <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.4fr)_140px_1fr_1fr]">
              <label className="text-xs text-[#787774]">Search
                <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Mobile number or message" className={INPUT} />
              </label>
              <label className="text-xs text-[#787774]">Type
                <select value={type} onChange={(e) => setType(e.target.value)} className={INPUT}>
                  <option value="all">All</option><option value="web">Web</option><option value="api">API</option><option value="chabot">Chatbot</option>
                </select>
              </label>
              <label className="text-xs text-[#787774]">From
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={INPUT} />
              </label>
              <label className="text-xs text-[#787774]">To
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={INPUT} />
              </label>
            </section>

            {/* Desktop table */}
            <Panel>
              <div className="hidden md:block">
                <Table min={900} head={["Campaign", "Total", "Message", "Date", "Sent", "Read", "Delivered", "Failed", "Pending", "Analytics"]}>
                  {campaigns.flatMap((c) => {
                    const open = expandedId === c.id;
                    const rows = [
                      <tr key={c.id} className="hover:bg-[#F7F6F3]">
                        <td className={TD}>
                          <div className="flex items-start gap-1.5">
                            <button onClick={() => setExpandedId(open ? null : c.id)} aria-label="Toggle details" className="mt-0.5 rounded p-0.5 text-[#787774] hover:bg-[rgba(55,53,47,.08)]">
                              <ChevronRight size={14} className={`transition ${open ? "rotate-90" : ""}`} />
                            </button>
                            <div>
                              <button onClick={() => openCampaign(c)} className="text-left font-medium underline decoration-[rgba(55,53,47,.25)] underline-offset-2 hover:decoration-[#37352F]">
                                {c.campname || `Campaign ${c.id}`}
                              </button>
                              <div className="text-xs text-[#787774]">#{c.id} · {c.template?.name || "Template"}</div>
                            </div>
                          </div>
                        </td>
                        <td className={`${TD} tabular-nums`}>{c.total_report_count ?? c.total ?? 0}</td>
                        <td className={`${TD} max-w-[240px] truncate text-[#787774]`}>{bodyText(c)}</td>
                        <td className={`${TD} whitespace-nowrap text-[#787774]`}>{fmtDate(c.created_at)}</td>
                        <td className={`${TD} tabular-nums`}>{c.sent_count ?? 0}</td>
                        <td className={`${TD} tabular-nums`}>{c.read_count ?? 0}</td>
                        <td className={`${TD} tabular-nums`}>{c.dlvd_count ?? 0}</td>
                        <td className={`${TD} tabular-nums ${num(c.failed_count) ? "text-[#E03E3E]" : ""}`}>{c.failed_count ?? 0}</td>
                        <td className={`${TD} tabular-nums`}>{c.pending_count ?? 0}</td>
                        <td className={TD}>
                          <button onClick={() => openCampaign(c)} title="View analytics" aria-label="View analytics" className="flex items-center gap-1.5 rounded-md border border-[rgba(55,53,47,.16)] px-2 py-1 text-xs hover:bg-[#F7F6F3]">
                            <Eye size={14} /> View
                          </button>
                        </td>
                      </tr>,
                    ];
                    if (open) rows.push(
                      <tr key={`x-${c.id}`}>
                        <td colSpan={10} className="bg-[#F7F6F3] px-10 py-4 text-xs">
                          <div className="grid gap-3 sm:grid-cols-4">
                            <span className="text-[#787774]">Template<br /><b className="text-[#37352F]">{c.template?.name || "—"}</b></span>
                            <span className="text-[#787774]">Category<br /><b className="text-[#37352F]">{c.template_category || c.template?.category || "—"}</b></span>
                            <span className="text-[#787774]">Platform<br /><b className="text-[#37352F]">{c.single_report?.platform || "—"}</b></span>
                            <span className="text-[#787774]">Message charge<br /><b className="text-[#37352F]">{c.message_charge ?? "—"}</b></span>
                          </div>
                          <button onClick={() => openCampaign(c)} className="mt-3 font-medium text-[#2383E2] hover:underline">Open full details</button>
                        </td>
                      </tr>
                    );
                    return rows;
                  })}
                  {campaigns.length === 0 && <Empty cols={10}>No campaigns match these filters.</Empty>}
                </Table>
              </div>

              {/* Mobile cards */}
              <ul className={`divide-y divide-[rgba(55,53,47,.09)] md:hidden`}>
                {campaigns.map((c) => (
                  <li key={c.id}>
                    <button onClick={() => openCampaign(c)} className="block w-full px-4 py-3 text-left hover:bg-[#F7F6F3]">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium">{c.campname || `Campaign ${c.id}`}</span>
                        <ChevronRight size={16} className="mt-0.5 shrink-0 text-[#787774]" />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[#787774]">{c.template?.name || "Template"} · {fmtDate(c.created_at)}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Tag>{c.total_report_count ?? c.total ?? 0} total</Tag>
                        <Tag tone="blue">{c.sent_count ?? 0} sent</Tag>
                        <Tag tone="green">{c.dlvd_count ?? 0} delivered</Tag>
                        <Tag tone="purple">{c.read_count ?? 0} read</Tag>
                        {num(c.failed_count) > 0 && <Tag tone="red">{c.failed_count} failed</Tag>}
                      </div>
                    </button>
                  </li>
                ))}
                {campaigns.length === 0 && <li className="px-4 py-12 text-center text-sm text-[#787774]">No campaigns match these filters.</li>}
              </ul>

              <div className={`flex items-center justify-between border-t ${BORDER} px-4 py-3 text-sm text-[#787774]`}>
                <span>Page {pagination?.current_page || page}{pagination?.last_page ? ` of ${pagination.last_page}` : ""}</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={GHOST}>Previous</button>
                  <button disabled={pagination?.last_page ? page >= pagination.last_page : campaigns.length < perPage} onClick={() => setPage((p) => p + 1)} className={GHOST}>Next</button>
                </div>
              </div>
            </Panel>
          </>
        )}

        {/* ===================== Campaign detail ===================== */}
        {mainTab === "campaigns" && selected && (
          <>
            <button onClick={closeCampaign} className="mb-4 flex items-center gap-1 rounded px-1 py-0.5 text-sm text-[#787774] hover:bg-[#F7F6F3] hover:text-[#37352F]">
              <ChevronLeft size={15} /> Campaigns
            </button>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Campaign details &amp; analytics</h2>
                <p className="mt-1 text-sm text-[#787774]">Campaign ID {selected.id} · Message delivery status and analytics</p>
              </div>
              <div className="rounded-lg bg-[#F7F6F3] px-3 py-2 text-xs text-[#787774]">
                <div className="font-medium text-[#37352F]">{selected.campname || `Campaign ${selected.id}`}</div>
                {fmtDate(selected.created_at)}
              </div>
            </div>

            <Tabs items={detailTabs} value={detailTab} onChange={setDetailTab} />

            {detailTab === "overview" && (
              <>
                <Panel>
                  <div className={`grid grid-cols-2 divide-[rgba(55,53,47,.09)] sm:grid-cols-4 sm:divide-x [&>*:nth-child(-n+2)]:border-b sm:[&>*:nth-child(-n+2)]:border-b-0 [&>*]:border-[rgba(55,53,47,.09)]`}>
                    <Metric label="Total messages" value={totals.total} />
                    <Metric label="Delivered" value={totals.delivered} sub={`${pct(totals.delivered).toFixed(1)}%`} color={COLORS.delivered} />
                    <Metric label="Read" value={totals.read} sub={`${pct(totals.read).toFixed(1)}%`} color={COLORS.read} />
                    <Metric label="Failed" value={totals.failed} sub={`${pct(totals.failed).toFixed(1)}%`} color={COLORS.failed} />
                  </div>
                </Panel>
                <div className="grid gap-6 md:grid-cols-2">
                  <Panel title="Status distribution">
                    <div className="h-64 p-3">
                      {pieData.length ? (
                        <ResponsiveContainer>
                          <PieChart><Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>{pieData.map((d) => <Cell key={d.name} fill={d.color} />)}</Pie><Tooltip /></PieChart>
                        </ResponsiveContainer>
                      ) : <div className="grid h-full place-items-center text-sm text-[#787774]">No status data</div>}
                    </div>
                  </Panel>
                  <Panel title="Count by status">
                    <div className="h-64 p-3">
                      <ResponsiveContainer>
                        <BarChart data={barData}><CartesianGrid vertical={false} stroke="rgba(55,53,47,.09)" /><XAxis dataKey="name" tick={{ fontSize: 12, fill: "#787774" }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#787774" }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "#F7F6F3" }} /><Bar dataKey="count" fill={COLORS.sent} radius={[4, 4, 0, 0]} /></BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Panel>
                </div>
              </>
            )}

            {detailTab === "status" && (
              <Panel title="Status breakdown">
                <div className={`grid grid-cols-2 sm:grid-cols-4 [&>*]:border-b sm:[&>*]:border-b-0 [&>*]:border-[rgba(55,53,47,.09)] sm:divide-x sm:divide-[rgba(55,53,47,.09)]`}>
                  <Metric label="Sent" value={totals.sent} sub={`${pct(totals.sent).toFixed(1)}% of total`} color={COLORS.sent} />
                  <Metric label="Delivered" value={totals.delivered} sub={`${pct(totals.delivered).toFixed(1)}% of total`} color={COLORS.delivered} />
                  <Metric label="Read" value={totals.read} sub={`${pct(totals.read).toFixed(1)}% of total`} color={COLORS.read} />
                  <Metric label="Failed" value={totals.failed} sub={`${pct(totals.failed).toFixed(1)}% of total`} color={COLORS.failed} />
                </div>
                <div className={`space-y-5 border-t ${BORDER} p-5`}>
                  {[["Delivery rate", pct(totals.delivered), COLORS.delivered], ["Read rate", pct(totals.read), COLORS.read], ["Failure rate", pct(totals.failed), COLORS.failed]].map(([label, value, color]) => (
                    <div key={label}>
                      <div className="mb-1.5 flex justify-between text-sm"><span>{label}</span><span className="tabular-nums text-[#787774]">{value.toFixed(1)}%</span></div>
                      <div className="h-1.5 rounded-full bg-[#F1F0EE]"><div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, value)}%`, background: color }} /></div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {detailTab === "failure" && (
              <Panel title="Failure analysis">
                {totals.failed === 0 ? (
                  <div className="grid min-h-[260px] place-content-center px-4 text-center">
                    <CheckCircle2 className="mx-auto mb-3 text-[#448361]" size={32} />
                    <b className="text-sm">All messages were sent successfully</b>
                    <p className="mt-1 text-sm text-[#787774]">No failures in this campaign.</p>
                  </div>
                ) : (
                  <div className="p-4">
                    <p className="mb-3 text-sm text-[#E03E3E]">{totals.failed} message(s) failed.</p>
                    <ul className={`divide-y divide-[rgba(55,53,47,.09)]`}>
                      {recipientRows.filter((r) => String(r.status).toLowerCase() === "failed").map((r, i) => (
                        <li key={r.id || i} className="py-3 text-sm">
                          <b>{r.mobile}</b>
                          <p className="mt-0.5 text-[#E03E3E]">{r.error_message || r.error || r.response || "No failure reason in the returned report row."}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Panel>
            )}

            {detailTab === "report" && (
              <Panel
                title="Detailed report"
                aside={
                  <label className="relative">
                    <Search className="absolute left-2.5 top-2 text-[#787774]" size={15} />
                    <input value={detailSearch} onChange={(e) => setDetailSearch(e.target.value)} placeholder="Search mobile number" className="w-56 rounded-md border border-[rgba(55,53,47,.16)] py-1.5 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#2383E2]/40" />
                  </label>
                }
              >
                <Table min={850} head={["#", "Mobile", "Status", "Message status", "Webhook", "Created", "Platform", "Payment"]}>
                  {recipientRows.map((r, i) => (
                    <tr key={r.id || i} className="hover:bg-[#F7F6F3]">
                      <td className={`${TD} text-[#787774]`}>{i + 1}</td>
                      <td className={TD}><b className="font-medium">{r.mobile || r.wa_id || "—"}</b><div className="max-w-[200px] truncate text-xs text-[#787774]">{r.message_id || ""}</div></td>
                      <td className={TD}><Tag tone={statusTone(r.status)}>{r.status}</Tag></td>
                      <td className={TD}><Tag tone={statusTone(r.message_status)}>{r.message_status}</Tag></td>
                      <td className={TD}><Tag>{r.webhook_status || "N/A"}</Tag></td>
                      <td className={`${TD} whitespace-nowrap text-[#787774]`}>{fmtDate(r.created_at)}</td>
                      <td className={TD}><Tag>{r.platform}</Tag></td>
                      <td className={TD}><Tag tone={r.payment_status ? "green" : "gray"}>{r.payment_status ? "Paid" : "N/A"}</Tag></td>
                    </tr>
                  ))}
                  {!recipientRows.length && <Empty cols={8}>No recipient-level rows in this campaign response. The provider currently returns only single_report for this record.</Empty>}
                </Table>
              </Panel>
            )}
          </>
        )}

        {/* ===================== Replies ===================== */}
        {mainTab === "replies" && (
          <Panel title="Template replies" aside={<span className="text-xs text-[#787774]">{replies.length} loaded</span>}>
            <Table min={750} head={["Contact", "Phone", "Reply", "Type", "Button payload", "Received", "Message ID"]}>
              {replies.map((r, i) => (
                <tr key={r.id || i} className="hover:bg-[#F7F6F3]">
                  <td className={TD}>{r.contact?.name || "—"}</td>
                  <td className={TD}>{r.phone_number || r.contact?.mobile}</td>
                  <td className={`${TD} font-medium`}>{r.reply_text}</td>
                  <td className={TD}><Tag tone={r.reply_type === "button" ? "blue" : "gray"}>{r.reply_type}</Tag></td>
                  <td className={`${TD} text-[#787774]`}>{r.button_payload || "—"}</td>
                  <td className={`${TD} whitespace-nowrap text-[#787774]`}>{fmtDate(r.created_at)}</td>
                  <td className={`${TD} max-w-[170px] truncate text-xs text-[#787774]`}>{r.message_id}</td>
                </tr>
              ))}
              {!replies.length && <Empty cols={7}>No template replies yet.</Empty>}
            </Table>
            <div className={`flex justify-end gap-2 border-t ${BORDER} px-4 py-3`}>
              <button onClick={() => setReplyOffset((v) => Math.max(0, v - 20))} disabled={!replyOffset} className={GHOST}>Previous</button>
              <button onClick={() => setReplyOffset((v) => v + 20)} disabled={!pagination?.has_more} className={GHOST}>Next</button>
            </div>
          </Panel>
        )}

        {/* ===================== URL clicks ===================== */}
        {mainTab === "urls" && (
          <>
            <Panel>
              <div className={`grid sm:grid-cols-3 sm:divide-x divide-[rgba(55,53,47,.09)] [&>*]:border-b sm:[&>*]:border-b-0 [&>*]:border-[rgba(55,53,47,.09)] [&>*:last-child]:border-b-0`}>
                <Metric label="Total clicks" value={shortStats?.total_clicks ?? 0} />
                <Metric label="Unique clicks" value={shortStats?.unique_clicks ?? 0} />
                <Metric label="Unique clickers" value={shortStats?.unique_clickers ?? 0} />
              </div>
            </Panel>

            <Panel title="Template short URLs">
              <Table min={700} head={["URL", "Template", "Variable", "Clicks", "Created"]}>
                {shortUrls.map((u, i) => (
                  <tr key={u.id || i} className="hover:bg-[#F7F6F3]">
                    <td className={`${TD} max-w-[260px] truncate`}>{u.short_url || u.url || u.code || "—"}</td>
                    <td className={TD}>{u.template_name || u.template?.name || "—"}</td>
                    <td className={`${TD} text-[#787774]`}>{u.variable || u.variable_value || "—"}</td>
                    <td className={`${TD} tabular-nums`}>{u.clicks ?? u.click_count ?? 0}</td>
                    <td className={`${TD} whitespace-nowrap text-[#787774]`}>{fmtDate(u.created_at)}</td>
                  </tr>
                ))}
                {!shortUrls.length && <Empty cols={5}>No tracked template URLs.</Empty>}
              </Table>
            </Panel>

            <Panel title="Recent clicks">
              <Table min={650} head={["Clicked URL", "Contact", "Device", "IP", "Clicked at"]}>
                {clicks.map((c, i) => (
                  <tr key={c.id || i} className="hover:bg-[#F7F6F3]">
                    <td className={`${TD} max-w-[260px] truncate`}>{c.short_url || c.url || "—"}</td>
                    <td className={TD}>{c.phone_number || c.mobile || c.contact?.name || "—"}</td>
                    <td className={`${TD} text-[#787774]`}>{c.device || c.device_type || "—"}</td>
                    <td className={`${TD} text-[#787774]`}>{c.ip || "—"}</td>
                    <td className={`${TD} whitespace-nowrap text-[#787774]`}>{fmtDate(c.clicked_at || c.created_at)}</td>
                  </tr>
                ))}
                {!clicks.length && <Empty cols={5}>No URL clicks yet.</Empty>}
              </Table>
            </Panel>
          </>
        )}
      </div>
    </main>
  );
}