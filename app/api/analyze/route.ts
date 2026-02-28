import { NextRequest, NextResponse } from "next/server";
import { runLegalEngine } from "@/lib/engine/legalEngine";
import { explainWithAI } from "@/lib/ai/explainAI";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    const text = (body?.text ?? "").toString();
    if (!text || text.trim().length < 40) {
      return NextResponse.json(
        { error: "Please paste a longer contract text (min 40 characters)." },
        { status: 400 }
      );
    }

    const engine = runLegalEngine(text);

    // AI is mandatory → explain always
    const aiExplanation = await explainWithAI(engine);

    return NextResponse.json({
      verdict: (engine as any).verdict ?? null,
      engine,
      aiExplanation,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
