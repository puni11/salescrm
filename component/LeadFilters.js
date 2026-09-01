"use client";
export default function LeadFilters({
  isMobile = false,

  dateFilter,
  setDateFilter,

  fromDate,
  setFromDate,

  toDate,
  setToDate,

  sort,
  setSort,

  statusFilter,
  setStatusFilter,

  courseFilter,
  setCourseFilter,

  sourceFilter,
  setSourceFilter,

  selectedCounsellor,
  setSelectedCounsellor,

  profileFilter,
  setProfileFilter,

  fromFilter,
  setFromFilter,

  isStatusOpen,
  setIsStatusOpen,

  isInterestedOpen,
  setIsInterestedOpen,

  course,
  counsellors,
  loading,

  STATUS_OPTIONS,
  INTERESTED_STATUSES,
  SOURCE_TYPES,
  PROFILES,
  FROM_TYPES,
}) {
  const inputClasses =
    "w-full rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500";

  const wrapperClasses = isMobile
    ? "flex flex-col gap-1.5 mt-2 first:mt-0"
    : "flex items-center gap-2";

  const labelClasses =
    "text-xs font-bold uppercase tracking-wide text-gray-500";

  const MobileLabel = ({ text }) =>
    isMobile ? (
      <label className={labelClasses}>{text}</label>
    ) : null;

  return (
    <>
      {/* Quick Date */}
      <div className={wrapperClasses}>
        <MobileLabel text="Quick Date" />

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className={inputClasses}
        >
          <option value="All">All Time</option>
          <option value="Today">Today</option>
          <option value="Last3">Last 3 Days</option>
          <option value="Last7">Last 7 Days</option>
          <option value="Last30">Last 30 Days</option>
        </select>
      </div>

      {/* Custom Date */}
      <div className={wrapperClasses}>
        <MobileLabel text="Custom Date Range" />

        <div className="flex w-full items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className={`flex-1 ${inputClasses}`}
          />

          <span className="text-sm font-medium text-gray-400">
            to
          </span>

          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className={`flex-1 ${inputClasses}`}
          />
        </div>
      </div>

      {/* Sort */}
      <div className={wrapperClasses}>
        <MobileLabel text="Sort By" />

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className={inputClasses}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">Name (A-Z)</option>
        </select>
      </div>

      {/* Status */}

      <div
        className={`${wrapperClasses} relative status-filter-container`}
      >
        <MobileLabel text="Status" />

        <div className="relative w-full">
          <button
            type="button"
            onClick={() => setIsStatusOpen(!isStatusOpen)}
            className={`${inputClasses} flex items-center justify-between text-left`}
          >
            <span>{statusFilter || "All Statuses"}</span>

            <svg
              className={`w-4 h-4 transition-transform ${
                isStatusOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isStatusOpen && (
            <div className="absolute z-50 mt-1 w-full min-w-[220px] rounded-lg border border-gray-200 bg-white shadow-lg">

              <button
                type="button"
                onClick={() => {
                  setStatusFilter("All");
                  setIsStatusOpen(false);
                  setIsInterestedOpen(false);
                }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100"
              >
                All Statuses
              </button>

              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setStatusFilter(status);
                    setIsStatusOpen(false);
                    setIsInterestedOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100"
                >
                  {status}
                </button>
              ))}

              <div
                className="relative"
                onMouseEnter={() => setIsInterestedOpen(true)}
                onMouseLeave={() => setIsInterestedOpen(false)}
              >
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 flex items-center justify-between"
                >
                  <span>Interested</span>
                  <span>›</span>
                </button>

                {isInterestedOpen && (
                  <div className="absolute left-full -top-20 ml-1 w-[220px] rounded-lg border border-gray-200 bg-white shadow-lg">
                    {INTERESTED_STATUSES.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          setStatusFilter(status);
                          setIsStatusOpen(false);
                          setIsInterestedOpen(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100"
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Course */}
      <div className={wrapperClasses}>
        <MobileLabel text="Course" />

        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className={inputClasses}
        >
          <option value="All">All Courses</option>

          {course.map((item) => (
            <option key={item._id} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      {/* Source */}
      <div className={wrapperClasses}>
        <MobileLabel text="Source" />

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className={inputClasses}
        >
          <option value="All">All Sources</option>

          {SOURCE_TYPES.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
      </div>

      {/* Counsellor */}
      <div className={wrapperClasses}>
        <MobileLabel text="Counsellor" />

        <select
          value={selectedCounsellor}
          onChange={(e) =>
            setSelectedCounsellor(e.target.value)
          }
          disabled={loading}
          className={inputClasses}
        >
          <option value="">
            {loading
              ? "Loading..."
              : "Select Counsellor"}
          </option>

          {counsellors.map((counsellor) => (
            <option
              key={counsellor.id}
              value={counsellor.id}
            >
              {counsellor.name}
            </option>
          ))}
        </select>
      </div>

      {/* Profile */}
      <div className={wrapperClasses}>
        <MobileLabel text="Profile" />

        <select
          value={profileFilter}
          onChange={(e) => setProfileFilter(e.target.value)}
          className={inputClasses}
        >
          <option value="All">All Profiles</option>

          {PROFILES.map((profile) => (
            <option key={profile} value={profile}>
              {profile.charAt(0).toUpperCase() +
                profile.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Website */}
      <div className={wrapperClasses}>
        <MobileLabel text="Website" />

        <select
          value={fromFilter}
          onChange={(e) => setFromFilter(e.target.value)}
          className={inputClasses}
        >
          <option value="All">All Websites</option>

          {FROM_TYPES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}