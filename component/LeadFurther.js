"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Phone,
  MessageCircle,
  Mail,
  Globe,
  UserPlus,
  Activity,
  User,
  UserRound,
  RefreshCcw,
  CheckSquare,
  FileText,
  Paperclip,
  CalendarDays,
  ChevronDown,
  Pencil,
  Plus,
  BookOpen,
  Tag,
  CircleDot,
  MapPin,
  Hash,
  Clock,
  AlertCircle,
  Trash2,
} from "lucide-react";
import BackButton from "@/lib/BackButton";
import StudentBatchDetails from "./StudentBatchDetails";
import WhatsAppChat from "./whatsApp/Whatsappchat";

/* ---------- Tokens ---------- */
const FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

const TAG_COLORS = [
  "bg-[#E3E2E0] text-[#32302C]",
  "bg-[#EEE0DA] text-[#442A1E]",
  "bg-[#FADEC9] text-[#49290E]",
  "bg-[#FDECC8] text-[#402C1B]",
  "bg-[#DBEDDB] text-[#1C3829]",
  "bg-[#D3E5EF] text-[#183347]",
  "bg-[#E8DEEE] text-[#412454]",
  "bg-[#F5E0E9] text-[#4C2337]",
  "bg-[#FFE2DD] text-[#5D1715]",
];

const tagColor = (key = "") => {
  let hash = 0;
  for (const ch of String(key)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TAG_COLORS[hash % TAG_COLORS.length];
};

const TYPE_CONFIG = {
  CALL: { label: "Call", icon: Phone, tag: "bg-[#D3E5EF] text-[#183347]" },
  WHATSAPP: { label: "WhatsApp", icon: MessageCircle, tag: "bg-[#DBEDDB] text-[#1C3829]" },
  EMAIL_OPEN: { label: "Email opened", icon: Mail, tag: "bg-[#FDECC8] text-[#402C1B]" },
  WEBSITE: { label: "Website visit", icon: Globe, tag: "bg-[#E8DEEE] text-[#412454]" },
  LEAD_CREATED: { label: "Lead created", icon: UserPlus, tag: "bg-[#E3E2E0] text-[#32302C]" },
};
const DEFAULT_TYPE = { label: "Activity", icon: Activity, tag: "bg-[#E3E2E0] text-[#32302C]" };
const getTypeConfig = (type) => TYPE_CONFIG[type] || DEFAULT_TYPE;

const STATUS_STYLES = {
  "New Lead": ["bg-[#D3E5EF] text-[#183347]", "bg-[#2383E2]"],
  Registered: ["bg-[#DBEDDB] text-[#1C3829]", "bg-[#0F7B6C]"],
  "Course Interested": ["bg-[#DBEDDB] text-[#1C3829]", "bg-[#4DAB9A]"],
  "Demo Requested": ["bg-[#DBEDDB] text-[#1C3829]", "bg-[#4DAB9A]"],
  "Call Back": ["bg-[#FDECC8] text-[#402C1B]", "bg-[#CB912F]"],
  "Follow Up": ["bg-[#FADEC9] text-[#49290E]", "bg-[#D9730D]"],
  "Other Course Interested": ["bg-[#E8DEEE] text-[#412454]", "bg-[#9065B0]"],
  "Not Interested": ["bg-[#E3E2E0] text-[#32302C]", "bg-[#9B9A97]"],
  Invalid: ["bg-[#FFE2DD] text-[#5D1715]", "bg-[#E03E3E]"],
};
const getStatusStyle = (s) => STATUS_STYLES[s] || ["bg-[#E3E2E0] text-[#32302C]", "bg-[#9B9A97]"];

/*
 * Tabs. `key` is the field the API can return next to `lead` and `timeline`:
 *   { lead, timeline, tasks, notes, files, emails, events }
 * Anything missing shows an empty state, so the API can be extended later
 * without touching this file.
 */
const TABS = [
  { id: "timeline", label: "Timeline", icon: Activity },
  { id: "tasks", label: "Tasks", icon: CheckSquare, key: "tasks", singular: "task", empty: "There are no tasks for this lead." },
  { id: "notes", label: "Comments", icon: FileText, key: "notes", singular: "comment", empty: "No comments have been added to this lead yet." },
  { id: "followups", label: "Follow-ups", icon: Clock, key: "followUps", singular: "followUp", empty: "There are no follow-ups scheduled." },
  { id: "Batch", label: "Batch", icon: BookOpen, key: "batch", singular: "batch", empty: "No batch is assigned to this lead." },
  { id: "location", label: "Location", icon: MapPin, key: "location", singular: "location", empty: "Add the lead location." },
  { id: "calendar", label: "Calendar", icon: CalendarDays, key: "events", singular: "event", empty: "There are no events for this lead." },
];

/* ---------- Helpers ---------- */
const toDateValue = (v) => (v && typeof v === "object" && v.$date ? v.$date : v);

const timeAgo = (value) => {
  const d = new Date(toDateValue(value));
  if (!value || Number.isNaN(d.getTime())) return null;
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatDateTime = (value) => {
  const d = new Date(toDateValue(value));
  if (!value || Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
};

const nameOf = (v) => (v && typeof v === "object" ? v.name : v) || "";

const whatsappLink = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  // 10-digit Indian numbers need the country code for wa.me
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
};

const itemTitle = (it) => it.title || it.subject || it.name || it.text || it.body || "Untitled";
const itemText = (it) => (it.title || it.subject || it.name ? it.description || it.text || it.body : it.description) || "";
const itemDate = (it) => it.createdAt || it.timestamp || it.date || it.start || it.dueDate;

/* ---------- Small components ---------- */
function Avatar({ name, size = 22 }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium ${tagColor(name)}`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {initial}
    </span>
  );
}

function Tagged({ className = "", children }) {
  return (
    <span className={`inline-flex max-w-full items-center truncate rounded-[3px] px-1.5 text-[13px] leading-5 ${className}`}>
      {children}
    </span>
  );
}

function Pill({ href, children }) {
  const cls =
    "inline-flex max-w-full items-center truncate rounded-full border border-[#E3E2E0] bg-white px-2 py-px text-[13px] transition-colors hover:bg-[rgba(55,53,47,0.05)]";
  return href ? (
    <a href={href} className={cls}>
      {children}
    </a>
  ) : (
    <span className={cls}>{children}</span>
  );
}

function Field({ icon: Icon, label, empty, children }) {
  return (
    <div className="grid min-h-[28px] grid-cols-[104px_1fr] items-start gap-2 py-0.5">
      <div className="flex items-center gap-1.5 pt-[3px] text-[13px] text-[#787774]">
        <Icon size={14} className="shrink-0 text-[#9B9A97]" />
        <span className="truncate">{label}</span>
      </div>
      <div className="min-w-0 pt-[2px] text-[13px]">
        {empty ? <span className="text-[#C7C6C3]">Empty</span> : children}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="px-3.5 py-0.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-8 w-full items-center justify-between text-[13px] font-medium text-[#787774] transition-colors hover:text-[#37352F]"
      >
        {title}
        <ChevronDown size={14} className={`text-[#9B9A97] transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && <div className="pb-2">{children}</div>}
    </div>
  );
}

function SideCard({ title, actionIcon: ActionIcon, children }) {
  return (
    <div className="border-t border-[#E9E9E7] px-3.5 py-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-medium">{title}</h3>
        {ActionIcon && (
          <button
            type="button"
            disabled
            title="Coming soon"
            aria-label={`Edit ${title}`}
            className="cursor-not-allowed rounded p-1 text-[#9B9A97] opacity-60"
          >
            <ActionIcon size={14} />
          </button>
        )}
      </div>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, text, cta }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F7F6F3]">
        <Icon size={28} className="text-[#9B9A97]" />
      </div>
      <p className="mt-5 text-[15px] font-medium">{title}</p>
      <p className="mt-1 text-[13px] text-[#787774]">{text}</p>
      {cta && (
        <button
          type="button"
          disabled
          title="Coming soon"
          className="mt-5 inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-[6px] border border-[#E3E2E0] px-3 text-[13px] text-[#787774] opacity-70"
        >
          <Plus size={14} />
          {cta}
        </button>
      )}
    </div>
  );
}

/* ---------- Tab panels ---------- */
function TimelineTab({ timeline, assignedName }) {
  const [typeFilter, setTypeFilter] = useState("All");

  const typeOptions = useMemo(() => {
    const counts = {};
    timeline.forEach((t) => (counts[t.type] = (counts[t.type] || 0) + 1));
    return Object.entries(counts);
  }, [timeline]);

  const grouped = useMemo(() => {
    const list = typeFilter === "All" ? timeline : timeline.filter((t) => t.type === typeFilter);
    return list.reduce((acc, item) => {
      const d = new Date(item.timestamp);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      (acc[key] ||= []).push(item);
      return acc;
    }, {});
  }, [timeline, typeFilter]);

  if (timeline.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No activity yet"
        text="Calls, messages and website visits will appear here."
      />
    );
  }

  const chip = (active) =>
    `inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[13px] transition-colors ${
      active ? "bg-[#F1F1EF] font-medium text-[#37352F]" : "text-[#787774] hover:bg-[rgba(55,53,47,0.06)]"
    }`;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-1">
        <button type="button" onClick={() => setTypeFilter("All")} className={chip(typeFilter === "All")}>
          All
        </button>
        {typeOptions.map(([type, count]) => (
          <button
            key={type}
            type="button"
            onClick={() => setTypeFilter(type)}
            className={chip(typeFilter === type)}
          >
            {getTypeConfig(type).label}
            <span className="text-[#9B9A97]">{count}</span>
          </button>
        ))}
      </div>

      {Object.entries(grouped).map(([date, items]) => (
        <div key={date} className="mb-7">
          <h3 className="mb-3 text-[13px] font-medium text-[#787774]">{date}</h3>

          {items.map((item, index) => {
            const cfg = getTypeConfig(item.type);
            const Icon = cfg.icon;
            const isLast = index === items.length - 1;
            const time = new Date(item.timestamp).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });
            const counsellor = item.counsellor && item.counsellor !== "Unknown" ? item.counsellor : assignedName;

            return (
              <div key={item.id ?? `${date}-${index}`} className="relative pb-5 pl-9 last:pb-0">
                {!isLast && <span className="absolute bottom-0 left-[11px] top-7 w-px bg-[#E9E9E7]" />}
                <span className="absolute left-0 top-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-[#E9E9E7] bg-white">
                  <Icon size={13} className="text-[#787774]" />
                </span>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h4 className="text-[14px] font-medium">{item.title}</h4>
                  <Tagged className={cfg.tag}>{cfg.label}</Tagged>
                  {item.status && <Tagged className="bg-[#E3E2E0] text-[#32302C]">{item.status}</Tagged>}
                  {item.score ? <Tagged className="bg-[#DBEDDB] text-[#1C3829]">+{item.score} score</Tagged> : null}
                  <span
                    className="ml-auto text-xs text-[#9B9A97]"
                    title={formatDateTime(item.timestamp)}
                  >
                    {time}
                  </span>
                </div>

                {item.description && (
                  <p className="mt-2 rounded-md bg-[#F7F6F3] px-3 py-2 text-[13px] leading-relaxed text-[#37352F]">
                    {item.description}
                  </p>
                )}

                {counsellor && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-[#787774]">
                    <Avatar name={counsellor} size={16} />
                    {counsellor}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ListTab({ tab, id, items = [], leadId, onChanged, comments = [], session }) {
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Pending");
  const [priority, setPriority] = useState("Normal");
  const [dueDate, setDueDate] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [editing, setEditing] = useState(null);
  const [openingTask, setOpeningTask] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const isComments = tab.id === "notes";
  const isTask = tab.id === "tasks";
  const isFollowUp = tab.id === "followups";
  const kind = isTask ? "task" : "followUp";

  const resetForm = () => {
    setShowForm(false);
    setEditing(null);
    setTitle("");
    setDescription("");
    setContent("");
    setStatus("Pending");
    setPriority("Normal");
    setDueDate("");
    setFollowUpDate("");
    setFollowUpTime("");
    setMessage("");
  };

  const newItem = () => {
    resetForm();
    setShowForm(true);
  };

  const newComment = () => {
    setContent("");
    setMessage("");
    setShowForm(true);
  };

  const saveComment = async (e) => {
    e.preventDefault();
    const text = content.trim();
    if (!text) return setMessage("Please enter a comment.");

    const user = session?.user || {};
    const createdBy = {
      id: String(user.id || user._id || user.userId || ""),
      name: String(user.name || user.fullName || ""),
      email: String(user.email || ""),
    };
    if (!createdBy.id || !createdBy.name) {
      return setMessage("Counsellor details are missing from the session.");
    }

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/leads/timeline/${leadId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "note", content: text, createdBy }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to add comment.");
      resetForm();
      await onChanged();
    } catch (error) {
      setMessage(error.message || "Unable to add comment.");
    } finally {
      setBusy(false);
    }
  };

  const editItem = (item) => {
    setEditing(item);
    setTitle(item.title || item.subject || "");
    setDescription(item.description || item.text || "");
    setContent(item.comment || item.description || "");
    setStatus(item.status || "Pending");
    setPriority(item.priority || "Normal");
    setDueDate(item.dueDate ? new Date(item.dueDate).toISOString().slice(0, 10) : "");
    setFollowUpDate(item.followUpDate ? new Date(item.followUpDate).toISOString().slice(0, 10) : "");
    setFollowUpTime(item.followUpTime || "");
    setMessage("");
    setShowForm(true);
  };

  const saveItem = async (e) => {
    e.preventDefault();
    setMessage("");
    const payload = isTask
      ? { kind: "task", title: title.trim(), description: description.trim(), status, priority, dueDate: dueDate || null }
      : { kind: "followUp", status, followUpDate: followUpDate || null, followUpTime, comment: content.trim() };

    if (isTask && !payload.title) return setMessage("Task title is required.");
    if (isFollowUp && !payload.followUpDate) return setMessage("Follow-up date is required.");

    setBusy(true);
    try {
      const response = await fetch(`/api/leads/timeline/${leadId}/items`, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { ...payload, itemId: String(editing._id || editing.id), kind } : payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || `Unable to save ${isTask ? "task" : "follow-up"}.`);
      resetForm();
      await onChanged();
    } catch (error) {
      setMessage(error.message || "Unable to save item.");
    } finally {
      setBusy(false);
    }
  };

  const deleteItem = async (item) => {
    const itemId = String(item._id || item.id || "");
    if (!itemId || !window.confirm(`Delete this ${isTask ? "task" : "follow-up"}?`)) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/leads/timeline/${leadId}/items?kind=${kind}&itemId=${encodeURIComponent(itemId)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to delete item.");
      if (openingTask && String(openingTask._id || openingTask.id) === itemId) setOpeningTask(null);
      await onChanged();
    } catch (error) {
      setMessage(error.message || "Unable to delete item.");
    } finally {
      setBusy(false);
    }
  };

  if (tab.id === "location") {
    return <LocationPanel lead={items} leadId={leadId} onChanged={onChanged} />;
  }

  if (tab.id === "Batch") {
    return <StudentBatchDetails id={id} />}

  if (isComments) {
    return (
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><h3 className="text-[15px] font-semibold">Comments</h3><p className="mt-1 text-[13px] text-[#787774]">Add comments to this lead's activity record.</p></div>
          <button type="button" onClick={newComment} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-[#37352F] px-3 text-[13px] font-medium text-white"><Plus size={14} />Add comment</button>
        </div>
        {showForm && (
          <form onSubmit={saveComment} className="mb-5 rounded-xl border border-[#E3E2E0] bg-[#FBFBFA] p-4">
            <label className="mb-2 block text-[13px] font-medium">Write a comment</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your comment here..." rows={4} required autoFocus className="w-full rounded-md border border-[#E3E2E0] bg-white px-3 py-2 text-sm outline-none focus:border-[#787774]" />
            {message && <p className="mt-2 text-[13px] text-red-600">{message}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" disabled={busy} onClick={resetForm} className="h-9 rounded-md border border-[#E3E2E0] px-3 text-[13px]">Cancel</button>
              <button type="submit" disabled={busy || !content.trim()} className="h-9 rounded-md bg-[#37352F] px-4 text-[13px] font-medium text-white disabled:opacity-50">{busy ? "Adding..." : "Save comment"}</button>
            </div>
          </form>
        )}
        {!showForm && message && <p className="mb-3 text-[13px] text-red-600">{message}</p>}
        <div className="mb-3 text-[13px] text-[#787774]">{comments.length} {comments.length === 1 ? "comment" : "comments"}</div>
        {comments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E3E2E0] px-4 py-12 text-center"><MessageCircle size={28} className="mx-auto text-[#9B9A97]" /><p className="mt-3 text-[14px] font-medium">No comments yet</p><p className="mt-1 text-[13px] text-[#787774]">Add the first comment for this lead.</p></div>
        ) : (
          <div className="space-y-3">{comments.map((comment, index) => {
            const text = typeof comment === "string" ? comment : comment.text || comment.comment || comment.content || "";
            const authorData = typeof comment === "object" ? comment.createdBy || comment.author || comment.user : null;
            const author = typeof authorData === "object" ? authorData.name || authorData.fullName || "" : authorData || "";
            const createdAt = typeof comment === "object" ? comment.createdAt || comment.date || comment.timestamp : null;
            return <article key={comment._id || comment.id || `${index}-${text.slice(0, 20)}`} className="rounded-xl border border-[#E9E9E7] bg-white p-4"><div className="flex items-start gap-3"><Avatar name={author || "Counsellor"} size={30} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[13px] font-semibold">{author || "Counsellor"}</p>{createdAt && <time className="text-[12px] text-[#9B9A97]" title={formatDateTime(createdAt)}>{formatDateTime(createdAt)}</time>}</div><p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[#37352F]">{text}</p></div></div></article>;
          })}</div>
        )}
      </section>
    );
  }

  const heading = isTask ? "Tasks" : "Follow-ups";
  const addLabel = isTask ? "Add new task" : "New follow-up";

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-[15px] font-semibold">{heading}</h3><p className="mt-1 text-[13px] text-[#787774]">{isTask ? "Create and manage tasks for this lead." : "Schedule and manage follow-ups for this lead."}</p></div>
        <button type="button" onClick={newItem} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#37352F] px-3 text-[13px] font-medium text-white"><Plus size={14} />{addLabel}</button>
      </div>

      {showForm && (
        <form onSubmit={saveItem} className="mb-5 space-y-3 rounded-xl border border-[#E3E2E0] bg-[#FBFBFA] p-4">
          <h4 className="text-[14px] font-semibold">{editing ? "Edit" : "Create"} {isTask ? "task" : "follow-up"}</h4>
          {isTask ? <>
            <label className="block text-[13px] font-medium">Task title<input required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-[#E3E2E0] bg-white px-3 text-sm" placeholder="e.g. Call the lead" /></label>
            <label className="block text-[13px] font-medium">Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 w-full rounded-md border border-[#E3E2E0] bg-white px-3 py-2 text-sm" placeholder="Task details..." /></label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-[13px] font-medium">Status<select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-[#E3E2E0] bg-white px-2 text-sm"><option>Pending</option><option>In Progress</option><option>Completed</option><option>Cancelled</option></select></label>
              <label className="text-[13px] font-medium">Priority<select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-[#E3E2E0] bg-white px-2 text-sm"><option>Low</option><option>Normal</option><option>High</option><option>Urgent</option></select></label>
              <label className="text-[13px] font-medium">Due date<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-[#E3E2E0] bg-white px-2 text-sm" /></label>
            </div>
          </> : <>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-[13px] font-medium">Follow-up date<input type="date" required value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-[#E3E2E0] bg-white px-2 text-sm" /></label>
              <label className="text-[13px] font-medium">Time<input type="time" value={followUpTime} onChange={(e) => setFollowUpTime(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-[#E3E2E0] bg-white px-2 text-sm" /></label>
              <label className="text-[13px] font-medium">Status<select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-[#E3E2E0] bg-white px-2 text-sm"><option>Pending</option><option>Completed</option><option>Rescheduled</option><option>Cancelled</option></select></label>
            </div>
            <label className="block text-[13px] font-medium">Comment<textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} className="mt-1 w-full rounded-md border border-[#E3E2E0] bg-white px-3 py-2 text-sm" placeholder="Follow-up notes..." /></label>
          </>}
          {message && <p className="text-[13px] text-red-600">{message}</p>}
          <div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={resetForm} className="h-9 rounded-md border border-[#E3E2E0] px-3 text-[13px]">Cancel</button><button type="submit" disabled={busy} className="h-9 rounded-md bg-[#37352F] px-4 text-[13px] font-medium text-white disabled:opacity-50">{busy ? "Saving..." : editing ? "Save changes" : isTask ? "Create task" : "Create follow-up"}</button></div>
        </form>
      )}

      {message && !showForm && <p className="mb-3 text-[13px] text-red-600">{message}</p>}
      {!items.length ? (
        <div className="rounded-xl border border-dashed border-[#E3E2E0] px-4 py-12 text-center"><tab.icon size={28} className="mx-auto text-[#9B9A97]" /><p className="mt-3 text-[14px] font-medium">{isTask ? "No tasks yet" : "No follow-ups yet"}</p><p className="mt-1 text-[13px] text-[#787774]">{isTask ? "Add a task to keep track of the next action." : "Schedule a follow-up for this lead."}</p><button type="button" onClick={newItem} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md border border-[#E3E2E0] px-3 text-[13px]"><Plus size={14} />{addLabel}</button></div>
      ) : (
        <div className="space-y-3">{items.map((item, index) => <article key={item._id || item.id || index} className="rounded-xl border border-[#E9E9E7] bg-white p-4">
          <div className="flex items-start gap-3"><tab.icon size={17} className="mt-1 shrink-0 text-[#9B9A97]" /><div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2"><button type="button" onClick={() => isTask ? setOpeningTask(item) : editItem(item)} className="text-left text-[14px] font-semibold hover:underline">{itemTitle(item)}</button><div className="flex gap-1"><button type="button" title="Open" onClick={() => isTask ? setOpeningTask(item) : editItem(item)} className="rounded-md border border-[#E3E2E0] px-2 py-1 text-xs hover:bg-[#F7F6F3]">{isTask ? "Open task" : "Open"}</button><button type="button" title="Edit" onClick={() => editItem(item)} className="rounded-md p-1.5 text-[#787774] hover:bg-[#F7F6F3]"><Pencil size={14}/></button><button type="button" title="Delete" disabled={busy} onClick={() => deleteItem(item)} className="rounded-md p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 size={14}/></button></div></div>
            {itemText(item) && <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-[#787774]">{itemText(item)}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">{item.status && <Tagged className="bg-[#FDECC8] text-[#402C1B]">{item.status}</Tagged>}{item.priority && <Tagged className="bg-[#E8DEEE] text-[#412454]">{item.priority} priority</Tagged>}</div>
            {item.followUpDate && <p className="mt-2 text-[12px] text-[#787774]">Scheduled: {formatDateTime(item.followUpDate)} {item.followUpTime || ""}</p>}
            {item.dueDate && <p className="mt-2 text-[12px] text-[#787774]">Due: {formatDateTime(item.dueDate)}</p>}
          </div></div>
        </article>)}</div>
      )}

      {openingTask && isTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true" aria-label="Task details">
          <div className="w-full max-w-lg rounded-xl border border-[#E9E9E7] bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-[#9B9A97]">Task details</p><h3 className="mt-1 text-lg font-semibold">{itemTitle(openingTask)}</h3></div><button type="button" onClick={() => setOpeningTask(null)} className="rounded-md border border-[#E3E2E0] px-2 py-1 text-sm">Close</button></div>
            {openingTask.description && <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{openingTask.description}</p>}
            <div className="mt-4 flex flex-wrap gap-2">{openingTask.status && <Tagged className="bg-[#FDECC8] text-[#402C1B]">{openingTask.status}</Tagged>}{openingTask.priority && <Tagged className="bg-[#E8DEEE] text-[#412454]">{openingTask.priority} priority</Tagged>}</div>
            {openingTask.dueDate && <p className="mt-3 text-sm text-[#787774]">Due: {formatDateTime(openingTask.dueDate)}</p>}
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => { setOpeningTask(null); editItem(openingTask); }} className="inline-flex items-center gap-1.5 rounded-md bg-[#37352F] px-3 py-2 text-sm text-white"><Pencil size={14}/>Edit task</button></div>
          </div>
        </div>
      )}
    </section>
  );
}

function LocationPanel({ lead, leadId, onChanged }) {
  const [city, setCity] = useState(lead?.city || "");
  const [location, setLocation] = useState(lead?.location || "");
  const [address, setAddress] = useState(lead?.address || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { setCity(lead?.city || ""); setLocation(lead?.location || ""); setAddress(lead?.address || ""); }, [lead]);
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const res = await fetch(`/api/leads/timeline/${leadId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ city, location, address }) });
      const data = await res.json(); if (!res.ok || !data.success) throw new Error(data.message || "Could not update location");
      setMessage("Location saved."); await onChanged();
    } catch (err) { setMessage(err.message || "Save failed"); } finally { setBusy(false); }
  };
  const query = encodeURIComponent([address, location, city].filter(Boolean).join(", "));
  return <div className="max-w-2xl rounded-xl border border-[#E9E9E7] p-4"><div className="mb-4 flex items-center gap-2"><MapPin size={18}/><div><h3 className="text-[15px] font-semibold">Lead location</h3><p className="text-[13px] text-[#787774]">Save city, area and full address.</p></div></div><form onSubmit={save} className="space-y-3"><label className="block text-[13px] text-[#787774]">City<input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-[#E3E2E0] px-3 text-sm" placeholder="Jaipur"/></label><label className="block text-[13px] text-[#787774]">Area / location<input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-[#E3E2E0] px-3 text-sm" placeholder="Malviya Nagar"/></label><label className="block text-[13px] text-[#787774]">Full address<textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} className="mt-1 w-full rounded-md border border-[#E3E2E0] px-3 py-2 text-sm" placeholder="Street, landmark..."/></label>{message && <p className="text-[13px] text-green-700">{message}</p>}<div className="flex gap-2"><button disabled={busy} type="submit" className="h-8 rounded-md bg-[#37352F] px-4 text-[13px] font-medium text-white">{busy ? "Saving…" : "Save location"}</button>{query && <a href={`https://www.google.com/maps/search/?api=1&query=${query}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-md border border-[#E3E2E0] px-3 text-[13px]"><MapPin size={13}/> Open in Maps</a>}</div></form></div>;
}

/* ---------- Page ---------- */
export default function LeadTimelinePage({session}) {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lead, setLead] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [extras, setExtras] = useState({});
  const [activeTab, setActiveTab] = useState("timeline");

  const reqRef = useRef(0);

  async function loadTimeline() {
    const reqId = ++reqRef.current;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/leads/timeline/${id}`);
      const data = await res.json();
      if (reqId !== reqRef.current) return;
      if (!res.ok || !data?.lead) throw new Error(data?.message || "Failed to load");

      setLead(data.lead);
      setTimeline(data.timeline || []);
      setExtras({
        tasks: data.tasks || [],
        notes: data.notes || [],
        followUps: data.followUps || [],
        batch: data.batch || [],
        files: data.files || [],
        emails: data.emails || [],
        events: data.events || [],
      });
    } catch (err) {
      if (reqId === reqRef.current) {
        console.error("Failed to load timeline", err);
        setError(true);
      }
    } finally {
      if (reqId === reqRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    loadTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const lastActivity = useMemo(() => {
    const times = timeline.map((t) => new Date(t.timestamp).getTime()).filter((n) => !Number.isNaN(n));
    return times.length ? Math.max(...times) : null;
  }, [timeline]);

  /* ----- First load / error ----- */
  if (!lead && loading) {
    return (
      <div className="flex min-h-screen flex-col bg-white" style={{ fontFamily: FONT }}>
        <div className="h-[41px] border-b border-[#E9E9E7]" />
        <div className="flex flex-1 animate-pulse flex-col lg:flex-row">
          <div className="w-full space-y-4 border-b border-[#E9E9E7] p-4 lg:w-[345px] lg:border-b-0 lg:border-r">
            <div className="h-6 w-40 rounded bg-[rgba(55,53,47,0.08)]" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-4 w-full rounded bg-[rgba(55,53,47,0.06)]" />
            ))}
          </div>
          <div className="flex-1 space-y-5 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-48 rounded bg-[rgba(55,53,47,0.08)]" />
                <div className="h-10 w-full rounded bg-[rgba(55,53,47,0.05)]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white" style={{ fontFamily: FONT }}>
        <div className="text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-[#E03E3E]" />
          <p className="text-[15px] font-medium">Couldn&apos;t load this lead</p>
          <p className="mt-1 text-[13px] text-[#787774]">Check your connection and try again.</p>
          <button
            type="button"
            onClick={loadTimeline}
            className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-[#E3E2E0] px-3 text-[13px] transition-colors hover:bg-[rgba(55,53,47,0.06)]"
          >
            <RefreshCcw size={13} />
            Try again
          </button>
        </div>
      </div>
    );
  }

  /* ----- Page ----- */
  const assignedName = nameOf(lead.assignedTo);
  const [statusPill, statusDot] = getStatusStyle(lead.status);
  const waLink = lead.phone;
  const createdAgo = timeAgo(lead.createdAt);
  const lastActivityAgo = lastActivity ? timeAgo(new Date(lastActivity).toISOString()) : null;
  const createdBy = nameOf(lead.createdBy);
  const tags = Array.isArray(lead.tags) ? lead.tags : [];
  const otherCourses = Array.isArray(lead.otherCourses) ? lead.otherCourses : [];
  const followUps = Array.isArray(lead.followUps) ? lead.followUps : [];
  const sidebarFollowUps = (Array.isArray(extras.followUps) && extras.followUps.length
    ? extras.followUps
    : followUps
  ).slice().sort((a, b) => {
    const dateA = new Date(toDateValue(a.followUpDate || a.date || a.createdAt || a.timestamp || 0)).getTime() || 0;
    const dateB = new Date(toDateValue(b.followUpDate || b.date || b.createdAt || b.timestamp || 0)).getTime() || 0;
    return dateB - dateA;
  });
  const latestFollowUp = sidebarFollowUps[0] || null;

  const countFor = (tab) => (tab.id === "timeline" ? timeline.length : tab.id === "location" ? 0 : (extras[tab.key] || []).length);
  const current = TABS.find((t) => t.id === activeTab) || TABS[0];

  const topBtn =
    "inline-flex h-7 items-center gap-1.5 rounded-[5px] border border-[#E3E2E0] bg-white px-2 text-[13px] text-[#37352F] transition-colors hover:bg-[rgba(55,53,47,0.06)]";

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-white text-[#37352F] lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      <header className="flex min-h-[41px] shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#E9E9E7] px-3 py-1">
        
        <div className="flex min-w-0 items-center gap-2">
          
          <nav className="flex min-w-0 items-center gap-1.5 text-[13px]">
            <User size={14} className="shrink-0 text-[#787774]" />
            <span className="text-[#787774]">Leads</span>
            <span className="text-[#C7C6C3]">/</span>
            <span className="truncate font-medium">{lead.name}</span>
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className={topBtn}>
              <Phone size={13} />
              Call
            </a>
          )}
          {waLink && (
            <WhatsAppChat mobile={waLink} name={lead.name} />
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className={topBtn}>
              <Mail size={13} />
              Send email
            </a>
          )}
          <button type="button" onClick={loadTimeline} disabled={loading} className={`${topBtn} disabled:opacity-60`}>
            <RefreshCcw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* ---------- Details sidebar ---------- */}
        <aside className="w-full shrink-0 border-b border-[#E9E9E7] bg-[#FBFBFA] lg:h-full lg:min-h-0 lg:w-[345px] lg:overflow-x-hidden lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="flex h-10 items-center gap-2 border-b border-[#E9E9E7] px-3.5">
            <Avatar name={lead.name} size={22} />
            <h1 className="truncate text-[15px] font-semibold">{lead.name}</h1>
          </div>

          <div className="px-3.5 pb-1 pt-3 text-[14px] font-medium">Fields</div>

          <Section title="General">
            <Field icon={Mail} label="Email" empty={!lead.email}>
              <Pill href={`mailto:${lead.email}`}>{lead.email}</Pill>
            </Field>
            <Field icon={Phone} label="Phone" empty={!lead.phone}>
              <Pill href={`tel:${lead.phone}`}>{lead.phone}</Pill>
            </Field>
            <Field icon={UserRound} label="Profile" empty={!lead.profile}>
              <span className="capitalize">{lead.profile}</span>
            </Field>
            <Field icon={MapPin} label="Location" empty={!(lead.city || lead.location)}>
              {lead.city || lead.location}
            </Field>
          </Section>

          <Section title="Interest">
            <Field icon={BookOpen} label="Course" empty={!lead.course}>
              <Tagged className={`capitalize ${tagColor(lead.course)}`}>{lead.course}</Tagged>
            </Field>
            <Field icon={CircleDot} label="Status" empty={!lead.status}>
              <span className={`inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-2 text-[13px] leading-5 ${statusPill}`}>
                <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot}`} />
                <span className="truncate">{lead.status}</span>
              </span>
            </Field>
            <Field icon={Tag} label="Source" empty={!lead.source}>
              <Tagged className={`capitalize ${tagColor(lead.source)}`}>{lead.source}</Tagged>
            </Field>
            <Field icon={Globe} label="Website" empty={!lead.from}>
              <Tagged className="bg-[#FFE2DD] text-[#5D1715]">{lead.from}</Tagged>
            </Field>
          </Section>

          <Section title="System">
            <Field icon={CalendarDays} label="Created" empty={!createdAgo}>
              <span title={formatDateTime(lead.createdAt)}>{createdAgo}</span>
            </Field>
            <Field icon={Clock} label="Last activity" empty={!lastActivityAgo}>
              <span title={lastActivity ? formatDateTime(new Date(lastActivity).toISOString()) : ""}>
                {lastActivityAgo}
              </span>
            </Field>
            <Field icon={UserRound} label="Created by" empty={!createdBy}>
              {createdBy}
            </Field>
            <Field icon={Hash} label="Lead ID">
              <span className="break-all text-[#787774]">{id}</span>
            </Field>
          </Section>

          <SideCard title="Counsellor" actionIcon={Pencil}>
            {assignedName ? (
              <div className="flex items-center gap-2 text-[13px]">
                <Avatar name={assignedName} size={20} />
                {assignedName}
              </div>
            ) : (
              <span className="text-[13px] text-[#C7C6C3]">No counsellor assigned</span>
            )}
          </SideCard>

          <SideCard title="Other courses" actionIcon={Pencil}>
            {otherCourses.length ? (
              <div className="flex flex-wrap gap-1">
                {otherCourses.map((c, i) => {
                  const label = nameOf(c);
                  return (
                    <Tagged key={`${label}-${i}`} className={tagColor(label)}>
                      {label}
                    </Tagged>
                  );
                })}
              </div>
            ) : (
              <span className="text-[13px] text-[#C7C6C3]">None added</span>
            )}
          </SideCard>

          <SideCard title="Latest follow-up" actionIcon={null}>
            {latestFollowUp ? (
              <div className="rounded-lg border border-[#E9E9E7] bg-white p-2.5">
                <p className="text-[13px] font-medium">{itemTitle(latestFollowUp)}</p>
                {latestFollowUp.comment || latestFollowUp.description ? (
                  <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-[12px] text-[#787774]">
                    {latestFollowUp.comment || latestFollowUp.description}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[12px] text-[#787774]">
                    {formatDateTime(latestFollowUp.followUpDate || latestFollowUp.date || latestFollowUp.createdAt)}
                    {latestFollowUp.followUpTime ? ` · ${latestFollowUp.followUpTime}` : ""}
                  </span>
                  {latestFollowUp.status && (
                    <Tagged className={latestFollowUp.status === "Completed" ? "bg-[#DBEDDB] text-[#1C3829]" : "bg-[#FDECC8] text-[#402C1B]"}>
                      {latestFollowUp.status}
                    </Tagged>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-[13px] text-[#C7C6C3]">No follow-ups scheduled</span>
            )}
          </SideCard>

          <SideCard title="Tags" actionIcon={Plus}>
            {tags.length ? (
              <div className="flex flex-wrap gap-1">
                {tags.map((t, i) => {
                  const label = nameOf(t);
                  return (
                    <Tagged key={`${label}-${i}`} className={tagColor(label)}>
                      {label}
                    </Tagged>
                  );
                })}
              </div>
            ) : (
              <span className="text-[13px] text-[#C7C6C3]">No tags</span>
            )}
          </SideCard>
        </aside>

        {/* ---------- Main panel ---------- */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="relative z-10 flex shrink-0 overflow-x-auto border-b border-[#E9E9E7] bg-white px-2">
            {TABS.map((tab) => {
              const active = tab.id === activeTab;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={active ? "page" : undefined}
                  className={`-mb-px inline-flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-3 text-[13px] transition-colors ${
                    active
                      ? "border-[#37352F] font-medium text-[#37352F]"
                      : "border-transparent text-[#787774] hover:text-[#37352F]"
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                  {countFor(tab) > 0 && <span className="text-[#9B9A97]">{countFor(tab)}</span>}
                </button>
              );
            })}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            <div className="mb-4 flex items-center gap-1.5 text-[14px] font-medium">
              {current.id === "timeline" ? "Activity" : current.label}
              <span className="font-normal text-[#9B9A97]">{countFor(current)}</span>
            </div>

            {current.id === "timeline" ? (
              <TimelineTab timeline={timeline} assignedName={assignedName} />
            ) : (
              <ListTab tab={current} id={id} items={current.id === "location" ? lead : (extras[current.key] || [])} comments={Array.isArray(lead.comments) ? lead.comments : []} leadId={id} session={session} onChanged={loadTimeline} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}