# Smoke tests

These tests are intentionally small and separate from the app code. They catch
the failures that have caused most regressions so far: boot errors, blank tabs,
language persistence, settings, backup, and logout.

## One-time setup

```powershell
cd C:\Users\clovi\OneDrive\GitHub\nutrition-tracker
npm.cmd install
npx.cmd playwright install chromium
```

## Run public smoke tests

```powershell
npm.cmd run test:smoke
```

If PowerShell still cannot find `npm.cmd`, add Node to the current terminal
session and run it through the full path:

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
& "C:\Program Files\nodejs\npm.cmd" run test:smoke
```

## Run preflight plus smoke tests

```powershell
npm.cmd test
```

## Run authenticated smoke tests

Authenticated tests are skipped unless these temporary environment variables
are set. Use a disposable test account, not a personal account.

```powershell
$env:NUTRITION_TEST_EMAIL = "test@example.com"
$env:NUTRITION_TEST_PASSWORD = "test-password"
npm.cmd run test:smoke
Remove-Item Env:\NUTRITION_TEST_EMAIL
Remove-Item Env:\NUTRITION_TEST_PASSWORD
```

The test runner starts the app locally at `http://127.0.0.1:8765/index.html`.
That local server is implemented in Node at `tests/smoke/serve-static.js`, so
Python is not required for the smoke suite.
