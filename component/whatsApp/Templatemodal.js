"use client";

import { useMemo, useRef, useState } from "react";
import {
  X, Search, Loader2, Send, Paperclip, ArrowLeft, FileText, Tag, Globe, Hash,
  Image as ImageIcon, ChevronDown, MessageSquareText,
} from "lucide-react";

const cls = (...v) => v.filter(Boolean).join(" ");

function getVariables(text = "") {
  return [...new Set([...String(text).matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1]))].sort((a, b) => Number(a) - Number(b));
}
function templateParts(template) {
  const components = template?.components || [];
  const find = (t) => components.find((c) => String(c.type).toUpperCase() === t);
  return { header: find("HEADER"), body: find("BODY"), footer: find("FOOTER"), buttons: find("BUTTONS")?.buttons || [] };
}
const interpolate = (text = "", vars = {}) =>
  String(text).replace(/\{\{(\d+)\}\}/g, (_, k) => (vars[k]?.trim() ? vars[k] : `{{${k}}}`));

function Property({ icon: Icon, label, children }) {
  return (
    <div className="flex min-h-[34px] items-start gap-2 py-0.5 text-sm">
      <div className="flex h-[30px] w-36 shrink-0 items-center gap-1.5 text-[#787774]">
        <Icon size={14} className="shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const fieldClass =
  "w-full rounded px-2 py-1.5 text-sm text-[#37352F] outline-none placeholder:text-[#B4B4B0] hover:bg-[#F7F6F3] focus:bg-white focus:shadow-[inset_0_0_0_1px_rgba(35,131,226,0.57),0_0_0_2px_rgba(35,131,226,0.25)]";

/**
 * Props
 *  templates  – approved templates
 *  loading    – templates are being fetched
 *  sending    – a send is in flight
 *  onClose()
 *  onUpload(file) -> Promise<{ url, type, fileName }>
 *  onSend({ template, variables, media }) -> Promise (throw to show an error here)
 */
export default function TemplateModal({ templates = [], loading, sending, onClose, onUpload, onSend }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [selected, setSelected] = useState(null);
  const [vars, setVars] = useState({});
  const [media, setMedia] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  const categories = useMemo(
    () => ["ALL", ...new Set(templates.map((t) => t.category).filter(Boolean))],
    [templates]
  );

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter(
      (t) =>
        (category === "ALL" || t.category === category) &&
        (!q || `${t.name} ${templateParts(t).body?.text || ""}`.toLowerCase().includes(q))
    );
  }, [templates, search, category]);

  const choose = (t) => { setSelected(t); setVars({}); setMedia(null); setErr(""); };

  const parts = selected ? templateParts(selected) : null;
  const keys = parts ? getVariables(parts.body?.text || "") : [];
  const format = String(parts?.header?.format || "").toUpperCase();
  const needsMedia = ["IMAGE", "VIDEO", "DOCUMENT"].includes(format);
  const approvedUrl = parts?.header?.image_url || "";
  const mediaUrl = media?.url || (needsMedia ? approvedUrl : "");
  const missingMedia = needsMedia && !mediaUrl;
  const missingVars = keys.some((k) => !vars[k]?.trim());
  const canSend = selected && !sending && !uploading && !missingVars && !missingMedia;

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    setErr("");
    try {
      setMedia(await onUpload(file));
    } catch (e) {
      setErr(e.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async () => {
    setErr("");
    try {
      await onSend({ template: selected, variables: vars, media });
    } catch (e) {
      setErr(e.message || "Could not send the template");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/40 p-3 sm:p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <section className="flex h-[min(680px,92dvh)] w-full max-w-[960px] overflow-hidden rounded-xl bg-white text-[#37352F] shadow-[0_0_0_1px_rgba(15,15,15,0.05),0_16px_48px_rgba(15,15,15,0.22)]">
        {/* ---------- left: list ---------- */}
        <aside className={cls("flex w-full flex-col border-r border-[#EDEDEB] md:w-[330px] md:shrink-0", selected && "hidden md:flex")}>
          <div className="flex items-center justify-between px-4 pb-1 pt-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquareText size={16} className="text-[#787774]" /> Templates
              <span className="rounded bg-[#F1F1EF] px-1.5 text-xs font-normal text-[#787774]">{list.length}</span>
            </div>
            <button onClick={onClose} className="rounded p-1 text-[#787774] hover:bg-[#EFEFED] md:hidden" aria-label="Close"><X size={17} /></button>
          </div>

          {/* search + filter on one line */}
          <div className="flex items-center gap-1.5 px-3 pb-2 pt-1">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-[#F7F6F3] px-2 shadow-[inset_0_0_0_1px_rgba(15,15,15,0.08)] focus-within:shadow-[inset_0_0_0_1px_rgba(35,131,226,0.57)]">
              <Search size={14} className="shrink-0 text-[#9B9A97]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="w-full bg-transparent py-1.5 text-sm outline-none placeholder:text-[#B4B4B0]" />
            </div>
            <div className="relative shrink-0">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-[30px] cursor-pointer appearance-none rounded-md bg-white py-0 pl-2 pr-6 text-xs shadow-[inset_0_0_0_1px_rgba(15,15,15,0.12)] outline-none hover:bg-[#F7F6F3]">
                {categories.map((c) => <option key={c} value={c}>{c === "ALL" ? "All" : c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#9B9A97]" />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 size={18} className="animate-spin text-[#9B9A97]" /></div>
            ) : list.length ? (
              list.map((t) => {
                const p = templateParts(t);
                const active = selected?.id === t.id;
                return (
                  <button key={t.id} onClick={() => choose(t)} className={cls("block w-full rounded-md px-2.5 py-2 text-left", active ? "bg-[#EFEFED]" : "hover:bg-[#F7F6F3]")}>
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="shrink-0 text-[#9B9A97]" />
                      <span className="truncate text-sm font-medium">{t.name}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 pl-[22px] text-xs leading-4 text-[#787774]">{p.body?.text || "No body text"}</p>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-12 text-center text-sm text-[#9B9A97]">No templates match. Try a different search or category.</div>
            )}
          </div>
        </aside>

        {/* ---------- right: detail ---------- */}
        <div className={cls("min-w-0 flex-1 flex-col", selected ? "flex" : "hidden md:flex")}>
          <div className="flex items-center justify-between px-3 py-2">
            <button onClick={() => setSelected(null)} className="flex items-center gap-1 rounded px-1.5 py-1 text-xs text-[#787774] hover:bg-[#EFEFED] md:invisible">
              <ArrowLeft size={14} /> Templates
            </button>
            <button onClick={onClose} className="hidden rounded p-1 text-[#787774] hover:bg-[#EFEFED] md:block" aria-label="Close"><X size={17} /></button>
          </div>

          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-[#9B9A97]">
              <MessageSquareText size={28} />
              Pick a template to preview it and fill in its variables.
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 sm:px-10">
                <h2 className="break-words text-[26px] font-bold leading-8">{selected.name}</h2>

                <div className="mt-4 border-b border-[#EDEDEB] pb-3">
                  <Property icon={Tag} label="Category">
                    <span className="inline-block rounded bg-[#E3F2EC] px-1.5 py-0.5 text-xs text-[#1C6B4F]">{selected.category || "—"}</span>
                  </Property>
                  <Property icon={Globe} label="Language"><span className="inline-block px-2 py-1 text-sm">{selected.language || "—"}</span></Property>
                  {keys.map((k) => (
                    <Property key={k} icon={Hash} label={`Variable ${k}`}>
                      <input value={vars[k] || ""} onChange={(e) => setVars((o) => ({ ...o, [k]: e.target.value }))} placeholder={`Value for {{${k}}}`} className={fieldClass} />
                    </Property>
                  ))}
                  {needsMedia && (
                    <Property icon={ImageIcon} label={`Header ${format.toLowerCase()}`}>
                      <input
                        ref={fileRef}
                        type="file"
                        className="hidden"
                        accept={format === "VIDEO" ? "video/mp4" : format === "DOCUMENT" ? "application/pdf,.pdf" : "image/jpeg,image/png"}
                        onChange={(e) => upload(e.target.files?.[0])}
                      />
                      {media ? (
                        <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
                          <span className="min-w-0 flex-1 truncate">{media.fileName}</span>
                          <button onClick={() => setMedia(null)} className="text-xs text-[#787774] hover:text-[#EB5757]">Remove</button>
                        </div>
                      ) : (
                        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-[#787774] hover:bg-[#F7F6F3] disabled:opacity-60">
                          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                          {uploading ? "Uploading…" : approvedUrl ? "Replace approved file" : `Upload ${format.toLowerCase()}`}
                        </button>
                      )}
                    </Property>
                  )}
                </div>

                {/* preview */}
                <div className="mt-4 rounded-md bg-[#F7F6F3] p-4">
                  <div className="mx-auto max-w-sm overflow-hidden rounded-lg bg-white shadow-[0_0_0_1px_rgba(15,15,15,0.08)]">
                    {format === "IMAGE" && mediaUrl && <img src={mediaUrl} alt="Header" className="max-h-52 w-full object-cover" />}
                    {format === "VIDEO" && (mediaUrl ? <video src={mediaUrl} controls className="max-h-52 w-full" /> : <div className="p-4 text-xs text-[#9B9A97]">A video header is required.</div>)}
                    {format === "DOCUMENT" && (
                      <div className="flex items-center gap-2 bg-[#F1F1EF] p-3 text-xs text-[#787774]"><FileText size={16} />{media?.fileName || (approvedUrl ? "Approved document" : "A PDF header is required.")}</div>
                    )}
                    <div className="space-y-2 p-3">
                      {format === "TEXT" && parts.header?.text && <div className="text-sm font-semibold">{parts.header.text}</div>}
                      <p className="whitespace-pre-wrap text-sm leading-5">{interpolate(parts.body?.text || "", vars)}</p>
                      {parts.footer?.text && <p className="text-xs text-[#9B9A97]">{parts.footer.text}</p>}
                    </div>
                    {parts.buttons.length > 0 && (
                      <div className="divide-y divide-[#EDEDEB] border-t border-[#EDEDEB]">
                        {parts.buttons.map((b, i) => <div key={i} className="py-1.5 text-center text-xs font-medium text-[#2383E2]">{b.text}</div>)}
                      </div>
                    )}
                  </div>
                </div>

                {err && <div className="mt-3 rounded bg-[#FDEBEC] px-3 py-2 text-xs text-[#C4554D]">{err}</div>}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-[#EDEDEB] px-6 py-3 sm:px-10">
                <span className="text-xs text-[#9B9A97]">
                  {missingMedia ? "Add the header file to continue." : missingVars ? "Fill in every variable to continue." : "Ready to send."}
                </span>
                <button onClick={submit} disabled={!canSend} className="flex items-center gap-2 rounded-md bg-[#2383E2] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#1B74CC] disabled:cursor-not-allowed disabled:opacity-40">
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send template
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}