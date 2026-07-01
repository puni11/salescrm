"use client";

import { useEffect, useMemo, useState } from "react";

export default function GoogleSheetIntegration() {
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetName, setSheetName] = useState("");

  const [loadingColumns, setLoadingColumns] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);

  const [headers, setHeaders] = useState([]);
  const [crmFields, setCrmFields] = useState([]);
  const [mapping, setMapping] = useState({});

  const [integration, setIntegration] = useState(null);

  useEffect(() => {
    loadCRMFields();
  }, []);

  const groupedFields = useMemo(() => {
    return crmFields.reduce((acc, field) => {
      if (!acc[field.group]) {
        acc[field.group] = [];
      }

      acc[field.group].push(field);

      return acc;
    }, {});
  }, [crmFields]);

  async function loadCRMFields() {
    try {
      const res = await fetch("/api/crm/fields");
      const data = await res.json();

      setCrmFields(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadColumns() {
    try {
      setLoadingColumns(true);

      const res = await fetch(
        "/api/integrations/google-sheets/load-columns",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sheetUrl,
            sheetName,
          }),
        }
      );

      const data = await res.json();

      if (!data.success) {
        alert(data.message);
        return;
      }

      setHeaders(data.headers);

      const auto = {};

      crmFields.forEach((field) => {
        const match = data.headers.find(
          (header) =>
            header.trim().toLowerCase() ===
            field.label.trim().toLowerCase()
        );

        if (match) {
          auto[field.value] = match;
        }
      });

      setMapping(auto);
    } catch (err) {
      console.error(err);

      alert("Unable to load columns.");
    } finally {
      setLoadingColumns(false);
    }
  }

  async function generateIntegration() {
    try {
      setLoadingGenerate(true);

      const res = await fetch(
        "/api/integrations/google-sheets/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sheetUrl,
            sheetName,
            mapping,
          }),
        }
      );

      const data = await res.json();

      if (!data.success) {
        alert(data.message);
        return;
      }

      setIntegration(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGenerate(false);
    }
  }

  function copy(text) {
    navigator.clipboard.writeText(text);

    alert("Copied");
  }
return (
  <div className="max-w-7xl mx-auto p-8">

    <div className="mb-8">
      <h1 className="text-3xl font-bold">
        Google Sheets Integration
      </h1>

      <p className="text-gray-500 mt-2">
        Connect your Google Sheet with CRM and map columns.
      </p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

      {/* LEFT */}

      <div className="lg:col-span-1">

        <div className="bg-white border rounded-xl p-6 shadow-sm">

          <h2 className="text-xl font-semibold mb-6">
            Connection
          </h2>

          <div className="space-y-5">

            <div>
              <label className="font-medium block mb-2">
                Google Sheet URL
              </label>

              <input
                value={sheetUrl}
                onChange={(e)=>setSheetUrl(e.target.value)}
                placeholder="Paste Google Sheet URL"
                className="w-full border rounded-lg p-3"
              />
            </div>

            <div>

              <label className="font-medium block mb-2">
                Sheet Name
              </label>

              <input
                value={sheetName}
                onChange={(e)=>setSheetName(e.target.value)}
                placeholder="Example: Leads"
                className="w-full border rounded-lg p-3"
              />

            </div>

            <button
              onClick={loadColumns}
              disabled={loadingColumns}
              className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg py-3"
            >
              {
                loadingColumns
                ? "Loading Columns..."
                : "Load Columns"
              }
            </button>

          </div>

          {
            headers.length>0 &&

            <div className="mt-8">

              <h3 className="font-semibold mb-3">
                Google Columns
              </h3>

              <div className="flex flex-wrap gap-2">

                {
                  headers.map((header)=>(

                    <span
                      key={header}
                      className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm"
                    >
                      {header}
                    </span>

                  ))
                }

              </div>

            </div>

          }

        </div>

      </div>

      {/* RIGHT */}

      <div className="lg:col-span-2">

        <div className="bg-white border rounded-xl shadow-sm">

          <div className="border-b px-6 py-4">

            <h2 className="text-xl font-semibold">
              Field Mapping
            </h2>

          </div>

          <div className="p-6">

            {
              headers.length===0 &&

              <div className="text-center py-20 text-gray-500">

                Load Google Sheet columns to begin mapping.

              </div>

            }

            {
              headers.length>0 &&

              Object.entries(groupedFields).map(([group,fields])=>(

                <div
                  key={group}
                  className="mb-10"
                >

                  <h3 className="font-bold text-lg mb-5">
                    {group}
                  </h3>

                  <div className="space-y-4">

                    {
                      fields.map((field)=>(

                        <div
                          key={field.value}
                          className="grid grid-cols-2 gap-6 items-center"
                        >

                          <div>

                            <div className="font-medium">

                              {field.label}

                            </div>

                            <div className="text-sm text-gray-500">

                              {field.type}

                            </div>

                          </div>

                          <select

                            className="border rounded-lg p-3"

                            value={mapping[field.value] || ""}

                            onChange={(e)=>

                              setMapping({

                                ...mapping,

                                [field.value]:e.target.value

                              })

                            }

                          >

                            <option value="">
                              Not Mapped
                            </option>

                            {
                              headers.map((header)=>(

                                <option
                                  key={header}
                                  value={header}
                                >
                                  {header}
                                </option>

                              ))
                            }

                          </select>

                        </div>

                      ))
                    }

                  </div>

                </div>

              ))

            }

          </div>

        </div>
             {headers.length > 0 && (
              <div className="mt-8 border-t pt-6">

                <button
                  onClick={generateIntegration}
                  disabled={loadingGenerate}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
                >
                  {loadingGenerate
                    ? "Generating..."
                    : "Generate Integration"}
                </button>

              </div>
            )}

            {integration && (

              <div className="mt-10 border rounded-xl p-6 bg-gray-50">

                <h2 className="text-xl font-semibold mb-6">
                  Integration Details
                </h2>

                <div className="space-y-6">

                  <div>

                    <div className="flex items-center justify-between mb-2">

                      <label className="font-medium">
                        Webhook URL
                      </label>

                      <button
                        onClick={() => copy(integration.webhook)}
                        className="text-blue-600 text-sm"
                      >
                        Copy
                      </button>

                    </div>

                    <textarea
                      readOnly
                      rows={2}
                      value={integration.webhook}
                      className="w-full border rounded-lg p-3 bg-white"
                    />

                  </div>

                  <div>

                    <div className="flex items-center justify-between mb-2">

                      <label className="font-medium">
                        Secret
                      </label>

                      <button
                        onClick={() => copy(integration.secret)}
                        className="text-blue-600 text-sm"
                      >
                        Copy
                      </button>

                    </div>

                    <textarea
                      readOnly
                      rows={2}
                      value={integration.secret}
                      className="w-full border rounded-lg p-3 bg-white"
                    />

                  </div>

                  <div>

                    <div className="flex items-center justify-between mb-2">

                      <label className="font-medium">
                        Google Apps Script
                      </label>

                      <button
                        onClick={() => copy(integration.script)}
                        className="text-blue-600 text-sm"
                      >
                        Copy Script
                      </button>

                    </div>

                    <textarea
                      readOnly
                      rows={18}
                      value={integration.script}
                      className="w-full border rounded-lg p-3 font-mono text-sm bg-white"
                    />

                  </div>

                </div>

              </div>

            )}

          </div>

        </div>

      </div>


);
}