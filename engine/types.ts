export type Intake = {
  country: string;
  employeeType: "employee" | "worker";
  seniorityYears: number;
  initiatedBy: "employee" | "employer";
  terminationReason: "standard" | "mutual" | "gross_misconduct" | "medical";
  language: "nl" | "fr" | "en";
  roleLevel?: "standard" | "management"; // management = “kader” (praktisch)
  grossMonthly?: number; // optioneel (later nuttig voor thresholds/clauses)
};

export type ScenarioResult = {
  scenario: string;
  noticeRange: [number, number];
  riskLevel: "low" | "medium" | "high";
  flags: string[];
};
