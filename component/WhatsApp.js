"use client";

import {
  MessageCircle,
  X,
  FileText,
  Phone,
  Sparkles,
} from "lucide-react";

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

  return (
    <div
      className="
        fixed inset-0
        bg-gray-900/50
        backdrop-blur-sm
        z-[90]
        flex items-center justify-center
        p-4
      "
    >
      <div
        className="
          bg-white
          rounded-2xl
          shadow-xl
          w-full
          max-w-2xl
          max-h-[90vh]
          overflow-y-auto
          p-6
        "
      >

        {/* =====================================
            HEADER
        ====================================== */}

        <div className="flex justify-between items-center mb-5">

          <h2
            className="
              text-xl
              font-bold
              text-gray-900
              flex
              items-center
              gap-2
            "
          >
            <MessageCircle
              className="text-green-500"
              size={22}
            />

            Message{" "}
            {selectedLead?.name || "Lead"}
          </h2>

          <button
            type="button"
            onClick={() =>
              setIsWhatsAppModalOpen(false)
            }
            className="
              text-gray-400
              hover:text-gray-600
              hover:bg-gray-100
              rounded-full
              p-1.5
              transition-colors
            "
          >
            <X size={22} />
          </button>

        </div>

        {/* =====================================
            QUICK TEMPLATES
        ====================================== */}

        <div className="mb-5">

          <div className="flex items-center gap-2 mb-2">

            <Sparkles
              size={16}
              className="text-gray-500"
            />

            <label
              className="
                text-sm
                font-medium
                text-gray-700
              "
            >
              Quick Message Templates
            </label>

          </div>

          <div className="grid grid-cols-3 gap-2 mt-2">

            {/* FOLLOW-UP */}

            <button
              type="button"
              onClick={() =>
                applyTemplate("followup")
              }
              className="
                flex
                items-center
                justify-center
                gap-1.5
                px-2
                py-0.5
                cursor-pointer
                border
                border-gray-200
                bg-gray-50
                text-gray-700
                font-medium
                rounded-lg
                hover:bg-gray-100
                hover:border-gray-300
                transition-all
                text-xs
              "
            >
              <FileText size={18} />

              <span>
                Follow-up
              </span>
            </button>

            {/* CALLBACK */}

            <button
              type="button"
              onClick={() =>
                applyTemplate("callback")
              }
              className="
                flex
                items-center
                justify-center
                cursor-pointer
                gap-1.5
                px-2
                py-0.5
                border
                border-gray-200
                bg-gray-50
                text-gray-700
                font-medium
                rounded-lg
                hover:bg-gray-100
                hover:border-gray-300
                transition-all
                text-xs
              "
            >
              <Phone size={18} />

              <span>
                Callback
              </span>
            </button>

            {/* INTERESTED */}

            <button
              type="button"
              onClick={() =>
                applyTemplate("interested")
              }
              className="
                flex
                items-center
                justify-center
                gap-1.5 
                cursor-pointer
                px-2
                py-2
                border
                border-gray-200
                bg-gray-50
                text-gray-700
                font-medium
                rounded-lg
                hover:bg-gray-100
                hover:border-gray-300
                transition-all
                text-xs
              "
            >
              <MessageCircle size={18} />

              <span>
                Interested
              </span>
            </button>

          </div>
        </div>

        {/* =====================================
            MESSAGE FORM
        ====================================== */}

        <form onSubmit={handleSubmit}>

          <div className="mb-4">

            <div className="flex justify-between items-center mb-1">

              <label
                className="
                  block
                  text-sm
                  font-medium
                  text-gray-700
                "
              >
                Custom Message
              </label>

              {whatsappMessage && (
                <span className="text-xs text-gray-400">
                  {whatsappMessage.length} characters
                </span>
              )}

            </div>

            <textarea
              required
              value={whatsappMessage}
              onChange={(e) =>
                setWhatsappMessage(
                  e.target.value
                )
              }
              rows={10}
              placeholder="Type your message here or select a template..."
              className="
                w-full
                border
                border-gray-300
                rounded-lg
                px-4
                py-3
                focus:ring-2
                focus:ring-green-500
                focus:border-green-500
                outline-none
                resize-none
                text-sm
                transition
              "
            />

          </div>

          {/* ===================================
              BUTTONS
          ==================================== */}

          <div
            className="
              flex
              justify-end
              gap-3
              border-t
              border-gray-100
              pt-4
              mt-2
            "
          >

            {/* CANCEL */}

            <button
              type="button"
              onClick={() =>
                setIsWhatsAppModalOpen(false)
              }
              className="
                px-5
                py-2.5
                text-gray-700
                font-medium
                hover:bg-gray-100
                rounded-lg
                transition-colors
              "
            >
              Cancel
            </button>

            {/* SEND */}

            <button
              type="submit"
              className="
                px-5
                py-2.5
                bg-green-500
                text-white
                font-medium
                rounded-lg
                hover:bg-green-600
                active:bg-green-700
                transition-colors
                shadow-sm
                flex
                items-center
                gap-2
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