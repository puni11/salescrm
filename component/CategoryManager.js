"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus, X, Loader2, Pencil, Trash2, Search,
  Type, CircleDot, CalendarDays,
  FolderCheck,
} from "lucide-react";
import toast from "react-hot-toast";

const EMPTY_FORM = {
  name: "",
  status: "active",
};

const GRID = "grid grid-cols-[minmax(220px,2fr)_150px_120px_76px]";

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
      <div className="flex w-32 shrink-0 items-center gap-2 px-1 py-1.5 text-sm text-[#787774]">
        <Icon size={15} className="text-[#9B9A97]" />
        {label}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const fieldClass =
  "w-full rounded-[4px] bg-transparent px-2 py-1.5 text-sm text-[#37352F] outline-none transition-colors placeholder:text-[#C7C6C3] hover:bg-[rgba(55,53,47,0.06)] focus:bg-white focus:ring-2 focus:ring-[#2383E2]/40";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export default function CategoryManager() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchCategories = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/categories");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch categories");
      }

      setCategories(data.data || []);
    } catch (error) {
      toast.error(error.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const activeCount = useMemo(
    () => categories.filter((category) => category.status === "active").length,
    [categories]
  );

  const inactiveCount = categories.length - activeCount;

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();

    return categories.filter((category) => {
      const matchesSearch = category.name?.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" || category.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [categories, search, statusFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (category) => {
    setEditingId(category._id);
    setForm({
      name: category.name || "",
      status: category.status || "active",
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const name = form.name.trim();

    if (!name) {
      toast.error("Category name is required");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(
        editingId
          ? `/api/categories?id=${editingId}`
          : "/api/categories",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            status: form.status,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save category");
      }

      toast.success(
        editingId
          ? "Category updated successfully"
          : "Category created successfully"
      );

      setShowModal(false);
      setEditingId(null);
      setForm(EMPTY_FORM);

      await fetchCategories();
    } catch (error) {
      toast.error(error.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (category) => {
    const nextStatus =
      category.status === "active" ? "inactive" : "active";

    try {
      const res = await fetch(`/api/categories?id=${category._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update category status");
      }

      setCategories((previous) =>
        previous.map((item) =>
          item._id === category._id
            ? { ...item, status: nextStatus }
            : item
        )
      );

      toast.success(
        nextStatus === "active"
          ? "Category activated"
          : "Category deactivated"
      );
    } catch (error) {
      toast.error(error.message || "Failed to update category status");
    }
  };

  const deleteCategory = async (category) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${category.name}"?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(category._id);

      const res = await fetch(`/api/categories?id=${category._id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete category");
      }

      setCategories((previous) =>
        previous.filter((item) => item._id !== category._id)
      );

      toast.success("Category deleted successfully");
    } catch (error) {
      toast.error(error.message || "Failed to delete category");
    } finally {
      setDeletingId(null);
    }
  };

  const tabs = [
    ["all", "All", categories.length],
    ["active", "Active", activeCount],
    ["inactive", "Inactive", inactiveCount],
  ];

  const isFiltered = search || statusFilter !== "all";

  return (
    <div
      className="w-full text-[#37352F]"
    
    >
      {/* Page header */}
      <div className="mb-6">
        <h2 className="mt-3 text-[32px] font-bold leading-tight tracking-[-0.01em] sm:text-[40px]">
          Categories
        </h2>
        <p className="mt-1 text-[15px] text-[#787774]">
          Organize and manage categories for your courses.
        </p>
      </div>

      {/* View tabs + toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E9E9E7]">
        <div className="flex items-center gap-1">
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
              type="text"
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
        <div className="min-w-[620px]">
          <div className={`${GRID} border-b border-[#E9E9E7]`}>
            <HeaderCell icon={Type}>Name</HeaderCell>
            <HeaderCell icon={CalendarDays}>Created</HeaderCell>
            <HeaderCell icon={CircleDot}>Status</HeaderCell>
            <div />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#9B9A97]">
              <Loader2 size={16} className="animate-spin" /> Loading categories
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-sm text-[#787774]">
                {isFiltered
                  ? "No matching categories found."
                  : "No categories added yet."}
              </p>
              <p className="mt-1 text-xs text-[#9B9A97]">
                {isFiltered
                  ? "Try changing your search or status filter."
                  : "Create your first category to get started."}
              </p>
              {!isFiltered && (
                <button
                  onClick={openCreate}
                  className="mt-2 text-sm text-[#2383E2] hover:underline"
                >
                  Add your first category
                </button>
              )}
            </div>
          ) : (
            filteredCategories.map((category) => {
              const active = (category.status || "inactive") === "active";

              return (
                <div
                  key={category._id}
                  className={`group ${GRID} items-center border-b border-[#E9E9E7] transition-colors hover:bg-[rgba(55,53,47,0.03)]`}
                >
                  <button
                    onClick={() => openEdit(category)}
                    className="flex min-w-0 items-center gap-2 px-2 py-2.5 text-left"
                  >
                    <span className="shrink-0 text-base"><FolderCheck size={16} /></span>
                    <span className="truncate text-sm font-medium underline decoration-[#E3E2E0] decoration-1 underline-offset-[3px] group-hover:decoration-[#9B9A97]">
                      {category.name}
                    </span>
                  </button>

                  <div className="px-2 py-2.5 text-sm text-[#787774]">
                    {formatDate(category.createdAt)}
                  </div>

                  <div className="px-2 py-2.5">
                    <button
                      onClick={() => toggleStatus(category)}
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

                  <div className="flex items-center justify-center gap-0.5">
                    <button
                      onClick={() => openEdit(category)}
                      aria-label={`Edit ${category.name}`}
                      className={`rounded-[4px] p-1.5 text-[#787774] opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 ${hoverBg}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => deleteCategory(category)}
                      disabled={deletingId === category._id}
                      aria-label={`Delete ${category.name}`}
                      className={`rounded-[4px] p-1.5 text-[#787774] transition-opacity hover:bg-[#FFE2DD] hover:text-[#E03E3E] focus:opacity-100 group-hover:opacity-100 ${
                        deletingId === category._id ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {deletingId === category._id ? (
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
              <Plus size={15} /> New category
            </button>
          )}
        </div>
      </div>

      {!loading && filteredCategories.length > 0 && (
        <p className="mt-3 px-2 text-xs text-[#9B9A97]">
          Showing {filteredCategories.length} of {categories.length} categories
        </p>
      )}

      {/* Modal / page peek */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(15,15,15,0.6)] p-4 sm:py-16"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) {
              closeModal();
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
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between px-4 pt-3">
                <span className="text-xs text-[#9B9A97]">
                  {editingId ? "Edit category" : "New category"}
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

              <div className="px-6 pb-6 pt-2 sm:px-10">
                <input
                  autoFocus
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((previous) => ({
                      ...previous,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Untitled"
                  className="w-full bg-transparent text-[32px] font-bold leading-tight tracking-[-0.01em] text-[#37352F] outline-none placeholder:text-[#D3D1CB]"
                />
                <p className="mt-1 px-0.5 text-xs text-[#9B9A97]">
                  e.g. Web Development
                </p>

                <div className="mt-4 border-b border-[#E9E9E7] pb-4">
                  <Property icon={CircleDot} label="Status">
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm((previous) => ({
                          ...previous,
                          status: e.target.value,
                        }))
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
                  onClick={closeModal}
                  className="h-8 rounded-[4px] border border-[#E3E2E0] bg-white px-3 text-sm text-[#37352F] transition-colors hover:bg-[rgba(55,53,47,0.06)]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || !form.name.trim()}
                  className="inline-flex h-8 items-center gap-2 rounded-[4px] bg-[#2383E2] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[#0077D4] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save changes"
                      : "Create category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}