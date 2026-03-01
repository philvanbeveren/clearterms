// app/api/pay/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { upsertScenarioSnapshot } from "../../../lib/payments/snapshots";

export const runtime = "nodejs";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key);
}

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const body = await req.json().catch(() => ({}));

    // 1) Validate inputs
    const scenarioId = String(body?.scenarioId ?? "").trim();
    if (!scenarioId) {
      return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
    }

    const customerEmail = String(body?.customerEmail ?? "").trim().toLowerCase();
    if (!customerEmail || !customerEmail.includes("@")) {
      return NextResponse.json({ error: "customerEmail is required" }, { status: 400 });
    }

    const ai = body?.ai;
    const engine = body?.engine;

    // We REQUIRE snapshot input, because later secure download must rebuild the PDF from this snapshot.
    if (!ai || !engine) {
      return NextResponse.json(
        { error: "Missing ai/engine payload (needed for PDF generation)." },
        { status: 400 }
      );
    }

    // 2) Stripe Price
    const priceId = process.env.STRIPE_PRICE_PDF;
    if (!priceId) {
      return NextResponse.json({ error: "STRIPE_PRICE_PDF missing" }, { status: 500 });
    }

    // 3) Build URLs
    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000"
    ).replace(/\/$/, "");

    const successUrl = `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/checkout/cancel?scenarioId=${encodeURIComponent(scenarioId)}`;

    // 4) Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: customerEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,

      // Key: webhook uses this to link payment -> scenario -> pdfToken
      metadata: {
        scenarioId,
        productKey: "clearterms_pdf",
      },
    });

    // 5) Store snapshot AND link it to this sessionId
    //    (Important: secure PDF download needs to find exact AI/engine output for this payment.)
    await upsertScenarioSnapshot({
      scenarioId,
      sessionId: session.id,
      customerEmail,
      ai,
      engine,
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