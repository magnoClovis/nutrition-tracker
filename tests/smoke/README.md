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

Use a disposable Firebase test account, never a personal account. Fill the
ignored local file `tests/test-user.local.json` manually:

```json
{
  "email": "",
  "password": ""
}
```

Keep the fields empty until the disposable account is available. The file and
the generated `playwright/.auth/user.json` session are ignored by Git. After the
first successful login, Playwright reuses that storage state instead of logging
in before every authenticated test.

For future CI runs, set `NUTRITION_TEST_EMAIL` and
`NUTRITION_TEST_PASSWORD` through GitHub Secrets. Environment variables take
priority over the local JSON file.

When neither source has complete credentials, authenticated tests are skipped
with this message:

```text
credenciais de teste não configuradas — preencha tests/test-user.local.json ou defina NUTRITION_TEST_EMAIL/NUTRITION_TEST_PASSWORD
```

Firebase Auth and Firestore are the only real remote integrations used by the
authenticated suite. The managed AI Worker, Open Food Facts, and the advanced-report server are
always intercepted; the tests never send real requests to those services.

### Shared-account coordination

The authenticated suites mutate language, pantry fixtures, and diary data in
one shared disposable account. They must never run concurrently.

The global authenticated setup provides three fail-closed guards:

- an atomic `%LOCALAPPDATA%\Trofia\authenticated-smoke.lock` serializes local
  worktrees; a dead-process or older-than-two-hours lock can be reclaimed;
- before login, a local run refuses to start while the GitHub Actions workflow
  `CI` is queued or running. Only public run IDs appear in the error.
- after that fast guard, a local run dispatches `Authenticated local lease`,
  waits until it owns the shared `nutrition-authenticated-suite` concurrency
  group, and only then logs in. Teardown cancels the lease and waits for its
  completion before releasing the local lock.

Typical guard messages are:

```text
authenticated-smoke-local-run-active
authenticated-smoke-github-ci-active:<public-run-id>
```

Do not delete a live lock or bypass these errors. Wait for the other run to
finish. GitHub Actions already serializes its own authenticated runs through
the `nutrition-authenticated-suite` concurrency group.

The workflow `.github/workflows/authenticated-local-lease.yml` reserves that
same group and has a 60-minute safety timeout if a local process dies before
teardown. Acquisition, listing, cancellation or confirmation failures stop the
local suite before it can use the shared account. The workflow receives only an
opaque UUID and does not receive Firebase credentials, App Check tokens or user
data.

The test runner starts the app locally at `http://127.0.0.1:8765/index.html`.
That local server is implemented in Node at `tests/smoke/serve-static.js`, so
Python is not required for the smoke suite.
