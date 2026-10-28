"use client";

import { useEffect, useState } from "react";
import {
  Plus, X, Loader2, Pencil, Clock3, Users, IndianRupee,
  Tag, Search, Type, CircleDot, Check, Table2,
  Paperclip,
  BookCheck,
} from "lucide-react";
import toast from "react-hot-toast";

const emptyForm = {
  name: "",
  categoryId: "",
  hours: "",
  price: "",
  trainerIds: [],
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
  "grid grid-cols-[minmax(220px,2fr)_150px_100px_120px_minmax(200px,1.6fr)_110px_44px]";

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

function Property({ icon: Icon, label, children }) {
  return (
    <div className="flex flex-col gap-1 sm:min-h-[34px] sm:flex-row sm:items-start sm:gap-2">
      <div className="flex w-40 shrink-0 items-center gap-2 px-1 py-1.5 text-sm text-[#787774]">
        <Icon size={15} className="text-[#9B9A97]" />
        {label}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const fieldClass =
  "w-full rounded-[4px] bg-transparent px-2 py-1.5 text-sm text-[#37352F] outline-none transition-colors placeholder:text-[#C7C6C3] hover:bg-[rgba(55,53,47,0.06)] focus:bg-white focus:ring-2 focus:ring-[#2383E2]/40";

export default function CourseManager() {
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);

      const [courseRes, categoryRes, trainerRes] = await Promise.all([
        fetch("/api/course/details"),
        fetch("/api/categories?status=active"),
        fetch("/api/trainers?status=active"),
      ]);

      const [courseData, categoryData, trainerData] = await Promise.all([
        courseRes.json(),
        categoryRes.json(),
        trainerRes.json(),
      ]);

      if (!courseRes.ok || !courseData.success) {
        throw new Error(courseData.message || "Failed to load courses");
      }

      if (!categoryRes.ok || !categoryData.success) {
        throw new Error(categoryData.message || "Failed to load categories");
      }

      if (!trainerRes.ok || !trainerData.success) {
        throw new Error(trainerData.message || "Failed to load trainers");
      }

      setCourses(courseData.data || []);
      setCategories(categoryData.data || []);
      setTrainers(trainerData.data || []);
    } catch (error) {
      toast.error(error.message || "Failed to load course data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!showModal) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) setShowModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showModal, saving]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      categoryId: categories[0]?._id || "",
    });
    setShowModal(true);
  };

  const openEdit = (course) => {
    setEditingId(course._id);
    setForm({
      name: course.name || "",
      categoryId: String(course.categoryId || ""),
      hours: String(course.hours ?? ""),
      price: String(course.price ?? ""),
      trainerIds: (course.trainerIds || []).map(String),
      status: course.status || "active",
    });
    setShowModal(true);
  };

  const updateField = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const toggleTrainer = (id) => {
    setForm((previous) => ({
      ...previous,
      trainerIds: previous.trainerIds.includes(id)
        ? previous.trainerIds.filter((item) => item !== id)
        : [...previous.trainerIds, id],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) return toast.error("Enter a course name");
    if (!form.categoryId) return toast.error("Select a category");
    if (form.hours === "" || Number(form.hours) <= 0 ||
        !Number.isFinite(Number(form.hours))) {
      return toast.error("Enter valid course hours");
    }
    if (form.price === "" || Number(form.price) < 0 ||
        !Number.isFinite(Number(form.price))) {
      return toast.error("Enter a valid course price");
    }

    try {
      setSaving(true);

      const res = await fetch(
        editingId
          ? `/api/course/details?id=${editingId}`
          : "/api/course/details",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            name: form.name.trim(),
            hours: Number(form.hours),
            price: Number(form.price),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save course");
      }

      toast.success(editingId ? "Course updated" : "Course created");
      setShowModal(false);
      setForm(emptyForm);
      setEditingId(null);
      await loadData();
    } catch (error) {
      toast.error(error.message || "Failed to save course");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (course) => {
    const nextStatus = course.status === "active" ? "inactive" : "active";

    try {
      const res = await fetch(`/api/details/course?id=${course._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update status");
      }

      setCourses((previous) =>
        previous.map((item) =>
          item._id === course._id
            ? { ...item, status: nextStatus }
            : item
        )
      );

      toast.success(`Course ${nextStatus}`);
    } catch (error) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const filteredCourses = courses.filter((course) =>
    course.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getCategoryName = (id) =>
    categories.find((item) => String(item._id) === String(id))?.name
    || "Category unavailable";

  const getTrainerNames = (ids = []) =>
    ids.map((id) =>
      trainers.find((trainer) => String(trainer._id) === String(id))?.name
    ).filter(Boolean);

  const activeCount = courses.filter((c) => c.status === "active").length;

  return (
    <div
      className="w-full text-[#37352F] font-sans"
      
    >
      {/* Page header */}
      <div className="mb-6">
        <h2 className="mt-3 text-[32px] font-bold leading-tight tracking-[-0.01em] sm:text-[40px]">
          Courses
        </h2>
        <p className="mt-1 text-[15px] text-[#787774]">
          Manage courses, categories, trainers, hours and pricing.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
          <Pill className="bg-[#E3E2E0] text-[#32302C]">{courses.length} total</Pill>
          <Pill className="bg-[#DBEDDB] text-[#1C3829]">{activeCount} active</Pill>
          <Pill className="bg-[#D3E5EF] text-[#183347]">{categories.length} categories</Pill>
          <Pill className="bg-[#E8DEEE] text-[#412454]">{trainers.length} trainers</Pill>
        </div>
      </div>

      {/* View tab + toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E9E9E7]">
        <div className="flex items-center gap-1.5 border-b-2 border-[#37352F] px-1 pb-2 pt-1 text-sm font-medium">
          <Table2 size={15} className="text-[#787774]" />
          All courses
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
        <div className="min-w-[980px]">
          <div className={`${GRID} border-b border-[#E9E9E7]`}>
            <HeaderCell icon={Type}>Name</HeaderCell>
            <HeaderCell icon={Tag}>Category</HeaderCell>
            <HeaderCell icon={Clock3}>Hours</HeaderCell>
            <HeaderCell icon={IndianRupee}>Price</HeaderCell>
            <HeaderCell icon={Users}>Trainers</HeaderCell>
            <HeaderCell icon={CircleDot}>Status</HeaderCell>
            <div />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#9B9A97]">
              <Loader2 size={16} className="animate-spin" /> Loading courses
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-sm text-[#787774]">
                {search ? "No courses match your search." : "No courses yet."}
              </p>
              {!search && (
                <button
                  onClick={openCreate}
                  className="mt-2 text-sm text-[#2383E2] hover:underline"
                >
                  Add your first course
                </button>
              )}
            </div>
          ) : (
            filteredCourses.map((course) => {
              const assigned = getTrainerNames(course.trainerIds);
              const active = (course.status || "active") === "active";

              return (
                <div
                  key={course._id}
                  className={`group ${GRID} items-center border-b border-[#E9E9E7] transition-colors hover:bg-[rgba(55,53,47,0.03)]`}
                >
                  <button
                    onClick={() => openEdit(course)}
                    className="flex min-w-0 items-center gap-2 px-2 py-2.5 text-left"
                  >
                    <span className="shrink-0 text-base"><BookCheck size={16}/></span>
                    <span className="truncate text-sm font-medium underline decoration-[#E3E2E0] decoration-1 underline-offset-[3px] group-hover:decoration-[#9B9A97]">
                      {course.name}
                    </span>
                  </button>

                  <div className="min-w-0 px-2 py-2.5">
                    <Pill className={tagColor(course.categoryId)}>
                      {getCategoryName(course.categoryId)}
                    </Pill>
                  </div>

                  <div className="px-2 py-2.5 text-sm tabular-nums">
                    {course.hours}
                    <span className="text-[#9B9A97]"> hrs</span>
                  </div>

                  <div className="px-2 py-2.5 text-sm tabular-nums">
                    ₹{Number(course.price).toLocaleString("en-IN")}
                  </div>

                  <div className="flex min-w-0 flex-wrap gap-1 px-2 py-2.5">
                    {assigned.length ? (
                      assigned.map((name) => (
                        <Pill key={name} className={tagColor(name)}>
                          {name}
                        </Pill>
                      ))
                    ) : (
                      <span className="text-sm text-[#C7C6C3]">Empty</span>
                    )}
                  </div>

                  <div className="px-2 py-2.5">
                    <button
                      onClick={() => toggleStatus(course)}
                      title={active ? "Click to deactivate" : "Click to activate"}
                      className="rounded-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2]/40"
                    >
                      <Pill
                        className={
                          active
                            ? "bg-[#DBEDDB] text-[#1C3829]"
                            : "bg-[#E3E2E0] text-[#32302C]"
                        }
                      >
                        <span
                          className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                            active ? "bg-[#4DAB9A]" : "bg-[#9B9A97]"
                          }`}
                        />
                        {active ? "Active" : "Inactive"}
                      </Pill>
                    </button>
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={() => openEdit(course)}
                      aria-label={`Edit ${course.name}`}
                      className={`rounded-[4px] p-1.5 text-[#787774] opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 ${hoverBg}`}
                    >
                      <Pencil size={14} />
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
              <Plus size={15} /> New course
            </button>
          )}
        </div>
      </div>

      {/* Modal / page peek */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(15,15,15,0.6)] p-4 sm:py-16"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) {
              setShowModal(false);
            }
          }}
        >
          <div
            className="w-full max-w-[640px] overflow-hidden rounded-[6px] bg-white"
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

              <div className="max-h-[70vh] overflow-y-auto px-6 pb-6 pt-2 sm:px-10">
                <input
                  required
                  autoFocus
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Untitled"
                  className="w-full bg-transparent text-[32px] font-bold leading-tight tracking-[-0.01em] text-[#37352F] outline-none placeholder:text-[#D3D1CB]"
                />

                <div className="mt-4 space-y-0.5 border-b border-[#E9E9E7] pb-4">
                  <Property icon={Tag} label="Category">
                    <select
                      required
                      value={form.categoryId}
                      onChange={(e) => updateField("categoryId", e.target.value)}
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

                  <Property icon={Clock3} label="Duration (hours)">
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      required
                      value={form.hours}
                      onChange={(e) => updateField("hours", e.target.value)}
                      placeholder="Empty"
                      className={fieldClass}
                    />
                  </Property>

                  <Property icon={IndianRupee} label="Price (INR ₹)">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={form.price}
                      onChange={(e) => updateField("price", e.target.value)}
                      placeholder="Empty"
                      className={fieldClass}
                    />
                  </Property>

                  <Property icon={CircleDot} label="Status">
                    <select
                      value={form.status}
                      onChange={(e) => updateField("status", e.target.value)}
                      className={fieldClass}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </Property>

                  <Property icon={Users} label="Trainers">
                    {trainers.length === 0 ? (
                      <p className="mx-1 rounded-[4px] bg-[#FDECC8] px-2.5 py-2 text-[13px] text-[#402C1B]">
                        No active trainers available. Create a trainer first.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 px-1 py-1">
                        {trainers.map((trainer) => {
                          const id = String(trainer._id);
                          const selected = form.trainerIds.includes(id);

                          return (
                            <button
                              type="button"
                              key={id}
                              onClick={() => toggleTrainer(id)}
                              aria-pressed={selected}
                              title={`${trainer.experience} years experience`}
                              className={`inline-flex items-center gap-1.5 rounded-[4px] px-2 py-1 text-[13px] transition-colors ${
                                selected
                                  ? "bg-[#D3E5EF] text-[#183347]"
                                  : "border border-dashed border-[#D3D1CB] text-[#787774] hover:bg-[rgba(55,53,47,0.06)]"
                              }`}
                            >
                              {selected && <Check size={13} />}
                              {trainer.name}
                              <span className={selected ? "text-[#183347]/60" : "text-[#9B9A97]"}>
                                {trainer.experience}y
                              </span>
                            </button>
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
                  {saving && <Loader2 size={14} className="animate-spin" />}
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