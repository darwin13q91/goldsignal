@echo off
echo 🏅 Gold Signal Service - Pre-Deployment Check
echo ===========================================
echo.

echo 📋 Checking project structure...

REM Check if essential files exist
if not exist "package.json" (
    echo ❌ package.json not found
    exit /b 1
) else (
    echo ✅ package.json found
)

if not exist "src\components\Dashboard.tsx" (
    echo ❌ Dashboard component not found
    exit /b 1
) else (
    echo ✅ Dashboard component found
)

if not exist "src\services\TwelveDataService.ts" (
    echo ❌ TwelveDataService not found
    exit /b 1
) else (
    echo ✅ TwelveDataService found
)

if not exist "vercel.json" (
    echo ❌ vercel.json not found
    exit /b 1
) else (
    echo ✅ vercel.json found
)

echo.
echo 🔍 Checking environment configuration...

if not exist ".env.example" (
    echo ❌ .env.example not found
    exit /b 1
) else (
    echo ✅ .env.example found
)

echo.
echo 🛠️ Testing build process...
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Build failed! Please fix errors before deploying.
    exit /b 1
) else (
    echo ✅ Build successful!
)

echo.
echo 🎉 Pre-deployment check complete!
echo.
echo 📋 Ready for Vercel deployment:
echo    1. Push to GitHub
echo    2. Connect repository to Vercel
echo    3. Configure environment variables
echo    4. Deploy!
echo.
echo 📖 See VERCEL_DEPLOYMENT_GUIDE.md for detailed instructions.
pause
