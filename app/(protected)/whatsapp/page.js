"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import WhatsAppSidebar from "@/component/whatsApp/Sidebar";
import WhatsAppPageChat from "@/component/whatsApp/WhatsAppPageChat";

function WhatsAppPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mobile = searchParams.get("mobile") || "";
  const name = searchParams.get("name") || "";

  const selectedContact = mobile ? { mobile, name } : null;

  const handleSelectContact = (contact) => {
    if (!contact?.mobile) return;

    const params = new URLSearchParams({
      mobile: String(contact.mobile).replace(/\D/g, "").slice(-10),
      name: contact.name || "",
    });

    router.push(`/whatsapp?${params.toString()}`);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] min-h-0 overflow-hidden rounded-xl border border-[#EAEAEA] bg-white">
      {/* Sidebar */}
      <aside className="flex h-full w-[380px] max-w-full shrink-0 flex-col border-r border-[#EAEAEA]">
        <WhatsAppSidebar
          selectedContact={selectedContact}
          onSelectContact={handleSelectContact}
        />
      </aside>

      {/* Main Chat Area */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
        {mobile ? (
          <WhatsAppPageChat
            mobile={mobile}
            name={name}
            className="h-full w-full"
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5F5F3]">
                <span className="text-xl text-[#888]">✉</span>
              </div>

              <p className="mt-3 text-sm font-medium text-[#444]">
                Your messages
              </p>

              <p className="mt-1 text-xs text-[#999]">
                Select a conversation to get started.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function WhatsAppPage() {
  return (
    <Suspense fallback={<div className="h-full bg-white" />}>
      <WhatsAppPageContent />
    </Suspense>
  );
}