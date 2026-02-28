// app/api/pay/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

import Stripe from "stripe";
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key);
}

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const body = await req.json().catch(() => ({}));

    // IMPORTANT: we need an internal id to link payment -> scenario -> pdfToken later (webhook)
    const scenarioId = String(body?.scenarioId ?? "").trim();
    if (!scenarioId) {
      return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
    }

    const email = body?.customerEmail ? String(body.customerEmail) : undefined;

    // Recommended: use a Stripe Price (created in Stripe dashboard)
    const priceId = process.env.STRIPE_PRICE_PDF;
    if (!priceId) {
      return NextResponse.json({ error: "STRIPE_PRICE_PDF missing" }, { status: 500 });
    }

    // Your app URL (local or prod)
    const appUrl =
      (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000")
        .replace(/\/$/, "");

    const successUrl = `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/checkout/cancel?scenarioId=${encodeURIComponent(scenarioId)}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,

      line_items: [{ price: priceId, quantity: 1 }],

      success_url: successUrl,
      cancel_url: cancelUrl,

      // Key: passed to webhook so we can generate/store pdfToken for THIS scenario
      metadata: {
        scenarioId,
        productKey: "clearterms_pdf",
      },
    });

    return NextResponse.json({ ok: true, url: session.url, sessionId: session.id });
  } catch (err: any) {
    console.error("PAY_ROUTE_ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}