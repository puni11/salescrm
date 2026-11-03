import { useState, useRef, useEffect } from "react";
import {
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
} from "lucide-react";

const hoverBg = "hover:bg-[rgba(55,53,47,0.06)]";

const popoverShadow =
  "rgba(15,15,15,0.05) 0 0 0 1px, rgba(15,15,15,0.1) 0 3px 6px, rgba(15,15,15,0.2) 0 9px 24px";

export default function FollowUpModal({ selectedLead, setFollowUpOpen, fetchLeads }) {
  // --- State ---
  const [followUpDate, setFollowUpDate] = useState(new Date());
  const [followUpTime, setFollowUpTime] = useState("09:00 AM");
  const [comment, setComment] = useState("");

  // --- API States ---
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(new Date());

  // --- Refs for Click Outside ---
  const datePickerRef = useRef(null);
  const timePickerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setIsDatePickerOpen(false);
      }
      if (timePickerRef.current && !timePickerRef.current.contains(event.target)) {
        setIsTimePickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !isLoading) setFollowUpOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLoading, setFollowUpOpen]);

  // --- Helpers for Date/Time Validation ---
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const isTimeInPast = (timeString, dateObj) => {
    if (!dateObj || !timeString) return true;

    const selectedDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());

    if (selectedDate < today) return true;

    if (selectedDate.getTime() === today.getTime()) {
      const [timeStr, ampm] = timeString.split(' ');
      const [hourStr, minStr] = timeStr.split(':');
      let h = parseInt(hourStr, 10);

      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;

      const m = parseInt(minStr, 10);

      if (h < now.getHours() || (h === now.getHours() && m < now.getMinutes())) {
        return true;
      }
    }
    return false;
  };

  // --- Helpers for Calendar ---
  const daysOfWeek = ["M", "T", "W", "T", "F", "S", "S"];

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    let day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const generateDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const changeMonth = (offset) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  const isPastMonth = () => {
    return currentMonth.getFullYear() < today.getFullYear() ||
      (currentMonth.getFullYear() === today.getFullYear() && currentMonth.getMonth() <= today.getMonth());
  };

  const formatDate = (date) => {
    if (!date) return "";
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  };

  // --- Helpers for Time ---
  const generateTimes = () => {
    const times = [];
    for (let i = 0; i < 24; i++) {
      for (let j = 0; j < 60; j += 30) {
        let hour = i % 12 === 0 ? 12 : i % 12;
        let min = j === 0 ? "00" : "30";
        let ampm = i < 12 ? "AM" : "PM";
        times.push(`${String(hour).padStart(2, '0')}:${min} ${ampm}`);
      }
    }
    return times;
  };

  const timeOptions = generateTimes();

  // --- API Integration Handler ---
  const handleSaveFollowUp = async () => {
    // 1. Basic validation to ensure we have an ID
    if (!selectedLead) {
      setError("Cannot save: Lead ID is missing.");
      return;
    }

    setIsLoading(true);
    setError(null); // Clear any previous errors

    try {
      const apiUrl = `/api/contact/${selectedLead}/follow-up`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "Follow Up",
          // Sending date as an ISO string is usually best practice for APIs
          followUpDate: followUpDate.toISOString(),
          followUpTime: followUpTime,
          comment: comment,
        }),
      });

      if (!response.ok) {
        // Attempt to parse the error message from the backend
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save follow-up. Please try again.");
      }

      // 3. Close the modal on success
      setFollowUpOpen(false);
      fetchLeads(); // Refresh the page to reflect changes
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fieldButton = (open) =>
    `flex w-full items-center justify-between rounded-[4px] border bg-white px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
      open
        ? "border-[#2383E2] ring-2 ring-[#2383E2]/30"
        : "border-[#E3E2E0] hover:bg-[rgba(55,53,47,0.04)]"
    }`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-[rgba(15,15,15,0.6)] p-4 sm:py-16"
      
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isLoading) setFollowUpOpen(false);
      }}
    >
      <div
        className="w-full max-w-[440px] rounded-[6px] bg-white text-[#37352F]"
        style={{
          boxShadow:
            "rgba(15,15,15,0.05) 0 0 0 1px, rgba(15,15,15,0.1) 0 5px 10px, rgba(15,15,15,0.2) 0 15px 40px",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="text-xs text-[#9B9A97]">Follow up</span>
          <button
            type="button"
            onClick={() => setFollowUpOpen(false)}
            disabled={isLoading}
            aria-label="Close"
            className={`rounded-[4px] p-1.5 text-[#787774] disabled:opacity-50 ${hoverBg}`}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pb-6 pt-2 sm:px-8">
          <h2 className="text-[26px] font-bold leading-tight tracking-[-0.01em]">
            Schedule follow up
          </h2>

          <div className="relative mt-5 space-y-3">
            {/* Custom Date Picker */}
            <div className="relative" ref={datePickerRef}>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setIsDatePickerOpen(!isDatePickerOpen);
                  setIsTimePickerOpen(false);
                }}
                className={fieldButton(isDatePickerOpen)}
              >
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-[#9B9A97]" />
                  <div className="leading-tight">
                    <div className="text-[11px] text-[#9B9A97]">Select a day</div>
                    <div className="text-sm font-medium">{formatDate(followUpDate)}</div>
                  </div>
                </div>
                {isDatePickerOpen ? (
                  <ChevronUp size={15} className="text-[#9B9A97]" />
                ) : (
                  <ChevronDown size={15} className="text-[#9B9A97]" />
                )}
              </button>

              {isDatePickerOpen && (
                <div
                  className="absolute left-0 top-[calc(100%+6px)] z-50 w-[290px] rounded-[6px] bg-white p-4"
                  style={{ boxShadow: popoverShadow }}
                >
                  {/* Calendar Header */}
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h3>
                    <div className="flex gap-0.5">
                      <button
                        type="button"
                        onClick={() => changeMonth(-1)}
                        disabled={isPastMonth()}
                        className={`rounded-[4px] p-1.5 text-[#787774] disabled:opacity-30 disabled:hover:bg-transparent ${hoverBg}`}
                      >
                        <ChevronLeft size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => changeMonth(1)}
                        className={`rounded-[4px] p-1.5 text-[#787774] ${hoverBg}`}
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="mb-1 flex w-full">
                    {daysOfWeek.map((day, i) => (
                      <div key={i} className="w-[14.28%] text-center text-[11px] text-[#9B9A97]">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="flex w-full flex-wrap gap-y-0.5">
                    {generateDays().map((day, index) => {
                      const cellDate = day ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day) : null;
                      const isPastDate = cellDate ? cellDate < today : false;
                      const isToday = cellDate ? cellDate.getTime() === today.getTime() : false;
                      const isSelected = day === followUpDate?.getDate() &&
                        currentMonth.getMonth() === followUpDate?.getMonth() &&
                        currentMonth.getFullYear() === followUpDate?.getFullYear();
                      return (
                        <div key={index} className="flex w-[14.28%] justify-center">
                          {day ? (
                            <button
                              type="button"
                              disabled={isPastDate}
                              onClick={() => {
                                setFollowUpDate(cellDate);
                                setIsDatePickerOpen(false);
                              }}
                              className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] transition-colors
                                ${isSelected
                                  ? 'bg-[#2383E2] font-medium text-white'
                                  : isPastDate
                                    ? 'cursor-not-allowed text-[#D3D1CB]'
                                    : `${isToday ? 'font-semibold text-[#E03E3E]' : 'text-[#37352F]'} hover:bg-[rgba(55,53,47,0.08)]`}
                              `}
                            >
                              {day}
                            </button>
                          ) : <div className="h-8 w-8"></div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Custom Time Picker */}
            <div className="relative" ref={timePickerRef}>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setIsTimePickerOpen(!isTimePickerOpen);
                  setIsDatePickerOpen(false);
                }}
                className={fieldButton(isTimePickerOpen)}
              >
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-[#9B9A97]" />
                  <div className="leading-tight">
                    <div className="text-[11px] text-[#9B9A97]">Start with</div>
                    <div className="text-sm font-medium">{followUpTime}</div>
                  </div>
                </div>
                {isTimePickerOpen ? (
                  <ChevronUp size={15} className="text-[#9B9A97]" />
                ) : (
                  <ChevronDown size={15} className="text-[#9B9A97]" />
                )}
              </button>

              {isTimePickerOpen && (
                <div
                  className="absolute right-0 top-[calc(100%+6px)] z-50 h-[240px] w-[200px] overflow-y-auto rounded-[6px] bg-white py-1"
                  style={{ boxShadow: popoverShadow }}
                >
                  {timeOptions.map((time, index) => {
                    const isSelected = time === followUpTime;
                    const [timeStr, ampm] = time.split(' ');
                    const disabled = isTimeInPast(time, followUpDate);

                    return (
                      <button
                        type="button"
                        key={index}
                        disabled={disabled}
                        onClick={() => {
                          setFollowUpTime(time);
                          setIsTimePickerOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-1.5 text-sm transition-colors ${
                          disabled
                            ? 'cursor-not-allowed opacity-40'
                            : 'hover:bg-[rgba(55,53,47,0.06)]'
                        } ${isSelected && !disabled ? 'bg-[#D3E5EF]/50' : ''}`}
                      >
                        <span className={isSelected && !disabled ? 'font-medium text-[#2383E2]' : ''}>
                          {timeStr}
                        </span>
                        <span className="text-[11px] text-[#9B9A97]">{ampm}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Comment Box */}
            <div className="pt-1">
              <label className="mb-1.5 block text-sm text-[#787774]">Comment</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isLoading}
                placeholder="Add any notes for this follow-up..."
                rows={3}
                className="w-full resize-none rounded-[4px] border border-[#E3E2E0] bg-white px-3 py-2 text-sm outline-none transition-shadow placeholder:text-[#C7C6C3] focus:border-[#2383E2] focus:ring-2 focus:ring-[#2383E2]/30 disabled:bg-[rgba(55,53,47,0.04)] disabled:opacity-60"
              />
            </div>

            {/* Error Message Display */}
            {error && (
              <div className="rounded-[4px] bg-[#FFE2DD] px-3 py-2 text-sm text-[#5D1715]">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#E9E9E7] px-4 py-3">
          <button
            type="button"
            onClick={() => setFollowUpOpen(false)}
            disabled={isLoading}
            className="h-8 rounded-[4px] border border-[#E3E2E0] bg-white px-3 text-sm transition-colors hover:bg-[rgba(55,53,47,0.06)] disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isLoading || !followUpDate || !followUpTime || isTimeInPast(followUpTime, followUpDate)}
            onClick={handleSaveFollowUp}
            className="inline-flex h-8 items-center gap-2 rounded-[4px] bg-[#2383E2] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[#0077D4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              "Save follow up"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}