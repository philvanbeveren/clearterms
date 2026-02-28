import { Intake, ScenarioResult } from "./types";

export function buildScenario(intake: Intake): ScenarioResult {
  // 1) Hard scenario: dringende reden
  if (intake.terminationReason === "gross_misconduct") {
    return {
      scenario: "immediate_termination",
      noticeRange: [0, 0],
      riskLevel: "high",
      flags: ["no_notice", "legal_risk"],
    };
  }

  // 2) v1 placeholder notice logic (country-agnostic)
  const base = Math.max(4, Math.round(intake.seniorityYears * 2));
  const min = Math.min(base, 52);
  const max = Math.min(base + 4, 52);

  // ✅ 3) Baseline risk (zodat LOW/MEDIUM/HIGH echt mogelijk is)
  let riskLevel: ScenarioResult["riskLevel"] = "low";
  const flags: string[] = [];

  // Employer-initiated = meestal gevoeliger (placeholder)
  if (intake.initiatedBy === "employer") {
    riskLevel = "medium";
    flags.push("employer_initiated");
  }

  // Mutual / medical (placeholder)
  if (intake.terminationReason === "mutual") {
    riskLevel = "low";
    flags.push("mutual_agreement");
  }

  if (intake.terminationReason === "medical") {
    // medische context = vaak extra formaliteiten/risico
    riskLevel = "medium";
    flags.push("medical_context");
  }

  // --- Role level adjustments (kader/management) ---
  if (intake.roleLevel === "management") {
    if (riskLevel === "low") riskLevel = "medium";
    else if (riskLevel === "medium") riskLevel = "high";

    flags.push("management_profile");
    flags.push("ask_written_confirmation");
  }

  return {
    scenario: "standard_termination",
    noticeRange: [min, max],
    riskLevel,
    flags,
  };
}