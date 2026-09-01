import { useState } from "react";
import {
  X,
  Loader2,
  XCircleIcon,
  SaveCheckIcon,
} from "lucide-react";

export default function ChangeCounsellor({
  selectedLead,
  counsellor = [],
  setChangeCounsellorModal,
}) {
  const [selectedCounsellor, setSelectedCounsellor] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!selectedLead) {
      setError("Cannot save: Lead ID is missing.");
      return;
    }

    if (!selectedCounsellor) {
      setError("Please select a counsellor.");
      return;
    }

    const counsellorData = counsellor.find(
      (item) => item.id === selectedCounsellor
    );

    if (!counsellorData) {
      setError("Selected counsellor not found.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = `/api/contact/${selectedLead}/change-counsellor`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          counsellorId: counsellorData.id,
          counsellorName: counsellorData.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        throw new Error(
          errorData.message ||
            "Failed to change counsellor. Please try again."
        );
      }

      window.location.reload();
      setChangeCounsellorModal(false);

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
          <h2 className="text-xl font-bold text-gray-900">
            Change Counsellor
          </h2>

          <button
            type="button"
            onClick={() => setChangeCounsellorModal(false)}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">

          <div className="pt-2">
            <label className="mb-2 block text-[13px] font-semibold text-gray-600">
              Select Counsellor
            </label>

            <select
              value={selectedCounsellor}
              onChange={(e) =>
                setSelectedCounsellor(e.target.value)
              }
              className="border border-gray-300 rounded-md w-full p-2.5"
            >
              <option value="">
                Select Counsellor
              </option>

              {counsellor.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="text-red-500 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="flex gap-2">

            <button
              type="button"
              onClick={() =>
                setChangeCounsellorModal(false)
              }
              disabled={isLoading}
              className="mt-2 w-full flex items-center justify-center gap-1 rounded-sm cursor-pointer border border-gray-300 px-4 py-3 text-[15px] font-semibold text-gray-700"
            >
              Cancel
              <XCircleIcon size={14} />
            </button>

            <button
              type="button"
              disabled={
                isLoading ||
                !selectedCounsellor
              }
              onClick={handleSave}
              className="mt-2 w-full flex items-center justify-center gap-1 rounded-sm bg-[#0f172a] px-4 py-3 text-[15px] font-semibold text-white shadow-md hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Save Counsellor
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