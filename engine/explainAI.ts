import type { Intake, ScenarioResult } from "@/engine/types";
import { getOpenAI, OPENAI_MODEL } from "@/lib/openai";

type Lang = "nl" | "fr" | "en";

function riskMeaningText(lang: Lang, riskLevel: "low" | "medium" | "high") {
  if (riskLevel === "low") {
    return lang === "nl"
      ? "Laag risico: weinig juridische onzekerheid op basis van de ingegeven gegevens."
      : lang === "fr"
      ? "Risque faible : peu d’incertitude juridique selon les données fournies."
      : "Low risk: limited legal uncertainty based on provided data.";
  }

  if (riskLevel === "medium") {
    return lang === "nl"
      ? "Gemiddeld risico: er zijn aandachtspunten; vraag schriftelijke bevestiging en wees voorzichtig met documenten."
      : lang === "fr"
      ? "Risque moyen : certains points nécessitent une confirmation écrite; prudence avec les documents."
      : "Medium risk: some elements require written confirmation; be careful with documents.";
  }

  return lang === "nl"
    ? "Hoog risico: juridisch gevoelige situatie; teken niets zonder nazicht en overweeg juridisch advies."
    : lang === "fr"
    ? "Risque élevé : situation juridiquement sensible; ne signez rien sans vérification et envisagez un avis juridique."
    : "High risk: legally sensitive situation; don’t sign without review and consider legal advice.";
}

// ✅ NEW UI schema (matcht ResultRenderer)
export type ExplainAIOutput = {
  title: string;
  scenario: { code: string; label: string };
  timeline: {
    noticeRangeText: string;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    missingInputs: string[];
  };
  riskMeaning?: string;
  explanation: {
    plainSummary: string;
    whyThisScenario: { engineFactId: string; statement: string }[];
  };
  nextSteps: { title: string; details: string; engineFactIds: string[] }[];
  questionsToAsk: string[];
  guardrails: { notLegalAdvice: boolean; whatWeDidNotAssume: string[] };
};

const AI_ENABLED = process.env.AI_ENABLED === "true";

function labelFromScenarioCode(code: string) {
  return (code || "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export async function explainScenarioAI(
  intake: Intake,
  scenario: ScenarioResult
): Promise<ExplainAIOutput> {
  const min = scenario?.noticeRange?.[0];
  const max = scenario?.noticeRange?.[1];

  const noticeRangeText =
    typeof min === "number" && typeof max === "number" ? `${min}–${max} weeks` : "—";

  const scenarioCode = scenario?.scenario ?? "unknown";
  const scenarioLabel = labelFromScenarioCode(scenarioCode);

  // Audience (later uitbreidbaar)
  const audience = "employee";

  // ✅ Always-safe fallback in NEW schema
  if (!AI_ENABLED || !process.env.OPENAI_API_KEY) {
    return {
      title: "Your result",
      scenario: { code: scenarioCode, label: scenarioLabel },
      timeline: {
        noticeRangeText,
        confidence: "LOW",
        missingInputs: [],
      },
        riskMeaning: riskMeaningText(intake.language as Lang, scenario.riskLevel),
      explanation: {
        plainSummary:
          "AI is currently disabled. This is an informational simulation based on your selected inputs. The notice range is produced by the deterministic engine.",
        whyThisScenario: [
          { engineFactId: "engine_scenario", statement: `Scenario selected: ${scenarioCode}.` },
          { engineFactId: "engine_notice", statement: `Estimated notice range: ${noticeRangeText}.` },
        ],
      },
      nextSteps: [
        {
          title: "Save your result",
          details: "Keep a record of the scenario and estimated notice range.",
          engineFactIds: ["engine_notice"],
        },
        {
          title: "Verify key details",
          details: "Small details can change outcomes. Double-check contract type and dates.",
          engineFactIds: ["engine_scenario"],
        },
        {
          title: "Ask for written confirmation",
          details: "Request written confirmation of timelines and your final working day.",
          engineFactIds: ["engine_notice"],
        },
      ],
      questionsToAsk: [
        "Which contract type applies to my situation?",
        "Are there sector/CBA rules that change the notice calculation?",
        "What documents should I request from HR?",
      ],
      guardrails: {
        notLegalAdvice: true,
        whatWeDidNotAssume: [
          "Exact contract clauses",
          "Sector-specific rules",
          "Special protections or exceptions",
        ],
      },
    };
  }

  const payload = {
    country: intake.country,
    employeeType: intake.employeeType,
    initiatedBy: intake.initiatedBy,
    terminationReason: intake.terminationReason,
    seniorityYears: intake.seniorityYears,

    scenario: {
      code: scenarioCode,
      label: scenarioLabel,
    },

    noticeRangeWeeks: scenario.noticeRange, // [min,max]
    noticeRangeText,

    audience, // "employee"
  };

  // ✅ SYSTEM RULES = dit is wat jij “system rules” noemt
  const system = [
    "You are ClearTerms.",
    `Write the entire output in ${intake.language === "nl" ? "Dutch" : intake.language === "fr" ? "French" : "English"}.`,
    "You are writing for the end-user (the employee). Never write instructions as if the user is the employer.",
    "The engine already selected the scenario and notice range. You MUST NOT recalculate or change them.",
    "You MUST NOT invent facts not present in the input. If missing, mention it in guardrails.whatWeDidNotAssume.",
    "Write plain English, helpful and cautious.",
    "Return ONLY valid JSON matching exactly this schema (no extra keys, no markdown).",
    "",
    "Schema:",
    JSON.stringify(
      {
        title: "string",
        scenario: { code: "string", label: "string" },
        timeline: {
          noticeRangeText: "string",
          confidence: "HIGH|MEDIUM|LOW",
          missingInputs: ["string"],
        },
        explanation: {
          plainSummary: "string",
          whyThisScenario: [{ engineFactId: "string", statement: "string" }],
        },
        nextSteps: [{ title: "string", details: "string", engineFactIds: ["string"] }],
        questionsToAsk: ["string"],
        guardrails: { notLegalAdvice: true, whatWeDidNotAssume: ["string"] },
      },
      null,
      2
    ),
  ].join("\n");

  const user = `Create a ClearTerms explanation for this engine payload:\n${JSON.stringify(
    payload,
    null,
    2
  )}\n\nRules:
- Keep scenario.code/label exactly as given.
- Keep timeline.noticeRangeText exactly as given.
- whyThisScenario must reference only engine facts you can justify from the payload.
- whyThisScenario: max 3 bullets. Do not list raw input fields. Explain the logic in plain language.
- Use engineFactId values like: "engine_scenario", "engine_notice", "engine_input_<field>".
- nextSteps: 3-6 items, each short and actionable.
- Next steps must be written for the employee (e.g., ask HR, review contract, document dates). Never employer actions like drafting termination letters or notifying the employee.
- questionsToAsk: 3-6 items, relevant to the employee.`;

  const openai = getOpenAI();
  
  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const text = resp.choices?.[0]?.message?.content || "";

try {
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  const cleaned =
    jsonStart >= 0 && jsonEnd >= 0 ? text.slice(jsonStart, jsonEnd + 1) : text;

  const parsed = JSON.parse(cleaned) as ExplainAIOutput;

  // ✅ sanity checks for required shape
  if (!parsed?.title) throw new Error("Missing title");
  if (!parsed?.scenario?.code || !parsed?.scenario?.label) throw new Error("Missing scenario");
  if (!parsed?.timeline?.noticeRangeText) throw new Error("Missing timeline");
  if (!parsed?.explanation?.plainSummary) throw new Error("Missing explanation");
  if (!Array.isArray(parsed?.nextSteps)) throw new Error("Missing nextSteps");
  if (!Array.isArray(parsed?.questionsToAsk)) throw new Error("Missing questionsToAsk");

    return {
    ...parsed,
    riskMeaning: riskMeaningText(intake.language as Lang, scenario.riskLevel),
  };
} catch {
  // ✅ fail-safe fallback in NEW schema
  return {
    title: "Your result",
    scenario: { code: scenarioCode, label: scenarioLabel },
    timeline: {
      noticeRangeText,
      confidence: "MEDIUM",
      missingInputs: [],
    },
      riskMeaning: riskMeaningText(intake.language as Lang, scenario.riskLevel),
    explanation: {
      plainSummary:
        "We generated an informational explanation, but formatting failed. The scenario and notice range shown are still valid from the engine.",
      whyThisScenario: [
        { engineFactId: "engine_scenario", statement: `Scenario selected: ${scenarioCode}.` },
        { engineFactId: "engine_notice", statement: `Estimated notice range: ${noticeRangeText}.` },
      ],
    },
    nextSteps: [
      {
        title: "Save your result",
        details: "Keep a record of the scenario and estimated notice range.",
        engineFactIds: ["engine_notice"],
      },
      {
        title: "Verify key details",
        details: "Double-check contract type and dates; details can change outcomes.",
        engineFactIds: ["engine_scenario"],
      },
      {
        title: "Discuss with HR",
        details: "Ask for written confirmation of timelines and your final working day.",
        engineFactIds: ["engine_notice"],
      },
    ],
    questionsToAsk: [
      "Which inputs matter most for this scenario?",
      "Are there exceptions that could change the notice range?",
      "What documents should I request from HR?",
    ],
    guardrails: {
      notLegalAdvice: true,
      whatWeDidNotAssume: [
        "Exact contract clauses",
        "Sector-specific rules",
        "Special protections or exceptions",
      ],
    },
  };
}
}
