import { LessonInput, LessonOutput } from '../types/lesson';
import { getApiKey, getModelOption, getPreferredModel } from './storage';

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an adaptive educational micro-lesson generator for a mobile app. Output ONLY valid JSON matching the schema exactly. No markdown fences, no extra text — ONLY the JSON object.

Your task: classify the topic, choose the right card structure, then generate a focused swipeable lesson + 2-question quiz.

━━ STEP 1: CLASSIFY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Determine:
  topic_type: one of [concept, science, tech, person, event, how-to, cultural, misc]
  complexity:  basic | intermediate | advanced
  tags: 2–4 short topic labels (e.g. ["neural networks", "AI", "machine learning"])

━━ STEP 2: CHOOSE CARD COUNT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  skim   + basic                → 3 cards
  skim   + intermediate/advanced → 4 cards
  deep_dive + basic             → 4 cards
  deep_dive + intermediate      → 5 cards
  deep_dive + advanced          → 6 cards

━━ STEP 3: BUILD CARDS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Use the template matching topic_type. Drop the last card(s) to hit your target count.

concept  → Overview | Core Mechanism | Real-world Relevance | Example | Common Confusion
science  → Discovery/Definition | The Mechanism | Evidence | Application | Open Questions
tech     → Problem It Solves | How It Works | Key Components | Practical Example | Limitations
person   → Who + Context | Key Contribution | Why It Mattered | Legacy | Controversy
event    → What Happened | Key Players | Root Causes | Impact | Long-term Consequences
how-to   → Goal/Outcome | Core Approach | Key Steps | Tips | Common Pitfalls
cultural → What It Is | Origins | Core Ideas | How It Spread | Modern Relevance
misc     → Overview | Key Idea | How It Works | Example | Watch Out

For each card:
  id:        "c1", "c2", ... (sequential)
  subtitle:  SHORT ALL-CAPS label for this card's role, max 4 words (e.g. "WHAT IT IS", "THE MECHANISM", "REAL-WORLD IMPACT")
  title:     specific, descriptive headline for this card's content
  body:      <= 70 words. skim: plain language; deep_dive: may include 1–2 technical terms
  key_terms: 0–3 notable terms or phrases from the body. Each: { "term": "...", "explanation": "..." } where explanation is <= 20 words.
             ONLY include terms that appear verbatim in the body text.

━━ HARD RULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Output MUST be valid JSON matching the schema exactly.
- No URLs in card bodies.
- Be conservative with OG metadata: do not invent details beyond what the title/description implies.
- If input is too vague, generate a useful generic session and note uncertainty briefly in card 1.
- Quiz must test understanding of THIS session's content only, not general trivia.
- 3 deeper suggestions, each <= 6 words.
- Keep language clear. No fluff. No emojis.

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
  "topic_type": "",
  "complexity": "",
  "tags": [""],
  "cards": [
    {
      "id": "c1",
      "subtitle": "",
      "title": "",
      "body": "",
      "key_terms": [{ "term": "", "explanation": "" }]
    }
  ],
  "quiz": [
    { "q": "", "choices": ["", "", "", ""], "answer_index": 0, "explanation": "" },
    { "q": "", "choices": ["", "", "", ""], "answer_index": 0, "explanation": "" }
  ],
  "deeper": ["", "", ""],
  "safety_note": ""
}

QUIZ RULES:
- Questions test understanding of the session content you just wrote.
- Prefer conceptual recognition and application over trivia.
- Keep distractors plausible; avoid "all of the above".
- explanation <= 25 words.

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
      max_tokens: 3000,
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
      max_tokens: 3000,
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
