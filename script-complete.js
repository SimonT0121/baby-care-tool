/**
 * 完整的嬰幼兒照顧追蹤應用 - 自包含版本
 * 包含基本CSS和完整功能
 */

// 注入基本CSS樣式
function injectCSS() {
    const cssId = 'baby-tracker-styles';
    if (document.getElementById(cssId)) return;
    
    const style = document.createElement('style');
    style.id = cssId;
    style.textContent = `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #2d3748;
            background: #ffffff;
            padding-bottom: 80px;
        }
        
        [data-theme="dark"] {
            color: #ffffff;
            background: #1a1a1a;
        }
        
        .header {
            background: linear-gradient(135deg, #ff6b9d, #e55a8a);
            color: white;
            padding: 24px 16px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .header h1 {
            font-size: 1.5rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .header-controls {
            display: flex;
            gap: 8px;
        }
        
        .theme-toggle {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            padding: 8px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1.125rem;
            transition: all 0.3s ease;
        }
        
        .theme-toggle:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
        }
        
        .child-selector {
            background: white;
            padding: 24px 16px;
            border-bottom: 1px solid #e2e8f0;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        
        [data-theme="dark"] .child-selector {
            background: #2a2a2a;
            border-bottom-color: #404040;
        }
        
        .child-selector-content {
            display: flex;
            gap: 16px;
            max-width: 1200px;
            margin: 0 auto;
            align-items: center;
        }
        
        .child-select {
            flex: 1;
            padding: 8px 16px;
            border: 1px solid #cbd5e0;
            border-radius: 8px;
            background: white;
            color: #2d3748;
            font-size: 16px;
        }
        
        [data-theme="dark"] .child-select {
            background: #1a1a1a;
            color: white;
            border-color: #525252;
        }
        
        .add-child-btn {
            background: #ff6b9d;
            color: white;
            border: none;
            padding: 8px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s ease;
        }
        
        .add-child-btn:hover {
            background: #e55a8a;
            transform: translateY(-2px);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .main-content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 24px 16px;
        }
        
        .main-content section {
            margin-bottom: 48px;
        }
        
        .main-content h2 {
            font-size: 1.25rem;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        [data-theme="dark"] .main-content h2 {
            color: white;
        }
        
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
        }
        
        .summary-card {
            background: white;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            border-left: 4px solid #ff6b9d;
            transition: all 0.3s ease;
        }
        
        [data-theme="dark"] .summary-card {
            background: #2a2a2a;
        }
        
        .summary-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .summary-card h3 {
            font-size: 1.125rem;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        [data-theme="dark"] .summary-card h3 {
            color: white;
        }
        
        .empty-state {
            text-align: center;
            padding: 48px 24px;
            color: #718096;
        }
        
        [data-theme="dark"] .empty-state {
            color: #a0aec0;
        }
        
        .empty-state h3 {
            color: #2d3748;
            margin-bottom: 8px;
            font-size: 1.5rem;
        }
        
        [data-theme="dark"] .empty-state h3 {
            color: white;
        }
        
        .btn-primary {
            background: #ff6b9d;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 500;
            transition: all 0.3s ease;
            margin-top: 16px;
        }
        
        .btn-primary:hover {
            background: #e55a8a;
            transform: translateY(-2px);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff6b9d;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
            z-index: 3000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        }
        
        .toast.show {
            opacity: 1;
            transform: translateX(0);
        }
        
        .toast.success {
            background: #51cf66;
        }
        
        .toast.error {
            background: #ff6b6b;
        }
        
        .toast.warning {
            background: #ffd93d;
        }
        
        .toast.info {
            background: #74c0fc;
        }
        
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 2000;
        }
        
        .modal.show {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
        }
        
        .modal-content {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 25px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
        }
        
        [data-theme="dark"] .modal-content {
            background: #2a2a2a;
        }
        
        .modal-header {
            padding: 24px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        [data-theme="dark"] .modal-header {
            border-bottom-color: #404040;
        }
        
        .modal-header h3 {
            font-size: 1.25rem;
            font-weight: 600;
            color: #2d3748;
        }
        
        [data-theme="dark"] .modal-header h3 {
            color: white;
        }
        
        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #718096;
            padding: 4px;
            border-radius: 4px;
            transition: all 0.3s ease;
        }
        
        .modal-close:hover {
            background: #f8f9fa;
            color: #2d3748;
        }
        
        [data-theme="dark"] .modal-close:hover {
            background: #333333;
            color: white;
        }
        
        .modal-body {
            padding: 24px;
        }
        
        .modal-footer {
            padding: 24px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            gap: 16px;
            justify-content: flex-end;
        }
        
        [data-theme="dark"] .modal-footer {
            border-top-color: #404040;
        }
        
        .form-group {
            margin-bottom: 24px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #2d3748;
            font-size: 0.875rem;
        }
        
        [data-theme="dark"] .form-group label {
            color: white;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 8px 16px;
            border: 1px solid #cbd5e0;
            border-radius: 8px;
            background: white;
            color: #2d3748;
            font-size: 16px;
            font-family: inherit;
            transition: all 0.3s ease;
        }
        
        [data-theme="dark"] .form-group input,
        [data-theme="dark"] .form-group select,
        [data-theme="dark"] .form-group textarea {
            background: #1a1a1a;
            color: white;
            border-color: #525252;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #ff6b9d;
            box-shadow: 0 0 0 3px rgba(255, 107, 157, 0.1);
        }
        
        .btn-secondary {
            background: #f8f9fa;
            color: #2d3748;
            border: 1px solid #cbd5e0;
            padding: 8px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        
        [data-theme="dark"] .btn-secondary {
            background: #333333;
            color: white;
            border-color: #525252;
        }
        
        .btn-secondary:hover {
            background: #e2e8f0;
            transform: translateY(-2px);
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        
        [data-theme="dark"] .btn-secondary:hover {
            background: #404040;
        }
        
        @media (max-width: 768px) {
            .child-selector-content {
                flex-direction: column;
                gap: 8px;
            }
            
            .child-select {
                width: 100%;
            }
            
            .main-content {
                padding: 16px;
            }
            
            .summary-cards {
                grid-template-columns: 1fr;
            }
            
            .modal-content {
                margin: 8px;
                max-height: calc(100vh - 16px);
            }
            
            .modal-footer {
                flex-direction: column;
            }
            
            .modal-footer button {
                width: 100%;
            }
        }
    `;
    
    document.head.appendChild(style);
    console.log('✓ CSS樣式已注入');
}

// 全域變數
let db;
let currentChild = null;

// 基本Toast功能
function showToast(message, type = 'info') {
    console.log(`Toast: ${message} (${type})`);
    
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = `toast ${type}`;
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 資料庫初始化 - 修正版本
function initDB() {
    console.log('初始化資料庫...');
    
    if (typeof indexedDB === 'undefined') {
        console.error('瀏覽器不支援 IndexedDB');
        showToast('瀏覽器不支援離線存儲', 'error');
        return;
    }
    
    // 刪除舊的資料庫，重新創建
    const deleteRequest = indexedDB.deleteDatabase('BabyTrackerDB');
    
    deleteRequest.onsuccess = function() {
        console.log('舊資料庫已刪除，重新創建...');
        createNewDatabase();
    };
    
    deleteRequest.onerror = function() {
        console.log('無法刪除舊資料庫，直接創建新的...');
        createNewDatabase();
    };
}

function createNewDatabase() {
    const request = indexedDB.open('BabyTrackerDB', 1);
    
    request.onerror = function(event) {
        console.error('資料庫開啟失敗:', event.target.error);
        showToast('資料庫初始化失敗', 'error');
    };
    
    request.onupgradeneeded = function(event) {
        db = event.target.result;
        console.log('創建資料庫表...');
        
        // 創建孩子資料表
        const childrenStore = db.createObjectStore('children', { keyPath: 'id', autoIncrement: true });
        childrenStore.createIndex('name', 'name', { unique: false });
        console.log('✓ children表已創建');
        
        // 創建其他記錄表
        const recordTypes = ['feeding', 'sleep', 'diaper', 'health', 'milestones', 'interactions', 'activities'];
        recordTypes.forEach(type => {
            const store = db.createObjectStore(type, { keyPath: 'id', autoIncrement: true });
            store.createIndex('childId', 'childId', { unique: false });
            store.createIndex('dateTime', 'dateTime', { unique: false });
            console.log(`✓ ${type}表已創建`);
        });
    };
    
    request.onsuccess = function(event) {
        db = event.target.result;
        console.log('✓ 資料庫開啟成功');
        
        // 確保在資料庫完全初始化後再執行其他操作
        setTimeout(() => {
            loadChildren();
            hideLoadingScreen();
        }, 200);
    };
}

// 載入孩子列表 - 修正版本
function loadChildren() {
    console.log('載入孩子列表...');
    
    if (!db) {
        console.error('資料庫未初始化');
        showEmptyState();
        return;
    }
    
    try {
        const transaction = db.transaction(['children'], 'readonly');
        const store = transaction.objectStore('children');
        const request = store.getAll();
        
        request.onsuccess = function() {
            const children = request.result;
            console.log(`✓ 找到 ${children.length} 個孩子記錄`);
            
            updateChildSelector(children);
            
            if (children.length > 0) {
                currentChild = children[0];
                showDashboard();
            } else {
                showEmptyState();
            }
        };
        
        request.onerror = function(error) {
            console.error('載入孩子列表失敗:', error);
            showToast('載入失敗', 'error');
            showEmptyState();
        };
        
    } catch (error) {
        console.error('loadChildren捕獲錯誤:', error);
        showEmptyState();
    }
}

// 更新孩子選擇器
function updateChildSelector(children) {
    const select = document.getElementById('childSelect');
    if (!select) {
        console.error('找不到孩子選擇器');
        return;
    }
    
    select.innerHTML = '<option value="">請選擇孩子</option>';
    
    children.forEach(child => {
        const option = document.createElement('option');
        option.value = child.id;
        option.textContent = child.name;
        select.appendChild(option);
    });
    
    if (currentChild) {
        select.value = currentChild.id;
    }
    
    console.log('✓ 孩子選擇器已更新');
}

// 顯示空狀態
function showEmptyState() {
    console.log('顯示空狀態...');
    
    const summaryContainer = document.getElementById('todaySummary');
    if (summaryContainer) {
        summaryContainer.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 4rem; margin-bottom: 1rem;">👶</div>
                <h3>歡迎使用寶貝成長記錄</h3>
                <p>請先添加您的孩子來開始記錄成長點滴</p>
                <button onclick="openChildModal()" class="btn-primary">
                    <i class="fas fa-plus"></i> 新增孩子
                </button>
            </div>
        `;
    }
}

// 顯示儀表板
function showDashboard() {
    console.log('顯示儀表板...');
    
    const summaryContainer = document.getElementById('todaySummary');
    if (summaryContainer && currentChild) {
        summaryContainer.innerHTML = `
            <div class="summary-cards">
                <div class="summary-card">
                    <h3>👶 ${currentChild.name}</h3>
                    <p>出生日期: ${formatDate(currentChild.birthDate)}</p>
                    <p>年齡: ${calculateAge(currentChild.birthDate)}</p>
                </div>
                <div class="summary-card">
                    <h3>🍼 餵食記錄</h3>
                    <p>今日記錄功能即將開放</p>
                </div>
                <div class="summary-card">
                    <h3>💤 睡眠記錄</h3>
                    <p>今日記錄功能即將開放</p>
                </div>
                <div class="summary-card">
                    <h3>🍼 尿布記錄</h3>
                    <p>今日記錄功能即將開放</p>
                </div>
            </div>
        `;
    }
}

// 工具函數
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function calculateAge(birthDate) {
    const birth = new Date(birthDate);
    const now = new Date();
    const diffTime = Math.abs(now - birth);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
        return `${diffDays} 天`;
    } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} 個月`;
    } else {
        const years = Math.floor(diffDays / 365);
        const months = Math.floor((diffDays % 365) / 30);
        return `${years} 歲 ${months} 個月`;
    }
}

// 隱藏載入畫面
function hideLoadingScreen() {
    console.log('隱藏載入畫面...');
    
    const loadingScreen = document.getElementById('loadingScreen');
    const app = document.getElementById('app');
    
    if (app) {
        app.style.display = 'block';
    }
    
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
    
    console.log('✓ 載入畫面已隱藏');
}

// 孩子管理功能
function openChildModal() {
    console.log('打開孩子資料對話框...');
    
    // 檢查是否有模態對話框
    let modal = document.getElementById('childModal');
    if (!modal) {
        // 創建模態對話框
        modal = document.createElement('div');
        modal.id = 'childModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>新增孩子</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="childForm">
                        <div class="form-group">
                            <label for="childName">姓名</label>
                            <input type="text" id="childName" required>
                        </div>
                        <div class="form-group">
                            <label for="childBirthDate">出生日期</label>
                            <input type="date" id="childBirthDate" required>
                        </div>
                        <div class="form-group">
                            <label for="childGender">性別</label>
                            <select id="childGender">
                                <option value="boy">男孩</option>
                                <option value="girl">女孩</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary modal-cancel">取消</button>
                    <button type="submit" form="childForm" class="btn-primary">保存</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // 綁定事件
        modal.querySelector('.modal-close').addEventListener('click', closeChildModal);
        modal.querySelector('.modal-cancel').addEventListener('click', closeChildModal);
        modal.querySelector('#childForm').addEventListener('submit', saveChild);
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeChildModal();
            }
        });
    }
    
    // 清空表單
    const form = modal.querySelector('#childForm');
    if (form) {
        form.reset();
    }
    
    modal.classList.add('show');
}

function closeChildModal() {
    const modal = document.getElementById('childModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function saveChild(event) {
    event.preventDefault();
    
    const name = document.getElementById('childName').value;
    const birthDate = document.getElementById('childBirthDate').value;
    const gender = document.getElementById('childGender').value;
    
    console.log('保存孩子資料...', { name, birthDate, gender });
    
    if (!db) {
        console.error('資料庫未初始化');
        showToast('資料庫錯誤', 'error');
        return;
    }
    
    const childData = {
        name: name,
        birthDate: birthDate,
        gender: gender,
        createdAt: new Date().toISOString()
    };
    
    try {
        const transaction = db.transaction(['children'], 'readwrite');
        const store = transaction.objectStore('children');
        const request = store.add(childData);
        
        request.onsuccess = function() {
            console.log('✓ 孩子資料保存成功');
            childData.id = request.result;
            currentChild = childData;
            showToast('添加成功', 'success');
            closeChildModal();
            loadChildren();
        };
        
        request.onerror = function(error) {
            console.error('保存失敗:', error);
            showToast('保存失敗', 'error');
        };
        
    } catch (error) {
        console.error('saveChild捕獲錯誤:', error);
        showToast('保存失敗', 'error');
    }
}

// 主題切換
function initTheme() {
    console.log('初始化主題...');
    
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.innerHTML = savedTheme === 'dark' ? 
            '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        
        themeToggle.addEventListener('click', toggleTheme);
        console.log('✓ 主題切換按鈕已綁定');
    } else {
        console.warn('找不到主題切換按鈕');
    }
}

function toggleTheme() {
    console.log('切換主題...');
    
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.innerHTML = newTheme === 'dark' ? 
            '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
    
    showToast(`已切換到${newTheme === 'dark' ? '深色' : '淺色'}模式`, 'info');
}

// 事件監聽器初始化
function initEventListeners() {
    console.log('初始化事件監聽器...');
    
    // 孩子選擇變更
    const childSelect = document.getElementById('childSelect');
    if (childSelect) {
        childSelect.addEventListener('change', function(e) {
            const childId = e.target.value;
            if (childId && db) {
                const transaction = db.transaction(['children'], 'readonly');
                const store = transaction.objectStore('children');
                const request = store.get(parseInt(childId));
                
                request.onsuccess = function() {
                    if (request.result) {
                        currentChild = request.result;
                        showDashboard();
                        console.log('✓ 切換到孩子:', currentChild.name);
                    }
                };
            } else {
                currentChild = null;
                showEmptyState();
            }
        });
        console.log('✓ 孩子選擇器事件已綁定');
    }
    
    // 添加孩子按鈕
    const addChildBtn = document.getElementById('addChildBtn');
    if (addChildBtn) {
        addChildBtn.addEventListener('click', openChildModal);
        console.log('✓ 添加孩子按鈕事件已綁定');
    }
    
    console.log('✓ 所有事件監聽器初始化完成');
}

// 確保DOM結構完整
function ensureDOM() {
    console.log('確保DOM結構完整...');
    
    // 檢查並創建主要容器
    let app = document.getElementById('app');
    if (!app) {
        app = document.createElement('div');
        app.id = 'app';
        app.style.display = 'none';
        document.body.appendChild(app);
        console.log('✓ 已創建主應用容器');
    }
    
    // 創建頁面結構
    if (!app.hasChildNodes()) {
        app.innerHTML = `
            <header class="header">
                <div class="header-content">
                    <h1><i class="fas fa-baby"></i> 寶貝成長記錄</h1>
                    <div class="header-controls">
                        <button id="themeToggle" class="theme-toggle" title="切換主題">
                            <i class="fas fa-moon"></i>
                        </button>
                    </div>
                </div>
            </header>

            <div class="child-selector">
                <div class="child-selector-content">
                    <select id="childSelect" class="child-select">
                        <option value="">請先添加孩子</option>
                    </select>
                    <button id="addChildBtn" class="add-child-btn">
                        <i class="fas fa-plus"></i> 添加孩子
                    </button>
                </div>
            </div>

            <main class="main-content">
                <section class="today-summary">
                    <h2><i class="fas fa-calendar-day"></i> 今日摘要</h2>
                    <div id="todaySummary" class="summary-cards">
                        <!-- 動態生成摘要卡片 -->
                    </div>
                </section>
            </main>
        `;
        console.log('✓ 頁面結構已創建');
    }
    
    // 確保有Toast容器
    if (!document.getElementById('toast')) {
        const toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
        console.log('✓ Toast容器已創建');
    }
}

// 應用程式初始化
function initApp() {
    console.log('=== 開始初始化完整應用 ===');
    
    try {
        // 1. 注入CSS
        console.log('1. 注入CSS樣式...');
        injectCSS();
        
        // 2. 確保DOM結構
        console.log('2. 確保DOM結構...');
        ensureDOM();
        
        // 3. 初始化主題
        console.log('3. 初始化主題...');
        initTheme();
        
        // 4. 初始化事件監聽器
        console.log('4. 初始化事件監聽器...');
        initEventListeners();
        
        // 5. 初始化資料庫
        console.log('5. 初始化資料庫...');
        initDB();
        
        console.log('=== 應用初始化完成 ===');
        
    } catch (error) {
        console.error('初始化過程中發生錯誤:', error);
        showToast('應用初始化失敗', 'error');
    }
}

// 修正除錯工具的執行函數
window.debugCommands = {
    checkStyles: function() {
        const computed = window.getComputedStyle(document.body);
        console.log('body背景色:', computed.backgroundColor);
        console.log('body字體:', computed.fontFamily);
        console.log('CSS已注入:', !!document.getElementById('baby-tracker-styles'));
    },
    
    checkElements: function() {
        const elements = ['app', 'childSelect', 'addChildBtn', 'todaySummary', 'themeToggle'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            console.log(`${id}:`, element ? '存在' : '不存在');
        });
    },
    
    testDB: function() {
        if (window.db) {
            console.log('資料庫已連接');
            const stores = Array.from(window.db.objectStoreNames);
            console.log('可用的表:', stores);
        } else {
            console.log('資料庫未連接');
        }
    },
    
    reinit: function() {
        console.log('重新初始化應用...');
        initApp();
    }
};

// 在DOM載入後或立即執行初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

console.log('🍼 嬰幼兒照顧追蹤應用已載入');
console.log('可用指令: debugCommands.checkStyles(), debugCommands.checkElements(), debugCommands.testDB(), debugCommands.reinit()');