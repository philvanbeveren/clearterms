import type { EngineResult } from "../ai/explainAI";

export function runLegalEngine(contractText: string): EngineResult {
  const t = contractText.toLowerCase();

  const engineFacts: EngineResult["engineFacts"] = [];
  const missingInputs: string[] = [];

  // --- RULE: unilateral termination ---
  if (
    t.includes("unilateral") ||
    t.includes("eenzijdig") ||
    t.includes("without notice") ||
    t.includes("zonder opzeg")
  ) {
    engineFacts.push({
      id: "fact_unilateral_termination",
      text: "Contract allows termination by one party without clear notice or conditions.",
    });
  }

  // --- RULE: liability shift ---
  if (
    t.includes("liability") ||
    t.includes("aansprakelijkheid") ||
    t.includes("indemnify") ||
    t.includes("vrijwaren")
  ) {
    engineFacts.push({
      id: "fact_liability_shift",
      text: "Contract may shift liability heavily to one party through indemnity or exclusions.",
    });
  }

  // --- SCENARIO RESOLUTION ---
  let scenario: EngineResult["scenario"] = {
    code: "low_risk",
    label: "Low risk contract",
  };

  let noticeRange = { minWeeks: 0, maxWeeks: 0 };

  if (engineFacts.length >= 2) {
    scenario = {
      code: "high_risk_termination",
      label: "High risk termination scenario",
    };
    noticeRange = { minWeeks: 10, maxWeeks: 14 };
  } else if (engineFacts.length === 1) {
    scenario = {
      code: "medium_risk_termination",
      label: "Medium risk termination scenario",
    };
    noticeRange = { minWeeks: 6, maxWeeks: 10 };
  }

  // Example: missing info you might want later
  if (!t.includes("year")) {
    missingInputs.push("years_of_service");
  }

  return {
    scenario,
    noticeRange,
    engineFacts,
    missingInputs,
  };
}
