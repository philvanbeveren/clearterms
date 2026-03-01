// app/api/pdf/download/route.ts
import { NextResponse } from "next/server";

import { getPaymentByPdfToken } from "../../../../lib/payments/store";
import { generateScenarioPdf } from "../../../../lib/pdf/generateScenarioPdf";
import { pdfExists, savePdf, readPdf } from "../../../../lib/pdf/storage";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = String(url.searchParams.get("token") ?? "").trim();

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const payment = await getPaymentByPdfToken(token);

  if (!payment) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  if (!payment.paid) {
    return NextResponse.json({ error: "Payment not completed" }, { status: 403 });
  }

  if (!payment.scenarioId) {
    return NextResponse.json({ error: "Missing scenarioId" }, { status: 500 });
  }

  // 🔥 CACHE LOGIC
  let pdfBuffer: Buffer;

  if (await pdfExists(token)) {
    pdfBuffer = await readPdf(token);
  } else {
    pdfBuffer = await generateScenarioPdf(payment.scenarioId);
    await savePdf(token, pdfBuffer);
  }

  // ✅ BodyInit-safe for NextResponse typings
  const body = new Uint8Array(pdfBuffer);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="clearterms-${payment.scenarioId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}