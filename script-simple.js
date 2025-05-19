/**
 * 簡化版嬰幼兒照顧追蹤應用 - 測試用
 * 移除了複雜功能，專注於基本運作
 */

// 全域變數
let db;
let currentChild = null;

// ======================
// 初始化檢查
// ======================
function checkDOM() {
    console.log('檢查DOM元素...');
    
    const elements = {
        'loadingScreen': document.getElementById('loadingScreen'),
        'app': document.getElementById('app'),
        'childSelect': document.getElementById('childSelect'),
        'addChildBtn': document.getElementById('addChildBtn'),
        'todaySummary': document.getElementById('todaySummary'),
        'themeToggle': document.getElementById('themeToggle')
    };
    
    Object.entries(elements).forEach(([name, element]) => {
        if (element) {
            console.log(`✓ ${name} 存在`);
        } else {
            console.error(`✗ ${name} 不存在`);
        }
    });
    
    return true;
}

// ======================
// 基本資料庫操作
// ======================
function initDB() {
    console.log('初始化資料庫...');
    
    if (typeof indexedDB === 'undefined') {
        console.error('瀏覽器不支援 IndexedDB');
        showToast('瀏覽器不支援離線存儲', 'error');
        return;
    }
    
    const request = indexedDB.open('BabyTrackerDB', 1);
    
    request.onerror = function(event) {
        console.error('資料庫開啟失敗:', event.target.error);
        showToast('資料庫初始化失敗', 'error');
    };
    
    request.onsuccess = function(event) {
        db = event.target.result;
        console.log('資料庫開啟成功');
        loadChildren();
        hideLoadingScreen();
    };
    
    request.onupgradeneeded = function(event) {
        db = event.target.result;
        console.log('創建資料庫表...');
        
        // 創建孩子資料表
        if (!db.objectStoreNames.contains('children')) {
            const childrenStore = db.createObjectStore('children', { keyPath: 'id', autoIncrement: true });
            console.log('children表已創建');
        }
    };
}

// ======================
// 基本功能
// ======================
function hideLoadingScreen() {
    console.log('隱藏載入畫面...');
    
    const loadingScreen = document.getElementById('loadingScreen');
    const app = document.getElementById('app');
    
    if (loadingScreen && app) {
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            app.style.display = 'block';
            
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }, 1000);
    } else {
        console.error('找不到載入畫面或主應用容器');
    }
}

function showToast(message, type = 'info') {
    console.log(`Toast: ${message} (${type})`);
    
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.className = `toast ${type}`;
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    } else {
        // 如果沒有toast元素，用alert替代
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

function loadChildren() {
    console.log('載入孩子列表...');
    
    if (!db) {
        console.error('資料庫未初始化');
        return;
    }
    
    const transaction = db.transaction(['children'], 'readonly');
    const store = transaction.objectStore('children');
    const request = store.getAll();
    
    request.onsuccess = function() {
        const children = request.result;
        console.log(`找到 ${children.length} 個孩子記錄`);
        
        updateChildSelector(children);
        
        if (children.length > 0) {
            currentChild = children[0];
            showDashboard();
        } else {
            showEmptyState();
        }
    };
    
    request.onerror = function() {
        console.error('載入孩子列表失敗');
        showToast('載入失敗', 'error');
    };
}

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
}

function showEmptyState() {
    console.log('顯示空狀態...');
    
    const summaryContainer = document.getElementById('todaySummary');
    if (summaryContainer) {
        summaryContainer.innerHTML = `
            <div style="text-align: center; padding: 48px 24px; color: var(--text-muted);">
                <div style="font-size: 4rem; margin-bottom: 1rem;">👶</div>
                <h3>歡迎使用寶貝成長記錄</h3>
                <p>請先添加您的孩子來開始記錄成長點滴</p>
                <button onclick="openChildModal()" style="
                    background: #ff6b9d; 
                    color: white; 
                    border: none; 
                    padding: 12px 24px; 
                    border-radius: 8px; 
                    margin-top: 16px;
                    cursor: pointer;
                ">
                    新增孩子
                </button>
            </div>
        `;
    }
}

function showDashboard() {
    console.log('顯示儀表板...');
    
    const summaryContainer = document.getElementById('todaySummary');
    if (summaryContainer && currentChild) {
        summaryContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <div style="background: var(--bg-card); padding: 24px; border-radius: 12px; box-shadow: var(--shadow-sm);">
                    <h3>👶 ${currentChild.name}</h3>
                    <p>今日記錄功能即將開放</p>
                </div>
                <div style="background: var(--bg-card); padding: 24px; border-radius: 12px; box-shadow: var(--shadow-sm);">
                    <h3>🍼 餵食</h3>
                    <p>0 次</p>
                </div>
                <div style="background: var(--bg-card); padding: 24px; border-radius: 12px; box-shadow: var(--shadow-sm);">
                    <h3>💤 睡眠</h3>
                    <p>0 小時</p>
                </div>
            </div>
        `;
    }
}

// ======================
// 孩子管理功能（簡化版）
// ======================
function openChildModal() {
    console.log('打開孩子資料對話框...');
    
    const modal = document.getElementById('childModal');
    if (modal) {
        const form = document.getElementById('childForm');
        if (form) {
            form.reset();
        }
        
        modal.classList.add('show');
    } else {
        // 如果沒有模態對話框，使用簡單的prompt
        const name = prompt('請輸入孩子的姓名:');
        if (name) {
            const birthDate = prompt('請輸入出生日期 (YYYY-MM-DD):');
            if (birthDate) {
                saveChildSimple(name, birthDate);
            }
        }
    }
}

function saveChildSimple(name, birthDate) {
    console.log('保存孩子資料...', name, birthDate);
    
    if (!db) {
        console.error('資料庫未初始化');
        return;
    }
    
    const childData = {
        name: name,
        birthDate: birthDate,
        gender: 'boy',
        createdAt: new Date().toISOString()
    };
    
    const transaction = db.transaction(['children'], 'readwrite');
    const store = transaction.objectStore('children');
    const request = store.add(childData);
    
    request.onsuccess = function() {
        console.log('孩子資料保存成功');
        childData.id = request.result;
        currentChild = childData;
        showToast('添加成功', 'success');
        loadChildren();
    };
    
    request.onerror = function() {
        console.error('保存失敗');
        showToast('保存失敗', 'error');
    };
}

// ======================
// 主題切換
// ======================
function initTheme() {
    console.log('初始化主題...');
    
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.innerHTML = savedTheme === 'dark' ? 
            '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        
        themeToggle.addEventListener('click', toggleTheme);
        console.log('主題切換按鈕已綁定');
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

// ======================
// 事件監聽器（簡化版）
// ======================
function initEventListeners() {
    console.log('初始化事件監聽器...');
    
    // 孩子選擇變更
    const childSelect = document.getElementById('childSelect');
    if (childSelect) {
        childSelect.addEventListener('change', function(e) {
            console.log('孩子選擇變更:', e.target.value);
            // 簡化版本暫時不實作
            showToast('功能開發中', 'info');
        });
        console.log('✓ 孩子選擇器事件已綁定');
    } else {
        console.warn('✗ 找不到孩子選擇器');
    }
    
    // 添加孩子按鈕
    const addChildBtn = document.getElementById('addChildBtn');
    if (addChildBtn) {
        addChildBtn.addEventListener('click', openChildModal);
        console.log('✓ 添加孩子按鈕事件已綁定');
    } else {
        console.warn('✗ 找不到添加孩子按鈕');
    }
    
    // 關閉模態對話框
    const modalCloses = document.querySelectorAll('.modal-close');
    modalCloses.forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = closeBtn.closest('.modal');
            if (modal) {
                modal.classList.remove('show');
            }
        });
    });
    console.log(`✓ ${modalCloses.length} 個關閉按鈕事件已綁定`);
    
    // 快速記錄按鈕（簡化）
    const quickBtns = document.querySelectorAll('.quick-btn');
    quickBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const type = btn.getAttribute('data-type');
            showToast(`${type}記錄功能開發中`, 'info');
        });
    });
    console.log(`✓ ${quickBtns.length} 個快速記錄按鈕事件已綁定`);
    
    console.log('所有事件監聽器初始化完成');
}

// ======================
// 應用程式初始化
// ======================
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== 應用程式開始初始化 ===');
    
    try {
        // 1. 檢查DOM
        console.log('1. 檢查DOM...');
        checkDOM();
        
        // 2. 初始化主題
        console.log('2. 初始化主題...');
        initTheme();
        
        // 3. 初始化事件監聽器
        console.log('3. 初始化事件監聽器...');
        initEventListeners();
        
        // 4. 初始化資料庫
        console.log('4. 初始化資料庫...');
        initDB();
        
        console.log('=== 初始化完成 ===');
        
    } catch (error) {
        console.error('初始化過程中發生錯誤:', error);
        showToast('應用初始化失敗', 'error');
    }
});

// ======================
// 全域錯誤處理
// ======================
window.addEventListener('error', function(e) {
    console.error('全域錯誤:', e.error);
    console.error('檔案:', e.filename);
    console.error('行號:', e.lineno);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('未處理的Promise錯誤:', e.reason);
});