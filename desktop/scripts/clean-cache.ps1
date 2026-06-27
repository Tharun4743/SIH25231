# clean-cache.ps1 — Run this before installing a new AURA version
$paths = @(
  "$env:APPDATA\aura-desktop",
  "$env:APPDATA\AURA Desktop",
  "$env:LOCALAPPDATA\aura-desktop",
  "$env:TEMP\aura-install",
  "$env:TEMP\aura_tmp",
  "$env:TEMP\aura-backend.log"
)
foreach ($p in $paths) {
  if (Test-Path $p) {
    Remove-Item -Path $p -Recurse -Force
    Write-Host "[CLEANED] $p" -ForegroundColor Green
  } else {
    Write-Host "[SKIP] Not found: $p" -ForegroundColor Gray
  }
}
Write-Host ""
Write-Host "AURA cache cleared. Safe to install fresh." -ForegroundColor Cyan
