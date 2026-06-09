# AGENTS.md — Rabbit Hole Capacitor Migration

## Source of Truth Docs

Before writing any code, read in this order:
1. `AGENTS.md` (this file) — roles, build order, rules
2. `OVERVIEW.md` — what the app is, core loop, navigation, file map
3. `DATA_MODELS.md` — all TypeScript interfaces
4. Then read the specific domain doc for your task:

| Task | Read |
|---|---|
| Types + storage | `DATA_MODELS.md`, `STATE_MANAGEMENT.md` |
| Screens & components | `SCREENS_UI.md` |
| AI integration | `AI_INTEGRATION.md` |
| Design tokens, XP/level system | `THEME_UTILS.md` |
| iOS CI/CD | `CODEMAGIC_SETUP.md` |
| Migration methodology | `RN_TO_CAPACITOR_GUIDE.md` |

---

## Target Stack

- **Vite + React 19 + TypeScript** (strict mode)
- **Capacitor 7** for iOS wrapping
- **CSS Modules** for component styles — no external CSS framework
- **No routing library** — screen state managed in `App.tsx` via `useState`
- **`@capacitor/preferences`** for all persistent storage (replaces AsyncStorage + SecureStore)
- **Direct fetch** to Anthropic/OpenAI APIs (no SDK)
- **No Redux / Zustand** — one `GameState` module + in-memory `sessionStore`

---

## Target Source Structure

```
src/
  types/
    lesson.ts             — port as-is from RN (KeyTerm, LessonCard, LessonOutput, LessonInput,
                            SessionRecord, PausedSession, QuizQuestion)
  lib/
    storage.ts            — rewrite: AsyncStorage/SecureStore → @capacitor/preferences
    gameState.ts          — port with minor edits (same logic, no RN imports)
    sessionStore.ts       — port as-is (pure in-memory, no RN deps)
    claude.ts             — port with CORS fix for fetchOGTags (see AI_INTEGRATION.md)
    textSettings.tsx      — rewrite: Context + hook, CSS var instead of RN Platform font
  components/
    LiquidBackground.tsx  — rewrite: RN LinearGradient → CSS gradient + canvas blur
    SwipeCard.tsx         — rewrite: RN Animated → CSS transform + pointer events
    GlassCard.tsx         — rewrite: View/StyleSheet → div + CSS module
    XPBurst.tsx           — rewrite: RN Animated → CSS keyframe animation
    AchievementToast.tsx  — rewrite: RN Animated → CSS keyframe animation
    *.module.css          — co-located CSS modules
  screens/
    HomeScreen.tsx        — port from app/(tabs)/index.tsx
    VaultScreen.tsx       — port from app/(tabs)/vault.tsx
    NewSessionScreen.tsx  — port from app/new-session.tsx
    SessionScreen.tsx     — port from app/session.tsx
    QuizScreen.tsx        — port from app/quiz.tsx
    ResultsScreen.tsx     — port from app/results.tsx
    ReviewSessionScreen.tsx — port from app/review-session.tsx
    DrillScreen.tsx       — port from app/drill.tsx
    SettingsScreen.tsx    — port from app/settings.tsx
    *.module.css
  App.tsx                 — tab shell + screen router (useState, no react-router)
  main.tsx                — entry point
```

---

## Subagent Build Order

### Phase 1 — Foundation (run in parallel, no dependencies)

| Agent | Task | Reads | Produces |
|-------|------|-------|----------|
| `port-types` | Port `src/types/lesson.ts` exactly | `DATA_MODELS.md` | `src/types/lesson.ts` |
| `port-storage` | Rewrite `src/lib/storage.ts` for Capacitor Preferences | `STATE_MANAGEMENT.md` | `src/lib/storage.ts` |
| `port-game-state` | Port `src/lib/gameState.ts` (no RN imports) | `STATE_MANAGEMENT.md`, `THEME_UTILS.md` | `src/lib/gameState.ts` |
| `port-session-store` | Port `src/lib/sessionStore.ts` as-is | `STATE_MANAGEMENT.md` | `src/lib/sessionStore.ts` |
| `port-ai` | Port `src/lib/claude.ts`, fix CORS for OG fetching | `AI_INTEGRATION.md` | `src/lib/claude.ts` |
| `port-text-settings` | Port `src/lib/textSettings.tsx`, CSS vars | `THEME_UTILS.md` | `src/lib/textSettings.tsx` |

**Validation gate:** `npx tsc --noEmit` must pass clean before Phase 2.

### Phase 2 — Components (depends on Phase 1)

| Agent | Task | Reads | Produces |
|-------|------|-------|----------|
| `build-primitives` | Build GlassCard, LiquidBackground | `SCREENS_UI.md`, `THEME_UTILS.md` | `src/components/GlassCard.*`, `LiquidBackground.*` |
| `build-interactive` | Build SwipeCard, XPBurst, AchievementToast | `SCREENS_UI.md` | `src/components/SwipeCard.*`, `XPBurst.*`, `AchievementToast.*` |

**Validation gate:** `npx tsc --noEmit` must pass clean before Phase 3.

### Phase 3 — Screens (depends on Phase 2, can run in parallel by group)

| Agent | Task | Reads | Produces |
|-------|------|-------|----------|
| `build-screens-home-vault` | HomeScreen + VaultScreen + App.tsx tab shell | `SCREENS_UI.md` | `HomeScreen.*`, `VaultScreen.*`, `App.tsx` |
| `build-screens-session-flow` | NewSessionScreen, SessionScreen, QuizScreen, ResultsScreen | `SCREENS_UI.md`, `AI_INTEGRATION.md` | four screen files |
| `build-screens-review-drill-settings` | ReviewSessionScreen, DrillScreen, SettingsScreen | `SCREENS_UI.md` | three screen files |

**Validation gate:** `npm run build` must succeed.

### Phase 4 — iOS + CI/CD (depends on Phase 3)

| Agent | Task | Reads | Produces |
|-------|------|-------|----------|
| `setup-capacitor` | Add Capacitor, init iOS project | `RN_TO_CAPACITOR_GUIDE.md` | `capacitor.config.ts`, `ios/` |
| `setup-ci` | Create `codemagic.yaml` + GitHub Actions PR checks | `CODEMAGIC_SETUP.md`, `RN_TO_CAPACITOR_GUIDE.md` | `codemagic.yaml`, `.github/workflows/pr-checks.yml` |

---

## Critical Migration Notes

1. **CORS for OG fetching** — `fetchOGTags` in RN does a direct `fetch(url)` from native code. In a web/Capacitor context this will fail with CORS errors on most sites. See `AI_INTEGRATION.md` for the fix.

2. **SecureStore → Capacitor Preferences** — RN used `expo-secure-store` for API keys. Use `@capacitor/preferences` with a `secure_` key prefix. See `STATE_MANAGEMENT.md`.

3. **Haptics** — `expo-haptics` → `@capacitor/haptics`. API is nearly identical.

4. **Animations** — `Animated` API → CSS transitions + keyframes. All animations are simple (flash, slide, fade) and translate directly to CSS.

5. **Font family** — `Platform.select({ ios: 'Courier New', android: 'monospace' })` → CSS `font-family: 'Courier New', Courier, monospace`.

6. **No React import** — React 19 with `react-jsx` transform. Do not `import React from 'react'`.

7. **Tab navigation** — No `expo-router`. Screen state is `useState<ScreenName>` in `App.tsx`.

---

## Rules

- All types from `src/types/lesson.ts` — no local type redeclarations
- All colors/spacing from `THEME_UTILS.md` constants — no hardcoded hex in component files
- CSS goes in `.module.css` files co-located with their component/screen
- No `any` types
- All storage calls are `async/await`
- API keys are never logged

---

## Git Workflow

1. Branch off `main` → `capacitor/rebuild`
2. All work goes on `capacitor/rebuild`
3. When build + typecheck pass and iOS runs: open PR `capacitor/rebuild → main`
4. PR replaces the entire RN codebase — full swap, not a merge
5. **Never push to `main` directly. Never merge without user approval.**
6. Before every push: `npm run typecheck && npm run build` must pass
