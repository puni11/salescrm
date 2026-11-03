import { getUserAgentName } from "@/lib/getUseragentName";
import {
  Activity,
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Briefcase,
  Calendar,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleDot,
  Clock,
  Copy,
  Globe,
  History,
  Home,
  Info,
  Mail,
  Maximize2,
  Minimize2,
  MapPin,
  MessageCircle,
  MessageSquare,
  MoreVertical,
  Phone,
  ShieldCheck,
  TargetIcon,
  Trash2Icon,
  User2,
  X,
  Maximize,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import WhatsAppChat from "./whatsApp/Whatsappchat";

const STATUS_TAGS = {
  "New Lead": [],
  Cold: [
    "Connected -Dropped Whatsapp",
    "Tried But Didn’t Connected",
    "Not Interested",
  ],
  Warm: [
    "Call after sometime",
    "Price Issue",
    "Timing Issues",
    "Counselled - Now Not Interested",
    "Follow Up",
  ],
  Hot: [
    "Interested",
    "Demo req",
    "Demo Done",
    "Walk in",
    "Next Batch",
    "Waiting for approval",
  ],
  Registered: ["Fees topups"],
  Invalid: ["Not relevant", "Invalid No"],
  "Other Course": [],
  "Looking For a job": [],
};

const DEFAULT_STATUSES = Object.keys(STATUS_TAGS);

const STATUS_STYLES = {
  "New Lead": ["bg-[#D3E5EF] text-[#183347]", "bg-[#2383E2]"],
  Cold: ["bg-[#E3E2E0] text-[#32302C]", "bg-[#9B9A97]"],
  Warm: ["bg-[#FDECC8] text-[#402C1B]", "bg-[#CB912F]"],
  Hot: ["bg-[#DBEDDB] text-[#1C3829]", "bg-[#4DAB9A]"],
  Registered: ["bg-[#DBEDDB] text-[#1C3829]", "bg-[#0F7B6C]"],
  Invalid: ["bg-[#FFE2DD] text-[#5D1715]", "bg-[#E03E3E]"],
  "Other Course": ["bg-[#E8DEEE] text-[#412454]", "bg-[#9065B0]"],
  "Looking For a job": ["bg-[#D3E5EF] text-[#183347]", "bg-[#2383E2]"],
};

const getStatusStyle = (status) =>
  STATUS_STYLES[status] || ["bg-[#E3E2E0] text-[#32302C]", "bg-[#9B9A97]"];

const AVATAR_COLORS = [
  "bg-[#E3F2D3] text-[#3F6B1F]",
  "bg-[#D3E5EF] text-[#183347]",
  "bg-[#FDECC8] text-[#402C1B]",
  "bg-[#E8DEEE] text-[#412454]",
  "bg-[#F5E0E9] text-[#4C2337]",
  "bg-[#FADEC9] text-[#49290E]",
];

const avatarColor = (key = "") => {
  let hash = 0;
  for (const ch of String(key)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const timeAgo = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const hoverBg = "hover:bg-[rgba(55,53,47,0.06)]";

const menuShadow =
  "rgba(15,15,15,0.05) 0 0 0 1px, rgba(15,15,15,0.1) 0 3px 6px, rgba(15,15,15,0.2) 0 9px 24px";

const chipClass =
  "inline-flex max-w-full items-center truncate rounded-full border border-[#E6E6E3] bg-[#F5F5F3] px-2.5 py-0.5 text-[13px] leading-5 text-[#37352F]";

function Placeholder({ children }) {
  return <span className="text-[13px] text-[#C7C6C3]">{children}</span>;
}

function Row({ icon: Icon, label, children, actions }) {
  return (
    <div className="group/row flex min-h-[32px] items-center gap-2 py-0.5">
      <div className="flex w-[118px] shrink-0 items-center gap-2 text-[13px] text-[#787774]">
        <Icon size={15} className="shrink-0 text-[#9B9A97]" />
        <span className="truncate">{label}</span>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <div className="min-w-0 flex-1 text-[13px]">{children}</div>
        {actions && (
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover/row:opacity-100">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

function Group({ title, open, onToggle, children }) {
  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-[4px] py-1.5 text-left"
      >
        <span className="text-sm font-medium text-[#9B9A97]">{title}</span>
        {open ? (
          <ChevronUp size={15} className="text-[#9B9A97]" />
        ) : (
          <ChevronDown size={15} className="text-[#9B9A97]" />
        )}
      </button>
      {open && <div className="pb-2">{children}</div>}
    </div>
  );
}

function IconButton({ onClick, label, children, href }) {
  const className = `inline-flex h-6 w-6 items-center justify-center rounded-[5px] border border-[#E6E6E3] bg-white text-[#787774] transition-colors hover:bg-[#F5F5F3]`;

  if (href) {
    return (
      <a href={href} aria-label={label} title={label} className={className}>
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={className}
    >
      {children}
    </button>
  );
}



function DemoRequestModal({ lead, onClose, onSuccess }) {
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
   const [demoMode, setDemoMode] = useState("Online");

  useEffect(() => {
    let active = true;

    async function loadBatches() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/student-batch-assignments", {
          method: "GET",
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok || result.success === false) {
          throw new Error(result.message || result.error || "Unable to load batches.");
        }

        const data = result.data || result;
        const list = Array.isArray(data.batches) ? data.batches : [];

        if (active) {
          setBatches(list);
          if (list.length) {
            setBatchId(String(list[0].id || list[0]._id));
          }
        }
      } catch (err) {
        if (active) setError(err.message || "Unable to load batches.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadBatches();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!batchId) {
      setError("Please select a batch.");
      return;
    }

    const selectedBatch = batches.find(
      (batch) => String(batch.id || batch._id) === String(batchId)
    );

    setSaving(true);

    try {
      const response = await fetch("/api/demo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: String(lead?._id || lead?.id || ""),
          batchId,
          batchName: selectedBatch?.name || "",
          courseName: lead?.course || "",
          demoMode,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to create demo request.");
      }

      onSuccess?.(result);
    } catch (err) {
      setError(err.message || "Unable to create demo request.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 p-3 sm:p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#EBEBE8] px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-[#37352F]">Create demo request</h3>
            <p className="mt-0.5 text-xs text-[#9B9A97]">
              Select the batch for {lead?.name || "this lead"}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded p-1 text-[#787774] hover:bg-[#F5F5F3]"
            aria-label="Close demo request"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-5 py-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#37352F]">
                Select batch
              </label>
              {loading ? (
                <div className="rounded-lg border border-[#E6E6E3] px-3 py-2.5 text-sm text-[#9B9A97]">
                  Loading batches...
                </div>
              ) : batches.length ? (
                <select
                  value={batchId}
                  onChange={(event) => setBatchId(event.target.value)}
                  className="w-full rounded-lg border border-[#E3E2E0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2383E2]"
                  required
                >
                  {batches.map((batch) => {
                    const id = String(batch.id || batch._id);
                    return (
                      <option key={id} value={id}>
                        {batch.name || "Untitled batch"}
                        {batch.courseName ? ` — ${batch.courseName}` : ""}
                        {batch.startingDate
                          ? ` (${new Date(batch.startingDate).toLocaleDateString("en-IN")})`
                          : ""}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <p className="rounded-lg border border-dashed border-[#D9D9D5] p-3 text-sm text-[#9B9A97]">
                  No batches available. Add a batch before creating a demo request.
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#37352F]">
                Demo format
              </label>
              <div className="grid grid-cols-2 gap-2">
                {["Online", "Offline"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDemoMode(mode)}
                    className={`rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                      demoMode === mode
                        ? "border-[#2383E2] bg-[#EFF6FF] font-medium text-[#1D4ED8]"
                        : "border-[#E6E6E3] text-[#37352F] hover:bg-[#F7F7F5]"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-[#F7F7F5] p-3 text-sm text-[#787774]">
              The demo request will be saved with <strong>Pending</strong> status.
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-[#EBEBE8] px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md border border-[#E6E6E3] px-3 py-2 text-sm text-[#37352F] hover:bg-[#F7F7F5]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || saving || !batches.length}
              className="rounded-md bg-[#2383E2] px-4 py-2 text-sm font-medium text-white hover:bg-[#1674CC] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Create demo request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function LeadBatchAssignmentModal({ lead, onClose, onSuccess }) {
  const [batches, setBatches] = useState([]);
  const [existingAssignments, setExistingAssignments] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [mode, setMode] = useState("full_course");
  const [selectedToolIds, setSelectedToolIds] = useState([]);
  const [totalFee, setTotalFee] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const leadId = String(lead?._id || lead?.id || "");
  const selectedBatch = batches.find(
    (batch) => String(batch.id || batch._id) === String(selectedBatchId)
  );

  const selectedTools = useMemo(() => {
    if (!selectedBatch || !Array.isArray(selectedBatch.tools)) return [];
    return selectedBatch.tools.filter((tool) =>
      selectedToolIds.includes(String(tool.id || tool._id))
    );
  }, [selectedBatch, selectedToolIds]);

  const assignedToolTrainers = Array.isArray(
    selectedBatch?.toolTrainerAssignments
  )
    ? selectedBatch.toolTrainerAssignments
    : [];

  const currentAssignment = existingAssignments.find(
    (assignment) =>
      String(assignment.batchId) === String(selectedBatchId)
  );

  const paymentHistory = Array.isArray(currentAssignment?.payments)
    ? currentAssignment.payments
    : [];

  const alreadyPaid = paymentHistory.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    Number(currentAssignment?.legacyPaidFee || 0)
  );

  const remaining = Math.max(0, Number(totalFee || 0) - alreadyPaid);

  useEffect(() => {
    let active = true;

    async function loadAssignmentData() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/student-batch-assignments", {
          method: "GET",
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok || result.success === false) {
          throw new Error(
            result.message || result.error || "Unable to load batches."
          );
        }

        const data = result.data || result;
        const batchList = Array.isArray(data.batches) ? data.batches : [];
        const studentList = Array.isArray(data.students) ? data.students : [];

        const matchedStudent = studentList.find(
          (student) =>
            String(student.id || student._id) === leadId
        );

        if (!active) return;

        setBatches(batchList);
        setExistingAssignments(
          Array.isArray(matchedStudent?.batchAssignments)
            ? matchedStudent.batchAssignments
            : []
        );

        if (batchList.length) {
          const firstBatch = batchList[0];
          const firstBatchId = String(firstBatch.id || firstBatch._id);
          setSelectedBatchId(firstBatchId);

          const existing = matchedStudent?.batchAssignments?.find(
            (assignment) => String(assignment.batchId) === firstBatchId
          );

          if (existing) {
            setMode(existing.mode || "full_course");
            setSelectedToolIds(
              Array.isArray(existing.toolIds)
                ? existing.toolIds.map(String)
                : []
            );
            setTotalFee(String(existing.totalFee ?? firstBatch.fee ?? ""));
          } else {
            setTotalFee(String(firstBatch.fee ?? ""));
          }
        }
      } catch (err) {
        if (active) setError(err.message || "Unable to load batch details.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAssignmentData();

    return () => {
      active = false;
    };
  }, [leadId]);

  useEffect(() => {
    if (!selectedBatch) return;

    const existing = existingAssignments.find(
      (assignment) =>
        String(assignment.batchId) === String(selectedBatchId)
    );

    setMode(existing?.mode || "full_course");
    setSelectedToolIds(
      Array.isArray(existing?.toolIds)
        ? existing.toolIds.map(String)
        : []
    );
    setTotalFee(
      String(existing?.totalFee ?? selectedBatch.fee ?? "")
    );
    setPaymentAmount("");
  }, [selectedBatchId, selectedBatch, existingAssignments]);

  const toggleTool = (toolId) => {
    setSelectedToolIds((previous) =>
      previous.includes(toolId)
        ? previous.filter((id) => id !== toolId)
        : [...previous, toolId]
    );
  };

  const handleAssign = async (event) => {
    event.preventDefault();
    setError("");

    if (!leadId) {
      setError("Lead ID is missing.");
      return;
    }

    if (!selectedBatchId) {
      setError("Please select a batch.");
      return;
    }

    if (
      mode === "selected_tools" &&
      selectedToolIds.length === 0
    ) {
      setError("Please select at least one tool.");
      return;
    }

    const fee = Number(totalFee);
    const payment = Number(paymentAmount || 0);

    if (!Number.isFinite(fee) || fee < 0) {
      setError("Enter a valid total fee.");
      return;
    }

    if (!Number.isFinite(payment) || payment < 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    if (payment > Math.max(0, fee - alreadyPaid)) {
      setError("Payment cannot be greater than the remaining balance.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/student-batch-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: leadId,
          batchId: selectedBatchId,
          mode,
          toolIds: mode === "selected_tools" ? selectedToolIds : [],
          totalFee: fee,
          paymentAmount: payment,
          paymentDate: paymentDate || new Date().toISOString().slice(0, 10),
        }),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || result.error || "Batch assignment failed."
        );
      }

      onSuccess?.(result);
    } catch (err) {
      setError(err.message || "Unable to assign batch.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-3 sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#EBEBE8] px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-[#37352F]">
              Assign Batch
            </h3>
            <p className="mt-0.5 text-xs text-[#9B9A97]">
              Assigning batch to {lead?.name || "this lead"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded p-1 text-[#787774] hover:bg-[#F5F5F3]"
            aria-label="Close Assign Batch"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleAssign} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {loading ? (
              <div className="py-12 text-center text-sm text-[#787774]">
                Loading batches and student assignments...
              </div>
            ) : (
              <>
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {batches.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#D9D9D5] p-6 text-center text-sm text-[#787774]">
                    No batches are available.
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[#37352F]">
                        Select batch
                      </label>
                      <select
                        value={selectedBatchId}
                        onChange={(event) =>
                          setSelectedBatchId(event.target.value)
                        }
                        className="w-full rounded-lg border border-[#E3E2E0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2383E2]"
                      >
                        {batches.map((batch) => {
                          const id = String(batch.id || batch._id);
                          return (
                            <option key={id} value={id}>
                              {batch.name || "Untitled batch"}
                              {batch.courseName ? ` — ${batch.courseName}` : ""}
                              {batch.startingDate
                                ? ` (${new Date(batch.startingDate).toLocaleDateString("en-IN")})`
                                : ""}
                            </option>
                          );
                        })}
                      </select>
                      {selectedBatch?.status && (
                        <p className="mt-1 text-xs text-[#9B9A97]">
                          Batch status: {selectedBatch.status}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-medium text-[#37352F]">
                        Assignment type
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: "full_course", label: "Full course" },
                          { value: "selected_tools", label: "Selected tools" },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setMode(option.value)}
                            className={`rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                              mode === option.value
                                ? "border-[#2383E2] bg-[#EFF6FF] font-medium text-[#1D4ED8]"
                                : "border-[#E6E6E3] text-[#37352F] hover:bg-[#F7F7F5]"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {mode === "selected_tools" && (
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-medium text-[#37352F]">
                            Select tools
                          </p>
                          <span className="text-xs text-[#9B9A97]">
                            {selectedToolIds.length} selected
                          </span>
                        </div>
                        {Array.isArray(selectedBatch?.tools) &&
                        selectedBatch.tools.length ? (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {selectedBatch.tools.map((tool) => {
                              const id = String(tool.id || tool._id);
                              const trainer = assignedToolTrainers.find(
                                (item) =>
                                  String(item.toolId) === id
                              );
                              return (
                                <label
                                  key={id}
                                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-[#E6E6E3] p-3 hover:bg-[#F7F7F5]"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedToolIds.includes(id)}
                                    onChange={() => toggleTool(id)}
                                    className="mt-0.5"
                                  />
                                  <span className="min-w-0">
                                    <span className="block text-sm font-medium text-[#37352F]">
                                      {tool.name || "Unnamed tool"}
                                    </span>
                                    {trainer?.trainerName && (
                                      <span className="mt-0.5 block text-xs text-[#9B9A97]">
                                        Trainer: {trainer.trainerName}
                                      </span>
                                    )}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="rounded-lg bg-[#F7F7F5] p-3 text-sm text-[#9B9A97]">
                            No tools are configured for this batch.
                          </p>
                        )}
                      </div>
                    )}

                    {mode === "full_course" &&
                      Array.isArray(selectedBatch?.tools) &&
                      selectedBatch.tools.length > 0 && (
                        <div className="rounded-lg bg-[#F7F7F5] p-3">
                          <p className="mb-2 text-xs font-medium text-[#787774]">
                            Included tools and trainers
                          </p>
                          <div className="space-y-1.5">
                            {selectedBatch.tools.map((tool) => {
                              const id = String(tool.id || tool._id);
                              const trainer = assignedToolTrainers.find(
                                (item) => String(item.toolId) === id
                              );
                              return (
                                <div
                                  key={id}
                                  className="flex items-center justify-between gap-3 text-sm"
                                >
                                  <span className="text-[#37352F]">
                                    {tool.name || "Unnamed tool"}
                                  </span>
                                  <span className="text-xs text-[#9B9A97]">
                                    {trainer?.trainerName || "Trainer not assigned"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-[#37352F]">
                          Total fee
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={totalFee}
                          onChange={(event) => setTotalFee(event.target.value)}
                          className="w-full rounded-lg border border-[#E3E2E0] px-3 py-2.5 text-sm outline-none focus:border-[#2383E2]"
                          placeholder="Enter total fee"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-[#37352F]">
                          Payment amount
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={remaining}
                          step="0.01"
                          value={paymentAmount}
                          onChange={(event) =>
                            setPaymentAmount(event.target.value)
                          }
                          className="w-full rounded-lg border border-[#E3E2E0] px-3 py-2.5 text-sm outline-none focus:border-[#2383E2]"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[#37352F]">
                        Payment date
                      </label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(event) => setPaymentDate(event.target.value)}
                        className="w-full rounded-lg border border-[#E3E2E0] px-3 py-2.5 text-sm outline-none focus:border-[#2383E2]"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-lg bg-[#F7F7F5] p-3">
                      <div>
                        <p className="text-xs text-[#9B9A97]">Total fee</p>
                        <p className="mt-1 text-sm font-semibold text-[#37352F]">
                          ₹{Number(totalFee || 0).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#9B9A97]">Paid</p>
                        <p className="mt-1 text-sm font-semibold text-[#0F7B6C]">
                          ₹{alreadyPaid.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#9B9A97]">Balance</p>
                        <p className="mt-1 text-sm font-semibold text-[#37352F]">
                          ₹{remaining.toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>

                    {paymentHistory.length > 0 && (
                      <div>
                        <p className="mb-2 text-sm font-medium text-[#37352F]">
                          Payment history
                        </p>
                        <div className="overflow-hidden rounded-lg border border-[#E6E6E3]">
                          {paymentHistory.map((payment, index) => (
                            <div
                              key={payment._id || payment.id || index}
                              className="flex items-center justify-between border-b border-[#EEEEEB] px-3 py-2 text-sm last:border-b-0"
                            >
                              <span className="text-[#787774]">
                                {payment.paidAt || payment.paymentDate
                                  ? new Date(
                                      payment.paidAt || payment.paymentDate
                                    ).toLocaleDateString("en-IN")
                                  : `Payment ${index + 1}`}
                              </span>
                              <span className="font-medium text-[#37352F]">
                                ₹{Number(payment.amount || 0).toLocaleString("en-IN")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#EBEBE8] px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md border border-[#E6E6E3] px-3 py-2 text-sm text-[#37352F] hover:bg-[#F7F7F5] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || saving || batches.length === 0}
              className="rounded-md bg-[#2383E2] px-4 py-2 text-sm font-medium text-white hover:bg-[#1674CC] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Assign batch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


export default function LeadDetails({
  selectedLead,
  setSelectedLeadId,
  setDeleteModal,
  getLeadId,
  updateLeadStatus,
  addComment,
  setIsWhatsAppModalOpen,
  formatDate,
  setFollowUpOpen,
  setOtherCourse,
  course,
  STATUSES,
}) {
  const [isLeadStatusOpen, setIsLeadStatusOpen] = useState(false);
  const [isInterestedOpen, setIsInterestedOpen] = useState(false);
  const [tab, setTab] = useState("home");
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState("");
  const [open, setOpen] = useState({
    general: true,
    work: true,
    marketing: true,
    system: true,
  });

  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
  const [assignBatchOpen, setAssignBatchOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  const currentTags = Array.isArray(selectedLead.tags) ? selectedLead.tags : [];
  const availableTags = STATUS_TAGS[selectedLead.status || "New Lead"] || [];

  const saveStatusAndTags = (status, tags = []) => {
    updateLeadStatus(getLeadId(selectedLead), status, tags);
  };

  const handlePrimaryStatus = (status) => {
    setIsLeadStatusOpen(false);
    setIsTagMenuOpen(false);

    if (status === "Registered") {
      setAssignBatchOpen(true);
      return;
    }

    if (status === "Other Course") {
      saveStatusAndTags(status, []);
      setOtherCourse(true);
      return;
    }

    const allowedTags = STATUS_TAGS[status] || [];
    const retainedTags = currentTags.filter((tag) => allowedTags.includes(tag));
    saveStatusAndTags(status, retainedTags);
  };

 const handleTagSelection = (tag) => {
  // Follow Up retains the existing follow-up modal workflow.
  if (tag === "Follow Up" && !currentTags.includes(tag)) {
    saveStatusAndTags("Cold", ["Follow Up"]);
    setIsTagMenuOpen(false);
    setFollowUpOpen(true);
    return;
  }

  // Demo req opens the batch-selection and request-creation flow.
  if (tag === "Demo req" && !currentTags.includes(tag)) {
    setDemoModalOpen(true);
    setIsTagMenuOpen(false);
    return;
  }

  // Demo Done completes the latest pending request in demoRequests.
  if (tag === "Demo Done" && !currentTags.includes(tag)) {
    handleDemoDone();
    return;
  }

  // Only one tag is allowed.
  const updatedTags = currentTags.includes(tag) ? [] : [tag];

  saveStatusAndTags(selectedLead.status || "New Lead", updatedTags);
  setIsTagMenuOpen(false);
};

  const handleDemoDone = async () => {
    setIsTagMenuOpen(false);

    try {
      const response = await fetch("/api/demo-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: String(selectedLead?._id || selectedLead?.id || ""),
          status: "completed",
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not complete the demo request.");
      }

      saveStatusAndTags(selectedLead.status || "Hot", ["Demo Done"]);
    } catch (error) {
      console.error("Demo completion failed:", error);
      window.alert(error.message || "Could not complete the demo request.");
    }
  };

  const toggleGroup = (key) =>
    setOpen((previous) => ({ ...previous, [key]: !previous[key] }));

  const currentStatus = selectedLead.status || "New Lead";
  const [statusPill, statusDot] = getStatusStyle(currentStatus);

  const comments = selectedLead.comments || [];
  const lastComment = comments.length ? comments[comments.length - 1] : null;

  const copyValue = async (key, value) => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch (error) {
      console.error("Copy failed", error);
    }
  };

  const menuItem = (active) =>
    `flex w-full items-center justify-between px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-[rgba(55,53,47,0.06)] ${
      active ? "bg-[rgba(55,53,47,0.05)] font-medium" : ""
    }`;

  const sourceLabel = selectedLead.source
    ? selectedLead.source.charAt(0).toUpperCase() + selectedLead.source.slice(1)
    : "Direct";

  const mediumLabel = selectedLead.medium
    ? selectedLead.medium.charAt(0).toUpperCase() + selectedLead.medium.slice(1)
    : "None";

  const tabClass = (active) =>
    `-mb-px inline-flex items-center gap-1.5 border-b-2 px-1 pb-2.5 pt-2 text-sm transition-colors ${
      active
        ? "border-[#37352F] font-medium text-[#37352F]"
        : "border-transparent text-[#787774] hover:text-[#37352F]"
    }`;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[rgba(15,15,15,0.4)] transition-opacity"
        onClick={() => setSelectedLeadId(null)}
      />

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white transition-[max-width] duration-200 ${
          expanded ? "max-w-[760px]" : "max-w-[440px]"
        }`}
        
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 pt-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] text-xs font-semibold ${avatarColor(
                selectedLead.name
              )}`}
            >
              {(selectedLead.name || "?").charAt(0).toUpperCase()}
            </span>
            <h2 className="truncate text-sm font-semibold">
              {selectedLead.name}
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? "Collapse panel" : "Expand panel"}
              className={`rounded-[4px] p-1.5 text-[#787774] ${hoverBg}`}
            >
              {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button
              type="button"
              onClick={() => setSelectedLeadId(null)}
              aria-label="Close"
              className="rounded-[4px] border border-[#E6E6E3] p-1 text-[#787774] transition-colors hover:bg-[#F5F5F3]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-2 flex items-center gap-4 border-b border-[#EBEBE8] px-4">
          <button
            type="button"
            onClick={() => setTab("home")}
            className={tabClass(tab === "home")}
          >
            <Home size={15} />
            Home
          </button>

          <button
            type="button"
            onClick={() => setTab("comments")}
            className={tabClass(tab === "comments")}
          >
            <MessageSquare size={15} />
            Comments
            {comments.length > 0 && (
              <span className="rounded-[3px] bg-[rgba(55,53,47,0.08)] px-1 text-xs text-[#787774]">
                {comments.length}
              </span>
            )}
          </button>

          <Link
            href={`/leads/details/${selectedLead._id}`}
            className={tabClass(false)}
          >
            <Maximize size={15} />
            Details
          </Link>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {tab === "home" ? (
            <>
              <div className="px-4 pb-2 pt-4">
                <h3 className="mb-1 text-sm font-medium">Fields</h3>

                {/* General */}
                <Group
                  title="General"
                  open={open.general}
                  onToggle={() => toggleGroup("general")}
                >
                  <Row icon={CircleDot} label="Status">
                    <div className="relative inline-block">
                      <button
                        type="button"
                        onClick={() => {
                          setIsLeadStatusOpen(!isLeadStatusOpen);
                          setIsTagMenuOpen(false);
                        }}
                        className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2]/40"
                      >
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] leading-5 ${statusPill}`}
                        >
                          <span className={`h-2 w-2 rounded-full ${statusDot}`} />
                          {currentStatus}
                          <ChevronDown
                            size={13}
                            className={`transition-transform ${isLeadStatusOpen ? "rotate-180" : ""}`}
                          />
                        </span>
                      </button>

                      {isLeadStatusOpen && (
                        <>
                          <button
                            type="button"
                            aria-label="Close status menu"
                            className="fixed inset-0 z-[90] cursor-default"
                            onClick={() => setIsLeadStatusOpen(false)}
                          />
                          <div
                            className="absolute left-0 z-[100] mt-1 w-[230px] rounded-[6px] bg-white py-1"
                            style={{ boxShadow: menuShadow }}
                          >
                            {DEFAULT_STATUSES.map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => handlePrimaryStatus(status)}
                                className={menuItem(currentStatus === status)}
                              >
                                {status}
                                {currentStatus === status && <Check size={14} className="text-[#2383E2]" />}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </Row>

                  {availableTags.length > 0 && (
                    <Row icon={TargetIcon} label="Tags">
                      <div className="relative">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {currentTags.length > 0 ? (
                            currentTags.map((tag) => (
                              <span key={tag} className={chipClass}>
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => handleTagSelection(tag)}
                                  className="ml-1 text-[#9B9A97] hover:text-red-500"
                                  aria-label={`Remove ${tag}`}
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))
                          ) : (
                            <Placeholder>No tags</Placeholder>
                          )}
                          <button
                            type="button"
                            onClick={() => setIsTagMenuOpen(!isTagMenuOpen)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded border border-dashed border-[#CFCFCB] text-[#787774] hover:bg-[#F5F5F3]"
                            aria-label="Add tag"
                          >
                            +
                          </button>
                        </div>

                        {isTagMenuOpen && (
                          <>
                            <button
                              type="button"
                              aria-label="Close tag menu"
                              className="fixed inset-0 z-[90] cursor-default"
                              onClick={() => setIsTagMenuOpen(false)}
                            />
                            <div
                              className="absolute left-0 top-full z-[100] mt-2 max-h-64 w-[260px] overflow-y-auto rounded-lg border border-[#E9E9E7] bg-white py-1"
                              style={{ boxShadow: menuShadow }}
                            >
                              {availableTags.map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => handleTagSelection(tag)}
                                  className={menuItem(currentTags.includes(tag))}
                                >
                                  <span>{tag}</span>
                                  {currentTags.includes(tag) && <Check size={14} className="text-[#2383E2]" />}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </Row>
                  )}

                  <Row
                    icon={Mail}
                    label="Emails"
                    actions={
                      selectedLead.email && (
                        <>
                          <IconButton
                            label="Copy email"
                            onClick={() => copyValue("email", selectedLead.email)}
                          >
                            {copied === "email" ? (
                              <Check size={13} />
                            ) : (
                              <Copy size={13} />
                            )}
                          </IconButton>
                          <IconButton
                            label="Send email"
                            href={`mailto:${selectedLead.email}`}
                          >
                            <ArrowUpRight size={13} />
                          </IconButton>
                        </>
                      )
                    }
                  >
                    {selectedLead.email ? (
                      <span className={chipClass}>{selectedLead.email}</span>
                    ) : (
                      <Placeholder>Email</Placeholder>
                    )}
                  </Row>

                  <Row
                    icon={Phone}
                    label="Phones"
                    actions={
                      selectedLead.phone && (
                        <>
                          <IconButton
                            label="Copy phone"
                            onClick={() => copyValue("phone", selectedLead.phone)}
                          >
                            {copied === "phone" ? (
                              <Check size={13} />
                            ) : (
                              <Copy size={13} />
                            )}
                          </IconButton>
                          <IconButton
                            label="Call"
                            href={`tel:${selectedLead.phone}`}
                          >
                            <ArrowUpRight size={13} />
                          </IconButton>
                        </>
                      )
                    }
                  >
                    {selectedLead.phone ? (
                      <span className={chipClass}>{selectedLead.phone}</span>
                    ) : (
                      <Placeholder>Phone</Placeholder>
                    )}
                  </Row>

                  <Row icon={MapPin} label="City">
                    {selectedLead.city ? (
                      selectedLead.city
                    ) : (
                      <Placeholder>City</Placeholder>
                    )}
                  </Row>

                  <Row icon={User2} label="Profile type">
                    {selectedLead.profile ? (
                      <span className={`${chipClass} capitalize`}>
                        {selectedLead.profile}
                      </span>
                    ) : (
                      <Placeholder>Unknown</Placeholder>
                    )}
                  </Row>
                </Group>

                {/* Work */}
                <Group
                  title="Work"
                  open={open.work}
                  onToggle={() => toggleGroup("work")}
                >
                  <Row icon={Briefcase} label="Company">
                    {selectedLead.company ? (
                      <span className={chipClass}>{selectedLead.company}</span>
                    ) : (
                      <Placeholder>Company</Placeholder>
                    )}
                  </Row>

                  {selectedLead.prev_course && (
                    <Row icon={BookOpen} label="Previous course">
                      <span className={chipClass}>{selectedLead.prev_course}</span>
                    </Row>
                  )}

                  {selectedLead.prev_admission && (
                    <Row icon={CalendarCheck} label="Prev. admission">
                      {formatDate(selectedLead.prev_admission)}
                    </Row>
                  )}
                </Group>

                {/* Marketing */}
                <Group
                  title="Marketing"
                  open={open.marketing}
                  onToggle={() => toggleGroup("marketing")}
                >
                  <Row icon={Globe} label="Source">
                    <span className={chipClass}>{sourceLabel}</span>
                  </Row>

                  <Row icon={Activity} label="Medium">
                    {mediumLabel}
                  </Row>

                  <Row icon={TargetIcon} label="Campaign">
                    NA
                  </Row>

                  <Row icon={Info} label="Search term">
                    N/A
                  </Row>

                  <Row icon={ShieldCheck} label="Consent">
                    {selectedLead.consent ? "Granted" : "Not provided"}
                  </Row>
                </Group>

                {/* System */}
                <Group
                  title="System"
                  open={open.system}
                  onToggle={() => toggleGroup("system")}
                >
                  <Row icon={Calendar} label="Creation date">
                    {selectedLead.createdAt ? (
                      <span
                        title={new Date(selectedLead.createdAt).toLocaleString()}
                      >
                        {timeAgo(selectedLead.createdAt) ||
                          new Date(selectedLead.createdAt).toLocaleString()}
                      </span>
                    ) : (
                      <Placeholder>Empty</Placeholder>
                    )}
                  </Row>

                  {selectedLead.updatedAt && (
                    <Row icon={Clock} label="Last updated">
                      <span
                        title={new Date(selectedLead.updatedAt).toLocaleString()}
                      >
                        {timeAgo(selectedLead.updatedAt) ||
                          new Date(selectedLead.updatedAt).toLocaleString()}
                      </span>
                    </Row>
                  )}

                  {selectedLead.ip && (
                    <Row icon={Globe} label="IP address">
                      <span className="break-all">{selectedLead.ip}</span>
                    </Row>
                  )}

                  {selectedLead.userAgent && (
                    <Row icon={Info} label="User agent">
                      <span
                        className="block truncate"
                        title={selectedLead.userAgent}
                      >
                        {getUserAgentName(selectedLead.userAgent)}
                      </span>
                    </Row>
                  )}

                  {selectedLead.gclid && (
                    <Row icon={TargetIcon} label="GCLID">
                      <span
                        className="block truncate"
                        title={selectedLead.gclid}
                      >
                        {selectedLead.gclid}
                      </span>
                    </Row>
                  )}
                </Group>
              </div>

              {/* Comments preview section */}
              <div className="border-t border-[#EBEBE8] px-4 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Comments</h3>
                  <button
                    type="button"
                    onClick={() => setTab("comments")}
                    aria-label="Open comments"
                    className={`rounded-[4px] p-1.5 text-[#787774] ${hoverBg}`}
                  >
                    <ArrowUpRight size={15} />
                  </button>
                </div>

                <div className="mt-2">
                  {lastComment ? (
                    <div className="rounded-[6px] bg-[#F7F7F5] px-3 py-2.5">
                      <p className="line-clamp-3 whitespace-pre-wrap break-words text-[13px]">
                        {lastComment.text}
                      </p>
                      <p className="mt-1 text-xs text-[#9B9A97]">
                        {lastComment.createdBy?.name
                          ? `${lastComment.createdBy.name} · `
                          : ""}
                        {lastComment.createdAt
                          ? new Date(lastComment.createdAt).toLocaleString([], {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : ""}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[13px] text-[#9B9A97]">
                      No comments yet.
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="px-4 py-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                <MessageSquare size={15} className="text-[#9B9A97]" />
                Internal comments
              </h3>

              <div className="mb-4 space-y-3">
                {comments.length === 0 ? (
                  <p className="text-[13px] text-[#9B9A97]">
                    No comments yet.
                  </p>
                ) : (
                  comments.map((c, i) => (
                    <div key={c.id || i} className="flex gap-2.5">
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium ${avatarColor(
                          c.createdBy?.name || "?"
                        )}`}
                      >
                        {(c.createdBy?.name || "?").charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          {c.createdBy?.name && (
                            <span className="text-[13px] font-medium">
                              {c.createdBy.name}
                            </span>
                          )}
                          <span className="text-xs text-[#9B9A97]">
                            {new Date(c.createdAt).toLocaleString([], {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px]">
                          {c.text}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = e.target.elements.comment;
                  addComment(getLeadId(selectedLead), input.value);
                  input.value = "";
                }}
                className="flex items-center gap-2 rounded-[6px] border border-[#E3E2E0] px-2.5 py-1.5 focus-within:border-[#2383E2] focus-within:ring-2 focus-within:ring-[#2383E2]/30"
              >
                <input
                  name="comment"
                  type="text"
                  placeholder="Add a comment..."
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#C7C6C3]"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  aria-label="Add comment"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2383E2] text-white transition-colors hover:bg-[#0077D4]"
                >
                  <ArrowUp size={14} />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Action footer */}
        <div className="flex items-center justify-between gap-2 border-t border-[#EBEBE8] px-3 py-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="More actions"
              className="inline-flex h-7 w-7 items-center justify-center rounded-[5px] border border-[#E6E6E3] bg-white text-[#787774] transition-colors hover:bg-[#F5F5F3]"
            >
              <MoreVertical size={15} />
            </button>

            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close menu"
                  className="fixed inset-0 z-[90] cursor-default"
                  onClick={() => setMenuOpen(false)}
                />
                <div
                  className="absolute bottom-full left-0 z-[100] mb-1 w-[190px] rounded-[6px] bg-white py-1"
                  style={{ boxShadow: menuShadow }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setDeleteModal({
                        open: true,
                        id: selectedLead._id,
                      });
                    }}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm text-[#E03E3E] transition-colors hover:bg-[#FFE2DD]/60"
                  >
                    <Trash2Icon size={14} />
                    Delete lead
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {selectedLead.phone && (
              <a
                href={`tel:${selectedLead.phone}`}
                className="inline-flex h-7 items-center gap-1.5 rounded-[5px] border border-[#E6E6E3] bg-white px-2.5 text-[13px] text-[#37352F] transition-colors hover:bg-[#F5F5F3]"
              >
                <Phone size={14} className="text-[#787774]" />
                Call
              </a>
            )}

            {selectedLead.email && (
              <a
                href={`mailto:${selectedLead.email}`}
                className="inline-flex h-7 items-center gap-1.5 rounded-[5px] border border-[#E6E6E3] bg-white px-2.5 text-[13px] text-[#37352F] transition-colors hover:bg-[#F5F5F3]"
              >
                <Mail size={14} className="text-[#787774]" />
                Send email
              </a>
            )}

          <WhatsAppChat mobile={selectedLead.phone} name={selectedLead.name} />
          </div>
        </div>
      </aside>

      {/* Batch assignment. Lead becomes Registered only after the API succeeds. */}
      {assignBatchOpen && (
        <LeadBatchAssignmentModal
          lead={selectedLead}
          onClose={() => setAssignBatchOpen(false)}
          onSuccess={() => {
            saveStatusAndTags("Registered", []);
            setAssignBatchOpen(false);
          }}
        />
      )}

      {/* Demo request: persist a pending request before applying the lead tag. */}
      {demoModalOpen && (
        <DemoRequestModal
          lead={selectedLead}
          onClose={() => setDemoModalOpen(false)}
          onSuccess={() => {
            saveStatusAndTags(selectedLead.status || "Hot", ["Demo req"]);
            setDemoModalOpen(false);
          }}
        />
      )}
    </>
  );
}