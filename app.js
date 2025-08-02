// API 基础配置
let API_BASE_URL = 'https://ai-gateway.2190418744.workers.dev';
let authToken = localStorage.getItem('authToken');
let isInitialized = false;

// 初始化检查
async function checkInitialization() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/setup`);
        const data = await response.json();
        isInitialized = data.initialized;
        
        document.getElementById('loading').classList.add('hidden');
        
        if (!isInitialized) {
            document.getElementById('setup-page').classList.remove('hidden');
        } else if (!authToken) {
            document.getElementById('login-page').classList.remove('hidden');
        } else {
            await loadAdminPanel();
        }
    } catch (error) {
        console.error('Error checking initialization:', error);
        showNotification('检查初始化状态失败', 'error');
    }
}

// 简化的系统初始化 - 只需要密码
document.getElementById('setup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        password: document.getElementById('admin-password').value,
        // 使用默认配置
        aiConfig: {
            baseurl: '',
            apikey: '',
            model: ''
        },
        ragConfig: {
            baseurl: '',
            apikey: '',
            model: '',
            rerankModel: 'BAAI/bge-reranker-v2-m3'
        }
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/setup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();
            authToken = result.token;
            localStorage.setItem('authToken', authToken);
            showNotification('系统创建成功！首个API密钥：' + result.apiKey, 'success');
            await loadAdminPanel();
        } else {
            showNotification('系统创建失败', 'error');
        }
    } catch (error) {
        showNotification('创建请求失败', 'error');
    }
});

// 管理员登录
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (response.ok) {
            const result = await response.json();
            authToken = result.token;
            localStorage.setItem('authToken', authToken);
            await loadAdminPanel();
        } else {
            showNotification('密码错误', 'error');
        }
    } catch (error) {
        showNotification('登录请求失败', 'error');
    }
});

// 加载管理面板
async function loadAdminPanel() {
    document.getElementById('setup-page').classList.add('hidden');
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');

    await Promise.all([
        loadConfigs(),
        loadApiKeys(),
        loadFiles(),
        loadStatistics()
    ]);
    
    // 初始化模型管理事件
    initModelManagement();
}

// 加载所有配置
async function loadConfigs() {
    try {
        // 加载系统配置
        const systemResponse = await fetch(`${API_BASE_URL}/api/config`, {
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        
        if (systemResponse.ok) {
            const systemConfig = await systemResponse.json();
            document.getElementById('max-messages').value = systemConfig.maxMessages || 20;
            document.getElementById('enable-image').checked = systemConfig.enableImage || false;
        }
        
        // 加载模型配置
        await loadModels();

        // 加载 AI 配置
        const aiConfigResponse = await fetch(`${API_BASE_URL}/api/ai-config`, {
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        
        if (aiConfigResponse.ok) {
            const aiConfig = await aiConfigResponse.json();
            document.getElementById('ai-baseurl').value = aiConfig.baseurl || '';
            document.getElementById('ai-apikey').value = aiConfig.apikey || '';
            document.getElementById('ai-model').value = aiConfig.model || '';
        }

        // 加载 RAG 配置
        const ragConfigResponse = await fetch(`${API_BASE_URL}/api/rag-config`, {
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        
        if (ragConfigResponse.ok) {
            const ragConfig = await ragConfigResponse.json();
            document.getElementById('rag-baseurl').value = ragConfig.baseurl || '';
            document.getElementById('rag-apikey').value = ragConfig.apikey || '';
            document.getElementById('rag-model').value = ragConfig.model || '';
            document.getElementById('rag-rerank-model').value = ragConfig.rerankModel || 'BAAI/bge-reranker-v2-m3';
        }
        
        // 加载系统配置
        const systemConfigResponse = await fetch(`${API_BASE_URL}/api/config`, {
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        
        if (systemConfigResponse.ok) {
            const systemConfig = await systemConfigResponse.json();
            document.getElementById('max-messages').value = systemConfig.maxMessages || 20;
            document.getElementById('enable-image').checked = systemConfig.enableImage || false;
        }
    } catch (error) {
        console.error('Load configs error:', error);
    }
}

// AI 配置保存
document.getElementById('ai-config-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const config = {
        baseurl: document.getElementById('ai-baseurl').value,
        apikey: document.getElementById('ai-apikey').value,
        model: document.getElementById('ai-model').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/ai-config`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken 
            },
            body: JSON.stringify(config)
        });

        if (response.ok) {
            showNotification('AI 配置保存成功', 'success');
        } else {
            showNotification('AI 配置保存失败', 'error');
        }
    } catch (error) {
        showNotification('AI 配置保存请求失败', 'error');
    }
});

// RAG 配置保存
document.getElementById('rag-config-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const config = {
        baseurl: document.getElementById('rag-baseurl').value,
        apikey: document.getElementById('rag-apikey').value,
        model: document.getElementById('rag-model').value,
        rerankModel: document.getElementById('rag-rerank-model').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/rag-config`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken 
            },
            body: JSON.stringify(config)
        });

        if (response.ok) {
            showNotification('RAG 配置保存成功', 'success');
        } else {
            showNotification('RAG 配置保存失败', 'error');
        }
    } catch (error) {
        showNotification('RAG 配置保存请求失败', 'error');
    }
});

// 系统设置保存
document.getElementById('system-config-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const config = {
        maxMessages: parseInt(document.getElementById('max-messages').value),
        enableImage: document.getElementById('enable-image').checked
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/config`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken 
            },
            body: JSON.stringify(config)
        });

        if (response.ok) {
            showNotification('系统设置保存成功', 'success');
        } else {
            showNotification('系统设置保存失败', 'error');
        }
    } catch (error) {
        showNotification('系统设置保存请求失败', 'error');
    }
});

// 生成API密钥
document.getElementById('generate-key-btn').addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/keys`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + authToken }
        });

        if (response.ok) {
            const result = await response.json();
            showNotification('新API密钥：' + result.apiKey, 'success');
            await loadApiKeys();
        } else {
            showNotification('生成密钥失败', 'error');
        }
    } catch (error) {
        showNotification('生成密钥请求失败', 'error');
    }
});

// 加载API密钥
async function loadApiKeys() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/keys`, {
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        
        if (response.ok) {
            const keys = await response.json();
            const container = document.getElementById('api-keys-list');
            container.innerHTML = '';
            
            if (keys.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-12">
                        <i data-lucide="key" class="w-16 h-16 text-gray-400 mx-auto mb-4"></i>
                        <h3 class="text-lg font-semibold text-gray-700 mb-2">暂无API密钥</h3>
                        <p class="text-gray-500 mb-6">生成您的第一个API密钥来开始使用</p>
                        <button onclick="document.getElementById('generate-key-btn').click()" class="btn-primary px-6 py-3 text-white font-semibold rounded-xl">
                            <i data-lucide="plus" class="inline w-5 h-5 mr-2"></i>
                            生成密钥
                        </button>
                    </div>
                `;
                lucide.createIcons();
                return;
            }
            
            // 更新概览页面的密钥数量
            document.getElementById('keys-count').textContent = keys.length;
            
            keys.forEach(key => {
                const div = document.createElement('div');
                div.className = 'flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 transition-all duration-200';
                
                div.innerHTML = `
                    <div class="flex items-center space-x-4">
                        <div class="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl flex items-center justify-center">
                            <i data-lucide="key" class="w-5 h-5 text-white"></i>
                        </div>
                        <div>
                            <code class="text-sm font-mono text-gray-800 bg-gray-100 px-3 py-1 rounded-lg">${key.key}</code>
                            <p class="text-sm text-gray-500 mt-1">创建于 ${new Date(key.created).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <div class="status-badge status-online">
                            <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            活跃
                        </div>
                        <button onclick="revokeKey('${key.key}')" class="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                `;
                
                container.appendChild(div);
            });
            
            lucide.createIcons();
        }
    } catch (error) {
        console.error('Load keys error:', error);
    }
}

// 撤销密钥
async function revokeKey(key) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/keys`, {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken 
            },
            body: JSON.stringify({ key })
        });

        if (response.ok) {
            showNotification('密钥已撤销', 'success');
            await loadApiKeys();
        } else {
            showNotification('撤销失败', 'error');
        }
    } catch (error) {
        showNotification('撤销请求失败', 'error');
    }
}

// 模态框控制
function openFileModal() {
    const modal = document.getElementById('file-modal');
    const content = document.getElementById('file-modal-content');
    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
        // 模态框动画完成后初始化事件
        initModalFileEvents();
    }, 100);
}

// 初始化模态框文件事件
function initModalFileEvents() {
    const modalFileInput = document.getElementById('modal-file-upload');
    const modalDropZone = document.getElementById('modal-drop-zone');
    
    if (!modalFileInput || !modalDropZone) {
        console.error('Modal elements not found');
        return;
    }
    
    // 文件选择变化事件
    modalFileInput.addEventListener('change', function() {
        updateModalFileList();
    });
    
    // 拖拽事件
    modalDropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        modalDropZone.classList.add('drag-over');
    });

    modalDropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!modalDropZone.contains(e.relatedTarget)) {
            modalDropZone.classList.remove('drag-over');
        }
    });

    modalDropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        modalDropZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const validTypes = ['.txt', '.pdf', '.docx', '.md'];
            const invalidFiles = [];
            const validFiles = [];
            
            Array.from(files).forEach(file => {
                const fileExt = '.' + file.name.split('.').pop().toLowerCase();
                if (validTypes.includes(fileExt)) {
                    validFiles.push(file);
                } else {
                    invalidFiles.push(file.name);
                }
            });
            
            if (invalidFiles.length > 0) {
                showNotification(`不支持的文件类型: ${invalidFiles.join(', ')}`, 'error');
            }
            
            if (validFiles.length > 0) {
                const dt = new DataTransfer();
                validFiles.forEach(file => dt.items.add(file));
                modalFileInput.files = dt.files;
                updateModalFileList();
            }
        }
    });
}

// 更新模态框文件列表
function updateModalFileList() {
    const modalFileInput = document.getElementById('modal-file-upload');
    const modalSelectedFilesDiv = document.getElementById('modal-selected-files');
    const modalFileListDiv = document.getElementById('modal-file-list');
    
    if (!modalFileInput || !modalSelectedFilesDiv || !modalFileListDiv) {
        console.error('Modal file list elements not found');
        return;
    }
    
    const files = Array.from(modalFileInput.files);
    
    if (files.length === 0) {
        modalSelectedFilesDiv.classList.add('hidden');
        return;
    }

    modalSelectedFilesDiv.classList.remove('hidden');
    modalFileListDiv.innerHTML = '';

    files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'flex items-center justify-between text-sm text-blue-700';
        fileItem.innerHTML = `
            <span class="flex items-center">
                <i data-lucide="file-text" class="w-4 h-4 mr-2"></i>
                ${file.name} (${formatFileSize(file.size)})
            </span>
            <button onclick="removeModalFile(${index})" class="text-red-500 hover:text-red-700">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        `;
        modalFileListDiv.appendChild(fileItem);
    });
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// 移除模态框文件
function removeModalFile(index) {
    const modalFileInput = document.getElementById('modal-file-upload');
    if (!modalFileInput) return;
    
    const dt = new DataTransfer();
    const files = Array.from(modalFileInput.files);
    
    files.forEach((file, i) => {
        if (i !== index) dt.items.add(file);
    });
    
    modalFileInput.files = dt.files;
    updateModalFileList();
}

function closeFileModal() {
    const modal = document.getElementById('file-modal');
    const content = document.getElementById('file-modal-content');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        // 清理状态
        document.getElementById('modal-file-upload').value = '';
        document.getElementById('modal-selected-files').classList.add('hidden');
    }, 300);
}

function openTextModal() {
    const modal = document.getElementById('text-modal');
    const content = document.getElementById('text-modal-content');
    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeTextModal() {
    const modal = document.getElementById('text-modal');
    const content = document.getElementById('text-modal-content');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        // 清理状态
        document.getElementById('modal-text-upload').value = '';
    }, 300);
}

function showConfirm(title, message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    const content = document.getElementById('confirm-modal-content');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
    
    const confirmHandler = () => {
        closeConfirmModal();
        onConfirm();
        document.getElementById('confirm-ok').removeEventListener('click', confirmHandler);
    };
    
    document.getElementById('confirm-ok').addEventListener('click', confirmHandler);
}

function closeConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    const content = document.getElementById('confirm-modal-content');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

// 文件选择器现在通过HTML onclick直接调用

// 模态框事件监听
document.getElementById('open-file-modal').addEventListener('click', openFileModal);
document.getElementById('file-modal-close').addEventListener('click', closeFileModal);
document.getElementById('file-modal-cancel').addEventListener('click', closeFileModal);

document.getElementById('open-text-modal').addEventListener('click', openTextModal);
document.getElementById('text-modal-close').addEventListener('click', closeTextModal);
document.getElementById('text-modal-cancel').addEventListener('click', closeTextModal);

document.getElementById('confirm-cancel').addEventListener('click', closeConfirmModal);

// 文件上传（模态框版本）
document.getElementById('modal-upload-file-btn').addEventListener('click', async () => {
    const fileInput = document.getElementById('modal-file-upload');
    const files = Array.from(fileInput.files);
    
    if (files.length === 0) {
        showNotification('请选择文件', 'error');
        return;
    }

    const uploadBtn = document.getElementById('modal-upload-file-btn');
    const originalText = uploadBtn.innerHTML;
    
    let successCount = 0;
    let errorCount = 0;

    uploadBtn.innerHTML = '<i data-lucide="loader" class="inline w-5 h-5 mr-2 animate-spin"></i>上传中...';
    uploadBtn.disabled = true;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + authToken },
                body: formData
            });

            if (response.ok) {
                successCount++;
                showNotification(`${file.name} 上传成功`, 'success');
            } else {
                errorCount++;
                showNotification(`${file.name} 上传失败`, 'error');
            }
        } catch (error) {
            errorCount++;
            showNotification(`${file.name} 上传请求失败`, 'error');
        }
    }

    uploadBtn.innerHTML = originalText;
    uploadBtn.disabled = false;
    
    if (successCount > 0) {
        closeFileModal();
        await loadFiles(currentFilePage);
        await loadStatistics(); // 刷新统计信息
    }
    
    if (successCount > 0 && errorCount === 0) {
        showNotification(`成功上传 ${successCount} 个文件`, 'success');
    } else if (successCount > 0 && errorCount > 0) {
        showNotification(`成功上传 ${successCount} 个文件，失败 ${errorCount} 个`, 'warning');
    }
});

// 文本上传（模态框版本）
document.getElementById('modal-upload-text-btn').addEventListener('click', async () => {
    const text = document.getElementById('modal-text-upload').value.trim();
    
    if (!text) {
        showNotification('请输入文本内容', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/upload`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken 
            },
            body: JSON.stringify({ text })
        });

        if (response.ok) {
            showNotification('文本添加成功', 'success');
            closeTextModal();
            await loadFiles(currentFilePage);
            await loadStatistics(); // 刷新统计信息
        } else {
            showNotification('文本添加失败', 'error');
        }
    } catch (error) {
        showNotification('文本添加请求失败', 'error');
    }
});

// 文件分页变量
let currentFilePage = 1;
const filesPerPage = 10;

// 加载文件列表
async function loadFiles(page = 1) {
    currentFilePage = page;
    try {
        const response = await fetch(`${API_BASE_URL}/api/files?page=${page}&limit=${filesPerPage}`, {
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        
        if (response.ok) {
            const data = await response.json();
            const files = data.files || data; // 兼容旧格式
            const pagination = data.pagination;
            
            const container = document.getElementById('files-list');
            container.innerHTML = '';
            
            // 更新概览页面的文件数量
            if (pagination) {
                document.getElementById('files-count').textContent = pagination.total;
            } else {
                document.getElementById('files-count').textContent = files.length;
            }
            
            if (files.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-12">
                        <i data-lucide="folder-open" class="w-16 h-16 text-gray-400 mx-auto mb-4"></i>
                        <h3 class="text-lg font-semibold text-gray-700 mb-2">知识库为空</h3>
                        <p class="text-gray-500 mb-6">上传文档或添加文本来构建您的知识库</p>
                        <div class="flex justify-center space-x-4">
                            <button onclick="document.querySelector('.nav-item[data-section=\"knowledge\"]').click()" class="btn-primary px-6 py-3 text-white font-semibold rounded-xl">
                                <i data-lucide="upload" class="inline w-5 h-5 mr-2"></i>
                                上传文件
                            </button>
                        </div>
                    </div>
                `;
                lucide.createIcons();
                return;
            }
            
            files.forEach(file => {
                const div = document.createElement('div');
                div.className = 'flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 transition-all duration-200 hover:shadow-md';
                
                const fileTypeIcon = getFileTypeIcon(file.type);
                const fileTypeColor = getFileTypeColor(file.type);
                const fileSize = file.content ? `${file.content.length.toLocaleString()} 字符` : 'N/A'; // 显示字符数
                const createdDate = new Date(file.created_at || file.created).toLocaleString();
                
                div.innerHTML = `
                    <div class="flex items-center space-x-4 flex-1">
                        <div class="w-12 h-12 ${fileTypeColor} rounded-xl flex items-center justify-center">
                            <i data-lucide="${fileTypeIcon}" class="w-6 h-6 text-white"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h4 class="font-semibold text-gray-900 truncate">${file.name}</h4>
                            <div class="flex items-center space-x-4 text-sm text-gray-500">
                                <span class="flex items-center">
                                    <i data-lucide="file-type" class="w-4 h-4 mr-1"></i>
                                    ${file.type}
                                </span>
                                <span class="flex items-center">
                                    <i data-lucide="hard-drive" class="w-4 h-4 mr-1"></i>
                                    ${fileSize}
                                </span>
                                <span class="flex items-center">
                                    <i data-lucide="calendar" class="w-4 h-4 mr-1"></i>
                                    ${createdDate}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <div class="status-badge status-online">
                            <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            已索引
                        </div>
                        ${file.type === 'text' ? `
                            <button onclick="previewFile('${file.id}', '${file.name}', '${file.type}')" class="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200" title="预览">
                                <i data-lucide="eye" class="w-4 h-4"></i>
                            </button>
                        ` : ''}
                        <button onclick="deleteFile('${file.id}', '${file.name}')" class="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200" title="删除">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                `;
                
                container.appendChild(div);
            });
            
            lucide.createIcons();
            
            // 更新分页控件
            if (pagination) {
                updateFilesPagination(pagination);
            }
        }
    } catch (error) {
        console.error('Load files error:', error);
    }
}

// 文件大小格式化函数
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 文件预览功能
async function previewFile(fileId, fileName, fileType) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/files/${fileId}`, {
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        
        if (response.ok) {
            const fileData = await response.json();
            showModal(`文件预览 - ${fileName}`, `
                <div class="max-w-4xl">
                    <div class="mb-4 p-3 bg-gray-50 rounded-lg">
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div><span class="font-medium">文件名:</span> ${fileName}</div>
                            <div><span class="font-medium">类型:</span> ${fileType}</div>
                            <div><span class="font-medium">创建时间:</span> ${new Date(fileData.created_at).toLocaleString()}</div>
                            <div><span class="font-medium">内容长度:</span> ${fileData.content ? fileData.content.length : 0} 字符</div>
                        </div>
                    </div>
                    <div class="max-h-96 overflow-y-auto">
                        <pre class="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg border">${fileData.content || '无内容'}</pre>
                    </div>
                </div>
            `);
        } else {
            showNotification('获取文件内容失败', 'error');
        }
    } catch (error) {
        showNotification('预览请求失败', 'error');
    }
}

// 退出登录
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('authToken');
    location.reload();
});

// 通知消息
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    
    // 清除所有类型类名
    notification.classList.remove('success', 'error', 'warning', 'info');
    
    // 添加对应类型的类名
    notification.classList.add('notification', type, 'show');
    
    // 设置不同类型的显示时间
    const duration = type === 'error' ? 5000 : 3000;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, duration);
}

// 获取文件类型图标
function getFileTypeIcon(type) {
    const icons = {
        'text/plain': 'file-text',
        'application/pdf': 'file-text',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'file-text',
        'text/markdown': 'file-text',
        'application/msword': 'file-text',
        'default': 'file'
    };
    return icons[type] || icons['default'];
}

// 获取文件类型颜色
function getFileTypeColor(type) {
    const colors = {
        'text/plain': 'bg-blue-500',
        'application/pdf': 'bg-red-500',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'bg-blue-600',
        'text/markdown': 'bg-green-500',
        'application/msword': 'bg-blue-600',
        'default': 'bg-gray-500'
    };
    return colors[type] || colors['default'];
}

// 删除文件
async function deleteFile(fileId, fileName) {
    showConfirm(
        '删除文件',
        `确定要删除文件 "${fileName}" 吗？此操作不可撤销。`,
        async () => {
            await performDeleteFile(fileId);
        }
    );
}

async function performDeleteFile(fileId) {
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/files/${fileId}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + authToken }
        });

        if (response.ok) {
            showNotification('文件删除成功', 'success');
            await loadFiles(currentFilePage);
            await loadStatistics(); // 刷新统计信息
        } else {
            showNotification('文件删除失败', 'error');
        }
    } catch (error) {
        showNotification('删除请求失败', 'error');
    }
}

// 模型管理功能
let models = [];

// 加载模型列表
async function loadModels() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/models`, {
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        
        if (response.ok) {
            models = await response.json();
            renderModels();
        }
    } catch (error) {
        console.error('Load models error:', error);
    }
}

// 渲染模型列表
function renderModels() {
    const container = document.getElementById('models-list');
    container.innerHTML = '';
    
    if (models.length === 0) {
        container.innerHTML = `
            <div class="glass-card rounded-2xl p-12 text-center">
                <i data-lucide="brain" class="w-16 h-16 text-gray-400 mx-auto mb-4"></i>
                <h3 class="text-lg font-semibold text-gray-700 mb-2">暂无模型配置</h3>
                <p class="text-gray-500 mb-6">点击上方按钮添加您的第一个AI模型</p>
                <button onclick="addModel()" class="btn-primary px-6 py-3 text-white font-semibold rounded-xl">
                    <i data-lucide="plus" class="inline w-5 h-5 mr-2"></i>
                    立即添加
                </button>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    models.forEach((model, index) => {
        const div = document.createElement('div');
        div.className = 'glass-card card-hover rounded-2xl p-6';
        
        div.innerHTML = `
            <div class="flex items-start justify-between mb-4">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <i data-lucide="cpu" class="w-5 h-5 text-white"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900">${model.name}</h3>
                        <p class="text-sm text-gray-500">AI 模型</p>
                    </div>
                </div>
                <div class="flex space-x-2">
                    <button onclick="editModel(${index})" class="px-3 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-200">
                        <i data-lucide="edit-2" class="w-4 h-4"></i>
                    </button>
                    <button onclick="deleteModel(${index})" class="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
            <div class="bg-gray-50 rounded-xl p-4">
                <h4 class="text-sm font-semibold text-gray-700 mb-2">系统提示词</h4>
                <p class="text-sm text-gray-600 leading-relaxed">${model.systemPrompt || '<span class="text-gray-400">未设置系统提示词</span>'}</p>
            </div>
        `;
        
        container.appendChild(div);
    });
    
    lucide.createIcons();
}

// 初始化模型管理事件
function initModelManagement() {
    document.getElementById('add-model-btn').addEventListener('click', addModel);
}

// 添加模型
function addModel() {
    showModal('添加新模型', `
        <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">模型名称 *</label>
            <input type="text" id="model-name" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="例如：gpt-4, claude-3">
        </div>
        <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">系统提示词</label>
            <textarea id="model-prompt" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none" rows="4" placeholder="输入该模型的系统提示词（可选）"></textarea>
        </div>
    `, () => {
        const name = document.getElementById('model-name').value.trim();
        const systemPrompt = document.getElementById('model-prompt').value.trim();
        
        if (!name) {
            showNotification('请输入模型名称', 'error');
            return false;
        }
        
        // 检查模型名称是否已存在
        if (models.find(m => m.name === name)) {
            showNotification('模型名称已存在', 'error');
            return false;
        }
        
        const newModel = { name, systemPrompt };
        models.push(newModel);
        saveModels();
        renderModels();
        showNotification('模型添加成功', 'success');
        return true;
    });
}

// 编辑模型
function editModel(index) {
    const model = models[index];
    showModal('编辑模型', `
        <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">模型名称 *</label>
            <input type="text" id="model-name" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="例如：gpt-4, claude-3" value="${model.name}">
        </div>
        <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">系统提示词</label>
            <textarea id="model-prompt" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none" rows="4" placeholder="输入该模型的系统提示词（可选）">${model.systemPrompt}</textarea>
        </div>
    `, () => {
        const name = document.getElementById('model-name').value.trim();
        const systemPrompt = document.getElementById('model-prompt').value.trim();
        
        if (!name) {
            showNotification('请输入模型名称', 'error');
            return false;
        }
        
        // 检查模型名称是否已存在（排除当前模型）
        if (models.find((m, i) => m.name === name && i !== index)) {
            showNotification('模型名称已存在', 'error');
            return false;
        }
        
        models[index] = { name, systemPrompt };
        saveModels();
        renderModels();
        showNotification('模型更新成功', 'success');
        return true;
    });
}

// 删除模型
function deleteModel(index) {
    const model = models[index];
    showModal('删除模型', `
        <div class="text-center">
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" class="text-red-600">
                    <path d="m3 6 3 0m0 0 12 0m-12 0 1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14m-1 0V4a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v2"/>
                    <path d="M10 11v6m4-6v6"/>
                </svg>
            </div>
            <h4 class="text-lg font-semibold text-gray-900 mb-2">确定删除模型？</h4>
            <p class="text-gray-600 mb-4">您即将删除模型 <span class="font-semibold text-gray-900">"${model.name}"</span>，此操作不可逆转。</p>
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p class="text-sm text-yellow-800">⚠️ 删除后，使用该模型的API调用将无法获取对应的系统提示词。</p>
            </div>
        </div>
    `, () => {
        models.splice(index, 1);
        saveModels();
        renderModels();
        showNotification('模型删除成功', 'success');
        return true;
    });
}

// 保存模型配置
async function saveModels() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/models`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken 
            },
            body: JSON.stringify(models)
        });

        if (response.ok) {
            showNotification('模型配置保存成功', 'success');
        } else {
            showNotification('模型配置保存失败', 'error');
        }
    } catch (error) {
        showNotification('模型配置保存请求失败', 'error');
    }
}

// 模态框管理
let currentModalCallback = null;

function showModal(title, content, onConfirm) {
    const overlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    
    titleEl.textContent = title;
    bodyEl.innerHTML = content;
    currentModalCallback = onConfirm;
    
    overlay.classList.remove('hidden');
    overlay.classList.add('modal-entering');
    
    setTimeout(() => {
        overlay.classList.remove('modal-entering');
        overlay.classList.add('modal-show');
    }, 10);
}

function hideModal() {
    const overlay = document.getElementById('modal-overlay');
    
    overlay.classList.remove('modal-show');
    overlay.classList.add('modal-leaving');
    
    setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.classList.remove('modal-leaving');
        currentModalCallback = null;
    }, 300);
}

// 模态框事件监听
document.getElementById('modal-close').addEventListener('click', hideModal);
document.getElementById('modal-cancel').addEventListener('click', hideModal);
document.getElementById('modal-confirm').addEventListener('click', () => {
    if (currentModalCallback) {
        const result = currentModalCallback();
        if (result !== false) {
            hideModal();
        }
    } else {
        hideModal();
    }
});

// 点击遮罩关闭模态框
document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        hideModal();
    }
});

// ESC 键关闭模态框
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('modal-overlay').classList.contains('hidden')) {
        hideModal();
    }
});

// 文件选择和拖拽处理
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('file-upload');
    const dropZone = document.getElementById('drop-zone');
    const selectedFilesDiv = document.getElementById('selected-files');
    const fileListDiv = document.getElementById('file-list');

    // 这些元素在新版本中不存在，跳过
    if (!fileInput || !dropZone || !selectedFilesDiv || !fileListDiv) {
        return;
    }

    // 文件选择处理
    fileInput.addEventListener('change', function() {
        updateFileList();
    });

    // 点击上传区域选择文件（排除按钮点击）
    dropZone.addEventListener('click', function(e) {
        // 如果点击的是按钮或按钮内的元素，不触发文件选择
        if (e.target.closest('#upload-file-btn')) {
            return;
        }
        fileInput.click();
    });

    // 拖拽处理
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        // 只有当离开整个drop zone时才移除样式
        if (!dropZone.contains(e.relatedTarget)) {
            dropZone.classList.remove('drag-over');
        }
    });

    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            // 验证文件类型
            const validTypes = ['.txt', '.pdf', '.docx', '.md'];
            const invalidFiles = [];
            const validFiles = [];
            
            Array.from(files).forEach(file => {
                const fileExt = '.' + file.name.split('.').pop().toLowerCase();
                if (validTypes.includes(fileExt)) {
                    validFiles.push(file);
                } else {
                    invalidFiles.push(file.name);
                }
            });
            
            if (invalidFiles.length > 0) {
                showNotification(`不支持的文件类型: ${invalidFiles.join(', ')}`, 'error');
            }
            
            if (validFiles.length > 0) {
                // 创建新的FileList
                const dt = new DataTransfer();
                validFiles.forEach(file => dt.items.add(file));
                fileInput.files = dt.files;
                updateFileList();
            }
        }
    });

    function updateFileList() {
        const files = Array.from(fileInput.files);
        
        if (files.length === 0) {
            selectedFilesDiv.classList.add('hidden');
            return;
        }

        selectedFilesDiv.classList.remove('hidden');
        fileListDiv.innerHTML = '';

        files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'flex items-center justify-between text-sm text-blue-700';
            fileItem.innerHTML = `
                <span class="flex items-center">
                    <i data-lucide="file-text" class="w-4 h-4 mr-2"></i>
                    ${file.name} (${formatFileSize(file.size)})
                </span>
                <button onclick="removeFile(${index})" class="text-red-500 hover:text-red-700">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            `;
            fileListDiv.appendChild(fileItem);
        });
        
        // 重新初始化Lucide图标
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // 移除文件函数
    window.removeFile = function(index) {
        const dt = new DataTransfer();
        const files = Array.from(fileInput.files);
        
        files.forEach((file, i) => {
            if (i !== index) dt.items.add(file);
        });
        
        fileInput.files = dt.files;
        updateFileList();
    };

    // 文件大小格式化
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // 这些功能现在在initModalFileEvents中处理
});

// 加载统计信息
async function loadStatistics() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/statistics`, {
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        
        if (response.ok) {
            const stats = await response.json();
            
            // 更新统计数字
            document.getElementById('total-uploads').textContent = stats.totalUploads;
            document.getElementById('text-files').textContent = stats.textFiles;
            document.getElementById('uploaded-files').textContent = stats.uploadedFiles;
            document.getElementById('keys-count').textContent = stats.activeKeys;
            document.getElementById('total-requests').textContent = stats.totalRequests;
            document.getElementById('system-uptime').textContent = stats.systemStatus === 'online' ? '在线' : '离线';
            
            // 更新存储统计
            const formatBytes = (bytes) => {
                if (bytes === 0) return '0 B';
                const k = 1024;
                const sizes = ['B', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            };
            
            document.getElementById('text-storage').textContent = formatBytes(stats.textStorage);
            document.getElementById('file-storage').textContent = formatBytes(stats.fileStorage);
            document.getElementById('total-storage').textContent = `${formatBytes(stats.usedStorage)} / ${formatBytes(stats.totalStorage)}`;
            
            // 更新存储进度条
            const usagePercent = stats.storageUsagePercent || 0;
            const textPercent = stats.totalStorage > 0 ? (stats.textStorage / stats.totalStorage) * 100 : 0;
            const filePercent = stats.totalStorage > 0 ? (stats.fileStorage / stats.totalStorage) * 100 : 0;
            
            document.getElementById('text-storage-bar').style.width = `${textPercent}%`;
            document.getElementById('file-storage-bar').style.width = `${filePercent}%`;
            
            // 如果有存储使用百分比显示元素，也更新它
            const storagePercentElement = document.getElementById('storage-usage-percent');
            if (storagePercentElement) {
                storagePercentElement.textContent = `${usagePercent}%`;
            }
            
            // 更新最近上传
            const recentUploadsContainer = document.getElementById('recent-uploads');
            recentUploadsContainer.innerHTML = '';
            
            if (stats.recentFiles.length === 0) {
                recentUploadsContainer.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2"></i>
                        <p>暂无上传记录</p>
                    </div>
                `;
            } else {
                stats.recentFiles.forEach(file => {
                    const fileItem = document.createElement('div');
                    fileItem.className = 'flex items-center space-x-3 p-3 bg-gray-50 rounded-lg';
                    
                    const fileTypeIcon = getFileTypeIcon(file.type);
                    const createdDate = new Date(file.created_at).toLocaleDateString();
                    
                    fileItem.innerHTML = `
                        <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <i data-lucide="${fileTypeIcon}" class="w-4 h-4 text-blue-600"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900 truncate">${file.name}</p>
                            <p class="text-xs text-gray-500">${createdDate}</p>
                        </div>
                        <span class="text-xs px-2 py-1 bg-${file.type === 'text' ? 'green' : 'blue'}-100 text-${file.type === 'text' ? 'green' : 'blue'}-800 rounded-full">
                            ${file.type === 'text' ? '文本' : '文件'}
                        </span>
                    `;
                    
                    recentUploadsContainer.appendChild(fileItem);
                });
            }
            
            // 重新初始化图标
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    } catch (error) {
        console.error('Load statistics error:', error);
    }
}

// 更新文件分页控件
function updateFilesPagination(pagination) {
    const paginationContainer = document.getElementById('files-pagination');
    const startSpan = document.getElementById('files-start');
    const endSpan = document.getElementById('files-end');
    const totalSpan = document.getElementById('files-total');
    const prevBtn = document.getElementById('files-prev');
    const nextBtn = document.getElementById('files-next');
    const pageNumbersContainer = document.getElementById('files-page-numbers');
    
    if (pagination.total === 0) {
        paginationContainer.classList.add('hidden');
        return;
    }
    
    paginationContainer.classList.remove('hidden');
    
    // 更新信息
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.total);
    
    startSpan.textContent = start;
    endSpan.textContent = end;
    totalSpan.textContent = pagination.total;
    
    // 更新按钮状态
    prevBtn.disabled = !pagination.hasPrev;
    nextBtn.disabled = !pagination.hasNext;
    
    // 生成页码按钮
    pageNumbersContainer.innerHTML = '';
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, pagination.page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `px-3 py-2 text-sm border rounded-lg ${
            i === pagination.page 
                ? 'bg-indigo-600 text-white border-indigo-600' 
                : 'border-gray-300 hover:bg-gray-50'
        }`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => loadFiles(i);
        pageNumbersContainer.appendChild(pageBtn);
    }
}

// 初始化分页事件处理
document.addEventListener('DOMContentLoaded', function() {
    // 上一页按钮
    document.getElementById('files-prev').addEventListener('click', () => {
        if (currentFilePage > 1) {
            loadFiles(currentFilePage - 1);
        }
    });
    
    // 下一页按钮
    document.getElementById('files-next').addEventListener('click', () => {
        loadFiles(currentFilePage + 1);
    });
});

// 页面加载时检查初始化状态
checkInitialization();

// 页面加载时检查Notion连接状态
async function checkNotionConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/notion/status`, {
            headers: {
                'Authorization': 'Bearer ' + authToken
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.connected) {
                notionConfig.connected = true;
                notionConfig.token = data.token;
                updateNotionConnectionStatus(true);
                
                // Load cached data
                await loadNotionDatabases();
                await loadNotionPages();
                
                // Load settings
                await loadNotionSettings();
            }
        }
    } catch (error) {
        console.log('No existing Notion connection');
    }
}

// 当加载管理面板时检查Notion连接
document.addEventListener('DOMContentLoaded', function() {
    if (authToken) {
        setTimeout(checkNotionConnection, 1000);
    }
});

// =============================================================================
// Notion MCP Integration
// =============================================================================

let notionConfig = {
    token: null,
    connected: false,
    databases: [],
    pages: []
};

// Notion connection management
async function connectNotion() {
    const token = document.getElementById('notion-token').value.trim();
    
    if (!token) {
        showNotification('请输入Notion Integration Token', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/notion/connect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken
            },
            body: JSON.stringify({ token })
        });
        
        if (response.ok) {
            const data = await response.json();
            notionConfig.token = token;
            notionConfig.connected = true;
            
            updateNotionConnectionStatus(true);
            showNotification('Notion连接成功', 'success');
            
            // Load databases and pages
            await loadNotionDatabases();
            await loadNotionPages();
            
            // Load settings
            await loadNotionSettings();
        } else {
            const error = await response.json();
            showNotification(`连接失败: ${error.error}`, 'error');
        }
    } catch (error) {
        console.error('Notion connection error:', error);
        showNotification('连接Notion时发生错误', 'error');
    }
}

async function disconnectNotion() {
    try {
        await fetch(`${API_BASE_URL}/api/notion/disconnect`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + authToken
            }
        });
        
        notionConfig.token = null;
        notionConfig.connected = false;
        notionConfig.databases = [];
        notionConfig.pages = [];
        
        updateNotionConnectionStatus(false);
        document.getElementById('notion-token').value = '';
        showNotification('已断开Notion连接', 'success');
        
        // Clear lists
        document.getElementById('notion-databases-list').innerHTML = '<div class="flex items-center justify-center py-8 text-gray-500"><i data-lucide="database" class="w-8 h-8 mr-2"></i><span>请先连接Notion获取数据库列表</span></div>';
        document.getElementById('notion-pages-list').innerHTML = '<div class="flex items-center justify-center py-8 text-gray-500"><i data-lucide="file-text" class="w-8 h-8 mr-2"></i><span>请先连接Notion获取页面列表</span></div>';
        
    } catch (error) {
        console.error('Notion disconnect error:', error);
        showNotification('断开连接时发生错误', 'error');
    }
}

function updateNotionConnectionStatus(connected) {
    const statusIcon = document.getElementById('notion-status-icon');
    const statusText = document.getElementById('notion-status-text');
    const connectBtn = document.getElementById('notion-connect-btn');
    const disconnectBtn = document.getElementById('notion-disconnect-btn');
    
    if (connected) {
        statusIcon.className = 'w-3 h-3 bg-green-500 rounded-full mr-3';
        statusText.textContent = '已连接';
        statusText.className = 'text-sm text-green-600 font-medium';
        connectBtn.classList.add('hidden');
        disconnectBtn.classList.remove('hidden');
    } else {
        statusIcon.className = 'w-3 h-3 bg-red-500 rounded-full mr-3';
        statusText.textContent = '未连接';
        statusText.className = 'text-sm text-red-600 font-medium';
        connectBtn.classList.remove('hidden');
        disconnectBtn.classList.add('hidden');
    }
}

// Load Notion databases
async function loadNotionDatabases() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/notion/databases`, {
            headers: {
                'Authorization': 'Bearer ' + authToken
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            notionConfig.databases = data.databases || [];
            displayNotionDatabases();
        }
    } catch (error) {
        console.error('Load databases error:', error);
    }
}

function displayNotionDatabases() {
    const container = document.getElementById('notion-databases-list');
    const syncContainer = document.getElementById('sync-databases-list');
    
    if (notionConfig.databases.length === 0) {
        container.innerHTML = '<div class="flex items-center justify-center py-8 text-gray-500"><i data-lucide="database" class="w-8 h-8 mr-2"></i><span>未找到数据库</span></div>';
        syncContainer.innerHTML = '<p class="text-sm text-gray-500">未找到数据库</p>';
        return;
    }
    
    // Display in databases tab
    container.innerHTML = '';
    notionConfig.databases.forEach(db => {
        const dbItem = document.createElement('div');
        dbItem.className = 'flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50';
        dbItem.innerHTML = `
            <div class="flex items-center">
                <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <i data-lucide="database" class="w-4 h-4 text-purple-600"></i>
                </div>
                <div>
                    <h5 class="font-medium text-gray-900">${db.title}</h5>
                    <p class="text-sm text-gray-500">${db.id}</p>
                </div>
            </div>
            <div class="flex space-x-2">
                <button class="sync-database-btn px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100" data-id="${db.id}">
                    <i data-lucide="refresh-cw" class="inline w-3 h-3 mr-1"></i>
                    同步
                </button>
                <button class="view-database-btn px-3 py-1 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100" data-id="${db.id}">
                    <i data-lucide="external-link" class="inline w-3 h-3 mr-1"></i>
                    查看
                </button>
            </div>
        `;
        container.appendChild(dbItem);
    });
    
    // Display in sync settings
    syncContainer.innerHTML = '';
    notionConfig.databases.forEach(db => {
        const checkboxItem = document.createElement('label');
        checkboxItem.className = 'flex items-center text-sm';
        checkboxItem.innerHTML = `
            <input type="checkbox" class="sync-db-checkbox rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-2" data-id="${db.id}">
            <span class="text-gray-700">${db.title}</span>
        `;
        syncContainer.appendChild(checkboxItem);
    });
    
    // Populate dropdowns
    populateNotionDropdowns();
    
    // Re-initialize icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Load Notion pages
async function loadNotionPages() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/notion/pages`, {
            headers: {
                'Authorization': 'Bearer ' + authToken
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            notionConfig.pages = data.pages || [];
            displayNotionPages();
        }
    } catch (error) {
        console.error('Load pages error:', error);
    }
}

function displayNotionPages() {
    const container = document.getElementById('notion-pages-list');
    
    if (notionConfig.pages.length === 0) {
        container.innerHTML = '<div class="flex items-center justify-center py-8 text-gray-500"><i data-lucide="file-text" class="w-8 h-8 mr-2"></i><span>未找到页面</span></div>';
        return;
    }
    
    container.innerHTML = '';
    notionConfig.pages.forEach(page => {
        const pageItem = document.createElement('div');
        pageItem.className = 'flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50';
        
        const lastModified = new Date(page.last_edited_time).toLocaleDateString();
        const syncStatus = Math.random() > 0.5 ? 'synced' : 'modified'; // Mock status
        
        pageItem.innerHTML = `
            <div class="flex items-center">
                <div class="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <i data-lucide="file-text" class="w-3 h-3 text-blue-600"></i>
                </div>
                <div>
                    <h6 class="text-sm font-medium text-gray-900">${page.title || '无标题'}</h6>
                    <p class="text-xs text-gray-500">最后修改: ${lastModified}</p>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <span class="text-xs px-2 py-1 rounded-full ${syncStatus === 'synced' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}">
                    ${syncStatus === 'synced' ? '已同步' : '已修改'}
                </span>
                <button class="sync-page-btn px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100" data-id="${page.id}">
                    同步
                </button>
            </div>
        `;
        container.appendChild(pageItem);
    });
    
    // Re-initialize icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Load Notion settings from KV storage
async function loadNotionSettings() {
    try {
        // Load sync settings
        const syncResponse = await fetch(`${API_BASE_URL}/api/notion/get-sync-settings`, {
            headers: {
                'Authorization': 'Bearer ' + authToken
            }
        });
        
        if (syncResponse.ok) {
            const syncSettings = await syncResponse.json();
            
            // Apply sync settings to UI
            const autoSyncEnabled = document.getElementById('auto-sync-enabled');
            const syncInterval = document.getElementById('sync-interval');
            
            if (autoSyncEnabled) {
                autoSyncEnabled.checked = syncSettings.enabled || false;
            }
            if (syncInterval) {
                syncInterval.value = syncSettings.interval || 6;
            }
            
            // Set selected databases
            if (syncSettings.databases && syncSettings.databases.length > 0) {
                syncSettings.databases.forEach(dbId => {
                    const checkbox = document.querySelector(`.sync-db-checkbox[data-id="${dbId}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                });
            }
        }
        
        // Load workflow settings
        const workflowResponse = await fetch(`${API_BASE_URL}/api/notion/get-workflow-settings`, {
            headers: {
                'Authorization': 'Bearer ' + authToken
            }
        });
        
        if (workflowResponse.ok) {
            const workflowSettings = await workflowResponse.json();
            
            // Apply workflow settings to UI
            const autoCreatePages = document.getElementById('auto-create-pages');
            const autoCreateDatabase = document.getElementById('auto-create-database');
            const createKeywords = document.getElementById('create-keywords');
            const autoUpdatePages = document.getElementById('auto-update-pages');
            const updateStrategy = document.getElementById('update-strategy');
            const meetingNotesEnabled = document.getElementById('meeting-notes-enabled');
            const meetingTemplate = document.getElementById('meeting-template');
            
            if (autoCreatePages) {
                autoCreatePages.checked = workflowSettings.autoCreatePages || false;
            }
            if (autoCreateDatabase) {
                autoCreateDatabase.value = workflowSettings.autoCreateDatabase || "";
            }
            if (createKeywords) {
                createKeywords.value = workflowSettings.createKeywords || "创建,新建,记录";
            }
            if (autoUpdatePages) {
                autoUpdatePages.checked = workflowSettings.autoUpdatePages || false;
            }
            if (updateStrategy) {
                updateStrategy.value = workflowSettings.updateStrategy || "append";
            }
            if (meetingNotesEnabled) {
                meetingNotesEnabled.checked = workflowSettings.meetingNotesEnabled || false;
            }
            if (meetingTemplate) {
                meetingTemplate.value = workflowSettings.meetingTemplate || "";
            }
        }
        
    } catch (error) {
        console.error('Load Notion settings error:', error);
    }
}

// Populate dropdowns with databases
function populateNotionDropdowns() {
    const autoCreateSelect = document.getElementById('auto-create-database');
    const meetingTemplateSelect = document.getElementById('meeting-template');
    
    // Clear existing options
    autoCreateSelect.innerHTML = '<option value="">选择数据库</option>';
    meetingTemplateSelect.innerHTML = '<option value="">选择模板</option>';
    
    notionConfig.databases.forEach(db => {
        const option = document.createElement('option');
        option.value = db.id;
        option.textContent = db.title;
        autoCreateSelect.appendChild(option.cloneNode(true));
        meetingTemplateSelect.appendChild(option);
    });
}

// Sync operations
async function syncAllToRAG() {
    const syncStatus = document.getElementById('sync-status');
    const progressBar = document.getElementById('sync-progress');
    const statusText = document.getElementById('sync-status-text');
    
    syncStatus.classList.remove('hidden');
    progressBar.style.width = '0%';
    statusText.textContent = '准备同步...';
    
    try {
        // Simulate sync process
        for (let i = 0; i <= 100; i += 10) {
            progressBar.style.width = i + '%';
            statusText.textContent = `同步中... ${i}%`;
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        const response = await fetch(`${API_BASE_URL}/api/notion/sync-all`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + authToken
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            showNotification(`同步完成，处理了 ${data.synced || 0} 个页面`, 'success');
            
            // Auto refresh files list and statistics
            await loadFiles(currentFilePage);
            await loadStatistics();
        } else {
            throw new Error('同步失败');
        }
    } catch (error) {
        console.error('Sync error:', error);
        showNotification('同步过程中发生错误', 'error');
    } finally {
        setTimeout(() => {
            syncStatus.classList.add('hidden');
        }, 1000);
    }
}

async function selectiveSync() {
    // Check if we have pages to sync
    if (!notionConfig.pages || notionConfig.pages.length === 0) {
        showNotification('请先获取Notion页面列表', 'error');
        return;
    }
    
    // Create a selection modal
    const pagesList = notionConfig.pages.map(page => `
        <label class="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
            <input type="checkbox" class="selective-sync-page" data-id="${page.id}" data-title="${page.title}">
            <span class="text-sm">${page.title}</span>
        </label>
    `).join('');
    
    showModal('选择性同步', `
        <div class="space-y-4">
            <p class="text-gray-600">选择要同步到RAG系统的页面：</p>
            <div class="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-1">
                ${pagesList}
            </div>
        </div>
    `, async () => {
        const selectedPages = Array.from(document.querySelectorAll('.selective-sync-page:checked'))
            .map(cb => ({
                id: cb.dataset.id,
                title: cb.dataset.title
            }));
            
        if (selectedPages.length === 0) {
            showNotification('请选择至少一个页面', 'error');
            return false;
        }
        
        // Perform selective sync
        await performSelectiveSync(selectedPages);
        return true;
    });
}

async function performSelectiveSync(selectedPages) {
    try {
        showNotification(`正在同步 ${selectedPages.length} 个页面...`, 'info');
        
        const token = await getNotionToken();
        if (!token) {
            showNotification('Notion未连接', 'error');
            return;
        }
        
        let syncedCount = 0;
        
        for (const page of selectedPages) {
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
                    const content = extractPageContentFrontend(contentData.results);
                    
                    if (content.trim()) {
                        // Store via API
                        const storeResponse = await fetch(`${API_BASE_URL}/api/upload`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + authToken
                            },
                            body: JSON.stringify({
                                text: content,
                                name: `Notion: ${page.title}`
                            })
                        });
                        
                        if (storeResponse.ok) {
                            syncedCount++;
                        }
                    }
                }
            } catch (pageError) {
                console.error(`Error syncing page ${page.id}:`, pageError);
            }
        }
        
        showNotification(`选择性同步完成，处理了 ${syncedCount} 个页面`, 'success');
        await loadFiles(currentFilePage); // Refresh file list
        
    } catch (error) {
        console.error('Selective sync error:', error);
        showNotification('选择性同步时发生错误', 'error');
    }
}

async function getNotionToken() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/notion/status`, {
            headers: {
                'Authorization': 'Bearer ' + authToken
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.connected ? notionConfig.token : null;
        }
    } catch (error) {
        console.error('Get notion token error:', error);
    }
    return null;
}

function extractPageContentFrontend(blocks) {
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

async function checkUpdates() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/notion/check-updates`, {
            headers: {
                'Authorization': 'Bearer ' + authToken
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            showNotification(`检查完成，发现 ${data.updates || 0} 个更新`, 'success');
        }
    } catch (error) {
        console.error('Check updates error:', error);
        showNotification('检查更新时发生错误', 'error');
    }
}

async function fixEmbeddings() {
    try {
        showNotification('正在修复Embedding...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/api/notion/fix-embeddings`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + authToken
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            showNotification(data.message, 'success');
            // Refresh files list to see the updated embeddings
            await loadFiles(currentFilePage);
        } else {
            const error = await response.json();
            showNotification(`修复失败: ${error.error}`, 'error');
        }
    } catch (error) {
        console.error('Fix embeddings error:', error);
        showNotification('修复Embedding时发生错误', 'error');
    }
}

// Tab switching
function switchNotionTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.notion-tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active state from all buttons
    document.querySelectorAll('.notion-tab-btn').forEach(btn => {
        btn.classList.remove('active', 'border-indigo-500', 'text-indigo-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    
    // Show selected tab
    document.getElementById(`notion-tab-${tabName}`).classList.remove('hidden');
    
    // Add active state to selected button
    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    activeBtn.classList.add('active', 'border-indigo-500', 'text-indigo-600');
    activeBtn.classList.remove('border-transparent', 'text-gray-500');
}

// Event listeners for Notion functionality
document.addEventListener('DOMContentLoaded', function() {
    // Connection buttons
    document.getElementById('notion-connect-btn')?.addEventListener('click', connectNotion);
    document.getElementById('notion-disconnect-btn')?.addEventListener('click', disconnectNotion);
    
    // Tab buttons
    document.querySelectorAll('.notion-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.closest('.notion-tab-btn').getAttribute('data-tab');
            switchNotionTab(tabName);
        });
    });
    
    // Sync buttons
    document.getElementById('sync-all-btn')?.addEventListener('click', syncAllToRAG);
    document.getElementById('selective-sync-btn')?.addEventListener('click', selectiveSync);
    document.getElementById('check-updates-btn')?.addEventListener('click', checkUpdates);
    document.getElementById('fix-embeddings-btn')?.addEventListener('click', fixEmbeddings);
    
    // Save buttons
    document.getElementById('save-sync-settings-btn')?.addEventListener('click', async () => {
        const enabled = document.getElementById('auto-sync-enabled').checked;
        const interval = document.getElementById('sync-interval').value;
        const selectedDatabases = Array.from(document.querySelectorAll('.sync-db-checkbox:checked')).map(cb => cb.dataset.id);
        
        const settings = {
            enabled,
            interval: parseInt(interval),
            databases: selectedDatabases,
            lastSync: null
        };
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/notion/save-sync-settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + authToken
                },
                body: JSON.stringify(settings)
            });
            
            if (response.ok) {
                showNotification('同步设置已保存', 'success');
            } else {
                showNotification('保存设置失败', 'error');
            }
        } catch (error) {
            console.error('Save sync settings error:', error);
            showNotification('保存设置时发生错误', 'error');
        }
    });
    
    document.getElementById('save-workflow-btn')?.addEventListener('click', async () => {
        const autoCreatePages = document.getElementById('auto-create-pages').checked;
        const autoCreateDatabase = document.getElementById('auto-create-database').value;
        const createKeywords = document.getElementById('create-keywords').value;
        const autoUpdatePages = document.getElementById('auto-update-pages').checked;
        const updateStrategy = document.getElementById('update-strategy').value;
        const meetingNotesEnabled = document.getElementById('meeting-notes-enabled').checked;
        const meetingTemplate = document.getElementById('meeting-template').value;
        
        const settings = {
            autoCreatePages,
            autoCreateDatabase,
            createKeywords,
            autoUpdatePages,
            updateStrategy,
            meetingNotesEnabled,
            meetingTemplate
        };
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/notion/save-workflow-settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + authToken
                },
                body: JSON.stringify(settings)
            });
            
            if (response.ok) {
                const data = await response.json();
                showNotification(data.message, 'success');
            } else {
                const error = await response.json();
                showNotification(`保存失败: ${error.error}`, 'error');
            }
        } catch (error) {
            console.error('Save workflow settings error:', error);
            showNotification('保存工作流设置时发生错误', 'error');
        }
    });
    
    // Refresh buttons
    document.getElementById('refresh-databases-btn')?.addEventListener('click', loadNotionDatabases);
    document.getElementById('refresh-pages-btn')?.addEventListener('click', loadNotionPages);
    
    // Page management
    document.getElementById('create-page-btn')?.addEventListener('click', () => {
        showNotification('创建页面功能开发中', 'info');
    });
    
    // Search functionality
    document.getElementById('page-search')?.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        // Filter pages based on search term
        filterNotionPages(searchTerm);
    });
    
    document.getElementById('page-filter')?.addEventListener('change', (e) => {
        const filterType = e.target.value;
        // Apply filter to pages
        filterNotionPagesByType(filterType);
    });
});

function filterNotionPages(searchTerm) {
    const pageItems = document.querySelectorAll('#notion-pages-list > div');
    pageItems.forEach(item => {
        const title = item.querySelector('h6')?.textContent.toLowerCase() || '';
        if (title.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function filterNotionPagesByType(filterType) {
    const pageItems = document.querySelectorAll('#notion-pages-list > div');
    pageItems.forEach(item => {
        const statusSpan = item.querySelector('.text-xs.px-2');
        const status = statusSpan?.textContent.includes('已同步') ? 'synced' : 'modified';
        
        if (filterType === 'all' || filterType === status) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}