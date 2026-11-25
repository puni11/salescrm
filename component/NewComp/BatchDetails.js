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
  Search,
  Square,
  Trash2,
  Users,
  Wallet,
  Wrench,
  X,
  BookOpen,
} from "lucide-react";

const TABS = ["Overview", "Students", "Tools Planing", "Trainers"];

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
  toolId: "",
  notes: "",
  status: "upcoming",
};

export default function BatchDetails({ batchId, onBack, session }) {
  const [data, setData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [tab, setTab] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Tool-wise daily attendance
  const [attendanceSessionId, setAttendanceSessionId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState("");
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");

  const [editBatch, setEditBatch] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [sessionModal, setSessionModal] = useState(null); // null | {id?}
  const [batchForm, setBatchForm] = useState({});
  const [studentForm, setStudentForm] = useState({});
  const [sessionForm, setSessionForm] = useState(EMPTY_SESSION);
  const [confirm, setConfirm] = useState(null);

  // Assign student modal
  const [assignModal, setAssignModal] = useState(false);

  const endpoint = `/api/batches/${batchId}`;
  const sessionsEndpoint = `${endpoint}/sessions`;
  const attendanceEndpoint = `${endpoint}/attendance`;

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

  // Select an ongoing session assigned to this trainer when today falls
  // between the session start and end dates.
  useEffect(() => {
    if (session?.user?.role !== "trainer" || !data) return;

    const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
    const trainerId = String(session?.user?.id || "");
    const assignedIds = new Set(
      (data.toolTrainerAssignments || [])
        .filter((item) => String(item.trainerId) === trainerId)
        .map((item) => String(item.toolId))
    );

    const eligible = sessions.filter((item) =>
      item.status === "ongoing" &&
      item.toolId &&
      assignedIds.has(String(item.toolId)) &&
      item.date && item.endDate &&
      today >= item.date && today <= item.endDate
    );

    if (eligible.length) {
      setAttendanceSessionId((current) =>
        eligible.some((item) => String(item.id) === current)
          ? current
          : String(eligible[0].id)
      );
      setAttendanceDate((current) => current || today);
    } else {
      setAttendanceSessionId("");
      setAttendanceRows([]);
      setTab((current) => current === "Attendance" ? "Overview" : current);
    }
  }, [data, sessions, session?.user?.role, session?.user?.id]);

  // Fetch saved attendance and the students assigned to the selected tool.
  useEffect(() => {
    if (!attendanceSessionId || !attendanceDate || session?.user?.role !== "trainer") {
      setAttendanceRows([]);
      setAttendanceStats(null);
      return;
    }

    const selected = sessions.find(
      (item) => String(item.id) === String(attendanceSessionId)
    );
    if (!selected?.toolId) return;

    let cancelled = false;
    (async () => {
      setAttendanceLoading(true);
      setAttendanceError("");
      try {
        const params = new URLSearchParams({
          toolId: String(selected.toolId),
          date: attendanceDate,
          fromDate: selected.date,
          toDate: selected.endDate,
        });
        const result = await request(`${attendanceEndpoint}?${params}`, "GET");
        if (!cancelled) {
          setAttendanceRows(result.data.students || []);
          setAttendanceStats(result.data.stats || null);
        }
      } catch (err) {
        if (!cancelled) {
          setAttendanceRows([]);
          setAttendanceStats(null);
          setAttendanceError(err.message || "Unable to load attendance");
        }
      } finally {
        if (!cancelled) setAttendanceLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [attendanceEndpoint, attendanceSessionId, attendanceDate, sessions, session?.user?.role, session?.user?.id]);

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
      setAssignModal(false);
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
    if (!canManage) return;

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
    if (!canManage) return;

    setStudentForm({
      mode: student.mode || "full_course",
      totalFee: student.totalFee ?? 0,
      toolIds: student.toolIds || [],
      isOldStudent: student.isOldStudent ?? false,
      jobGuarantee: student.jobGuarantee ?? false,
    });
    setEditStudent(student);
  };

  const openSessionEditor = (session) => {
    // Trainers can edit existing sessions, but cannot create new ones.
    if (isTrainer && !session) return;
    if (role === "placemenCell") return;

    setSessionForm(
      session
        ? {
            date: session.date || "",
            endDate: session.endDate || session.date || "",
            toolId: session.toolId || "",
            notes: session.notes || "",
            status: session.status || "pending",
          }
        : { ...EMPTY_SESSION }
    );

    setSessionModal(session || {});
  };

  const openAssignModal = () => setAssignModal(true);

  // The batch is selected automatically: it is part of the URL
  const submitAssign = (payload) =>
    run(() => request(`${endpoint}/students`, "POST", payload));

  const submitBatch = (e) => {
    e.preventDefault();
    saveAction({ action: "update_batch", ...batchForm });
  };

  // Send only the fields that actually changed, so toggling
  // Old student / Job guarantee never triggers fee or tool validation.
  const submitStudent = (e) => {
    e.preventDefault();

    const payload = {
      action: "update_student",
      studentId: editStudent.studentId,
    };

    if (studentForm.isOldStudent !== Boolean(editStudent.isOldStudent)) {
      payload.isOldStudent = studentForm.isOldStudent;
    }

    if (studentForm.jobGuarantee !== Boolean(editStudent.jobGuarantee)) {
      payload.jobGuarantee = studentForm.jobGuarantee;
    }

    if (studentForm.mode !== (editStudent.mode || "full_course")) {
      payload.mode = studentForm.mode;
    }

    if (Number(studentForm.totalFee) !== Number(editStudent.totalFee || 0)) {
      payload.totalFee = studentForm.totalFee;
    }

    const originalTools = editStudent.toolIds || [];
    const sameTools =
      studentForm.toolIds.length === originalTools.length &&
      studentForm.toolIds.every((id) => originalTools.includes(id));

    if (!sameTools) {
      payload.toolIds = studentForm.toolIds;
    }

    // Nothing changed: just close the modal.
    if (Object.keys(payload).length === 2) {
      setEditStudent(null);
      return;
    }

    saveAction(payload);
  };

  const submitSession = (e) => {
    e.preventDefault();

    if (!sessionForm.date || !sessionForm.endDate) {
      window.alert("Please fill in starting date and ending date.");
      return;
    }

    if (sessionForm.endDate < sessionForm.date) {
      window.alert("Ending date cannot be before starting date.");
      return;
    }

    if (sessionForm.status === "completed" && !sessionForm.toolId) {
      window.alert("Select a tool before marking this planning entry completed.");
      return;
    }

    const editing = Boolean(sessionModal?.id);

    // A trainer can only update an existing planning entry.
    if (isTrainer && !editing) {
      window.alert("You can edit existing tool planning only.");
      return;
    }

    const payload = {
      date: sessionForm.date,
      endDate: sessionForm.endDate,
      toolId: sessionForm.toolId,
      notes: sessionForm.notes,
      status: sessionForm.status,
    };

    run(async () => {
      const result = await request(
        sessionsEndpoint,
        editing ? "PATCH" : "POST",
        editing ? { sessionId: sessionModal.id, ...payload } : payload
      );

      // Keep batch tool completion synchronized with planning status.
      if (sessionForm.toolId && sessionForm.status === "completed") {
        await request(endpoint, "PATCH", {
          action: "complete_batch_tool",
          toolId: sessionForm.toolId,
        });
      } else if (sessionForm.toolId && sessionForm.status === "ongoing") {
        await request(endpoint, "PATCH", {
          action: "reopen_batch_tool",
          toolId: sessionForm.toolId,
        });
      }

      return result;
    });
  };

  const toggleSession = (session) => {
    if (role === "placemenCell") return;

    const nextStatus = session.status === "completed" ? "ongoing" : "completed";

    run(async () => {
      const result = await request(sessionsEndpoint, "PATCH", {
        sessionId: session.id,
        status: nextStatus,
      });

      if (session.toolId) {
        await request(endpoint, "PATCH", {
          action: nextStatus === "completed"
            ? "complete_batch_tool"
            : "reopen_batch_tool",
          toolId: session.toolId,
        });
      }

      return result;
    });
  };

  const updateAttendanceStatus = (studentId, status) => {
    setAttendanceRows((current) =>
      current.map((student) =>
        String(student.studentId) === String(studentId)
          ? { ...student, attendanceStatus: status }
          : student
      )
    );
  };

  const saveAttendance = async () => {
    if (!selectedAttendanceSession?.toolId || !attendanceDate) return;

    const unmarked = attendanceRows.filter(
      (student) => !["present", "absent"].includes(student.attendanceStatus)
    );

    if (unmarked.length) {
      window.alert(`Please mark attendance for all students. ${unmarked.length} student(s) are still unmarked.`);
      return;
    }

    setAttendanceSaving(true);
    setAttendanceError("");
    try {
      const result = await request(attendanceEndpoint, "POST", {
        toolId: String(selectedAttendanceSession.toolId),
        date: attendanceDate,
        trainerId: String(session?.user?.id || ""),
        records: attendanceRows.map((student) => ({
          studentId: String(student.studentId),
          status: student.attendanceStatus,
        })),
      });
      setNotice(result.message || "Attendance saved successfully");
      // Reload from the database so the UI reflects persisted values.
      const params = new URLSearchParams({
        toolId: String(selectedAttendanceSession.toolId),
        date: attendanceDate,
        fromDate: selectedAttendanceSession.date,
        toDate: selectedAttendanceSession.endDate,
      });
      const refreshed = await request(`${attendanceEndpoint}?${params}`, "GET");
      setAttendanceRows(refreshed.data.students || []);
      setAttendanceStats(refreshed.data.stats || null);
    } catch (err) {
      setAttendanceError(err.message || "Unable to save attendance");
    } finally {
      setAttendanceSaving(false);
    }
  };

  const dailyAttendanceStats = {
    total: attendanceRows.length,
    present: attendanceRows.filter((student) => student.attendanceStatus === "present").length,
    absent: attendanceRows.filter((student) => student.attendanceStatus === "absent").length,
    unmarked: attendanceRows.filter((student) => !["present", "absent"].includes(student.attendanceStatus)).length,
  };
  dailyAttendanceStats.percentage = dailyAttendanceStats.total
    ? Math.round((dailyAttendanceStats.present / dailyAttendanceStats.total) * 100)
    : 0;

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
  const demoRequests = data.demoRequests || [];

  const pendingDemos = demoRequests.filter(
    (item) => item.status?.toLowerCase() === "pending"
  ).length;

  const completedDemos = demoRequests.filter(
    (item) => item.status?.toLowerCase() === "completed"
  ).length;
  const isTrainer = session?.user?.role === "trainer";
  const role = session?.user?.role;
  const trainerId = String(session?.user?.id || "");

  const allTools = data.tools || [];
  const trainers = data.trainers || [];
  const financials = data.financials || {};

  const assignedToolIds = new Set(
    (data.toolTrainerAssignments || [])
      .filter((item) => String(item.trainerId) === trainerId)
      .map((item) => String(item.toolId))
  );

  // Trainers only see tools assigned to their own trainer account.
  const tools = isTrainer
    ? allTools.filter((tool) => assignedToolIds.has(String(tool.id)))
    : allTools;

  // Keep the schedule scoped to the trainer's assigned tools.
  const visibleSessions = isTrainer
    ? sessions.filter((item) => assignedToolIds.has(String(item.toolId)))
    : sessions;

  const todayForAttendance = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
  const eligibleAttendanceSessions = isTrainer
    ? visibleSessions.filter((item) =>
        item.status === "ongoing" &&
        item.toolId &&
        item.date && item.endDate &&
        todayForAttendance >= item.date &&
        todayForAttendance <= item.endDate
      )
    : [];

  const selectedAttendanceSession = eligibleAttendanceSessions.find(
    (item) => String(item.id) === String(attendanceSessionId)
  ) || eligibleAttendanceSessions[0] || null;

  const sessionsDone = visibleSessions.filter((s) => s.status === "completed").length;
  const toolName = (id) => tools.find((t) => String(t.id) === String(id))?.name;

  // Trainers may edit existing tool-planning entries, but cannot add/delete
  // batches, students, tools, or sessions.
  const canManage = !isTrainer && role !== "placemenCell";
  const canEdit = role !== "placemenCell";
  const canAddSession = canManage;

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
          {canManage && (
            <Btn onClick={openBatchEditor}>
              <Pencil size={14} /> Edit
            </Btn>
          )}
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
          {[
            ...TABS.filter((item) => !(isTrainer && item === "Trainers")),
            ...(isTrainer && eligibleAttendanceSessions.length ? ["Attendance"] : []),
          ].map((item) => {
            const count =
              item === "Students" ? students.length
              : item === "Tools Planing" ? visibleSessions.length
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
                {!isTrainer && (
                  <>
                    <Callout icon={IndianRupee} label="Total fees" value={money(financials.totalFees)} />
                    <Callout icon={Wallet} label="Collected" value={money(financials.totalPaid)} />
                    <Callout icon={IndianRupee} label="Balance due" value={money(financials.totalBalance)} />
                  </>
                )}
                <Callout icon={CalendarCheck} label="Sessions done" value={`${sessionsDone} / ${visibleSessions.length}`} />
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

                {!isTrainer && (
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
                )}
              </section>

              <section>
                <SectionTitle
                  title="Recently assigned students"
                  action={<Btn onClick={() => setTab("Students")}>View all</Btn>}
                />
                <StudentTable
                  students={students.slice(0, 5)}
                  {...studentActions}
                  readOnly={isTrainer}
                  hideFinancials={isTrainer}
                />
              </section>
            </>
          )}

          {/* ---------- Students ---------- */}
          {tab === "Students" && (
            <section className="space-y-10">
              {/* Students */}
              <section>
                <SectionTitle
                  title="Students"
                  hint={isTrainer ? `${students.length} assigned` : `${students.length} assigned · ${money(financials.totalPaid)} collected`}
                  action={
                    canManage && (
                      <Btn variant="primary" onClick={openAssignModal}>
                        <Plus size={14} /> Assign student
                      </Btn>
                    )
                  }
                />

                <StudentTable
                  students={students}
                  {...studentActions}
                  readOnly={isTrainer}
                  hideFinancials={isTrainer}
                />
              </section>

              {/* Demo Requests */}
              <section>
                <SectionTitle
                  title="Demo Requests"
                  hint={`${demoRequests.length} demo requests for this batch`}
                />

                {/* Demo Statistics */}
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className={`rounded-md border ${line} p-3`}>
                    <p className={`text-xs ${muted}`}>Total Requests</p>
                    <p className="mt-1 text-2xl font-semibold">{demoRequests.length}</p>
                  </div>

                  <div className={`rounded-md border ${line} p-3`}>
                    <p className={`text-xs ${muted}`}>Pending</p>
                    <p className="mt-1 text-2xl font-semibold text-amber-600">{pendingDemos}</p>
                  </div>

                  <div className={`rounded-md border ${line} p-3`}>
                    <p className={`text-xs ${muted}`}>Completed</p>
                    <p className="mt-1 text-2xl font-semibold text-green-600">{completedDemos}</p>
                  </div>
                </div>

                {/* Demo Request Table */}
                {demoRequests.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[950px] text-left text-sm">
                      <thead className={`border-y ${line} text-xs ${muted}`}>
                        <tr>
                          <th className="px-3 py-2 font-normal">Lead</th>
                          <th className="px-3 py-2 font-normal">Course</th>
                          <th className="px-3 py-2 font-normal">Demo Mode</th>
                          <th className="px-3 py-2 font-normal">Counsellor</th>
                          <th className="px-3 py-2 font-normal">Requested At</th>
                          <th className="px-3 py-2 font-normal">Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {demoRequests.map((demo) => (
                          <tr key={demo.id} className={`border-b ${line} ${hoverBg}`}>
                            <td className="px-3 py-3">
                              <p className="font-medium">{demo.leadName || "Unknown lead"}</p>

                              {demo.leadPhone && (
                                <p className={`mt-1 flex items-center gap-1 text-xs ${muted}`}>
                                  <Phone size={11} />
                                  {demo.leadPhone}
                                </p>
                              )}

                              {demo.leadEmail && (
                                <p className={`mt-1 flex items-center gap-1 text-xs ${muted}`}>
                                  <Mail size={11} />
                                  {demo.leadEmail}
                                </p>
                              )}
                            </td>

                            <td className="px-3 py-3">{demo.course || "—"}</td>

                            <td className="px-3 py-3">
                              <Tag color="blue">{demo.demoMode || "—"}</Tag>
                            </td>

                            <td className="px-3 py-3">
                              {demo.assignedTo?.name || "Unassigned"}
                            </td>

                            <td className="px-3 py-3">{formatDate(demo.requestedAt)}</td>

                            <td className="px-3 py-3">
                              <Status value={demo.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty text="No demo requests for this batch yet." />
                )}
              </section>
            </section>
          )}

          {/* ---------- Sessions ---------- */}
          {tab === "Tools Planing" && (
            <section>
              <SectionTitle
                title="Tools Planing "
                hint={`${sessionsDone} of ${visibleSessions.length} completed`}
                action={
                  canAddSession && (
                    <Btn variant="primary" onClick={() => openSessionEditor(null)}>
                      <Plus size={14} />
                      Add New Tool
                    </Btn>
                  )
                }
              />

              {visibleSessions.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-left text-sm">
                    <thead className={`border-y ${line} text-xs ${muted}`}>
                      <tr>
                        <th className="px-3 py-2 font-normal">Start Date</th>
                        <th className="px-3 py-2 font-normal">End Date</th>
                        <th className="px-3 py-2 font-normal">Tool</th>
                        <th className="px-3 py-2 font-normal">Notes</th>
                        <th className="px-3 py-2 font-normal">Status</th>
                        <th className="px-3 py-2 text-right font-normal">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {visibleSessions.map((row) => (
                        <tr key={row.id} className={`border-b ${line} ${hoverBg}`}>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <CalendarDays size={14} className={muted} />
                              <p className="font-medium">{formatDate(row.date)}</p>
                            </div>
                          </td>

                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <CalendarDays size={14} className={muted} />
                              <p className="font-medium">{formatDate(row.endDate)}</p>
                            </div>
                          </td>

                          <td className="px-3 py-2.5">
                            {row.toolId ? (
                              <Tag color="blue">{toolName(row.toolId) || "Unknown tool"}</Tag>
                            ) : (
                              <span className={muted}>All tools</span>
                            )}
                          </td>

                          <td className="max-w-xs px-3 py-2.5">
                            <span className={`block truncate ${muted}`} title={row.notes || ""}>
                              {row.notes || "—"}
                            </span>
                          </td>

                          <td className="px-3 py-2.5">
                            <button
                              onClick={() => toggleSession(row)}
                              disabled={saving}
                              title="Click to switch status"
                            >
                              <Tag color={row.status === "completed" ? "green" : "yellow"}>
                                {row.status === "completed" && <Check size={12} />}
                                {row.status || "pending"}
                              </Tag>
                            </button>
                          </td>

                          <td className="px-3 py-2.5">
                            <div className="flex justify-end gap-0.5">
                              {canEdit && (
                                <IconBtn onClick={() => openSessionEditor(row)} title="Edit session">
                                  <Pencil size={14} />
                                </IconBtn>
                              )}

                              {canManage && (
                                <IconBtn
                                  danger
                                  title="Delete session"
                                  onClick={() =>
                                    ask({
                                      title: "Delete session?",
                                      message: `Delete session from ${formatDate(
                                        row.date
                                      )} to ${formatDate(row.endDate || row.date)}?`,
                                      confirmLabel: "Delete",
                                      danger: true,
                                      onConfirm: () =>
                                        run(() =>
                                          request(
                                            `${sessionsEndpoint}?sessionId=${row.id}`,
                                            "DELETE"
                                          )
                                        ),
                                    })
                                  }
                                >
                                  <Trash2 size={14} />
                                </IconBtn>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty text={isTrainer ? "No tool planning entries assigned to you." : "No sessions yet. Add the first one with Add New Tool."} />
              )}
            </section>
          )}

          {/* ---------- Trainer attendance ---------- */}
          {isTrainer && tab === "Attendance" && (
            <section className="space-y-4">
              <SectionTitle
                title="Tool Attendance"
                hint="Mark each assigned student's attendance for the selected date."
              />

              {eligibleAttendanceSessions.length ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Ongoing tool session">
                      <select
                        className={inputClass}
                        value={selectedAttendanceSession?.id || ""}
                        onChange={(e) => { setAttendanceSessionId(e.target.value); setAttendanceDate(todayForAttendance); }}
                      >
                        {eligibleAttendanceSessions.map((item) => (
                          <option key={item.id} value={item.id}>
                            {toolName(item.toolId) || "Tool"} ({formatDate(item.date)} – {formatDate(item.endDate)})
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Attendance date">
                      <input
                        type="date"
                        className={inputClass}
                        min={selectedAttendanceSession?.date || undefined}
                        max={selectedAttendanceSession?.endDate || undefined}
                        value={attendanceDate}
                        onChange={(e) => setAttendanceDate(e.target.value)}
                      />
                    </Field>

                    <div className="flex items-end gap-2 text-xs">
                      <Tag color="blue">{attendanceRows.length} students</Tag>
                      <Tag color="green">{dailyAttendanceStats.present} present</Tag>
                      <Tag color="red">{dailyAttendanceStats.absent} absent</Tag>
                    </div>
                  </div>

                  {/* Attendance statistics */}
                  {!attendanceLoading && (
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm font-semibold">Selected day statistics</h3>
                        <p className={`text-xs ${muted}`}>{formatDate(attendanceDate)}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                        <div className={`rounded-lg border ${line} p-3`}>
                          <p className={`text-xs ${muted}`}>Total students</p>
                          <p className="mt-1 text-2xl font-semibold">{dailyAttendanceStats.total}</p>
                        </div>
                        <div className={`rounded-lg border ${line} p-3`}>
                          <p className="text-xs text-green-700">Present</p>
                          <p className="mt-1 text-2xl font-semibold text-green-700">{dailyAttendanceStats.present}</p>
                        </div>
                        <div className={`rounded-lg border ${line} p-3`}>
                          <p className="text-xs text-red-600">Absent</p>
                          <p className="mt-1 text-2xl font-semibold text-red-600">{dailyAttendanceStats.absent}</p>
                        </div>
                        <div className={`rounded-lg border ${line} p-3`}>
                          <p className={`text-xs ${muted}`}>Not marked</p>
                          <p className="mt-1 text-2xl font-semibold">{dailyAttendanceStats.unmarked}</p>
                        </div>
                        <div className={`rounded-lg border ${line} p-3`}>
                          <p className={`text-xs ${muted}`}>Attendance rate</p>
                          <p className="mt-1 text-2xl font-semibold">{dailyAttendanceStats.percentage}%</p>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold">Session overall statistics</h3>
                        <p className={`text-xs ${muted}`}>Across saved attendance dates for this tool</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className={`rounded-lg border ${line} p-3`}>
                          <p className={`text-xs ${muted}`}>Days marked</p>
                          <p className="mt-1 text-2xl font-semibold">{attendanceStats?.daysMarked ?? 0}</p>
                        </div>
                        <div className={`rounded-lg border ${line} p-3`}>
                          <p className="text-xs text-green-700">Total present</p>
                          <p className="mt-1 text-2xl font-semibold text-green-700">{attendanceStats?.present ?? 0}</p>
                        </div>
                        <div className={`rounded-lg border ${line} p-3`}>
                          <p className="text-xs text-red-600">Total absent</p>
                          <p className="mt-1 text-2xl font-semibold text-red-600">{attendanceStats?.absent ?? 0}</p>
                        </div>
                        <div className={`rounded-lg border ${line} p-3`}>
                          <p className={`text-xs ${muted}`}>Overall attendance</p>
                          <p className="mt-1 text-2xl font-semibold">{attendanceStats?.percentage ?? 0}%</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {attendanceError && (
                    <div className="rounded-md bg-[#ffe2dd] px-3 py-2 text-sm text-[#5d1715]">
                      {attendanceError}
                    </div>
                  )}

                  {attendanceLoading ? (
                    <div className={`flex items-center justify-center gap-2 py-10 text-sm ${muted}`}>
                      <RefreshCw size={15} className="animate-spin" /> Loading attendance...
                    </div>
                  ) : attendanceRows.length ? (
                    <div className={`overflow-hidden rounded-lg border ${line}`}>
                      <div className={`flex items-center justify-between border-b ${line} px-3 py-2`}>
                        <div>
                          <p className="text-sm font-medium">{toolName(selectedAttendanceSession?.toolId) || "Selected tool"}</p>
                          <p className={`text-xs ${muted}`}>{formatDate(attendanceDate)}</p>
                        </div>
                        <Btn variant="primary" disabled={attendanceSaving} onClick={saveAttendance}>
                          {attendanceSaving ? "Saving..." : "Save attendance"}
                        </Btn>
                      </div>

                      <div className="divide-y divide-[#e9e9e7]">
                        {attendanceRows.map((student, index) => (
                          <div key={student.studentId} className={`flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between ${hoverBg}`}>
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#efeeec] text-xs font-semibold">
                                {index + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{student.name || "Unnamed student"}</p>
                                <p className={`text-xs ${muted}`}>{student.phone || student.email || ""}</p>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => updateAttendanceStatus(student.studentId, "present")}
                                className={`rounded-md border px-4 py-1.5 text-sm font-medium transition ${student.attendanceStatus === "present" ? "border-green-600 bg-green-600 text-white" : "border-[#d8d8d5] text-[#37352f] hover:bg-[#dbeddb]"}`}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() => updateAttendanceStatus(student.studentId, "absent")}
                                className={`rounded-md border px-4 py-1.5 text-sm font-medium transition ${student.attendanceStatus === "absent" ? "border-red-600 bg-red-600 text-white" : "border-[#d8d8d5] text-[#37352f] hover:bg-[#ffe2dd]"}`}
                              >
                                Absent
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Empty text="No students are assigned to this tool." />
                  )}
                </>
              ) : (
                <Empty text="Attendance is available only when an assigned tool has an ongoing session covering today." />
              )}
            </section>
          )}

          {/* ---------- Trainers ---------- */}
          {!isTrainer && tab === "Trainers" && (
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
                    {canEdit && (
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
                    )}
                  </div>
                );
              }) : <Empty text="No trainers assigned to this batch" />}
            </section>
          )}
        </main>
      </div>

      {/* ---------- Edit batch ---------- */}
      {canManage && editBatch && (
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
      {canManage && editStudent && (
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

            {/* Old student and job guarantee */}
            <div className="space-y-3 rounded-md bg-[#f7f6f3] p-3 text-sm">
              <label className="flex cursor-pointer items-center justify-between gap-3">
                <span>
                  <span className="font-medium">Old student</span>
                  <span className={`block text-xs ${muted}`}>
                    Select if this student studied here before
                  </span>
                </span>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={Boolean(studentForm.isOldStudent)}
                  onChange={(e) =>
                    setStudentForm((current) => ({
                      ...current,
                      isOldStudent: e.target.checked,
                    }))
                  }
                />
              </label>

              <div className="flex items-center justify-between gap-3">
                <span>
                  <span className="font-medium">Job guarantee</span>
                  <span className={`block text-xs ${muted}`}>
                    Enable if this student has a job guarantee
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setStudentForm((current) => ({
                      ...current,
                      jobGuarantee: !current.jobGuarantee,
                    }))
                  }
                  title="Click to switch job guarantee"
                >
                  <Tag color={studentForm.jobGuarantee ? "green" : "gray"}>
                    {studentForm.jobGuarantee ? <Check size={12} /> : null}
                    {studentForm.jobGuarantee ? "Guaranteed" : "Not guaranteed"}
                  </Tag>
                </button>
              </div>
            </div>

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
      {sessionModal && (canEdit && (!isTrainer || Boolean(sessionModal.id))) && (
        <Modal
          title={sessionModal.id ? "Edit Tool Learning" : "Tool Learning"}
          onClose={() => setSessionModal(null)}
        >
          <form onSubmit={submitSession} className="space-y-4">
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
                        current.endDate && current.endDate < e.target.value
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

              <Field label="Tool">
                <select
                  className={inputClass}
                  value={sessionForm.toolId}
                  onChange={(e) => setSessionForm({ ...sessionForm, toolId: e.target.value })}
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
                  onChange={(e) => setSessionForm({ ...sessionForm, status: e.target.value })}
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                </select>
              </Field>
            </div>

            <Field label="Notes (optional)">
              <textarea
                rows={3}
                className={inputClass}
                placeholder="Add session notes..."
                value={sessionForm.notes}
                onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Btn type="button" variant="outline" onClick={() => setSessionModal(null)}>
                Cancel
              </Btn>

              <Btn variant="primary" disabled={saving}>
                {saving ? "Saving..." : sessionModal.id ? "Save changes" : "Add session"}
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* ---------- Assign student ---------- */}
      {canManage && assignModal && (
        <AssignStudentModal
          endpoint={endpoint}
          busy={saving}
          onClose={() => setAssignModal(false)}
          onSubmit={submitAssign}
        />
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

/* ---------- Assign student modal ---------- */
function AssignStudentModal({ endpoint, busy, onClose, onSubmit }) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);

  const [list, setList] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [batch, setBatch] = useState({ fee: 0, tools: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selected, setSelected] = useState(null); // whole student object
  const [mode, setMode] = useState("full_course");
  const [toolIds, setToolIds] = useState([]);
  const [totalFee, setTotalFee] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isOldStudent, setIsOldStudent] = useState(false);
  const [jobGuarantee, setJobGuarantee] = useState(false); // default: not guaranteed

  // Wait a moment after typing before searching
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load students (server-side search + pagination)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: "8" });
        if (debounced) params.set("search", debounced);

        const result = await request(`${endpoint}/students?${params}`, "GET");
        if (cancelled) return;

        setList(result.data.students || []);
        setPagination(result.data.pagination || { total: 0, totalPages: 1 });
        setBatch((current) => {
          // Fill the fee from the batch the first time only
          if (current.id !== result.data.batch?.id) {
            setTotalFee(String(result.data.batch?.fee ?? 0));
          }
          return result.data.batch || current;
        });
      } catch (err) {
        if (!cancelled) setLoadError(err.message || "Unable to load students");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [endpoint, debounced, page]);

  const fee = Number(totalFee) || 0;
  const firstPayment = Number(paymentAmount) || 0;
  const feeError =
    fee < 0 ? "Fee cannot be negative"
    : firstPayment < 0 ? "Payment cannot be negative"
    : firstPayment > fee ? "Payment cannot be more than the total fee"
    : "";

  const canSubmit =
    selected &&
    !busy &&
    !feeError &&
    !(mode === "selected_tools" && toolIds.length === 0);

  const submit = () =>
    onSubmit({
      studentId: selected.id,
      mode,
      toolIds: mode === "selected_tools" ? toolIds : undefined,
      totalFee: fee,
      paymentAmount: firstPayment || undefined,
      isOldStudent,
      jobGuarantee,
    });

  return (
    <Modal title="Assign student" onClose={onClose} width="max-w-xl">
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9b9a97]"
          />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone or email"
            className={`${inputClass} pl-8`}
          />
        </div>

        {/* Student list */}
        <div className={`rounded-md border ${line}`}>
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className={`flex items-center justify-center gap-2 py-10 text-sm ${muted}`}>
                <RefreshCw size={14} className="animate-spin" /> Loading students...
              </div>
            ) : loadError ? (
              <Empty text={loadError} />
            ) : list.length ? (
              list.map((student) => {
                const active = selected?.id === student.id;
                return (
                  <button
                    type="button"
                    key={student.id}
                    onClick={() => setSelected(student)}
                    className={`flex w-full items-center justify-between gap-3 border-b ${line} px-3 py-2.5 text-left text-sm last:border-b-0 ${
                      active ? "bg-[#d3e5ef]" : hoverBg
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{student.name || "Unnamed"}</p>
                      <p className={`mt-0.5 flex flex-wrap gap-x-3 text-xs ${muted}`}>
                        {student.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={11} /> {student.phone}
                          </span>
                        )}
                        {student.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={11} /> {student.email}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {student.status && <Status value={student.status} />}
                      {active && <Check size={15} className="text-[#183347]" />}
                    </div>
                  </button>
                );
              })
            ) : (
              <Empty text={debounced ? "No matching students." : "No students available to assign."} />
            )}
          </div>

          {pagination.totalPages > 1 && (
            <div className={`flex items-center justify-between border-t ${line} px-3 py-1.5 text-xs ${muted}`}>
              <span>
                Page {page} of {pagination.totalPages} · {pagination.total} students
              </span>
              <div className="flex gap-1">
                <Btn type="button" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Btn>
                <Btn
                  type="button"
                  disabled={page >= pagination.totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Btn>
              </div>
            </div>
          )}
        </div>

        {/* Assignment details */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Learning">
            <select
              className={inputClass}
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="full_course">Full course</option>
              <option value="selected_tools">Selected tools</option>
            </select>
          </Field>

          <Field label="Total course fee">
            <input
              type="number"
              min="0"
              className={inputClass}
              value={totalFee}
              onChange={(e) => setTotalFee(e.target.value)}
            />
          </Field>
        </div>

        {mode === "selected_tools" && (
          <Field label="Learning tools">
            <div className={`max-h-36 space-y-1 overflow-y-auto rounded-md border ${line} p-2`}>
              {batch.tools?.length ? (
                batch.tools.map((tool) => (
                  <label
                    key={tool.id}
                    className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm ${hoverBg}`}
                  >
                    <input
                      type="checkbox"
                      checked={toolIds.includes(tool.id)}
                      onChange={(e) =>
                        setToolIds((current) =>
                          e.target.checked
                            ? [...current, tool.id]
                            : current.filter((id) => id !== tool.id)
                        )
                      }
                    />
                    {tool.name}
                  </label>
                ))
              ) : (
                <span className={`text-xs ${muted}`}>This batch has no tools.</span>
              )}
            </div>
          </Field>
        )}

        <Field label="First payment (optional)">
          <input
            type="number"
            min="0"
            className={inputClass}
            placeholder="0"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
          />
        </Field>
        {feeError && <p className="-mt-2 text-xs text-[#eb5757]">{feeError}</p>}

        {/* Two extra details */}
        <div className="space-y-3 rounded-md bg-[#f7f6f3] p-3 text-sm">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span>
              <span className="font-medium">Old student</span>
              <span className={`block text-xs ${muted}`}>
                Select if this student studied here before
              </span>
            </span>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={isOldStudent}
              onChange={(e) => setIsOldStudent(e.target.checked)}
            />
          </label>

          <div className="flex items-center justify-between gap-3">
            <span>
              <span className="font-medium">Job guarantee</span>
              <span className={`block text-xs ${muted}`}>Defaults to not guaranteed</span>
            </span>
            <button
              type="button"
              onClick={() => setJobGuarantee((v) => !v)}
              title="Click to switch"
            >
              <Tag color={jobGuarantee ? "green" : "gray"}>
                {jobGuarantee ? <Check size={12} /> : null}
                {jobGuarantee ? "Guaranteed" : "Not guaranteed"}
              </Tag>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className={`truncate text-xs ${muted}`}>
            {selected ? `Selected: ${selected.name}` : "Click a student to select"}
          </span>
          <div className="flex gap-2">
            <Btn type="button" variant="outline" onClick={onClose}>
              Cancel
            </Btn>
            <Btn type="button" variant="primary" disabled={!canSubmit} onClick={submit}>
              {busy ? "Saving..." : "Assign to batch"}
            </Btn>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Students table ---------- */
function StudentTable({ students, onEdit, onRemove, readOnly = false, hideFinancials = false }) {
  if (!students.length) return <Empty text="No students assigned to this batch" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className={`border-y ${line} text-xs ${muted}`}>
          <tr>
            <th className="px-3 py-2 font-normal">Student</th>
            <th className="px-3 py-2 font-normal">Learning</th>
            <th className="px-3 py-2 font-normal">Tools</th>
            {!hideFinancials && (
              <>
                <th className="px-3 py-2 font-normal">Total</th>
                <th className="px-3 py-2 font-normal">Paid</th>
                <th className="px-3 py-2 font-normal">Balance</th>
                <th className="px-3 py-2 font-normal">Payment</th>
              </>
            )}
            {!readOnly && <th className="px-3 py-2 text-right font-normal" />}
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
                  {student.isOldStudent && <Tag color="yellow">Old student</Tag>}
                  {student.jobGuarantee && <Tag color="green">Job guarantee</Tag>}
                </div>
              </td>
              <td className="max-w-56 px-3 py-2.5">
                <div className="flex flex-wrap gap-1">
                  {student.tools?.length ? student.tools.map((tool) => (
                    <Tag key={tool.id} color="gray">{tool.name}</Tag>
                  )) : "—"}
                </div>
              </td>
              {!hideFinancials && (
                <>
                  <td className="px-3 py-2.5 font-medium">{money(student.totalFee)}</td>
                  <td className="px-3 py-2.5 text-[#2f7d5b]">{money(student.paidFee)}</td>
                  <td className="px-3 py-2.5 text-[#c4554d]">{money(student.balanceDue)}</td>
                  <td className="px-3 py-2.5"><Status value={student.paymentStatus} /></td>
                </>
              )}
              {!readOnly && (
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
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}