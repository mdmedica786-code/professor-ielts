@echo off
REM ============================================================
REM  Push Professor IELTS to GitHub  (one-time setup)
REM  1) Create a new EMPTY repo on github.com (no README).
REM  2) Double-click this file and paste the repo URL when asked.
REM  Your .env keys are git-ignored and will NOT be uploaded.
REM ============================================================
setlocal

where git >nul 2>nul
if errorlevel 1 (
  echo.
  echo Git is not installed on this PC.
  echo  - Install it from https://git-scm.com/download/win  then run this again,
  echo  - OR upload the folder on GitHub's website ^(see MOBILE-APP-SETUP.md, Part 1^).
  echo.
  pause
  exit /b 1
)

cd /d "%~dp0"

set "DEFAULT_URL=https://github.com/mdmedica786-code/professor-ielts.git"
set /p REPO_URL=Repo URL [press Enter to use %DEFAULT_URL%]:
if "%REPO_URL%"=="" set "REPO_URL=%DEFAULT_URL%"

if not exist ".git" git init
REM Set a local commit identity only if Git has none configured yet.
git config user.email >nul 2>nul || git config user.email "mdmedica786@gmail.com"
git config user.name  >nul 2>nul || git config user.name  "Medica"
git add .
git commit -m "Professor IELTS: web app + mobile/APK + backend deploy config"
git branch -M main
git remote remove origin 2>nul
git remote add origin %REPO_URL%
echo.
echo Pushing to %REPO_URL% ...
git push -u origin main
echo.
echo If a sign-in window appeared, approve it, then this push completes.
echo When it says "branch 'main' set up to track origin/main" you are done.
pause
endlocal
