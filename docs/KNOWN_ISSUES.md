# Known Issues

Issues hit and solved in production. Check here first before debugging. Full context and complete working configs are in `CODEMAGIC_SETUP.md` and `RN_TO_CAPACITOR_GUIDE.md`.

---

## Build failures: Codemagic + Capacitor iOS

### `Path "ios/App/App.xcworkspace" does not exist`
**Cause:** Using `--workspace` flag. Capacitor v6+ uses SPM — no `.xcworkspace` is ever created.  
**Fix:** Use `--project ios/App/App.xcodeproj` and `--project "$XCODE_PROJECT"` in `build-ipa`.  
**Never add `pod install`** — there is no Podfile.

### `"App" requires a provisioning profile`
**Cause:** `xcode-project use-profiles` called without `--project`, so it can't find the project at `ios/App/App.xcodeproj` and doesn't inject the profile.  
**Fix:** `xcode-project use-profiles --project "$XCODE_PROJECT"`

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
**Cause:** No `ITSAppUsesNonExemptEncryption` key in `ios/App/App/Info.plist`.  
**Fix:** After first `cap add ios` adds the `ios/` directory, add to `Info.plist`:
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

