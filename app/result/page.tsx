"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { track } from "@/app/lib/track";
import { ResultRenderer } from "@/components/ResultRenderer";
import type { ExplainAIOutput } from "@/engine/explainAI";

type Lang = "nl" | "fr" | "en";

type StoredResult = {
  language?: Lang;
  aiExplanation?: ExplainAIOutput;
  engine?: any;
};

const UI = {
  nl: {
    title: "Jouw resultaat",
    disclaimer: "Informatieve simulatie — geen juridisch advies.",
    loading: "Resultaat laden...",
    goTool: "Ga naar de tool",
    missing: "Resultaat gevonden, maar aiExplanation ontbreekt.",
    tryAgain: "Opnieuw proberen",
    unlockDev: "PDF ontgrendelen (dev)",
    unlockPrompt: "Geef PDF token (dev):",
    unlocked: "PDF ontgrendeld voor deze browsersessie.",
    pdfBtn: "Download PDF samenvatting (€3)",
    pdfFail: "PDF export mislukt",
  },
  fr: {
    title: "Votre résultat",
    disclaimer: "Simulation informative — pas un avis juridique.",
    loading: "Chargement du résultat...",
    goTool: "Aller à l’outil",
    missing: "Résultat trouvé, mais aiExplanation est manquant.",
    tryAgain: "Réessayer",
    unlockDev: "Déverrouiller PDF (dev)",
    unlockPrompt: "Entrez le token PDF (dev) :",
    unlocked: "PDF déverrouillé pour cette session.",
    pdfBtn: "Télécharger le résumé PDF (€3)",
    pdfFail: "Échec de l’export PDF",
  },
  en: {
    title: "Your result",
    disclaimer: "Informational simulation only — not legal advice.",
    loading: "Loading result...",
    goTool: "Go to tool",
    missing: "Result found, but missing aiExplanation.",
    tryAgain: "Try again",
    unlockDev: "Unlock PDF (dev)",
    unlockPrompt: "Enter PDF token (dev):",
    unlocked: "PDF unlocked for this browser session.",
    pdfBtn: "Download PDF summary (€3)",
    pdfFail: "PDF export failed",
  },
} satisfies Record<Lang, Record<string, string>>;

export default function ResultPage() {
  const router = useRouter();
  const [data, setData] = useState<StoredResult | null>(null);
  const [paying, setPaying] = useState(false);
  const [email, setEmail] = useState("");
  const [hasToken, setHasToken] = useState(false);

useEffect(() => {
  const raw = sessionStorage.getItem("result");
  if (!raw) {
    router.replace("/tool");
    return;
  }
  setData(JSON.parse(raw));

  // check if already unlocked
  setHasToken(!!sessionStorage.getItem("pdfToken"));
}, [router]);

  const lang: Lang = (data?.language ?? "en") as Lang;
  const t = useMemo(() => UI[lang] ?? UI.en, [lang]);

  if (!data) {
    return (
      <div className="max-w-xl mx-auto p-8 space-y-3">
        <p>{t.loading}</p>
        <Link className="underline" href="/tool">
          {t.goTool}
        </Link>
      </div>
    );
  }

  const ai = data.aiExplanation;

  if (!ai) {
    return (
      <div className="max-w-xl mx-auto p-8 space-y-3">
        <p>{t.missing}</p>
        <Link className="underline" href="/tool">
          {t.goTool}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="text-sm text-gray-600">{t.disclaimer}</p>
      </div>

      <div className="border rounded p-4">
        <ResultRenderer data={ai} />
      </div>

<div className="border rounded p-4 bg-gray-50 text-sm space-y-2">
  <div className="font-semibold">
    {lang === "nl"
      ? "Wat zit er in de PDF?"
      : lang === "fr"
      ? "Que contient le PDF ?"
      : "What’s inside the PDF?"}
  </div>
  <ul className="list-disc pl-5 space-y-1">
    <li>
      {lang === "nl"
        ? "HR-klare samenvatting (copy/paste bullets)"
        : lang === "fr"
        ? "Résumé prêt pour RH (bullets à copier/coller)"
        : "HR-ready summary (copy/paste bullets)"}
    </li>
    <li>
      {lang === "nl"
        ? "Risiconiveau + overzicht in printvriendelijke lay-out"
        : lang === "fr"
        ? "Niveau de risque + mise en page imprimable"
        : "Risk level + print-friendly layout"}
    </li>
    <li>
      {lang === "nl"
        ? "Handig document om mee te nemen naar HR/advocaat"
        : lang === "fr"
        ? "Document pratique pour RH/avocat"
        : "Useful to bring to HR/lawyer"}
    </li>
  </ul>
</div>
<div className="border rounded p-4 space-y-2">
  <div className="flex items-center justify-between gap-3">
    <div className="font-semibold">
      {lang === "nl" ? "PDF toegang" : lang === "fr" ? "Accès PDF" : "PDF access"}
    </div>

    {hasToken ? (
      <span className="text-xs border rounded px-2 py-1">
        {lang === "nl" ? "Ontgrendeld ✅" : lang === "fr" ? "Déverrouillé ✅" : "Unlocked ✅"}
      </span>
    ) : (
      <span className="text-xs border rounded px-2 py-1">
        {lang === "nl" ? "Vergrendeld" : lang === "fr" ? "Verrouillé" : "Locked"}
      </span>
    )}
  </div>

  <div className="space-y-1">
    <label className="block text-sm">
      {lang === "nl" ? "E-mail (voor hersturen van je PDF)" : lang === "fr" ? "E-mail (pour renvoyer le PDF)" : "Email (to resend your PDF)"}
    </label>
    <input
      className="border rounded px-3 py-2 w-full"
      placeholder={lang === "nl" ? "jij@voorbeeld.be" : lang === "fr" ? "vous@exemple.be" : "you@example.com"}
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      type="email"
    />
  </div>
</div>
      <div className="flex gap-4 items-center flex-wrap">
        <Link className="underline" href="/tool">
          {t.tryAgain}
        </Link>

<button
  className="border px-4 py-2 rounded disabled:opacity-60"
  disabled={paying || !email.trim().includes("@") || hasToken}
  onClick={async () => {
    const emailClean = email.trim().toLowerCase();
    if (!emailClean.includes("@")) {
      alert(
        lang === "nl"
          ? "Vul een geldig e-mail adres in."
          : lang === "fr"
          ? "Veuillez entrer une adresse e-mail valide."
          : "Please enter a valid email."
      );
      return;
    }

    try {
      setPaying(true);

      track("pay_click", { amount: 3, lang });

      const res = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 3 }),
      });

      const txt = await res.text();
      const json = txt ? JSON.parse(txt) : null;

      if (!res.ok) {
        alert(json?.error || `Payment failed (${res.status})`);
        return;
      }

      const token = json?.pdfToken;
      if (!token) {
        alert("Payment ok, but missing pdfToken.");
        return;
      }

      sessionStorage.setItem("pdfToken", token);
      setHasToken(true);

      await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailClean,
          lang,
          scenario: ai?.scenario?.code,
          notice: ai?.timeline?.noticeRangeText,
        }),
      }).catch(() => {});

      track("lead_captured", { lang, scenario: ai?.scenario?.code });

      alert(
        lang === "nl"
          ? "Betaling gelukt. PDF is ontgrendeld."
          : lang === "fr"
          ? "Paiement réussi. PDF déverrouillé."
          : "Payment successful. PDF unlocked."
      );
    } catch (e: any) {
      alert(e?.message || "Payment failed");
    } finally {
      setPaying(false);
    }
  }}
>
  {hasToken
    ? lang === "nl"
      ? "PDF is ontgrendeld"
      : lang === "fr"
      ? "PDF déverrouillé"
      : "PDF unlocked"
    : paying
    ? lang === "nl"
      ? "Bezig..."
      : lang === "fr"
      ? "En cours..."
      : "Processing..."
    : lang === "nl"
    ? "Betaal €3 en ontgrendel PDF"
    : lang === "fr"
    ? "Payer 3€ et déverrouiller le PDF"
    : "Pay €3 and unlock PDF"}
</button>

        <button
            className="bg-black text-white px-4 py-2 rounded disabled:opacity-60"
            disabled={!hasToken}
            onClick={async () => {
            try {
              track("pdf_click", {
                scenario: ai?.scenario?.code,
                notice: ai?.timeline?.noticeRangeText,
                lang,
              });
const token = sessionStorage.getItem("pdfToken") || "";
if (!token) {
  alert(
    lang === "nl"
      ? "Ontgrendel eerst de PDF (betaling)."
      : lang === "fr"
      ? "Déverrouillez d’abord le PDF (paiement)."
      : "Please unlock the PDF first (payment)."
  );
  return;
}
              const res = await fetch("/api/pdf", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                "x-pdf-token": token,
                },
                body: JSON.stringify({
  ai,
  engine: data.engine,
}),
              });

              if (!res.ok) {
                const txt = await res.text().catch(() => "");
                alert(`${t.pdfFail} (${res.status}).\n${txt.slice(0, 300)}`);
                return;
              }

              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "clearterms-summary.pdf";
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
            } catch (e: any) {
              alert(e?.message || t.pdfFail);
            }
          }}
        >
          {t.pdfBtn}
        </button>
      </div>
    </div>
  );
}