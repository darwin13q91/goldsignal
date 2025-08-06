#!/bin/bash

# 🚀 Quick Deployment Script for Vercel
# Run this script to deploy your Gold Signal Service to Vercel

echo "🏅 Gold Signal Service - Vercel Deployment"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "📋 Checking prerequisites..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "🔧 Initializing Git repository..."
    git init
fi

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Committing changes..."
    git add .
    git commit -m "Deploy: Production-ready Gold Signal Service"
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "🔧 Installing Vercel CLI..."
    npm install -g vercel
fi

echo "🚀 Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Post-deployment checklist:"
echo "   1. Update Supabase authentication URLs"
echo "   2. Test user registration and login"
echo "   3. Verify Gold price data is loading"
echo "   4. Check signal functionality"
echo ""
echo "🌍 Your Gold Signal Service is now live!"
