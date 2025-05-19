/*
 * 嬰幼兒照護追蹤助手 - JavaScript 主檔案
 * 功能包含：IndexedDB 資料庫操作、時區管理、記錄管理、統計圖表等
 * 支援多孩子管理、快速記錄、資料備份還原等功能
 */

// === 全域變數和配置 ===
let db;
let currentChild = null;
let currentTimezone = 'Asia/Taipei';
let charts = {};

// 預設里程碑數據
const defaultMilestones = {
    motor: [
        { id: 1, title: '抬頭', description: '趴著時能抬起頭部', ageMonths: 1 },
        { id: 2, title: '翻身', description: '從仰躺翻到趴著', ageMonths: 4 },
        { id: 3, title: '坐立', description: '不需要支撐就能坐著', ageMonths: 6 },
        { id: 4, title: '爬行', description: '用手和膝蓋爬行', ageMonths: 8 },
        { id: 5, title: '站立', description: '扶著物品站立', ageMonths: 9 },
        { id: 6, title: '走路', description: '獨立行走幾步', ageMonths: 12 },
        { id: 7, title: '跑步', description: '能夠跑步', ageMonths: 18 },
        { id: 8, title: '跳躍', description: '雙腳同時離地跳躍', ageMonths: 24 }
    ],
    language: [
        { id: 9, title: '社交微笑', description: '對人微笑回應', ageMonths: 2 },
        { id: 10, title: '咿咿呀呀', description: '發出咿咿呀呀的聲音', ageMonths: 4 },
        { id: 11, title: '叫爸爸媽媽', description: '有意義地叫爸爸或媽媽', ageMonths: 8 },
        { id: 12, title: '說第一個字', description: '說出第一個有意義的字', ageMonths: 12 },
        { id: 13, title: '說短句', description: '能說2-3個字的句子', ageMonths: 18 },
        { id: 14, title: '對話', description: '能進行簡單對話', ageMonths: 24 }
    ],
    social: [
        { id: 15, title: '眼神接觸', description: '與人有眼神接觸', ageMonths: 0.5 },
        { id: 16, title: '認識照顧者', description: '能分辨主要照顧者', ageMonths: 3 },
        { id: 17, title: '模仿動作', description: '模仿簡單動作', ageMonths: 6 },
        { id: 18, title: '揮手再見', description: '會揮手說再見', ageMonths: 9 },
        { id: 19, title: '分享', description: '願意分享玩具', ageMonths: 18 },
        { id: 20, title: '與同伴玩耍', description: '能與其他孩子一起玩', ageMonths: 24 }
    ],
    cognitive: [
        { id: 21, title: '追蹤物體', description: '眼睛能追蹤移動物體', ageMonths: 2 },
        { id: 22, title: '尋找聲音', description: '會轉頭尋找聲音來源', ageMonths: 4 },
        { id: 23, title: '意識到物體恆存', description: '知道藏起來的東西還在', ageMonths: 8 },
        { id: 24, title: '模仿動作', description: '模仿看到的動作', ageMonths: 12 },
        { id: 25, title: '解決問題', description: '嘗試解決簡單問題', ageMonths: 18 },
        { id: 26, title: '假裝遊戲', description: '進行假裝遊戲', ageMonths: 24 }
    ],
    selfCare: [
        { id: 27, title: '用杯子喝水', description: '能用杯子喝水', ageMonths: 12 },
        { id: 28, title: '自己餵食', description: '用手抓食物吃', ageMonths: 8 },
        { id: 29, title: '用湯匙', description: '嘗試使用湯匙', ageMonths: 15 },
        { id: 30, title: '刷牙', description: '嘗試自己刷牙', ageMonths: 18 },
        { id: 31, title: '如廁訓練', description: '表達如廁需求', ageMonths: 24 },
        { id: 32, title: '穿衣服', description: '嘗試自己穿衣服', ageMonths: 30 }
    ]
};

// 活動類型
const activityTypes = [
    { id: 'bath', name: '洗澡', icon: '🛁' },
    { id: 'massage', name: '按摩', icon: '👐' },
    { id: 'changing', name: '換衣/護理', icon: '👕' },
    { id: 'tummyTime', name: '趴趴時間', icon: '🤱' },
    { id: 'sensoryPlay', name: '感官遊戲', icon: '🧸' },
    { id: 'reading', name: '親子閱讀', icon: '📚' },
    { id: 'music', name: '音樂互動', icon: '🎵' },
    { id: 'walk', name: '散步/推車', icon: '🚼' },
    { id: 'sunbathe', name: '曬太陽', icon: '☀️' },
    { id: 'social', name: '社交互動', icon: '👥' },
    { id: 'custom', name: '自訂活動', icon: '✨' }
];

// === IndexedDB 資料庫操作 ===
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('BabyCareDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            
            // 建立物件存儲
            if (!db.objectStoreNames.contains('children')) {
                const childrenStore = db.createObjectStore('children', { keyPath: 'id', autoIncrement: true });
                childrenStore.createIndex('name', 'name', { unique: false });
            }
            
            if (!db.objectStoreNames.contains('records')) {
                const recordsStore = db.createObjectStore('records', { keyPath: 'id', autoIncrement: true });
                recordsStore.createIndex('childId', 'childId', { unique: false });
                recordsStore.createIndex('type', 'type', { unique: false });
                recordsStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
            
            if (!db.objectStoreNames.contains('milestones')) {
                const milestonesStore = db.createObjectStore('milestones', { keyPath: 'id', autoIncrement: true });
                milestonesStore.createIndex('childId', 'childId', { unique: false });
                milestonesStore.createIndex('category', 'category', { unique: false });
            }
            
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
            }
        };
    });
}

// 通用資料庫操作函數
function dbOperation(storeName, operation, data = null, index = null, query = null) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], operation === 'get' || operation === 'getAll' ? 'readonly' : 'readwrite');
        const store = transaction.objectStore(storeName);
        let request;
        
        switch (operation) {
            case 'add':
                request = store.add(data);
                break;
            case 'put':
                request = store.put(data);
                break;
            case 'delete':
                request = store.delete(data);
                break;
            case 'get':
                request = index ? store.index(index).get(query) : store.get(data);
                break;
            case 'getAll':
                request = index ? store.index(index).getAll(query) : store.getAll();
                break;
            case 'clear':
                request = store.clear();
                break;
            default:
                reject(new Error('Unknown operation'));
                return;
        }
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// === 時區處理函數 ===
function getCurrentDateTime() {
    return new Date().toLocaleString('zh-TW', { timeZone: currentTimezone });
}

function getCurrentTimestamp() {
    return new Date().getTime();
}

function formatDateTime(timestamp, format = 'full') {
    const date = new Date(timestamp);
    const options = { timeZone: currentTimezone };
    
    switch (format) {
        case 'date':
            return date.toLocaleDateString('zh-TW', options);
        case 'time':
            return date.toLocaleTimeString('zh-TW', options);
        case 'full':
            return date.toLocaleString('zh-TW', options);
        case 'iso':
            return date.toISOString();
        default:
            return date.toLocaleString('zh-TW', options);
    }
}

// === 工具函數 ===
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('show');
    modal.style.display = 'flex';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
    modal.style.display = 'none';
}

function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// === 孩子管理 ===
async function loadChildren() {
    try {
        const children = await dbOperation('children', 'getAll');
        updateChildTabs(children);
        
        if (children.length === 0) {
            showPage('welcomePage');
        } else {
            if (!currentChild) {
                currentChild = children[0];
            }
            showPage('dashboardPage');
            updateDashboard();
        }
    } catch (error) {
        console.error('載入孩子資料失敗:', error);
        showNotification('載入資料失敗', 'error');
    }
}

function updateChildTabs(children) {
    const childTabs = document.getElementById('childTabs');
    const addButton = childTabs.querySelector('.add-child-tab');
    
    // 清除現有的孩子標籤
    childTabs.innerHTML = '';
    
    // 重新加入孩子標籤
    children.forEach(child => {
        const tab = document.createElement('button');
        tab.className = 'child-tab';
        if (child === currentChild) {
            tab.classList.add('active');
        }
        tab.textContent = child.name;
        tab.onclick = () => switchChild(child);
        childTabs.appendChild(tab);
    });
    
    // 重新加入新增按鈕
    childTabs.appendChild(addButton);
}

function switchChild(child) {
    currentChild = child;
    updateChildTabs(await dbOperation('children', 'getAll'));
    updateDashboard();
    showNotification(`已切換到 ${child.name}`);
}

// 新增孩子
document.getElementById('addChildForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const photoFile = document.getElementById('childPhoto').files[0];
    let photoBase64 = null;
    
    if (photoFile) {
        photoBase64 = await fileToBase64(photoFile);
    }
    
    const child = {
        name: formData.get('childName'),
        birthdate: formData.get('childBirthdate'),
        gender: formData.get('childGender'),
        photo: photoBase64,
        notes: formData.get('childNotes'),
        createdAt: getCurrentTimestamp()
    };
    
    try {
        await dbOperation('children', 'add', child);
        await initDefaultMilestones(child.id);
        closeModal('addChildModal');
        e.target.reset();
        document.getElementById('childPhotoPreview').style.display = 'none';
        loadChildren();
        showNotification('孩子已新增成功！');
    } catch (error) {
        console.error('新增孩子失敗:', error);
        showNotification('新增孩子失敗', 'error');
    }
});

// 照片轉 Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// 照片預覽
document.getElementById('childPhoto').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const preview = document.getElementById('childPhotoPreview');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        preview.style.display = 'none';
    }
});

// === 記錄管理 ===
async function addRecord(type, data) {
    if (!currentChild) {
        showNotification('請先選擇孩子', 'error');
        return;
    }
    
    const record = {
        childId: currentChild.id,
        type: type,
        timestamp: getCurrentTimestamp(),
        data: data
    };
    
    try {
        await dbOperation('records', 'add', record);
        showNotification('記錄已儲存');
        updateDashboard();
        loadRecords();
    } catch (error) {
        console.error('新增記錄失敗:', error);
        showNotification('新增記錄失敗', 'error');
    }
}

async function loadRecords(filter = null) {
    if (!currentChild) return;
    
    try {
        const records = await dbOperation('records', 'getAll', null, 'childId', currentChild.id);
        const recordsList = document.getElementById('recordsList');
        const recentRecords = document.getElementById('recentRecords');
        
        // 篩選記錄
        let filteredRecords = records;
        if (filter && filter.type !== 'all') {
            filteredRecords = records.filter(record => record.type === filter.type);
        }
        if (filter && filter.date) {
            const filterDate = new Date(filter.date).toDateString();
            filteredRecords = filteredRecords.filter(record => {
                const recordDate = new Date(record.timestamp).toDateString();
                return recordDate === filterDate;
            });
        }
        
        // 顯示記錄列表
        recordsList.innerHTML = '';
        filteredRecords
            .sort((a, b) => b.timestamp - a.timestamp)
            .forEach(record => {
                const recordElement = createRecordElement(record);
                recordsList.appendChild(recordElement);
            });
        
        // 顯示最近記錄（儀表板）
        if (recentRecords) {
            recentRecords.innerHTML = '';
            records
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 5)
                .forEach(record => {
                    const recentElement = createRecentRecordElement(record);
                    recentRecords.appendChild(recentElement);
                });
        }
    } catch (error) {
        console.error('載入記錄失敗:', error);
        showNotification('載入記錄失敗', 'error');
    }
}

function createRecordElement(record) {
    const div = document.createElement('div');
    div.className = 'record-item';
    div.onclick = () => showRecordDetail(record);
    
    const typeNames = {
        feeding: '餵食',
        sleep: '睡眠',
        diaper: '尿布',
        health: '健康',
        milestone: '里程碑',
        interaction: '互動',
        activity: '活動'
    };
    
    div.innerHTML = `
        <div class="record-header">
            <span class="record-type ${record.type}">${typeNames[record.type] || record.type}</span>
            <span class="record-time">${formatDateTime(record.timestamp)}</span>
        </div>
        <div class="record-content">
            ${getRecordSummary(record)}
        </div>
    `;
    
    return div;
}

function createRecentRecordElement(record) {
    const div = document.createElement('div');
    div.className = 'recent-item';
    
    const typeNames = {
        feeding: '餵食',
        sleep: '睡眠',
        diaper: '尿布',
        health: '健康',
        milestone: '里程碑',
        interaction: '互動',
        activity: '活動'
    };
    
    div.innerHTML = `
        <div class="recent-item-type">${typeNames[record.type] || record.type}</div>
        <div class="recent-item-time">${formatDateTime(record.timestamp, 'time')}</div>
    `;
    
    return div;
}

function getRecordSummary(record) {
    const data = record.data;
    const type = record.type;
    
    switch (type) {
        case 'feeding':
            if (data.feedingType === 'breast') {
                const duration = data.endTime ? 
                    Math.round((new Date(data.endTime) - new Date(data.startTime)) / 1000 / 60) : 
                    '進行中';
                return `親餵 - ${data.side || ''} ${duration !== '進行中' ? duration + '分鐘' : duration}`;
            } else {
                return `${data.feedingType === 'formula' ? '配方奶' : '固體食物'} - ${data.amount || 0}${data.unit || 'ml'}`;
            }
        case 'sleep':
            if (data.endTime) {
                const duration = Math.round((new Date(data.endTime) - new Date(data.startTime)) / 1000 / 60 / 60 * 10) / 10;
                return `睡眠 ${duration} 小時`;
            } else {
                return '睡眠中...';
            }
        case 'diaper':
            const types = [];
            if (data.wet) types.push('尿濕');
            if (data.poop) types.push('大便');
            return `尿布 - ${types.join('+')}`;
        case 'health':
            return `${data.type || '健康記錄'} - ${data.details || ''}`;
        case 'milestone':
            return `里程碑：${data.title}`;
        case 'interaction':
            return `情緒：${data.mood || ''} ${data.notes || ''}`;
        case 'activity':
            const activity = activityTypes.find(a => a.id === data.activityType);
            return `${activity ? activity.name : data.activityType} ${data.notes || ''}`;
        default:
            return data.notes || '無詳細資訊';
    }
}

// === 快速記錄功能 ===
document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        showQuickRecord(action);
    });
});

function showQuickRecord(type) {
    if (!currentChild) {
        showNotification('請先選擇孩子', 'error');
        return;
    }
    
    const modal = document.getElementById('quickRecordModal');
    const title = document.getElementById('quickRecordTitle');
    const content = document.getElementById('quickRecordContent');
    
    const typeNames = {
        feeding: '餵食記錄',
        sleep: '睡眠記錄',
        diaper: '尿布記錄',
        health: '健康記錄'
    };
    
    title.textContent = typeNames[type] || '快速記錄';
    content.innerHTML = getQuickRecordForm(type);
    showModal('quickRecordModal');
}

function getQuickRecordForm(type) {
    switch (type) {
        case 'feeding':
            return `
                <form id="quickFeedingForm">
                    <div class="form-group">
                        <label>餵食類型</label>
                        <select id="feedingType" onchange="toggleFeedingFields()">
                            <option value="breast">親餵</option>
                            <option value="formula">配方奶</option>
                            <option value="solid">固體食物</option>
                        </select>
                    </div>
                    <div id="breastFields">
                        <div class="form-group">
                            <label>母乳位置</label>
                            <select id="breastSide">
                                <option value="left">左側</option>
                                <option value="right">右側</option>
                                <option value="both">雙側</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>開始時間</label>
                            <input type="datetime-local" id="feedingStartTime" required>
                        </div>
                        <div class="form-group">
                            <label>結束時間</label>
                            <input type="datetime-local" id="feedingEndTime">
                        </div>
                    </div>
                    <div id="otherFeedingFields" style="display: none;">
                        <div class="form-group">
                            <label>份量</label>
                            <input type="number" id="feedingAmount" min="0">
                        </div>
                        <div class="form-group">
                            <label>單位</label>
                            <select id="feedingUnit">
                                <option value="ml">毫升 (ml)</option>
                                <option value="oz">盎司 (oz)</option>
                                <option value="g">克 (g)</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>備註</label>
                        <textarea id="feedingNotes" rows="3"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="closeModal('quickRecordModal')">取消</button>
                        <button type="submit" class="btn-primary">儲存</button>
                    </div>
                </form>
            `;
        case 'sleep':
            return `
                <form id="quickSleepForm">
                    <div class="form-group">
                        <label>開始時間</label>
                        <input type="datetime-local" id="sleepStartTime" required>
                    </div>
                    <div class="form-group">
                        <label>結束時間</label>
                        <input type="datetime-local" id="sleepEndTime">
                    </div>
                    <div class="form-group">
                        <label>睡眠品質</label>
                        <select id="sleepQuality">
                            <option value="excellent">很好</option>
                            <option value="good">良好</option>
                            <option value="fair">普通</option>
                            <option value="poor">不佳</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>備註</label>
                        <textarea id="sleepNotes" rows="3"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="closeModal('quickRecordModal')">取消</button>
                        <button type="submit" class="btn-primary">儲存</button>
                    </div>
                </form>
            `;
        case 'diaper':
            return `
                <form id="quickDiaperForm">
                    <div class="form-group">
                        <label>尿布狀態</label>
                        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                            <label style="display: flex; align-items: center; gap: 8px;">
                                <input type="checkbox" id="diaperWet"> 尿濕
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px;">
                                <input type="checkbox" id="diaperPoop"> 大便
                            </label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>時間</label>
                        <input type="datetime-local" id="diaperTime" required>
                    </div>
                    <div class="form-group">
                        <label>備註</label>
                        <textarea id="diaperNotes" rows="3"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="closeModal('quickRecordModal')">取消</button>
                        <button type="submit" class="btn-primary">儲存</button>
                    </div>
                </form>
            `;
        case 'health':
            return `
                <form id="quickHealthForm">
                    <div class="form-group">
                        <label>健康記錄類型</label>
                        <select id="healthType">
                            <option value="vaccination">疫苗接種</option>
                            <option value="medication">用藥記錄</option>
                            <option value="illness">生病記錄</option>
                            <option value="checkup">健康檢查</option>
                            <option value="temperature">體溫測量</option>
                            <option value="other">其他</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>時間</label>
                        <input type="datetime-local" id="healthTime" required>
                    </div>
                    <div id="temperatureFields" style="display: none;">
                        <div class="form-group">
                            <label>體溫 (°C)</label>
                            <input type="number" id="temperature" step="0.1" min="35" max="42">
                        </div>
                        <div class="form-group">
                            <label>測量方式</label>
                            <select id="temperatureMethod">
                                <option value="oral">口溫</option>
                                <option value="rectal">肛溫</option>
                                <option value="armpit">腋溫</option>
                                <option value="ear">耳溫</option>
                                <option value="forehead">額溫</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>詳細描述</label>
                        <textarea id="healthDetails" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label>備註</label>
                        <textarea id="healthNotes" rows="2"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="closeModal('quickRecordModal')">取消</button>
                        <button type="submit" class="btn-primary">儲存</button>
                    </div>
                </form>
            `;
        default:
            return '<p>暫不支援此類型的快速記錄</p>';
    }
}

// 餵食類型切換
function toggleFeedingFields() {
    const feedingType = document.getElementById('feedingType').value;
    const breastFields = document.getElementById('breastFields');
    const otherFields = document.getElementById('otherFeedingFields');
    
    if (feedingType === 'breast') {
        breastFields.style.display = 'block';
        otherFields.style.display = 'none';
    } else {
        breastFields.style.display = 'none';
        otherFields.style.display = 'block';
    }
}

// 健康記錄類型切換
document.addEventListener('change', (e) => {
    if (e.target.id === 'healthType') {
        const temperatureFields = document.getElementById('temperatureFields');
        if (e.target.value === 'temperature') {
            temperatureFields.style.display = 'block';
        } else {
            temperatureFields.style.display = 'none';
        }
    }
});

// 處理快速記錄表單提交
document.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formId = e.target.id;
    
    switch (formId) {
        case 'quickFeedingForm':
            await handleFeedingSubmit(e);
            break;
        case 'quickSleepForm':
            await handleSleepSubmit(e);
            break;
        case 'quickDiaperForm':
            await handleDiaperSubmit(e);
            break;
        case 'quickHealthForm':
            await handleHealthSubmit(e);
            break;
    }
    
    closeModal('quickRecordModal');
});

async function handleFeedingSubmit(e) {
    const form = e.target;
    const feedingType = form.feedingType.value;
    
    let data = {
        feedingType: feedingType,
        notes: form.feedingNotes.value
    };
    
    if (feedingType === 'breast') {
        data.side = form.breastSide.value;
        data.startTime = form.feedingStartTime.value;
        data.endTime = form.feedingEndTime.value;
    } else {
        data.amount = parseFloat(form.feedingAmount.value) || 0;
        data.unit = form.feedingUnit.value;
    }
    
    await addRecord('feeding', data);
}

async function handleSleepSubmit(e) {
    const form = e.target;
    
    const data = {
        startTime: form.sleepStartTime.value,
        endTime: form.sleepEndTime.value,
        quality: form.sleepQuality.value,
        notes: form.sleepNotes.value
    };
    
    await addRecord('sleep', data);
}

async function handleDiaperSubmit(e) {
    const form = e.target;
    
    const data = {
        wet: form.diaperWet.checked,
        poop: form.diaperPoop.checked,
        time: form.diaperTime.value,
        notes: form.diaperNotes.value
    };
    
    await addRecord('diaper', data);
}

async function handleHealthSubmit(e) {
    const form = e.target;
    const healthType = form.healthType.value;
    
    let data = {
        type: healthType,
        time: form.healthTime.value,
        details: form.healthDetails.value,
        notes: form.healthNotes.value
    };
    
    if (healthType === 'temperature') {
        data.temperature = parseFloat(form.temperature.value);
        data.method = form.temperatureMethod.value;
    }
    
    await addRecord('health', data);
}

// === 里程碑管理 ===
async function initDefaultMilestones(childId) {
    const allMilestones = [
        ...defaultMilestones.motor.map(m => ({ ...m, category: 'motor' })),
        ...defaultMilestones.language.map(m => ({ ...m, category: 'language' })),
        ...defaultMilestones.social.map(m => ({ ...m, category: 'social' })),
        ...defaultMilestones.cognitive.map(m => ({ ...m, category: 'cognitive' })),
        ...defaultMilestones.selfCare.map(m => ({ ...m, category: 'selfCare' }))
    ];
    
    for (const milestone of allMilestones) {
        await dbOperation('milestones', 'add', {
            ...milestone,
            childId: childId,
            completed: false,
            completedDate: null,
            notes: ''
        });
    }
}

async function loadMilestones() {
    if (!currentChild) return;
    
    try {
        const milestones = await dbOperation('milestones', 'getAll', null, 'childId', currentChild.id);
        
        const categories = ['motor', 'language', 'social', 'cognitive', 'selfCare'];
        categories.forEach(category => {
            const container = document.getElementById(`${category}Milestones`);
            if (container) {
                container.innerHTML = '';
                
                milestones
                    .filter(m => m.category === category)
                    .sort((a, b) => a.ageMonths - b.ageMonths)
                    .forEach(milestone => {
                        const element = createMilestoneElement(milestone);
                        container.appendChild(element);
                    });
            }
        });
        
        // 載入自訂里程碑
        const customContainer = document.getElementById('customMilestones');
        if (customContainer) {
            customContainer.innerHTML = '';
            milestones
                .filter(m => m.category === 'custom')
                .forEach(milestone => {
                    const element = createMilestoneElement(milestone);
                    customContainer.appendChild(element);
                });
        }
    } catch (error) {
        console.error('載入里程碑失敗:', error);
    }
}

function createMilestoneElement(milestone) {
    const div = document.createElement('div');
    div.className = `milestone-item ${milestone.completed ? 'completed' : ''}`;
    div.onclick = () => toggleMilestone(milestone);
    
    div.innerHTML = `
        <div class="milestone-title">${milestone.title}</div>
        <div class="milestone-desc">${milestone.description}</div>
        <div class="milestone-age">預期年齡: ${milestone.ageMonths} 個月</div>
        ${milestone.completed && milestone.completedDate ? 
            `<div class="milestone-date">完成於: ${formatDateTime(milestone.completedDate, 'date')}</div>` : 
            ''}
    `;
    
    return div;
}

async function toggleMilestone(milestone) {
    const completed = !milestone.completed;
    const completedDate = completed ? getCurrentTimestamp() : null;
    
    const updatedMilestone = {
        ...milestone,
        completed,
        completedDate
    };
    
    try {
        await dbOperation('milestones', 'put', updatedMilestone);
        loadMilestones();
        
        if (completed) {
            // 新增里程碑記錄
            await addRecord('milestone', {
                milestoneId: milestone.id,
                title: milestone.title,
                category: milestone.category,
                notes: milestone.notes
            });
            showNotification(`恭喜！${milestone.title} 達成了！🎉`);
        }
    } catch (error) {
        console.error('更新里程碑失敗:', error);
        showNotification('更新里程碑失敗', 'error');
    }
}

// === 儀表板更新 ===
async function updateDashboard() {
    if (!currentChild) return;
    
    try {
        const records = await dbOperation('records', 'getAll', null, 'childId', currentChild.id);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayRecords = records.filter(record => 
            new Date(record.timestamp) >= today
        );
        
        // 更新今日統計
        const todayFeeding = todayRecords.filter(r => r.type === 'feeding').length;
        const todaySleep = todayRecords
            .filter(r => r.type === 'sleep' && r.data.endTime)
            .reduce((total, record) => {
                const duration = (new Date(record.data.endTime) - new Date(record.data.startTime)) / 1000 / 60 / 60;
                return total + duration;
            }, 0);
        const todayDiaper = todayRecords.filter(r => r.type === 'diaper').length;
        
        document.getElementById('todayFeeding').textContent = todayFeeding;
        document.getElementById('todaySleep').textContent = Math.round(todaySleep * 10) / 10;
        document.getElementById('todayDiaper').textContent = todayDiaper;
        
        // 載入最近記錄
        loadRecords();
        
        // 更新週統計圖表
        updateWeeklyChart(records);
    } catch (error) {
        console.error('更新儀表板失敗:', error);
    }
}

function updateWeeklyChart(records) {
    const canvas = document.getElementById('weeklyChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const weekDays = [];
    const feedingCounts = [];
    const sleepDurations = [];
    
    // 獲取過去7天的數據
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);
        
        const dayRecords = records.filter(record => 
            record.timestamp >= date.getTime() && 
            record.timestamp < nextDate.getTime()
        );
        
        weekDays.push(date.toLocaleDateString('zh-TW', { weekday: 'short' }));
        feedingCounts.push(dayRecords.filter(r => r.type === 'feeding').length);
        
        const sleepTime = dayRecords
            .filter(r => r.type === 'sleep' && r.data.endTime)
            .reduce((total, record) => {
                const duration = (new Date(record.data.endTime) - new Date(record.data.startTime)) / 1000 / 60 / 60;
                return total + duration;
            }, 0);
        sleepDurations.push(Math.round(sleepTime * 10) / 10);
    }
    
    // 清除舊圖表
    if (charts.weekly) {
        charts.weekly.destroy();
    }
    
    // 創建新圖表
    charts.weekly = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weekDays,
            datasets: [{
                label: '餵食次數',
                data: feedingCounts,
                borderColor: '#f48fb1',
                backgroundColor: 'rgba(244, 143, 177, 0.1)',
                tension: 0.4,
                yAxisID: 'y'
            }, {
                label: '睡眠時間 (小時)',
                data: sleepDurations,
                borderColor: '#9575cd',
                backgroundColor: 'rgba(149, 117, 205, 0.1)',
                tension: 0.4,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: '日期'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '餵食次數'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: '睡眠時間 (小時)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            }
        }
    });
}

// === 統計頁面 ===
async function updateStatistics() {
    if (!currentChild) return;
    
    const timeRange = document.getElementById('statsTimeRange').value;
    const records = await dbOperation('records', 'getAll', null, 'childId', currentChild.id);
    
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
        case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            break;
        case 'month':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            break;
        case '3months':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 3);
            break;
        case 'year':
            startDate = new Date(now);
            startDate.setFullYear(now.getFullYear() - 1);
            break;
    }
    
    const filteredRecords = records.filter(record => 
        record.timestamp >= startDate.getTime()
    );
    
    updateFeedingChart(filteredRecords);
    updateSleepChart(filteredRecords);
    updateDiaperChart(filteredRecords);
    updateWeightChart(filteredRecords);
}

function updateFeedingChart(records) {
    const canvas = document.getElementById('feedingChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const feedingRecords = records.filter(r => r.type === 'feeding');
    
    const typeData = {
        breast: 0,
        formula: 0,
        solid: 0
    };
    
    feedingRecords.forEach(record => {
        typeData[record.data.feedingType] = (typeData[record.data.feedingType] || 0) + 1;
    });
    
    if (charts.feeding) {
        charts.feeding.destroy();
    }
    
    charts.feeding = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['親餵', '配方奶', '固體食物'],
            datasets: [{
                data: [typeData.breast, typeData.formula, typeData.solid],
                backgroundColor: ['#f48fb1', '#ffb74d', '#81c784']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function updateSleepChart(records) {
    const canvas = document.getElementById('sleepChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const sleepRecords = records.filter(r => r.type === 'sleep' && r.data.endTime);
    
    const dailySleep = {};
    sleepRecords.forEach(record => {
        const date = new Date(record.timestamp).toDateString();
        const duration = (new Date(record.data.endTime) - new Date(record.data.startTime)) / 1000 / 60 / 60;
        dailySleep[date] = (dailySleep[date] || 0) + duration;
    });
    
    const labels = Object.keys(dailySleep).slice(-7);
    const data = labels.map(date => Math.round(dailySleep[date] * 10) / 10);
    
    if (charts.sleep) {
        charts.sleep.destroy();
    }
    
    charts.sleep = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.map(date => new Date(date).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })),
            datasets: [{
                label: '睡眠時間 (小時)',
                data: data,
                backgroundColor: '#9575cd'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '睡眠時間 (小時)'
                    }
                }
            }
        }
    });
}

function updateDiaperChart(records) {
    const canvas = document.getElementById('diaperChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const diaperRecords = records.filter(r => r.type === 'diaper');
    
    const typeData = {
        wet: 0,
        poop: 0,
        both: 0
    };
    
    diaperRecords.forEach(record => {
        if (record.data.wet && record.data.poop) {
            typeData.both++;
        } else if (record.data.wet) {
            typeData.wet++;
        } else if (record.data.poop) {
            typeData.poop++;
        }
    });
    
    if (charts.diaper) {
        charts.diaper.destroy();
    }
    
    charts.diaper = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['只有尿濕', '只有大便', '尿濕+大便'],
            datasets: [{
                data: [typeData.wet, typeData.poop, typeData.both],
                backgroundColor: ['#4fc3f7', '#ffab91', '#e57373']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function updateWeightChart(records) {
    const canvas = document.getElementById('weightChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const weightRecords = records
        .filter(r => r.type === 'health' && r.data.type === 'checkup' && r.data.weight)
        .sort((a, b) => a.timestamp - b.timestamp);
    
    const labels = weightRecords.map(record => 
        new Date(record.timestamp).toLocaleDateString('zh-TW')
    );
    const data = weightRecords.map(record => record.data.weight);
    
    if (charts.weight) {
        charts.weight.destroy();
    }
    
    charts.weight = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '體重 (kg)',
                data: data,
                borderColor: '#81c784',
                backgroundColor: 'rgba(129, 199, 132, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: '體重 (kg)'
                    }
                }
            }
        }
    });
}

// === 頁面切換 ===
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    
    // 更新導航狀態
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const navBtn = document.querySelector(`[data-page="${pageId.replace('Page', '')}"]`);
    if (navBtn) {
        navBtn.classList.add('active');
    }
    
    // 根據頁面載入對應數據
    switch (pageId) {
        case 'dashboardPage':
            updateDashboard();
            break;
        case 'recordsPage':
            loadRecords();
            break;
        case 'milestonesPage':
            loadMilestones();
            break;
        case 'statisticsPage':
            updateStatistics();
            break;
    }
}

// === 設定管理 ===
async function loadSettings() {
    try {
        const timezoneSettings = await dbOperation('settings', 'get', 'timezone');
        if (timezoneSettings) {
            currentTimezone = timezoneSettings.value;
            document.getElementById('timezoneSelect').value = currentTimezone;
        }
        
        const autoTimestamp = await dbOperation('settings', 'get', 'autoTimestamp');
        if (autoTimestamp) {
            document.getElementById('autoTimestamp').checked = autoTimestamp.value;
        }
        
        const showNotifications = await dbOperation('settings', 'get', 'showNotifications');
        if (showNotifications) {
            document.getElementById('showNotifications').checked = showNotifications.value;
        }
    } catch (error) {
        console.error('載入設定失敗:', error);
    }
}

async function saveSettings() {
    try {
        const timezone = document.getElementById('timezoneSelect').value;
        const autoTimestamp = document.getElementById('autoTimestamp').checked;
        const showNotifications = document.getElementById('showNotifications').checked;
        
        await dbOperation('settings', 'put', { key: 'timezone', value: timezone });
        await dbOperation('settings', 'put', { key: 'autoTimestamp', value: autoTimestamp });
        await dbOperation('settings', 'put', { key: 'showNotifications', value: showNotifications });
        
        currentTimezone = timezone;
        showNotification('設定已儲存');
    } catch (error) {
        console.error('儲存設定失敗:', error);
        showNotification('儲存設定失敗', 'error');
    }
}

// === 資料備份與還原 ===
async function exportData() {
    try {
        showLoading();
        
        const children = await dbOperation('children', 'getAll');
        const records = await dbOperation('records', 'getAll');
        const milestones = await dbOperation('milestones', 'getAll');
        const settings = await dbOperation('settings', 'getAll');
        
        const exportData = {
            version: '1.0',
            exportDate: getCurrentTimestamp(),
            children,
            records,
            milestones,
            settings
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `baby-care-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        hideLoading();
        showNotification('資料匯出成功');
    } catch (error) {
        console.error('匯出資料失敗:', error);
        hideLoading();
        showNotification('匯出資料失敗', 'error');
    }
}

async function importData(file) {
    try {
        showLoading();
        
        const text = await file.text();
        const importData = JSON.parse(text);
        
        if (!importData.version || !importData.children) {
            throw new Error('不正確的備份檔案格式');
        }
        
        // 確認是否要覆蓋現有資料
        if (!confirm('匯入資料將覆蓋現有資料，確定要繼續嗎？')) {
            hideLoading();
            return;
        }
        
        // 清除現有資料
        await dbOperation('children', 'clear');
        await dbOperation('records', 'clear');
        await dbOperation('milestones', 'clear');
        
        // 匯入新資料
        for (const child of importData.children) {
            await dbOperation('children', 'add', child);
        }
        
        for (const record of importData.records) {
            await dbOperation('records', 'add', record);
        }
        
        for (const milestone of importData.milestones) {
            await dbOperation('milestones', 'add', milestone);
        }
        
        if (importData.settings) {
            for (const setting of importData.settings) {
                await dbOperation('settings', 'put', setting);
            }
        }
        
        hideLoading();
        showNotification('資料匯入成功');
        
        // 重新載入應用
        location.reload();
    } catch (error) {
        console.error('匯入資料失敗:', error);
        hideLoading();
        showNotification('匯入資料失敗: ' + error.message, 'error');
    }
}

async function clearAllData() {
    if (!confirm('確定要清除所有資料嗎？此操作無法復原！')) {
        return;
    }
    
    if (!confirm('再次確認：這將刪除所有孩子資料、記錄和里程碑，確定要繼續嗎？')) {
        return;
    }
    
    try {
        showLoading();
        
        await dbOperation('children', 'clear');
        await dbOperation('records', 'clear');
        await dbOperation('milestones', 'clear');
        
        currentChild = null;
        
        hideLoading();
        showNotification('所有資料已清除');
        
        // 重新載入應用
        location.reload();
    } catch (error) {
        console.error('清除資料失敗:', error);
        hideLoading();
        showNotification('清除資料失敗', 'error');
    }
}

// === 主題切換 ===
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    
    showNotification(`已切換到${newTheme === 'dark' ? '深色' : '淺色'}主題`);
}

function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// === 事件監聽器 ===
document.addEventListener('DOMContentLoaded', async () => {
    // 初始化資料庫
    await initDB();
    
    // 初始化主題
    initTheme();
    
    // 載入設定
    await loadSettings();
    
    // 載入孩子資料
    await loadChildren();
    
    // 設定初始時間
    const currentTime = new Date().toISOString().slice(0, 16);
    document.querySelectorAll('input[type="datetime-local"]').forEach(input => {
        if (!input.value) {
            input.value = currentTime;
        }
    });
});

// 導航按鈕事件
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const page = btn.dataset.page + 'Page';
        showPage(page);
    });
});

// 模態管理
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeModal(e.target.id);
    }
});

// 頭部按鈕事件
document.getElementById('themeToggle').addEventListener('click', toggleTheme);
document.getElementById('settingsBtn').addEventListener('click', () => showModal('settingsModal'));
document.getElementById('backupBtn').addEventListener('click', exportData);
document.getElementById('showAddChildModal').addEventListener('click', () => showModal('addChildModal'));
document.getElementById('addChildTab').addEventListener('click', () => showModal('addChildModal'));

// 設定按鈕事件
document.getElementById('timezoneSelect').addEventListener('change', saveSettings);
document.getElementById('autoTimestamp').addEventListener('change', saveSettings);
document.getElementById('showNotifications').addEventListener('change', saveSettings);
document.getElementById('exportDataBtn').addEventListener('click', exportData);
document.getElementById('importDataBtn').addEventListener('click', () => {
    document.getElementById('importDataInput').click();
});
document.getElementById('importDataInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        importData(file);
    }
});
document.getElementById('clearDataBtn').addEventListener('click', clearAllData);

// 記錄篩選事件
document.getElementById('recordTypeFilter').addEventListener('change', () => {
    const filter = {
        type: document.getElementById('recordTypeFilter').value,
        date: document.getElementById('dateFilter').value
    };
    loadRecords(filter);
});

document.getElementById('dateFilter').addEventListener('change', () => {
    const filter = {
        type: document.getElementById('recordTypeFilter').value,
        date: document.getElementById('dateFilter').value
    };
    loadRecords(filter);
});

document.getElementById('clearFilters').addEventListener('click', () => {
    document.getElementById('recordTypeFilter').value = 'all';
    document.getElementById('dateFilter').value = '';
    loadRecords();
});

// 統計時間範圍切換
document.getElementById('statsTimeRange').addEventListener('change', updateStatistics);

// === 記錄詳情顯示 ===
function showRecordDetail(record) {
    const modal = document.getElementById('detailRecordModal');
    const title = document.getElementById('detailRecordTitle');
    const content = document.getElementById('detailRecordContent');
    
    const typeNames = {
        feeding: '餵食記錄',
        sleep: '睡眠記錄',
        diaper: '尿布記錄',
        health: '健康記錄',
        milestone: '里程碑記錄',
        interaction: '互動記錄',
        activity: '活動記錄'
    };
    
    title.textContent = typeNames[record.type] || '記錄詳情';
    content.innerHTML = getRecordDetailHTML(record);
    showModal('detailRecordModal');
}

function getRecordDetailHTML(record) {
    const data = record.data;
    const type = record.type;
    let html = `
        <div class="record-detail">
            <p><strong>記錄時間：</strong>${formatDateTime(record.timestamp)}</p>
    `;
    
    switch (type) {
        case 'feeding':
            html += `
                <p><strong>餵食類型：</strong>${
                    data.feedingType === 'breast' ? '親餵' :
                    data.feedingType === 'formula' ? '配方奶' : '固體食物'
                }</p>
                ${data.side ? `<p><strong>位置：</strong>${data.side === 'left' ? '左側' : data.side === 'right' ? '右側' : '雙側'}</p>` : ''}
                ${data.startTime ? `<p><strong>開始時間：</strong>${data.startTime}</p>` : ''}
                ${data.endTime ? `<p><strong>結束時間：</strong>${data.endTime}</p>` : ''}
                ${data.amount ? `<p><strong>份量：</strong>${data.amount} ${data.unit}</p>` : ''}
                ${data.notes ? `<p><strong>備註：</strong>${data.notes}</p>` : ''}
            `;
            break;
        case 'sleep':
            html += `
                ${data.startTime ? `<p><strong>開始時間：</strong>${data.startTime}</p>` : ''}
                ${data.endTime ? `<p><strong>結束時間：</strong>${data.endTime}</p>` : ''}
                ${data.quality ? `<p><strong>睡眠品質：</strong>${data.quality}</p>` : ''}
                ${data.notes ? `<p><strong>備註：</strong>${data.notes}</p>` : ''}
            `;
            break;
        case 'diaper':
            html += `
                <p><strong>狀態：</strong>${[
                    data.wet ? '尿濕' : null,
                    data.poop ? '大便' : null
                ].filter(Boolean).join(' + ')}</p>
                ${data.time ? `<p><strong>時間：</strong>${data.time}</p>` : ''}
                ${data.notes ? `<p><strong>備註：</strong>${data.notes}</p>` : ''}
            `;
            break;
        case 'health':
            html += `
                <p><strong>類型：</strong>${data.type}</p>
                ${data.time ? `<p><strong>時間：</strong>${data.time}</p>` : ''}
                ${data.temperature ? `<p><strong>體溫：</strong>${data.temperature}°C</p>` : ''}
                ${data.method ? `<p><strong>測量方式：</strong>${data.method}</p>` : ''}
                ${data.details ? `<p><strong>詳細描述：</strong>${data.details}</p>` : ''}
                ${data.notes ? `<p><strong>備註：</strong>${data.notes}</p>` : ''}
            `;
            break;
        default:
            html += `<p>${JSON.stringify(data, null, 2)}</p>`;
    }
    
    html += `
        </div>
        <div class="form-actions">
            <button class="btn-danger" onclick="deleteRecord(${record.id})">刪除記錄</button>
            <button class="btn-primary" onclick="closeModal('detailRecordModal')">關閉</button>
        </div>
    `;
    
    return html;
}

// 刪除記錄
async function deleteRecord(recordId) {
    if (!confirm('確定要刪除這筆記錄嗎？')) {
        return;
    }
    
    try {
        await dbOperation('records', 'delete', recordId);
        closeModal('detailRecordModal');
        loadRecords();
        updateDashboard();
        showNotification('記錄已刪除');
    } catch (error) {
        console.error('刪除記錄失敗:', error);
        showNotification('刪除記錄失敗', 'error');
    }
}