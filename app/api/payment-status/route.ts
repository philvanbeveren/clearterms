// app/api/payment-status/route.ts
import { NextResponse } from "next/server";
import { getPaymentRecord } from "../../../lib/payments/store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = String(url.searchParams.get("session_id") ?? "").trim();

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  const payment = await getPaymentRecord(sessionId);

  if (!payment) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }

  if (!payment.paid) {
    return NextResponse.json({ status: "pending" }, { status: 200 });
  }

  return NextResponse.json({
    status: "paid",
    pdfToken: payment.pdfToken,
    scenarioId: payment.scenarioId,
  });
}