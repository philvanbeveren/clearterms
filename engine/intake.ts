import { Intake } from "./types";

export function normalizeIntake(raw: any): Intake {
  const languageRaw = String(raw?.language || "nl");
  const language: "nl" | "fr" | "en" =
    languageRaw === "fr" ? "fr" : languageRaw === "en" ? "en" : "nl";

  return {
    country: String(raw?.country || "BE"),
    language,
    employeeType: raw?.employeeType === "worker" ? "worker" : "employee",
    seniorityYears: Number(raw?.seniorityYears || 0),
    initiatedBy: raw?.initiatedBy === "employee" ? "employee" : "employer",
    terminationReason:
      raw?.terminationReason === "mutual"
        ? "mutual"
        : raw?.terminationReason === "gross_misconduct"
        ? "gross_misconduct"
        : raw?.terminationReason === "medical"
        ? "medical"
        : "standard",
    roleLevel: raw.roleLevel === "management" ? "management" : "standard",
    grossMonthly: raw.grossMonthly ? Number(raw.grossMonthly) : undefined,
  };
}