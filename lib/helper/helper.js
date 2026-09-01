export const handleDelete = async (id, setDeleteModal, setSelectedLeadId, setLeads, toast, getLeadId) => {
  try {
    const res = await fetch(`/api/contact/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to delete lead");
    }

    // Close modal
    setDeleteModal({
      open: false,
      id: null,
    });

    // Close sidebar
    setSelectedLeadId(null);

    // Remove lead from state (no page reload needed)
    setLeads((prev) => prev.filter((lead) => getLeadId(lead) !== id));

    toast.success("Lead deleted successfully");
  } catch (error) {
    console.error(error);
    toast.error(error.message || "Something went wrong");
  }
};
export async function fetchCounsellors(setCounsellors, setLoading) {
    try {
      const res = await fetch("/api/cousellors");
      const data = await res.json();

      if (data.success) {
        setCounsellors(data.data);
      }
    } catch (error) {
      console.error("Error fetching counsellors:", error);
    } finally {
      setLoading(false);
    }
  } 
export async function fetchCourse(setCourse, setLoading) {
    try {
      const res = await fetch("/api/course");
      const data = await res.json();

      if (data.success) {
        setCourse(data.courses);
      }
    } catch (error) {
      console.error("Error fetching counsellors:", error);
    } finally {
      setLoading(false);
    }
  }
 export const renderFilters = ({
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
  loading,
  counsellors,
  STATUSES,
  SOURCE_TYPES,
  PROFILES,
  FROM_TYPES,
}) => {
  const inputClasses =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500";

  const wrapperClasses = isMobile
    ? "flex flex-col gap-1.5 mt-2 first:mt-0"
    : "flex items-center gap-2";

  const labelClasses =
    "text-xs font-bold uppercase tracking-wide text-gray-500";

  const MobileLabel = ({ text }) =>
    isMobile ? <label className={labelClasses}>{text}</label> : null;

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

      {/* Custom Date Range */}
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

      {/* Sort By */}
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
      <div className={wrapperClasses}>
        <MobileLabel text="Status" />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={inputClasses}
        >
          <option value="All">All Statuses</option>

          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
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
          <option value="Digital Marketing">
            Digital Marketing
          </option>
          <option value="Azure + Azure DevOps">
            Azure + Azure DevOps
          </option>
          <option value="OpenShift + Kubernetes">
            OpenShift + Kubernetes
          </option>
          <option value="OpenShift AI Webinar">
            OpenShift AI Webinar
          </option>
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

          {SOURCE_TYPES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Counsellor */}
      <div className={wrapperClasses}>
        <MobileLabel text="Counsellor" />

        <select
          value={selectedCounsellor}
          onChange={(e) => setSelectedCounsellor(e.target.value)}
          disabled={loading}
          className={inputClasses}
        >
          <option value="">
            {loading ? "Loading..." : "Select Counsellor"}
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

          {PROFILES.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
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
};