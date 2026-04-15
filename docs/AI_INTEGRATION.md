# AI_INTEGRATION.md — Rabbit Hole

The app calls LLM APIs (Anthropic or OpenAI) to generate micro-lessons from user input.

---

## Architecture

```
NewSessionScreen
  ├── fetchOGTags(url)      → scrapes OG metadata (URL mode only)
  └── generateLesson(input) → calls provider API → parses JSON → LessonOutput
```

Both functions live in `lib/claude.ts`. Port as-is, with one fix for CORS (see below).

---

## Provider Adapters

### Anthropic
```
POST https://api.anthropic.com/v1/messages
Headers:
  Content-Type: application/json
  x-api-key: {apiKey}
  anthropic-version: 2023-06-01
Body:
  model: {modelId}
  max_tokens: 3000
  system: {SYSTEM_PROMPT}
  messages: [{ role: 'user', content: {inputJSON} }]
Response: data.content[0].text → raw JSON string
```

### OpenAI
```
POST https://api.openai.com/v1/chat/completions
Headers:
  Content-Type: application/json
  Authorization: Bearer {apiKey}
Body:
  model: {modelId}
  max_tokens: 3000
  messages: [
    { role: 'system', content: {SYSTEM_PROMPT} },
    { role: 'user', content: {inputJSON} }
  ]
  response_format: { type: 'json_object' }
Response: data.choices[0].message.content → raw JSON string
```

### Model Selection
- `getPreferredModel()` → returns model ID from Preferences
- `getModelOption(modelId)` → returns `ModelOption` with `provider` field
- Route to `callAnthropic()` or `callOpenAI()` based on `provider`

---

## System Prompt

The system prompt is ~2000 chars. It instructs the AI to:

1. **Classify** the topic: `topic_type` (8 options), `complexity` (3 levels), `tags` (2–4)
2. **Choose card count** based on mode × complexity (3–6 cards)
3. **Build cards** following topic-specific templates (8 templates)
4. **Generate quiz** — 2 questions testing session content

### Card Templates by Topic Type

| Topic Type | Card Order |
|-----------|-----------|
| concept | Overview → Core Mechanism → Real-world Relevance → Example → Common Confusion |
| science | Discovery/Definition → The Mechanism → Evidence → Application → Open Questions |
| tech | Problem It Solves → How It Works → Key Components → Practical Example → Limitations |
| person | Who + Context → Key Contribution → Why It Mattered → Legacy → Controversy |
| event | What Happened → Key Players → Root Causes → Impact → Long-term Consequences |
| how-to | Goal/Outcome → Core Approach → Key Steps → Tips → Common Pitfalls |
| cultural | What It Is → Origins → Core Ideas → How It Spread → Modern Relevance |
| misc | Overview → Key Idea → How It Works → Example → Watch Out |

Drop last cards to hit target count.

### Card Count by Mode × Complexity

| Mode | basic | intermediate | advanced |
|------|-------|-------------|----------|
| skim | 3 | 4 | 4 |
| deep_dive | 4 | 5 | 6 |

### Hard Rules in Prompt
- Output MUST be valid JSON matching schema exactly
- No URLs in card bodies
- No emojis
- Quiz tests THIS session only
- Explanations <= 25 words
- Body <= 70 words
- 3 "deeper" suggestions each <= 6 words

---

## Response Parsing

```ts
function parseLesson(text: string): LessonOutput {
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from wrapper text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('PARSE_ERROR');
  }
}
```

Port as-is. No changes needed.

---

## OG Tag Fetching

### Problem
In React Native, `fetchOGTags(url)` does a direct `fetch(url)` from native code (no CORS).
In Capacitor, `fetch(url)` runs in a WebView and **will be blocked by CORS** on most sites.

### Solution Options

1. **Capacitor HTTP plugin** (recommended): Install `@capacitor/http` — it makes fetch requests through the native layer, bypassing CORS:
   ```ts
   import { CapacitorHttp } from '@capacitor/core';
   const response = await CapacitorHttp.get({ url });
   const html = response.data;
   ```

2. **Graceful fallback**: If OG fetching fails, just use the domain and URL as-is. The AI can still generate a reasonable lesson from the URL alone:
   ```ts
   catch {
     return { og_title: '', og_description: '', domain: getDomain(), site_name: '' };
   }
   ```

3. **Server proxy** (if you add a backend later): Route through a `/api/og?url=...` endpoint.

### Current Implementation to Port

```ts
export async function fetchOGTags(url: string) {
  const getDomain = () => {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
  };
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RabbitHoleBot/1.0)' },
    });
    const html = await res.text();
    // Parse <meta property="og:title" content="..."> etc.
    const getTag = (prop: string) => /* regex extraction */;
    const getNameTag = (name: string) => /* regex extraction */;
    return {
      og_title: getTag('og:title') || getNameTag('title') || '',
      og_description: getTag('og:description') || getNameTag('description') || '',
      domain: getDomain(),
      site_name: getTag('og:site_name') || domain,
    };
  } catch {
    return { og_title: '', og_description: '', domain: getDomain(), site_name: '' };
  }
}
```

### Regex patterns for OG parsing (port exactly)
```ts
// Matches: <meta property="og:title" content="value">
// Also matches: <meta content="value" property="og:title">
const getTag = (prop: string) =>
  html.match(new RegExp(`<meta[^>]*property=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i'))?.[1]?.trim()
  ?? html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${prop}["']`, 'i'))?.[1]?.trim()
  ?? '';
```

---

## Error Handling

| Error | Message | User sees |
|-------|---------|-----------|
| No API key set | `NO_API_KEY` | "No API key. Go to Settings first." |
| No Anthropic key | `NO_API_KEY_ANTHROPIC` | Same |
| No OpenAI key | `NO_API_KEY_OPENAI` | Same |
| API HTTP error | `ANTHROPIC_{status}` or `OPENAI_{status}` | Truncated error message (120 chars) |
| Response not valid JSON | `PARSE_ERROR` | "Bad response from AI. Try again." |

Errors are caught in `NewSessionScreen.handleDive()` and displayed as red text.
