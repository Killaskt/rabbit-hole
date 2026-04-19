# Known Issues

Issues hit and solved in production. Check here first before debugging. Full context and complete working configs are in `CODEMAGIC_SETUP.md` and `RN_TO_CAPACITOR_GUIDE.md`.

---

## Build failures: Codemagic + Capacitor iOS

### `Path "ios/App/App.xcworkspace" does not exist`
**Cause:** Using `--workspace` flag. Capacitor v6+ uses SPM — no `.xcworkspace` is ever created.  
**Fix:** Use `--project ios/App/App.xcodeproj` and `--project "$XCODE_PROJECT"` in `build-ipa`.  
**Never add `pod install`** — there is no Podfile.

### `"App" requires a provisioning profile`
**Cause:** `xcode-project use-profiles` called with `--project <relative-path>` — the relative path isn't resolved correctly and the tool never patches the `.xcodeproj`, so no profile specifier is injected before `xcodebuild archive` runs. Also fails if called from repo root without any path argument.  
**Fix:** `cd` into the project directory first so the tool auto-detects it:
```yaml
- name: Set up code signing
  script: |
    keychain initialize
    app-store-connect fetch-signing-files "$BUNDLE_ID" \
      --type IOS_APP_STORE \
      --create
    keychain add-certificates
    cd ios/App && xcode-project use-profiles && cd ../..
```
**Note:** `--project "$XCODE_PROJECT"` with a relative path does NOT reliably work. Use the `cd` pattern instead.

### `Cannot save Signing Certificates without certificate private key`
**Cause:** `CERTIFICATE_PRIVATE_KEY` missing from Codemagic variable group.  
**Fix:** Generate with `openssl genrsa 2048 > certificate_private_key.pem`, paste full contents into the Codemagic `ShazamApps` group.

### `Missing value KEY_IDENTIFIER`
**Cause:** Variable named `APP_STORE_CONNECT_KEY_ID` instead of the exact name `codemagic-cli-tools` expects.  
**Fix:** Rename to `APP_STORE_CONNECT_KEY_IDENTIFIER` in the Codemagic variable group.

### `No matching profiles found`
**Cause:** Using the declarative `ios_signing` block in `codemagic.yaml`, which requires Codemagic OAuth integration.  
**Fix:** Use script-based signing (`app-store-connect fetch-signing-files` + `keychain` commands). See `CODEMAGIC_SETUP.md` for the complete working script.

### TestFlight build never appears
**Cause:** `submit_to_testflight: true` missing from the `publishing.app_store_connect` block.  
**Fix:** Add it. See `CODEMAGIC_SETUP.md` for the complete publishing block.

### First TestFlight build blocked on export compliance
**Cause:** No `ITSAppUsesNonExemptEncryption` key in `ios/App/App/Info.plist`. App Store Connect prompts on every submission if missing.  
**Answer:** Select "None of the algorithms mentioned above" — HTTPS is OS-level/exempt, not custom encryption. Can be changed later if you add custom encryption.  
**Fix (automated in codemagic.yaml):** A "Set export compliance flag" step runs `PlistBuddy` to add `ITSAppUsesNonExemptEncryption = false` to `Info.plist` after `cap sync`. No manual action needed after initial setup.

If you ever need to do it manually:
```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

### `Failure: Complete test information is required` (TestFlight external review)
**Cause:** Apple requires reviewer contact details before a build can be submitted for external TestFlight testing. This is a one-time manual step per app.  
**Symptoms in Codemagic log:**
```
App is missing required Beta App Information: Feedback Email.
App is missing required Beta App Review Information: First Name, Last Name, Phone Number, Email.
```
**Fix:** Go to [App Store Connect → TestFlight → Test Information](https://appstoreconnect.apple.com/apps/6762248606/testflight/test-info) and fill in:
- **Beta App Information:** Feedback Email
- **Beta App Review Information:** First Name, Last Name, Phone Number, Email (your contact info — not shown to users, only to Apple reviewers)  

Only needed once. Subsequent builds submit automatically.

### App Store Connect API 401 on `Fetch signing files`
**Cause:** One of the three credentials in the Codemagic variable group is wrong, expired, or the key was revoked.  
**Check:**
1. Go to [App Store Connect → Users and Access → Integrations → Keys](https://appstoreconnect.apple.com/access/integrations/api) — confirm key is not revoked
2. `APP_STORE_CONNECT_KEY_IDENTIFIER` = the **Key ID** column value
3. `APP_STORE_CONNECT_ISSUER_ID` = the **Issuer ID** shown at the top of that page
4. `APP_STORE_CONNECT_PRIVATE_KEY` = full contents of the `.p8` file including `-----BEGIN PRIVATE KEY-----` / `-----END PRIVATE KEY-----` lines  

**Note:** The same API key can be reused across multiple apps and Codemagic projects — it's account-wide.  
**Note:** `APP_STORE_CONNECT_PRIVATE_KEY` (`.p8` API key) and `CERTIFICATE_PRIVATE_KEY` (RSA signing key) are **different things**. Do not mix them up.

### `cap add ios` generates wrong bundle ID — provisioning profile doesn't match
**Cause:** `cap add ios` sets a default/template `PRODUCT_BUNDLE_IDENTIFIER` in the generated `xcodeproj`. The profile fetched for `com.killaskt.rabbithole` doesn't match the target, so `use-profiles` silently skips injection and signing fails.  
**Fix (automated in codemagic.yaml):** A "Verify bundle ID" step uses `sed` to force-replace every `PRODUCT_BUNDLE_IDENTIFIER` in `project.pbxproj` after `cap add ios`:
```bash
sed -i '' "s/PRODUCT_BUNDLE_IDENTIFIER = .*/PRODUCT_BUNDLE_IDENTIFIER = $BUNDLE_ID;/g" App.xcodeproj/project.pbxproj
```
**Root cause insight:** Projects that commit `ios/` to the repo (like habbitOS) never hit this — the bundle ID is pre-set. Projects that run `cap add ios` fresh on CI every build must force it.

---

## GitHub Actions / CI

### PR pushes don't trigger a Codemagic build
**Cause:** `deploy.yml` only fires on `push: branches: [master]`. No workflow was wired to PRs.  
**Fix:** `preview.yml` triggers the `ios-feature-preview` Codemagic workflow on every PR push targeting `master`. Uses `GITHUB_HEAD_REF` (the PR branch, not `master`) so Codemagic builds the actual PR code.

### iOS zoom / pinch-to-zoom enabled unexpectedly
**Cause:** Viewport meta tag missing `user-scalable=no`. In Capacitor's WKWebView, iOS allows pinch/double-tap zoom the same as Safari unless explicitly disabled.  
**Fix:** `index.html` viewport:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

### API calls fail with "Load failed" / network error in Capacitor
**Cause:** Regular `fetch()` hits CORS enforcement in Capacitor's native WKWebView, same as in Safari. External API calls to Anthropic/OpenAI fail.  
**Fix:** Use `CapacitorHttp.request()` instead of `fetch()` for all external API calls. `CapacitorHttp` routes through native HTTP and bypasses CORS entirely.

---

## Environment / setup

### `cap add ios` fails on Windows/Linux
`cap add ios` shells out to Xcode tooling and requires macOS. Run it on a Mac or let Codemagic's Mac runner do it. Guard in yaml: `if [ ! -d "ios" ]; then npx cap add ios; fi`

### `certificate_private_key.pem` lost / regenerated
If you regenerate this file, the existing distribution certificate in Apple Developer Portal becomes unusable (private key is gone). You must revoke it in Apple Dev Portal and let Codemagic re-fetch a new one on next build.

### GitHub Actions: `curl` exits 22 / empty `x-auth-token`
**Cause:** `CODEMAGIC_API_TOKEN` GitHub secret is missing.  
**Fix:** Add it in repo Settings → Secrets and variables → Actions.

