// lib/pdf/generateScenarioPdf.ts
import { PDFDocument, StandardFonts } from "pdf-lib";

/**
 * Minimal working PDF generator.
 * Later vervangen we dit door jouw echte ClearTerms PDF content.
 */
export async function generateScenarioPdf(scenarioId: string) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const title = "ClearTerms – PDF Export";
  const body = `ScenarioId: ${scenarioId}\nGenerated: ${new Date().toISOString()}`;

  page.drawText(title, { x: 50, y: 780, size: 22, font });
  page.drawText(body, { x: 50, y: 740, size: 12, font, lineHeight: 16 });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}