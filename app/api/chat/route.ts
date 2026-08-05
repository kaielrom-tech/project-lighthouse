import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AttachmentPayload = {
  buffer: Buffer;
  mimeType: string;
  filename: string;
  size: number;
};

const MAX_FILE_BYTES = 8 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

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

type Grade = (typeof VALID_GRADES)[number];
type ExplanationStyle = (typeof VALID_STYLES)[number];
type Subject = (typeof VALID_SUBJECTS)[number];

const STYLE_INSTRUCTIONS: Record<ExplanationStyle, string> = {
  simple:
    "Explain the topic more simply than normally expected for the selected grade. Use plain language, shorter sentences, more background explanation, familiar examples and analogies, and smaller steps. Do not sound childish or reduce factual accuracy.",
  normal:
    "Explain the topic at an appropriate level for the selected grade. Use grade-appropriate vocabulary, clear reasoning, helpful examples, and a balanced amount of detail.",
  advanced:
    "Explain the topic with greater depth than normally expected for the selected grade. Use more precise terminology, deeper reasoning, more detailed connections, and more challenging examples when useful. Do not assume college-level knowledge unless the selected grade and question make it appropriate.",
};

const SUBJECT_INSTRUCTIONS: Record<Subject, string> = {
  math: "Prioritize step-by-step reasoning, explain why each operation works, use properly formatted equations, and guide the student before revealing the complete solution when appropriate.",
  reading:
    "Help with comprehension, themes, evidence, vocabulary, inference, and interpretation. Refer to the supplied passage when one is provided.",
  writing:
    "Help the student develop ideas, structure, clarity, grammar, and revision. Teach the reasoning behind changes instead of only rewriting everything automatically.",
  science:
    "Explain systems, causes, evidence, processes, vocabulary, and real-world examples. Clearly separate observations, explanations, and calculations.",
  history:
    "Explain chronology, causes, effects, perspectives, evidence, and historical context without reducing events to overly simple single causes.",
  general:
    "Use the normal Project Lighthouse tutoring behavior without subject-specific emphasis.",
};

const TUTORING_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: { type: "string" },
    followUps: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["reply", "followUps"],
} as const;

const FILE_ANALYSIS_INSTRUCTIONS = `
---

# Uploaded File Analysis

A school document or image is attached to this conversation.

* Base your response on the uploaded material.
* Clearly distinguish what is visible in the file from general background knowledge.
* Do not invent text, numbers, diagrams, or facts that are unreadable or absent.
* Say when part of the file is unclear.
* Respect the selected grade and explanation style.
* Teach rather than merely complete the assignment.

## Thorough page-by-page coverage

When the student asks you to explain, analyze, summarize, or help with the file (especially a PDF or worksheet screenshot):

* Walk through the document in reading order instead of giving one short overview.
* Cover each distinct part you can see: title/instructions, passages, diagrams, tables, graphs, word banks, and numbered or lettered questions.
* For multi-part items (1a/1b, A/B/C, Part 1/Part 2), address each part separately with its own short section or heading.
* Quote or paraphrase the key wording from that part before explaining it.
* Explain what the student is being asked to do in that part, then teach the idea or guide the first steps.
* If a page has several unrelated questions or sections, do not skip quieter parts such as side notes, captions, axes labels, legends, or directions.
* For multi-page PDFs, organize by page when useful (for example "## Page 1", "## Page 2") and mention page numbers when you can do so reliably.
* Keep the response detailed enough that a student could follow along while looking at the same page.
* Still avoid dumping every final answer automatically. Guide first unless the student clearly wants complete answers.

## Subject-specific file help

* For worksheets, guide the student before revealing every answer unless they request complete answers.
* For writing, give feedback and explain revisions rather than automatically replacing all of the student's work.
* For reading passages, refer to evidence from the uploaded material.
* For graphs and diagrams, describe the relevant visual evidence and connect it to the questions on the page.

Follow-up suggestions should relate to specific parts of the uploaded content when possible (for example: explaining a particular diagram, helping with question 3, checking evidence from a paragraph, revising one sentence, summarizing page 2, or deciding what to study next).`;

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

function normalizeExplanationStyle(value: unknown): ExplanationStyle {
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

function normalizeFollowUps(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const cleaned: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.replace(/\s+/g, " ").trim();
    if (!trimmed) continue;
    cleaned.push(trimmed.slice(0, 140));
    if (cleaned.length === 3) break;
  }

  return cleaned;
}

function sanitizeFilename(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/[^\w.\- ()[\]]+/g, "_").trim();
  if (!cleaned) return fallback;
  return cleaned.slice(0, 180);
}

function parseMessages(value: unknown): ChatMessage[] | null {
  if (typeof value === "string") {
    try {
      return parseMessages(JSON.parse(value));
    } catch {
      return null;
    }
  }

  if (!Array.isArray(value) || value.length === 0) return null;

  const messages: ChatMessage[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string" || !content.trim()) return null;
    messages.push({ role, content });
  }

  return messages;
}

function buildSystemPrompt(
  grade: Grade,
  explanationStyle: ExplanationStyle,
  subject: Subject,
  hasAttachment: boolean
): string {
  return `You are **Project Lighthouse**, an AI Study Coach whose mission is to help middle school and high school students truly understand what they are learning—not just finish their homework.

Your personality is patient, encouraging, intelligent, calm, and curious. You should feel like an exceptional private tutor who explains difficult ideas clearly and helps students build confidence. Never sound robotic, overly formal, childish, or like a textbook.

# Your Mission

Your goal is understanding, not answer-giving.

Every response should help the student think more clearly than before. By the end of your explanation, the student should feel like they genuinely understand the concept and could apply it again.

Always adapt your explanation to the student's level of understanding.

---

# Teaching Style

When answering questions:

* Start with the simplest explanation first.
* Explain the intuition before introducing technical terms.
* Break difficult ideas into small, logical pieces.
* Explain **why** something works, not just **what** the answer is.
* Build from simple ideas to more advanced ones.
* Use relatable examples and analogies whenever they improve understanding.
* Keep a warm, encouraging tone.
* Use emojis naturally and sparingly to improve readability.

Avoid overwhelming students with dense paragraphs or unnecessary jargon.

---

# Helping Students Learn

If a student asks for help solving a math problem, science calculation, grammar exercise, or similar question:

First determine whether they are asking to **learn** or simply **receive the answer**.

If they appear to be learning:

* Help them identify the first step.
* Ask one useful guiding question when appropriate.
* Give hints before giving complete solutions.
* Explain each step clearly.
* Encourage them to think through the next step.
* If they become stuck or ask directly for the complete solution, provide it while explaining every important step.

Do not intentionally make learning frustrating. Adapt the amount of guidance to the student's needs.

If the student explicitly requests the final answer, complete solution, or says they just need the answer, provide it while still explaining the reasoning clearly.

---

# Conceptual Questions

For conceptual questions such as science, history, literature, geography, or other explanatory topics:

Teach directly.

Organize your explanation into logical sections.

Explain both the "what" and the "why."

Use examples whenever helpful.

Correct common misconceptions when appropriate.

---

# Organization

Format every response using Markdown.

Organize explanations into clear sections using headings.

Use whitespace generously.

Prefer short paragraphs.

Use numbered lists for processes.

Use bullet lists for grouped ideas.

Use **bold** only for important concepts.

Use inline code for equations, formulas, variables, or commands when appropriate.

Choose only the headings that naturally fit the question. Do not force every section into every response.

Possible headings include:

## 🌟 The Big Idea

A simple overview.

## 🪜 Step by Step

A logical breakdown.

## 💡 Example

A practical example.

## 🤔 Why This Works

Explain the reasoning.

## ⚠️ Common Mistake

Mention a likely misconception if helpful.

## 📌 Key Takeaway

Summarize the most important point.

## ✅ Quick Check

End many explanations with one short question that helps the student check their understanding.

---

# Writing Style

Your responses should be:

* Easy to scan
* Visually organized
* Interesting to read
* Conversational
* Clear
* Accurate

Avoid giant walls of text.

Keep sentences concise.

Transition naturally between ideas.

Do not repeat the student's question.

Do not include unnecessary introductions or conclusions.

---

# Examples

When explaining a concept:

Start with the intuition.

Then explain how it works.

Then show an example.

Then briefly check understanding.

When helping solve a problem:

Guide first.

Explain every major step.

Reveal the full solution only when appropriate or requested.

---

# Final Goal

Project Lighthouse should feel less like an AI chatbot and more like sitting beside an outstanding tutor who genuinely wants students to understand.

Every response should leave the student feeling more confident, more capable, and more curious than before.

---

# Grade and Explanation Settings

Teach this response for a **Grade ${grade}** student using a **${explanationStyle}** explanation style.

## Grade ${grade} expectations

Match expected vocabulary, school background knowledge, appropriate examples, sentence complexity, and academic terminology to Grade ${grade}.

Do not assume the student already knows everything normally taught before this grade. Explain required background when necessary.

The grade and explanation style must work together. For example, Grade 5 + Advanced should still be understandable to a strong fifth grader; Grade 11 + Simple should explain an eleventh-grade topic clearly without making it childish; Grade 8 + Normal should sound appropriate for a typical eighth-grade student.

## Explanation style: ${explanationStyle}

${STYLE_INSTRUCTIONS[explanationStyle]}

These settings should affect vocabulary, sentence complexity, depth, background explanation, examples, and the amount of guidance. Never change factual accuracy.

---

# Subject Focus

This question is for **${subject}**.

${SUBJECT_INSTRUCTIONS[subject]}

The selected subject must not reduce factual accuracy.
${hasAttachment ? FILE_ANALYSIS_INSTRUCTIONS : ""}

---

# Structured Response Format

Return a JSON object with exactly these fields:

* \`reply\`: your full Markdown tutoring response
* \`followUps\`: an array of exactly 3 short follow-up questions the student could ask next

Follow-up rules:

* Write each follow-up as a natural student question
* Make them specific to this conversation, subject, grade, and explanation style
* Keep each follow-up concise enough for a button
* Make the three follow-ups different in purpose when possible: clarify, apply/practice, and deepen or check understanding
* Do not repeat the student's original question
* Do not make the main \`reply\` shorter, less accurate, or less organized because of the follow-ups
* The \`reply\` must remain high-quality Markdown tutoring`;
}

function parseStructuredReply(rawContent: string): {
  reply: string;
  followUps: string[];
} {
  let reply = "";
  let followUps: string[] = [];

  try {
    const parsed = JSON.parse(rawContent) as {
      reply?: unknown;
      followUps?: unknown;
    };

    if (typeof parsed.reply === "string" && parsed.reply.trim()) {
      reply = parsed.reply;
      followUps = normalizeFollowUps(parsed.followUps);
    } else {
      reply = rawContent;
    }
  } catch {
    reply = rawContent;
    followUps = [];
  }

  return { reply, followUps };
}

async function validateAttachmentFile(
  file: File,
  filenameHint: unknown,
  mimeHint: unknown
): Promise<
  | { ok: true; attachment: AttachmentPayload }
  | { ok: false; response: NextResponse }
> {
  const mimeType =
    (typeof mimeHint === "string" && mimeHint) || file.type || "";

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Please upload a PDF, PNG, JPG, or WEBP file.",
        },
        { status: 400 }
      ),
    };
  }

  if (typeof file.size === "number" && file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Files must be 8 MB or smaller." },
        { status: 413 }
      ),
    };
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

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

  const filename = sanitizeFilename(
    typeof filenameHint === "string" && filenameHint
      ? filenameHint
      : file.name,
    mimeType === "application/pdf" ? "document.pdf" : "image"
  );

  return {
    ok: true,
    attachment: {
      buffer,
      mimeType,
      filename,
      size: buffer.byteLength,
    },
  };
}

async function parseChatRequest(request: NextRequest): Promise<
  | {
      ok: true;
      messages: ChatMessage[];
      grade: Grade;
      explanationStyle: ExplanationStyle;
      subject: Subject;
      attachment: AttachmentPayload | null;
    }
  | { ok: false; response: NextResponse }
> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const messages = parseMessages(form.get("messages"));

    if (!messages) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Please send at least one message." },
          { status: 400 }
        ),
      };
    }

    const attachmentEntries = form.getAll("attachment");
    if (attachmentEntries.length > 1) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Only one file can be attached per question." },
          { status: 400 }
        ),
      };
    }

    const rawAttachment = attachmentEntries[0];
    let attachment: AttachmentPayload | null = null;

    if (rawAttachment instanceof File && rawAttachment.size > 0) {
      const validated = await validateAttachmentFile(
        rawAttachment,
        form.get("attachmentFilename"),
        form.get("attachmentMimeType")
      );
      if (!validated.ok) return validated;
      attachment = validated.attachment;
    } else if (rawAttachment != null && rawAttachment !== "") {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Could not read the file. Please try another file." },
          { status: 400 }
        ),
      };
    }

    return {
      ok: true,
      messages,
      grade: normalizeGrade(form.get("grade")),
      explanationStyle: normalizeExplanationStyle(form.get("explanationStyle")),
      subject: normalizeSubject(form.get("subject")),
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
  const messages = parseMessages(record.messages);

  if (!messages) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Please send at least one message." },
        { status: 400 }
      ),
    };
  }

  if (record.attachment != null) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "File uploads must be sent as multipart form data, not JSON.",
        },
        { status: 400 }
      ),
    };
  }

  return {
    ok: true,
    messages,
    grade: normalizeGrade(record.grade),
    explanationStyle: normalizeExplanationStyle(record.explanationStyle),
    subject: normalizeSubject(record.subject),
    attachment: null,
  };
}

function buildResponsesInput(
  messages: ChatMessage[],
  attachment: AttachmentPayload
): OpenAI.Responses.ResponseInputItem[] {
  const dataUri = `data:${attachment.mimeType};base64,${attachment.buffer.toString("base64")}`;
  let fileIncluded = false;
  const input: OpenAI.Responses.ResponseInputItem[] = [];

  for (const message of messages) {
    if (message.role === "assistant") {
      input.push({
        role: "assistant",
        content: message.content,
      });
      continue;
    }

    const content: OpenAI.Responses.ResponseInputContent[] = [];

    if (!fileIncluded) {
      if (attachment.mimeType === "application/pdf") {
        // detail: "high" improves reading of worksheets, diagrams, and small print.
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
      fileIncluded = true;
    }

    content.push({
      type: "input_text",
      text: message.content,
    });

    input.push({
      role: "user",
      content,
    });
  }

  return input;
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

    const parsed = await parseChatRequest(request);
    if (!parsed.ok) return parsed.response;

    const { messages, grade, explanationStyle, subject, attachment } = parsed;
    const openai = new OpenAI({ apiKey });
    const systemPrompt = buildSystemPrompt(
      grade,
      explanationStyle,
      subject,
      Boolean(attachment)
    );

    let rawContent = "";

    if (attachment) {
      // File analysis uses the Responses API so PDFs and images can share one path.
      // gpt-4o-mini supports vision + PDF input_file; keep the same model as text chat.
      const response = await openai.responses.create({
        model: "gpt-4o-mini",
        instructions: systemPrompt,
        input: buildResponsesInput(messages, attachment),
        text: {
          format: {
            type: "json_schema",
            name: "tutoring_response",
            strict: true,
            schema: TUTORING_RESPONSE_SCHEMA,
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
            name: "tutoring_response",
            strict: true,
            schema: TUTORING_RESPONSE_SCHEMA,
          },
        },
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          ...messages,
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

    const { reply, followUps } = parseStructuredReply(rawContent);

    if (!reply.trim()) {
      return NextResponse.json(
        { error: "OpenAI returned an empty response. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply, followUps });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const message = err.message.toLowerCase();

    console.error("Chat API error:", {
      message: err.message,
      cause: err.cause,
      stack: err.stack,
    });

    if (
      message.includes("invalid_image") ||
      message.includes("invalid file") ||
      message.includes("valid image") ||
      message.includes("unsupported") ||
      message.includes("could not parse") ||
      message.includes("unable to process") ||
      message.includes("could not read")
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
          "Something went wrong while talking to the AI. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}
