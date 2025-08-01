#\!/bin/bash

echo "========================================"
echo "    AI Gateway 一键部署脚本"
echo "========================================"
echo

echo "[1/7] 检查环境..."
if \! command -v wrangler &> /dev/null; then
    echo "❌ 未找到 wrangler CLI"
    echo "请先安装: npm install -g wrangler"
    exit 1
fi
echo "✅ Wrangler CLI 已安装"

echo
echo "[2/7] 创建 KV 存储..."
echo "正在创建 AI_KV namespace..."
wrangler kv:namespace create "AI_KV"
echo "✅ KV 存储创建完成"

echo
echo "[3/7] 创建 D1 数据库..."
echo "正在创建 ai-gateway-db..."
wrangler d1 create ai-gateway-db
echo "✅ D1 数据库创建完成"

echo
echo "[4/7] 创建 R2 存储桶..."
echo "正在创建 ai-gateway-files..."
wrangler r2 bucket create ai-gateway-files
echo "✅ R2 存储桶创建完成"

echo
echo "[5/7] 初始化数据库..."
echo "正在运行数据库初始化脚本..."
wrangler d1 execute ai-gateway-db --file=./complete-setup.sql
echo "✅ 数据库初始化完成"

echo
echo "[6/7] 部署 Workers..."
echo "正在部署主服务..."
wrangler deploy
echo "✅ Workers 部署完成"

echo
echo "[7/7] 部署管理界面..."
echo "正在部署 Pages..."
wrangler pages deploy . --project-name ai-gateway-admin
echo "✅ Pages 部署完成"

echo
echo "========================================"
echo "        🎉 部署成功！"
echo "========================================"
echo
echo "接下来请："
echo "1. 访问你的管理界面设置密码"
echo "2. 配置 AI 服务和 RAG 设置"
echo "3. 生成用户 API 密钥"
echo
echo "详细配置步骤请查看 DEPLOYMENT_GUIDE.md"
echo
