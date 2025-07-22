@echo off
REM 🚀 VibeVoyage PWA Deployment Script for Windows
REM This script deploys your PWA to Vercel (easiest method)

echo 🌟 VibeVoyage PWA Deployment Starting...
echo ========================================

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if we're in the right directory
if not exist "public\index.html" (
    echo ❌ Error: public\index.html not found!
    echo Please run this script from the VibeVoyage root directory.
    pause
    exit /b 1
)

REM Check if manifest.json exists
if not exist "public\manifest.json" (
    echo ❌ Error: public\manifest.json not found!
    pause
    exit /b 1
)

echo ✅ Files verified - ready for deployment

REM Install Vercel CLI if not already installed
vercel --version >nul 2>&1
if errorlevel 1 (
    echo 📦 Installing Vercel CLI...
    npm install -g vercel
)

REM Login to Vercel (if not already logged in)
echo 🔐 Checking Vercel authentication...
vercel whoami || vercel login

REM Deploy to production
echo 🚀 Deploying to Vercel...
vercel --prod --yes

echo.
echo 🎉 Deployment Complete!
echo ========================================
echo Your VibeVoyage PWA is now live!
echo.
echo 📱 To install on your device:
echo 1. Open the URL in your mobile browser
echo 2. Look for 'Add to Home Screen' prompt
echo 3. Tap 'Install' to add to your home screen
echo.
echo 🖥️  To install on desktop:
echo 1. Open the URL in Chrome/Edge
echo 2. Look for install icon in address bar
echo 3. Click 'Install VibeVoyage'
echo.
echo ✨ Your PWA is ready to navigate! 🗺️
pause
