#!/bin/bash

# Deployment script for Truck Driver Pro
echo "🚀 Deploying Truck Driver Pro to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Deploy frontend
echo "📦 Deploying frontend..."
cd frontend
vercel --prod --yes
cd ..

# Deploy backend
echo "🐍 Deploying backend..."
cd backend
vercel --prod --yes
cd ..

echo "✅ Deployment complete!"
echo "Check your Vercel dashboard for deployment URLs"

