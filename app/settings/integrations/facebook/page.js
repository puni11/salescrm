"use client";

export default function FacebookIntegration() {
  async function connectFacebook() {
    window.location.href = "/api/facebook/connect";
  }

  return (
    <div className="max-w-3xl mx-auto p-8">

      <h1 className="text-3xl font-bold">
        Facebook Integration
      </h1>

      <p className="mt-3 text-gray-500">
        Connect your Meta Business account to receive Lead Ads directly in the CRM.
      </p>

     <button
  onClick={() => (window.location = "/api/facebook/connect")}
>
  Connect Facebook
</button>

    </div>
  );
}