@echo off
REM VPN Detector - Windows Setup Script
REM This script automates the setup process for Windows development

echo ==================================================
echo   VPN ^& Proxy Detector - Setup Script (Windows)
echo ==================================================
echo.

REM Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% installed

REM Check npm
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo [OK] npm %NPM_VERSION% installed

REM Check Docker
where docker >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Docker is installed
    set HAS_DOCKER=1
) else (
    echo [WARNING] Docker not found
    echo MongoDB and Redis will need to be installed separately
    set HAS_DOCKER=0
)

echo.
echo ==================================================
echo   Setting up Backend
echo ==================================================
echo.

cd backend

REM Create .env if it doesn't exist
if not exist .env (
    echo [INFO] Creating .env from .env.example...
    copy .env.example .env >nul
    echo [OK] Created backend/.env
    echo [WARNING] Please update the JWT secrets in backend/.env before production use
) else (
    echo [OK] backend/.env already exists
)

REM Create logs directory
if not exist logs mkdir logs
echo [OK] Created logs directory

REM Install backend dependencies
echo.
echo Installing backend dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed

REM Build TypeScript
echo.
echo Building TypeScript...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to build TypeScript
    pause
    exit /b 1
)
echo [OK] TypeScript compiled successfully

cd ..

echo.
echo ==================================================
echo   Setting up Frontend
echo ==================================================
echo.

cd frontend

REM Create .env if it doesn't exist
if not exist .env (
    echo VITE_API_URL=http://localhost:5000/api > .env
    echo [OK] Created frontend/.env
) else (
    echo [OK] frontend/.env already exists
)

REM Install frontend dependencies
echo.
echo Installing frontend dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed

cd ..

echo.
echo ==================================================
echo   Starting Services
echo ==================================================
echo.

if %HAS_DOCKER% EQU 1 (
    echo Starting Docker services...
    docker-compose up -d mongodb redis
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Docker services started
        timeout /t 5 /nobreak >nul
        docker-compose ps
    ) else (
        echo [WARNING] Failed to start Docker services
        echo Please check Docker Desktop is running
    )
) else (
    echo.
    echo [WARNING] Docker not available. Please install and start services manually:
    echo.
    echo MongoDB:
    echo   Download: https://www.mongodb.com/try/download/community
    echo   Run: mongod --dbpath C:\data\db
    echo.
    echo Redis:
    echo   Download: https://github.com/microsoftarchive/redis/releases
    echo   Run: redis-server
    echo.
)

echo.
echo ==================================================
echo   Setup Complete!
echo ==================================================
echo.
echo Next steps:
echo.
echo 1. Start the backend:
echo    cd backend
echo    npm run dev
echo.
echo 2. Start the frontend (in a new terminal):
echo    cd frontend
echo    npm run dev
echo.
echo 3. Access the application:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
echo    Health:   http://localhost:5000/health
echo.
echo 4. Create your first user:
echo    Visit http://localhost:3000/register
echo.

if %HAS_DOCKER% EQU 1 (
    echo Docker commands:
    echo   View logs:     docker-compose logs -f
    echo   Stop services: docker-compose down
    echo   Restart:       docker-compose restart
    echo.
)

echo [SUCCESS] Setup completed successfully!
echo.
pause
