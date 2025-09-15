#!/bin/bash

# Build script for Truck Driver Pro
echo "🚛 Building Truck Driver Pro..."

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Build backend (if needed)
echo "🐍 Preparing backend..."
cd backend
pip install -r requirements.txt
python manage.py collectstatic --noinput
cd ..

echo "✅ Build complete!"
echo "Frontend build: frontend/build/"
echo "Backend ready: backend/"

