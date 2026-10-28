"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  X,
  Loader2,
  Pencil,
  Clock3,
  Users,
  IndianRupee,
  Tag,
  Search,
  Check,
  Wrench,
  Award,
  FileText,
  UserRound,
  CircleDot,
  Type,
  Table2,
  BookOpen,
} from "lucide-react";
import toast from "react-hot-toast";

const EMPTY_FORM = {
  name: "",
  categoryId: "",
  tools: [],
  hours: "",
  price: "",
  trainerIds: [],
  certificationPitchCourseId: "",
  prerequisite: "",
  salesCounsellorId: "",
  status: "active",
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
  "grid grid-cols-[minmax(220px,1.6fr)_150px_minmax(200px,1.4fr)_90px_110px_minmax(190px,1.3fr)_170px_minmax(220px,1.6fr)_160px_120px_72px]";

const hoverBg = "hover:bg-[rgba(55,53,47,0.06)]";

const fieldClass =
  "w-full rounded-[4px] bg-transparent px-2 py-1.5 text-sm text-[#37352F] outline-none transition-colors placeholder:text-[#C7C6C3] hover:bg-[rgba(55,53,47,0.06)] focus:bg-white focus:ring-2 focus:ring-[#2383E2]/40";

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

function Empty() {
  return <span className="text-[#C7C6C3]">—</span>;
}

function Property({ icon: Icon, label, children }) {
  return (
    <div className="flex flex-col gap-1 py-0.5 sm:flex-row sm:items-start sm:gap-2">
      <div className="flex w-40 shrink-0 items-center gap-2 px-1 py-1.5 text-sm text-[#787774]">
        <Icon size={15} className="text-[#9B9A97]" />
        {label}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function formatPrice(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function CourseManager() {
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tools, setTools] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [certificationCourses, setCertificationCourses] = useState([]);
  const [counsellors, setCounsellors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState(EMPTY_FORM);
  const searchRef = useRef(null);

  const loadData = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/course/details", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load courses");
      }

      const options = result.options || {};

      setCourses(result.data || []);
      setCategories(options.categories || []);
      setTools(options.tools || []);
      setTrainers(options.trainers || []);
      setCertificationCourses(options.certificationCourses || []);
      setCounsellors(options.counsellors || []);
    } catch (error) {
      toast.error(error.message || "Failed to load courses");
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

  useEffect(() => {
    if (!showModal) return;

    const handleKey = (event) => {
      if (event.key === "Escape" && !saving) {
        setShowModal(false);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showModal, saving]);

  const getCategoryName = (id) =>
    categories.find((item) => String(item._id) === String(id))
      ?.name || "Uncategorized";

  const getToolNames = (ids = []) =>
    ids
      .map((id) =>
        tools.find((tool) => String(tool._id) === String(id))?.name
      )
      .filter(Boolean);

  const getTrainerNames = (ids = []) =>
    ids
      .map((id) =>
        trainers.find(
          (trainer) => String(trainer._id) === String(id)
        )?.name
      )
      .filter(Boolean);

  const getCertificationName = (id) =>
    certificationCourses.find(
      (course) => String(course._id) === String(id)
    )?.name || "—";

  const getCounsellorName = (id) =>
    counsellors.find(
      (person) => String(person._id) === String(id)
    )?.name || "—";

  const updateField = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const toggleArrayValue = (key, id) => {
    setForm((previous) => ({
      ...previous,
      [key]: previous[key].includes(id)
        ? previous[key].filter((item) => item !== id)
        : [...previous[key], id],
    }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      categoryId: categories[0]?._id || "",
    });
    setShowModal(true);
  };

  const openEdit = (course) => {
    setEditingId(String(course._id));

    setForm({
      name: course.name || "",
      categoryId: String(course.categoryId || ""),
      tools: (course.tools || []).map(String),
      hours: String(course.hours ?? ""),
      price: String(course.price ?? ""),
      trainerIds: (course.trainerIds || []).map(String),
      certificationPitchCourseId: String(
        course.certificationPitchCourseId || ""
      ),
      prerequisite: course.prerequisite || "",
      salesCounsellorId: String(course.salesCounsellorId || ""),
      status: course.status || "active",
    });

    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Enter a course name");
      return;
    }

    if (!form.categoryId) {
      toast.error("Select a category");
      return;
    }

    if (!form.hours || Number(form.hours) <= 0) {
      toast.error("Enter valid course hours");
      return;
    }

    if (form.price === "" || Number(form.price) < 0) {
      toast.error("Enter a valid course fee");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        editingId
          ? `/api/course/details?id=${editingId}`
          : "/api/course/details",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...form,
            name: form.name.trim(),
            hours: Number(form.hours),
            price: Number(form.price),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save course");
      }

      toast.success(
        editingId
          ? "Course updated successfully"
          : "Course created successfully"
      );

      setShowModal(false);
      setEditingId(null);
      setForm(EMPTY_FORM);

      await loadData();
    } catch (error) {
      toast.error(error.message || "Failed to save course");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (course) => {
    const nextStatus =
      course.status === "active" ? "inactive" : "active";

    try {
      const response = await fetch(
        `/api/course/details?id=${course._id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: nextStatus }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update status");
      }

      setCourses((previous) =>
        previous.map((item) =>
          String(item._id) === String(course._id)
            ? { ...item, status: nextStatus }
            : item
        )
      );

      toast.success(`Course ${nextStatus}`);
    } catch (error) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return courses.filter((course) => {
      const searchable = [
        course.name,
        getCategoryName(course.categoryId),
        getCertificationName(course.certificationPitchCourseId),
        getCounsellorName(course.salesCounsellorId),
        course.prerequisite,
        ...getToolNames(course.tools),
        ...getTrainerNames(course.trainerIds),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchable.includes(query);
      const matchesStatus =
        statusFilter === "all" || course.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    courses,
    search,
    statusFilter,
    categories,
    tools,
    trainers,
    certificationCourses,
    counsellors,
  ]);

  const activeCount = courses.filter(
    (course) => course.status === "active"
  ).length;

  const tabs = [
    ["all", "All courses", courses.length],
    ["active", "Active", activeCount],
    ["inactive", "Inactive", courses.length - activeCount],
  ];

  const iconBtn =
    "inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-[#787774] transition-colors hover:bg-[rgba(55,53,47,0.08)]";

  return (
    <div
      className="w-full text-[#37352F]"
     
    >
      {/* Title */}
      <div className="flex items-center gap-3">
       
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.01em] sm:text-[32px]">
          Courses
        </h1>
      </div>
      <p className="ml-[46px] mt-1 text-sm text-[#787774]">
        Manage course fees, tools, trainers, certification pitches,
        prerequisites and sales counsellors.
      </p>

      {/* View tabs + toolbar */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {tabs.map(([value, label, count]) => {
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
                <span className="text-xs text-[#9B9A97]">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1">
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
                placeholder="Type to search..."
                className="h-7 w-56 rounded-[4px] bg-white pl-7 pr-2 text-sm outline-none ring-1 ring-[#E3E2E0] placeholder:text-[#9B9A97] focus:ring-2 focus:ring-[#2383E2]/50"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search courses"
              className={iconBtn}
            >
              <Search size={16} />
            </button>
          )}

          <button
            type="button"
            onClick={openCreate}
            className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-[6px] bg-[#2383E2] px-3 text-sm font-medium text-white transition-colors hover:bg-[#0077D4]"
          >
            New
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mt-3 overflow-x-auto">
        <div className="min-w-[1960px]">
          <div className={`${GRID} border-y border-[#E9E9E7]`}>
            <HeadCell icon={Type}>Course</HeadCell>
            <HeadCell icon={Tag}>Category</HeadCell>
            <HeadCell icon={Wrench}>Tools</HeadCell>
            <HeadCell icon={Clock3}>Hours</HeadCell>
            <HeadCell icon={IndianRupee}>Fees</HeadCell>
            <HeadCell icon={Users}>Trainer</HeadCell>
            <HeadCell icon={Award}>Certification pitch</HeadCell>
            <HeadCell icon={FileText}>Prerequisite</HeadCell>
            <HeadCell icon={UserRound}>Sales counsellor</HeadCell>
            <HeadCell icon={CircleDot}>Status</HeadCell>
            <HeadCell last />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 border-b border-[#E9E9E7] py-16 text-sm text-[#9B9A97]">
              <Loader2 size={16} className="animate-spin" />
              Loading courses
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="border-b border-[#E9E9E7] py-16 text-center text-sm text-[#787774]">
              {search ? "No matching courses found." : "No courses available."}
            </div>
          ) : (
            filteredCourses.map((course) => {
              const toolNames = getToolNames(course.tools);
              const trainerNames = getTrainerNames(course.trainerIds);
              const certification = getCertificationName(
                course.certificationPitchCourseId
              );
              const counsellor = getCounsellorName(course.salesCounsellorId);
              const active = course.status === "active";

              return (
                <div
                  key={course._id}
                  className={`group ${GRID} border-b border-[#E9E9E7] transition-colors hover:bg-[rgba(55,53,47,0.03)]`}
                >
                  <Cell>
                    <FileText
                      size={16}
                      className="shrink-0 text-[#9B9A97]"
                    />
                    <button
                      type="button"
                      onClick={() => openEdit(course)}
                      className="truncate text-left font-medium underline decoration-[#E3E2E0] decoration-1 underline-offset-[3px] hover:decoration-[#9B9A97]"
                    >
                      {course.name}
                    </button>
                  </Cell>

                  <Cell>
                    <Tagged className={tagColor(course.categoryId)}>
                      {getCategoryName(course.categoryId)}
                    </Tagged>
                  </Cell>

                  <Cell>
                    {toolNames.length ? (
                      toolNames.map((name) => (
                        <Tagged key={name} className={tagColor(name)}>
                          {name}
                        </Tagged>
                      ))
                    ) : (
                      <Empty />
                    )}
                  </Cell>

                  <Cell>
                    <span className="tabular-nums">{course.hours} hrs</span>
                  </Cell>

                  <Cell>
                    <span className="tabular-nums">
                      {formatPrice(course.price)}
                    </span>
                  </Cell>

                  <Cell>
                    {trainerNames.length ? (
                      trainerNames.map((name) => (
                        <Tagged key={name} className={tagColor(name)}>
                          {name}
                        </Tagged>
                      ))
                    ) : (
                      <Empty />
                    )}
                  </Cell>

                  <Cell>
                    {certification !== "—" ? (
                      <Tagged className={tagColor(certification)}>
                        {certification}
                      </Tagged>
                    ) : (
                      <Empty />
                    )}
                  </Cell>

                  <Cell>
                    {course.prerequisite ? (
                      <span
                        className="truncate text-[#787774]"
                        title={course.prerequisite}
                      >
                        {course.prerequisite}
                      </span>
                    ) : (
                      <Empty />
                    )}
                  </Cell>

                  <Cell>
                    {counsellor !== "—" ? (
                      <span className="truncate">{counsellor}</span>
                    ) : (
                      <Empty />
                    )}
                  </Cell>

                  <Cell>
                    <button
                      type="button"
                      onClick={() => toggleStatus(course)}
                      title={active ? "Click to deactivate" : "Click to activate"}
                      className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2]/40"
                    >
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-sm leading-5 ${
                          active
                            ? "bg-[#DBEDDB] text-[#1C3829]"
                            : "bg-[#E3E2E0] text-[#32302C]"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            active ? "bg-[#4DAB9A]" : "bg-[#9B9A97]"
                          }`}
                        />
                        {active ? "Active" : "Inactive"}
                      </span>
                    </button>
                  </Cell>

                  <Cell last className="justify-center px-1">
                    <button
                      type="button"
                      onClick={() => openEdit(course)}
                      aria-label={`Edit ${course.name}`}
                      title="Edit course"
                      className={`rounded-[4px] p-1.5 text-[#787774] opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 ${hoverBg}`}
                    >
                      <Pencil size={14} />
                    </button>
                  </Cell>
                </div>
              );
            })
          )}

          {!loading && (
            <button
              type="button"
              onClick={openCreate}
              className={`flex w-full items-center gap-2 border-b border-[#E9E9E7] px-2 py-2 text-left text-sm text-[#9B9A97] transition-colors ${hoverBg}`}
            >
              <Plus size={15} /> New course
            </button>
          )}

          {!loading && (
            <div className="px-2 py-2 text-[13px] text-[#9B9A97]">
              <span className="uppercase tracking-wide">Count</span>
              <span className="ml-1.5 text-[#37352F]">
                {filteredCourses.length}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit modal / page peek */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(15,15,15,0.6)] p-4 sm:py-12"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setShowModal(false);
            }
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
                  {editingId ? "Edit course" : "New course"}
                </span>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowModal(false)}
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
                  onChange={(event) =>
                    updateField("name", event.target.value)
                  }
                  placeholder="Untitled"
                  className="w-full bg-transparent text-[32px] font-bold leading-tight tracking-[-0.01em] text-[#37352F] outline-none placeholder:text-[#D3D1CB]"
                />

                <div className="mt-4 space-y-0.5 border-b border-[#E9E9E7] pb-4">
                  <Property icon={Tag} label="Category">
                    <select
                      required
                      value={form.categoryId}
                      onChange={(event) =>
                        updateField("categoryId", event.target.value)
                      }
                      className={fieldClass}
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </Property>

                  <Property icon={Clock3} label="Hours">
                    <input
                      required
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={form.hours}
                      onChange={(event) =>
                        updateField("hours", event.target.value)
                      }
                      placeholder="Total learning hours"
                      className={fieldClass}
                    />
                  </Property>

                  <Property icon={IndianRupee} label="Fees (INR)">
                    <input
                      required
                      type="number"
                      min="0"
                      step="1"
                      value={form.price}
                      onChange={(event) =>
                        updateField("price", event.target.value)
                      }
                      placeholder="Course fee"
                      className={fieldClass}
                    />
                  </Property>

                  <Property icon={Wrench} label="Tools">
                    <div className="flex flex-wrap gap-1.5 px-1 py-1">
                      {tools.map((tool) => {
                        const id = String(tool._id);
                        const selected = form.tools.includes(id);

                        return (
                          <button
                            type="button"
                            key={id}
                            onClick={() => toggleArrayValue("tools", id)}
                            aria-pressed={selected}
                            className={`inline-flex items-center gap-1.5 rounded-[4px] px-2 py-1 text-[13px] transition-colors ${
                              selected
                                ? "bg-[#D3E5EF] text-[#183347]"
                                : "border border-dashed border-[#D3D1CB] text-[#787774] hover:bg-[rgba(55,53,47,0.06)]"
                            }`}
                          >
                            {selected && <Check size={13} />}
                            {tool.name}
                          </button>
                        );
                      })}

                      {tools.length === 0 && (
                        <p className="rounded-[4px] bg-[#FDECC8] px-2.5 py-2 text-[13px] text-[#402C1B]">
                          No active tools found.
                        </p>
                      )}
                    </div>
                  </Property>

                  <Property icon={Users} label="Trainers">
                    <div className="flex flex-wrap gap-1.5 px-1 py-1">
                      {trainers.map((trainer) => {
                        const id = String(trainer._id);
                        const selected = form.trainerIds.includes(id);

                        return (
                          <button
                            type="button"
                            key={id}
                            onClick={() =>
                              toggleArrayValue("trainerIds", id)
                            }
                            aria-pressed={selected}
                            className={`inline-flex items-center gap-1.5 rounded-[4px] px-2 py-1 text-[13px] transition-colors ${
                              selected
                                ? "bg-[#D3E5EF] text-[#183347]"
                                : "border border-dashed border-[#D3D1CB] text-[#787774] hover:bg-[rgba(55,53,47,0.06)]"
                            }`}
                          >
                            {selected && <Check size={13} />}
                            {trainer.name}
                          </button>
                        );
                      })}

                      {trainers.length === 0 && (
                        <p className="rounded-[4px] bg-[#FDECC8] px-2.5 py-2 text-[13px] text-[#402C1B]">
                          No active trainers found.
                        </p>
                      )}
                    </div>
                  </Property>

                  <Property icon={Award} label="Certification pitch">
                    <select
                      value={form.certificationPitchCourseId}
                      onChange={(event) =>
                        updateField(
                          "certificationPitchCourseId",
                          event.target.value
                        )
                      }
                      className={fieldClass}
                    >
                      <option value="">No certification pitch</option>
                      {certificationCourses.map((course) => (
                        <option key={course._id} value={course._id}>
                          {course.name}
                        </option>
                      ))}
                    </select>

                    <p className="mt-1 px-2 text-xs text-[#9B9A97]">
                      Only active courses in the Certification category appear
                      here.
                    </p>
                  </Property>

                  <Property icon={FileText} label="Prerequisite">
                    <textarea
                      rows={3}
                      value={form.prerequisite}
                      onChange={(event) =>
                        updateField("prerequisite", event.target.value)
                      }
                      placeholder="Enter prerequisites, eligibility or prior knowledge..."
                      className={`${fieldClass} resize-y`}
                    />
                  </Property>

                  <Property icon={UserRound} label="Sales counsellor">
                    <select
                      value={form.salesCounsellorId}
                      onChange={(event) =>
                        updateField("salesCounsellorId", event.target.value)
                      }
                      className={fieldClass}
                    >
                      <option value="">Select sales counsellor</option>
                      {counsellors.map((person) => (
                        <option key={person._id} value={person._id}>
                          {person.name}
                          {person.counsellorStatus
                            ? ` (${person.counsellorStatus})`
                            : ""}
                        </option>
                      ))}
                    </select>

                    {counsellors.length === 0 && (
                      <p className="mt-1 px-2 text-xs text-[#402C1B]">
                        No available counsellors found in internal.users.
                      </p>
                    )}
                  </Property>

                  <Property icon={CircleDot} label="Status">
                    <select
                      value={form.status}
                      onChange={(event) =>
                        updateField("status", event.target.value)
                      }
                      className={fieldClass}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </Property>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#E9E9E7] px-4 py-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowModal(false)}
                  className="h-8 rounded-[4px] border border-[#E3E2E0] bg-white px-3 text-sm text-[#37352F] transition-colors hover:bg-[rgba(55,53,47,0.06)]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || categories.length === 0}
                  className="inline-flex h-8 items-center gap-2 rounded-[4px] bg-[#2383E2] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[#0077D4] disabled:opacity-50"
                >
                  {saving && (
                    <Loader2 size={14} className="animate-spin" />
                  )}
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save changes"
                      : "Create course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}