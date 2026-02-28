"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Lang = "nl" | "fr" | "en";

const UI: Record<
  Lang,
  {
    title: string;
    country: string;
    language: string;
    employeeType: string;
    whoInitiates: string;
    seniority: string;
    terminationReason: string;
    profile: string;
    salary: string;
    calculate: string;
    calculating: string;

    optNL: string;
    optFR: string;
    optEN: string;

    optEmployee: string;
    optWorker: string;

    optEmployer: string;
    optEmployeeInitiator: string;

    optStandard: string;
    optMutual: string;
    optGross: string;
    optMedical: string;

    optProfileStandard: string;
    optProfileMgmt: string;

    salaryPlaceholder: string;
  }
> = {
  nl: {
    title: "ClearTerms — Ontslagcheck",
    language: "Taal",
    country: "Land",
    employeeType: "Type werknemer",
    whoInitiates: "Wie neemt het initiatief?",
    seniority: "Anciënniteit (jaren)",
    terminationReason: "Reden beëindiging",
    profile: "Rolniveau (optioneel)",
    salary: "Bruto maandloon (optioneel)",
    calculate: "Bereken",
    calculating: "Bezig...",
    optNL: "Nederlands",
    optFR: "Français",
    optEN: "English",
    optEmployee: "Bediende",
    optWorker: "Arbeider",
    optEmployer: "Werkgever",
    optEmployeeInitiator: "Werknemer",
    optStandard: "Standaard",
    optMutual: "Onderling akkoord",
    optGross: "Dringende reden",
    optMedical: "Medisch",
    optProfileStandard: "Niet zeker / standaard",
    optProfileMgmt: "Kader / management",
    salaryPlaceholder: "bv. 4200",
  },
  fr: {
    title: "ClearTerms — Vérification rupture",
    language: "Langue",
    country: "Pays",
    employeeType: "Type de travailleur",
    whoInitiates: "Qui initie ?",
    seniority: "Ancienneté (années)",
    terminationReason: "Motif",
    profile: "Niveau de fonction (optionnel)",
    salary: "Salaire brut mensuel (optionnel)",
    calculate: "Calculer",
    calculating: "En cours...",
    optNL: "Nederlands",
    optFR: "Français",
    optEN: "English",
    optEmployee: "Employé",
    optWorker: "Ouvrier",
    optEmployer: "Employeur",
    optEmployeeInitiator: "Employé",
    optStandard: "Standard",
    optMutual: "Accord mutuel",
    optGross: "Faute grave",
    optMedical: "Médical",
    optProfileStandard: "Je ne sais pas / standard",
    optProfileMgmt: "Cadre / management",
    salaryPlaceholder: "ex. 4200",
  },
  en: {
    title: "ClearTerms — Termination check",
    language: "Language",
    country: "Country",
    employeeType: "Employee type",
    whoInitiates: "Who initiates?",
    seniority: "Years of seniority",
    terminationReason: "Termination reason",
    profile: "Role level (optional)",
    salary: "Gross monthly salary (optional)",
    calculate: "Calculate",
    calculating: "Calculating...",
    optNL: "Nederlands",
    optFR: "Français",
    optEN: "English",
    optEmployee: "Employee",
    optWorker: "Worker",
    optEmployer: "Employer",
    optEmployeeInitiator: "Employee",
    optStandard: "Standard",
    optMutual: "Mutual",
    optGross: "Gross misconduct",
    optMedical: "Medical",
    optProfileStandard: "Not sure / standard",
    optProfileMgmt: "Management / executive",
    salaryPlaceholder: "e.g. 4200",
  },
};

export default function ToolPage() {
  const router = useRouter();

  const [country, setCountry] = useState("BE");
  const [employeeType, setEmployeeType] = useState<"worker" | "employee">("employee");
  const [initiatedBy, setInitiatedBy] = useState<"employer" | "employee">("employer");
  const [terminationReason, setTerminationReason] = useState<
    "standard" | "mutual" | "gross_misconduct" | "medical"
  >("standard");
  const [seniorityYears, setSeniorityYears] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<"nl" | "fr" | "en">("nl");
  const t = UI[language];
  const [roleLevel, setRoleLevel] = useState<"standard" | "management">("standard");
  const [grossMonthly, setGrossMonthly] = useState<number>(0);

  async function submit() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
body: JSON.stringify({
  country,
  language,
  employeeType,
  initiatedBy,
  terminationReason,
  seniorityYears,
  roleLevel,
  grossMonthly: grossMonthly > 0 ? grossMonthly : undefined,
}),
      });

      const text = await res.text();
      let data: any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(`Non-JSON response (${res.status}). Body:\n${text.slice(0, 500)}`);
      }

      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      const aiExplanation = data?.aiExplanation ?? data?.explanation ?? null;
      if (!aiExplanation) {
        throw new Error("API response missing aiExplanation. Check /api/engine response shape.");
      }

      sessionStorage.setItem(
        "result",
        JSON.stringify({
          language, // ✅ voeg dit toe
          aiExplanation,
          engine: data?.engine ?? null,
        })
      );

      router.push("/result");
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-8 space-y-4">
      <h1 className="text-2xl font-bold">{t.title}</h1>

      {error && (
        <pre className="border rounded p-3 bg-red-50 text-red-700 text-xs whitespace-pre-wrap">
          {error}
        </pre>
      )}

<div className="space-y-2">
  <label className="block text-sm">{t.language}</label>
  <select
    className="border rounded px-3 py-2 w-full"
    value={language}
    onChange={(e) => setLanguage(e.target.value as any)}
  >
      <option value="nl">{t.optNL}</option>
      <option value="fr">{t.optFR}</option>
      <option value="en">{t.optEN}</option>
  </select>
</div>

      <div className="space-y-2">
        <label className="block text-sm">{t.country}</label>
        <select className="border rounded px-3 py-2 w-full" value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="BE">Belgium (test)</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm">{t.employeeType}</label>
        <select
          className="border rounded px-3 py-2 w-full"
          value={employeeType}
          onChange={(e) => setEmployeeType(e.target.value as any)}
        >
          <option value="employee">{t.optEmployee}</option>
          <option value="worker">{t.optWorker}</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm">{t.whoInitiates}</label>
        <select
          className="border rounded px-3 py-2 w-full"
          value={initiatedBy}
          onChange={(e) => setInitiatedBy(e.target.value as any)}
        >
          <option value="employer">{t.optEmployer}</option>
          <option value="employee">{t.optEmployeeInitiator}</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm">{t.seniority}</label>
        <input
          className="border rounded px-3 py-2 w-full"
          type="number"
          value={seniorityYears}
          onChange={(e) => setSeniorityYears(Number(e.target.value))}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm">{t.terminationReason}</label>
        <select
          className="border rounded px-3 py-2 w-full"
          value={terminationReason}
          onChange={(e) => setTerminationReason(e.target.value as any)}
        >
          <option value="standard">{t.optStandard}</option>
          <option value="mutual">{t.optMutual}</option>
          <option value="gross_misconduct">{t.optGross}</option>
          <option value="medical">{t.optMedical}</option>
        </select>
      </div>

<div className="space-y-2">
  <label className="block text-sm">{t.profile}</label>

  <select
    className="border rounded px-3 py-2 w-full"
    value={roleLevel}
    onChange={(e) => setRoleLevel(e.target.value as "standard" | "management")}
  >
    <option value="standard">{t.optProfileStandard}</option>
    <option value="management">{t.optProfileMgmt}</option>
  </select>
</div>

<div className="space-y-2">
  <label className="block text-sm">{t.salary}</label>

  <input
    type="number"
    className="border rounded px-3 py-2 w-full"
    value={grossMonthly}
    onChange={(e) => setGrossMonthly(Number(e.target.value))}
    placeholder={t.salaryPlaceholder}
  />
</div>

      <button
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-60"
        onClick={submit}
        disabled={loading}
      >
        {loading ? t.calculating : t.calculate}
      </button>
    </div>
  );
}