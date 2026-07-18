@echo off
REM Zenithal — double-click this to run everything. No setup, no download,
REM no API key to create — all data/models/feeds/keys are already in this repo.
REM First run takes a couple of minutes (installing Python/Node packages);
REM every run after that is instant.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1"
pause
