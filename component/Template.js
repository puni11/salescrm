"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Home, ChevronRight, ChevronLeft, MessageSquare, Plus, RefreshCw, Search, Eye,
  MoreHorizontal, X, Trash2, AlertTriangle, Video, FileText, ExternalLink, Phone,
} from "lucide-react";

/*
  Notion-style palette
  text #37352F · muted #787774 · hover #F7F6F3 · border rgba(55,53,47,.09)
*/
const PAGE_SIZE = 10;
const BORDER = "border-[rgba(55,53,47,.09)]";
const FIELD = "rounded-md border border-[rgba(55,53,47,.16)] bg-white px-2.5 py-1.5 text-sm outline-none transition focus:ring-2 focus:ring-[#2383E2]/40";
const GHOST = "rounded-md border border-[rgba(55,53,47,.16)] px-3 py-1.5 text-sm hover:bg-[#F7F6F3] disabled:cursor-not-allowed disabled:opacity-40";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB");
};

const getTemplateBody = (t) => t?.components?.find((i) => i.type === "BODY")?.text || "";
const getHeader = (t) => t?.components?.find((i) => i.type === "HEADER");
const getFooter = (t) => t?.components?.find((i) => i.type === "FOOTER");
const getButtons = (t) => t?.components?.filter((i) => i.type === "BUTTONS")?.flatMap((i) => i.buttons || []) || [];

const CATEGORY_TONE = { MARKETING: "blue", UTILITY: "purple" };
const STATUS_TONE = { APPROVED: "green", REJECTED: "red" };

function Tag({ children, tone = "gray", dot }) {
  const tones = {
    green: ["bg-[#EDF3EC] text-[#1C3829]", "bg-[#448361]"], red: ["bg-[#FDEBEC] text-[#5D1715]", "bg-[#E03E3E]"],
    blue: ["bg-[#E7F3F8] text-[#183347]", "bg-[#2383E2]"], purple: ["bg-[#F6F3F9] text-[#492F64]", "bg-[#9065B0]"],
    amber: ["bg-[#FBF3DB] text-[#402C1B]", "bg-[#CB912F]"], gray: ["bg-[#F1F0EE] text-[#5A5955]", "bg-[#9B9A97]"],
  };
  const [cls, dotCls] = tones[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs ${cls}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotCls}`} />}
      {children}
    </span>
  );
}

const statusTone = (s) => STATUS_TONE[s] || (s ? "amber" : "gray");

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-[13px]">
      <span className="text-[#787774]">{label}</span>
      <span className="max-w-[150px] break-words text-right">{String(value ?? "-")}</span>
    </div>
  );
}

/* ------------------------------ Preview ------------------------------ */

function TemplatePreview({ template, onClose }) {
  if (!template) return null;
  const header = getHeader(template);
  const body = getTemplateBody(template);
  const footer = getFooter(template);
  const buttons = getButtons(template);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#37352F]/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[94vh] w-full max-w-[760px] flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_0_0_1px_rgba(55,53,47,.09),0_16px_48px_rgba(15,15,15,.2)] sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between border-b ${BORDER} px-5 py-3.5`}>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{template.name}</h2>
            <p className="text-xs text-[#787774]">Preview of the WhatsApp template</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1.5 text-[#787774] hover:bg-[#F7F6F3]"><X size={18} /></button>
        </div>

        <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[1fr_260px]">
          {/* Phone */}
          <div className="flex justify-center bg-[#F7F6F3] px-5 py-6">
            <div className="h-fit w-full max-w-[320px] rounded-[34px] bg-[#1F1F1F] p-2 shadow-[0_12px_32px_rgba(15,15,15,.18)]">
              <div className="flex min-h-[440px] flex-col overflow-hidden rounded-[27px] bg-[#EFEAE2]">
                <div className="bg-[#F0F2F5]">
                  <div className="flex items-center justify-between px-5 pt-2.5 text-[10px] font-semibold">
                    <span>9:41</span><span className="h-4 w-16 rounded-full bg-[#1F1F1F]" aria-hidden="true" /><span>100%</span>
                  </div>
                  <div className="flex items-center gap-2 px-2.5 pb-2.5 pt-2">
                    <ChevronLeft size={18} className="text-[#54656F]" />
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#DFE5E7] text-[#54656F]"><MessageSquare size={13} /></span>
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="truncate text-xs font-semibold">Business account</p>
                      <p className="text-[10px] text-[#667781]">Template message</p>
                    </div>
                    <Video size={15} className="text-[#54656F]" /><Phone size={14} className="text-[#54656F]" />
                  </div>
                </div>

                <div className="flex-1 px-3 py-3">
                  <div className="max-w-[92%]">
                    <div className="overflow-hidden rounded-lg rounded-tl-none bg-white p-1.5 text-[12.5px] leading-[1.5] shadow-[0_1px_0.5px_rgba(11,20,26,.13)]">
                      {header?.format === "IMAGE" && header?.image_url && (
                        <img src={header.image_url} alt="Template header" className="mb-1.5 max-h-40 w-full rounded object-cover" />
                      )}
                      {header?.format === "VIDEO" && (
                        <div className="mb-1.5 flex h-28 items-center justify-center rounded bg-[#E9EDEF] text-[#667781]"><Video size={26} /></div>
                      )}
                      {header?.format === "DOCUMENT" && (
                        <div className="mb-1.5 flex items-center gap-2 rounded bg-[#F0F2F5] p-3 text-xs"><FileText size={18} />Document attachment</div>
                      )}
                      <div className="px-1">
                        {header?.type === "HEADER" && header?.format === "TEXT" && header?.text && (
                          <p className="mb-1 font-semibold">{header.text}</p>
                        )}
                        <p className="whitespace-pre-wrap break-words text-[#111B21]">{body || "No message content available."}</p>
                        {footer?.text && <p className="mt-1.5 text-[11px] text-[#667781]">{footer.text}</p>}
                        <p className="mt-1 text-right text-[10px] text-[#667781]">9:41</p>
                      </div>
                    </div>
                    {buttons.map((button, index) => (
                      <div key={button.id || index} className="mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-white py-2 text-[12px] font-medium text-[#027EB5] shadow-[0_1px_0.5px_rgba(11,20,26,.13)]">
                        {button.type === "URL" && <ExternalLink size={12} />}
                        {button.type === "PHONE_NUMBER" && <Phone size={12} />}
                        {button.text}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-[#F0F2F5] px-3 py-2">
                  <div className="h-7 flex-1 rounded-full bg-white" /><div className="h-7 w-7 rounded-full bg-[#00A884]" />
                </div>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className={`border-t ${BORDER} px-5 py-5 md:border-l md:border-t-0`}>
            <h3 className="mb-1 text-xs font-medium text-[#787774]">Template info</h3>
            <div className={`divide-y divide-[rgba(55,53,47,.09)]`}>
              <InfoRow label="Name" value={template.name} />
              <InfoRow label="Type" value={template.template_type || "Standard"} />
              <InfoRow label="Language" value={template.language || "-"} />
              <InfoRow label="Components" value={template.components?.length || 0} />
              <InfoRow label="Category" value={template.category || "-"} />
              <InfoRow label="WhatsApp ID" value={template.wa_id || "-"} />
              <InfoRow label="Status" value={template.status || "-"} />
            </div>
          </div>
        </div>

        <div className={`flex justify-end border-t ${BORDER} px-5 py-3`}>
          <button onClick={onClose} className={GHOST}>Close preview</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Delete ------------------------------ */

function DeleteModal({ template, onClose }) {
  if (!template) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-[#37352F]/40 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-[440px] rounded-t-2xl bg-white p-5 shadow-[0_0_0_1px_rgba(55,53,47,.09),0_16px_48px_rgba(15,15,15,.2)] sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#FDEBEC] text-[#E03E3E]"><AlertTriangle size={18} /></span>
          <div>
            <h3 className="text-base font-semibold">Delete template</h3>
            <p className="text-[13px] text-[#787774]">This can't be undone. The delete action will be connected later.</p>
          </div>
        </div>

        <div className={`mb-5 divide-y divide-[rgba(55,53,47,.09)] rounded-lg border ${BORDER} px-3`}>
          <InfoRow label="Template" value={template.name} />
          <InfoRow label="Status" value={template.status} />
          <InfoRow label="WhatsApp ID" value={template.wa_id || "-"} />
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className={GHOST}>Cancel</button>
          <button onClick={onClose} className="flex items-center gap-2 rounded-md bg-[#E03E3E] px-3.5 py-1.5 text-sm font-medium text-white hover:bg-[#C9302C]">
            <Trash2 size={14} /> Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Page ------------------------------ */

export default function YourTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [deleteTemplate, setDeleteTemplate] = useState(null);
  const [menuTemplate, setMenuTemplate] = useState(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({ page: String(page), per_page: String(PAGE_SIZE) });
      if (search.trim()) params.set("search", search.trim());
      if (category !== "ALL") params.set("category", category);
      if (status !== "ALL") params.set("status", status);

      const response = await fetch(`/api/whatsapp/templates?${params.toString()}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || "Unable to fetch WhatsApp templates");

      // Supports { data: [...] } and Laravel-style { data: { data: [...] } }
      const list = Array.isArray(result?.data) ? result.data
        : Array.isArray(result?.data?.data) ? result.data.data
        : Array.isArray(result?.templates) ? result.templates : [];

      setTemplates(list);
      const pagination = result?.pagination || result?.data?.pagination || result?.data || {};
      setTotal(Number(pagination?.total ?? result?.total ?? list.length));
      setLastPage(Number(
        pagination?.last_page ?? pagination?.lastPage ??
        Math.max(1, Math.ceil(Number(pagination?.total ?? result?.total ?? list.length) / PAGE_SIZE))
      ));
    } catch (err) {
      console.error("Fetch templates error:", err);
      setError(err.message || "Something went wrong");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, category, status]);

  useEffect(() => {
    const timeout = setTimeout(fetchTemplates, 300);
    return () => clearTimeout(timeout);
  }, [fetchTemplates]);

  const approvedCount = useMemo(() => templates.filter((i) => i.status === "APPROVED").length, [templates]);

  const handleFilterChange = (setter, value) => { setter(value); setPage(1); };

  const language = (t) => (t.language === "en" ? "English" : t.language || "-");

  const rowMenu = (template) => (
    <div className="relative">
      <button
        title="More options"
        aria-label="More options"
        onClick={() => setMenuTemplate(menuTemplate === template.id ? null : template.id)}
        className="rounded p-1.5 text-[#787774] hover:bg-[rgba(55,53,47,.08)]"
      >
        <MoreHorizontal size={17} />
      </button>
      {menuTemplate === template.id && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuTemplate(null)} />
          <div className={`absolute right-0 top-9 z-20 w-40 rounded-lg border ${BORDER} bg-white p-1 shadow-[0_8px_24px_rgba(15,15,15,.12)]`}>
            <button onClick={() => { setPreviewTemplate(template); setMenuTemplate(null); }} className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-sm hover:bg-[#F7F6F3]">
              <Eye size={14} /> Preview
            </button>
            <button onClick={() => { setDeleteTemplate(template); setMenuTemplate(null); }} className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-sm text-[#E03E3E] hover:bg-[#FDEBEC]">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-white px-4 py-6 text-[#37352F] sm:px-8 sm:py-0">
      <div className="mx-auto ">
        {/* Breadcrumb */}
     

        {/* Header */}
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Your templates</h1>
              <p className="text-sm text-[#787774]">Create a template and submit it to WhatsApp for approval.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => alert("Add Template feature will be integrated later.")}
            className="flex items-center gap-2 rounded-md bg-[#37352F] px-3.5 py-2 text-sm font-medium text-white hover:bg-black"
          >
            <Plus size={16} /> New template
          </button>
        </header>

        {/* Guideline note */}
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-[#F7F6F3] px-4 py-3 text-sm text-[#5A5955]">
          <span aria-hidden="true">💡</span>
          <p>
            Templates must follow{" "}
            <a href="https://business.whatsapp.com/policy" target="_blank" rel="noreferrer" className="underline decoration-[rgba(55,53,47,.35)] underline-offset-2 hover:decoration-[#37352F]">
              WhatsApp's guidelines
            </a>
            . WhatsApp reviews and approves each one before you can use it.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#787774]" />
            <input
              value={search}
              onChange={(e) => handleFilterChange(setSearch, e.target.value)}
              placeholder="Search templates"
              className={`${FIELD} w-full pl-8 placeholder:text-[#B4B2AD]`}
            />
          </div>
          <select value={category} onChange={(e) => handleFilterChange(setCategory, e.target.value)} aria-label="Category" className={FIELD}>
            <option value="ALL">All categories</option><option value="MARKETING">Marketing</option><option value="UTILITY">Utility</option><option value="AUTHENTICATION">Authentication</option>
          </select>
          <select value={status} onChange={(e) => handleFilterChange(setStatus, e.target.value)} aria-label="Status" className={FIELD}>
            <option value="ALL">All statuses</option><option value="APPROVED">Approved</option><option value="PENDING">Pending</option><option value="REJECTED">Rejected</option><option value="IN_REVIEW">In review</option>
          </select>
          <button onClick={fetchTemplates} disabled={loading} className={`ml-auto flex items-center gap-2 ${GHOST}`}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* List */}
        <div className={`rounded-lg border ${BORDER}`}>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className={`border-b ${BORDER}`}>
                <tr className="text-xs text-[#787774]">
                  {["Template", "Category", "Status", "Language", "Updated"].map((h) => <th key={h} className="px-4 py-2.5 font-normal">{h}</th>)}
                  <th className="px-4 py-2.5 text-right font-normal">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(55,53,47,.09)]">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-16 text-center text-sm text-[#787774]"><RefreshCw size={18} className="mx-auto mb-2 animate-spin" />Loading templates…</td></tr>
                ) : error ? (
                  <tr><td colSpan={6} className="px-4 py-16 text-center"><p className="mb-3 text-sm text-[#E03E3E]">{error}</p><button onClick={fetchTemplates} className={GHOST}>Try again</button></td></tr>
                ) : templates.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-16 text-center text-sm text-[#787774]">No templates found.</td></tr>
                ) : (
                  templates.map((template) => (
                    <tr key={template.id} className="hover:bg-[#F7F6F3]">
                      <td className="px-4 py-3 font-medium">{template.name}</td>
                      <td className="px-4 py-3"><Tag tone={CATEGORY_TONE[template.category] || "gray"}>{template.category || "-"}</Tag></td>
                      <td className="px-4 py-3"><Tag dot tone={statusTone(template.status)}>{template.status || "UNKNOWN"}</Tag></td>
                      <td className="px-4 py-3">
                        <div>{language(template)}</div>
                        {template.language && template.language !== "en" ? null : <div className="text-xs text-[#787774]">{template.language || ""}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div>{formatDate(template.updated_at)}</div>
                        <div className="text-xs text-[#787774]">Created {formatDate(template.created_at)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button title="Preview" aria-label="Preview" onClick={() => setPreviewTemplate(template)} className="rounded p-1.5 text-[#787774] hover:bg-[rgba(55,53,47,.08)] hover:text-[#37352F]">
                            <Eye size={16} />
                          </button>
                          {rowMenu(template)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y divide-[rgba(55,53,47,.09)] md:hidden">
            {loading ? (
              <li className="px-4 py-14 text-center text-sm text-[#787774]"><RefreshCw size={18} className="mx-auto mb-2 animate-spin" />Loading templates…</li>
            ) : error ? (
              <li className="px-4 py-12 text-center"><p className="mb-3 text-sm text-[#E03E3E]">{error}</p><button onClick={fetchTemplates} className={GHOST}>Try again</button></li>
            ) : templates.length === 0 ? (
              <li className="px-4 py-12 text-center text-sm text-[#787774]">No templates found.</li>
            ) : (
              templates.map((template) => (
                <li key={template.id} className="flex items-start gap-2 px-4 py-3">
                  <button onClick={() => setPreviewTemplate(template)} className="min-w-0 flex-1 text-left">
                    <p className="truncate font-medium">{template.name}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Tag tone={CATEGORY_TONE[template.category] || "gray"}>{template.category || "-"}</Tag>
                      <Tag dot tone={statusTone(template.status)}>{template.status || "UNKNOWN"}</Tag>
                    </div>
                    <p className="mt-1.5 text-xs text-[#787774]">{language(template)} · Updated {formatDate(template.updated_at)}</p>
                  </button>
                  {rowMenu(template)}
                </li>
              ))
            )}
          </ul>

          {/* Pagination */}
          <div className={`flex flex-wrap items-center justify-between gap-3 border-t ${BORDER} px-4 py-3`}>
            <p className="text-xs text-[#787774]">
              {templates.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{(page - 1) * PAGE_SIZE + templates.length} of {total} templates
              {templates.length > 0 && <> · {approvedCount} approved on this page</>}
            </p>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Previous page" className={`${GHOST} px-2`}><ChevronLeft size={16} /></button>
              <span className="text-sm text-[#787774]">Page {page} of {lastPage}</span>
              <button disabled={page >= lastPage || loading} onClick={() => setPage((p) => Math.min(lastPage, p + 1))} aria-label="Next page" className={`${GHOST} px-2`}><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>

      {previewTemplate && <TemplatePreview template={previewTemplate} onClose={() => setPreviewTemplate(null)} />}
      {deleteTemplate && <DeleteModal template={deleteTemplate} onClose={() => setDeleteTemplate(null)} />}
    </div>
  );
}