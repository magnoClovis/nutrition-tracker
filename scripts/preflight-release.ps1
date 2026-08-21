$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$issues = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

function Add-Issue([string]$message) {
  $issues.Add($message) | Out-Null
  Write-Host "[FAIL] $message" -ForegroundColor Red
}

function Add-Warning([string]$message) {
  $warnings.Add($message) | Out-Null
  Write-Host "[WARN] $message" -ForegroundColor Yellow
}

function Add-Ok([string]$message) {
  Write-Host "[OK] $message" -ForegroundColor Green
}

function Get-Sha256([string]$path) {
  $stream = [System.IO.File]::OpenRead($path)
  try {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
      return [System.BitConverter]::ToString($sha.ComputeHash($stream)).Replace("-", "")
    } finally {
      $sha.Dispose()
    }
  } finally {
    $stream.Dispose()
  }
}

Push-Location $root
try {
  Write-Host "Trofia release preflight" -ForegroundColor Cyan
  Write-Host "Root: $root"

  # Encoding regressions have repeatedly broken visible Portuguese/English UI.
  & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "check-encoding.ps1")
  Add-Ok "Encoding check passed"

  $app = Join-Path $root "app.js"
  $jsx = Join-Path $root "nutrition-tracker.jsx"
  if ((Test-Path -LiteralPath $app) -and (Test-Path -LiteralPath $jsx)) {
    $appHash = Get-Sha256 $app
    $jsxHash = Get-Sha256 $jsx
    if ($appHash -ne $jsxHash) {
      Add-Issue "app.js and nutrition-tracker.jsx are not synchronized"
    } else {
      Add-Ok "app.js and nutrition-tracker.jsx are synchronized"
    }
  } else {
    Add-Issue "app.js or nutrition-tracker.jsx is missing"
  }

  $index = Join-Path $root "index.html"
  if (Test-Path -LiteralPath $index) {
    $indexText = [System.IO.File]::ReadAllText($index, [System.Text.Encoding]::UTF8)
    if ($indexText -match "\.innerHTML\s*=") {
      Add-Issue "index.html still assigns innerHTML; use textContent/DOM nodes for startup errors"
    } else {
      Add-Ok "index.html has no direct innerHTML assignment"
    }
    if ($indexText -notmatch 'charset="UTF-8"') {
      Add-Issue "index.html is missing UTF-8 charset declaration"
    } else {
      Add-Ok "index.html declares UTF-8"
    }
  }

  # Syntax check is best-effort: Node is not required to use the app, but when
  # available it catches the fast, annoying parse errors before opening a browser.
  $node = Get-Command node -ErrorAction SilentlyContinue
  $nodeExe = if ($node) { $node.Source } elseif (Test-Path -LiteralPath "C:\Program Files\nodejs\node.exe") { "C:\Program Files\nodejs\node.exe" } else { $null }
  if ($nodeExe) {
    & $nodeExe --check $app | Out-Null
    Add-Ok "app.js syntax check passed"
    $jsxSyntaxCopy = Join-Path ([System.IO.Path]::GetTempPath()) "nutrition-tracker-jsx-syntax-check.js"
    Copy-Item -LiteralPath $jsx -Destination $jsxSyntaxCopy -Force
    try {
      & $nodeExe --check $jsxSyntaxCopy | Out-Null
      Add-Ok "nutrition-tracker.jsx syntax check passed"
    } finally {
      Remove-Item -LiteralPath $jsxSyntaxCopy -Force -ErrorAction SilentlyContinue
    }
    & $nodeExe (Join-Path $PSScriptRoot "audit-i18n.js") | Out-Host
    Add-Ok "i18n audit passed"
  } else {
    Add-Warning "Node was not found; skipped JavaScript syntax and i18n checks"
  }

  $tracked = @()
  $git = Get-Command git -ErrorAction SilentlyContinue
  if ($git) {
    $tracked = @(git ls-files)
    $dangerousTracked = $tracked | Where-Object {
      $_ -match 'serviceAccountKey\.json$' -or
      $_ -match 'firebase-auth-contacts.*\.(csv|json)$' -or
      $_ -match 'nutrition-(debug|full-raw|audit).*\.json$' -or
      $_ -match 'backup(_completo|-completo)?.*\.json$'
    }
    if ($dangerousTracked.Count) {
      Add-Issue ("Sensitive/private export files are tracked: " + ($dangerousTracked -join ", "))
    } else {
      Add-Ok "No sensitive export/credential files are tracked by git"
    }
  } else {
    Add-Warning "Git was not found; skipped tracked-secret check"
  }

  $localSensitive = @(
    "serviceAccountKey.json",
    "firebase-auth-contacts.csv",
    "firebase-auth-contacts-summary.json",
    "nutrition-full-raw.json",
    "nutrition-audit-summary.json",
    "nutrition-orphan-cleanup-report.json"
  ) | Where-Object { Test-Path -LiteralPath (Join-Path $root $_) }

  if ($localSensitive.Count) {
    Add-Warning ("Sensitive local files exist but are ignored by release policy: " + ($localSensitive -join ", "))
  } else {
    Add-Ok "No known sensitive local files found in project root"
  }

  if ($issues.Count) {
    throw "Preflight failed with $($issues.Count) issue(s)."
  }

  Write-Host ""
  Write-Host "Preflight passed with $($warnings.Count) warning(s)." -ForegroundColor Green
} finally {
  Pop-Location
}
