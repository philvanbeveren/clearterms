// lib/payments/token.ts
import crypto from "crypto";

export function randomToken(len = 32) {
  // len here is bytes -> output string will be longer
  return crypto.randomBytes(len).toString("hex");
}