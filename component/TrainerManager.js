"use client";

import { useEffect, useState } from "react";
import {
  Plus, X, Loader2, Pencil, Trash2, Search, Wrench,
  BriefcaseBusiness, Type, CircleDot, Check, Table2,
  User2Icon,
} from "lucide-react";
import toast from "react-hot-toast";

const emptyForm = {
  name: "",
  experience: "",
  tools: [],
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
  "grid grid-cols-[minmax(220px,2fr)_130px_minmax(240px,2.2fr)_110px_76px]";

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

export function TrainerManager() {
  const [trainers, setTrainers] = useState([]);
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);

      const [trainerRes, toolRes] = await Promise.all([
        fetch("/api/trainers"),
        fetch("/api/tools?status=active"),
      ]);

      const [trainerData, toolData] = await Promise.all([
        trainerRes.json(),
        toolRes.json(),
      ]);

      if (!trainerRes.ok || !trainerData.success) {
        throw new Error(trainerData.message || "Failed to load trainers");
      }

      if (!toolRes.ok || !toolData.success) {
        throw new Error(toolData.message || "Failed to load tools");
      }

      setTrainers(trainerData.data || []);
      setTools(toolData.data || []);
    } catch (error) {
      toast.error(error.message || "Failed to load trainer data");
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
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (trainer) => {
    setEditingId(trainer._id);
    setForm({
      name: trainer.name || "",
      experience: String(trainer.experience ?? ""),
      tools: (trainer.tools || []).map(String),
      status: trainer.status || "active",
    });
    setShowModal(true);
  };

  const toggleTool = (id) => {
    setForm((previous) => ({
      ...previous,
      tools: previous.tools.includes(id)
        ? previous.tools.filter((item) => item !== id)
        : [...previous.tools, id],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) return toast.error("Enter trainer name");

    if (
      form.experience === "" ||
      !Number.isFinite(Number(form.experience)) ||
      Number(form.experience) < 0
    ) {
      return toast.error("Enter valid years of experience");
    }

    try {
      setSaving(true);

      const res = await fetch(
        editingId ? `/api/trainers?id=${editingId}` : "/api/trainers",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            name: form.name.trim(),
            experience: Number(form.experience),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save trainer");
      }

      toast.success(editingId ? "Trainer updated" : "Trainer created");
      setShowModal(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadData();
    } catch (error) {
      toast.error(error.message || "Failed to save trainer");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (trainer) => {
    const status = trainer.status === "active" ? "inactive" : "active";

    try {
      const res = await fetch(`/api/trainers?id=${trainer._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update trainer");
      }

      setTrainers((previous) =>
        previous.map((item) =>
          item._id === trainer._id ? { ...item, status } : item
        )
      );

      toast.success(`Trainer ${status}`);
    } catch (error) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const deleteTrainer = async (trainer) => {
    const confirmed = window.confirm(
      `Permanently delete ${trainer.name}?`
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/trainers?id=${trainer._id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete trainer");
      }

      setTrainers((previous) =>
        previous.filter((item) => item._id !== trainer._id)
      );

      toast.success("Trainer deleted");
    } catch (error) {
      toast.error(error.message || "Failed to delete trainer");
    }
  };

  const filteredTrainers = trainers.filter((trainer) =>
    trainer.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getToolNames = (ids = []) =>
    ids.map((id) =>
      tools.find((tool) => String(tool._id) === String(id))?.name
    ).filter(Boolean);

  const activeCount = trainers.filter((t) => t.status === "active").length;

  return (
    <div
      className="w-full text-[#37352F]"
     
    >
      {/* Page header */}
      <div className="mb-6">
        <h2 className="mt-3 text-[32px] font-bold leading-tight tracking-[-0.01em] sm:text-[40px]">
          Trainers
        </h2>
        <p className="mt-1 text-[15px] text-[#787774]">
          Manage trainer profiles, experience and teaching tools.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
          <Pill className="bg-[#E3E2E0] text-[#32302C]">{trainers.length} total</Pill>
          <Pill className="bg-[#DBEDDB] text-[#1C3829]">{activeCount} active</Pill>
          <Pill className="bg-[#D3E5EF] text-[#183347]">{tools.length} tools</Pill>
        </div>
      </div>

      {/* View tab + toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E9E9E7]">
        <div className="flex items-center gap-1.5 border-b-2 border-[#37352F] px-1 pb-2 pt-1 text-sm font-medium">
          <Table2 size={15} className="text-[#787774]" />
          All trainers
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
        <div className="min-w-[860px]">
          <div className={`${GRID} border-b border-[#E9E9E7]`}>
            <HeaderCell icon={Type}>Name</HeaderCell>
            <HeaderCell icon={BriefcaseBusiness}>Experience</HeaderCell>
            <HeaderCell icon={Wrench}>Tools</HeaderCell>
            <HeaderCell icon={CircleDot}>Status</HeaderCell>
            <div />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#9B9A97]">
              <Loader2 size={16} className="animate-spin" /> Loading trainers
            </div>
          ) : filteredTrainers.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-sm text-[#787774]">
                {search ? "No trainers match your search." : "No trainers yet."}
              </p>
              {!search && (
                <button
                  onClick={openCreate}
                  className="mt-2 text-sm text-[#2383E2] hover:underline"
                >
                  Add your first trainer
                </button>
              )}
            </div>
          ) : (
            filteredTrainers.map((trainer) => {
              const trainerTools = getToolNames(trainer.tools);
              const active = (trainer.status || "active") === "active";

              return (
                <div
                  key={trainer._id}
                  className={`group ${GRID} items-center border-b border-[#E9E9E7] transition-colors hover:bg-[rgba(55,53,47,0.03)]`}
                >
                  <button
                    onClick={() => openEdit(trainer)}
                    className="flex min-w-0 items-center gap-2 px-2 py-2.5 text-left"
                  >
                    <span className="shrink-0 text-base"><User2Icon size={16}/></span>
                    <span className="truncate text-sm font-medium underline decoration-[#E3E2E0] decoration-1 underline-offset-[3px] group-hover:decoration-[#9B9A97]">
                      {trainer.name}
                    </span>
                  </button>

                  <div className="px-2 py-2.5 text-sm tabular-nums">
                    {trainer.experience}
                    <span className="text-[#9B9A97]"> yrs</span>
                  </div>

                  <div className="flex min-w-0 flex-wrap gap-1 px-2 py-2.5">
                    {trainerTools.length ? (
                      trainerTools.map((name) => (
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
                      onClick={() => toggleStatus(trainer)}
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
                      onClick={() => openEdit(trainer)}
                      aria-label={`Edit ${trainer.name}`}
                      className={`rounded-[4px] p-1.5 text-[#787774] opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 ${hoverBg}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => deleteTrainer(trainer)}
                      aria-label={`Delete ${trainer.name}`}
                      className="rounded-[4px] p-1.5 text-[#787774] opacity-0 transition-opacity hover:bg-[#FFE2DD] hover:text-[#E03E3E] focus:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
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
              <Plus size={15} /> New trainer
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
            className="w-full max-w-[600px] overflow-hidden rounded-[6px] bg-white"
            style={{
              boxShadow:
                "rgba(15,15,15,0.05) 0 0 0 1px, rgba(15,15,15,0.1) 0 5px 10px, rgba(15,15,15,0.2) 0 15px 40px",
            }}
          >
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between px-4 pt-3">
                <span className="text-xs text-[#9B9A97]">
                  {editingId ? "Edit trainer" : "New trainer"}
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
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Untitled"
                  className="w-full bg-transparent text-[32px] font-bold leading-tight tracking-[-0.01em] text-[#37352F] outline-none placeholder:text-[#D3D1CB]"
                />

                <div className="mt-4 space-y-0.5 border-b border-[#E9E9E7] pb-4">
                  <Property icon={BriefcaseBusiness} label="Experience (years)">
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.5"
                      value={form.experience}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, experience: e.target.value }))
                      }
                      placeholder="Empty"
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
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </Property>

                  <Property icon={Wrench} label="Tools they teach">
                    {tools.length === 0 ? (
                      <p className="mx-1 rounded-[4px] bg-[#FDECC8] px-2.5 py-2 text-[13px] text-[#402C1B]">
                        No active tools found. Add tools using your Tools manager.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 px-1 py-1">
                        {tools.map((tool) => {
                          const id = String(tool._id);
                          const selected = form.tools.includes(id);

                          return (
                            <button
                              type="button"
                              key={id}
                              onClick={() => toggleTool(id)}
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
                  disabled={saving}
                  className="inline-flex h-8 items-center gap-2 rounded-[4px] bg-[#2383E2] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[#0077D4] disabled:opacity-50"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save changes"
                      : "Create trainer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrainerManager;