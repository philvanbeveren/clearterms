// lib/pdf/renderSummaryPdf.ts
import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf, Image } from "@react-pdf/renderer";
import type { ExplainAIOutput } from "@/engine/explainAI";
import { getOpenAI, OPENAI_MODEL } from "@/lib/openai";
import path from "path";
import fs from "fs/promises";

type Lang = "nl" | "fr" | "en";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 11, fontFamily: "Helvetica", lineHeight: 1.35 },

  header: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brandLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 55, height: 55 },
  brandName: { fontSize: 18, fontWeight: 700 },
  brandTagline: { fontSize: 8, color: "#888", marginTop: 3 },

  title: { fontSize: 18, marginBottom: 4, fontWeight: 700 },
  muted: { color: "#666", fontSize: 9, marginBottom: 10 },

  sectionTitle: { fontSize: 12, marginTop: 12, marginBottom: 6, fontWeight: 700 },

  box: {
    borderWidth: 1,
    borderColor: "#e2e2e2",
    padding: 10,
    marginBottom: 10,
    borderRadius: 6,
  },

  line: { marginBottom: 6 },
  bullet: { marginBottom: 4 },
  bulletRow: { flexDirection: "row", marginBottom: 4 },
  bulletDot: { width: 12, fontWeight: 700 },
  bulletText: { flex: 1 },

  numberedRow: { flexDirection: "row", marginBottom: 4 },
  number: { width: 14, fontWeight: 700 },
  numberText: { flex: 1 },

  emailBox: {
    borderWidth: 1,
    borderColor: "#e2e2e2",
    padding: 10,
    marginBottom: 10,
    borderRadius: 6,
    backgroundColor: "#f7f7f7",
  },
  mono: { fontFamily: "Courier", fontSize: 10, lineHeight: 1.4 },

  riskRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },

  pill: {
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 999,
    fontSize: 9,
    fontWeight: 700,
  },
  pillLow: { backgroundColor: "#E7F7ED", color: "#146B2D" },
  pillMedium: { backgroundColor: "#FFF4E5", color: "#8A4B00" },
  pillHigh: { backgroundColor: "#FDECEC", color: "#8A1111" },
});

const PDF_T = {
  nl: {
    disclaimerTop: "Informatieve simulatie — geen juridisch advies.",
    scenario: "Scenario",
    timeline: "Tijdlijn",
    notice: "Opzegtermijn",
    riskLevel: "Risiconiveau",
    risk: "Risico",
    why: "Waarom dit geldt",
    nextSteps: "Volgende stappen",
    questions: "Vragen om te stellen",
    hrReady: "HR-klare samenvatting",
    footer:
      "Dit document is gegenereerd met een deterministische scenario-engine + AI-uitleg. Het is geen juridisch advies.",
    dash: "—",
    titleFallback: "ClearTerms Samenvatting",
  },
  fr: {
    disclaimerTop: "Simulation informative — pas un avis juridique.",
    scenario: "Scénario",
    timeline: "Chronologie",
    notice: "Préavis",
    riskLevel: "Niveau de risque",
    risk: "Risque",
    why: "Pourquoi cela s'applique",
    nextSteps: "Prochaines étapes",
    questions: "Questions à poser",
    hrReady: "Résumé prêt pour RH",
    footer:
      "Ce document est généré à partir d’un moteur déterministe + une explication IA. Il ne constitue pas un avis juridique.",
    dash: "—",
    titleFallback: "Résumé ClearTerms",
  },
  en: {
    disclaimerTop: "Informational simulation only — not legal advice.",
    scenario: "Scenario",
    timeline: "Estimated timeline",
    notice: "Notice period",
    riskLevel: "Risk level",
    risk: "Risk",
    why: "Why this applies",
    nextSteps: "Next steps",
    questions: "Questions to ask",
    hrReady: "HR-ready summary",
    footer:
      "This document is generated from a deterministic scenario engine + AI explanation. It does not provide legal advice.",
    dash: "—",
    titleFallback: "ClearTerms Summary",
  },
} as const;

function normalizeLang(x: any): Lang {
  const s = String(x || "").toLowerCase();
  return s === "nl" || s === "fr" || s === "en" ? (s as Lang) : "en";
}

async function generateHrReadyBullets(args: {
  lang: Lang;
  scenarioLabel: string;
  scenarioCode: string;
  noticeText: string;
  riskLevel: string;
  summary: string;
}): Promise<string[]> {
  const languageName = args.lang === "nl" ? "Dutch" : args.lang === "fr" ? "French" : "English";

  const system = [
    "You are ClearTerms.",
    `Write in ${languageName}.`,
    "Return ONLY valid JSON, no markdown, no extra keys.",
    'Output schema: {"bullets": ["..."]}',
    "Bullets must be short, practical, HR-facing, and NOT legal advice.",
    "Do NOT invent facts. Use only provided inputs.",
  ].join("\n");

  const user = [
    "Create exactly 5 HR-ready bullets that the employee can copy/paste in an email to HR.",
    "Keep each bullet 1 sentence.",
    "",
    `Scenario: ${args.scenarioLabel} (${args.scenarioCode})`,
    `Notice period: ${args.noticeText}`,
    `Risk level: ${args.riskLevel}`,
    `User summary: ${args.summary}`,
  ].join("\n");

  try {
    const openai = getOpenAI();
    const resp = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const text = resp.choices?.[0]?.message?.content || "";
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    const cleaned = jsonStart >= 0 && jsonEnd >= 0 ? text.slice(jsonStart, jsonEnd + 1) : text;

    const parsed = JSON.parse(cleaned) as { bullets?: string[] };
    const bullets = Array.isArray(parsed?.bullets) ? parsed.bullets : [];
    return bullets.filter((b) => typeof b === "string" && b.trim().length > 0).slice(0, 5);
  } catch {
    return [];
  }
}

function buildPdfElement(
  data: ExplainAIOutput,
  engine: any,
  lang: Lang,
  hrBullets: string[],
  logoDataUri: string | null
) {
  const t = PDF_T[lang] ?? PDF_T.en;

  const title = data?.title ?? t.titleFallback;
  const scenarioLabel = data?.scenario?.label ?? t.dash;
  const scenarioCode = data?.scenario?.code ?? "unknown";
  const noticeText = data?.timeline?.noticeRangeText ?? t.dash;
  const summary = data?.explanation?.plainSummary ?? t.dash;

  const riskLevel = String(engine?.scenario?.riskLevel ?? "unknown").toLowerCase();

  const why = Array.isArray(data?.explanation?.whyThisScenario) ? data.explanation.whyThisScenario : [];
  const steps = Array.isArray(data?.nextSteps) ? data.nextSteps : [];
  const qs = Array.isArray(data?.questionsToAsk) ? data.questionsToAsk : [];

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },

      React.createElement(
        View,
        { style: styles.header },
        React.createElement(
          View,
          { style: styles.brandRow },
          React.createElement(
            View,
            { style: styles.brandLeft },
            logoDataUri ? React.createElement(Image, { style: styles.logo, src: logoDataUri }) : null,
            React.createElement(
              View,
              null,
              React.createElement(Text, { style: styles.brandName }, "ClearTerms"),
              React.createElement(
                Text,
                { style: styles.brandTagline },
                lang === "nl"
                  ? "Snelle, duidelijke uitleg — geen juridisch advies"
                  : lang === "fr"
                  ? "Explications rapides et claires — pas un avis juridique"
                  : "Fast, clear explanations — not legal advice"
              )
            )
          ),
          React.createElement(Text, { style: styles.muted }, process.env.NEXT_PUBLIC_SITE_URL || "clearterms")
        )
      ),

      React.createElement(Text, { style: styles.title }, title),
      React.createElement(Text, { style: styles.muted }, t.disclaimerTop),

      React.createElement(
        View,
        { style: styles.box },
        React.createElement(Text, { style: styles.sectionTitle }, t.scenario),
        React.createElement(Text, { style: styles.line }, `${scenarioLabel} (${scenarioCode})`),

        React.createElement(Text, { style: styles.sectionTitle }, t.timeline),
        React.createElement(Text, { style: styles.line }, `${t.notice}: ${noticeText}`),

        React.createElement(Text, { style: styles.sectionTitle }, t.riskLevel),
        React.createElement(
          View,
          { style: styles.riskRow },
          React.createElement(Text, { style: styles.line }, `${t.risk}:`),
          React.createElement(
            Text,
            {
              style: [
                styles.pill,
                riskLevel === "low" ? styles.pillLow : riskLevel === "high" ? styles.pillHigh : styles.pillMedium,
              ],
            },
            riskLevel.toUpperCase()
          )
        )
      ),

      React.createElement(Text, { style: styles.sectionTitle }, t.hrReady),
      hrBullets?.length
        ? React.createElement(
            View,
            null,
            ...hrBullets.slice(0, 5).map((b, i) =>
              React.createElement(
                View,
                { key: `hr-${i}`, style: styles.bulletRow },
                React.createElement(Text, { style: styles.bulletDot }, "•"),
                React.createElement(Text, { style: styles.bulletText }, b)
              )
            )
          )
        : React.createElement(Text, { style: styles.line }, t.dash),

      React.createElement(Text, { style: styles.sectionTitle }, t.why),
      React.createElement(Text, { style: styles.line }, summary),

      why.length
        ? React.createElement(
            View,
            { style: { marginTop: 6 } },
            ...why.slice(0, 6).map((w: any, i: number) =>
              React.createElement(
                View,
                { key: `why-${i}`, style: styles.bulletRow },
                React.createElement(Text, { style: styles.bulletDot }, "•"),
                React.createElement(Text, { style: styles.bulletText }, w?.statement ?? "")
              )
            )
          )
        : null,

      React.createElement(Text, { style: styles.sectionTitle }, t.nextSteps),
      steps.length
        ? React.createElement(
            View,
            null,
            ...steps.slice(0, 8).map((s: any, i: number) =>
              React.createElement(
                View,
                { key: `step-${i}`, style: styles.numberedRow },
                React.createElement(Text, { style: styles.number }, `${i + 1}.`),
                React.createElement(Text, { style: styles.numberText }, `${s?.title ?? "Step"}${s?.details ? `: ${s.details}` : ""}`)
              )
            )
          )
        : React.createElement(Text, { style: styles.line }, t.dash),

      React.createElement(Text, { style: styles.sectionTitle }, t.questions),
      qs.length
        ? React.createElement(
            View,
            null,
            ...qs.slice(0, 10).map((q: string, i: number) =>
              React.createElement(
                View,
                { key: `q-${i}`, style: styles.bulletRow },
                React.createElement(Text, { style: styles.bulletDot }, "•"),
                React.createElement(Text, { style: styles.bulletText }, q)
              )
            )
          )
        : React.createElement(Text, { style: styles.line }, t.dash),

      React.createElement(View, { style: { marginTop: 14 } }, React.createElement(Text, { style: styles.muted }, t.footer))
    )
  );
}

export async function renderSummaryPdfToBuffer(args: { ai: ExplainAIOutput; engine: any; lang?: string | null }) {
  const data = args.ai;
  const engine = args.engine;

  const lang = normalizeLang(args.lang ?? engine?.intake?.language ?? "en");

  let logoDataUri: string | null = null;
  try {
    const logoPath = path.join(process.cwd(), "public", "clearterms-logo.png");
    const buf = await fs.readFile(logoPath);
    logoDataUri = `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    logoDataUri = null;
  }

  const scenarioLabel = data?.scenario?.label ?? "";
  const scenarioCode = data?.scenario?.code ?? "";
  const noticeText = data?.timeline?.noticeRangeText ?? "";
  const riskLevel = String(engine?.scenario?.riskLevel ?? "unknown").toLowerCase();
  const summary = data?.explanation?.plainSummary ?? "";

  const hrBullets = await generateHrReadyBullets({
    lang,
    scenarioLabel,
    scenarioCode,
    noticeText,
    riskLevel,
    summary,
  });

  const element = buildPdfElement(data, engine, lang, hrBullets, logoDataUri);

  const instance = pdf(element);
  const blob = await instance.toBlob();
  const ab = await blob.arrayBuffer();
  return Buffer.from(new Uint8Array(ab));
}