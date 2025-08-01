@echo off
echo ======================================== 
echo    AI Gateway 一键部署脚本
echo ========================================
echo.
echo [1/3] 检查环境...
where wrangler >nul 2>&1 || (echo 请先安装: npm install -g wrangler && pause && exit)
echo ✅ 环境检查通过

echo.
echo [2/3] 创建资源...
wrangler kv:namespace create "AI_KV"
wrangler d1 create ai-gateway-db  
wrangler r2 bucket create ai-gateway-files
echo ✅ 资源创建完成

echo.
echo [3/3] 部署服务...
wrangler d1 execute ai-gateway-db --file=./complete-setup.sql
wrangler deploy
wrangler pages deploy . --project-name ai-gateway-admin
echo ✅ 部署完成

echo.
echo 🎉 成功！请访问管理界面进行配置
pause
