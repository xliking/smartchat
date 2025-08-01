@echo off
echo ========================================
echo AI Gateway Deploy Script
echo ========================================

rem Set proxy and API token
set HTTP_PROXY=http://127.0.0.1:7897
set HTTPS_PROXY=http://127.0.0.1:7897
set CLOUDFLARE_API_TOKEN=7Ch2Q6UfsV56DvnyqUzyET7jY8xCXOg8bY7jjJ_g

echo 1. Migrating database...
wrangler d1 execute ai-gateway-db --file=./migrate.sql
if %errorlevel% neq 0 (
    echo Database migration failed, but continuing...
)

echo.
echo 2. Deploying Workers...
wrangler deploy
if %errorlevel% neq 0 (
    echo Workers deploy failed!
    echo Press any key to close...
    pause >nul
    exit /b 1
)

echo.
echo 3. Deploying Pages...
wrangler pages deploy . --project-name ai-gateway-pages
if %errorlevel% neq 0 (
    echo Pages deploy failed!
    echo Press any key to close...
    pause >nul
    exit /b 1
)

echo.
echo ========================================
echo Deploy completed!
echo Workers: https://ai-gateway.2190418744.workers.dev
echo Pages: https://ai-gateway-pages.pages.dev
echo ========================================
echo Press any key to close...
pause >nul