# CurrentDao Backend Setup Script for Windows

Write-Host "🚀 Setting up CurrentDao Backend with Energy Market Forecasting..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js version $nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 20 or higher." -ForegroundColor Red
    exit 1
}

# Check Node.js version
$majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
if ($majorVersion -lt 20) {
    Write-Host "❌ Node.js version $nodeVersion is too old. Please upgrade to Node.js 20 or higher." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Install additional forecasting dependencies
Write-Host "🔮 Installing forecasting dependencies..." -ForegroundColor Yellow
npm install @nestjs/typeorm @nestjs/axios typeorm mysql2 axios ml-regression simple-statistics @types/simple-statistics

# Create .env file if it doesn't exist
if (-not (Test-Path .env)) {
    Write-Host "📝 Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "⚠️  Please update .env file with your actual API keys and database configuration" -ForegroundColor Yellow
}

# Build the application
Write-Host "🏗️  Building the application..." -ForegroundColor Yellow
npm run build

Write-Host "✅ Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Update .env file with your API keys and database configuration"
Write-Host "2. Start your MySQL database"
Write-Host "3. Run 'npm run start:dev' to start the development server"
Write-Host "4. Visit http://localhost:3000/api/docs to see the API documentation"
Write-Host ""
Write-Host "🔗 Useful links:" -ForegroundColor Cyan
Write-Host "- API Documentation: http://localhost:3000/api/docs"
Write-Host "- Health Check: http://localhost:3000/api/health"
Write-Host "- Forecasting API: http://localhost:3000/api/forecasting"

Read-Host "Press Enter to exit"
