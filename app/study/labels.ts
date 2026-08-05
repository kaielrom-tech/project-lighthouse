import type { ExplanationStyle, Grade, Subject } from "./types";

export const GRADE_LABELS: Record<Grade, string> = {
  "1": "Grade 1",
  "2": "Grade 2",
  "3": "Grade 3",
  "4": "Grade 4",
  "5": "Grade 5",
  "6": "Grade 6",
  "7": "Grade 7",
  "8": "Grade 8",
  "9": "Grade 9",
  "10": "Grade 10",
  "11": "Grade 11",
  "12": "Grade 12",
};

export const STYLE_LABELS: Record<ExplanationStyle, string> = {
  simple: "Simple",
  normal: "Normal",
  advanced: "Advanced",
};

export const SUBJECT_LABELS: Record<Subject, string> = {
  math: "Math",
  reading: "Reading",
  writing: "Writing",
  science: "Science",
  history: "History",
  general: "General",
};

export const GRADES = [
  { value: "1", label: "Grade 1" },
  { value: "2", label: "Grade 2" },
  { value: "3", label: "Grade 3" },
  { value: "4", label: "Grade 4" },
  { value: "5", label: "Grade 5" },
  { value: "6", label: "Grade 6" },
  { value: "7", label: "Grade 7" },
  { value: "8", label: "Grade 8" },
  { value: "9", label: "Grade 9" },
  { value: "10", label: "Grade 10" },
  { value: "11", label: "Grade 11" },
  { value: "12", label: "Grade 12" },
] as const;

export const EXPLANATION_STYLES = [
  { value: "simple", label: "Simple" },
  { value: "normal", label: "Normal" },
  { value: "advanced", label: "Advanced" },
] as const;

export const SUBJECTS = [
  { value: "math", label: "Math" },
  { value: "reading", label: "Reading" },
  { value: "writing", label: "Writing" },
  { value: "science", label: "Science" },
  { value: "history", label: "History" },
  { value: "general", label: "General" },
] as const;

export function formatUpdatedAt(value?: string): string {
  const raw = value || "";
  if (!raw) return "Not updated yet";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "Not updated yet";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
