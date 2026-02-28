import { Intake, ScenarioResult } from "./types";

export async function explainScenario(intake: Intake, scenario: ScenarioResult) {
  return `Based on the information provided, your situation matches "${scenario.scenario}".
Estimated notice period: ${scenario.noticeRange[0]}–${scenario.noticeRange[1]} weeks.

This is a general informational simulation, not legal advice.`;
}
