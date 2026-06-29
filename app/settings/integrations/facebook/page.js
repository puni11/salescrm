"use client";

export default function FacebookIntegrationPage() {
  const connectFacebook = () => {
    window.location.href = "/api/facebook/login";
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">
        Facebook Lead Ads
      </h1>

      <p className="mt-4">
        Status: Not Connected
      </p>

      <button
        onClick={connectFacebook}
        className="mt-6 rounded bg-blue-600 px-5 py-2 text-white"
      >
        Connect Facebook
      </button>
    </div>
  );
}