# DATA_MODELS.md — Rabbit Hole

All TypeScript interfaces live in `src/types/lesson.ts`. Port them exactly — no changes needed.

---

## Types in `types/lesson.ts`

### `KeyTerm`
A single glossary term extracted from a card body.

```ts
export interface KeyTerm {
  term: string;         // must appear verbatim in the card body
  explanation: string;  // <= 20 words
}
```

### `LessonCard`
One swipeable card in a lesson deck (3–6 cards per lesson).

```ts
export interface LessonCard {
  id: string;              // "c1", "c2", ... sequential
  subtitle: string;        // ALL-CAPS short label, max 4 words (e.g. "THE MECHANISM")
  title: string;           // specific descriptive headline for this card's content
  body: string;            // <= 70 words prose
  key_terms?: KeyTerm[];   // 0–3 terms
}
```

### `QuizQuestion`
One multiple-choice quiz question (2 per lesson, used in QuizScreen and DrillScreen).

```ts
export interface QuizQuestion {
  q: string;                            // question text
  choices: [string, string, string, string]; // exactly 4 choices
  answer_index: 0 | 1 | 2 | 3;         // index of the correct choice
  explanation: string;                  // <= 25 words, shown after answer
}
```

### `LessonOutput`
The complete parsed AI response for one session.

```ts
export interface LessonOutput {
  topic_type: string;     // "concept" | "science" | "tech" | "person" | "event" | "how-to" | "cultural" | "misc"
  complexity: string;     // "basic" | "intermediate" | "advanced"
  tags: string[];         // 2–4 short topic labels
  cards: LessonCard[];    // 3–6 cards
  quiz: QuizQuestion[];   // exactly 2 questions
  deeper: [string, string, string]; // 3 suggested follow-up topics (<= 6 words each)
  safety_note: string;    // usually empty string
}
```

### `LessonInput`
The request object sent to the AI (serialized as JSON in the prompt user message).

```ts
export interface LessonInput {
  mode: 'skim' | 'deep_dive';
  source_type: 'url' | 'thought';
  user_intent: string;    // optional free text, may be empty
  url: string;            // empty if source_type is 'thought'
  domain: string;         // extracted from URL, empty if thought
  site_name: string;      // from OG tags, empty if thought
  og_title: string;       // from OG tags, empty if thought
  og_description: string; // from OG tags, empty if thought
  thought: string;        // empty if source_type is 'url'
}
```

### `SessionRecord`
A completed session saved to persistent storage.

```ts
export interface SessionRecord {
  id: string;                              // UUID (Date.now().toString() or crypto.randomUUID())
  timestamp: number;                       // Unix ms
  title: string;                           // OG title, domain, or first 80 chars of thought
  mode: 'skim' | 'deep_dive';
  source_type: 'url' | 'thought';
  xpGained: number;                        // total XP from recordSession()
  quizScore: number;                       // 0, 1, or 2
  lesson: LessonOutput;                    // full lesson stored for review/drill
  cardResults?: Array<'noted' | 'acquired'>; // per-card swipe direction
  pinned?: boolean;                        // user can pin sessions to prevent culling
  topic_type?: string;                     // from lesson.topic_type
  tags?: string[];                         // from lesson.tags
}
```

### `PausedSession`
A mid-session checkpoint saved when the user exits without finishing.

```ts
export interface PausedSession {
  lesson: LessonOutput;
  mode: 'skim' | 'deep_dive';
  title: string;
  sourceType: 'url' | 'thought';
  cardResults: Array<'noted' | 'acquired'>; // cards completed so far
  pausedAt: number; // Unix ms
}
```

---

## Data in `lib/gameState.ts`

### `GameState`
Persisted game/progression state. Stored as a single JSON blob in Preferences.

```ts
export interface GameState {
  totalXP: number;
  totalSessions: number;
  totalDeepDives: number;
  lastSessionDate: string | null;  // ISO date "YYYY-MM-DD"
  currentStreak: number;           // consecutive days
  longestStreak: number;
  achievements: string[];          // array of unlocked achievement IDs
  perfectQuizzes: number;          // quiz score === 2
  todaySessions: number;           // resets each new day
  todayDate: string | null;        // ISO date, used to reset todaySessions
  totalDrills: number;
  perfectDrills: number;
  totalDrillCorrect: number;
  totalDrillQuestions: number;
}
```

### `Achievement`
```ts
export interface Achievement {
  id: string;
  name: string;   // ALL-CAPS display name
  desc: string;   // short description
  icon: string;   // Unicode symbol
  unlockedAt?: number; // not stored in ALL_ACHIEVEMENTS list, added when unlocked
}
```

### `XPBreakdown`
Returned by `recordSession()`.

```ts
export interface XPBreakdown {
  sessionBase: number;  // 50 for skim, 100 for deep_dive
  quizBonus: number;    // quizScore * 25
  perfectBonus: number; // 50 if quizScore === 2, else 0
  streakBonus: number;  // 25 if streak >= 3, else 0
  total: number;
}
```

---

## Storage Keys

All stored in `@capacitor/preferences` (Capacitor rebuild). Key names must match exactly.

| Key | Value | Notes |
|-----|-------|-------|
| `rh_game_state` | JSON `GameState` | Load on app start |
| `rh_sessions` | JSON `SessionRecord[]` | Newest first; culled at save time |
| `rh_paused_session` | JSON `PausedSession` or absent | Cleared on resume/discard |
| `rh_preferred_model` | model ID string | Default: `claude-haiku-4-5-20251001` |
| `rh_dismissed_questions` | JSON `string[]` | Quiz question texts user dismissed in Drill |
| `secure_rh_apikey_anthropic` | API key string | Use `secure_` prefix for sensitive keys |
| `secure_rh_apikey_openai` | API key string | Use `secure_` prefix for sensitive keys |

> **Note for Capacitor:** The original RN app stored API keys in `expo-secure-store` under `rh_apikey_anthropic` / `rh_apikey_openai`. In the web/Capacitor build use `@capacitor/preferences` with a `secure_` prefix (native iOS maps to NSUserDefaults, not Keychain). If true Keychain storage is required, add `@capacitor-community/secure-storage` plugin later.

---

## Model Options

Defined as a const array in `lib/storage.ts`. Port as-is.

```ts
export interface ModelOption {
  id: string;
  provider: 'anthropic' | 'openai';
  label: string;            // short display name "HAIKU", "SONNET", etc.
  sublabel: string;         // full model name
  tier: 'free' | 'paid';
  sessionsPerDollar: number;
  costLine: string;         // human-readable cost string for settings UI
}

// Available models:
// claude-haiku-4-5-20251001  (Anthropic, default)
// claude-sonnet-4-6           (Anthropic)
// gpt-4o-mini                 (OpenAI)
// gpt-4o                      (OpenAI)
```
