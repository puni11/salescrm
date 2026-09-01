import { useState, useRef, useEffect } from "react";
import {
  X,
  Loader2, // Added for the loading state spinner
  XCircleIcon,
  SaveCheckIcon
} from "lucide-react";

export default function OtherCourseModal({ selectedLead, setOtherCourse, course }) {
  const [courseName, setCourseName] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSaveFollowUp = async () => {
    if (!selectedLead) {
      setError("Cannot save: Lead ID is missing.");
      return;
    }

    setIsLoading(true);
    setError(null); // Clear any previous errors

    try {
      const apiUrl = `/api/contact/${selectedLead}/otherCourse`; 

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
            otherCourse:courseName
        }),
      });

      if (!response.ok) {
        // Attempt to parse the error message from the backend
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save follow-up. Please try again.");
      }

      window.location.reload()
      setOtherCourse(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 font-sans">
      <div className="w-full max-w-[400px] rounded-sm bg-white p-6 shadow-xl">
        
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Change Course for Lead</h2>
          <button
            type="button"
            onClick={() => setOtherCourse(false)}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 relative">
        

          {/* Comment Box */}
          <div className="pt-2">
            <label className="mb-2 block text-[13px] font-semibold text-gray-600">
              Course Name
            </label>
           <select
  value={courseName}
  onChange={(e) => setCourseName(e.target.value)}
  className="border border-gray-300 rounded-md w-full p-2.5"
>
  <option value="">Select Course</option>

  {course.map((item) => (
    <option key={item._id} value={item.name}>
      {item.name}
    </option>
  ))}
</select>
          </div>

          {/* Error Message Display */}
          {error && (
            <div className="text-red-500 text-sm font-medium mt-2">
              {error}
            </div>
          )}

          {/* Save Button */}
          <div className="flex gap-2">
             <button
            type="button"
            onClick={() => setOtherCourse(false)}
            className="mt-2 w-full flex items-center justify-center gap-1 rounded-sm cursor-pointer border border-gray-300 px-4 py-3 text-[15px] font-semibold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
           Cancel <XCircleIcon size={14} />
          </button>
          <button
            type="button"
            disabled={isLoading || !course}
            onClick={handleSaveFollowUp}
            className="mt-2 w-full flex items-center justify-center gap-1 rounded-sm bg-[#0f172a] px-4 py-3 text-[15px] font-semibold text-white shadow-md hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
                <>
               
              Save Follow Up
               <SaveCheckIcon size={14} />
              </>
            )}
          </button>
         
          </div>
        </div>
      </div>
    </div>
  );
}