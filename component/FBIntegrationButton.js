"use client";

export default function FacebookIntegration() {
  async function connectFacebook() {
    window.location.href = "/api/facebook/login";
  }

  return (
    <div className="max-w-5xl mx-auto p-8">

      <div className="border rounded-xl p-8">

        <h1 className="text-3xl font-bold">
          Facebook Lead Ads
        </h1>

        <p className="mt-2 text-gray-500">
          Connect your Facebook Page to automatically import Lead Ads into your CRM.
        </p>

        <div className="mt-8">

          <button
            onClick={connectFacebook}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Connect Facebook
          </button>

        </div>

      </div>

    </div>
  );
}