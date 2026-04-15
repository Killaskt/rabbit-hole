# Known Issues

Issues that have been hit and solved. Check here before debugging a build failure.

---

## Codemagic: `Path "ios/App/App.xcworkspace" does not exist`

**Symptom:** Step `Build IPA` fails with:
```
xcode-project build-ipa: error: argument --workspace: Path "ios/App/App.xcworkspace" does not exist
```

**Root cause:** Capacitor v6+ dropped CocoaPods and switched to Swift Package Manager (SPM). No `.xcworkspace` is ever created — only `App.xcodeproj`. Using `--workspace` is wrong.

**Fix:** Use `--project` instead of `--workspace` in `codemagic.yaml`:
```yaml
- name: Build IPA
  script: |
    xcode-project build-ipa \
      --project "$XCODE_PROJECT" \
      --scheme "$XCODE_SCHEME"
```
And set the var: `XCODE_PROJECT: ios/App/App.xcodeproj`

**Do NOT add a `pod install` step** — there is no Podfile. It won't fix anything and wastes ~2 minutes of build time.

**Affects:** Any project using `@capacitor/ios` v6, v7, or v8.

---

## Codemagic: `"App" requires a provisioning profile`

**Symptom:** Archive step fails with:
```
error: "App" requires a provisioning profile. Select a provisioning profile in the Signing & Capabilities editor.
```

**Root cause:** `xcode-project use-profiles` searches for an Xcode project from the working directory (repo root). For Capacitor projects the project is at `ios/App/App.xcodeproj` — two levels deep. Without an explicit path it either finds nothing or patches the wrong file, so the provisioning profile never gets injected before `xcodebuild archive` runs.

**Fix:** Pass `--project` explicitly:
```yaml
- name: Set up code signing
  script: |
    keychain initialize
    app-store-connect fetch-signing-files "$BUNDLE_ID" \
      --type IOS_APP_STORE \
      --create
    keychain add-certificates
    xcode-project use-profiles --project "$XCODE_PROJECT"
```
Where `XCODE_PROJECT: ios/App/App.xcodeproj`.

---

## `cap add ios` must run on macOS

`npx cap add ios` cannot run on Windows or Linux — it shells out to Xcode tooling.
Codemagic's Mac runner handles this. The `codemagic.yaml` guards this with:
```bash
if [ ! -d "ios" ]; then
  npx cap add ios
fi
```
This means the `ios/` directory is **not committed** to the repo — it's generated fresh on each Codemagic build. Do not commit `ios/` — it contains machine-generated files with absolute paths.

---

## `certificate_private_key.pem` must never be committed

The file is in `.gitignore`. If you regenerate it (e.g. new machine), you must also revoke the existing distribution certificate in Apple Developer Portal and let Codemagic fetch a new one via `app-store-connect fetch-signing-files`. The old cert becomes unusable once the private key is gone.
