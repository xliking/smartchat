-- AI Gateway 数据库初始化脚本
-- 用于创建 D1 数据库表结构

-- 文件存储表
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,                -- 文件唯一标识
    name TEXT NOT NULL,                 -- 文件名
    type TEXT NOT NULL,                 -- 文件类型 (file/text)
    content TEXT,                       -- 文本内容 (仅text类型)
    r2_key TEXT,                        -- R2存储键值 (用于文件类型)
    embedding TEXT,                     -- 嵌入向量 (JSON格式)
    created_at TEXT NOT NULL            -- 创建时间 (ISO 8601格式)
);

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_files_type ON files(type);
CREATE INDEX IF NOT EXISTS idx_files_created ON files(created_at);

-- 用户对话历史表
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,                -- 对话唯一标识
    api_key TEXT NOT NULL,              -- API密钥
    messages TEXT NOT NULL,             -- 消息内容 (JSON格式)
    created_at TEXT NOT NULL            -- 创建时间
);

-- 创建对话表索引
CREATE INDEX IF NOT EXISTS idx_conv_api_key ON conversations(api_key);
CREATE INDEX IF NOT EXISTS idx_conv_created ON conversations(created_at);

-- API密钥使用统计表 (可选)
CREATE TABLE IF NOT EXISTS api_usage (
    id TEXT PRIMARY KEY,
    api_key TEXT NOT NULL,
    endpoint TEXT NOT NULL,             -- 调用的端点
    tokens_used INTEGER DEFAULT 0,     -- 使用的token数
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_api_key ON api_usage(api_key);
CREATE INDEX IF NOT EXISTS idx_usage_created ON api_usage(created_at);