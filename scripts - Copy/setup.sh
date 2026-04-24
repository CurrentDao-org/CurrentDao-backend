#!/bin/bash

echo "🚀 Setting up CurrentDao Backend with Energy Market Forecasting..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="20.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please upgrade to Node.js 20 or higher."
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install additional forecasting dependencies
echo "🔮 Installing forecasting dependencies..."
npm install @nestjs/typeorm @nestjs/axios typeorm mysql2 axios ml-regression simple-statistics @types/simple-statistics

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update .env file with your actual API keys and database configuration"
fi

# Build the application
echo "🏗️  Building the application..."
npm run build

echo "✅ Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update .env file with your API keys and database configuration"
echo "2. Start your MySQL database"
echo "3. Run 'npm run start:dev' to start the development server"
echo "4. Visit http://localhost:3000/api/docs to see the API documentation"
echo ""
echo "🔗 Useful links:"
echo "- API Documentation: http://localhost:3000/api/docs"
echo "- Health Check: http://localhost:3000/api/health"
echo "- Forecasting API: http://localhost:3000/api/forecasting"
