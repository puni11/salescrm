"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  Check,
  Clock3,
  IndianRupee,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Square,
  Trash2,
  Users,
  Wallet,
  Wrench,
  X,
  BookOpen,
} from "lucide-react";

const TABS = ["Overview", "Students", "Tools Planing", "Tools", "Trainers"];

/* ---------- Notion palette ---------- */
const ink = "text-[#37352f]";
const muted = "text-[#787774]";
const line = "border-[#e9e9e7]";
const hoverBg = "hover:bg-[#f7f6f3]";

const TAGS = {
  gray: "bg-[#e3e2e0] text-[#32302c]",
  green: "bg-[#dbeddb] text-[#1c3829]",
  yellow: "bg-[#fdecc8] text-[#402c1b]",
  red: "bg-[#ffe2dd] text-[#5d1715]",
  blue: "bg-[#d3e5ef] text-[#183347]",
  purple: "bg-[#e8deee] text-[#412454]",
};

const STATUS_COLOR = {
  active: "green",
  upcoming: "blue",
  inactive: "gray",
  completed: "purple",
  paid: "green",
  partial: "yellow",
  due: "red",
  pending: "yellow",
};

const inputClass =
  "w-full rounded-md border border-[#e0dfdc] bg-white px-2.5 py-1.5 text-sm text-[#37352f] outline-none transition focus:border-[#2383e2] focus:ring-2 focus:ring-[#2383e2]/20";

/* ---------- Formatters ---------- */
const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) return "—";
  const [hours, minutes] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

async function request(url, method, payload) {
  const response = await fetch(url, {
    method,
    cache: "no-store",
    credentials: "include",
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || "Request failed");
  }
  return result;
}

/* ---------- Small building blocks ---------- */
function Tag({ color = "gray", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium capitalize ${TAGS[color]}`}
    >
      {children}
    </span>
  );
}

function Status({ value }) {
  const label = value || "unknown";
  return (
    <Tag color={STATUS_COLOR[String(label).toLowerCase()] || "gray"}>
      {label}
    </Tag>
  );
}

function Btn({ children, variant = "ghost", className = "", ...props }) {
  const styles = {
    ghost: `${hoverBg} ${muted} hover:text-[#37352f]`,
    outline: `border ${line} ${ink} ${hoverBg}`,
    primary: "bg-[#2383e2] text-white hover:bg-[#0b6ec5] disabled:opacity-50",
    danger: "bg-[#eb5757] text-white hover:bg-[#d64545] disabled:opacity-50",
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function IconBtn({ danger, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`rounded p-1.5 text-[#9b9a97] transition ${
        danger
          ? "hover:bg-[#ffe2dd] hover:text-[#eb5757]"
          : "hover:bg-[#efeeec] hover:text-[#37352f]"
      } ${className}`}
    />
  );
}

function Modal({ title, onClose, children, width = "max-w-lg" }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`max-h-[90vh] w-full ${width} overflow-y-auto rounded-lg bg-white shadow-[0_0_0_1px_rgba(15,15,15,0.05),0_16px_40px_rgba(15,15,15,0.2)]`}
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <h2 className={`text-base font-semibold ${ink}`}>{title}</h2>
          <IconBtn onClick={onClose} aria-label="Close">
            <X size={16} />
          </IconBtn>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className={`text-xs ${muted}`}>{label}</span>
      {children}
    </label>
  );
}

function Prop({ icon: Icon, label, children }) {
  return (
    <div className="flex flex-row sm:block min-h-8 items-center gap-2 py-0.5 text-sm">
      <div className={`flex w-36 shrink-0 items-center gap-2 ${muted}`}>
        <Icon size={14} />
        {label}
      </div>
      <div className={ink}>{children || "—"}</div>
    </div>
  );
}

function Callout({ icon: Icon, label, value }) {
  return (
    <div className={`r border-b ${line} px-3.5 py-3`}>
      <div className={`flex items-center gap-1.5 text-xs ${muted}`}>
        <Icon size={13} />
        {label}
      </div>
      <p className={`mt-1.5 text-xl font-semibold ${ink}`}>{value}</p>
    </div>
  );
}

function Empty({ text }) {
  return <div className={`px-3 py-8 text-center text-sm ${muted}`}>{text}</div>;
}

function SectionTitle({ title, hint, action }) {
  return (
    <div className="mb-2 flex items-end justify-between gap-3">
      <div>
        <h2 className={`text-lg font-semibold ${ink}`}>{title}</h2>
        {hint && <p className={`text-sm ${muted}`}>{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- "Are you sure?" popup ---------- */
function ConfirmDialog({ confirm, busy, onCancel, onConfirm }) {
  return (
    <Modal title={confirm.title} onClose={onCancel} width="max-w-md">
      <p className={`text-sm leading-relaxed ${ink}`}>{confirm.message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Btn variant="outline" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn
          variant={confirm.danger ? "danger" : "primary"}
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? "Saving..." : confirm.confirmLabel || "Confirm"}
        </Btn>
      </div>
    </Modal>
  );
}

/* ---------- Main page ---------- */
const EMPTY_SESSION = {
  date: "",
  endDate: "",
  time: "10:00",
  toolId: "",
  notes: "",
  status: "upcoming",
};

export default function BatchDetails({ batchId, onBack }) {
  const [data, setData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [tab, setTab] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [editBatch, setEditBatch] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [sessionModal, setSessionModal] = useState(null); // null | {id?}
  const [batchForm, setBatchForm] = useState({});
  const [studentForm, setStudentForm] = useState({});
  const [sessionForm, setSessionForm] = useState(EMPTY_SESSION);
  const [confirm, setConfirm] = useState(null);

  const endpoint = `/api/batches/${batchId}`;
  const sessionsEndpoint = `${endpoint}/sessions`;

  const loadBatch = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    setError("");
    try {
      const [batchResult, sessionResult] = await Promise.all([
        request(endpoint, "GET"),
        request(sessionsEndpoint, "GET"),
      ]);
      setData(batchResult.data);
      setSessions(sessionResult.data || []);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [batchId, endpoint, sessionsEndpoint]);

  useEffect(() => {
    loadBatch();
  }, [loadBatch]);

  // One helper for every write: runs it, shows a notice, reloads the page data.
  const run = async (fn) => {
    setSaving(true);
    setNotice("");
    try {
      const result = await fn();
      setNotice(result?.message || "Changes saved");
      setEditBatch(false);
      setEditStudent(null);
      setSessionModal(null);
      await loadBatch();
      return true;
    } catch (err) {
      window.alert(err.message || "Unable to save changes");
      return false;
    } finally {
      setSaving(false);
      setConfirm(null);
    }
  };

  const saveAction = (payload) => run(() => request(endpoint, "PATCH", payload));

  const ask = (options) => setConfirm(options);

  const openBatchEditor = () => {
    setBatchForm({
      name: data.name || "",
      startingDate: data.startingDate || "",
      startingTime: data.startingTime || "",
      status: data.status || "upcoming",
      fee: data.fee ?? 0,
    });
    setEditBatch(true);
  };

  const openStudentEditor = (student) => {
    setStudentForm({
      mode: student.mode || "full_course",
      totalFee: student.totalFee ?? 0,
      toolIds: student.toolIds || [],
    });
    setEditStudent(student);
  };

const openSessionEditor = (session) => {
  setSessionForm(
    session
      ? {
          date: session.date || "",
          endDate: session.endDate || session.date || "",
          time: session.time || "10:00",
          toolId: session.toolId || "",
          notes: session.notes || "",
          status: session.status || "pending",
        }
      : { ...EMPTY_SESSION }
  );

  setSessionModal(session || {});
};

  const submitBatch = (e) => {
    e.preventDefault();
    saveAction({ action: "update_batch", ...batchForm });
  };

  const submitStudent = (e) => {
    e.preventDefault();
    saveAction({
      action: "update_student",
      studentId: editStudent.studentId,
      ...studentForm,
    });
  };

const submitSession = (e) => {
  e.preventDefault();

  if (!sessionForm.date || !sessionForm.endDate || !sessionForm.time) {
    window.alert("Please fill in starting date, ending date and time.");
    return;
  }

  if (sessionForm.endDate < sessionForm.date) {
    window.alert("Ending date cannot be before starting date.");
    return;
  }

  const editing = Boolean(sessionModal?.id);

  const payload = {
    date: sessionForm.date,
    endDate: sessionForm.endDate,
    time: sessionForm.time,
    toolId: sessionForm.toolId,
    notes: sessionForm.notes,
    status: sessionForm.status,
  };

  run(() =>
    request(
      sessionsEndpoint,
      editing ? "PATCH" : "POST",
      editing
        ? { sessionId: sessionModal.id, ...payload }
        : payload
    )
  );
};

  const toggleSession = (session) =>
    run(() =>
      request(sessionsEndpoint, "PATCH", {
        sessionId: session.id,
        status: session.status === "completed" ? "pending" : "completed",
      })
    );

  const removeStudent = (student) =>
    ask({
      title: "Remove student?",
      message: `Remove ${student.name} from this batch? Their assignment and payment record will be deleted.`,
      confirmLabel: "Remove",
      danger: true,
      onConfirm: () =>
        saveAction({ action: "remove_student", studentId: student.studentId }),
    });

  // Mark a batch tool completed once. It applies to every student enrolled in it.
  const completeBatchTool = (tool) => {
    const enrolled = students.filter((s) => (s.toolIds || []).includes(tool.id));
    const finishing = enrolled.filter(
      (s) => (s.progress?.done || 0) + 1 === s.progress?.total
    ).length;

    ask({
      title: "Mark tool as completed?",
      message: `Are you sure ${tool.name} is completed? It will be marked completed for ${enrolled.length} student(s) enrolled in it.${
        finishing ? ` ${finishing} of them will have their batch marked complete.` : ""
      }`,
      confirmLabel: "Yes, mark completed",
      onConfirm: () => saveAction({ action: "complete_batch_tool", toolId: tool.id }),
    });
  };

  const reopenBatchTool = (tool) =>
    ask({
      title: "Reopen tool?",
      message: `${tool.name} will be marked as not completed for all its students, and any batch completion that depended on it is cleared.`,
      confirmLabel: "Reopen",
      onConfirm: () => saveAction({ action: "reopen_batch_tool", toolId: tool.id }),
    });

    if (loading && !data) {
    return (
      <div className={`flex min-h-80 items-center justify-center text-sm ${muted}`}>
        <RefreshCw className="mr-2 animate-spin" size={16} />
        Loading batch...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-md bg-[#ffe2dd] p-5">
        <p className="text-sm text-[#5d1715]">{error}</p>
        <Btn variant="outline" className="mt-3 bg-white" onClick={loadBatch}>
          Try again
        </Btn>
      </div>
    );
  }

  if (!data) return null;

  const students = data.students || [];
  const tools = data.tools || [];
  const trainers = data.trainers || [];
  const financials = data.financials || {};
  const sessionsDone = sessions.filter((s) => s.status === "completed").length;
  const toolName = (id) => tools.find((t) => t.id === id)?.name;

  const studentActions = {
    onEdit: openStudentEditor,
    onRemove: removeStudent,
  };

  return (
    <div className={`min-h-screen bg-white ${ink}`}>
      {/* Top bar */}
      <div className={`flex items-center justify-between border-b ${line} px-4 py-2`}>
        <div className={`flex items-center gap-1.5 text-sm ${muted}`}>
          {onBack && (
            <IconBtn onClick={onBack} title="Go back">
              <ArrowLeft size={16} />
            </IconBtn>
          )}
          <span>Batches</span>
          <span>/</span>
          <span className={ink}>{data.name}</span>
        </div>
        <div className="flex gap-1">
          <Btn onClick={openBatchEditor}>
            <Pencil size={14} /> Edit
          </Btn>
          <Btn onClick={loadBatch}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </Btn>
        </div>
      </div>

      <div className="px-6 pb-20">
        {/* Page header */}
        <div className="pt-4">
            
          <h1 className="mt-4 text-3xl font-bold tracking-tight">{data.name}</h1>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-4 mt-5">
            <Prop icon={BookOpen} label="Course">{data.courseName}</Prop>
            <Prop icon={Activity} label="Status"><Status value={data.status} /></Prop>
            <Prop icon={CalendarDays} label="Starts">{formatDate(data.startingDate)}</Prop>
            <Prop icon={Clock3} label="Time">{formatTime(data.startingTime)}</Prop>
          </div>
        </div>

        {/* Tabs */}
        <div className={`mt-8 flex gap-1 overflow-x-auto border-b ${line}`}>
          {TABS.map((item) => {
            const count =
              item === "Students" ? students.length
              : item === "Tools Planing" ? sessions.length
              : item === "Tools" ? tools.length
              : item === "Trainers" ? trainers.length
              : null;
            return (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2 text-sm transition ${
                  tab === item
                    ? "border-[#37352f] font-medium text-[#37352f]"
                    : `border-transparent ${muted} hover:text-[#37352f]`
                }`}
              >
                {item}
                {count !== null && (
                  <span className="rounded bg-[#efeeec] px-1.5 text-xs text-[#787774]">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <main className="space-y-8 pt-6">
          {notice && (
            <div className="flex items-center gap-2 rounded-md bg-[#dbeddb] px-3 py-2 text-sm text-[#1c3829]">
              <Check size={15} />
              {notice}
              <button onClick={() => setNotice("")} className="ml-auto">
                <X size={14} />
              </button>
            </div>
          )}

          {/* ---------- Overview ---------- */}
          {tab === "Overview" && (
            <>
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Callout icon={Users} label="Students" value={students.length} />
                <Callout icon={IndianRupee} label="Total fees" value={money(financials.totalFees)} />
                <Callout icon={Wallet} label="Collected" value={money(financials.totalPaid)} />
                <Callout icon={IndianRupee} label="Balance due" value={money(financials.totalBalance)} />
                 <Callout icon={CalendarCheck} label="Sessions done" value={`${sessionsDone} / ${sessions.length}`} />
              </section>

        

              <section className="grid gap-8 lg:grid-cols-2">
                <div>
                  <SectionTitle title="Tools" />
                  {tools.length ? tools.map((tool) => (
                    <div key={tool.id} className={`flex items-center justify-between rounded px-2 py-2 text-sm ${hoverBg}`}>
                      <span className="flex items-center gap-2 font-medium">
                        <Wrench size={14} className={muted} /> {tool.name}
                      </span>
                      <span className={`text-xs ${muted}`}>
                        {tool.trainers?.map((t) => t.trainerName).join(", ") || "No trainer"}
                      </span>
                    </div>
                  )) : <Empty text="No tools assigned" />}
                </div>

                <div>
                  <SectionTitle title="Trainers" />
                  {trainers.length ? trainers.map((trainer) => (
                    <div key={trainer.id} className={`flex items-center gap-2.5 rounded px-2 py-2 text-sm ${hoverBg}`}>
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-[#efeeec] text-xs font-semibold">
                        {trainer.name?.charAt(0)?.toUpperCase() || "T"}
                      </span>
                      {trainer.name}
                    </div>
                  )) : <Empty text="No trainers assigned" />}
                </div>
              </section>

              <section>
                <SectionTitle
                  title="Recently assigned students"
                  action={<Btn onClick={() => setTab("Students")}>View all</Btn>}
                />
                <StudentTable students={students.slice(0, 5)} {...studentActions} />
              </section>
            </>
          )}

          {/* ---------- Students ---------- */}
          {tab === "Students" && (
            <section>
              <SectionTitle
                title="Students"
                hint={`${students.length} assigned · ${money(financials.totalPaid)} collected`}
              />
              <StudentTable students={students} {...studentActions} />
            </section>
          )}

         {/* ---------- Sessions ---------- */}
{tab === "Tools Planing" && (
  <section>
    <SectionTitle
      title="Tools Planing "
      hint={`${sessionsDone} of ${sessions.length} completed`}
      action={
        <Btn
          variant="primary"
          onClick={() => openSessionEditor(null)}
        >
          <Plus size={14} />
         Add New Tool
        </Btn>
      }
    />

    {sessions.length ? (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className={`border-y ${line} text-xs ${muted}`}>
            <tr>
              <th className="px-3 py-2 font-normal">Start Date</th>
               <th className="px-3 py-2 font-normal">End Date</th>
              <th className="px-3 py-2 font-normal">Tool</th>
              <th className="px-3 py-2 font-normal">Notes</th>
              <th className="px-3 py-2 font-normal">Status</th>
              <th className="px-3 py-2 text-right font-normal">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {sessions.map((session) => (
              <tr
                key={session.id}
                className={`border-b ${line} ${hoverBg}`}
              >
                {/* Date range */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <CalendarDays
                      size={14}
                      className={muted}
                    />

                    <div>
                      <p className="font-medium">
                        {formatDate(session.date)}
                      </p>

                      
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <CalendarDays
                      size={14}
                      className={muted}
                    />

                    <div>
                      <p className="font-medium">
                        {formatDate(session.endDate)}
                      </p>

                      
                    </div>
                  </div>
                </td>
                {/* Tool */}
                <td className="px-3 py-2.5">
                  {session.toolId ? (
                    <Tag color="blue">
                      {toolName(session.toolId) || "Unknown tool"}
                    </Tag>
                  ) : (
                    <span className={muted}>All tools</span>
                  )}
                </td>

                {/* Notes */}
                <td className="max-w-xs px-3 py-2.5">
                  <span
                    className={`block truncate ${muted}`}
                    title={session.notes || ""}
                  >
                    {session.notes || "—"}
                  </span>
                </td>

                {/* Status */}
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => toggleSession(session)}
                    disabled={saving}
                    title="Click to switch status"
                  >
                    <Tag
                      color={
                        session.status === "completed"
                          ? "green"
                          : "yellow"
                      }
                    >
                      {session.status === "completed" && (
                        <Check size={12} />
                      )}
                      {session.status || "pending"}
                    </Tag>
                  </button>
                </td>

                {/* Actions */}
                <td className="px-3 py-2.5">
                  <div className="flex justify-end gap-0.5">
                    <IconBtn
                      onClick={() => openSessionEditor(session)}
                      title="Edit session"
                    >
                      <Pencil size={14} />
                    </IconBtn>

                    <IconBtn
                      danger
                      title="Delete session"
                      onClick={() =>
                        ask({
                          title: "Delete session?",
                          message: `Delete session from ${formatDate(
                            session.date
                          )} to ${formatDate(
                            session.endDate || session.date
                          )}?`,
                          confirmLabel: "Delete",
                          danger: true,
                          onConfirm: () =>
                            run(() =>
                              request(
                                `${sessionsEndpoint}?sessionId=${session.id}`,
                                "DELETE"
                              )
                            ),
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </IconBtn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <Empty text="No sessions yet. Add the first one with New session." />
    )}
  </section>
)}

          {/* ---------- Tools ---------- */}
          {tab === "Tools" && (
            <section>
              <SectionTitle title="Tools" hint="Mark a tool completed once and it applies to every student enrolled in it" />
              {tools.length ? tools.map((tool) => (
                <div key={tool.id} className={`flex items-center justify-between gap-3 border-b ${line} px-2 py-3 ${hoverBg}`}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded bg-[#efeeec]">
                      <Wrench size={15} />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{tool.name}</p>
                      <p className={`text-xs ${muted}`}>
                        {tool.trainers?.map((t) => t.trainerName).join(", ") || "No trainer assigned"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {tool.completed ? (
                      <>
                        <Tag color="green">
                          <Check size={12} /> Completed {formatDate(tool.completedAt)}
                        </Tag>
                        <Btn onClick={() => reopenBatchTool(tool)} disabled={saving}>
                          Undo
                        </Btn>
                      </>
                    ) : (
                      <Btn variant="outline" disabled={saving} onClick={() => completeBatchTool(tool)}>
                        <Square size={14} /> Mark completed
                      </Btn>
                    )}
                    <Status value={tool.status} />
                    <IconBtn
                      danger
                      title="Remove tool"
                      onClick={() =>
                        ask({
                          title: "Remove tool?",
                          message: `Remove ${tool.name} from this batch and all student assignments? Completion records for it will also be removed.`,
                          confirmLabel: "Remove",
                          danger: true,
                          onConfirm: () => saveAction({ action: "remove_tool", toolId: tool.id }),
                        })
                      }
                    >
                      <Trash2 size={15} />
                    </IconBtn>
                  </div>
                </div>
              )) : <Empty text="No tools assigned to this batch" />}
            </section>
          )}

          {/* ---------- Trainers ---------- */}
          {tab === "Trainers" && (
            <section>
              <SectionTitle title="Trainers" hint="Assigned to this batch" />
              {trainers.length ? trainers.map((trainer) => {
                const taught = (data.toolTrainerAssignments || [])
                  .filter((item) => item.trainerId === trainer.id)
                  .map((item) => item.toolName);

                return (
                  <div key={trainer.id} className={`flex items-center justify-between gap-3 border-b ${line} px-2 py-3 ${hoverBg}`}>
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efeeec] text-sm font-semibold">
                        {trainer.name?.charAt(0)?.toUpperCase() || "T"}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{trainer.name}</p>
                        <p className={`text-xs ${muted}`}>
                          Teaches: {taught.length ? [...new Set(taught)].join(", ") : "No tools assigned"}
                        </p>
                      </div>
                    </div>
                    <IconBtn
                      danger
                      title="Remove trainer"
                      onClick={() =>
                        ask({
                          title: "Remove trainer?",
                          message: `Remove ${trainer.name} from this batch?`,
                          confirmLabel: "Remove",
                          danger: true,
                          onConfirm: () => saveAction({ action: "remove_trainer", trainerId: trainer.id }),
                        })
                      }
                    >
                      <Trash2 size={15} />
                    </IconBtn>
                  </div>
                );
              }) : <Empty text="No trainers assigned to this batch" />}
            </section>
          )}
        </main>
      </div>

      {/* ---------- Edit batch ---------- */}
      {editBatch && (
        <Modal title="Edit batch" onClose={() => setEditBatch(false)}>
          <form onSubmit={submitBatch} className="space-y-4">
            <Field label="Batch name">
              <input required className={inputClass} value={batchForm.name}
                onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starting date">
                <input type="date" required className={inputClass} value={batchForm.startingDate}
                  onChange={(e) => setBatchForm({ ...batchForm, startingDate: e.target.value })} />
              </Field>
              <Field label="Starting time">
                <input type="time" required className={inputClass} value={batchForm.startingTime}
                  onChange={(e) => setBatchForm({ ...batchForm, startingTime: e.target.value })} />
              </Field>
              <Field label="Batch fee">
                <input type="number" min="0" className={inputClass} value={batchForm.fee}
                  onChange={(e) => setBatchForm({ ...batchForm, fee: e.target.value })} />
              </Field>
              <Field label="Status">
                <select className={inputClass} value={batchForm.status}
                  onChange={(e) => setBatchForm({ ...batchForm, status: e.target.value })}>
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="completed">Completed</option>
                </select>
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Btn type="button" variant="outline" onClick={() => setEditBatch(false)}>Cancel</Btn>
              <Btn variant="primary" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* ---------- Edit student ---------- */}
      {editStudent && (
        <Modal title={`Edit ${editStudent.name}`} onClose={() => setEditStudent(null)}>
          <form onSubmit={submitStudent} className="space-y-4">
            <Field label="Assignment mode">
              <select className={inputClass} value={studentForm.mode}
                onChange={(e) =>
                  setStudentForm({
                    ...studentForm,
                    mode: e.target.value,
                    toolIds: e.target.value === "full_course" ? tools.map((t) => t.id) : studentForm.toolIds,
                  })
                }>
                <option value="full_course">Full course</option>
                <option value="selected_tools">Selected tools</option>
              </select>
            </Field>

            {studentForm.mode === "selected_tools" && (
              <Field label="Learning tools">
                <div className={`max-h-48 space-y-1 overflow-y-auto rounded-md border ${line} p-2`}>
                  {tools.map((tool) => (
                    <label key={tool.id} className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm ${hoverBg}`}>
                      <input
                        type="checkbox"
                        checked={studentForm.toolIds.includes(tool.id)}
                        onChange={(e) =>
                          setStudentForm((current) => ({
                            ...current,
                            toolIds: e.target.checked
                              ? [...current.toolIds, tool.id]
                              : current.toolIds.filter((id) => id !== tool.id),
                          }))
                        }
                      />
                      {tool.name}
                    </label>
                  ))}
                </div>
              </Field>
            )}

            <Field label="Total course fee">
              <input type="number" min="0" required className={inputClass} value={studentForm.totalFee}
                onChange={(e) => setStudentForm({ ...studentForm, totalFee: e.target.value })} />
            </Field>

            <div className="rounded-md bg-[#f7f6f3] p-3 text-sm">
              <div className="flex justify-between">
                <span className={muted}>Already paid</span>
                <strong>{money(editStudent.paidFee)}</strong>
              </div>
              <div className="mt-1.5 flex justify-between">
                <span className={muted}>Current balance</span>
                <strong>{money(editStudent.balanceDue)}</strong>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Btn type="button" variant="outline" onClick={() => setEditStudent(null)}>Cancel</Btn>
              <Btn
                variant="primary"
                disabled={saving || (studentForm.mode === "selected_tools" && studentForm.toolIds.length === 0)}
              >
                {saving ? "Saving..." : "Save changes"}
              </Btn>
            </div>
          </form>
        </Modal>
      )}

     {/* ---------- Add / edit session ---------- */}
{sessionModal && (
  <Modal
    title={sessionModal.id ? "Edit Tool Learning" : "Tool Learning"}
    onClose={() => setSessionModal(null)}
  >
    <form onSubmit={submitSession} className="space-y-4">

      {/* Starting and ending dates */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starting Date">
          <input
            type="date"
            required
            className={inputClass}
            value={sessionForm.date}
            onChange={(e) =>
              setSessionForm((current) => ({
                ...current,
                date: e.target.value,
                endDate:
                  current.endDate &&
                  current.endDate < e.target.value
                    ? e.target.value
                    : current.endDate,
              }))
            }
          />
        </Field>

        <Field label="Ending Date">
          <input
            type="date"
            required
            min={sessionForm.date || undefined}
            className={inputClass}
            value={sessionForm.endDate}
            onChange={(e) =>
              setSessionForm((current) => ({
                ...current,
                endDate: e.target.value,
              }))
            }
          />
        </Field>

        <Field label="Time">
          <input
            type="time"
            required
            className={inputClass}
            value={sessionForm.time}
            onChange={(e) =>
              setSessionForm({
                ...sessionForm,
                time: e.target.value,
              })
            }
          />
        </Field>

        <Field label="Tool">
          <select
            className={inputClass}
            value={sessionForm.toolId}
            onChange={(e) =>
              setSessionForm({
                ...sessionForm,
                toolId: e.target.value,
              })
            }
          >
            <option value="">All tools</option>

            {tools.map((tool) => (
              <option key={tool.id} value={tool.id}>
                {tool.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Status">
          <select
            className={inputClass}
            value={sessionForm.status}
            onChange={(e) =>
              setSessionForm({
                ...sessionForm,
                status: e.target.value,
              })
            }
          >
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>
        </Field>
      </div>

      {/* Notes */}
      <Field label="Notes (optional)">
        <textarea
          rows={3}
          className={inputClass}
          placeholder="Add session notes..."
          value={sessionForm.notes}
          onChange={(e) =>
            setSessionForm({
              ...sessionForm,
              notes: e.target.value,
            })
          }
        />
      </Field>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Btn
          type="button"
          variant="outline"
          onClick={() => setSessionModal(null)}
        >
          Cancel
        </Btn>

        <Btn variant="primary" disabled={saving}>
          {saving
            ? "Saving..."
            : sessionModal.id
              ? "Save changes"
              : "Add session"}
        </Btn>
      </div>
    </form>
  </Modal>
)}
      {/* ---------- Are you sure? ---------- */}
      {confirm && (
        <ConfirmDialog
          confirm={confirm}
          busy={saving}
          onCancel={() => setConfirm(null)}
          onConfirm={confirm.onConfirm}
        />
      )}
    </div>
  );
}

/* ---------- Students table ---------- */
function StudentTable({ students, onEdit, onRemove }) {
  if (!students.length) return <Empty text="No students assigned to this batch" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className={`border-y ${line} text-xs ${muted}`}>
          <tr>
            <th className="px-3 py-2 font-normal">Student</th>
            <th className="px-3 py-2 font-normal">Learning</th>
            <th className="px-3 py-2 font-normal">Tools</th>
            <th className="px-3 py-2 font-normal">Total</th>
            <th className="px-3 py-2 font-normal">Paid</th>
            <th className="px-3 py-2 font-normal">Balance</th>
            <th className="px-3 py-2 font-normal">Payment</th>
            <th className="px-3 py-2 text-right font-normal" />
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.studentId} className={`border-b ${line} ${hoverBg}`}>
              <td className="px-3 py-2.5">
                <div className="font-medium">{student.name}</div>
                {student.phone && (
                  <div className={`mt-0.5 flex items-center gap-1 text-xs ${muted}`}>
                    <Phone size={11} /> {student.phone}
                  </div>
                )}
                {student.email && (
                  <div className={`mt-0.5 flex items-center gap-1 text-xs ${muted}`}>
                    <Mail size={11} /> {student.email}
                  </div>
                )}
              </td>
              <td className="px-3 py-2.5">
                <div className="flex flex-col items-start gap-1">
                  <Tag color={student.mode === "selected_tools" ? "purple" : "blue"}>
                    {student.mode === "selected_tools" ? "Selected tools" : "Full course"}
                  </Tag>
                  {student.batchCompleted && (
                    <Tag color="green"><Check size={12} /> Batch completed</Tag>
                  )}
                </div>
              </td>
              <td className="max-w-56 px-3 py-2.5">
                <div className="flex flex-wrap gap-1">
                  {student.tools?.length ? student.tools.map((tool) => (
                    <Tag key={tool.id} color="gray">{tool.name}</Tag>
                  )) : "—"}
                </div>
              </td>
              <td className="px-3 py-2.5 font-medium">{money(student.totalFee)}</td>
              <td className="px-3 py-2.5 text-[#2f7d5b]">{money(student.paidFee)}</td>
              <td className="px-3 py-2.5 text-[#c4554d]">{money(student.balanceDue)}</td>
              <td className="px-3 py-2.5"><Status value={student.paymentStatus} /></td>
              <td className="px-3 py-2.5">
                <div className="flex justify-end gap-0.5">
                  <IconBtn onClick={() => onEdit(student)} title="Edit assignment">
                    <Pencil size={14} />
                  </IconBtn>
                  <IconBtn danger onClick={() => onRemove(student)} title="Remove student">
                    <Trash2 size={14} />
                  </IconBtn>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}