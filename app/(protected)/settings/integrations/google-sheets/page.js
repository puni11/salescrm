"use client";

import { useState } from "react";

export default function GoogleSheetIntegration() {
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [loading, setLoading] = useState(false);
  const [integration, setIntegration] = useState(null);

  const generate = async () => {
    setLoading(true);

    const res = await fetch("/api/integrations/google-sheets/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sheetUrl,
        sheetName,
      }),
    });

    const data = await res.json();

    setIntegration(data);

    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-10">

      <h1 className="text-3xl font-bold mb-8">
        Google Sheets Integration
      </h1>

      <div className="space-y-5">

        <input
          placeholder="Google Sheet URL"
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
          className="w-full border rounded-lg p-3"
        />

        <input
          placeholder="Sheet Name (Example: Leads)"
          value={sheetName}
          onChange={(e) => setSheetName(e.target.value)}
          className="w-full border rounded-lg p-3"
        />

        <button
          onClick={generate}
          disabled={loading}
          className="bg-blue-600 text-white rounded-lg px-5 py-3"
        >
          {loading ? "Generating..." : "Generate Integration"}
        </button>

      </div>

      {integration && (

        <div className="mt-10 border rounded-xl p-6">

          <h2 className="text-xl font-semibold mb-4">
            Integration Created
          </h2>

          <div className="space-y-4">

            <div>
              <strong>Webhook</strong>

              <pre className="bg-gray-100 p-3 rounded mt-1 overflow-auto">
                {integration.webhook}
              </pre>
            </div>

            <div>
              <strong>Secret</strong>

              <pre className="bg-gray-100 p-3 rounded mt-1 overflow-auto">
                {integration.secret}
              </pre>
            </div>

            <div>
              <strong>Apps Script</strong>

              <textarea
                readOnly
                rows={18}
                value={integration.script}
                className="w-full border rounded-lg p-3 font-mono"
              />
            </div>

          </div>

        </div>

      )}

    </div>
  );
}