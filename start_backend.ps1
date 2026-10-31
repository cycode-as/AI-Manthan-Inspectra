# Inspectra 2.0 — Backend startup script
# Run from project root:  powershell -ExecutionPolicy Bypass -File .\start_backend.ps1

$root    = $PSScriptRoot
$python  = Join-Path $root ".venv\Scripts\python.exe"
$backend = Join-Path $root "backend"

Set-Location $backend
& $python -m uvicorn main:app --reload --port 8000
