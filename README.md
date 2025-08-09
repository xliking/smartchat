# SmartChat Engine 🚀

[English](README.md) | [中文](README.zh.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Cloudflare Workers](https://img.shields.io/badge/🔶-Cloudflare_Workers-orange)](https://workers.cloudflare.com/) [![OpenAI Compatible](https://img.shields.io/badge/🤖-OpenAI_Compatible-green)](https://openai.com/api/)

A powerful **AI-powered chat platform** and **RAG (Retrieval-Augmented Generation)** system built on **Cloudflare Workers**, providing intelligent conversation capabilities, file management, and knowledge retrieval for various applications.

## ✨ Features

- 🤖 **Smart Chat**: OpenAI-compatible chat API for intelligent conversations
- 📚 **RAG System**: Upload files and build knowledge base with intelligent retrieval
- 🔗 **Model-File Binding**: Bind specific files to models for precise RAG retrieval
- 🔐 **API Key Management**: Custom API key system with user isolation
- 🎨 **Image Generation**: Integrated AI image generation capabilities
- 📊 **Admin Dashboard**: Modern web-based management interface
- 🌐 **Multi-User Support**: API key isolation for multiple users
- 📄 **Notion Integration**: Sync with Notion workspace for content management
- 🔄 **Streaming Support**: Real-time streaming responses
- 📈 **Usage Analytics**: Track API usage and statistics

## 🎯 Use Cases

### 🤖 Website AI Customer Service
Build intelligent customer service systems that can:
- Answer common questions instantly
- Handle product inquiries with RAG knowledge base
- Provide 24/7 multilingual support
- Escalate complex issues to human agents

### 📚 Knowledge Base Assistant
Create smart Q&A systems for:
- Internal company documentation
- Technical support wikis
- Educational content assistance
- Research paper analysis

### 🛒 E-commerce Shopping Assistant
Enhance shopping experiences with:
- Product recommendations
- Size and compatibility guidance
- Order tracking and support
- Personalized shopping advice

## 🏗️ Architecture

### Core Components

- **Cloudflare Workers**: Main application logic and API endpoints
- **Cloudflare Pages**: Web-based admin interface
- **KV Storage**: Configuration and API key storage
- **D1 Database**: File content and conversation history
- **R2 Storage**: Uploaded file cloud storage

### Request Flow

1. Client calls `/v1/chat/completions` endpoint
2. API key authentication
3. RAG retrieval (optional)
4. Model routing and forwarding
5. Response processing and return
6. Conversation history storage

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- Cloudflare account
- Wrangler CLI

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/smartchat-engine.git
   cd smartchat-engine
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

4. **Create resources**
   ```bash
   # Create KV namespace
   wrangler kv:namespace create "AI_KV"
   
   # Create D1 database
   wrangler d1 create ai-gateway-db
   
   # Create R2 bucket
   wrangler r2 bucket create ai-gateway-files
   ```

5. **Configure project**
   
   Edit `wrangler.toml` and replace resource IDs:
   ```toml
   [[kv_namespaces]]
   binding = "AI_KV"
   id = "your-kv-id"
   
   [[d1_databases]]
   binding = "AI_DB"
   database_name = "ai-gateway-db"
   database_id = "your-d1-id"
   
   [[r2_buckets]]
   binding = "AI_R2"
   bucket_name = "ai-gateway-files"
   ```

6. **Initialize database**
   ```bash
   wrangler d1 execute ai-gateway-db --file=./complete-setup.sql --env production
   ```

7. **Configure Domain**
   
   Edit `app.js` line 2 to update the API URL to your actual domain:
   ```javascript
   let API_BASE_URL = 'https://your-worker-domain.workers.dev';
   ```

8. **Deploy**
   ```bash
   # Deploy Worker
   wrangler deploy --env production
   
   # Deploy Admin Interface
   wrangler pages publish . --project-name smartchat-admin
   ```

## 💻 Usage

### Admin Interface

1. First visit will prompt for admin setup
2. Configure AI service (Base URL, API key, models)
3. Set up RAG models (embedding and reranking)
4. Generate user API keys

### API Usage

#### Chat Conversations
```bash
curl -X POST https://your-domain/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-your-api-key" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {"role": "user", "content": "Hello, how can you help me today?"}
    ],
    "stream": false
  }'
```

#### Customer Service Example
```bash
curl -X POST https://your-domain/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-your-api-key" \
  -d '{
    "model": "customer-service-bot",
    "messages": [
      {"role": "user", "content": "What is your return policy?"}
    ]
  }'
```

#### Supported Parameters
- `model`: Model name
- `messages`: Message array
- `temperature`: Temperature parameter (0-1)
- `max_tokens`: Maximum tokens
- `stream`: Enable streaming response

### Model-File Binding

Bind specific files to models for precise RAG retrieval:

1. **Bind Files**: Click the paperclip icon on model tags
2. **Select Files**: Choose from uploaded files
3. **Activation**: When RAG is enabled, only bound files are used
4. **Default Behavior**: Uses all files if no binding exists

## 📁 Project Structure

```
├── worker.js              # Workers main program
├── index.html             # Admin interface HTML
├── app.js                 # Frontend JavaScript
├── complete-setup.sql     # Database schema
├── wrangler.toml          # Workers configuration
├── wrangler-pages.toml    # Pages configuration
├── package.json           # Dependencies
├── README.md              # English documentation
└── README.zh.md           # Chinese documentation
```

## 🛠️ Development Commands

```bash
# Local development
npm run dev

# Deploy to production
npm run deploy

# View logs
npm run tail

# Database operations
wrangler d1 execute ai-gateway-db --command="SELECT * FROM files LIMIT 10" --env production
```

## 📖 API Reference

### Authentication
- `POST /api/setup` - Initialize setup
- `POST /api/login` - Admin login
- `POST /api/logout` - Admin logout

### Configuration
- `GET /api/config` - Get configuration
- `POST /api/config` - Update configuration
- `GET /api/models` - Get model list

### File Management
- `POST /api/upload` - Upload files
- `GET /api/files` - Get file list
- `DELETE /api/files/:id` - Delete file

### API Keys
- `GET /api/keys` - Get API key list
- `POST /api/keys` - Create API key
- `DELETE /api/keys/:id` - Delete API key

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues, please:
- Search existing [issues](https://github.com/xliking/smartchat/issues)
- Create a new issue with detailed information

---