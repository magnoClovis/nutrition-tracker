$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$files = @(
  "app.js",
  "nutrition-tracker.jsx",
  "index.html",
  "manifest.json"
) | ForEach-Object { Join-Path $root $_ }

function New-Pattern([int[]]$codePoints) {
  $chars = foreach ($codePoint in $codePoints) { [char]$codePoint }
  return [string]::Concat($chars)
}

# Common UTF-8-as-Windows-1252 mojibake sequences.
# Patterns are defined as Unicode code points so this script remains ASCII-only.
# This avoids flagging valid Portuguese uppercase "A with tilde" in words like
# "AVALIACAO" when that word is correctly accented in the app source.
$badPatterns = @(
  (New-Pattern @(0x00C3, 0x00A1)), # a acute mojibake
  (New-Pattern @(0x00C3, 0x00A0)), # a grave mojibake
  (New-Pattern @(0x00C3, 0x00A2)), # a circumflex mojibake
  (New-Pattern @(0x00C3, 0x00A3)), # a tilde mojibake
  (New-Pattern @(0x00C3, 0x00A7)), # c cedilla mojibake
  (New-Pattern @(0x00C3, 0x00A9)), # e acute mojibake
  (New-Pattern @(0x00C3, 0x00AA)), # e circumflex mojibake
  (New-Pattern @(0x00C3, 0x00AD)), # i acute mojibake
  (New-Pattern @(0x00C3, 0x00B3)), # o acute mojibake
  (New-Pattern @(0x00C3, 0x00B4)), # o circumflex mojibake
  (New-Pattern @(0x00C3, 0x00B5)), # o tilde mojibake
  (New-Pattern @(0x00C3, 0x00BA)), # u acute mojibake
  (New-Pattern @(0x00C2, 0x00A0)), # non-breaking-space mojibake
  (New-Pattern @(0x00E2, 0x20AC)), # smart quote/dash/check mojibake prefix
  ([char]0xFFFD).ToString()        # replacement character
)

$failed = $false
foreach ($file in $files) {
  if (!(Test-Path -LiteralPath $file)) { continue }
  $text = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
  $lines = $text -split "`r?`n"

  for ($i = 0; $i -lt $lines.Count; $i++) {
    foreach ($pattern in $badPatterns) {
      if ($lines[$i].Contains($pattern)) {
        $failed = $true
        Write-Host ("{0}:{1}: possible mojibake" -f $file, ($i + 1)) -ForegroundColor Red
        Write-Host ("  {0}" -f $lines[$i])
        break
      }
    }
  }
}

if ($failed) {
  throw "Encoding check failed. Save files as UTF-8 and repair mojibake before publishing."
}

Write-Host "Encoding check passed." -ForegroundColor Green

