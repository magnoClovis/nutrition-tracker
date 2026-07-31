# Trofia - Stable Release Checklist

This file tracks the hardening/stability work for the 0.7.5 beta path toward a
more reliable stable release.

## Done in Hardening 0.7.5

- [x] Add `.gitignore` rules for Firebase admin keys, account exports, debug dumps, CSV contact exports, logs, and local env files.
- [x] Replace startup `innerHTML` error rendering with safe DOM nodes and `textContent`.
- [x] Add `scripts/preflight-release.ps1` to check encoding, app/jsx sync, startup XSS regression, UTF-8 declaration, tracked sensitive files, and JavaScript syntax when Node is available.
- [x] Add defensive full-backup validation before import writes data.

## Pending, Ordered By Urgency

| Priority | Item | Why it matters | Owner | Status / Reference |
|---:|---|---|---|---|
| 10 | Move `serviceAccountKey.json` outside the repo folder and rotate it if it was ever committed/shared | Prevents admin credential exposure | User | Pending |
| 10 | Run `scripts/preflight-release.ps1` before publishing or syncing a release | Catches encoding, syntax, secret, and sync regressions | User/Codex | Pending |
| 10 | Finalize Firestore rules after legacy migration is no longer needed | Removes temporary legacy read/delete surface | User applies, Codex prepares | Pending |
| 10 | Test full backup/export/import on a disposable account | Confirms data recovery before bigger releases | User | Pending |
| 9 | Add import preview/dry-run UI with clearer counts per category | Reduces risk of accidental overwrite | Codex | Pending |
| 9 | Handle offline meal writes explicitly and preserve Week chart state | On a real Android device, an offline meal appears to save and updates nutrition goals without warning, but disappears because it is not persisted; Week charts also disappear offline and return after reconnecting and re-entering the tab | Codex | Partial — meal registration now confirms success only after persistence and remains open on failure; offline Week chart preservation is still pending (este PR, Fatia 4) |
| 9 | Make backup export produce a file or explicit error in the Android WebView | Every available export action produced no file, destination picker, share sheet, success message, or error during real-device validation | Codex | Pending |
| 9 | Add privacy policy and data deletion notes | Required for user trust and app store paths | Codex drafts, User approves | Pending |
| 8 | Declare optional Android camera capability and validate the scanner permission flow | The current wrapper declares no camera permission, so Android cannot grant access and the scanner always falls back to manual entry | Codex | Pending |
| 8 | Implement Android Back handling for modals, settings, and internal navigation | Back currently backgrounds the app from every tested internal state instead of closing or returning from that state | Codex | Pending |
| 8 | Add smoke tests for login, tabs, backup, language, and no-console-error boot | Prevents repeated visual/script regressions | Codex | Pending |
| 8 | Keep improving prompt/data validation for AI feedback | Avoids incorrect nutrition statements | Codex with User review | Pending |
| 8 | Plan backend/proxy for AI keys before scaling beyond BYOK beta | Avoids exposing provider keys and enables quotas | User infrastructure, Codex code | Pending |
| 7 | Stabilize reports server behind HTTPS | Makes reports work from hosted/mobile app | User infrastructure, Codex code | Pending |
| 7 | Continue mobile Metrics layout refinement | Improves usability on phone | Codex | Pending |
| 6 | Prepare Capacitor Android/iOS packaging after the web app is stable | Enables app store path later | Codex + User developer accounts | Pending |
