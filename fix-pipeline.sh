#!/bin/bash

# Pipeline Fix Script for CurrentDao Backend
echo "🔧 Fixing pipeline issues..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production=false

# Install additional dependencies for health checks
echo "📦 Installing additional dependencies..."
npm install @nestjs/swagger @nestjs/config @nestjs/terminus class-validator class-transformer

# Run tests to verify
echo "🧪 Running tests..."
npm run test:cov

# Build application
echo "🏗️ Building application..."
npm run build

echo "✅ Pipeline fixes completed successfully!"
