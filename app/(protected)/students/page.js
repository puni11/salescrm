"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Users,
  BookOpen,
  Wrench,
  CalendarDays,
  Loader2,
  X,
  Check,
  UserRound,
  GraduationCap,
  Trash2,
  RefreshCw,
  Pencil,
  Plus,
  Table2,
  Type,
  Mail,
  Phone,
  CircleDot,
  Layers3,
  ListChecks,
  IndianRupee,
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

/* Fee summary for a batch assignment (null when no fee is recorded) */
const getFeeInfo = (assignment) => {
  if (!assignment || assignment.totalFee == null) return null;

  const total = Number(assignment.totalFee) || 0;
  const paid = Number(assignment.paidFee) || 0;
  const due = Math.max(total - paid, 0);

  let label = "Due";
  let color = "bg-[#FFE2DD] text-[#5D1715]";

  if (total > 0 && due === 0) {
    label = "Paid";
    color = "bg-[#DBEDDB] text-[#1C3829]";
  } else if (paid > 0) {
    label = "Partial";
    color = "bg-[#FDECC8] text-[#402C1B]";
  }

  return { total, paid, due, label, color };
};

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

const GRID =
  "grid grid-cols-[minmax(210px,1.5fr)_minmax(200px,1.4fr)_130px_minmax(150px,1.1fr)_130px_minmax(190px,1.3fr)_120px_minmax(220px,1.6fr)_minmax(170px,1fr)_76px]";

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

export default function StudentBatchAssignmentsPage() {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const searchRef = useRef(null);

  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [mode, setMode] = useState("full_course");
  const [selectedTools, setSelectedTools] = useState([]);
  const [totalFee, setTotalFee] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => {
    const today = new Date();
    const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
  });
  const [removingId, setRemovingId] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);

      const response = await fetch(API, {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load students");
      }

      setStudents(result.data.students || []);
      setBatches(result.data.batches || []);
    } catch (error) {
      toast.error(error.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((student) => {
      const assignments = student.batchAssignments || [];
      const matchesSearch = [
        student.name,
        student.email,
        student.phone,
        student.course,
        ...assignments.flatMap((item) => [item.batchName, item.batch?.name]),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));

      const status = String(student.status).toLowerCase();
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [students, search, statusFilter]);

  const assignedCount = students.filter(
    (student) => (student.batchAssignments || []).length > 0
  ).length;

  const pendingFees = useMemo(
    () =>
      students.reduce(
        (sum, student) =>
          sum + (student.batchAssignments || []).reduce(
            (assignmentSum, assignment) =>
              assignmentSum + (getFeeInfo(assignment)?.due || 0),
            0
          ),
        0
      ),
    [students]
  );

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
    Number(selectedAssignment?.legacyPaidFee) +
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
    setPaymentDate(() => {
      const today = new Date();
      const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
      return localDate.toISOString().slice(0, 10);
    });
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
      // A new installment is entered separately; existing payments remain in history.
      setPaymentAmount("");
      setPaymentDate(() => {
        const today = new Date();
        const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
        return localDate.toISOString().slice(0, 10);
      });
    } else {
      setMode("full_course");
      setSelectedTools(batch?.tools?.map((tool) => tool.id) || []);
      setTotalFee(batch?.fee != null ? String(batch.fee) : "");
      setPaymentAmount("");
      setPaymentDate(() => {
        const today = new Date();
        const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
        return localDate.toISOString().slice(0, 10);
      });
    }
  };

  const toggleTool = (toolId) => {
    setSelectedTools((previous) =>
      previous.includes(toolId)
        ? previous.filter((id) => id !== toolId)
        : [...previous, toolId]
    );
  };

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

    if (totalFeeNum < 0 || paymentAmountNum < 0) {
      toast.error("Fees cannot be negative");
      return;
    }

    if (paymentAmountNum > 0 && !paymentDate) {
      toast.error("Select the payment date");
      return;
    }

    if (overpaid) {
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
          totalFee: totalFeeNum,
          paymentAmount: paymentAmountNum,
          paymentDate,
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
      setStudents((previous) =>
        previous.map((item) =>
          item.id === student.id
            ? {
                ...item,
                batchAssignments: (item.batchAssignments || []).filter(
                  (a) => String(a.batchId) !== String(assignment.batchId)
                ),
              }
            : item
        )
      );
    } catch (error) {
      toast.error(error.message || "Failed to remove assignment");
    } finally {
      setRemovingId(null);
    }
  };

  const counts = {
    all: students.length,
    registered: students.filter(
      (student) => String(student.status).toLowerCase() === "registered"
    ).length,
    converted: students.filter(
      (student) => String(student.status).toLowerCase() === "converted"
    ).length,
  };

  const tabs = [
    ["all", "All students"],
    ["registered", "Registered"],
    ["converted", "Converted"],
  ];

  const iconBtn =
    "inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-[#787774] transition-colors hover:bg-[rgba(55,53,47,0.08)] disabled:opacity-50";

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-[#37352F] sm:px-8 lg:px-[30px]">
      {/* Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.01em] sm:text-[32px]">
          Students
        </h1>
      </div>
      <p className="mt-1 text-sm text-[#787774]">
        Manage registered students and assign their courses, batches, learning
        tools, and fees.
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
                onClick={() => setStatusFilter(value)}
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

        <div className="flex items-center gap-0.5">
          {searchOpen || search ? (
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[#9B9A97]"
              />
              <input
                ref={searchRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onBlur={() => {
                  if (!search) setSearchOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearch("");
                    setSearchOpen(false);
                  }
                }}
                placeholder="Name, email, phone, course or batch"
                className="h-7 w-64 rounded-[4px] bg-white pl-7 pr-2 text-sm outline-none ring-1 ring-[#E3E2E0] placeholder:text-[#9B9A97] focus:ring-2 focus:ring-[#2383E2]/50"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search students"
              className={iconBtn}
            >
              <Search size={16} />
            </button>
          )}

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

      {/* Table */}
      <div className="mt-3 overflow-x-auto">
        <div className="min-w-[1600px]">
          <div className={`${GRID} border-y border-[#E9E9E7]`}>
            <HeadCell icon={Type}>Student</HeadCell>
            <HeadCell icon={Mail}>Email</HeadCell>
            <HeadCell icon={Phone}>Phone</HeadCell>
            <HeadCell icon={BookOpen}>Course</HeadCell>
            <HeadCell icon={CircleDot}>Status</HeadCell>
            <HeadCell icon={Layers3}>Batch</HeadCell>
            <HeadCell icon={ListChecks}>Plan</HeadCell>
            <HeadCell icon={Wrench}>Assigned tools</HeadCell>
            <HeadCell icon={IndianRupee}>Fees</HeadCell>
            <HeadCell last />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 border-b border-[#E9E9E7] py-16 text-sm text-[#9B9A97]">
              <Loader2 size={16} className="animate-spin" />
              Loading students
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="border-b border-[#E9E9E7] py-16 text-center">
              <p className="text-sm font-medium">No students found</p>
              <p className="mt-1 text-sm text-[#787774]">
                Only students with Registered or Converted status are
                displayed.
              </p>
            </div>
          ) : (
            filteredStudents.map((student) => {
              const assignments = student.batchAssignments || [];
              const totalFee = assignments.reduce((sum, item) => sum + (Number(item.totalFee) || 0), 0);
              const totalPaid = assignments.reduce((sum, item) => sum + (Number(item.paidFee) || 0), 0);
              const totalDue = assignments.reduce(
                (sum, item) => sum + Math.max((Number(item.totalFee) || 0) - (Number(item.paidFee) || 0), 0),
                0
              );
              const converted = String(student.status).toLowerCase() === "converted";

              return (
                <div
                  key={student.id}
                  className={`group ${GRID} border-b border-[#E9E9E7] transition-colors hover:bg-[rgba(55,53,47,0.03)]`}
                >
                  <Cell>
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E3E2E0]"><UserRound size={12} className="text-[#787774]" /></span>
                    <span className="truncate font-medium">{student.name || "Unnamed student"}</span>
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
                        <button key={a.batchId} type="button" onClick={() => openAssignModal(student)} title="Manage batch" className="max-w-full">
                          <Tagged className={tagColor(a.batchName || a.batch?.name)}>{a.batchName || a.batch?.name || "Batch"}</Tagged>
                        </button>
                      )) : <button type="button" onClick={() => openAssignModal(student)} className={`inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-sm text-[#9B9A97] ${hoverBg}`}><Plus size={14} /> Assign batch</button>}
                    </div>
                  </Cell>
                  <Cell>
                    <div className="flex flex-wrap gap-1">
                      {assignments.length ? assignments.map((a) => <Tagged key={a.batchId} className={a.mode === "full_course" ? "bg-[#DBEDDB] text-[#1C3829]" : "bg-[#FDECC8] text-[#402C1B]"}>{a.mode === "full_course" ? "Full course" : "Selected tools"}</Tagged>) : <span className="text-[#C7C6C3]">—</span>}
                    </div>
                  </Cell>
                  <Cell>
                    <div className="flex flex-wrap gap-1">
                      {[...new Set(assignments.flatMap((a) => a.toolNames || a.selectedTools?.map((t) => t.name) || []))].length
                        ? [...new Set(assignments.flatMap((a) => a.toolNames || a.selectedTools?.map((t) => t.name) || []))].map((name) => <Tagged key={name} className={tagColor(name)}>{name}</Tagged>)
                        : <span className="text-[#C7C6C3]">—</span>}
                    </div>
                  </Cell>
                  <Cell>
                    {assignments.length ? <span title={`Total ${formatCurrency(totalFee)} · Paid ${formatCurrency(totalPaid)} · Due ${formatCurrency(totalDue)}`} className="truncate text-sm text-[#787774]">{totalDue > 0 ? `${formatCurrency(totalDue)} due` : formatCurrency(totalFee)}</span> : <span className="text-[#C7C6C3]">—</span>}
                  </Cell>
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

          {!loading && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-2 py-2 text-[13px] text-[#9B9A97]">
              <span>
                <span className="uppercase tracking-wide">Count</span>
                <span className="ml-1.5 text-[#37352F]">
                  {filteredStudents.length}
                </span>
              </span>
              <span>
                <span className="uppercase tracking-wide">Assigned</span>
                <span className="ml-1.5 text-[#37352F]">{assignedCount}</span>
              </span>
              <span>
                <span className="uppercase tracking-wide">Awaiting</span>
                <span className="ml-1.5 text-[#37352F]">
                  {counts.all - assignedCount}
                </span>
              </span>
              <span>
                <span className="uppercase tracking-wide">Pending fees</span>
                <span className="ml-1.5 text-[#37352F]">
                  {formatCurrency(pendingFees)}
                </span>
              </span>
            </div>
          )}
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
                    overpaid ||
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
    </main>
  );
}