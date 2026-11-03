import { useState, useEffect } from "react";
import { X, Loader2, UserRound } from "lucide-react";

const hoverBg = "hover:bg-[rgba(55,53,47,0.06)]";

export default function ChangeCounsellor({
  selectedLead,
  counsellor = [],
  setChangeCounsellorModal,
}) {
  const [selectedCounsellor, setSelectedCounsellor] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !isLoading) setChangeCounsellorModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLoading, setChangeCounsellorModal]);

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
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-[rgba(15,15,15,0.6)] p-4 sm:py-16"
     
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          setChangeCounsellorModal(false);
        }
      }}
    >
      <div
        className="w-full max-w-[440px] overflow-hidden rounded-[6px] bg-white text-[#37352F]"
        style={{
          boxShadow:
            "rgba(15,15,15,0.05) 0 0 0 1px, rgba(15,15,15,0.1) 0 5px 10px, rgba(15,15,15,0.2) 0 15px 40px",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="text-xs text-[#9B9A97]">Lead</span>
          <button
            type="button"
            onClick={() => setChangeCounsellorModal(false)}
            disabled={isLoading}
            aria-label="Close"
            className={`rounded-[4px] p-1.5 text-[#787774] disabled:opacity-50 ${hoverBg}`}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pb-6 pt-2 sm:px-8">
          <h2 className="text-[26px] font-bold leading-tight tracking-[-0.01em]">
            Change counsellor
          </h2>

          <div className="mt-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
              <div className="flex w-32 shrink-0 items-center gap-2 px-1 py-2 text-sm text-[#787774]">
                <UserRound size={15} className="text-[#9B9A97]" />
                Counsellor
              </div>
              <div className="min-w-0 flex-1">
                <select
                  value={selectedCounsellor}
                  onChange={(e) =>
                    setSelectedCounsellor(e.target.value)
                  }
                  className="w-full rounded-[4px] border border-[#E3E2E0] bg-white px-2.5 py-2 text-sm outline-none transition-shadow focus:border-[#2383E2] focus:ring-2 focus:ring-[#2383E2]/30"
                >
                  <option value="">
                    Select counsellor
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
            </div>

            {error && (
              <div className="mt-3 rounded-[4px] bg-[#FFE2DD] px-3 py-2 text-sm text-[#5D1715]">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#E9E9E7] px-4 py-3">
          <button
            type="button"
            onClick={() =>
              setChangeCounsellorModal(false)
            }
            disabled={isLoading}
            className="h-8 rounded-[4px] border border-[#E3E2E0] bg-white px-3 text-sm transition-colors hover:bg-[rgba(55,53,47,0.06)] disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={
              isLoading ||
              !selectedCounsellor
            }
            onClick={handleSave}
            className="inline-flex h-8 items-center gap-2 rounded-[4px] bg-[#2383E2] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[#0077D4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              "Save counsellor"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}