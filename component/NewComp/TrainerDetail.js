"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Clock,
  CalendarDays,
  BookOpen,
  Users,
  Wrench,
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";

/* ---------- helpers (unchanged) ---------- */

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(`${String(date).slice(0, 10)}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
};

function todaySessionsCount(data) {
  return (
    (data.currentSessions?.length || 0) +
    (data.upcomingSessions?.filter((session) => session.isUpcomingToday)
      .length || 0)
  );
}

/* ---------- Notion-style tokens ----------
   text #37352f · muted #787774 · faint #9b9a97
   border rgba(55,53,47,0.09) · hover rgba(55,53,47,0.06)
------------------------------------------- */

const TAG = {
  gray: "bg-[#e3e2e0] text-[#32302c]",
  green: "bg-[#dbeddb] text-[#1c3829]",
  blue: "bg-[#d3e5ef] text-[#183347]",
  red: "bg-[#ffe2dd] text-[#5d1715]",
};

function Tag({ color = "gray", children }) {
  return (
    <span
      className={`inline-flex items-center rounded-[3px] px-1.5 py-0.5 text-[13px] leading-[1.3] ${TAG[color]}`}
    >
      {children}
    </span>
  );
}

function SectionTitle({ children, count }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <h2 className="text-base font-semibold text-[#37352f]">{children}</h2>
      {count !== undefined && (
        <span className="text-sm text-[#9b9a97]">{count}</span>
      )}
    </div>
  );
}

function IconButton({ onClick, label, children }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="inline-flex items-center gap-1.5 rounded-[4px] px-2 py-1 text-sm text-[#787774] transition-colors hover:bg-[rgba(55,53,47,0.06)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2383e2]"
    >
      {children}
    </button>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="px-4 py-3 first:pl-0">
      <div className="flex items-center gap-1.5 text-[13px] text-[#787774]">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <p className="mt-1 text-2xl font-semibold text-[#37352f]">
        {value ?? 0}
      </p>
    </div>
  );
}

function StatRow({ children, cols = "sm:grid-cols-4" }) {
  return (
    <div
      className={`grid grid-cols-2 divide-[rgba(55,53,47,0.09)] border-y border-[rgba(55,53,47,0.09)] sm:divide-x ${cols}`}
    >
      {children}
    </div>
  );
}

function SessionRow({ session }) {
  const status = session.isBusyNow
    ? { color: "red", label: "Currently Teaching" }
    : session.isUpcomingToday
    ? { color: "blue", label: "Upcoming Today" }
    : { color: "gray", label: "Upcoming" };

  return (
    <div className="-mx-2 rounded-[4px] px-2 py-3 transition-colors hover:bg-[rgba(55,53,47,0.06)]">
      <div className="flex flex-wrap items-center gap-1.5">
        <BookOpen className="h-4 w-4 text-[#9b9a97]" />
        <span className="font-medium text-[#37352f]">
          {session.batch?.name || "Batch"}
        </span>
        <Tag color={status.color}>{status.label}</Tag>
      </div>

      <p className="mt-1 pl-[22px] text-sm text-[#787774]">
        {session.batch?.course?.name || "Course"}
      </p>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 pl-[22px] text-[13px] text-[#787774]">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDate(session.date)}
          {session.endDate &&
            session.endDate !== session.date &&
            ` - ${formatDate(session.endDate)}`}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {session.timeRange}
        </span>
        <span className="flex items-center gap-1.5">
          <Wrench className="h-3.5 w-3.5" />
          {session.tool?.name || "Tool"}
        </span>
        <span className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5" />
          {session.durationFormatted}
        </span>
      </div>

      {session.isBusyNow && (
        <div className="ml-[22px] mt-2 rounded-[4px] bg-[#fdebec] px-3 py-2 text-sm text-[#37352f]">
          Busy until {session.endingTimeFormatted}
          <span className="text-[#787774]">
            {" "}
            · {session.remainingBusyFormatted} remaining
          </span>
        </div>
      )}
    </div>
  );
}

function SessionList({ items }) {
  return (
    <div className="divide-y divide-[rgba(55,53,47,0.09)]">
      {items.map((session) => (
        <SessionRow key={session._id} session={session} />
      ))}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex items-center gap-3 rounded-[4px] bg-[#f7f6f3] px-4 py-3 text-sm text-[#787774]">
      <CalendarDays className="h-4 w-4 text-[#9b9a97]" />
      {message}
    </div>
  );
}

/* ---------- main component ---------- */

export default function TrainerDetail({ trainerId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const fetchTrainer = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/trainers/${trainerId}`, {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to fetch trainer");
      }

      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (trainerId) fetchTrainer();
  }, [trainerId]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#9b9a97]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[4px] bg-[#fdebec] p-4 text-sm text-[#37352f]">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-[#e03e3e]" />
          <div>
            <p className="font-medium">{error}</p>
            <button
              onClick={fetchTrainer}
              className="mt-3 rounded-[4px] border border-[rgba(55,53,47,0.16)] bg-white px-3 py-1 hover:bg-[rgba(55,53,47,0.06)]"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const trainer = data.trainer;
  const stats = data.stats || {};
  const occupancy = data.occupancy || {};

  const tabs = ["overview", "batches", "occupancy", "attendance"];

  return (
    <div className=" space-y-8 text-[#37352f] px-8">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm text-[#787774]">
          {onBack && (
            <IconButton onClick={onBack} label="Back">
              <ArrowLeft className="h-4 w-4" />
            </IconButton>
          )}
          <span>Trainers</span>
          <span className="text-[#9b9a97]">/</span>
          <span className="text-[#37352f]">{trainer?.name}</span>
        </div>

        <IconButton onClick={fetchTrainer} label="Refresh">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </IconButton>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-4xl font-bold leading-tight text-[#37352f]">
          {trainer?.name}
        </h1>
        <p className="mt-1 text-sm text-[#787774]">
          Trainer details and teaching schedule
        </p>
      </div>

      {/* Occupancy callout */}
      <div
        className={`flex gap-3 rounded-[4px] p-4 ${
          occupancy.isOccupied ? "bg-[#fdebec]" : "bg-[#edf3ec]"
        }`}
      >
        {occupancy.isOccupied ? (
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#e03e3e]" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#448361]" />
        )}

        <div className="text-sm">
          <p className="font-medium">
            {occupancy.isOccupied
              ? "Trainer is currently busy"
              : "Trainer is currently available"}
          </p>

          {occupancy.isOccupied && (
            <p className="mt-0.5 text-[#787774]">
              Busy from {occupancy.busyFrom || "—"} until{" "}
              {occupancy.busyUntil || "—"}
            </p>
          )}

          {!occupancy.isOccupied && occupancy.upcomingSessions?.length > 0 && (
            <p className="mt-0.5 text-[#787774]">
              Next session:{" "}
              {occupancy.upcomingSessions[0].startingTimeFormatted} -{" "}
              {occupancy.upcomingSessions[0].endingTimeFormatted}
            </p>
          )}

          <p className="mt-1 text-xs text-[#9b9a97]">
            {data.currentTime} · {data.today}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="-mt-3 overflow-x-auto border-b border-[rgba(55,53,47,0.09)]">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`-mb-px border-b-2 px-2 py-2 text-sm capitalize transition-colors ${
                activeTab === tab
                  ? "border-[#37352f] font-medium text-[#37352f]"
                  : "border-transparent text-[#787774] hover:bg-[rgba(55,53,47,0.06)]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          <StatRow cols="sm:grid-cols-5">
            <Stat label="Teaching today" value={stats.todayTeachingTime || "0m"} icon={Clock} />
            <Stat label="Total batches" value={stats.totalBatches} icon={BookOpen} />
            <Stat label="Active batches" value={stats.activeBatches} icon={Activity} />
            <Stat label="Upcoming batches" value={stats.upcomingBatches} icon={CalendarDays} />
            <Stat label="Today's sessions" value={todaySessionsCount(data)} icon={Users} />
          </StatRow>
          <p className="-mt-6 text-xs text-[#9b9a97]">
            Teaching time counts overlapping sessions only once.
          </p>

          <section>
            <SectionTitle>Currently teaching</SectionTitle>
            {data.currentSessions?.length ? (
              <SessionList items={data.currentSessions} />
            ) : (
              <EmptyState message="No session currently in progress" />
            )}
          </section>

          <section>
            <SectionTitle>Upcoming sessions</SectionTitle>
            {data.upcomingSessions?.length ? (
              <SessionList items={data.upcomingSessions.slice(0, 5)} />
            ) : (
              <EmptyState message="No upcoming sessions" />
            )}
          </section>

          <section>
            <SectionTitle>Trainer tools</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {(data.tools || []).map((item) => (
                <Tag key={item.toolId}>{item.tool?.name}</Tag>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Batches */}
      {activeTab === "batches" && (
        <section>
          <SectionTitle count={(data.batches || []).length}>
            Assigned batches
          </SectionTitle>

          <div className="divide-y divide-[rgba(55,53,47,0.09)]">
            {(data.batches || []).map((batch) => (
              <div key={batch._id} className="py-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-[#9b9a97]" />
                  <span className="font-medium">{batch.name}</span>
                  {batch.isCurrentlyTeaching && <Tag color="red">Teaching</Tag>}
                </div>

                <p className="mt-1 pl-[22px] text-sm text-[#787774]">
                  {batch.course?.name || "Course"}
                </p>

                <div className="mt-2 flex flex-wrap gap-1.5 pl-[22px]">
                  <Tag>
                    {batch.startingTimeFormatted || batch.startingTime || "—"} -{" "}
                    {batch.endingTimeFormatted || batch.endingTime || "—"}
                  </Tag>
                  <Tag>{batch.activeSessionCount} active sessions</Tag>
                  <Tag>{batch.upcomingSessionCount} upcoming</Tag>
                </div>

                {batch.trainerTools?.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-[22px]">
                    <Wrench className="h-3.5 w-3.5 text-[#9b9a97]" />
                    {batch.trainerTools.map((item) => (
                      <Tag key={item.toolId}>{item.tool?.name}</Tag>
                    ))}
                  </div>
                )}

                {batch.sessions?.length > 0 && (
                  <div className="ml-[22px] mt-3 border-l-2 border-[rgba(55,53,47,0.09)] pl-4">
                    <SessionList items={batch.sessions} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Occupancy */}
      {activeTab === "occupancy" && (
        <div className="space-y-8">
          <StatRow cols="sm:grid-cols-4">
            <Stat label="Current sessions" value={occupancy.totalActiveSessions} icon={Activity} />
            <Stat label="Upcoming sessions" value={occupancy.totalUpcomingSessions} icon={CalendarDays} />
            <Stat label="Teaching today" value={stats.todayTeachingTime} icon={Clock} />
            <Stat label="Assigned tools" value={stats.totalTools} icon={Wrench} />
          </StatRow>

          <section>
            <SectionTitle>Current occupancy</SectionTitle>
            {occupancy.currentSessions?.length ? (
              <SessionList items={occupancy.currentSessions} />
            ) : (
              <EmptyState message="Trainer is available right now" />
            )}
          </section>

          <section>
            <SectionTitle>Upcoming schedule</SectionTitle>
            {occupancy.upcomingSessions?.length ? (
              <SessionList items={occupancy.upcomingSessions} />
            ) : (
              <EmptyState message="No upcoming sessions" />
            )}
          </section>
        </div>
      )}

      {/* Attendance placeholder */}
      {activeTab === "attendance" && (
        <EmptyState message="Attendance module can be connected here" />
      )}
    </div>
  );
}