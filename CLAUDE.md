# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Cloudflare Workers-based AI gateway and RAG system that provides:
- AI chat completions with custom model routing
- RAG (Retrieval-Augmented Generation) functionality
- File upload and text storage capabilities  
- Image generation integration
- Administrative interface for configuration
- API key management system

## Architecture

The system uses multiple Cloudflare services:
- **Workers**: Main application logic and API endpoints (`worker.js`)
- **Pages**: Administrative web interface (`index.html`, `app.js`)
- **KV**: Configuration and API key storage
- **D1**: Database for storing uploaded content and conversation history
- **R2**: Object storage for uploaded files

### Key Files
- `worker.js`: Main Workers runtime code (compiled from source)
- `app.js`: Frontend JavaScript for admin interface
- `index.html`: Admin panel UI
- `schema.sql`: D1 database schema initialization
- `wrangler.toml`: Workers deployment configuration
- `wrangler-pages.toml`: Pages deployment configuration

## Development Commands

### Local Development
```bash
npm run dev          # Start local development server using wrangler dev
```

### Deployment
```bash
npm run deploy       # Deploy to Cloudflare Workers (same as wrangler publish)
wrangler deploy      # New deployment command
```

### Monitoring
```bash
npm run tail         # View real-time logs
wrangler tail        # Direct wrangler tail command
```

### Database Management
```bash
# Initialize database schema
wrangler d1 execute ai-gateway-db --file=./schema.sql

# Query database
wrangler d1 execute ai-gateway-db --command="SELECT * FROM files LIMIT 10"

# View KV namespace contents
wrangler kv:key list --namespace-id=5d41a451ec284a21816b8d096b090e71
```

### Resource Management
```bash
# Create new resources (if needed)
wrangler kv:namespace create "AI_KV"
wrangler d1 create ai-gateway-db  
wrangler r2 bucket create ai-gateway-files
```

## Core Architecture

### Request Flow
1. **External API Call**: Client → `{worker-url}/v1/chat/completions` (OpenAI-compatible)
2. **Authentication**: Custom API key validation (`sk-` prefix)
3. **RAG Processing**: Query D1 for relevant content, retrieve from R2 if needed
4. **Model Routing**: Map external model names to internal configurations
5. **AI Service Call**: Forward to SiliconFlow API with appropriate model
6. **Response Processing**: Handle streaming/non-streaming, apply conversation limits
7. **Storage**: Save conversation history to D1 (isolated by API key)

### Database Schema
- `files`: Uploaded content with embeddings for RAG
- `conversations`: Chat history isolated by API key  
- `api_usage`: Optional usage tracking

### Configuration Flow
1. **First Visit**: Admin setup page (`/api/setup`)
2. **Authentication**: Password-based admin login (`/api/login`)
3. **Management**: Config API (`/api/config`) for AI/RAG settings
4. **File Upload**: Upload API (`/api/upload`) for RAG content

## External API Integration

### SiliconFlow API Services
Based on `硅基流动请求示例.txt`:
- **Chat**: `api.siliconflow.cn/v1/chat/completions`
- **Images**: `api.siliconflow.cn/v1/images/generations`
- **Embeddings**: `api.siliconflow.cn/v1/embeddings` 
- **Reranking**: `api.siliconflow.cn/v1/rerank`

### Model Mapping
- External model names (defined in admin panel) → Internal SiliconFlow models
- Custom system prompts per external model
- Support for image generation trigger (Chinese "画" character)

## Key Features

### Admin Interface
- Clean, modern UI with responsive design
- First visitor auto-promotion to admin
- AI service configuration (BaseURL, API key, model)
- RAG model setup for embeddings and reranking
- API key generation/revocation (`sk-` format)
- File/text upload for RAG knowledge base
- Conversation limits and system prompt configuration

### API Gateway
- OpenAI-compatible chat completions endpoint
- Custom API key system with user isolation
- RAG-enhanced responses using uploaded content
- Streaming and non-streaming response modes
- Image generation integration
- Conversation history management with configurable limits

### Development Notes
- No testing framework currently configured in the project
- Use `wrangler dev` for local development with live reload
- Configuration stored in KV namespace, content in D1/R2
- UI emphasizes clean, modern aesthetics per requirements
- All sensitive data isolated by API key for multi-user support