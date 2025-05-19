/* 嬰幼兒照護追蹤應用 - JavaScript */

// ===== 全域變數 =====
let database;
let currentChild = null;
let currentTheme = 'light';
let currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
let currentDateFormat = 'YYYY-MM-DD';
let currentLanguage = 'zh-TW';

// ===== IndexedDB 初始化 =====
const initDB = async () => {
    try {
        database = await openDB();
        await loadUserSettings();
        await loadChildren();
        console.log('資料庫初始化成功');
    } catch (error) {
        console.error('資料庫初始化失敗:', error);
        showNotification('資料庫初始化失敗，請重新整理頁面', 'error');
    }
};

const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('BabyCareDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // 兒童表
            if (!db.objectStoreNames.contains('children')) {
                const childStore = db.createObjectStore('children', { keyPath: 'id', autoIncrement: true });
                childStore.createIndex('name', 'name', { unique: false });
            }
            
            // 餵食記錄表
            if (!db.objectStoreNames.contains('feeding')) {
                const feedingStore = db.createObjectStore('feeding', { keyPath: 'id', autoIncrement: true });
                feedingStore.createIndex('childId', 'childId', { unique: false });
                feedingStore.createIndex('date', 'date', { unique: false });
            }
            
            // 睡眠記錄表
            if (!db.objectStoreNames.contains('sleep')) {
                const sleepStore = db.createObjectStore('sleep', { keyPath: 'id', autoIncrement: true });
                sleepStore.createIndex('childId', 'childId', { unique: false });
                sleepStore.createIndex('date', 'date', { unique: false });
            }
            
            // 尿布記錄表
            if (!db.objectStoreNames.contains('diaper')) {
                const diaperStore = db.createObjectStore('diaper', { keyPath: 'id', autoIncrement: true });
                diaperStore.createIndex('childId', 'childId', { unique: false });
                diaperStore.createIndex('date', 'date', { unique: false });
            }
            
            // 健康記錄表
            if (!db.objectStoreNames.contains('health')) {
                const healthStore = db.createObjectStore('health', { keyPath: 'id', autoIncrement: true });
                healthStore.createIndex('childId', 'childId', { unique: false });
                healthStore.createIndex('type', 'type', { unique: false });
                healthStore.createIndex('date', 'date', { unique: false });
            }
            
            // 里程碑表
            if (!db.objectStoreNames.contains('milestones')) {
                const milestoneStore = db.createObjectStore('milestones', { keyPath: 'id', autoIncrement: true });
                milestoneStore.createIndex('childId', 'childId', { unique: false });
                milestoneStore.createIndex('category', 'category', { unique: false });
            }
            
            // 親子互動表
            if (!db.objectStoreNames.contains('interactions')) {
                const interactionStore = db.createObjectStore('interactions', { keyPath: 'id', autoIncrement: true });
                interactionStore.createIndex('childId', 'childId', { unique: false });
                interactionStore.createIndex('date', 'date', { unique: false });
            }
            
            // 日常活動表
            if (!db.objectStoreNames.contains('activities')) {
                const activityStore = db.createObjectStore('activities', { keyPath: 'id', autoIncrement: true });
                activityStore.createIndex('childId', 'childId', { unique: false });
                activityStore.createIndex('type', 'type', { unique: false });
                activityStore.createIndex('date', 'date', { unique: false });
            }
            
            // 設定表
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
            }
        };
    });
};

// ===== 資料庫操作函數 =====
const saveToDB = async (storeName, data) => {
    try {
        const transaction = database.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const result = await store.add(data);
        return result;
    } catch (error) {
        console.error(`儲存到 ${storeName} 失敗:`, error);
        throw error;
    }
};

const updateInDB = async (storeName, data) => {
    try {
        const transaction = database.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const result = await store.put(data);
        return result;
    } catch (error) {
        console.error(`更新 ${storeName} 失敗:`, error);
        throw error;
    }
};

const deleteFromDB = async (storeName, id) => {
    try {
        const transaction = database.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        await store.delete(id);
    } catch (error) {
        console.error(`刪除 ${storeName} 記錄失敗:`, error);
        throw error;
    }
};

const getAllFromDB = async (storeName) => {
    try {
        const transaction = database.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const result = await store.getAll();
        return result;
    } catch (error) {
        console.error(`獲取 ${storeName} 資料失敗:`, error);
        return [];
    }
};

const getByIndexFromDB = async (storeName, indexName, value) => {
    try {
        const transaction = database.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const result = await index.getAll(value);
        return result;
    } catch (error) {
        console.error(`通過索引獲取 ${storeName} 資料失敗:`, error);
        return [];
    }
};

// ===== 工具函數 =====
const formatDate = (date, includeTime = false) => {
    if (!date) return '';
    
    const d = new Date(date);
    const options = {
        timeZone: currentTimezone,
    };
    
    if (includeTime) {
        switch (currentDateFormat) {
            case 'DD/MM/YYYY':
                options.day = '2-digit';
                options.month = '2-digit';
                options.year = 'numeric';
                options.hour = '2-digit';
                options.minute = '2-digit';
                return d.toLocaleString('en-GB', options);
            case 'MM/DD/YYYY':
                options.month = '2-digit';
                options.day = '2-digit';
                options.year = 'numeric';
                options.hour = '2-digit';
                options.minute = '2-digit';
                return d.toLocaleString('en-US', options);
            default:
                return d.toLocaleString('sv-SE', { timeZone: currentTimezone });
        }
    } else {
        switch (currentDateFormat) {
            case 'DD/MM/YYYY':
                return d.toLocaleDateString('en-GB', { timeZone: currentTimezone });
            case 'MM/DD/YYYY':
                return d.toLocaleDateString('en-US', { timeZone: currentTimezone });
            default:
                return d.toLocaleDateString('sv-SE', { timeZone: currentTimezone });
        }
    }
};

const calculateAge = (birthDate) => {
    if (!birthDate) return '';
    
    const birth = new Date(birthDate);
    const now = new Date();
    const ageInMs = now - birth;
    const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
    
    if (ageInDays < 30) {
        return `${ageInDays} 天`;
    } else if (ageInDays < 365) {
        const months = Math.floor(ageInDays / 30);
        const days = ageInDays % 30;
        return `${months} 個月 ${days} 天`;
    } else {
        const years = Math.floor(ageInDays / 365);
        const months = Math.floor((ageInDays % 365) / 30);
        return `${years} 歲 ${months} 個月`;
    }
};

const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const showNotification = (message, type = 'info') => {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');
    
    notificationMessage.textContent = message;
    notification.className = `notification show ${type}`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
};

// ===== 主題切換 =====
const toggleTheme = () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.textContent = currentTheme === 'light' ? '🌙' : '☀️';
    
    saveUserSettings();
};

// ===== 用戶設定 =====
const loadUserSettings = async () => {
    try {
        const transaction = database.transaction(['settings'], 'readonly');
        const store = transaction.objectStore(settings);
        
        const themeResult = await store.get('theme');
        if (themeResult) {
            currentTheme = themeResult.value;
            document.documentElement.setAttribute('data-theme', currentTheme);
            document.getElementById('themeToggle').textContent = currentTheme === 'light' ? '🌙' : '☀️';
        }
        
        const timezoneResult = await store.get('timezone');
        if (timezoneResult) {
            currentTimezone = timezoneResult.value;
        }
        
        const dateFormatResult = await store.get('dateFormat');
        if (dateFormatResult) {
            currentDateFormat = dateFormatResult.value;
        }
        
        const languageResult = await store.get('language');
        if (languageResult) {
            currentLanguage = languageResult.value;
        }
    } catch (error) {
        console.log('載入用戶設定時出錯，使用預設設定');
    }
};

const saveUserSettings = async () => {
    try {
        const settings = [
            { key: 'theme', value: currentTheme },
            { key: 'timezone', value: currentTimezone },
            { key: 'dateFormat', value: currentDateFormat },
            { key: 'language', value: currentLanguage }
        ];
        
        const transaction = database.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        
        for (const setting of settings) {
            await store.put(setting);
        }
        
        showNotification('設定已儲存');
    } catch (error) {
        console.error('儲存用戶設定失敗:', error);
        showNotification('儲存設定失敗', 'error');
    }
};

// ===== 兒童管理 =====
const loadChildren = async () => {
    try {
        const children = await getAllFromDB('children');
        displayChildren(children);
        
        if (children.length > 0 && !currentChild) {
            selectChild(children[0]);
        }
    } catch (error) {
        console.error('載入兒童資料失敗:', error);
        showNotification('載入兒童資料失敗', 'error');
    }
};

const displayChildren = (children) => {
    const childList = document.getElementById('childList');
    
    if (children.length === 0) {
        childList.innerHTML = `
            <div class="no-children">
                <p>還沒有添加寶寶資料</p>
                <p>點擊上方的「新增寶寶」按鈕開始使用</p>
            </div>
        `;
        return;
    }
    
    childList.innerHTML = children.map(child => `
        <div class="child-card" data-child-id="${child.id}">
            <div class="child-card-actions">
                <button class="child-action-btn" onclick="editChild(${child.id})" title="編輯">✏️</button>
                <button class="child-action-btn" onclick="deleteChild(${child.id})" title="刪除">🗑️</button>
            </div>
            <div class="child-card-photo">
                ${child.photo ? 
                    `<img src="${child.photo}" alt="${child.name}">` : 
                    '👶'
                }
            </div>
            <div class="child-card-info">
                <h3>${child.name}</h3>
                <p>${calculateAge(child.birthDate)}</p>
                <p>${child.gender === 'male' ? '👦 男孩' : child.gender === 'female' ? '👧 女孩' : ''}</p>
                ${child.notes ? `<p class="child-notes">${child.notes}</p>` : ''}
            </div>
        </div>
    `).join('');
    
    // 添加點擊事件
    childList.querySelectorAll('.child-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('child-action-btn')) {
                const childId = parseInt(card.dataset.childId);
                const child = children.find(c => c.id === childId);
                selectChild(child);
            }
        });
    });
};

const selectChild = (child) => {
    currentChild = child;
    
    // 隱藏兒童選擇器，顯示主控制面板
    document.getElementById('childSelector').style.display = 'none';
    document.getElementById('mainDashboard').style.display = 'block';
    
    // 更新兒童資訊顯示
    updateChildDisplay();
    
    // 載入今日摘要
    loadTodaySummary();
};

const updateChildDisplay = () => {
    if (!currentChild) return;
    
    document.getElementById('currentChildName').textContent = currentChild.name;
    document.getElementById('currentChildAge').textContent = calculateAge(currentChild.birthDate);
    document.getElementById('currentChildGender').textContent = 
        currentChild.gender === 'male' ? '👦 男孩' : 
        currentChild.gender === 'female' ? '👧 女孩' : '';
    
    const photoElement = document.getElementById('currentChildPhoto');
    const placeholderElement = document.getElementById('childPhotoPlaceholder');
    
    if (currentChild.photo) {
        photoElement.src = currentChild.photo;
        photoElement.style.display = 'block';
        placeholderElement.style.display = 'none';
    } else {
        photoElement.style.display = 'none';
        placeholderElement.style.display = 'flex';
    }
};

const openChildModal = (child = null) => {
    const modal = document.getElementById('childModal');
    const title = document.getElementById('childModalTitle');
    const form = document.getElementById('childForm');
    
    title.textContent = child ? '編輯寶寶資料' : '新增寶寶';
    form.reset();
    
    if (child) {
        document.getElementById('childName').value = child.name || '';
        document.getElementById('childBirthDate').value = child.birthDate || '';
        document.getElementById('childGender').value = child.gender || '';
        document.getElementById('childNotes').value = child.notes || '';
        
        if (child.photo) {
            const preview = document.getElementById('childPhotoPreview');
            preview.innerHTML = `<img src="${child.photo}" alt="寶寶照片" style="max-width: 200px; border-radius: 8px;">`;
        }
    }
    
    modal.classList.add('show');
    modal.dataset.childId = child ? child.id : '';
};

const saveChild = async () => {
    const form = document.getElementById('childForm');
    const formData = new FormData(form);
    const photoFile = document.getElementById('childPhoto').files[0];
    const childId = document.getElementById('childModal').dataset.childId;
    
    try {
        const childData = {
            name: formData.get('childName') || document.getElementById('childName').value,
            birthDate: formData.get('childBirthDate') || document.getElementById('childBirthDate').value,
            gender: formData.get('childGender') || document.getElementById('childGender').value,
            notes: formData.get('childNotes') || document.getElementById('childNotes').value,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // 處理照片
        if (photoFile) {
            childData.photo = await convertImageToBase64(photoFile);
        } else if (childId) {
            // 編輯模式下保持原有照片
            const existingChild = await getByIdFromDB('children', parseInt(childId));
            if (existingChild) {
                childData.photo = existingChild.photo;
            }
        }
        
        if (childId) {
            // 編輯模式
            childData.id = parseInt(childId);
            await updateInDB('children', childData);
            
            if (currentChild && currentChild.id === childData.id) {
                currentChild = childData;
                updateChildDisplay();
            }
            
            showNotification('寶寶資料已更新');
        } else {
            // 新增模式
            const newChildId = await saveToDB('children', childData);
            childData.id = newChildId;
            
            if (!currentChild) {
                selectChild(childData);
            }
            
            showNotification('寶寶資料已新增');
        }
        
        document.getElementById('childModal').classList.remove('show');
        await loadChildren();
        
    } catch (error) {
        console.error('儲存兒童資料失敗:', error);
        showNotification('儲存失敗，請重試', 'error');
    }
};

const editChild = (childId) => {
    getAllFromDB('children').then(children => {
        const child = children.find(c => c.id === childId);
        if (child) {
            openChildModal(child);
        }
    });
};

const deleteChild = async (childId) => {
    const confirmMessage = '確定要刪除這個寶寶的所有資料嗎？此操作無法復原。';
    
    if (await showConfirmDialog(confirmMessage)) {
        try {
            // 刪除兒童及相關所有記錄
            await deleteFromDB('children', childId);
            await deleteChildRecords(childId);
            
            // 如果刪除的是當前選中的兒童，重置選擇
            if (currentChild && currentChild.id === childId) {
                currentChild = null;
                document.getElementById('childSelector').style.display = 'block';
                document.getElementById('mainDashboard').style.display = 'none';
            }
            
            await loadChildren();
            showNotification('寶寶資料已刪除');
        } catch (error) {
            console.error('刪除兒童資料失敗:', error);
            showNotification('刪除失敗，請重試', 'error');
        }
    }
};

const deleteChildRecords = async (childId) => {
    const stores = ['feeding', 'sleep', 'diaper', 'health', 'milestones', 'interactions', 'activities'];
    
    for (const storeName of stores) {
        try {
            const records = await getByIndexFromDB(storeName, 'childId', childId);
            for (const record of records) {
                await deleteFromDB(storeName, record.id);
            }
        } catch (error) {
            console.error(`刪除 ${storeName} 記錄失敗:`, error);
        }
    }
};

const getByIdFromDB = async (storeName, id) => {
    try {
        const transaction = database.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const result = await store.get(id);
        return result;
    } catch (error) {
        console.error(`通過ID獲取 ${storeName} 資料失敗:`, error);
        return null;
    }
};

// ===== 記錄管理 =====
const showRecordsSection = () => {
    hideAllSections();
    document.getElementById('recordsSection').style.display = 'block';
    loadRecords('feeding');
};

const hideAllSections = () => {
    const sections = ['recordsSection', 'healthSection', 'milestonesSection', 
                     'interactionSection', 'chartsSection', 'backupSection'];
    sections.forEach(sectionId => {
        document.getElementById(sectionId).style.display = 'none';
    });
    document.getElementById('mainDashboard').style.display = 'none';
};

const showMainDashboard = () => {
    hideAllSections();
    document.getElementById('mainDashboard').style.display = 'block';
    loadTodaySummary();
};

const switchRecordTab = (tabName) => {
    // 更新標籤頁狀態
    document.querySelectorAll('.record-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // 更新內容顯示
    document.querySelectorAll('.record-content .tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // 載入對應記錄
    loadRecords(tabName);
};

const loadRecords = async (type) => {
    if (!currentChild) return;
    
    try {
        const records = await getByIndexFromDB(type, 'childId', currentChild.id);
        const sortedRecords = records.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const listElement = document.getElementById(`${type}List`);
        
        if (sortedRecords.length === 0) {
            listElement.innerHTML = `
                <div class="no-records">
                    <p>暫無${getRecordTypeName(type)}記錄</p>
                    <p>點擊上方的新增按鈕開始記錄</p>
                </div>
            `;
            return;
        }
        
        listElement.innerHTML = sortedRecords.map(record => 
            renderRecordItem(record, type)
        ).join('');
        
    } catch (error) {
        console.error(`載入${type}記錄失敗:`, error);
        showNotification(`載入記錄失敗`, 'error');
    }
};

const getRecordTypeName = (type) => {
    const typeNames = {
        feeding: '餵食',
        sleep: '睡眠',
        diaper: '尿布',
        activity: '活動'
    };
    return typeNames[type] || type;
};

const renderRecordItem = (record, type) => {
    const typeConfig = {
        feeding: {
            icon: '🍼',
            getDetails: (r) => {
                if (r.type === 'breast') {
                    return `母乳 - ${r.duration || 0} 分鐘${r.side ? ` (${r.side === 'left' ? '左側' : '右側'})` : ''}`;
                } else if (r.type === 'formula') {
                    return `配方奶 - ${r.amount || 0} ml`;
                } else if (r.type === 'solid') {
                    return `固體食物 - ${r.amount || 0} g`;
                }
                return '';
            }
        },
        sleep: {
            icon: '😴',
            getDetails: (r) => {
                const start = r.startTime ? formatDate(r.startTime, true) : '';
                const end = r.endTime ? formatDate(r.endTime, true) : '';
                const duration = r.duration ? `${Math.floor(r.duration / 60)}小時${r.duration % 60}分鐘` : '';
                return `${start} - ${end} (${duration})`;
            }
        },
        diaper: {
            icon: '🧷',
            getDetails: (r) => {
                const types = {
                    wet: '尿濕',
                    poop: '便便',
                    mixed: '尿濕+便便'
                };
                return types[r.type] || r.type;
            }
        },
        activity: {
            icon: '🎮',
            getDetails: (r) => {
                const duration = r.duration ? ` - ${r.duration} 分鐘` : '';
                return `${r.activityType}${duration}`;
            }
        }
    };
    
    const config = typeConfig[type];
    const details = config.getDetails(record);
    
    return `
        <div class="record-item" data-record-id="${record.id}">
            <div class="record-actions">
                <button class="record-action-btn" onclick="editRecord('${type}', ${record.id})" title="編輯">✏️</button>
                <button class="record-action-btn" onclick="deleteRecord('${type}', ${record.id})" title="刪除">🗑️</button>
            </div>
            <div class="record-header">
                <span class="record-type">${config.icon} ${getRecordTypeName(type)}</span>
                <span class="record-time">${formatDate(record.date, true)}</span>
            </div>
            <div class="record-details">${details}</div>
            ${record.notes ? `<div class="record-notes">💭 ${record.notes}</div>` : ''}
        </div>
    `;
};

const openRecordModal = (type, record = null) => {
    const modal = document.getElementById('recordModal');
    const title = document.getElementById('recordModalTitle');
    const formContainer = document.getElementById('recordForm');
    
    title.textContent = record ? `編輯${getRecordTypeName(type)}記錄` : `新增${getRecordTypeName(type)}記錄`;
    formContainer.innerHTML = generateRecordForm(type, record);
    
    modal.classList.add('show');
    modal.dataset.recordType = type;
    modal.dataset.recordId = record ? record.id : '';
};

const generateRecordForm = (type, record = null) => {
    const now = new Date();
    const currentDate = now.toISOString().slice(0, 16);
    
    const forms = {
        feeding: `
            <div class="form-group">
                <label for="feedingType">餵食類型 *</label>
                <select id="feedingType" required>
                    <option value="">請選擇</option>
                    <option value="breast" ${record?.type === 'breast' ? 'selected' : ''}>母乳</option>
                    <option value="formula" ${record?.type === 'formula' ? 'selected' : ''}>配方奶</option>
                    <option value="solid" ${record?.type === 'solid' ? 'selected' : ''}>固體食物</option>
                </select>
            </div>
            <div id="breastFields" style="${record?.type === 'breast' ? '' : 'display: none;'}">
                <div class="form-group">
                    <label for="feedingSide">餵食側別</label>
                    <select id="feedingSide">
                        <option value="">請選擇</option>
                        <option value="left" ${record?.side === 'left' ? 'selected' : ''}>左側</option>
                        <option value="right" ${record?.side === 'right' ? 'selected' : ''}>右側</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="feedingDuration">餵食時間（分鐘）</label>
                    <input type="number" id="feedingDuration" min="0" value="${record?.duration || ''}">
                </div>
            </div>
            <div id="amountFields" style="${record?.type === 'formula' || record?.type === 'solid' ? '' : 'display: none;'}">
                <div class="form-group">
                    <label for="feedingAmount">份量</label>
                    <div style="display: flex; gap: 10px;">
                        <input type="number" id="feedingAmount" min="0" step="0.1" value="${record?.amount || ''}" style="flex: 1;">
                        <span id="amountUnit" style="padding: 8px;">${record?.type === 'solid' ? 'g' : 'ml'}</span>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label for="feedingDate">時間 *</label>
                <input type="datetime-local" id="feedingDate" value="${record?.date || currentDate}" required>
            </div>
            <div class="form-group">
                <label for="feedingNotes">備註</label>
                <textarea id="feedingNotes" rows="3">${record?.notes || ''}</textarea>
            </div>
        `,
        sleep: `
            <div class="form-group">
                <label for="sleepStartTime">開始時間 *</label>
                <input type="datetime-local" id="sleepStartTime" value="${record?.startTime || currentDate}" required>
            </div>
            <div class="form-group">
                <label for="sleepEndTime">結束時間</label>
                <input type="datetime-local" id="sleepEndTime" value="${record?.endTime || ''}">
            </div>
            <div class="form-group">
                <label for="sleepNotes">備註</label>
                <textarea id="sleepNotes" rows="3">${record?.notes || ''}</textarea>
            </div>
        `,
        diaper: `
            <div class="form-group">
                <label for="diaperType">尿布類型 *</label>
                <select id="diaperType" required>
                    <option value="">請選擇</option>
                    <option value="wet" ${record?.type === 'wet' ? 'selected' : ''}>🟡 尿濕</option>
                    <option value="poop" ${record?.type === 'poop' ? 'selected' : ''}>🟤 便便</option>
                    <option value="mixed" ${record?.type === 'mixed' ? 'selected' : ''}>🟡🟤 尿濕+便便</option>
                </select>
            </div>
            <div class="form-group">
                <label for="diaperDate">時間 *</label>
                <input type="datetime-local" id="diaperDate" value="${record?.date || currentDate}" required>
            </div>
            <div class="form-group">
                <label for="diaperNotes">備註</label>
                <textarea id="diaperNotes" rows="3">${record?.notes || ''}</textarea>
            </div>
        `,
        activity: `
            <div class="form-group">
                <label for="activityType">活動類型 *</label>
                <select id="activityType" required>
                    <option value="">請選擇</option>
                    <option value="bath" ${record?.activityType === 'bath' ? 'selected' : ''}>🛁 洗澡</option>
                    <option value="massage" ${record?.activityType === 'massage' ? 'selected' : ''}>👐 按摩</option>
                    <option value="changing" ${record?.activityType === 'changing' ? 'selected' : ''}>👕 換衣服/護理</option>
                    <option value="tummy-time" ${record?.activityType === 'tummy-time' ? 'selected' : ''}>🤱 趴臥時間</option>
                    <option value="sensory-play" ${record?.activityType === 'sensory-play' ? 'selected' : ''}>🎨 感官遊戲</option>
                    <option value="reading" ${record?.activityType === 'reading' ? 'selected' : ''}>📚 親子閱讀</option>
                    <option value="music" ${record?.activityType === 'music' ? 'selected' : ''}>🎵 音樂互動</option>
                    <option value="walk" ${record?.activityType === 'walk' ? 'selected' : ''}>🚶 散步/推車</option>
                    <option value="sunbath" ${record?.activityType === 'sunbath' ? 'selected' : ''}>☀️ 日光浴</option>
                    <option value="social" ${record?.activityType === 'social' ? 'selected' : ''}>👥 社交互動</option>
                    <option value="custom" ${record?.activityType === 'custom' ? 'selected' : ''}>✨ 自訂活動</option>
                </select>
            </div>
            <div id="customActivityField" style="${record?.activityType === 'custom' ? '' : 'display: none;'}">
                <div class="form-group">
                    <label for="customActivityName">自訂活動名稱</label>
                    <input type="text" id="customActivityName" value="${record?.customName || ''}">
                </div>
            </div>
            <div class="form-group">
                <label for="activityDate">時間 *</label>
                <input type="datetime-local" id="activityDate" value="${record?.date || currentDate}" required>
            </div>
            <div class="form-group">
                <label for="activityDuration">持續時間（分鐘）</label>
                <input type="number" id="activityDuration" min="0" value="${record?.duration || ''}">
            </div>
            <div class="form-group">
                <label for="activityPhotos">照片</label>
                <input type="file" id="activityPhotos" accept="image/*" multiple>
                <div id="activityPhotoPreview" class="photo-preview">
                    ${record?.photos ? record.photos.map(photo => 
                        `<img src="${photo}" style="max-width: 100px; margin: 5px; border-radius: 8px;">`
                    ).join('') : ''}
                </div>
            </div>
            <div class="form-group">
                <label for="activityNotes">備註</label>
                <textarea id="activityNotes" rows="3">${record?.notes || ''}</textarea>
            </div>
        `
    };
    
    return forms[type] || '';
};

const saveRecord = async () => {
    const modal = document.getElementById('recordModal');
    const type = modal.dataset.recordType;
    const recordId = modal.dataset.recordId;
    
    try {
        let recordData = {
            childId: currentChild.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // 根據記錄類型收集資料
        switch (type) {
            case 'feeding':
                recordData = {
                    ...recordData,
                    type: document.getElementById('feedingType').value,
                    date: document.getElementById('feedingDate').value,
                    notes: document.getElementById('feedingNotes').value,
                };
                
                if (recordData.type === 'breast') {
                    recordData.side = document.getElementById('feedingSide').value;
                    recordData.duration = parseInt(document.getElementById('feedingDuration').value) || 0;
                } else {
                    recordData.amount = parseFloat(document.getElementById('feedingAmount').value) || 0;
                }
                break;
                
            case 'sleep':
                const startTime = document.getElementById('sleepStartTime').value;
                const endTime = document.getElementById('sleepEndTime').value;
                
                recordData = {
                    ...recordData,
                    startTime: startTime,
                    endTime: endTime,
                    date: startTime,
                    notes: document.getElementById('sleepNotes').value,
                };
                
                // 計算睡眠時長
                if (startTime && endTime) {
                    const start = new Date(startTime);
                    const end = new Date(endTime);
                    recordData.duration = Math.round((end - start) / (1000 * 60)); // 分鐘
                }
                break;
                
            case 'diaper':
                recordData = {
                    ...recordData,
                    type: document.getElementById('diaperType').value,
                    date: document.getElementById('diaperDate').value,
                    notes: document.getElementById('diaperNotes').value,
                };
                break;
                
            case 'activity':
                const activityType = document.getElementById('activityType').value;
                recordData = {
                    ...recordData,
                    activityType: activityType,
                    date: document.getElementById('activityDate').value,
                    duration: parseInt(document.getElementById('activityDuration').value) || 0,
                    notes: document.getElementById('activityNotes').value,
                };
                
                if (activityType === 'custom') {
                    recordData.customName = document.getElementById('customActivityName').value;
                }
                
                // 處理照片
                const photoFiles = document.getElementById('activityPhotos').files;
                if (photoFiles.length > 0) {
                    recordData.photos = [];
                    for (const file of photoFiles) {
                        const base64 = await convertImageToBase64(file);
                        recordData.photos.push(base64);
                    }
                } else if (recordId) {
                    // 編輯模式下保持原有照片
                    const existingRecord = await getByIdFromDB('activities', parseInt(recordId));
                    if (existingRecord && existingRecord.photos) {
                        recordData.photos = existingRecord.photos;
                    }
                }
                break;
        }
        
        if (recordId) {
            // 編輯模式
            recordData.id = parseInt(recordId);
            await updateInDB(type, recordData);
            showNotification('記錄已更新');
        } else {
            // 新增模式
            await saveToDB(type, recordData);
            showNotification('記錄已新增');
        }
        
        modal.classList.remove('show');
        await loadRecords(type);
        await loadTodaySummary();
        
    } catch (error) {
        console.error('儲存記錄失敗:', error);
        showNotification('儲存失敗，請重試', 'error');
    }
};

const editRecord = async (type, recordId) => {
    try {
        const record = await getByIdFromDB(type, recordId);
        if (record) {
            openRecordModal(type, record);
        }
    } catch (error) {
        console.error('載入記錄失敗:', error);
        showNotification('載入記錄失敗', 'error');
    }
};

const deleteRecord = async (type, recordId) => {
    const confirmMessage = '確定要刪除這筆記錄嗎？';
    
    if (await showConfirmDialog(confirmMessage)) {
        try {
            await deleteFromDB(type, recordId);
            await loadRecords(type);
            await loadTodaySummary();
            showNotification('記錄已刪除');
        } catch (error) {
            console.error('刪除記錄失敗:', error);
            showNotification('刪除失敗，請重試', 'error');
        }
    }
};

// ===== 今日摘要 =====
const loadTodaySummary = async () => {
    if (!currentChild) return;
    
    try {
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
        
        const feedingRecords = await getRecordsByDateRange('feeding', currentChild.id, todayStart, todayEnd);
        const sleepRecords = await getRecordsByDateRange('sleep', currentChild.id, todayStart, todayEnd);
        const diaperRecords = await getRecordsByDateRange('diaper', currentChild.id, todayStart, todayEnd);
        const activityRecords = await getRecordsByDateRange('activities', currentChild.id, todayStart, todayEnd);
        
        const summary = {
            feeding: feedingRecords.length,
            sleep: calculateTotalSleep(sleepRecords),
            diaper: diaperRecords.length,
            activity: activityRecords.length
        };
        
        displayTodaySummary(summary);
    } catch (error) {
        console.error('載入今日摘要失敗:', error);
    }
};

const getRecordsByDateRange = async (storeName, childId, startDate, endDate) => {
    try {
        const allRecords = await getByIndexFromDB(storeName, 'childId', childId);
        return allRecords.filter(record => {
            const recordDate = new Date(record.date || record.startTime);
            return recordDate >= startDate && recordDate < endDate;
        });
    } catch (error) {
        console.error(`獲取日期範圍記錄失敗 (${storeName}):`, error);
        return [];
    }
};

const calculateTotalSleep = (sleepRecords) => {
    const totalMinutes = sleepRecords.reduce((total, record) => {
        return total + (record.duration || 0);
    }, 0);
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}小時${minutes}分`;
};

const displayTodaySummary = (summary) => {
    const summaryContainer = document.getElementById('todaySummary');
    
    summaryContainer.innerHTML = `
        <div class="summary-item">
            <div class="summary-number">${summary.feeding}</div>
            <div class="summary-label">次餵食</div>
        </div>
        <div class="summary-item">
            <div class="summary-number">${summary.sleep}</div>
            <div class="summary-label">總睡眠</div>
        </div>
        <div class="summary-item">
            <div class="summary-number">${summary.diaper}</div>
            <div class="summary-label">次換尿布</div>
        </div>
        <div class="summary-item">
            <div class="summary-number">${summary.activity}</div>
            <div class="summary-label">次活動</div>
        </div>
    `;
};

// ===== 健康記錄 =====
const showHealthSection = () => {
    hideAllSections();
    document.getElementById('healthSection').style.display = 'block';
    loadHealthRecords('vaccination');
};

const switchHealthTab = (tabName) => {
    // 更新標籤頁狀態
    document.querySelectorAll('.health-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // 更新內容顯示
    document.querySelectorAll('.health-content .tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // 載入對應記錄
    loadHealthRecords(tabName);
};

const loadHealthRecords = async (type) => {
    if (!currentChild) return;
    
    try {
        const records = await getHealthRecordsByType(type, currentChild.id);
        const sortedRecords = records.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const listElement = document.getElementById(`${type}List`);
        
        if (sortedRecords.length === 0) {
            listElement.innerHTML = `
                <div class="no-records">
                    <p>暫無${getHealthTypeName(type)}記錄</p>
                    <p>點擊上方的新增按鈕開始記錄</p>
                </div>
            `;
            return;
        }
        
        listElement.innerHTML = sortedRecords.map(record => 
            renderHealthRecordItem(record, type)
        ).join('');
        
    } catch (error) {
        console.error(`載入${type}記錄失敗:`, error);
        showNotification(`載入健康記錄失敗`, 'error');
    }
};

const getHealthRecordsByType = async (type, childId) => {
    try {
        const allRecords = await getByIndexFromDB('health', 'childId', childId);
        return allRecords.filter(record => record.type === type);
    } catch (error) {
        console.error('獲取健康記錄失敗:', error);
        return [];
    }
};

const getHealthTypeName = (type) => {
    const typeNames = {
        vaccination: '疫苗',
        medication: '用藥',
        illness: '疾病',
        checkup: '健檢'
    };
    return typeNames[type] || type;
};

const renderHealthRecordItem = (record, type) => {
    const typeConfig = {
        vaccination: {
            icon: '💉',
            getDetails: (r) => `${r.vaccineName || '未指定疫苗'} - ${r.location || '未指定地點'}`,
        },
        medication: {
            icon: '💊',
            getDetails: (r) => `${r.medicationName || '未指定藥物'} - ${r.dosage || ''}${r.frequency ? ` (${r.frequency})` : ''}`,
        },
        illness: {
            icon: '🤒',
            getDetails: (r) => {
                const temp = r.temperature ? `體溫: ${r.temperature}°C (${r.tempMethod || 'unknown'}) ` : '';
                return `${r.symptoms || '未指定症狀'} ${temp}`;
            },
        },
        checkup: {
            icon: '🩺',
            getDetails: (r) => {
                const weight = r.weight ? `體重: ${r.weight}kg ` : '';
                const height = r.height ? `身高: ${r.height}cm ` : '';
                return `${r.checkupType || '一般健檢'} ${weight}${height}`.trim();
            },
        }
    };
    
    const config = typeConfig[type];
    const details = config.getDetails(record);
    
    return `
        <div class="record-item" data-record-id="${record.id}">
            <div class="record-actions">
                <button class="record-action-btn" onclick="editHealthRecord('${type}', ${record.id})" title="編輯">✏️</button>
                <button class="record-action-btn" onclick="deleteHealthRecord(${record.id})" title="刪除">🗑️</button>
            </div>
            <div class="record-header">
                <span class="record-type">${config.icon} ${getHealthTypeName(type)}</span>
                <span class="record-time">${formatDate(record.date, true)}</span>
            </div>
            <div class="record-details">${details}</div>
            ${record.notes ? `<div class="record-notes">💭 ${record.notes}</div>` : ''}
        </div>
    `;
};

const openHealthRecordModal = (type, record = null) => {
    const modal = document.getElementById('recordModal');
    const title = document.getElementById('recordModalTitle');
    const formContainer = document.getElementById('recordForm');
    
    title.textContent = record ? `編輯${getHealthTypeName(type)}記錄` : `新增${getHealthTypeName(type)}記錄`;
    formContainer.innerHTML = generateHealthRecordForm(type, record);
    
    modal.classList.add('show');
    modal.dataset.recordType = 'health';
    modal.dataset.healthType = type;
    modal.dataset.recordId = record ? record.id : '';
};

const generateHealthRecordForm = (type, record = null) => {
    const now = new Date();
    const currentDate = now.toISOString().slice(0, 16);
    
    const forms = {
        vaccination: `
            <div class="form-group">
                <label for="vaccineName">疫苗名稱 *</label>
                <input type="text" id="vaccineName" value="${record?.vaccineName || ''}" required>
            </div>
            <div class="form-group">
                <label for="vaccineDate">接種日期 *</label>
                <input type="datetime-local" id="vaccineDate" value="${record?.date || currentDate}" required>
            </div>
            <div class="form-group">
                <label for="vaccineLocation">接種地點</label>
                <input type="text" id="vaccineLocation" value="${record?.location || ''}">
            </div>
            <div class="form-group">
                <label for="vaccineBatch">批次號碼</label>
                <input type="text" id="vaccineBatch" value="${record?.batchNumber || ''}">
            </div>
            <div class="form-group">
                <label for="vaccineNotes">備註</label>
                <textarea id="vaccineNotes" rows="3">${record?.notes || ''}</textarea>
            </div>
        `,
        medication: `
            <div class="form-group">
                <label for="medicationName">藥物名稱 *</label>
                <input type="text" id="medicationName" value="${record?.medicationName || ''}" required>
            </div>
            <div class="form-group">
                <label for="medicationDate">用藥日期 *</label>
                <input type="datetime-local" id="medicationDate" value="${record?.date || currentDate}" required>
            </div>
            <div class="form-group">
                <label for="medicationDosage">劑量</label>
                <input type="text" id="medicationDosage" value="${record?.dosage || ''}">
            </div>
            <div class="form-group">
                <label for="medicationFrequency">頻率</label>
                <select id="medicationFrequency">
                    <option value="">請選擇</option>
                    <option value="每日一次" ${record?.frequency === '每日一次' ? 'selected' : ''}>每日一次</option>
                    <option value="每日兩次" ${record?.frequency === '每日兩次' ? 'selected' : ''}>每日兩次</option>
                    <option value="每日三次" ${record?.frequency === '每日三次' ? 'selected' : ''}>每日三次</option>
                    <option value="睡前一次" ${record?.frequency === '睡前一次' ? 'selected' : ''}>睡前一次</option>
                    <option value="需要時服用" ${record?.frequency === '需要時服用' ? 'selected' : ''}>需要時服用</option>
                </select>
            </div>
            <div class="form-group">
                <label for="medicationPurpose">用藥目的</label>
                <input type="text" id="medicationPurpose" value="${record?.purpose || ''}">
            </div>
            <div class="form-group">
                <label for="medicationNotes">備註</label>
                <textarea id="medicationNotes" rows="3">${record?.notes || ''}</textarea>
            </div>
        `,
        illness: `
            <div class="form-group">
                <label for="illnessDate">發生日期 *</label>
                <input type="datetime-local" id="illnessDate" value="${record?.date || currentDate}" required>
            </div>
            <div class="form-group">
                <label for="illnessSymptoms">症狀描述 *</label>
                <textarea id="illnessSymptoms" rows="3" required>${record?.symptoms || ''}</textarea>
            </div>
            <div class="form-group">
                <label for="illnessTemperature">體溫（°C）</label>
                <input type="number" id="illnessTemperature" step="0.1" value="${record?.temperature || ''}">
            </div>
            <div class="form-group">
                <label for="tempMethod">測量方式</label>
                <select id="tempMethod">
                    <option value="">請選擇</option>
                    <option value="口溫" ${record?.tempMethod === '口溫' ? 'selected' : ''}>口溫</option>
                    <option value="耳溫" ${record?.tempMethod === '耳溫' ? 'selected' : ''}>耳溫</option>
                    <option value="額溫" ${record?.tempMethod === '額溫' ? 'selected' : ''}>額溫</option>
                    <option value="腋溫" ${record?.tempMethod === '腋溫' ? 'selected' : ''}>腋溫</option>
                    <option value="肛溫" ${record?.tempMethod === '肛溫' ? 'selected' : ''}>肛溫</option>
                </select>
            </div>
            <div class="form-group">
                <label for="illnessDoctor">就診醫生</label>
                <input type="text" id="illnessDoctor" value="${record?.doctor || ''}">
            </div>
            <div class="form-group">
                <label for="illnessDiagnosis">診斷結果</label>
                <textarea id="illnessDiagnosis" rows="2">${record?.diagnosis || ''}</textarea>
            </div>
            <div class="form-group">
                <label for="illnessNotes">備註</label>
                <textarea id="illnessNotes" rows="3">${record?.notes || ''}</textarea>
            </div>
        `,
        checkup: `
            <div class="form-group">
                <label for="checkupDate">健檢日期 *</label>
                <input type="datetime-local" id="checkupDate" value="${record?.date || currentDate}" required>
            </div>
            <div class="form-group">
                <label for="checkupType">健檢類型</label>
                <select id="checkupType">
                    <option value="">請選擇</option>
                    <option value="新生兒檢查" ${record?.checkupType === '新生兒檢查' ? 'selected' : ''}>新生兒檢查</option>
                    <option value="1個月健檢" ${record?.checkupType === '1個月健檢' ? 'selected' : ''}>1個月健檢</option>
                    <option value="2個月健檢" ${record?.checkupType === '2個月健檢' ? 'selected' : ''}>2個月健檢</option>
                    <option value="4個月健檢" ${record?.checkupType === '4個月健檢' ? 'selected' : ''}>4個月健檢</option>
                    <option value="6個月健檢" ${record?.checkupType === '6個月健檢' ? 'selected' : ''}>6個月健檢</option>
                    <option value="9個月健檢" ${record?.checkupType === '9個月健檢' ? 'selected' : ''}>9個月健檢</option>
                    <option value="1歲健檢" ${record?.checkupType === '1歲健檢' ? 'selected' : ''}>1歲健檢</option>
                    <option value="1歲半健檢" ${record?.checkupType === '1歲半健檢' ? 'selected' : ''}>1歲半健檢</option>
                    <option value="2歲健檢" ${record?.checkupType === '2歲健檢' ? 'selected' : ''}>2歲健檢</option>
                    <option value="3歲健檢" ${record?.checkupType === '3歲健檢' ? 'selected' : ''}>3歲健檢</option>
                    <option value="其他健檢" ${record?.checkupType === '其他健檢' ? 'selected' : ''}>其他健檢</option>
                </select>
            </div>
            <div class="form-group">
                <label for="checkupWeight">體重（kg）</label>
                <input type="number" id="checkupWeight" step="0.01" value="${record?.weight || ''}">
            </div>
            <div class="form-group">
                <label for="checkupHeight">身高（cm）</label>
                <input type="number" id="checkupHeight" step="0.1" value="${record?.height || ''}">
            </div>
            <div class="form-group">
                <label for="checkupHeadCircumference">頭圍（cm）</label>
                <input type="number" id="checkupHeadCircumference" step="0.1" value="${record?.headCircumference || ''}">
            </div>
            <div class="form-group">
                <label for="checkupDoctor">檢查醫生</label>
                <input type="text" id="checkupDoctor" value="${record?.doctor || ''}">
            </div>
            <div class="form-group">
                <label for="checkupResults">檢查結果</label>
                <textarea id="checkupResults" rows="3">${record?.results || ''}</textarea>
            </div>
            <div class="form-group">
                <label for="checkupNotes">備註</label>
                <textarea id="checkupNotes" rows="3">${record?.notes || ''}</textarea>
            </div>
        `
    };
    
    return forms[type] || '';
};

const saveHealthRecord = async () => {
    const modal = document.getElementById('recordModal');
    const healthType = modal.dataset.healthType;
    const recordId = modal.dataset.recordId;
    
    try {
        let recordData = {
            childId: currentChild.id,
            type: healthType,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // 根據健康記錄類型收集資料
        switch (healthType) {
            case 'vaccination':
                recordData = {
                    ...recordData,
                    vaccineName: document.getElementById('vaccineName').value,
                    date: document.getElementById('vaccineDate').value,
                    location: document.getElementById('vaccineLocation').value,
                    batchNumber: document.getElementById('vaccineBatch').value,
                    notes: document.getElementById('vaccineNotes').value,
                };
                break;
                
            case 'medication':
                recordData = {
                    ...recordData,
                    medicationName: document.getElementById('medicationName').value,
                    date: document.getElementById('medicationDate').value,
                    dosage: document.getElementById('medicationDosage').value,
                    frequency: document.getElementById('medicationFrequency').value,
                    purpose: document.getElementById('medicationPurpose').value,
                    notes: document.getElementById('medicationNotes').value,
                };
                break;
                
            case 'illness':
                recordData = {
                    ...recordData,
                    date: document.getElementById('illnessDate').value,
                    symptoms: document.getElementById('illnessSymptoms').value,
                    temperature: parseFloat(document.getElementById('illnessTemperature').value) || null,
                    tempMethod: document.getElementById('tempMethod').value,
                    doctor: document.getElementById('illnessDoctor').value,
                    diagnosis: document.getElementById('illnessDiagnosis').value,
                    notes: document.getElementById('illnessNotes').value,
                };
                break;
                
            case 'checkup':
                recordData = {
                    ...recordData,
                    date: document.getElementById('checkupDate').value,
                    checkupType: document.getElementById('checkupType').value,
                    weight: parseFloat(document.getElementById('checkupWeight').value) || null,
                    height: parseFloat(document.getElementById('checkupHeight').value) || null,
                    headCircumference: parseFloat(document.getElementById('checkupHeadCircumference').value) || null,
                    doctor: document.getElementById('checkupDoctor').value,
                    results: document.getElementById('checkupResults').value,
                    notes: document.getElementById('checkupNotes').value,
                };
                break;
        }
        
        if (recordId) {
            // 編輯模式
            recordData.id = parseInt(recordId);
            await updateInDB('health', recordData);
            showNotification('健康記錄已更新');
        } else {
            // 新增模式
            await saveToDB('health', recordData);
            showNotification('健康記錄已新增');
        }
        
        modal.classList.remove('show');
        await loadHealthRecords(healthType);
        
    } catch (error) {
        console.error('儲存健康記錄失敗:', error);
        showNotification('儲存失敗，請重試', 'error');
    }
};

const editHealthRecord = async (type, recordId) => {
    try {
        const record = await getByIdFromDB('health', recordId);
        if (record) {
            openHealthRecordModal(type, record);
        }
    } catch (error) {
        console.error('載入健康記錄失敗:', error);
        showNotification('載入記錄失敗', 'error');
    }
};

const deleteHealthRecord = async (recordId) => {
    const confirmMessage = '確定要刪除這筆健康記錄嗎？';
    
    if (await showConfirmDialog(confirmMessage)) {
        try {
            await deleteFromDB('health', recordId);
            
            // 重新載入當前標籤的記錄
            const activeTab = document.querySelector('.health-tabs .tab-btn.active');
            const activeType = activeTab.dataset.tab;
            await loadHealthRecords(activeType);
            
            showNotification('健康記錄已刪除');
        } catch (error) {
            console.error('刪除健康記錄失敗:', error);
            showNotification('刪除失敗，請重試', 'error');
        }
    }
};

// ===== 發展里程碑 =====
const showMilestonesSection = () => {
    hideAllSections();
    document.getElementById('milestonesSection').style.display = 'block';
    loadMilestones('motor');
};

const switchMilestoneCategory = (category) => {
    // 更新標籤頁狀態
    document.querySelectorAll('.category-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    
    // 載入對應里程碑
    loadMilestones(category);
};

const loadMilestones = async (category) => {
    if (!currentChild) return;
    
    try {
        let milestones = [];
        
        if (category === 'custom') {
            // 載入自訂里程碑
            milestones = await getCustomMilestones(currentChild.id);
        } else {
            // 載入預設里程碑
            milestones = getPresetMilestones(category);
            
            // 載入已完成的里程碑記錄
            const achievedMilestones = await getMilestoneRecords(currentChild.id, category);
            
            // 標記已完成的里程碑
            milestones = milestones.map(milestone => {
                const achieved = achievedMilestones.find(am => am.milestoneTitle === milestone.title);
                return achieved ? { ...milestone, achieved: true, achievedDate: achieved.achievedDate, notes: achieved.notes } : milestone;
            });
        }
        
        displayMilestones(milestones, category);
        
    } catch (error) {
        console.error(`載入${category}里程碑失敗:`, error);
        showNotification('載入里程碑失敗', 'error');
    }
};

const getPresetMilestones = (category) => {
    const presetMilestones = {
        motor: [
            { title: '抬頭', description: '趴著時能夠抬起頭部', expectedAge: '2-3個月' },
            { title: '翻身', description: '從仰躺翻轉到俯臥位', expectedAge: '4-6個月' },
            { title: '坐立', description: '無支撐獨自坐立', expectedAge: '6-8個月' },
            { title: '爬行', description: '匍匐前進或爬行', expectedAge: '7-10個月' },
            { title: '站立', description: '扶著東西站立', expectedAge: '8-12個月' },
            { title: '走路', description: '獨自行走', expectedAge: '12-15個月' },
            { title: '跑步', description: '能夠快速移動', expectedAge: '18-24個月' },
            { title: '跳躍', description: '雙腳離地跳躍', expectedAge: '24-30個月' }
        ],
        language: [
            { title: '發聲', description: '發出第一個聲音（非哭聲）', expectedAge: '1-2個月' },
            { title: '社交微笑', description: '對人微笑', expectedAge: '2-3個月' },
            { title: '牙牙學語', description: '發出ba、ma等音節', expectedAge: '4-6個月' },
            { title: '叫爸爸媽媽', description: '有意識地叫爸爸或媽媽', expectedAge: '8-12個月' },
            { title: '說第一個詞', description: '說出第一個有意義的詞語', expectedAge: '10-14個月' },
            { title: '詞彙10個', description: '能說出約10個詞語', expectedAge: '15-18個月' },
            { title: '簡單句子', description: '能說2-3個字的句子', expectedAge: '18-24個月' },
            { title: '詞彙50個', description: '能說出約50個詞語', expectedAge: '20-24個月' }
        ],
        social: [
            { title: '眼神接觸', description: '與人進行眼神接觸', expectedAge: '0-2個月' },
            { title: '社交微笑', description: '回應他人的微笑', expectedAge: '2-3個月' },
            { title: '認識照顧者', description: '能識別主要照顧者', expectedAge: '3-4個月' },
            { title: '陌生人焦慮', description: '對陌生人表現害怕', expectedAge: '6-8個月' },
            { title: '模仿動作', description: '模仿簡單的動作', expectedAge: '8-12個月' },
            { title: '分離焦慮', description: '與照顧者分離時哭泣', expectedAge: '8-18個月' },
            { title: '平行遊戲', description: '與其他孩子並排遊戲', expectedAge: '18-24個月' },
            { title: '協作遊戲', description: '與其他孩子互動遊戲', expectedAge: '24-36個月' }
        ],
        cognitive: [
            { title: '視覺追蹤', description: '用眼睛跟隨移動的物體', expectedAge: '2-3個月' },
            { title: '伸手抓取', description: '有意識地伸手抓取物品', expectedAge: '4-6個月' },
            { title: '物品恆存', description: '理解物品被遮蓋後仍存在', expectedAge: '8-12個月' },
            { title: '因果關係', description: '理解按按鈕會發出聲音等因果關係', expectedAge: '10-14個月' },
            { title: '形狀分類', description: '能將形狀放入對應的洞中', expectedAge: '15-18個月' },
            { title: '假想遊戲', description: '進行假裝遊戲', expectedAge: '18-24個月' },
            { title: '記憶遊戲', description: '記住物品的位置', expectedAge: '20-24個月' },
            { title: '顏色辨識', description: '能識別基本顏色', expectedAge: '24-30個月' }
        ],
        selfcare: [
            { title: '吸吮', description: '能夠有效吸吮', expectedAge: '0-1個月' },
            { title: '抓握', description: '能抓握物品', expectedAge: '3-4個月' },
            { title: '自己拿奶瓶', description: '能自己拿著奶瓶喝奶', expectedAge: '6-9個月' },
            { title: '手指食物', description: '能用手指拿食物吃', expectedAge: '8-10個月' },
            { title: '用杯子喝水', description: '能用杯子喝水', expectedAge: '12-15個月' },
            { title: '用湯匙吃東西', description: '能用湯匙自己吃東西', expectedAge: '15-18個月' },
            { title: '表達需要', description: '能表達如廁需要', expectedAge: '18-24個月' },
            { title: '脫簡單衣物', description: '能脫掉簡單的衣物', expectedAge: '20-24個月' }
        ]
    };
    
    return presetMilestones[category] || [];
};

const getMilestoneRecords = async (childId, category) => {
    try {
        const allRecords = await getByIndexFromDB('milestones', 'childId', childId);
        return allRecords.filter(record => record.category === category);
    } catch (error) {
        console.error('獲取里程碑記錄失敗:', error);
        return [];
    }
};

const getCustomMilestones = async (childId) => {
    try {
        const allRecords = await getByIndexFromDB('milestones', 'childId', childId);
        return allRecords.filter(record => record.isCustom === true);
    } catch (error) {
        console.error('獲取自訂里程碑失敗:', error);
        return [];
    }
};

const displayMilestones = (milestones, category) => {
    const milestoneList = document.getElementById('milestoneList');
    
    if (milestones.length === 0) {
        milestoneList.innerHTML = `
            <div class="no-milestones">
                <p>暫無${category === 'custom' ? '自訂' : ''}里程碑</p>
                ${category === 'custom' ? '<p>點擊上方的「自訂里程碑」按鈕新增</p>' : ''}
            </div>
        `;
        return;
    }
    
    milestoneList.innerHTML = milestones.map(milestone => `
        <div class="milestone-item ${milestone.achieved ? 'achieved' : ''}" data-milestone-title="${milestone.title}">
            <div class="milestone-header">
                <div class="milestone-title">${milestone.title}</div>
                ${milestone.expectedAge ? `<div class="milestone-age">${milestone.expectedAge}</div>` : ''}
            </div>
            <div class="milestone-description">${milestone.description}</div>
            <div class="milestone-status">
                ${milestone.achieved ? 
                    `<div class="milestone-achieved-date">✅ ${formatDate(milestone.achievedDate)}</div>` : 
                    ''
                }
                <div class="milestone-actions">
                    ${!milestone.achieved ? 
                        `<button class="milestone-action-btn" onclick="markMilestoneAchieved('${category}', '${milestone.title}')">標記為完成</button>` :
                        `<button class="milestone-action-btn" onclick="unmarkMilestone('${category}', '${milestone.title}')">取消完成</button>`
                    }
                    ${category === 'custom' ? 
                        `<button class="milestone-action-btn" onclick="deleteCustomMilestone(${milestone.id})">刪除</button>` : 
                        ''
                    }
                </div>
            </div>
            ${milestone.notes ? `<div class="milestone-notes">💭 ${milestone.notes}</div>` : ''}
        </div>
    `).join('');
};

const markMilestoneAchieved = async (category, milestoneTitle) => {
    try {
        const milestoneData = {
            childId: currentChild.id,
            category: category,
            milestoneTitle: milestoneTitle,
            achievedDate: new Date().toISOString(),
            notes: '',
            createdAt: new Date().toISOString()
        };
        
        // 可以添加備註的對話框
        const notes = prompt('新增備註（可選）:');
        if (notes !== null) {
            milestoneData.notes = notes;
        }
        
        await saveToDB('milestones', milestoneData);
        await loadMilestones(category);
        showNotification('里程碑已標記為完成');
        
    } catch (error) {
        console.error('標記里程碑失敗:', error);
        showNotification('標記失敗，請重試', 'error');
    }
};

const unmarkMilestone = async (category, milestoneTitle) => {
    try {
        const records = await getMilestoneRecords(currentChild.id, category);
        const record = records.find(r => r.milestoneTitle === milestoneTitle);
        
        if (record) {
            await deleteFromDB('milestones', record.id);
            await loadMilestones(category);
            showNotification('里程碑標記已取消');
        }
        
    } catch (error) {
        console.error('取消里程碑標記失敗:', error);
        showNotification('取消失敗，請重試', 'error');
    }
};

const openAddMilestoneModal = () => {
    const modal = document.getElementById('recordModal');
    const title = document.getElementById('recordModalTitle');
    const formContainer = document.getElementById('recordForm');
    
    title.textContent = '新增自訂里程碑';
    formContainer.innerHTML = `
        <div class="form-group">
            <label for="customMilestoneTitle">里程碑名稱 *</label>
            <input type="text" id="customMilestoneTitle" required>
        </div>
        <div class="form-group">
            <label for="customMilestoneDescription">描述</label>
            <textarea id="customMilestoneDescription" rows="3"></textarea>
        </div>
        <div class="form-group">
            <label for="customMilestoneExpectedAge">預期年齡</label>
            <input type="text" id="customMilestoneExpectedAge" placeholder="例如：6個月">
        </div>
        <div class="form-group">
            <label for="customMilestoneAchieved">
                <input type="checkbox" id="customMilestoneAchieved"> 已經達成
            </label>
        </div>
        <div id="achievedDateField" style="display: none;">
            <div class="form-group">
                <label for="customMilestoneAchievedDate">達成日期</label>
                <input type="datetime-local" id="customMilestoneAchievedDate">
            </div>
        </div>
        <div class="form-group">
            <label for="customMilestoneNotes">備註</label>
            <textarea id="customMilestoneNotes" rows="3"></textarea>
        </div>
    `;
    
    // 添加監聽器
    document.getElementById('customMilestoneAchieved').addEventListener('change', (e) => {
        const achievedDateField = document.getElementById('achievedDateField');
        achievedDateField.style.display = e.target.checked ? 'block' : 'none';
        
        if (e.target.checked) {
            document.getElementById('customMilestoneAchievedDate').value = new Date().toISOString().slice(0, 16);
        }
    });
    
    modal.classList.add('show');
    modal.dataset.recordType = 'custom-milestone';
};

const saveCustomMilestone = async () => {
    try {
        const isAchieved = document.getElementById('customMilestoneAchieved').checked;
        
        const milestoneData = {
            childId: currentChild.id,
            title: document.getElementById('customMilestoneTitle').value,
            description: document.getElementById('customMilestoneDescription').value,
            expectedAge: document.getElementById('customMilestoneExpectedAge').value,
            category: 'custom',
            isCustom: true,
            notes: document.getElementById('customMilestoneNotes').value,
            createdAt: new Date().toISOString()
        };
        
        if (isAchieved) {
            milestoneData.achievedDate = document.getElementById('customMilestoneAchievedDate').value;
        }
        
        await saveToDB('milestones', milestoneData);
        
        document.getElementById('recordModal').classList.remove('show');
        
        // 切換到自訂里程碑標籤
        switchMilestoneCategory('custom');
        
        showNotification('自訂里程碑已新增');
        
    } catch (error) {
        console.error('儲存自訂里程碑失敗:', error);
        showNotification('儲存失敗，請重試', 'error');
    }
};

const deleteCustomMilestone = async (milestoneId) => {
    const confirmMessage = '確定要刪除這個自訂里程碑嗎？';
    
    if (await showConfirmDialog(confirmMessage)) {
        try {
            await deleteFromDB('milestones', milestoneId);
            await loadMilestones('custom');
            showNotification('自訂里程碑已刪除');
        } catch (error) {
            console.error('刪除自訂里程碑失敗:', error);
            showNotification('刪除失敗，請重試', 'error');
        }
    }
};

// ===== 親子互動記錄 =====
const showInteractionSection = () => {
    hideAllSections();
    document.getElementById('interactionSection').style.display = 'block';
    loadInteractions();
};

const loadInteractions = async () => {
    if (!currentChild) return;
    
    try {
        const interactions = await getByIndexFromDB('interactions', 'childId', currentChild.id);
        const sortedInteractions = interactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const listElement = document.getElementById('interactionList');
        
        if (sortedInteractions.length === 0) {
            listElement.innerHTML = `
                <div class="no-interactions">
                    <p>暫無親子互動記錄</p>
                    <p>點擊上方的「新增互動記錄」按鈕開始記錄美好時光</p>
                </div>
            `;
            return;
        }
        
        listElement.innerHTML = sortedInteractions.map(interaction => 
            renderInteractionItem(interaction)
        ).join('');
        
    } catch (error) {
        console.error('載入親子互動記錄失敗:', error);
        showNotification('載入互動記錄失敗', 'error');
    }
};

const renderInteractionItem = (interaction) => {
    const moodEmojis = {
        happy: '😄',
        excited: '😆',
        calm: '😌',
        sleepy: '😴',
        fussy: '😫',
        crying: '😭',
        neutral: '😐'
    };
    
    return `
        <div class="interaction-item" data-interaction-id="${interaction.id}">
            <div class="interaction-actions">
                <button class="record-action-btn" onclick="editInteraction(${interaction.id})" title="編輯">✏️</button>
                <button class="record-action-btn" onclick="deleteInteraction(${interaction.id})" title="刪除">🗑️</button>
            </div>
            <div class="interaction-header">
                <div class="interaction-date">${formatDate(interaction.date, true)}</div>
                <div class="interaction-mood">
                    ${moodEmojis[interaction.mood] || '😊'} ${getMoodName(interaction.mood)}
                </div>
            </div>
            <div class="interaction-content">
                <h4>${interaction.title || '親子時光'}</h4>
                <p>${interaction.description || ''}</p>
                ${interaction.photos && interaction.photos.length > 0 ? `
                    <div class="interaction-photos">
                        ${interaction.photos.map(photo => 
                            `<img src="${photo}" alt="互動照片" class="interaction-photo">`
                        ).join('')}
                    </div>
                ` : ''}
            </div>
            ${interaction.notes ? `<div class="interaction-notes">💭 ${interaction.notes}</div>` : ''}
        </div>
    `;
};

const getMoodName = (mood) => {
    const moodNames = {
        happy: '開心',
        excited: '興奮',
        calm: '平靜',
        sleepy: '想睡',
        fussy: '煩躁',
        crying: '哭鬧',
        neutral: '平常'
    };
    return moodNames[mood] || '未知心情';
};

const openInteractionModal = (interaction = null) => {
    const modal = document.getElementById('recordModal');
    const title = document.getElementById('recordModalTitle');
    const formContainer = document.getElementById('recordForm');
    
    title.textContent = interaction ? '編輯親子互動記錄' : '新增親子互動記錄';
    
    const now = new Date();
    const currentDate = now.toISOString().slice(0, 16);
    
    formContainer.innerHTML = `
        <div class="form-group">
            <label for="interactionTitle">標題</label>
            <input type="text" id="interactionTitle" value="${interaction?.title || ''}" placeholder="今天的親子時光">
        </div>
        <div class="form-group">
            <label for="interactionDate">時間 *</label>
            <input type="datetime-local" id="interactionDate" value="${interaction?.date || currentDate}" required>
        </div>
        <div class="form-group">
            <label for="interactionMood">寶寶情緒 *</label>
            <select id="interactionMood" required>
                <option value="">請選擇</option>
                <option value="happy" ${interaction?.mood === 'happy' ? 'selected' : ''}>😄 開心</option>
                <option value="excited" ${interaction?.mood === 'excited' ? 'selected' : ''}>😆 興奮</option>
                <option value="calm" ${interaction?.mood === 'calm' ? 'selected' : ''}>😌 平靜</option>
                <option value="sleepy" ${interaction?.mood === 'sleepy' ? 'selected' : ''}>😴 想睡</option>
                <option value="fussy" ${interaction?.mood === 'fussy' ? 'selected' : ''}>😫 煩躁</option>
                <option value="crying" ${interaction?.mood === 'crying' ? 'selected' : ''}>😭 哭鬧</option>
                <option value="neutral" ${interaction?.mood === 'neutral' ? 'selected' : ''}>😐 平常</option>
            </select>
        </div>
        <div class="form-group">
            <label for="interactionDescription">互動描述</label>
            <textarea id="interactionDescription" rows="4" placeholder="描述今天和寶寶的互動情況...">${interaction?.description || ''}</textarea>
        </div>
        <div class="form-group">
            <label for="interactionPhotos">照片</label>
            <input type="file" id="interactionPhotos" accept="image/*" multiple>
            <div id="interactionPhotoPreview" class="photo-preview">
                ${interaction?.photos ? interaction.photos.map(photo => 
                    `<img src="${photo}" style="max-width: 100px; margin: 5px; border-radius: 8px;">`
                ).join('') : ''}
            </div>
        </div>
        <div class="form-group">
            <label for="interactionNotes">額外備註</label>
            <textarea id="interactionNotes" rows="2" placeholder="其他想記錄的事項...">${interaction?.notes || ''}</textarea>
        </div>
    `;
    
    modal.classList.add('show');
    modal.dataset.recordType = 'interaction';
    modal.dataset.recordId = interaction ? interaction.id : '';
};

const saveInteraction = async () => {
    const modal = document.getElementById('recordModal');
    const recordId = modal.dataset.recordId;
    
    try {
        const interactionData = {
            childId: currentChild.id,
            title: document.getElementById('interactionTitle').value,
            date: document.getElementById('interactionDate').value,
            mood: document.getElementById('interactionMood').value,
            description: document.getElementById('interactionDescription').value,
            notes: document.getElementById('interactionNotes').value,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // 處理照片
        const photoFiles = document.getElementById('interactionPhotos').files;
        if (photoFiles.length > 0) {
            interactionData.photos = [];
            for (const file of photoFiles) {
                const base64 = await convertImageToBase64(file);
                interactionData.photos.push(base64);
            }
        } else if (recordId) {
            // 編輯模式下保持原有照片
            const existingRecord = await getByIdFromDB('interactions', parseInt(recordId));
            if (existingRecord && existingRecord.photos) {
                interactionData.photos = existingRecord.photos;
            }
        }
        
        if (recordId) {
            // 編輯模式
            interactionData.id = parseInt(recordId);
            await updateInDB('interactions', interactionData);
            showNotification('親子互動記錄已更新');
        } else {
            // 新增模式
            await saveToDB('interactions', interactionData);
            showNotification('親子互動記錄已新增');
        }
        
        modal.classList.remove('show');
        await loadInteractions();
        
    } catch (error) {
        console.error('儲存親子互動記錄失敗:', error);
        showNotification('儲存失敗，請重試', 'error');
    }
};

const editInteraction = async (interactionId) => {
    try {
        const interaction = await getByIdFromDB('interactions', interactionId);
        if (interaction) {
            openInteractionModal(interaction);
        }
    } catch (error) {
        console.error('載入親子互動記錄失敗:', error);
        showNotification('載入記錄失敗', 'error');
    }
};

const deleteInteraction = async (interactionId) => {
    const confirmMessage = '確定要刪除這個親子互動記錄嗎？';
    
    if (await showConfirmDialog(confirmMessage)) {
        try {
            await deleteFromDB('interactions', interactionId);
            await loadInteractions();
            showNotification('親子互動記錄已刪除');
        } catch (error) {
            console.error('刪除親子互動記錄失敗:', error);
            showNotification('刪除失敗，請重試',