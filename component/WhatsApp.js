"use client";

import { useEffect } from "react";
import {
  MessageCircle,
  X,
  FileText,
  Phone,
  Sparkles,
  UserRound,
} from "lucide-react";

const hoverBg = "hover:bg-[rgba(55,53,47,0.06)]";

export default function WhatsAppModel({
  selectedLead,
  setIsWhatsAppModalOpen,
  whatsappMessage,
  setWhatsappMessage,
  session,
  course,
  toast,
}) {
  // ==========================================
  // DYNAMIC VALUES
  // ==========================================

  const leadName = selectedLead?.name || "there";

  const counsellorName =
    session?.user?.name || "Gaurav Saluja";

  const program =
    course || "our program";

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setIsWhatsAppModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setIsWhatsAppModalOpen]);

  // ==========================================
  // WHATSAPP MESSAGE TEMPLATES
  // ==========================================

  const getWhatsAppTemplate = (type = "followup") => {

    // ========================================
    // FOLLOW-UP
    // ========================================

    if (type === "followup") {
      return `Hello ${leadName},

Greetings from Grras Solutions – A Red Hat & Linux Foundation Authorized Partner.

This is ${counsellorName}, your personal coordinator at Grras Solutions. I’m reaching out regarding your recent enquiry for our ${program} program.

I tried connecting with you twice, but couldn’t get through. Just wanted to quickly understand your requirement so I can assist you accordingly.

Could you please confirm which of the following applies to you?

* You are interested in ${program} – if you’re currently busy, please share a convenient time and I’ll connect accordingly.

* You are looking for a different course/program – please let me know your requirement, and I’ll suggest the relevant option.

* The enquiry was made by mistake / you’re not looking currently – no worries at all, just let me know so I can update my records accordingly.

I’m here to help you with the right training, certification, course structure, batch schedule, and other details.

Looking forward to hearing from you.`;
    }

    // ========================================
    // CALLBACK
    // ========================================

    if (type === "callback") {
      return `Hello ${leadName},

Greetings from Grras Solutions – A Red Hat & Linux Foundation Authorized Partner.

This is ${counsellorName}, your personal coordinator at Grras Solutions.

I’m following up regarding your enquiry for our ${program} program.

I understand you may be busy at the moment. Please let me know a convenient time for a callback, and I’ll connect with you accordingly.

I’ll be happy to discuss the course structure, certification, batch schedule, fees, training mode, career opportunities, and any other questions you may have.

Please share a suitable time for the call.

Looking forward to speaking with you.`;
    }

    // ========================================
    // INTERESTED
    // ========================================

    if (type === "interested") {
      return `Hello ${leadName},

Thank you for your interest in our ${program} program.

This is ${counsellorName} from Grras Solutions – A Red Hat & Linux Foundation Authorized Partner.

I’ll be happy to help you with all the details regarding the program, including:

• Course structure
• Certification
• Batch schedule
• Fees
• Training mode
• Career opportunities

Please let me know a convenient time to connect, or you can share any specific questions you have here.

I’ll assist you accordingly.

Looking forward to connecting with you.`;
    }

    return "";
  };

  // ==========================================
  // APPLY TEMPLATE
  // ==========================================

  const applyTemplate = (type) => {
    const message = getWhatsAppTemplate(type);

    setWhatsappMessage(message);
  };

  // ==========================================
  // SEND WHATSAPP
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // ========================================
      // CHECK MESSAGE
      // ========================================

      if (!whatsappMessage?.trim()) {
        toast.error("Please enter a message");
        return;
      }

      // ========================================
      // PHONE NUMBER
      // ========================================

      let cleanPhone = String(
        selectedLead?.phone ?? ""
      ).replace(/\D/g, "");

      if (!cleanPhone) {
        toast.error("Lead phone number is missing");
        return;
      }

      // ========================================
      // INDIAN PHONE NUMBER
      // ========================================

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

      // ========================================
      // VALIDATE PHONE
      // ========================================

      if (
        cleanPhone.length !== 12 ||
        !cleanPhone.startsWith("91")
      ) {
        toast.error("Invalid phone number");
        return;
      }

      console.log(
        "WhatsApp Phone:",
        cleanPhone
      );

      // ========================================
      // SAVE WHATSAPP LOG
      // ========================================

      const response = await fetch(
        "/api/whatsapp-log",
        {
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
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to save WhatsApp log"
        );
      }

      // ========================================
      // OPEN WHATSAPP
      // ========================================

      const encodedMessage =
        encodeURIComponent(
          whatsappMessage
        );

      const whatsappUrl =
        `https://api.whatsapp.com/send/?phone=${cleanPhone}` +
        `&text=${encodedMessage}` +
        `&type=phone_number&app_absent=0`;

      window.open(
        whatsappUrl,
        "_blank"
      );

      // ========================================
      // CLEAN UP
      // ========================================

      setIsWhatsAppModalOpen(false);

      setWhatsappMessage("");

      toast.success(
        "WhatsApp activity logged"
      );

    } catch (error) {
      console.error(
        "WhatsApp error:",
        error
      );

      toast.error(
        error?.message ||
          "Something went wrong"
      );
    }
  };

  // ==========================================
  // UI
  // ==========================================

  const templates = [
    ["followup", "Follow-up", FileText],
    ["callback", "Callback", Phone],
    ["interested", "Interested", MessageCircle],
  ];

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-[rgba(15,15,15,0.6)] p-4 sm:py-12"
      
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setIsWhatsAppModalOpen(false);
      }}
    >
      <div
        className="w-full max-w-[680px] overflow-hidden rounded-[6px] bg-white text-[#37352F]"
        style={{
          boxShadow:
            "rgba(15,15,15,0.05) 0 0 0 1px, rgba(15,15,15,0.1) 0 5px 10px, rgba(15,15,15,0.2) 0 15px 40px",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="text-xs text-[#9B9A97]">WhatsApp message</span>
          <button
            type="button"
            onClick={() => setIsWhatsAppModalOpen(false)}
            aria-label="Close"
            className={`rounded-[4px] p-1.5 text-[#787774] ${hoverBg}`}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[72vh] overflow-y-auto px-6 pb-6 pt-2 sm:px-10">
            <h2 className="flex items-center gap-2.5 text-[28px] font-bold leading-tight tracking-[-0.01em]">
              <MessageCircle size={26} className="shrink-0 text-[#0F7B6C]" />
              Message {selectedLead?.name || "Lead"}
            </h2>

            <p className="mt-1 flex items-center gap-1.5 text-sm text-[#787774]">
              <UserRound size={14} className="text-[#9B9A97]" />
              From {counsellorName}
            </p>

            {/* Quick templates */}
            <div className="mt-5">
              <div className="mb-2 flex items-center gap-1.5 text-sm text-[#787774]">
                <Sparkles size={14} className="text-[#9B9A97]" />
                Quick message templates
              </div>

              <div className="flex flex-wrap gap-1.5">
                {templates.map(([type, label, Icon]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => applyTemplate(type)}
                    className="inline-flex h-7 items-center gap-1.5 rounded-[4px] border border-dashed border-[#D3D1CB] px-2.5 text-sm text-[#787774] transition-colors hover:bg-[rgba(55,53,47,0.06)]"
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm text-[#787774]">Custom message</label>

                {whatsappMessage && (
                  <span className="text-xs text-[#9B9A97]">
                    {whatsappMessage.length} characters
                  </span>
                )}
              </div>

              <textarea
                required
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                rows={10}
                placeholder="Type your message here or select a template..."
                className="w-full resize-none rounded-[4px] border border-[#E3E2E0] bg-white px-3 py-2.5 text-sm leading-6 outline-none transition-shadow placeholder:text-[#C7C6C3] focus:border-[#2383E2] focus:ring-2 focus:ring-[#2383E2]/30"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 border-t border-[#E9E9E7] px-4 py-3">
            <button
              type="button"
              onClick={() => setIsWhatsAppModalOpen(false)}
              className="h-8 rounded-[4px] border border-[#E3E2E0] bg-white px-3 text-sm transition-colors hover:bg-[rgba(55,53,47,0.06)]"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="inline-flex h-8 items-center gap-2 rounded-[4px] bg-[#0F7B6C] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[#0B6A5C]"
            >
              <MessageCircle size={15} />
              Send via WhatsApp
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}