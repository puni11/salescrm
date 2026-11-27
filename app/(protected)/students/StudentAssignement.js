"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Search,
  BookOpen,
  Wrench,
  CalendarDays,
  Loader2,
  X,
  Check,
  UserRound,
  Trash2,
  RefreshCw,
  Plus,
  Table2,
  Type,
  Mail,
  Phone,
  CircleDot,
  Layers3,
  ListChecks,
  IndianRupee,
  FileText,
  Pencil,
} from "lucide-react";

import toast from "react-hot-toast";

const API = "/api/student-batch-assignments";

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const todayLocal = () => {
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

/* Aggregate fee information across every batch assigned to a student (row display). */
const getStudentFeeSummary = (student) => {
  const assignments = student?.batchAssignments || [];

  const total = assignments.reduce(
    (sum, item) => sum + (Number(item.totalFee) || 0),
    0
  );

  const paid = assignments.reduce((sum, item) => {
    // Prefer the API's paidFee aggregate. Fall back to payment history when absent.
    const paymentHistory = (item.payments || []).reduce(
      (paymentSum, payment) => paymentSum + (Number(payment.amount) || 0),
      0
    );
    const legacyPaid = Number(item.legacyPaidFee) || 0;
    const calculatedPaid = legacyPaid + paymentHistory;
    const itemPaid =
      item.paidFee != null ? Number(item.paidFee) || 0 : calculatedPaid;

    return sum + itemPaid;
  }, 0);

  const due = Math.max(total - paid, 0);
  const status =
    total <= 0 ? "unrecorded" : due === 0 ? "paid" : paid > 0 ? "partial" : "due";

  return { total, paid, due, status };
};

const getStudentRegistrationDate = (student) =>
  student?.createdAt ||
  student?.created_at ||
  student?.registeredAt ||
  student?.registrationDate ||
  student?.createdOn ||
  null;

/* Notion tag palette (background + text) */
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

const GRID_WITH_FEES =
  "grid grid-cols-[minmax(210px,1.35fr)_minmax(190px,1.2fr)_125px_minmax(150px,1fr)_125px_minmax(180px,1.2fr)_minmax(220px,1.4fr)_120px_minmax(220px,1.3fr)_135px_minmax(145px,0.9fr)_minmax(145px,0.9fr)_minmax(145px,0.9fr)_125px_76px]";

const GRID_WITHOUT_FEES =
  "grid grid-cols-[minmax(210px,1.35fr)_minmax(190px,1.2fr)_125px_minmax(150px,1fr)_125px_minmax(180px,1.2fr)_minmax(220px,1.4fr)_120px_minmax(220px,1.3fr)_135px_76px]";

const hoverBg = "hover:bg-[rgba(55,53,47,0.06)]";

function Tagged({ className = "", children }) {
  return (
    <span
      className={`inline-flex max-w-full shrink-0 items-center truncate rounded-[3px] px-1.5 py-0.5 text-sm leading-5 ${className}`}
    >
      {children}
    </span>
  );
}

function HeadCell({ icon: Icon, last, children }) {
  return (
    <div
      className={`flex h-[34px] items-center gap-1.5 overflow-hidden px-2 text-sm text-[#787774] ${
        last ? "" : "border-r border-[#E9E9E7]"
      }`}
    >
      {Icon && <Icon size={15} className="shrink-0 text-[#9B9A97]" />}
      <span className="truncate">{children}</span>
    </div>
  );
}

function Cell({ last, children, className = "" }) {
  return (
    <div
      className={`flex h-[37px] items-center gap-1 overflow-hidden px-2 text-sm ${
        last ? "" : "border-r border-[#E9E9E7]"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function Property({ icon: Icon, label, children }) {
  return (
    <div className="flex flex-col gap-1 py-1 sm:flex-row sm:items-start sm:gap-2">
      <div className="flex w-36 shrink-0 items-center gap-2 px-1 py-1.5 text-sm text-[#787774]">
        <Icon size={15} className="text-[#9B9A97]" />
        {label}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const fieldClass =
  "w-full rounded-[4px] border border-[#E3E2E0] bg-white px-2.5 py-2 text-sm text-[#37352F] outline-none transition-shadow focus:border-[#2383E2] focus:ring-2 focus:ring-[#2383E2]/30";

const pagerBtn =
  "h-8 rounded-[4px] border border-[#E3E2E0] text-[#37352F] hover:bg-[#F7F6F3] disabled:cursor-not-allowed disabled:opacity-40";

export default function StudentBatchAssignmentsPage({ session }) {
  // trainerManager can manage student/batch assignments, but cannot view or edit fees.
  const isTrainerManager = session?.user?.role === "trainerManager";
  const canViewFees = !isTrainerManager;
  const GRID = canViewFees ? GRID_WITH_FEES : GRID_WITHOUT_FEES;

  /* Server data (current page only) */
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState({ all: 0, registered: 0, converted: 0 });
  const [summary, setSummary] = useState({
    assigned: 0,
    awaiting: 0,
    pendingFees: 0,
    totalFees: 0,
    collectedFees: 0,
  });
  const [courseOptions, setCourseOptions] = useState([]);
  const [feeTotals, setFeeTotals] = useState({
    totalFees: 0,
    collectedFees: 0,
    pendingFees: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* Filters (all sent to the API) */
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [feeFilter, setFeeFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const searchRef = useRef(null);
  const abortRef = useRef(null);

  /* Modal state */
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [mode, setMode] = useState("full_course");
  const [selectedTools, setSelectedTools] = useState([]);
  const [totalFee, setTotalFee] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayLocal);
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [removingId, setRemovingId] = useState(null);

  /* Edit notes for an already assigned student/batch (separate API to be added). */
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesStudent, setNotesStudent] = useState(null);
  const [notesAssignment, setNotesAssignment] = useState(null);
  const [editAssignmentNotes, setEditAssignmentNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  /* Change student name modal (API will be connected in the next step) */
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameStudent, setRenameStudent] = useState(null);
  const [newStudentName, setNewStudentName] = useState("");

  /* ---------------------------- Data loading ---------------------------- */
  const loadData = useCallback(async () => {
    abortRef.current?.abort(); // cancel the previous in-flight request
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (courseFilter !== "all") params.set("course", courseFilter);
      if (canViewFees && feeFilter !== "all") params.set("feeStatus", feeFilter);
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);

      const response = await fetch(`${API}?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load students");
      }

      const data = result.data;
      setStudents(data.students || []);
      setBatches(data.batches || []);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(Math.max(1, data.pagination?.totalPages ?? 1));
      setCounts(data.counts || { all: 0, registered: 0, converted: 0 });
      setSummary(
        data.summary || {
          assigned: 0,
          awaiting: 0,
          pendingFees: 0,
          totalFees: 0,
          collectedFees: 0,
        }
      );
      setCourseOptions(data.courseOptions || []);
      setFeeTotals(
        data.feeTotals || { totalFees: 0, collectedFees: 0, pendingFees: 0 }
      );

      // Page out of range (e.g. last row on the last page was removed)
      if (data.pagination && page > data.pagination.totalPages && data.pagination.totalPages > 0) {
        setPage(data.pagination.totalPages);
      }
    } catch (error) {
      if (error.name === "AbortError") return;
      toast.error(error.message || "Failed to load data");
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, statusFilter, courseFilter, feeFilter, fromDate, toDate, canViewFees]);

  // Fetch whenever any filter / page changes
  useEffect(() => {
    loadData();
    return () => abortRef.current?.abort();
  }, [loadData]);

  // Debounce typing in the search box
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setSearchOpen(false);
    setStatusFilter("all");
    setCourseFilter("all");
    setFeeFilter("all");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  /* ---------------------------- Modal derived ---------------------------- */
  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId);

  const eligibleBatches = batches.filter(
    (batch) =>
      !["inactive", "completed"].includes(String(batch.status).toLowerCase())
  );

  const totalFeeNum = Number(totalFee) || 0;
  const paymentAmountNum = Number(paymentAmount) || 0;

  const selectedAssignment = (selectedStudent?.batchAssignments || []).find(
    (item) => String(item.batchId) === String(selectedBatchId)
  );

  const alreadyPaid =
    (Number(selectedAssignment?.legacyPaidFee) || 0) +
    (selectedAssignment?.payments || []).reduce(
      (sum, payment) => sum + (Number(payment.amount) || 0),
      0
    );

  const projectedPaid = alreadyPaid + paymentAmountNum;
  const balanceDue = Math.max(totalFeeNum - projectedPaid, 0);
  const overpaid = projectedPaid > totalFeeNum;

  const openAssignModal = (student) => {
    setSelectedStudent(student);
    setSelectedBatchId("");
    setMode("full_course");
    setSelectedTools([]);
    setTotalFee("");
    setPaymentAmount("");
    setPaymentDate(todayLocal());
    setAssignmentNotes("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setSelectedStudent(null);
    setSelectedBatchId("");
    setSelectedTools([]);
    setMode("full_course");
    setTotalFee("");
    setPaymentAmount("");
    setPaymentDate("");
    setAssignmentNotes("");
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

  const changeBatch = (batchId) => {
    setSelectedBatchId(batchId);
    const batch = batches.find((item) => item.id === batchId);
    const existingAssignment = (selectedStudent?.batchAssignments || []).find(
      (item) => String(item.batchId) === String(batchId)
    );

    if (existingAssignment) {
      setMode(existingAssignment.mode === "selected_tools" ? "selected_tools" : "full_course");
      setSelectedTools(existingAssignment.toolIds?.map(String) || []);
      setTotalFee(existingAssignment.totalFee != null ? String(existingAssignment.totalFee) : "");
      setAssignmentNotes(existingAssignment.notes || "");
    } else {
      setMode("full_course");
      setSelectedTools(batch?.tools?.map((tool) => tool.id) || []);
      setTotalFee(batch?.fee != null ? String(batch.fee) : "");
      setAssignmentNotes("");
    }

    // A new installment is entered separately; existing payments remain in history.
    setPaymentAmount("");
    setPaymentDate(todayLocal());
  };

  const toggleTool = (toolId) => {
    setSelectedTools((previous) =>
      previous.includes(toolId)
        ? previous.filter((id) => id !== toolId)
        : [...previous, toolId]
    );
  };

  /* ------------------------------- Actions ------------------------------- */
  const assignBatch = async (event) => {
    event.preventDefault();

    if (!selectedStudent || !selectedBatchId) {
      toast.error("Select a batch");
      return;
    }

    if (mode === "selected_tools" && selectedTools.length === 0) {
      toast.error("Select at least one tool");
      return;
    }

    if (canViewFees && (totalFeeNum < 0 || paymentAmountNum < 0)) {
      toast.error("Fees cannot be negative");
      return;
    }

    if (canViewFees && paymentAmountNum > 0 && !paymentDate) {
      toast.error("Select the payment date");
      return;
    }

    if (canViewFees && overpaid) {
      toast.error("Payment amount cannot exceed the remaining balance");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          batchId: selectedBatchId,
          mode,
          toolIds:
            mode === "full_course"
              ? selectedBatch?.tools.map((tool) => tool.id) || []
              : selectedTools,
          ...(canViewFees && {
            totalFee: totalFeeNum,
            paymentAmount: paymentAmountNum,
            paymentDate,
          }),
          notes: assignmentNotes.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to assign batch");
      }

      toast.success(
        paymentAmountNum > 0
          ? "Batch assignment and payment saved"
          : "Batch assignment saved"
      );
      setShowModal(false);
      setSelectedStudent(null);

      await loadData();
    } catch (error) {
      toast.error(error.message || "Failed to assign batch");
    } finally {
      setSaving(false);
    }
  };

  const openRenameModal = (student) => {
    setRenameStudent(student);
    setNewStudentName(student?.name || "");
    setShowRenameModal(true);
  };

  const closeRenameModal = () => {
    setShowRenameModal(false);
    setRenameStudent(null);
    setNewStudentName("");
  };

  const openNotesModal = (student, assignment) => {
    setNotesStudent(student);
    setNotesAssignment(assignment);
    setEditAssignmentNotes(assignment?.notes || "");
    setShowNotesModal(true);
  };

  const closeNotesModal = () => {
    setShowNotesModal(false);
    setNotesStudent(null);
    setNotesAssignment(null);
    setEditAssignmentNotes("");
  };

  const submitAssignmentNotes = async (event) => {
    event.preventDefault();

    if (!notesStudent?.id || !notesAssignment?.batchId) {
      toast.error("Student or batch assignment not found");
      return;
    }

    const notes = editAssignmentNotes.trim();

    if (notes.length > 2000) {
      toast.error("Notes cannot exceed 2000 characters");
      return;
    }

    try {
      setSavingNotes(true);

      const response = await fetch(`${API}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: notesStudent.id,
          batchId: notesAssignment.batchId,
          notes,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save assignment notes");
      }

      // Update the visible row immediately while the fresh data is loading.
      setStudents((previous) =>
        previous.map((student) =>
          student.id === notesStudent.id
            ? {
                ...student,
                batchAssignments: (student.batchAssignments || []).map((assignment) =>
                  String(assignment.batchId) === String(notesAssignment.batchId)
                    ? { ...assignment, notes: result.data?.notes ?? notes }
                    : assignment
                ),
              }
            : student
        )
      );

      toast.success("Assignment notes saved successfully");
      closeNotesModal();
      await loadData();
    } catch (error) {
      console.error("SAVE ASSIGNMENT NOTES ERROR:", error);
      toast.error(error.message || "Failed to save assignment notes");
    } finally {
      setSavingNotes(false);
    }
  };


const submitRenameStudent = async (event) => {
  event.preventDefault();

  const name = newStudentName.trim();

  if (!name) {
    toast.error("Enter the student name");
    return;
  }

  if (!renameStudent?.id) {
    toast.error("Student ID not found");
    return;
  }

  try {
    const response = await fetch(
      `/api/contact/${renameStudent.id}/change-name`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to update student name");
    }

    // Update the student name in the current table immediately
    setStudents((prev) =>
      prev.map((student) =>
        student.id === renameStudent.id
          ? { ...student, name }
          : student
      )
    );

    toast.success("Student name updated successfully");

    closeRenameModal();

    // Refresh data from database
    await loadData();

  } catch (error) {
    console.error("RENAME STUDENT ERROR:", error);
    toast.error(error.message || "Failed to update student name");
  }
};


  const removeAssignment = async (student, assignment) => {
    if (!assignment?.batchId) return;
    const confirmed = window.confirm(
      `Remove ${assignment.batchName || assignment.batch?.name || "this batch"} from ${student.name || "this student"}?`
    );
    if (!confirmed) return;

    const removingKey = `${student.id}-${assignment.batchId}`;
    try {
      setRemovingId(removingKey);
      const response = await fetch(
        `${API}?studentId=${encodeURIComponent(student.id)}&batchId=${encodeURIComponent(assignment.batchId)}`,
        { method: "DELETE" }
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to remove assignment");
      }

      toast.success("Batch assignment removed");
      // Reload so fee filter, counts and totals stay correct
      await loadData();
    } catch (error) {
      toast.error(error.message || "Failed to remove assignment");
    } finally {
      setRemovingId(null);
    }
  };

  const tabs = [
    ["all", "All students"],
    ["registered", "Registered"],
    ["converted", "Converted"],
  ];

  const iconBtn =
    "inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-[#787774] transition-colors hover:bg-[rgba(55,53,47,0.08)] disabled:opacity-50";

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <main className="flex min-h-screen flex-col bg-white px-4 pt-6 text-[#37352F] sm:px-8 lg:px-[30px]">
      {/* Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.01em] sm:text-[32px]">
          Students
        </h1>
      </div>
      <p className="mt-1 text-sm text-[#787774]">
        Manage registered students and assign their courses, batches, and learning
        tools{canViewFees ? ", and fees" : ""}.
      </p>

      {/* View tabs + toolbar */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {tabs.map(([value, label]) => {
            const active = statusFilter === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setStatusFilter(value);
                  setPage(1);
                }}
                aria-pressed={active}
                className={`inline-flex h-8 items-center gap-2 rounded-[8px] px-3 text-sm transition-colors ${
                  active
                    ? "bg-[#F1F1EF] font-medium text-[#37352F]"
                    : "text-[#787774] hover:bg-[rgba(55,53,47,0.06)]"
                }`}
              >
                <Table2 size={15} className="shrink-0 text-[#787774]" />
                {label}
                <span className="text-xs text-[#9B9A97]">{counts[value]}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[230px] flex-1 sm:flex-none">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9B9A97]"
            />
            <input
              ref={searchRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, phone, course..."
              className="h-9 w-full rounded-[5px] border border-[#E3E2E0] bg-white pl-8 pr-3 text-sm outline-none focus:border-[#2383E2] focus:ring-2 focus:ring-[#2383E2]/20 sm:w-[270px]"
            />
          </div>

          <select
            value={courseFilter}
            onChange={(event) => {
              setCourseFilter(event.target.value);
              setPage(1);
            }}
            className="h-9 min-w-[145px] rounded-[5px] border border-[#E3E2E0] bg-white px-2.5 text-sm outline-none focus:border-[#2383E2]"
            aria-label="Filter by course"
          >
            <option value="all">All courses</option>
            {courseOptions.map((course) => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>

          {canViewFees && (
            <select
              value={feeFilter}
              onChange={(event) => {
                setFeeFilter(event.target.value);
                setPage(1);
              }}
              className="h-9 min-w-[135px] rounded-[5px] border border-[#E3E2E0] bg-white px-2.5 text-sm outline-none focus:border-[#2383E2]"
              aria-label="Filter by fee status"
            >
              <option value="all">All fee status</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="due">Due</option>
              <option value="unrecorded">Not recorded</option>
            </select>
          )}

          <div className="flex items-center gap-1.5 rounded-[5px] border border-[#E3E2E0] bg-white px-2">
            <CalendarDays size={14} className="text-[#9B9A97]" />
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(event) => {
                setFromDate(event.target.value);
                setPage(1);
              }}
              aria-label="Registration date from"
              title="Registration date from"
              className="h-8 w-[125px] bg-transparent text-xs text-[#37352F] outline-none"
            />
            <span className="text-xs text-[#9B9A97]">to</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) => {
                setToDate(event.target.value);
                setPage(1);
              }}
              aria-label="Registration date to"
              title="Registration date to"
              className="h-8 w-[125px] bg-transparent text-xs text-[#37352F] outline-none"
            />
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="h-9 rounded-[5px] px-2.5 text-sm text-[#787774] hover:bg-[rgba(55,53,47,0.06)]"
          >
            Clear filters
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            aria-label="Refresh students"
            title="Refresh"
            className={iconBtn}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Table (only this part scrolls horizontally) */}
      <div className="mt-3 flex-1 overflow-x-auto">
        <div className="min-w-[1600px]">
          <div className={`${GRID} border-y border-[#E9E9E7]`}>
            <HeadCell icon={Type}>Student</HeadCell>
            <HeadCell icon={Mail}>Email</HeadCell>
            <HeadCell icon={Phone}>Phone</HeadCell>
            <HeadCell icon={BookOpen}>Course</HeadCell>
            <HeadCell icon={CircleDot}>Status</HeadCell>
            <HeadCell icon={Layers3}>Batch</HeadCell>
            <HeadCell icon={FileText}>Notes</HeadCell>
            <HeadCell icon={ListChecks}>Plan</HeadCell>
            <HeadCell icon={Wrench}>Assigned tools</HeadCell>
            <HeadCell icon={CalendarDays}>Registered</HeadCell>
            {canViewFees && (
              <>
                <HeadCell icon={IndianRupee}>Total fees</HeadCell>
                <HeadCell icon={IndianRupee}>Paid fees</HeadCell>
                <HeadCell icon={IndianRupee}>Pending fees</HeadCell>
                <HeadCell>Payment</HeadCell>
              </>
            )}
            <HeadCell last>Actions</HeadCell>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 border-b border-[#E9E9E7] py-16 text-sm text-[#9B9A97]">
              <Loader2 size={16} className="animate-spin" />
              Loading students
            </div>
          ) : students.length === 0 ? (
            <div className="border-b border-[#E9E9E7] py-16 text-center">
              <p className="text-sm font-medium">No students found</p>
              <p className="mt-1 text-sm text-[#787774]">
                Only students with Registered or Converted status are
                displayed.
              </p>
            </div>
          ) : (
            students.map((student) => {
              const assignments = student.batchAssignments || [];
              const feeSummary = getStudentFeeSummary(student);
              const {
                total: totalFees,
                paid: totalPaid,
                due: totalDue,
                status: paymentStatus,
              } = feeSummary;
              const registeredDate = getStudentRegistrationDate(student);
              const paymentStatusLabel =
                paymentStatus === "paid" ? "Paid" :
                paymentStatus === "partial" ? "Partial" :
                paymentStatus === "due" ? "Due" : "Not recorded";
              const paymentStatusClass =
                paymentStatus === "paid" ? "bg-[#DBEDDB] text-[#1C3829]" :
                paymentStatus === "partial" ? "bg-[#FDECC8] text-[#402C1B]" :
                paymentStatus === "due" ? "bg-[#FFE2DD] text-[#5D1715]" :
                "bg-[#F1F1EF] text-[#787774]";
              const converted = String(student.status).toLowerCase() === "converted";

              return (
                <div
                  key={student.id}
                  className={`group ${GRID} border-b border-[#E9E9E7] transition-colors hover:bg-[rgba(55,53,47,0.03)]`}
                >
                  <Cell>
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E3E2E0]"><UserRound size={12} className="text-[#787774]" /></span>
                    <span className="min-w-0 flex-1 truncate font-medium">{student.name || "Unnamed student"}</span>
                    <button
                      type="button"
                      onClick={() => openRenameModal(student)}
                      title="Change student name"
                      aria-label={`Change name for ${student.name || "student"}`}
                      className={`shrink-0 rounded-[4px] p-1 text-[#9B9A97] opacity-0 transition-opacity hover:bg-[rgba(55,53,47,0.08)] hover:text-[#2383E2] focus:opacity-100 group-hover:opacity-100`}
                    >
                      <Pencil size={13} />
                    </button>
                  </Cell>
                  <Cell><span className="truncate text-[#787774]">{student.email || "No email"}</span></Cell>
                  <Cell><span className="truncate tabular-nums text-[#787774]">{student.phone || "No phone"}</span></Cell>
                  <Cell>
                    {student.course ? <Tagged className={tagColor(student.course)}>{student.course}</Tagged> : <span className="text-[#C7C6C3]">—</span>}
                  </Cell>
                  <Cell>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-sm leading-5 ${converted ? "bg-[#DBEDDB] text-[#1C3829]" : "bg-[#D3E5EF] text-[#183347]"}`}>
                      <span className={`h-2 w-2 rounded-full ${converted ? "bg-[#4DAB9A]" : "bg-[#2383E2]"}`} />{student.status}
                    </span>
                  </Cell>
                  <Cell>
                    <div className="flex flex-wrap gap-1">
                      {assignments.length ? assignments.map((a) => (
                        <button key={a.batchId} type="button" onClick={() => openAssignModal(student)} title="Manage batch" className="max-w-full rounded-[4px] text-left">
                          <Tagged className={tagColor(a.batchName || a.batch?.name)}>{a.batchName || a.batch?.name || "Batch"}</Tagged>
                        </button>
                      )) : <button type="button" onClick={() => openAssignModal(student)} className={`inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-sm text-[#9B9A97] ${hoverBg}`}><Plus size={14} /> Assign batch</button>}
                    </div>
                  </Cell>
                  <Cell>
                    <div className="flex min-w-0 flex-col gap-1 py-1">
                      {assignments.length ? assignments.map((a) => (
                        <button
                          key={`${a.batchId}-notes`}
                          type="button"
                          onClick={() => openNotesModal(student, a)}
                          title={a.notes || "Click to add notes for this batch"}
                          className="block max-w-full truncate rounded px-1 py-0.5 text-left text-xs hover:bg-[#F0F7FD] hover:text-[#185FA5]"
                        >
                          {a.notes?.trim() ? (
                            <span className="whitespace-pre-wrap text-[#37352F]">
                              {a.notes}
                            </span>
                          ) : (
                            <span className="italic text-[#9B9A97]">
                              Add notes
                            </span>
                          )}
                        </button>
                      )) : <span className="text-[#C7C6C3]">—</span>}
                    </div>
                  </Cell>
                  <Cell>
                    <div className="flex flex-wrap gap-1">
                      {assignments.length ? assignments.map((a) => <Tagged key={a.batchId} className={a.mode === "full_course" ? "bg-[#DBEDDB] text-[#1C3829]" : "bg-[#FDECC8] text-[#402C1B]"}>{a.mode === "full_course" ? "Full course" : "Selected tools"}</Tagged>) : <span className="text-[#C7C6C3]">—</span>}
                    </div>
                  </Cell>
                  <Cell>
                    <div className="flex flex-wrap gap-1">
                      {(() => {
                        const toolNames = [...new Set(
                          assignments.flatMap((assignment) =>
                            assignment.toolNames ||
                            assignment.selectedTools?.map((tool) => tool.name) ||
                            []
                          )
                        )];
                        return toolNames.length
                          ? toolNames.map((name) => (
                              <Tagged key={name} className={tagColor(name)}>{name}</Tagged>
                            ))
                          : <span className="text-[#C7C6C3]">—</span>;
                      })()}
                    </div>
                  </Cell>
                  <Cell>
                    <span className="truncate text-xs text-[#787774]" title={registeredDate ? formatDate(registeredDate) : "Registration date unavailable"}>
                      {formatDate(registeredDate)}
                    </span>
                  </Cell>
                  {canViewFees && (
                    <>
                      <Cell>
                        <span className="whitespace-nowrap text-sm font-medium tabular-nums">{assignments.length ? formatCurrency(totalFees) : "—"}</span>
                      </Cell>
                      <Cell>
                        <span className="whitespace-nowrap text-sm tabular-nums text-[#1C7C45]">{assignments.length ? formatCurrency(totalPaid) : "—"}</span>
                      </Cell>
                      <Cell>
                        <span className={`whitespace-nowrap text-sm font-medium tabular-nums ${totalDue > 0 ? "text-[#B54735]" : "text-[#787774]"}`}>
                          {assignments.length ? formatCurrency(totalDue) : "—"}
                        </span>
                      </Cell>
                      <Cell>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${paymentStatusClass}`}>
                          {paymentStatusLabel}
                        </span>
                      </Cell>
                    </>
                  )}
                  <Cell last className="justify-center gap-0.5 px-1">
                    <button type="button" onClick={() => openAssignModal(student)} aria-label="Assign another batch" title="Assign another batch" className={`rounded-[4px] p-1.5 text-[#787774] opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 ${hoverBg}`}><Plus size={15} /></button>
                    {assignments.map((a) => {
                      const key = `${student.id}-${a.batchId}`;
                      return <button key={key} type="button" title={`Remove ${a.batchName || a.batch?.name || "batch"}`} aria-label="Remove batch assignment" disabled={removingId === key} onClick={() => removeAssignment(student, a)} className={`rounded-[4px] p-1.5 text-[#787774] transition-opacity hover:bg-[#FFE2DD] hover:text-[#E03E3E] focus:opacity-100 group-hover:opacity-100 ${removingId === key ? "opacity-100" : "opacity-0"}`}>
                        {removingId === key ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>;
                    })}
                  </Cell>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Fixed footer: summary + pagination (outside the scroll area) */}
      <div className="sticky bottom-0 z-30 -mx-4 border-t border-[#E9E9E7] bg-white px-4 sm:-mx-8 sm:px-8 lg:-mx-[30px] lg:px-[30px]">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-[#E9E9E7] px-2 py-2 text-[13px] text-[#9B9A97]">
          <span>
            <span className="uppercase tracking-wide">Filtered count</span>
            <span className="ml-1.5 font-medium text-[#37352F]">{total}</span>
          </span>
          <span>
            <span className="uppercase tracking-wide">Assigned (all)</span>
            <span className="ml-1.5 text-[#37352F]">{summary.assigned}</span>
          </span>
          <span>
            <span className="uppercase tracking-wide">Awaiting (all)</span>
            <span className="ml-1.5 text-[#37352F]">{summary.awaiting}</span>
          </span>
          {canViewFees && (
            <>
              <span>
                <span className="uppercase tracking-wide">Total fees</span>
                <span className="ml-1.5 font-medium text-[#37352F]">{formatCurrency(feeTotals.totalFees)}</span>
              </span>
              <span>
                <span className="uppercase tracking-wide">Collected fees</span>
                <span className="ml-1.5 font-medium text-[#1C7C45]">{formatCurrency(feeTotals.collectedFees)}</span>
              </span>
              <span>
                <span className="uppercase tracking-wide">Pending fees</span>
                <span className="ml-1.5 font-medium text-[#B54735]">{formatCurrency(feeTotals.pendingFees)}</span>
              </span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-2.5">
          <div className="flex items-center gap-2 text-sm text-[#787774]">
            <span>Rows per page</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-8 rounded-[4px] border border-[#E3E2E0] bg-white px-2 text-sm text-[#37352F] outline-none"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span className="ml-2">
              {total === 0 ? "0 results" : `${rangeStart}–${rangeEnd} of ${total}`}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage(1)}
              className={`${pagerBtn} px-2 text-xs`}
            >
              First
            </button>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className={`${pagerBtn} px-3 text-sm`}
            >
              Previous
            </button>
            <span className="px-2 text-sm tabular-nums text-[#787774]">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className={`${pagerBtn} px-3 text-sm`}
            >
              Next
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage(totalPages)}
              className={`${pagerBtn} px-2 text-xs`}
            >
              Last
            </button>
          </div>
        </div>
      </div>

      {/* Assignment modal / page peek */}
      {showModal && selectedStudent && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(15,15,15,0.6)] p-4 sm:py-12"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              closeModal();
            }
          }}
        >
          <div
            className="w-full max-w-[680px] overflow-hidden rounded-[6px] bg-white"
            style={{
              boxShadow:
                "rgba(15,15,15,0.05) 0 0 0 1px, rgba(15,15,15,0.1) 0 5px 10px, rgba(15,15,15,0.2) 0 15px 40px",
            }}
          >
            <form onSubmit={assignBatch}>
              <div className="flex items-center justify-between px-4 pt-3">
                <span className="text-xs text-[#9B9A97]">Batch assignment</span>
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
                <h2 className="text-[28px] font-bold leading-tight tracking-[-0.01em]">
                  Assign batch
                </h2>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#787774]">
                  <span className="flex items-center gap-1.5">
                    <UserRound size={14} className="text-[#9B9A97]" />
                    {selectedStudent.name}
                  </span>
                  {selectedStudent.course && (
                    <Tagged className={tagColor(selectedStudent.course)}>
                      {selectedStudent.course}
                    </Tagged>
                  )}
                </p>

                <div className="mt-4 space-y-0.5 border-b border-[#E9E9E7] pb-4">
                  <Property icon={Layers3} label="Batch">
                    <select
                      required
                      value={selectedBatchId}
                      onChange={(event) => changeBatch(event.target.value)}
                      className={fieldClass}
                    >
                      <option value="">Choose a batch</option>

                      {eligibleBatches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.name} — {batch.courseName}
                          {batch.startingDate
                            ? ` · ${formatDate(batch.startingDate)}`
                            : ""}
                        </option>
                      ))}
                    </select>

                    {eligibleBatches.length === 0 && (
                      <p className="mt-2 rounded-[4px] bg-[#FDECC8] px-2.5 py-2 text-[13px] text-[#402C1B]">
                        No assignable batches are available.
                      </p>
                    )}
                  </Property>

                  {selectedBatch && (
                    <>
                      <Property icon={BookOpen} label="Course">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2.5 py-2 text-sm">
                          <Tagged className={tagColor(selectedBatch.courseName)}>
                            {selectedBatch.courseName}
                          </Tagged>
                          <span className="flex items-center gap-1.5 text-[#787774]">
                            <CalendarDays size={14} className="text-[#9B9A97]" />
                            Starts {formatDate(selectedBatch.startingDate)}
                          </span>
                        </div>
                      </Property>

                      <Property icon={FileText} label="Assignment notes">
                        <textarea
                          value={assignmentNotes}
                          onChange={(event) => setAssignmentNotes(event.target.value)}
                          rows={3}
                          maxLength={2000}
                          placeholder="Add notes related to this student's batch assignment..."
                          className={`${fieldClass} resize-y`}
                        />
                        <div className="mt-1 text-right text-xs text-[#9B9A97]">
                          {assignmentNotes.length}/2000
                        </div>
                      </Property>

                      <Property icon={ListChecks} label="Learning plan">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setMode("full_course")}
                            aria-pressed={mode === "full_course"}
                            className={`rounded-[4px] border p-3 text-left transition-colors ${
                              mode === "full_course"
                                ? "border-[#2383E2] bg-[#D3E5EF]/40 ring-1 ring-[#2383E2]"
                                : "border-[#E3E2E0] hover:bg-[rgba(55,53,47,0.04)]"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                Full course
                              </span>
                              {mode === "full_course" && (
                                <Check size={15} className="text-[#2383E2]" />
                              )}
                            </div>
                            <p className="mt-0.5 text-xs leading-5 text-[#787774]">
                              Automatically include every tool in this batch.
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setMode("selected_tools")}
                            aria-pressed={mode === "selected_tools"}
                            className={`rounded-[4px] border p-3 text-left transition-colors ${
                              mode === "selected_tools"
                                ? "border-[#2383E2] bg-[#D3E5EF]/40 ring-1 ring-[#2383E2]"
                                : "border-[#E3E2E0] hover:bg-[rgba(55,53,47,0.04)]"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                Selected tools
                              </span>
                              {mode === "selected_tools" && (
                                <Check size={15} className="text-[#2383E2]" />
                              )}
                            </div>
                            <p className="mt-0.5 text-xs leading-5 text-[#787774]">
                              Choose only the tools this student will learn.
                            </p>
                          </button>
                        </div>
                      </Property>

                      <Property icon={Wrench} label="Tools and trainers">
                        <div className="mb-1.5 px-1 text-xs text-[#9B9A97]">
                          {mode === "full_course"
                            ? `${selectedBatch.tools.length} tools included`
                            : `${selectedTools.length} selected`}
                        </div>

                        {selectedBatch.tools.length === 0 ? (
                          <p className="rounded-[4px] bg-[#FDECC8] px-2.5 py-2 text-[13px] text-[#402C1B]">
                            This batch has no tools configured.
                          </p>
                        ) : (
                          <div className="overflow-hidden rounded-[4px] border border-[#E3E2E0]">
                            {selectedBatch.tools.map((tool) => {
                              const checked =
                                mode === "full_course" ||
                                selectedTools.includes(tool.id);

                              const trainerAssignments =
                                selectedBatch.toolTrainerAssignments.filter(
                                  (assignment) => assignment.toolId === tool.id
                                );

                              return (
                                <button
                                  type="button"
                                  key={tool.id}
                                  disabled={mode === "full_course"}
                                  onClick={() => toggleTool(tool.id)}
                                  aria-pressed={checked}
                                  className="flex w-full items-start gap-2.5 border-b border-[#E9E9E7] px-3 py-2 text-left last:border-b-0 enabled:hover:bg-[rgba(55,53,47,0.04)] disabled:cursor-default"
                                >
                                  <span
                                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border ${
                                      checked
                                        ? "border-[#2383E2] bg-[#2383E2] text-white"
                                        : "border-[#C7C6C3]"
                                    }`}
                                  >
                                    {checked && <Check size={12} />}
                                  </span>

                                  <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium">
                                      {tool.name}
                                    </span>

                                    <span className="mt-0.5 block text-xs text-[#787774]">
                                      Trainer:{" "}
                                      {trainerAssignments.length
                                        ? trainerAssignments
                                            .map((item) => item.trainerName)
                                            .join(", ")
                                        : "Not assigned"}
                                    </span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </Property>

                      {canViewFees && (
                        <Property icon={IndianRupee} label="Fees">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <label className="block">
                              <span className="mb-1 block text-xs text-[#9B9A97]">
                                Total fee
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                inputMode="numeric"
                                value={totalFee}
                                onChange={(e) => setTotalFee(e.target.value)}
                                placeholder="0"
                                className={fieldClass}
                              />
                            </label>

                            <label className="block">
                              <span className="mb-1 block text-xs text-[#9B9A97]">
                                New payment amount
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                inputMode="numeric"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder="Enter installment amount"
                                className={fieldClass}
                              />
                            </label>

                            <label className="block">
                              <span className="mb-1 block text-xs text-[#9B9A97]">
                                Payment date
                              </span>
                              <input
                                type="date"
                                value={paymentDate}
                                max={new Date().toLocaleDateString("en-CA")}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                className={fieldClass}
                              />
                            </label>
                          </div>

                          <div className="mt-2 space-y-2 rounded-[4px] bg-[#F7F6F3] px-2.5 py-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-[#787774]">Previously paid</span>
                              <span className="font-medium tabular-nums">{formatCurrency(alreadyPaid)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#787774]">This payment</span>
                              <span className="font-medium tabular-nums">{formatCurrency(paymentAmountNum)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#787774]">Total paid after saving</span>
                              <span className="font-medium tabular-nums">{formatCurrency(projectedPaid)}</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-[#E3E2E0] pt-2">
                              <span className="text-[#787774]">Balance due</span>
                              <span className={`font-semibold tabular-nums ${overpaid ? "text-[#E03E3E]" : ""}`}>
                                {formatCurrency(balanceDue)}
                              </span>
                            </div>
                          </div>

                          {overpaid && (
                            <p className="mt-1.5 text-xs text-[#E03E3E]">
                              New payment exceeds the remaining balance.
                            </p>
                          )}

                          {selectedAssignment?.payments?.length > 0 && (
                            <div className="mt-4">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9B9A97]">
                                Payment history
                              </p>
                              <div className="max-h-40 overflow-y-auto rounded-[4px] border border-[#E3E2E0]">
                                {[...selectedAssignment.payments]
                                  .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt))
                                  .map((payment, index) => (
                                    <div
                                      key={payment.id || payment._id || index}
                                      className="flex items-center justify-between gap-3 border-b border-[#E9E9E7] px-3 py-2 last:border-b-0"
                                    >
                                      <span className="text-xs text-[#787774]">
                                        {formatDate(payment.paidAt || payment.paymentDate)}
                                      </span>
                                      <span className="text-sm font-medium text-[#1C7C45]">
                                        {formatCurrency(payment.amount)}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </Property>
                      )}
                    </>
                  )}
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
                    !selectedBatchId ||
                    !selectedBatch ||
                    selectedBatch.tools.length === 0 ||
                    (canViewFees && overpaid) ||
                    (mode === "selected_tools" && selectedTools.length === 0)
                  }
                  className="inline-flex h-8 items-center gap-2 rounded-[4px] bg-[#2383E2] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[#0077D4] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving ? "Saving..." : "Save assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit notes modal for existing student-batch assignments */}
      {showNotesModal && notesStudent && notesAssignment && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center bg-[rgba(15,15,15,0.6)] p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingNotes) {
              closeNotesModal();
            }
          }}
        >
          <div
            className="w-full max-w-[520px] overflow-hidden rounded-[6px] bg-white"
            style={{
              boxShadow:
                "rgba(15,15,15,0.05) 0 0 0 1px, rgba(15,15,15,0.1) 0 5px 10px, rgba(15,15,15,0.2) 0 15px 40px",
            }}
          >
            <form onSubmit={submitAssignmentNotes}>
              <div className="flex items-center justify-between border-b border-[#E9E9E7] px-4 py-3">
                <div>
                  <h2 className="text-base font-semibold">Edit assignment notes</h2>
                  <p className="mt-0.5 text-xs text-[#9B9A97]">
                    {notesStudent.name} · {notesAssignment.batchName || notesAssignment.batch?.name || "Assigned batch"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeNotesModal}
                  disabled={savingNotes}
                  aria-label="Close"
                  className={`rounded-[4px] p-1.5 text-[#787774] ${hoverBg}`}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-4 py-5">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Notes</span>
                  <textarea
                    autoFocus
                    value={editAssignmentNotes}
                    onChange={(event) => setEditAssignmentNotes(event.target.value)}
                    rows={6}
                    maxLength={2000}
                    placeholder="Add or update notes for this student's batch assignment..."
                    className={`${fieldClass} resize-y`}
                  />
                </label>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-xs text-[#9B9A97]">
                    These notes belong to this batch assignment only.
                  </span>
                  <span className="shrink-0 text-xs text-[#9B9A97]">
                    {editAssignmentNotes.length}/2000
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#E9E9E7] px-4 py-3">
                <button
                  type="button"
                  onClick={closeNotesModal}
                  disabled={savingNotes}
                  className="h-8 rounded-[4px] border border-[#E3E2E0] bg-white px-3 text-sm text-[#37352F] transition-colors hover:bg-[rgba(55,53,47,0.06)] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNotes}
                  className="inline-flex h-8 items-center gap-2 rounded-[4px] bg-[#2383E2] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[#0077D4] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingNotes ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  {savingNotes ? "Saving..." : "Save notes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change student name modal — API integration will be added next */}
      {showRenameModal && renameStudent && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(15,15,15,0.6)] p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeRenameModal();
          }}
        >
          <div
            className="w-full max-w-[440px] overflow-hidden rounded-[6px] bg-white"
            style={{
              boxShadow:
                "rgba(15,15,15,0.05) 0 0 0 1px, rgba(15,15,15,0.1) 0 5px 10px, rgba(15,15,15,0.2) 0 15px 40px",
            }}
          >
            <form onSubmit={submitRenameStudent}>
              <div className="flex items-center justify-between border-b border-[#E9E9E7] px-4 py-3">
                <div>
                  <h2 className="text-base font-semibold">Change student name</h2>
                  <p className="mt-0.5 text-xs text-[#9B9A97]">
                    Update the name associated with this student.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeRenameModal}
                  aria-label="Close"
                  className={`rounded-[4px] p-1.5 text-[#787774] ${hoverBg}`}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 px-4 py-5">
                <div className="rounded-[4px] bg-[#F7F6F3] px-3 py-2 text-sm">
                  <span className="text-[#9B9A97]">Current name: </span>
                  <span className="font-medium">{renameStudent.name || "Unnamed student"}</span>
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">New student name</span>
                  <input
                    autoFocus
                    required
                    type="text"
                    maxLength={120}
                    value={newStudentName}
                    onChange={(event) => setNewStudentName(event.target.value)}
                    placeholder="Enter new student name"
                    className={fieldClass}
                  />
                </label>
                <p className="text-xs text-[#9B9A97]">
                  The name-change API will be connected after the UI is finalized.
                </p>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#E9E9E7] px-4 py-3">
                <button
                  type="button"
                  onClick={closeRenameModal}
                  className="h-8 rounded-[4px] border border-[#E3E2E0] bg-white px-3 text-sm text-[#37352F] hover:bg-[rgba(55,53,47,0.06)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 rounded-[4px] bg-[#2383E2] px-3.5 text-sm font-medium text-white hover:bg-[#0077D4]"
                >
                  Save name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}