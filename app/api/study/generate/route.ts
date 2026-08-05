import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import type {
  ExplanationStyle,
  Flashcard,
  Grade,
  QuizDifficulty,
  QuizQuestion,
  SourceType,
  StudyTerm,
  Subject,
} from "../../../study/types";

const VALID_GRADES = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
] as const;

const VALID_STYLES = ["simple", "normal", "advanced"] as const;
const VALID_SUBJECTS = [
  "math",
  "reading",
  "writing",
  "science",
  "history",
  "general",
] as const;
const VALID_SOURCES = ["topic", "learning-card", "file", "notes"] as const;
const VOCAB_COUNTS = [5, 10, 15] as const;
const CARD_COUNTS = [5, 10, 20] as const;
const QUIZ_COUNTS = [5, 10, 15, 20] as const;

type IncludeFlags = {
  vocabulary: boolean;
  keyDefinitions: boolean;
  flashcards: boolean;
  quiz: boolean;
};

type Counts = {
  vocabulary: (typeof VOCAB_COUNTS)[number];
  keyDefinitions: (typeof VOCAB_COUNTS)[number];
  flashcards: (typeof CARD_COUNTS)[number];
  quiz: (typeof QUIZ_COUNTS)[number];
};

type QuizTypeFlags = {
  multipleChoice: boolean;
  trueFalse: boolean;
  shortAnswer: boolean;
};

/** Split total across selected types (~50% MC / 25% TF / 25% SA when all on). */
function distributeQuizTypeCounts(
  total: number,
  types: QuizTypeFlags
): { multipleChoice: number; trueFalse: number; shortAnswer: number } {
  const selected: Array<keyof QuizTypeFlags> = [];
  if (types.multipleChoice) selected.push("multipleChoice");
  if (types.trueFalse) selected.push("trueFalse");
  if (types.shortAnswer) selected.push("shortAnswer");
  if (selected.length === 0 || total <= 0) {
    return { multipleChoice: 0, trueFalse: 0, shortAnswer: 0 };
  }

  const result = { multipleChoice: 0, trueFalse: 0, shortAnswer: 0 };

  if (selected.length === 1) {
    result[selected[0]] = total;
    return result;
  }

  if (
    types.multipleChoice &&
    types.trueFalse &&
    types.shortAnswer &&
    selected.length === 3
  ) {
    result.multipleChoice = Math.round(total * 0.5);
    result.trueFalse = Math.round(total * 0.25);
    result.shortAnswer = total - result.multipleChoice - result.trueFalse;
  } else if (selected.length === 2) {
    const a = Math.ceil(total / 2);
    const b = total - a;
    result[selected[0]] = a;
    result[selected[1]] = b;
  }

  // Ensure every selected type gets at least one when total allows.
  for (const key of selected) {
    if (result[key] === 0 && total >= selected.length) {
      const donor = selected.find((k) => result[k] > 1);
      if (donor) {
        result[donor] -= 1;
        result[key] += 1;
      }
    }
  }

  // Fix rounding drift
  const sum =
    result.multipleChoice + result.trueFalse + result.shortAnswer;
  if (sum !== total && selected.length > 0) {
    result[selected[0]] += total - sum;
  }

  return result;
}

function normalizeGrade(value: unknown): Grade {
  const asString =
    typeof value === "number" || typeof value === "string"
      ? String(value)
      : "";
  if ((VALID_GRADES as readonly string[]).includes(asString)) {
    return asString as Grade;
  }
  return "8";
}

function normalizeStyle(value: unknown): ExplanationStyle {
  if (
    typeof value === "string" &&
    (VALID_STYLES as readonly string[]).includes(value)
  ) {
    return value as ExplanationStyle;
  }
  return "normal";
}

function normalizeSubject(value: unknown): Subject {
  if (
    typeof value === "string" &&
    (VALID_SUBJECTS as readonly string[]).includes(value)
  ) {
    return value as Subject;
  }
  return "general";
}

function normalizeSourceType(value: unknown): SourceType {
  if (
    typeof value === "string" &&
    (VALID_SOURCES as readonly string[]).includes(value)
  ) {
    return value as SourceType;
  }
  return "topic";
}

function normalizeCount(
  value: unknown,
  allowed: readonly number[],
  fallback: number
): number {
  const n = typeof value === "number" ? value : Number(value);
  if (allowed.includes(n)) return n;
  return fallback;
}

function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function asCleanString(value: unknown, max = 500): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function normalizeCompareKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isVagueFlashcardFront(front: string): boolean {
  const text = front.toLowerCase().trim();
  const vague = [
    /^what is this\??$/,
    /^explain the topic\.?$/,
    /^what should you know\??$/,
    /^what is it\??$/,
    /^define this\.?$/,
    /^tell me about (this|the topic)\.?$/,
  ];
  return vague.some((pattern) => pattern.test(text));
}

function isNearDuplicate(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) {
    const shorter = Math.min(a.length, b.length);
    const longer = Math.max(a.length, b.length);
    return shorter / longer >= 0.82;
  }
  const aWords = new Set(a.split(" ").filter((w) => w.length > 2));
  const bWords = b.split(" ").filter((w) => w.length > 2);
  if (aWords.size < 4 || bWords.length < 4) return false;
  const overlap = bWords.filter((w) => aWords.has(w)).length;
  return overlap / Math.max(aWords.size, bWords.length) >= 0.85;
}

function validateTerms(
  value: unknown,
  limit: number,
  warnings: string[],
  label: string,
  options?: {
    allowWhyItMatters?: boolean;
    blockedDefinitionKeys?: Set<string>;
  }
): StudyTerm[] {
  if (!Array.isArray(value)) {
    if (limit > 0) warnings.push(`${label} were missing from the AI response.`);
    return [];
  }

  const seen = new Set<string>();
  const terms: StudyTerm[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const term = asCleanString(record.term ?? record.concept, 100);
    const definition = asCleanString(
      record.definition ?? record.explanation,
      420
    );
    const exampleRaw = asCleanString(record.example, 240);
    const example = exampleRaw || undefined;
    const whyItMatters = options?.allowWhyItMatters
      ? asCleanString(record.whyItMatters, 260) || undefined
      : undefined;
    if (!term || !definition) continue;
    if (definition.length < 12) continue;

    const key = normalizeCompareKey(term);
    if (!key || seen.has(key)) continue;

    const definitionKey = normalizeCompareKey(definition);
    if (
      options?.blockedDefinitionKeys &&
      options.blockedDefinitionKeys.has(definitionKey)
    ) {
      continue;
    }

    seen.add(key);
    terms.push({
      id: makeId("term"),
      term,
      definition,
      example,
      ...(whyItMatters ? { whyItMatters } : {}),
    });
    if (terms.length >= limit) break;
  }

  if (terms.length === 0 && limit > 0) {
    warnings.push(`${label} could not be validated.`);
  } else if (terms.length < limit && limit > 0) {
    warnings.push(
      `${label}: kept ${terms.length} of ${limit} requested items after cleanup.`
    );
  }

  return terms;
}

function validateFlashcards(
  value: unknown,
  limit: number,
  warnings: string[]
): Flashcard[] {
  if (!Array.isArray(value)) {
    if (limit > 0) warnings.push("Flashcards were missing from the AI response.");
    return [];
  }

  const seenFronts: string[] = [];
  const seenBacks: string[] = [];
  const cards: Flashcard[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const front = asCleanString(record.front, 160);
    const back = asCleanString(record.back, 380);
    let hint = asCleanString(record.hint, 120) || undefined;
    if (!front || !back) continue;
    if (front.length < 8 || back.length < 12) continue;
    if (front.length > 150) continue;
    if ((front.match(/\?/g) || []).length > 1) continue;
    if (isVagueFlashcardFront(front)) continue;

    const frontKey = normalizeCompareKey(front);
    const backKey = normalizeCompareKey(back);
    if (!frontKey || !backKey) continue;
    if (seenFronts.some((existing) => isNearDuplicate(existing, frontKey))) {
      continue;
    }
    if (seenBacks.some((existing) => isNearDuplicate(existing, backKey))) {
      continue;
    }

    if (hint) {
      const hintKey = normalizeCompareKey(hint);
      // Drop hints that fully give away the answer.
      if (!hintKey || hintKey === backKey || hintKey.length > 90) {
        hint = undefined;
      }
    }

    // Prefer keeping a usable hint on every card when the model provided one.
    if (!hint) {
      const fromFront = front
        .replace(/\?+$/, "")
        .trim()
        .split(/\s+/)
        .slice(0, 6)
        .join(" ");
      if (fromFront.length >= 8) {
        hint = `Think about: ${fromFront.toLowerCase()}…`;
      }
    }

    seenFronts.push(frontKey);
    seenBacks.push(backKey);
    cards.push({
      id: makeId("card"),
      front,
      back,
      hint,
    });
    if (cards.length >= limit) break;
  }

  if (cards.length === 0 && limit > 0) {
    warnings.push("Flashcards could not be validated.");
  } else if (cards.length < limit && limit > 0) {
    warnings.push(
      `Flashcards: kept ${cards.length} of ${limit} requested cards after cleanup.`
    );
  }

  return cards;
}

function validateQuiz(
  value: unknown,
  limit: number,
  warnings: string[],
  allowedTypes: QuizTypeFlags = {
    multipleChoice: true,
    trueFalse: true,
    shortAnswer: true,
  }
): QuizQuestion[] {
  if (!Array.isArray(value)) {
    if (limit > 0)
      warnings.push("Quiz questions were missing from the AI response.");
    return [];
  }

  const allowed = new Set<QuizQuestion["type"]>();
  if (allowedTypes.multipleChoice) allowed.add("multiple-choice");
  if (allowedTypes.trueFalse) allowed.add("true-false");
  if (allowedTypes.shortAnswer) allowed.add("short-answer");
  if (allowed.size === 0) {
    allowed.add("multiple-choice");
    allowed.add("true-false");
    allowed.add("short-answer");
  }

  const questions: QuizQuestion[] = [];
  const seenQuestions: string[] = [];
  let dropped = 0;

  for (const item of value) {
    if (!item || typeof item !== "object") {
      dropped += 1;
      continue;
    }
    const record = item as Record<string, unknown>;
    const typeRaw = asCleanString(record.type, 40);
    const type =
      typeRaw === "multiple-choice" ||
      typeRaw === "true-false" ||
      typeRaw === "short-answer"
        ? typeRaw
        : null;
    const question = asCleanString(record.question, 400);
    let correctAnswer = asCleanString(record.correctAnswer, 300);
    const explanation = asCleanString(record.explanation, 400);
    const topic = asCleanString(record.topic, 80) || "General";
    const difficultyRaw = asCleanString(record.difficulty, 20).toLowerCase();
    const difficulty: QuizDifficulty =
      difficultyRaw === "easy" ||
      difficultyRaw === "medium" ||
      difficultyRaw === "hard"
        ? difficultyRaw
        : "medium";

    if (!type || !question || !correctAnswer || !explanation) {
      dropped += 1;
      continue;
    }

    if (!allowed.has(type)) {
      dropped += 1;
      continue;
    }

    const questionKey = normalizeCompareKey(question);
    if (
      questionKey &&
      seenQuestions.some((existing) => isNearDuplicate(existing, questionKey))
    ) {
      dropped += 1;
      continue;
    }

    let choices: string[] | undefined;
    let acceptedAnswers: string[] | undefined;

    if (type === "multiple-choice") {
      if (!Array.isArray(record.choices)) {
        dropped += 1;
        continue;
      }
      const rawChoices = record.choices
        .map((choice) => asCleanString(choice, 200))
        .filter(Boolean);
      const unique: string[] = [];
      for (const choice of rawChoices) {
        if (
          !unique.some((u) => u.toLowerCase() === choice.toLowerCase())
        ) {
          unique.push(choice);
        }
      }
      if (unique.length !== 4) {
        dropped += 1;
        continue;
      }
      const hasCorrect = unique.some(
        (c) => c.toLowerCase() === correctAnswer.toLowerCase()
      );
      if (!hasCorrect) {
        dropped += 1;
        continue;
      }
      // Align correctAnswer casing to the matching choice.
      correctAnswer =
        unique.find(
          (c) => c.toLowerCase() === correctAnswer.toLowerCase()
        ) ?? correctAnswer;
      choices = unique;
    }

    if (type === "true-false") {
      const normalized = correctAnswer.toLowerCase();
      if (normalized !== "true" && normalized !== "false") {
        dropped += 1;
        continue;
      }
      correctAnswer = normalized === "true" ? "True" : "False";
      choices = ["True", "False"];
    }

    if (type === "short-answer") {
      if (correctAnswer.length > 120) {
        dropped += 1;
        continue;
      }
      const fromModel = Array.isArray(record.acceptedAnswers)
        ? record.acceptedAnswers
            .map((a) => asCleanString(a, 120))
            .filter(Boolean)
        : [];
      const accepted = new Set<string>([correctAnswer, ...fromModel]);
      if (accepted.size < 1) {
        dropped += 1;
        continue;
      }
      acceptedAnswers = Array.from(accepted).slice(0, 8);
    }

    if (questionKey) seenQuestions.push(questionKey);

    questions.push({
      id: makeId("quiz"),
      type,
      question,
      choices,
      correctAnswer,
      acceptedAnswers,
      explanation,
      topic,
      difficulty,
    });
    if (questions.length >= limit) break;
  }

  if (questions.length === 0 && limit > 0) {
    warnings.push("Quiz questions could not be validated.");
  } else if (dropped > 0) {
    warnings.push(
      `Quiz: removed ${dropped} invalid question${dropped === 1 ? "" : "s"}; kept ${questions.length}.`
    );
  } else if (questions.length < limit && limit > 0) {
    warnings.push(
      `Quiz: kept ${questions.length} of ${limit} requested questions after cleanup.`
    );
  }

  return questions;
}

function buildSchema(include: IncludeFlags) {
  const properties: Record<string, unknown> = {
    title: { type: "string" },
  };
  const required: string[] = ["title"];

  if (include.vocabulary) {
    properties.vocabulary = {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          term: { type: "string" },
          definition: { type: "string" },
          example: { type: "string" },
        },
        required: ["term", "definition", "example"],
      },
    };
    required.push("vocabulary");
  }

  if (include.keyDefinitions) {
    properties.keyDefinitions = {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          term: { type: "string" },
          definition: { type: "string" },
          example: { type: "string" },
          whyItMatters: { type: "string" },
        },
        required: ["term", "definition", "example", "whyItMatters"],
      },
    };
    required.push("keyDefinitions");
  }

  if (include.flashcards) {
    properties.flashcards = {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          front: { type: "string" },
          back: { type: "string" },
          hint: { type: "string" },
        },
        required: ["front", "back", "hint"],
      },
    };
    required.push("flashcards");
  }

  if (include.quiz) {
    properties.quizQuestions = {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: {
            type: "string",
            enum: ["multiple-choice", "true-false", "short-answer"],
          },
          question: { type: "string" },
          choices: {
            type: "array",
            items: { type: "string" },
          },
          correctAnswer: { type: "string" },
          acceptedAnswers: {
            type: "array",
            items: { type: "string" },
          },
          explanation: { type: "string" },
          topic: { type: "string" },
          difficulty: {
            type: "string",
            enum: ["easy", "medium", "hard"],
          },
        },
        required: [
          "type",
          "question",
          "choices",
          "correctAnswer",
          "acceptedAnswers",
          "explanation",
          "topic",
          "difficulty",
        ],
      },
    };
    required.push("quizQuestions");
  }

  return {
    type: "object",
    additionalProperties: false,
    properties,
    required,
  };
}

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

type AttachmentPayload = {
  buffer: Buffer;
  mimeType: string;
  filename: string;
};

function sanitizeFilename(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/[^\w.\- ()[\]]+/g, "_").trim();
  if (!cleaned) return fallback;
  return cleaned.slice(0, 180);
}

function parseInclude(value: unknown): IncludeFlags {
  let includeRaw: Record<string, unknown> = {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object") {
        includeRaw = parsed as Record<string, unknown>;
      }
    } catch {
      includeRaw = {};
    }
  } else if (value && typeof value === "object") {
    includeRaw = value as Record<string, unknown>;
  }

  return {
    vocabulary: Boolean(includeRaw.vocabulary),
    keyDefinitions: Boolean(includeRaw.keyDefinitions),
    flashcards: Boolean(includeRaw.flashcards),
    quiz: Boolean(includeRaw.quiz),
  };
}

function parseCounts(value: unknown): Counts {
  let countsRaw: Record<string, unknown> = {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object") {
        countsRaw = parsed as Record<string, unknown>;
      }
    } catch {
      countsRaw = {};
    }
  } else if (value && typeof value === "object") {
    countsRaw = value as Record<string, unknown>;
  }

  return {
    vocabulary: normalizeCount(
      countsRaw.vocabulary,
      VOCAB_COUNTS,
      10
    ) as Counts["vocabulary"],
    keyDefinitions: normalizeCount(
      countsRaw.keyDefinitions,
      VOCAB_COUNTS,
      10
    ) as Counts["keyDefinitions"],
    flashcards: normalizeCount(
      countsRaw.flashcards,
      CARD_COUNTS,
      10
    ) as Counts["flashcards"],
    quiz: normalizeCount(countsRaw.quiz, QUIZ_COUNTS, 10) as Counts["quiz"],
  };
}

function parseQuizTypes(value: unknown): QuizTypeFlags {
  let raw: Record<string, unknown> = {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object") {
        raw = parsed as Record<string, unknown>;
      }
    } catch {
      raw = {};
    }
  } else if (value && typeof value === "object") {
    raw = value as Record<string, unknown>;
  }

  const multipleChoice =
    raw.multipleChoice === undefined ? true : Boolean(raw.multipleChoice);
  const trueFalse = raw.trueFalse === undefined ? true : Boolean(raw.trueFalse);
  const shortAnswer =
    raw.shortAnswer === undefined ? true : Boolean(raw.shortAnswer);

  if (!multipleChoice && !trueFalse && !shortAnswer) {
    return { multipleChoice: true, trueFalse: true, shortAnswer: true };
  }

  return { multipleChoice, trueFalse, shortAnswer };
}

async function parseStudyRequest(request: NextRequest): Promise<
  | {
      ok: true;
      sourceType: SourceType;
      sourceText: string;
      grade: Grade;
      explanationStyle: ExplanationStyle;
      subject: Subject;
      include: IncludeFlags;
      counts: Counts;
      quizTypes: QuizTypeFlags;
      attachment: AttachmentPayload | null;
    }
  | { ok: false; response: NextResponse }
> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const sourceText =
      typeof form.get("sourceText") === "string"
        ? String(form.get("sourceText")).trim()
        : "";
    const sourceType = normalizeSourceType(form.get("sourceType"));
    const include = parseInclude(form.get("include"));
    const counts = parseCounts(form.get("counts"));
    const quizTypes = parseQuizTypes(form.get("quizTypes"));

    const attachmentEntries = form.getAll("attachment");
    if (attachmentEntries.length > 1) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Only one file can be attached." },
          { status: 400 }
        ),
      };
    }

    let attachment: AttachmentPayload | null = null;
    const rawAttachment = attachmentEntries[0];

    if (rawAttachment instanceof File && rawAttachment.size > 0) {
      const mimeType =
        (typeof form.get("attachmentMimeType") === "string" &&
          String(form.get("attachmentMimeType"))) ||
        rawAttachment.type ||
        "";

      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return {
          ok: false,
          response: NextResponse.json(
            {
              error: "Please upload a PDF, PNG, JPG, or WEBP file.",
            },
            { status: 400 }
          ),
        };
      }

      const buffer = Buffer.from(await rawAttachment.arrayBuffer());
      if (buffer.byteLength === 0) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: "Could not read the file. Please try another file." },
            { status: 400 }
          ),
        };
      }
      if (buffer.byteLength > MAX_FILE_BYTES) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: "Files must be 8 MB or smaller." },
            { status: 413 }
          ),
        };
      }

      attachment = {
        buffer,
        mimeType,
        filename: sanitizeFilename(
          form.get("attachmentFilename") || rawAttachment.name,
          mimeType === "application/pdf" ? "document.pdf" : "image"
        ),
      };
    }

    if (!sourceText && !attachment) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Please enter a topic, notes, or upload a file." },
          { status: 400 }
        ),
      };
    }

    return {
      ok: true,
      sourceType: attachment ? "file" : sourceType,
      sourceText:
        sourceText ||
        "Create study materials based on the uploaded school document.",
      grade: normalizeGrade(form.get("grade")),
      explanationStyle: normalizeStyle(form.get("explanationStyle")),
      subject: normalizeSubject(form.get("subject")),
      include,
      counts,
      quizTypes,
      attachment,
    };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      ),
    };
  }

  if (!body || typeof body !== "object") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      ),
    };
  }

  const record = body as Record<string, unknown>;
  const sourceText =
    typeof record.sourceText === "string" ? record.sourceText.trim() : "";

  if (!sourceText) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Please enter a topic or source text." },
        { status: 400 }
      ),
    };
  }

  if (sourceText.length > 12000) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Source text is too long. Please shorten it." },
        { status: 400 }
      ),
    };
  }

  return {
    ok: true,
    sourceType: normalizeSourceType(record.sourceType),
    sourceText,
    grade: normalizeGrade(record.grade),
    explanationStyle: normalizeStyle(record.explanationStyle),
    subject: normalizeSubject(record.subject),
    include: parseInclude(record.include),
    counts: parseCounts(record.counts),
    quizTypes: parseQuizTypes(record.quizTypes),
    attachment: null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Server is missing the OpenAI API key. Check your .env.local file.",
        },
        { status: 500 }
      );
    }

    const parsedRequest = await parseStudyRequest(request);
    if (!parsedRequest.ok) return parsedRequest.response;

    const {
      sourceType,
      sourceText,
      grade,
      explanationStyle,
      subject,
      include,
      counts,
      quizTypes,
      attachment,
    } = parsedRequest;

    if (
      !include.vocabulary &&
      !include.keyDefinitions &&
      !include.flashcards &&
      !include.quiz
    ) {
      return NextResponse.json(
        { error: "Choose at least one study content type to generate." },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const quantityLines: string[] = [];
    if (include.vocabulary) {
      quantityLines.push(
        `Vocabulary: exactly ${counts.vocabulary} important terms with clear definitions and useful examples.`
      );
    }
    if (include.keyDefinitions) {
      quantityLines.push(
        `Key definitions: exactly ${counts.keyDefinitions} major concepts (not vocabulary duplicates). Each needs term, definition, example, and whyItMatters.`
      );
    }
    if (include.flashcards) {
      quantityLines.push(
        `Flashcards: exactly ${counts.flashcards} high-quality cards. Each front tests one idea; each back answers it directly; always include a short non-revealing hint.`
      );
    }
    if (include.quiz) {
      const mix = distributeQuizTypeCounts(counts.quiz, quizTypes);
      const selectedCount = [
        quizTypes.multipleChoice,
        quizTypes.trueFalse,
        quizTypes.shortAnswer,
      ].filter(Boolean).length;
      const typeParts: string[] = [];
      if (mix.multipleChoice > 0) {
        typeParts.push(`${mix.multipleChoice} multiple-choice`);
      }
      if (mix.trueFalse > 0) {
        typeParts.push(`${mix.trueFalse} true-false`);
      }
      if (mix.shortAnswer > 0) {
        typeParts.push(`${mix.shortAnswer} short-answer`);
      }

      if (selectedCount === 1 && mix.multipleChoice === counts.quiz) {
        quantityLines.push(
          `Quiz questions: exactly ${counts.quiz} questions. EVERY question MUST be type "multiple-choice". Do not include any true-false or short-answer questions.`
        );
      } else if (selectedCount === 1 && mix.trueFalse === counts.quiz) {
        quantityLines.push(
          `Quiz questions: exactly ${counts.quiz} questions. EVERY question MUST be type "true-false". Do not include any multiple-choice or short-answer questions.`
        );
      } else if (selectedCount === 1 && mix.shortAnswer === counts.quiz) {
        quantityLines.push(
          `Quiz questions: exactly ${counts.quiz} questions. EVERY question MUST be type "short-answer". Do not include any multiple-choice or true-false questions.`
        );
      } else {
        quantityLines.push(
          `Quiz questions: exactly ${counts.quiz} questions (${typeParts.join(", ")}). Use ONLY these types and match these counts as closely as possible.`
        );
      }
    }

    const systemPrompt = `You are an excellent Grade ${grade} ${subject} teacher creating Study Tools for Project Lighthouse.
Use a ${explanationStyle} explanation style for Grade ${grade}.
Write like a skilled teacher: clear, accurate, intentional, and worth studying. Never write AI filler.

GRADE + STYLE:
* Grade ${grade} + simple: familiar language, shorter sentences, more background, concrete examples. Never babyish or inaccurate.
* Grade ${grade} + normal: grade-appropriate academic vocabulary, clear reasoning, balanced detail.
* Grade ${grade} + advanced: precise terminology, deeper reasoning, stronger connections. Still concise and matched to Grade ${grade}, not college-level digressions.

SOURCE GROUNDING:
* Base materials primarily on the supplied source.
* Preserve important terminology from the source.
* Do not invent quotations, page numbers, dates, formulas, or unsupported claims.
* If something is unclear, omit it rather than guessing.
* For short typed topics, use accurate grade-appropriate curriculum knowledge and stay on topic.
* For notes, learning cards, or uploaded files, do not fill the set with unrelated background.

FLASHCARDS:
* Test exactly one useful idea per card.
* Front: a clear question, precise prompt, short problem, cause/effect, comparison, or concept-identification prompt.
* Back: answer the exact question directly; add brief reasoning when needed; stay concise (usually 1–4 short sentences).
* Front usually 5–25 words; keep exceptions only when needed for math or excerpts.
* Always include a short hint for every card: one sentence that points toward the idea without revealing the answer.
* Mix useful styles when appropriate (why, how, compare, cause/effect, process steps, apply, common mistake). Do not force every style.
* Order cards logically: foundations → key ideas → processes/relationships → applications → harder ideas.
* Avoid vague fronts ("What is this?", "Explain the topic", "What should you know?").
* Avoid multi-question fronts, answer-in-the-question, trivial trivia, near-duplicates, and mere copied source sentences.

VOCABULARY:
* Order terms: essential terms first, then supporting terms, then more advanced terms.
* Skip common words students already know and unrelated hard words.
* Definition: clear, direct, non-circular. Do not start every item with "This is when", "Basically", or "In simple terms".
* Example: one short contextual sentence when useful; otherwise empty string.

KEY DEFINITIONS:
* Order: main concept → related concepts → processes/systems → connections and importance.
* Each item: concept name (term), core explanation (definition), whyItMatters, and example/connection when useful.
* Do not duplicate vocabulary wording.

QUIZ:
* Match Grade ${grade}, ${subject}, and ${explanationStyle} style.
* Ground every question in the source or accurate topic knowledge.
* Test important ideas; avoid duplicates, trick wording, and unsupported facts.
* Every question needs: type, question, choices array, correctAnswer, acceptedAnswers array, explanation, concise topic label, difficulty (easy|medium|hard).
* Use ONLY the question types requested in "Requested amounts". If only one type is requested, every quiz question must use that exact type.
* Multiple-choice: exactly 4 choices; one clearly correct; three plausible incorrect; no duplicates; no jokes; no All/None of the above; do not reveal the answer in the question. Put the correct answer text in correctAnswer matching one choice. Use empty acceptedAnswers [].
* True-false: one clear claim; avoid double negatives; correctAnswer must be exactly "True" or "False"; balance True and False when possible; choices ["True","False"]; empty acceptedAnswers [].
* Short-answer: one specific idea; concise correctAnswer; include 1–4 acceptedAnswers with reasonable alternatives (synonyms, slight phrasing variants); empty choices [].
* Prefer teaching quality over padding.

VARIETY:
* No duplicate questions or nearly identical answers.
* Cover the most important ideas first.
* Prefer teaching quality over padding to hit a count. Better fewer excellent items than filler.
* For unused optional strings, use an empty string.
* Return only the JSON fields requested by the schema.

Requested amounts:
${quantityLines.join("\n")}`;

    const userPrompt = `Source type: ${sourceType}

Source material:
"""
${sourceText}
"""

Create a clear study-set title and the requested study materials for Grade ${grade} ${subject} (${explanationStyle}).`;

    const schema = buildSchema(include);
    let rawContent = "";

    if (attachment) {
      const dataUri = `data:${attachment.mimeType};base64,${attachment.buffer.toString("base64")}`;
      const content: OpenAI.Responses.ResponseInputContent[] = [];

      if (attachment.mimeType === "application/pdf") {
        content.push({
          type: "input_file",
          filename: attachment.filename,
          file_data: dataUri,
          detail: "high",
        } as OpenAI.Responses.ResponseInputFile);
      } else {
        content.push({
          type: "input_image",
          detail: "high",
          image_url: dataUri,
        });
      }

      content.push({ type: "input_text", text: userPrompt });

      const response = await openai.responses.create({
        model: "gpt-4o-mini",
        instructions: systemPrompt,
        input: [{ role: "user", content }],
        text: {
          format: {
            type: "json_schema",
            name: "study_set_content",
            strict: true,
            schema,
          },
        },
      });

      rawContent = response.output_text ?? "";
    } else {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "study_set_content",
            strict: true,
            schema,
          },
        },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      rawContent = completion.choices[0]?.message?.content ?? "";
    }

    if (!rawContent) {
      return NextResponse.json(
        { error: "OpenAI returned an empty response. Please try again." },
        { status: 500 }
      );
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawContent) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "The AI response was not valid JSON. Please try again." },
        { status: 500 }
      );
    }

    const warnings: string[] = [];
    const title =
      asCleanString(parsed.title, 120) ||
      sourceText.slice(0, 60) ||
      "Study set";

    const vocabulary = include.vocabulary
      ? validateTerms(
          parsed.vocabulary,
          counts.vocabulary,
          warnings,
          "Vocabulary terms"
        )
      : [];

    const blockedDefinitionKeys = new Set(
      vocabulary.map((item) => normalizeCompareKey(item.definition))
    );

    const keyDefinitions = include.keyDefinitions
      ? validateTerms(
          parsed.keyDefinitions,
          counts.keyDefinitions,
          warnings,
          "Key definitions",
          {
            allowWhyItMatters: true,
            blockedDefinitionKeys,
          }
        )
      : [];

    const flashcards = include.flashcards
      ? validateFlashcards(parsed.flashcards, counts.flashcards, warnings)
      : [];

    const quizQuestions = include.quiz
      ? validateQuiz(parsed.quizQuestions, counts.quiz, warnings, quizTypes)
      : [];

    const hasAny =
      vocabulary.length > 0 ||
      keyDefinitions.length > 0 ||
      flashcards.length > 0 ||
      quizQuestions.length > 0;

    if (!hasAny) {
      return NextResponse.json(
        {
          error:
            "The AI response could not be turned into study materials. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      title,
      vocabulary,
      keyDefinitions,
      flashcards,
      quizQuestions,
      warnings,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const message = err.message.toLowerCase();
    console.error("Study generate API error:", {
      message: err.message,
      cause: err.cause,
      stack: err.stack,
    });

    if (
      message.includes("valid image") ||
      message.includes("invalid file") ||
      message.includes("unsupported") ||
      message.includes("could not parse")
    ) {
      return NextResponse.json(
        {
          error:
            "OpenAI could not read that file. Try a clearer image or a different PDF.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Something went wrong while building your study set. Please try again.",
      },
      { status: 500 }
    );
  }
}
