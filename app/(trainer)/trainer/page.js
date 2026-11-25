"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Layers,
  Wrench,
  Search,
  CalendarDays,
  Clock,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Table2,
  FileText,
  BookOpen
} from "lucide-react";
import toast from "react-hot-toast";

/* ---------- helpers ---------- */

const formatHours = (hours = 0) => {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
};

const formatDate = date => {
  if (!date) return "N/A";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const formatTime = time => {
  if (!time) return "N/A";
  const [hour, minute] = time.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return time;
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
};

/* ---------- Notion-style primitives ---------- */

// Notion's tag palette
const TAGS = {
  gray: "bg-[#e3e2e0] text-[#32302c]",
  blue: "bg-[#d3e5ef] text-[#183347]",
  green: "bg-[#dbeddb] text-[#1c3829]",
  orange: "bg-[#fadec9] text-[#49290e]",
  purple: "bg-[#e8deee] text-[#412454]",
  red: "bg-[#ffe2dd] text-[#5d1715]",
  yellow: "bg-[#fdecc8] text-[#402c1b]"
};

const Tag = ({ color = "gray", children }) => (
  <span
    className={`inline-block rounded-[3px] px-1.5 py-px text-[12px] leading-5 whitespace-nowrap ${TAGS[color]}`}
  >
    {children}
  </span>
);

const paymentColor = status => {
  const s = String(status || "").toLowerCase();
  if (["paid", "completed", "success"].some(k => s.includes(k))) return "green";
  if (["pending", "partial", "due"].some(k => s.includes(k))) return "orange";
  if (["failed", "overdue"].some(k => s.includes(k))) return "red";
  return "gray";
};

const Property = ({ icon: Icon, label, children }) => (
  <div className="shrink-0 px-4 first:pl-0 last:pr-0">
    <div className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-[#9b9a97]">
      <Icon size={14} strokeWidth={1.75} />
      {label}
    </div>
    <div className="mt-1 flex items-center gap-2 whitespace-nowrap text-[14px] text-[#37352f]">
      {children}
    </div>
  </div>
);

const Callout = ({ icon, tone = "gray", children }) => (
  <div
    className={`flex gap-3 rounded-[4px] p-4 text-[14px] ${
      tone === "red" ? "bg-[#fbe4e4] text-[#5d1715]" : "bg-[#f1f1ef] text-[#37352f]"
    }`}
  >
    <span className="text-lg leading-6">{icon}</span>
    <div className="flex-1">{children}</div>
  </div>
);

const SectionHeading = ({ children, hint }) => (
  <div className="mb-2 mt-10 flex items-baseline gap-3 border-b border-[#ededec] pb-1.5">
    <h2 className="text-[20px] font-semibold text-[#37352f]">{children}</h2>
    {hint && <span className="text-[13px] text-[#9b9a97]">{hint}</span>}
  </div>
);

function EmptyState({ message }) {
  return (
    <div className="py-10 text-center text-[14px] text-[#9b9a97]">
      <FileText className="mx-auto mb-2 text-[#c7c6c3]" size={28} strokeWidth={1.5} />
      {message}
    </div>
  );
}

const Th = ({ icon: Icon, children }) => (
  <th className="whitespace-nowrap border-b border-[#ededec] px-3 py-2 text-[13px] font-normal text-[#9b9a97]">
    <span className="flex items-center gap-1.5">
      {Icon && <Icon size={14} strokeWidth={1.75} />}
      {children}
    </span>
  </th>
);

/* ---------- page ---------- */

export default function TrainerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("batches");
  const [upcomingOpen, setUpcomingOpen] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/trainer/dashboard", { cache: "no-store" });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Unable to load dashboard");
      }
      setData(result);
    } catch (error) {
      toast.error(error.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const filteredStudents = useMemo(() => {
    const query = search.toLowerCase().trim();
    return (data?.students || []).filter(student =>
      [student.name, student.email, student.phone, student.batchName, student.courseName]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [data, search]);

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex items-center gap-2 text-[14px] text-[#9b9a97]">
          <RefreshCw className="animate-spin" size={15} />
          Loading dashboard…
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <button
          onClick={fetchDashboard}
          className="rounded-[4px] bg-[#2383e2] px-4 py-2 text-[14px] font-medium text-white hover:bg-[#0b6ec5]"
        >
          Retry loading dashboard
        </button>
      </div>
    );
  }

  const summary = data.summary || {};
  const todaySchedule = data.todaySchedule || [];
  const upcoming = Array.isArray(data.upcomingSessions) ? data.upcomingSessions : [];

  const tabs = [
    { id: "batches", label: "Batches", icon: Layers, count: data.batches?.length || 0 },
    { id: "students", label: "Students", icon: Users, count: data.students?.length || 0 },
    { id: "tools", label: "Tools", icon: Wrench, count: data.tools?.length || 0 }
  ];

  return (
    <main className="min-h-screen bg-white font-sans text-[#37352f] antialiased">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex h-11 items-center justify-between border-b border-[#ededec] bg-white/90 px-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-1.5 text-[14px] text-[#787774]">
          <span>Trainer Portal</span>
          <ChevronRight size={13} />
          <span className="text-[#37352f]">Dashboard</span>
        </div>

        <button
          onClick={fetchDashboard}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-[4px] px-2 py-1 text-[14px] text-[#787774] hover:bg-[#efefed] disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="mx-auto px-4 pb-24 pt-4 sm:px-12">
        <h1 className="mt-4 text-[22px] font-bold leading-tight tracking-tight sm:text-[28px]">
          Welcome, {data.trainer?.name || "Trainer"}
        </h1>
        <p className="mt-1 text-[16px] text-[#787774]">
          Your batches, classes and students in one place.
        </p>

        {/* Properties */}
        <div className="mt-6 flex items-start divide-x divide-[#ededec] overflow-x-auto border-y border-[#ededec] py-3">
          <Property icon={Layers} label="Batches">
            {summary.totalBatches || 0}
            <Tag color="green">{summary.activeBatches || 0} active</Tag>
          </Property>
          <Property icon={Users} label="Students">
            {summary.totalStudents || 0}
          </Property>
          <Property icon={BookOpen} label="Courses">
            {summary.totalCourses || 0}
          </Property>
          <Property icon={Wrench} label="Tools">
            {summary.totalTools || 0}
          </Property>
          <Property icon={CalendarDays} label="Upcoming sessions">
            {upcoming.length || (typeof summary.upcomingSessions === "number" ? summary.upcomingSessions : 0)}
          </Property>
        </div>

        {/* Conflicts */}
        {data.conflicts?.length > 0 && (
          <div className="mt-6">
            <Callout icon={<AlertTriangle size={20} className="mt-0.5 text-[#e03e3e]" />} tone="red">
              <p className="font-semibold">Schedule conflicts</p>
              {data.conflicts.map((conflict, index) => (
                <p key={index} className="mt-1">
                  {conflict.batchNames.join(" and ")} overlap on {formatDate(conflict.date)}.
                </p>
              ))}
            </Callout>
          </div>
        )}

        {/* Workload: three columns */}
        <SectionHeading hint="Scheduled teaching hours">Workload</SectionHeading>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              label: "Today",
              value: formatHours(summary.todayHours),
              note: `${summary.todayClasses || 0} sessions`,
              tag: "orange",
              range: formatDate(data.periods?.today)
            },
            {
              label: "This week",
              value: formatHours(summary.weeklyHours),
              note: `${summary.weeklyClasses || 0} batch days`,
              tag: "blue",
              range: `${formatDate(data.periods?.weekStart)} – ${formatDate(data.periods?.weekEnd)}`
            },
            {
              label: "This month",
              value: formatHours(summary.monthlyHours),
              note: "Scheduled",
              tag: "purple",
              range: `${formatDate(data.periods?.monthStart)} – ${formatDate(data.periods?.monthEnd)}`
            }
          ].map(item => (
            <div
              key={item.label}
              className="rounded-[4px] border border-[#e9e9e7] p-4 hover:bg-[#fbfbfa]"
            >
              <Tag color={item.tag}>{item.label}</Tag>
              <p className="mt-3 text-[28px] font-semibold leading-none">{item.value}</p>
              <p className="mt-2 text-[13px] text-[#787774]">{item.note}</p>
              <p className="mt-0.5 text-[12px] text-[#9b9a97]">{item.range}</p>
            </div>
          ))}
        </div>

        {/* Today */}
        <SectionHeading hint={formatDate(data.periods?.today)}>Today</SectionHeading>
        {todaySchedule.length ? (
          <div>
            {todaySchedule.map(item => (
              <div
                key={`${item.batchId}-${item.date}`}
                className="flex items-start gap-4 rounded-[4px] px-2 py-3 hover:bg-[#f7f7f5]"
              >
                <div className="w-24 shrink-0 text-[13px] leading-5 text-[#787774]">
                  <p className="text-[#37352f]">{formatTime(item.startTime)}</p>
                  <p>{formatTime(item.endTime)}</p>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium">{item.batchName}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {item.tools?.map(tool => (
                      <Tag key={tool._id} color="blue">
                        {tool.shortName || tool.name}
                      </Tag>
                    ))}
                    <span className="text-[12px] leading-5 text-[#9b9a97]">
                      {formatHours(item.duration)}
                    </span>
                  </div>
                </div>

                <Tag color={item.statuses?.includes("ongoing") ? "green" : "gray"}>
                  {item.statuses?.includes("ongoing") ? "Ongoing" : "Scheduled"}
                </Tag>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="Nothing scheduled today." />
        )}

        {/* Upcoming: toggle block */}
        <div className="mt-8">
          <button
            onClick={() => setUpcomingOpen(o => !o)}
            className="flex w-full items-center gap-1.5 rounded-[4px] px-1 py-1 text-left text-[16px] font-semibold hover:bg-[#f7f7f5]"
          >
            {upcomingOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            Upcoming sessions
            <span className="text-[13px] font-normal text-[#9b9a97]">{upcoming.length}</span>
          </button>

          {upcomingOpen && (
            <div className="ml-[22px] mt-1 border-l border-[#ededec] pl-4">
              {upcoming.length ? (
                upcoming.map(item => (
                  <div key={item._id} className="py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14px] font-medium">{item.batchName}</p>
                      <Tag color="gray">
                        {item.tool?.shortName || item.tool?.name || "Training"}
                      </Tag>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-[#787774]">
                      <CalendarDays size={13} />
                      {formatDate(item.startDate)}
                      <ChevronRight size={11} />
                      {formatDate(item.endDate)}
                      <span className="mx-1 text-[#d3d2cf]">|</span>
                      <Clock size={13} />
                      {formatTime(item.startTime)} – {formatTime(item.endTime)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="py-3 text-[14px] text-[#9b9a97]">No upcoming sessions.</p>
              )}
            </div>
          )}
        </div>

        {/* Database views */}
        <SectionHeading>My workspace</SectionHeading>

        <div className="flex items-center gap-1 border-b border-[#ededec]">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`-mb-px flex items-center gap-1.5 border-b-2 px-2.5 py-2 text-[14px] ${
                  active
                    ? "border-[#37352f] text-[#37352f]"
                    : "border-transparent text-[#9b9a97] hover:text-[#37352f]"
                }`}
              >
                <Icon size={15} strokeWidth={1.75} />
                {tab.label}
                <span className="text-[12px] text-[#9b9a97]">{tab.count}</span>
              </button>
            );
          })}
        </div>

        {/* Batches */}
        {activeTab === "batches" && (
          <div className="overflow-x-auto">
            {data.batches?.length ? (
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr>
                    <Th icon={FileText}>Batch</Th>
                    <Th>Course</Th>
                    <Th icon={Clock}>Time</Th>
                    <Th>Students</Th>
                    <Th>Sessions</Th>
                    <Th>Hours</Th>
                    <Th>Tools</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.batches.map(batch => (
                    <tr key={batch._id} className="hover:bg-[#f7f7f5]">
                      <td className="border-b border-[#f1f1ef] px-3 py-2.5">
                        <p className="text-[14px] font-medium">{batch.name}</p>
                        <p className="text-[12px] text-[#9b9a97]">
                          Started {formatDate(batch.startingDate)}
                        </p>
                      </td>
                      <td className="border-b border-[#f1f1ef] px-3 py-2.5 text-[14px]">
                        {batch.course?.name ? <Tag color="purple">{batch.course.name}</Tag> : "N/A"}
                      </td>
                      <td className="whitespace-nowrap border-b border-[#f1f1ef] px-3 py-2.5 text-[13px] text-[#787774]">
                        {formatTime(batch.startingTime)} – {formatTime(batch.endingTime)}
                      </td>
                      <td className="border-b border-[#f1f1ef] px-3 py-2.5 text-[14px]">
                        {(data.students || []).filter(s => s.batchId === batch._id.toString()).length}
                      </td>
                      <td className="border-b border-[#f1f1ef] px-3 py-2.5 text-[14px]">
                        {batch.sessionCount}
                      </td>
                      <td className="border-b border-[#f1f1ef] px-3 py-2.5 text-[14px]">
                        {formatHours(batch.scheduledHours)}
                      </td>
                      <td className="border-b border-[#f1f1ef] px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {batch.tools?.map(tool => (
                            <Tag key={tool._id}>{tool.shortName || tool.name}</Tag>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState message="No batches assigned yet." />
            )}
          </div>
        )}

        {/* Students */}
        {activeTab === "students" && (
          <div>
            <div className="relative my-3 max-w-xs">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9b9a97]"
                size={15}
              />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search students…"
                className="w-full rounded-[4px] bg-[#f7f7f5] py-1.5 pl-8 pr-3 text-[14px] outline-none placeholder:text-[#b8b7b4] focus:bg-white focus:ring-2 focus:ring-[#2383e2]/40"
              />
            </div>

            <div className="overflow-x-auto">
              {filteredStudents.length ? (
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr>
                      <Th icon={FileText}>Student</Th>
                      <Th>Phone</Th>
                      <Th>Batch</Th>
                      <Th>Course</Th>
                      <Th>Payment</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(student => (
                      <tr
                        key={`${student.studentId}-${student.batchId}`}
                        className="hover:bg-[#f7f7f5]"
                      >
                        <td className="border-b border-[#f1f1ef] px-3 py-2.5">
                          <p className="text-[14px] font-medium">{student.name}</p>
                          <p className="text-[12px] text-[#9b9a97]">{student.email}</p>
                        </td>
                        <td className="border-b border-[#f1f1ef] px-3 py-2.5 text-[14px] text-[#787774]">
                          {student.phone || "N/A"}
                        </td>
                        <td className="border-b border-[#f1f1ef] px-3 py-2.5 text-[14px]">
                          {student.batchName}
                        </td>
                        <td className="border-b border-[#f1f1ef] px-3 py-2.5 text-[14px]">
                          {student.courseName}
                        </td>
                        <td className="border-b border-[#f1f1ef] px-3 py-2.5">
                          <Tag color={paymentColor(student.paymentStatus)}>
                            {student.paymentStatus}
                          </Tag>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState message="No students match your search." />
              )}
            </div>
          </div>
        )}

        {/* Tools: gallery view */}
        {activeTab === "tools" && (
          <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.toolWorkload?.length ? (
              data.toolWorkload.map(tool => (
                <div
                  key={tool._id}
                  className="rounded-[4px] border border-[#e9e9e7] p-4 hover:bg-[#fbfbfa]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-[#f1f1ef] text-[#787774]">
                      <Wrench size={16} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium">{tool.name}</p>
                      <p className="text-[12px] text-[#9b9a97]">{tool.shortName}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#f1f1ef] pt-3">
                    {[
                      ["Batches", tool.batchCount],
                      ["Sessions", tool.sessionCount],
                      ["Hours", formatHours(tool.scheduledHours)]
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-[16px] font-semibold">{value}</p>
                        <p className="text-[12px] text-[#9b9a97]">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full">
                <EmptyState message="No tools assigned yet." />
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}