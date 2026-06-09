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

---

## Environment / setup

### `cap add ios` fails on Windows/Linux
`cap add ios` shells out to Xcode tooling and requires macOS. Run it on a Mac or let Codemagic's Mac runner do it. Guard in yaml: `if [ ! -d "ios" ]; then npx cap add ios; fi`

### `certificate_private_key.pem` lost / regenerated
If you regenerate this file, the existing distribution certificate in Apple Developer Portal becomes unusable (private key is gone). You must revoke it in Apple Dev Portal and let Codemagic re-fetch a new one on next build.

### GitHub Actions: `curl` exits 22 / empty `x-auth-token`
**Cause:** `CODEMAGIC_API_TOKEN` GitHub secret is missing.  
**Fix:** Add it in repo Settings → Secrets and variables → Actions.

