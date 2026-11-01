@echo off
cd /d "c:\AI Manthan\Inspectra-2\backend"
"c:\AI Manthan\Inspectra-2\.venv\Scripts\python.exe" -m uvicorn main:app --reload --port 8000
