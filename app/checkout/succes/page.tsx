// app/checkout/success/page.tsx
export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams.session_id;

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Payment successful ✅</h1>

      {!sessionId ? (
        <p>Missing session_id in URL.</p>
      ) : (
        <>
          <p>Session ID:</p>
          <code style={{ display: "block", padding: 12, background: "#f4f4f5" }}>
            {sessionId}
          </code>

          <p style={{ marginTop: 16 }}>
            Next step: we’ll use this session_id to verify the payment and generate your PDF.
          </p>
        </>
      )}
    </main>
  );
}