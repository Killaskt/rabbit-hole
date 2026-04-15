# React Native → Capacitor Conversion Guide

How to break down and rebuild any React Native / Expo app as a Capacitor + Vite + React app using subagents.

---

## Phase 0: Document the Source App First

Before touching any code, extract the knowledge from the RN codebase into domain-specific docs. These become the source of truth for build agents and survive the migration.

**Create one doc per domain:**

| Doc | What Goes In It |
|-----|----------------|
| `OVERVIEW.md` | What the app is, core loop, tech stack, file structure |
| `DATA_MODELS.md` | Every TypeScript interface/type — fields, types, optionals, relationships |
| `SCREENS_UI.md` | Every screen: purpose, what data it reads/writes, key interactions |
| `STATE_MANAGEMENT.md` | How state works: actions, reducers, context shape, what's persisted |
| `AI_PARSING.md` | Any AI/API integration: prompts, request shape, response shape, error handling |
| `THEME_UTILS.md` | Colors, spacing, fonts, utility functions, date helpers |

**Why this works:** RN and Capacitor are different enough that you can't port file-by-file. But the business logic, types, and UI contracts are identical. These docs let subagents rebuild from intent, not syntax.

---

## Phase 1: Scaffold the Capacitor Project

```bash
npm create vite@latest app-name -- --template react-ts
cd app-name
npm install
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/preferences
npx cap init "App Name" com.yourcompany.appname --web-dir dist
npx cap add ios
```

**Key config changes from defaults:**

1. **`vite.config.ts`** — add path alias so `@/` resolves to `src/`:
```ts
import { fileURLToPath, URL } from 'node:url'
resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } }
```
Also add `tsconfig.json` paths (both are required):
```json
"paths": { "@/*": ["./src/*"] }
```

2. **`tsconfig.json`** — use strict mode: `"strict": true`

3. **Storage:** Replace `AsyncStorage` with `@capacitor/preferences`:
```ts
// AsyncStorage.setItem(key, val) → 
await Preferences.set({ key, value: JSON.stringify(data) })
// AsyncStorage.getItem(key) → 
const { value } = await Preferences.get({ key })
```

4. **No React import needed** — React 19 + `react-jsx` transform. Using `import React` with `noUnusedLocals: true` will error.

---

## Phase 2: Subagent Build Order

Use subagents in this order. Each phase depends on the previous.

### Phase 2 — Foundation (no dependencies)
- Port `src/types/index.ts` from DATA_MODELS.md
- Port `src/utils/helpers.ts` from THEME_UTILS.md
- Port `src/theme/index.ts` from THEME_UTILS.md
- Port `src/storage/store.ts` from STATE_MANAGEMENT.md (using Capacitor Preferences)
- Port `src/api/` from AI_PARSING.md (replace fetch calls 1:1, no SDK needed)

### Phase 3 — State (depends on Phase 2)
- Build `src/context/AppContext.tsx` from STATE_MANAGEMENT.md
- Pattern: single `useReducer` + `createContext` + `AppProvider` + `useAppContext()` hook
- Auto-save with `useEffect` per slice, gated by `hasLoaded` ref

### Phase 4 — UI (depends on Phase 3)
- Build all components from SCREENS_UI.md (these are leaf nodes, no screen deps)
- Build all screens from SCREENS_UI.md
- Build `src/App.tsx` navigation shell (bottom tabs, no react-navigation needed — just state)

> **Validation gate between each phase:** `npx tsc --noEmit` must pass clean before the next phase starts.

---

## Phase 3: iOS CI/CD via Codemagic

Once the app builds locally, set up Codemagic for automated TestFlight deploys.

### Prerequisites (do before first build)
- [ ] Bundle ID registered at developer.apple.com → Identifiers (explicit, not wildcard)
- [ ] App record in App Store Connect with matching bundle ID
- [ ] App Store Connect API key with **Admin** role → download `.p8`, note Key ID and Issuer ID
- [ ] RSA private key for certificate signing (generate once, save in password manager):
  ```bash
  openssl genrsa 2048 > certificate_private_key.pem
  # add to .gitignore immediately
  ```

### Codemagic environment variables (in a named group, e.g. `ShazamApps`)
| Variable | Value |
|----------|-------|
| `APP_STORE_CONNECT_KEY_IDENTIFIER` | Key ID from App Store Connect (NOT `KEY_ID` — must be `KEY_IDENTIFIER`) |
| `APP_STORE_CONNECT_PRIVATE_KEY` | Full `.p8` contents including `-----BEGIN/END PRIVATE KEY-----` |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID UUID |
| `CERTIFICATE_PRIVATE_KEY` | Full RSA key contents from openssl genrsa |

### Working `codemagic.yaml` for Capacitor + SPM (no CocoaPods)
```yaml
workflows:
  ios-testflight:
    name: iOS TestFlight
    max_build_duration: 60
    instance_type: mac_mini_m2
    triggering:
      events: [push]
      branch_patterns: [{pattern: main, include: true}]
    environment:
      groups:
        - ShazamApps
      node: 22.14.0
      xcode: latest
      vars:
        BUNDLE_ID: com.yourcompany.appname
        XCODE_PROJECT: ios/App/App.xcodeproj
        XCODE_SCHEME: App
    scripts:
      - name: Install dependencies
        script: npm install
      - name: Build web app
        script: npm run build
      - name: Sync Capacitor
        script: npx cap sync ios
      - name: Set up keychain
        script: keychain initialize
      - name: Fetch signing files
        script: |
          app-store-connect fetch-signing-files "$BUNDLE_ID" \
            --type IOS_APP_STORE \
            --create
      - name: Add certificates to keychain
        script: keychain add-certificates
      - name: Apply signing to Xcode project
        script: xcode-project use-profiles
      - name: Build IPA
        script: |
          xcode-project build-ipa \
            --project "$XCODE_PROJECT" \
            --scheme "$XCODE_SCHEME"
    artifacts:
      - build/ios/ipa/*.ipa
      - /tmp/xcodebuild_logs/*.log
    publishing:
      app_store_connect:
        api_key: $APP_STORE_CONNECT_PRIVATE_KEY
        key_id: $APP_STORE_CONNECT_KEY_IDENTIFIER
        issuer_id: $APP_STORE_CONNECT_ISSUER_ID
        submit_to_testflight: true
        expire_build_submitted_for_review: true
```

**Important:** Capacitor v7+ uses Swift Package Manager (SPM) — there is no Podfile. Do NOT add a `pod install` step.

**Export compliance:** Add to `ios/App/App/Info.plist` to skip the prompt on every build:
```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

---

## Phase 4: PR Workflow

```yaml
# .github/workflows/pr-checks.yml
name: PR Checks
on:
  pull_request:
    branches: [main]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run build
```

Then in GitHub → Settings → Branches → Add ruleset for `main`:
- Require pull request before merging
- Require status checks: `Typecheck & Build`
- Block direct pushes

**Note:** The status check only appears in the search after the workflow has run once. Create a dummy PR to trigger it first.

---

## Common Errors & Fixes

See `.agent/KNOWN_ISSUES.md` for the full list. Key ones:

| Error | Fix |
|-------|-----|
| `@/` not resolving in browser | Add `resolve.alias` to vite.config.ts (tsconfig paths alone don't work at Vite runtime) |
| `'React' is declared but never read` | Remove `import React` — not needed with React 19 + react-jsx transform |
| `app_store_connect: extra fields not permitted` | That block belongs only under `publishing`, not `environment` |
| `No matching profiles found` | `ios_signing` declarative block needs OAuth integration. Use explicit `fetch-signing-files` script instead |
| `Missing value KEY_IDENTIFIER` | Variable must be named `APP_STORE_CONNECT_KEY_IDENTIFIER`, not `KEY_ID` |
| `Cannot save Signing Certificates without certificate private key` | Add `CERTIFICATE_PRIVATE_KEY` env var (RSA key generated with `openssl genrsa 2048`) |
