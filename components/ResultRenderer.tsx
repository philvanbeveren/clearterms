import type { ExplainAIOutput } from "@/lib/ai/explainSchema";

export function ResultRenderer({ data }: { data: ExplainAIOutput }) {
  const scenarioLabel = data?.scenario?.label ?? "Unknown scenario";
  const scenarioCode = data?.scenario?.code ?? "unknown";

  const noticeText = data?.timeline?.noticeRangeText ?? "—";
  const missingInputs = data?.timeline?.missingInputs ?? [];

  const plainSummary = data?.explanation?.plainSummary ?? "";
  const why = data?.explanation?.whyThisScenario ?? [];

  const nextSteps = data?.nextSteps ?? [];
  const questions = data?.questionsToAsk ?? [];

  const notLegalAdvice = data?.guardrails?.notLegalAdvice ?? true;
  const notAssumed = data?.guardrails?.whatWeDidNotAssume ?? [];
  const riskMeaning = (data as any)?.riskMeaning ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>{data?.title ?? "Your result"}</h1>

      <section>
        <h2 style={{ fontWeight: 700 }}>Scenario</h2>
        <p>
          <b>{scenarioLabel}</b> ({scenarioCode})
        </p>
      </section>

      <section>
        <h2 style={{ fontWeight: 700 }}>Estimated timeline</h2>
        <p>
          Notice period: <b>{noticeText}</b>
        </p>

        {missingInputs.length > 0 && (
          <p style={{ opacity: 0.7 }}>
            Missing information: {missingInputs.join(", ")}
          </p>
        )}
      </section>

      <section>
        <h2 style={{ fontWeight: 700 }}>Risk level</h2>

          {riskMeaning ? (
          <p style={{ marginTop: 6 }}>{riskMeaning}</p>
        ) : (
          <p style={{ opacity: 0.7 }}>No risk interpretation available.</p>
        )}
      </section>

      <section>
        <h2 style={{ fontWeight: 700 }}>Why this applies</h2>
        {plainSummary && <p style={{ marginTop: 6 }}>{plainSummary}</p>}

        {why.length > 0 ? (
          <ul style={{ marginTop: 8, paddingLeft: 18 }}>
            {why.map((w) => (
              <li key={w.engineFactId}>{w.statement}</li>
            ))}
          </ul>
        ) : (
          <p style={{ opacity: 0.7, marginTop: 8 }}>No supporting facts provided.</p>
        )}
      </section>

      <section>
        <h2 style={{ fontWeight: 700 }}>Next steps</h2>
        {nextSteps.length > 0 ? (
          <ul style={{ marginTop: 8, paddingLeft: 18 }}>
            {nextSteps.map((s, i) => (
              <li key={i}>
                <b>{s.title}</b>: {s.details}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ opacity: 0.7 }}>No next steps provided.</p>
        )}
      </section>

      <section>
        <h2 style={{ fontWeight: 700 }}>Questions to ask</h2>
        {questions.length > 0 ? (
          <ul style={{ marginTop: 8, paddingLeft: 18 }}>
            {questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        ) : (
          <p style={{ opacity: 0.7 }}>No questions provided.</p>
        )}
      </section>

      <section style={{ opacity: 0.75, fontSize: 13 }}>
        {notLegalAdvice && <p>This is an informational simulation, not legal advice.</p>}

        {notAssumed.length > 0 && (
          <>
            <p style={{ marginTop: 8 }}>What we did not assume:</p>
            <ul style={{ paddingLeft: 18 }}>
              {notAssumed.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
