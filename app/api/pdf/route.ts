import { NextRequest } from "next/server";
import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf, Image } from "@react-pdf/renderer";
import type { ExplainAIOutput } from "@/engine/explainAI";
import { getOpenAI, OPENAI_MODEL } from "@/lib/openai";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";

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
  // ✅ fallback style (voor oude plekken waar je nog styles.bullet gebruikt)
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
  return (s === "nl" || s === "fr" || s === "en") ? (s as Lang) : "en";
}

async function generateHrReadyBullets(args: {
  lang: Lang;
  scenarioLabel: string;
  scenarioCode: string;
  noticeText: string;
  riskLevel: string;
  summary: string;
}): Promise<string[]> {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const languageName = args.lang === "nl" ? "Dutch" : args.lang === "fr" ? "French" : "English";

  const system = [
    "You are ClearTerms.",
    `Write in ${languageName}.`,
    "Return ONLY valid JSON, no markdown, no extra keys.",
    "Output schema: {\"bullets\": [\"...\"]}",
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
    const model = OPENAI_MODEL;
    const resp = await openai.chat.completions.create({
      model,
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

  const riskLevel = (engine?.scenario?.riskLevel ?? "unknown").toString();

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
    React.createElement(
      Text,
      { style: styles.muted },
      process.env.NEXT_PUBLIC_SITE_URL || "clearterms"
    )
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
              riskLevel === "low"
                ? styles.pillLow
                : riskLevel === "high"
                ? styles.pillHigh
                : styles.pillMedium,
            ],
          },
          riskLevel.toUpperCase()
        )
      ),
        React.createElement(  Text,  { style: styles.line },
  riskLevel === "low"
    ? (lang === "nl"
        ? "Laag risico: weinig juridische onzekerheid op basis van de ingegeven gegevens."
        : lang === "fr"
        ? "Risque faible : peu d'incertitude juridique selon les données fournies."
        : "Low risk: limited legal uncertainty based on provided data.")
    : riskLevel === "medium"
    ? (lang === "nl"
        ? "Gemiddeld risico: er zijn aandachtspunten die schriftelijke bevestiging vereisen."
        : lang === "fr"
        ? "Risque moyen : certains points nécessitent une confirmation écrite."
        : "Medium risk: certain elements require written confirmation.")
    : (lang === "nl"
        ? "Hoog risico: verhoogde juridische gevoeligheid. Teken niets zonder nazicht."
        : lang === "fr"
        ? "Risque élevé : situation juridiquement sensible. Ne signez rien sans vérification."
        : "High risk: legally sensitive situation. Do not sign without review.")
),
      ),

      // ✅ Paid value-add
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
...why.slice(0, 6).map((w, i) =>
  React.createElement(
    View,
    { key: `why-${i}`, style: styles.bulletRow },
    React.createElement(Text, { style: styles.bulletDot }, "•"),
    React.createElement(Text, { style: styles.bulletText }, w?.statement ?? "")
  )
)          )
        : null,

        React.createElement(
  Text,
  { style: styles.sectionTitle },
  lang === "nl"
    ? "Jouw strategische positie"
    : lang === "fr"
    ? "Votre position stratégique"
    : "Your strategic position"
),

React.createElement(
  Text,
  { style: styles.line },
  riskLevel === "high"
    ? (lang === "nl"
        ? "Je situatie bevat een hoger juridisch risico. Teken niets onder druk en overweeg juridisch advies."
        : lang === "fr"
        ? "Votre situation comporte un risque juridique élevé. Ne signez rien sous pression et envisagez un avis juridique."
        : "Your situation carries higher legal risk. Do not sign under pressure and consider legal review.")
    : riskLevel === "medium"
    ? (lang === "nl"
        ? "Je situatie bevat aandachtspunten. Mogelijk is extra verduidelijking of onderhandeling zinvol."
        : lang === "fr"
        ? "Votre situation comporte des points d’attention. Des clarifications ou une négociation peuvent être utiles."
        : "Your situation has some risk factors. Clarification and negotiation may be useful.")
    : (lang === "nl"
        ? "Je positie lijkt relatief stabiel op basis van de ingegeven info."
        : lang === "fr"
        ? "Votre position semble relativement stable selon les informations fournies."
        : "Your position appears relatively stable based on the provided information.")
),

React.createElement(
  Text,
  { style: styles.line },
  lang === "nl"
    ? `Focus op timing en bewijs: bewaar alle communicatie en vraag schriftelijke bevestiging van je opzegtermijn (${noticeText}).`
    : lang === "fr"
    ? `Concentrez-vous sur le timing et les preuves : conservez les communications et demandez une confirmation écrite du préavis (${noticeText}).`
    : `Focus on timing and proof: keep all communications and request written confirmation of the notice period (${noticeText}).`
),

React.createElement(
  Text,
  { style: styles.sectionTitle },
  lang === "nl" ? "Rode vlaggen (let op)" : lang === "fr" ? "Signaux d’alerte" : "Red flags (watch out)"
),

React.createElement(
  Text,
  { style: styles.bullet },
  lang === "nl"
    ? "• Teken geen overeenkomst (bv. dading/vaststelling/beeïndigingsovereenkomst) zonder bedenktijd of schriftelijke uitleg."
    : lang === "fr"
    ? "• Ne signez aucun accord (transaction/accord de rupture) sans délai de réflexion ou explication écrite."
    : "• Don’t sign any agreement (settlement/mutual termination) without time to review or a written explanation."
),
React.createElement(
  Text,
  { style: styles.bullet },
  lang === "nl"
    ? "• Vraag altijd de berekening van de opzegtermijn (en startdatum) op papier."
    : lang === "fr"
    ? "• Demandez toujours le calcul du préavis (et la date de début) par écrit."
    : "• Always request the notice-period calculation (and start date) in writing."
),
React.createElement(
  Text,
  { style: styles.bullet },
  lang === "nl"
    ? "• Let op vage formuleringen zoals “in onderling akkoord” als jij daar niet expliciet mee instemt."
    : lang === "fr"
    ? "• Méfiez-vous des formulations vagues comme “d’un commun accord” si vous n’y consentez pas explicitement."
    : "• Watch for vague wording like “mutual agreement” if you didn’t explicitly agree."
),
React.createElement(
  Text,
  { style: styles.bullet },
  lang === "nl"
    ? "• Bevestig mondelinge afspraken altijd per mail (datum, uren, laatste werkdag, vakantiedagen)."
    : lang === "fr"
    ? "• Confirmez toujours les accords verbaux par e-mail (dates, heures, dernier jour, congés)."
    : "• Confirm any verbal agreements by email (dates, hours, last day, vacation days)."
),
React.createElement(
  Text,
  { style: styles.bullet },
  lang === "nl"
    ? "• Deel geen overbodige details en geef geen schuldtoegeving in mails."
    : lang === "fr"
    ? "• Ne partagez pas de détails inutiles et n’admettez pas de faute par e-mail."
    : "• Don’t overshare details or admit fault in emails."
),

      React.createElement(Text, { style: styles.sectionTitle }, t.nextSteps),
      steps.length
        ? React.createElement(
            View,
            null,
...steps.slice(0, 8).map((s, i) =>
  React.createElement(
    View,
    { key: `step-${i}`, style: styles.numberedRow },
    React.createElement(Text, { style: styles.number }, `${i + 1}.`),
    React.createElement(
      Text,
      { style: styles.numberText },
      `${s?.title ?? "Step"}${s?.details ? `: ${s.details}` : ""}`
    )
  )
)
          )
        : React.createElement(Text, { style: styles.line }, t.dash),

      React.createElement(Text, { style: styles.sectionTitle }, t.questions),
      qs.length
        ? React.createElement(
            View,
            null,
...qs.slice(0, 10).map((q, i) =>
  React.createElement(
    View,
    { key: `q-${i}`, style: styles.bulletRow },
    React.createElement(Text, { style: styles.bulletDot }, "•"),
    React.createElement(Text, { style: styles.bulletText }, q)
  )
)
          )
        : React.createElement(Text, { style: styles.line }, t.dash),

        React.createElement(
  Text,
  { style: styles.sectionTitle },
  lang === "nl" ? "HR-gesprek (copy/paste zinnen)" : lang === "fr" ? "Conversation RH (phrases à copier/coller)" : "HR conversation (copy/paste lines)"
),

React.createElement(
  Text,
  { style: styles.bullet },
  lang === "nl"
    ? "• Kan u bevestigen op basis van welke berekening en startdatum mijn opzegtermijn werd bepaald?"
    : lang === "fr"
    ? "• Pouvez-vous confirmer sur quelle base (calcul et date de début) mon préavis a été déterminé ?"
    : "• Can you confirm the calculation basis and start date used to determine my notice period?"
),
React.createElement(
  Text,
  { style: styles.bullet },
  lang === "nl"
    ? "• Kan ik een schriftelijke bevestiging krijgen van de einddatum, openstaande vakantiedagen en eventuele vergoedingen?"
    : lang === "fr"
    ? "• Puis-je recevoir une confirmation écrite de la date de fin, des congés restants et des éventuelles indemnités ?"
    : "• Can I get written confirmation of the end date, remaining vacation days, and any compensation?"
),
React.createElement(
  Text,
  { style: styles.bullet },
  lang === "nl"
    ? "• Als er sprake is van een overeenkomst in onderling akkoord: mag ik die meenemen om te laten nalezen?"
    : lang === "fr"
    ? "• S’il s’agit d’un accord à l’amiable : puis-je l’emporter pour le faire relire ?"
    : "• If there is a mutual agreement document: can I take it to review before signing?"
),
React.createElement(
  Text,
  { style: styles.bullet },
  lang === "nl"
    ? `• Ter bevestiging: de opzegtermijn die ik nu begrijp is ${noticeText}. Klopt dat volgens jullie administratie?`
    : lang === "fr"
    ? `• Pour confirmation : le préavis que je comprends est ${noticeText}. Est-ce correct selon vos informations ?`
    : `• Just to confirm: the notice period I understand is ${noticeText}. Is that correct on your side?`
),

// ✅ HR Email Draft (copy/paste)
React.createElement(
  Text,
  { style: styles.sectionTitle },
  lang === "nl"
    ? "HR e-mail (copy/paste)"
    : lang === "fr"
    ? "E-mail RH (copier/coller)"
    : "HR email (copy/paste)"
),

React.createElement(
  View,
  { style: styles.emailBox },
  React.createElement(
    Text,
    { style: styles.mono },
    [
      lang === "nl"
        ? `Onderwerp: Bevestiging beëindiging & opzegtermijn (${scenarioLabel})`
        : lang === "fr"
        ? `Objet : Confirmation de fin de contrat & préavis (${scenarioLabel})`
        : `Subject: Confirmation of termination & notice period (${scenarioLabel})`,
      "",
      lang === "nl" ? "Beste HR," : lang === "fr" ? "Bonjour," : "Dear HR,",
      "",
      lang === "nl"
        ? `Naar aanleiding van de beëindiging van mijn arbeidsovereenkomst (${scenarioLabel}) wil ik graag enkele punten schriftelijk bevestigd krijgen:`
        : lang === "fr"
        ? `Suite à la fin de mon contrat (${scenarioLabel}), je souhaite une confirmation écrite des points suivants :`
        : `Following the termination of my employment (${scenarioLabel}), I would like written confirmation of the following:`,
      "",
      ...(hrBullets?.length
        ? hrBullets.slice(0, 5).map((b) => `- ${b}`)
        : [
            lang === "nl"
              ? "- Kan u bevestigen hoe de opzegtermijn werd berekend en vanaf welke startdatum?"
              : lang === "fr"
              ? "- Pouvez-vous confirmer le calcul du préavis et la date de début ?"
              : "- Can you confirm how the notice period was calculated and the start date?",
          ]),
      "",
      lang === "nl"
        ? `Ter bevestiging: de opzegtermijn die ik momenteel begrijp is ${noticeText}.`
        : lang === "fr"
        ? `Pour confirmation : le préavis que je comprends actuellement est ${noticeText}.`
        : `Just to confirm: the notice period I currently understand is ${noticeText}.`,
      "",
      lang === "nl"
        ? "Alvast bedankt voor de bevestiging. Indien mogelijk ontvang ik dit graag per e-mail."
        : lang === "fr"
        ? "Merci d’avance pour votre confirmation. Si possible, je souhaite la recevoir par e-mail."
        : "Thanks in advance for confirming. If possible, please reply by email.",
      "",
      lang === "nl" ? "Met vriendelijke groeten," : lang === "fr" ? "Cordialement," : "Kind regards,",
      lang === "nl" ? "[Jouw naam]" : lang === "fr" ? "[Votre nom]" : "[Your name]",
    ].join("\n")
  )
),
      React.createElement(
        View,
        { style: { marginTop: 14 } },
        React.createElement(Text, { style: styles.muted }, t.footer)
      )
    )
  );
}

export async function POST(req: NextRequest) {
  try {
    // 🔒 Token check
    const expected = process.env.PDF_TOKEN || "";
    const provided = req.headers.get("x-pdf-token") || "";

    if (!expected) {
      return new Response(JSON.stringify({ error: "PDF_TOKEN not configured on server." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (provided !== expected) {
      return new Response(JSON.stringify({ error: "PDF locked. Payment/token required." }), {
        status: 402,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const data = payload.ai as ExplainAIOutput;
    const engine = payload.engine;

    const lang = normalizeLang(engine?.intake?.language ?? payload?.lang ?? "en");
    let logoDataUri: string | null = null;
try {
  const logoPath = path.join(process.cwd(), "public", "clearterms-logo.png");
  const buf = await fs.readFile(logoPath);
  logoDataUri = `data:image/png;base64,${buf.toString("base64")}`;
} catch {
  logoDataUri = null; // no logo found → no crash
}

    const scenarioLabel = data?.scenario?.label ?? "";
    const scenarioCode = data?.scenario?.code ?? "";
    const noticeText = data?.timeline?.noticeRangeText ?? "";
    const riskLevel = String(engine?.scenario?.riskLevel ?? "unknown").toLowerCase();
    const summary = data?.explanation?.plainSummary ?? "";

    // ✅ Extra paid value (cheap, 5 bullets)
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
    const body = new Uint8Array(ab);

    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="clearterms-summary.pdf"',
      },
    });
  } catch (err: any) {
    console.error("PDF_API_ERROR:", err);
    return new Response(JSON.stringify({ error: err?.message || "PDF generation failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}