/**
 * 嬰幼兒照顧追蹤應用 - 主腳本檔案
 * 包含所有功能的完整實現，使用 IndexedDB 進行本地存儲
 */

// ======================
// 全域變數和設定
// ======================
let db;
let currentChild = null;
let currentChart = null;
let currentSection = 'dashboard';

// 資料庫結構定義
const DB_NAME = 'BabyTrackerDB';
const DB_VERSION = 1;
const DB_STORES = {
    children: 'children',
    feeding: 'feeding',
    sleep: 'sleep',
    diaper: 'diaper',
    health: 'health',
    milestones: 'milestones',
    interactions: 'interactions',
    activities: 'activities'
};

// 預設里程碑資料
const DEFAULT_MILESTONES = {
    motor: [
        '抬頭', '翻身', '坐起', '爬行', '站立', '獨立行走', '跑步', '跳躍'
    ],
    language: [
        '發出聲音', '咿呀學語', '叫爸爸媽媽', '說第一個詞', '說兩個詞的句子', '說完整句子'
    ],
    social: [
        '眼神接觸', '社會性微笑', '認識陌生人', '分離焦慮', '模仿動作', '與其他孩子玩耍'
    ],
    cognitive: [
        '追視物體', '轉頭尋找聲音', '物體恆存概念', '因果關係理解', '分類物品', '解決簡單問題'
    ],
    self_care: [
        '自主進食手指食物', '用杯子喝水', '配合穿衣', '嘗試使用餐具', '如廁訓練', '自己刷牙'
    ]
};

// 活動類型定義
const ACTIVITY_TYPES = {
    bath: '洗澡',
    massage: '按摩',
    dress: '換衣服/護理',
    tummy_time: '俯臥時間',
    sensory: '感官遊戲',
    reading: '親子共讀',
    music: '音樂互動',
    walk: '散步/推車',
    sunlight: '曬太陽',
    social: '社交互動',
    custom: '自定義活動'
};

// ======================
// 資料庫初始化
// ======================
function initDB() {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
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
        
        // 創建孩子資料表
        if (!db.objectStoreNames.contains(DB_STORES.children)) {
            const childrenStore = db.createObjectStore(DB_STORES.children, { keyPath: 'id', autoIncrement: true });
            childrenStore.createIndex('name', 'name', { unique: false });
        }
        
        // 創建餵食記錄表
        if (!db.objectStoreNames.contains(DB_STORES.feeding)) {
            const feedingStore = db.createObjectStore(DB_STORES.feeding, { keyPath: 'id', autoIncrement: true });
            feedingStore.createIndex('childId', 'childId', { unique: false });
            feedingStore.createIndex('dateTime', 'dateTime', { unique: false });
        }
        
        // 創建睡眠記錄表
        if (!db.objectStoreNames.contains(DB_STORES.sleep)) {
            const sleepStore = db.createObjectStore(DB_STORES.sleep, { keyPath: 'id', autoIncrement: true });
            sleepStore.createIndex('childId', 'childId', { unique: false });
            sleepStore.createIndex('dateTime', 'dateTime', { unique: false });
        }
        
        // 創建尿布記錄表
        if (!db.objectStoreNames.contains(DB_STORES.diaper)) {
            const diaperStore = db.createObjectStore(DB_STORES.diaper, { keyPath: 'id', autoIncrement: true });
            diaperStore.createIndex('childId', 'childId', { unique: false });
            diaperStore.createIndex('dateTime', 'dateTime', { unique: false });
        }
        
        // 創建健康記錄表
        if (!db.objectStoreNames.contains(DB_STORES.health)) {
            const healthStore = db.createObjectStore(DB_STORES.health, { keyPath: 'id', autoIncrement: true });
            healthStore.createIndex('childId', 'childId', { unique: false });
            healthStore.createIndex('dateTime', 'dateTime', { unique: false });
        }
        
        // 創建里程碑記錄表
        if (!db.objectStoreNames.contains(DB_STORES.milestones)) {
            const milestonesStore = db.createObjectStore(DB_STORES.milestones, { keyPath: 'id', autoIncrement: true });
            milestonesStore.createIndex('childId', 'childId', { unique: false });
            milestonesStore.createIndex('category', 'category', { unique: false });
        }
        
        // 創建互動記錄表
        if (!db.objectStoreNames.contains(DB_STORES.interactions)) {
            const interactionsStore = db.createObjectStore(DB_STORES.interactions, { keyPath: 'id', autoIncrement: true });
            interactionsStore.createIndex('childId', 'childId', { unique: false });
            interactionsStore.createIndex('dateTime', 'dateTime', { unique: false });
        }
        
        // 創建活動記錄表
        if (!db.objectStoreNames.contains(DB_STORES.activities)) {
            const activitiesStore = db.createObjectStore(DB_STORES.activities, { keyPath: 'id', autoIncrement: true });
            activitiesStore.createIndex('childId', 'childId', { unique: false });
            activitiesStore.createIndex('dateTime', 'dateTime', { unique: false });
        }
    };
}

// ======================
// 通用資料庫操作函數
// ======================
function addRecord(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(data);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function updateRecord(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function deleteRecord(storeName, id) {
    return deleteRecordFromDB(storeName, id);
}

function getAllRecords(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function getRecordsByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(value);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ======================
// 載入畫面控制
// ======================
function hideLoadingScreen() {
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        const app = document.getElementById('app');
        
        loadingScreen.style.opacity = '0';
        loadingScreen.style.visibility = 'hidden';
        app.style.display = 'block';
        
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }, 1000);
}

// ======================
// 主題切換功能
// ======================
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeToggle = document.getElementById('themeToggle');
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    // 更新界面元素
    if (savedTheme === 'dark') {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        if (darkModeToggle) darkModeToggle.checked = true;
    }
    
    // 主題切換事件
    themeToggle.addEventListener('click', toggleTheme);
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', toggleTheme);
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const themeToggle = document.getElementById('themeToggle');
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    themeToggle.innerHTML = newTheme === 'dark' ? 
        '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    
    if (darkModeToggle) {
        darkModeToggle.checked = newTheme === 'dark';
    }
}

// ======================
// Toast 通知功能
// ======================
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    
    // 顯示 toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // 3秒後隱藏
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ======================
// 照片處理功能
// ======================
function handlePhotoUpload(input, previewContainer) {
    const file = input.files[0];
    if (!file) return null;
    
    // 檢查檔案大小（限制 5MB）
    if (file.size > 5 * 1024 * 1024) {
        showToast('照片檔案不能超過 5MB', 'error');
        return null;
    }
    
    // 檢查檔案類型
    if (!file.type.startsWith('image/')) {
        showToast('請選擇圖片檔案', 'error');
        return null;
    }
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '200px';
            img.style.borderRadius = 'var(--radius-md)';
            
            previewContainer.innerHTML = '';
            previewContainer.appendChild(img);
            
            // 壓縮圖片
            compressImage(e.target.result, (compressedData) => {
                resolve(compressedData);
            });
        };
        
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function compressImage(dataURL, callback) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = function() {
        // 設定最大尺寸
        const maxWidth = 800;
        const maxHeight = 600;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
            if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            }
        } else {
            if (height > maxHeight) {
                width *= maxHeight / height;
                height = maxHeight;
            }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 繪製並壓縮
        ctx.drawImage(img, 0, 0, width, height);
        const compressedData = canvas.toDataURL('image/jpeg', 0.8);
        callback(compressedData);
    };
    
    img.src = dataURL;
}

// ======================
// 孩子管理功能
// ======================
async function loadChildren() {
    try {
        const children = await getAllRecords(DB_STORES.children);
        updateChildSelector(children);
        
        if (children.length > 0 && !currentChild) {
            currentChild = children[0];
            document.getElementById('childSelect').value = currentChild.id;
            loadDashboard();
        } else if (children.length === 0) {
            showEmptyState();
        }
    } catch (error) {
        console.error('載入孩子資料失敗:', error);
        showToast('載入孩子資料失敗', 'error');
    }
}

function updateChildSelector(children) {
    const select = document.getElementById('childSelect');
    select.innerHTML = '<option value="">請選擇孩子</option>';
    
    children.forEach(child => {
        const option = document.createElement('option');
        option.value = child.id;
        option.textContent = child.name;
        select.appendChild(option);
    });
}

function showEmptyState() {
    const summaryContainer = document.getElementById('todaySummary');
    summaryContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-baby" style="font-size: 4rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
            <h3>歡迎使用寶貝成長記錄</h3>
            <p>請先添加您的孩子來開始記錄成長點滴</p>
            <button onclick="openChildModal()" class="btn-primary" style="margin-top: 1rem;">
                <i class="fas fa-plus"></i> 添加孩子
            </button>
        </div>
    `;
}

function openChildModal(childId = null) {
    const modal = document.getElementById('childModal');
    const form = document.getElementById('childForm');
    const title = document.getElementById('childModalTitle');
    const deleteBtn = document.getElementById('deleteChild');
    
    form.reset();
    document.getElementById('photoPreview').innerHTML = '';
    
    if (childId) {
        title.textContent = '編輯孩子資料';
        deleteBtn.style.display = 'inline-block';
        loadChildData(childId);
    } else {
        title.textContent = '添加孩子';
        deleteBtn.style.display = 'none';
    }
    
    modal.classList.add('show');
}

async function loadChildData(childId) {
    try {
        const transaction = db.transaction([DB_STORES.children], 'readonly');
        const store = transaction.objectStore(DB_STORES.children);
        const request = store.get(parseInt(childId));
        
        request.onsuccess = function() {
            const child = request.result;
            if (child) {
                document.getElementById('childId').value = child.id;
                document.getElementById('childName').value = child.name;
                document.getElementById('childBirthDate').value = child.birthDate;
                document.getElementById('childGender').value = child.gender;
                document.getElementById('childNotes').value = child.notes || '';
                
                if (child.photo) {
                    const img = document.createElement('img');
                    img.src = child.photo;
                    img.style.maxWidth = '100%';
                    img.style.maxHeight = '200px';
                    img.style.borderRadius = 'var(--radius-md)';
                    document.getElementById('photoPreview').appendChild(img);
                }
            }
        };
    } catch (error) {
        console.error('載入孩子資料失敗:', error);
        showToast('載入孩子資料失敗', 'error');
    }
}

async function saveChild(event) {
    event.preventDefault();
    
    const childId = document.getElementById('childId').value;
    const name = document.getElementById('childName').value;
    const birthDate = document.getElementById('childBirthDate').value;
    const gender = document.getElementById('childGender').value;
    const notes = document.getElementById('childNotes').value;
    const photoInput = document.getElementById('childPhoto');
    
    try {
        let photoData = null;
        
        if (photoInput.files.length > 0) {
            const previewContainer = document.getElementById('photoPreview');
            photoData = await handlePhotoUpload(photoInput, previewContainer);
        } else if (childId) {
            // 編輯模式且沒有新照片，保留原照片
            const transaction = db.transaction([DB_STORES.children], 'readonly');
            const store = transaction.objectStore(DB_STORES.children);
            const request = store.get(parseInt(childId));
            
            await new Promise((resolve) => {
                request.onsuccess = function() {
                    if (request.result && request.result.photo) {
                        photoData = request.result.photo;
                    }
                    resolve();
                };
            });
        }
        
        const childData = {
            name,
            birthDate,
            gender,
            notes,
            photo: photoData,
            createdAt: childId ? undefined : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        if (childId) {
            childData.id = parseInt(childId);
            await updateRecord(DB_STORES.children, childData);
            showToast('孩子資料更新成功', 'success');
        } else {
            const newId = await addRecord(DB_STORES.children, childData);
            childData.id = newId;
            showToast('孩子資料新增成功', 'success');
        }
        
        closeModal('childModal');
        await loadChildren();
        
        // 如果是新添加的孩子，自動選中
        if (!childId) {
            currentChild = childData;
            document.getElementById('childSelect').value = childData.id;
            loadDashboard();
        }
        
    } catch (error) {
        console.error('保存孩子資料失敗:', error);
        showToast('保存孩子資料失敗', 'error');
    }
}

async function deleteChild() {
    const childId = document.getElementById('childId').value;
    
    if (!childId) return;
    
    if (await showConfirm('刪除孩子', '確定要刪除這個孩子的所有資料嗎？此操作無法復原。')) {
        try {
            // 刪除孩子相關的所有記錄
            const stores = [
                DB_STORES.feeding,
                DB_STORES.sleep,
                DB_STORES.diaper,
                DB_STORES.health,
                DB_STORES.milestones,
                DB_STORES.interactions,
                DB_STORES.activities
            ];
            
            for (const storeName of stores) {
                const records = await getRecordsByIndex(storeName, 'childId', parseInt(childId));
                for (const record of records) {
                    await deleteRecord(storeName, record.id);
                }
            }
            
            // 刪除孩子資料
            await deleteRecord(DB_STORES.children, parseInt(childId));
            
            showToast('孩子資料已刪除', 'success');
            closeModal('childModal');
            
            // 重新載入孩子列表
            currentChild = null;
            await loadChildren();
            
        } catch (error) {
            console.error('刪除孩子資料失敗:', error);
            showToast('刪除孩子資料失敗', 'error');
        }
    }
}

// ======================
// 記錄管理功能
// ======================
function openRecordModal(type, recordId = null) {
    if (!currentChild) {
        showToast('請先選擇孩子', 'warning');
        return;
    }
    
    const modal = document.getElementById('recordModal');
    const form = document.getElementById('recordForm');
    const title = document.getElementById('recordModalTitle');
    const deleteBtn = document.getElementById('deleteRecord');
    
    form.reset();
    document.getElementById('recordPhotoPreview').innerHTML = '';
    
    // 隱藏所有記錄類型專用欄位
    document.querySelectorAll('.record-fields').forEach(field => {
        field.style.display = 'none';
    });
    
    // 顯示對應的記錄類型欄位
    const recordFields = document.getElementById(`${type}Fields`);
    if (recordFields) {
        recordFields.style.display = 'block';
    }
    
    // 設定預設值
    const now = new Date();
    document.getElementById('recordDate').value = now.toISOString().split('T')[0];
    document.getElementById('recordTime').value = now.toTimeString().slice(0, 5);
    document.getElementById('recordType').value = type;
    
    // 設定標題和按鈕
    const typeNames = {
        feeding: '餵食',
        sleep: '睡眠',
        diaper: '尿布',
        health: '健康',
        activity: '活動',
        interaction: '互動'
    };
    
    if (recordId) {
        title.textContent = `編輯${typeNames[type]}記錄`;
        deleteBtn.style.display = 'inline-block';
        loadRecordData(type, recordId);
    } else {
        title.textContent = `新增${typeNames[type]}記錄`;
        deleteBtn.style.display = 'none';
        
        // 設定類型特定的預設值
        if (type === 'feeding') {
            showFeedingSubfields();
        } else if (type === 'health') {
            showHealthSubfields();
        } else if (type === 'activity') {
            showCustomActivityField();
        }
    }
    
    modal.classList.add('show');
}

function showFeedingSubfields() {
    const feedingType = document.getElementById('feedingType').value;
    document.querySelectorAll('.feeding-subfields').forEach(field => {
        field.style.display = 'none';
    });
    
    const targetField = document.getElementById(`${feedingType}Fields`);
    if (targetField) {
        targetField.style.display = 'block';
    }
}

function showHealthSubfields() {
    const healthType = document.getElementById('healthType').value;
    document.querySelectorAll('.health-subfields').forEach(field => {
        field.style.display = 'none';
    });
    
    if (healthType === 'temperature') {
        document.getElementById('temperatureFields').style.display = 'block';
    }
}

function showCustomActivityField() {
    const activityType = document.getElementById('activityType').value;
    const customField = document.getElementById('customActivityField');
    customField.style.display = activityType === 'custom' ? 'block' : 'none';
}

async function loadRecordData(type, recordId) {
    try {
        const transaction = db.transaction([DB_STORES[type]], 'readonly');
        const store = transaction.objectStore(DB_STORES[type]);
        const request = store.get(parseInt(recordId));
        
        request.onsuccess = function() {
            const record = request.result;
            if (record) {
                document.getElementById('recordId').value = record.id;
                
                // 解析日期時間
                const dateTime = new Date(record.dateTime);
                document.getElementById('recordDate').value = dateTime.toISOString().split('T')[0];
                document.getElementById('recordTime').value = dateTime.toTimeString().slice(0, 5);
                
                document.getElementById('recordNotes').value = record.notes || '';
                
                // 載入照片
                if (record.photo) {
                    const img = document.createElement('img');
                    img.src = record.photo;
                    img.style.maxWidth = '100%';
                    img.style.maxHeight = '200px';
                    img.style.borderRadius = 'var(--radius-md)';
                    document.getElementById('recordPhotoPreview').appendChild(img);
                }
                
                // 載入特定類型的資料
                loadTypeSpecificData(type, record);
            }
        };
    } catch (error) {
        console.error('載入記錄資料失敗:', error);
        showToast('載入記錄資料失敗', 'error');
    }
}

function loadTypeSpecificData(type, record) {
    switch (type) {
        case 'feeding':
            document.getElementById('feedingType').value = record.feedingType;
            showFeedingSubfields();
            
            if (record.feedingType === 'breast') {
                document.getElementById('breastSide').value = record.breastSide || '';
                document.getElementById('breastDuration').value = record.breastDuration || '';
            } else if (record.feedingType === 'formula') {
                document.getElementById('formulaAmount').value = record.formulaAmount || '';
            } else if (record.feedingType === 'solid') {
                document.getElementById('solidAmount').value = record.solidAmount || '';
                document.getElementById('solidType').value = record.solidType || '';
            }
            break;
            
        case 'sleep':
            document.getElementById('sleepStartTime').value = record.sleepStartTime || '';
            document.getElementById('sleepEndTime').value = record.sleepEndTime || '';
            document.getElementById('sleepQuality').value = record.sleepQuality || '';
            break;
            
        case 'diaper':
            document.getElementById('diaperType').value = record.diaperType || '';
            document.getElementById('diaperConsistency').value = record.diaperConsistency || '';
            break;
            
        case 'health':
            document.getElementById('healthType').value = record.healthType || '';
            showHealthSubfields();
            document.getElementById('healthDetails').value = record.healthDetails || '';
            
            if (record.healthType === 'temperature') {
                document.getElementById('temperature').value = record.temperature || '';
                document.getElementById('temperatureMethod').value = record.temperatureMethod || '';
            }
            break;
            
        case 'activity':
            document.getElementById('activityType').value = record.activityType || '';
            showCustomActivityField();
            document.getElementById('activityDuration').value = record.activityDuration || '';
            
            if (record.activityType === 'custom') {
                document.getElementById('customActivity').value = record.customActivity || '';
            }
            break;
            
        case 'interaction':
            document.getElementById('babyMood').value = record.babyMood || '';
            document.getElementById('interactionType').value = record.interactionType || '';
            break;
    }
}

async function saveRecord(event) {
    event.preventDefault();
    
    const recordId = document.getElementById('recordId').value;
    const recordType = document.getElementById('recordType').value;
    const date = document.getElementById('recordDate').value;
    const time = document.getElementById('recordTime').value;
    const notes = document.getElementById('recordNotes').value;
    const photoInput = document.getElementById('recordPhoto');
    
    try {
        let photoData = null;
        
        if (photoInput.files.length > 0) {
            const previewContainer = document.getElementById('recordPhotoPreview');
            photoData = await handlePhotoUpload(photoInput, previewContainer);
        } else if (recordId) {
            // 編輯模式且沒有新照片，保留原照片
            const transaction = db.transaction([DB_STORES[recordType]], 'readonly');
            const store = transaction.objectStore(DB_STORES[recordType]);
            const request = store.get(parseInt(recordId));
            
            await new Promise((resolve) => {
                request.onsuccess = function() {
                    if (request.result && request.result.photo) {
                        photoData = request.result.photo;
                    }
                    resolve();
                };
            });
        }
        
        const dateTime = new Date(`${date}T${time}`).toISOString();
        
        const recordData = {
            childId: currentChild.id,
            dateTime,
            notes,
            photo: photoData,
            createdAt: recordId ? undefined : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // 添加類型特定的資料
        addTypeSpecificData(recordType, recordData);
        
        if (recordId) {
            recordData.id = parseInt(recordId);
            await updateRecord(DB_STORES[recordType], recordData);
            showToast('記錄更新成功', 'success');
        } else {
            await addRecord(DB_STORES[recordType], recordData);
            showToast('記錄新增成功', 'success');
        }
        
        closeModal('recordModal');
        loadDashboard();
        loadRecords();
        
    } catch (error) {
        console.error('保存記錄失敗:', error);
        showToast('保存記錄失敗', 'error');
    }
}

function addTypeSpecificData(type, recordData) {
    switch (type) {
        case 'feeding':
            recordData.feedingType = document.getElementById('feedingType').value;
            
            if (recordData.feedingType === 'breast') {
                recordData.breastSide = document.getElementById('breastSide').value;
                recordData.breastDuration = parseInt(document.getElementById('breastDuration').value) || 0;
            } else if (recordData.feedingType === 'formula') {
                recordData.formulaAmount = parseInt(document.getElementById('formulaAmount').value) || 0;
            } else if (recordData.feedingType === 'solid') {
                recordData.solidAmount = parseInt(document.getElementById('solidAmount').value) || 0;
                recordData.solidType = document.getElementById('solidType').value;
            }
            break;
            
        case 'sleep':
            recordData.sleepStartTime = document.getElementById('sleepStartTime').value;
            recordData.sleepEndTime = document.getElementById('sleepEndTime').value;
            recordData.sleepQuality = document.getElementById('sleepQuality').value;
            
            // 計算睡眠時長
            if (recordData.sleepStartTime && recordData.sleepEndTime) {
                const start = new Date(`2000-01-01T${recordData.sleepStartTime}`);
                const end = new Date(`2000-01-01T${recordData.sleepEndTime}`);
                
                // 處理跨日情況
                if (end < start) {
                    end.setDate(end.getDate() + 1);
                }
                
                recordData.sleepDuration = Math.round((end - start) / (1000 * 60)); // 分鐘
            }
            break;
            
        case 'diaper':
            recordData.diaperType = document.getElementById('diaperType').value;
            recordData.diaperConsistency = document.getElementById('diaperConsistency').value;
            break;
            
        case 'health':
            recordData.healthType = document.getElementById('healthType').value;
            recordData.healthDetails = document.getElementById('healthDetails').value;
            
            if (recordData.healthType === 'temperature') {
                recordData.temperature = parseFloat(document.getElementById('temperature').value) || 0;
                recordData.temperatureMethod = document.getElementById('temperatureMethod').value;
            }
            break;
            
        case 'activity':
            recordData.activityType = document.getElementById('activityType').value;
            recordData.activityDuration = parseInt(document.getElementById('activityDuration').value) || 0;
            
            if (recordData.activityType === 'custom') {
                recordData.customActivity = document.getElementById('customActivity').value;
            }
            break;
            
        case 'interaction':
            recordData.babyMood = document.getElementById('babyMood').value;
            recordData.interactionType = document.getElementById('interactionType').value;
            break;
    }
}

async function deleteRecord() {
    const recordId = document.getElementById('recordId').value;
    const recordType = document.getElementById('recordType').value;
    
    if (!recordId) return;
    
    if (await showConfirm('刪除記錄', '確定要刪除這筆記錄嗎？')) {
        try {
            await deleteRecordFromDB(DB_STORES[recordType], parseInt(recordId));
            showToast('記錄已刪除', 'success');
            closeModal('recordModal');
            loadDashboard();
            loadRecords();
        } catch (error) {
            console.error('刪除記錄失敗:', error);
            showToast('刪除記錄失敗', 'error');
        }
    }
}

// 重新命名原本的deleteRecord函數以避免衝突
function deleteRecordFromDB(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// ======================
// 里程碑管理功能
// ======================
async function loadMilestones(category = 'motor') {
    if (!currentChild) return;
    
    try {
        const milestones = await getRecordsByIndex(DB_STORES.milestones, 'childId', currentChild.id);
        const filteredMilestones = milestones.filter(m => m.category === category);
        
        // 添加預設里程碑（如果尚未添加）
        if (category !== 'custom') {
            for (const defaultTitle of DEFAULT_MILESTONES[category]) {
                const exists = filteredMilestones.some(m => m.title === defaultTitle);
                if (!exists) {
                    filteredMilestones.push({
                        id: null,
                        title: defaultTitle,
                        category,
                        description: '',
                        achievedDate: null,
                        notes: '',
                        isDefault: true
                    });
                }
            }
        }
        
        displayMilestones(filteredMilestones);
        
    } catch (error) {
        console.error('載入里程碑失敗:', error);
        showToast('載入里程碑失敗', 'error');
    }
}

function displayMilestones(milestones) {
    const container = document.getElementById('milestonesList');
    
    if (milestones.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-trophy" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                <p>暫無里程碑記錄</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = milestones.map(milestone => {
        const isAchieved = milestone.achievedDate;
        const achievedClass = isAchieved ? 'achieved' : '';
        
        return `
            <div class="milestone-item ${achievedClass}" onclick="openMilestoneModal('${milestone.category}', ${milestone.id})">
                <div class="milestone-title">${milestone.title}</div>
                <div class="milestone-description">${milestone.description}</div>
                ${isAchieved ? 
                    `<div class="milestone-date">達成日期: ${formatDate(milestone.achievedDate)}</div>` : 
                    '<div class="milestone-date">尚未達成</div>'
                }
            </div>
        `;
    }).join('');
}

function openMilestoneModal(category = 'motor', milestoneId = null) {
    if (!currentChild) {
        showToast('請先選擇孩子', 'warning');
        return;
    }
    
    const modal = document.getElementById('milestoneModal');
    const form = document.getElementById('milestoneForm');
    const title = document.getElementById('milestoneModalTitle');
    const deleteBtn = document.getElementById('deleteMilestone');
    
    form.reset();
    document.getElementById('milestoneCategory').value = category;
    
    if (milestoneId) {
        title.textContent = '編輯里程碑';
        deleteBtn.style.display = 'inline-block';
        loadMilestoneData(milestoneId);
    } else {
        title.textContent = '添加里程碑';
        deleteBtn.style.display = 'none';
    }
    
    modal.classList.add('show');
}

async function loadMilestoneData(milestoneId) {
    try {
        const transaction = db.transaction([DB_STORES.milestones], 'readonly');
        const store = transaction.objectStore(DB_STORES.milestones);
        const request = store.get(parseInt(milestoneId));
        
        request.onsuccess = function() {
            const milestone = request.result;
            if (milestone) {
                document.getElementById('milestoneId').value = milestone.id;
                document.getElementById('milestoneCategory').value = milestone.category;
                document.getElementById('milestoneTitle').value = milestone.title;
                document.getElementById('milestoneDescription').value = milestone.description || '';
                document.getElementById('milestoneAchievedDate').value = milestone.achievedDate ? 
                    milestone.achievedDate.split('T')[0] : '';
                document.getElementById('milestoneNotes').value = milestone.notes || '';
            }
        };
    } catch (error) {
        console.error('載入里程碑資料失敗:', error);
        showToast('載入里程碑資料失敗', 'error');
    }
}

async function saveMilestone(event) {
    event.preventDefault();
    
    const milestoneId = document.getElementById('milestoneId').value;
    const category = document.getElementById('milestoneCategory').value;
    const title = document.getElementById('milestoneTitle').value;
    const description = document.getElementById('milestoneDescription').value;
    const achievedDate = document.getElementById('milestoneAchievedDate').value;
    const notes = document.getElementById('milestoneNotes').value;
    
    try {
        const milestoneData = {
            childId: currentChild.id,
            category,
            title,
            description,
            achievedDate: achievedDate ? new Date(achievedDate).toISOString() : null,
            notes,
            createdAt: milestoneId ? undefined : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        if (milestoneId) {
            milestoneData.id = parseInt(milestoneId);
            await updateRecord(DB_STORES.milestones, milestoneData);
            showToast('里程碑更新成功', 'success');
        } else {
            await addRecord(DB_STORES.milestones, milestoneData);
            showToast('里程碑新增成功', 'success');
        }
        
        closeModal('milestoneModal');
        
        // 重新載入當前類別的里程碑
        const activeTab = document.querySelector('.milestone-tab.active');
        const currentCategory = activeTab ? activeTab.getAttribute('data-category') : 'motor';
        loadMilestones(currentCategory);
        
    } catch (error) {
        console.error('保存里程碑失敗:', error);
        showToast('保存里程碑失敗', 'error');
    }
}

async function deleteMilestone() {
    const milestoneId = document.getElementById('milestoneId').value;
    
    if (!milestoneId) return;
    
    if (await showConfirm('刪除里程碑', '確定要刪除這個里程碑嗎？')) {
        try {
            await deleteRecord(DB_STORES.milestones, parseInt(milestoneId));
            showToast('里程碑已刪除', 'success');
            closeModal('milestoneModal');
            
            // 重新載入當前類別的里程碑
            const activeTab = document.querySelector('.milestone-tab.active');
            const currentCategory = activeTab ? activeTab.getAttribute('data-category') : 'motor';
            loadMilestones(currentCategory);
            
        } catch (error) {
            console.error('刪除里程碑失敗:', error);
            showToast('刪除里程碑失敗', 'error');
        }
    }
}

// ======================
// 儀表板功能
// ======================
async function loadDashboard() {
    console.log('載入儀表板...');
    
    if (!currentChild) {
        console.log('沒有選擇孩子，顯示空狀態');
        showEmptyState();
        return;
    }
    
    console.log('當前孩子:', currentChild.name);
    
    try {
        // 載入今日摘要
        console.log('載入今日摘要...');
        await loadTodaySummary();
        
        // 載入圖表
        console.log('載入圖表...');
        if (typeof Chart !== 'undefined') {
            await loadChart('feeding');
        } else {
            console.warn('Chart.js 未載入，跳過圖表顯示');
        }
        
        console.log('儀表板載入完成');
        
    } catch (error) {
        console.error('載入儀表板失敗:', error);
        showToast('載入儀表板失敗', 'error');
    }
}

async function loadTodaySummary() {
    const today = new Date().toISOString().split('T')[0];
    const summaryData = {};
    
    // 獲取各類型記錄的今日統計
    const recordTypes = ['feeding', 'sleep', 'diaper', 'health', 'activity', 'interaction'];
    
    for (const type of recordTypes) {
        const records = await getRecordsByIndex(DB_STORES[type], 'childId', currentChild.id);
        const todayRecords = records.filter(record => 
            record.dateTime.startsWith(today)
        );
        summaryData[type] = todayRecords.length;
    }
    
    // 計算今日睡眠時間
    const sleepRecords = await getRecordsByIndex(DB_STORES.sleep, 'childId', currentChild.id);
    const todaySleep = sleepRecords.filter(record => record.dateTime.startsWith(today));
    const totalSleepMinutes = todaySleep.reduce((total, record) => {
        return total + (record.sleepDuration || 0);
    }, 0);
    const sleepHours = Math.round(totalSleepMinutes / 60 * 10) / 10;
    
    // 顯示摘要卡片
    const summaryContainer = document.getElementById('todaySummary');
    summaryContainer.innerHTML = `
        <div class="summary-card">
            <h3><i class="fas fa-baby-carriage"></i> 餵食</h3>
            <span class="count">${summaryData.feeding}</span>
            <span class="label">次</span>
        </div>
        <div class="summary-card">
            <h3><i class="fas fa-bed"></i> 睡眠</h3>
            <span class="count">${sleepHours}</span>
            <span class="label">小時</span>
        </div>
        <div class="summary-card">
            <h3><i class="fas fa-baby"></i> 尿布</h3>
            <span class="count">${summaryData.diaper}</span>
            <span class="label">次</span>
        </div>
        <div class="summary-card">
            <h3><i class="fas fa-heart"></i> 互動</h3>
            <span class="count">${summaryData.interaction}</span>
            <span class="label">次</span>
        </div>
    `;
}

// ======================
// 圖表功能
// ======================
async function loadChart(chartType) {
    if (!currentChild) return;
    
    try {
        const canvas = document.getElementById('mainChart');
        const ctx = canvas.getContext('2d');
        
        // 銷毀現有圖表
        if (currentChart) {
            currentChart.destroy();
        }
        
        let chartData, chartOptions;
        
        switch (chartType) {
            case 'feeding':
                ({ chartData, chartOptions } = await getFeedingChartData());
                break;
            case 'sleep':
                ({ chartData, chartOptions } = await getSleepChartData());
                break;
            case 'growth':
                ({ chartData, chartOptions } = await getGrowthChartData());
                break;
            default:
                return;
        }
        
        currentChart = new Chart(ctx, {
            type: chartData.type,
            data: chartData.data,
            options: chartOptions
        });
        
    } catch (error) {
        console.error('載入圖表失敗:', error);
        showToast('載入圖表失敗', 'error');
    }
}

async function getFeedingChartData() {
    const records = await getRecordsByIndex(DB_STORES.feeding, 'childId', currentChild.id);
    
    // 獲取最近7天的資料
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push(date.toISOString().split('T')[0]);
    }
    
    const feedingData = last7Days.map(date => {
        return records.filter(record => record.dateTime.startsWith(date)).length;
    });
    
    return {
        chartData: {
            type: 'line',
            data: {
                labels: last7Days.map(date => formatDate(date)),
                datasets: [{
                    label: '餵食次數',
                    data: feedingData,
                    borderColor: '#ff6b9d',
                    backgroundColor: 'rgba(255, 107, 157, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            }
        },
        chartOptions: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    };
}

async function getSleepChartData() {
    const records = await getRecordsByIndex(DB_STORES.sleep, 'childId', currentChild.id);
    
    // 獲取最近7天的睡眠時間
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push(date.toISOString().split('T')[0]);
    }
    
    const sleepData = last7Days.map(date => {
        const dayRecords = records.filter(record => record.dateTime.startsWith(date));
        const totalMinutes = dayRecords.reduce((total, record) => {
            return total + (record.sleepDuration || 0);
        }, 0);
        return Math.round(totalMinutes / 60 * 10) / 10; // 轉換為小時
    });
    
    return {
        chartData: {
            type: 'bar',
            data: {
                labels: last7Days.map(date => formatDate(date)),
                datasets: [{
                    label: '睡眠時間（小時）',
                    data: sleepData,
                    backgroundColor: '#74c0fc',
                    borderColor: '#339af0',
                    borderWidth: 1
                }]
            }
        },
        chartOptions: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + 'h';
                        }
                    }
                }
            }
        }
    };
}

async function getGrowthChartData() {
    // 模擬成長數據（實際應用中可以從健康記錄中獲取體重、身高等數據）
    const healthRecords = await getRecordsByIndex(DB_STORES.health, 'childId', currentChild.id);
    const checkupRecords = healthRecords.filter(record => record.healthType === 'checkup');
    
    if (checkupRecords.length === 0) {
        // 如果沒有體檢記錄，顯示模擬數據
        const birthDate = new Date(currentChild.birthDate);
        const ageInMonths = Math.floor((new Date() - birthDate) / (1000 * 60 * 60 * 24 * 30));
        
        const months = [];
        const weights = [];
        
        for (let i = 0; i <= Math.min(ageInMonths, 12); i++) {
            months.push(`${i}月`);
            // 模擬體重增長曲線
            weights.push(3.5 + i * 0.5 + Math.random() * 0.2);
        }
        
        return {
            chartData: {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [{
                        label: '體重（公斤）',
                        data: weights,
                        borderColor: '#51cf66',
                        backgroundColor: 'rgba(81, 207, 102, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                }
            },
            chartOptions: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + 'kg';
                            }
                        }
                    }
                }
            }
        };
    }
    
    // 處理實際的體檢記錄
    // 這裡需要根據實際的資料結構來實現
    return getFeedingChartData(); // 暫時返回餵食圖表
}

// ======================
// 記錄列表功能
// ======================
async function loadRecords() {
    if (!currentChild) return;
    
    try {
        const recordTypes = ['feeding', 'sleep', 'diaper', 'health', 'activity', 'interaction'];
        let allRecords = [];
        
        for (const type of recordTypes) {
            const records = await getRecordsByIndex(DB_STORES[type], 'childId', currentChild.id);
            records.forEach(record => {
                record.type = type;
            });
            allRecords = allRecords.concat(records);
        }
        
        // 依時間排序（最新的在前）
        allRecords.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
        
        displayRecords(allRecords);
        
    } catch (error) {
        console.error('載入記錄失敗:', error);
        showToast('載入記錄失敗', 'error');
    }
}

function displayRecords(records) {
    const container = document.getElementById('recordsList');
    
    if (records.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-list" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                <p>暫無記錄</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = records.map(record => {
        const typeConfig = getRecordTypeConfig(record.type);
        const content = getRecordContent(record);
        
        return `
            <div class="record-item ${record.type}" onclick="openRecordModal('${record.type}', ${record.id})">
                <div class="record-header">
                    <div class="record-title">
                        <i class="${typeConfig.icon}"></i>
                        ${typeConfig.name}
                    </div>
                    <div class="record-time">${formatDateTime(record.dateTime)}</div>
                </div>
                <div class="record-content">${content}</div>
                ${record.photo ? `<img src="${record.photo}" class="record-photo" alt="記錄照片">` : ''}
                ${record.notes ? `<div class="record-notes">${record.notes}</div>` : ''}
            </div>
        `;
    }).join('');
}

function getRecordTypeConfig(type) {
    const configs = {
        feeding: { name: '餵食記錄', icon: 'fas fa-baby-carriage' },
        sleep: { name: '睡眠記錄', icon: 'fas fa-bed' },
        diaper: { name: '尿布記錄', icon: 'fas fa-baby' },
        health: { name: '健康記錄', icon: 'fas fa-stethoscope' },
        activity: { name: '活動記錄', icon: 'fas fa-gamepad' },
        interaction: { name: '互動記錄', icon: 'fas fa-heart' }
    };
    return configs[type] || { name: '未知記錄', icon: 'fas fa-question' };
}

function getRecordContent(record) {
    switch (record.type) {
        case 'feeding':
            if (record.feedingType === 'breast') {
                return `母乳 - ${record.breastSide || ''}側，${record.breastDuration || 0}分鐘`;
            } else if (record.feedingType === 'formula') {
                return `配方奶 - ${record.formulaAmount || 0}ml`;
            } else if (record.feedingType === 'solid') {
                return `副食品 - ${record.solidType || ''} ${record.solidAmount || 0}g`;
            }
            return '餵食記錄';
            
        case 'sleep':
            if (record.sleepDuration) {
                const hours = Math.floor(record.sleepDuration / 60);
                const minutes = record.sleepDuration % 60;
                return `睡眠 ${hours}小時${minutes}分鐘 - ${record.sleepQuality || ''}`;
            }
            return `${record.sleepStartTime || ''} - ${record.sleepEndTime || ''}`;
            
        case 'diaper':
            const typeMap = { wet: '尿濕', soiled: '排便', both: '混合' };
            return `${typeMap[record.diaperType] || record.diaperType}${record.diaperConsistency ? ` - ${record.diaperConsistency}` : ''}`;
            
        case 'health':
            if (record.healthType === 'temperature') {
                return `體溫: ${record.temperature}°C (${record.temperatureMethod})`;
            }
            const healthTypeMap = {
                vaccination: '疫苗接種',
                medication: '用藥記錄',
                illness: '疾病記錄',
                checkup: '體檢記錄'
            };
            return `${healthTypeMap[record.healthType] || record.healthType}${record.healthDetails ? ` - ${record.healthDetails}` : ''}`;
            
        case 'activity':
            const activityName = record.activityType === 'custom' ? 
                record.customActivity : ACTIVITY_TYPES[record.activityType];
            return `${activityName}${record.activityDuration ? ` - ${record.activityDuration}分鐘` : ''}`;
            
        case 'interaction':
            const moodMap = {
                happy: '開心',
                calm: '平靜',
                fussy: '煩躁',
                crying: '哭泣',
                sleepy: '想睡',
                alert: '警覺'
            };
            const interactionMap = {
                play: '遊戲',
                talk: '對話',
                cuddle: '擁抱',
                sing: '唱歌',
                story: '講故事',
                other: '其他'
            };
            return `${interactionMap[record.interactionType] || record.interactionType} - 寶寶${moodMap[record.babyMood] || record.babyMood}`;
            
        default:
            return '';
    }
}

// ======================
// 模態對話框控制
// ======================
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
}

function showConfirm(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmTitle');
        const messageEl = document.getElementById('confirmMessage');
        const okBtn = document.getElementById('confirmOk');
        const cancelBtn = document.getElementById('confirmCancel');
        
        titleEl.textContent = title;
        messageEl.textContent = message;
        
        const handleOk = () => {
            cleanup();
            resolve(true);
        };
        
        const handleCancel = () => {
            cleanup();
            resolve(false);
        };
        
        const cleanup = () => {
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            modal.classList.remove('show');
        };
        
        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
        modal.classList.add('show');
    });
}

// ======================
// 導航功能
// ======================
function switchSection(sectionName) {
    // 更新導航狀態
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
    
    // 隱藏所有區塊
    document.querySelectorAll('.main-content section').forEach(section => {
        section.style.display = 'none';
    });
    
    // 顯示對應區塊
    switch (sectionName) {
        case 'dashboard':
            document.querySelector('.quick-record').style.display = 'block';
            document.querySelector('.today-summary').style.display = 'block';
            document.querySelector('.charts-section').style.display = 'block';
            break;
        case 'records':
            document.querySelector('.records-section').style.display = 'block';
            loadRecords();
            break;
        case 'milestones':
            document.querySelector('.milestones-section').style.display = 'block';
            loadMilestones('motor');
            break;
        case 'statistics':
            document.querySelector('.charts-section').style.display = 'block';
            loadChart('feeding');
            break;
        case 'settings':
            openSettingsModal();
            break;
    }
    
    currentSection = sectionName;
}

// ======================
// 設定功能
// ======================
function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.classList.add('show');
}

async function exportData() {
    if (!currentChild) {
        showToast('請先選擇孩子', 'warning');
        return;
    }
    
    try {
        const data = {
            child: currentChild,
            records: {}
        };
        
        // 匯出所有記錄
        const recordTypes = ['feeding', 'sleep', 'diaper', 'health', 'activity', 'interaction', 'milestones'];
        
        for (const type of recordTypes) {
            data.records[type] = await getRecordsByIndex(DB_STORES[type], 'childId', currentChild.id);
        }
        
        // 創建下載檔案
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${currentChild.name}_記錄_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showToast('數據匯出成功', 'success');
        
    } catch (error) {
        console.error('匯出數據失敗:', error);
        showToast('匯出數據失敗', 'error');
    }
}

function importData() {
    const input = document.getElementById('importFile');
    input.click();
}

async function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (!data.child || !data.records) {
            throw new Error('檔案格式不正確');
        }
        
        // 匯入孩子資料
        delete data.child.id; // 移除舊的 ID
        const newChildId = await addRecord(DB_STORES.children, data.child);
        
        // 匯入記錄
        const recordTypes = ['feeding', 'sleep', 'diaper', 'health', 'activity', 'interaction', 'milestones'];
        
        for (const type of recordTypes) {
            if (data.records[type]) {
                for (const record of data.records[type]) {
                    delete record.id; // 移除舊的 ID
                    record.childId = newChildId; // 設定新的孩子 ID
                    await addRecord(DB_STORES[type], record);
                }
            }
        }
        
        showToast('數據匯入成功', 'success');
        await loadChildren();
        closeModal('settingsModal');
        
    } catch (error) {
        console.error('匯入數據失敗:', error);
        showToast('匯入數據失敗，請檢查檔案格式', 'error');
    }
}

// ======================
// 篩選功能
// ======================
function filterRecords() {
    const typeFilter = document.getElementById('recordTypeFilter').value;
    const dateFilter = document.getElementById('recordDateFilter').value;
    
    loadRecords().then(() => {
        const records = Array.from(document.querySelectorAll('.record-item'));
        
        records.forEach(record => {
            let show = true;
            
            // 類型篩選
            if (typeFilter && !record.classList.contains(typeFilter)) {
                show = false;
            }
            
            // 日期篩選
            if (dateFilter) {
                const recordTime = record.querySelector('.record-time').textContent;
                const recordDate = recordTime.split(' ')[0];
                if (recordDate !== formatDate(dateFilter)) {
                    show = false;
                }
            }
            
            record.style.display = show ? 'block' : 'none';
        });
    });
}

// ======================
// 工具函數
// ======================
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
}

// ======================
// 事件監聽器初始化
// ======================
function initEventListeners() {
    console.log('初始化事件監聽器...');
    
    // 安全的事件綁定函數
    function safeAddEventListener(selector, event, handler) {
        const element = document.getElementById(selector) || document.querySelector(selector);
        if (element) {
            element.addEventListener(event, handler);
            console.log(`成功綁定事件: ${selector}`);
            return true;
        } else {
            console.error(`找不到元素: ${selector}`);
            return false;
        }
    }
    
    // 孩子選擇變更
    safeAddEventListener('childSelect', 'change', async (e) => {
        if (e.target.value) {
            try {
                const transaction = db.transaction([DB_STORES.children], 'readonly');
                const store = transaction.objectStore(DB_STORES.children);
                const request = store.get(parseInt(e.target.value));
                
                request.onsuccess = function() {
                    currentChild = request.result;
                    loadDashboard();
                };
            } catch (error) {
                console.error('載入孩子資料失敗:', error);
                showToast('載入孩子資料失敗', 'error');
            }
        } else {
            currentChild = null;
        }
    });
    
    // 添加孩子按鈕
    safeAddEventListener('addChildBtn', 'click', () => openChildModal());
    
    // 快速記錄按鈕
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.getAttribute('data-type');
            openRecordModal(type);
        });
    });
    
    // 圖表切換標籤
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const chartType = tab.getAttribute('data-chart');
            loadChart(chartType);
        });
    });
    
    // 里程碑分類標籤
    document.querySelectorAll('.milestone-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.milestone-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const category = tab.getAttribute('data-category');
            loadMilestones(category);
        });
    });
    
    // 添加里程碑按鈕
    safeAddEventListener('addMilestoneBtn', 'click', () => {
        const activeTab = document.querySelector('.milestone-tab.active');
        const category = activeTab ? activeTab.getAttribute('data-category') : 'motor';
        openMilestoneModal(category);
    });
    
    // 底部導航
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.getAttribute('data-section');
            switchSection(section);
        });
    });
    
    // 設定按鈕
    safeAddEventListener('settingsBtn', 'click', openSettingsModal);
    
    // 孩子表單
    safeAddEventListener('childForm', 'submit', saveChild);
    safeAddEventListener('cancelChild', 'click', () => closeModal('childModal'));
    safeAddEventListener('deleteChild', 'click', deleteChild);
    
    // 記錄表單
    safeAddEventListener('recordForm', 'submit', saveRecord);
    safeAddEventListener('cancelRecord', 'click', () => closeModal('recordModal'));
    safeAddEventListener('deleteRecord', 'click', deleteRecord);
    
    // 里程碑表單
    safeAddEventListener('milestoneForm', 'submit', saveMilestone);
    safeAddEventListener('cancelMilestone', 'click', () => closeModal('milestoneModal'));
    safeAddEventListener('deleteMilestone', 'click', deleteMilestone);
    
    // 設定對話框
    safeAddEventListener('closeSettings', 'click', () => closeModal('settingsModal'));
    safeAddEventListener('exportData', 'click', exportData);
    safeAddEventListener('importData', 'click', importData);
    safeAddEventListener('importFile', 'change', handleImportFile);
    
    // 確認對話框關閉
    safeAddEventListener('confirmCancel', 'click', () => closeModal('confirmModal'));
    
    // 模態對話框關閉按鈕
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.classList.remove('show');
            }
        });
    });
    
    // 點擊背景關閉模態對話框
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    });
    
    // 記錄類型篩選
    safeAddEventListener('recordTypeFilter', 'change', filterRecords);
    safeAddEventListener('recordDateFilter', 'change', filterRecords);
    
    // 餵食類型變更
    safeAddEventListener('feedingType', 'change', showFeedingSubfields);
    
    // 健康類型變更
    safeAddEventListener('healthType', 'change', showHealthSubfields);
    
    // 活動類型變更
    safeAddEventListener('activityType', 'change', showCustomActivityField);
    
    // 照片上傳
    safeAddEventListener('childPhoto', 'change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const preview = document.getElementById('photoPreview');
            if (preview) {
                handlePhotoUpload(e.target, preview);
            }
        }
    });
    
    safeAddEventListener('recordPhoto', 'change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const preview = document.getElementById('recordPhotoPreview');
            if (preview) {
                handlePhotoUpload(e.target, preview);
            }
        }
    });
    
    // 照片預覽區點擊事件
    const photoPreview = document.getElementById('photoPreview');
    if (photoPreview) {
        photoPreview.addEventListener('click', () => {
            const childPhoto = document.getElementById('childPhoto');
            if (childPhoto) childPhoto.click();
        });
    }
    
    const recordPhotoPreview = document.getElementById('recordPhotoPreview');
    if (recordPhotoPreview) {
        recordPhotoPreview.addEventListener('click', () => {
            const recordPhoto = document.getElementById('recordPhoto');
            if (recordPhoto) recordPhoto.click();
        });
    }
    
    console.log('事件監聽器初始化完成');
}

// ======================
// 應用程式初始化
// ======================
function checkRequiredElements() {
    const requiredElements = [
        'loadingScreen',
        'app',
        'childSelect',
        'addChildBtn',
        'todaySummary',
        'mainChart',
        'recordsList',
        'milestonesList'
    ];
    
    const missingElements = [];
    requiredElements.forEach(id => {
        if (!document.getElementById(id)) {
            missingElements.push(id);
        }
    });
    
    if (missingElements.length > 0) {
        console.error('缺少必要的DOM元素:', missingElements);
        return false;
    }
    
    console.log('所有必要的DOM元素都存在');
    return true;
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM載入完成，開始初始化...');
    
    // 檢查必要元素
    if (!checkRequiredElements()) {
        console.error('初始化失敗：缺少必要的DOM元素');
        return;
    }
    
    // 初始化各個模組
    try {
        initTheme();
        console.log('主題初始化完成');
        
        initEventListeners();
        console.log('事件監聽器初始化完成');
        
        initDB();
        console.log('資料庫初始化開始');
        
    } catch (error) {
        console.error('初始化過程中發生錯誤:', error);
    }
});

// 處理頁面可見性變更（應用回到前台時刷新數據）
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && currentChild) {
        loadDashboard();
    }
});

// 處理離線/上線狀態
window.addEventListener('online', function() {
    showToast('網路連接已恢復', 'success');
});

window.addEventListener('offline', function() {
    showToast('目前離線模式，數據將保存在本地', 'info');
});