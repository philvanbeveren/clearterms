// lib/pdf/generateScenarioPdf.ts
import { getScenarioSnapshot } from "@/lib/payments/snapshots";
import { renderClearTermsPdfBuffer } from "@/lib/pdf/cleartermsPdf";

export async function generateScenarioPdf(scenarioId: string) {
  const snap = await getScenarioSnapshot(scenarioId);
  if (!snap) {
    // If this happens, it means we didn’t store ai/engine before payment.
    // Return a clear error PDF? For now: throw.
    throw new Error(`No scenario snapshot found for scenarioId=${scenarioId}`);
  }

  return renderClearTermsPdfBuffer({
    ai: snap.ai,
    engine: snap.engine,
  });
}