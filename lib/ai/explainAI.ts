import OpenAI from "openai";
import { explainSchema, type ExplainAIOutput } from "./explainSchema";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export type EngineResult = {
  scenario: {
    code: string;          // "standard_termination"
    label: string;         // "Standard termination"
  };
  noticeRange: {
    minWeeks: number;      // 10
    maxWeeks: number;      // 14
  };
  engineFacts: Array<{
    id: string;            // "fact_years_of_service_missing"
    text: string;          // human readable fact
  }>;
  missingInputs: string[]; // ["years_of_service"] when not provided
};

export async function explainWithAI(engineResult: EngineResult): Promise<ExplainAIOutput> {
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
  if (process.env.AI_ENABLED !== "true") throw new Error("AI is disabled (AI_ENABLED is not 'true')");

  const payload = {
    ...engineResult,
    noticeRangeText: `${engineResult.noticeRange.minWeeks}–${engineResult.noticeRange.maxWeeks} weeks`,
  };

  const response = (await client.responses.create(
    {
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0,
      max_output_tokens: 650,

      response_format: {
        type: "json_schema",
        json_schema: explainSchema,
      },

      input: [
        {
          role: "system",
          content:
            "You are ClearTerms. The deterministic engine already decided the scenario and notice range. " +
            "You MUST NOT invent any facts (no years, no employer intent, no personal situation). " +
            "You may ONLY restate and explain the engine-provided facts. " +
            "Every statement in 'whyThisScenario' must reference a valid engineFactId from engineFacts. " +
            "If information is missing, put it in timeline.missingInputs and guardrails.whatWeDidNotAssume. " +
            "Output must match the JSON schema exactly. No extra keys. No markdown.",
        },
        { role: "user", content: JSON.stringify(payload) },
      ],
    } as any
  )) as any;

  const parsed = response.output_parsed as ExplainAIOutput | null;
  if (!parsed) throw new Error("AI returned no parsed JSON output");
  return parsed;
}
