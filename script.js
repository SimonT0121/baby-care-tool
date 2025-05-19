/**
 * ============================================
 * 寶寶照護追蹤 - JavaScript
 * ============================================
 * 
 * 此檔案包含寶寶照護追蹤應用程式的所有功能，
 * 包括 IndexedDB 操作、時區管理和使用者介面控制。
 */

// ============================================
// 全域變數和常數
// ============================================

let db = null;
let currentSelectedChild = null;
let currentTheme = localStorage.getItem('theme') || 'light';
let currentTimezone = localStorage.getItem('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;

// 資料庫設定
const DB_NAME = 'BabyCareTracker';
const DB_VERSION = 1;

// 物件儲存區
const STORES = {
  children: 'children',
  feeding: 'feeding',
  sleep: 'sleep',
  diaper: 'diaper',
  health: 'health',
  milestone: 'milestone',
  activity: 'activity',
  interaction: 'interaction'
};

// 記錄類型設定
const RECORD_TYPES = {
  feeding: {
    name: '餵食',
    icon: 'fas fa-bottle-baby',
    color: '#ff7eb3',
    fields: [
      { name: 'type', label: '類型', type: 'select', options: ['breast', 'formula', 'solid'], required: true, optionLabels: { breast: '母乳', formula: '配方奶', solid: '副食品' } },
      { name: 'startTime', label: '開始時間', type: 'datetime-local', required: true },
      { name: 'endTime', label: '結束時間', type: 'datetime-local' },
      { name: 'quantity', label: '份量 (ml/g)', type: 'number', min: 0 },
      { name: 'breast', label: '乳房', type: 'select', options: ['left', 'right', 'both'], showIf: 'type=breast', optionLabels: { left: '左邊', right: '右邊', both: '兩邊' } }
    ]
  },
  sleep: {
    name: '睡眠',
    icon: 'fas fa-bed',
    color: '#7eb3ff',
    fields: [
      { name: 'startTime', label: '開始時間', type: 'datetime-local', required: true },
      { name: 'endTime', label: '結束時間', type: 'datetime-local', required: true }
    ]
  },
  diaper: {
    name: '尿布',
    icon: 'fas fa-baby',
    color: '#ffb347',
    fields: [
      { name: 'time', label: '時間', type: 'datetime-local', required: true },
      { name: 'type', label: '類型', type: 'select', options: ['wet', 'poop', 'mixed'], required: true, optionLabels: { wet: '尿濕', poop: '便便', mixed: '尿便俱樂部' } }
    ]
  },
  health: {
    name: '健康',
    icon: 'fas fa-stethoscope',
    color: '#7cb342',
    fields: [
      { name: 'type', label: '類型', type: 'select', options: ['vaccination', 'medication', 'illness', 'checkup'], required: true, optionLabels: { vaccination: '疫苗接種', medication: '用藥', illness: '疾病', checkup: '健檢' } },
      { name: 'date', label: '日期', type: 'date', required: true },
      { name: 'title', label: '標題', type: 'text', required: true },
      { name: 'description', label: '描述', type: 'textarea' },
      { name: 'temperature', label: '體溫 (°C)', type: 'number', step: 0.1 },
      { name: 'temperatureMethod', label: '測量方式', type: 'select', options: ['oral', 'rectal', 'ear', 'forehead'], optionLabels: { oral: '口溫', rectal: '肛溫', ear: '耳溫', forehead: '額溫' } },
      { name: 'medication', label: '藥物', type: 'text', showIf: 'type=medication' },
      { name: 'dosage', label: '劑量', type: 'text', showIf: 'type=medication' }
    ]
  },
  milestone: {
    name: '里程碑',
    icon: 'fas fa-star',
    color: '#e57373',
    fields: [
      { name: 'category', label: '類別', type: 'select', options: ['motor', 'language', 'social', 'cognitive', 'self-care', 'custom'], required: true, optionLabels: { motor: '動作發展', language: '語言發展', social: '社會發展', cognitive: '認知發展', 'self-care': '生活自理', custom: '自訂' } },
      { name: 'title', label: '里程碑', type: 'text', required: true },
      { name: 'date', label: '達成日期', type: 'date', required: true },
      { name: 'description', label: '描述', type: 'textarea' }
    ]
  },
  activity: {
    name: '活動',
    icon: 'fas fa-play',
    color: '#ffa726',
    fields: [
      { name: 'type', label: '活動類型', type: 'select', options: ['bath', 'massage', 'changing', 'tummy-time', 'sensory-play', 'reading', 'music', 'walk', 'sunbath', 'social', 'custom'], required: true, optionLabels: { bath: '洗澡', massage: '按摩', changing: '換衣服', 'tummy-time': '趴趴時間', 'sensory-play': '感官遊戲', reading: '親子閱讀', music: '音樂互動', walk: '散步', sunbath: '日光浴', social: '社交互動', custom: '自訂活動' } },
      { name: 'startTime', label: '開始時間', type: 'datetime-local', required: true },
      { name: 'duration', label: '持續時間 (分鐘)', type: 'number', min: 1 },
      { name: 'customActivity', label: '自訂活動', type: 'text', showIf: 'type=custom' }
    ]
  },
  interaction: {
    name: '互動',
    icon: 'fas fa-heart',
    color: '#ab47bc',
    fields: [
      { name: 'date', label: '日期', type: 'date', required: true },
      { name: 'emotionalState', label: '情緒狀態', type: 'select', options: ['happy', 'calm', 'fussy', 'crying', 'sleepy', 'alert'], required: true, optionLabels: { happy: '開心', calm: '平靜', fussy: '暴躁', crying: '哭泣', sleepy: '想睡', alert: '警醒' } },
      { name: 'event', label: '互動事件', type: 'textarea', required: true },
      { name: 'photo', label: '照片', type: 'file', accept: 'image/*' }
    ]
  }
};

// 依類別預設里程碑
const PREDEFINED_MILESTONES = {
  motor: [
    '趴著時能抬頭',
    '從趴著翻身到仰躺',
    '不需扶持就能坐著',
    '爬行',
    '扶著站起來',
    '獨立行走',
    '跑步',
    '雙腳跳躍',
    '騎三輪車'
  ],
  language: [
    '對聲音有反應',
    '發出咿呀聲',
    '說出第一個字',
    '說「媽媽」或「爸爸」',
    '聽到身體部位時會指出來',
    '遵循簡單指令',
    '說兩個字的詞組',
    '問簡單問題',
    '使用完整句子'
  ],
  social: [
    '眼神接觸',
    '回應性微笑',
    '表現出陌生人焦慮',
    '玩躲貓貓',
    '揮手再見',
    '表現親情',
    '與其他小朋友並排遊戲',
    '分享玩具',
    '輪流遊戲'
  ],
  cognitive: [
    '用眼睛追蹤物體',
    '認識熟悉的面孔',
    '對周圍環境表現好奇',
    '模仿動作',
    '找到藏起來的物品',
    '分類形狀和顏色',
    '理解因果關係',
    '解決簡單問題',
    '假想遊戲'
  ],
  'self-care': [
    '從杯子喝水',
    '自己吃手指食物',
    '使用湯匙',
    '表示尿布濕了',
    '對便盆表現興趣',
    '白天保持乾燥',
    '需要幫助洗手',
    '需要幫助刷牙',
    '自己穿衣服'
  ]
};

// 可用時區（常見時區）
const TIMEZONES = [
  { value: 'America/New_York', label: '美國東部時間 (紐約)' },
  { value: 'America/Chicago', label: '美國中部時間 (芝加哥)' },
  { value: 'America/Denver', label: '美國山區時間 (丹佛)' },
  { value: 'America/Los_Angeles', label: '美國太平洋時間 (洛杉磯)' },
  { value: 'Europe/London', label: '格林威治標準時間 (倫敦)' },
  { value: 'Europe/Paris', label: '中歐時間 (巴黎)' },
  { value: 'Europe/Berlin', label: '中歐時間 (柏林)' },
  { value: 'Asia/Tokyo', label: '日本標準時間 (東京)' },
  { value: 'Asia/Shanghai', label: '中國標準時間 (上海)' },
  { value: 'Asia/Taipei', label: '台灣標準時間 (台北)' },
  { value: 'Asia/Kolkata', label: '印度標準時間 (加爾各答)' },
  { value: 'Australia/Sydney', label: '澳洲東部時間 (雪梨)' },
  { value: 'America/Sao_Paulo', label: '巴西時間 (聖保羅)' },
  { value: 'UTC', label: '協調世界時 (UTC)' }
];

// ============================================
// 實用函數
// ============================================

/**
 * 根據使用者時區格式化時間戳記
 * @param {Date|string|number} timestamp - 要格式化的時間戳記
 * @param {string} format - 格式類型 ('date', 'time', 'datetime', 'relative')
 * @returns {string} 格式化的時間戳記
 */
function formatTimestamp(timestamp, format = 'datetime') {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const options = { timeZone: currentTimezone };
  
  switch (format) {
    case 'date':
      return date.toLocaleDateString('zh-TW', { ...options, year: 'numeric', month: 'short', day: 'numeric' });
    case 'time':
      return date.toLocaleTimeString('zh-TW', { ...options, hour: '2-digit', minute: '2-digit' });
    case 'datetime':
      return date.toLocaleDateString('zh-TW', { 
        ...options, 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    case 'relative':
      return getRelativeTime(date);
    default:
      return date.toLocaleDateString('zh-TW', options);
  }
}

/**
 * 取得相對時間字串（例如「2小時前」）
 * @param {Date} date - 要比較的日期
 * @returns {string} 相對時間字串
 */
function getRelativeTime(date) {
  const now = new Date();
  const diffInMs = now - date;
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInMinutes < 1) return '剛剛';
  if (diffInMinutes < 60) return `${diffInMinutes} 分鐘前`;
  if (diffInHours < 24) return `${diffInHours} 小時前`;
  if (diffInDays < 7) return `${diffInDays} 天前`;
  
  return formatTimestamp(date, 'date');
}

/**
 * 從出生日期計算年齡
 * @param {Date|string} birthDate - 出生日期
 * @returns {string} 格式化的年齡字串
 */
function calculateAge(birthDate) {
  const birth = new Date(birthDate);
  const now = new Date();
  const ageInMs = now - birth;
  const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
  const ageInWeeks = Math.floor(ageInDays / 7);
  const ageInMonths = Math.floor(ageInDays / 30.44); // 每月平均天數
  const ageInYears = Math.floor(ageInDays / 365.25); // 考慮閏年
  
  if (ageInDays < 14) return `${ageInDays} 天`;
  if (ageInWeeks < 8) return `${ageInWeeks} 週`;
  if (ageInMonths < 24) return `${ageInMonths} 個月`;
  
  const years = Math.floor(ageInYears);
  const months = Math.floor((ageInDays % 365.25) / 30.44);
  
  if (months === 0) return `${years} 歲`;
  return `${years} 歲 ${months} 個月`;
}

/**
 * 將檔案轉換為 base64 字串
 * @param {File} file - 要轉換的檔案
 * @returns {Promise<string>} Base64 字串
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
 * 產生唯一ID
 * @returns {string} 唯一ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 防震函數
 * @param {Function} func - 要防震的函數
 * @param {number} wait - 等待時間（毫秒）
 * @returns {Function} 防震函數
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 顯示載入轉圈
 */
function showLoading() {
  document.getElementById('loading-spinner').classList.add('show');
}

/**
 * 隱藏載入轉圈
 */
function hideLoading() {
  document.getElementById('loading-spinner').classList.remove('show');
}

/**
 * 顯示吐司通知
 * @param {string} message - 吐司訊息
 * @param {string} type - 吐司類型 ('success', 'warning', 'error')
 * @param {number} duration - 持續時間（毫秒）
 */
function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const iconMap = {
    success: 'fas fa-check-circle',
    warning: 'fas fa-exclamation-triangle',
    error: 'fas fa-times-circle'
  };
  
  toast.innerHTML = `
    <i class="toast-icon ${iconMap[type]}"></i>
    <div class="toast-content">
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close">&times;</button>
  `;
  
  // 新增關閉按鈕的事件監聽器
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });
  
  container.appendChild(toast);
  
  // 持續時間後自動移除
  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, duration);
}

// ============================================
// IndexedDB 函數
// ============================================

/**
 * 初始化 IndexedDB
 * @returns {Promise<IDBDatabase>} 資料庫實例
 */
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // 如果物件儲存區不存在則建立
      Object.values(STORES).forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: 'id' });
          
          // 根據儲存區類型建立索引
          switch (storeName) {
            case STORES.children:
              store.createIndex('name', 'name', { unique: false });
              store.createIndex('birthDate', 'birthDate', { unique: false });
              break;
            default:
              store.createIndex('childId', 'childId', { unique: false });
              store.createIndex('timestamp', 'timestamp', { unique: false });
              if (storeName !== STORES.milestone) {
                store.createIndex('date', 'date', { unique: false });
              }
              break;
          }
        }
      });
    };
  });
}

/**
 * 在 IndexedDB 中新增或更新記錄
 * @param {string} storeName - 物件儲存區名稱
 * @param {object} data - 要儲存的資料
 * @returns {Promise<string>} 記錄ID
 */
function saveRecord(storeName, data) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('資料庫尚未初始化'));
      return;
    }
    
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    // 新增後設資料
    const record = {
      ...data,
      id: data.id || generateId(),
      timestamp: data.timestamp || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const request = store.put(record);
    
    request.onsuccess = () => resolve(record.id);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 從 IndexedDB 依ID取得記錄
 * @param {string} storeName - 物件儲存區名稱
 * @param {string} id - 記錄ID
 * @returns {Promise<object|null>} 記錄資料
 */
function getRecord(storeName, id) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('資料庫尚未初始化'));
      return;
    }
    
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);
    
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 從 IndexedDB 取得所有記錄（可選擇性篩選）
 * @param {string} storeName - 物件儲存區名稱
 * @param {object} filters - 篩選條件
 * @returns {Promise<Array>} 記錄陣列
 */
function getRecords(storeName, filters = {}) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('資料庫尚未初始化'));
      return;
    }
    
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onsuccess = () => {
      let records = request.result || [];
      
      // 套用篩選
      if (filters.childId) {
        records = records.filter(record => record.childId === filters.childId);
      }
      
      if (filters.startDate && filters.endDate) {
        const start = new Date(filters.startDate);
        const end = new Date(filters.endDate);
        records = records.filter(record => {
          const recordDate = new Date(record.date || record.timestamp);
          return recordDate >= start && recordDate <= end;
        });
      }
      
      if (filters.type) {
        records = records.filter(record => record.type === filters.type);
      }
      
      // 依時間戳記/日期排序（最新優先）
      records.sort((a, b) => {
        const dateA = new Date(a.date || a.timestamp);
        const dateB = new Date(b.date || b.timestamp);
        return dateB - dateA;
      });
      
      resolve(records);
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * 從 IndexedDB 刪除記錄
 * @param {string} storeName - 物件儲存區名稱
 * @param {string} id - 記錄ID
 * @returns {Promise<void>}
 */
function deleteRecord(storeName, id) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('資料庫尚未初始化'));
      return;
    }
    
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * 取得今日的記錄
 * @param {string} storeName - 物件儲存區名稱
 * @param {string} childId - 寶寶ID（可選）
 * @returns {Promise<Array>} 今日記錄
 */
function getTodayRecords(storeName, childId = null) {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  
  const filters = {
    startDate: startOfDay,
    endDate: endOfDay
  };
  
  if (childId) {
    filters.childId = childId;
  }
  
  return getRecords(storeName, filters);
}

/**
 * 將所有資料匯出為 JSON
 * @returns {Promise<object>} 匯出的資料
 */
async function exportData() {
  const data = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    timezone: currentTimezone,
    children: await getRecords(STORES.children),
    feeding: await getRecords(STORES.feeding),
    sleep: await getRecords(STORES.sleep),
    diaper: await getRecords(STORES.diaper),
    health: await getRecords(STORES.health),
    milestone: await getRecords(STORES.milestone),
    activity: await getRecords(STORES.activity),
    interaction: await getRecords(STORES.interaction)
  };
  
  return data;
}

/**
 * 從 JSON 匯入資料
 * @param {object} data - 要匯入的資料
 * @returns {Promise<void>}
 */
async function importData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('無效的資料格式');
  }
  
  try {
    // 先匯入寶寶資料
    if (data.children && Array.isArray(data.children)) {
      for (const child of data.children) {
        await saveRecord(STORES.children, child);
      }
    }
    
    // 匯入所有記錄類型
    const recordTypes = [STORES.feeding, STORES.sleep, STORES.diaper, STORES.health, STORES.milestone, STORES.activity, STORES.interaction];
    
    for (const recordType of recordTypes) {
      if (data[recordType] && Array.isArray(data[recordType])) {
        for (const record of data[recordType]) {
          await saveRecord(recordType, record);
        }
      }
    }
    
    showToast('資料匯入成功', 'success');
    await refreshAll();
  } catch (error) {
    console.error('匯入錯誤:', error);
    showToast('資料匯入失敗: ' + error.message, 'error');
  }
}

// ============================================
// 主題和設定函數
// ============================================

/**
 * 套用主題到應用程式
 * @param {string} theme - 主題名稱 ('light' 或 'dark')
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  currentTheme = theme;
  localStorage.setItem('theme', theme);
  
  // 更新主題切換圖示
  const themeToggle = document.querySelector('.theme-toggle i');
  if (themeToggle) {
    themeToggle.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }
}

/**
 * 在淺色和深色主題間切換
 */
function toggleTheme() {
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
}

/**
 * 更新時區
 * @param {string} timezone - 新時區
 */
function updateTimezone(timezone) {
  currentTimezone = timezone;
  localStorage.setItem('timezone', timezone);
  
  // 重新整理顯示時間的介面
  refreshDashboard();
  refreshRecords();
}

/**
 * 填入時區選擇選項
 */
function populateTimezones() {
  const select = document.getElementById('timezone-select');
  if (!select) return;
  
  // 清除現有選項
  select.innerHTML = '';
  
  // 新增時區選項
  TIMEZONES.forEach(tz => {
    const option = document.createElement('option');
    option.value = tz.value;
    option.textContent = tz.label;
    option.selected = tz.value === currentTimezone;
    select.appendChild(option);
  });
}

// ============================================
// 導航函數
// ============================================

/**
 * 切換到特定分頁
 * @param {string} tabId - 要切換到的分頁ID
 */
function switchTab(tabId) {
  // 從所有分頁和內容移除活動類別
  document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  // 為選取的分頁和內容新增活動類別
  const activeTab = document.querySelector(`[data-tab="${tabId}"]`);
  const activeContent = document.getElementById(tabId);
  
  if (activeTab && activeContent) {
    activeTab.classList.add('active');
    activeContent.classList.add('active');
    
    // 根據分頁重新整理內容
    switch (tabId) {
      case 'dashboard':
        refreshDashboard();
        break;
      case 'children':
        refreshChildren();
        break;
      case 'records':
        refreshRecords();
        break;
      case 'charts':
        refreshCharts();
        break;
    }
  }
}

// ============================================
// 彈出視窗函數
// ============================================

/**
 * 顯示彈出視窗
 * @param {string} modalId - 彈出視窗ID
 */
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // 如果有的話，焦點放在第一個輸入欄位
    const firstInput = modal.querySelector('input, select, textarea');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }
}

/**
 * 隱藏彈出視窗
 * @param {string} modalId - 彈出視窗ID
 */
function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // 如果有表單存在，重設表單
    const form = modal.querySelector('form');
    if (form) {
      form.reset();
      clearFormErrors(form);
    }
  }
}

/**
 * 清除表單錯誤
 * @param {HTMLFormElement} form - 表單元素
 */
function clearFormErrors(form) {
  form.querySelectorAll('.form-error').forEach(error => error.remove());
  form.querySelectorAll('.error').forEach(field => field.classList.remove('error'));
}

/**
 * 顯示表單錯誤
 * @param {HTMLElement} field - 有錯誤的表單欄位
 * @param {string} message - 錯誤訊息
 */
function showFormError(field, message) {
  // 移除該欄位的現有錯誤
  const existingError = field.parentNode.querySelector('.form-error');
  if (existingError) {
    existingError.remove();
  }
  
  // 新增錯誤類別
  field.classList.add('error');
  
  // 建立錯誤元素
  const errorElement = document.createElement('div');
  errorElement.className = 'form-error';
  errorElement.textContent = message;
  errorElement.style.color = 'var(--error-color)';
  errorElement.style.fontSize = 'var(--font-size-sm)';
  errorElement.style.marginTop = 'var(--spacing-xs)';
  
  // 插入欄位之後
  field.parentNode.insertBefore(errorElement, field.nextSibling);
}

// ============================================
// 儀表板函數
// ============================================

/**
 * 重新整理儀表板內容
 */
async function refreshDashboard() {
  try {
    showLoading();
    await updateChildSelector();
    await updateTodaySummary();
    await updateRecentRecords();
  } catch (error) {
    console.error('重新整理儀表板錯誤:', error);
    showToast('重新整理儀表板失敗', 'error');
  } finally {
    hideLoading();
  }
}

/**
 * 更新寶寶選擇下拉式選單
 */
async function updateChildSelector() {
  const selector = document.getElementById('child-selector');
  if (!selector) return;
  
  try {
    const children = await getRecords(STORES.children);
    
    // 清除現有選項（除了第一個）
    while (selector.children.length > 1) {
      selector.removeChild(selector.lastChild);
    }
    
    // 新增寶寶選項
    children.forEach(child => {
      const option = document.createElement('option');
      option.value = child.id;
      option.textContent = child.name;
      if (child.id === currentSelectedChild) {
        option.selected = true;
      }
      selector.appendChild(option);
    });
    
    // 如果沒有選取的寶寶但有寶寶存在，選擇第一個
    if (!currentSelectedChild && children.length > 0) {
      currentSelectedChild = children[0].id;
      selector.value = currentSelectedChild;
    }
  } catch (error) {
    console.error('更新寶寶選擇錯誤:', error);
  }
}

/**
 * 更新今日摘要統計
 */
async function updateTodaySummary() {
  if (!currentSelectedChild) {
    // 如果沒有選取寶寶，清除摘要
    document.getElementById('today-feedings').textContent = '0';
    document.getElementById('today-sleep').textContent = '0h';
    document.getElementById('today-diapers').textContent = '0';
    return;
  }
  
  try {
    // 取得選取寶寶的今日記錄
    const [feedings, sleeps, diapers] = await Promise.all([
      getTodayRecords(STORES.feeding, currentSelectedChild),
      getTodayRecords(STORES.sleep, currentSelectedChild),
      getTodayRecords(STORES.diaper, currentSelectedChild)
    ]);
    
    // 更新餵食次數
    document.getElementById('today-feedings').textContent = feedings.length;
    
    // 計算總睡眠時間
    let totalSleepMinutes = 0;
    sleeps.forEach(sleep => {
      if (sleep.startTime && sleep.endTime) {
        const start = new Date(sleep.startTime);
        const end = new Date(sleep.endTime);
        totalSleepMinutes += (end - start) / (1000 * 60);
      }
    });
    const sleepHours = Math.floor(totalSleepMinutes / 60);
    const sleepMinutes = Math.floor(totalSleepMinutes % 60);
    document.getElementById('today-sleep').textContent = 
      sleepMinutes === 0 ? `${sleepHours}h` : `${sleepHours}h ${sleepMinutes}m`;
    
    // 更新尿布次數
    document.getElementById('today-diapers').textContent = diapers.length;
  } catch (error) {
    console.error('更新今日摘要錯誤:', error);
  }
}

/**
 * 更新最近記錄列表
 */
async function updateRecentRecords() {
  const container = document.getElementById('recent-records');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!currentSelectedChild) {
    container.innerHTML = '<p class="text-center text-secondary">選擇寶寶以查看最近記錄</p>';
    return;
  }
  
  try {
    // 從所有類型取得最近記錄
    const allRecords = [];
    
    for (const [storeName, storeKey] of Object.entries(STORES)) {
      if (storeName === 'children') continue;
      
      const records = await getRecords(storeKey, { childId: currentSelectedChild });
      records.forEach(record => {
        record._type = storeName;
        allRecords.push(record);
      });
    }
    
    // 依時間戳記排序（最新優先）
    allRecords.sort((a, b) => {
      const dateA = new Date(a.date || a.timestamp);
      const dateB = new Date(b.date || b.timestamp);
      return dateB - dateA;
    });
    
    // 只顯示最近5筆記錄
    const recentRecords = allRecords.slice(0, 5);
    
    if (recentRecords.length === 0) {
      container.innerHTML = '<p class="text-center text-secondary">沒有最近記錄</p>';
      return;
    }
    
    recentRecords.forEach(record => {
      const recordConfig = RECORD_TYPES[record._type];
      if (!recordConfig) return;
      
      const recordElement = document.createElement('div');
      recordElement.className = 'recent-record-item';
      
      // 取得選項標籤（如果有的話）
      let typeDisplay = record.type;
      if (record.type && recordConfig.fields) {
        const typeField = recordConfig.fields.find(f => f.name === 'type');
        if (typeField && typeField.optionLabels && typeField.optionLabels[record.type]) {
          typeDisplay = typeField.optionLabels[record.type];
        }
      }
      
      recordElement.innerHTML = `
        <div class="recent-record-info">
          <div class="recent-record-icon ${record._type}" style="background-color: ${recordConfig.color}">
            <i class="${recordConfig.icon}"></i>
          </div>
          <div class="recent-record-details">
            <div class="recent-record-title">
              ${recordConfig.name}${typeDisplay ? ` - ${typeDisplay}` : ''}
            </div>
            <div class="recent-record-time">
              ${formatTimestamp(record.date || record.startTime || record.time || record.timestamp, 'relative')}
            </div>
          </div>
        </div>
      `;
      
      container.appendChild(recordElement);
    });
  } catch (error) {
    console.error('更新最近記錄錯誤:', error);
    container.innerHTML = '<p class="text-center text-error">載入最近記錄失敗</p>';
  }
}

// ============================================
// 寶寶管理函數
// ============================================

/**
 * 重新整理寶寶列表
 */
async function refreshChildren() {
  const container = document.getElementById('children-list');
  if (!container) return;
  
  try {
    showLoading();
    const children = await getRecords(STORES.children);
    
    container.innerHTML = '';
    
    if (children.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-baby" style="font-size: 4rem; color: var(--text-light); margin-bottom: 1rem;"></i>
          <h3>尚未新增寶寶</h3>
          <p>新增您的第一個寶寶以開始追蹤照護記錄。</p>
        </div>
      `;
      return;
    }
    
    // 取得每個寶寶的今日記錄以顯示摘要
    for (const child of children) {
      const [feedings, sleeps, diapers] = await Promise.all([
        getTodayRecords(STORES.feeding, child.id),
        getTodayRecords(STORES.sleep, child.id),
        getTodayRecords(STORES.diaper, child.id)
      ]);
      
      const childCard = document.createElement('div');
      childCard.className = 'child-card';
      
      // 處理性別顯示
      let genderDisplay = '未設定';
      if (child.gender) {
        const genderMap = { boy: '男孩', girl: '女孩', other: '其他' };
        genderDisplay = genderMap[child.gender] || child.gender;
      }
      
      childCard.innerHTML = `
        <div class="child-card-header">
          <div class="child-photo">
            ${child.photo 
              ? `<img src="${child.photo}" alt="${child.name}">` 
              : `<i class="fas fa-baby"></i>`
            }
          </div>
          <div class="child-name">${child.name}</div>
          <div class="child-age">${calculateAge(child.birthDate)}</div>
        </div>
        <div class="child-card-body">
          <div class="child-stats">
            <div class="child-stat">
              <span class="child-stat-value">${feedings.length}</span>
              <span class="child-stat-label">今日餵食</span>
            </div>
            <div class="child-stat">
              <span class="child-stat-value">${sleeps.length}</span>
              <span class="child-stat-label">睡眠次數</span>
            </div>
            <div class="child-stat">
              <span class="child-stat-value">${diapers.length}</span>
              <span class="child-stat-label">換尿布</span>
            </div>
            <div class="child-stat">
              <span class="child-stat-value">${genderDisplay}</span>
              <span class="child-stat-label">性別</span>
            </div>
          </div>
          <div class="child-actions">
            <button class="child-action-btn" onclick="selectChild('${child.id}')">
              <i class="fas fa-eye"></i>
              選擇
            </button>
            <button class="child-action-btn" onclick="editChild('${child.id}')">
              <i class="fas fa-edit"></i>
              編輯
            </button>
            <button class="child-action-btn" onclick="deleteChild('${child.id}')">
              <i class="fas fa-trash"></i>
              刪除
            </button>
          </div>
        </div>
      `;
      
      container.appendChild(childCard);
    }
  } catch (error) {
    console.error('重新整理寶寶錯誤:', error);
    showToast('載入寶寶失敗', 'error');
  } finally {
    hideLoading();
  }
}

/**
 * 顯示新增/編輯寶寶彈出視窗
 * @param {string|null} childId - 編輯時的寶寶ID，新增時為 null
 */
async function showChildModal(childId = null) {
  const modal = document.getElementById('child-modal');
  const title = document.getElementById('child-modal-title');
  const form = document.getElementById('child-form');
  
  if (!modal || !title || !form) return;
  
  // 重設表單
  form.reset();
  clearFormErrors(form);
  
  // 更新彈出視窗標題
  title.textContent = childId ? '編輯寶寶' : '新增寶寶';
  
  // 如果是編輯，填入現有資料
  if (childId) {
    try {
      const child = await getRecord(STORES.children, childId);
      if (child) {
        document.getElementById('child-name').value = child.name || '';
        document.getElementById('child-birth-date').value = child.birthDate || '';
        document.getElementById('child-gender').value = child.gender || '';
        document.getElementById('child-notes').value = child.notes || '';
        
        if (child.photo) {
          const preview = document.getElementById('child-photo-preview');
          preview.innerHTML = `<img src="${child.photo}" alt="寶寶照片">`;
        }
        
        // 在表單中儲存寶寶ID以供稍後使用
        form.dataset.childId = childId;
      }
    } catch (error) {
      console.error('載入寶寶資料錯誤:', error);
      showToast('載入寶寶資料失敗', 'error');
      return;
    }
  } else {
    delete form.dataset.childId;
  }
  
  showModal('child-modal');
}

/**
 * 儲存寶寶資料
 * @param {HTMLFormElement} form - 寶寶表單元素
 */
async function saveChild(form) {
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  try {
    showLoading();
    
    const formData = new FormData(form);
    const isEditing = !!form.dataset.childId;
    
    // 準備寶寶資料
    const childData = {
      name: formData.get('name'),
      birthDate: formData.get('birthDate'),
      gender: formData.get('gender') || null,
      notes: formData.get('notes') || null
    };
    
    // 處理照片上傳
    const photoFile = document.getElementById('child-photo').files[0];
    if (photoFile) {
      try {
        childData.photo = await fileToBase64(photoFile);
      } catch (error) {
        console.error('處理照片錯誤:', error);
        showToast('處理照片失敗', 'warning');
      }
    } else if (!isEditing) {
      childData.photo = null;
    }
    
    // 如果是編輯，包含現有ID
    if (isEditing) {
      childData.id = form.dataset.childId;
    }
    
    // 儲存到資料庫
    const childId = await saveRecord(STORES.children, childData);
    
    hideModal('child-modal');
    showToast(isEditing ? '寶寶更新成功' : '寶寶新增成功', 'success');
    
    // 更新介面
    await refreshChildren();
    await updateChildSelector();
    
    // 如果這是新寶寶且沒有選取的寶寶，選擇這個
    if (!isEditing && !currentSelectedChild) {
      currentSelectedChild = childId;
      await refreshDashboard();
    }
  } catch (error) {
    console.error('儲存寶寶錯誤:', error);
    showToast('儲存寶寶失敗', 'error');
  } finally {
    hideLoading();
  }
}

/**
 * 選擇寶寶
 * @param {string} childId - 要選擇的寶寶ID
 */
async function selectChild(childId) {
  currentSelectedChild = childId;
  
  // 更新寶寶選擇器
  const selector = document.getElementById('child-selector');
  if (selector) {
    selector.value = childId;
  }
  
  // 重新整理儀表板並切換到儀表板
  switchTab('dashboard');
  showToast('寶寶已選擇', 'success');
}

/**
 * 編輯寶寶
 * @param {string} childId - 要編輯的寶寶ID
 */
function editChild(childId) {
  showChildModal(childId);
}

/**
 * 刪除寶寶
 * @param {string} childId - 要刪除的寶寶ID
 */
async function deleteChild(childId) {
  if (!confirm('您確定要刪除這個寶寶嗎？此動作無法復原，同時會刪除所有相關記錄。')) {
    return;
  }
  
  try {
    showLoading();
    
    // 刪除寶寶
    await deleteRecord(STORES.children, childId);
    
    // 刪除所有相關記錄
    const recordTypes = [STORES.feeding, STORES.sleep, STORES.diaper, STORES.health, STORES.milestone, STORES.activity, STORES.interaction];
    
    for (const recordType of recordTypes) {
      const records = await getRecords(recordType, { childId });
      for (const record of records) {
        await deleteRecord(recordType, record.id);
      }
    }
    
    // 如果刪除的是當前選取的寶寶，更新當前選擇
    if (currentSelectedChild === childId) {
      currentSelectedChild = null;
    }
    
    showToast('寶寶刪除成功', 'success');
    
    // 重新整理介面
    await refreshChildren();
    await updateChildSelector();
    await refreshDashboard();
  } catch (error) {
    console.error('刪除寶寶錯誤:', error);
    showToast('刪除寶寶失敗', 'error');
  } finally {
    hideLoading();
  }
}

// ============================================
// 記錄管理函數
// ============================================

/**
 * 顯示新增/編輯記錄彈出視窗
 * @param {string} recordType - 記錄類型
 * @param {string|null} recordId - 編輯時的記錄ID，新增時為 null
 */
async function showRecordModal(recordType, recordId = null) {
  const modal = document.getElementById('record-modal');
  const title = document.getElementById('record-modal-title');
  const form = document.getElementById('record-form');
  const fieldsContainer = document.getElementById('dynamic-form-fields');
  
  if (!modal || !title || !form || !fieldsContainer) return;
  
  const recordConfig = RECORD_TYPES[recordType];
  if (!recordConfig) {
    showToast('無效的記錄類型', 'error');
    return;
  }
  
  // 重設表單
  form.reset();
  clearFormErrors(form);
  fieldsContainer.innerHTML = '';
  
  // 更新彈出視窗標題
  title.textContent = `${recordId ? '編輯' : '新增'}${recordConfig.name}`;
  
  // 更新記錄表單中的寶寶選擇器
  await updateRecordChildSelector();
  
  // 產生動態表單欄位
  recordConfig.fields.forEach(field => {
    const fieldGroup = createFormField(field);
    fieldsContainer.appendChild(fieldGroup);
  });
  
  // 設定條件欄位可見性
  setupConditionalFields(fieldsContainer, recordConfig.fields);
  
  // 如果是編輯，填入現有資料
  if (recordId) {
    try {
      const recordStoreName = STORES[recordType];
      const record = await getRecord(recordStoreName, recordId);
      if (record) {
        populateForm(form, record);
        form.dataset.recordId = recordId;
        form.dataset.recordType = recordType;
      }
    } catch (error) {
      console.error('載入記錄資料錯誤:', error);
      showToast('載入記錄資料失敗', 'error');
      return;
    }
  } else {
    form.dataset.recordType = recordType;
    delete form.dataset.recordId;
    
    // 如果有的話，預選當前寶寶
    if (currentSelectedChild) {
      document.getElementById('record-child').value = currentSelectedChild;
    }
    
    // 為時間欄位設定預設值為當前時間
    const now = new Date();
    const timeFields = form.querySelectorAll('input[type="datetime-local"], input[type="date"]');
    timeFields.forEach(field => {
      if (field.name.includes('time') || field.name === 'date') {
        if (field.type === 'datetime-local') {
          // 為 datetime-local 輸入格式化
          const offset = now.getTimezoneOffset() * 60000;
          const localISOTime = new Date(now - offset).toISOString().slice(0, 16);
          field.value = localISOTime;
        } else if (field.type === 'date') {
          // 為 date 輸入格式化
          field.value = now.toISOString().slice(0, 10);
        }
      }
    });
  }
  
  showModal('record-modal');
}

/**
 * 建立表單欄位 HTML
 * @param {object} fieldConfig - 欄位設定
 * @returns {HTMLElement} 表單欄位元素
 */
function createFormField(fieldConfig) {
  const group = document.createElement('div');
  group.className = 'form-group';
  if (fieldConfig.showIf) {
    group.dataset.showIf = fieldConfig.showIf;
    group.style.display = 'none';
  }
  
  const label = document.createElement('label');
  label.textContent = fieldConfig.label + (fieldConfig.required ? ' *' : '');
  label.setAttribute('for', `record-${fieldConfig.name}`);
  
  let input;
  
  switch (fieldConfig.type) {
    case 'select':
      input = document.createElement('select');
      input.innerHTML = '<option value="">選擇...</option>';
      fieldConfig.options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        
        // 使用自訂標籤（如果有的話）
        const displayText = fieldConfig.optionLabels && fieldConfig.optionLabels[option] 
          ? fieldConfig.optionLabels[option] 
          : option.charAt(0).toUpperCase() + option.slice(1);
        
        optionElement.textContent = displayText;
        input.appendChild(optionElement);
      });
      break;
    
    case 'textarea':
      input = document.createElement('textarea');
      input.rows = 3;
      break;
    
    case 'file':
      input = document.createElement('input');
      input.type = 'file';
      if (fieldConfig.accept) {
        input.accept = fieldConfig.accept;
      }
      break;
    
    default:
      input = document.createElement('input');
      input.type = fieldConfig.type;
      if (fieldConfig.min !== undefined) input.min = fieldConfig.min;
      if (fieldConfig.max !== undefined) input.max = fieldConfig.max;
      if (fieldConfig.step !== undefined) input.step = fieldConfig.step;
      break;
  }
  
  input.id = `record-${fieldConfig.name}`;
  input.name = fieldConfig.name;
  if (fieldConfig.required) {
    input.required = true;
  }
  
  group.appendChild(label);
  group.appendChild(input);
  
  return group;
}

/**
 * 設定條件欄位可見性
 * @param {HTMLElement} container - 表單欄位容器
 * @param {Array} fields - 欄位設定
 */
function setupConditionalFields(container, fields) {
  const conditionalFields = fields.filter(field => field.showIf);
  
  if (conditionalFields.length === 0) return;
  
  // 為控制可見性的欄位新增變更監聽器
  conditionalFields.forEach(condField => {
    const [controlFieldName, expectedValue] = condField.showIf.split('=');
    const controlField = container.querySelector(`[name="${controlFieldName}"]`);
    const targetField = container.querySelector(`[data-show-if="${condField.showIf}"]`);
    
    if (controlField && targetField) {
      const updateVisibility = () => {
        const shouldShow = controlField.value === expectedValue;
        targetField.style.display = shouldShow ? 'block' : 'none';
        
        // 如果隱藏，清除值
        if (!shouldShow) {
          const input = targetField.querySelector('input, select, textarea');
          if (input) {
            input.value = '';
          }
        }
      };
      
      controlField.addEventListener('change', updateVisibility);
      updateVisibility(); // 初始檢查
    }
  });
}

/**
 * 用記錄資料填入表單
 * @param {HTMLFormElement} form - 表單元素
 * @param {object} record - 記錄資料
 */
function populateForm(form, record) {
  Object.keys(record).forEach(key => {
    const field = form.querySelector(`[name="${key}"]`);
    if (field && key !== 'id') {
      if (field.type === 'file') {
        // 分別處理檔案欄位
        return;
      } else if (field.type === 'datetime-local') {
        // 為 datetime-local 輸入格式化日期時間
        if (record[key]) {
          const date = new Date(record[key]);
          const offset = date.getTimezoneOffset() * 60000;
          const localISOTime = new Date(date - offset).toISOString().slice(0, 16);
          field.value = localISOTime;
        }
      } else {
        field.value = record[key] || '';
      }
    }
  });
  
  // 觸發條件欄位更新
  form.querySelectorAll('select, input[type="radio"]').forEach(field => {
    field.dispatchEvent(new Event('change'));
  });
}

/**
 * 更新記錄表單中的寶寶選擇器
 */
async function updateRecordChildSelector() {
  const selector = document.getElementById('record-child');
  if (!selector) return;
  
  try {
    const children = await getRecords(STORES.children);
    
    // 清除現有選項（除了第一個）
    while (selector.children.length > 1) {
      selector.removeChild(selector.lastChild);
    }
    
    // 新增寶寶選項
    children.forEach(child => {
      const option = document.createElement('option');
      option.value = child.id;
      option.textContent = child.name;
      selector.appendChild(option);
    });
  } catch (error) {
    console.error('更新記錄寶寶選擇器錯誤:', error);
  }
}

/**
 * 儲存記錄資料
 * @param {HTMLFormElement} form - 記錄表單元素
 */
async function saveRecordData(form) {
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const recordType = form.dataset.recordType;
  const recordConfig = RECORD_TYPES[recordType];
  
  if (!recordConfig) {
    showToast('無效的記錄類型', 'error');
    return;
  }
  
  try {
    showLoading();
    
    const formData = new FormData(form);
    const isEditing = !!form.dataset.recordId;
    
    // 準備記錄資料
    const recordData = {
      childId: formData.get('childId')
    };
    
    // 處理表單欄位
    for (const field of recordConfig.fields) {
      const value = formData.get(field.name);
      
      if (field.type === 'file' && value) {
        // 處理檔案上傳
        const fileInput = form.querySelector(`[name="${field.name}"]`);
        const file = fileInput.files[0];
        if (file) {
          try {
            recordData[field.name] = await fileToBase64(file);
          } catch (error) {
            console.error('處理檔案錯誤:', error);
            showToast('處理檔案失敗', 'warning');
          }
        }
      } else if (field.type === 'number') {
        recordData[field.name] = value ? parseFloat(value) : null;
      } else {
        recordData[field.name] = value || null;
      }
    }
    
    // 新增備註
    recordData.notes = formData.get('notes') || null;
    
    // 如果是編輯，包含現有ID
    if (isEditing) {
      recordData.id = form.dataset.recordId;
    }
    
    // 儲存到資料庫
    const storeName = STORES[recordType];
    await saveRecord(storeName, recordData);
    
    hideModal('record-modal');
    showToast(
      `${recordConfig.name}${isEditing ? '更新' : '記錄'}成功`, 
      'success'
    );
    
    // 更新介面
    await refreshRecords();
    await refreshDashboard();
  } catch (error) {
    console.error('儲存記錄錯誤:', error);
    showToast('儲存記錄失敗', 'error');
  } finally {
    hideLoading();
  }
}

/**
 * 重新整理記錄列表
 */
async function refreshRecords() {
  const container = document.getElementById('records-container');
  if (!container) return;
  
  try {
    showLoading();
    
    // 取得篩選值
    const typeFilter = document.getElementById('record-type-filter').value;
    const dateFilter = document.getElementById('record-date-filter').value;
    
    // 取得所有記錄
    let allRecords = [];
    
    for (const [recordType, storeName] of Object.entries(STORES)) {
      if (recordType === 'children') continue;
      
      const filters = {};
      if (dateFilter) {
        const date = new Date(dateFilter);
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
        filters.startDate = startOfDay;
        filters.endDate = endOfDay;
      }
      
      if (!typeFilter || typeFilter === recordType) {
        const records = await getRecords(storeName, filters);
        records.forEach(record => {
          record._type = recordType;
          allRecords.push(record);
        });
      }
    }
    
    // 取得寶寶資料以取得名稱
    const children = await getRecords(STORES.children);
    const childrenMap = children.reduce((map, child) => {
      map[child.id] = child;
      return map;
    }, {});
    
    // 依時間戳記排序（最新優先）
    allRecords.sort((a, b) => {
      const dateA = new Date(a.date || a.timestamp);
      const dateB = new Date(b.date || b.timestamp);
      return dateB - dateA;
    });
    
    // 清除容器
    container.innerHTML = '';
    
    if (allRecords.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-clipboard" style="font-size: 4rem; color: var(--text-light); margin-bottom: 1rem;"></i>
          <h3>找不到記錄</h3>
          <p>開始記錄您寶寶的活動以在此處查看。</p>
        </div>
      `;
      return;
    }
    
    // 渲染記錄
    allRecords.forEach(record => {
      const recordConfig = RECORD_TYPES[record._type];
      const child = childrenMap[record.childId];
      
      if (!recordConfig) return;
      
      const recordElement = createRecordElement(record, recordConfig, child);
      container.appendChild(recordElement);
    });
  } catch (error) {
    console.error('重新整理記錄錯誤:', error);
    showToast('載入記錄失敗', 'error');
  } finally {
    hideLoading();
  }
}

/**
 * 建立顯示用記錄元素
 * @param {object} record - 記錄資料
 * @param {object} recordConfig - 記錄類型設定
 * @param {object} child - 寶寶資料
 * @returns {HTMLElement} 記錄元素
 */
function createRecordElement(record, recordConfig, child) {
  const recordElement = document.createElement('div');
  recordElement.className = 'record-item';
  
  // 決定主要時間戳記
  const primaryTime = record.date || record.startTime || record.time || record.timestamp;
  
  // 建立詳細資料陣列
  const details = [];
  
  recordConfig.fields.forEach(field => {
    if (record[field.name] && field.name !== 'notes') {
      let value = record[field.name];
      
      // 根據欄位類型格式化值
      if (field.type === 'datetime-local' && field.name !== 'startTime') {
        value = formatTimestamp(value, 'time');
      } else if (field.type === 'date') {
        value = formatTimestamp(value, 'date');
      } else if (field.type === 'select' && field.optionLabels && field.optionLabels[value]) {
        value = field.optionLabels[value];
      } else if (field.type === 'select' && field.options) {
        value = value.charAt(0).toUpperCase() + value.slice(1);
      }
      
      details.push({
        label: field.label,
        value: value
      });
    }
  });
  
  // 處理記錄類型顯示
  let typeDisplay = '';
  if (record.type) {
    const typeField = recordConfig.fields.find(f => f.name === 'type');
    if (typeField && typeField.optionLabels && typeField.optionLabels[record.type]) {
      typeDisplay = ` - ${typeField.optionLabels[record.type]}`;
    } else {
      typeDisplay = ` - ${record.type}`;
    }
  }
  
  recordElement.innerHTML = `
    <div class="record-item-header">
      <div class="record-item-title">
        <div class="record-item-icon ${record._type}" style="background-color: ${recordConfig.color}">
          <i class="${recordConfig.icon}"></i>
        </div>
        <div class="record-item-info">
          <h4>${recordConfig.name}${typeDisplay}</h4>
          <p>${child ? child.name : '未知寶寶'}</p>
        </div>
      </div>
      <div class="record-item-time">
        ${formatTimestamp(primaryTime, 'datetime')}
      </div>
    </div>
    <div class="record-item-body">
      ${details.length > 0 ? `
        <div class="record-item-details">
          ${details.map(detail => `
            <div class="record-detail-item">
              <span class="record-detail-label">${detail.label}:</span>
              <span class="record-detail-value">${detail.value}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${record.notes ? `
        <div class="record-item-notes">
          <strong>備註:</strong> ${record.notes}
        </div>
      ` : ''}
      <div class="record-item-actions" style="margin-top: 1rem; display: flex; gap: 0.5rem;">
        <button class="btn secondary" onclick="showRecordModal('${record._type}', '${record.id}')">
          <i class="fas fa-edit"></i> 編輯
        </button>
        <button class="btn error" onclick="deleteRecordConfirm('${record._type}', '${record.id}')">
          <i class="fas fa-trash"></i> 刪除
        </button>
      </div>
    </div>
  `;
  
  return recordElement;
}

/**
 * 刪除記錄
 * @param {string} recordType - 記錄類型
 * @param {string} recordId - 記錄ID
 */
async function deleteRecordConfirm(recordType, recordId) {
  if (!confirm('您確定要刪除這個記錄嗎？此動作無法復原。')) {
    return;
  }
  
  try {
    showLoading();
    
    const storeName = STORES[recordType];
    await deleteRecord(storeName, recordId);
    
    showToast('記錄刪除成功', 'success');
    
    // 重新整理介面
    await refreshRecords();
    await refreshDashboard();
  } catch (error) {
    console.error('刪除記錄錯誤:', error);
    showToast('刪除記錄失敗', 'error');
  } finally {
    hideLoading();
  }
}

/**
 * 匯出記錄為 JSON
 */
async function exportRecords() {
  try {
    showLoading();
    
    const data = await exportData();
    
    // 建立下載連結
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `寶寶照護備份-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showToast('資料匯出成功', 'success');
  } catch (error) {
    console.error('匯出錯誤:', error);
    showToast('資料匯出失敗', 'error');
  } finally {
    hideLoading();
  }
}

// ============================================
// 圖表函數
// ============================================

/**
 * 重新整理圖表
 */
async function refreshCharts() {
  try {
    showLoading();
    await updateChartChildFilter();
    await renderAllCharts();
  } catch (error) {
    console.error('重新整理圖表錯誤:', error);
    showToast('重新整理圖表失敗', 'error');
  } finally {
    hideLoading();
  }
}

/**
 * 更新圖表寶寶篩選器
 */
async function updateChartChildFilter() {
  const selector = document.getElementById('chart-child-filter');
  if (!selector) return;
  
  try {
    const children = await getRecords(STORES.children);
    
    // 清除現有選項（除了第一個）
    while (selector.children.length > 1) {
      selector.removeChild(selector.lastChild);
    }
    
    // 新增寶寶選項
    children.forEach(child => {
      const option = document.createElement('option');
      option.value = child.id;
      option.textContent = child.name;
      selector.appendChild(option);
    });
  } catch (error) {
    console.error('更新圖表寶寶篩選器錯誤:', error);
  }
}

/**
 * 渲染所有圖表
 */
async function renderAllCharts() {
  await Promise.all([
    renderFeedingChart(),
    renderSleepChart(),
    renderWeightChart(),
    renderActivityChart()
  ]);
}

/**
 * 根據篩選器取得圖表資料
 * @param {string} storeName - 儲存區名稱
 * @returns {Promise<Array>} 圖表資料
 */
async function getChartData(storeName) {
  const childFilter = document.getElementById('chart-child-filter').value;
  const periodFilter = document.getElementById('chart-period').value;
  
  // 計算日期範圍
  const now = new Date();
  let startDate;
  
  switch (periodFilter) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '3months':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  
  const filters = {
    startDate,
    endDate: now
  };
  
  if (childFilter) {
    filters.childId = childFilter;
  }
  
  return await getRecords(storeName, filters);
}

/**
 * 渲染餵食圖表
 */
async function renderFeedingChart() {
  const canvas = document.getElementById('feeding-chart');
  if (!canvas) return;
  
  try {
    const data = await getChartData(STORES.feeding);
    
    // 依日期和類型分組
    const dailyData = {};
    data.forEach(record => {
      const date = new Date(record.startTime || record.timestamp).toDateString();
      if (!dailyData[date]) {
        dailyData[date] = { breast: 0, formula: 0, solid: 0 };
      }
      dailyData[date][record.type] = (dailyData[date][record.type] || 0) + 1;
    });
    
    // 排序日期並準備圖表資料
    const sortedDates = Object.keys(dailyData).sort((a, b) => new Date(a) - new Date(b));
    const labels = sortedDates.map(date => formatTimestamp(new Date(date), 'date'));
    
    const ctx = canvas.getContext('2d');
    
    // 如果存在現有圖表則銷毀
    if (canvas.chart) {
      canvas.chart.destroy();
    }
    
    canvas.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '母乳',
            data: sortedDates.map(date => dailyData[date].breast),
            borderColor: '#ff7eb3',
            backgroundColor: 'rgba(255, 126, 179, 0.1)',
            tension: 0.4
          },
          {
            label: '配方奶',
            data: sortedDates.map(date => dailyData[date].formula),
            borderColor: '#7eb3ff',
            backgroundColor: 'rgba(126, 179, 255, 0.1)',
            tension: 0.4
          },
          {
            label: '副食品',
            data: sortedDates.map(date => dailyData[date].solid),
            borderColor: '#ffb347',
            backgroundColor: 'rgba(255, 179, 71, 0.1)',
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top'
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
    console.error('渲染餵食圖表錯誤:', error);
  }
}

/**
 * 渲染睡眠圖表
 */
async function renderSleepChart() {
  const canvas = document.getElementById('sleep-chart');
  if (!canvas) return;
  
  try {
    const data = await getChartData(STORES.sleep);
    
    // 依日期分組並計算總睡眠時間
    const dailyData = {};
    data.forEach(record => {
      if (record.startTime && record.endTime) {
        const date = new Date(record.startTime).toDateString();
        const duration = (new Date(record.endTime) - new Date(record.startTime)) / (1000 * 60 * 60); // 小時
        if (!dailyData[date]) {
          dailyData[date] = 0;
        }
        dailyData[date] += duration;
      }
    });
    
    // 排序日期並準備圖表資料
    const sortedDates = Object.keys(dailyData).sort((a, b) => new Date(a) - new Date(b));
    const labels = sortedDates.map(date => formatTimestamp(new Date(date), 'date'));
    
    const ctx = canvas.getContext('2d');
    
    // 如果存在現有圖表則銷毀
    if (canvas.chart) {
      canvas.chart.destroy();
    }
    
    canvas.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '睡眠時數',
          data: sortedDates.map(date => dailyData[date]),
          backgroundColor: 'rgba(126, 179, 255, 0.5)',
          borderColor: '#7eb3ff',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value + '小時';
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('渲染睡眠圖表錯誤:', error);
  }
}

/**
 * 渲染體重圖表（預留位置 - 尚未收集體重資料）
 */
async function renderWeightChart() {
  const canvas = document.getElementById('weight-chart');
  if (!canvas) return;
  
  try {
    const ctx = canvas.getContext('2d');
    
    // 如果存在現有圖表則銷毀
    if (canvas.chart) {
      canvas.chart.destroy();
    }
    
    // 使用樣本資料的預留位置圖表
    canvas.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['第1週', '第2週', '第3週', '第4週'],
        datasets: [{
          label: '體重 (公斤)',
          data: [],
          borderColor: '#7cb342',
          backgroundColor: 'rgba(124, 179, 66, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
    
    // 顯示沒有資料的訊息
    const chartContainer = canvas.parentElement;
    if (!chartContainer.querySelector('.no-data-message')) {
      const message = document.createElement('div');
      message.className = 'no-data-message';
      message.style.position = 'absolute';
      message.style.top = '50%';
      message.style.left = '50%';
      message.style.transform = 'translate(-50%, -50%)';
      message.style.textAlign = 'center';
      message.style.color = 'var(--text-secondary)';
      message.innerHTML = '<p>體重追蹤即將推出</p>';
      chartContainer.style.position = 'relative';
      chartContainer.appendChild(message);
    }
  } catch (error) {
    console.error('渲染體重圖表錯誤:', error);
  }
}

/**
 * 渲染活動圖表
 */
async function renderActivityChart() {
  const canvas = document.getElementById('activity-chart');
  if (!canvas) return;
  
  try {
    const data = await getChartData(STORES.activity);
    
    // 依類型計算活動次數
    const activityCounts = {};
    data.forEach(record => {
      const type = record.type || 'unknown';
      activityCounts[type] = (activityCounts[type] || 0) + 1;
    });
    
    // 翻譯活動類型
    const activityLabels = {
      'bath': '洗澡',
      'massage': '按摩',
      'changing': '換衣服',
      'tummy-time': '趴趴時間',
      'sensory-play': '感官遊戲',
      'reading': '親子閱讀',
      'music': '音樂互動',
      'walk': '散步',
      'sunbath': '日光浴',
      'social': '社交互動',
      'custom': '自訂活動'
    };
    
    const labels = Object.keys(activityCounts).map(key => 
      activityLabels[key] || key
    );
    const values = Object.values(activityCounts);
    
    const ctx = canvas.getContext('2d');
    
    // 如果存在現有圖表則銷毀
    if (canvas.chart) {
      canvas.chart.destroy();
    }
    
    canvas.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: [
            '#ff7eb3',
            '#7eb3ff',
            '#ffb347',
            '#7cb342',
            '#ffa726',
            '#e57373',
            '#ab47bc',
            '#26a69a',
            '#ff8a65',
            '#9575cd'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  } catch (error) {
    console.error('渲染活動圖表錯誤:', error);
  }
}

// ============================================
// 設定函數
// ============================================

/**
 * 顯示設定彈出視窗
 */
function showSettingsModal() {
  populateTimezones();
  showModal('settings-modal');
}

/**
 * 處理備份資料
 */
async function handleBackup() {
  await exportRecords(); // 重複使用匯出函數
}

/**
 * 處理還原資料
 */
function handleRestore() {
  const fileInput = document.getElementById('restore-file');
  fileInput.click();
}

/**
 * 處理還原檔案
 * @param {Event} event - 檔案輸入變更事件
 */
async function processRestoreFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    showLoading();
    
    const text = await file.text();
    const data = JSON.parse(text);
    
    await importData(data);
  } catch (error) {
    console.error('還原錯誤:', error);
    showToast('還原資料失敗：檔案格式無效', 'error');
  } finally {
    hideLoading();
    // 重設檔案輸入
    event.target.value = '';
  }
}

// ============================================
// 重新整理所有函數
// ============================================

/**
 * 重新整理所有元件
 */
async function refreshAll() {
  await refreshDashboard();
  await refreshChildren();
  await refreshRecords();
  await refreshCharts();
}

// ============================================
// 事件監聽器設定
// ============================================

/**
 * 設定事件監聽器
 */
function setupEventListeners() {
  // 主題切換
  document.querySelector('.theme-toggle').addEventListener('click', toggleTheme);
  
  // 設定按鈕
  document.querySelector('.settings-btn').addEventListener('click', showSettingsModal);
  
  // 導航分頁
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      switchTab(tabId);
    });
  });
  
  // 寶寶選擇器變更
  document.getElementById('child-selector').addEventListener('change', async (e) => {
    currentSelectedChild = e.target.value || null;
    await refreshDashboard();
  });
  
  // 快速記錄按鈕
  document.querySelectorAll('.record-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const recordType = btn.dataset.type;
      showRecordModal(recordType);
    });
  });
  
  // 快速操作按鈕
  document.querySelectorAll('.quick-action').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      showRecordModal(action);
    });
  });
  
  // 新增寶寶按鈕
  document.querySelector('.add-child-btn').addEventListener('click', () => {
    showChildModal();
  });
  
  // 匯出按鈕
  document.querySelector('.export-btn').addEventListener('click', exportRecords);
  
  // 記錄篩選器
  document.getElementById('record-type-filter').addEventListener('change', 
    debounce(refreshRecords, 300)
  );
  document.getElementById('record-date-filter').addEventListener('change', 
    debounce(refreshRecords, 300)
  );
  
  // 圖表篩選器
  document.getElementById('chart-child-filter').addEventListener('change', 
    debounce(renderAllCharts, 300)
  );
  document.getElementById('chart-period').addEventListener('change', 
    debounce(renderAllCharts, 300)
  );
  
  // 彈出視窗關閉按鈕
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');