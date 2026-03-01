// app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

// ⚠️ Gebruik relatieve imports om rood/alias issues te vermijden
import { upsertPaymentRecord } from "../../../../lib/payments/store";
import { randomToken } from "../../../../lib/payments/token";

export const runtime = "nodejs";

/**
 * Stripe Webhook handler
 * - Verifieert de Stripe signature met STRIPE_WEBHOOK_SECRET
 * - Op checkout.session.completed: maakt een pdfToken aan en bewaart die bij sessionId
 *
 * Vereist env vars:
 * - STRIPE_SECRET_KEY=sk_test_... of sk_live_...
 * - STRIPE_WEBHOOK_SECRET=whsec_...
 */
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET" },
      { status: 500 }
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  let event: Stripe.Event;

  try {
    // Stripe signature verification vraagt RAW body (dus req.text(), niet req.json())
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("WEBHOOK_SIGNATURE_ERROR:", err?.message || err);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  // Alleen relevant event verwerken
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  try {
    const session = event.data.object as Stripe.Checkout.Session;

    const scenarioId = String(session.metadata?.scenarioId ?? "").trim();
    if (!scenarioId) {
      console.error("WEBHOOK_METADATA_ERROR: Missing scenarioId on session", {
        sessionId: session.id,
        metadata: session.metadata,
      });
      return NextResponse.json({ error: "Missing scenarioId in session metadata" }, { status: 400 });
    }

    const productKey = String(session.metadata?.productKey ?? "clearterms_pdf").trim() || "clearterms_pdf";

    // Nieuwe unlock token die we later gebruiken om PDF te downloaden
    // (We genereren hem hier; store-layer moet idempotent zijn op sessionId.)
    const pdfToken = randomToken(32);

    await upsertPaymentRecord({
      sessionId: session.id,
      paid: true,
      scenarioId,
      productKey,
      pdfToken,
      amountTotal: session.amount_total ?? null,
      currency: session.currency ?? null,
      customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
    });

    console.log("✅ checkout.session.completed stored:", {
      sessionId: session.id,
      scenarioId,
      amount: session.amount_total,
      currency: session.currency,
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("WEBHOOK_HANDLER_ERROR:", err?.message || err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}