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
        if (path === "/api/ai-config") {
            return handleAiConfig(request, env, corsHeaders);
        }
        if (path === "/api/rag-config") {
            return handleRagConfig(request, env, corsHeaders);
        }
        if (path === "/api/statistics") {
            return handleStatistics(request, env, corsHeaders);
        }
        if (path === "/v1/chat/completions") {
            return handleChatCompletions(request, env, corsHeaders);
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
async function handleModels(request, env, corsHeaders) {
    const headers = { ...corsHeaders, "Content-Type": "application/json" };
    if (!await verifyAdmin(request, env)) {
        return new Response(JSON.stringify({ error: "\u672A\u6388\u6743" }), {
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
    const systemMessages = limitedMessages.filter((m) => m.role === "system");
    const otherMessages = limitedMessages.filter((m) => m.role !== "system");
    if (otherMessages.length > maxMessages) {
        limitedMessages = [
            ...systemMessages,
            ...otherMessages.slice(-maxMessages)
        ];
    }
    const lastMessage = limitedMessages[limitedMessages.length - 1];
    if (enableImage && lastMessage.content.startsWith("\u753B")) {
        return await handleImageGeneration(lastMessage.content, env, stream, headers);
    }
    const ragContext = await performRAG(lastMessage.content, env);
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
    const systemPrompt = modelSystemPrompt || systemConfig.systemPrompt;
    if (systemPrompt) {
        limitedMessages.unshift({
            role: "system",
            content: systemPrompt
        });
    }
    const aiConfigData = await env.AI_KV.get("AI_CONFIG");
    const aiConfig = JSON.parse(aiConfigData);
    try {
        const aiResponse = await fetch(`${aiConfig.baseurl}/v1/chat/completions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${aiConfig.apikey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: aiConfig.model,
                messages: limitedMessages,
                stream
            })
        });
        await saveConversation(apiKey, limitedMessages, env);
        if (stream) {
            return new Response(aiResponse.body, {
                headers: {
                    ...corsHeaders,
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive"
                }
            });
        } else {
            const result = await aiResponse.json();
            return new Response(JSON.stringify(result), { headers });
        }
    } catch (error) {
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
        
        const rerankedDocs = result.results.sort((a, b) => b.relevance_score - a.relevance_score).map((item) => item.document.text);
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
export {
    worker_default as default
};
//# sourceMappingURL=worker.js.map
