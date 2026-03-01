"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState<"loading" | "paid" | "pending" | "error">("loading");
  const [pdfToken, setPdfToken] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const checkPayment = async () => {
      try {
        const res = await fetch(`/api/payment-status?session_id=${sessionId}`);
        const data = await res.json();

        if (data.status === "paid") {
          setPdfToken(data.pdfToken);
          setStatus("paid");
        } else if (data.status === "pending") {
          setStatus("pending");
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    };

    checkPayment();
  }, [sessionId]);

  return (
    <div style={{ padding: 40 }}>
      <h1>Payment Successful 🎉</h1>

      {status === "loading" && <p>Checking payment status...</p>}
      {status === "pending" && <p>Payment still processing...</p>}
      {status === "error" && <p>Something went wrong.</p>}

      {status === "paid" && pdfToken && (
        <>
          <p>Your ClearTerms PDF is ready.</p>
          <a
            href={`/api/pdf/download?token=${pdfToken}`}
            style={{
              display: "inline-block",
              marginTop: 20,
              padding: "12px 24px",
              background: "black",
              color: "white",
              textDecoration: "none",
              borderRadius: 8,
            }}
          >
            Download PDF
          </a>
        </>
      )}
    </div>
  );
}