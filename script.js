/**
 * =================================================
 * 嬰幼兒照護追蹤應用 - JavaScript 功能
 * 使用 IndexedDB 進行本地數據存儲
 * =================================================
 */

// 全局變數
let currentChildId = null;
let db = null;
let charts = {};
let userTimezone = 'Asia/Taipei'; // 預設時區

// 數據庫配置
const DB_NAME = 'BabyCareDB';
const DB_VERSION = 1;

// 應用初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

/**
 * =================================================
 * 應用初始化
 * =================================================
 */
async function initializeApp() {
    try {
        showLoading(true);
        
        // 檢查 IndexedDB 支持
        if (!window.indexedDB) {
            throw new Error('瀏覽器不支援 IndexedDB');
        }
        
        // 初始化數據庫
        await initializeDatabase();
        
        // 載入主題設置
        loadTheme();
        
        // 載入時區設置
        loadTimezone();
        
        // 設置事件監聽器
        setupEventListeners();
        
        // 載入寶寶列表
        await loadChildren();
        
        // 載入預設頁面
        showPage('dashboard');
        
        // 載入今日摘要
        await loadTodaySummary();
        
        showLoading(false);
        console.log('應用初始化成功');
    } catch (error) {
        console.error('應用初始化失敗:', error);
        showLoading(false);
        alert('應用初始化失敗：' + error.message + '\n請重新整理頁面。');
    }
}

/**
 * =================================================
 * IndexedDB 數據庫操作
 * =================================================
 */

// 初始化數據庫
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = function() {
            reject(new Error('無法開啟數據庫'));
        };
        
        request.onsuccess = function() {
            db = request.result;
            resolve();
        };
        
        request.onupgradeneeded = function(event) {
            db = event.target.result;
            
            // 建立物件存儲空間
            createObjectStores();
        };
    });
}

// 建立物件存儲空間
function createObjectStores() {
    // 寶寶資料表
    if (!db.objectStoreNames.contains('children')) {
        const childrenStore = db.createObjectStore('children', { keyPath: 'id', autoIncrement: true });
        childrenStore.createIndex('name', 'name', { unique: false });
    }
    
    // 餵食記錄表
    if (!db.objectStoreNames.contains('feeding_records')) {
        const feedingStore = db.createObjectStore('feeding_records', { keyPath: 'id', autoIncrement: true });
        feedingStore.createIndex('childId', 'childId', { unique: false });
        feedingStore.createIndex('date', 'date', { unique: false });
    }
    
    // 睡眠記錄表
    if (!db.objectStoreNames.contains('sleep_records')) {
        const sleepStore = db.createObjectStore('sleep_records', { keyPath: 'id', autoIncrement: true });
        sleepStore.createIndex('childId', 'childId', { unique: false });
        sleepStore.createIndex('date', 'date', { unique: false });
    }
    
    // 尿布記錄表
    if (!db.objectStoreNames.contains('diaper_records')) {
        const diaperStore = db.createObjectStore('diaper_records', { keyPath: 'id', autoIncrement: true });
        diaperStore.createIndex('childId', 'childId', { unique: false });
        diaperStore.createIndex('date', 'date', { unique: false });
    }
    
    // 健康記錄表
    if (!db.objectStoreNames.contains('health_records')) {
        const healthStore = db.createObjectStore('health_records', { keyPath: 'id', autoIncrement: true });
        healthStore.createIndex('childId', 'childId', { unique: false });
        healthStore.createIndex('date', 'date', { unique: false });
    }
    
    // 里程碑記錄表
    if (!db.objectStoreNames.contains('milestones')) {
        const milestonesStore = db.createObjectStore('milestones', { keyPath: 'id', autoIncrement: true });
        milestonesStore.createIndex('childId', 'childId', { unique: false });
        milestonesStore.createIndex('category', 'category', { unique: false });
    }
    
    // 活動記錄表
    if (!db.objectStoreNames.contains('activities')) {
        const activitiesStore = db.createObjectStore('activities', { keyPath: 'id', autoIncrement: true });
        activitiesStore.createIndex('childId', 'childId', { unique: false });
        activitiesStore.createIndex('date', 'date', { unique: false });
    }
}

// 通用數據庫操作函數
function dbOperation(storeName, mode, operation) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        
        const request = operation(store);
        
        request.onsuccess = function() {
            resolve(request.result);
        };
        
        request.onerror = function() {
            reject(request.error);
        };
    });
}

// 添加記錄
function addRecord(storeName, data) {
    return dbOperation(storeName, 'readwrite', store => store.add(data));
}

// 更新記錄
function updateRecord(storeName, data) {
    return dbOperation(storeName, 'readwrite', store => store.put(data));
}

// 刪除記錄
function deleteRecord(storeName, id) {
    return dbOperation(storeName, 'readwrite', store => store.delete(id));
}

// 獲取單一記錄
function getRecord(storeName, id) {
    return dbOperation(storeName, 'readonly', store => store.get(id));
}

// 獲取所有記錄
function getAllRecords(storeName) {
    return dbOperation(storeName, 'readonly', store => store.getAll());
}

// 根據索引獲取記錄
function getRecordsByIndex(storeName, indexName, value) {
    return dbOperation(storeName, 'readonly', store => {
        const index = store.index(indexName);
        return index.getAll(value);
    });
}

/**
 * =================================================
 * 事件監聽器設置
 * =================================================
 */
function setupEventListeners() {
    // 導航標籤點擊
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            showPage(page);
        });
    });
    
    // 主題切換
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // 寶寶選擇器
    document.getElementById('childSelector').addEventListener('change', function() {
        currentChildId = this.value ? parseInt(this.value) : null;
        refreshCurrentPage();
    });
    
    // 時區選擇器
    document.getElementById('timezoneSelector').addEventListener('change', function() {
        userTimezone = this.value;
        saveTimezone();
        refreshCurrentPage();
    });
    
    // 模態視窗控制
    setupModalControls();
    
    // 表單提交
    setupFormSubmissions();
    
    // 快速記錄按鈕
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            openQuickRecordModal(type);
        });
    });
    
    // 寶寶管理按鈕
    document.getElementById('addChildBtn').addEventListener('click', () => openChildModal());
    
    // 各頁面的新增按鈕
    document.getElementById('addFeedingBtn').addEventListener('click', () => openFeedingModal());
    document.getElementById('addSleepBtn').addEventListener('click', () => openSleepModal());
    document.getElementById('addDiaperBtn').addEventListener('click', () => openDiaperModal());
    document.getElementById('addHealthBtn').addEventListener('click', () => openHealthModal());
    document.getElementById('addMilestoneBtn').addEventListener('click', () => openMilestoneModal());
    document.getElementById('addActivityBtn').addEventListener('click', () => openActivityModal());
    
    // 里程碑分類標籤
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            showMilestoneCategory(category);
        });
    });
    
    // 統計頁面控制
    document.getElementById('statsDateRange').addEventListener('change', refreshStatistics);
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    document.getElementById('importDataBtn').addEventListener('click', () => {
        document.getElementById('importFileInput').click();
    });
    document.getElementById('importFileInput').addEventListener('change', importData);
    
    // 照片上傳預覽
    document.getElementById('childPhoto').addEventListener('change', function() {
        previewPhoto(this, 'childPhotoPreview');
    });
    document.getElementById('activityPhoto').addEventListener('change', function() {
        previewPhoto(this, 'activityPhotoPreview');
    });
    
    // 餵食類型切換
    document.getElementById('feedingType').addEventListener('change', function() {
        toggleFeedingFields(this.value);
    });
    
    // 健康記錄類型切換
    document.getElementById('healthType').addEventListener('change', function() {
        toggleHealthFields(this.value);
    });
    
    // 活動類型切換
    document.getElementById('activityType').addEventListener('change', function() {
        toggleActivityFields(this.value);
    });
}

/**
 * =================================================
 * 模態視窗控制
 * =================================================
 */
function setupModalControls() {
    // 模態視窗關閉按鈕
    document.querySelectorAll('.modal-close, [data-dismiss="modal"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal);
        });
    });
    
    // 點擊模態視窗背景關閉
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this);
            }
        });
    });
    
    // ESC 鍵關閉模態視窗
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal.show');
            if (openModal) {
                closeModal(openModal);
            }
        }
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
    
    // 重置表單
    const form = modal.querySelector('form');
    if (form) {
        form.reset();
        clearFormValidation(form);
    }
    
    // 清空照片預覽
    const photoPreview = modal.querySelector('.photo-preview');
    if (photoPreview) {
        photoPreview.innerHTML = '';
    }
}

/**
 * =================================================
 * 表單提交處理
 * =================================================
 */
function setupFormSubmissions() {
    // 寶寶表單
    document.getElementById('childForm').addEventListener('submit', handleChildFormSubmit);
    
    // 餵食表單
    document.getElementById('feedingForm').addEventListener('submit', handleFeedingFormSubmit);
    
    // 睡眠表單
    document.getElementById('sleepForm').addEventListener('submit', handleSleepFormSubmit);
    
    // 尿布表單
    document.getElementById('diaperForm').addEventListener('submit', handleDiaperFormSubmit);
    
    // 健康表單
    document.getElementById('healthForm').addEventListener('submit', handleHealthFormSubmit);
    
    // 里程碑表單
    document.getElementById('milestoneForm').addEventListener('submit', handleMilestoneFormSubmit);
    
    // 活動表單
    document.getElementById('activityForm').addEventListener('submit', handleActivityFormSubmit);
}

/**
 * =================================================
 * 寶寶管理功能
 * =================================================
 */

// 載入寶寶列表
async function loadChildren() {
    try {
        const children = await getAllRecords('children');
        displayChildren(children);
        updateChildSelector(children);
        
        // 如果沒有選擇寶寶且有寶寶資料，選擇第一個
        if (!currentChildId && children.length > 0) {
            currentChildId = children[0].id;
            document.getElementById('childSelector').value = currentChildId;
        }
    } catch (error) {
        console.error('載入寶寶列表失敗:', error);
    }
}

// 顯示寶寶列表
function displayChildren(children) {
    const container = document.getElementById('childrenList');
    
    if (children.length === 0) {
        container.innerHTML = `
            <div class="card text-center">
                <h3>尚未新增寶寶</h3>
                <p>請點擊下方按鈕新增第一個寶寶</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = children.map(child => `
        <div class="child-card ${child.id === currentChildId ? 'selected' : ''}" data-child-id="${child.id}">
            <div class="child-photo">
                ${child.photo ? `<img src="${child.photo}" alt="${child.name}">` : '<i class="fas fa-user"></i>'}
            </div>
            <div class="child-name">${child.name}</div>
            <div class="child-age">${calculateAge(child.birthDate)}</div>
            <div class="child-actions">
                <button class="btn btn-sm btn-primary" onclick="selectChild(${child.id})">
                    <i class="fas fa-check"></i> 選擇
                </button>
                <button class="btn btn-sm btn-secondary" onclick="editChild(${child.id})">
                    <i class="fas fa-edit"></i> 編輯
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteChild(${child.id})">
                    <i class="fas fa-trash"></i> 刪除
                </button>
            </div>
            ${child.notes ? `<div class="child-notes">${child.notes}</div>` : ''}
        </div>
    `).join('');
}

// 更新寶寶選擇器
function updateChildSelector(children) {
    const selector = document.getElementById('childSelector');
    selector.innerHTML = '<option value="">選擇寶寶</option>' + 
        children.map(child => `<option value="${child.id}">${child.name}</option>`).join('');
    
    if (currentChildId) {
        selector.value = currentChildId;
    }
}

// 計算年齡
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

// 選擇寶寶
function selectChild(childId) {
    currentChildId = childId;
    document.getElementById('childSelector').value = childId;
    refreshCurrentPage();
}

// 編輯寶寶
async function editChild(childId) {
    try {
        const child = await getRecord('children', childId);
        openChildModal(child);
    } catch (error) {
        console.error('載入寶寶資料失敗:', error);
        alert('載入寶寶資料失敗');
    }
}

// 刪除寶寶
async function deleteChild(childId) {
    if (!confirm('確定要刪除這個寶寶的所有資料嗎？此操作無法復原。')) {
        return;
    }
    
    try {
        showLoading(true);
        
        // 刪除寶寶基本資料
        await deleteRecord('children', childId);
        
        // 刪除相關記錄
        const stores = ['feeding_records', 'sleep_records', 'diaper_records', 'health_records', 'milestones', 'activities'];
        
        for (const storeName of stores) {
            const records = await getRecordsByIndex(storeName, 'childId', childId);
            for (const record of records) {
                await deleteRecord(storeName, record.id);
            }
        }
        
        // 如果刪除的是當前選擇的寶寶，清空選擇
        if (currentChildId === childId) {
            currentChildId = null;
            document.getElementById('childSelector').value = '';
        }
        
        // 重新載入寶寶列表
        await loadChildren();
        await loadTodaySummary();
        
        showLoading(false);
        alert('寶寶資料已成功刪除');
    } catch (error) {
        console.error('刪除寶寶失敗:', error);
        showLoading(false);
        alert('刪除寶寶失敗');
    }
}

// 開啟寶寶模態視窗
function openChildModal(child = null) {
    const modal = document.getElementById('childModal');
    const form = document.getElementById('childForm');
    const title = document.getElementById('childModalTitle');
    
    if (child) {
        title.textContent = '編輯寶寶';
        form.dataset.editId = child.id;
        
        document.getElementById('childName').value = child.name;
        document.getElementById('childBirthDate').value = child.birthDate;
        document.getElementById('childGender').value = child.gender || 'male';
        document.getElementById('childNotes').value = child.notes || '';
        
        if (child.photo) {
            document.getElementById('childPhotoPreview').innerHTML = 
                `<img src="${child.photo}" alt="預覽">`;
        }
    } else {
        title.textContent = '新增寶寶';
        delete form.dataset.editId;
    }
    
    openModal('childModal');
}

// 處理寶寶表單提交
async function handleChildFormSubmit(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        const form = e.target;
        const isEdit = form.dataset.editId;
        
        const childData = {
            name: document.getElementById('childName').value,
            birthDate: document.getElementById('childBirthDate').value,
            gender: document.getElementById('childGender').value,
            notes: document.getElementById('childNotes').value,
            createdAt: isEdit ? undefined : toUserTimezoneISOString(),
            updatedAt: toUserTimezoneISOString()
        };
        
        // 處理照片
        const photoFile = document.getElementById('childPhoto').files[0];
        if (photoFile) {
            childData.photo = await fileToBase64(photoFile);
        } else if (isEdit) {
            // 編輯時如果沒有新照片，保留原照片
            const originalChild = await getRecord('children', parseInt(isEdit));
            childData.photo = originalChild.photo;
        }
        
        if (isEdit) {
            childData.id = parseInt(isEdit);
            await updateRecord('children', childData);
        } else {
            const newChild = await addRecord('children', childData);
            currentChildId = newChild.id || newChild;
        }
        
        closeModal(document.getElementById('childModal'));
        await loadChildren();
        
        showLoading(false);
        alert(isEdit ? '寶寶資料已更新' : '寶寶已新增');
    } catch (error) {
        console.error('儲存寶寶資料失敗:', error);
        showLoading(false);
        alert('儲存寶寶資料失敗');
    }
}

/**
 * =================================================
 * 餵食記錄功能
 * =================================================
 */

// 開啟餵食模態視窗
function openFeedingModal(record = null) {
    if (!currentChildId) {
        alert('請先選擇一個寶寶');
        return;
    }
    
    const modal = document.getElementById('feedingModal');
    const form = document.getElementById('feedingForm');
    const title = document.getElementById('feedingModalTitle');
    
    if (record) {
        title.textContent = '編輯餵食記錄';
        form.dataset.editId = record.id;
        
        document.getElementById('feedingType').value = record.type;
        document.getElementById('feedingStartTime').value = record.startTime || '';
        document.getElementById('feedingEndTime').value = record.endTime || '';
        document.getElementById('feedingQuantity').value = record.quantity || '';
        document.getElementById('feedingUnit').value = record.unit || 'ml';
        document.getElementById('feedingNotes').value = record.notes || '';
        
        toggleFeedingFields(record.type);
    } else {
        title.textContent = '新增餵食記錄';
        delete form.dataset.editId;
        
        // 設置預設時間為現在
        const now = toLocalDateTimeString();
        document.getElementById('feedingStartTime').value = now;
        
        toggleFeedingFields('breast');
    }
    
    openModal('feedingModal');
}

// 切換餵食欄位顯示
function toggleFeedingFields(type) {
    const breastfeedingFields = document.getElementById('breastfeedingFields');
    const quantityFields = document.getElementById('quantityFields');
    
    if (type === 'breast') {
        breastfeedingFields.style.display = 'block';
        quantityFields.style.display = 'none';
    } else {
        breastfeedingFields.style.display = 'none';
        quantityFields.style.display = 'block';
    }
}

// 處理餵食表單提交
async function handleFeedingFormSubmit(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        const form = e.target;
        const isEdit = form.dataset.editId;
        
        const feedingData = {
            childId: currentChildId,
            type: document.getElementById('feedingType').value,
            notes: document.getElementById('feedingNotes').value,
            createdAt: isEdit ? undefined : toUserTimezoneISOString(),
            updatedAt: toUserTimezoneISOString()
        };
        
        if (feedingData.type === 'breast') {
            feedingData.startTime = document.getElementById('feedingStartTime').value;
            feedingData.endTime = document.getElementById('feedingEndTime').value;
            feedingData.date = feedingData.startTime.split('T')[0];
        } else {
            feedingData.quantity = parseFloat(document.getElementById('feedingQuantity').value) || 0;
            feedingData.unit = document.getElementById('feedingUnit').value;
            feedingData.date = toLocalDateString();
        }
        
        if (isEdit) {
            feedingData.id = parseInt(isEdit);
            await updateRecord('feeding_records', feedingData);
        } else {
            await addRecord('feeding_records', feedingData);
        }
        
        closeModal(document.getElementById('feedingModal'));
        await loadFeedingRecords();
        await loadTodaySummary();
        
        showLoading(false);
        alert(isEdit ? '餵食記錄已更新' : '餵食記錄已新增');
    } catch (error) {
        console.error('儲存餵食記錄失敗:', error);
        showLoading(false);
        alert('儲存餵食記錄失敗');
    }
}

// 載入餵食記錄
async function loadFeedingRecords() {
    if (!currentChildId) {
        document.getElementById('feedingList').innerHTML = '<div class="card text-center"><p>請先選擇一個寶寶</p></div>';
        return;
    }
    
    try {
        const records = await getRecordsByIndex('feeding_records', 'childId', currentChildId);
        records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        displayFeedingRecords(records);
    } catch (error) {
        console.error('載入餵食記錄失敗:', error);
    }
}

// 顯示餵食記錄
function displayFeedingRecords(records) {
    const container = document.getElementById('feedingList');
    
    if (records.length === 0) {
        container.innerHTML = '<div class="card text-center"><p>尚無餵食記錄</p></div>';
        return;
    }
    
    container.innerHTML = records.map(record => `
        <div class="record-item fade-in">
            <div class="record-header">
                <div class="record-type">
                    <i class="fas fa-${record.type === 'breast' ? 'heart' : 'bottle'}"></i>
                    ${record.type === 'breast' ? '母乳' : record.type === 'formula' ? '配方奶' : '固體食物'}
                </div>
                <div class="record-time">${formatDateTime(record.createdAt)}</div>
            </div>
            <div class="record-details">
                ${record.type === 'breast' ? `
                    <div class="record-detail">
                        <span class="record-label">開始時間:</span>
                        <span class="record-value">${formatTime(record.startTime)}</span>
                    </div>
                    ${record.endTime ? `
                        <div class="record-detail">
                            <span class="record-label">結束時間:</span>
                            <span class="record-value">${formatTime(record.endTime)}</span>
                        </div>
                        <div class="record-detail">
                            <span class="record-label">持續時間:</span>
                            <span class="record-value">${calculateDuration(record.startTime, record.endTime)}</span>
                        </div>
                    ` : ''}
                ` : `
                    <div class="record-detail">
                        <span class="record-label">份量:</span>
                        <span class="record-value">${record.quantity} ${record.unit}</span>
                    </div>
                `}
            </div>
            ${record.notes ? `<div class="record-notes">${record.notes}</div>` : ''}
            <div class="record-actions">
                <button class="btn btn-sm btn-icon btn-secondary" onclick="openFeedingModal(${JSON.stringify(record).replace(/"/g, '&quot;')})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-icon btn-danger" onclick="deleteFeedingRecord(${record.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// 刪除餵食記錄
async function deleteFeedingRecord(recordId) {
    if (!confirm('確定要刪除這筆餵食記錄嗎？')) {
        return;
    }
    
    try {
        await deleteRecord('feeding_records', recordId);
        await loadFeedingRecords();
        await loadTodaySummary();
        alert('餵食記錄已刪除');
    } catch (error) {
        console.error('刪除餵食記錄失敗:', error);
        alert('刪除餵食記錄失敗');
    }
}

/**
 * =================================================
 * 睡眠記錄功能
 * =================================================
 */

// 開啟睡眠模態視窗
function openSleepModal(record = null) {
    if (!currentChildId) {
        alert('請先選擇一個寶寶');
        return;
    }
    
    const modal = document.getElementById('sleepModal');
    const form = document.getElementById('sleepForm');
    const title = document.getElementById('sleepModalTitle');
    
    if (record) {
        title.textContent = '編輯睡眠記錄';
        form.dataset.editId = record.id;
        
        document.getElementById('sleepStartTime').value = record.startTime;
        document.getElementById('sleepEndTime').value = record.endTime || '';
        document.getElementById('sleepNotes').value = record.notes || '';
    } else {
        title.textContent = '新增睡眠記錄';
        delete form.dataset.editId;
        
        // 設置預設開始時間為現在
        const now = toLocalDateTimeString();
        document.getElementById('sleepStartTime').value = now;
    }
    
    openModal('sleepModal');
}

// 處理睡眠表單提交
async function handleSleepFormSubmit(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        const form = e.target;
        const isEdit = form.dataset.editId;
        
        const sleepData = {
            childId: currentChildId,
            startTime: document.getElementById('sleepStartTime').value,
            endTime: document.getElementById('sleepEndTime').value || null,
            notes: document.getElementById('sleepNotes').value,
            date: document.getElementById('sleepStartTime').value.split('T')[0],
            createdAt: isEdit ? undefined : toUserTimezoneISOString(),
            updatedAt: toUserTimezoneISOString()
        };
        
        if (isEdit) {
            sleepData.id = parseInt(isEdit);
            await updateRecord('sleep_records', sleepData);
        } else {
            await addRecord('sleep_records', sleepData);
        }
        
        closeModal(document.getElementById('sleepModal'));
        await loadSleepRecords();
        await loadTodaySummary();
        
        showLoading(false);
        alert(isEdit ? '睡眠記錄已更新' : '睡眠記錄已新增');
    } catch (error) {
        console.error('儲存睡眠記錄失敗:', error);
        showLoading(false);
        alert('儲存睡眠記錄失敗');
    }
}

// 載入睡眠記錄
async function loadSleepRecords() {
    if (!currentChildId) {
        document.getElementById('sleepList').innerHTML = '<div class="card text-center"><p>請先選擇一個寶寶</p></div>';
        return;
    }
    
    try {
        const records = await getRecordsByIndex('sleep_records', 'childId', currentChildId);
        records.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        
        displaySleepRecords(records);
    } catch (error) {
        console.error('載入睡眠記錄失敗:', error);
    }
}

// 顯示睡眠記錄
function displaySleepRecords(records) {
    const container = document.getElementById('sleepList');
    
    if (records.length === 0) {
        container.innerHTML = '<div class="card text-center"><p>尚無睡眠記錄</p></div>';
        return;
    }
    
    container.innerHTML = records.map(record => `
        <div class="record-item fade-in">
            <div class="record-header">
                <div class="record-type">
                    <i class="fas fa-bed"></i>
                    睡眠
                </div>
                <div class="record-time">${formatDateTime(record.startTime)}</div>
            </div>
            <div class="record-details">
                <div class="record-detail">
                    <span class="record-label">開始時間:</span>
                    <span class="record-value">${formatTime(record.startTime)}</span>
                </div>
                ${record.endTime ? `
                    <div class="record-detail">
                        <span class="record-label">結束時間:</span>
                        <span class="record-value">${formatTime(record.endTime)}</span>
                    </div>
                    <div class="record-detail">
                        <span class="record-label">睡眠時間:</span>
                        <span class="record-value">${calculateDuration(record.startTime, record.endTime)}</span>
                    </div>
                ` : '<div class="record-detail"><span class="text-muted">正在睡眠中...</span></div>'}
            </div>
            ${record.notes ? `<div class="record-notes">${record.notes}</div>` : ''}
            <div class="record-actions">
                <button class="btn btn-sm btn-icon btn-secondary" onclick="openSleepModal(${JSON.stringify(record).replace(/"/g, '&quot;')})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-icon btn-danger" onclick="deleteSleepRecord(${record.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// 刪除睡眠記錄
async function deleteSleepRecord(recordId) {
    if (!confirm('確定要刪除這筆睡眠記錄嗎？')) {
        return;
    }
    
    try {
        await deleteRecord('sleep_records', recordId);
        await loadSleepRecords();
        await loadTodaySummary();
        alert('睡眠記錄已刪除');
    } catch (error) {
        console.error('刪除睡眠記錄失敗:', error);
        alert('刪除睡眠記錄失敗');
    }
}

/**
 * =================================================
 * 尿布記錄功能
 * =================================================
 */

// 開啟尿布模態視窗
function openDiaperModal(record = null) {
    if (!currentChildId) {
        alert('請先選擇一個寶寶');
        return;
    }
    
    const modal = document.getElementById('diaperModal');
    const form = document.getElementById('diaperForm');
    const title = document.getElementById('diaperModalTitle');
    
    if (record) {
        title.textContent = '編輯尿布記錄';
        form.dataset.editId = record.id;
        
        document.getElementById('diaperType').value = record.type;
        document.getElementById('diaperTime').value = record.time;
        document.getElementById('diaperNotes').value = record.notes || '';
    } else {
        title.textContent = '新增尿布記錄';
        delete form.dataset.editId;
        
        // 設置預設時間為現在
        const now = toLocalDateTimeString();
        document.getElementById('diaperTime').value = now;
    }
    
    openModal('diaperModal');
}

// 處理尿布表單提交
async function handleDiaperFormSubmit(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        const form = e.target;
        const isEdit = form.dataset.editId;
        
        const diaperData = {
            childId: currentChildId,
            type: document.getElementById('diaperType').value,
            time: document.getElementById('diaperTime').value,
            notes: document.getElementById('diaperNotes').value,
            date: document.getElementById('diaperTime').value.split('T')[0],
            createdAt: isEdit ? undefined : toUserTimezoneISOString(),
            updatedAt: toUserTimezoneISOString()
        };
        
        if (isEdit) {
            diaperData.id = parseInt(isEdit);
            await updateRecord('diaper_records', diaperData);
        } else {
            await addRecord('diaper_records', diaperData);
        }
        
        closeModal(document.getElementById('diaperModal'));
        await loadDiaperRecords();
        await loadTodaySummary();
        
        showLoading(false);
        alert(isEdit ? '尿布記錄已更新' : '尿布記錄已新增');
    } catch (error) {
        console.error('儲存尿布記錄失敗:', error);
        showLoading(false);
        alert('儲存尿布記錄失敗');
    }
}

// 載入尿布記錄
async function loadDiaperRecords() {
    if (!currentChildId) {
        document.getElementById('diaperList').innerHTML = '<div class="card text-center"><p>請先選擇一個寶寶</p></div>';
        return;
    }
    
    try {
        const records = await getRecordsByIndex('diaper_records', 'childId', currentChildId);
        records.sort((a, b) => new Date(b.time) - new Date(a.time));
        
        displayDiaperRecords(records);
    } catch (error) {
        console.error('載入尿布記錄失敗:', error);
    }
}

// 顯示尿布記錄
function displayDiaperRecords(records) {
    const container = document.getElementById('diaperList');
    
    if (records.length === 0) {
        container.innerHTML = '<div class="card text-center"><p>尚無尿布記錄</p></div>';
        return;
    }
    
    const typeLabels = {
        wet: '濕尿布',
        poop: '便便',
        mixed: '濕尿布+便便'
    };
    
    const typeIcons = {
        wet: 'tint',
        poop: 'poop',
        mixed: 'baby'
    };
    
    container.innerHTML = records.map(record => `
        <div class="record-item fade-in">
            <div class="record-header">
                <div class="record-type">
                    <i class="fas fa-${typeIcons[record.type]}"></i>
                    ${typeLabels[record.type]}
                </div>
                <div class="record-time">${formatDateTime(record.time)}</div>
            </div>
            ${record.notes ? `<div class="record-notes">${record.notes}</div>` : ''}
            <div class="record-actions">
                <button class="btn btn-sm btn-icon btn-secondary" onclick="openDiaperModal(${JSON.stringify(record).replace(/"/g, '&quot;')})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-icon btn-danger" onclick="deleteDiaperRecord(${record.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// 刪除尿布記錄
async function deleteDiaperRecord(recordId) {
    if (!confirm('確定要刪除這筆尿布記錄嗎？')) {
        return;
    }
    
    try {
        await deleteRecord('diaper_records', recordId);
        await loadDiaperRecords();
        await loadTodaySummary();
        alert('尿布記錄已刪除');
    } catch (error) {
        console.error('刪除尿布記錄失敗:', error);
        alert('刪除尿布記錄失敗');
    }
}

/**
 * =================================================
 * 健康記錄功能
 * =================================================
 */

// 開啟健康模態視窗
function openHealthModal(record = null) {
    if (!currentChildId) {
        alert('請先選擇一個寶寶');
        return;
    }
    
    const modal = document.getElementById('healthModal');
    const form = document.getElementById('healthForm');
    const title = document.getElementById('healthModalTitle');
    
    if (record) {
        title.textContent = '編輯健康記錄';
        form.dataset.editId = record.id;
        
        document.getElementById('healthType').value = record.type;
        document.getElementById('healthDate').value = record.date;
        document.getElementById('temperature').value = record.temperature || '';
        document.getElementById('temperatureMethod').value = record.temperatureMethod || 'ear';
        document.getElementById('healthTitle').value = record.title || '';
        document.getElementById('healthNotes').value = record.notes || '';
        
        toggleHealthFields(record.type);
    } else {
        title.textContent = '新增健康記錄';
        delete form.dataset.editId;
        
        // 設置預設時間為現在
        const now = toLocalDateTimeString();
        document.getElementById('healthDate').value = now;
        
        toggleHealthFields('vaccination');
    }
    
    openModal('healthModal');
}

// 切換健康記錄欄位顯示
function toggleHealthFields(type) {
    const temperatureFields = document.getElementById('temperatureFields');
    
    if (type === 'temperature') {
        temperatureFields.style.display = 'block';
    } else {
        temperatureFields.style.display = 'none';
    }
}

// 處理健康表單提交
async function handleHealthFormSubmit(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        const form = e.target;
        const isEdit = form.dataset.editId;
        
        const healthData = {
            childId: currentChildId,
            type: document.getElementById('healthType').value,
            date: document.getElementById('healthDate').value,
            title: document.getElementById('healthTitle').value,
            notes: document.getElementById('healthNotes').value,
            createdAt: isEdit ? undefined : toUserTimezoneISOString(),
            updatedAt: toUserTimezoneISOString()
        };
        
        if (healthData.type === 'temperature') {
            healthData.temperature = parseFloat(document.getElementById('temperature').value) || null;
            healthData.temperatureMethod = document.getElementById('temperatureMethod').value;
        }
        
        if (isEdit) {
            healthData.id = parseInt(isEdit);
            await updateRecord('health_records', healthData);
        } else {
            await addRecord('health_records', healthData);
        }
        
        closeModal(document.getElementById('healthModal'));
        await loadHealthRecords();
        await loadTodaySummary();
        
        showLoading(false);
        alert(isEdit ? '健康記錄已更新' : '健康記錄已新增');
    } catch (error) {
        console.error('儲存健康記錄失敗:', error);
        showLoading(false);
        alert('儲存健康記錄失敗');
    }
}

// 載入健康記錄
async function loadHealthRecords() {
    if (!currentChildId) {
        document.getElementById('healthList').innerHTML = '<div class="card text-center"><p>請先選擇一個寶寶</p></div>';
        return;
    }
    
    try {
        const records = await getRecordsByIndex('health_records', 'childId', currentChildId);
        records.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        displayHealthRecords(records);
    } catch (error) {
        console.error('載入健康記錄失敗:', error);
    }
}

// 顯示健康記錄
function displayHealthRecords(records) {
    const container = document.getElementById('healthList');
    
    if (records.length === 0) {
        container.innerHTML = '<div class="card text-center"><p>尚無健康記錄</p></div>';
        return;
    }
    
    const typeLabels = {
        vaccination: '疫苗接種',
        medication: '用藥記錄',
        illness: '生病記錄',
        checkup: '健檢記錄',
        temperature: '體溫'
    };
    
    const typeIcons = {
        vaccination: 'syringe',
        medication: 'pills',
        illness: 'virus',
        checkup: 'user-md',
        temperature: 'thermometer'
    };
    
    container.innerHTML = records.map(record => `
        <div class="record-item fade-in">
            <div class="record-header">
                <div class="record-type">
                    <i class="fas fa-${typeIcons[record.type]}"></i>
                    ${typeLabels[record.type]}
                </div>
                <div class="record-time">${formatDateTime(record.date)}</div>
            </div>
            <div class="record-details">
                ${record.title ? `
                    <div class="record-detail">
                        <span class="record-label">標題:</span>
                        <span class="record-value">${record.title}</span>
                    </div>
                ` : ''}
                ${record.temperature ? `
                    <div class="record-detail">
                        <span class="record-label">體溫:</span>
                        <span class="record-value">${record.temperature}°C (${record.temperatureMethod === 'ear' ? '耳溫' : record.temperatureMethod === 'forehead' ? '額溫' : record.temperatureMethod === 'armpit' ? '腋溫' : record.temperatureMethod === 'mouth' ? '口溫' : '肛溫'})</span>
                    </div>
                ` : ''}
            </div>
            ${record.notes ? `<div class="record-notes">${record.notes}</div>` : ''}
            <div class="record-actions">
                <button class="btn btn-sm btn-icon btn-secondary" onclick="openHealthModal(${JSON.stringify(record).replace(/"/g, '&quot;')})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-icon btn-danger" onclick="deleteHealthRecord(${record.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// 刪除健康記錄
async function deleteHealthRecord(recordId) {
    if (!confirm('確定要刪除這筆健康記錄嗎？')) {
        return;
    }
    
    try {
        await deleteRecord('health_records', recordId);
        await loadHealthRecords();
        await loadTodaySummary();
        alert('健康記錄已刪除');
    } catch (error) {
        console.error('刪除健康記錄失敗:', error);
        alert('刪除健康記錄失敗');
    }
}

/**
 * =================================================
 * 里程碑功能
 * =================================================
 */

// 預設里程碑資料
const defaultMilestones = {
    motor: [
        '抬頭', '翻身', '坐立', '爬行', '站立', '走路', '跑步', '跳躍'
    ],
    language: [
        '發出聲音', '笑', '咿呀學語', '說第一個字', '說媽媽/爸爸', '說簡單詞彙', '說句子', '對話'
    ],
    social: [
        '微笑', '眼神交流', '認人', '害羞', '模仿', '分享', '合作遊戲', '表達情感'
    ],
    cognitive: [
        '注視物體', '伸手抓物', '物體恆存概念', '因果關係理解', '解決簡單問題', '記憶遊戲', '分類能力', '數數'
    ],
    selfcare: [
        '自己喝奶', '用手抓食', '用湯匙', '用杯子喝水', '表達如廁需求', '自己穿衣', '刷牙', '洗手'
    ]
};

// 開啟里程碑模態視窗
function openMilestoneModal(record = null) {
    if (!currentChildId) {
        alert('請先選擇一個寶寶');
        return;
    }
    
    const modal = document.getElementById('milestoneModal');
    const form = document.getElementById('milestoneForm');
    const title = document.getElementById('milestoneModalTitle');
    
    if (record) {
        title.textContent = '編輯里程碑';
        form.dataset.editId = record.id;
        
        document.getElementById('milestoneCategory').value = record.category;
        document.getElementById('milestoneTitle').value = record.title;
        document.getElementById('milestoneDate').value = record.achievedDate || '';
        document.getElementById('milestoneNotes').value = record.notes || '';
    } else {
        title.textContent = '新增里程碑';
        delete form.dataset.editId;
    }
    
    openModal('milestoneModal');
}

// 處理里程碑表單提交
async function handleMilestoneFormSubmit(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        const form = e.target;
        const isEdit = form.dataset.editId;
        
        const milestoneData = {
            childId: currentChildId,
            category: document.getElementById('milestoneCategory').value,
            title: document.getElementById('milestoneTitle').value,
            achievedDate: document.getElementById('milestoneDate').value || null,
            notes: document.getElementById('milestoneNotes').value,
            achieved: !!document.getElementById('milestoneDate').value,
            createdAt: isEdit ? undefined : toUserTimezoneISOString(),
            updatedAt: toUserTimezoneISOString()
        };
        
        if (isEdit) {
            milestoneData.id = parseInt(isEdit);
            await updateRecord('milestones', milestoneData);
        } else {
            await addRecord('milestones', milestoneData);
        }
        
        closeModal(document.getElementById('milestoneModal'));
        await loadMilestones();
        
        showLoading(false);
        alert(isEdit ? '里程碑已更新' : '里程碑已新增');
    } catch (error) {
        console.error('儲存里程碑失敗:', error);
        showLoading(false);
        alert('儲存里程碑失敗');
    }
}

// 載入里程碑
async function loadMilestones() {
    if (!currentChildId) {
        document.getElementById('milestonesList').innerHTML = '<div class="card text-center"><p>請先選擇一個寶寶</p></div>';
        return;
    }
    
    try {
        const records = await getRecordsByIndex('milestones', 'childId', currentChildId);
        const activeCategory = document.querySelector('.category-tab.active').getAttribute('data-category');
        
        displayMilestones(records, activeCategory);
    } catch (error) {
        console.error('載入里程碑失敗:', error);
    }
}

// 顯示里程碑分類
function showMilestoneCategory(category) {
    // 更新分類標籤狀態
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    
    // 重新載入里程碑
    loadMilestones();
}

// 顯示里程碑
function displayMilestones(records, category) {
    const container = document.getElementById('milestonesList');
    
    // 過濾指定分類的記錄
    const filteredRecords = records.filter(record => record.category === category);
    
    // 獲取預設里程碑
    const defaultItems = defaultMilestones[category] || [];
    
    // 合併預設和自訂里程碑
    const allMilestones = [];
    
    // 添加預設里程碑
    defaultItems.forEach(item => {
        const existing = filteredRecords.find(record => record.title === item);
        allMilestones.push({
            title: item,
            category: category,
            isDefault: true,
            achieved: !!existing,
            achievedDate: existing ? existing.achievedDate : null,
            notes: existing ? existing.notes : '',
            id: existing ? existing.id : null
        });
    });
    
    // 添加自訂里程碑
    filteredRecords.forEach(record => {
        if (!defaultItems.includes(record.title)) {
            allMilestones.push({
                ...record,
                isDefault: false
            });
        }
    });
    
    if (allMilestones.length === 0) {
        container.innerHTML = '<div class="card text-center"><p>這個分類暫無里程碑</p></div>';
        return;
    }
    
    const categoryLabels = {
        motor: '動作發展',
        language: '語言發展',
        social: '社交發展',
        cognitive: '認知發展',
        selfcare: '自理能力',
        custom: '自訂'
    };
    
    container.innerHTML = allMilestones.map(milestone => `
        <div class="record-item fade-in ${milestone.achieved ? 'achieved' : ''}">
            <div class="record-header">
                <div class="record-type">
                    <i class="fas fa-${milestone.achieved ? 'check-circle text-success' : 'circle'}"></i>
                    ${milestone.title}
                </div>
                ${milestone.achievedDate ? `<div class="record-time">${formatDate(milestone.achievedDate)}</div>` : ''}
            </div>
            ${milestone.notes ? `<div class="record-notes">${milestone.notes}</div>` : ''}
            <div class="record-actions">
                ${milestone.achieved ? `
                    <button class="btn btn-sm btn-icon btn-secondary" onclick="openMilestoneModal(${JSON.stringify(milestone).replace(/"/g, '&quot;')})">
                        <i class="fas fa-edit"></i>
                    </button>
                ` : `
                    <button class="btn btn-sm btn-primary" onclick="markMilestoneAchieved('${milestone.title}', '${milestone.category}')">
                        <i class="fas fa-check"></i> 達成
                    </button>
                `}
                ${!milestone.isDefault && milestone.id ? `
                    <button class="btn btn-sm btn-icon btn-danger" onclick="deleteMilestone(${milestone.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// 標記里程碑為已達成
async function markMilestoneAchieved(title, category) {
    try {
        const milestoneData = {
            childId: currentChildId,
            category: category,
            title: title,
            achievedDate: toLocalDateString(),
            achieved: true,
            notes: '',
            createdAt: toUserTimezoneISOString()
        };
        
        await addRecord('milestones', milestoneData);
        await loadMilestones();
        alert('恭喜！里程碑已標記為達成！');
    } catch (error) {
        console.error('標記里程碑失敗:', error);
        alert('標記里程碑失敗');
    }
}

// 刪除里程碑
async function deleteMilestone(milestoneId) {
    if (!confirm('確定要刪除這個里程碑嗎？')) {
        return;
    }
    
    try {
        await deleteRecord('milestones', milestoneId);
        await loadMilestones();
        alert('里程碑已刪除');
    } catch (error) {
        console.error('刪除里程碑失敗:', error);
        alert('刪除里程碑失敗');
    }
}

/**
 * =================================================
 * 活動記錄功能
 * =================================================
 */

// 開啟活動模態視窗
function openActivityModal(record = null) {
    if (!currentChildId) {
        alert('請先選擇一個寶寶');
        return;
    }
    
    const modal = document.getElementById('activityModal');
    const form = document.getElementById('activityForm');
    const title = document.getElementById('activityModalTitle');
    
    if (record) {
        title.textContent = '編輯活動記錄';
        form.dataset.editId = record.id;
        
        document.getElementById('activityType').value = record.type;
        document.getElementById('customActivityName').value = record.customName || '';
        document.getElementById('activityDate').value = record.date;
        document.getElementById('activityDuration').value = record.duration || '';
        document.getElementById('activityMood').value = record.mood || '';
        document.getElementById('activityNotes').value = record.notes || '';
        
        if (record.photo) {
            document.getElementById('activityPhotoPreview').innerHTML = 
                `<img src="${record.photo}" alt="預覽">`;
        }
        
        toggleActivityFields(record.type);
    } else {
        title.textContent = '新增活動記錄';
        delete form.dataset.editId;
        
        // 設置預設時間為現在
        const now = toLocalDateTimeString();
        document.getElementById('activityDate').value = now;
        
        toggleActivityFields('bath');
    }
    
    openModal('activityModal');
}

// 切換活動欄位顯示
function toggleActivityFields(type) {
    const customActivityField = document.getElementById('customActivityField');
    
    if (type === 'custom') {
        customActivityField.style.display = 'block';
    } else {
        customActivityField.style.display = 'none';
    }
}

// 處理活動表單提交
async function handleActivityFormSubmit(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        const form = e.target;
        const isEdit = form.dataset.editId;
        
        const activityData = {
            childId: currentChildId,
            type: document.getElementById('activityType').value,
            customName: document.getElementById('customActivityName').value || null,
            date: document.getElementById('activityDate').value,
            duration: parseInt(document.getElementById('activityDuration').value) || null,
            mood: document.getElementById('activityMood').value || null,
            notes: document.getElementById('activityNotes').value,
            createdAt: isEdit ? undefined : toUserTimezoneISOString(),
            updatedAt: toUserTimezoneISOString()
        };
        
        // 處理照片
        const photoFile = document.getElementById('activityPhoto').files[0];
        if (photoFile) {
            activityData.photo = await fileToBase64(photoFile);
        } else if (isEdit) {
            // 編輯時如果沒有新照片，保留原照片
            const originalActivity = await getRecord('activities', parseInt(isEdit));
            activityData.photo = originalActivity.photo;
        }
        
        if (isEdit) {
            activityData.id = parseInt(isEdit);
            await updateRecord('activities', activityData);
        } else {
            await addRecord('activities', activityData);
        }
        
        closeModal(document.getElementById('activityModal'));
        await loadActivities();
        
        showLoading(false);
        alert(isEdit ? '活動記錄已更新' : '活動記錄已新增');
    } catch (error) {
        console.error('儲存活動記錄失敗:', error);
        showLoading(false);
        alert('儲存活動記錄失敗');
    }
}

// 載入活動記錄
async function loadActivities() {
    if (!currentChildId) {
        document.getElementById('activitiesList').innerHTML = '<div class="card text-center"><p>請先選擇一個寶寶</p></div>';
        return;
    }
    
    try {
        const records = await getRecordsByIndex('activities', 'childId', currentChildId);
        records.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        displayActivities(records);
    } catch (error) {
        console.error('載入活動記錄失敗:', error);
    }
}

// 顯示活動記錄
function displayActivities(records) {
    const container = document.getElementById('activitiesList');
    
    if (records.length === 0) {
        container.innerHTML = '<div class="card text-center"><p>尚無活動記錄</p></div>';
        return;
    }
    
    const typeLabels = {
        bath: '洗澡',
        massage: '按摩',
        changing: '換衣服/護理',
        tummy_time: '趴睡時間',
        sensory_play: '感官遊戲',
        reading: '親子閱讀',
        music: '音樂互動',
        walk: '散步/推車',
        sunbath: '曬太陽',
        social: '社交互動',
        custom: '自訂活動'
    };
    
    const typeIcons = {
        bath: 'bath',
        massage: 'hand-holding-heart',
        changing: 'tshirt',
        tummy_time: 'bed',
        sensory_play: 'puzzle-piece',
        reading: 'book',
        music: 'music',
        walk: 'walking',
        sunbath: 'sun',
        social: 'users',
        custom: 'star'
    };
    
    const moodLabels = {
        happy: '開心',
        calm: '平靜',
        cranky: '煩躁',
        sleepy: '想睡',
        excited: '興奮'
    };
    
    container.innerHTML = records.map(record => `
        <div class="record-item fade-in">
            <div class="record-header">
                <div class="record-type">
                    <i class="fas fa-${typeIcons[record.type]}"></i>
                    ${record.type === 'custom' ? record.customName : typeLabels[record.type]}
                </div>
                <div class="record-time">${formatDateTime(record.date)}</div>
            </div>
            <div class="record-details">
                ${record.duration ? `
                    <div class="record-detail">
                        <span class="record-label">持續時間:</span>
                        <span class="record-value">${record.duration} 分鐘</span>
                    </div>
                ` : ''}
                ${record.mood ? `
                    <div class="record-detail">
                        <span class="record-label">寶寶情緒:</span>
                        <span class="record-value">${moodLabels[record.mood]}</span>
                    </div>
                ` : ''}
            </div>
            ${record.photo ? `
                <div class="record-photo">
                    <img src="${record.photo}" alt="活動照片" style="max-width: 200px; border-radius: 8px;">
                </div>
            ` : ''}
            ${record.notes ? `<div class="record-notes">${record.notes}</div>` : ''}
            <div class="record-actions">
                <button class="btn btn-sm btn-icon btn-secondary" onclick="openActivityModal(${JSON.stringify(record).replace(/"/g, '&quot;')})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-icon btn-danger" onclick="deleteActivity(${record.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// 刪除活動記錄
async function deleteActivity(recordId) {
    if (!confirm('確定要刪除這筆活動記錄嗎？')) {
        return;
    }
    
    try {
        await deleteRecord('activities', recordId);
        await loadActivities();
        alert('活動記錄已刪除');
    } catch (error) {
        console.error('刪除活動記錄失敗:', error);
        alert('刪除活動記錄失敗');
    }
}

/**
 * =================================================
 * 統計功能
 * =================================================
 */

// 重新整理統計數據
async function refreshStatistics() {
    if (!currentChildId) {
        return;
    }
    
    try {
        const dateRange = parseInt(document.getElementById('statsDateRange').value);
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (dateRange * 24 * 60 * 60 * 1000));
        
        // 清除現有圖表
        Object.values(charts).forEach(chart => chart.destroy());
        charts = {};
        
        // 建立圖表
        await createFeedingChart(startDate, endDate);
        await createSleepChart(startDate, endDate);
        await createDiaperChart(startDate, endDate);
        await createGrowthChart(startDate, endDate);
    } catch (error) {
        console.error('重新整理統計數據失敗:', error);
    }
}

// 建立餵食統計圖表
async function createFeedingChart(startDate, endDate) {
    try {
        const records = await getRecordsByIndex('feeding_records', 'childId', currentChildId);
        const filteredRecords = records.filter(record => {
            const recordDate = new Date(record.createdAt);
            return recordDate >= startDate && recordDate <= endDate;
        });
        
        // 按日期分組統計
        const dailyStats = {};
        filteredRecords.forEach(record => {
            const date = record.date || record.createdAt.split('T')[0];
            if (!dailyStats[date]) {
                dailyStats[date] = { breast: 0, formula: 0, solids: 0 };
            }
            dailyStats[date][record.type]++;
        });
        
        const dates = Object.keys(dailyStats).sort();
        const breastData = dates.map(date => dailyStats[date].breast);
        const formulaData = dates.map(date => dailyStats[date].formula);
        const solidsData = dates.map(date => dailyStats[date].solids);
        
        const ctx = document.getElementById('feedingChart').getContext('2d');
        charts.feeding = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates.map(date => formatDate(date)),
                datasets: [
                    {
                        label: '母乳',
                        data: breastData,
                        borderColor: '#ff6b9d',
                        backgroundColor: 'rgba(255, 107, 157, 0.1)',
                        tension: 0.3
                    },
                    {
                        label: '配方奶',
                        data: formulaData,
                        borderColor: '#6ba3ff',
                        backgroundColor: 'rgba(107, 163, 255, 0.1)',
                        tension: 0.3
                    },
                    {
                        label: '固體食物',
                        data: solidsData,
                        borderColor: '#ffd93d',
                        backgroundColor: 'rgba(255, 217, 61, 0.1)',
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
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
        });
    } catch (error) {
        console.error('建立餵食圖表失敗:', error);
    }
}

// 建立睡眠統計圖表
async function createSleepChart(startDate, endDate) {
    try {
        const records = await getRecordsByIndex('sleep_records', 'childId', currentChildId);
        const filteredRecords = records.filter(record => {
            const recordDate = new Date(record.startTime);
            return recordDate >= startDate && recordDate <= endDate && record.endTime;
        });
        
        // 按日期分組統計睡眠時間
        const dailyStats = {};
        filteredRecords.forEach(record => {
            const date = record.date;
            const duration = calculateDurationInHours(record.startTime, record.endTime);
            
            if (!dailyStats[date]) {
                dailyStats[date] = 0;
            }
            dailyStats[date] += duration;
        });
        
        const dates = Object.keys(dailyStats).sort();
        const sleepData = dates.map(date => dailyStats[date].toFixed(1));
        
        const ctx = document.getElementById('sleepChart').getContext('2d');
        charts.sleep = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dates.map(date => formatDate(date)),
                datasets: [{
                    label: '睡眠時間 (小時)',
                    data: sleepData,
                    backgroundColor: 'rgba(107, 163, 255, 0.6)',
                    borderColor: '#6ba3ff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '小時'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('建立睡眠圖表失敗:', error);
    }
}

// 建立尿布統計圖表
async function createDiaperChart(startDate, endDate) {
    try {
        const records = await getRecordsByIndex('diaper_records', 'childId', currentChildId);
        const filteredRecords = records.filter(record => {
            const recordDate = new Date(record.time);
            return recordDate >= startDate && recordDate <= endDate;
        });
        
        // 統計各類型數量
        const typeStats = { wet: 0, poop: 0, mixed: 0 };
        filteredRecords.forEach(record => {
            typeStats[record.type]++;
        });
        
        const ctx = document.getElementById('diaperChart').getContext('2d');
        charts.diaper = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['濕尿布', '便便', '濕尿布+便便'],
                datasets: [{
                    data: [typeStats.wet, typeStats.poop, typeStats.mixed],
                    backgroundColor: [
                        '#60a5fa',
                        '#fbbf24',
                        '#34d399'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
    } catch (error) {
        console.error('建立尿布圖表失敗:', error);
    }
}

// 建立成長趨勢圖表
async function createGrowthChart(startDate, endDate) {
    try {
        const records = await getRecordsByIndex('health_records', 'childId', currentChildId);
        const temperatureRecords = records.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate >= startDate && recordDate <= endDate && 
                   record.type === 'temperature' && record.temperature;
        });
        
        temperatureRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const dates = temperatureRecords.map(record => formatDate(record.date));
        const temperatures = temperatureRecords.map(record => record.temperature);
        
        const ctx = document.getElementById('growthChart').getContext('2d');
        charts.growth = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: '體溫 (°C)',
                    data: temperatures,
                    borderColor: '#f87171',
                    backgroundColor: 'rgba(248, 113, 113, 0.1)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 35,
                        max: 40,
                        title: {
                            display: true,
                            text: '°C'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('建立成長圖表失敗:', error);
    }
}

/**
 * =================================================
 * 今日摘要功能
 * =================================================
 */

// 載入今日摘要
async function loadTodaySummary() {
    if (!currentChildId) {
        document.getElementById('todaySummary').innerHTML = '<div class="card text-center"><p>請先選擇一個寶寶</p></div>';
        return;
    }
    
    try {
        const today = toLocalDateString();
        
        // 獲取今日各類記錄
        const [feedingRecords, sleepRecords, diaperRecords, healthRecords] = await Promise.all([
            getRecordsByIndex('feeding_records', 'childId', currentChildId),
            getRecordsByIndex('sleep_records', 'childId', currentChildId),
            getRecordsByIndex('diaper_records', 'childId', currentChildId),
            getRecordsByIndex('health_records', 'childId', currentChildId)
        ]);
        
        // 篩選今日記錄
        const todayFeeding = feedingRecords.filter(record => 
            (record.date === today) || (record.createdAt && record.createdAt.startsWith(today))
        );
        
        const todaySleep = sleepRecords.filter(record => 
            record.date === today || record.startTime.startsWith(today)
        );
        
        const todayDiaper = diaperRecords.filter(record => 
            record.date === today
        );
        
        const todayHealth = healthRecords.filter(record => 
            record.date.startsWith(today)
        );
        
        // 計算統計資料
        const summary = {
            feeding: todayFeeding.length,
            sleep: calculateTotalSleepHours(todaySleep),
            diaper: todayDiaper.length,
            health: todayHealth.length
        };
        
        displayTodaySummary(summary);
    } catch (error) {
        console.error('載入今日摘要失敗:', error);
    }
}

// 顯示今日摘要
function displayTodaySummary(summary) {
    const container = document.getElementById('todaySummary');
    
    container.innerHTML = `
        <div class="summary-item">
            <span class="summary-value">${summary.feeding}</span>
            <span class="summary-label">餵食次數</span>
        </div>
        <div class="summary-item">
            <span class="summary-value">${summary.sleep}</span>
            <span class="summary-label">睡眠時間 (小時)</span>
        </div>
        <div class="summary-item">
            <span class="summary-value">${summary.diaper}</span>
            <span class="summary-label">換尿布次數</span>
        </div>
        <div class="summary-item">
            <span class="summary-value">${summary.health}</span>
            <span class="summary-label">健康記錄</span>
        </div>
    `;
}

// 計算總睡眠時間
function calculateTotalSleepHours(sleepRecords) {
    let totalHours = 0;
    
    sleepRecords.forEach(record => {
        if (record.endTime) {
            totalHours += calculateDurationInHours(record.startTime, record.endTime);
        }
    });
    
    return totalHours.toFixed(1);
}

/**
 * =================================================
 * 快速記錄功能
 * =================================================
 */

// 開啟快速記錄模態視窗
function openQuickRecordModal(type) {
    switch (type) {
        case 'feeding':
            openFeedingModal();
            break;
        case 'sleep':
            openSleepModal();
            break;
        case 'diaper':
            openDiaperModal();
            break;
        case 'health':
            openHealthModal();
            // 預設選擇體溫記錄
            document.getElementById('healthType').value = 'temperature';
            toggleHealthFields('temperature');
            break;
    }
}

/**
 * =================================================
 * 導航功能
 * =================================================
 */

// 顯示頁面
function showPage(pageId) {
    // 隱藏所有頁面
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // 顯示指定頁面
    document.getElementById(pageId).classList.add('active');
    
    // 更新導航標籤狀態
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageId}"]`).classList.add('active');
    
    // 載入頁面資料
    loadPageData(pageId);
}

// 載入頁面資料
async function loadPageData(pageId) {
    switch (pageId) {
        case 'dashboard':
            await loadTodaySummary();
            break;
        case 'feeding':
            await loadFeedingRecords();
            break;
        case 'sleep':
            await loadSleepRecords();
            break;
        case 'diaper':
            await loadDiaperRecords();
            break;
        case 'health':
            await loadHealthRecords();
            break;
        case 'milestones':
            await loadMilestones();
            break;
        case 'activities':
            await loadActivities();
            break;
        case 'statistics':
            await refreshStatistics();
            break;
    }
}

// 重新整理當前頁面
function refreshCurrentPage() {
    const activePage = document.querySelector('.page.active');
    if (activePage) {
        loadPageData(activePage.id);
    }
}

/**
 * =================================================
 * 主題切換功能
 * =================================================
 */

// 切換主題
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    body.setAttribute('data-theme', newTheme);
    
    // 更新圖示
    const icon = document.querySelector('#themeToggle i');
    icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    
    // 儲存主題設定
    localStorage.setItem('theme', newTheme);
}

// 載入時區設定
function loadTimezone() {
    try {
        const savedTimezone = localStorage.getItem('timezone') || 'Asia/Taipei';
        userTimezone = savedTimezone;
        
        const timezoneSelector = document.getElementById('timezoneSelector');
        if (timezoneSelector) {
            timezoneSelector.value = savedTimezone;
        }
    } catch (error) {
        console.warn('載入時區設定失敗:', error);
        userTimezone = 'Asia/Taipei';
    }
}

// 儲存時區設定
function saveTimezone() {
    try {
        localStorage.setItem('timezone', userTimezone);
    } catch (error) {
        console.warn('儲存時區設定失敗:', error);
    }
}

/**
 * =================================================
 * 資料匯入匯出功能
 * =================================================
 */

// 匯出資料
async function exportData() {
    try {
        showLoading(true);
        
        // 獲取所有資料
        const data = {
            children: await getAllRecords('children'),
            feeding_records: await getAllRecords('feeding_records'),
            sleep_records: await getAllRecords('sleep_records'),
            diaper_records: await getAllRecords('diaper_records'),
            health_records: await getAllRecords('health_records'),
            milestones: await getAllRecords('milestones'),
            activities: await getAllRecords('activities'),
            exportDate: toUserTimezoneISOString(),
            version: '1.0'
        };
        
        // 建立下載連結
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `baby-care-backup-${toLocalDateString()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showLoading(false);
        alert('資料匯出成功');
    } catch (error) {
        console.error('匯出資料失敗:', error);
        showLoading(false);
        alert('匯出資料失敗');
    }
}

// 匯入資料
async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!confirm('匯入資料將覆蓋現有所有資料，確定要繼續嗎？')) {
        event.target.value = '';
        return;
    }
    
    try {
        showLoading(true);
        
        const text = await file.text();
        const data = JSON.parse(text);
        
        // 驗證資料格式
        if (!data.children || !Array.isArray(data.children)) {
            throw new Error('無效的資料格式');
        }
        
        // 清空現有資料
        const stores = ['children', 'feeding_records', 'sleep_records', 'diaper_records', 'health_records', 'milestones', 'activities'];
        for (const storeName of stores) {
            const records = await getAllRecords(storeName);
            for (const record of records) {
                await deleteRecord(storeName, record.id);
            }
        }
        
        // 匯入新資料
        for (const storeName of stores) {
            if (data[storeName] && Array.isArray(data[storeName])) {
                for (const record of data[storeName]) {
                    // 移除 id 讓資料庫自動分配新的 id
                    delete record.id;
                    await addRecord(storeName, record);
                }
            }
        }
        
        // 重新載入應用
        currentChildId = null;
        await loadChildren();
        showPage('dashboard');
        
        showLoading(false);
        alert('資料匯入成功');
        event.target.value = '';
    } catch (error) {
        console.error('匯入資料失敗:', error);
        showLoading(false);
        alert('匯入資料失敗：' + error.message);
        event.target.value = '';
    }
}

/**
 * =================================================
 * 照片處理功能
 * =================================================
 */

// 照片預覽
function previewPhoto(input, previewId) {
    const preview = document.getElementById(previewId);
    const file = input.files[0];
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="預覽">`;
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = '';
    }
}

// 檔案轉 Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

/**
 * =================================================
 * 載入中覆蓋層
 * =================================================
 */

// 顯示/隱藏載入中覆蓋層
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('show');
    } else {
        overlay.classList.remove('show');
    }
}

/**
 * =================================================
 * 表單驗證
 * =================================================
 */

// 清除表單驗證
function clearFormValidation(form) {
    form.querySelectorAll('.form-error').forEach(error => {
        error.remove();
    });
    form.querySelectorAll('.error').forEach(field => {
        field.classList.remove('error');
    });
}

/**
 * =================================================
 * 工具函數
 * =================================================
 */

// 獲取用戶時區時間
function getUserTimezoneTime(date = new Date()) {
    try {
        // 嘗試使用 Intl.DateTimeFormat 來轉換時區
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: userTimezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        const parts = formatter.formatToParts(date);
        const formattedDate = parts.reduce((acc, part) => {
            acc[part.type] = part.value;
            return acc;
        }, {});
        
        return new Date(`${formattedDate.year}-${formattedDate.month}-${formattedDate.day}T${formattedDate.hour}:${formattedDate.minute}:${formattedDate.second}`);
    } catch (error) {
        console.warn('時區轉換失敗，使用本地時間:', error);
        return date;
    }
}

// 格式化為用戶時區ISO字串
function toUserTimezoneISOString(date = new Date()) {
    try {
        return date.toISOString();
    } catch (error) {
        console.warn('時間格式化失敗:', error);
        return new Date().toISOString();
    }
}

// 格式化為本地datetime-local格式
function toLocalDateTimeString(date = new Date()) {
    try {
        // 使用本地時間格式
        const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
        return localDate.toISOString().slice(0, 16);
    } catch (error) {
        console.warn('日期時間格式化失敗:', error);
        return new Date().toISOString().slice(0, 16);
    }
}

// 格式化為本地日期格式
function toLocalDateString(date = new Date()) {
    try {
        const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
        return localDate.toISOString().slice(0, 10);
    } catch (error) {
        console.warn('日期格式化失敗:', error);
        return new Date().toISOString().slice(0, 10);
    }
}

// 格式化日期時間（使用用戶時區）
function formatDateTime(dateTime) {
    try {
        const date = new Date(dateTime);
        if (isNaN(date.getTime())) {
            return '無效日期';
        }
        
        return date.toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: userTimezone
        });
    } catch (error) {
        console.warn('日期時間格式化失敗:', error);
        return new Date(dateTime).toLocaleString('zh-TW');
    }
}

// 格式化日期（使用用戶時區）
function formatDate(date) {
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) {
            return '無效日期';
        }
        
        return d.toLocaleDateString('zh-TW', {
            month: '2-digit',
            day: '2-digit',
            timeZone: userTimezone
        });
    } catch (error) {
        console.warn('日期格式化失敗:', error);
        return new Date(date).toLocaleDateString('zh-TW');
    }
}

// 格式化時間（使用用戶時區）
function formatTime(dateTime) {
    try {
        const date = new Date(dateTime);
        if (isNaN(date.getTime())) {
            return '無效時間';
        }
        
        return date.toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: userTimezone
        });
    } catch (error) {
        console.warn('時間格式化失敗:', error);
        return new Date(dateTime).toLocaleTimeString('zh-TW');
    }
}

// 計算時間間隔
function calculateDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
        return `${diffHours}小時${diffMinutes}分鐘`;
    } else {
        return `${diffMinutes}分鐘`;
    }
}

// 計算時間間隔（小時）
function calculateDurationInHours(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    return diffMs / (1000 * 60 * 60);
}