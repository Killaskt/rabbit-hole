# React Native → Capacitor Migration Playbook

A repeatable, prompt-ready playbook for converting any React Native / Expo app to Capacitor + Vite + React with GitHub Actions + Codemagic CI/CD to TestFlight.

This is the exact process used to migrate Rabbit Hole. Copy the prompts below verbatim into a new conversation.

---

## Overview

The migration runs in four phases, each with a specific Copilot prompt:

| Phase | What happens | Who does it |
|---|---|---|
| 0 | Preserve the Expo app + scaffold docs | You + Copilot (1 agent) |
| 1 | Scaffold the Capacitor project | Copilot (1 agent) |
| 2 | Rewrite the app (lib, components, screens) | 3 parallel subagents |
| 3 | CI/CD setup (GitHub Actions + Codemagic) | Copilot (1 agent) |

Total wall time: ~2–3 hours. Most of it is Phase 2 (parallel) and Phase 3 (Apple setup is manual).

---

## Before You Start — Manual Checklist

Do these before opening Copilot:

- [ ] Open the Expo project in VS Code
- [ ] Know your target bundle ID: `com.yourcompany.appname`
- [ ] Have Apple Developer account access
- [ ] Have App Store Connect access
- [ ] Have Codemagic account (free tier is fine)
- [ ] Have a password manager ready for private keys

---

## Phase 0 — Preserve + Document

### Step 0a: Preserve the Expo branch

Run these commands in your terminal first (before anything else):

```bash
git checkout -b expo/preserve
git push origin expo/preserve
git checkout -b capacitor/rebuild
```

This saves the original Expo app permanently on `expo/preserve`. All migration work happens on `capacitor/rebuild`.

### Step 0b: Documentation prompt

Open Copilot chat and send this prompt:

```
I have a React Native / Expo app and I want to migrate it to Capacitor + Vite + React.
Before touching any code, I need you to extract the app's knowledge into documentation files
that subagents can use to rebuild it from scratch.

Please read every file in this workspace, then create these docs in a /docs folder:

1. OVERVIEW.md — What the app does, the core user loop, the full file structure,
   and what each file's role is.

2. DATA_MODELS.md — Every TypeScript type and interface in the codebase.
   For each: full name, all fields with types, which are optional, and
   what other types they reference.

3. SCREENS_UI.md — Every screen. For each: what it shows, what data it reads,
   what the user can do, what it navigates to, and any key state it manages.

4. STATE_MANAGEMENT.md — How state works end-to-end. What's in global state,
   what's persisted to storage, how actions/reducers/context are shaped,
   and what the initial state looks like.

5. AI_INTEGRATION.md (if applicable) — Any AI/API calls: the full prompt text,
   request shape, response schema, error handling, and which models/providers are used.

6. THEME_UTILS.md — All colors (with hex values), spacing constants, font names,
   all helper/utility functions, and any date or formatting utilities.

Be thorough. These docs are the only source of truth for rebuild agents.
Do not start any migration yet — documentation only.
```

---

## Phase 1 — Scaffold the Capacitor Project

After Phase 0 docs are complete, send this prompt:

```
Now scaffold the Capacitor + Vite + React project. Do NOT port any app logic yet —
just the infrastructure files.

1. Replace package.json with one containing:
   - react 19, react-dom 19
   - vite 8 with @vitejs/plugin-react
   - typescript 5 strict
   - @capacitor/core, @capacitor/cli, @capacitor/ios (latest)
   - @capacitor/preferences (replaces AsyncStorage)
   - @capacitor/haptics
   - Keep any AI SDK / API packages from the original

2. Create capacitor.config.ts:
   - appId: com.YOURCOMPANY.YOURAPP  ← replace this
   - appName: "Your App Name"        ← replace this
   - webDir: 'dist'
   - server.androidScheme: 'https'

3. Create vite.config.ts with:
   - @vitejs/plugin-react
   - path alias: '@' → './src'

4. Create tsconfig.json with:
   - strict: true
   - paths: { "@/*": ["./src/*"] }
   - target: ES2020
   - jsx: react-jsx (no import React needed)

5. Create index.html with:
   <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">

6. Create src/main.tsx, src/App.tsx (minimal shell — just renders "loading"),
   src/styles/globals.css with:
   - * { box-sizing: border-box; }
   - html, body, #root { height: 100%; background: #000; overflow: hidden; -webkit-tap-highlight-color: transparent; }
   - button { -webkit-appearance: none; appearance: none; -webkit-tap-highlight-color: transparent; }
   - ::-webkit-scrollbar { display: none; }

7. Create .gitignore that excludes: node_modules, dist, ios/, android/, *.pem

8. Add AGENTS.md, CODEBASE.md, KNOWN_ISSUES.md, DECISIONS.md as empty stubs.

Run npm install and npm run build to confirm the scaffold compiles.
```

---

## Phase 2 — Parallel Subagent Rewrite

This phase uses 3 parallel subagents. Send this single prompt to kick off all three:

```
The Capacitor scaffold is ready. Now rewrite the full app using 3 parallel subagents.
They run concurrently — assign each one a separate file set with no overlap.

Read AGENTS.md, CODEBASE.md, KNOWN_ISSUES.md, and DECISIONS.md before starting.
After each subagent completes, run `npx tsc --noEmit` before starting the next phase.

━━ SUBAGENT 1: Foundation ━━
Build these files from the docs in /docs:

- src/types/lesson.ts (or equivalent) — from DATA_MODELS.md
- src/lib/storage.ts — all Capacitor Preferences storage ops from STATE_MANAGEMENT.md.
  Replace every AsyncStorage call with Preferences.get/set/remove.
  Keep all existing function signatures.
- src/lib/gameState.ts (or equivalent state managers) — from STATE_MANAGEMENT.md.
  Pure in-memory state module. No React yet.
- src/lib/sessionStore.ts — ephemeral in-flight session state.
- src/lib/textSettings.tsx — accessibility/display settings context if present.
- src/lib/nav.ts — navigation context:
  createContext + useNav hook + ScreenName union type.
  No react-navigation. Just a plain context providing { navigate, replace, back, params }.

━━ SUBAGENT 2: AI + Components ━━
Build these files from the docs in /docs:

- src/lib/claude.ts (or api equivalent) — from AI_INTEGRATION.md.
  Use CapacitorHttp.request() for ALL external API calls (not fetch()).
  fetch() hits CORS in Capacitor's WKWebView; CapacitorHttp bypasses it.
- src/components/LiquidBackground.tsx — animated CSS background (pure CSS animations, no deps)
- src/components/GlassCard.tsx — glass-morphism card component
- src/components/SwipeCard.tsx — horizontally swipeable card deck using touch events
- src/components/XPBurst.tsx — XP gain animation overlay
- src/components/AchievementToast.tsx — achievement notification toast

━━ SUBAGENT 3: Screens (first half) ━━
Build these from SCREENS_UI.md and STATE_MANAGEMENT.md.
Import types from @/types/, state from @/lib/, components from @/components/.
Use inline styles only (no CSS modules, no styled-components, no Tailwind).
Use a monospace font stack for all text.

Build:
- src/screens/HomeScreen.tsx
- src/screens/VaultScreen.tsx
- src/screens/NewSessionScreen.tsx
- src/screens/SettingsScreen.tsx
- src/screens/ResultsScreen.tsx

After all 3 subagents complete, run ONE MORE subagent:

━━ SUBAGENT 4: Screens (second half) + App shell ━━
- src/screens/SessionScreen.tsx
- src/screens/QuizScreen.tsx
- src/screens/DrillScreen.tsx
- src/screens/ReviewSessionScreen.tsx

Then wire src/App.tsx as a navigation shell:
- Single useState history stack: [{ screen: ScreenName, params: Record<string,string> }]
- NavContext provides: navigate (push), replace, back, params
- Bottom tab bar for the two root screens (home + vault equivalents):
  - Use boxShadow: 'inset 0 2px 0 #efff00' for the active tab indicator (not borderTop — it conflicts with border:none)
  - minHeight: 56 on the tab bar container
  - Tab bar only shows on root screens (home/vault)
- Swipe-back gesture on the root div:
  - Only start tracking if touch begins within 30px of left edge
  - Fire back() if horizontal swipe > 80px with < 60px vertical drift
  - Disable on screens that own horizontal swipe (session/quiz/drill) and on tab root screens

Validation: `npx tsc --noEmit && npm run build` must pass with 0 errors.
```

---

## Phase 3 — CI/CD Setup

### Step 3a: Manual Apple setup (do this yourself, ~20 minutes)

1. **Register Bundle ID** at developer.apple.com → Certificates, Identifiers & Profiles → Identifiers → +
   - Type: App IDs → App
   - Bundle ID: explicit, e.g. `com.yourcompany.appname`

2. **Create App Store Connect record** at appstoreconnect.apple.com → My Apps → + → New App
   - Platform: iOS, select the bundle ID you just registered

3. **Create API Key** at appstoreconnect.apple.com/access/integrations/api
   - Role: Admin
   - Download the `.p8` file (once only), note the **Key ID** and **Issuer ID**

4. **Generate certificate private key** (run locally):
   ```bash
   openssl genrsa 2048 > certificate_private_key.pem
   ```
   Save this in your password manager. Add to `.gitignore` immediately.

5. **Fill in TestFlight test info** at App Store Connect → TestFlight → Test Info:
   - Beta App Information: Feedback Email
   - Beta App Review Information: First Name, Last Name, Phone, Email
   (Required before any external TestFlight submission)

### Step 3b: Codemagic setup (do this yourself, ~10 minutes)

1. Sign up at codemagic.io with GitHub OAuth
2. Add Application → select your repo → YAML-based
3. Note your **App ID** from the URL: `codemagic.io/app/XXXXXXXXXXXXXXXX/builds`
4. Get your **API Token**: avatar → User settings → Integrations → Codemagic API → Show
5. Create variable group named **`ShazamApps`** with 4 variables (all Secure):
   - `APP_STORE_CONNECT_KEY_IDENTIFIER` — Key ID (NOT `KEY_ID`, must be full name)
   - `APP_STORE_CONNECT_PRIVATE_KEY` — full `.p8` contents including `-----BEGIN PRIVATE KEY-----`
   - `APP_STORE_CONNECT_ISSUER_ID` — Issuer ID UUID
   - `CERTIFICATE_PRIVATE_KEY` — full contents of `certificate_private_key.pem`

6. Add GitHub secrets (repo → Settings → Secrets and variables → Actions):
   - `CODEMAGIC_API_TOKEN`
   - `CODEMAGIC_APP_ID`

### Step 3c: CI/CD files prompt

```
Set up GitHub Actions + Codemagic CI/CD for this Capacitor iOS app.

Bundle ID: com.YOURCOMPANY.YOURAPP   ← replace this
Codemagic variable group name: ShazamApps

Create these three files:

1. .github/workflows/validate.yml
   - Triggers: push to any branch, pull_request to any branch
   - Runs on ubuntu-latest
   - Steps: checkout → setup-node 22 → npm ci → npm run build
   - permissions: contents: read

2. .github/workflows/preview.yml
   - Triggers: pull_request targeting master (or main)
   - Calls Codemagic API to trigger 'ios-feature-preview' workflow
   - Branch: GITHUB_HEAD_REF (the PR branch, not master)
   - No polling — just fire and print the build URL

3. .github/workflows/deploy.yml
   - Triggers: push to master (or main)
   - Two jobs: validate (same as validate.yml), then trigger-codemagic (needs: validate)
   - trigger-codemagic: calls Codemagic API to start 'ios-testflight' workflow
   - Polls build status every 30s up to 60 minutes, exits 0 on 'finished', exits 1 on 'failed'/'canceled'/'timeout'
   - permissions: {} on trigger-codemagic job (no permissions needed)

4. codemagic.yaml with two workflows:

ios-testflight:
  - instance_type: mac_mini_m2
  - triggering: events: []  (triggered by GitHub Actions only)
  - environment: groups: [ShazamApps], node: 22, xcode: latest
  - vars: BUNDLE_ID, XCODE_PROJECT: ios/App/App.xcodeproj, XCODE_SCHEME: App
  - scripts (in order):
    a. npm ci
    b. npm run build
    c. cap add ios (guarded: if [ ! -d "ios" ])
    d. npx cap sync ios
    e. Force bundle ID: cd ios/App && sed -i '' "s/PRODUCT_BUNDLE_IDENTIFIER = .*/PRODUCT_BUNDLE_IDENTIFIER = $BUNDLE_ID;/g" App.xcodeproj/project.pbxproj
    f. Set export compliance: PlistBuddy to add ITSAppUsesNonExemptEncryption=false to ios/App/App/Info.plist
    g. Set build number: agvtool new-version -all $(date +%s)
    h. keychain initialize
    i. app-store-connect fetch-signing-files "$BUNDLE_ID" --type IOS_APP_STORE --create
    j. keychain add-certificates
    k. xcode-project use-profiles
    l. xcode-project build-ipa --project "$XCODE_PROJECT" --scheme "$XCODE_SCHEME"
  - artifacts: build/ios/ipa/*.ipa, /tmp/xcodebuild_logs/*.log
  - publishing: app_store_connect with submit_to_testflight: true, expire_build_submitted_for_review: true

ios-feature-preview:
  - Same as ios-testflight but:
    - triggering: events: []
    - No publishing block (builds IPA only, no TestFlight submit)

Key notes encoded in the yaml:
- NEVER use --workspace (Capacitor v6+ is SPM, no .xcworkspace exists)
- NEVER add pod install (no Podfile)
- Force bundle ID with sed BEFORE use-profiles runs (cap add ios generates a wrong default)
- Use xcode-project use-profiles (not raw xcodebuild) — matches the proven pattern
```

---

## Phase 4 — Merge

Once CI is green and you've tested the TestFlight build:

```bash
git checkout master
# Open a PR from capacitor/rebuild → master
# Review it, then merge
git pull origin master
```

The original Expo app remains permanently on `expo/preserve`.

---

## Critical gotchas (learn from Rabbit Hole)

### Capacitor + iOS specifics
- **No `.xcworkspace`** — Capacitor v6+ uses SPM. Never use `--workspace`. Project is always `ios/App/App.xcodeproj`.
- **Bundle ID force step is mandatory** — `cap add ios` generates a wrong default bundle ID every time. The `sed` step in codemagic.yaml is not optional.
- **`fetch()` fails in WKWebView** — Use `CapacitorHttp.request()` for every external API call. Regular `fetch()` hits CORS enforcement in Capacitor's native shell.
- **iOS zoom** — Add `maximum-scale=1.0, user-scalable=no` to the viewport meta or iOS will zoom on double-tap.
- **Button styles on iOS** — Add `-webkit-appearance: none; appearance: none` to the global `button` rule or iOS applies system styling that overrides your styles on first render.

### App Store Connect
- **TestFlight test info is required once** — Fill in Beta App Review contact info before first submission or the build will be rejected post-upload.
- **Export compliance** — Always add `ITSAppUsesNonExemptEncryption = false` to `Info.plist`. Automate it in codemagic.yaml with PlistBuddy.
- **API key variable name is exact** — Must be `APP_STORE_CONNECT_KEY_IDENTIFIER`, not `KEY_ID`.

### Navigation
- **No react-navigation** — A plain `useState` history stack with NavContext is sufficient and removes 15MB of deps.
- **Tab bar indicator** — Use `boxShadow: 'inset 0 2px 0 #color'` for the active tab indicator. `borderTop` + `border: none` conflict and produce a 1px-tall button.
- **Swipe-back** — Start tracking only when touch begins within 30px of the left edge. Disable on screens that own horizontal swipe (session/quiz/drill card swiping).
