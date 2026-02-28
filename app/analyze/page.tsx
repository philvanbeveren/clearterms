"use client";

import { useState } from "react";

type ExplainAIOutput = {
  summary: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  keyPoints: { title: string; explanation: string }[];
  userAdvice: string;
};

export default function AnalyzePage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  async function onAnalyze() {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Request failed");

      setData(json);
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const riskEmoji =
    data?.engine?.verdict === "HIGH_RISK" ? "🔴" : data?.engine?.verdict === "MEDIUM_RISK" ? "🟠" : "🟢";

  const ai: ExplainAIOutput | null = data?.aiExplanation ?? null;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>ClearTerms — Analyze</h1>
      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Paste a contract. Engine decides risk. AI explains.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste contract text here…"
        style={{
          width: "100%",
          height: 220,
          marginTop: 16,
          padding: 12,
          borderRadius: 10,
          border: "1px solid #ddd",
          fontFamily: "inherit",
          fontSize: 14,
        }}
      />

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <button
          onClick={onAnalyze}
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #111",
            background: loading ? "#eee" : "#111",
            color: loading ? "#111" : "#fff",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Analyzing…" : "Analyze"}
        </button>

        <button
          onClick={() => {
            setText("");
            setData(null);
            setError(null);
          }}
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "#fff",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          Clear
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #f3c0c0", borderRadius: 10 }}>
          <b>Error:</b> {error}
        </div>
      )}

      {data && (
        <div style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>
            Risk: {riskEmoji} {data.engine.verdict}
          </h2>

          <div style={{ marginTop: 10, padding: 14, border: "1px solid #ddd", borderRadius: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>AI Summary</h3>
            <p style={{ marginTop: 8 }}>{ai?.summary}</p>

            <h3 style={{ marginTop: 14, fontSize: 16, fontWeight: 700 }}>Key Points</h3>
            <ul style={{ marginTop: 8, paddingLeft: 18 }}>
              {ai?.keyPoints?.map((kp, i) => (
                <li key={i} style={{ marginBottom: 10 }}>
                  <b>{kp.title}:</b> {kp.explanation}
                </li>
              ))}
            </ul>

            <h3 style={{ marginTop: 14, fontSize: 16, fontWeight: 700 }}>Advice</h3>
            <p style={{ marginTop: 8 }}>{ai?.userAdvice}</p>
          </div>

          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Debug: Engine output</summary>
            <pre style={{ marginTop: 10, padding: 12, border: "1px solid #eee", borderRadius: 10, overflowX: "auto" }}>
              {JSON.stringify(data.engine, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
