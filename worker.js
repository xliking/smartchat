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
// 轮询重试机制
async function fetchWithRetry(url, options, apiKeys, currentIndex = 0, retryCount = 0) {
    const maxRetries = apiKeys.length * 2; // 每个key最多重试2次
    
    if (retryCount >= maxRetries) {
        throw new Error(`All API keys failed after ${maxRetries} retries`);
    }
    
    const apiKey = apiKeys[currentIndex % apiKeys.length];
    const authHeader = { ...options.headers, "Authorization": `Bearer ${apiKey}` };
    
    try {
        const response = await fetch(url, { ...options, headers: authHeader });
        
        // 如果是401或403错误，尝试下一个key
        if ((response.status === 401 || response.status === 403) && apiKeys.length > 1) {
            console.log(`API key ${currentIndex + 1} failed with status ${response.status}, trying next key`);
            return fetchWithRetry(url, options, apiKeys, currentIndex + 1, retryCount + 1);
        }
        
        // 如果是其他错误，重试当前key
        if (!response.ok) {
            console.log(`API key ${currentIndex + 1} failed with status ${response.status}, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, Math.floor(retryCount / apiKeys.length))));
            return fetchWithRetry(url, options, apiKeys, currentIndex, retryCount + 1);
        }
        
        return response;
    } catch (error) {
        console.log(`API key ${currentIndex + 1} failed with error: ${error.message}, retrying...`);
        if (retryCount < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, Math.floor(retryCount / apiKeys.length))));
            return fetchWithRetry(url, options, apiKeys, currentIndex, retryCount + 1);
        }
        throw error;
    }
}

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
            const url = new URL(request.url);
            const fileId = url.pathname.split("/").pop();
            
            // 检查是否是下载请求
            if (url.searchParams.get('download') === 'true') {
                return handleDownloadFile(request, env, corsHeaders, fileId);
            } else {
                return handleGetFile(request, env, corsHeaders);
            }
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
        if (path === "/api/test-db-insert") {
            return handleTestDbInsert(request, env, corsHeaders);
        }
        if (path === "/api/check-api-usage") {
            return handleCheckApiUsage(request, env, corsHeaders);
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
// 本地文档解析实现（不依赖外部库）

// 改进的本地 DOCX 解析（支持压缩文件）
async function parseDocxImproved(arrayBuffer) {
    try {
        console.log('使用改进的本地方法解析 DOCX...');
        
        const zipData = new Uint8Array(arrayBuffer);
        const view = new DataView(arrayBuffer);
        
        // 改进的 ZIP 解析，支持压缩文件
        const files = await parseZipFileImproved(arrayBuffer);
        
        // 查找 document.xml
        if (files['word/document.xml']) {
            console.log('找到 word/document.xml 文件');
            
            const xmlData = files['word/document.xml'];
            let xmlContent = '';
            
            // 尝试不同的解码方式
            try {
                xmlContent = new TextDecoder('utf-8').decode(xmlData);
            } catch (e) {
                try {
                    xmlContent = new TextDecoder('latin1').decode(xmlData);
                } catch (e2) {
                    console.error('XML 解码失败');
                    return '';
                }
            }
            
            console.log('document.xml 内容长度:', xmlContent.length);
            
            // 提取文本内容
            const textMatches = xmlContent.match(/<w:t[^>]*?>(.*?)<\/w:t>/gs) || [];
            console.log(`找到 ${textMatches.length} 个文本节点`);
            
            if (textMatches.length > 0) {
                const extractedText = textMatches
                    .map(match => {
                        const textContent = match.replace(/<w:t[^>]*?>|<\/w:t>/g, '');
                        return textContent
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&amp;/g, '&')
                            .replace(/&quot;/g, '"')
                            .replace(/&#(\d+);/g, (match, num) => String.fromCharCode(parseInt(num)))
                            .trim();
                    })
                    .filter(text => text.length > 0)
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                    
                console.log(`提取文本长度: ${extractedText.length}`);
                if (extractedText.length > 0) {
                    console.log('文本预览:', extractedText.substring(0, 200) + '...');
                    return extractedText;
                }
            }
        }
        
        return '';
    } catch (error) {
        console.error('改进的DOCX解析失败:', error);
        return '';
    }
}

// 改进的 ZIP 解析器（支持压缩文件）
async function parseZipFileImproved(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const files = {};
    
    try {
        // 查找中央目录结尾记录
        let endOfCentralDir = -1;
        for (let i = arrayBuffer.byteLength - 22; i >= 0; i--) {
            if (view.getUint32(i, true) === 0x06054b50) {
                endOfCentralDir = i;
                break;
            }
        }
        
        if (endOfCentralDir === -1) {
            console.log('无法找到 ZIP 中央目录');
            return files;
        }
        
        const totalEntries = view.getUint16(endOfCentralDir + 10, true);
        const centralDirOffset = view.getUint32(endOfCentralDir + 16, true);
        
        console.log(`ZIP 文件包含 ${totalEntries} 个条目`);
        
        // 解析每个文件条目
        let currentOffset = centralDirOffset;
        for (let i = 0; i < totalEntries; i++) {
            if (view.getUint32(currentOffset, true) !== 0x02014b50) {
                break;
            }
            
            const fileNameLength = view.getUint16(currentOffset + 28, true);
            const localHeaderOffset = view.getUint32(currentOffset + 42, true);
            
            // 读取文件名
            const fileNameBytes = new Uint8Array(arrayBuffer, currentOffset + 46, fileNameLength);
            const fileName = new TextDecoder('utf-8').decode(fileNameBytes);
            
            // 解析本地文件头
            if (view.getUint32(localHeaderOffset, true) === 0x04034b50) {
                const compressionMethod = view.getUint16(localHeaderOffset + 8, true);
                const compressedSize = view.getUint32(localHeaderOffset + 18, true);
                const uncompressedSize = view.getUint32(localHeaderOffset + 22, true);
                const localFileNameLength = view.getUint16(localHeaderOffset + 26, true);
                const localExtraFieldLength = view.getUint16(localHeaderOffset + 28, true);
                
                const fileDataOffset = localHeaderOffset + 30 + localFileNameLength + localExtraFieldLength;
                
                if (compressionMethod === 0) {
                    // 无压缩
                    const fileData = new Uint8Array(arrayBuffer, fileDataOffset, compressedSize);
                    files[fileName] = fileData;
                    console.log(`提取文件 (无压缩): ${fileName}, 大小: ${compressedSize} 字节`);
                } else if (compressionMethod === 8) {
                    // Deflate 压缩
                    const compressedData = new Uint8Array(arrayBuffer, fileDataOffset, compressedSize);
                    try {
                        const decompressedData = await inflateRaw(compressedData);
                        files[fileName] = decompressedData;
                        console.log(`提取文件 (压缩): ${fileName}, 压缩: ${compressedSize} → 解压: ${decompressedData.length} 字节`);
                    } catch (inflateError) {
                        console.log(`解压失败: ${fileName}, 错误: ${inflateError.message}`);
                    }
                }
            }
            
            // 移动到下一个条目
            const extraFieldLength = view.getUint16(currentOffset + 30, true);
            const commentLength = view.getUint16(currentOffset + 32, true);
            currentOffset += 46 + fileNameLength + extraFieldLength + commentLength;
        }
        
    } catch (error) {
        console.error('ZIP 解析错误:', error);
    }
    
    return files;
}

// 使用 Cloudflare Workers 原生 API 进行 Deflate 解压
async function inflateRaw(compressedData) {
    try {
        // 尝试使用 DecompressionStream API
        if (typeof DecompressionStream !== 'undefined') {
            console.log('使用 DecompressionStream 解压...');
            
            const stream = new DecompressionStream('deflate-raw');
            const writer = stream.writable.getWriter();
            const reader = stream.readable.getReader();
            
            // 写入压缩数据
            await writer.write(compressedData);
            await writer.close();
            
            // 读取解压数据
            const chunks = [];
            let done = false;
            
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    chunks.push(value);
                }
            }
            
            // 合并所有chunks
            const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const result = new Uint8Array(totalLength);
            let offset = 0;
            
            for (const chunk of chunks) {
                result.set(chunk, offset);
                offset += chunk.length;
            }
            
            console.log(`解压成功: ${compressedData.length} → ${result.length} 字节`);
            return result;
        }
        
        // 如果 DecompressionStream 不可用，尝试备用方法
        throw new Error('DecompressionStream 不可用');
        
    } catch (error) {
        console.log('原生解压失败，尝试备用方法:', error.message);
        
        // 备用方法：尝试直接解码（适用于某些情况）
        try {
            const decoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false });
            const decoded = decoder.decode(compressedData);
            
            // 检查是否包含有效的 XML 内容
            if (decoded.includes('<w:t>') || decoded.includes('<?xml') || decoded.includes('<w:')) {
                console.log('备用解码成功，找到 XML 内容');
                return new TextEncoder().encode(decoded);
            }
            
            throw new Error('没有找到有效的 XML 内容');
        } catch (decodeError) {
            throw new Error('所有解压方法都失败了: ' + decodeError.message);
        }
    }
}

// 计算文件内容哈希值
async function calculateFileHash(content) {
    if (content instanceof ArrayBuffer) {
        // 对于二进制内容（文件）
        const buffer = new Uint8Array(content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else if (typeof content === 'string') {
        // 对于文本内容
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return null;
}

// 文档解析函数
async function parseDocument(arrayBuffer, fileName) {
    const fileExtension = fileName.toLowerCase().split('.').pop();
    
    try {
        switch (fileExtension) {
            case 'txt':
            case 'md':
                // 直接读取纯文本文件
                const textDecoder = new TextDecoder('utf-8');
                return textDecoder.decode(arrayBuffer);
                
            case 'docx':
                // 使用改进的本地解析器
                const docxResult = await parseDocxImproved(arrayBuffer);
                if (docxResult && docxResult.length > 50) {
                    return docxResult;
                }
                // 备用方法
                return await parseDocx(arrayBuffer);
                
            case 'pdf':
                // 使用基础的 PDF 解析
                return await parsePdf(arrayBuffer);
                
            default:
                console.log(`不支持的文件格式: ${fileExtension}`);
                return '';
        }
    } catch (error) {
        console.error(`文档解析错误 (${fileName}):`, error);
        return '';
    }
}

// 简单的 ZIP 文件解析器
function parseZipFile(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const files = {};
    
    try {
        // 查找 ZIP 文件的中央目录结尾记录
        let offset = arrayBuffer.byteLength - 22;
        let endOfCentralDir = -1;
        
        // 向前搜索中央目录结尾签名 (0x06054b50)
        for (let i = offset; i >= 0; i--) {
            if (view.getUint32(i, true) === 0x06054b50) {
                endOfCentralDir = i;
                break;
            }
        }
        
        if (endOfCentralDir === -1) {
            console.log('无法找到 ZIP 中央目录');
            return files;
        }
        
        // 读取中央目录信息
        const totalEntries = view.getUint16(endOfCentralDir + 10, true);
        const centralDirOffset = view.getUint32(endOfCentralDir + 16, true);
        
        console.log(`ZIP 文件包含 ${totalEntries} 个条目`);
        
        // 解析中央目录中的每个文件条目
        let currentOffset = centralDirOffset;
        for (let i = 0; i < totalEntries; i++) {
            if (view.getUint32(currentOffset, true) !== 0x02014b50) {
                break; // 不是有效的中央目录文件头签名
            }
            
            const fileNameLength = view.getUint16(currentOffset + 28, true);
            const extraFieldLength = view.getUint16(currentOffset + 30, true);
            const commentLength = view.getUint16(currentOffset + 32, true);
            const localHeaderOffset = view.getUint32(currentOffset + 42, true);
            
            // 读取文件名
            const fileNameBytes = new Uint8Array(arrayBuffer, currentOffset + 46, fileNameLength);
            const fileName = new TextDecoder('utf-8').decode(fileNameBytes);
            
            // 解析本地文件头获取文件内容
            if (view.getUint32(localHeaderOffset, true) === 0x04034b50) {
                const localFileNameLength = view.getUint16(localHeaderOffset + 26, true);
                const localExtraFieldLength = view.getUint16(localHeaderOffset + 28, true);
                const compressedSize = view.getUint32(localHeaderOffset + 18, true);
                const compressionMethod = view.getUint16(localHeaderOffset + 8, true);
                
                const fileDataOffset = localHeaderOffset + 30 + localFileNameLength + localExtraFieldLength;
                
                if (compressionMethod === 0) { // 无压缩
                    const fileData = new Uint8Array(arrayBuffer, fileDataOffset, compressedSize);
                    files[fileName] = fileData;
                    console.log(`提取文件: ${fileName}, 大小: ${compressedSize} 字节`);
                }
            }
            
            currentOffset += 46 + fileNameLength + extraFieldLength + commentLength;
        }
        
    } catch (error) {
        console.error('ZIP 解析错误:', error);
    }
    
    return files;
}

// 解析 DOCX 文件
async function parseDocx(arrayBuffer) {
    try {
        console.log('开始解析 DOCX 文件...');
        
        // 首先尝试解析为 ZIP 文件
        const zipFiles = parseZipFile(arrayBuffer);
        
        // 查找 document.xml 文件
        if (zipFiles['word/document.xml']) {
            console.log('找到 word/document.xml 文件');
            const documentXml = new TextDecoder('utf-8').decode(zipFiles['word/document.xml']);
            
            // 从 document.xml 中提取文本
            const textMatches = documentXml.match(/<w:t[^>]*?>(.*?)<\/w:t>/gs) || [];
            console.log(`找到 ${textMatches.length} 个文本节点`);
            
            if (textMatches.length > 0) {
                const extractedText = textMatches
                    .map(match => {
                        const textContent = match.replace(/<w:t[^>]*?>|<\/w:t>/g, '');
                        return textContent
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&amp;/g, '&')
                            .replace(/&quot;/g, '"')
                            .trim();
                    })
                    .filter(text => text.length > 0)
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                    
                console.log(`从 document.xml 提取文本长度: ${extractedText.length}`);
                if (extractedText.length > 0) {
                    console.log('文本预览:', extractedText.substring(0, 200) + '...');
                    return extractedText;
                }
            }
        }
        
        // 如果 ZIP 解析失败，回退到原始方法
        console.log('ZIP 解析失败，使用备用方法...');
        const zipData = new Uint8Array(arrayBuffer);
        const text = await extractTextFromDocx(zipData);
        return text;
    } catch (error) {
        console.error('DOCX 解析错误:', error);
        return '';
    }
}

// 改进的 DOCX 文本提取
async function extractTextFromDocx(zipData) {
    try {
        // 使用多种编码尝试解析
        let content = '';
        
        // 尝试不同的解码方式
        try {
            // 首先尝试 UTF-8
            const utf8Decoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
            content = utf8Decoder.decode(zipData);
        } catch (e) {
            try {
                // 如果 UTF-8 失败，尝试 Latin1
                const latin1Decoder = new TextDecoder('latin1');
                content = latin1Decoder.decode(zipData);
            } catch (e2) {
                // 最后尝试 Windows-1252
                const cp1252Decoder = new TextDecoder('windows-1252');
                content = cp1252Decoder.decode(zipData);
            }
        }
        
        console.log('DOCX 解码后内容长度:', content.length);
        
        // 方法1: 查找 <w:t> 标签中的文本内容（最准确的方法）
        const wtMatches = content.match(/<w:t[^>]*?>(.*?)<\/w:t>/gs);
        if (wtMatches && wtMatches.length > 0) {
            console.log('找到 w:t 标签数量:', wtMatches.length);
            const extractedText = wtMatches
                .map(match => {
                    // 提取标签内的文本内容
                    const textContent = match.replace(/<w:t[^>]*?>|<\/w:t>/g, '');
                    // 解码HTML实体
                    return textContent
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&amp;/g, '&')
                        .replace(/&quot;/g, '"')
                        .replace(/&#(\d+);/g, (match, num) => String.fromCharCode(parseInt(num)))
                        .trim();
                })
                .filter(text => text.length > 0)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();
                
            if (extractedText.length > 100) {
                console.log('w:t 标签提取成功，文本长度:', extractedText.length);
                console.log('文本预览:', extractedText.substring(0, 200) + '...');
                return extractedText.substring(0, 50000);
            }
        }
        
        // 方法2: 查找所有可能的中文和英文字符串
        console.log('尝试方法2: 查找字符串模式');
        const textPatterns = [
            // 查找被引号包围的文本
            /"([^"]{2,}[^"\x00-\x1F]+)"/g,
            // 查找中文字符串
            /[\u4e00-\u9fff][\u4e00-\u9fff\s\w\.,，。！？；：""''（）]{5,}/g,
            // 查找英文单词组合
            /[A-Za-z][\w\s\.,!?;:'"()-]{10,}[A-Za-z]/g
        ];
        
        const allTextMatches = [];
        textPatterns.forEach(pattern => {
            const matches = content.match(pattern) || [];
            allTextMatches.push(...matches);
        });
        
        if (allTextMatches.length > 0) {
            const extractedText = allTextMatches
                .map(match => match.replace(/["\x00-\x1F\x7F-\x9F]/g, '').trim())
                .filter(text => text.length > 5)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();
                
            if (extractedText.length > 100) {
                console.log('模式匹配提取成功，文本长度:', extractedText.length);
                console.log('文本预览:', extractedText.substring(0, 200) + '...');
                return extractedText.substring(0, 50000);
            }
        }
        
        // 方法3: 暴力提取所有可读字符
        console.log('尝试方法3: 暴力字符提取');
        const cleanText = content
            .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, ' ') // 移除控制字符但保留换行
            .replace(/[^\u0020-\u007E\u4e00-\u9fff\s]/g, ' ') // 保留ASCII、中文和空白字符
            .replace(/\s+/g, ' ')
            .split(' ')
            .filter(word => word.length > 1) // 过滤单字符
            .join(' ')
            .trim();
            
        console.log('暴力提取文本长度:', cleanText.length);
        if (cleanText.length > 0) {
            console.log('文本预览:', cleanText.substring(0, 200) + '...');
        }
        
        return cleanText.substring(0, 50000);
    } catch (error) {
        console.error('DOCX 文本提取错误:', error);
        return '';
    }
}

// 解析 PDF 文件（基础实现）
async function parsePdf(arrayBuffer) {
    try {
        // PDF 解析比较复杂，这里实现一个基础的文本提取
        const pdfData = new Uint8Array(arrayBuffer);
        const decoder = new TextDecoder('latin1');
        const content = decoder.decode(pdfData);
        
        // 查找 PDF 中的文本流
        const textStreams = [];
        const streamRegex = /stream\s*(.*?)\s*endstream/gs;
        let match;
        
        while ((match = streamRegex.exec(content)) !== null) {
            const streamContent = match[1];
            // 尝试提取可读文本
            const textMatch = streamContent.match(/\((.*?)\)/g);
            if (textMatch) {
                textMatch.forEach(text => {
                    const cleanText = text.replace(/[()]/g, '').trim();
                    if (cleanText.length > 2) {
                        textStreams.push(cleanText);
                    }
                });
            }
        }
        
        const extractedText = textStreams.join(' ').replace(/\s+/g, ' ').trim();
        console.log('PDF 文本提取长度:', extractedText.length);
        
        return extractedText.substring(0, 50000); // 限制最大长度
    } catch (error) {
        console.error('PDF 解析错误:', error);
        return '';
    }
}

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
        
        console.log(`📄 开始解析文件: ${fileName}, 大小: ${content.byteLength} 字节`);
        
        // 解析文档内容
        const textContent = await parseDocument(content, fileName);
        console.log(`📝 文档解析完成: ${fileName}, 提取文本长度: ${textContent.length} 字符`);
        
        if (textContent.length === 0) {
            return new Response(JSON.stringify({ 
                error: `文件解析失败：无法从 ${fileName} 中提取文本内容，请确保文件格式正确且包含文本内容` 
            }), {
                status: 400,
                headers
            });
        }
        
        // 临时存储提取的文本内容供后续使用
        const contentWithExtractedText = {
            arrayBuffer: content,
            extractedText: textContent
        };
        content = contentWithExtractedText;
        
        await env.AI_R2.put(`files/${fileId}`, content.arrayBuffer);
    } else {
        const { text } = await request.json();
        fileName = `text_${fileId}.txt`;
        fileType = "text";
        content = text;
        // 保存原始文本到R2用于哈希计算
        const textBuffer = new TextEncoder().encode(text);
        await env.AI_R2.put(`files/${fileId}`, textBuffer);
        // 保存ArrayBuffer引用用于哈希计算
        const textContentWithBuffer = {
            text: text,
            arrayBuffer: textBuffer.buffer,
            extractedText: text
        };
        content = textContentWithBuffer;
    }
    // 基于提取的文本内容生成 embedding
    const textForEmbedding = fileType === "text" ? content.text : content.extractedText;
    console.log(`🔮 开始生成 embedding: ${fileName}, 文本长度: ${textForEmbedding.length}`);
    const embedding = await getEmbedding(textForEmbedding, env);
    console.log(`✅ Embedding 生成完成: ${fileName}, 维度: ${embedding.length}`);
    
    // 计算文件哈希值用于重复检查
    const fileContentForHash = fileType === "text" ? content.arrayBuffer : content.arrayBuffer;
    const fileHash = await calculateFileHash(fileContentForHash);
    console.log(`🔍 文件哈希计算完成: ${fileName}, 哈希值: ${fileHash?.substring(0, 16)}...`);
    
    // 检查是否已存在相同内容的文件（不限制类型，因为内容相同应该去重）
    const existingFile = await env.AI_DB.prepare(`
        SELECT id, name, type, created_at FROM files 
        WHERE file_hash = ?
        LIMIT 1
    `).bind(fileHash).first();
    
    if (existingFile) {
        console.log(`📄 发现重复文件: ${fileName} 与 ${existingFile.name} 内容相同，将更新现有记录`);
        
        // 更新现有记录
        await env.AI_DB.prepare(`
            UPDATE files 
            SET name = ?, content = ?, embedding = ?, file_hash = ?, created_at = ?
            WHERE id = ?
        `).bind(
            fileName,
            textForEmbedding,
            JSON.stringify(embedding),
            fileHash,
            new Date().toISOString(),
            existingFile.id
        ).run();
        
        // 删除旧的R2文件（如果是文件类型）
        if (fileType === "file") {
            await env.AI_R2.delete(`files/${existingFile.id}`);
            await env.AI_R2.put(`files/${existingFile.id}`, content.arrayBuffer);
        } else {
            // 对于文本类型，保存到R2
            await env.AI_R2.put(`files/${existingFile.id}`, content.arrayBuffer);
        }
        
        fileId = existingFile.id; // 使用现有的文件ID
    } else {
        console.log(`📄 新文件上传: ${fileName}`);
        
        // 插入新记录
        await env.AI_DB.prepare(`
            INSERT INTO files (id, name, type, content, embedding, file_hash, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
            fileId,
            fileName,
            fileType,
            textForEmbedding,
            JSON.stringify(embedding),
            fileHash,
            new Date().toISOString()
        ).run();
    }
    return new Response(JSON.stringify({
        success: true,
        fileId,
        extractedTextLength: textForEmbedding.length,
        action: existingFile ? 'updated' : 'created',
        message: existingFile ? `文件已更新（覆盖了同名文件: ${existingFile.name}）` : '文件上传成功'
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
    SELECT id, name, type, created_at as created,
           CASE 
             WHEN type = 'text' AND content IS NOT NULL THEN LENGTH(content)
             ELSE NULL
           END as content_length
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
                const r2Objects = await env.AI_R2.list();
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
            const apiKeysData = await env.AI_KV.get("API_KEYS");
            const apiKeys = apiKeysData ? JSON.parse(apiKeysData) : [];
            const activeKeysCount = apiKeys.filter(key => key.active).length;
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
                activeKeys: activeKeysCount,
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
      SELECT name, type FROM files WHERE id = ?
    `).bind(fileId).first();
        if (!fileResult) {
            return new Response(JSON.stringify({ error: "\u6587\u4EF6\u4E0D\u5B58\u5728" }), {
                status: 404,
                headers
            });
        }
        // 删除 R2 中的文件（使用 fileId 作为 key）
        try {
            await env.AI_R2.delete(`files/${fileId}`);
            console.log(`✅ 已删除 R2 文件: files/${fileId}`);
        } catch (r2Error) {
            console.log(`⚠️ 删除 R2 文件失败: ${r2Error.message}`);
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
      SELECT id, name, type, content, created_at FROM files WHERE id = ?
    `).bind(fileId).first();
        if (!fileResult) {
            return new Response(JSON.stringify({ error: "\u6587\u4EF6\u4E0D\u5B58\u5728" }), {
                status: 404,
                headers
            });
        }
        if (fileResult.type === "file" && (!fileResult.content || fileResult.content.trim() === '')) {
            try {
                const r2Object = await env.AI_R2.get(`files/${fileResult.id}`);
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
async function handleDownloadFile(request, env, corsHeaders, fileId) {
    if (!await verifyAdmin(request, env)) {
        return new Response(JSON.stringify({ error: "未授权" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
    
    if (!fileId) {
        return new Response(JSON.stringify({ error: "文件ID不能为空" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
    
    try {
        const fileResult = await env.AI_DB.prepare(`
            SELECT id, name, type, content, created_at FROM files WHERE id = ?
        `).bind(fileId).first();
        
        if (!fileResult) {
            return new Response(JSON.stringify({ error: "文件不存在" }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }
        
        let fileContent = fileResult.content;
        
        // 如果是文件类型且内容为空，尝试从R2获取
        if (fileResult.type === "file" && (!fileContent || fileContent.trim() === '')) {
            try {
                const r2Object = await env.AI_R2.get(`files/${fileResult.id}`);
                if (r2Object) {
                    fileContent = await r2Object.text();
                }
            } catch (error) {
                console.error("获取R2文件内容失败:", error);
                return new Response(JSON.stringify({ error: "无法获取文件内容" }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }
        }
        
        if (!fileContent) {
            return new Response(JSON.stringify({ error: "文件内容为空" }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }
        
        // 确定文件名和内容类型
        let fileName = fileResult.name;
        let contentType = 'text/plain';
        
        // 根据文件类型设置内容类型
        if (fileResult.type === 'text') {
            contentType = 'text/plain; charset=utf-8';
            // 如果没有.txt后缀，添加一个
            if (!fileName.endsWith('.txt')) {
                fileName += '.txt';
            }
        } else if (fileResult.type === 'file') {
            // 尝试从文件名确定内容类型
            if (fileName.endsWith('.txt')) {
                contentType = 'text/plain; charset=utf-8';
            } else if (fileName.endsWith('.md')) {
                contentType = 'text/markdown; charset=utf-8';
            } else if (fileName.endsWith('.pdf')) {
                contentType = 'application/pdf';
            } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
                contentType = 'application/msword';
            } else {
                contentType = 'application/octet-stream';
            }
        }
        
        // 创建下载响应
        const headers = {
            ...corsHeaders,
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
            'Content-Length': fileContent.length.toString()
        };
        
        return new Response(fileContent, {
            status: 200,
            headers: headers
        });
        
    } catch (error) {
        console.error("下载文件错误:", error);
        return new Response(JSON.stringify({ error: "下载文件失败" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
}
__name(handleDownloadFile, "handleDownloadFile");

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
    const requestStartTime = new Date().toISOString();
    
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
    
    // 直接在这里插入API使用记录
    const requestData = await request.json();
    const { messages, stream = false, model: requestModel } = requestData;
    
    try {
        await env.AI_DB.prepare(`
            INSERT INTO api_usage (api_key, model, request_time, input_tokens, output_tokens, status, error_message)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(apiKey, requestModel || 'unknown', requestStartTime, 0, 0, 'started', null).run();
        console.log('📊 API usage record inserted at start');
    } catch (error) {
        console.error('❌ Failed to insert API usage record:', error);
    }
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
    
    // 支持 API Key 轮询
    const apiKeys = Array.isArray(aiConfig.apikeys) ? aiConfig.apikeys : (aiConfig.apikey ? [aiConfig.apikey] : []);
    if (apiKeys.length === 0) {
        return new Response(JSON.stringify({ error: "No API keys configured" }), {
            status: 500,
            headers
        });
    }
    
    // If model has bound AI models, use the first one
    let aiModel = aiConfig.model;
    if (modelConfig && modelConfig.boundModels && modelConfig.boundModels.length > 0) {
        aiModel = modelConfig.boundModels[0]; // 使用第一个绑定的模型
    }
    
    try {
        const aiResponse = await fetchWithRetry(`${aiConfig.baseurl}/v1/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: aiModel, // 使用绑定的模型或默认模型
                messages: limitedMessages,
                stream
            }),
            // Add timeout for long requests
            signal: AbortSignal.timeout(systemConfig.requestTimeout || 300000)
        }, apiKeys);
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
                    
                } catch (streamError) {
                    console.error("Stream processing error:", streamError);
                    
                    // Record API usage for failed streaming request
                    const estimatedInputTokens = Math.ceil(limitedMessages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0) / 4);
                    await recordApiUsage(env, apiKey, requestModel, requestStartTime, estimatedInputTokens, 0, 'error', streamError.message);
                } finally {
                    await writer.close();
                    
                    // Record API usage for streaming request (estimated tokens) - only if no error occurred
                    if (!streamError) {
                        const estimatedInputTokens = Math.ceil(limitedMessages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0) / 4);
                        const estimatedOutputTokens = Math.ceil(fullContent.length / 4);
                        await recordApiUsage(env, apiKey, requestModel, requestStartTime, estimatedInputTokens, estimatedOutputTokens, 'success');
                    }
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
            
            // Record API usage for successful request
            const inputTokens = result.usage?.prompt_tokens || 0;
            const outputTokens = result.usage?.completion_tokens || 0;
            await recordApiUsage(env, apiKey, requestModel, requestStartTime, inputTokens, outputTokens, 'success');
            
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
        
        // Record API usage for failed request
        await recordApiUsage(env, apiKey, requestModel, requestStartTime, 0, 0, 'error', error.message);
        
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
    
    // 支持 API Key 轮询
    const apiKeys = Array.isArray(aiConfig.apikeys) ? aiConfig.apikeys : (aiConfig.apikey ? [aiConfig.apikey] : []);
    if (apiKeys.length === 0) {
        return new Response(JSON.stringify({ error: "No API keys configured" }), {
            status: 500,
            headers
        });
    }
    
    const imagePrompt = prompt.substring(1).trim();
    try {
        const response = await fetchWithRetry(`${aiConfig.baseurl}/v1/images/generations`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "Kwai-Kolors/Kolors",
                prompt: imagePrompt,
                image_size: "1024x1024",
                batch_size: 1
            })
        }, apiKeys);
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
      SELECT id, name, type, content, embedding
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
        
        // 辅助函数：获取文档的完整内容
        const getDocumentContent = async (doc) => {
            if (doc.type === 'file' && (!doc.content || doc.content.trim() === '')) {
                // 对于文件类型，从R2获取内容
                try {
                    const r2Object = await env.AI_R2.get(`files/${doc.id}`);
                    if (r2Object) {
                        const content = await r2Object.text();
                        console.log(`📥 从R2获取文件内容: ${doc.name}, 长度: ${content.length}字符`);
                        return content;
                    }
                } catch (error) {
                    console.log(`❌ 无法从R2获取文件内容: ${doc.name}, 错误: ${error.message}`);
                    return '';
                }
            }
            return doc.content || '';
        };

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
            
            // 获取文档内容
            const docsWithContent = await Promise.all(
                lowThresholdDocs.map(async (doc) => ({
                    ...doc,
                    content: await getDocumentContent(doc)
                }))
            );
            
            console.log("📄 低阈值文档内容预览:");
            docsWithContent.forEach((doc, i) => {
                console.log(`  ${i+1}. ${doc.name}: "${doc.content.substring(0, 100)}${doc.content.length > 100 ? '...' : ''}" (${doc.content.length}字符)`);
            });
            const rerankedDocs = await rerank(query, docsWithContent.map((doc) => doc.content), env);
            console.log("🎯 RAG检索完成, 返回内容长度:", rerankedDocs.slice(0, 2).join("\n\n").length);
            return rerankedDocs.slice(0, 2).join("\n\n");
        }
        
        // 获取高阈值文档的内容
        const topDocsWithContent = await Promise.all(
            topDocs.map(async (doc) => ({
                ...doc,
                content: await getDocumentContent(doc)
            }))
        );
        
        console.log("📄 高阈值文档内容预览:");
        topDocsWithContent.forEach((doc, i) => {
            console.log(`  ${i+1}. ${doc.name}: "${doc.content.substring(0, 100)}${doc.content.length > 100 ? '...' : ''}" (${doc.content.length}字符)`);
        });
        const rerankedDocs = await rerank(query, topDocsWithContent.map((doc) => doc.content), env);
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

async function recordApiUsage(env, apiKey, model, requestTime, inputTokens = 0, outputTokens = 0, status = 'success', errorMessage = null) {
    try {
        console.log('📊 Recording API usage:', { apiKey: apiKey.substring(0, 10) + '...', model, inputTokens, outputTokens, status });
        await env.AI_DB.prepare(`
            INSERT INTO api_usage (api_key, model, request_time, input_tokens, output_tokens, status, error_message)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(apiKey, model, requestTime, inputTokens, outputTokens, status, errorMessage).run();
        console.log('✅ API usage recorded successfully');
    } catch (error) {
        console.error('❌ Failed to record API usage:', error);
        console.error('Error details:', error.message, error.stack);
    }
}
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
            case "sync-page":
                return handleNotionSyncPage(request, env, headers);
            case "sync-database":
                return handleNotionSyncDatabase(request, env, headers);
            case "check-page-synced":
                return handleCheckPageSynced(request, env, headers);
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

                        // 计算页面内容的哈希值
                        const pageHash = await calculateFileHash(content);
                        
                        // 检查是否已存在相同内容的页面（基于内容哈希）
                        const existingFile = await env.AI_DB.prepare(`
                            SELECT id, name, created_at FROM files 
                            WHERE file_hash = ?
                            LIMIT 1
                        `).bind(pageHash).first();
                        
                        const fileName = `Notion: [${page.id}] ${page.title}`;
                        const fileId = existingFile ? existingFile.id : crypto.randomUUID();
                        const now = new Date().toISOString();

                        if (existingFile) {
                            console.log(`📄 Notion页面内容重复: ${fileName} 与 ${existingFile.name} 内容相同，将更新现有记录`);
                            
                            // 更新现有记录
                            await env.AI_DB.prepare(`
                                UPDATE files 
                                SET name = ?, content = ?, embedding = ?, file_hash = ?, created_at = ?
                                WHERE id = ?
                            `).bind(fileName, content, embedding, pageHash, now, fileId).run();
                        } else {
                            console.log(`📄 新Notion页面同步: ${fileName}`);
                            
                            // 插入新记录
                            await env.AI_DB.prepare(`
                                INSERT INTO files 
                                (id, name, type, content, embedding, file_hash, created_at) 
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                            `).bind(
                                fileId,
                                fileName,
                                'text',
                                content,
                                embedding,
                                pageHash,
                                now
                            ).run();
                        }

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

// Sync single Notion page
async function handleNotionSyncPage(request, env, headers) {
    if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers
        });
    }

    try {
        const { pageId } = await request.json();
        
        if (!pageId) {
            return new Response(JSON.stringify({ error: "页面ID不能为空" }), {
                status: 400,
                headers
            });
        }

        const token = await env.AI_KV.get("NOTION_TOKEN");
        
        if (!token) {
            return new Response(JSON.stringify({ error: "未连接Notion" }), {
                status: 400,
                headers
            });
        }

        // Get page details from cache
        const pagesData = await env.AI_KV.get("NOTION_PAGES");
        const pages = pagesData ? JSON.parse(pagesData) : [];
        const page = pages.find(p => p.id === pageId);

        if (!page) {
            return new Response(JSON.stringify({ error: "页面不存在" }), {
                status: 404,
                headers
            });
        }

        // Fetch page content
        const contentResponse = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Notion-Version': '2022-06-28'
            }
        });

        if (!contentResponse.ok) {
            return new Response(JSON.stringify({ error: "获取页面内容失败" }), {
                status: 500,
                headers
            });
        }

        const contentData = await contentResponse.json();
        const content = extractPageContent(contentData.results);

        if (!content.trim()) {
            return new Response(JSON.stringify({ error: "页面内容为空" }), {
                status: 400,
                headers
            });
        }

        // Generate embedding for the content
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

        // 计算页面内容的哈希值
        const pageHash = await calculateFileHash(content);
        
        // 检查是否已存在相同内容的页面（基于内容哈希）
        const existingFile = await env.AI_DB.prepare(`
            SELECT id, name, created_at FROM files 
            WHERE file_hash = ?
            LIMIT 1
        `).bind(pageHash).first();
        
        const fileName = `Notion: [${pageId}] ${page.title}`;
        const fileId = existingFile ? existingFile.id : crypto.randomUUID();
        const now = new Date().toISOString();

        if (existingFile) {
            console.log(`📄 Notion页面内容重复: ${fileName} 与 ${existingFile.name} 内容相同，将更新现有记录`);
            
            // 更新现有记录
            await env.AI_DB.prepare(`
                UPDATE files 
                SET name = ?, content = ?, embedding = ?, file_hash = ?, created_at = ?
                WHERE id = ?
            `).bind(fileName, content, embedding, pageHash, now, fileId).run();
        } else {
            console.log(`📄 新Notion页面同步: ${fileName}`);
            
            // 插入新记录
            await env.AI_DB.prepare(`
                INSERT INTO files 
                (id, name, type, content, embedding, file_hash, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(
                fileId,
                fileName,
                'text',
                content,
                embedding,
                pageHash,
                now
            ).run();
        }

        return new Response(JSON.stringify({ 
            success: true,
            message: "页面同步成功",
            pageId: pageId,
            contentLength: content.length,
            hasEmbedding: !!embedding
        }), { headers });

    } catch (error) {
        console.error("Sync page error:", error);
        return new Response(JSON.stringify({ error: "同步页面时发生错误" }), {
            status: 500,
            headers
        });
    }
}
__name(handleNotionSyncPage, "handleNotionSyncPage");

// Sync Notion database
async function handleNotionSyncDatabase(request, env, headers) {
    if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers
        });
    }

    try {
        const { dbId } = await request.json();
        
        if (!dbId) {
            return new Response(JSON.stringify({ error: "数据库ID不能为空" }), {
                status: 400,
                headers
            });
        }

        const token = await env.AI_KV.get("NOTION_TOKEN");
        
        if (!token) {
            return new Response(JSON.stringify({ error: "未连接Notion" }), {
                status: 400,
                headers
            });
        }

        // Get database details from cache
        const databasesData = await env.AI_KV.get("NOTION_DATABASES");
        const databases = databasesData ? JSON.parse(databasesData) : [];
        const database = databases.find(d => d.id === dbId);

        if (!database) {
            return new Response(JSON.stringify({ error: "数据库不存在" }), {
                status: 404,
                headers
            });
        }

        // Fetch database entries (pages in the database)
        const queryResponse = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                page_size: 100
            })
        });

        if (!queryResponse.ok) {
            return new Response(JSON.stringify({ error: "获取数据库内容失败" }), {
                status: 500,
                headers
            });
        }

        const queryData = await queryResponse.json();
        const pages = queryData.results;
        let syncedCount = 0;

        // Sync each page in the database
        for (const page of pages) {
            try {
                const pageId = page.id;
                const title = extractPageTitle(page);
                
                // Fetch page content
                const contentResponse = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
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

                        // 计算页面内容的哈希值
                        const pageHash = await calculateFileHash(content);
                        
                        // 检查是否已存在相同内容的页面（基于内容哈希）
                        const existingFile = await env.AI_DB.prepare(`
                            SELECT id, name, created_at FROM files 
                            WHERE file_hash = ?
                            LIMIT 1
                        `).bind(pageHash).first();
                        
                        const fileName = `Notion DB: [${pageId}] ${title}`;
                        const fileId = existingFile ? existingFile.id : crypto.randomUUID();
                        const now = new Date().toISOString();

                        if (existingFile) {
                            console.log(`📄 Notion数据库页面内容重复: ${fileName} 与 ${existingFile.name} 内容相同，将更新现有记录`);
                            
                            // 更新现有记录
                            await env.AI_DB.prepare(`
                                UPDATE files 
                                SET name = ?, content = ?, embedding = ?, file_hash = ?, created_at = ?
                                WHERE id = ?
                            `).bind(fileName, content, embedding, pageHash, now, fileId).run();
                        } else {
                            console.log(`📄 新Notion数据库页面同步: ${fileName}`);
                            
                            // 插入新记录
                            await env.AI_DB.prepare(`
                                INSERT INTO files 
                                (id, name, type, content, embedding, file_hash, created_at) 
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                            `).bind(
                                fileId,
                                fileName,
                                'text',
                                content,
                                embedding,
                                pageHash,
                                now
                            ).run();
                        }

                        syncedCount++;
                    }
                }
            } catch (pageError) {
                console.error(`Error syncing page ${page.id}:`, pageError);
            }
        }

        return new Response(JSON.stringify({ 
            success: true,
            message: `数据库同步成功，处理了 ${syncedCount} 个页面`,
            databaseId: dbId,
            syncedPages: syncedCount,
            totalPages: pages.length
        }), { headers });

    } catch (error) {
        console.error("Sync database error:", error);
        return new Response(JSON.stringify({ error: "同步数据库时发生错误" }), {
            status: 500,
            headers
        });
    }
}
__name(handleNotionSyncDatabase, "handleNotionSyncDatabase");

// Check if page is synced
async function handleCheckPageSynced(request, env, headers) {
    if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers
        });
    }

    try {
        const { pageId } = await request.json();
        
        if (!pageId) {
            return new Response(JSON.stringify({ error: "页面ID不能为空" }), {
                status: 400,
                headers
            });
        }

        // Check if page exists in files table by looking for page ID in filename
        const result = await env.AI_DB.prepare(`
            SELECT id, created_at FROM files 
            WHERE name LIKE 'Notion: [%' || ? || ']%' AND type = 'text'
            LIMIT 1
        `).bind(pageId).first();

        const synced = !!result;

        return new Response(JSON.stringify({ 
            synced,
            pageId,
            syncedAt: result?.created_at || null
        }), { headers });

    } catch (error) {
        console.error("Check page synced error:", error);
        return new Response(JSON.stringify({ error: "检查页面同步状态时发生错误" }), {
            status: 500,
            headers
        });
    }
}
__name(handleCheckPageSynced, "handleCheckPageSynced");


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
                        
                        // 计算页面内容的哈希值
                        const pageHash = await calculateFileHash(content);
                        
                        // 检查是否已存在相同内容的页面（基于内容哈希）
                        const existingFile = await env.AI_DB.prepare(`
                            SELECT id, name, created_at FROM files 
                            WHERE file_hash = ?
                            LIMIT 1
                        `).bind(pageHash).first();
                        
                        const fileName = `Notion: ${page.title}`;
                        const fileId = existingFile ? existingFile.id : crypto.randomUUID();
                        const now = new Date().toISOString();

                        if (existingFile) {
                            console.log(`📄 自动同步 - Notion页面内容重复: ${fileName} 与 ${existingFile.name} 内容相同，将更新现有记录`);
                            
                            // 更新现有记录
                            await env.AI_DB.prepare(`
                                UPDATE files 
                                SET name = ?, content = ?, embedding = ?, file_hash = ?, created_at = ?
                                WHERE id = ?
                            `).bind(fileName, content, embedding, pageHash, now, fileId).run();
                        } else {
                            console.log(`📄 自动同步 - 新Notion页面同步: ${fileName}`);
                            
                            // 插入新记录
                            await env.AI_DB.prepare(`
                                INSERT INTO files 
                                (id, name, type, content, embedding, file_hash, created_at) 
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                            `).bind(
                                fileId,
                                fileName,
                                'text',
                                content,
                                embedding,
                                pageHash,
                                now
                            ).run();
                        }
                        
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

// Check API usage function
async function handleCheckApiUsage(request, env, corsHeaders) {
    const headers = { ...corsHeaders, "Content-Type": "application/json" };
    
    try {
        console.log('🔍 Checking API usage records');
        
        const result = await env.AI_DB.prepare(`
            SELECT * FROM api_usage 
            ORDER BY created_at DESC 
            LIMIT 10
        `).all();
        
        return new Response(JSON.stringify({ 
            success: true, 
            count: result.results.length,
            records: result.results 
        }), {
            status: 200,
            headers
        });
    } catch (error) {
        console.error('❌ Failed to check API usage:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to check API usage', 
            details: error.message 
        }), {
            status: 500,
            headers
        });
    }
}

// Test function for API usage tracking
async function handleTestDbInsert(request, env, corsHeaders) {
    const headers = { ...corsHeaders, "Content-Type": "application/json" };
    
    try {
        console.log('🧪 Testing database insert for API usage tracking');
        
        // Test the recordApiUsage function directly
        await recordApiUsage(
            env, 
            'sk-test-key-123', 
            'test-model', 
            new Date().toISOString(), 
            10, 
            20, 
            'success', 
            null
        );
        
        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Database insert test completed successfully' 
        }), {
            status: 200,
            headers
        });
    } catch (error) {
        console.error('❌ Database insert test failed:', error);
        return new Response(JSON.stringify({ 
            error: 'Database insert test failed', 
            details: error.message 
        }), {
            status: 500,
            headers
        });
    }
}

export {
    worker_default as default,
    scheduled
};
//# sourceMappingURL=worker.js.map
