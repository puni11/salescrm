
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Clock3,
  Users,
  Tag,
  Loader2,
  RefreshCw,
  IndianRupee,
  FileText,
  Table2,
  Type,
  Wrench,
  BadgeCheck,
  UserRound,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const formatPrice = (price) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(price) || 0);

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
  for (const ch of String(key)) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return TAG_COLORS[hash % TAG_COLORS.length];
};

const GRID =
  "grid grid-cols-[minmax(220px,1.7fr)_140px_100px_130px_minmax(150px,1.2fr)_minmax(150px,1.2fr)_minmax(170px,1.3fr)_minmax(180px,1.4fr)_minmax(160px,1.2fr)]";

function Tagged({ className = "", children }) {
  return (
    <span
      className={`inline-flex max-w-full shrink-0 items-center truncate rounded-[3px] px-1.5 py-0.5 text-sm leading-5 ${className}`}
      title={typeof children === "string" ? children : undefined}
    >
      {children}
    </span>
  );
}

function HeadCell({ icon: Icon, last, children }) {
  return (
    <div
      className={`flex h-[38px] items-center gap-1.5 overflow-hidden px-2 text-sm text-[#787774] ${
        last ? "" : "border-r border-[#E9E9E7]"
      }`}
    >
      <Icon size={15} className="shrink-0 text-[#9B9A97]" />
      <span className="truncate">{children}</span>
    </div>
  );
}

function Cell({ last, children }) {
  return (
    <div
      className={`flex min-h-[42px] items-center gap-1 overflow-hidden px-2 py-1 ${
        last ? "" : "border-r border-[#E9E9E7]"
      }`}
    >
      {children}
    </div>
  );
}

function getArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload?.result)) return payload.result;
  return [];
}

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTrainer, setSelectedTrainer] = useState("All");
  const [selectedTool, setSelectedTool] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const searchRef = useRef(null);

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [courseResponse, categoryResponse] = await Promise.all([
        fetch("/api/course-catalog", { cache: "no-store" }),
        fetch("/api/categories?status=active", { cache: "no-store" }),
      ]);

      const [courseResult, categoryResult] = await Promise.all([
        courseResponse.json(),
        categoryResponse.json(),
      ]);

      if (!courseResponse.ok || !courseResult.success) {
        throw new Error(courseResult.message || "Unable to load courses");
      }

      if (!categoryResponse.ok) {
        throw new Error(
          categoryResult.message || "Unable to load categories"
        );
      }

      setCourses(Array.isArray(courseResult.data) ? courseResult.data : []);
      setCategoriesList(
        getArray(categoryResult).filter((category) => category?.name)
      );
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const categories = useMemo(() => {
    const apiCategories = categoriesList.map((category) => ({
      id: String(category._id ?? category.id ?? category.categoryId ?? ""),
      name: category.name,
    }));

    // Use the category API as the source of truth. Include a course's category
    // only as a fallback when an older category record is not returned by it.
    const knownIds = new Set(apiCategories.map((category) => category.id));
    const fallbackCategories = courses
      .filter(
        (course) =>
          course.categoryId &&
          !knownIds.has(String(course.categoryId)) &&
          course.category &&
          !apiCategories.some((category) => category.name === course.category)
      )
      .map((course) => ({
        id: String(course.categoryId),
        name: course.category,
      }));

    return [
      { id: "All", name: "All courses" },
      ...apiCategories,
      ...fallbackCategories,
    ];
  }, [categoriesList, courses]);

  const trainerOptions = useMemo(() => {
    const map = new Map();

    courses.forEach((course) => {
      (course.trainers || []).forEach((trainer) => {
        if (trainer.id && trainer.name) map.set(trainer.id, trainer.name);
      });
    });

    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [courses]);

  const toolOptions = useMemo(() => {
    const map = new Map();

    courses.forEach((course) => {
      (course.tools || []).forEach((tool) => {
        if (tool.id && tool.name) map.set(tool.id, tool.name);
      });
    });

    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return courses.filter((course) => {
      const searchValues = [
        course.name,
        course.category,
        course.level,
        course.prerequisite,
        course.certificationPitch,
        course.salesCounsellor?.name,
        course.salesCounsellor?.email,
        ...(course.trainers || []).map((trainer) => trainer.name),
        ...(course.tools || []).map((tool) => tool.name),
      ];

      const matchesSearch =
        !query ||
        searchValues
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesCategory =
        selectedCategory === "All" ||
        String(course.categoryId) === selectedCategory ||
        course.category ===
          categories.find((category) => category.id === selectedCategory)?.name;

      const matchesTrainer =
        selectedTrainer === "All" ||
        (course.trainers || []).some(
          (trainer) => trainer.id === selectedTrainer
        );

      const matchesTool =
        selectedTool === "All" ||
        (course.tools || []).some((tool) => tool.id === selectedTool);

      const status = String(course.status || "active").toLowerCase();
      const matchesStatus =
        selectedStatus === "All" || status === selectedStatus;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesTrainer &&
        matchesTool &&
        matchesStatus
      );
    });
  }, [
    courses,
    search,
    selectedCategory,
    selectedTrainer,
    selectedTool,
    selectedStatus,
    categories,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    selectedCategory,
    selectedTrainer,
    selectedTool,
    selectedStatus,
    pageSize,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedCourses = filteredCourses.slice(
    startIndex,
    startIndex + pageSize
  );

  const resetFilters = () => {
    setSearch("");
    setSelectedCategory("All");
    setSelectedTrainer("All");
    setSelectedTool("All");
    setSelectedStatus("All");
    setCurrentPage(1);
  };

  const iconBtn =
    "inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-[#787774] transition-colors hover:bg-[rgba(55,53,47,0.08)] disabled:opacity-50";

  const selectClass =
    "h-8 max-w-[190px] rounded-[5px] border border-[#E9E9E7] bg-white px-2 text-sm text-[#37352F] outline-none focus:border-[#B4B4B0]";

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-[#37352F] sm:px-8 lg:px-[30px]">
      <div className="flex items-center gap-3">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.01em] sm:text-[32px]">
          Our Offerings
        </h1>
      </div>

      <p className="mt-1 text-sm text-[#787774]">
        Explore our courses, compare pricing, check learning hours, and find
        your trainers.
      </p>

      {/* Category tabs: category names come from the categories API */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {categories.map((category) => {
            const active = selectedCategory === category.id;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                aria-pressed={active}
                className={`inline-flex h-8 items-center gap-2 rounded-[8px] px-3 text-sm transition-colors ${
                  active
                    ? "bg-[#F1F1EF] font-medium text-[#37352F]"
                    : "text-[#787774] hover:bg-[rgba(55,53,47,0.06)]"
                }`}
              >
                <Table2 size={15} className="shrink-0 text-[#787774]" />
                {category.name}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-0.5">
          {searchOpen || search ? (
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[#9B9A97]"
              />
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onBlur={() => {
                  if (!search) setSearchOpen(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setSearch("");
                    setSearchOpen(false);
                  }
                }}
                placeholder="Search courses, tools..."
                className="h-7 w-52 rounded-[4px] bg-white pl-7 pr-2 text-sm outline-none ring-1 ring-[#E3E2E0] placeholder:text-[#9B9A97] focus:ring-2 focus:ring-[#2383E2]/50"
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
            onClick={loadCourses}
            disabled={loading}
            aria-label="Refresh courses"
            title="Refresh"
            className={iconBtn}
          >
            <RefreshCw
              size={15}
              className={loading ? "animate-spin" : ""}
            />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm text-[#787774]">
          <SlidersHorizontal size={14} />
          Filters
        </span>

        <select
          aria-label="Filter by trainer"
          value={selectedTrainer}
          onChange={(event) => setSelectedTrainer(event.target.value)}
          className={selectClass}
        >
          <option value="All">All trainers</option>
          {trainerOptions.map((trainer) => (
            <option key={trainer.id} value={trainer.id}>
              {trainer.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by tool"
          value={selectedTool}
          onChange={(event) => setSelectedTool(event.target.value)}
          className={selectClass}
        >
          <option value="All">All tools</option>
          {toolOptions.map((tool) => (
            <option key={tool.id} value={tool.id}>
              {tool.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by status"
          value={selectedStatus}
          onChange={(event) => setSelectedStatus(event.target.value)}
          className={selectClass}
        >
          <option value="All">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {(search ||
          selectedCategory !== "All" ||
          selectedTrainer !== "All" ||
          selectedTool !== "All" ||
          selectedStatus !== "All") && (
          <button
            type="button"
            onClick={resetFilters}
            className="h-8 rounded-[5px] px-2 text-sm text-[#787774] hover:bg-[#F1F1EF] hover:text-[#37352F]"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="mt-3 overflow-x-auto">
        <div className="min-w-[1600px]">
          <div className={`${GRID} border-y border-[#E9E9E7]`}>
            <HeadCell icon={Type}>Course name</HeadCell>
            <HeadCell icon={Tag}>Category</HeadCell>
            <HeadCell icon={Clock3}>Hours</HeadCell>
            <HeadCell icon={IndianRupee}>Price</HeadCell>
            <HeadCell icon={Wrench}>Tools</HeadCell>
            <HeadCell icon={Users}>Trainers</HeadCell>
            <HeadCell icon={BadgeCheck}>Certification pitch</HeadCell>
            <HeadCell icon={FileText}>Prerequisite</HeadCell>
            <HeadCell icon={UserRound} last>
              Sales counsellor
            </HeadCell>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 border-b border-[#E9E9E7] py-16 text-sm text-[#9B9A97]">
              <Loader2 size={16} className="animate-spin" />
              Loading courses
            </div>
          ) : error ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E9E9E7] bg-[#FFE2DD]/60 px-3 py-3 text-sm text-[#5D1715]">
              <span>⚠️ {error}</span>
              <button
                type="button"
                onClick={loadCourses}
                className="rounded-[4px] border border-[#5D1715]/20 bg-white px-3 py-1 text-sm font-medium transition-colors hover:bg-[#FFF5F3]"
              >
                Try again
              </button>
            </div>
          ) : paginatedCourses.length === 0 ? (
            <div className="border-b border-[#E9E9E7] py-16 text-center">
              <p className="text-sm font-medium">No courses found</p>
              <p className="mt-1 text-sm text-[#787774]">
                Try another search or change your filters.
              </p>
            </div>
          ) : (
            paginatedCourses.map((course) => (
              <div
                key={course.id}
                className={`${GRID} border-b border-[#E9E9E7] transition-colors hover:bg-[rgba(55,53,47,0.03)]`}
              >
                <Cell>
                  <FileText
                    size={16}
                    className="shrink-0 text-[#9B9A97]"
                  />
                  <span className="truncate font-medium" title={course.name}>
                    {course.name}
                  </span>
                </Cell>

                <Cell>
                  {course.category ? (
                    <Tagged className={tagColor(course.category)}>
                      {course.category}
                    </Tagged>
                  ) : (
                    <span className="text-[#C7C6C3]">—</span>
                  )}
                </Cell>

                <Cell>
                  <span className="whitespace-nowrap text-sm tabular-nums">
                    {course.hours} hours
                  </span>
                </Cell>

                <Cell>
                  <div className="min-w-0">
                    <span className="whitespace-nowrap text-sm tabular-nums">
                      {formatPrice(course.price)}
                    </span>
                    {course.originalPrice > course.price && (
                      <span className="ml-1 whitespace-nowrap text-[12px] tabular-nums text-[#9B9A97] line-through">
                        {formatPrice(course.originalPrice)}
                      </span>
                    )}
                  </div>
                </Cell>

                <Cell>
                  {course.tools?.length ? (
                    <div className="flex min-w-0 flex-wrap gap-1">
                      {course.tools.map((tool) => (
                        <Tagged
                          key={tool.id}
                          className={tagColor(tool.name)}
                        >
                          {tool.name}
                        </Tagged>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-[#C7C6C3]">Not available</span>
                  )}
                </Cell>

                <Cell>
                  {course.trainers?.length ? (
                    <div className="flex min-w-0 flex-wrap gap-1">
                      {course.trainers.map((trainer) => (
                        <Tagged
                          key={trainer.id}
                          className={tagColor(trainer.name)}
                        >
                          {trainer.name}
                        </Tagged>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-[#C7C6C3]">Not available</span>
                  )}
                </Cell>

                <Cell>
                  {course.certificationPitch ? (
                    <Tagged className={tagColor(course.certificationPitch)}>
                      {course.certificationPitch}
                    </Tagged>
                  ) : (
                    <span className="text-sm text-[#C7C6C3]">Not available</span>
                  )}
                </Cell>

                <Cell>
                  {course.prerequisite ? (
                    <span
                      className="line-clamp-2 text-sm"
                      title={course.prerequisite}
                    >
                      {course.prerequisite}
                    </span>
                  ) : (
                    <span className="text-sm text-[#C7C6C3]">Not specified</span>
                  )}
                </Cell>

                <Cell last>
                  {course.salesCounsellor?.name ? (
                    <div className="min-w-0">
                      <span
                        className="block truncate text-sm"
                        title={course.salesCounsellor.name}
                      >
                        {course.salesCounsellor.name}
                      </span>
                    
                    </div>
                  ) : (
                    <span className="text-sm text-[#C7C6C3]">Not assigned</span>
                  )}
                </Cell>
              </div>
            ))
          )}

          {!loading && !error && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E9E9E7] px-2 py-3 text-[13px] text-[#9B9A97]">
              <div>
                Showing{" "}
                <span className="font-medium text-[#37352F]">
                  {filteredCourses.length === 0 ? 0 : startIndex + 1}
                  {"–"}
                  {Math.min(startIndex + pageSize, filteredCourses.length)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-[#37352F]">
                  {filteredCourses.length}
                </span>{" "}
                courses
                {filteredCourses.length !== courses.length && (
                  <span> (filtered from {courses.length})</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="course-page-size">Rows per page</label>
                <select
                  id="course-page-size"
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="h-7 rounded-[4px] border border-[#E9E9E7] bg-white px-2 text-sm text-[#37352F] outline-none"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  aria-label="Previous page"
                  title="Previous page"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] hover:bg-[#F1F1EF] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>

                <span className="whitespace-nowrap text-sm text-[#37352F]">
                  Page {safePage} of {totalPages}
                </span>

                <button
                  type="button"
                  aria-label="Next page"
                  title="Next page"
                  disabled={safePage >= totalPages}
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] hover:bg-[#F1F1EF] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
