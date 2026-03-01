// lib/payments/store.ts
import { promises as fs } from "fs";
import path from "path";

export type PaymentRecord = {
  sessionId: string;
  paid: boolean;
  scenarioId: string;
  productKey: string;
  pdfToken: string;
  amountTotal: number | null;
  currency: string | null;
  customerEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE_PATH = path.join(DATA_DIR, "payments.json");

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(FILE_PATH);
  } catch {
    await fs.writeFile(FILE_PATH, JSON.stringify({}, null, 2), "utf8");
  }
}

async function readAll(): Promise<Record<string, PaymentRecord>> {
  await ensureFile();
  const raw = await fs.readFile(FILE_PATH, "utf8");
  return JSON.parse(raw || "{}");
}

async function writeAll(data: Record<string, PaymentRecord>) {
  await ensureFile();
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Upsert met idempotency:
 * - Als record al bestaat én paid=true:
 *   - pdfToken blijft behouden (NIET overschrijven)
 *   - createdAt blijft behouden
 *   - je mag wel ontbrekende velden aanvullen (email/amount/currency), en updatedAt updaten
 */
export async function upsertPaymentRecord(
  input: Omit<PaymentRecord, "createdAt" | "updatedAt">
) {
  const all = await readAll();
  const now = new Date().toISOString();

  const existing = all[input.sessionId];

  if (existing?.paid) {
    const merged: PaymentRecord = {
      ...existing,
      // paid blijft true
      paid: true,

      // scenario/product mogen we niet laten "flippen" naar leeg/anders door retries
      scenarioId: existing.scenarioId || input.scenarioId,
      productKey: existing.productKey || input.productKey,

      // 🔒 cruciaal: token NOOIT overschrijven als paid al true is
      pdfToken: existing.pdfToken,

      // zachte updates: enkel aanvullen als het vroeger null/empty was
      amountTotal: existing.amountTotal ?? input.amountTotal,
      currency: existing.currency ?? input.currency,
      customerEmail: existing.customerEmail ?? input.customerEmail,

      createdAt: existing.createdAt,
      updatedAt: now,
    };

    all[input.sessionId] = merged;
    await writeAll(all);
    return merged;
  }

  // eerste keer (of nog niet paid): normale upsert
  const record: PaymentRecord = {
    ...input,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  all[input.sessionId] = record;
  await writeAll(all);
  return record;
}

export async function getPaymentRecord(sessionId: string) {
  const all = await readAll();
  return all[sessionId] ?? null;
}

export async function getPaymentByPdfToken(pdfToken: string) {
  const all = await readAll();
  const values = Object.values(all);
  return values.find((r) => r.pdfToken === pdfToken) ?? null;
}