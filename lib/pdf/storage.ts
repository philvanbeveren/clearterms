// lib/pdf/storage.ts
import { promises as fs } from "fs";
import path from "path";

const PDF_DIR = path.join(process.cwd(), ".data", "pdfs");

async function ensureDir() {
  await fs.mkdir(PDF_DIR, { recursive: true });
}

export async function getPdfPath(token: string) {
  await ensureDir();
  return path.join(PDF_DIR, `${token}.pdf`);
}

export async function pdfExists(token: string) {
  const filePath = await getPdfPath(token);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function savePdf(token: string, buffer: Buffer) {
  const filePath = await getPdfPath(token);
  await fs.writeFile(filePath, buffer);
}

export async function readPdf(token: string) {
  const filePath = await getPdfPath(token);
  return fs.readFile(filePath);
}