"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, X, Loader2, Pencil, Trash2, Search, CalendarDays,
  Users, Wrench, BookOpen, CircleDot, Check, Clock2, User, Tag, Table2, LayoutList, Download,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import BackButton from "@/lib/BackButton";
import * as XLSX from "xlsx";

/* ---------- helpers ---------- */

const formatTime = (value) => {
  if (!value) return "";
  const [hours, minutes] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDate = (value) => {
  if (!value) return "Not set";
  // Parse YYYY-MM-DD as a local date to avoid timezone shifts.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const EMPTY_FORM = {
  name: "",
  courseId: "",
  tools: [],
  trainers: [],
  toolTrainerAssignments: {},
  startingDate: "",
  startingTime: "",
  endingTime: "",
  status: "upcoming",
  batchType: "regular",
};

const STATUS_OPTIONS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "completed", label: "Completed" },
];

const BATCH_TYPE_OPTIONS = [
  { value: "regular", label: "Regular" },
  { value: "special", label: "Special" },
];

// Missing / unknown type always falls back to "regular"
const normalizeBatchType = (value) =>
  String(value || "").toLowerCase() === "special" ? "special" : "regular";

const batchTypeStyles = {
  regular: "bg-[#E3E2E0] text-[#32302C]",
  special: "bg-[#FADEC9] text-[#49290E]",
};

const statusStyles = {
  upcoming: "bg-[#D3E5EF] text-[#183347]",
  active: "bg-[#DBEDDB] text-[#1C3829]",
  inactive: "bg-[#E3E2E0] text-[#32302C]",
  completed: "bg-[#E8DEEE] text-[#412454]",
};

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

const hoverBg = "hover:bg-[rgba(55,53,47,0.06)]";

// Sort order for tool chips: completed first, then ongoing, upcoming, not scheduled.
const TOOL_STATE_ORDER = {
  completed: 0,
  ongoing: 1,
  upcoming: 2,
  notScheduled: 3,
};

const toIdString = (value) => (value ? String(value) : null);

/**
 * Work out the state of every tool in a batch.
 * `toolCompletions` is the source of truth for completed tools; the session
 * fields are used for ongoing / upcoming, and as a fallback for completed.
 */
function getToolStates(batch, batchTools) {
  const completedAtByTool = new Map(
    (batch.toolCompletions || []).map((c) => [
      String(c.toolId),
      c.completedAt ? new Date(c.completedAt).getTime() : 0,
    ])
  );

  const ongoingId = toIdString(batch.latestOngoingSession?.toolId);
  const upcomingId = toIdString(batch.latestUpcomingSession?.toolId);
  const completedSessionId = toIdString(batch.latestCompletedSession?.toolId);

  return batchTools
    .map((tool) => {
      const toolId = String(tool._id);
      let state = "notScheduled";

      if (completedAtByTool.has(toolId)) {
        state = "completed";
      } else if (ongoingId === toolId) {
        state = "ongoing";
      } else if (upcomingId === toolId) {
        state = "upcoming";
      } else if (completedSessionId === toolId) {
        // Fallback: completed session without a toolCompletions entry
        state = "completed";
      }

      return {
        tool,
        state,
        order: TOOL_STATE_ORDER[state],
        completedAt: completedAtByTool.get(toolId) || 0,
      };
    })
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      // Completed tools: oldest completion first
      if (a.state === "completed") return a.completedAt - b.completedAt;
      return 0;
    });
}

/* ---------- small building blocks ---------- */

function Pill({ className = "", children }) {
  return (
    <span
      className={`inline-flex max-w-full items-center truncate rounded-[3px] px-1.5 py-0.5 text-[12px] leading-5 ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Session summary slot.
 * Completed sessions are intentionally muted; active and upcoming stay prominent.
 */
function SessionBlock({ label, dotClass, session, toolName, dateLabel, date, muted = false }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-xs text-[#787774]">
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
        {label}
      </div>

      {session ? (
        <>
          <p className={`mt-1 truncate text-sm font-medium ${muted ? "text-[#A8A7A3]" : "text-[#37352F]"}`}>
            {toolName || session.toolName || "Untitled topic"}
          </p>
          <p className={`mt-0.5 flex items-center gap-1 truncate text-xs ${muted ? "text-[#B8B7B2]" : "text-[#787774]"}`}>
            <User size={12} className="shrink-0 text-[#B8B7B2]" />
            {session.trainerName || "Trainer unavailable"}
          </p>
          {date && (
            <p className={`mt-0.5 text-xs ${muted ? "text-[#C2C1BC]" : "text-[#9B9A97]"}`}>
              {dateLabel} {formatDate(date)}
            </p>
          )}
        </>
      ) : (
        <p className="mt-1 text-sm text-[#C7C6C3]">Nothing scheduled</p>
      )}
    </div>
  );
}

function ToolChip({ name, state }) {
  const styles = {
    ongoing: "bg-[#DBEDDB] text-[#1C3829]",
    upcoming: "bg-[#37352F] text-white",
    notScheduled: "bg-[#37352F] text-white",
    completed:
      "bg-[rgba(55,53,47,0.05)] text-[#9B9A97] line-through decoration-[#C7C6C3] opacity-70",
  };
  const titles = {
    ongoing: "Ongoing",
    upcoming: "Upcoming",
    completed: "Completed",
    notScheduled: "Not scheduled",
  };

  return (
    <span
      title={titles[state]}
      className={`inline-flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[12px] leading-5 transition-opacity ${styles[state]}`}
    >
      {state === "ongoing" && (
        <span className="h-1.5 w-1.5 rounded-full bg-[#2F9E5B]" />
      )}
      {state === "completed" && <Check size={11} className="no-underline" />}
      {name}
    </span>
  );
}

function Property({ icon: Icon, label, hint, children }) {
  return (
    <div className="flex flex-col gap-1 py-0.5 sm:flex-row sm:items-start sm:gap-2">
      <div className="w-36 shrink-0 px-1 py-1.5">
        <div className="flex items-center gap-2 text-sm text-[#787774]">
          <Icon size={15} className="text-[#9B9A97]" />
          {label}
        </div>
        {hint && (
          <p className="mt-0.5 pl-[23px] text-[11px] leading-snug text-[#9B9A97]">
            {hint}
          </p>
        )}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const fieldClass =
  "w-full rounded-[4px] bg-transparent px-2 py-1.5 text-sm text-[#37352F] outline-none transition-colors placeholder:text-[#C7C6C3] hover:bg-[rgba(55,53,47,0.06)] focus:bg-white focus:ring-2 focus:ring-[#2383E2]/40";

// Shared tab button so status tabs and type tabs look identical.
function TabButton({ label, count, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`-mb-px flex items-center gap-1.5 border-b-2 px-2 pb-2 pt-1 text-sm transition-colors ${
        selected
          ? "border-[#37352F] font-medium text-[#37352F]"
          : "border-transparent text-[#787774] hover:text-[#37352F]"
      }`}
    >
      {label}
      <span className="rounded-[3px] bg-[rgba(55,53,47,0.08)] px-1 text-xs text-[#787774]">
        {count}
      </span>
    </button>
  );
}

/* ---------- main component ---------- */

export default function BatchManager({ session }) {
  const isTrainerManager = session?.user?.role === "trainerManager";
  const isTrainer = session?.user?.role === "trainer";
  const trainerId = String(session?.user?.id || "");
  const canManageBatches =
    !isTrainer && session?.user?.role !== "placemenCell";

  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [tools, setTools] = useState([]);
  const [trainers, setTrainers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all"); // "all" | "regular" | "special"

  // Persist each user's preferred batch view without causing an initial overwrite.
  const viewStorageKey = `batch-manager-view:${session?.user?.id || session?.user?.role || "default"}`;
  const [viewMode, setViewMode] = useState("list");
  const [viewPreferenceLoaded, setViewPreferenceLoaded] = useState(false);
  const tableViewportRef = useRef(null);
  const stickyTableScrollRef = useRef(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(1350);

  // Keep a second horizontal scrollbar available at the bottom while the
  // table is long, and keep it synchronized with the table's own scroller.
  useEffect(() => {
    if (viewMode !== "table") return;
    const tableViewport = tableViewportRef.current;
    const table = tableViewport?.querySelector("table");
    if (!tableViewport || !table) return;

    const updateWidth = () => {
      setTableScrollWidth(Math.max(table.scrollWidth, tableViewport.clientWidth));
    };
    updateWidth();
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(updateWidth)
      : null;
    observer?.observe(table);
    observer?.observe(tableViewport);
    window.addEventListener("resize", updateWidth);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, [viewMode, batches.length, search, statusFilter, typeFilter]);

  const syncTableScroll = (source) => {
    const tableViewport = tableViewportRef.current;
    const stickyViewport = stickyTableScrollRef.current;
    if (!tableViewport || !stickyViewport) return;
    if (source === "table") stickyViewport.scrollLeft = tableViewport.scrollLeft;
    else tableViewport.scrollLeft = stickyViewport.scrollLeft;
  };

  useEffect(() => {
    try {
      const savedView = window.localStorage.getItem(viewStorageKey);
      if (savedView === "list" || savedView === "table") setViewMode(savedView);
    } catch (error) {
      console.warn("Unable to read batch view preference", error);
    } finally {
      setViewPreferenceLoaded(true);
    }
  }, [viewStorageKey]);

  useEffect(() => {
    if (!viewPreferenceLoaded) return;
    try {
      window.localStorage.setItem(viewStorageKey, viewMode);
    } catch (error) {
      console.warn("Unable to save batch view preference", error);
    }
  }, [viewMode, viewPreferenceLoaded, viewStorageKey]);

  const loadData = async () => {
    try {
      setLoading(true);

      const requests = [
        fetch("/api/batches"),
        fetch("/api/course/details"),
        fetch("/api/tools"),
      ];

      if (canManageBatches) requests.push(fetch("/api/trainers"));

      const responses = await Promise.all(requests);
      const [batchRes, courseRes, toolRes, trainerRes] = responses;

      const [batchData, courseData, toolData, trainerData] = await Promise.all([
        batchRes.json(),
        courseRes.json(),
        toolRes.json(),
        trainerRes ? trainerRes.json() : Promise.resolve({ success: true, data: [] }),
      ]);

      if (!batchRes.ok || !batchData.success)
        throw new Error(batchData.message || "Failed to load batches");
      if (!courseRes.ok || !courseData.success)
        throw new Error(courseData.message || "Failed to load courses");
      if (!toolRes.ok || !toolData.success)
        throw new Error(toolData.message || "Failed to load tools");
      if (trainerRes && (!trainerRes.ok || !trainerData.success))
        throw new Error(trainerData.message || "Failed to load trainers");

      const batchList = batchData.data || [];
      setBatches(batchList);
      setCourses(courseData.data || []);

      if (isTrainer) {
        const assignedToolIds = new Set(
          batchList.flatMap((batch) =>
            (batch.toolTrainerAssignments || [])
              .filter((assignment) => String(assignment.trainerId) === trainerId)
              .map((assignment) => String(assignment.toolId))
          )
        );
        setTools((toolData.data || []).filter((tool) => assignedToolIds.has(String(tool._id))));
      } else {
        setTools(toolData.data || []);
      }

      setTrainers(trainerData.data || []);
    } catch (error) {
      toast.error(error.message || "Failed to load batch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const counts = useMemo(
    () => ({
      total: batches.length,
      upcoming: batches.filter((b) => b.status === "upcoming").length,
      active: batches.filter((b) => b.status === "active").length,
      inactive: batches.filter((b) => b.status === "inactive").length,
      completed: batches.filter((b) => b.status === "completed").length,
      regular: batches.filter(
        (b) => normalizeBatchType(b.batchType) === "regular"
      ).length,
      special: batches.filter(
        (b) => normalizeBatchType(b.batchType) === "special"
      ).length,
    }),
    [batches]
  );

  const filteredBatches = useMemo(() => {
    const query = search.trim().toLowerCase();

    return batches.filter((batch) => {
      const matchesSearch =
        batch.name?.toLowerCase().includes(query) ||
        courses
          .find((c) => String(c._id) === String(batch.courseId))
          ?.name?.toLowerCase()
          .includes(query) ||
        normalizeBatchType(batch.batchType).includes(query);

      const matchesStatus =
        statusFilter === "all" || batch.status === statusFilter;

      const matchesType =
        typeFilter === "all" ||
        normalizeBatchType(batch.batchType) === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [batches, courses, search, statusFilter, typeFilter]);

  const getCourse = (id) =>
    courses.find((course) => String(course._id) === String(id));

  const getTool = (id) =>
    tools.find((tool) => String(tool._id) === String(id));

  // Prefer the tool's short name when available.
  const getToolDisplayName = (toolOrId) => {
    const tool =
      typeof toolOrId === "object" && toolOrId !== null
        ? toolOrId
        : getTool(toolOrId);
    return tool?.shortName?.trim() || tool?.name || "Tool";
  };

  const getTrainer = (id) =>
    trainers.find((trainer) => String(trainer._id) === String(id));

  // Export only the requested batch summary columns to Excel.
  const handleExportExcel = () => {
    try {
      if (!filteredBatches.length) {
        toast.error("No batches available to export");
        return;
      }

      const rows = filteredBatches.map((batch) => ({
        "Batch Name": batch.name || "",
        "No. of Students": Number(batch.studentCount) || 0,
        "New Students": Number(batch.newStudentCount) || 0,
        "Old Students": Number(batch.oldStudentCount) || 0,
        "Total Fee": isTrainer ? "" : Number(batch.financials?.totalFees) || 0,
        "Collected Fee": isTrainer ? "" : Number(batch.financials?.totalPaid) || 0,
        "Due Fee": isTrainer ? "" : Number(batch.financials?.totalBalance) || 0,
        "Batch Start Date": batch.startingDate || "",
        "Batch Timing": [
          batch.startingTime ? formatTime(batch.startingTime) : "",
          batch.endingTime ? formatTime(batch.endingTime) : "",
        ].filter(Boolean).join(" - "),
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows, {
        header: [
          "Batch Name",
          "No. of Students",
          "New Students",
          "Old Students",
          "Total Fee",
          "Collected Fee",
          "Due Fee",
          "Batch Start Date",
          "Batch Timing",
        ],
      });

      worksheet["!cols"] = [
        { wch: 28 },
        { wch: 16 },
        { wch: 15 },
        { wch: 15 },
        { wch: 16 },
        { wch: 18 },
        { wch: 16 },
        { wch: 18 },
        { wch: 24 },
      ];

      // Format fee columns as Indian rupee values in Excel.
      if (!isTrainer) {
        for (let row = 2; row <= rows.length + 1; row++) {
          for (const col of ["E", "F", "G"]) {
            const cell = worksheet[`${col}${row}`];
            if (cell) cell.z = '₹#,##0.00';
          }
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Batch Summary");

      const fileDate = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `Batch_Summary_${fileDate}.xlsx`);
      toast.success("Excel exported successfully");
    } catch (error) {
      console.error("Batch Excel export failed:", error);
      toast.error("Failed to export Excel");
    }
  };

  // Short name for a session's tool; falls back to the session's own toolName.
  const getSessionToolName = (session) => {
    const tool = session?.toolId ? getTool(session.toolId) : null;
    return tool ? getToolDisplayName(tool) : session?.toolName;
  };

  const openCreate = () => {
    if (!canManageBatches) return;
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      courseId: courses[0]?._id || "",
      // Pre-select the type tab the user is currently viewing
      batchType: typeFilter === "special" ? "special" : "regular",
      tools: [],
      trainers: [],
      toolTrainerAssignments: {},
    });
    setShowModal(true);
  };

  const openEdit = (batch) => {
    if (!canManageBatches) return;
    setEditingId(batch._id);
    setForm({
      name: batch.name || "",
      courseId: String(batch.courseId || ""),
      tools: (batch.tools || []).map(String),
      trainers: (batch.trainers || []).map(String),
      toolTrainerAssignments: Array.isArray(batch.toolTrainerAssignments)
        ? batch.toolTrainerAssignments.reduce((acc, item) => {
            if (item?.toolId && item?.trainerId) {
              acc[String(item.toolId)] = String(item.trainerId);
            }
            return acc;
          }, {})
        : {},
      startingDate: batch.startingDate || "",
      startingTime: batch.startingTime || "",
      endingTime: batch.endingTime || "",
      status: batch.status || "upcoming",
      batchType: normalizeBatchType(batch.batchType),
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  useEffect(() => {
    if (!showModal) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, saving]);

  const toggleTool = (id) => {
    setForm((previous) => {
      const tools = previous.tools.includes(id)
        ? previous.tools.filter((item) => item !== id)
        : [...previous.tools, id];

      const toolTrainerAssignments = { ...previous.toolTrainerAssignments };
      if (!tools.includes(id)) delete toolTrainerAssignments[id];

      const trainers = [...new Set(Object.values(toolTrainerAssignments))];
      return { ...previous, tools, trainers, toolTrainerAssignments };
    });
  };

  const assignTrainerToTool = (toolId, trainerId) => {
    const trainer = trainerId ? getTrainer(trainerId) : null;

    if (trainerId && (!trainer || trainer.status !== "active")) {
      toast.error("Only active trainers can be assigned");
      return;
    }

    if (
      trainerId &&
      !(trainer.tools || []).some((id) => String(id) === String(toolId))
    ) {
      toast.error("This trainer does not teach this tool");
      return;
    }

    setForm((previous) => {
      const toolTrainerAssignments = { ...previous.toolTrainerAssignments };
      if (trainerId) toolTrainerAssignments[toolId] = trainerId;
      else delete toolTrainerAssignments[toolId];

      return {
        ...previous,
        toolTrainerAssignments,
        trainers: [...new Set(Object.values(toolTrainerAssignments))],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManageBatches) return toast.error("You do not have permission to manage batches");

    if (!form.name.trim()) return toast.error("Enter a batch name");
    if (!form.courseId) return toast.error("Select a course");
    if (!form.startingDate) return toast.error("Select a starting date");
    if (form.tools.length === 0) return toast.error("Select at least one tool");

    const assignments = form.tools.map((toolId) => ({
      toolId,
      trainerId: form.toolTrainerAssignments[toolId] || "",
    }));

    if (assignments.some((item) => !item.trainerId)) {
      return toast.error("Assign a trainer to every selected tool");
    }

    const invalidAssignment = assignments.some(({ toolId, trainerId }) => {
      const trainer = getTrainer(trainerId);
      return (
        !trainer ||
        trainer.status !== "active" ||
        !(trainer.tools || []).some((id) => String(id) === String(toolId))
      );
    });

    if (invalidAssignment) {
      return toast.error(
        "Each trainer must be active and teach their assigned tool"
      );
    }

    const assignedTrainerIds = [
      ...new Set(assignments.map((item) => item.trainerId)),
    ];

    try {
      setSaving(true);

      const res = await fetch(
        editingId ? `/api/batches?id=${editingId}` : "/api/batches",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            courseId: form.courseId,
            tools: form.tools,
            trainers: assignedTrainerIds,
            toolTrainerAssignments: assignments,
            startingDate: form.startingDate,
            startingTime: form.startingTime,
            endingTime: form.endingTime,
            status: form.status,
            batchType: normalizeBatchType(form.batchType),
          }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save batch");
      }

      toast.success(
        editingId ? "Batch updated successfully" : "Batch created successfully"
      );

      setShowModal(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadData();
    } catch (error) {
      toast.error(error.message || "Failed to save batch");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (batch, status) => {
    if (!canManageBatches) return;
    try {
      const res = await fetch(`/api/batches?id=${batch._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update batch");
      }

      setBatches((previous) =>
        previous.map((item) =>
          item._id === batch._id ? { ...item, status } : item
        )
      );
      toast.success("Batch status updated");
    } catch (error) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const deleteBatch = async (batch) => {
    if (!canManageBatches) return;
    if (!window.confirm(`Permanently delete "${batch.name}"?`)) return;

    try {
      setDeletingId(batch._id);

      const res = await fetch(`/api/batches?id=${batch._id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete batch");
      }

      setBatches((previous) =>
        previous.filter((item) => item._id !== batch._id)
      );
      toast.success("Batch deleted successfully");
    } catch (error) {
      toast.error(error.message || "Failed to delete batch");
    } finally {
      setDeletingId(null);
    }
  };

  const tabs = [
    ["all", "All", counts.total],
    ...STATUS_OPTIONS.map((s) => [s.value, s.label, counts[s.value]]),
  ];

  const typeTabs = [
    ["regular", "Regular Batch", counts.regular],
    ["special", "Special Batch", counts.special],
  ];

  const isFiltered = search || statusFilter !== "all" || typeFilter !== "all";

  return (
    <div className="w-full text-[#37352F]">
      {/* Page header */}
      <BackButton />
      <div className="mb-6">
        <h2 className="mt-3 text-[24px] font-bold leading-tight tracking-[-0.01em] sm:text-[32px]">
          Batches
        </h2>
        <p className="mt-1 text-[15px] text-[#787774]">
          {isTrainer
            ? "View your assigned tools and session schedules."
            : "Organize course schedules, tools, and trainer assignments."}
        </p>
      </div>

      {/* Tabs + toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E9E9E7]">
        <div className="flex flex-wrap items-center gap-1">
          {/* Status tabs */}
          {tabs.map(([key, label, count]) => (
            <TabButton
              key={key}
              label={label}
              count={count}
              selected={statusFilter === key}
              onClick={() => setStatusFilter(key)}
            />
          ))}

          {/* Divider */}
          <span
            className="mx-1.5 -mb-px h-4 w-px self-center bg-[#E3E2E0]"
            aria-hidden="true"
          />

          {/* Batch type tabs (click again to clear) */}
          {typeTabs.map(([key, label, count]) => {
            const selected = typeFilter === key;
            return (
              <TabButton
                key={key}
                label={label}
                count={count}
                selected={selected}
                onClick={() => setTypeFilter(selected ? "all" : key)}
              />
            );
          })}
        </div>

        <div className="flex items-center gap-1 pb-1.5">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[#9B9A97]"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="h-7 w-32 rounded-[4px] bg-transparent pl-7 pr-2 text-sm outline-none transition-all placeholder:text-[#9B9A97] hover:bg-[rgba(55,53,47,0.06)] focus:w-52 focus:bg-white focus:ring-2 focus:ring-[#2383E2]/40"
            />
          </div>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={loading || filteredBatches.length === 0}
            className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[#E3E2E0] bg-white px-2.5 text-xs font-medium text-[#37352F] transition-colors hover:bg-[#F7F6F3] disabled:cursor-not-allowed disabled:opacity-40"
            title="Export filtered batches to Excel"
          >
            <Download size={14} /> Export Excel
          </button>
          <div className="ml-2 inline-flex h-8 items-center rounded-[5px] border border-[#E3E2E0] bg-white p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              aria-label="List view"
              aria-pressed={viewMode === "list"}
              title="List view"
              className={`inline-flex h-7 items-center gap-1.5 rounded-[3px] px-2 text-xs transition-colors ${viewMode === "list" ? "bg-[#F1F1EF] font-medium text-[#37352F]" : "text-[#787774] hover:bg-[#F7F6F3]"}`}
            >
              <LayoutList size={14} /> List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              aria-label="Table view"
              aria-pressed={viewMode === "table"}
              title="Table view"
              className={`inline-flex h-7 items-center gap-1.5 rounded-[3px] px-2 text-xs transition-colors ${viewMode === "table" ? "bg-[#F1F1EF] font-medium text-[#37352F]" : "text-[#787774] hover:bg-[#F7F6F3]"}`}
            >
              <Table2 size={14} /> Table
            </button>
          </div>
          {canManageBatches && (
            <button
              onClick={openCreate}
              className="ml-1 inline-flex h-7 items-center gap-1 rounded-[4px] bg-[#2383E2] px-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0077D4]"
            >
              <Plus size={15} /> New
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#9B9A97]">
            <Loader2 size={16} className="animate-spin" /> Loading batches
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-sm text-[#787774]">
              {isFiltered
                ? "No matching batches found."
                : isTrainer
                ? "No batches or tools are currently assigned to you."
                : "No batches created yet."}
            </p>
            {!isTrainer && (
              <p className="mt-1 text-xs text-[#9B9A97]">
                Create a batch to organize a course and its trainers.
              </p>
            )}
            {!isFiltered && canManageBatches && (
              <button
                onClick={openCreate}
                className="mt-2 text-sm text-[#2383E2] hover:underline"
              >
                Create your first batch
              </button>
            )}
          </div>
        ) : viewMode === "table" ? (
          <>
          <div ref={tableViewportRef} onScroll={() => syncTableScroll("table")} className="mt-2 overflow-x-auto rounded-[5px] border border-[#E9E9E7]">
            <table className="w-full min-w-[1950px] border-collapse text-left">
              <thead className="bg-[#FAFAF9]">
                <tr className="border-b border-[#E9E9E7]">
                  {["Batch", "Course / Type", "Batch Summary", "Start date", "Schedule", "Trainers", "Ongoing tools", "Upcoming tools", "Remaining tools", "Completed tools", "Status", "Actions"].map((heading) => (
                    <th key={heading} className="whitespace-nowrap px-3 py-3 text-xs font-medium text-[#787774]">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map((batch) => {
                  const course = getCourse(batch.courseId);
                  const trainerAssignments = (batch.toolTrainerAssignments || []).filter(
                    (assignment) => String(assignment?.trainerId) === trainerId
                  );
                  const assignedToolIds = new Set(trainerAssignments.map((assignment) => String(assignment.toolId)));
                  const visibleToolIds = isTrainer ? assignedToolIds : new Set((batch.tools || []).map(String));
                  const rowTools = (batch.tools || [])
                    .filter((toolId) => visibleToolIds.has(String(toolId)))
                    .map((toolId) => getTool(toolId))
                    .filter(Boolean);
                  const rowTrainerIds = isTrainer
                    ? [...new Set(trainerAssignments.map((item) => String(item.trainerId)))]
                    : [...new Set((batch.toolTrainerAssignments || []).map((item) => String(item.trainerId)))];
                  const rowToolStates = getToolStates(batch, rowTools);
                  const ongoingTools = rowToolStates.filter((item) => item.state === "ongoing");
                  const upcomingTools = rowToolStates.filter((item) => item.state === "upcoming");
                  const remainingTools = rowToolStates.filter((item) => item.state === "notScheduled");
                  const completedTools = rowToolStates.filter((item) => item.state === "completed");
                  const renderToolGroup = (items, emptyLabel, className, state) => (
                    <div className={`flex ${items === remainingTools ? "min-w-[320px]" : "min-w-[220px]"} flex-wrap items-center gap-x-2 gap-y-1`}>
                      {items.length ? items.map(({ tool }) => {
                        const scheduledSession = (batch.sessions || [])
                          .filter((session) => String(session.toolId) === String(tool._id))
                          .find((session) => session.status === state) ||
                          (state === "ongoing" ? batch.latestOngoingSession : batch.latestUpcomingSession);
                        const sessionMatchesTool = scheduledSession && String(scheduledSession.toolId) === String(tool._id);
                        const startDate = sessionMatchesTool
                          ? (scheduledSession.startDate || scheduledSession.date)
                          : null;
                        const endDate = sessionMatchesTool ? scheduledSession.endDate : null;
                        return (
                          <div key={tool._id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <Pill className={className}>{getToolDisplayName(tool)}</Pill>
                            {(startDate || endDate) && (
                              <span className="whitespace-nowrap text-[11px] leading-4 text-[#787774]">
                                {startDate ? `Start: ${formatDate(startDate)}` : "Start: —"}
                                {" · "}
                                {endDate ? `End: ${formatDate(endDate)}` : "End: —"}
                              </span>
                            )}
                          </div>
                        );
                      }) : <span className="text-xs text-[#C7C6C3]">{emptyLabel}</span>}
                    </div>
                  );
                  const rowStatus = batch.status || "inactive";
                  const rowType = normalizeBatchType(batch.batchType);
                  const rowTiming = batch.startingTime && batch.endingTime
                    ? `${formatTime(batch.startingTime)} – ${formatTime(batch.endingTime)}`
                    : formatTime(batch.startingTime) || "Time not set";
                  return (
                    <tr key={batch._id} className="border-b border-[#E9E9E7] last:border-0 hover:bg-[rgba(55,53,47,0.025)]">
                      <td className="px-3 py-3">
                        <Link href={isTrainer ? `/trainer/batches/${batch._id}` : `/batches/${batch._id}`} className="leading-0 text-sm font-bold text-[#37352F] hover:underline">{batch.name || "Untitled batch"}</Link>
                        <p className="mt-0.5 text-xs text-[#9B9A97]">{batch._id}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Pill className={course ? tagColor(course._id) : "bg-[#F1F1EF] text-[#787774]"}>{course?.name || "Course unavailable"}</Pill>
                          <Pill className={batchTypeStyles[rowType]}>{rowType === "special" ? "Special" : "Regular"}</Pill>
                        </div>
                      </td>
                      <td className="min-w-[220px] px-3 py-3">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap gap-1">
                            <Pill className="bg-[#E3E2E0] text-[#32302C]">Total: {batch.studentCount || 0}</Pill>
                            <Pill className="bg-[#DBEDDB] text-[#1C3829]">New: {batch.newStudentCount || 0}</Pill>
                            <Pill className="bg-[#FDECC8] text-[#402C1B]">Old: {batch.oldStudentCount || 0}</Pill>
                          </div>
                          {!isTrainer && (
                            <div className="space-y-0.5 text-xs">
                              <p className="text-[#787774]">Fees: {formatMoney(batch.financials?.totalFees)}</p>
                              <p className="text-[#1C8B50]">Paid: {formatMoney(batch.financials?.totalPaid)}</p>
                              <p className="text-[#C4554D]">Due: {formatMoney(batch.financials?.totalBalance)}</p>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm text-[#787774]">{formatDate(batch.startingDate)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm text-[#787774]">{rowTiming}</td>
                      <td className="px-3 py-3">
                        <div className="flex max-w-[190px] flex-wrap gap-1">
                          {rowTrainerIds.length ? rowTrainerIds.map((id) => (
                            <Pill key={id} className={tagColor(id)}>{getTrainer(id)?.name || "Trainer"}</Pill>
                          )) : <span className="text-xs text-[#C7C6C3]">No trainer</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3">{renderToolGroup(ongoingTools, "None", "bg-[#DBEDDB] text-[#1C3829]", "ongoing")}</td>
                      <td className="px-3 py-3">{renderToolGroup(upcomingTools, "None", "bg-[#D3E5EF] text-[#183347]", "upcoming")}</td>
                      <td className="min-w-[340px] px-3 py-3">{renderToolGroup(remainingTools, "None", "bg-[#FDECC8] text-[#402C1B]")}</td>
                      <td className="px-3 py-3">
                        {completedTools.length ? (
                          <div className="flex min-w-[150px] flex-wrap items-center gap-x-2 gap-y-1 opacity-45">
                            {completedTools.map(({ tool }) => (
                              <div key={tool._id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <Pill className="bg-[#E8DEEE] text-[#412454] line-through">{getToolDisplayName(tool)}</Pill>
                                <span className="text-[11px] text-[#9B9A97]">Completed</span>
                              </div>
                            ))}
                          </div>
                        ) : <span className="text-xs text-[#C7C6C3]">None</span>}
                      </td>
                      <td className="px-3 py-3">
                        {isTrainer ? (
                          <Pill className={statusStyles[rowStatus] || statusStyles.inactive}>{STATUS_OPTIONS.find((item) => item.value === rowStatus)?.label || rowStatus}</Pill>
                        ) : (
                          <select aria-label={`Change status for ${batch.name}`} value={rowStatus} onChange={(event) => changeStatus(batch, event.target.value)} className={`cursor-pointer rounded-[3px] border-0 px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2]/40 ${statusStyles[rowStatus] || statusStyles.inactive}`}>
                            {STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {canManageBatches ? (
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => openEdit(batch)} aria-label={`Edit ${batch.name}`} title="Edit batch" className={`rounded-[4px] p-1.5 text-[#787774] ${hoverBg}`}><Pencil size={14} /></button>
                            <button type="button" onClick={() => deleteBatch(batch)} disabled={deletingId === batch._id} aria-label={`Delete ${batch.name}`} title="Delete batch" className="rounded-[4px] p-1.5 text-[#787774] transition-colors hover:bg-[#FFE2DD] hover:text-[#E03E3E] disabled:opacity-50">{deletingId === batch._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}</button>
                          </div>
                        ) : <span className="text-xs text-[#C7C6C3]">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div
            ref={stickyTableScrollRef}
            onScroll={() => syncTableScroll("sticky")}
            className="sticky bottom-0 z-30 mt-1 h-4 overflow-x-auto overflow-y-hidden rounded-b-[5px] border border-[#E9E9E7] bg-white/95 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]"
            aria-label="Table horizontal scrollbar"
          >
            <div style={{ width: `${tableScrollWidth}px`, height: "1px" }} />
          </div>
          </>
        ) : (
          filteredBatches.map((batch) => {
            const course = getCourse(batch.courseId);

            // Tool-level assignments are the source of truth for trainer access.
            const trainerAssignments = (batch.toolTrainerAssignments || []).filter(
              (assignment) => String(assignment?.trainerId) === trainerId
            );
            const assignedToolIds = new Set(
              trainerAssignments.map((assignment) => String(assignment.toolId))
            );

            const visibleToolIds = isTrainer
              ? assignedToolIds
              : new Set((batch.tools || []).map(String));

            const batchTools = (batch.tools || [])
              .filter((toolId) => visibleToolIds.has(String(toolId)))
              .map((toolId) => getTool(toolId))
              .filter(Boolean);

            const trainerBatch = isTrainer
              ? {
                  ...batch,
                  latestOngoingSession:
                    batch.latestOngoingSession &&
                    assignedToolIds.has(String(batch.latestOngoingSession.toolId))
                      ? batch.latestOngoingSession
                      : null,
                  latestUpcomingSession:
                    batch.latestUpcomingSession &&
                    assignedToolIds.has(String(batch.latestUpcomingSession.toolId))
                      ? batch.latestUpcomingSession
                      : null,
                  latestCompletedSession:
                    batch.latestCompletedSession &&
                    assignedToolIds.has(String(batch.latestCompletedSession.toolId))
                      ? batch.latestCompletedSession
                      : null,
                }
              : batch;

            const toolStates = getToolStates(trainerBatch, batchTools);

            // The GET API should return batch.sessions containing all sessions
            // for this batch. Filter them again in the UI for trainer visibility.
            const visibleSchedule = (batch.sessions || [])
              .filter((item) =>
                !isTrainer || assignedToolIds.has(String(item.toolId))
              )
              .sort((a, b) =>
                String(a.date || "").localeCompare(String(b.date || ""))
              );

            const statusKey = batch.status || "inactive";
            const typeKey = normalizeBatchType(batch.batchType);
            const timing =
              batch.startingTime && batch.endingTime
                ? `${formatTime(batch.startingTime)} – ${formatTime(batch.endingTime)}`
                : formatTime(batch.startingTime) || "Time not set";

            return (
              <div
                key={batch._id}
                className="group border-b border-[#E9E9E7] px-2 py-4 transition-colors hover:bg-[rgba(55,53,47,0.025)]"
              >
                <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]">
                  {/* Identity */}
                  <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isTrainer ? (
                        <Link
                          href={`/trainer/batches/${batch._id}`} className="block truncate text-[15px] font-semibold text-[#37352F]">
                          {batch.name}
                        </Link>
                      ) : (
                        <Link
                          href={`/batches/${batch._id}`}
                          className="block truncate text-[15px] font-semibold text-[#37352F] hover:underline hover:decoration-[#9B9A97] hover:underline-offset-[3px]"
                        >
                          {batch.name}
                        </Link>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {course ? (
                          <Pill className={tagColor(course._id)}>
                            Course - {course.name}
                          </Pill>
                        ) : (
                          <span className="text-xs text-[#C7C6C3]">
                            Course unavailable
                          </span>
                        )}
                        <Pill className={batchTypeStyles[typeKey]}>
                          {typeKey === "special" ? "Special" : "Regular"}
                        </Pill>
                      </div>
                    </div>

                    <div className="mt-2.5 space-y-1 text-xs text-[#787774]">
                      <p className="flex items-center gap-1.5">
                        <CalendarDays size={12} className="text-[#9B9A97]" />
                        Starts {formatDate(batch.startingDate)}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Clock2 size={12} className="text-[#9B9A97]" />
                        {timing}
                      </p>
                    </div>
                  </div>

                  {/* Ongoing */}
                  <SessionBlock
                    label="Ongoing"
                    dotClass="bg-[#2F9E5B]"
                    session={trainerBatch.latestOngoingSession}
                    toolName={getSessionToolName(trainerBatch.latestOngoingSession)}
                    dateLabel="Ends"
                    date={trainerBatch.latestOngoingSession?.endDate}
                  />

                  {/* Upcoming */}
                  <SessionBlock
                    label="Upcoming"
                    dotClass="bg-[#37352F]"
                    session={trainerBatch.latestUpcomingSession}
                    toolName={getSessionToolName(trainerBatch.latestUpcomingSession)}
                    dateLabel="Starts"
                    date={
                      trainerBatch.latestUpcomingSession?.startDate ||
                      trainerBatch.latestUpcomingSession?.date ||
                      trainerBatch.latestUpcomingSession?.endDate
                    }
                  />

                  {/* Status + actions */}
                  <div className="flex items-start justify-between gap-2 sm:col-span-2 lg:col-span-1 lg:flex-col lg:items-end lg:justify-start">
                    {isTrainer ? (
                      <Pill className={statusStyles[statusKey] || statusStyles.inactive}>
                        {STATUS_OPTIONS.find((item) => item.value === statusKey)?.label || statusKey}
                      </Pill>
                    ) : (
                      <select
                        aria-label={`Change status for ${batch.name}`}
                        value={statusKey}
                        onChange={(e) => changeStatus(batch, e.target.value)}
                        className={`cursor-pointer appearance-none rounded-[3px] border-0 px-2 py-0.5 text-[13px] leading-5 outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2]/40 ${
                          statusStyles[statusKey] || statusStyles.inactive
                        }`}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {canManageBatches && (
                      <div className="flex items-center gap-0.5 lg:opacity-0 lg:transition-opacity lg:focus-within:opacity-100 lg:group-hover:opacity-100">
                        <button
                          onClick={() => openEdit(batch)}
                          aria-label={`Edit ${batch.name}`}
                          className={`rounded-[4px] p-1.5 text-[#787774] ${hoverBg}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => deleteBatch(batch)}
                          disabled={deletingId === batch._id}
                          aria-label={`Delete ${batch.name}`}
                          className="rounded-[4px] p-1.5 text-[#787774] transition-colors hover:bg-[#FFE2DD] hover:text-[#E03E3E]"
                        >
                          {deletingId === batch._id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Student and financial summary */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[4px] bg-[#FAFAF9] px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-[#787774]">Students</span>
                    <Pill className="bg-[#E3E2E0] text-[#32302C]">Total {batch.studentCount || 0}</Pill>
                    <Pill className="bg-[#DBEDDB] text-[#1C3829]">New {batch.newStudentCount || 0}</Pill>
                    <Pill className="bg-[#FDECC8] text-[#402C1B]">Old {batch.oldStudentCount || 0}</Pill>
                  </div>
                 {!isTrainer && !isTrainerManager && (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
    <span className="text-[#787774]">
      Fees: <strong className="text-[#37372F]">{formatMoney(batch.financials?.totalFees)}</strong>
    </span>
    <span className="text-[#1C8B50]">
      Paid: <strong>{formatMoney(batch.financials?.totalPaid)}</strong>
    </span>
    <span className="text-[#C4554D]">
      Due: <strong>{formatMoney(batch.financials?.totalBalance)}</strong>
    </span>
  </div>
)}
                </div>

                {/* Tools: completed, ongoing, upcoming, not scheduled */}
                <div className="mt-3.5 border-t border-[#F0F0EE] pt-2.5">
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[#9B9A97]">
                    <Wrench size={12} />
                    Tools
                  </div>

                  {toolStates.length ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {toolStates.map(({ tool, state }) => (
                        <ToolChip
                          key={tool._id}
                          name={getToolDisplayName(tool)}
                          state={state}
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-[#C7C6C3]">No tools</span>
                  )}
                </div>

                {/* Complete tool-specific schedule (provided by the GET API) */}
                {visibleSchedule.length > 0 && (
                  <div className="mt-3.5 border-t border-[#F0F0EE] pt-2.5">
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[#9B9A97]">
                      <CalendarDays size={12} />
                      {isTrainer ? "My tool schedule" : "Session schedule"}
                    </div>
                    <div className="space-y-2">
                      {visibleSchedule.map((item) => {
                        const scheduledTool = getTool(item.toolId);
                        return (
                          <div
                            key={item._id}
                            className="flex flex-col gap-1 rounded-[4px] bg-[rgba(55,53,47,0.035)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-[#37352F]">
                                {scheduledTool
                                  ? getToolDisplayName(scheduledTool)
                                  : item.toolName || "Tool"}
                              </p>
                              <p className="text-xs text-[#9B9A97]">
                                {formatDate(item.date)}
                                {item.endDate && item.endDate !== item.date
                                  ? ` – ${formatDate(item.endDate)}`
                                  : ""}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2 text-xs text-[#787774]">
                              <span>{timing}</span>
                              <Pill className={
                                item.status === "ongoing"
                                  ? "bg-[#DBEDDB] text-[#1C3829]"
                                  : item.status === "completed"
                                  ? "bg-[#E8DEEE] text-[#412454]"
                                  : "bg-[#D3E5EF] text-[#183347]"
                              }>
                                {item.status || "scheduled"}
                              </Pill>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {!loading && canManageBatches && (
          <button
            onClick={openCreate}
            className={`flex w-full items-center gap-2 px-2 py-2.5 text-left text-sm text-[#9B9A97] transition-colors ${hoverBg}`}
          >
            <Plus size={15} /> New batch
          </button>
        )}
      </div>

      {!loading && filteredBatches.length > 0 && (
        <p className="mt-3 px-2 text-xs text-[#9B9A97]">
          Showing {filteredBatches.length} of {batches.length} batches
        </p>
      )}

      {/* Modal */}
      {showModal && canManageBatches && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(15,15,15,0.6)] p-4 sm:py-12"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) closeModal();
          }}
        >
          <div
            className="w-full max-w-[720px] overflow-hidden rounded-[6px] bg-white"
            style={{
              boxShadow:
                "rgba(15,15,15,0.05) 0 0 0 1px, rgba(15,15,15,0.1) 0 5px 10px, rgba(15,15,15,0.2) 0 15px 40px",
            }}
          >
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between px-4 pt-3">
                <span className="text-xs text-[#9B9A97]">
                  {editingId ? "Edit batch" : "New batch"}
                </span>
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeModal}
                  aria-label="Close"
                  className={`rounded-[4px] p-1.5 text-[#787774] ${hoverBg}`}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[72vh] overflow-y-auto px-6 pb-6 pt-2 sm:px-10">
                <input
                  required
                  autoFocus
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Untitled"
                  className="w-full bg-transparent text-[32px] font-bold leading-tight tracking-[-0.01em] text-[#37352F] outline-none placeholder:text-[#D3D1CB]"
                />
                <p className="mt-1 px-0.5 text-xs text-[#9B9A97]">
                  e.g. Full Stack - Batch 01
                </p>

                <div className="mt-4 space-y-0.5 border-b border-[#E9E9E7] pb-4">
                  <Property icon={BookOpen} label="Course">
                    <select
                      required
                      value={form.courseId}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, courseId: e.target.value }))
                      }
                      className={fieldClass}
                    >
                      <option value="">Select a course</option>
                      {courses.map((course) => (
                        <option key={course._id} value={course._id}>
                          {course.name}
                          {course.status === "inactive" ? " (Inactive)" : ""}
                        </option>
                      ))}
                    </select>
                  </Property>

                  <Property icon={CalendarDays} label="Starting date">
                    <input
                      required
                      type="date"
                      value={form.startingDate}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, startingDate: e.target.value }))
                      }
                      className={fieldClass}
                    />
                  </Property>

                  <Property icon={Clock2} label="Starting time">
                    <input
                      required
                      type="time"
                      value={form.startingTime}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, startingTime: e.target.value }))
                      }
                      className={fieldClass}
                    />
                  </Property>

                  <Property icon={Clock2} label="Ending time">
                    <input
                      required
                      type="time"
                      value={form.endingTime}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, endingTime: e.target.value }))
                      }
                      className={fieldClass}
                    />
                  </Property>

                  <Property icon={CircleDot} label="Status">
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, status: e.target.value }))
                      }
                      className={fieldClass}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </Property>

                  <Property icon={Tag} label="Batch type">
                    <select
                      value={form.batchType}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, batchType: e.target.value }))
                      }
                      className={fieldClass}
                    >
                      {BATCH_TYPE_OPTIONS.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </Property>

                  <Property
                    icon={Wrench}
                    label="Batch tools"
                    hint="Tools taught in this batch."
                  >
                    {tools.length === 0 ? (
                      <p className="mx-1 rounded-[4px] bg-[#FDECC8] px-2.5 py-2 text-[13px] text-[#402C1B]">
                        No tools found. Add tools first.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 px-1 py-1">
                        {tools.map((tool) => {
                          const id = String(tool._id);
                          const checked = form.tools.includes(id);

                          return (
                            <button
                              type="button"
                              key={id}
                              onClick={() => toggleTool(id)}
                              aria-pressed={checked}
                              className={`inline-flex items-center gap-1.5 rounded-[4px] px-2 py-1 text-[13px] transition-colors ${
                                checked
                                  ? "bg-[#D3E5EF] text-[#183347]"
                                  : "border border-dashed border-[#D3D1CB] text-[#787774] hover:bg-[rgba(55,53,47,0.06)]"
                              }`}
                            >
                              {checked && <Check size={13} />}
                              {getToolDisplayName(tool)}
                              {tool.status === "inactive" && (
                                <span className="text-[#9B9A97]">(Inactive)</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </Property>

                  <Property
                    icon={Users}
                    label="Tool trainers"
                    hint="Assign an active trainer to each selected tool."
                  >
                    {form.tools.length === 0 ? (
                      <p className="mx-1 rounded-[4px] bg-[rgba(55,53,47,0.05)] px-2.5 py-2 text-[13px] text-[#787774]">
                        Select tools first to assign trainers.
                      </p>
                    ) : (
                      <div className="space-y-3 px-1 py-1">
                        {form.tools.map((toolId) => {
                          const tool = getTool(toolId);
                          const assignedTrainerId =
                            form.toolTrainerAssignments[toolId] || "";
                          const eligibleTrainers = trainers.filter(
                            (trainer) =>
                              trainer.status === "active" &&
                              (trainer.tools || []).some(
                                (id) => String(id) === String(toolId)
                              )
                          );

                          return (
                            <div
                              key={toolId}
                              className="grid grid-cols-1 gap-2 rounded-[4px] border border-[#E9E9E7] p-3 sm:grid-cols-2 sm:items-center"
                            >
                              <div>
                                <p className="text-sm font-medium text-[#37352F]">
                                  {getToolDisplayName(tool) === "Tool"
                                    ? "Unknown tool"
                                    : getToolDisplayName(tool)}
                                </p>
                                <p className="text-xs text-[#9B9A97]">
                                  Choose who teaches this tool
                                </p>
                              </div>

                              <select
                                required
                                value={assignedTrainerId}
                                onChange={(e) =>
                                  assignTrainerToTool(toolId, e.target.value)
                                }
                                className={fieldClass}
                              >
                                <option value="">Select trainer</option>
                                {eligibleTrainers.map((trainer) => (
                                  <option
                                    key={trainer._id}
                                    value={String(trainer._id)}
                                  >
                                    {trainer.name}
                                  </option>
                                ))}
                              </select>

                              {eligibleTrainers.length === 0 && (
                                <p className="text-xs text-red-600 sm:col-span-2">
                                  No active trainer teaches this tool. Update the
                                  trainer&apos;s tool assignments first.
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Property>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#E9E9E7] px-4 py-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeModal}
                  className="h-8 rounded-[4px] border border-[#E3E2E0] bg-white px-3 text-sm text-[#37352F] transition-colors hover:bg-[rgba(55,53,47,0.06)]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    courses.length === 0 ||
                    tools.length === 0 ||
                    trainers.length === 0
                  }
                  className="inline-flex h-8 items-center gap-2 rounded-[4px] bg-[#2383E2] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[#0077D4] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Save changes"
                    : "Create batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}