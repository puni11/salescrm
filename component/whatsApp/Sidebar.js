"use client";

import { useState, useEffect, useRef, useCallback } from "react";

import {
  Search,
  RefreshCw,
  Inbox,
  Check,
  CheckCheck,
  Loader2,
  X,
  CalendarDays,
  Image as ImageIcon,
  Video,
  FileText,
  Mic,
} from "lucide-react";

const PER_PAGE = 50;

// ----------------------------------
// Helpers (outside component: no re-creation on render)
// ----------------------------------

const toISODate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
};

const PRESETS = [
  { label: "Today", range: () => [daysAgo(0), daysAgo(0)] },
  { label: "Yesterday", range: () => [daysAgo(1), daysAgo(1)] },
  { label: "Last 7 days", range: () => [daysAgo(6), daysAgo(0)] },
  { label: "Last 30 days", range: () => [daysAgo(29), daysAgo(0)] },
];

const formatShortDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });

const AVATAR_COLORS = [
  "#DFE5E7",
  "#D9E8F5",
  "#E3F1DF",
  "#F5E6D3",
  "#EBDDF2",
  "#F7DDE0",
  "#D8F0EC",
];

const getAvatarColor = (name = "") => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % 997;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const getInitials = (name = "U") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "U";

// WhatsApp style: time today, "Yesterday", weekday this week, else dd/mm/yyyy
const getListTime = (contact) => {
  const timestamp =
    Number(contact.lastChatTime) || Number(contact.messageTime);

  let date = null;

  if (timestamp) {
    date = new Date(timestamp * 1000);
  } else if (contact.createdAt) {
    date = new Date(contact.createdAt.replace(" ", "T"));
  }

  if (!date || Number.isNaN(date.getTime())) return "";

  const startOf = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const diffDays = Math.round(
    (startOf(new Date()) - startOf(date)) / 86400000
  );

  if (diffDays <= 0) {
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (diffDays === 1) return "Yesterday";

  if (diffDays < 7) {
    return date.toLocaleDateString("en-IN", { weekday: "long" });
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getStatusIcon = (contact) => {
  const status = String(contact.messageStatus || "").toLowerCase();

  if (status === "read") {
    return <CheckCheck size={16} className="shrink-0 text-[#53BDEB]" />;
  }

  if (status === "delivered") {
    return <CheckCheck size={16} className="shrink-0 text-[#8696A0]" />;
  }

  if (status === "sent") {
    return <Check size={16} className="shrink-0 text-[#8696A0]" />;
  }

  return null;
};

const MEDIA_LABELS = {
  image: { label: "Photo", Icon: ImageIcon },
  video: { label: "Video", Icon: Video },
  document: { label: "Document", Icon: FileText },
  audio: { label: "Audio", Icon: Mic },
};

const renderPreview = (contact) => {
  if (contact.message) return contact.message;

  const media = MEDIA_LABELS[String(contact.messageType || "").toLowerCase()];

  if (media) {
    return (
      <span className="inline-flex items-center gap-1">
        <media.Icon size={14} className="shrink-0" />
        {media.label}
      </span>
    );
  }

  return contact.mobile || "No messages yet";
};

// ----------------------------------
// Component
// ----------------------------------

export default function WhatsAppSidebar({ selectedContact, onSelectContact }) {
  const [contacts, setContacts] = useState([]);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [filter, setFilter] = useState("all"); // all | unread (client-side)

  // Pagination
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // Status
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState("");

  const [isVisible, setIsVisible] = useState(false);
  const [enabled, setEnabled] = useState(false); // becomes true on first visibility
  const [hasFetched, setHasFetched] = useState(false);

  const sidebarRef = useRef(null);
  const listRef = useRef(null);
  const observerRef = useRef(null);

  // Guards (refs don't cause re-renders or change callback identity)
  const isFetchingRef = useRef(false);
  const abortRef = useRef(null);
  const requestIdRef = useRef(0);
  const requestedPagesRef = useRef(new Set());
  const lastPageRef = useRef(1);
  const filtersKeyRef = useRef("");
  const filtersRef = useRef({ search: "", from: "", to: "" });

  // Always hold the latest filters for the stable fetch function
  filtersRef.current = {
    search: debouncedSearch,
    from: fromDate,
    to: toDate,
  };

  const hasActiveFilters = Boolean(debouncedSearch || fromDate || toDate);

  // ----------------------------------
  // 1. Detect sidebar visibility
  // ----------------------------------

  useEffect(() => {
    const element = sidebarRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.05 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible) setEnabled(true);
  }, [isVisible]);

  // ----------------------------------
  // 2. Debounce search input
  // ----------------------------------

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  // ----------------------------------
  // 3. Fetch contacts (stable identity)
  //    Hits /api/whatsapp/panelHistory, which forwards to
  //    inbox-fast when search / from_date / to_date are present.
  // ----------------------------------

  const fetchContacts = useCallback(async (pageNumber = 1, reset = false) => {
    const { search: q, from, to } = filtersRef.current;
    const filtersKey = `${q}|${from}|${to}`;

    // A reset (search/date change) replaces any request already in progress.
    if (reset) {
      abortRef.current?.abort();
      requestIdRef.current += 1; // invalidate the previous request immediately
      isFetchingRef.current = false;
      requestedPagesRef.current.clear();
      filtersKeyRef.current = filtersKey;
      lastPageRef.current = 1;
      setPage(1);
      setLastPage(1);
      setHasFetched(false);
      setContacts([]);
    } else {
      // Never fetch while another page is loading, beyond the final page,
      // or more than once for the same page.
      if (isFetchingRef.current) return;
      if (pageNumber > lastPageRef.current) return;
      if (requestedPagesRef.current.has(pageNumber)) return;
      if (filtersKeyRef.current !== filtersKey) return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;

    requestedPagesRef.current.add(pageNumber);
    isFetchingRef.current = true;
    setLoading(true);
    setError("");

    if (pageNumber === 1) setInitialLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(pageNumber),
        per_page: String(PER_PAGE),
      });

      if (q) params.set("search", q);
      if (from) params.set("from_date", from);
      if (to) params.set("to_date", to);

      const response = await fetch(
        `/api/whatsapp/panelHistory?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        }
      );

      const result = await response.json();

      // Ignore stale responses after a filter change or newer request.
      if (requestId !== requestIdRef.current) return;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load contacts");
      }

      const users = Array.isArray(result.users) ? result.users : [];
      const currentPage = Math.max(
        1,
        Number(result.pagination?.currentPage || pageNumber)
      );
      const totalPages = Math.max(
        1,
        Number(result.pagination?.lastPage || 1)
      );

      // Update the ref synchronously so the observer cannot request beyond it.
      lastPageRef.current = totalPages;

      setContacts((previous) => {
        if (pageNumber === 1) return users;

        const existingIds = new Set(previous.map((item) => String(item.id)));
        const newUsers = users.filter(
          (item) => !existingIds.has(String(item.id))
        );

        return [...previous, ...newUsers];
      });

      setPage(currentPage);
      setLastPage(totalPages);
      setHasFetched(true);
    } catch (err) {
      if (err.name === "AbortError" || requestId !== requestIdRef.current) {
        return;
      }

      // Let the user retry this page after a genuine failure.
      requestedPagesRef.current.delete(pageNumber);
      console.error(err);
      setError(err.message || "Something went wrong");
    } finally {
      if (requestId === requestIdRef.current) {
        isFetchingRef.current = false;
        setLoading(false);
        setInitialLoading(false);
      }
    }
  }, []);

  // ----------------------------------
  // 4. Fetch on first visibility and whenever search / dates change.
  //    Failures do NOT retry automatically (deps don't change).
  // ----------------------------------

  useEffect(() => {
    if (!enabled) return;
    fetchContacts(1, true);
  }, [enabled, debouncedSearch, fromDate, toDate, fetchContacts]);

  // Cancel any in-flight request on unmount
  useEffect(() => () => {
    requestIdRef.current += 1;
    abortRef.current?.abort();
    isFetchingRef.current = false;
  }, []);

  // ----------------------------------
  // 5. Load more (infinite scroll)
  // ----------------------------------

  const loadMore = useCallback(() => {
    if (isFetchingRef.current || !hasFetched || error) return;
    if (page >= lastPageRef.current) return;

    const nextPage = page + 1;
    if (requestedPagesRef.current.has(nextPage)) return;

    fetchContacts(nextPage);
  }, [hasFetched, error, page, fetchContacts]);

  useEffect(() => {
    const root = listRef.current;
    const target = observerRef.current;

    if (!root || !target || !isVisible) return;
    if (!hasFetched || loading || initialLoading || error) return;
    if (page >= lastPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { root, rootMargin: "100px", threshold: 0 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [
    isVisible,
    hasFetched,
    loading,
    initialLoading,
    error,
    page,
    lastPage,
    loadMore,
    contacts.length,
  ]);

  // ----------------------------------
  // 6. Unread filter (client-side only; search and dates are server-side)
  // ----------------------------------

  const visibleContacts =
    filter === "unread"
      ? contacts.filter((contact) => contact.unreadCount > 0)
      : contacts;

  // ----------------------------------
  // 7. Actions
  // ----------------------------------

  const retry = () => {
    fetchContacts(1, true);
  };

  const applyPreset = (preset) => {
    const [from, to] = preset.range();
    setFromDate(from);
    setToDate(to);
  };

  const clearDates = () => {
    setFromDate("");
    setToDate("");
  };

  const clearAllFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    clearDates();
    setShowDateFilter(false);
  };

  const dateLabel = (() => {
    if (fromDate && toDate) {
      return fromDate === toDate
        ? formatShortDate(fromDate)
        : `${formatShortDate(fromDate)} - ${formatShortDate(toDate)}`;
    }
    if (fromDate) return `From ${formatShortDate(fromDate)}`;
    if (toDate) return `Until ${formatShortDate(toDate)}`;
    return "Date";
  })();

  const hasDates = Boolean(fromDate || toDate);

  const chipBase =
    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] transition";
  const chipActive = "bg-[#D9FDD3] text-[#0A332C]";
  const chipIdle = "bg-[#F0F2F5] text-[#54656F] hover:bg-[#E6E8EA]";

  // ----------------------------------
  // 8. UI
  // ----------------------------------

  return (
    <div
      ref={sidebarRef}
      className="flex h-full min-h-0 w-full flex-col bg-white"
    >
      {/* Header */}
      <div className="px-4 pb-2 pt-4">
        <h2 className="text-[22px] font-bold tracking-tight text-[#111B21]">
          Chats
        </h2>

        {/* Search */}
        <div className="mt-3 flex h-[35px] items-center gap-3 rounded-lg bg-[#F0F2F5] px-3 transition focus-within:ring-2 focus-within:ring-[#25D366]/40">
          {loading && hasActiveFilters ? (
            <Loader2
              size={16}
              className="shrink-0 animate-spin text-[#25D366]"
            />
          ) : (
            <Search size={16} className="shrink-0 text-[#54656F]" />
          )}

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={100}
            placeholder="Search name or number"
            className="w-full bg-transparent text-[14px] text-[#111B21] outline-none placeholder:text-[#667781]"
          />

          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-[#54656F] hover:text-[#111B21]"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`${chipBase} ${filter === "all" ? chipActive : chipIdle}`}
          >
            All
          </button>

          <button
            onClick={() => setFilter("unread")}
            className={`${chipBase} ${
              filter === "unread" ? chipActive : chipIdle
            }`}
          >
            Unread
          </button>

          <button
            onClick={() => setShowDateFilter((prev) => !prev)}
            className={`${chipBase} ${
              hasDates || showDateFilter ? chipActive : chipIdle
            }`}
          >
            <CalendarDays size={14} />
            {dateLabel}
          </button>

          {hasDates && (
            <button
              onClick={clearDates}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[#54656F] hover:bg-[#F0F2F5]"
              aria-label="Clear dates"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Date filter panel */}
        {showDateFilter && (
          <div className="mt-3 rounded-xl border border-[#E9EDEF] bg-white p-3 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => {
                const [from, to] = preset.range();
                const isActive = fromDate === from && toDate === to;

                return (
                  <button
                    key={preset.label}
                    onClick={() => applyPreset(preset)}
                    className={`rounded-full px-3 py-1 text-[12px] transition ${
                      isActive ? chipActive : chipIdle
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-[12px] text-[#667781]">
                  From
                </span>
                <input
                  type="date"
                  value={fromDate}
                  max={toDate || undefined}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-9 w-full rounded-lg bg-[#F0F2F5] px-2 text-[13px] text-[#111B21] outline-none focus:ring-2 focus:ring-[#25D366]/40"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[12px] text-[#667781]">
                  To
                </span>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-9 w-full rounded-lg bg-[#F0F2F5] px-2 text-[13px] text-[#111B21] outline-none focus:ring-2 focus:ring-[#25D366]/40"
                />
              </label>
            </div>

            <div className="mt-3 flex justify-end gap-2">
              {hasDates && (
                <button
                  onClick={clearDates}
                  className="rounded-full px-3 py-1.5 text-[13px] text-[#54656F] hover:bg-[#F0F2F5]"
                >
                  Clear
                </button>
              )}

              <button
                onClick={() => setShowDateFilter(false)}
                className="rounded-full bg-[#25D366] px-4 py-1.5 text-[13px] font-medium text-white hover:bg-[#1FBE5C]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active filter summary */}
      {hasActiveFilters && !initialLoading && !error && (
        <div className="flex items-center justify-between px-4 pb-2 text-[12px] text-[#667781]">
          <span className="truncate">
            {debouncedSearch ? `Results for "${debouncedSearch}"` : "Filtered"}
            {hasDates ? ` (${dateLabel})` : ""}
          </span>

          <button
            onClick={clearAllFilters}
            className="ml-2 shrink-0 font-medium text-[#008069] hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Contact List */}
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
        {/* Loading skeleton */}
        {initialLoading && (
          <div>
            {[1, 2, 3, 4, 5, 6, 7].map((item) => (
              <div
                key={item}
                className="flex animate-pulse items-center gap-3 px-4 py-3"
              >
                <div className="h-[49px] w-[49px] shrink-0 rounded-full bg-[#F0F2F5]" />

                <div className="flex-1 space-y-2.5">
                  <div className="h-3 w-1/2 rounded bg-[#F0F2F5]" />
                  <div className="h-2.5 w-3/4 rounded bg-[#F5F6F6]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!initialLoading && error && (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <p className="text-[14px] font-medium text-[#111B21]">
              Unable to load chats
            </p>

            <p className="mt-1 text-[12px] text-[#667781]">{error}</p>

            <button
              onClick={retry}
              className="mt-4 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#1FBE5C]"
            >
              <RefreshCw size={14} />
              Try again
            </button>
          </div>
        )}

        {/* Empty */}
        {!initialLoading &&
          !error &&
          hasFetched &&
          visibleContacts.length === 0 &&
          page >= lastPage && (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <Inbox size={32} className="text-[#C4CCD0]" />

              <p className="mt-3 text-[14px] font-medium text-[#111B21]">
                No chats found
              </p>

              <p className="mt-1 text-[12px] text-[#667781]">
                {hasActiveFilters
                  ? "Try a different name, number or date range."
                  : filter === "unread"
                  ? "You have no unread chats."
                  : "New conversations will show up here."}
              </p>

              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="mt-4 rounded-full bg-[#F0F2F5] px-4 py-2 text-[13px] text-[#54656F] hover:bg-[#E6E8EA]"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

        {/* Contacts */}
        {!initialLoading && !error && (
          <div>
            {visibleContacts.map((contact) => {
              const isSelected = selectedContact?.id === contact.id;
              const hasUnread = contact.unreadCount > 0;

              return (
                <button
                  key={contact.id}
                  onClick={() => onSelectContact?.(contact)}
                  className={`flex w-full items-center gap-3 px-4 text-left transition ${
                    isSelected ? "bg-[#F0F2F5]" : "hover:bg-[#F5F6F6]"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full text-[12px] font-medium text-[#41525D]"
                    style={{ backgroundColor: getAvatarColor(contact.name) }}
                  >
                    {getInitials(contact.name)}
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1 border-b border-[#F0F2F5] py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[14px] text-[#111B21]">
                        {contact.name}
                      </p>

                      <span
                        className={`shrink-0 text-[10px] ${
                          hasUnread
                            ? "font-medium text-[#1FA855]"
                            : "text-[#667781]"
                        }`}
                      >
                        {getListTime(contact)}
                      </span>
                    </div>

                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1">
                        {getStatusIcon(contact)}

                        <p
                          className={`truncate text-[12px] ${
                            hasUnread
                              ? "text-[#111B21]"
                              : "text-[#667781]"
                          }`}
                        >
                          {renderPreview(contact)}
                        </p>
                      </div>

                      {hasUnread && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#25D366] px-1.5 text-[12px] font-medium text-white">
                          {contact.unreadCount > 99 ? "99+" : contact.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Pagination sentinel */}
        {hasFetched && !initialLoading && page < lastPage && !error && (
          <div ref={observerRef} className="flex justify-center py-4">
            {loading && (
              <Loader2 size={18} className="animate-spin text-[#25D366]" />
            )}
          </div>
        )}

        {/* End */}
        {hasFetched &&
          !initialLoading &&
          page >= lastPage &&
          visibleContacts.length > 0 && (
            <p className="py-4 text-center text-[11px] text-[#8696A0]">
              You've reached the end
            </p>
          )}
      </div>
    </div>
  );
}