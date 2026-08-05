import {
  getExampleQuestions,
  type ExampleGrade,
  type ExampleStyle,
  type ExampleSubject,
} from "../exampleQuestions";
import type { ExplanationStyle, Grade, Subject } from "./types";

const SUBJECT_FOCUSES: Record<Subject, string[]> = {
  math: [
    "step-by-step problem solving",
    "key formulas and when to use them",
    "common mistakes to avoid",
    "practice with worked examples",
  ],
  reading: [
    "main idea and supporting details",
    "important vocabulary in context",
    "theme, tone, and author’s purpose",
    "evidence from the text",
  ],
  writing: [
    "structure and organization",
    "strong thesis and supporting points",
    "word choice and clarity",
    "revising for stronger evidence",
  ],
  science: [
    "key vocabulary and definitions",
    "how the process works step by step",
    "cause and effect relationships",
    "real-world examples and why it matters",
  ],
  history: [
    "important causes and effects",
    "key people, places, and dates",
    "major events in order",
    "why it still matters today",
  ],
  general: [
    "the most important ideas",
    "key vocabulary and definitions",
    "examples that make it clearer",
    "common questions students ask",
  ],
};

function cleanTopic(topic: string): string {
  return topic.replace(/\s+/g, " ").trim().replace(/[?.!]+$/, "");
}

/**
 * When the student has typed a topic, return related study-focus examples.
 * When the field is empty, fall back to subject/grade starter examples.
 */
export function getRelatedTopicExamples(
  topic: string,
  subject: Subject,
  grade: Grade,
  explanationStyle: ExplanationStyle
): { text: string; related: boolean }[] {
  const trimmed = cleanTopic(topic);

  if (trimmed.length < 3) {
    try {
      return getExampleQuestions(
        subject as ExampleSubject,
        grade as ExampleGrade,
        explanationStyle as ExampleStyle
      )
        .slice(0, 4)
        .map((example) => ({ text: example.text, related: false }));
    } catch {
      return [];
    }
  }

  const focuses = SUBJECT_FOCUSES[subject] ?? SUBJECT_FOCUSES.general;
  const base = trimmed.length > 72 ? `${trimmed.slice(0, 69).trim()}…` : trimmed;

  return focuses.slice(0, 4).map((focus) => ({
    text: `${base}: ${focus}`,
    related: true,
  }));
}
