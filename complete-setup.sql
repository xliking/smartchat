-- =============================================================================
-- AI Gateway 完整数据库初始化脚本
-- 版本: 2025-01-01
-- 说明: 此脚本包含所有必需的表结构和索引，用于全新部署
-- =============================================================================

-- 文件存储表 - 存储上传的文件和文本内容
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,                -- 文件唯一标识 (UUID)
    name TEXT NOT NULL,                 -- 文件名或文本标题
    type TEXT NOT NULL,                 -- 文件类型 ('file' 或 'text')
    content TEXT,
    r2_key TEXT,
    embedding TEXT,                     -- 嵌入向量 (JSON格式字符串)
    file_hash TEXT,                     -- 文件内容哈希值 (SHA-256) 用于重复检查
    created_at TEXT NOT NULL            -- 创建时间 (ISO 8601格式)
);

-- 文件表索引 - 优化查询性能
CREATE INDEX IF NOT EXISTS idx_files_type ON files(type);
CREATE INDEX IF NOT EXISTS idx_files_created ON files(created_at);
CREATE INDEX IF NOT EXISTS idx_files_name ON files(name);
CREATE INDEX IF NOT EXISTS idx_files_hash ON files(file_hash);

-- 用户对话历史表 - 存储聊天记录，按API密钥隔离
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,                -- 对话唯一标识 (UUID)
    api_key TEXT NOT NULL,              -- 用户API密钥 (sk-开头)
    messages TEXT NOT NULL,             -- 消息内容 (JSON格式)
    created_at TEXT NOT NULL            -- 创建时间 (ISO 8601格式)
);

-- 对话表索引 - 优化按用户查询
CREATE INDEX IF NOT EXISTS idx_conv_api_key ON conversations(api_key);
CREATE INDEX IF NOT EXISTS idx_conv_created ON conversations(created_at);

-- API使用统计表 - 可选，用于追踪API调用
CREATE TABLE IF NOT EXISTS api_usage (
    id TEXT PRIMARY KEY,                -- 记录唯一标识 (UUID)
    api_key TEXT NOT NULL,              -- 用户API密钥
    endpoint TEXT NOT NULL,             -- 调用的端点路径
    tokens_used INTEGER DEFAULT 0,     -- 使用的token数量
    created_at TEXT NOT NULL            -- 调用时间 (ISO 8601格式)
);

-- 使用统计表索引
CREATE INDEX IF NOT EXISTS idx_usage_api_key ON api_usage(api_key);
CREATE INDEX IF NOT EXISTS idx_usage_created ON api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_endpoint ON api_usage(endpoint);

-- =============================================================================
-- 数据完整性检查和默认数据（可选）
-- =============================================================================

-- 验证表创建成功
SELECT 
    name, 
    type,
    CASE 
        WHEN type = 'table' THEN '✓ 表创建成功'
        WHEN type = 'index' THEN '✓ 索引创建成功'
        ELSE '? 未知对象类型'
    END as status
FROM sqlite_master 
WHERE name IN (
    'files', 'conversations', 'api_usage',
    'idx_files_type', 'idx_files_created', 'idx_files_name',
    'idx_conv_api_key', 'idx_conv_created',
    'idx_usage_api_key', 'idx_usage_created', 'idx_usage_endpoint'
)
ORDER BY type DESC, name;

-- 显示初始化完成信息
SELECT 
    'AI Gateway 数据库初始化完成！' as message,
    datetime('now') as completed_at;