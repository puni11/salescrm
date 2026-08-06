"use client";

export default function NotificationPermissionPopup({
  open,
  onEnable,
  onLater,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

        <div className="mb-4 text-5xl">🔔</div>

        <h2 className="text-2xl font-bold">
          Enable Notifications
        </h2>

        <p className="mt-2 text-gray-600">
          Stay updated with important CRM activities.
        </p>

        <div className="mt-5 space-y-2 text-sm text-gray-700">
          <p>✅ New Lead Assigned</p>
          <p>✅ Follow-up Reminders</p>
          <p>✅ WhatsApp Replies</p>
          <p>✅ Meeting Notifications</p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onLater}
            className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-100"
          >
            Later
          </button>

         <button
  onClick={() => {
    console.log("Button clicked");
    alert("Button clicked");
    onEnable();
  }}
  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
>
  Enable Notifications
</button>
        </div>

      </div>
    </div>
  );
}