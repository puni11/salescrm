"use client";

import { useState } from "react";

export default function ImportLeadsPage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);

  async function uploadFile() {
    if (!file) {
      alert("Please select a file.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/leads/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message);
        return;
      }

      setHeaders(data.headers);
      setRows(data.rows);

    } catch (err) {
      console.error(err);
      alert("Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-10">

      <h1 className="text-3xl font-bold mb-8">
        Import Leads
      </h1>

      <div className="border rounded-xl p-6">

        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <button
          onClick={uploadFile}
          className="bg-blue-600 text-white px-5 py-2 rounded ml-4"
        >
          {loading ? "Uploading..." : "Upload"}
        </button>

      </div>

      {rows.length > 0 && (

        <div className="mt-8 overflow-auto">

          <table className="min-w-full border">

            <thead>

              <tr>

                {headers.map((header) => (
                  <th
                    key={header}
                    className="border px-4 py-2 bg-gray-100"
                  >
                    {header}
                  </th>
                ))}

              </tr>

            </thead>

            <tbody>

              {rows.slice(0, 10).map((row, index) => (

                <tr key={index}>

                  {headers.map((header) => (

                    <td
                      key={header}
                      className="border px-4 py-2"
                    >
                      {row[header]}
                    </td>

                  ))}

                </tr>

              ))}

            </tbody>

          </table>

          <p className="mt-4 text-gray-500">
            Showing first 10 rows.
          </p>

        </div>

      )}

    </div>
  );
}