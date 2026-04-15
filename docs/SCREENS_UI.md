# SCREENS_UI.md — Rabbit Hole

Every screen's purpose, data flow, and key UI elements. Use this to rebuild each screen in Capacitor.

---

## Navigation System

No router library. `App.tsx` manages a `useState<ScreenState>`:

```ts
type ScreenName =
  | 'home' | 'vault'
  | 'new-session' | 'session' | 'quiz' | 'results'
  | 'review-session' | 'drill' | 'settings';

interface ScreenState {
  screen: ScreenName;
  params?: Record<string, string>;
}
```

**Tab bar:** Always visible on `home` and `vault`. Hidden on all other screens.
- HOME tab: navigates to `{ screen: 'home' }`
- VAULT tab: navigates to `{ screen: 'vault' }`
- Tab bar style: dark bg `#080808`, monospace labels, active tab gets `> ` prefix + white text

**Screen navigation helper:** `navigate(screen, params?)` sets state. For "back" behavior, either track history in an array or just navigate to `home`.

---

## HomeScreen (2 tabs: HOME)

**Source:** `app/(tabs)/index.tsx`

### Data loaded on mount
- `initGameState()` → `getGameState()` → `GameState` (XP, level, stats, streak)
- `loadSessions()` → `SessionRecord[]`
- `loadPausedSession()` → `PausedSession | null`

### Pull-to-refresh
Reloads all data above. In web/Capacitor: not needed (no native scroll refresh). Just load on mount.

### UI Sections (top to bottom)

1. **Header** — `// RABBIT HOLE` label + `> knowledge_agent_` with blinking cursor (530ms interval)
   - Right side: `⚙` button → navigates to `settings`

2. **Level Card** — tappable, opens Level History modal
   - Shows: level name (e.g. "GHOST"), level number, total XP, progress bar, `xpInLevel / xpForNextLevel`
   - Uses `getLevelProgress(totalXP)` from `gameState.ts`

3. **Stats Row** — 4 equal-width boxes: HOLES (totalSessions), STREAK (currentStreak + "d"), PERFECT (perfectQuizzes), DIVES (totalDeepDives)

4. **Paused Session Banner** — shown only if `pausedSession` exists
   - Shows title, mode badge, DISCARD and RESUME buttons
   - DISCARD: calls `clearPausedSession()`, clears state
   - RESUME: calls `setCurrentSession(...)` + navigates to `session`

5. **Dive Button** — `◎ ENTER THE HOLE` with sub-text "drop a URL or thought"
   - Yellow bg (`#efff00`), black text
   - Clears any paused session, then navigates to `new-session`

6. **Recent Traces** — list of past sessions
   - Pinned sessions always shown first
   - Unpinned: show most recent 5
   - Each row: pin toggle (◇/◆), title, mode/quiz/xp meta, date
   - Tap row → navigate to `review-session` with `{ id: session.id }`
   - Tap pin icon → toggle `pinSession(id, !pinned)`

7. **Empty State** — shown when no sessions and no paused session
   - Message: "Your first rabbit hole awaits. Drop a URL or a thought above."

8. **Level History Modal** — full-screen overlay, scrollable list of all 10 levels
   - Shows name, number, icon, current marker (◀ HERE), completed check (♛)
   - `LEVEL_NAMES`: GHOST, PHANTOM, SPECTER, ORACLE, ARCHITECT, SHADOW, CIPHER, NEXUS, VOID, RABBIT KING
   - `LEVEL_ICONS`: ○ ◌ ◎ ◐ ◑ ◍ ◈ ◉ ◆ ★

### Accessibility
- Text scale/bold from `useTextSettings()` applied to stat values, session titles, level name, XP total

---

## VaultScreen (2 tabs: VAULT)

**Source:** `app/(tabs)/vault.tsx`

### Data loaded on mount
- `initGameState()` → `getGameState()`
- `loadSessions()` → build topic cloud

### UI Sections

1. **Title** — `// VAULT` + subtitle "knowledge cache & achievements"

2. **Achievements Progress** — `X / Y UNLOCKED` + progress bar

3. **Statistics** — horizontally scrollable grid, 3 columns:
   - Col 1: TOTAL SESSIONS, DEEP DIVES, PERFECT QUIZZES
   - Col 2: BEST STREAK, CURRENT STREAK, TOTAL XP
   - Col 3: RECALLS RUN, RECALL ACC (percentage or "—")

4. **Topic Cloud** — tag cloud from all session tags
   - Built via `buildTagCloud(sessions)`: count occurrences, sort desc, top 32
   - Visual weight: top tag → accent yellow + larger font; lower tags → dimmer + smaller
   - Each tag shows count if > 1

5. **Recall Button** — shown only if `totalSessions > 0`
   - `[ ◈ RECALL ]` with sub "test what you know"
   - Navigates to `drill`

6. **Achievements List** — all achievements from `ALL_ACHIEVEMENTS`
   - Each: icon (or "?" if locked), name, description (or "???" if locked)
   - Unlocked ones show ◆ badge

---

## NewSessionScreen (modal)

**Source:** `app/new-session.tsx`

### Data flow
- User sets: mode (`skim`/`deep_dive`), sourceType (`thought`/`url`), input text, optional intent
- On "DIVE IN": calls `getApiKey()` → validates → calls `generateLesson(input)` → `setCurrentSession()` → navigate to `session`
- Supports `prefill` param: pre-fills thought field (used by "Go Deeper" from ResultsScreen)

### UI Sections

1. **Header** — ← BACK button + "NEW SESSION" title
2. **Mode Selector** — two toggle buttons: SKIM, DEEP DIVE (shows "+2x XP" when active)
3. **Source Selector** — two toggle buttons: THOUGHT, URL
4. **Input Field** — URL: single-line `https://...`; Thought: multi-line textarea
5. **Intent Field** — optional helper text, single line
6. **Error Display** — red text for validation/API errors
7. **Loading State** — spinner + rotating messages (7 thematic messages, 900ms interval)
8. **Dive Button** — `◎ DIVE IN`, disabled when input empty or loading

### Loading messages
```
> INITIATING DIVE SEQUENCE...
> PARSING SIGNAL...
> EXTRACTING KNOWLEDGE NODES...
> COMPILING MICRO-LESSON...
> BUILDING CARD DECK...
> ENCRYPTING INSIGHTS...
> ALMOST THERE...
```

---

## SessionScreen (swipeable card deck)

**Source:** `app/session.tsx`

### Data flow
- Reads from `getCurrentSession()` (in-memory store)
- Each swipe: `addCardResult('right' | 'left')` + haptic feedback + XP burst animation
- After last card: navigate to `quiz`
- Exit behavior: two-tap abandon (tap once → "ABORT?" for 3s, tap again → save paused session, go home)

### UI Sections

1. **Header** — exit button (tap-to-confirm pattern), `// SESSION` label, card count
2. **Mode Badge** — SKIM or DEEP DIVE pill
3. **Progress Bar** — animated width `(currentIndex / total)`
4. **XP Counter** — running total of XP earned from cards (10 XP per card)
5. **Card Deck** — single `SwipeCard` component at a time
   - Swipe right → "ACQUIRED" label (accent yellow)
   - Swipe left → "NOTED" label (gray)
   - Both advance to next card
6. **Swipe Hint Overlay** — shown once (first time ever), explains ←/→ swipe meaning
   - Persisted with `hasSeenSwipeHint` / `markSwipeHintSeen` in storage

---

## QuizScreen

**Source:** `app/quiz.tsx`

### Data flow
- Reads `quiz[]` from `getCurrentSession().lesson`
- 2 questions, 4 choices each
- On answer: haptic feedback, flash animation (green for correct, red for wrong), XP burst on correct (+25 XP)
- After last question: navigate to `results` with `{ score, mode }`
- Same two-tap exit pattern as SessionScreen (saves paused session)

### UI Sections

1. **Header** — `// KNOWLEDGE CHECK`, score display `X/Y`, EXIT button
2. **Progress Dots** — one per question, active/done states
3. **Question Card** — slide animation between questions
4. **Choices** — 4 buttons, labeled A/B/C/D
   - Correct: yellow border + yellow text + ✓
   - Wrong: red border + red text + ✗
   - Others dim out
5. **Explanation** — shown after answering, with `// CORRECT` or `// INCORRECT` label
6. **Next Button** — advances or finishes

---

## ResultsScreen

**Source:** `app/results.tsx`

### Data flow
- Reads quiz score from params, gets lesson from `getCurrentSession()`
- On mount: `recordSession({ mode, quizScore })` → XP breakdown + achievements
- Saves completed `SessionRecord` via `addSession()`
- Clears current session on exit

### UI Sections

1. **Score Header** — message (SUBOPTIMAL / PARTIAL / FULL ACQUISITION), score X/2, title
2. **XP Card** — animated count-up of total XP earned
   - Breakdown rows: SESSION BASE (+50/100), QUIZ SCORE (+0/25/50), PERFECT QUIZ (+50), STREAK BONUS (+25)
3. **Level Info** — current level name + progress bar + level-up animation if applicable
4. **Go Deeper** — 3 topic suggestions from `lesson.deeper[]`, each tappable
   - Tapping clears session and navigates to `new-session` with `{ prefill: topic }`
5. **Done Button** — `◎ BACK TO SURFACE` → clears session, navigates home

### Achievement toasts
- If `recordSession()` returns new achievements, they appear as slide-up toasts one at a time
- Uses `AchievementToast` component

---

## ReviewSessionScreen

**Source:** `app/review-session.tsx`

### Data flow
- Receives `{ id }` param, loads session via `getSessionById(id)`

### UI Sections

1. **Header** — ← BACK, `// REVIEW`, pin/unpin button
2. **Metadata** — title, mode badge, quiz score, date
3. **Cards Section** — all cards rendered as static blocks (not swipeable)
   - Shows card number, title, body
   - If `cardResults[i]` exists, shows ACQUIRED or NOTED badge
4. **Quiz Section** — all questions with correct answer highlighted (✓ green), others dimmed
   - Explanation shown below each question
5. **Go Deeper Section** — same 3 suggestions, each tappable → navigate to `new-session` with prefill

---

## DrillScreen (Recall)

**Source:** `app/drill.tsx`

### Data flow
- On mount: loads all sessions, collects quiz questions from deep_dive sessions only
- Filters out dismissed questions (from `getDismissedQuestions()`)
- Shuffles and picks up to 5 questions (`DRILL_SIZE = 5`)
- Each question shows its source session title
- On completion: `recordDrill(score, total)` → XP + achievements

### UI Sections

1. **Empty State** — if no questions available: message + ← BACK button
2. **Header** — ← EXIT, `// RECALL`, score display
3. **Progress Dots** — one per question
4. **Question Card** — from: source title, question text, 4 choices (same style as QuizScreen)
5. **"NOT INTERESTED"** — dismisses question permanently via `dismissQuestion(q.q)`
6. **Done Screen** — score/total, percentage, XP earned, ◎ BACK TO SURFACE button
7. **Achievement Toasts** — same as ResultsScreen

### XP
- 15 XP per correct answer (vs 25 XP in quiz)

---

## SettingsScreen (modal)

**Source:** `app/settings.tsx`

### Data flow
- Loads selected model + API keys on mount
- Saves changes immediately to storage

### UI Sections

1. **Header** — ← BACK, SETTINGS title
2. **Display Section** — text size selector (NORMAL / LARGE / X-LARGE) + bold toggle
3. **API Keys Section** — two key inputs (Anthropic, OpenAI)
   - Each: masked display (first 10 + •••• + last 4), save button, delete button
   - Validates key prefix (`sk-ant-` for Anthropic, `sk-` for OpenAI)
   - Uses `Alert.alert()` for validation/confirmation → use `window.confirm()` in web
4. **Model Selector** — Anthropic models then OpenAI models
   - Each card: label, sublabel, tier badge (FREE/PAID), cost line, active dot
   - Tap to select: `setPreferredModel(id)`

---

## Components

### `LiquidBackground`
Full-screen animated background present on every screen. Dark base with 3 slow-moving blobs:
- Blob 1: white, 260px, 11s cycle
- Blob 2: yellow-tinted, 200px, 14s cycle
- Blob 3: white, 160px, 9s cycle

Each blob drifts between two positions using sinusoidal easing. In web: use CSS animations or `requestAnimationFrame` with `transform: translate()`.

### `SwipeCard`
Single card with pan-to-swipe gesture:
- PanResponder in RN → pointer events (`onPointerDown/Move/Up`) or a lightweight gesture lib
- Swipe threshold: 30% of viewport width
- Rotation: interpolated from horizontal position (-8° to +8°)
- Labels: "ACQUIRED" (right, yellow) and "NOTED" (left, gray) — fade in based on swipe distance
- Footer: `< swipe >` hint text + share button (↑)
- Key terms: tappable chips below body text → opens popup with term + explanation

### `GlassCard`
Simple container: dark semi-transparent bg, rounded corners, 1px border. Just a styled `<div>`.

### `XPBurst`
Floating "+X XP" text that animates upward and fades out. Appears at screen center.
- Start: `opacity: 1, translateY: 0`
- End: `opacity: 0, translateY: -80px` over ~1s
- Self-removes via `onDone` callback

### `AchievementToast`
Slide-up notification showing unlocked achievement:
- Slides up from bottom, holds 2s, slides down
- Shows: icon, name, desc
- Self-removes via `onDone` callback
