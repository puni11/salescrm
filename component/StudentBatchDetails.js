
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen, CalendarDays, GraduationCap, Wrench, Users, IndianRupee,
  CheckCircle2, Clock, AlertCircle, Loader2, Plus, Bell, X, Trash2,
  Layers, Info, ChevronRight,
} from "lucide-react";

/* ----------------------------- helpers ----------------------------- */

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const formatDate = (value) => {
  if (!value) return "Not scheduled";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "Not scheduled"
    : d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const localDateValue = (value = new Date()) => {
  const d = new Date(value);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const assignmentKey = (a, i) => String(a.id || a.batchId || i);

const TAG = {
  gray: "bg-[#E3E2E0] text-[#32302C]",
  green: "bg-[#DBEDDB] text-[#1C3829]",
  yellow: "bg-[#FDECC8] text-[#402C1B]",
  red: "bg-[#FFE2DD] text-[#5D1715]",
  blue: "bg-[#D3E5EF] text-[#183347]",
};

const STATUS_TAG = {
  paid: TAG.green,
  partial: TAG.yellow,
  due: TAG.red,
};

const inputCls =
  "mt-1.5 w-full rounded-md border border-[#E9E9E7] bg-[#F7F7F5] px-3 py-2 text-sm text-[#37352F] placeholder:text-[#B4B4B0] outline-none transition-colors focus:border-[#2383E2] focus:bg-white focus:ring-2 focus:ring-[#2383E2]/20";

/* ---------------------------- main component ---------------------------- */

export default function StudentBatchDetails({ id }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedKey, setSelectedKey] = useState(null);
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [modal, setModal] = useState("");
  const [saving, setSaving] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(localDateValue());
  const [paymentNote, setPaymentNote] = useState("");

  const [reminderDate, setReminderDate] = useState("");
  const [reminderFrequency, setReminderFrequency] = useState("once");
  const [reminderChannel, setReminderChannel] = useState("manual");
  const [reminderNote, setReminderNote] = useState("");

  const [reminders, setReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(false);

  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  async function fetchDetails(signal) {
    const res = await fetch(
      `/api/student-batch-details?studentId=${encodeURIComponent(id)}`,
      {
        signal,
        cache: "no-store",
      }
    );

    const result = await res.json();

    if (!res.ok || !result.success) {
      throw new Error(result.message || "Failed to fetch details");
    }

    setData(result);
  }

  async function fetchReminders(batchId) {
    try {
      setRemindersLoading(true);

      const res = await fetch(
        `/api/student-fee-reminders?studentId=${encodeURIComponent(
          id
        )}&batchId=${encodeURIComponent(batchId)}`,
        { cache: "no-store" }
      );

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Failed to fetch reminders");
      }

      setReminders(
        (result.reminders || []).map((r) => ({
          ...r,
          id: r._id || r.id,
          reminderAt: r.dueDate || r.reminderAt,
          note: r.message || r.note || "",
        }))
      );
    } finally {
      setRemindersLoading(false);
    }
  }

  async function fetchPayments(batchId) {
    try {
      setPaymentsLoading(true);

      const res = await fetch(
        `/api/student-fee-payments?studentId=${encodeURIComponent(
          id
        )}&batchId=${encodeURIComponent(batchId)}`,
        { cache: "no-store" }
      );

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Failed to fetch payments");
      }

      setPayments(result.payments || []);
    } finally {
      setPaymentsLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;

    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError("");
        await fetchDetails(controller.signal);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [id]);

  const assignments = data?.data?.assignments || [];
  const batchSummary = data?.data?.batchSummary;

  const drawerIndex = assignments.findIndex(
    (a, i) => assignmentKey(a, i) === selectedKey
  );

  const drawerAssignment =
    drawerIndex >= 0 ? assignments[drawerIndex] : null;

  const selectedPaid = useMemo(() => {
    if (!activeAssignment) return 0;

    const legacy = Number(activeAssignment.legacyPaidFee) || 0;

    const existingPayments = (
      activeAssignment.payments || []
    ).reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0
    );

    return Math.max(
      Number(activeAssignment.paidFee) || 0,
      legacy + existingPayments
    );
  }, [activeAssignment]);

  const selectedRemaining = Math.max(
    (Number(activeAssignment?.totalFee) || 0) - selectedPaid,
    0
  );

  const closeModal = () => {
    setModal("");
    setActiveAssignment(null);
  };

  const closeDrawer = () => setSelectedKey(null);

  useEffect(() => {
    if (!drawerAssignment) return;

    const onKey = (e) => {
      if (e.key !== "Escape") return;

      if (modal) {
        closeModal();
      } else {
        closeDrawer();
      }
    };

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerAssignment, modal]);

  async function openModal(type, assignment) {
    setActiveAssignment(assignment);
    setModal(type);

    if (type === "payment") {
      setPaymentAmount("");
      setPaymentDate(localDateValue());
      setPaymentNote("");
    } else {
      setReminderDate(localDateValue());
      setReminderFrequency("once");
      setReminderChannel("manual");
      setReminderNote("");

      try {
        await fetchReminders(assignment.batchId);
      } catch (err) {
        window.alert(err.message);
      }
    }
  }

  async function submitPayment(e) {
    e.preventDefault();

    const amount = Number(paymentAmount);

    const remaining = Math.max(
      (Number(activeAssignment.totalFee) || 0) - selectedPaid,
      0
    );

    if (!Number.isFinite(amount) || amount <= 0) {
      return window.alert("Enter a valid payment amount.");
    }

    if (amount > remaining) {
      return window.alert(
        `Payment cannot exceed the remaining balance of ${money(remaining)}.`
      );
    }

    try {
      setSaving(true);

      const res = await fetch("/api/student-fee-payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: id,
          batchId: activeAssignment.batchId,
          amount,
          paidAt: paymentDate,
          note: paymentNote,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Could not save payment");
      }

      await Promise.all([
        fetchDetails(),
        fetchPayments(activeAssignment.batchId),
      ]);

      closeModal();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitReminder(e) {
    e.preventDefault();

    if (!reminderDate) {
      return window.alert("Choose a reminder date.");
    }

    try {
      setSaving(true);

      const res = await fetch("/api/student-fee-reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: id,
          batchId: activeAssignment.batchId,
          title: "Fee payment reminder",
          message: reminderNote,
          dueDate: reminderDate,
          frequency: reminderFrequency,
          channel: reminderChannel,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Could not save reminder");
      }

      await fetchReminders(activeAssignment.batchId);
      closeModal();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteReminder(reminderId) {
    if (!window.confirm("Delete this fee reminder?")) return;

    try {
      const res = await fetch(
        `/api/student-fee-reminders?id=${encodeURIComponent(reminderId)}`,
        { method: "DELETE" }
      );

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Could not delete reminder");
      }

      setReminders((items) =>
        items.filter(
          (r) => String(r.id) !== String(reminderId)
        )
      );
    } catch (err) {
      window.alert(err.message);
    }
  }

  /* ------------------------------ states ------------------------------ */

  if (loading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center text-[#787774]">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2 text-sm">
          Loading batch details…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-md bg-[#FFE2DD] p-4 text-sm text-[#5D1715]">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">
            Couldn’t load batch details
          </p>
          <p className="mt-0.5 opacity-80">{error}</p>
        </div>
      </div>
    );
  }

  if (!data?.assigned || !assignments.length) {
    return (
      <div className="py-16 text-center">
        <GraduationCap
          className="mx-auto mb-3 h-10 w-10 text-[#B4B4B0]"
          strokeWidth={1.5}
        />
        <h3 className="font-semibold text-[#37352F]">
          No batch assigned
        </h3>
        <p className="mt-1 text-sm text-[#787774]">
          This student hasn’t been added to a batch yet.
        </p>
      </div>
    );
  }

  /* ------------------------------ page ------------------------------ */

  return (
    <div className="font-sans text-[#37352F]">
      <style>{`
        @keyframes sbd-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes sbd-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .sbd-drawer {
          animation: sbd-up 240ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .sbd-backdrop {
          animation: sbd-fade 200ms ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .sbd-drawer, .sbd-backdrop { animation: none; }
        }
      `}</style>

      {/* Overall fee summary */}
      {batchSummary && (
        <div className="mb-6 grid grid-cols-3 divide-x divide-[#E9E9E7] rounded-md border border-[#E9E9E7]">
          <Stat label="Total fee" value={money(batchSummary.totalFee)} />
          <Stat
            label="Paid"
            value={money(batchSummary.paidFee)}
            tone="text-[#1C7C45]"
          />
          <Stat
            label="Balance"
            value={money(batchSummary.balanceDue)}
            tone="text-[#C05A36]"
          />
        </div>
      )}

      {/* Batches table */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">Batches</h2>
        <Tag color={TAG.gray}>{assignments.length}</Tag>
      </div>

      <div className="overflow-x-auto rounded-md border border-[#E9E9E7]">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#E9E9E7] text-xs text-[#9B9A97]">
              <th className="px-3 py-2 font-normal">Batch</th>
              <th className="px-3 py-2 font-normal">Starts</th>
              <th className="px-3 py-2 font-normal">Batch status</th>
              <th className="px-3 py-2 text-right font-normal">Total fee</th>
              <th className="px-3 py-2 text-right font-normal">Paid</th>
              <th className="px-3 py-2 text-right font-normal">Balance</th>
              <th className="px-3 py-2 font-normal">Payment</th>
              <th className="w-8 px-3 py-2" />
            </tr>
          </thead>

          <tbody>
            {assignments.map((a, i) => {
              const key = assignmentKey(a, i);
              const batch = a.batch;

              return (
                <tr
                  key={key}
                  onClick={() => setSelectedKey(key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedKey(key);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open ${batch?.name || "batch"} details`}
                  className="group cursor-pointer border-b border-[#F1F1EF] last:border-b-0 outline-none transition-colors hover:bg-[#F7F7F5] focus-visible:bg-[#F7F7F5] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2383E2]/40"
                >
                  <td className="px-3 py-3">
                    <p className="font-medium">
                      {batch?.name || "Batch unavailable"}
                    </p>
                    <p className="mt-0.5 text-xs text-[#787774]">
                      {batch?.courseName || "Course unavailable"}
                    </p>
                  </td>

                  <td className="whitespace-nowrap px-3 py-3 text-[#5A5954]">
                    {formatDate(batch?.startingDate)}
                  </td>

                  <td className="px-3 py-3">
                    {batch?.status ? (
                      <Tag color={TAG.green} className="capitalize">
                        {batch.status}
                      </Tag>
                    ) : (
                      <Muted>—</Muted>
                    )}
                  </td>

                  <td className="px-3 py-3 text-right tabular-nums">
                    {money(a.totalFee)}
                  </td>

                  <td className="px-3 py-3 text-right tabular-nums text-[#1C7C45]">
                    {money(a.paidFee)}
                  </td>

                  <td className="px-3 py-3 text-right tabular-nums text-[#C05A36]">
                    {money(a.balanceDue)}
                  </td>

                  <td className="px-3 py-3">
                    <Tag
                      color={STATUS_TAG[a.paymentStatus] || TAG.red}
                      className="capitalize"
                    >
                      {a.paymentStatus === "paid" ? (
                        <CheckCircle2 size={12} />
                      ) : (
                        <Clock size={12} />
                      )}
                      {a.paymentStatus}
                    </Tag>
                  </td>

                  <td className="px-3 py-3 text-[#B4B4B0] group-hover:text-[#787774]">
                    <ChevronRight size={16} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom drawer */}
      {drawerAssignment && (
        <BatchDrawer
          assignment={drawerAssignment}
          onClose={closeDrawer}
          onAddPayment={() =>
            openModal("payment", drawerAssignment)
          }
          onSetReminder={() =>
            openModal("reminder", drawerAssignment)
          }
          reminders={reminders}
          remindersLoading={remindersLoading}
          onLoadReminders={() =>
            fetchReminders(drawerAssignment.batchId).catch(
              (err) => window.alert(err.message)
            )
          }
          onDeleteReminder={deleteReminder}
          payments={payments}
          paymentsLoading={paymentsLoading}
          onLoadPayments={() =>
            fetchPayments(drawerAssignment.batchId).catch(
              (err) => window.alert(err.message)
            )
          }
        />
      )}

      {/* Payment / reminder modal */}
      {modal && activeAssignment && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[8vh]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-md rounded-lg bg-white shadow-[0_0_0_1px_rgba(15,15,15,0.05),0_3px_6px_rgba(15,15,15,0.1),0_9px_24px_rgba(15,15,15,0.2)]">
            <div className="flex items-start justify-between px-5 pb-2 pt-5">
              <div>
                <h3 className="text-lg font-semibold">
                  {modal === "payment"
                    ? "Add fee payment"
                    : "Fee reminder"}
                </h3>
                <p className="mt-0.5 text-sm text-[#787774]">
                  {activeAssignment.batch?.name || "Selected batch"}
                </p>
              </div>

              <button
                onClick={closeModal}
                aria-label="Close"
                className="rounded p-1.5 text-[#787774] hover:bg-[#F1F1EF]"
              >
                <X size={16} />
              </button>
            </div>

            {modal === "payment" ? (
              <form
                onSubmit={submitPayment}
                className="space-y-4 px-5 pb-5 pt-2"
              >
                <div className="grid grid-cols-2 divide-x divide-[#E9E9E7] rounded-md border border-[#E9E9E7]">
                  <MiniStat
                    className="px-3 py-2.5"
                    label="Already paid"
                    value={money(selectedPaid)}
                  />
                  <MiniStat
                    className="px-3 py-2.5"
                    label="Balance remaining"
                    value={money(selectedRemaining)}
                    tone="text-[#C05A36]"
                  />
                </div>

                <label className="block text-xs font-medium text-[#787774]">
                  Amount
                  <input
                    required
                    min="1"
                    max={selectedRemaining}
                    type="number"
                    value={paymentAmount}
                    onChange={(e) =>
                      setPaymentAmount(e.target.value)
                    }
                    className={inputCls}
                    placeholder="Enter amount"
                  />
                </label>

                <label className="block text-xs font-medium text-[#787774]">
                  Date
                  <input
                    required
                    type="date"
                    max={localDateValue()}
                    value={paymentDate}
                    onChange={(e) =>
                      setPaymentDate(e.target.value)
                    }
                    className={inputCls}
                  />
                </label>

                <label className="block text-xs font-medium text-[#787774]">
                  Note
                  <input
                    value={paymentNote}
                    onChange={(e) =>
                      setPaymentNote(e.target.value)
                    }
                    className={inputCls}
                    placeholder="UPI, cash, transaction reference…"
                  />
                </label>

                <button
                  disabled={saving}
                  className="h-9 w-full rounded-md bg-[#2383E2] text-sm font-medium text-white transition-colors hover:bg-[#0F6FCC] disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save payment"}
                </button>
              </form>
            ) : (
              <form
                onSubmit={submitReminder}
                className="space-y-4 px-5 pb-5 pt-2"
              >
                <div className="flex gap-2 rounded-md bg-[#F1F1EF] p-3 text-sm text-[#5A5954]">
                  <Info size={16} className="mt-0.5 shrink-0" />
             
                </div>

                <label className="block text-xs font-medium text-[#787774]">
                  Remind on
                  <input
                    required
                    type="date"
                    min={localDateValue()}
                    value={reminderDate}
                    onChange={(e) =>
                      setReminderDate(e.target.value)
                    }
                    className={inputCls}
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs font-medium text-[#787774]">
                    Repeat
                    <select
                      value={reminderFrequency}
                      onChange={(e) =>
                        setReminderFrequency(e.target.value)
                      }
                      className={inputCls}
                    >
                      <option value="once">Once</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </label>

                  <label className="block text-xs font-medium text-[#787774]">
                    Channel
                    <select
                      value={reminderChannel}
                      onChange={(e) =>
                        setReminderChannel(e.target.value)
                      }
                      className={inputCls}
                    >
                      <option value="manual">Manual follow-up</option>
                      <option value="whatsapp">WhatsApp (schedule only)</option>
                    </select>
                  </label>
                </div>

                <label className="block text-xs font-medium text-[#787774]">
                  Note
                  <textarea
                    value={reminderNote}
                    onChange={(e) =>
                      setReminderNote(e.target.value)
                    }
                    rows={3}
                    className={inputCls}
                    placeholder="Add a follow-up note…"
                  />
                </label>

                <button
                  disabled={saving}
                  className="h-9 w-full rounded-md bg-[#2383E2] text-sm font-medium text-white transition-colors hover:bg-[#0F6FCC] disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save reminder"}
                </button>

                <div className="border-t border-[#E9E9E7] pt-4">
                  <h4 className="mb-2 text-sm font-semibold">
                    Existing reminders
                  </h4>

                  {reminders.length ? (
                    <div className="rounded-md border border-[#E9E9E7]">
                      {reminders.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-[#F7F7F5] [&:not(:last-child)]:border-b [&:not(:last-child)]:border-[#F1F1EF]"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              {formatDate(r.reminderAt)}{" "}
                              <span className="font-normal capitalize text-[#787774]">
                                · {r.frequency}
                              </span>
                            </p>

                            <p className="truncate text-xs text-[#787774]">
                              <span className="capitalize">
                                {r.channel}
                              </span>
                              {" · "}
                              {r.status}
                              {r.note ? ` · ${r.note}` : ""}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => deleteReminder(r.id)}
                            aria-label="Delete reminder"
                            className="rounded p-1.5 text-[#787774] hover:bg-[#FFE2DD] hover:text-[#C4554D]"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Muted>No reminders set for this batch.</Muted>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------- drawer --------------------------- */

function BatchDrawer({
  assignment,
  onClose,
  onAddPayment,
  onSetReminder,
  reminders = [],
  remindersLoading = false,
  onLoadReminders,
  onDeleteReminder,
  payments = [],
  paymentsLoading = false,
  onLoadPayments,
}) {
  const [activeTab, setActiveTab] = useState("overview");

  const batch = assignment.batch;

  const progress =
    assignment.totalFee > 0
      ? Math.min(
          100,
          Math.round(
            (assignment.paidFee / assignment.totalFee) * 100
          )
        )
      : 0;

  const sortedPayments = [...payments].sort(
    (a, b) =>
      new Date(b.paidAt || 0) - new Date(a.paidAt || 0)
  );

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "payments", label: "Payments" },
    { id: "reminders", label: "Payment reminders" },
    { id: "sessions", label: "Session details" },
  ];

  const changeTab = (tab) => {
    setActiveTab(tab);

    if (tab === "reminders") onLoadReminders?.();
    if (tab === "payments") onLoadPayments?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="sbd-backdrop absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${batch?.name || "Batch"} details`}
        className="sbd-drawer relative flex max-h-[88vh] w-full max-w-4xl flex-col rounded-t-xl bg-white shadow-[0_-8px_30px_rgba(15,15,15,0.18)]"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-[#E9E9E7] px-5 pb-0 pt-2.5 sm:px-8">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#E3E2E0]" />

          <div className="flex flex-wrap items-start justify-between gap-3 pb-4">
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-bold tracking-tight">
                {batch?.name || "Batch unavailable"}
              </h2>
              <p className="mt-1 text-sm text-[#787774]">
                {batch?.courseName || "Course unavailable"}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {batch?.status && (
                <Tag color={TAG.green} className="capitalize">
                  {batch.status}
                </Tag>
              )}

              <button
                onClick={onAddPayment}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#2383E2] px-3 text-sm font-medium text-white transition-colors hover:bg-[#0F6FCC]"
              >
                <Plus size={14} /> Add payment
              </button>

              <button
                onClick={onSetReminder}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#E9E9E7] bg-white px-3 text-sm font-medium transition-colors hover:bg-[#F7F7F5]"
              >
                <Bell size={14} /> Set reminder
              </button>

              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded p-1.5 text-[#787774] hover:bg-[#F1F1EF]"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Drawer tabs */}
          <div className="-mb-px flex gap-5 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => changeTab(tab.id)}
                className={`shrink-0 border-b-2 px-0 pb-3 pt-1 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-[#2383E2] text-[#2383E2]"
                    : "border-transparent text-[#787774] hover:text-[#37352F]"
                }`}
              >
                {tab.label}

                {tab.id === "payments" &&
                  sortedPayments.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-[#F1F1EF] px-1.5 py-0.5 text-[10px] text-[#5A5954]">
                      {sortedPayments.length}
                    </span>
                  )}

                {tab.id === "reminders" &&
                  reminders.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-[#F1F1EF] px-1.5 py-0.5 text-[10px] text-[#5A5954]">
                      {reminders.length}
                    </span>
                  )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="min-h-0 overflow-y-auto px-5 pb-10 pt-5 sm:px-8">
          {activeTab === "overview" && (
            <>
              <div className="space-y-0.5">
                <Property
                  icon={CalendarDays}
                  label="Starts"
                >
                  {formatDate(batch?.startingDate)}
                </Property>

                <Property
                  icon={BookOpen}
                  label="Assigned on"
                >
                  {formatDate(assignment.assignedAt)}
                </Property>

                <Property
                  icon={Layers}
                  label="Plan type"
                >
                  <span className="capitalize">
                    {assignment.mode?.replaceAll("_", " ") || (
                      <Muted>Empty</Muted>
                    )}
                  </span>
                </Property>
              </div>

              <SectionTitle icon={Wrench} className="mt-7">
                Tools{" "}
                <span className="font-normal text-[#9B9A97]">
                  {assignment.selectedTools?.length || 0}
                </span>
              </SectionTitle>

              <div className="flex flex-wrap gap-1.5">
                {assignment.selectedTools?.length ? (
                  assignment.selectedTools.map((tool) => (
                    <Tag key={tool.id} color={TAG.gray}>
                      {tool.name}
                    </Tag>
                  ))
                ) : (
                  <Muted>No tools selected</Muted>
                )}
              </div>

              <SectionTitle icon={Users} className="mt-7">
                Trainers
              </SectionTitle>

              {assignment.toolTrainerAssignments?.length ? (
                <div className="rounded-md border border-[#E9E9E7]">
                  <div className="grid grid-cols-2 border-b border-[#E9E9E7] px-3 py-1.5 text-xs text-[#9B9A97]">
                    <span>Tool</span>
                    <span>Trainer</span>
                  </div>

                  {assignment.toolTrainerAssignments.map(
                    (item, i) => (
                      <div
                        key={`${item.toolId}-${i}`}
                        className="grid grid-cols-2 px-3 py-2 text-sm hover:bg-[#F7F7F5] [&:not(:last-child)]:border-b [&:not(:last-child)]:border-[#F1F1EF]"
                      >
                        <span className="font-medium">
                          {item.toolName || "Tool"}
                        </span>
                        <span
                          className={
                            item.trainerName
                              ? ""
                              : "text-[#9B9A97]"
                          }
                        >
                          {item.trainerName || "Not assigned"}
                        </span>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <Muted>No trainer assignments yet.</Muted>
              )}

              <SectionTitle icon={IndianRupee} className="mt-7">
                Fee overview
              </SectionTitle>

              <div className="grid grid-cols-2 gap-y-4 rounded-md border border-[#E9E9E7] p-4 sm:grid-cols-4">
                <MiniStat
                  label="Total fee"
                  value={money(assignment.totalFee)}
                />

                <MiniStat
                  label="Paid"
                  value={money(assignment.paidFee)}
                  tone="text-[#1C7C45]"
                />

                <MiniStat
                  label="Balance due"
                  value={money(assignment.balanceDue)}
                  tone="text-[#C05A36]"
                />

                <div>
                  <p className="text-xs text-[#9B9A97]">Status</p>
                  <Tag
                    color={
                      STATUS_TAG[assignment.paymentStatus] ||
                      TAG.red
                    }
                    className="mt-1.5 capitalize"
                  >
                    {assignment.paymentStatus === "paid" ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      <Clock size={12} />
                    )}
                    {assignment.paymentStatus}
                  </Tag>
                </div>

                {assignment.totalFee > 0 && (
                  <div className="col-span-2 sm:col-span-4">
                    <div className="mb-1.5 flex justify-between text-xs text-[#787774]">
                      <span>Payment progress</span>
                      <span>{progress}%</span>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-[#EFEFED]">
                      <div
                        className="h-full rounded-full bg-[#2383E2] transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "payments" && (
            <>
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-md border border-[#E9E9E7] p-3">
                  <p className="text-xs text-[#9B9A97]">
                    Total fee
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {money(assignment.totalFee)}
                  </p>
                </div>

                <div className="rounded-md border border-[#E9E9E7] p-3">
                  <p className="text-xs text-[#9B9A97]">
                    Total paid
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[#1C7C45]">
                    {money(assignment.paidFee)}
                  </p>
                </div>

                <div className="rounded-md border border-[#E9E9E7] p-3">
                  <p className="text-xs text-[#9B9A97]">
                    Balance due
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[#C05A36]">
                    {money(assignment.balanceDue)}
                  </p>
                </div>
              </div>

              <div className="mb-3 flex items-center justify-between">
                <SectionTitle icon={IndianRupee}>
                  Payment history
                </SectionTitle>

                <span className="text-xs text-[#9B9A97]">
                  {sortedPayments.length} payment
                  {sortedPayments.length === 1 ? "" : "s"}
                </span>
              </div>

              {paymentsLoading ? (
                <div className="flex items-center justify-center py-12 text-sm text-[#787774]">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading payments…
                </div>
              ) : sortedPayments.length ? (
                <div className="rounded-md border border-[#E9E9E7]">
                  {sortedPayments.map((payment, i) => (
                    <div
                      key={payment.id || payment._id || i}
                      className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-sm hover:bg-[#F7F7F5] [&:not(:last-child)]:border-b [&:not(:last-child)]:border-[#F1F1EF]"
                    >
                      <div>
                        <p className="font-semibold tabular-nums">
                          {money(payment.amount)}
                        </p>
                        <p className="mt-0.5 text-xs text-[#787774]">
                          {formatDate(payment.paidAt)}
                        </p>
                      </div>

                      <span className="text-xs text-[#787774]">
                        {payment.note || "Payment received"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-[#D9D9D5] py-12 text-center">
                  <IndianRupee
                    className="mx-auto mb-2 text-[#B4B4B0]"
                    size={22}
                  />
                  <p className="text-sm font-medium">
                    No payments recorded
                  </p>
                  <p className="mt-1 text-xs text-[#9B9A97]">
                    Add a fee payment to see its history here.
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === "reminders" && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <SectionTitle icon={Bell}>
                    Payment reminders
                  </SectionTitle>
                  <p className="-mt-1 text-xs text-[#9B9A97]">
                    Follow-up schedule for this batch
                  </p>
                </div>

                <span className="text-xs text-[#9B9A97]">
                  {reminders.length} reminder
                  {reminders.length === 1 ? "" : "s"}
                </span>
              </div>

              {remindersLoading ? (
                <div className="flex items-center justify-center py-12 text-sm text-[#787774]">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading reminders…
                </div>
              ) : reminders.length ? (
                <div className="rounded-md border border-[#E9E9E7]">
                  {reminders.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-3 px-3 py-3 hover:bg-[#F7F7F5] [&:not(:last-child)]:border-b [&:not(:last-child)]:border-[#F1F1EF]"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {formatDate(r.reminderAt)}{" "}
                          <span className="font-normal capitalize text-[#787774]">
                            · {r.frequency}
                          </span>
                        </p>

                        <p className="mt-0.5 truncate text-xs text-[#787774]">
                          <span className="capitalize">
                            {r.channel}
                          </span>
                          {" · "}
                          {r.status}
                          {r.note ? ` · ${r.note}` : ""}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          onDeleteReminder?.(r.id)
                        }
                        aria-label="Delete reminder"
                        className="rounded p-1.5 text-[#787774] hover:bg-[#FFE2DD] hover:text-[#C4554D]"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-[#D9D9D5] py-12 text-center">
                  <Bell
                    className="mx-auto mb-2 text-[#B4B4B0]"
                    size={22}
                  />
                  <p className="text-sm font-medium">
                    No reminders scheduled
                  </p>
                  <p className="mt-1 text-xs text-[#9B9A97]">
                    Set a fee reminder to see it listed here.
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === "sessions" && (
            <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
              <CalendarDays
                className="mb-3 text-[#C4C4BF]"
                size={28}
                strokeWidth={1.5}
              />
              <p className="text-sm font-medium text-[#5A5954]">
                Session details
              </p>
              <p className="mt-1 text-xs text-[#9B9A97]">
                No session information available yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------------- sub-components --------------------------- */

function Property({ icon: Icon, label, children }) {
  return (
    <div className="flex min-h-[32px] items-center gap-2 rounded px-1 text-sm hover:bg-[#F7F7F5]">
      <div className="flex w-36 shrink-0 items-center gap-2 text-[#787774]">
        <Icon size={15} strokeWidth={1.75} />
        <span>{label}</span>
      </div>
      <div className="min-w-0 flex-1 truncate">
        {children}
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, children, className = "" }) {
  return (
    <h3
      className={`mb-2 flex items-center gap-2 text-base font-semibold ${className}`}
    >
      <Icon
        size={16}
        strokeWidth={1.75}
        className="text-[#787774]"
      />
      {children}
    </h3>
  );
}

function Tag({ color, children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium leading-5 ${color} ${className}`}
    >
      {children}
    </span>
  );
}

function Muted({ children }) {
  return (
    <span className="text-sm text-[#B4B4B0]">
      {children}
    </span>
  );
}

function Stat({ label, value, tone = "" }) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs text-[#9B9A97]">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${tone}`}>
        {value}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "",
  className = "",
}) {
  return (
    <div className={className}>
      <p className="text-xs text-[#9B9A97]">{label}</p>
      <p className={`mt-1 text-base font-semibold tabular-nums ${tone}`}>
        {value}
      </p>
    </div>
  );
}
