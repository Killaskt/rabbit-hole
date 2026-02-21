import { LessonInput, LessonOutput } from '../types/lesson';
import { getApiKey, getModelOption, getPreferredModel } from './storage';

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an educational micro-lesson generator for a mobile app. You must output ONLY valid JSON that matches the schema exactly. No markdown, no extra text.
Your goal is to create a short 5-card swipeable learning session + a 2-question quiz from limited metadata (OpenGraph title/description) or a user-entered thought.
You must be conservative about specifics: do not invent detailed facts about the linked page beyond what the title/description reasonably implies. If details are uncertain, say so briefly.

HARD RULES (MUST FOLLOW):
- Output MUST be valid JSON and MUST match the schema below exactly.
- Exactly 5 cards. Each card has: id, title, body.
- Each card body MUST be <= 70 words.
- Exactly 2 quiz questions. Each has: q, choices (length 4), answer_index (0-3), explanation (<= 25 words).
- Exactly 3 deeper suggestions, each <= 6 words.
- Keep language clear and helpful. No fluff. No emojis.
- If input is too vague, make a generic session about the likely topic and include one brief uncertainty line in card 1 or card 5.
- Never include URLs in the card bodies.

INPUT (JSON):
{
  "mode": "<skim|deep_dive>",
  "source_type": "<url|thought>",
  "user_intent": "<one sentence, may be empty>",
  "url": "<string or empty>",
  "domain": "<string or empty>",
  "site_name": "<string or empty>",
  "og_title": "<string or empty>",
  "og_description": "<string or empty>",
  "thought": "<string or empty>"
}

OUTPUT SCHEMA (JSON):
{
  "cards": [
    { "id": "c1", "title": "", "body": "" },
    { "id": "c2", "title": "", "body": "" },
    { "id": "c3", "title": "", "body": "" },
    { "id": "c4", "title": "", "body": "" },
    { "id": "c5", "title": "", "body": "" }
  ],
  "quiz": [
    { "q": "", "choices": ["", "", "", ""], "answer_index": 0, "explanation": "" },
    { "q": "", "choices": ["", "", "", ""], "answer_index": 0, "explanation": "" }
  ],
  "deeper": ["", "", ""],
  "safety_note": ""
}

CONTENT GUIDANCE:
- Use this stable 5-card structure:
  c1: "What it is" (define/overview; include uncertainty note if needed)
  c2: "Key idea" (core concept in plain words)
  c3: "How it works / why it matters" (one mechanism + one implication)
  c4: "Example" (simple scenario)
  c5: "Common confusion + quick check" (misconception + 1 short check prompt)

- Mode differences:
  skim: simpler wording, fewer terms, practical gist
  deep_dive: denser wording, add 1-2 technical terms (still <= 70 words)

QUIZ RULES:
- Questions should test understanding of the session you just wrote (not trivia).
- Prefer conceptual recognition + application.
- Keep choices plausible; avoid "all of the above".

Now read the INPUT JSON and produce the OUTPUT JSON.`;

// ── OG tag scraper ────────────────────────────────────────────────────────────

export async function fetchOGTags(url: string): Promise<{
  og_title: string;
  og_description: string;
  domain: string;
  site_name: string;
}> {
  const getDomain = () => {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
  };

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RabbitHoleBot/1.0)' },
    });
    const html = await res.text();

    const getTag = (prop: string) =>
      html.match(new RegExp(`<meta[^>]*property=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i'))?.[1]?.trim()
      ?? html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${prop}["']`, 'i'))?.[1]?.trim()
      ?? '';

    const getNameTag = (name: string) =>
      html.match(new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'))?.[1]?.trim()
      ?? html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${name}["']`, 'i'))?.[1]?.trim()
      ?? '';

    const domain = getDomain();
    return {
      og_title: getTag('og:title') || getNameTag('title') || '',
      og_description: getTag('og:description') || getNameTag('description') || '',
      domain,
      site_name: getTag('og:site_name') || domain,
    };
  } catch {
    return { og_title: '', og_description: '', domain: getDomain(), site_name: '' };
  }
}

// ── Provider adapters ─────────────────────────────────────────────────────────

async function callAnthropic(modelId: string, userContent: string): Promise<string> {
  const apiKey = await getApiKey('anthropic');
  if (!apiKey) throw new Error('NO_API_KEY_ANTHROPIC');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `ANTHROPIC_${res.status}`);
  }

  const data = await res.json() as { content: Array<{ text: string }> };
  return data.content?.[0]?.text ?? '';
}

async function callOpenAI(modelId: string, userContent: string): Promise<string> {
  const apiKey = await getApiKey('openai');
  if (!apiKey) throw new Error('NO_API_KEY_OPENAI');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 2048,
      // OpenAI takes system as first message in messages array
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      // Encourage pure JSON output
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `OPENAI_${res.status}`);
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices?.[0]?.message?.content ?? '';
}

// ── Public API ────────────────────────────────────────────────────────────────

function parseLesson(text: string): LessonOutput {
  try {
    return JSON.parse(text) as LessonOutput;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as LessonOutput;
    throw new Error('PARSE_ERROR');
  }
}

export async function generateLesson(input: LessonInput): Promise<LessonOutput> {
  const modelId = await getPreferredModel();
  const model = getModelOption(modelId);
  const userContent = JSON.stringify(input);

  let text: string;
  if (model.provider === 'openai') {
    text = await callOpenAI(modelId, userContent);
  } else {
    text = await callAnthropic(modelId, userContent);
  }

  return parseLesson(text);
}
