"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  Phone,
  MessageCircle,
  FileText,
  User,
  Calendar,
  Loader2,
  Activity,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCcw,
} from "lucide-react";
import BackButton from "@/lib/BackButton";

const formatNumber = (num) => new Intl.NumberFormat("en-IN").format(num || 0);

const getTrendUI = (change = 0) => {
  if (change > 0)
    return {
      icon: TrendingUp,
      color: "bg-[#DBEDDB] text-[#1C3829]",
      text: `+${change}%`,
    };
  if (change < 0)
    return {
      icon: TrendingDown,
      color: "bg-[#FFE2DD] text-[#5D1715]",
      text: `${change}%`,
    };
  return {
    icon: Minus,
    color: "bg-[#E3E2E0] text-[#32302C]",
    text: "0%",
  };
};

const TYPE_STYLES = {
  CALL: {
    icon: Phone,
    className: "bg-[#D3E5EF] text-[#183347]",
    label: "Call",
  },
  WHATSAPP: {
    icon: MessageCircle,
    className: "bg-[#DBEDDB] text-[#1C3829]",
    label: "WhatsApp",
  },
  NOTE: {
    icon: FileText,
    className: "bg-[#FADEC9] text-[#49290E]",
    label: "Note",
  },
};

const getTypeConfig = (type) =>
  TYPE_STYLES[type] || {
    icon: FileText,
    className: "bg-[#E3E2E0] text-[#32302C]",
    label: "Unknown",
  };

const controlClass =
  "h-8 rounded-[4px] border border-[#E3E2E0] bg-white text-sm text-[#37352F] outline-none transition-colors placeholder:text-[#9B9A97] hover:bg-[rgba(55,53,47,0.03)] focus:border-[#2383E2] focus:ring-2 focus:ring-[#2383E2]/20";

export default function CustomerInteractions({ id }) {
  const [interactions, setInteractions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchInteractions = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${!id ? "/api/dashboard/interaction?limit=100" : `/api/dashboard/interaction/${id}?limit=100`}`
      );
      const json = await response.json();

      if (json.success) {
        setInteractions(json.data || []);
        setStats(json.stats || null);
      }
    } catch (error) {
      console.error("Failed to fetch interactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInteractions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter]);

  const filteredInteractions = useMemo(() => {
    return interactions.filter((item) => {
      const q = searchQuery.toLowerCase();

      const matchesSearch =
        (item.leadName || "").toLowerCase().includes(q) ||
        (item.phone || "").toLowerCase().includes(q) ||
        (item.counsellorName || "").toLowerCase().includes(q) ||
        (item.details || "").toLowerCase().includes(q);

      const matchesType =
        typeFilter === "ALL" || item.interactionType === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [interactions, searchQuery, typeFilter]);

  const totalPages = Math.ceil(filteredInteractions.length / itemsPerPage) || 1;

  const paginatedInteractions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInteractions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInteractions, currentPage]);

  return (
    <div className="min-h-screen w-full bg-white px-4 py-5 text-[#37352F] sm:px-6 lg:px-8">
      {/* Top actions */}
      <div className="mb-5 flex items-center gap-2">
        <BackButton />
        <button
          type="button"
          onClick={fetchInteractions}
          disabled={loading}
          className="inline-flex h-8 items-center gap-2 rounded-[4px] border border-[#E3E2E0] bg-white px-2.5 text-sm text-[#787774] transition-colors hover:bg-[rgba(55,53,47,0.06)] hover:text-[#37352F] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Page heading */}
      <div className="mb-5">
        <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em] sm:text-[30px]">
          Lead Interactions
        </h1>
        <p className="mt-1 text-sm text-[#787774]">
          A timeline of calls, WhatsApp messages, and notes.
        </p>
      </div>

      {/* Stats */}
      {!loading && stats && (
        <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatComboCard
            title="Total interactions"
            icon={Activity}
            allTime={stats.total}
            last7Days={stats.last7Days?.TOTAL}
            change={stats.comparison?.TOTAL?.change}
          />
          <StatComboCard
            title="Total calls"
            icon={Phone}
            allTime={stats.byType?.CALL}
            last7Days={stats.last7Days?.CALL}
            change={stats.comparison?.CALL?.change}
          />
          <StatComboCard
            title="WhatsApp sent"
            icon={MessageCircle}
            allTime={stats.byType?.WHATSAPP}
            last7Days={stats.last7Days?.WHATSAPP}
            change={stats.comparison?.WHATSAPP?.change}
          />
          <StatComboCard
            title="Notes added"
            icon={FileText}
            allTime={stats.byType?.NOTE}
            last7Days={stats.last7Days?.NOTE}
            change={stats.comparison?.NOTE?.change}
          />
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-3 flex flex-col gap-3 border-t border-[#E9E9E7] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-[#787774]">
          <Activity size={15} className="text-[#9B9A97]" />
          <span>All interactions</span>
          {!loading && (
            <span className="rounded-[3px] bg-[#F1F1EF] px-1.5 py-0.5 text-xs text-[#787774]">
              {filteredInteractions.length}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative sm:w-72">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9B9A97]"
            />
            <input
              type="text"
              placeholder="Search leads, phone, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${controlClass} w-full pl-8 pr-3`}
            />
          </div>

          <div className="relative sm:w-48">
            <Filter
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9B9A97]"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`${controlClass} w-full cursor-pointer appearance-none pl-8 pr-8`}
            >
              <option value="ALL">All interactions</option>
              <option value="CALL">Calls only</option>
              <option value="WHATSAPP">WhatsApp only</option>
              <option value="NOTE">Notes only</option>
            </select>
            <ChevronRight
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-[#9B9A97]"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-y border-[#E9E9E7] text-[#787774]">
              <th className="h-9 px-2 font-normal">
                <span className="flex items-center gap-1.5">
                  <Activity size={14} className="text-[#9B9A97]" />
                  Interaction
                </span>
              </th>
              <th className="h-9 px-2 font-normal">
                <span className="flex items-center gap-1.5">
                  <User size={14} className="text-[#9B9A97]" />
                  Lead details
                </span>
              </th>
              <th className="h-9 w-[30%] px-2 font-normal">Activity details</th>
              <th className="h-9 px-2 font-normal">Handled by</th>
              <th className="h-9 px-2 text-right font-normal">Date &amp; time</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-[#787774]">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-[#2383E2]" />
                    Loading interactions...
                  </span>
                </td>
              </tr>
            ) : paginatedInteractions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <Search size={24} className="mx-auto mb-2 text-[#C7C6C3]" />
                  <p className="text-sm font-medium text-[#37352F]">
                    No interactions found
                  </p>
                  <p className="mt-1 text-sm text-[#9B9A97]">
                    Try adjusting your search or filters.
                  </p>
                </td>
              </tr>
            ) : (
              paginatedInteractions.map((item) => {
                const config = getTypeConfig(item.interactionType);
                const Icon = config.icon;

                return (
                  <tr
                    key={item.id}
                    className="border-b border-[#E9E9E7] transition-colors hover:bg-[rgba(55,53,47,0.03)]"
                  >
                    <td className="px-2 py-2.5 align-top">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-[3px] px-1.5 py-0.5 text-xs leading-5 ${config.className}`}
                      >
                        <Icon size={13} />
                        {config.label}
                      </span>
                    </td>

                    <td className="max-w-[220px] px-2 py-2.5 align-top">
                      <p className="truncate font-medium text-[#37352F]">
                        {item.leadName || "Unknown lead"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[#787774]">
                        {item.phone || "—"}
                      </p>
                    </td>

                    <td className="max-w-[340px] px-2 py-2.5 align-top">
                      <p
                        className="truncate text-[#37352F]"
                        title={item.details || ""}
                      >
                        {item.details || "—"}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-2 py-2.5 align-top">
                      <div className="flex items-center gap-2 text-[#787774]">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F1F1EF] text-[#787774]">
                          <User size={13} />
                        </span>
                        <span className="text-sm">
                          {item.counsellorName || "Unassigned"}
                        </span>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-2 py-2.5 text-right align-top">
                      <span className="inline-flex items-center justify-end gap-1.5 text-[#787774]">
                        <Calendar size={13} className="text-[#9B9A97]" />
                        <span>
                          {item.timestamp
                            ? new Date(item.timestamp).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </span>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && filteredInteractions.length > 0 && (
        <div className="mt-3 flex flex-col gap-3 border-t border-[#E9E9E7] pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-[#9B9A97]">
            Showing{" "}
            <span className="text-[#37352F]">
              {(currentPage - 1) * itemsPerPage + 1}
            </span>{" "}
            to{" "}
            <span className="text-[#37352F]">
              {Math.min(currentPage * itemsPerPage, filteredInteractions.length)}
            </span>{" "}
            of <span className="text-[#37352F]">{filteredInteractions.length}</span>{" "}
            entries
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
              className="inline-flex h-7 w-8 items-center justify-center rounded-[4px] border border-[#E3E2E0] text-[#787774] transition-colors hover:bg-[rgba(55,53,47,0.06)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="px-2 text-[13px] text-[#787774]">
              Page <span className="text-[#37352F]">{currentPage}</span> of{" "}
              {totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              aria-label="Next page"
              className="inline-flex h-7 w-8 items-center justify-center rounded-[4px] border border-[#E3E2E0] text-[#787774] transition-colors hover:bg-[rgba(55,53,47,0.06)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatComboCard({ title, icon: Icon, allTime, last7Days, change }) {
  return (
    <div className="rounded-[6px] border border-[#E9E9E7] p-3.5 transition-colors hover:bg-[rgba(55,53,47,0.02)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] bg-[#F1F1EF] text-[#787774]">
            <Icon size={16} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#37352F]">{title}</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-wide text-[#9B9A97]">
              All time
            </p>
          </div>
        </div>
        <p className="text-xl font-semibold tabular-nums text-[#37352F]">
          {formatNumber(allTime)}
        </p>
      </div>

      <div className="mt-3 flex items-end justify-between border-t border-[#E9E9E7] pt-2.5">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-[#9B9A97]">
            Last 7 days
          </p>
          <p className="mt-0.5 text-base font-semibold tabular-nums text-[#37352F]">
            {formatNumber(last7Days)}
          </p>
        </div>
        {change !== undefined && change !== null && <TrendBadge change={change} />}
      </div>
    </div>
  );
}

function TrendBadge({ change }) {
  const { icon: Icon, color, text } = getTrendUI(change);

  return (
    <span
      title="Compared with the previous 7 days"
      className={`inline-flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[11px] font-medium ${color}`}
    >
      <Icon size={12} />
      {text}
    </span>
  );
}
