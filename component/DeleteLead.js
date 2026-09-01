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
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[90%] max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">

        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <Trash2Icon className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <h3 className="mt-5 text-center text-xl font-bold text-gray-900">
          Delete Lead?
        </h3>

        <p className="mt-2 text-center text-gray-500">
          Are you sure you want to delete this lead?
          <br />
          <span className="font-semibold text-red-600">
            This action cannot be undone.
          </span>
        </p>

        <div className="mt-6 flex gap-3">

          <button
            onClick={() =>
              setDeleteModal({
                open: false,
                id: null,
              })
            }
            className="flex-1 rounded-lg border border-gray-300 py-3 font-medium text-gray-700 transition hover:bg-gray-100"
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
            className="flex-1 rounded-lg bg-red-600 py-3 font-medium text-white transition hover:bg-red-700"
          >
            Delete
          </button>

        </div>
      </div>
    </div>
  );
}