import { useEffect } from "react";
import { Trash2Icon } from "lucide-react";

export default function LeadDelete({
  deleteModal,
  setDeleteModal,
  handleDelete,
  setSelectedLeadId,
  setLeads,
  toast,
  getLeadId,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setDeleteModal({
          open: false,
          id: null,
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setDeleteModal]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-[rgba(15,15,15,0.6)] p-4 sm:py-24"
      
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          setDeleteModal({
            open: false,
            id: null,
          });
        }
      }}
    >
      <div
        className="w-full max-w-[420px] overflow-hidden rounded-[6px] bg-white text-[#37352F]"
        style={{
          boxShadow:
            "rgba(15,15,15,0.05) 0 0 0 1px, rgba(15,15,15,0.1) 0 5px 10px, rgba(15,15,15,0.2) 0 15px 40px",
        }}
      >
        <div className="px-6 pb-5 pt-6 sm:px-8">
          <span className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-[#FFE2DD]">
            <Trash2Icon size={20} className="text-[#E03E3E]" />
          </span>

          <h3 className="mt-4 text-[22px] font-bold leading-tight tracking-[-0.01em]">
            Delete lead?
          </h3>

          <p className="mt-2 text-sm leading-6 text-[#787774]">
            Are you sure you want to delete this lead?{" "}
            <span className="font-medium text-[#E03E3E]">
              This action cannot be undone.
            </span>
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#E9E9E7] px-4 py-3">
          <button
            onClick={() =>
              setDeleteModal({
                open: false,
                id: null,
              })
            }
            className="h-8 rounded-[4px] border border-[#E3E2E0] bg-white px-3 text-sm transition-colors hover:bg-[rgba(55,53,47,0.06)]"
          >
            Cancel
          </button>

          <button
            onClick={async () => {
              await handleDelete(
                deleteModal.id,
                setDeleteModal,
                setSelectedLeadId,
                setLeads,
                toast,
                getLeadId
              );

              setDeleteModal({
                open: false,
                id: null,
              });
            }}
            className="h-8 rounded-[4px] bg-[#E03E3E] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[#C93535]"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}