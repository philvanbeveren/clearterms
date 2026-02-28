import type { Intake, ScenarioResult } from "./types";

export function applyRoleLevelModifiers(intake: Intake, result: ScenarioResult): ScenarioResult {
  // default: niets doen
  if (intake.roleLevel !== "management") return result;

  const flags = Array.isArray(result.flags) ? [...result.flags] : [];
  flags.push("ROLE_LEVEL_MANAGEMENT");

  // management/kader → meestal meer kans op extra clausules (non-compete, bonus, car policy, settlement, etc.)
  // We wijzigen (voorlopig) de wettelijke opzeg niet, maar verhogen wel voorzichtig het risico.
  const riskLevel: ScenarioResult["riskLevel"] =
    result.riskLevel === "low" ? "medium" : result.riskLevel;

  return { ...result, riskLevel, flags };
}