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

export async function upsertPaymentRecord(input: Omit<PaymentRecord, "createdAt" | "updatedAt">) {
  const all = await readAll();
  const now = new Date().toISOString();

  const existing = all[input.sessionId];
  all[input.sessionId] = {
    ...input,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await writeAll(all);
  return all[input.sessionId];
}

export async function getPaymentRecord(sessionId: string) {
  const all = await readAll();
  return all[sessionId] ?? null;
}