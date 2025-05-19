/**
 * Baby Care Tracker JavaScript
 * 寶寶照護追蹤器主要功能實現
 * 包含 IndexedDB 資料庫操作、時區管理、圖表生成等功能
 */

// 全域變數定義
let db; // IndexedDB 資料庫實例
let currentChildId = null; // 當前選中的孩子ID
let currentTimezone = 'Asia/Taipei'; // 當前時區
let charts = {}; // 圖表實例集合

// 資料庫配置
const DB_NAME = 'BabyCareTracker';
const DB_VERSION = 1;

// ObjectStore 名稱定義
const STORES = {
  CHILDREN: 'children',
  FEEDING: 'feeding',
  SLEEP: 'sleep',
  DIAPER: 'diaper',
  HEALTH: 'health',
  MILESTONES: 'milestones',
  ACTIVITIES: 'activities',
  INTERACTIONS: 'interactions',
  SETTINGS: 'settings'
};

// 預設設定
const DEFAULT_SETTINGS = {
  theme: 'light',
  timezone: 'Asia/Taipei',
  language: 'zh-TW'
};

// 性別對應表
const GENDER_MAP = {
  'male': '男',
  'female': '女'
};

// 餵食類型對應表
const FEEDING_TYPE_MAP = {
  'breastfeeding': '母乳',
  'formula': '配方奶',
  'solids': '副食品'
};

// 尿布類型對應表
const DIAPER_TYPE_MAP = {
  'wet': '濕尿布',
  'poop': '大便',
  'mixed': '混合'
};

// 健康記錄類型對應表
const HEALTH_TYPE_MAP = {
  'vaccination': '疫苗接種',
  'medication': '用藥記錄',
  'illness': '疾病記錄',
  'checkup': '健康檢查'
};

// 體溫測量方式對應表
const TEMP_METHOD_MAP = {
  'oral': '口溫',
  'rectal': '肛溫',
  'axillary': '腋溫',
  'forehead': '額溫',
  'ear': '耳溫'
};

// 里程碑類別對應表
const MILESTONE_CATEGORY_MAP = {
  'motor': '運動發展',
  'language': '語言發展',
  'social': '社交發展',
  'cognitive': '認知發展',
  'selfcare': '自理能力',
  'custom': '自訂'
};

// 活動類型對應表
const ACTIVITY_TYPE_MAP = {
  'bath': '洗澡',
  'massage': '按摩',
  'changing': '換衣服/護理',
  'tummy-time': '趴睡練習',
  'sensory-play': '感官遊戲',
  'reading': '親子閱讀',
  'music': '音樂互動',
  'walk': '散步/推車',
  'sunshine': '日光浴',
  'social': '社交互動',
  'custom': '自訂活動'
};

// 情緒狀態對應表
const EMOTIONAL_STATE_MAP = {
  'happy': '開心 😊',
  'calm': '平靜 😌',
  'excited': '興奮 😄',
  'sleepy': '想睡 😴',
  'cranky': '煩躁 😤',
  'crying': '哭泣 😢',
  'alert': '警覺 👀'
};

// 互動事件對應表
const INTERACTION_EVENT_MAP = {
  'playtime': '遊戲時間',
  'reading': '讀故事',
  'singing': '唱歌',
  'talking': '對話',
  'cuddling': '擁抱',
  'exercise': '運動時間',
  'learning': '學習活動',
  'other': '其他'
};

/**
 * 初始化應用程式
 */
async function initApp() {
  try {
    // 初始化資料庫
    await initDB();
    
    // 載入設定
    await loadSettings();
    
    // 初始化UI
    initUI();
    
    // 載入孩子列表
    await loadChildren();
    
    // 設定事件監聽器
    setupEventListeners();
    
    console.log('應用程式初始化完成');
  } catch (error) {
    console.error('初始化錯誤:', error);
    showNotification('初始化失敗，請重新整理頁面', 'error');
  }
}

/**
 * 初始化 IndexedDB 資料庫
 */
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      reject(new Error('無法開啟資料庫'));
    };
    
    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      db = event.target.result;
      
      // 創建 children store
      if (!db.objectStoreNames.contains(STORES.CHILDREN)) {
        const childrenStore = db.createObjectStore(STORES.CHILDREN, { keyPath: 'id', autoIncrement: true });
        childrenStore.createIndex('name', 'name', { unique: false });
      }
      
      // 創建其他 stores
      Object.values(STORES).forEach(storeName => {
        if (storeName !== STORES.CHILDREN && !db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
          store.createIndex('childId', 'childId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      });
      
      // 創建 settings store
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
    };
  });
}

/**
 * 載入應用設定
 */
async function loadSettings() {
  try {
    const settings = await getFromDB(STORES.SETTINGS, 'app_settings');
    if (settings) {
      currentTimezone = settings.value.timezone || DEFAULT_SETTINGS.timezone;
      const theme = settings.value.theme || DEFAULT_SETTINGS.theme;
      document.documentElement.setAttribute('data-theme', theme);
      document.getElementById('timezone-select').value = currentTimezone;
    } else {
      // 儲存預設設定
      await saveSettings(DEFAULT_SETTINGS);
    }
  } catch (error) {
    console.error('載入設定錯誤:', error);
  }
}

/**
 * 儲存應用設定
 */
async function saveSettings(settings) {
  try {
    await saveToDb(STORES.SETTINGS, {
      key: 'app_settings',
      value: settings,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('儲存設定錯誤:', error);
  }
}

/**
 * 初始化UI
 */
function initUI() {
  // 設定當前時間為預設值
  setCurrentDateTime();
  
  // 初始化主題
  updateThemeIcon();
}

/**
 * 設定當前時間為表單預設值
 */
function setCurrentDateTime() {
  const now = new Date();
  const currentDateTime = formatDateTimeForInput(now);
  
  // 設定所有 datetime-local 輸入框的預設值
  document.querySelectorAll('input[type="datetime-local"]').forEach(input => {
    if (!input.value) {
      input.value = currentDateTime;
    }
  });
  
  // 設定日期輸入框的預設值
  document.querySelectorAll('input[type="date"]').forEach(input => {
    if (!input.value) {
      input.value = formatDateForInput(now);
    }
  });
}

/**
 * 設定事件監聽器
 */
function setupEventListeners() {
  // 時區變更
  document.getElementById('timezone-select').addEventListener('change', handleTimezoneChange);
  
  // 主題切換
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  
  // 資料備份與還原
  document.getElementById('data-backup').addEventListener('click', exportData);
  document.getElementById('data-restore').addEventListener('click', () => {
    document.getElementById('restore-file').click();
  });
  document.getElementById('restore-file').addEventListener('change', importData);
  
  // 孩子管理
  document.getElementById('add-child-btn').addEventListener('click', () => openChildModal());
  document.getElementById('child-form').addEventListener('submit', handleChildSubmit);
  document.getElementById('edit-child-btn').addEventListener('click', () => openChildModal(currentChildId));
  document.getElementById('delete-child-btn').addEventListener('click', () => confirmDeleteChild());
  
  // 導航標籤
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
  });
  
  // 記錄新增按鈕
  document.getElementById('add-feeding-btn').addEventListener('click', () => openFeedingModal());
  document.getElementById('add-sleep-btn').addEventListener('click', () => openSleepModal());
  document.getElementById('add-diaper-btn').addEventListener('click', () => openDiaperModal());
  document.getElementById('add-health-btn').addEventListener('click', () => openHealthModal());
  document.getElementById('add-milestone-btn').addEventListener('click', () => openMilestoneModal());
  document.getElementById('add-activity-btn').addEventListener('click', () => openActivityModal());
  document.getElementById('add-interaction-btn').addEventListener('click', () => openInteractionModal());
  
  // 表單提交
  document.getElementById('feeding-form').addEventListener('submit', handleFeedingSubmit);
  document.getElementById('sleep-form').addEventListener('submit', handleSleepSubmit);
  document.getElementById('diaper-form').addEventListener('submit', handleDiaperSubmit);
  document.getElementById('health-form').addEventListener('submit', handleHealthSubmit);
  document.getElementById('milestone-form').addEventListener('submit', handleMilestoneSubmit);
  document.getElementById('activity-form').addEventListener('submit', handleActivitySubmit);
  document.getElementById('interaction-form').addEventListener('submit', handleInteractionSubmit);
  
  // 餵食類型變更監聽
  document.getElementById('feeding-type').addEventListener('change', handleFeedingTypeChange);
  
  // 健康記錄類型變更監聽
  document.getElementById('health-type').addEventListener('change', handleHealthTypeChange);
  
  // 活動類型變更監聽
  document.getElementById('activity-type').addEventListener('change', handleActivityTypeChange);
  
  // 照片上傳預覽
  document.getElementById('child-photo-input').addEventListener('change', (e) => previewPhoto(e, 'child-photo-preview'));
  document.getElementById('activity-photo').addEventListener('change', (e) => previewPhoto(e, 'activity-photo-preview'));
  document.getElementById('interaction-photo').addEventListener('change', (e) => previewPhoto(e, 'interaction-photo-preview'));
  
  // 模態框關閉
  document.querySelectorAll('.modal .close, .modal [id$="-cancel"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      closeModal(modal);
    });
  });
  
  // 模態框外部點擊關閉
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });
  
  // 確認刪除模態框
  document.getElementById('confirm-delete').addEventListener('click', executeConfirmedDelete);
  document.getElementById('confirm-cancel').addEventListener('click', () => {
    closeModal(document.getElementById('confirm-modal'));
  });
}

/**
 * 時區變更處理
 */
async function handleTimezoneChange(event) {
  currentTimezone = event.target.value;
  await saveSettings({
    theme: document.documentElement.getAttribute('data-theme'),
    timezone: currentTimezone,
    language: 'zh-TW'
  });
  
  // 重新載入當前孩子的資料
  if (currentChildId) {
    await loadChildData(currentChildId);
    updateDashboard();
  }
  
  showNotification('時區已更新', 'success');
}

/**
 * 主題切換
 */
async function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  updateThemeIcon();
  
  await saveSettings({
    theme: newTheme,
    timezone: currentTimezone,
    language: 'zh-TW'
  });
  
  showNotification('主題已切換', 'success');
}

/**
 * 更新主題圖示
 */
function updateThemeIcon() {
  const themeToggle = document.getElementById('theme-toggle');
  const currentTheme = document.documentElement.getAttribute('data-theme');
  themeToggle.textContent = currentTheme === 'dark' ? '☀️' : '🌓';
}

/**
 * 載入孩子列表
 */
async function loadChildren() {
  try {
    const children = await getAllFromDB(STORES.CHILDREN);
    const childTabs = document.getElementById('child-tabs');
    
    // 清除現有標籤（保留新增按鈕）
    const addBtn = childTabs.querySelector('.add-child-btn');
    childTabs.innerHTML = '';
    childTabs.appendChild(addBtn);
    
    // 添加孩子標籤
    children.forEach(child => {
      const tab = createChildTab(child);
      childTabs.insertBefore(tab, addBtn);
    });
    
    // 如果有孩子且沒有選中任何孩子，選中第一個
    if (children.length > 0 && !currentChildId) {
      selectChild(children[0].id);
    } else if (children.length === 0) {
      showNoChildMessage();
    }
  } catch (error) {
    console.error('載入孩子列表錯誤:', error);
    showNotification('載入孩子列表失敗', 'error');
  }
}

/**
 * 創建孩子標籤
 */
function createChildTab(child) {
  const tab = document.createElement('button');
  tab.className = 'child-tab';
  tab.dataset.childId = child.id;
  tab.textContent = child.name;
  tab.addEventListener('click', () => selectChild(child.id));
  return tab;
}

/**
 * 選擇孩子
 */
async function selectChild(childId) {
  try {
    currentChildId = childId;
    
    // 更新標籤狀態
    document.querySelectorAll('.child-tab').forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.childId == childId) {
        tab.classList.add('active');
      }
    });
    
    // 載入孩子資料
    await loadChildData(childId);
    
    // 顯示孩子內容區域
    document.getElementById('no-child-message').style.display = 'none';
    document.getElementById('child-content').style.display = 'block';
    
    // 更新儀表板
    updateDashboard();
  } catch (error) {
    console.error('選擇孩子錯誤:', error);
    showNotification('載入孩子資料失敗', 'error');
  }
}

/**
 * 載入孩子資料
 */
async function loadChildData(childId) {
  try {
    const child = await getFromDB(STORES.CHILDREN, childId);
    if (!child) {
      throw new Error('找不到孩子資料');
    }
    
    // 更新個人檔案顯示
    updateChildProfile(child);
    
    // 載入各類記錄
    await loadAllRecords(childId);
  } catch (error) {
    console.error('載入孩子資料錯誤:', error);
    throw error;
  }
}

/**
 * 更新孩子個人檔案顯示
 */
function updateChildProfile(child) {
  document.getElementById('child-name').textContent = child.name;
  document.getElementById('child-gender').textContent = GENDER_MAP[child.gender] || child.gender;
  document.getElementById('child-birthday').textContent = formatDate(new Date(child.birthday));
  document.getElementById('child-notes').textContent = child.notes || '無';
  document.getElementById('child-age').textContent = calculateAge(child.birthday);
  
  // 更新照片
  const photoElement = document.getElementById('child-photo');
  const placeholderElement = document.getElementById('photo-placeholder');
  
  if (child.photo) {
    photoElement.src = child.photo;
    photoElement.style.display = 'block';
    placeholderElement.style.display = 'none';
  } else {
    photoElement.style.display = 'none';
    placeholderElement.style.display = 'flex';
  }
}

/**
 * 計算年齡
 */
function calculateAge(birthday) {
  const birth = new Date(birthday);
  const now = new Date();
  const diffTime = Math.abs(now - birth);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 30) {
    return `${diffDays} 天`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    const days = diffDays % 30;
    return `${months} 個月 ${days} 天`;
  } else {
    const years = Math.floor(diffDays / 365);
    const remainingDays = diffDays % 365;
    const months = Math.floor(remainingDays / 30);
    return `${years} 歲 ${months} 個月`;
  }
}

/**
 * 載入所有記錄
 */
async function loadAllRecords(childId) {
  try {
    await Promise.all([
      loadFeedingRecords(childId),
      loadSleepRecords(childId),
      loadDiaperRecords(childId),
      loadHealthRecords(childId),
      loadMilestones(childId),
      loadActivityRecords(childId),
      loadInteractionRecords(childId)
    ]);
  } catch (error) {
    console.error('載入記錄錯誤:', error);
    throw error;
  }
}

/**
 * 載入餵食記錄
 */
async function loadFeedingRecords(childId) {
  try {
    const records = await getRecordsByChildId(STORES.FEEDING, childId);
    const container = document.getElementById('feeding-records');
    
    if (records.length === 0) {
      container.innerHTML = createEmptyState('🍼', '尚無餵食記錄', '開始記錄寶寶的餵食時間吧');
      return;
    }
    
    container.innerHTML = records.map(record => createFeedingRecordCard(record)).join('');
  } catch (error) {
    console.error('載入餵食記錄錯誤:', error);
    throw error;
  }
}

/**
 * 創建餵食記錄卡片
 */
function createFeedingRecordCard(record) {
  const type = FEEDING_TYPE_MAP[record.type] || record.type;
  const startTime = formatDateTime(new Date(record.startTime));
  let timeInfo = `開始時間：${startTime}`;
  
  if (record.endTime) {
    const endTime = formatDateTime(new Date(record.endTime));
    const duration = calculateDuration(record.startTime, record.endTime);
    timeInfo += `<br>結束時間：${endTime}<br>持續時間：${duration}`;
  }
  
  if (record.quantity) {
    timeInfo += `<br>份量：${record.quantity} ${record.unit || 'ml'}`;
  }
  
  return `
    <div class="record-card">
      <div class="record-header">
        <div class="record-title">${type}</div>
        <div class="record-time">${formatDateTime(new Date(record.startTime))}</div>
      </div>
      <div class="record-content">
        ${timeInfo}
        ${record.notes ? `<br><strong>備註：</strong>${record.notes}` : ''}
      </div>
      <div class="record-actions">
        <button class="btn btn-primary" onclick="editFeedingRecord(${record.id})">編輯</button>
        <button class="btn btn-danger" onclick="deleteFeedingRecord(${record.id})">刪除</button>
      </div>
    </div>
  `;
}

/**
 * 載入睡眠記錄
 */
async function loadSleepRecords(childId) {
  try {
    const records = await getRecordsByChildId(STORES.SLEEP, childId);
    const container = document.getElementById('sleep-records');
    
    if (records.length === 0) {
      container.innerHTML = createEmptyState('😴', '尚無睡眠記錄', '開始記錄寶寶的睡眠時間吧');
      return;
    }
    
    container.innerHTML = records.map(record => createSleepRecordCard(record)).join('');
  } catch (error) {
    console.error('載入睡眠記錄錯誤:', error);
    throw error;
  }
}

/**
 * 創建睡眠記錄卡片
 */
function createSleepRecordCard(record) {
  const startTime = formatDateTime(new Date(record.startTime));
  const endTime = formatDateTime(new Date(record.endTime));
  const duration = calculateDuration(record.startTime, record.endTime);
  
  return `
    <div class="record-card">
      <div class="record-header">
        <div class="record-title">睡眠</div>
        <div class="record-time">${startTime}</div>
      </div>
      <div class="record-content">
        開始時間：${startTime}<br>
        結束時間：${endTime}<br>
        持續時間：${duration}
        ${record.notes ? `<br><strong>備註：</strong>${record.notes}` : ''}
      </div>
      <div class="record-actions">
        <button class="btn btn-primary" onclick="editSleepRecord(${record.id})">編輯</button>
        <button class="btn btn-danger" onclick="deleteSleepRecord(${record.id})">刪除</button>
      </div>
    </div>
  `;
}

/**
 * 載入尿布記錄
 */
async function loadDiaperRecords(childId) {
  try {
    const records = await getRecordsByChildId(STORES.DIAPER, childId);
    const container = document.getElementById('diaper-records');
    
    if (records.length === 0) {
      container.innerHTML = createEmptyState('🧷', '尚無尿布記錄', '開始記錄寶寶的尿布更換時間吧');
      return;
    }
    
    container.innerHTML = records.map(record => createDiaperRecordCard(record)).join('');
  } catch (error) {
    console.error('載入尿布記錄錯誤:', error);
    throw error;
  }
}

/**
 * 創建尿布記錄卡片
 */
function createDiaperRecordCard(record) {
  const type = DIAPER_TYPE_MAP[record.type] || record.type;
  const time = formatDateTime(new Date(record.time));
  
  return `
    <div class="record-card">
      <div class="record-header">
        <div class="record-title">${type}</div>
        <div class="record-time">${time}</div>
      </div>
      <div class="record-content">
        更換時間：${time}
        ${record.notes ? `<br><strong>備註：</strong>${record.notes}` : ''}
      </div>
      <div class="record-actions">
        <button class="btn btn-primary" onclick="editDiaperRecord(${record.id})">編輯</button>
        <button class="btn btn-danger" onclick="deleteDiaperRecord(${record.id})">刪除</button>
      </div>
    </div>
  `;
}

/**
 * 載入健康記錄
 */
async function loadHealthRecords(childId) {
  try {
    const records = await getRecordsByChildId(STORES.HEALTH, childId);
    const container = document.getElementById('health-records');
    
    if (records.length === 0) {
      container.innerHTML = createEmptyState('🏥', '尚無健康記錄', '開始記錄寶寶的健康狀況吧');
      return;
    }
    
    container.innerHTML = records.map(record => createHealthRecordCard(record)).join('');
  } catch (error) {
    console.error('載入健康記錄錯誤:', error);
    throw error;
  }
}

/**
 * 創建健康記錄卡片
 */
function createHealthRecordCard(record) {
  const type = HEALTH_TYPE_MAP[record.type] || record.type;
  const date = formatDateTime(new Date(record.date));
  
  let content = `記錄時間：${date}<br>詳細資訊：${record.details}`;
  
  if (record.temperature) {
    const method = TEMP_METHOD_MAP[record.temperatureMethod] || record.temperatureMethod;
    content += `<br>體溫：${record.temperature}°C (${method})`;
  }
  
  return `
    <div class="record-card">
      <div class="record-header">
        <div class="record-title">${type}</div>
        <div class="record-time">${date}</div>
      </div>
      <div class="record-content">
        ${content}
        ${record.notes ? `<br><strong>備註：</strong>${record.notes}` : ''}
      </div>
      <div class="record-actions">
        <button class="btn btn-primary" onclick="editHealthRecord(${record.id})">編輯</button>
        <button class="btn btn-danger" onclick="deleteHealthRecord(${record.id})">刪除</button>
      </div>
    </div>
  `;
}

/**
 * 載入里程碑記錄
 */
async function loadMilestones(childId) {
  try {
    const milestones = await getRecordsByChildId(STORES.MILESTONES, childId);
    
    // 按類別分組
    const groupedMilestones = milestones.reduce((acc, milestone) => {
      const category = milestone.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(milestone);
      return acc;
    }, {});
    
    // 更新各類別的里程碑顯示
    Object.keys(MILESTONE_CATEGORY_MAP).forEach(category => {
      const container = document.getElementById(`${category}-milestones`);
      const categoryMilestones = groupedMilestones[category] || [];
      
      if (categoryMilestones.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-message">尚無里程碑記錄</div></div>';
        return;
      }
      
      container.innerHTML = categoryMilestones.map(milestone => createMilestoneCard(milestone)).join('');
    });
  } catch (error) {
    console.error('載入里程碑記錄錯誤:', error);
    throw error;
  }
}

/**
 * 創建里程碑卡片
 */
function createMilestoneCard(milestone) {
  const date = formatDate(new Date(milestone.date));
  
  return `
    <div class="milestone-item">
      <div class="milestone-name">${milestone.name}</div>
      <div class="milestone-date">${date}</div>
      ${milestone.notes ? `<div class="milestone-notes">${milestone.notes}</div>` : ''}
      <div class="milestone-actions" style="margin-top: 8px;">
        <button class="btn btn-primary" style="font-size: 0.8rem; padding: 4px 8px;" onclick="editMilestone(${milestone.id})">編輯</button>
        <button class="btn btn-danger" style="font-size: 0.8rem; padding: 4px 8px;" onclick="deleteMilestone(${milestone.id})">刪除</button>
      </div>
    </div>
  `;
}

/**
 * 載入活動記錄
 */
async function loadActivityRecords(childId) {
  try {
    const records = await getRecordsByChildId(STORES.ACTIVITIES, childId);
    const container = document.getElementById('activity-records');
    
    if (records.length === 0) {
      container.innerHTML = createEmptyState('🎈', '尚無活動記錄', '開始記錄寶寶的日常活動吧');
      return;
    }
    
    container.innerHTML = records.map(record => createActivityRecordCard(record)).join('');
  } catch (error) {
    console.error('載入活動記錄錯誤:', error);
    throw error;
  }
}

/**
 * 創建活動記錄卡片
 */
function createActivityRecordCard(record) {
  const type = record.customName || ACTIVITY_TYPE_MAP[record.type] || record.type;
  const startTime = formatDateTime(new Date(record.startTime));
  
  return `
    <div class="record-card">
      <div class="record-header">
        <div class="record-title">${type}</div>
        <div class="record-time">${startTime}</div>
      </div>
      <div class="record-content">
        開始時間：${startTime}<br>
        持續時間：${record.duration} 分鐘
        ${record.photo ? '<br><img src="' + record.photo + '" style="max-width: 200px; margin-top: 8px; border-radius: 8px;">' : ''}
        ${record.notes ? `<br><strong>備註：</strong>${record.notes}` : ''}
      </div>
      <div class="record-actions">
        <button class="btn btn-primary" onclick="editActivityRecord(${record.id})">編輯</button>
        <button class="btn btn-danger" onclick="deleteActivityRecord(${record.id})">刪除</button>
      </div>
    </div>
  `;
}

/**
 * 載入互動記錄
 */
async function loadInteractionRecords(childId) {
  try {
    const records = await getRecordsByChildId(STORES.INTERACTIONS, childId);
    const container = document.getElementById('interaction-records');
    
    if (records.length === 0) {
      container.innerHTML = createEmptyState('💕', '尚無互動記錄', '開始記錄與寶寶的互動時光吧');
      return;
    }
    
    container.innerHTML = records.map(record => createInteractionRecordCard(record)).join('');
  } catch (error) {
    console.error('載入互動記錄錯誤:', error);
    throw error;
  }
}

/**
 * 創建互動記錄卡片
 */
function createInteractionRecordCard(record) {
  const time = formatDateTime(new Date(record.time));
  const emotionalState = EMOTIONAL_STATE_MAP[record.emotionalState] || record.emotionalState;
  const event = record.event ? (INTERACTION_EVENT_MAP[record.event] || record.event) : '';
  
  return `
    <div class="record-card">
      <div class="record-header">
        <div class="record-title">親子互動</div>
        <div class="record-time">${time}</div>
      </div>
      <div class="record-content">
        時間：${time}<br>
        情緒狀態：${emotionalState}
        ${event ? `<br>互動事件：${event}` : ''}
        ${record.photo ? '<br><img src="' + record.photo + '" style="max-width: 200px; margin-top: 8px; border-radius: 8px;">' : ''}
        ${record.notes ? `<br><strong>詳細記錄：</strong>${record.notes}` : ''}
      </div>
      <div class="record-actions">
        <button class="btn btn-primary" onclick="editInteractionRecord(${record.id})">編輯</button>
        <button class="btn btn-danger" onclick="deleteInteractionRecord(${record.id})">刪除</button>
      </div>
    </div>
  `;
}

/**
 * 創建空狀態顯示
 */
function createEmptyState(icon, message, description) {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <div class="empty-message">${message}</div>
      <div class="empty-description">${description}</div>
    </div>
  `;
}

/**
 * 顯示沒有孩子的訊息
 */
function showNoChildMessage() {
  document.getElementById('no-child-message').style.display = 'block';
  document.getElementById('child-content').style.display = 'none';
}

/**
 * 切換標籤頁
 */
function switchTab(tabName) {
  // 更新標籤狀態
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  
  // 顯示對應內容
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`${tabName}-tab`).classList.add('active');
  
  // 如果是儀表板標籤，更新圖表
  if (tabName === 'dashboard') {
    updateDashboard();
  }
}

/**
 * 更新儀表板
 */
async function updateDashboard() {
  if (!currentChildId) return;
  
  try {
    await Promise.all([
      updateTodayStats(),
      updateCharts()
    ]);
  } catch (error) {
    console.error('更新儀表板錯誤:', error);
  }
}

/**
 * 更新今日統計
 */
async function updateTodayStats() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  
  try {
    // 餵食次數
    const feedingRecords = await getRecordsByDateRange(STORES.FEEDING, currentChildId, startOfDay, endOfDay);
    document.getElementById('today-feeding-count').textContent = feedingRecords.length;
    
    // 睡眠時間
    const sleepRecords = await getRecordsByDateRange(STORES.SLEEP, currentChildId, startOfDay, endOfDay);
    const totalSleepMinutes = sleepRecords.reduce((total, record) => {
      if (record.endTime) {
        const duration = Math.round((new Date(record.endTime) - new Date(record.startTime)) / (1000 * 60));
        return total + duration;
      }
      return total;
    }, 0);
    const sleepHours = Math.floor(totalSleepMinutes / 60);
    const sleepMinutes = totalSleepMinutes % 60;
    document.getElementById('today-sleep-duration').textContent = `${sleepHours}小時${sleepMinutes}分鐘`;
    
    // 尿布更換次數
    const diaperRecords = await getRecordsByDateRange(STORES.DIAPER, currentChildId, startOfDay, endOfDay);
    document.getElementById('today-diaper-count').textContent = diaperRecords.length;
    
    // 活動次數
    const activityRecords = await getRecordsByDateRange(STORES.ACTIVITIES, currentChildId, startOfDay, endOfDay);
    document.getElementById('today-activity-count').textContent = activityRecords.length;
  } catch (error) {
    console.error('更新今日統計錯誤:', error);
  }
}

/**
 * 更新圖表
 */
async function updateCharts() {
  try {
    await Promise.all([
      updateFeedingChart(),
      updateSleepChart(),
      updateDiaperChart()
    ]);
  } catch (error) {
    console.error('更新圖表錯誤:', error);
  }
}

/**
 * 更新餵食圖表
 */
async function updateFeedingChart() {
  const canvas = document.getElementById('feeding-chart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // 銷毀現有圖表
  if (charts.feeding) {
    charts.feeding.destroy();
  }
  
  // 獲取最近7天的餵食資料
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6);
  
  const records = await getRecordsByDateRange(STORES.FEEDING, currentChildId, startDate, endDate);
  
  // 按日期分組餵食記錄
  const dailyFeedings = {};
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateKey = formatDate(date);
    dailyFeedings[dateKey] = 0;
  }
  
  records.forEach(record => {
    const date = formatDate(new Date(record.startTime));
    if (dailyFeedings.hasOwnProperty(date)) {
      dailyFeedings[date]++;
    }
  });
  
  const labels = Object.keys(dailyFeedings);
  const data = Object.values(dailyFeedings);
  
  charts.feeding = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: '餵食次數',
        data: data,
        borderColor: '#FF9999',
        backgroundColor: 'rgba(255, 153, 153, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
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
  });
}

/**
 * 更新睡眠圖表
 */
async function updateSleepChart() {
  const canvas = document.getElementById('sleep-chart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // 銷毀現有圖表
  if (charts.sleep) {
    charts.sleep.destroy();
  }
  
  // 獲取最近7天的睡眠資料
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6);
  
  const records = await getRecordsByDateRange(STORES.SLEEP, currentChildId, startDate, endDate);
  
  // 按日期分組睡眠記錄並計算總時長
  const dailySleep = {};
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateKey = formatDate(date);
    dailySleep[dateKey] = 0;
  }
  
  records.forEach(record => {
    if (record.endTime) {
      const date = formatDate(new Date(record.startTime));
      if (dailySleep.hasOwnProperty(date)) {
        const duration = Math.round((new Date(record.endTime) - new Date(record.startTime)) / (1000 * 60 * 60 * 100)) / 100;
        dailySleep[date] += duration;
      }
    }
  });
  
  const labels = Object.keys(dailySleep);
  const data = Object.values(dailySleep);
  
  charts.sleep = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: '睡眠時間（小時）',
        data: data,
        backgroundColor: 'rgba(135, 206, 235, 0.7)',
        borderColor: '#87CEEB',
        borderWidth: 2
      }]
    },
    options: {
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
  });
}

/**
 * 更新尿布圖表
 */
async function updateDiaperChart() {
  const canvas = document.getElementById('diaper-chart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // 銷毀現有圖表
  if (charts.diaper) {
    charts.diaper.destroy();
  }
  
  // 獲取最近7天的尿布資料
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6);
  
  const records = await getRecordsByDateRange(STORES.DIAPER, currentChildId, startDate, endDate);
  
  // 按日期和類型分組尿布記錄
  const dailyDiapers = {};
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateKey = formatDate(date);
    dailyDiapers[dateKey] = { wet: 0, poop: 0, mixed: 0 };
  }
  
  records.forEach(record => {
    const date = formatDate(new Date(record.time));
    if (dailyDiapers.hasOwnProperty(date)) {
      dailyDiapers[date][record.type]++;
    }
  });
  
  const labels = Object.keys(dailyDiapers);
  const wetData = labels.map(date => dailyDiapers[date].wet);
  const poopData = labels.map(date => dailyDiapers[date].poop);
  const mixedData = labels.map(date => dailyDiapers[date].mixed);
  
  charts.diaper = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: '濕尿布',
          data: wetData,
          backgroundColor: 'rgba(152, 251, 152, 0.7)',
          borderColor: '#98FB98',
          borderWidth: 2
        },
        {
          label: '大便',
          data: poopData,
          backgroundColor: 'rgba(255, 228, 181, 0.7)',
          borderColor: '#FFE4B5',
          borderWidth: 2
        },
        {
          label: '混合',
          data: mixedData,
          backgroundColor: 'rgba(255, 182, 193, 0.7)',
          borderColor: '#FFB6C1',
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

/**
 * 開啟孩子模態框
 */
function openChildModal(childId = null) {
  const modal = document.getElementById('child-modal');
  const title = document.getElementById('child-modal-title');
  const form = document.getElementById('child-form');
  const preview = document.getElementById('child-photo-preview');
  
  // 重設表單
  form.reset();
  preview.innerHTML = '';
  
  if (childId) {
    title.textContent = '編輯孩子';
    loadChildForEdit(childId);
  } else {
    title.textContent = '新增孩子';
    setCurrentDateTime();
  }
  
  showModal(modal);
}

/**
 * 載入孩子資料供編輯
 */
async function loadChildForEdit(childId) {
  try {
    const child = await getFromDB(STORES.CHILDREN, childId);
    if (!child) return;
    
    document.getElementById('child-name-input').value = child.name;
    document.getElementById('child-gender-input').value = child.gender;
    document.getElementById('child-birthday-input').value = formatDateForInput(new Date(child.birthday));
    document.getElementById('child-notes-input').value = child.notes || '';
    
    // 顯示現有照片
    if (child.photo) {
      const preview = document.getElementById('child-photo-preview');
      preview.innerHTML = `<img src="${child.photo}" style="max-width: 200px; border-radius: 8px;">`;
    }
    
    // 將 childId 儲存在表單中以供提交時使用
    document.getElementById('child-form').dataset.editId = childId;
  } catch (error) {
    console.error('載入孩子資料錯誤:', error);
    showNotification('載入孩子資料失敗', 'error');
  }
}

/**
 * 處理孩子表單提交
 */
async function handleChildSubmit(event) {
  event.preventDefault();
  
  try {
    const form = event.target;
    const editId = form.dataset.editId;
    
    const childData = {
      name: document.getElementById('child-name-input').value,
      gender: document.getElementById('child-gender-input').value,
      birthday: document.getElementById('child-birthday-input').value,
      notes: document.getElementById('child-notes-input').value,
      photo: null
    };
    
    // 處理照片上傳
    const photoFile = document.getElementById('child-photo-input').files[0];
    if (photoFile) {
      childData.photo = await fileToBase64(photoFile);
    } else if (editId) {
      // 編輯模式下保留原有照片
      const existingChild = await getFromDB(STORES.CHILDREN, parseInt(editId));
      if (existingChild && existingChild.photo) {
        childData.photo = existingChild.photo;
      }
    }
    
    if (editId) {
      // 編輯模式
      childData.id = parseInt(editId);
      await updateInDB(STORES.CHILDREN, childData);
      showNotification('孩子資料已更新', 'success');
    } else {
      // 新增模式
      childData.createdAt = new Date().toISOString();
      const newChild = await saveToDb(STORES.CHILDREN, childData);
      showNotification('孩子已新增', 'success');
      
      // 自動選擇新增的孩子
      selectChild(newChild.id);
    }
    
    // 關閉模態框並重新載入孩子列表
    closeModal(document.getElementById('child-modal'));
    await loadChildren();
    
    // 如果在編輯模式且編輯當前選中的孩子，重新載入資料
    if (editId && parseInt(editId) === currentChildId) {
      await loadChildData(currentChildId);
    }
    
    // 清除編輯ID
    delete form.dataset.editId;
  } catch (error) {
    console.error('儲存孩子資料錯誤:', error);
    showNotification('儲存失敗，請重試', 'error');
  }
}

/**
 * 確認刪除孩子
 */
function confirmDeleteChild() {
  if (!currentChildId) return;
  
  showConfirmModal(
    '確定要刪除這個孩子的所有資料嗎？此操作將無法復原！',
    async () => {
      try {
        // 刪除孩子的所有相關記錄
        await deleteChildAndAllRecords(currentChildId);
        
        showNotification('孩子資料已刪除', 'success');
        
        // 重新載入孩子列表
        currentChildId = null;
        await loadChildren();
      } catch (error) {
        console.error('刪除孩子錯誤:', error);
        showNotification('刪除失敗，請重試', 'error');
      }
    }
  );
}

/**
 * 刪除孩子及其所有記錄
 */
async function deleteChildAndAllRecords(childId) {
  const transaction = db.transaction(Object.values(STORES), 'readwrite');
  
  try {
    // 刪除孩子記錄
    await deleteFromDB(STORES.CHILDREN, childId);
    
    // 刪除所有相關記錄
    const storesToClean = [
      STORES.FEEDING,
      STORES.SLEEP,
      STORES.DIAPER,
      STORES.HEALTH,
      STORES.MILESTONES,
      STORES.ACTIVITIES,
      STORES.INTERACTIONS
    ];
    
    for (const storeName of storesToClean) {
      const records = await getRecordsByChildId(storeName, childId);
      for (const record of records) {
        await deleteFromDB(storeName, record.id);
      }
    }
    
    await transaction.complete;
  } catch (error) {
    console.error('刪除相關記錄錯誤:', error);
    throw error;
  }
}

/**
 * 開啟餵食模態框
 */
function openFeedingModal(recordId = null) {
  const modal = document.getElementById('feeding-modal');
  const title = document.getElementById('feeding-modal-title');
  const form = document.getElementById('feeding-form');
  
  // 重設表單
  form.reset();
  setCurrentDateTime();
  
  if (recordId) {
    title.textContent = '編輯餵食記錄';
    loadFeedingForEdit(recordId);
  } else {
    title.textContent = '新增餵食記錄';
  }
  
  // 重設餵食類型相關欄位顯示
  handleFeedingTypeChange({ target: { value: '' } });
  
  showModal(modal);
}

/**
 * 載入餵食記錄供編輯
 */
async function loadFeedingForEdit(recordId) {
  try {
    const record = await getFromDB(STORES.FEEDING, recordId);
    if (!record) return;
    
    document.getElementById('feeding-type').value = record.type;
    document.getElementById('feeding-start-time').value = formatDateTimeForInput(new Date(record.startTime));
    
    if (record.endTime) {
      document.getElementById('feeding-end-time').value = formatDateTimeForInput(new Date(record.endTime));
    }
    
    if (record.quantity) {
      document.getElementById('feeding-quantity').value = record.quantity;
    }
    
    document.getElementById('feeding-notes').value = record.notes || '';
    
    // 觸發類型變更以顯示正確欄位
    handleFeedingTypeChange({ target: { value: record.type } });
    
    // 儲存記錄ID供編輯使用
    document.getElementById('feeding-form').dataset.editId = recordId;
  } catch (error) {
    console.error('載入餵食記錄錯誤:', error);
    showNotification('載入記錄失敗', 'error');
  }
}

/**
 * 處理餵食類型變更
 */
function handleFeedingTypeChange(event) {
  const type = event.target.value;
  const endTimeLabel = document.getElementById('feeding-end-time-label');
  const endTimeInput = document.getElementById('feeding-end-time');
  const quantityGroup = document.getElementById('feeding-quantity-group');
  const unitSpan = document.getElementById('feeding-unit');
  
  if (type === 'breastfeeding') {
    // 母乳餵食顯示結束時間
    endTimeLabel.style.display = 'block';
    endTimeInput.style.display = 'block';
    endTimeInput.required = true;
    quantityGroup.style.display = 'none';
    document.getElementById('feeding-quantity').required = false;
  } else if (type === 'formula' || type === 'solids') {
    // 配方奶和副食品顯示份量
    endTimeLabel.style.display = 'none';
    endTimeInput.style.display = 'none';
    endTimeInput.required = false;
    quantityGroup.style.display = 'block';
    document.getElementById('feeding-quantity').required = true;
    
    // 設定單位
    unitSpan.textContent = type === 'formula' ? 'ml' : 'g';
  } else {
    // 未選擇時隱藏所有額外欄位
    endTimeLabel.style.display = 'none';
    endTimeInput.style.display = 'none';
    endTimeInput.required = false;
    quantityGroup.style.display = 'none';
    document.getElementById('feeding-quantity').required = false;
  }
}

/**
 * 處理餵食表單提交
 */
async function handleFeedingSubmit(event) {
  event.preventDefault();
  
  try {
    const form = event.target;
    const editId = form.dataset.editId;
    
    const feedingData = {
      childId: currentChildId,
      type: document.getElementById('feeding-type').value,
      startTime: document.getElementById('feeding-start-time').value,
      notes: document.getElementById('feeding-notes').value,
      timestamp: new Date().toISOString()
    };
    
    // 根據餵食類型添加相應欄位
    if (feedingData.type === 'breastfeeding') {
      const endTime = document.getElementById('feeding-end-time').value;
      if (endTime) {
        feedingData.endTime = endTime;
      }
    } else if (feedingData.type === 'formula' || feedingData.type === 'solids') {
      const quantity = document.getElementById('feeding-quantity').value;
      if (quantity) {
        feedingData.quantity = parseInt(quantity);
        feedingData.unit = feedingData.type === 'formula' ? 'ml' : 'g';
      }
    }
    
    if (editId) {
      // 編輯模式
      feedingData.id = parseInt(editId);
      await updateInDB(STORES.FEEDING, feedingData);
      showNotification('餵食記錄已更新', 'success');
    } else {
      // 新增模式
      await saveToDb(STORES.FEEDING, feedingData);
      showNotification('餵食記錄已新增', 'success');
    }
    
    // 關閉模態框並重新載入記錄
    closeModal(document.getElementById('feeding-modal'));
    await loadFeedingRecords(currentChildId);
    updateDashboard();
    
    // 清除編輯ID
    delete form.dataset.editId;
  } catch (error) {
    console.error('儲存餵食記錄錯誤:', error);
    showNotification('儲存失敗，請重試', 'error');
  }
}

/**
 * 編輯餵食記錄
 */
function editFeedingRecord(recordId) {
  openFeedingModal(recordId);
}

/**
 * 刪除餵食記錄
 */
function deleteFeedingRecord(recordId) {
  showConfirmModal(
    '確定要刪除這筆餵食記錄嗎？',
    async () => {
      try {
        await deleteFromDB(STORES.FEEDING, recordId);
        showNotification('餵食記錄已刪除', 'success');
        await loadFeedingRecords(currentChildId);
        updateDashboard();
      } catch (error) {
        console.error('刪除餵食記錄錯誤:', error);
        showNotification('刪除失敗，請重試', 'error');
      }
    }
  );
}

/**
 * 開啟睡眠模態框
 */
function openSleepModal(recordId = null) {
  const modal = document.getElementById('sleep-modal');
  const title = document.getElementById('sleep-modal-title');
  const form = document.getElementById('sleep-form');
  
  // 重設表單
  form.reset();
  setCurrentDateTime();
  
  if (recordId) {
    title.textContent = '編輯睡眠記錄';
    loadSleepForEdit(recordId);
  } else {
    title.textContent = '新增睡眠記錄';
  }
  
  showModal(modal);
}

/**
 * 載入睡眠記錄供編輯
 */
async function loadSleepForEdit(recordId) {
  try {
    const record = await getFromDB(STORES.SLEEP, recordId);
    if (!record) return;
    
    document.getElementById('sleep-start-time').value = formatDateTimeForInput(new Date(record.startTime));
    document.getElementById('sleep-end-time').value = formatDateTimeForInput(new Date(record.endTime));
    document.getElementById('sleep-notes').value = record.notes || '';
    
    // 儲存記錄ID供編輯使用
    document.getElementById('sleep-form').dataset.editId = recordId;
  } catch (error) {
    console.error('載入睡眠記錄錯誤:', error);
    showNotification('載入記錄失敗', 'error');
  }
}

/**
 * 處理睡眠表單提交
 */
async function handleSleepSubmit(event) {
  event.preventDefault();
  
  try {
    const form = event.target;
    const editId = form.dataset.editId;
    
    const sleepData = {
      childId: currentChildId,
      startTime: document.getElementById('sleep-start-time').value,
      endTime: document.getElementById('sleep-end-time').value,
      notes: document.getElementById('sleep-notes').value,
      timestamp: new Date().toISOString()
    };
    
    // 驗證時間邏輯
    if (new Date(sleepData.endTime) <= new Date(sleepData.startTime)) {
      showNotification('結束時間必須晚於開始時間', 'error');
      return;
    }
    
    if (editId) {
      // 編輯模式
      sleepData.id = parseInt(editId);
      await updateInDB(STORES.SLEEP, sleepData);
      showNotification('睡眠記錄已更新', 'success');
    } else {
      // 新增模式
      await saveToDb(STORES.SLEEP, sleepData);
      showNotification('睡眠記錄已新增', 'success');
    }
    
    // 關閉模態框並重新載入記錄
    closeModal(document.getElementById('sleep-modal'));
    await loadSleepRecords(currentChildId);
    updateDashboard();
    
    // 清除編輯ID
    delete form.dataset.editId;
  } catch (error) {
    console.error('儲存睡眠記錄錯誤:', error);
    showNotification('儲存失敗，請重試', 'error');
  }
}

/**
 * 編輯睡眠記錄
 */
function editSleepRecord(recordId) {
  openSleepModal(recordId);
}

/**
 * 刪除睡眠記錄
 */
function deleteSleepRecord(recordId) {
  showConfirmModal(
    '確定要刪除這筆睡眠記錄嗎？',
    async () => {
      try {
        await deleteFromDB(STORES.SLEEP, recordId);
        showNotification('睡眠記錄已刪除', 'success');
        await loadSleepRecords(currentChildId);
        updateDashboard();
      } catch (error) {
        console.error('刪除睡眠記錄錯誤:', error);
        showNotification('刪除失敗，請重試', 'error');
      }
    }
  );
}

/**
 * 開啟尿布模態框
 */
function openDiaperModal(recordId = null) {
  const modal = document.getElementById('diaper-modal');
  const title = document.getElementById('diaper-modal-title');
  const form = document.getElementById('diaper-form');
  
  // 重設表單
  form.reset();
  setCurrentDateTime();
  
  if (recordId) {
    title.textContent = '編輯尿布記錄';
    loadDiaperForEdit(recordId);
  } else {
    title.textContent = '新增尿布記錄';
  }
  
  showModal(modal);
}

/**
 * 載入尿布記錄供編輯
 */
async function loadDiaperForEdit(recordId) {
  try {
    const record = await getFromDB(STORES.DIAPER, recordId);
    if (!record) return;
    
    document.getElementById('diaper-type').value = record.type;
    document.getElementById('diaper-time').value = formatDateTimeForInput(new Date(record.time));
    document.getElementById('diaper-notes').value = record.notes || '';
    
    // 儲存記錄ID供編輯使用
    document.getElementById('diaper-form').dataset.editId = recordId;
  } catch (error) {
    console.error('載入尿布記錄錯誤:', error);
    showNotification('載入記錄失敗', 'error');
  }
}

/**
 * 處理尿布表單提交
 */
async function handleDiaperSubmit(event) {
  event.preventDefault();
  
  try {
    const form = event.target;
    const editId = form.dataset.editId;
    
    const diaperData = {
      childId: currentChildId,
      type: document.getElementById('diaper-type').value,
      time: document.getElementById('diaper-time').value,
      notes: document.getElementById('diaper-notes').value,
      timestamp: new Date().toISOString()
    };
    
    if (editId) {
      // 編輯模式
      diaperData.id = parseInt(editId);
      await updateInDB(STORES.DIAPER, diaperData);
      showNotification('尿布記錄已更新', 'success');
    } else {
      // 新增模式
      await saveToDb(STORES.DIAPER, diaperData);
      showNotification('尿布記錄已新增', 'success');
    }
    
    // 關閉模態框並重新載入記錄
    closeModal(document.getElementById('diaper-modal'));
    await loadDiaperRecords(currentChildId);
    updateDashboard();
    
    // 清除編輯ID
    delete form.dataset.editId;
  } catch (error) {
    console.error('儲存尿布記錄錯誤:', error);
    showNotification('儲存失敗，請重試', 'error');
  }
}

/**
 * 編輯尿布記錄
 */
function editDiaperRecord(recordId) {
  openDiaperModal(recordId);
}

/**
 * 刪除尿布記錄
 */
function deleteDiaperRecord(recordId) {
  showConfirmModal(
    '確定要刪除這筆尿布記錄嗎？',
    async () => {
      try {
        await deleteFromDB(STORES.DIAPER, recordId);
        showNotification('尿布記錄已刪除', 'success');
        await loadDiaperRecords(currentChildId);
        updateDashboard();
      } catch (error) {
        console.error('刪除尿布記錄錯誤:', error);
        showNotification('刪除失敗，請重試', 'error');
      }
    }
  );
}

/**
 * 開啟健康模態框
 */
function openHealthModal(recordId = null) {
  const modal = document.getElementById('health-modal');
  const title = document.getElementById('health-modal-title');
  const form = document.getElementById('health-form');
  
  // 重設表單
  form.reset();
  setCurrentDateTime();
  
  if (recordId) {
    title.textContent = '編輯健康記錄';
    loadHealthForEdit(recordId);
  } else {
    title.textContent = '新增健康記錄';
  }
  
  // 重設健康類型相關欄位顯示
  handleHealthTypeChange({ target: { value: '' } });
  
  showModal(modal);
}

/**
 * 載入健康記錄供編輯
 */
async function loadHealthForEdit(recordId) {
  try {
    const record = await getFromDB(STORES.HEALTH, recordId);
    if (!record) return;
    
    document.getElementById('health-type').value = record.type;
    document.getElementById('health-date').value = formatDateTimeForInput(new Date(record.date));
    document.getElementById('health-details').value = record.details;
    document.getElementById('health-notes').value = record.notes || '';
    
    if (record.temperature) {
      document.getElementById('health-temperature').value = record.temperature;
      document.getElementById('temp-method').value = record.temperatureMethod || 'oral';
    }
    
    // 觸發類型變更以顯示正確欄位
    handleHealthTypeChange({ target: { value: record.type } });
    
    // 儲存記錄ID供編輯使用
    document.getElementById('health-form').dataset.editId = recordId;
  } catch (error) {
    console.error('載入健康記錄錯誤:', error);
    showNotification('載入記錄失敗', 'error');
  }
}

/**
 * 處理健康記錄類型變更
 */
function handleHealthTypeChange(event) {
  const type = event.target.value;
  const temperatureGroup = document.getElementById('temperature-group');
  
  // 疾病記錄和健康檢查可以記錄體溫
  if (type === 'illness' || type === 'checkup') {
    temperatureGroup.style.display = 'block';
  } else {
    temperatureGroup.style.display = 'none';
  }
}

/**
 * 處理健康表單提交
 */
async function handleHealthSubmit(event) {
  event.preventDefault();
  
  try {
    const form = event.target;
    const editId = form.dataset.editId;
    
    const healthData = {
      childId: currentChildId,
      type: document.getElementById('health-type').value,
      date: document.getElementById('health-date').value,
      details: document.getElementById('health-details').value,
      notes: document.getElementById('health-notes').value,
      timestamp: new Date().toISOString()
    };
    
    // 添加體溫數據（如果有）
    const temperature = document.getElementById('health-temperature').value;
    if (temperature) {
      healthData.temperature = parseFloat(temperature);
      healthData.temperatureMethod = document.getElementById('temp-method').value;
    }
    
    if (editId) {
      // 編輯模式
      healthData.id = parseInt(editId);
      await updateInDB(STORES.HEALTH, healthData);
      showNotification('健康記錄已更新', 'success');
    } else {
      // 新增模式
      await saveToDb(STORES.HEALTH, healthData);
      showNotification('健康記錄已新增', 'success');
    }
    
    // 關閉模態框並重新載入記錄
    closeModal(document.getElementById('health-modal'));
    await loadHealthRecords(currentChildId);
    
    // 清除編輯ID
    delete form.dataset.editId;
  } catch (error) {
    console.error('儲存健康記錄錯誤:', error);
    showNotification('儲存失敗，請重試', 'error');
  }
}

/**
 * 編輯健康記錄
 */
function editHealthRecord(recordId) {
  openHealthModal(recordId);
}

/**
 * 刪除健康記錄
 */
function deleteHealthRecord(recordId) {
  showConfirmModal(
    '確定要刪除這筆健康記錄嗎？',
    async () => {
      try {
        await deleteFromDB(STORES.HEALTH, recordId);
        showNotification('健康記錄已刪除', 'success');
        await loadHealthRecords(currentChildId);
      } catch (error) {
        console.error('刪除健康記錄錯誤:', error);
        showNotification('刪除失敗，請重試', 'error');
      }
    }
  );
}

/**
 * 開啟里程碑模態框
 */
function openMilestoneModal(milestoneId = null) {
  const modal = document.getElementById('milestone-modal');
  const title = document.getElementById('milestone-modal-title');
  const form = document.getElementById('milestone-form');
  
  // 重設表單
  form.reset();
  setCurrentDateTime();
  
  if (milestoneId) {
    title.textContent = '編輯里程碑';
    loadMilestoneForEdit(milestoneId);
  } else {
    title.textContent = '新增里程碑';
  }
  
  showModal(modal);
}

/**
 * 載入里程碑供編輯
 */
async function loadMilestoneForEdit(milestoneId) {
  try {
    const milestone = await getFromDB(STORES.MILESTONES, milestoneId);
    if (!milestone) return;
    
    document.getElementById('milestone-category').value = milestone.category;
    document.getElementById('milestone-name').value = milestone.name;
    document.getElementById('milestone-date').value = formatDateForInput(new Date(milestone.date));
    document.getElementById('milestone-notes').value = milestone.notes || '';
    
    // 儲存里程碑ID供編輯使用
    document.getElementById('milestone-form').dataset.editId = milestoneId;
  } catch (error) {
    console.error('載入里程碑錯誤:', error);
    showNotification('載入記錄失敗', 'error');
  }
}

/**
 * 處理里程碑表單提交
 */
async function handleMilestoneSubmit(event) {
  event.preventDefault();
  
  try {
    const form = event.target;
    const editId = form.dataset.editId;
    
    const milestoneData = {
      childId: currentChildId,
      category: document.getElementById('milestone-category').value,
      name: document.getElementById('milestone-name').value,
      date: document.getElementById('milestone-date').value,
      notes: document.getElementById('milestone-notes').value,
      timestamp: new Date().toISOString()
    };
    
    if (editId) {
      // 編輯模式
      milestoneData.id = parseInt(editId);
      await updateInDB(STORES.MILESTONES, milestoneData);
      showNotification('里程碑已更新', 'success');
    } else {
      // 新增模式
      await saveToDb(STORES.MILESTONES, milestoneData);
      showNotification('里程碑已新增', 'success');
    }
    
    // 關閉模態框並重新載入記錄
    closeModal(document.getElementById('milestone-modal'));
    await loadMilestones(currentChildId);
    
    // 清除編輯ID
    delete form.dataset.editId;
  } catch (error) {
    console.error('儲存里程碑錯誤:', error);
    showNotification('儲存失敗，請重試', 'error');
  }
}

/**
 * 編輯里程碑
 */
function editMilestone(milestoneId) {
  openMilestoneModal(milestoneId);
}

/**
 * 刪除里程碑
 */
function deleteMilestone(milestoneId) {
  showConfirmModal(
    '確定要刪除這個里程碑嗎？',
    async () => {
      try {
        await deleteFromDB(STORES.MILESTONES, milestoneId);
        showNotification('里程碑已刪除', 'success');
        await loadMilestones(currentChildId);
      } catch (error) {
        console.error('刪除里程碑錯誤:', error);
        showNotification('刪除失敗，請重試', 'error');
      }
    }
  );
}

/**
 * 開啟活動模態框
 */
function openActivityModal(recordId = null) {
  const modal = document.getElementById('activity-modal');
  const title = document.getElementById('activity-modal-title');
  const form = document.getElementById('activity-form');
  const preview = document.getElementById('activity-photo-preview');
  
  // 重設表單
  form.reset();
  preview.innerHTML = '';
  setCurrentDateTime();
  
  if (recordId) {
    title.textContent = '編輯活動記錄';
    loadActivityForEdit(recordId);
  } else {
    title.textContent = '新增活動記錄';
  }
  
  // 重設活動類型相關欄位顯示
  handleActivityTypeChange({ target: { value: '' } });
  
  showModal(modal);
}

/**
 * 載入活動記錄供編輯
 */
async function loadActivityForEdit(recordId) {
  try {
    const record = await getFromDB(STORES.ACTIVITIES, recordId);
    if (!record) return;
    
    document.getElementById('activity-type').value = record.type;
    document.getElementById('activity-start-time').value = formatDateTimeForInput(new Date(record.startTime));
    document.getElementById('activity-duration').value = record.duration;
    document.getElementById('activity-notes').value = record.notes || '';
    
    if (record.customName) {
      document.getElementById('custom-activity-name').value = record.customName;
    }
    
    // 顯示現有照片
    if (record.photo) {
      const preview = document.getElementById('activity-photo-preview');
      preview.innerHTML = `<img src="${record.photo}" style="max-width: 200px; border-radius: 8px;">`;
    }
    
    // 觸發類型變更以顯示正確欄位
    handleActivityTypeChange({ target: { value: record.type } });
    
    // 儲存記錄ID供編輯使用
    document.getElementById('activity-form').dataset.editId = recordId;
  } catch (error) {
    console.error('載入活動記錄錯誤:', error);
    showNotification('載入記錄失敗', 'error');
  }
}

/**
 * 處理活動類型變更
 */
function handleActivityTypeChange(event) {
  const type = event.target.value;
  const customGroup = document.getElementById('custom-activity-group');
  const customInput = document.getElementById('custom-activity-name');
  
  if (type === 'custom') {
    customGroup.style.display = 'block';
    customInput.required = true;
  } else {
    customGroup.style.display = 'none';
    customInput.required = false;
    customInput.value = '';
  }
}

/**
 * 處理活動表單提交
 */
async function handleActivitySubmit(event) {
  event.preventDefault();
  
  try {
    const form = event.target;
    const editId = form.dataset.editId;
    
    const activityData = {
      childId: currentChildId,
      type: document.getElementById('activity-type').value,
      startTime: document.getElementById('activity-start-time').value,
      duration: parseInt(document.getElementById('activity-duration').value),
      notes: document.getElementById('activity-notes').value,
      timestamp: new Date().toISOString()
    };
    
    // 添加自訂活動名稱
    if (activityData.type === 'custom') {
      activityData.customName = document.getElementById('custom-activity-name').value;
    }
    
    // 處理照片上傳
    const photoFile = document.getElementById('activity-photo').files[0];
    if (photoFile) {
      activityData.photo = await fileToBase64(photoFile);
    } else if (editId) {
      // 編輯模式下保留原有照片
      const existingRecord = await getFromDB(STORES.ACTIVITIES, parseInt(editId));
      if (existingRecord && existingRecord.photo) {
        activityData.photo = existingRecord.photo;
      }
    }
    
    if (editId) {
      // 編輯模式
      activityData.id = parseInt(editId);
      await updateInDB(STORES.ACTIVITIES, activityData);
      showNotification('活動記錄已更新', 'success');
    } else {
      // 新增模式
      await saveToDb(STORES.ACTIVITIES, activityData);
      showNotification('活動記錄已新增', 'success');
    }
    
    // 關閉模態框並重新載入記錄
    closeModal(document.getElementById('activity-modal'));
    await loadActivityRecords(currentChildId);
    updateDashboard();
    
    // 清除編輯ID
    delete form.dataset.editId;
  } catch (error) {
    console.error('儲存活動記錄錯誤:', error);
    showNotification('儲存失敗，請重試', 'error');
  }
}

/**
 * 編輯活動記錄
 */
function editActivityRecord(recordId) {
  openActivityModal(recordId);
}

/**
 * 刪除活動記錄
 */
function deleteActivityRecord(recordId) {
  showConfirmModal(
    '確定要刪除這筆活動記錄嗎？',
    async () => {
      try {
        await deleteFromDB(STORES.ACTIVITIES, recordId);
        showNotification('活動記錄已刪除', 'success');
        await loadActivityRecords(currentChildId);
        updateDashboard();
      } catch (error) {
        console.error('刪除活動記錄錯誤:', error);
        showNotification('刪除失敗，請重試', 'error');
      }
    }
  );
}

/**
 * 開啟互動模態框
 */
function openInteractionModal(recordId = null) {
  const modal = document.getElementById('interaction-modal');
  const title = document.getElementById('interaction-modal-title');
  const form = document.getElementById('interaction-form');
  const preview = document.getElementById('interaction-photo-preview');
  
  // 重設表單
  form.reset();
  preview.innerHTML = '';
  setCurrentDateTime();
  
  if (recordId) {
    title.textContent = '編輯互動記錄';
    loadInteractionForEdit(recordId);
  } else {
    title.textContent = '新增互動記錄';
  }
  
  showModal(modal);
}

/**
 * 載入互動記錄供編輯
 */
async function loadInteractionForEdit(recordId) {
  try {
    const record = await getFromDB(STORES.INTERACTIONS, recordId);
    if (!record) return;
    
    document.getElementById('interaction-time').value = formatDateTimeForInput(new Date(record.time));
    document.getElementById('emotional-state').value = record.emotionalState;
    document.getElementById('interaction-event').value = record.event || '';
    document.getElementById('interaction-notes').value = record.notes || '';
    
    // 顯示現有照片
    if (record.photo) {
      const preview = document.getElementById('interaction-photo-preview');
      preview.innerHTML = `<img src="${record.photo}" style="max-width: 200px; border-radius: 8px;">`;
    }
    
    // 儲存記錄ID供編輯使用
    document.getElementById('interaction-form').dataset.editId = recordId;
  } catch (error) {
    console.error('載入互動記錄錯誤:', error);
    showNotification('載入記錄失敗', 'error');
  }
}

/**
 * 處理互動表單提交
 */
async function handleInteractionSubmit(event) {
  event.preventDefault();
  
  try {
    const form = event.target;
    const editId = form.dataset.editId;
    
    const interactionData = {
      childId: currentChildId,
      time: document.getElementById('interaction-time').value,
      emotionalState: document.getElementById('emotional-state').value,
      event: document.getElementById('interaction-event').value,
      notes: document.getElementById('interaction-notes').value,
      timestamp: new Date().toISOString()
    };
    
    // 處理照片上傳
    const photoFile = document.getElementById('interaction-photo').files[0];
    if (photoFile) {
      interactionData.photo = await fileToBase64(photoFile);
    } else if (editId) {
      // 編輯模式下保留原有照片
      const existingRecord = await getFromDB(STORES.INTERACTIONS, parseInt(editId));
      if (existingRecord && existingRecord.photo) {
        interactionData.photo = existingRecord.photo;
      }
    }
    
    if (editId) {
      // 編輯模式
      interactionData.id = parseInt(editId);
      await updateInDB(STORES.INTERACTIONS, interactionData);
      showNotification('互動記錄已更新', 'success');
    } else {
      // 新增模式
      await saveToDb(STORES.INTERACTIONS, interactionData);
      showNotification('互動記錄已新增', 'success');
    }
    
    // 關閉模態框並重新載入記錄
    closeModal(document.getElementById('interaction-modal'));
    await loadInteractionRecords(currentChildId);
    
    // 清除編輯ID
    delete form.dataset.editId;
  } catch (error) {
    console.error('儲存互動記錄錯誤:', error);
    showNotification('儲存失敗，請重試', 'error');
  }
}

/**
 * 編輯互動記錄
 */
function editInteractionRecord(recordId) {
  openInteractionModal(recordId);
}

/**
 * 刪除互動記錄
 */
function deleteInteractionRecord(recordId) {
  showConfirmModal(
    '確定要刪除這筆互動記錄嗎？',
    async () => {
      try {
        await deleteFromDB(STORES.INTERACTIONS, recordId);
        showNotification('互動記錄已刪除', 'success');
        await loadInteractionRecords(currentChildId);
      } catch (error) {
        console.error('刪除互動記錄錯誤:', error);
        showNotification('刪除失敗，請重試', 'error');
      }
    }
  );
}

/**
 * 照片預覽功能
 */
function previewPhoto(event, previewElementId) {
  const file = event.target.files[0];
  const preview = document.getElementById(previewElementId);
  
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      preview.innerHTML = `<img src="${e.target.result}" style="max-width: 200px; border-radius: 8px;">`;
    };
    reader.readAsDataURL(file);
  } else {
    preview.innerHTML = '';
  }
}

/**
 * 將檔案轉換為 Base64 字串
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

/**
 * 顯示模態框
 */
function showModal(modal) {
  modal.classList.add('show');
  modal.style.display = 'flex';
  
  // 禁用背景滾動
  document.body.style.overflow = 'hidden';
}

/**
 * 關閉模態框
 */
function closeModal(modal) {
  modal.classList.remove('show');
  modal.style.display = 'none';
  
  // 恢復背景滾動
  document.body.style.overflow = 'auto';
  
  // 清除表單數據
  const form = modal.querySelector('form');
  if (form) {
    form.reset();
    delete form.dataset.editId;
  }
  
  // 清除照片預覽
  modal.querySelectorAll('.photo-preview').forEach(preview => {
    preview.innerHTML = '';
  });
}

/**
 * 顯示確認刪除模態框
 */
function showConfirmModal(message, onConfirm) {
  const modal = document.getElementById('confirm-modal');
  const messageElement = document.getElementById('confirm-message');
  
  messageElement.textContent = message;
  
  // 設定確認回調
  const confirmButton = document.getElementById('confirm-delete');
  confirmButton.onclick = () => {
    closeModal(modal);
    onConfirm();
  };
  
  showModal(modal);
}

// 儲存確認刪除的回調，避免重複綁定
let confirmDeleteCallback = null;

/**
 * 執行確認的刪除操作
 */
function executeConfirmedDelete() {
  if (confirmDeleteCallback) {
    confirmDeleteCallback();
    confirmDeleteCallback = null;
  }
  closeModal(document.getElementById('confirm-modal'));
}

/**
 * 匯出資料
 */
async function exportData() {
  try {
    const allData = {
      exportDate: new Date().toISOString(),
      timezone: currentTimezone,
      children: await getAllFromDB(STORES.CHILDREN),
      feeding: await getAllFromDB(STORES.FEEDING),
      sleep: await getAllFromDB(STORES.SLEEP),
      diaper: await getAllFromDB(STORES.DIAPER),
      health: await getAllFromDB(STORES.HEALTH),
      milestones: await getAllFromDB(STORES.MILESTONES),
      activities: await getAllFromDB(STORES.