@echo off
REM Zenithal — double-click this to run everything. No setup, no download,
REM no account to create — the project boots with safe defaults and optional
REM `.env` overrides only if you want them.
REM First run takes a couple of minutes (installing Python/Node packages and
REM training any missing models); every run after that is much faster.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1"
pause
