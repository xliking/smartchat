var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/nanoid/index.browser.js
var nanoid = /* @__PURE__ */ __name((size = 21) => crypto.getRandomValues(new Uint8Array(size)).reduce((id, byte) => {
    byte &= 63;
    if (byte < 36) {
        id += byte.toString(36);
    } else if (byte < 62) {
        id += (byte - 26).toString(36).toUpperCase();
    } else if (byte > 62) {
        id += "-";
    } else {
        id += "_";
    }
    return id;
}, ""), "nanoid");

// worker.js
var worker_default = {
    async fetch(request, env, ctx) {
        return await handleRequest(request, env);
    }
};
async function handleRequest(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
    if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }
    try {
        if (path === "/api/setup") {
            return handleSetup(request, env, corsHeaders);
        }
        if (path === "/api/login") {
            return handleLogin(request, env, corsHeaders);
        }
        if (path === "/api/config") {
            return handleConfig(request, env, corsHeaders);
        }
        if (path === "/api/upload") {
            return handleUpload(request, env, corsHeaders);
        }
        if (path === "/api/files") {
            return handleFiles(request, env, corsHeaders);
        }
        if (path.startsWith("/api/files/") && request.method === "DELETE") {
            return handleDeleteFile(request, env, corsHeaders);
        }
        if (path.startsWith("/api/files/") && request.method === "GET") {
            return handleGetFile(request, env, corsHeaders);
        }
        if (path === "/api/keys") {
            return handleKeys(request, env, corsHeaders);
        }
        if (path === "/api/models") {
            return handleModels(request, env, corsHeaders);
        }
        if (path === "/api/fetch-models") {
            return handleFetchModels(request, env, corsHeaders);
        }
        if (path === "/api/ai-config") {
            return handleAiConfig(request, env, corsHeaders);
        }
        if (path === "/api/rag-config") {
            return handleRagConfig(request, env, corsHeaders);
        }
        if (path === "/api/ai-model-config") {
            return handleAiModelConfig(request, env, corsHeaders);
        }
        if (path === "/api/statistics") {
            return handleStatistics(request, env, corsHeaders);
        }
        if (path.startsWith("/api/notion/")) {
            return handleNotion(request, env, corsHeaders, path);
        }
        if (path === "/v1/chat/completions") {
            return handleChatCompletions(request, env, corsHeaders);
        }
        if (path === "/v1/models") {
            return handleV1Models(request, env, corsHeaders);
        }
        return new Response("API Not Found", { status: 404, headers: corsHeaders });
    } catch (error) {
        console.error("Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
}
__name(handleRequest, "handleRequest");
async function handleSetup(request, env, corsHeaders) {
    const headers = { ...corsHeaders, "Content-Type": "application/json" };
    if (request.method === "GET") {
        const adminPassword = await env.AI_KV.get("ADMIN_PASSWORD");
        return new Response(JSON.stringify({
            initialized: !!adminPassword
        }), { headers });
    }
    if (request.method === "POST") {
        const existingPassword = await env.AI_KV.get("ADMIN_PASSWORD");
        if (existingPassword) {
            return new Response(JSON.stringify({ error: "\u7CFB\u7EDF\u5DF2\u521D\u59CB\u5316" }), {
                status: 400,
                headers
            });
        }
        const { password, aiConfig, ragConfig } = await request.json();
        await env.AI_KV.put("ADMIN_PASSWORD", await hashPassword(password));
        await env.AI_KV.put("AI_CONFIG", JSON.stringify(aiConfig));
        await env.AI_KV.put("RAG_CONFIG", JSON.stringify(ragConfig));
        const adminToken = generateToken();
        await env.AI_KV.put("ADMIN_TOKEN", adminToken, { expirationTtl: 86400 * 7 });
        const firstApiKey = "sk-" + nanoid(32);
        await env.AI_KV.put("API_KEYS", JSON.stringify([{
            key: firstApiKey,
            created: (/* @__PURE__ */ new Date()).toISOString(),
            active: true
        }]));
        await initializeDatabase(env);
        return new Response(JSON.stringify({
            success: true,
            token: adminToken,
            apiKey: firstApiKey
        }), { headers });
    }
}
__name(handleSetup, "handleSetup");
async function handleLogin(request, env, corsHeaders) {
    const headers = { ...corsHeaders, "Content-Type": "application/json" };
    if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405, headers });
    }
    const { password } = await request.json();
    const adminPassword = await env.AI_KV.get("ADMIN_PASSWORD");
    if (!adminPassword || !await verifyPassword(password, adminPassword)) {
        return new Response(JSON.stringify({ error: "\u5BC6\u7801\u9519\u8BEF" }), {
            status: 401,
            headers
        });
    }
    const adminToken = generateToken();
    await env.AI_KV.put("ADMIN_TOKEN", adminToken, { expirationTtl: 86400 * 7 });
    return new Response(JSON.stringify({
        success: true,
        token: adminToken
    }), { headers });
}
__name(handleLogin, "handleLogin");
async function handleConfig(request, env, corsHeaders) {
    const headers = { ...corsHeaders, "Content-Type": "application/json" };
    if (!await verifyAdmin(request, env)) {
        return new Response(JSON.stringify({ error: "\u672A\u6388\u6743" }), {
            status: 401,
            headers
        });
    }
    if (request.method === "GET") {
        const config = await env.AI_KV.get("SYSTEM_CONFIG");
        return new Response(config || "{}", { headers });
    }
    if (request.method === "POST") {
        const config = await request.json();
        await env.AI_KV.put("SYSTEM_CONFIG", JSON.stringify(config));
        return new Response(JSON.stringify({ success: true }), { headers });
    }
}
__name(handleConfig, "handleConfig");
async function handleKeys(request, env, corsHeaders) {
    const headers = { ...corsHeaders, "Content-Type": "application/json" };
    if (!await verifyAdmin(request, env)) {
        return new Response(JSON.stringify({ error: "\u672A\u6388\u6743" }), {
            status: 401,
            headers
        });
    }
    if (request.method === "GET") {
        const keysData = await env.AI_KV.get("API_KEYS");
        const keys = keysData ? JSON.parse(keysData) : [];
        return new Response(JSON.stringify(keys.filter((k) => k.active)), { headers });
    }
    if (request.method === "POST") {
        const newKey = "sk-" + nanoid(32);
        const keysData = await env.AI_KV.get("API_KEYS");
        const keys = keysData ? JSON.parse(keysData) : [];
        keys.push({
            key: newKey,
            created: (/* @__PURE__ */ new Date()).toISOString(),
            active: true
        });
        await env.AI_KV.put("API_KEYS", JSON.stringify(keys));
        return new Response(JSON.stringify({ apiKey: newKey }), { headers });
    }
    if (request.method === "DELETE") {
        const { key } = await request.json();
        const keysData = await env.AI_KV.get("API_KEYS");
        const keys = keysData ? JSON.parse(keysData) : [];
        const updatedKeys = keys.map(
            (k) => k.key === key ? { ...k, active: false } : k
        );
        await env.AI_KV.put("API_KEYS", JSON.stringify(updatedKeys));
        return new Response(JSON.stringify({ success: true }), { headers });
    }
}
__name(handleKeys, "handleKeys");
async function handleUpload(request, env, corsHeaders) {
    const headers = { ...corsHeaders, "Content-Type": "application/json" };
    if (!await verifyAdmin(request, env)) {
        return new Response(JSON.stringify({ error: "\u672A\u6388\u6743" }), {
            status: 401,
            headers
        });
    }
    const contentType = request.headers.get("content-type");
    let fileId = nanoid();
    let fileName, fileType, content;
    if (contentType && contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        const file = formData.get("file");
        if (!file) {
            return new Response(JSON.stringify({ error: "\u6CA1\u6709\u6587\u4EF6" }), {
                status: 400,
                headers
            });
        }
        fileName = file.name;
        fileType = "file";
        content = await file.arrayBuffer();
        await env.AI_R2.put(`files/${fileId}`, content);
    } else {
        const { text } = await request.json();
        fileName = `text_${fileId}.txt`;
        fileType = "text";
        content = text;
        await env.AI_R2.put(`files/${fileId}`, content);
    }
    const embedding = await getEmbedding(
        fileType === "text" ? content : fileName,
        env
    );
    await env.AI_DB.prepare(`
    INSERT INTO files (id, name, type, content, embedding, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
        fileId,
        fileName,
        fileType,
        fileType === "text" ? content : "",
        JSON.stringify(embedding),
        (/* @__PURE__ */ new Date()).toISOString()
    ).run();
    return new Response(JSON.stringify({
        success: true,
        fileId
    }), { headers });
}
__name(handleUpload, "handleUpload");
async function handleFiles(request, env, corsHeaders) {
    const headers = { ...corsHeaders, "Content-Type": "application/json" };
    if (!await verifyAdmin(request, env)) {
        return new Response(JSON.stringify({ error: "\u672A\u6388\u6743" }), {
            status: 401,
            headers
        });
    }
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page")) || 1;
    const limit = parseInt(url.searchParams.get("limit")) || 10;
    const offset = (page - 1) * limit;
    const totalQuery = await env.AI_DB.prepare(`SELECT COUNT(*) as total FROM files`).first();
    const result = await env.AI_DB.prepare(`
    SELECT id, name, type, created_at as created
    FROM files
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all();
    const response = {
        files: result.results,
        pagination: {
            page,
            limit,
            total: totalQuery.total,
            totalPages: Math.ceil(totalQuery.total / limit),
            hasNext: page < Math.ceil(totalQuery.total / limit),
            hasPrev: page > 1
        }
    };
    return new Response(JSON.stringify(response), { headers });
}
__name(handleFiles, "handleFiles");
async function handleAiConfig(request, env, corsHeaders) {
    const headers = { ...corsHeaders, "Content-Type": "application/json" };
    if (!await verifyAdmin(request, env)) {
        return new Response(JSON.stringify({ error: "\u672A\u6388\u6743" }), {
            status: 401,
            headers
        });
    }
    if (request.method === "GET") {
        const configData = await env.AI_KV.get("AI_CONFIG");
        const config = configData ? JSON.parse(configData) : {};
        return new Response(JSON.stringify(config), { headers });
    }
    if (request.method === "POST") {
        const config = await request.json();
        await env.AI_KV.put("AI_CONFIG", JSON.stringify(config));
        return new Response(JSON.stringify({ success: true }), { headers });
    }
    return new Response("Method not allowed", { status: 405, headers });
}
__name(handleAiConfig, "handleAiConfig");
async function handleRagConfig(request, env, corsHeaders) {
    const headers = { ...corsHeaders, "Content-Type": "application/json" };
    if (!await verifyAdmin(request, env)) {
        return new Response(JSON.stringify({ error: "\u672A\u6388\u6743" }), {
            status: 401,
            headers
        });
    }
    if (request.method === "GET") {
        const configData = await env.AI_KV.get("RAG_CONFIG");
        const config = configData ? JSON.parse(configData) : {};
        return new Response(JSON.stringify(config), { headers });
    }
    if (request.method === "POST") {
        const config = await request.json();
        await env.AI_KV.put("RAG_CONFIG", JSON.stringify(config));
        return new Response(JSON.stringify({ success: true }), { headers });
    }
    return new Response("Method not allowed", { status: 405, headers });
}
__name(handleRagConfig, "handleRagConfig");
async function handleAiModelConfig(request, env, corsHeaders) {
    const headers = { ...corsHeaders, "Content-Type": "application/json" };
    if (!await verifyAdmin(request, env)) {
        return new Response(JSON.stringify({ error: "\u672A\u6388\u6743" }), {
            status: 401,
            headers
        });
    }
    if (request.method === "GET") {
        const configData = await env.AI_KV.get("AI_MODEL_CONFIG");
        const config = configData ? JSON.parse(configData) : { selectedModels: [], baseUrl: "" };
        return new Response(JSON.stringify(config), { headers });
    }
    if (request.method === "POST") {
        const config = await request.json();
        await env.AI_KV.put("AI_MODEL_CONFIG", JSON.stringify(config));
        return new Response(JSON.stringify({ success: true }), { headers });
    }
    return new Response("Method not allowed", { status: 405, headers });
}
__name(handleAiModelConfig, "handleAiModelConfig");
async function handleStatistics(request, env, corsHeaders) {
    const headers = { ...corsHeaders, "Content-Type": "application/json" };
    if (!await verifyAdmin(request, env)) {
        return new Response(JSON.stringify({ error: "\u672A\u6388\u6743" }), {
            status: 401,
            headers
        });
    }
    if (request.method === "GET") {
        try {
            const statsQuery = await env.AI_DB.prepare(`
        SELECT 
          COUNT(*) as total_files,
          COUNT(CASE WHEN type = 'text' THEN 1 END) as text_files,
          COUNT(CASE WHEN type = 'file' THEN 1 END) as uploaded_files,
          SUM(CASE WHEN type = 'text' AND content IS NOT NULL THEN LENGTH(content) ELSE 0 END) as text_storage,
          COUNT(*) as total_uploads
        FROM files
      `).first();
      
            // 获取R2文件存储大小
            let fileStorageSize = 0;
            try {
                const r2Objects = await env.AI_FILES.list();
                fileStorageSize = r2Objects.objects.reduce((total, obj) => total + (obj.size || 0), 0);
            } catch (e) {
                console.log("Unable to get R2 storage size:", e.message);
            }
            const recentFilesQuery = await env.AI_DB.prepare(`
        SELECT id, name, type, created_at
        FROM files 
        ORDER BY created_at DESC 
        LIMIT 5
      `).all();
            const apiKeysCount = await env.AI_KV.list({ prefix: "API_KEY_" });
            let totalRequestsQuery = { total_requests: 0 };
            try {
                totalRequestsQuery = await env.AI_DB.prepare(`
          SELECT COUNT(*) as total_requests FROM api_usage
        `).first();
            } catch (e) {
                console.log("API usage table not found, using default value");
            }
            const systemStartTime = new Date().toISOString();
            // 计算存储统计
            const textStorageBytes = statsQuery.text_storage || 0;
            const usedStorage = textStorageBytes + fileStorageSize;
            
            // Cloudflare限制：D1数据库1GB，R2存储10GB（免费层）
            const maxDbStorage = 1024 * 1024 * 1024;        // 1GB for D1
            const maxR2Storage = 10 * 1024 * 1024 * 1024;   // 10GB for R2
            const totalAvailableStorage = maxDbStorage + maxR2Storage;
            
            const statistics = {
                totalFiles: statsQuery.total_files || 0,
                textFiles: statsQuery.text_files || 0,
                uploadedFiles: statsQuery.uploaded_files || 0,
                totalUploads: statsQuery.total_uploads || 0,
                textStorage: textStorageBytes,
                fileStorage: fileStorageSize,
                usedStorage: usedStorage,
                totalStorage: totalAvailableStorage,
                storageUsagePercent: Math.round((usedStorage / totalAvailableStorage) * 100 * 100) / 100,
                activeKeys: apiKeysCount.keys.length || 0,
                recentFiles: recentFilesQuery.results || [],
                totalRequests: totalRequestsQuery.total_requests || 0,
                systemStatus: "online",
                lastUpdated: systemStartTime
            };
            return new Response(JSON.stringify(statistics), { headers });
        } catch (error) {
            console.error("Statistics error:", error);
            return new Response(JSON.stringify({ error: "\u83B7\u53D6\u7EDF\u8BA1\u4FE1\u606F\u5931\u8D25" }), {
                status: 500,
                headers
            });
        }
    }
    return new Response("Method not allowed", { status: 405, headers });
}
__name(handleStatistics, "handleStatistics");
async function handleFetchModels(request, env, corsHeaders) {
    const headers = { ...corsHeaders, "Content-Type": "application/json" };
    if (!await verifyAdmin(request, env)) {
        return new Response(JSON.stringify({ error: "未授权" }), {
            status: 401,
            headers
        });
    }
    
    if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers
        });
    }
    
    try {
        const { baseUrl, apiKey } = await request.json();
        
        // Validate inputs
        if (!baseUrl || !apiKey) {
            return new Response(JSON.stringify({ error: "BaseURL和API Key都是必填项" }), {
                status: 400,
                headers
            });
        }
        
        // Fetch models from the AI service
        const response = await fetch(`${baseUrl}/v1/models`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            return new Response(JSON.stringify({ 
                error: `获取模型列表失败: ${response.status} ${response.statusText}`,
                details: errorText
            }), {
                status: response.status,
                headers
            });
        }
        
        const modelsData = await response.json();
        
        // Extract model names from the response
        let models = [];
        if (modelsData.data && Array.isArray(modelsData.data)) {
            models = modelsData.data.map(model => ({
                id: model.id,
                name: model.id,
                object: model.object,
                created: model.created,
                owned_by: model.owned_by
            }));
        }
        
        return new Response(JSON.stringify({ models }), { headers });
    } catch (error) {
        console.error("Fetch models error:", error);
        return new Response(JSON.stringify({ error: "获取模型列表时发生错误: " + error.message }), {
            status: 500,
            headers
        });
    }
}

async function handleModels(request, env, corsHeaders) {
    const headers = { ...corsHeaders, "Content-Type": "application/json" };
    if (!await verifyAdmin(request, env)) {
        return new Response(JSON.stringify({ error: "未授权" }), {
            status: 401,
            headers
        });
    }
    
    if (request.method === "GET") {
        const modelsData = await env.AI_KV.get("models");
        const models = modelsData ? JSON.parse(modelsData) : [];
        return new Response(JSON.stringify(models), { headers });
    }
    
    if (request.method === "POST") {
        const models = await request.json();
        
        // Validate that each model has a unique name
        const modelNames = models.map(model => model.name);
        const uniqueNames = [...new Set(modelNames)];
        if (modelNames.length !== uniqueNames.length) {
            return new Response(JSON.stringify({ error: "模型名称必须唯一" }), {
                status: 400,
                headers
            });
        }
        
        // Validate that each model has required fields
        for (const model of models) {
            if (!model.name) {
                return new Response(JSON.stringify({ error: "模型名称不能为空" }), {
                    status: 400,
                    headers
                });
            }
            // Ensure each model has a selectedRag field (default to false if not provided)
            if (model.selectedRag === undefined) {
                model.selectedRag = false;
            }
        }
        
        await env.AI_KV.put("models", JSON.stringify(models));
        return new Response(JSON.stringify({ success: true }), { headers });
    }
    
    return new Response("Method not allowed", { status: 405, headers });
}
__name(handleModels, "handleModels");
async function handleDeleteFile(request, env, corsHeaders) {
    const headers = { ...corsHeaders, "Content-Type": "application/json" };
    if (!await verifyAdmin(request, env)) {
        return new Response(JSON.stringify({ error: "\u672A\u6388\u6743" }), {
            status: 401,
            headers
        });
    }
    const url = new URL(request.url);
    const fileId = url.pathname.split("/").pop();
    if (!fileId) {
        return new Response(JSON.stringify({ error: "\u6587\u4EF6ID\u4E0D\u80FD\u4E3A\u7A7A" }), {
            status: 400,
            headers
        });
    }
    try {
        const fileResult = await env.AI_DB.prepare(`
      SELECT name, r2_key FROM files WHERE id = ?
    `).bind(fileId).first();
        if (!fileResult) {
            return new Response(JSON.stringify({ error: "\u6587\u4EF6\u4E0D\u5B58\u5728" }), {
                status: 404,
                headers
            });
        }
        if (fileResult.r2_key) {
            await env.AI_R2.delete(fileResult.r2_key);
        }
        const deleteResult = await env.AI_DB.prepare(`
      DELETE FROM files WHERE id = ?
    `).bind(fileId).run();
        if (deleteResult.changes === 0) {
            return new Response(JSON.stringify({ error: "\u6587\u4EF6\u5220\u9664\u5931\u8D25\uFF0C\u6CA1\u6709\u627E\u5230\u5BF9\u5E94\u8BB0\u5F55" }), {
                status: 404,
                headers
            });
        }
        return new Response(JSON.stringify({ success: true, message: "\u6587\u4EF6\u5220\u9664\u6210\u529F" }), { headers });
    } catch (error) {
        console.error("Delete file error:", error);
        return new Response(JSON.stringify({
            error: "\u5220\u9664\u6587\u4EF6\u5931\u8D25\uFF1A" + error.message,
            details: error.toString()
        }), {
            status: 500,
            headers
        });
    }
}
__name(handleDeleteFile, "handleDeleteFile");
async function handleGetFile(request, env, corsHeaders) {
    const headers = { ...corsHeaders, "Content-Type": "application/json" };
    if (!await verifyAdmin(request, env)) {
        return new Response(JSON.stringify({ error: "\u672A\u6388\u6743" }), {
            status: 401,
            headers
        });
    }
    const url = new URL(request.url);
    const fileId = url.pathname.split("/").pop();
    if (!fileId) {
        return new Response(JSON.stringify({ error: "\u6587\u4EF6ID\u4E0D\u80FD\u4E3A\u7A7A" }), {
            status: 400,
            headers
        });
    }
    try {
        const fileResult = await env.AI_DB.prepare(`
      SELECT id, name, type, content, r2_key, created_at FROM files WHERE id = ?
    `).bind(fileId).first();
        if (!fileResult) {
            return new Response(JSON.stringify({ error: "\u6587\u4EF6\u4E0D\u5B58\u5728" }), {
                status: 404,
                headers
            });
        }
        if (fileResult.type === "file" && fileResult.r2_key) {
            try {
                const r2Object = await env.AI_R2.get(fileResult.r2_key);
                if (r2Object) {
                    const content = await r2Object.text();
                    fileResult.content = content;
                }
            } catch (error) {
                console.error("获取R2文件内容失败:", error);
                fileResult.content = "无法获取文件内容";
            }
        }
        return new Response(JSON.stringify(fileResult), { headers });
    } catch (error) {
        console.error("获取文件详情错误:", error);
        return new Response(JSON.stringify({ error: "\u83B7\u53D6\u6587\u4EF6\u5931\u8D25" }), {
            status: 500,
            headers
        });
    }
}
__name(handleGetFile, "handleGetFile");
async function getConfiguration(env) {
    const aiConfigData = await env.AI_KV.get("AI_CONFIG");
    const ragConfigData = await env.AI_KV.get("RAG_CONFIG");
    const systemConfigData = await env.AI_KV.get("SYSTEM_CONFIG");
    
    return {
        ai: aiConfigData ? JSON.parse(aiConfigData) : {},
        rag: ragConfigData ? JSON.parse(ragConfigData) : {},
        system: systemConfigData ? JSON.parse(systemConfigData) : {}
    };
}

async function handleV1Models(request, env, corsHeaders) {
    const headers = { ...corsHeaders, "Content-Type": "application/json" };
    if (request.method !== "GET") {
        return new Response("Method not allowed", { status: 405, headers });
    }
    const apiKey = extractApiKey(request);
    if (!apiKey || !await verifyApiKey(apiKey, env)) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
            status: 401,
            headers
        });
    }
    try {
        // Get custom models from KV store
        const modelsData = await env.AI_KV.get("models");
        const customModels = modelsData ? JSON.parse(modelsData) : [];
        
        const models = [];
        if (customModels.length > 0) {
            // Use custom models if available
            customModels.forEach(model => {
                models.push({
                    id: model.name,
                    object: "model",
                    created: Math.floor(Date.now() / 1000),
                    owned_by: "ai-gateway",
                    permission: [],
                    root: model.name,
                    parent: null
                });
            });
        } 
        // If no custom models, return empty list instead of default gpt-3.5-turbo
        return new Response(JSON.stringify({
            object: "list",
            data: models
        }), { headers });
    } catch (error) {
        console.error("Models API error:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers
        });
    }
}
__name(handleV1Models, "handleV1Models");
async function handleChatCompletions(request, env, corsHeaders) {
    const headers = { ...corsHeaders, "Content-Type": "application/json" };
    if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405, headers });
    }
    const apiKey = extractApiKey(request);
    if (!apiKey || !await verifyApiKey(apiKey, env)) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
            status: 401,
            headers
        });
    }
    const requestData = await request.json();
    const { messages, stream = false, model: requestModel } = requestData;
    const systemConfigData = await env.AI_KV.get("SYSTEM_CONFIG");
    const systemConfig = systemConfigData ? JSON.parse(systemConfigData) : {};
    const maxMessages = systemConfig.maxMessages || 20;
    const enableImage = systemConfig.enableImage || false;
    const modelsData = await env.AI_KV.get("models");
    const models = modelsData ? JSON.parse(modelsData) : [];
    const modelConfig = models.find((m) => m.name === requestModel);
    const modelSystemPrompt = modelConfig ? modelConfig.systemPrompt : "";
    let limitedMessages = [...messages];
    
    // Limit message content length to prevent timeout
    const MAX_CONTENT_LENGTH = systemConfig.maxContentLength || 50000;
    limitedMessages = limitedMessages.map(msg => {
        if (msg.content && msg.content.length > MAX_CONTENT_LENGTH) {
            return {
                ...msg,
                content: msg.content.substring(0, MAX_CONTENT_LENGTH) + "\n[内容已截断]"
            };
        }
        return msg;
    });
    
    const systemMessages = limitedMessages.filter((m) => m.role === "system");
    const otherMessages = limitedMessages.filter((m) => m.role !== "system");
    if (otherMessages.length > maxMessages) {
        limitedMessages = [
            ...systemMessages,
            ...otherMessages.slice(-maxMessages)
        ];
    }
    
    // Calculate total content length
    const totalLength = limitedMessages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
    console.log(`📊 对话总长度: ${totalLength} 字符, 消息数: ${limitedMessages.length}`);
    
    // If still too long, further reduce messages
    const MAX_TOTAL_LENGTH = systemConfig.maxTotalLength || 200000;
    if (totalLength > MAX_TOTAL_LENGTH) {
        console.log("⚠️ 对话过长，进一步缩减消息数量");
        const reduceRatio = systemConfig.reduceRatio || 0.5;
        const reducedMessages = Math.max(5, Math.floor(maxMessages * reduceRatio));
        limitedMessages = [
            ...systemMessages,
            ...otherMessages.slice(-reducedMessages)
        ];
    }
    const lastMessage = limitedMessages[limitedMessages.length - 1];
    if (enableImage && lastMessage.content.startsWith("\u753B")) {
        return await handleImageGeneration(lastMessage.content, env, stream, headers);
    }
    
    // Store user message for potential Notion workflow
    const userMessage = lastMessage.content;
    
    // Check if RAG is enabled for this model
    const isRagEnabled = modelConfig ? modelConfig.selectedRag === true : false;
    let ragContext = null;
    
    if (isRagEnabled) {
        ragContext = await performRAG(lastMessage.content, env);
        console.log("🤖 RAG上下文结果:", ragContext ? `获取到${ragContext.length}字符` : "无结果");
        if (ragContext) {
            console.log("📝 RAG上下文内容预览:", ragContext.substring(0, 200) + (ragContext.length > 200 ? "..." : ""));
            const contextMessage = {
                role: "system",
                content: `\u76F8\u5173\u53C2\u8003\u4FE1\u606F\uFF1A
${ragContext}`
            };
            limitedMessages.unshift(contextMessage);
            console.log("✅ RAG上下文已添加到消息中");
        } else {
            console.log("❌ 未获取到RAG上下文，将不使用知识库信息");
        }
    } else {
        console.log("🚫 此模型未启用RAG功能");
    }
    const systemPrompt = modelSystemPrompt || systemConfig.systemPrompt;
    if (systemPrompt) {
        limitedMessages.unshift({
            role: "system",
            content: systemPrompt
        });
    }
    const aiConfigData = await env.AI_KV.get("AI_CONFIG");
    const aiConfig = JSON.parse(aiConfigData);
    
    // If model has bound AI models, use the first one
    let aiModel = aiConfig.model;
    if (modelConfig && modelConfig.boundModels && modelConfig.boundModels.length > 0) {
        aiModel = modelConfig.boundModels[0]; // 使用第一个绑定的模型
    }
    
    try {
        const aiResponse = await fetch(`${aiConfig.baseurl}/v1/chat/completions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${aiConfig.apikey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: aiModel, // 使用绑定的模型或默认模型
                messages: limitedMessages,
                stream
            }),
            // Add timeout for long requests
            signal: AbortSignal.timeout(systemConfig.requestTimeout || 300000)
        });
        await saveConversation(apiKey, limitedMessages, env);
        if (stream) {
            // Check if the response is OK before streaming
            if (!aiResponse.ok) {
                throw new Error(`AI API error: ${aiResponse.status} ${aiResponse.statusText}`);
            }
            
            // Create a simple transform stream to collect content while streaming
            const { readable, writable } = new TransformStream();
            const writer = writable.getWriter();
            
            let fullContent = "";
            let buffer = "";
            
            (async () => {
                try {
                    const reader = aiResponse.body.getReader();
                    
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        
                        // Pass through to client immediately
                        await writer.write(value);
                        
                        // Extract content for Notion - use buffer for reliable parsing
                        try {
                            const chunk = new TextDecoder().decode(value);
                            buffer += chunk;
                            const lines = buffer.split('\n');
                            buffer = lines.pop() || "";
                            
                            for (const line of lines) {
                                if (line.trim().startsWith('data: ') && !line.includes('[DONE]')) {
                                    try {
                                        const jsonStr = line.slice(6).trim();
                                        if (jsonStr && jsonStr !== '' && jsonStr !== '{}') {
                                            const data = JSON.parse(jsonStr);
                                            if (data.choices?.[0]?.delta?.content) {
                                                fullContent += data.choices[0].delta.content;
                                            }
                                        }
                                    } catch (parseError) {
                                        // Silently skip malformed JSON
                                    }
                                }
                            }
                        } catch (chunkError) {
                            console.log("数据块处理错误:", chunkError.message);
                        }
                    }
                    
                    // Process any remaining data in buffer
                    if (buffer.trim().startsWith('data: ') && !buffer.includes('[DONE]')) {
                        try {
                            const jsonStr = buffer.slice(6).trim();
                            if (jsonStr && jsonStr !== '' && jsonStr !== '{}') {
                                const data = JSON.parse(jsonStr);
                                if (data.choices?.[0]?.delta?.content) {
                                    fullContent += data.choices[0].delta.content;
                                }
                            }
                        } catch (e) {
                            // Ignore final buffer errors
                        }
                    }
                    
                    // Stream finished, trigger Notion workflow if needed
                    if (userMessage.includes('创建') || userMessage.includes('新建') || userMessage.includes('记录')) {
                        console.log("🔍 流式完成，触发 Notion 工作流");
                        console.log("📝 收集到的内容长度:", fullContent.length);
                        console.log("📝 内容前200字符:", fullContent.substring(0, 200));
                        console.log("📝 内容后200字符:", fullContent.substring(Math.max(0, fullContent.length - 200)));
                        
                        if (fullContent.length > 10) {
                            await checkNotionWorkflowTriggers(userMessage, env, apiKey, fullContent);
                        } else {
                            console.log("⚠️ 内容太短，使用用户消息创建基础页面");
                            await checkNotionWorkflowTriggers(userMessage, env, apiKey, null);
                        }
                    }
                    
                } catch (error) {
                    console.error("Stream processing error:", error);
                } finally {
                    await writer.close();
                }
            })();
            
            return new Response(readable, {
                headers: {
                    ...corsHeaders,
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive"
                }
            });
        } else {
            const result = await aiResponse.json();
            
            // Check Notion workflow triggers after AI response for non-streaming
            if (result.choices && result.choices[0] && result.choices[0].message) {
                const aiContent = result.choices[0].message.content;
                console.log("🔍 检查 Notion 工作流触发器，用户消息:", userMessage);
                await checkNotionWorkflowTriggers(userMessage, env, apiKey, aiContent);
            }
            
            return new Response(JSON.stringify(result), { headers });
        }
    } catch (error) {
        console.error("AI service error:", error);
        
        // If this is a streaming request and we get an error, return a stream with error
        if (stream) {
            const errorStream = new ReadableStream({
                start(controller) {
                    const errorData = `data: ${JSON.stringify({
                        error: "AI service error: " + error.message,
                        type: "error"
                    })}\n\n`;
                    controller.enqueue(new TextEncoder().encode(errorData));
                    controller.close();
                }
            });
            
            return new Response(errorStream, {
                headers: {
                    ...corsHeaders,
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache"
                }
            });
        }
        
        return new Response(JSON.stringify({
            error: "AI service error: " + error.message
        }), { status: 500, headers });
    }
}
__name(handleChatCompletions, "handleChatCompletions");
async function handleImageGeneration(prompt, env, stream, headers) {
    const aiConfigData = await env.AI_KV.get("AI_CONFIG");
    const aiConfig = JSON.parse(aiConfigData);
    const imagePrompt = prompt.substring(1).trim();
    try {
        const response = await fetch(`${aiConfig.baseurl}/v1/images/generations`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${aiConfig.apikey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "Kwai-Kolors/Kolors",
                prompt: imagePrompt,
                image_size: "1024x1024",
                batch_size: 1
            })
        });
        const result = await response.json();
        const chatResponse = {
            id: "img-" + nanoid(),
            object: "chat.completion",
            created: Math.floor(Date.now() / 1e3),
            model: "image-generator",
            choices: [{
                index: 0,
                message: {
                    role: "assistant",
                    content: `\u6211\u4E3A\u60A8\u751F\u6210\u4E86\u56FE\u7247\uFF1A
![\u751F\u6210\u7684\u56FE\u7247](${result.images[0].url})`
                },
                finish_reason: "stop"
            }]
        };
        return new Response(JSON.stringify(chatResponse), { headers });
    } catch (error) {
        return new Response(JSON.stringify({
            error: "Image generation error: " + error.message
        }), { status: 500, headers });
    }
}
__name(handleImageGeneration, "handleImageGeneration");
async function performRAG(query, env) {
    console.log("🔍 RAG检索开始, 查询:", query);
    try {
        const queryEmbedding = await getEmbedding(query, env);
        console.log("✅ 查询embedding生成成功, 维度:", queryEmbedding.length);
        
        const files = await env.AI_DB.prepare(`
      SELECT id, name, content, embedding
      FROM files
      ORDER BY created_at DESC
      LIMIT 50
    `).all();
        
        console.log("📁 数据库文件数量:", files.results.length);
        if (!files.results.length) {
            console.log("❌ 数据库中没有文件");
            return null;
        }
        
        const similarities = files.results.map((file) => {
            const embedding = JSON.parse(file.embedding);
            const similarity = cosineSimilarity(queryEmbedding, embedding);
            console.log(`📄 文件 ${file.name} 相似度: ${similarity.toFixed(4)}`);
            return { ...file, similarity };
        }).sort((a, b) => b.similarity - a.similarity);
        
        console.log("🔝 最高相似度:", similarities[0]?.similarity?.toFixed(4));
        
        const topDocs = similarities.slice(0, 3).filter((doc) => doc.similarity > 0.7);
        console.log("✨ 筛选后文档数量 (阈值0.7):", topDocs.length);
        
        if (!topDocs.length) {
            console.log("❌ 没有文档超过相似度阈值0.7");
            // 降低阈值重试
            const lowThresholdDocs = similarities.slice(0, 3).filter((doc) => doc.similarity > 0.3);
            console.log("🔄 降低阈值到0.3, 文档数量:", lowThresholdDocs.length);
            if (!lowThresholdDocs.length) {
                return null;
            }
            console.log("📄 低阈值文档内容预览:");
            lowThresholdDocs.forEach((doc, i) => {
                console.log(`  ${i+1}. ${doc.name}: "${doc.content.substring(0, 100)}${doc.content.length > 100 ? '...' : ''}" (${doc.content.length}字符)`);
            });
            const rerankedDocs = await rerank(query, lowThresholdDocs.map((doc) => doc.content), env);
            console.log("🎯 RAG检索完成, 返回内容长度:", rerankedDocs.slice(0, 2).join("\n\n").length);
            return rerankedDocs.slice(0, 2).join("\n\n");
        }
        
        console.log("📄 高阈值文档内容预览:");
        topDocs.forEach((doc, i) => {
            console.log(`  ${i+1}. ${doc.name}: "${doc.content.substring(0, 100)}${doc.content.length > 100 ? '...' : ''}" (${doc.content.length}字符)`);
        });
        const rerankedDocs = await rerank(query, topDocs.map((doc) => doc.content), env);
        console.log("🎯 RAG检索完成, 返回内容长度:", rerankedDocs.slice(0, 2).join("\n\n").length);
        return rerankedDocs.slice(0, 2).join("\n\n");
    } catch (error) {
        console.error("❌ RAG检索错误:", error);
        return null;
    }
}
__name(performRAG, "performRAG");
async function getEmbedding(text, env) {
    const ragConfigData = await env.AI_KV.get("RAG_CONFIG");
    const ragConfig = JSON.parse(ragConfigData);
    const response = await fetch(`${ragConfig.baseurl}/v1/embeddings`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${ragConfig.apikey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: ragConfig.model,
            input: text
        })
    });
    const result = await response.json();
    return result.data[0].embedding;
}
__name(getEmbedding, "getEmbedding");
async function rerank(query, documents, env) {
    const ragConfigData = await env.AI_KV.get("RAG_CONFIG");
    const ragConfig = JSON.parse(ragConfigData);
    console.log("🔄 开始rerank, 文档数量:", documents.length);
    try {
        console.log("📤 Rerank请求参数:", JSON.stringify({
            model: ragConfig.rerankModel || "BAAI/bge-reranker-v2-m3",
            query,
            documents: documents.slice(0, 2) // 只显示前2个文档预览
        }, null, 2));
        
        const response = await fetch(`${ragConfig.baseurl}/v1/rerank`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${ragConfig.apikey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: ragConfig.rerankModel || "BAAI/bge-reranker-v2-m3",
                query,
                documents
            })
        });
        
        console.log("📡 Rerank API响应状态:", response.status, response.statusText);
        const result = await response.json();
        console.log("📊 Rerank API响应:", JSON.stringify(result, null, 2));
        
        if (!result || !result.results || !Array.isArray(result.results)) {
            console.error("❌ Rerank API返回格式错误，直接返回原文档");
            return documents;
        }
        
        const rerankedDocs = result.results
            .sort((a, b) => b.relevance_score - a.relevance_score)
            .map((item) => documents[item.index]);
        console.log("✅ Rerank完成，重排序后文档数量:", rerankedDocs.length);
        return rerankedDocs;
    } catch (error) {
        console.error("❌ Rerank错误:", error);
        console.log("🔄 Rerank失败，返回原始文档");
        return documents;
    }
}
__name(rerank, "rerank");
async function saveConversation(apiKey, messages, env) {
    try {
        const existingData = await env.AI_KV.get(`CONV_${apiKey}`);
        const conversations = existingData ? JSON.parse(existingData) : [];
        const newMessages = messages.filter((m) => m.role !== "system");
        conversations.push(...newMessages);
        await env.AI_KV.put(`CONV_${apiKey}`, JSON.stringify(conversations));
    } catch (error) {
        console.error("Save conversation error:", error);
    }
}
__name(saveConversation, "saveConversation");
async function initializeDatabase(env) {
    await env.AI_DB.prepare(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT,
      embedding TEXT,
      created_at TEXT NOT NULL
    )
  `).run();
}
__name(initializeDatabase, "initializeDatabase");
function generateToken() {
    return nanoid(32);
}
__name(generateToken, "generateToken");
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashPassword, "hashPassword");
async function verifyPassword(password, hash) {
    const hashedPassword = await hashPassword(password);
    return hashedPassword === hash;
}
__name(verifyPassword, "verifyPassword");
async function verifyAdmin(request, env) {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return false;
    const adminToken = await env.AI_KV.get("ADMIN_TOKEN");
    return token === adminToken;
}
__name(verifyAdmin, "verifyAdmin");
function extractApiKey(request) {
    const auth = request.headers.get("Authorization");
    return auth?.replace("Bearer ", "");
}
__name(extractApiKey, "extractApiKey");
async function verifyApiKey(key, env) {
    const keysData = await env.AI_KV.get("API_KEYS");
    if (!keysData) return false;
    const keys = JSON.parse(keysData);
    return keys.some((k) => k.key === key && k.active);
}
__name(verifyApiKey, "verifyApiKey");
function cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
__name(cosineSimilarity, "cosineSimilarity");

// =============================================================================
// Notion MCP Integration Handlers
// =============================================================================

async function handleNotion(request, env, corsHeaders, path) {
    const headers = { ...corsHeaders, "Content-Type": "application/json" };
    
    if (!await verifyAdmin(request, env)) {
        return new Response(JSON.stringify({ error: "未授权" }), {
            status: 401,
            headers
        });
    }

    const pathSegment = path.replace("/api/notion/", "");

    try {
        switch (pathSegment) {
            case "connect":
                return handleNotionConnect(request, env, headers);
            case "disconnect":
                return handleNotionDisconnect(request, env, headers);
            case "databases":
                return handleNotionDatabases(request, env, headers);
            case "pages":
                return handleNotionPages(request, env, headers);
            case "sync-all":
                return handleNotionSyncAll(request, env, headers);
            case "check-updates":
                return handleNotionCheckUpdates(request, env, headers);
            case "status":
                return handleNotionStatus(request, env, headers);
            case "fix-embeddings":
                return handleFixEmbeddings(request, env, headers);
            case "save-sync-settings":
                return handleSaveSyncSettings(request, env, headers);
            case "save-workflow-settings":
                return handleSaveWorkflowSettings(request, env, headers);
            case "get-sync-settings":
                return handleGetSyncSettings(request, env, headers);
            case "get-workflow-settings":
                return handleGetWorkflowSettings(request, env, headers);
            default:
                return new Response(JSON.stringify({ error: "Notion API endpoint not found" }), {
                    status: 404,
                    headers
                });
        }
    } catch (error) {
        console.error("Notion API error:", error);
        return new Response(JSON.stringify({ error: "Notion服务错误" }), {
            status: 500,
            headers
        });
    }
}
__name(handleNotion, "handleNotion");

async function handleNotionConnect(request, env, headers) {
    if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers
        });
    }

    try {
        const { token } = await request.json();
        
        if (!token || !(token.startsWith('secret_') || token.startsWith('ntn_'))) {
            return new Response(JSON.stringify({ error: "无效的Notion Integration Token" }), {
                status: 400,
                headers
            });
        }

        // Test the token by fetching user info
        const testResponse = await fetch('https://api.notion.com/v1/users/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Notion-Version': '2022-06-28'
            }
        });

        if (!testResponse.ok) {
            return new Response(JSON.stringify({ error: "Token验证失败，请检查Token是否正确" }), {
                status: 400,
                headers
            });
        }

        const userInfo = await testResponse.json();

        // Store the token in KV
        await env.AI_KV.put("NOTION_TOKEN", token);
        await env.AI_KV.put("NOTION_USER", JSON.stringify(userInfo));

        return new Response(JSON.stringify({ 
            success: true, 
            user: userInfo,
            message: "Notion连接成功" 
        }), { headers });

    } catch (error) {
        console.error("Notion connect error:", error);
        return new Response(JSON.stringify({ error: "连接过程中发生错误" }), {
            status: 500,
            headers
        });
    }
}
__name(handleNotionConnect, "handleNotionConnect");

async function handleNotionDisconnect(request, env, headers) {
    if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers
        });
    }

    try {
        // Remove stored token and user info
        await env.AI_KV.delete("NOTION_TOKEN");
        await env.AI_KV.delete("NOTION_USER");
        await env.AI_KV.delete("NOTION_DATABASES");
        await env.AI_KV.delete("NOTION_PAGES");

        return new Response(JSON.stringify({ 
            success: true,
            message: "已断开Notion连接" 
        }), { headers });

    } catch (error) {
        console.error("Notion disconnect error:", error);
        return new Response(JSON.stringify({ error: "断开连接时发生错误" }), {
            status: 500,
            headers
        });
    }
}
__name(handleNotionDisconnect, "handleNotionDisconnect");

async function handleNotionDatabases(request, env, headers) {
    if (request.method !== "GET") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers
        });
    }

    try {
        const token = await env.AI_KV.get("NOTION_TOKEN");
        
        if (!token) {
            return new Response(JSON.stringify({ error: "未连接Notion" }), {
                status: 400,
                headers
            });
        }

        // Fetch databases from Notion API
        const response = await fetch('https://api.notion.com/v1/search', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filter: {
                    value: "database",
                    property: "object"
                }
            })
        });

        if (!response.ok) {
            throw new Error("获取数据库列表失败");
        }

        const data = await response.json();
        const databases = data.results.map(db => ({
            id: db.id,
            title: db.title?.[0]?.plain_text || "无标题数据库",
            url: db.url,
            created_time: db.created_time,
            last_edited_time: db.last_edited_time
        }));

        // Cache databases
        await env.AI_KV.put("NOTION_DATABASES", JSON.stringify(databases));

        return new Response(JSON.stringify({ databases }), { headers });

    } catch (error) {
        console.error("Notion databases error:", error);
        return new Response(JSON.stringify({ error: "获取数据库列表失败" }), {
            status: 500,
            headers
        });
    }
}
__name(handleNotionDatabases, "handleNotionDatabases");

async function handleNotionPages(request, env, headers) {
    if (request.method !== "GET") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers
        });
    }

    try {
        const token = await env.AI_KV.get("NOTION_TOKEN");
        
        if (!token) {
            return new Response(JSON.stringify({ error: "未连接Notion" }), {
                status: 400,
                headers
            });
        }

        // Fetch pages from Notion API
        const response = await fetch('https://api.notion.com/v1/search', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filter: {
                    value: "page",
                    property: "object"
                },
                page_size: 100
            })
        });

        if (!response.ok) {
            throw new Error("获取页面列表失败");
        }

        const data = await response.json();
        const pages = data.results.map(page => ({
            id: page.id,
            title: extractPageTitle(page),
            url: page.url,
            created_time: page.created_time,
            last_edited_time: page.last_edited_time,
            parent: page.parent
        }));

        // Cache pages
        await env.AI_KV.put("NOTION_PAGES", JSON.stringify(pages));

        return new Response(JSON.stringify({ pages }), { headers });

    } catch (error) {
        console.error("Notion pages error:", error);
        return new Response(JSON.stringify({ error: "获取页面列表失败" }), {
            status: 500,
            headers
        });
    }
}
__name(handleNotionPages, "handleNotionPages");

async function handleNotionSyncAll(request, env, headers) {
    if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers
        });
    }

    try {
        const token = await env.AI_KV.get("NOTION_TOKEN");
        
        if (!token) {
            return new Response(JSON.stringify({ error: "未连接Notion" }), {
                status: 400,
                headers
            });
        }

        // Get cached pages
        const pagesData = await env.AI_KV.get("NOTION_PAGES");
        const pages = pagesData ? JSON.parse(pagesData) : [];

        let syncedCount = 0;

        // Sync each page to RAG system
        for (const page of pages) {
            try {
                // Fetch page content
                const contentResponse = await fetch(`https://api.notion.com/v1/blocks/${page.id}/children`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Notion-Version': '2022-06-28'
                    }
                });

                if (contentResponse.ok) {
                    const contentData = await contentResponse.json();
                    const content = extractPageContent(contentData.results);

                    if (content.trim()) {
                        // Generate embedding for the content
                        let embedding = null;
                        try {
                            const ragConfigStr = await env.AI_KV.get("RAG_CONFIG");
                            if (ragConfigStr) {
                                const ragConfig = JSON.parse(ragConfigStr);
                                console.log('RAG Config:', ragConfig); // Debug log
                                
                                const embeddingResponse = await fetch(`${ragConfig.baseurl}/v1/embeddings`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${ragConfig.apikey}`
                                    },
                                    body: JSON.stringify({
                                        model: ragConfig.model,
                                        input: content
                                    })
                                });
                                
                                console.log('Embedding response status:', embeddingResponse.status); // Debug log
                                
                                if (embeddingResponse.ok) {
                                    const embeddingData = await embeddingResponse.json();
                                    console.log('Embedding data:', embeddingData); // Debug log
                                    if (embeddingData.data && embeddingData.data[0]) {
                                        embedding = JSON.stringify(embeddingData.data[0].embedding);
                                        console.log('Embedding generated successfully'); // Debug log
                                    }
                                } else {
                                    const errorText = await embeddingResponse.text();
                                    console.error('Embedding API error:', errorText);
                                }
                            } else {
                                console.log('No RAG config found');
                            }
                        } catch (embeddingError) {
                            console.error('Failed to generate embedding:', embeddingError);
                        }

                        // Store in files table for RAG
                        const fileId = crypto.randomUUID();
                        const now = new Date().toISOString();

                        await env.AI_DB.prepare(`
                            INSERT OR REPLACE INTO files 
                            (id, name, type, content, embedding, created_at) 
                            VALUES (?, ?, ?, ?, ?, ?)
                        `).bind(
                            fileId,
                            `Notion: ${page.title}`,
                            'text',
                            content,
                            embedding,
                            now
                        ).run();

                        syncedCount++;
                    }
                }
            } catch (pageError) {
                console.error(`Error syncing page ${page.id}:`, pageError);
            }
        }

        return new Response(JSON.stringify({ 
            success: true, 
            synced: syncedCount,
            message: `成功同步${syncedCount}个页面到RAG系统` 
        }), { headers });

    } catch (error) {
        console.error("Notion sync all error:", error);
        return new Response(JSON.stringify({ error: "同步过程中发生错误" }), {
            status: 500,
            headers
        });
    }
}
__name(handleNotionSyncAll, "handleNotionSyncAll");

async function handleNotionCheckUpdates(request, env, headers) {
    if (request.method !== "GET") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers
        });
    }

    try {
        const token = await env.AI_KV.get("NOTION_TOKEN");
        
        if (!token) {
            return new Response(JSON.stringify({ error: "未连接Notion" }), {
                status: 400,
                headers
            });
        }

        // Get cached pages and check for updates
        const pagesData = await env.AI_KV.get("NOTION_PAGES");
        const cachedPages = pagesData ? JSON.parse(pagesData) : [];

        // Fetch current pages
        const response = await fetch('https://api.notion.com/v1/search', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filter: {
                    value: "page",
                    property: "object"
                }
            })
        });

        if (!response.ok) {
            throw new Error("检查更新失败");
        }

        const data = await response.json();
        const currentPages = data.results;

        let updatesCount = 0;
        const cachedPageMap = new Map(cachedPages.map(p => [p.id, p.last_edited_time]));

        for (const page of currentPages) {
            const cachedTime = cachedPageMap.get(page.id);
            if (!cachedTime || new Date(page.last_edited_time) > new Date(cachedTime)) {
                updatesCount++;
            }
        }

        return new Response(JSON.stringify({ 
            updates: updatesCount,
            message: `发现${updatesCount}个页面有更新` 
        }), { headers });

    } catch (error) {
        console.error("Notion check updates error:", error);
        return new Response(JSON.stringify({ error: "检查更新时发生错误" }), {
            status: 500,
            headers
        });
    }
}
__name(handleNotionCheckUpdates, "handleNotionCheckUpdates");

async function handleNotionStatus(request, env, headers) {
    if (request.method !== "GET") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers
        });
    }

    try {
        const token = await env.AI_KV.get("NOTION_TOKEN");
        const connected = !!token;
        
        return new Response(JSON.stringify({ 
            connected,
            token: connected ? "***" : null  // 不返回完整token，只表示存在
        }), { headers });

    } catch (error) {
        console.error("Notion status error:", error);
        return new Response(JSON.stringify({ error: "获取连接状态失败" }), {
            status: 500,
            headers
        });
    }
}
__name(handleNotionStatus, "handleNotionStatus");

async function handleFixEmbeddings(request, env, headers) {
    if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers
        });
    }

    try {
        // Get all Notion files without embeddings
        const files = await env.AI_DB.prepare(`
            SELECT id, name, content 
            FROM files 
            WHERE name LIKE 'Notion:%' AND (embedding IS NULL OR embedding = '')
        `).all();

        if (!files.results || files.results.length === 0) {
            return new Response(JSON.stringify({ 
                message: "没有需要修复的文件",
                fixed: 0 
            }), { headers });
        }

        // Get RAG config
        const ragConfigStr = await env.AI_KV.get("RAG_CONFIG");
        if (!ragConfigStr) {
            return new Response(JSON.stringify({ error: "RAG配置未找到" }), {
                status: 400,
                headers
            });
        }

        const ragConfig = JSON.parse(ragConfigStr);
        let fixedCount = 0;

        for (const file of files.results) {
            try {
                if (!file.content || !file.content.trim()) continue;

                // Generate embedding
                const embeddingResponse = await fetch(`${ragConfig.baseurl}/v1/embeddings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${ragConfig.apikey}`
                    },
                    body: JSON.stringify({
                        model: ragConfig.model,
                        input: file.content
                    })
                });

                if (embeddingResponse.ok) {
                    const embeddingData = await embeddingResponse.json();
                    if (embeddingData.data && embeddingData.data[0]) {
                        const embedding = JSON.stringify(embeddingData.data[0].embedding);
                        
                        // Update the file with embedding
                        await env.AI_DB.prepare(`
                            UPDATE files 
                            SET embedding = ? 
                            WHERE id = ?
                        `).bind(embedding, file.id).run();
                        
                        fixedCount++;
                    }
                } else {
                    console.error(`Failed to generate embedding for file ${file.id}:`, await embeddingResponse.text());
                }
            } catch (fileError) {
                console.error(`Error fixing embedding for file ${file.id}:`, fileError);
            }
        }

        return new Response(JSON.stringify({ 
            message: `修复完成，处理了 ${fixedCount} 个文件`,
            fixed: fixedCount 
        }), { headers });

    } catch (error) {
        console.error("Fix embeddings error:", error);
        return new Response(JSON.stringify({ error: "修复embedding时发生错误" }), {
            status: 500,
            headers
        });
    }
}
__name(handleFixEmbeddings, "handleFixEmbeddings");

async function handleSaveSyncSettings(request, env, headers) {
    if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers
        });
    }

    try {
        const settings = await request.json();
        
        // Validate settings
        if (typeof settings.enabled !== 'boolean' || !settings.interval) {
            return new Response(JSON.stringify({ error: "无效的设置数据" }), {
                status: 400,
                headers
            });
        }
        
        // Store settings in KV
        await env.AI_KV.put("NOTION_AUTO_SYNC", JSON.stringify({
            enabled: settings.enabled,
            interval: parseInt(settings.interval),
            databases: settings.databases || [],
            lastSync: settings.lastSync || null,
            updatedAt: new Date().toISOString()
        }));

        return new Response(JSON.stringify({ 
            success: true,
            message: "同步设置已保存" 
        }), { headers });

    } catch (error) {
        console.error("Save sync settings error:", error);
        return new Response(JSON.stringify({ error: "保存设置时发生错误" }), {
            status: 500,
            headers
        });
    }
}
__name(handleSaveSyncSettings, "handleSaveSyncSettings");

async function handleSaveWorkflowSettings(request, env, headers) {
    if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers
        });
    }

    try {
        const settings = await request.json();
        
        // Store workflow settings in KV
        await env.AI_KV.put("NOTION_WORKFLOW_SETTINGS", JSON.stringify({
            autoCreatePages: settings.autoCreatePages || false,
            autoCreateDatabase: settings.autoCreateDatabase || "",
            createKeywords: settings.createKeywords || "创建,新建,记录",
            updatedAt: new Date().toISOString()
        }));

        return new Response(JSON.stringify({ 
            success: true,
            message: "工作流设置已保存" 
        }), { headers });

    } catch (error) {
        console.error("Save workflow settings error:", error);
        return new Response(JSON.stringify({ error: "保存工作流设置时发生错误" }), {
            status: 500,
            headers
        });
    }
}
__name(handleSaveWorkflowSettings, "handleSaveWorkflowSettings");

async function handleGetSyncSettings(request, env, headers) {
    if (request.method !== "GET") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers
        });
    }

    try {
        const settingsData = await env.AI_KV.get("NOTION_AUTO_SYNC");
        const settings = settingsData ? JSON.parse(settingsData) : {
            enabled: false,
            interval: 6,
            databases: [],
            lastSync: null
        };

        return new Response(JSON.stringify(settings), { headers });

    } catch (error) {
        console.error("Get sync settings error:", error);
        return new Response(JSON.stringify({ error: "获取同步设置时发生错误" }), {
            status: 500,
            headers
        });
    }
}
__name(handleGetSyncSettings, "handleGetSyncSettings");

async function handleGetWorkflowSettings(request, env, headers) {
    if (request.method !== "GET") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers
        });
    }

    try {
        const settingsData = await env.AI_KV.get("NOTION_WORKFLOW_SETTINGS");
        const settings = settingsData ? JSON.parse(settingsData) : {
            autoCreatePages: false,
            autoCreateDatabase: "",
            createKeywords: "创建,新建,记录"
        };

        return new Response(JSON.stringify(settings), { headers });

    } catch (error) {
        console.error("Get workflow settings error:", error);
        return new Response(JSON.stringify({ error: "获取工作流设置时发生错误" }), {
            status: 500,
            headers
        });
    }
}
__name(handleGetWorkflowSettings, "handleGetWorkflowSettings");


// Check Notion workflow triggers for auto-creation
async function checkNotionWorkflowTriggers(userMessage, env, apiKey, aiContent = null) {
    try {
        console.log("🔧 开始检查 Notion 工作流...");
        
        // Get workflow settings
        const workflowData = await env.AI_KV.get("NOTION_WORKFLOW_SETTINGS");
        console.log("📋 工作流设置数据:", workflowData ? "已找到" : "未找到");
        
        if (!workflowData) {
            console.log("❌ 未找到工作流设置，请先在管理面板配置工作流");
            console.log("💡 配置路径: 管理面板 → Notion集成 → 工作流配置");
            return;
        }
        
        const settings = JSON.parse(workflowData);
        console.log("⚙️ 工作流设置:", JSON.stringify(settings, null, 2));
        
        // Check if auto-create pages is enabled
        console.log("🔍 检查自动创建页面设置:", {
            autoCreatePages: settings.autoCreatePages,
            autoCreateDatabase: settings.autoCreateDatabase
        });
        
        if (!settings.autoCreatePages || !settings.autoCreateDatabase) {
            console.log("❌ 自动创建页面未启用或未设置数据库，跳过");
            return;
        }
        
        // Check if Notion is connected
        const token = await env.AI_KV.get("NOTION_TOKEN");
        console.log("🔗 Notion 连接状态:", token ? "已连接" : "未连接");
        
        if (!token) {
            console.log("❌ Notion 未连接，跳过");
            return;
        }
        
        // Parse keywords
        const keywords = (settings.createKeywords || "创建,新建,记录").split(',').map(k => k.trim());
        
        // Check if message contains any trigger keywords
        const messageContainsTrigger = keywords.some(keyword => 
            userMessage.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (!messageContainsTrigger) {
            return;
        }
        
        console.log("🎯 Notion工作流触发:", userMessage);
        
        // Extract title from message with better logic
        let pageTitle = userMessage;
        
        // Better pattern matching for "关于...的..."
        const aboutMatch = userMessage.match(/关于(.+?)(?:的|，|。|$)/);
        if (aboutMatch) {
            pageTitle = aboutMatch[1].trim();
        } else {
            // Remove trigger keywords and clean up
            let cleanTitle = userMessage;
            keywords.forEach(keyword => {
                cleanTitle = cleanTitle.replace(new RegExp(keyword + '[文档]*[，、。]*', 'gi'), '').trim();
            });
            
            // Remove common words and punctuation
            cleanTitle = cleanTitle.replace(/^[，。、\s]+|[，。、\s]+$/g, '').trim();
            
            if (cleanTitle && cleanTitle.length > 1) {
                pageTitle = cleanTitle;
            }
        }
        
        // Add timestamp prefix if title is meaningful
        if (pageTitle && pageTitle.length > 2 && !pageTitle.includes('新文档')) {
            const today = new Date().toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
            pageTitle = `${today} ${pageTitle}`;
        } else {
            pageTitle = `新文档_${new Date().toISOString().slice(0, 10)}`;
        }
        
        // Create page in Notion with AI content
        const contentToSave = aiContent || userMessage;
        await createNotionPage(token, settings.autoCreateDatabase, pageTitle, userMessage, contentToSave, env);
        
    } catch (error) {
        console.error("Notion workflow trigger error:", error);
    }
}
__name(checkNotionWorkflowTriggers, "checkNotionWorkflowTriggers");

async function createNotionPage(token, databaseId, title, userRequest, aiContent, env) {
    try {
        console.log(`📝 创建Notion页面: ${title} (数据库: ${databaseId})`);
        console.log(`📄 用户请求: ${userRequest}`);
        console.log(`🤖 AI内容长度: ${aiContent ? aiContent.length : 0}`);
        
        // First, get database schema to find the correct title property
        const dbResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Notion-Version": "2022-06-28"
            }
        });
        
        let titlePropertyName = "Name"; // default fallback
        
        if (dbResponse.ok) {
            const dbInfo = await dbResponse.json();
            console.log("🗄️ 数据库属性:", Object.keys(dbInfo.properties));
            
            // Find the title property
            const titleProperty = Object.entries(dbInfo.properties).find(([key, prop]) => prop.type === 'title');
            if (titleProperty) {
                titlePropertyName = titleProperty[0];
                console.log(`✅ 找到标题属性: ${titlePropertyName}`);
            } else {
                console.log("⚠️ 未找到标题属性，使用默认名称");
            }
        } else {
            console.log("⚠️ 无法获取数据库信息，使用默认属性名");
        }
        
        const pageData = {
            parent: {
                database_id: databaseId
            },
            properties: {},
            children: [
                {
                    object: "block",
                    type: "paragraph",
                    paragraph: {
                        rich_text: [
                            {
                                type: "text",
                                text: {
                                    content: aiContent || `用户请求: ${userRequest}\n\n创建时间: ${new Date().toLocaleString('zh-CN')}`
                                }
                            }
                        ]
                    }
                }
            ]
        };
        
        // Set the title property dynamically
        pageData.properties[titlePropertyName] = {
            title: [
                {
                    text: {
                        content: title
                    }
                }
            ]
        };
        
        console.log("📋 页面数据:", JSON.stringify(pageData, null, 2));
        
        const response = await fetch("https://api.notion.com/v1/pages", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "Notion-Version": "2022-06-28"
            },
            body: JSON.stringify(pageData)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log("✅ Notion页面创建成功:", result.id);
            
            // Update cached pages
            const pagesData = await env.AI_KV.get("NOTION_PAGES");
            const pages = pagesData ? JSON.parse(pagesData) : [];
            pages.unshift({
                id: result.id,
                title: title,
                created_time: new Date().toISOString(),
                last_edited_time: new Date().toISOString()
            });
            await env.AI_KV.put("NOTION_PAGES", JSON.stringify(pages));
            
        } else {
            const error = await response.json();
            console.error("❌ Notion页面创建失败:", error);
        }
        
    } catch (error) {
        console.error("Create Notion page error:", error);
    }
}
__name(createNotionPage, "createNotionPage");


// Helper functions for Notion integration
function extractPageTitle(page) {
    if (page.properties) {
        // Try to get title from properties
        const titleProp = Object.values(page.properties).find(prop => prop.type === 'title');
        if (titleProp && titleProp.title && titleProp.title[0]) {
            return titleProp.title[0].plain_text;
        }
    }
    
    // Fallback to checking other title sources
    if (page.title && page.title[0]) {
        return page.title[0].plain_text;
    }
    
    return "无标题页面";
}
__name(extractPageTitle, "extractPageTitle");

function extractPageContent(blocks) {
    let content = "";
    
    for (const block of blocks) {
        switch (block.type) {
            case 'paragraph':
                if (block.paragraph?.rich_text) {
                    content += block.paragraph.rich_text.map(text => text.plain_text).join('') + '\n\n';
                }
                break;
            case 'heading_1':
                if (block.heading_1?.rich_text) {
                    content += '# ' + block.heading_1.rich_text.map(text => text.plain_text).join('') + '\n\n';
                }
                break;
            case 'heading_2':
                if (block.heading_2?.rich_text) {
                    content += '## ' + block.heading_2.rich_text.map(text => text.plain_text).join('') + '\n\n';
                }
                break;
            case 'heading_3':
                if (block.heading_3?.rich_text) {
                    content += '### ' + block.heading_3.rich_text.map(text => text.plain_text).join('') + '\n\n';
                }
                break;
            case 'bulleted_list_item':
                if (block.bulleted_list_item?.rich_text) {
                    content += '- ' + block.bulleted_list_item.rich_text.map(text => text.plain_text).join('') + '\n';
                }
                break;
            case 'numbered_list_item':
                if (block.numbered_list_item?.rich_text) {
                    content += '1. ' + block.numbered_list_item.rich_text.map(text => text.plain_text).join('') + '\n';
                }
                break;
            case 'to_do':
                if (block.to_do?.rich_text) {
                    const checked = block.to_do.checked ? '[x]' : '[ ]';
                    content += `${checked} ` + block.to_do.rich_text.map(text => text.plain_text).join('') + '\n';
                }
                break;
            case 'code':
                if (block.code?.rich_text) {
                    content += '```\n' + block.code.rich_text.map(text => text.plain_text).join('') + '\n```\n\n';
                }
                break;
            case 'quote':
                if (block.quote?.rich_text) {
                    content += '> ' + block.quote.rich_text.map(text => text.plain_text).join('') + '\n\n';
                }
                break;
        }
    }
    
    return content.trim();
}
__name(extractPageContent, "extractPageContent");

// Scheduled event handler for Notion auto-sync
async function scheduled(event, env, ctx) {
    console.log("Cron trigger fired for Notion auto-sync");
    
    try {
        // Check if auto-sync is enabled
        const autoSyncSettings = await env.AI_KV.get("NOTION_AUTO_SYNC");
        if (!autoSyncSettings) {
            console.log("Auto-sync not configured");
            return;
        }
        
        const settings = JSON.parse(autoSyncSettings);
        if (!settings.enabled) {
            console.log("Auto-sync disabled");
            return;
        }
        
        // Check if Notion is connected
        const token = await env.AI_KV.get("NOTION_TOKEN");
        if (!token) {
            console.log("Notion not connected");
            return;
        }
        
        // Perform sync
        console.log("Starting auto-sync...");
        
        // Get cached pages
        const pagesData = await env.AI_KV.get("NOTION_PAGES");
        const pages = pagesData ? JSON.parse(pagesData) : [];
        
        let syncedCount = 0;
        
        for (const page of pages) {
            try {
                // Fetch page content
                const contentResponse = await fetch(`https://api.notion.com/v1/blocks/${page.id}/children`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Notion-Version': '2022-06-28'
                    }
                });
                
                if (contentResponse.ok) {
                    const contentData = await contentResponse.json();
                    const content = extractPageContent(contentData.results);
                    
                    if (content.trim()) {
                        // Generate embedding
                        let embedding = null;
                        try {
                            const ragConfigStr = await env.AI_KV.get("RAG_CONFIG");
                            if (ragConfigStr) {
                                const ragConfig = JSON.parse(ragConfigStr);
                                const embeddingResponse = await fetch(`${ragConfig.baseurl}/v1/embeddings`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${ragConfig.apikey}`
                                    },
                                    body: JSON.stringify({
                                        model: ragConfig.model,
                                        input: content
                                    })
                                });
                                
                                if (embeddingResponse.ok) {
                                    const embeddingData = await embeddingResponse.json();
                                    if (embeddingData.data && embeddingData.data[0]) {
                                        embedding = JSON.stringify(embeddingData.data[0].embedding);
                                    }
                                }
                            }
                        } catch (embeddingError) {
                            console.error('Failed to generate embedding:', embeddingError);
                        }
                        
                        // Store in files table
                        const fileId = crypto.randomUUID();
                        const now = new Date().toISOString();
                        
                        await env.AI_DB.prepare(`
                            INSERT OR REPLACE INTO files 
                            (id, name, type, content, embedding, created_at) 
                            VALUES (?, ?, ?, ?, ?, ?)
                        `).bind(
                            fileId,
                            `Notion: ${page.title}`,
                            'text',
                            content,
                            embedding,
                            now
                        ).run();
                        
                        syncedCount++;
                    }
                }
            } catch (pageError) {
                console.error(`Error auto-syncing page ${page.id}:`, pageError);
            }
        }
        
        console.log(`Auto-sync completed: ${syncedCount} pages synced`);
        
    } catch (error) {
        console.error("Auto-sync error:", error);
    }
}

export {
    worker_default as default,
    scheduled
};
//# sourceMappingURL=worker.js.map
