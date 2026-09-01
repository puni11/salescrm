import { useState, useRef, useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight,
  X,
  Loader2 // Added for the loading state spinner
} from "lucide-react";

export default function FollowUpModal({ selectedLead, setFollowUpOpen }) {
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
      window.location.reload(); // Refresh the page to reflect changes
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 font-sans">
      <div className="w-full max-w-[400px] rounded-xl bg-white p-6 shadow-xl">
        
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Schedule Follow Up</h2>
          <button
            type="button"
            onClick={() => setFollowUpOpen(false)}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 relative">
          
          {/* Custom Date Picker */}
          <div className="relative" ref={datePickerRef}>
            <button 
              type="button"
              disabled={isLoading}
              onClick={() => {
                setIsDatePickerOpen(!isDatePickerOpen);
                setIsTimePickerOpen(false);
              }}
              className={`w-full flex items-center justify-between rounded-lg border-2 px-4 py-3 transition-colors bg-white ${isDatePickerOpen ? 'border-gray-900' : 'border-gray-200 hover:border-gray-300'} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div className="text-left leading-tight">
                  <div className="text-[10px] text-gray-600 font-medium mb-0.5">Select a day</div>
                  <div className="text-[15px] font-semibold text-gray-900">{formatDate(followUpDate)}</div>
                </div>
              </div>
              {isDatePickerOpen ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {isDatePickerOpen && (
              <div className="absolute top-[calc(100%+8px)] left-0 w-[300px] rounded-2xl bg-white p-5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-gray-100 z-50">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[14px] font-semibold text-gray-900">
                    {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => changeMonth(-1)} 
                      disabled={isPastMonth()}
                      className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex w-full mb-2">
                  {daysOfWeek.map((day, i) => (
                    <div key={i} className="w-[14.28%] text-center text-[11px] font-semibold text-gray-900">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="flex flex-wrap w-full gap-y-1">
                  {generateDays().map((day, index) => {
                    const cellDate = day ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day) : null;
                    const isPastDate = cellDate ? cellDate < today : false;
                    const isSelected = day === followUpDate?.getDate() && 
                                       currentMonth.getMonth() === followUpDate?.getMonth() && 
                                       currentMonth.getFullYear() === followUpDate?.getFullYear();
                    return (
                      <div key={index} className="w-[14.28%] flex justify-center py-0.5">
                        {day ? (
                          <button
                            disabled={isPastDate}
                            onClick={() => {
                               setFollowUpDate(cellDate);
                               setIsDatePickerOpen(false);
                            }}
                            className={`w-8 h-8 rounded-full text-[13px] font-medium transition-all flex items-center justify-center
                              ${isSelected ? 'bg-gray-800 text-white shadow-md' : 
                                isPastDate ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}
                            `}
                          >
                            {day}
                          </button>
                        ) : <div className="w-8 h-8"></div>}
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
              className={`w-full flex items-center justify-between rounded-lg border-2 px-4 py-3 transition-colors bg-white ${isTimePickerOpen ? 'border-gray-900' : 'border-gray-200 hover:border-gray-300'} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <div className="text-left leading-tight">
                  <div className="text-[10px] text-gray-700 font-medium mb-0.5">Start with</div>
                  <div className="text-[15px] font-semibold text-gray-900">{followUpTime}</div>
                </div>
              </div>
              {isTimePickerOpen ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {isTimePickerOpen && (
              <div className="absolute top-[calc(100%+8px)] right-0 w-[200px] h-[260px] overflow-y-auto rounded-lg bg-white py-2 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-gray-100 z-50">
                {timeOptions.map((time, index) => {
                  const isSelected = time === followUpTime;
                  const [timeStr, ampm] = time.split(' ');
                  const disabled = isTimeInPast(time, followUpDate);
                  
                  return (
                    <button
                      key={index}
                      disabled={disabled}
                      onClick={() => {
                        setFollowUpTime(time);
                        setIsTimePickerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-5 py-3 transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                    >
                      <span className={`text-[14px] ${isSelected && !disabled ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
                        {timeStr}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        isSelected && !disabled
                          ? 'border-blue-200 text-blue-600 bg-blue-50' 
                          : 'border-gray-200 text-gray-400 bg-gray-50/50'
                      }`}>
                        {ampm}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Comment Box */}
          <div className="pt-2">
            <label className="mb-2 block text-[15px] font-bold text-gray-900">
              Comment
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isLoading}
              placeholder="Add any notes for this follow-up..."
              rows={3}
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-[14px] text-gray-700 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-0 transition-colors resize-none disabled:opacity-50 disabled:bg-gray-50"
            />
          </div>

          {/* Error Message Display */}
          {error && (
            <div className="text-red-500 text-sm font-medium mt-2">
              {error}
            </div>
          )}

          {/* Save Button */}
          <button
            type="button"
            disabled={isLoading || !followUpDate || !followUpTime || isTimeInPast(followUpTime, followUpDate)}
            onClick={handleSaveFollowUp}
            className="mt-2 w-full flex items-center justify-center rounded-lg bg-[#0f172a] px-4 py-3.5 text-[15px] font-semibold text-white shadow-md hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Follow Up"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}