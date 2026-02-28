// app/api/payment-status/route.ts
import { NextResponse } from "next/server";
import { getPaymentRecord } from "@/lib/payments/store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = String(searchParams.get("session_id") ?? "").trim();

  if (!sessionId) {
    return NextResponse.json({ error: "session_id is required" }, { status: 400 });
  }

  const rec = await getPaymentRecord(sessionId);
  if (!rec) {
    return NextResponse.json({ ok: true, found: false }, { status: 200 });
  }

  return NextResponse.json(
    {
      ok: true,
      found: true,
      paid: rec.paid,
      scenarioId: rec.scenarioId,
      pdfToken: rec.paid ? rec.pdfToken : null,
    },
    { status: 200 }
  );
}