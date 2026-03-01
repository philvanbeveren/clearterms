// app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { upsertPaymentRecord } from "../../../../lib/payments/store";
import { randomToken } from "../../../../lib/payments/token";
import { getScenarioSnapshotBySessionId } from "../../../../lib/payments/snapshots";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey);

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("WEBHOOK_SIGNATURE_ERROR:", err?.message || err);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  // Only handle checkout.session.completed
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  try {
    const session = event.data.object as Stripe.Checkout.Session;

    const scenarioId = String(session.metadata?.scenarioId ?? "").trim();
    if (!scenarioId) {
      return NextResponse.json({ error: "Missing scenarioId in session metadata" }, { status: 400 });
    }

    // ✅ Find snapshot for this exact session (created in /api/pay)
    const snap = await getScenarioSnapshotBySessionId(session.id);
    if (!snap) {
      console.error("WEBHOOK_SNAPSHOT_NOT_FOUND:", { sessionId: session.id, scenarioId });
      // We still mark paid, but download will fail until snapshot exists
    }

    const pdfToken = randomToken(32);

    await upsertPaymentRecord({
      sessionId: session.id,
      paid: true,
      scenarioId,
      productKey: String(session.metadata?.productKey ?? "clearterms_pdf"),
      pdfToken,
      amountTotal: session.amount_total ?? null,
      currency: session.currency ?? null,
      customerEmail: session.customer_details?.email ?? session.customer_email ?? null,

      // ✅ store snapshot inside payment record too (easy download)
      snapshotAi: snap?.ai ?? null,
      snapshotEngine: snap?.engine ?? null,
      snapshotLang: snap?.engine?.intake?.language ?? null,
    });

    console.log("✅ checkout.session.completed stored:", {
      sessionId: session.id,
      scenarioId,
      paid: true,
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("WEBHOOK_HANDLER_ERROR:", err?.message || err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}