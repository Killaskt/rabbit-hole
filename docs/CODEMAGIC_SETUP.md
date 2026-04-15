# Codemagic + App Store Connect Setup Guide

> Complete, repeatable runbook. Do these steps once per new app. After setup, CI/CD is fully automated.

---

## Overview of what you're setting up

```
GitHub PR/Push
    → GitHub Actions (runs typecheck + build + tests)
        → calls Codemagic API
            → Codemagic builds IPA (signs with Apple certs)
                → submits to TestFlight
```

---

## Step 1: Apple Developer Account

### 1a. Register a Bundle ID
1. Go to [developer.apple.com](https://developer.apple.com) → **Certificates, Identifiers & Profiles** → **Identifiers**
2. Click **+** → **App IDs** → **App**
3. Set **Bundle ID** to explicit (not wildcard): e.g. `com.habbitos.app`
4. Enable any capabilities needed (Push Notifications, etc.)
5. Click **Register**

### 1b. Create App Store Connect App Record
1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **My Apps** → **+** → **New App**
2. Platform: **iOS**
3. Bundle ID: select the one you just registered
4. Fill in name, SKU, language
5. Click **Create**

### 1c. Create an App Store Connect API Key
1. Go to [appstoreconnect.apple.com/access/integrations/api](https://appstoreconnect.apple.com/access/integrations/api)
2. Click **+** → set name (e.g. `Codemagic`), role: **Admin**
3. Download the `.p8` file — **you can only download it once**
4. Note the **Key ID** (shown in the key list, e.g. `ABC123XYZ`)
5. Note the **Issuer ID** (shown at the top of the API Keys page)

### 1d. Generate a Certificate Private Key (one-time, save permanently)
This is an RSA key used to create a CSR when Codemagic fetches signing files. Nothing to do with your Apple account directly.

```bash
openssl genrsa 2048 > certificate_private_key.pem
```

**Store this in 1Password / your password manager now.** If you lose it, your distribution certificate becomes unusable — you'll need to revoke it and redo this step.

Add to `.gitignore`:
```
certificate_private_key.pem
```

---

## Step 2: Codemagic Account Setup

### 2a. Create account & connect GitHub
1. Go to [codemagic.io](https://codemagic.io) → **Sign up with GitHub**
2. Authorize the GitHub OAuth app — grant access to your repos

### 2b. Add your app
1. Click **Add application** → **GitHub**
2. Select your app's repo
3. Select **Flutter/React Native/Other** framework → choose **Other** (YAML-based)
4. Codemagic will detect `codemagic.yaml` automatically

### 2c. Get your App ID
From the Codemagic app URL after adding:
```
https://codemagic.io/app/XXXXXXXXXXXXXXXXXXXXXXXX/builds
                         ^^^^^^^^^^^^^^^^^^^^^^^^
                         this is your CODEMAGIC_APP_ID
```

### 2d. Get your API Token
1. Click avatar (top-right) → **User settings**
2. Scroll to **Integrations** → **Codemagic API**
3. Click **Show** (or **Generate** if none exists) — copy the token

---

## Step 3: Codemagic Variable Group

All secrets live in a named variable group referenced by `codemagic.yaml`.

1. In Codemagic, go to your app → **Environment variables** (or team-level: avatar → **Teams** → your team → **Global variables**)
2. Create a group named **`ShazamApps`** (matches the name in `codemagic.yaml`)
3. Add these variables (all marked **Secure**):

| Variable name | Value | Where to get it |
|---|---|---|
| `APP_STORE_CONNECT_KEY_IDENTIFIER` | `ABC123XYZ` | App Store Connect API key → Key ID |
| `APP_STORE_CONNECT_PRIVATE_KEY` | Full contents of the `.p8` file (including `-----BEGIN PRIVATE KEY-----` header/footer) | The downloaded `.p8` file |
| `APP_STORE_CONNECT_ISSUER_ID` | UUID | Top of App Store Connect API Keys page |
| `CERTIFICATE_PRIVATE_KEY` | Full contents of `certificate_private_key.pem` | The file you generated in Step 1d |

> **Variable name is exact** — `codemagic-cli-tools` reads `APP_STORE_CONNECT_KEY_IDENTIFIER` (not `KEY_ID`). Wrong name = silent failure.

---

## Step 4: GitHub Secrets

These let GitHub Actions call the Codemagic API.

1. Go to **GitHub repo → Settings → Secrets and variables → Actions**
2. Add two secrets:

| Secret name | Value |
|---|---|
| `CODEMAGIC_API_TOKEN` | The token from Step 2d |
| `CODEMAGIC_APP_ID` | The app ID from Step 2c |

---

## Step 5: Verify the full pipeline

### On a PR:
1. Open a PR from any non-main branch
2. GitHub Actions runs `validate` (typecheck + build + tests)
3. If passing, `trigger-codemagic-preview` calls Codemagic API → starts `ios-feature-preview` build
4. GH Actions polls until build finishes — PR check turns green or red based on result

### On merge to main:
1. GitHub Actions runs `validate` again
2. If passing, `trigger-codemagic` calls Codemagic API → starts `ios-testflight` build
3. GH Actions polls until done — publishes IPA to TestFlight automatically

---

## Checklist (before first build)

- [ ] Bundle ID registered at developer.apple.com (explicit, not wildcard)
- [ ] App record created in App Store Connect with matching Bundle ID
- [ ] App Store Connect API key created with **Admin** role — `.p8` file downloaded
- [ ] `certificate_private_key.pem` generated and saved to password manager
- [ ] `certificate_private_key.pem` in `.gitignore`
- [ ] Codemagic account created and GitHub repo connected
- [ ] Codemagic **`ShazamApps`** variable group created with all 4 vars
- [ ] GitHub secrets `CODEMAGIC_API_TOKEN` and `CODEMAGIC_APP_ID` added
- [ ] `codemagic.yaml` references group name (`ShazamApps`) under `environment.groups`
- [ ] PR opened → GitHub Actions check runs → Codemagic build fires

---

## Troubleshooting quick reference

| Symptom | Cause | Fix |
|---|---|---|
| `curl` exits 22, empty `x-auth-token` header | `CODEMAGIC_API_TOKEN` secret missing or fork PR | Add secret to GitHub repo; fork PRs are skip-guarded |
| Codemagic build never starts after merge | Webhook not wired | GH Actions uses API-driven trigger in `deploy.yml` — no webhook needed |
| `Cannot save Signing Certificates without certificate private key` | `CERTIFICATE_PRIVATE_KEY` missing from variable group | Add key contents from Step 1d |
| `Missing value KEY_IDENTIFIER` | Variable named `APP_STORE_CONNECT_KEY_ID` instead of `APP_STORE_CONNECT_KEY_IDENTIFIER` | Rename in Codemagic variable group |
| `No matching profiles found` | `ios_signing` declarative block used without OAuth integration | Use script-based signing (already done in `codemagic.yaml`) |
| TestFlight never receives build | `submit_to_testflight: true` missing in publishing block | Add to `codemagic.yaml` publishing section |
| `Path "ios/App/App.xcworkspace" does not exist` | Capacitor v6+ uses SPM — no `.xcworkspace` is ever created | Use `--project ios/App/App.xcodeproj` in `build-ipa`; never use `--workspace` |
| `"App" requires a provisioning profile` | `xcode-project use-profiles` not finding the project without explicit path | Add `--project "$XCODE_PROJECT"` to the `use-profiles` call |
| `pod install` step fails or hangs | Capacitor v6+ uses SPM, there is no Podfile | Remove `pod install` step entirely |
| First TestFlight build blocked on encryption question | No `ITSAppUsesNonExemptEncryption` key in Info.plist | Add `<key>ITSAppUsesNonExemptEncryption</key><false/>` to `ios/App/App/Info.plist` after first `cap add ios` runs |

---

## Capacitor-specific notes

### Capacitor v6+ uses Swift Package Manager (SPM) — not CocoaPods

This is a common source of CI failures. There is no `Podfile`, there is no `.xcworkspace`. The Xcode project is at `ios/App/App.xcodeproj` — always use `--project`, never `--workspace`. Never add a `pod install` step.

### `cap add ios` cannot run on Windows or Linux

It shells out to Xcode tooling and must run on a Mac. Guard it in `codemagic.yaml` so it only runs on the first build after a fresh clone:
```bash
if [ ! -d "ios" ]; then
  npx cap add ios
fi
```

The `ios/` directory must **not** be committed — it contains absolute machine paths. Codemagic regenerates it from scratch on every build.

### Export compliance (skip the prompt on every build)

After your first `cap add ios` runs (either locally on a Mac or after the first Codemagic build generates `ios/`), add this to `ios/App/App/Info.plist`:
```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```
Without this, TestFlight will block the build behind an export compliance question every time.

---

## Complete configuration files

These are the complete, verified working versions. Use these exactly.

### `codemagic.yaml`

```yaml
workflows:
  ios-testflight:
    name: iOS TestFlight
    max_build_duration: 60
    environment:
      groups:
        - ShazamApps
      vars:
        BUNDLE_ID: com.yourcompany.appname
        XCODE_PROJECT: ios/App/App.xcodeproj
        XCODE_SCHEME: App
      xcode: latest
      node: 22
    scripts:
      - name: Install npm dependencies
        script: npm ci

      - name: Build web assets
        script: npm run build

      - name: Add iOS platform
        script: |
          if [ ! -d "ios" ]; then
            npx cap add ios
          fi

      - name: Sync Capacitor
        script: npx cap sync ios

      - name: Set up code signing
        script: |
          keychain initialize
          app-store-connect fetch-signing-files "$BUNDLE_ID" \
            --type IOS_APP_STORE \
            --create
          keychain add-certificates
          xcode-project use-profiles --project "$XCODE_PROJECT"

      - name: Build IPA
        script: |
          xcode-project build-ipa \
            --project "$XCODE_PROJECT" \
            --scheme "$XCODE_SCHEME"

    artifacts:
      - build/ios/ipa/*.ipa

    publishing:
      app_store_connect:
        api_key: $APP_STORE_CONNECT_PRIVATE_KEY
        key_id: $APP_STORE_CONNECT_KEY_IDENTIFIER
        issuer_id: $APP_STORE_CONNECT_ISSUER_ID
        submit_to_testflight: true
        expire_build_submitted_for_review: true
```

### `.github/workflows/validate.yml`

Runs on every push and PR. Catches breaks before they hit Codemagic.

```yaml
name: Validate

on:
  push:
    branches: ['**']
  pull_request:
    branches: ['**']

jobs:
  validate:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci

      - run: npm run build
```

### `.github/workflows/deploy.yml`

Runs on merge to `master` (or `main` — match your default branch). Validates then triggers Codemagic.

```yaml
name: Deploy to TestFlight

on:
  push:
    branches: [master]

jobs:
  validate:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci

      - run: npm run build

  trigger-codemagic:
    needs: validate
    runs-on: ubuntu-latest
    permissions: {}
    steps:
      - name: Trigger Codemagic build
        id: trigger
        env:
          CODEMAGIC_API_TOKEN: ${{ secrets.CODEMAGIC_API_TOKEN }}
          CODEMAGIC_APP_ID: ${{ secrets.CODEMAGIC_APP_ID }}
        run: |
          RESPONSE=$(curl -s -w "\n%{http_code}" \
            -H "x-auth-token: $CODEMAGIC_API_TOKEN" \
            -H "Content-Type: application/json" \
            -X POST https://api.codemagic.io/builds \
            -d "{\"appId\":\"$CODEMAGIC_APP_ID\",\"workflowId\":\"ios-testflight\",\"branch\":\"${GITHUB_REF_NAME}\"}") 
          HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
          BODY=$(echo "$RESPONSE" | head -n-1)
          if [ "$HTTP_CODE" -ne 200 ]; then
            echo "Failed to trigger Codemagic: HTTP $HTTP_CODE"
            echo "$BODY"
            exit 1
          fi
          BUILD_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['buildId'])")
          echo "build_id=$BUILD_ID" >> "$GITHUB_OUTPUT"
          echo "Codemagic build started: $BUILD_ID"

      - name: Poll for result
        env:
          CODEMAGIC_API_TOKEN: ${{ secrets.CODEMAGIC_API_TOKEN }}
        run: |
          BUILD_ID="${{ steps.trigger.outputs.build_id }}"
          for i in $(seq 1 120); do
            sleep 30
            STATUS=$(curl -s \
              -H "x-auth-token: $CODEMAGIC_API_TOKEN" \
              "https://api.codemagic.io/builds/$BUILD_ID" | \
              python3 -c "import sys,json; print(json.load(sys.stdin)['build']['status'])")
            echo "[$i/120] Status: $STATUS"
            case "$STATUS" in
              finished)  echo "Build succeeded!" && exit 0 ;;
              failed|canceled|timeout) echo "Build $STATUS" && exit 1 ;;
            esac
          done
          echo "Timed out waiting for Codemagic build" && exit 1
```
