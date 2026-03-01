// lib/payments/snapshots.ts
import { promises as fs } from "fs";
import path from "path";

export type ScenarioSnapshot = {
  scenarioId: string;
  sessionId: string | null;
  customerEmail: string | null;
  ai: any;
  engine: any;
  createdAt: string;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE_PATH = path.join(DATA_DIR, "scenarioSnapshots.json");

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(FILE_PATH);
  } catch {
    await fs.writeFile(FILE_PATH, JSON.stringify({}, null, 2), "utf8");
  }
}

async function readAll(): Promise<Record<string, ScenarioSnapshot>> {
  await ensureFile();
  const raw = await fs.readFile(FILE_PATH, "utf8");
  return JSON.parse(raw || "{}");
}

async function writeAll(data: Record<string, ScenarioSnapshot>) {
  await ensureFile();
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Upsert snapshot by scenarioId.
 * - First call (before payment) can set sessionId=null
 * - Second call (after creating Stripe session) stores sessionId
 */
export async function upsertScenarioSnapshot(input: {
  scenarioId: string;
  sessionId?: string | null;
  customerEmail?: string | null;
  ai: any;
  engine: any;
}) {
  const all = await readAll();
  const now = new Date().toISOString();

  const existing = all[input.scenarioId];

  all[input.scenarioId] = {
    scenarioId: input.scenarioId,
    sessionId: input.sessionId ?? existing?.sessionId ?? null,
    customerEmail: input.customerEmail ?? existing?.customerEmail ?? null,
    ai: input.ai ?? existing?.ai ?? null,
    engine: input.engine ?? existing?.engine ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await writeAll(all);
  return all[input.scenarioId];
}

export async function getScenarioSnapshotByScenarioId(scenarioId: string) {
  const all = await readAll();
  return all[scenarioId] ?? null;
}

export async function getScenarioSnapshotBySessionId(sessionId: string) {
  const all = await readAll();
  const found = Object.values(all).find((s) => s.sessionId === sessionId);
  return found ?? null;
}