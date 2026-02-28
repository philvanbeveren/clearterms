import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const email = String(body?.email || "").trim().toLowerCase();
    const lang = String(body?.lang || "en");
    const scenario = String(body?.scenario || "");
    const notice = String(body?.notice || "");

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // Dev storage: log it (later: DB / Mailchimp / Brevo)
    console.log("LEAD_CAPTURED:", {
      email,
      lang,
      scenario,
      notice,
      at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Lead capture failed" }, { status: 500 });
  }
}