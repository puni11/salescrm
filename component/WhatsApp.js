import { MessageCircle, X } from "lucide-react";

export default function WhatsAppModel({
  selectedLead,
  setIsWhatsAppModalOpen,
  whatsappMessage,
  setWhatsappMessage,
  toast,
}) {
  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="text-green-500" />
            Message {selectedLead?.name || "Lead"}
          </h2>

          <button
            type="button"
            onClick={() => setIsWhatsAppModalOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();

            try {
              // ==========================================
              // PHONE NUMBER
              // ==========================================

              let cleanPhone = String(
                selectedLead?.phone ?? ""
              ).replace(/\D/g, "");

              if (!cleanPhone) {
                toast.error("Lead phone number is missing");
                return;
              }

              // ==========================================
              // INDIAN PHONE NUMBER
              // ==========================================

              // 10 digit number
              if (cleanPhone.length === 10) {
                cleanPhone = `91${cleanPhone}`;
              }

              // 11 digits starting with 0
              else if (
                cleanPhone.length === 11 &&
                cleanPhone.startsWith("0")
              ) {
                cleanPhone = `91${cleanPhone.substring(1)}`;
              }

              // Already 91 + 10 digits
              else if (
                cleanPhone.length === 12 &&
                cleanPhone.startsWith("91")
              ) {
                // Already correct
              }

              // ==========================================
              // VALIDATE
              // ==========================================

              if (
                cleanPhone.length !== 12 ||
                !cleanPhone.startsWith("91")
              ) {
                toast.error("Invalid phone number");
                return;
              }

              console.log("WhatsApp Phone:", cleanPhone);

              // ==========================================
              // SAVE WHATSAPP LOG
              // ==========================================

              const response = await fetch("/api/whatsapp-log", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  leadId: selectedLead?._id,
                  phone: cleanPhone,
                  message: whatsappMessage,
                  sentAt: new Date(),
                }),
              });

              const data = await response.json();

              if (!response.ok) {
                throw new Error(
                  data?.message || "Failed to save WhatsApp log"
                );
              }

              // ==========================================
              // OPEN WHATSAPP
              // ==========================================

              const encodedMessage =
                encodeURIComponent(whatsappMessage);

              const whatsappUrl =
                `https://api.whatsapp.com/send/?phone=${cleanPhone}` +
                `&text=${encodedMessage}` +
                `&type=phone_number&app_absent=0`;

              window.open(whatsappUrl, "_blank");

              // ==========================================
              // CLEAN UP
              // ==========================================

              setIsWhatsAppModalOpen(false);
              setWhatsappMessage("");

              toast.success("WhatsApp activity logged");

            } catch (error) {
              console.error("WhatsApp error:", error);

              toast.error(
                error?.message || "Something went wrong"
              );
            }
          }}
        >
          {/* Message */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom Message
            </label>

            <textarea
              required
              value={whatsappMessage}
              onChange={(e) =>
                setWhatsappMessage(e.target.value)
              }
              rows={5}
              placeholder="Type your message here..."
              className="
                w-full
                border border-gray-300
                rounded-lg
                px-4 py-3
                focus:ring-2
                focus:ring-green-500
                outline-none
                resize-none
                text-sm
              "
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 mt-2">

            <button
              type="button"
              onClick={() =>
                setIsWhatsAppModalOpen(false)
              }
              className="
                px-5 py-2
                text-gray-700
                font-medium
                hover:bg-gray-100
                rounded-lg
                transition-colors
              "
            >
              Cancel
            </button>

            <button
              type="submit"
              className="
                px-5 py-2
                bg-green-500
                text-white
                font-medium
                rounded-lg
                hover:bg-green-600
                transition-colors
                shadow-sm
                flex items-center gap-2
              "
            >
              <MessageCircle size={18} />
              Send via WhatsApp
            </button>

          </div>
        </form>
      </div>
    </div>
  );
}