import { NextResponse } from "next/server";
import { normalizeIntake } from "@/engine/intake";
import { buildScenario } from "@/engine/scenario";
import { explainScenarioAI } from "@/engine/explainAI";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const intake = normalizeIntake(body);

    let scenario = buildScenario(intake);

    // ✅ management modifier (kader/management)
    if (intake.roleLevel === "management") {
      scenario = {
    ...scenario,
    riskLevel: scenario.riskLevel === "low" ? "medium" : scenario.riskLevel,
    flags: [...(scenario.flags || []), "ROLE_LEVEL_MANAGEMENT"],
  };
}

    const explanation = await explainScenarioAI(intake, scenario);

    return NextResponse.json({
      engine: { intake, scenario },
      aiExplanation: explanation,

      // legacy (mag later weg)
      intake,
      scenario,
      explanation,
    });
  } catch (err: any) {
    console.error("ENGINE_API_ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown server error" },
      { status: 500 }
    );
  }
}
