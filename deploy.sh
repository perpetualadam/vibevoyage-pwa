#!/bin/bash

# 🚀 VibeVoyage PWA Deployment Script
# This script deploys your PWA to Vercel (easiest method)

echo "🌟 VibeVoyage PWA Deployment Starting..."
echo "========================================"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Check if we're in the right directory
if [ ! -f "public/index.html" ]; then
    echo "❌ Error: public/index.html not found!"
    echo "Please run this script from the VibeVoyage root directory."
    exit 1
fi

# Check if manifest.json exists
if [ ! -f "public/manifest.json" ]; then
    echo "❌ Error: public/manifest.json not found!"
    exit 1
fi

echo "✅ Files verified - ready for deployment"

# Login to Vercel (if not already logged in)
echo "🔐 Checking Vercel authentication..."
vercel whoami || vercel login

# Deploy to production
echo "🚀 Deploying to Vercel..."
vercel --prod --yes

echo ""
echo "🎉 Deployment Complete!"
echo "========================================"
echo "Your VibeVoyage PWA is now live!"
echo ""
echo "📱 To install on your device:"
echo "1. Open the URL in your mobile browser"
echo "2. Look for 'Add to Home Screen' prompt"
echo "3. Tap 'Install' to add to your home screen"
echo ""
echo "🖥️  To install on desktop:"
echo "1. Open the URL in Chrome/Edge"
echo "2. Look for install icon in address bar"
echo "3. Click 'Install VibeVoyage'"
echo ""
echo "✨ Your PWA is ready to navigate! 🗺️"
