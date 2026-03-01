// app/api/pdf/download/route.ts
import { NextResponse } from "next/server";

import { getPaymentByPdfToken } from "../../../../lib/payments/store";
import { renderSummaryPdfToBuffer } from "../../../../lib/pdf/renderSummaryPdf";
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

  // ✅ must exist for “real PDF”
  if (!payment.snapshotAi || !payment.snapshotEngine) {
    return NextResponse.json(
      { error: "Snapshot missing for this payment. (Webhook/snapshot linking issue)" },
      { status: 500 }
    );
  }

  // 🔥 cache per token
  let pdfBuffer: Buffer;

  if (await pdfExists(token)) {
    pdfBuffer = await readPdf(token);
  } else {
    pdfBuffer = await renderSummaryPdfToBuffer({
      ai: payment.snapshotAi,
      engine: payment.snapshotEngine,
      lang: payment.snapshotLang,
    });
    await savePdf(token, pdfBuffer);
  }

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