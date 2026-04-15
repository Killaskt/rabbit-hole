# OVERVIEW.md — Rabbit Hole

## What It Is

Rabbit Hole is an AI-powered micro-learning app. You drop a URL or a thought, pick a learning mode, and the app generates a swipeable lesson featuring 3–6 cards followed by a 2-question quiz. Completing sessions earns XP, levels up your profile, and builds a persistent history you can review or be tested on later.

**Target platform:** iOS (via Capacitor + Vite). Currently built in React Native / Expo — migrating to Capacitor.

**App ID:** `rabbit-hole` (will need bundle ID assigned, e.g. `com.yourname.rabbithole`)

---

## Core User Loop

1. **Home tab** — tap "ENTER THE HOLE"
2. **New Session screen** — choose mode (SKIM or DEEP DIVE), source type (URL or THOUGHT), paste input + optional intent
3. AI generates lesson → **Session screen** — swipe cards left ("noted") or right ("acquired")
4. **Quiz screen** — answer 2 multiple-choice questions, earn +25 XP each
5. **Results screen** — see XP breakdown, level-up if applicable, achievement toasts
6. Back to Home — session saved to history, stats updated

**Optional paths:**
- Resume a paused session (saved if you exit mid-session)
- **Recall / Drill** — pick 5 random quiz questions from past deep-dive sessions, re-test retention
- **Review** — tap any past session to re-read its cards and quiz

---

## Navigation Structure

No router library. In the Capacitor rebuild, screen state is a `useState<ScreenName>` in `App.tsx` passed as context or props.

### Tabs (always visible)
| Tab | Screen | Route (RN) |
|-----|--------|------------|
| HOME | `HomeScreen` | `app/(tabs)/index.tsx` |
| VAULT | `VaultScreen` | `app/(tabs)/vault.tsx` |

### Stack screens (full-screen push)
| Screen | Trigger | RN file |
|--------|---------|---------|
| `NewSessionScreen` | "ENTER THE HOLE" button | `app/new-session.tsx` |
| `SessionScreen` | After AI generates lesson | `app/session.tsx` |
| `QuizScreen` | After last card is swiped | `app/quiz.tsx` |
| `ResultsScreen` | After last quiz question | `app/results.tsx` |
| `ReviewSessionScreen` | Tap a past session | `app/review-session.tsx` |
| `DrillScreen` | "RECALL" button in Vault | `app/drill.tsx` |
| `SettingsScreen` | ⚙ icon on Home | `app/settings.tsx` |

---

## File Map (React Native source)

```
app/
  _layout.tsx           — root stack + TextSettingsProvider + initGameState
  (tabs)/
    _layout.tsx         — tab bar (HOME, VAULT), monospace tab labels
    index.tsx           — HomeScreen
    vault.tsx           — VaultScreen
  new-session.tsx       — NewSessionScreen
  session.tsx           — SessionScreen (SwipeCard deck)
  quiz.tsx              — QuizScreen
  results.tsx           — ResultsScreen
  review-session.tsx    — ReviewSessionScreen
  drill.tsx             — DrillScreen (Recall)
  settings.tsx          — SettingsScreen

components/
  LiquidBackground.tsx  — animated dark gradient background (always on)
  SwipeCard.tsx         — single swipeable card with gesture + spring animation
  GlassCard.tsx         — static frosted-glass card container
  XPBurst.tsx           — floating "+25 XP" animation (appears on correct answer)
  AchievementToast.tsx  — slide-up toast for newly unlocked achievements

lib/
  claude.ts             — AI calls (Anthropic + OpenAI adapters) + OG tag scraper
  gameState.ts          — XP, leveling, streaks, achievements (in-memory singleton + AsyncStorage)
  sessionStore.ts       — in-memory store passing lesson data between screens
  storage.ts            — AsyncStorage wrappers + SecureStore for API keys + model prefs
  textSettings.tsx      — accessibility text scale + bold context

types/
  lesson.ts             — all TypeScript interfaces

docs/                   — this folder
assets/                 — icons/images (standard Expo)
```

---

## Design Language

- **Color palette:** Pure black background (`#000`), white text, accent `#efff00` (neon yellow)
- **Font:** Monospace throughout — `Courier New` on iOS, `monospace` on Android/web
- `letterSpacing` heavy — labels use 1.5–3px, creating a terminal/hacker aesthetic
- Dark glassmorphism cards: `rgba(18,18,18,0.90)` with `rgba(255,255,255,0.10)` borders
- No images — all decoration is Unicode symbols (`◎ ◆ ◌ ◈ ★ ▼ ▲`)
- Accent yellow (`#efff00`) used for: active state, XP numbers, pinned sessions, CTA buttons

---

## Key Dependencies (current RN)

| Package | Purpose |
|---------|---------|
| `expo-router` | File-based navigation |
| `react-native-gesture-handler` | Swipe gesture on cards |
| `react-native-reanimated` | Spring animations on SwipeCard |
| `expo-haptics` | Haptic feedback |
| `expo-linear-gradient` | LiquidBackground gradient |
| `expo-blur` | Blur effect in LiquidBackground |
| `@react-native-async-storage/async-storage` | Game state + session history |
| `expo-secure-store` | API key storage |
| `expo-constants` | App config access |
| `react-native-svg` | SVG support |

## Target Dependencies (Capacitor)

| Package | Purpose | Replaces |
|---------|---------|---------|
| `@capacitor/core` + `@capacitor/ios` | iOS wrapping | expo |
| `@capacitor/preferences` | All persistent storage | AsyncStorage + SecureStore |
| `@capacitor/haptics` | Haptic feedback | expo-haptics |
| `vite` | Build tool | metro |
| `react-router` (optional) | Not needed — use useState | expo-router |

Avoid: `framer-motion`, `react-spring`, heavy animation libraries. CSS keyframes + transitions are sufficient for this app's animations.
