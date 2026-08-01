$ErrorActionPreference = "Stop"

$auditScript = Join-Path $PSScriptRoot "encoding-audit.js"
$node = Get-Command node -ErrorAction Stop

& $node.Source $auditScript
if ($LASTEXITCODE -ne 0) {
  throw "Encoding check failed. Save runtime files as UTF-8 and repair mojibake before publishing."
}
