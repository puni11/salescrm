"use client";

export default function FacebookIntegration() {
  async function connectFacebook() {
    const res = await fetch("/api/facebook/register-webhook", {
      method: "POST",
    });

    const data = await res.json();

    console.log(data);
  }

  return (
    <button onClick={connectFacebook}>
      Subscribe Page
    </button>
  );
}