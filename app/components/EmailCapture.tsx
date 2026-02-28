"use client";

import { useState } from "react";

export default function EmailCapture() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!email.includes("@")) return;

    // v1: localStorage (later DB / MailerLite / ConvertKit)
    const existing = JSON.parse(localStorage.getItem("clearterms_emails") || "[]");
    localStorage.setItem(
      "clearterms_emails",
      JSON.stringify([...existing, email])
    );

    setSent(true);
  }

  return (
    <div className="border rounded p-4 space-y-2">
      <h3 className="font-semibold">Get a free summary</h3>
      <p className="text-sm text-gray-600">
        Receive a simple explanation and updates when ClearTerms improves.
      </p>

      {sent ? (
        <p className="text-green-700 text-sm">Thanks! We’ll keep you updated.</p>
      ) : (
        <div className="flex gap-2">
          <input
            type="email"
            className="border p-2 flex-1"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            onClick={submit}
            className="bg-black text-white px-3 py-2"
          >
            Notify me
          </button>
        </div>
      )}
    </div>
  );
}
