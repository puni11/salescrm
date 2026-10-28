"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus, X, Loader2, Pencil, Trash2, Search, CalendarDays,
  Users, Wrench, BookOpen, Type, CircleDot, Check,
  CalendarCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import BackButton from "@/lib/BackButton";

const EMPTY_FORM = {
  name: "",
  courseId: "",
  tools: [],
  trainers: [],
  toolTrainerAssignments: {},
  startingDate: "",
  status: "upcoming",
};

const STATUS_OPTIONS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "completed", label: "Completed" },
];

/* Notion tag colors per status */
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

const GRID =
  "grid grid-cols-[minmax(200px,1.6fr)_minmax(150px,1.2fr)_120px_minmax(160px,1.4fr)_minmax(160px,1.4fr)_130px_76px]";

const hoverBg = "hover:bg-[rgba(55,53,47,0.06)]";

function Pill({ className = "", children }) {
  return (
    <span
      className={`inline-flex max-w-full items-center truncate rounded-[3px] px-1.5 py-0.5 text-[13px] leading-5 ${className}`}
    >
      {children}
    </span>
  );
}

function HeaderCell({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 text-[13px] text-[#787774]">
      <Icon size={14} className="shrink-0 text-[#9B9A97]" />
      <span className="truncate">{children}</span>
    </div>
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

export default function BatchManager() {
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

  const loadData = async () => {
    try {
      setLoading(true);

      const [batchRes, courseRes, toolRes, trainerRes] =
        await Promise.all([
          fetch("/api/batches"),
          fetch("/api/course/details"),
          fetch("/api/tools"),
          fetch("/api/trainers"),
        ]);

      const responses = await Promise.all([
        batchRes.json(),
        courseRes.json(),
        toolRes.json(),
        trainerRes.json(),
      ]);

      const [batchData, courseData, toolData, trainerData] = responses;

      if (!batchRes.ok || !batchData.success) {
        throw new Error(batchData.message || "Failed to load batches");
      }

      if (!courseRes.ok || !courseData.success) {
        throw new Error(courseData.message || "Failed to load courses");
      }

      if (!toolRes.ok || !toolData.success) {
        throw new Error(toolData.message || "Failed to load tools");
      }

      if (!trainerRes.ok || !trainerData.success) {
        throw new Error(trainerData.message || "Failed to load trainers");
      }

      setBatches(batchData.data || []);
      setCourses(courseData.data || []);
      setTools(toolData.data || []);
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
    }),
    [batches]
  );

  const filteredBatches = useMemo(() => {
    const query = search.trim().toLowerCase();

    return batches.filter((batch) => {
      const matchesSearch =
        batch.name?.toLowerCase().includes(query) ||
        courses.find((c) => String(c._id) === String(batch.courseId))
          ?.name?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" || batch.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [batches, courses, search, statusFilter]);

  const getCourse = (id) =>
    courses.find((course) => String(course._id) === String(id));

  const getTool = (id) =>
    tools.find((tool) => String(tool._id) === String(id));

  const getTrainer = (id) =>
    trainers.find((trainer) => String(trainer._id) === String(id));

  const formatDate = (value) => {
    if (!value) return "Not set";

    // Parse YYYY-MM-DD as a local date to avoid timezone shifts.
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    const date = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : new Date(value);

    if (Number.isNaN(date.getTime())) return "Invalid date";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const openCreate = () => {
    setEditingId(null);

    setForm({
      ...EMPTY_FORM,
      courseId: courses[0]?._id || "",
      tools: [],
      trainers: [],
      toolTrainerAssignments: {},
    });

    setShowModal(true);
  };

  const openEdit = (batch) => {
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
      status: batch.status || "upcoming",
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

      const toolTrainerAssignments = {
        ...previous.toolTrainerAssignments,
      };

      if (!tools.includes(id)) {
        delete toolTrainerAssignments[id];
      }

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
      const toolTrainerAssignments = {
        ...previous.toolTrainerAssignments,
      };

      if (trainerId) {
        toolTrainerAssignments[toolId] = trainerId;
      } else {
        delete toolTrainerAssignments[toolId];
      }

      return {
        ...previous,
        toolTrainerAssignments,
        trainers: [...new Set(Object.values(toolTrainerAssignments))],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Enter a batch name");
      return;
    }

    if (!form.courseId) {
      toast.error("Select a course");
      return;
    }

    if (!form.startingDate) {
      toast.error("Select a starting date");
      return;
    }

    if (form.tools.length === 0) {
      toast.error("Select at least one tool");
      return;
    }

    const assignments = form.tools.map((toolId) => ({
      toolId,
      trainerId: form.toolTrainerAssignments[toolId] || "",
    }));

    if (assignments.some((item) => !item.trainerId)) {
      toast.error("Assign a trainer to every selected tool");
      return;
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
      toast.error("Each trainer must be active and teach their assigned tool");
      return;
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
            status: form.status,
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

  const isFiltered = search || statusFilter !== "all";

  return (
    <div
      className="w-full text-[#37352F]"
    >
      {/* Page header */}
      <BackButton />
      <div className="mb-6">
        <h2 className="mt-3 text-[24px] font-bold leading-tight tracking-[-0.01em] sm:text-[32px]">
          Batches
        </h2>
        <p className="mt-1 text-[15px] text-[#787774]">
          Organize course schedules, tools, and trainer assignments.
        </p>
      </div>

      {/* View tabs + toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E9E9E7]">
        <div className="flex flex-wrap items-center gap-1">
          {tabs.map(([key, label, count]) => {
            const selected = statusFilter === key;

            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
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
            onClick={openCreate}
            className="ml-1 inline-flex h-7 items-center gap-1 rounded-[4px] bg-[#2383E2] px-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0077D4]"
          >
            <Plus size={15} /> New
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <div className="min-w-[1180px]">
          <div className={`${GRID} border-b border-[#E9E9E7]`}>
            <HeaderCell icon={Type}>Name</HeaderCell>
            <HeaderCell icon={BookOpen}>Course</HeaderCell>
            <HeaderCell icon={CalendarDays}>Starting date</HeaderCell>
            <HeaderCell icon={Wrench}>Tools</HeaderCell>
            <HeaderCell icon={Users}>Trainers</HeaderCell>
            <HeaderCell icon={CircleDot}>Status</HeaderCell>
            <div />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#9B9A97]">
              <Loader2 size={16} className="animate-spin" /> Loading batches
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-sm text-[#787774]">
                {isFiltered
                  ? "No matching batches found."
                  : "No batches created yet."}
              </p>
              <p className="mt-1 text-xs text-[#9B9A97]">
                Create a batch to organize a course and its trainers.
              </p>
              {!isFiltered && (
                <button
                  onClick={openCreate}
                  className="mt-2 text-sm text-[#2383E2] hover:underline"
                >
                  Create your first batch
                </button>
              )}
            </div>
          ) : (
            filteredBatches.map((batch) => {
              const course = getCourse(batch.courseId);
              const batchTools = (batch.tools || [])
                .map((id) => getTool(id)?.name)
                .filter(Boolean);

              const batchAssignments = Array.isArray(batch.toolTrainerAssignments)
                ? batch.toolTrainerAssignments
                : [];
              const batchTrainers = batchAssignments.length
                ? batchAssignments.map((assignment) => {
                    const toolName = getTool(assignment.toolId)?.name || "Tool";
                    const trainerName = getTrainer(assignment.trainerId)?.name || "Trainer unavailable";
                    return `${toolName}: ${trainerName}`;
                  })
                : (batch.trainers || [])
                    .map((id) => getTrainer(id)?.name)
                    .filter(Boolean);

              const statusKey = batch.status || "inactive";

              return (
                <div
                  key={batch._id}
                  className={`group ${GRID} items-center border-b border-[#E9E9E7] transition-colors hover:bg-[rgba(55,53,47,0.03)]`}
                >
                  <Link
                  href={`/batches/${batch._id}`}
                    className="flex min-w-0 items-center gap-2 px-2 py-2.5 text-left"
                  >
                    <span className="shrink-0 text-base"><CalendarCheck size={16} /></span>
                    <span className="truncate text-sm font-medium underline decoration-[#E3E2E0] decoration-1 underline-offset-[3px] group-hover:decoration-[#9B9A97]">
                      {batch.name}
                    </span>
                  </Link>

                  <div className="min-w-0 px-2 py-2.5">
                    {course ? (
                      <Pill className={tagColor(course._id)}>{course.name}</Pill>
                    ) : (
                      <span className="text-sm text-[#C7C6C3]">
                        Course unavailable
                      </span>
                    )}
                  </div>

                  <div className="px-2 py-2.5 text-sm text-[#787774]">
                    {formatDate(batch.startingDate)}
                  </div>

                  <div className="flex min-w-0 flex-wrap gap-1 px-2 py-2.5">
                    {batchTools.length ? (
                      batchTools.map((name) => (
                        <Pill key={name} className={tagColor(name)}>
                          {name}
                        </Pill>
                      ))
                    ) : (
                      <span className="text-sm text-[#C7C6C3]">Empty</span>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-wrap gap-1 px-2 py-2.5">
                    {batchTrainers.length ? (
                      batchTrainers.map((name) => (
                        <Pill key={name} className={tagColor(name)}>
                          {name}
                        </Pill>
                      ))
                    ) : (
                      <span className="text-sm text-[#C7C6C3]">Empty</span>
                    )}
                  </div>

                  <div className="px-2 py-2.5">
                    <select
                      aria-label={`Change status for ${batch.name}`}
                      value={statusKey}
                      onChange={(e) => changeStatus(batch, e.target.value)}
                      className={`cursor-pointer appearance-none rounded-[3px] border-0 px-1.5 py-0.5 text-[13px] leading-5 outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2]/40 ${
                        statusStyles[statusKey] || statusStyles.inactive
                      }`}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-center gap-0.5">
                    <button
                      onClick={() => openEdit(batch)}
                      aria-label={`Edit ${batch.name}`}
                      className={`rounded-[4px] p-1.5 text-[#787774] opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 ${hoverBg}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => deleteBatch(batch)}
                      disabled={deletingId === batch._id}
                      aria-label={`Delete ${batch.name}`}
                      className={`rounded-[4px] p-1.5 text-[#787774] transition-opacity hover:bg-[#FFE2DD] hover:text-[#E03E3E] focus:opacity-100 group-hover:opacity-100 ${
                        deletingId === batch._id ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {deletingId === batch._id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                    
                  </div>
                </div>
              );
            })
          )}

          {!loading && (
            <button
              onClick={openCreate}
              className={`flex w-full items-center gap-2 px-2 py-2 text-left text-sm text-[#9B9A97] transition-colors ${hoverBg}`}
            >
              <Plus size={15} /> New batch
            </button>
          )}
        </div>
      </div>

      {!loading && filteredBatches.length > 0 && (
        <p className="mt-3 px-2 text-xs text-[#9B9A97]">
          Showing {filteredBatches.length} of {batches.length} batches
        </p>
      )}

      {/* Modal / page peek */}
      {showModal && (
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
                        setForm((p) => ({
                          ...p,
                          startingDate: e.target.value,
                        }))
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
                              {tool.name}
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
                                  {tool?.name || "Unknown tool"}
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
                                  No active trainer teaches this tool. Update the trainer's tool assignments first.
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