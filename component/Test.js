"use client";

import { useState } from "react";

export default function SendWhatsAppPage() {
const [phone, setPhone] = useState("");
const [name, setName] = useState("");
const [loading, setLoading] = useState(false);
const [response, setResponse] = useState(null);

const sendMessage = async (e) => {
e.preventDefault();


setLoading(true);
setResponse(null);

try {
  const res = await fetch("/api/send-whatsapp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone,
      name,
    }),
  });

  const data = await res.json();

  setResponse(data);
} catch (error) {
  setResponse({
    success: false,
    error: error.message,
  });
}

setLoading(false);


};

return ( <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6"> <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md"> <h1 className="text-2xl font-bold mb-6">
Send WhatsApp Message </h1>

    <form onSubmit={sendMessage} className="space-y-4">
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border p-3 rounded"
        required
      />

      <input
        type="text"
        placeholder="Mobile Number (91xxxxxxxxxx)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full border p-3 rounded"
        required
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 text-white p-3 rounded"
      >
        {loading ? "Sending..." : "Send WhatsApp"}
      </button>
    </form>

    {response && (
      <pre className="mt-4 bg-gray-100 p-3 rounded text-sm overflow-auto">
        {JSON.stringify(response, null, 2)}
      </pre>
    )}
  </div>
</div>

);
}
