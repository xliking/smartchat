# 🤖 AI Gateway - 零代码部署

> **5分钟部署你的专属AI网关！**  
> 支持ChatGPT API调用、图像生成、RAG知识库、用户管理

## 🚀 快速开始

### 方法一：一键部署（推荐）

1. **安装Node.js**：访问 [nodejs.org](https://nodejs.org) 下载安装
2. **安装Wrangler**：
   ```bash
   npm install -g wrangler
   wrangler login
   ```
3. **运行部署脚本**：
   - Windows: 双击 `deploy.bat`
   - Mac/Linux: 运行 `./deploy.sh`

### 方法二：手动部署

详细步骤请查看 [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md)

## 📁 文件说明

```
ai-gateway/
├── 📄 README.md              # 本文件 - 快速开始指南
├── 📖 DEPLOYMENT_GUIDE.md    # 详细部署文档
├── 🗃️ complete-setup.sql     # 完整数据库脚本
├── 🔧 worker.js              # 核心服务代码
├── 🎨 index.html             # 管理界面
├── ⚡ app.js                 # 前端功能
├── ⚙️ wrangler.toml          # Workers配置
├── 📱 wrangler-pages.toml    # Pages配置
├── 🪟 deploy.bat             # Windows一键部署
└── 🐧 deploy.sh              # Linux/Mac一键部署
```

## ✨ 功能特性

- 🔗 **OpenAI兼容API** - 支持所有ChatGPT客户端
- 🎨 **AI图像生成** - 消息中包含"画"字自动生成图片
- 📚 **RAG知识库** - 上传文档，AI基于你的内容回答
- 👥 **多用户管理** - 为不同用户生成独立API密钥
- 📊 **实时统计** - 查看使用量、存储、请求数据
- 🛡️ **安全隔离** - 每个用户的数据完全隔离

## 🎯 部署后配置

1. **访问管理界面**：打开部署完成后显示的Pages地址
2. **设置管理密码**：首次访问时设置
3. **配置AI服务**：
   - BaseURL: `https://api.siliconflow.cn`
   - 获取API密钥：[siliconflow.cn](https://siliconflow.cn)
   - 推荐模型：`deepseek-ai/DeepSeek-V3`
4. **生成用户密钥**：在"API密钥管理"创建密钥分发给用户

## 🧪 测试使用

```bash
# 基础对话
curl -X POST https://你的网关地址/v1/chat/completions   -H "Authorization: Bearer sk-你的密钥"   -H "Content-Type: application/json"   -d '{"model":"muchi","messages":[{"role":"user","content":"你好"}]}'

# 图像生成
curl -X POST https://你的网关地址/v1/chat/completions   -H "Authorization: Bearer sk-你的密钥"   -H "Content-Type: application/json"   -d '{"model":"muchi","messages":[{"role":"user","content":"画一只可爱的猫咪"}]}'
```

## 💰 费用说明

- **Cloudflare免费版**：足够个人和小团队使用
- **硅基流动**：新用户有免费额度，后续按使用量付费
- **总成本**：每月几元到几十元（取决于使用量）

## 🆘 遇到问题？

1. **部署失败**：检查网络连接，确保Wrangler已登录
2. **API调用失败**：检查密钥和硅基流动余额
3. **更多帮助**：查看 [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) 的常见问题部分

## 🎉 部署成功！

恭喜！你现在拥有了一个功能完整的AI网关：
- ✅ 支持所有ChatGPT客户端接入
- ✅ 具备图像生成能力
- ✅ 可构建专属知识库
- ✅ 完整的用户管理系统
- ✅ 实时监控和统计

**开始享受你的AI服务吧！** 🚀
EOF < /dev/null
