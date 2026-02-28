import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    aiEnabled: process.env.AI_ENABLED === "true",
    hasKey: !!process.env.OPENAI_API_KEY,
  });
}
