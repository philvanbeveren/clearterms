export const explainSchema = {
  name: "clearterms_explanation",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      riskMeaning: { type: "string" },

      scenario: {
        type: "object",
        additionalProperties: false,
        properties: {
          code: { type: "string" }, // e.g. standard_termination
          label: { type: "string" }, // human label
        },
        required: ["code", "label"],
      },

      timeline: {
        type: "object",
        additionalProperties: false,
        properties: {
          noticeRangeText: { type: "string" }, // "10–14 weeks"
          confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          missingInputs: {
            type: "array",
            items: { type: "string" }, // e.g. "years_of_service"
          },
        },
        required: ["noticeRangeText", "confidence", "missingInputs"],
      },

      explanation: {
        type: "object",
        additionalProperties: false,
        properties: {
          plainSummary: { type: "string" },
          whyThisScenario: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                engineFactId: { type: "string" }, // must refer to engine facts
                statement: { type: "string" },
              },
              required: ["engineFactId", "statement"],
            },
          },
        },
        required: ["plainSummary", "whyThisScenario"],
      },

      nextSteps: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            details: { type: "string" },
            engineFactIds: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["title", "details", "engineFactIds"],
        },
      },

      questionsToAsk: {
        type: "array",
        items: { type: "string" },
      },

      guardrails: {
        type: "object",
        additionalProperties: false,
        properties: {
          notLegalAdvice: { type: "boolean" },
          whatWeDidNotAssume: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["notLegalAdvice", "whatWeDidNotAssume"],
      },
    },
    required: ["title", "scenario", "timeline", "explanation", "nextSteps", "questionsToAsk", "guardrails"],
  },
} as const;

export type ExplainAIOutput = {
  title: string;
  riskMeaning?: string;
  scenario: { code: string; label: string };
  timeline: { noticeRangeText: string; confidence: "HIGH" | "MEDIUM" | "LOW"; missingInputs: string[] };
  explanation: { plainSummary: string; whyThisScenario: { engineFactId: string; statement: string }[] };
  nextSteps: { title: string; details: string; engineFactIds: string[] }[];
  questionsToAsk: string[];
  guardrails: { notLegalAdvice: boolean; whatWeDidNotAssume: string[] };
};
