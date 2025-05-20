/**
 * 嬰兒照護追蹤應用程式
 * 完整的前端解決方案，使用 vanilla JavaScript, IndexedDB 儲存資料
 * 支援多寶寶管理、餵食、睡眠、尿布、健康、里程碑、互動、活動記錄
 * 包含統計圖表、時區管理、主題切換、資料匯入匯出等功能
 */

(function() {
    'use strict';
    
    // 全域變數
    let currentChildId = null;
    let currentTheme = 'light';
    let currentTimezone = 'Asia/Taipei';
    let db = null;
    let currentChart = null;
    let editingRecordId = null;
    let editingRecordType = null;
    
    // 資料庫設定
    const DB_NAME = 'BabyTrackerDB';
    const DB_VERSION = 1;
    
    // 物件商店名稱
    const STORES = {
        CHILDREN: 'children',
        FEEDINGS: 'feedings',
        SLEEPS: 'sleeps',
        DIAPERS: 'diapers',
        HEALTH: 'health',
        MILESTONES: 'milestones',
        INTERACTIONS: 'interactions',
        ACTIVITIES: 'activities'
    };
    
    // 活動類型對照表
    const ACTIVITY_TYPES = {
        'bath': '洗澡',
        'massage': '按摩',
        'changing': '換衣/護理',
        'tummytime': '俯臥時間',
        'sensory': '感官遊戲',
        'reading': '親子閱讀',
        'music': '音樂互動',
        'walk': '散步/推車',
        'sunbathe': '曬太陽',
        'social': '社交互動'
    };
    
    // 里程碑類別對照表
    const MILESTONE_CATEGORIES = {
        'motor': '動作發展',
        'language': '語言發展',
        'social': '社交情緒',
        'cognitive': '認知發展',
        'selfcare': '生活自理'
    };
    
    // 健康記錄類型對照表
    const HEALTH_TYPES = {
        'vaccination': '疫苗接種',
        'medication': '藥物',
        'illness': '疾病',
        'checkup': '健康檢查'
    };
    
    // 餵食類型對照表
    const FEEDING_TYPES = {
        'breastfeeding': '母乳餵養',
        'formula': '配方奶',
        'solids': '固體食物'
    };
    
    // 尿布類型對照表
    const DIAPER_TYPES = {
        'wet': '濕',
        'poop': '便',
        'mixed': '混合'
    };
    
    // 測溫方式對照表
    const MEASUREMENT_METHODS = {
        'oral': '口溫',
        'rectal': '肛溫',
        'axillary': '腋溫',
        'ear': '耳溫',
        'forehead': '額溫'
    };
    
    // 性別對照表
    const GENDERS = {
        'male': '男',
        'female': '女',
        'other': '其他'
    };
    
    /**
     * 資料庫管理器
     * 負責 IndexedDB 的初始化、CRUD 操作等
     */
    const DBManager = {
        /**
         * 初始化資料庫
         * 建立所有必要的物件商店和索引
         */
        init: function() {
            return new Promise(function(resolve, reject) {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                
                request.onerror = function() {
                    reject('無法開啟資料庫');
                };
                
                request.onsuccess = function(event) {
                    db = event.target.result;
                    resolve(db);
                };
                
                request.onupgradeneeded = function(event) {
                    db = event.target.result;
                    
                    // 建立 children 商店
                    if (!db.objectStoreNames.contains(STORES.CHILDREN)) {
                        const childrenStore = db.createObjectStore(STORES.CHILDREN, { keyPath: 'id', autoIncrement: true });
                        childrenStore.createIndex('name', 'name', { unique: false });
                        childrenStore.createIndex('dateOfBirth', 'dateOfBirth', { unique: false });
                    }
                    
                    // 建立 feedings 商店
                    if (!db.objectStoreNames.contains(STORES.FEEDINGS)) {
                        const feedingsStore = db.createObjectStore(STORES.FEEDINGS, { keyPath: 'id', autoIncrement: true });
                        feedingsStore.createIndex('childId', 'childId', { unique: false });
                        feedingsStore.createIndex('type', 'type', { unique: false });
                        feedingsStore.createIndex('eventTimestamp', 'eventTimestamp', { unique: false });
                    }
                    
                    // 建立 sleeps 商店
                    if (!db.objectStoreNames.contains(STORES.SLEEPS)) {
                        const sleepsStore = db.createObjectStore(STORES.SLEEPS, { keyPath: 'id', autoIncrement: true });
                        sleepsStore.createIndex('childId', 'childId', { unique: false });
                        sleepsStore.createIndex('startTime', 'startTime', { unique: false });
                    }
                    
                    // 建立 diapers 商店
                    if (!db.objectStoreNames.contains(STORES.DIAPERS)) {
                        const diapersStore = db.createObjectStore(STORES.DIAPERS, { keyPath: 'id', autoIncrement: true });
                        diapersStore.createIndex('childId', 'childId', { unique: false });
                        diapersStore.createIndex('type', 'type', { unique: false });
                        diapersStore.createIndex('eventTime', 'eventTime', { unique: false });
                    }
                    
                    // 建立 health 商店
                    if (!db.objectStoreNames.contains(STORES.HEALTH)) {
                        const healthStore = db.createObjectStore(STORES.HEALTH, { keyPath: 'id', autoIncrement: true });
                        healthStore.createIndex('childId', 'childId', { unique: false });
                        healthStore.createIndex('type', 'type', { unique: false });
                        healthStore.createIndex('eventDate', 'eventDate', { unique: false });
                    }
                    
                    // 建立 milestones 商店
                    if (!db.objectStoreNames.contains(STORES.MILESTONES)) {
                        const milestonesStore = db.createObjectStore(STORES.MILESTONES, { keyPath: 'id', autoIncrement: true });
                        milestonesStore.createIndex('childId', 'childId', { unique: false });
                        milestonesStore.createIndex('category', 'category', { unique: false });
                        milestonesStore.createIndex('achievementDate', 'achievementDate', { unique: false });
                    }
                    
                    // 建立 interactions 商店
                    if (!db.objectStoreNames.contains(STORES.INTERACTIONS)) {
                        const interactionsStore = db.createObjectStore(STORES.INTERACTIONS, { keyPath: 'id', autoIncrement: true });
                        interactionsStore.createIndex('childId', 'childId', { unique: false });
                        interactionsStore.createIndex('eventTime', 'eventTime', { unique: false });
                    }
                    
                    // 建立 activities 商店
                    if (!db.objectStoreNames.contains(STORES.ACTIVITIES)) {
                        const activitiesStore = db.createObjectStore(STORES.ACTIVITIES, { keyPath: 'id', autoIncrement: true });
                        activitiesStore.createIndex('childId', 'childId', { unique: false });
                        activitiesStore.createIndex('activityName', 'activityName', { unique: false });
                        activitiesStore.createIndex('startTime', 'startTime', { unique: false });
                    }
                };
            });
        },
        
        /**
         * 新增記錄
         * @param {string} storeName - 物件商店名稱
         * @param {object} data - 要儲存的資料
         */
        add: function(storeName, data) {
            return new Promise(function(resolve, reject) {
                // 確保所有時間戳記都是 ISO 格式
                data.recordTimestamp = new Date().toISOString();
                
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.add(data);
                
                request.onsuccess = function() {
                    resolve(request.result);
                };
                
                request.onerror = function() {
                    reject('儲存失敗');
                };
            });
        },
        
        /**
         * 取得記錄
         * @param {string} storeName - 物件商店名稱
         * @param {number} id - 記錄 ID
         */
        get: function(storeName, id) {
            return new Promise(function(resolve, reject) {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.get(id);
                
                request.onsuccess = function() {
                    resolve(request.result);
                };
                
                request.onerror = function() {
                    reject('讀取失敗');
                };
            });
        },
        
        /**
         * 更新記錄
         * @param {string} storeName - 物件商店名稱
         * @param {object} data - 要更新的資料
         */
        update: function(storeName, data) {
            return new Promise(function(resolve, reject) {
                // 更新記錄時間戳記
                data.recordTimestamp = new Date().toISOString();
                
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.put(data);
                
                request.onsuccess = function() {
                    resolve(request.result);
                };
                
                request.onerror = function() {
                    reject('更新失敗');
                };
            });
        },
        
        /**
         * 刪除記錄
         * @param {string} storeName - 物件商店名稱
         * @param {number} id - 記錄 ID
         */
        delete: function(storeName, id) {
            return new Promise(function(resolve, reject) {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(id);
                
                request.onsuccess = function() {
                    resolve();
                };
                
                request.onerror = function() {
                    reject('刪除失敗');
                };
            });
        },
        
        /**
         * 取得所有記錄
         * @param {string} storeName - 物件商店名稱
         * @param {string} indexName - 索引名稱（可選）
         * @param {*} indexValue - 索引值（可選）
         */
        getAll: function(storeName, indexName, indexValue) {
            return new Promise(function(resolve, reject) {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                let request;
                
                if (indexName && indexValue !== undefined) {
                    const index = store.index(indexName);
                    request = index.getAll(indexValue);
                } else {
                    request = store.getAll();
                }
                
                request.onsuccess = function() {
                    resolve(request.result);
                };
                
                request.onerror = function() {
                    reject('讀取失敗');
                };
            });
        },
        
        /**
         * 清空所有資料（用於資料匯入時）
         */
        clearAll: function() {
            return new Promise(function(resolve, reject) {
                const storeNames = Object.values(STORES);
                const transaction = db.transaction(storeNames, 'readwrite');
                let completed = 0;
                
                storeNames.forEach(function(storeName) {
                    const store = transaction.objectStore(storeName);
                    const request = store.clear();
                    
                    request.onsuccess = function() {
                        completed++;
                        if (completed === storeNames.length) {
                            resolve();
                        }
                    };
                    
                    request.onerror = function() {
                        reject('清除資料失敗');
                    };
                });
            });
        }
    };
    
    /**
     * 時區管理器
     * 負責時區轉換、格式化等操作
     */
    const TimeZoneManager = {
        /**
         * 將 UTC 時間轉換為本地時間字串（用於顯示）
         * @param {string|Date} utcTime - UTC 時間
         * @param {boolean} includeSeconds - 是否包含秒數
         */
        utcToLocal: function(utcTime, includeSeconds) {
            if (!utcTime) return '';
            
            const date = new Date(utcTime);
            if (isNaN(date.getTime())) return '';
            
            const options = {
                timeZone: currentTimezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            };
            
            if (includeSeconds) {
                options.second = '2-digit';
            }
            
            return date.toLocaleString('zh-TW', options);
        },
        
        /**
         * 將 UTC 時間轉換為本地日期字串
         * @param {string|Date} utcTime - UTC 時間
         */
        utcToLocalDate: function(utcTime) {
            if (!utcTime) return '';
            
            const date = new Date(utcTime);
            if (isNaN(date.getTime())) return '';
            
            return date.toLocaleDateString('zh-TW', {
                timeZone: currentTimezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        },
        
        /**
         * 將本地時間字串轉換為 UTC ISO 字串（用於儲存）
         * @param {string} localTimeString - datetime-local 輸入的值
         */
        localToUtc: function(localTimeString) {
            if (!localTimeString) return null;
            
            // datetime-local 輸入值格式：YYYY-MM-DDTHH:mm
            // 我們需要將其視為本地時區的時間，然後轉換為 UTC
            const localDate = new Date(localTimeString);
            return localDate.toISOString();
        },
        
        /**
         * 將 UTC 時間轉換為 datetime-local 輸入格式
         * @param {string|Date} utcTime - UTC 時間
         */
        utcToInputFormat: function(utcTime) {
            if (!utcTime) return '';
            
            const date = new Date(utcTime);
            if (isNaN(date.getTime())) return '';
            
            // 將 UTC 時間轉換為本地時區
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            
            return year + '-' + month + '-' + day + 'T' + hours + ':' + minutes;
        },
        
        /**
         * 計算兩個時間之間的時長
         * @param {string|Date} startTime - 開始時間
         * @param {string|Date} endTime - 結束時間
         */
        calculateDuration: function(startTime, endTime) {
            if (!startTime || !endTime) return '';
            
            const start = new Date(startTime);
            const end = new Date(endTime);
            
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
            
            const diffMs = end - start;
            if (diffMs < 0) return '';
            
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            
            if (hours > 0) {
                return hours + '小時 ' + minutes + '分鐘';
            } else {
                return minutes + '分鐘';
            }
        },
        
        /**
         * 計算年齡
         * @param {string|Date} birthDate - 出生日期
         */
        calculateAge: function(birthDate) {
            if (!birthDate) return '';
            
            const birth = new Date(birthDate);
            const now = new Date();
            
            if (isNaN(birth.getTime())) return '';
            
            const diffMs = now - birth;
            const ageDate = new Date(diffMs);
            const years = ageDate.getUTCFullYear() - 1970;
            const months = ageDate.getUTCMonth();
            const days = ageDate.getUTCDate() - 1;
            
            if (years > 0) {
                return years + '歲 ' + months + '個月';
            } else if (months > 0) {
                return months + '個月 ' + days + '天';
            } else {
                return days + '天';
            }
        }
    };
    
    /**
     * 檔案處理器
     * 負責照片上傳、Base64 轉換等
     */
    const FileHandler = {
        /**
         * 將檔案轉換為 Base64 字串
         * @param {File} file - 檔案物件
         */
        fileToBase64: function(file) {
            return new Promise(function(resolve, reject) {
                if (!file) {
                    resolve(null);
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    resolve(e.target.result);
                };
                reader.onerror = function() {
                    reject('檔案讀取失敗');
                };
                reader.readAsDataURL(file);
            });
        },
        
        /**
         * 處理圖片上傳預覽
         * @param {string} inputId - 檔案輸入元素 ID
         * @param {string} previewContainerId - 預覽容器 ID
         * @param {string} imgId - 圖片元素 ID
         * @param {string} removeButtonId - 移除按鈕 ID
         */
        setupImagePreview: function(inputId, previewContainerId, imgId, removeButtonId) {
            const input = document.getElementById(inputId);
            const previewContainer = document.getElementById(previewContainerId);
            const img = document.getElementById(imgId);
            const removeButton = document.getElementById(removeButtonId);
            
            if (!input || !previewContainer || !img || !removeButton) return;
            
            input.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        img.src = e.target.result;
                        previewContainer.classList.remove('hidden');
                    };
                    reader.readAsDataURL(file);
                }
            });
            
            removeButton.addEventListener('click', function() {
                input.value = '';
                img.src = '';
                previewContainer.classList.add('hidden');
            });
        }
    };
    
    /**
     * 主題管理器
     * 負責主題切換和持久化
     */
    const ThemeManager = {
        /**
         * 初始化主題
         */
        init: function() {
            // 從 localStorage 讀取主題設定
            const savedTheme = localStorage.getItem('babyTracker_theme');
            if (savedTheme) {
                currentTheme = savedTheme;
            }
            
            this.applyTheme();
            
            // 設定主題切換按鈕事件
            const themeToggle = document.getElementById('themeToggle');
            if (themeToggle) {
                themeToggle.addEventListener('click', this.toggleTheme.bind(this));
            }
        },
        
        /**
         * 應用主題
         */
        applyTheme: function() {
            const root = document.documentElement;
            const themeIcon = document.querySelector('.theme-icon');
            
            if (currentTheme === 'dark') {
                root.classList.add('dark-theme');
                if (themeIcon) themeIcon.textContent = '☀️';
            } else {
                root.classList.remove('dark-theme');
                if (themeIcon) themeIcon.textContent = '🌙';
            }
        },
        
        /**
         * 切換主題
         */
        toggleTheme: function() {
            currentTheme = currentTheme === 'light' ? 'dark' : 'light';
            localStorage.setItem('babyTracker_theme', currentTheme);
            this.applyTheme();
        }
    };
    
    /**
     * 通知管理器
     * 負責顯示 Toast 通知
     */
    const NotificationManager = {
        /**
         * 顯示通知
         * @param {string} title - 通知標題
         * @param {string} message - 通知訊息
         * @param {string} type - 通知類型（success, error, warning）
         * @param {number} duration - 顯示時長（毫秒）
         */
        show: function(title, message, type, duration) {
            type = type || 'success';
            duration = duration || 3000;
            
            const container = document.getElementById('toastContainer');
            if (!container) return;
            
            const toast = document.createElement('div');
            toast.className = 'toast ' + type;
            
            toast.innerHTML = 
                '<div class="toast-content">' +
                    '<div class="toast-title">' + this.escapeHtml(title) + '</div>' +
                    '<div class="toast-message">' + this.escapeHtml(message) + '</div>' +
                '</div>' +
                '<button class="toast-close">&times;</button>';
            
            container.appendChild(toast);
            
            // 設定關閉按鈕事件
            const closeButton = toast.querySelector('.toast-close');
            closeButton.addEventListener('click', function() {
                toast.remove();
            });
            
            // 自動移除
            setTimeout(function() {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, duration);
        },
        
        /**
         * 顯示成功通知
         */
        success: function(title, message) {
            this.show(title, message, 'success');
        },
        
        /**
         * 顯示錯誤通知
         */
        error: function(title, message) {
            this.show(title, message, 'error', 5000);
        },
        
        /**
         * 顯示警告通知
         */
        warning: function(title, message) {
            this.show(title, message, 'warning', 4000);
        },
        
        /**
         * HTML 轉義
         * @param {string} text - 要轉義的文字
         */
        escapeHtml: function(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };
    
    /**
     * 載入管理器
     * 負責顯示和隱藏載入動畫
     */
    const LoadingManager = {
        /**
         * 顯示載入動畫
         */
        show: function() {
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) {
                overlay.classList.remove('hidden');
            }
        },
        
        /**
         * 隱藏載入動畫
         */
        hide: function() {
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) {
                overlay.classList.add('hidden');
            }
        }
    };
    
    /**
     * UI 管理器
     * 負責 UI 更新、事件處理等
     */
    const UIManager = {
        /**
         * 初始化 UI
         */
        init: function() {
            this.setupNavigation();
            this.setupModals();
            this.setupForms();
            this.setupQuickActions();
            this.loadChildSelector();
            this.setupChildSelector();
            this.setupSettings();
            this.setupTimeTracking();
            
            // 載入預設頁面
            this.showTab('overview');
        },
        
        /**
         * 設定導航功能
         */
        setupNavigation: function() {
            const navTabs = document.querySelectorAll('.nav-tab');
            
            navTabs.forEach(function(tab) {
                tab.addEventListener('click', function() {
                    const tabName = this.getAttribute('data-tab');
                    UIManager.showTab(tabName);
                });
            });
        },
        
        /**
         * 顯示指定的頁籤
         * @param {string} tabName - 頁籤名稱
         */
        showTab: function(tabName) {
            // 隱藏所有頁籤內容
            const allTabs = document.querySelectorAll('.tab-content');
            allTabs.forEach(function(tab) {
                tab.classList.remove('active');
            });
            
            // 移除所有導航按鈕的 active 類別
            const allNavTabs = document.querySelectorAll('.nav-tab');
            allNavTabs.forEach(function(navTab) {
                navTab.classList.remove('active');
            });
            
            // 顯示指定的頁籤內容
            const targetTab = document.getElementById(tabName + '-tab');
            if (targetTab) {
                targetTab.classList.add('active');
            }
            
            // 設定對應的導航按鈕為 active
            const targetNavTab = document.querySelector('.nav-tab[data-tab="' + tabName + '"]');
            if (targetNavTab) {
                targetNavTab.classList.add('active');
            }
            
            // 載入對應的資料
            this.loadTabData(tabName);
        },
        
        /**
         * 載入頁籤資料
         * @param {string} tabName - 頁籤名稱
         */
        loadTabData: function(tabName) {
            if (!currentChildId) {
                this.showNoChildMessage(tabName);
                return;
            }
            
            switch (tabName) {
                case 'overview':
                    this.loadOverviewData();
                    break;
                case 'feeding':
                    this.loadFeedingRecords();
                    break;
                case 'sleep':
                    this.loadSleepRecords();
                    break;
                case 'diaper':
                    this.loadDiaperRecords();
                    break;
                case 'health':
                    this.loadHealthRecords();
                    break;
                case 'milestone':
                    this.loadMilestoneRecords();
                    break;
                case 'interaction':
                    this.loadInteractionRecords();
                    break;
                case 'activity':
                    this.loadActivityRecords();
                    break;
                case 'charts':
                    ChartManager.init();
                    break;
            }
        },
        
        /**
         * 顯示無寶寶訊息
         * @param {string} tabName - 頁籤名稱
         */
        showNoChildMessage: function(tabName) {
            const tabContent = document.getElementById(tabName + '-tab');
            if (!tabContent) return;
            
            // 不在總覽頁面顯示，因為總覽頁面已經有歡迎訊息
            if (tabName === 'overview') return;
            
            // 清空內容
            const recordsList = tabContent.querySelector('.records-list');
            if (recordsList) {
                recordsList.innerHTML = 
                    '<div class="no-child-message">' +
                        '<p>請先選擇或新增寶寶資料</p>' +
                        '<button class="add-child-btn" onclick="UIManager.openChildManagement()">新增寶寶</button>' +
                    '</div>';
            }
        },
        
        /**
         * 設定模態框功能
         */
        setupModals: function() {
            // 設定按鈕事件
            const settingsBtn = document.getElementById('settingsBtn');
            const closeSettings = document.getElementById('closeSettings');
            const settingsModal = document.getElementById('settingsModal');
            
            const manageChildrenBtn = document.getElementById('manageChildrenBtn');
            const closeChildManagement = document.getElementById('closeChildManagement');
            const childManagementModal = document.getElementById('childManagementModal');
            
            if (settingsBtn && settingsModal) {
                settingsBtn.addEventListener('click', function() {
                    settingsModal.classList.remove('hidden');
                });
            }
            
            if (closeSettings && settingsModal) {
                closeSettings.addEventListener('click', function() {
                    settingsModal.classList.add('hidden');
                });
            }
            
            if (manageChildrenBtn && childManagementModal) {
                manageChildrenBtn.addEventListener('click', function() {
                    UIManager.openChildManagement();
                });
            }
            
            if (closeChildManagement && childManagementModal) {
                closeChildManagement.addEventListener('click', function() {
                    childManagementModal.classList.add('hidden');
                });
            }
            
            // 點擊模態框外部關閉
            document.addEventListener('click', function(e) {
                if (e.target.classList.contains('modal')) {
                    e.target.classList.add('hidden');
                }
            });
        },
        
        /**
         * 設定表單功能
         */
        setupForms: function() {
            this.setupFeedingForm();
            this.setupSleepForm();
            this.setupDiaperForm();
            this.setupHealthForm();
            this.setupMilestoneForm();
            this.setupInteractionForm();
            this.setupActivityForm();
            this.setupChildForm();
            
            // 設定條件字段顯示/隱藏
            this.setupConditionalFields();
        },
        
        /**
         * 設定條件字段顯示/隱藏
         */
        setupConditionalFields: function() {
            // 餵食類型條件字段
            const feedingType = document.getElementById('feedingType');
            if (feedingType) {
                feedingType.addEventListener('change', function() {
                    const breastfeedingFields = document.getElementById('breastfeedingFields');
                    const formulaFields = document.getElementById('formulaFields');
                    const solidsFields = document.getElementById('solidsFields');
                    
                    // 隱藏所有條件字段
                    if (breastfeedingFields) breastfeedingFields.classList.add('hidden');
                    if (formulaFields) formulaFields.classList.add('hidden');
                    if (solidsFields) solidsFields.classList.add('hidden');
                    
                    // 顯示對應的字段
                    if (this.value === 'breastfeeding' && breastfeedingFields) {
                        breastfeedingFields.classList.remove('hidden');
                    } else if (this.value === 'formula' && formulaFields) {
                        formulaFields.classList.remove('hidden');
                    } else if (this.value === 'solids' && solidsFields) {
                        solidsFields.classList.remove('hidden');
                    }
                });
            }
            
            // 健康記錄類型條件字段
            const healthType = document.getElementById('healthType');
            if (healthType) {
                healthType.addEventListener('change', function() {
                    const temperatureFields = document.getElementById('temperatureFields');
                    
                    if (this.value === 'illness' || this.value === 'checkup') {
                        if (temperatureFields) temperatureFields.classList.remove('hidden');
                    } else {
                        if (temperatureFields) temperatureFields.classList.add('hidden');
                    }
                });
            }
            
            // 活動名稱條件字段
            const activityName = document.getElementById('activityName');
            if (activityName) {
                activityName.addEventListener('change', function() {
                    const customActivityField = document.getElementById('customActivityField');
                    
                    if (this.value === 'custom') {
                        if (customActivityField) customActivityField.classList.remove('hidden');
                    } else {
                        if (customActivityField) customActivityField.classList.add('hidden');
                    }
                });
            }
        },
        
        /**
         * 設定餵食表單
         */
        setupFeedingForm: function() {
            const addBtn = document.getElementById('addFeedingBtn');
            const form = document.getElementById('feedingForm');
            const cancelBtn = form ? form.querySelector('.cancel-btn') : null;
            
            if (addBtn && form) {
                addBtn.addEventListener('click', function() {
                    UIManager.showFeedingForm();
                });
            }
            
            if (cancelBtn && form) {
                cancelBtn.addEventListener('click', function() {
                    UIManager.hideFeedingForm();
                });
            }
            
            if (form) {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    UIManager.submitFeedingForm();
                });
            }
        },
        
        /**
         * 顯示餵食表單
         * @param {object} record - 要編輯的記錄（可選）
         */
        showFeedingForm: function(record) {
            const form = document.getElementById('feedingForm');
            if (!form) return;
            
            // 重設表單
            form.reset();
            editingRecordId = null;
            editingRecordType = null;
            
            // 隱藏所有條件字段
            const conditionalFields = form.querySelectorAll('.conditional-fields');
            conditionalFields.forEach(function(field) {
                field.classList.add('hidden');
            });
            
            if (record) {
                // 編輯模式
                editingRecordId = record.id;
                editingRecordType = STORES.FEEDINGS;
                
                // 填入現有資料
                document.getElementById('feedingType').value = record.type || '';
                
                if (record.type === 'breastfeeding') {
                    document.getElementById('breastfeedingFields').classList.remove('hidden');
                    document.getElementById('breastStartTime').value = TimeZoneManager.utcToInputFormat(record.startTime);
                    document.getElementById('breastEndTime').value = TimeZoneManager.utcToInputFormat(record.endTime);
                    document.getElementById('leftBreastDuration').value = record.leftBreastDuration || '';
                    document.getElementById('rightBreastDuration').value = record.rightBreastDuration || '';
                } else if (record.type === 'formula') {
                    document.getElementById('formulaFields').classList.remove('hidden');
                    document.getElementById('formulaTime').value = TimeZoneManager.utcToInputFormat(record.eventTimestamp);
                    document.getElementById('formulaQuantity').value = record.quantity || '';
                    document.getElementById('formulaUnit').value = record.unit || 'ml';
                } else if (record.type === 'solids') {
                    document.getElementById('solidsFields').classList.remove('hidden');
                    document.getElementById('solidsTime').value = TimeZoneManager.utcToInputFormat(record.eventTimestamp);
                    document.getElementById('foodItem').value = record.foodItem || '';
                    document.getElementById('solidsQuantity').value = record.quantity || '';
                }
                
                document.getElementById('feedingNotes').value = record.notes || '';
            } else {
                // 新增模式，設定預設時間為現在
                const now = new Date();
                const nowString = TimeZoneManager.utcToInputFormat(now.toISOString());
                
                document.getElementById('breastStartTime').value = nowString;
                document.getElementById('formulaTime').value = nowString;
                document.getElementById('solidsTime').value = nowString;
            }
            
            // 觸發條件字段邏輯
            const feedingType = document.getElementById('feedingType');
            if (feedingType) {
                feedingType.dispatchEvent(new Event('change'));
            }
            
            form.classList.remove('hidden');
            form.scrollIntoView({ behavior: 'smooth' });
        },
        
        /**
         * 隱藏餵食表單
         */
        hideFeedingForm: function() {
            const form = document.getElementById('feedingForm');
            if (form) {
                form.classList.add('hidden');
                editingRecordId = null;
                editingRecordType = null;
            }
        },
        
        /**
         * 提交餵食表單
         */
        submitFeedingForm: function() {
            if (!currentChildId) {
                NotificationManager.error('錯誤', '請先選擇寶寶');
                return;
            }
            
            const form = document.getElementById('feedingForm');
            if (!form) return;
            
            const feedingType = document.getElementById('feedingType').value;
            if (!feedingType) {
                NotificationManager.error('錯誤', '請選擇餵食類型');
                return;
            }
            
            const data = {
                childId: currentChildId,
                type: feedingType,
                notes: document.getElementById('feedingNotes').value
            };
            
            // 根據餵食類型收集不同的資料
            try {
                if (feedingType === 'breastfeeding') {
                    const startTime = document.getElementById('breastStartTime').value;
                    const endTime = document.getElementById('breastEndTime').value;
                    
                    if (!startTime || !endTime) {
                        NotificationManager.error('錯誤', '請填入開始和結束時間');
                        return;
                    }
                    
                    data.startTime = TimeZoneManager.localToUtc(startTime);
                    data.endTime = TimeZoneManager.localToUtc(endTime);
                    data.eventTimestamp = data.startTime;
                    data.leftBreastDuration = parseInt(document.getElementById('leftBreastDuration').value) || null;
                    data.rightBreastDuration = parseInt(document.getElementById('rightBreastDuration').value) || null;
                    
                } else if (feedingType === 'formula') {
                    const time = document.getElementById('formulaTime').value;
                    const quantity = document.getElementById('formulaQuantity').value;
                    
                    if (!time || !quantity) {
                        NotificationManager.error('錯誤', '請填入時間和分量');
                        return;
                    }
                    
                    data.eventTimestamp = TimeZoneManager.localToUtc(time);
                    data.quantity = parseFloat(quantity);
                    data.unit = document.getElementById('formulaUnit').value;
                    
                } else if (feedingType === 'solids') {
                    const time = document.getElementById('solidsTime').value;
                    const foodItem = document.getElementById('foodItem').value;
                    
                    if (!time || !foodItem) {
                        NotificationManager.error('錯誤', '請填入時間和食物');
                        return;
                    }
                    
                    data.eventTimestamp = TimeZoneManager.localToUtc(time);
                    data.foodItem = foodItem;
                    data.quantity = document.getElementById('solidsQuantity').value;
                }
                
                // 儲存資料
                if (editingRecordId) {
                    data.id = editingRecordId;
                    DBManager.update(STORES.FEEDINGS, data).then(function() {
                        NotificationManager.success('成功', '餵食記錄已更新');
                        UIManager.hideFeedingForm();
                        UIManager.loadFeedingRecords();
                    }).catch(function(error) {
                        NotificationManager.error('錯誤', error);
                    });
                } else {
                    DBManager.add(STORES.FEEDINGS, data).then(function() {
                        NotificationManager.success('成功', '餵食記錄已儲存');
                        UIManager.hideFeedingForm();
                        UIManager.loadFeedingRecords();
                    }).catch(function(error) {
                        NotificationManager.error('錯誤', error);
                    });
                }
                
            } catch (error) {
                NotificationManager.error('錯誤', '資料格式不正確');
            }
        },
        
        /**
         * 載入餵食記錄
         */
        loadFeedingRecords: function() {
            if (!currentChildId) return;
            
            LoadingManager.show();
            
            DBManager.getAll(STORES.FEEDINGS, 'childId', currentChildId).then(function(records) {
                LoadingManager.hide();
                
                // 按時間排序（最新的在前）
                records.sort(function(a, b) {
                    const aTime = a.eventTimestamp || a.startTime || a.recordTimestamp;
                    const bTime = b.eventTimestamp || b.startTime || b.recordTimestamp;
                    return new Date(bTime) - new Date(aTime);
                });
                
                UIManager.renderFeedingRecords(records);
            }).catch(function(error) {
                LoadingManager.hide();
                NotificationManager.error('錯誤', error);
            });
        },
        
        /**
         * 渲染餵食記錄
         * @param {Array} records - 記錄陣列
         */
        renderFeedingRecords: function(records) {
            const container = document.getElementById('feedingRecords');
            if (!container) return;
            
            if (records.length === 0) {
                container.innerHTML = '<p class="no-records">尚無餵食記錄</p>';
                return;
            }
            
            let html = '';
            
            records.forEach(function(record) {
                const typeText = FEEDING_TYPES[record.type] || record.type;
                let timeText = '';
                let detailsHtml = '';
                
                if (record.type === 'breastfeeding') {
                    timeText = TimeZoneManager.utcToLocal(record.startTime) + ' - ' + TimeZoneManager.utcToLocal(record.endTime);
                    detailsHtml = 
                        '<div class="record-detail">' +
                            '<span class="record-detail-label">時長：</span>' +
                            '<span class="record-detail-value">' + TimeZoneManager.calculateDuration(record.startTime, record.endTime) + '</span>' +
                        '</div>';
                    
                    if (record.leftBreastDuration || record.rightBreastDuration) {
                        detailsHtml += 
                            '<div class="record-detail">' +
                                '<span class="record-detail-label">左側：</span>' +
                                '<span class="record-detail-value">' + (record.leftBreastDuration || 0) + '分鐘</span>' +
                            '</div>' +
                            '<div class="record-detail">' +
                                '<span class="record-detail-label">右側：</span>' +
                                '<span class="record-detail-value">' + (record.rightBreastDuration || 0) + '分鐘</span>' +
                            '</div>';
                    }
                } else {
                    timeText = TimeZoneManager.utcToLocal(record.eventTimestamp);
                    
                    if (record.type === 'formula') {
                        detailsHtml = 
                            '<div class="record-detail">' +
                                '<span class="record-detail-label">分量：</span>' +
                                '<span class="record-detail-value">' + record.quantity + ' ' + record.unit + '</span>' +
                            '</div>';
                    } else if (record.type === 'solids') {
                        detailsHtml = 
                            '<div class="record-detail">' +
                                '<span class="record-detail-label">食物：</span>' +
                                '<span class="record-detail-value">' + record.foodItem + '</span>' +
                            '</div>';
                        
                        if (record.quantity) {
                            detailsHtml += 
                                '<div class="record-detail">' +
                                    '<span class="record-detail-label">分量：</span>' +
                                    '<span class="record-detail-value">' + record.quantity + '</span>' +
                                '</div>';
                        }
                    }
                }
                
                html += 
                    '<div class="record-card">' +
                        '<div class="record-header">' +
                            '<div class="record-title">' + typeText + '</div>' +
                            '<div class="record-time">' + timeText + '</div>' +
                        '</div>' +
                        '<div class="record-details">' + detailsHtml + '</div>' +
                        (record.notes ? '<div class="record-notes">' + UIManager.escapeHtml(record.notes) + '</div>' : '') +
                        '<div class="record-actions">' +
                            '<button class="record-action-btn" onclick="UIManager.editFeedingRecord(' + record.id + ')">✏️</button>' +
                            '<button class="record-action-btn" onclick="UIManager.deleteFeedingRecord(' + record.id + ')">🗑️</button>' +
                        '</div>' +
                    '</div>';
            });
            
            container.innerHTML = html;
        },
        
        /**
         * 編輯餵食記錄
         * @param {number} id - 記錄 ID
         */
        editFeedingRecord: function(id) {
            DBManager.get(STORES.FEEDINGS, id).then(function(record) {
                if (record) {
                    UIManager.showFeedingForm(record);
                }
            }).catch(function(error) {
                NotificationManager.error('錯誤', error);
            });
        },
        
        /**
         * 刪除餵食記錄
         * @param {number} id - 記錄 ID
         */
        deleteFeedingRecord: function(id) {
            if (confirm('確定要刪除這筆餵食記錄嗎？')) {
                DBManager.delete(STORES.FEEDINGS, id).then(function() {
                    NotificationManager.success('成功', '餵食記錄已刪除');
                    UIManager.loadFeedingRecords();
                }).catch(function(error) {
                    NotificationManager.error('錯誤', error);
                });
            }
        },
        
        /**
         * 設定睡眠表單
         */
        setupSleepForm: function() {
            const addBtn = document.getElementById('addSleepBtn');
            const form = document.getElementById('sleepForm');
            const cancelBtn = form ? form.querySelector('.cancel-btn') : null;
            
            if (addBtn && form) {
                addBtn.addEventListener('click', function() {
                    UIManager.showSleepForm();
                });
            }
            
            if (cancelBtn && form) {
                cancelBtn.addEventListener('click', function() {
                    UIManager.hideSleepForm();
                });
            }
            
            if (form) {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    UIManager.submitSleepForm();
                });
            }
        },
        
        /**
         * 顯示睡眠表單
         * @param {object} record - 要編輯的記錄（可選）
         */
        showSleepForm: function(record) {
            const form = document.getElementById('sleepForm');
            if (!form) return;
            
            // 重設表單
            form.reset();
            editingRecordId = null;
            editingRecordType = null;
            
            if (record) {
                // 編輯模式
                editingRecordId = record.id;
                editingRecordType = STORES.SLEEPS;
                
                document.getElementById('sleepStartTime').value = TimeZoneManager.utcToInputFormat(record.startTime);
                document.getElementById('sleepEndTime').value = TimeZoneManager.utcToInputFormat(record.endTime);
                document.getElementById('sleepNotes').value = record.notes || '';
                
                // 計算時長
                const duration = TimeZoneManager.calculateDuration(record.startTime, record.endTime);
                document.getElementById('sleepDuration').value = duration;
            } else {
                // 新增模式，設定預設時間為現在
                const now = new Date();
                const nowString = TimeZoneManager.utcToInputFormat(now.toISOString());
                document.getElementById('sleepStartTime').value = nowString;
            }
            
            form.classList.remove('hidden');
            form.scrollIntoView({ behavior: 'smooth' });
        },
        
        /**
         * 隱藏睡眠表單
         */
        hideSleepForm: function() {
            const form = document.getElementById('sleepForm');
            if (form) {
                form.classList.add('hidden');
                editingRecordId = null;
                editingRecordType = null;
            }
        },
        
        /**
         * 提交睡眠表單
         */
        submitSleepForm: function() {
            if (!currentChildId) {
                NotificationManager.error('錯誤', '請先選擇寶寶');
                return;
            }
            
            const startTime = document.getElementById('sleepStartTime').value;
            const endTime = document.getElementById('sleepEndTime').value;
            const notes = document.getElementById('sleepNotes').value;
            
            if (!startTime || !endTime) {
                NotificationManager.error('錯誤', '請填入開始和結束時間');
                return;
            }
            
            const startUtc = TimeZoneManager.localToUtc(startTime);
            const endUtc = TimeZoneManager.localToUtc(endTime);
            
            if (new Date(endUtc) <= new Date(startUtc)) {
                NotificationManager.error('錯誤', '結束時間必須晚於開始時間');
                return;
            }
            
            const data = {
                childId: currentChildId,
                startTime: startUtc,
                endTime: endUtc,
                duration: TimeZoneManager.calculateDuration(startUtc, endUtc),
                notes: notes
            };
            
            if (editingRecordId) {
                data.id = editingRecordId;
                DBManager.update(STORES.SLEEPS, data).then(function() {
                    NotificationManager.success('成功', '睡眠記錄已更新');
                    UIManager.hideSleepForm();
                    UIManager.loadSleepRecords();
                }).catch(function(error) {
                    NotificationManager.error('錯誤', error);
                });
            } else {
                DBManager.add(STORES.SLEEPS, data).then(function() {
                    NotificationManager.success('成功', '睡眠記錄已儲存');
                    UIManager.hideSleepForm();
                    UIManager.loadSleepRecords();
                }).catch(function(error) {
                    NotificationManager.error('錯誤', error);
                });
            }
        },
        
        /**
         * 載入睡眠記錄
         */
        loadSleepRecords: function() {
            if (!currentChildId) return;
            
            LoadingManager.show();
            
            DBManager.getAll(STORES.SLEEPS, 'childId', currentChildId).then(function(records) {
                LoadingManager.hide();
                
                // 按開始時間排序（最新的在前）
                records.sort(function(a, b) {
                    return new Date(b.startTime) - new Date(a.startTime);
                });
                
                UIManager.renderSleepRecords(records);
            }).catch(function(error) {
                LoadingManager.hide();
                NotificationManager.error('錯誤', error);
            });
        },
        
        /**
         * 渲染睡眠記錄
         * @param {Array} records - 記錄陣列
         */
        renderSleepRecords: function(records) {
            const container = document.getElementById('sleepRecords');
            if (!container) return;
            
            if (records.length === 0) {
                container.innerHTML = '<p class="no-records">尚無睡眠記錄</p>';
                return;
            }
            
            let html = '';
            
            records.forEach(function(record) {
                const startTime = TimeZoneManager.utcToLocal(record.startTime);
                const endTime = TimeZoneManager.utcToLocal(record.endTime);
                const duration = record.duration || TimeZoneManager.calculateDuration(record.startTime, record.endTime);
                
                html += 
                    '<div class="record-card">' +
                        '<div class="record-header">' +
                            '<div class="record-title">睡眠記錄</div>' +
                            '<div class="record-time">' + startTime + '</div>' +
                        '</div>' +
                        '<div class="record-details">' +
                            '<div class="record-detail">' +
                                '<span class="record-detail-label">開始：</span>' +
                                '<span class="record-detail-value">' + startTime + '</span>' +
                            '</div>' +
                            '<div class="record-detail">' +
                                '<span class="record-detail-label">結束：</span>' +
                                '<span class="record-detail-value">' + endTime + '</span>' +
                            '</div>' +
                            '<div class="record-detail">' +
                                '<span class="record-detail-label">時長：</span>' +
                                '<span class="record-detail-value">' + duration + '</span>' +
                            '</div>' +
                        '</div>' +
                        (record.notes ? '<div class="record-notes">' + UIManager.escapeHtml(record.notes) + '</div>' : '') +
                        '<div class="record-actions">' +
                            '<button class="record-action-btn" onclick="UIManager.editSleepRecord(' + record.id + ')">✏️</button>' +
                            '<button class="record-action-btn" onclick="UIManager.deleteSleepRecord(' + record.id + ')">🗑️</button>' +
                        '</div>' +
                    '</div>';
            });
            
            container.innerHTML = html;
        },
        
        /**
         * 編輯睡眠記錄
         * @param {number} id - 記錄 ID
         */
        editSleepRecord: function(id) {
            DBManager.get(STORES.SLEEPS, id).then(function(record) {
                if (record) {
                    UIManager.showSleepForm(record);
                }
            }).catch(function(error) {
                NotificationManager.error('錯誤', error);
            });
        },
        
        /**
         * 刪除睡眠記錄
         * @param {number} id - 記錄 ID
         */
        deleteSleepRecord: function(id) {
            if (confirm('確定要刪除這筆睡眠記錄嗎？')) {
                DBManager.delete(STORES.SLEEPS, id).then(function() {
                    NotificationManager.success('成功', '睡眠記錄已刪除');
                    UIManager.loadSleepRecords();
                }).catch(function(error) {
                    NotificationManager.error('錯誤', error);
                });
            }
        },
        
        /**
         * 設定尿布表單
         */
        setupDiaperForm: function() {
            const addBtn = document.getElementById('addDiaperBtn');
            const form = document.getElementById('diaperForm');
            const cancelBtn = form ? form.querySelector('.cancel-btn') : null;
            
            if (addBtn && form) {
                addBtn.addEventListener('click', function() {
                    UIManager.showDiaperForm();
                });
            }
            
            if (cancelBtn && form) {
                cancelBtn.addEventListener('click', function() {
                    UIManager.hideDiaperForm();
                });
            }
            
            if (form) {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    UIManager.submitDiaperForm();
                });
            }
        },
        
        /**
         * 顯示尿布表單
         * @param {object} record - 要編輯的記錄（可選）
         */
        showDiaperForm: function(record) {
            const form = document.getElementById('diaperForm');
            if (!form) return;
            
            // 重設表單
            form.reset();
            editingRecordId = null;
            editingRecordType = null;
            
            if (record) {
                // 編輯模式
                editingRecordId = record.id;
                editingRecordType = STORES.DIAPERS;
                
                document.getElementById('diaperTime').value = TimeZoneManager.utcToInputFormat(record.eventTime);
                document.getElementById('diaperType').value = record.type || '';
                document.getElementById('diaperNotes').value = record.notes || '';
            } else {
                // 新增模式，設定預設時間為現在
                const now = new Date();
                const nowString = TimeZoneManager.utcToInputFormat(now.toISOString());
                document.getElementById('diaperTime').value = nowString;
            }
            
            form.classList.remove('hidden');
            form.scrollIntoView({ behavior: 'smooth' });
        },
        
        /**
         * 隱藏尿布表單
         */
        hideDiaperForm: function() {
            const form = document.getElementById('diaperForm');
            if (form) {
                form.classList.add('hidden');
                editingRecordId = null;
                editingRecordType = null;
            }
        },
        
        /**
         * 提交尿布表單
         */
        submitDiaperForm: function() {
            if (!currentChildId) {
                NotificationManager.error('錯誤', '請先選擇寶寶');
                return;
            }
            
            const time = document.getElementById('diaperTime').value;
            const type = document.getElementById('diaperType').value;
            const notes = document.getElementById('diaperNotes').value;
            
            if (!time || !type) {
                NotificationManager.error('錯誤', '請填入時間和類型');
                return;
            }
            
            const data = {
                childId: currentChildId,
                eventTime: TimeZoneManager.localToUtc(time),
                type: type,
                notes: notes
            };
            
            if (editingRecordId) {
                data.id = editingRecordId;
                DBManager.update(STORES.DIAPERS, data).then(function() {
                    NotificationManager.success('成功', '尿布記錄已更新');
                    UIManager.hideDiaperForm();
                    UIManager.loadDiaperRecords();
                }).catch(function(error) {
                    NotificationManager.error('錯誤', error);
                });
            } else {
                DBManager.add(STORES.DIAPERS, data).then(function() {
                    NotificationManager.success('成功', '尿布記錄已儲存');
                    UIManager.hideDiaperForm();
                    UIManager.loadDiaperRecords();
                }).catch(function(error) {
                    NotificationManager.error('錯誤', error);
                });
            }
        },
        
        /**
         * 載入尿布記錄
         */
        loadDiaperRecords: function() {
            if (!currentChildId) return;
            
            LoadingManager.show();
            
            DBManager.getAll(STORES.DIAPERS, 'childId', currentChildId).then(function(records) {
                LoadingManager.hide();
                
                // 按時間排序（最新的在前）
                records.sort(function(a, b) {
                    return new Date(b.eventTime) - new Date(a.eventTime);
                });
                
                UIManager.renderDiaperRecords(records);
            }).catch(function(error) {
                LoadingManager.hide();
                NotificationManager.error('錯誤', error);
            });
        },
        
        /**
         * 渲染尿布記錄
         * @param {Array} records - 記錄陣列
         */
        renderDiaperRecords: function(records) {
            const container = document.getElementById('diaperRecords');
            if (!container) return;
            
            if (records.length === 0) {
                container.innerHTML = '<p class="no-records">尚無尿布記錄</p>';
                return;
            }
            
            let html = '';
            
            records.forEach(function(record) {
                const time = TimeZoneManager.utcToLocal(record.eventTime);
                const typeText = DIAPER_TYPES[record.type] || record.type;
                
                html += 
                    '<div class="record-card">' +
                        '<div class="record-header">' +
                            '<div class="record-title">尿布更換</div>' +
                            '<div class="record-time">' + time + '</div>' +
                        '</div>' +
                        '<div class="record-details">' +
                            '<div class="record-detail">' +
                                '<span class="record-detail-label">類型：</span>' +
                                '<span class="record-detail-value">' + typeText + '</span>' +
                            '</div>' +
                        '</div>' +
                        (record.notes ? '<div class="record-notes">' + UIManager.escapeHtml(record.notes) + '</div>' : '') +
                        '<div class="record-actions">' +
                            '<button class="record-action-btn" onclick="UIManager.editDiaperRecord(' + record.id + ')">✏️</button>' +
                            '<button class="record-action-btn" onclick="UIManager.deleteDiaperRecord(' + record.id + ')">🗑️</button>' +
                        '</div>' +
                    '</div>';
            });
            
            container.innerHTML = html;
        },
        
        /**
         * 編輯尿布記錄
         * @param {number} id - 記錄 ID
         */
        editDiaperRecord: function(id) {
            DBManager.get(STORES.DIAPERS, id).then(function(record) {
                if (record) {
                    UIManager.showDiaperForm(record);
                }
            }).catch(function(error) {
                NotificationManager.error('錯誤', error);
            });
        },
        
        /**
         * 刪除尿布記錄
         * @param {number} id - 記錄 ID
         */
        deleteDiaperRecord: function(id) {
            if (confirm('確定要刪除這筆尿布記錄嗎？')) {
                DBManager.delete(STORES.DIAPERS, id).then(function() {
                    NotificationManager.success('成功', '尿布記錄已刪除');
                    UIManager.loadDiaperRecords();
                }).catch(function(error) {
                    NotificationManager.error('錯誤', error);
                });
            }
        },
        
        /**
         * 設定健康表單
         */
        setupHealthForm: function() {
            const addBtn = document.getElementById('addHealthBtn');
            const form = document.getElementById('healthForm');
            const cancelBtn = form ? form.querySelector('.cancel-btn') : null;
            
            if (addBtn && form) {
                addBtn.addEventListener('click', function() {
                    UIManager.showHealthForm();
                });
            }
            
            if (cancelBtn && form) {
                cancelBtn.addEventListener('click', function() {
                    UIManager.hideHealthForm();
                });
            }
            
            if (form) {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    UIManager.submitHealthForm();
                });
            }
        },
        
        /**
         * 顯示健康表單
         * @param {object} record - 要編輯的記錄（可選）
         */
        showHealthForm: function(record) {
            const form = document.getElementById('healthForm');
            if (!form) return;
            
            // 重設表單
            form.reset();
            editingRecordId = null;
            editingRecordType = null;
            
            // 隱藏條件字段
            const temperatureFields = document.getElementById('temperatureFields');
            if (temperatureFields) temperatureFields.classList.add('hidden');
            
            if (record) {
                // 編輯模式
                editingRecordId = record.id;
                editingRecordType = STORES.HEALTH;
                
                document.getElementById('healthDate').value = record.eventDate || '';
                document.getElementById('healthType').value = record.type || '';
                document.getElementById('healthDetails').value = record.details || '';
                document.getElementById('healthNotes').value = record.notes || '';
                
                if (record.bodyTemperature) {
                    document.getElementById('bodyTemperature').value = record.bodyTemperature;
                }
                if (record.measurementMethod) {
                    document.getElementById('measurementMethod').value = record.measurementMethod;
                }
            } else {
                // 新增模式，設定預設日期為今天
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('healthDate').value = today;
            }
            
            // 觸發條件字段邏輯
            const healthType = document.getElementById('healthType');
            if (healthType) {
                healthType.dispatchEvent(new Event('change'));
            }
            
            form.classList.remove('hidden');
            form.scrollIntoView({ behavior: 'smooth' });
        },
        
        /**
         * 隱藏健康表單
         */
        hideHealthForm: function() {
            const form = document.getElementById('healthForm');
            if (form) {
                form.classList.add('hidden');
                editingRecordId = null;
                editingRecordType = null;
            }
        },
        
        /**
         * 提交健康表單
         */
        submitHealthForm: function() {
            if (!currentChildId) {
                NotificationManager.error('錯誤', '請先選擇寶寶');
                return;
            }
            
            const date = document.getElementById('healthDate').value;
            const type = document.getElementById('healthType').value;
            const details = document.getElementById('healthDetails').value;
            const notes = document.getElementById('healthNotes').value;
            
            if (!date || !type || !details) {
                NotificationManager.error('錯誤', '請填入日期、類型和詳細資料');
                return;
            }
            
            const data = {
                childId: currentChildId,
                eventDate: date,
                type: type,
                details: details,
                notes: notes,
                temperatureUnit: '攝氏'
            };
            
            // 如果有體溫資料
            const bodyTemperature = document.getElementById('bodyTemperature').value;
            if (bodyTemperature) {
                data.bodyTemperature = parseFloat(bodyTemperature);
                data.measurementMethod = document.getElementById('measurementMethod').value;
            }
            
            if (editingRecordId) {
                data.id = editingRecordId;
                DBManager.update(STORES.HEALTH, data).then(function() {
                    NotificationManager.success('成功', '健康記錄已更新');
                    UIManager.hideHealthForm();
                    UIManager.loadHealthRecords();
                }).catch(function(error) {
                    NotificationManager.error('錯誤', error);
                });
            } else {
                DBManager.add(STORES.HEALTH, data).then(function() {
                    NotificationManager.success('成功', '健康記錄已儲存');
                    UIManager.hideHealthForm();
                    UIManager.loadHealthRecords();
                }).catch(function(error) {
                    NotificationManager.error('錯誤', error);
                });
            }
        },
        
        /**
         * 載入健康記錄
         */
        loadHealthRecords: function() {
            if (!currentChildId) return;
            
            LoadingManager.show();
            
            DBManager.getAll(STORES.HEALTH, 'childId', currentChildId).then(function(records) {
                LoadingManager.hide();
                
                // 按日期排序（最新的在前）
                records.sort(function(a, b) {
                    return new Date(b.eventDate) - new Date(a.eventDate);
                });
                
                UIManager.renderHealthRecords(records);
            }).catch(function(error) {
                LoadingManager.hide();
                NotificationManager.error('錯誤', error);
            });
        },
        
        /**
         * 渲染健康記錄
         * @param {Array} records - 記錄陣列
         */
        renderHealthRecords: function(records) {
            const container = document.getElementById('healthRecords');
            if (!container) return;
            
            if (records.length === 0) {
                container.innerHTML = '<p class="no-records">尚無健康記錄</p>';
                return;
            }
            
            let html = '';
            
            records.forEach(function(record) {
                const date = TimeZoneManager.utcToLocalDate(record.eventDate + 'T00:00:00Z');
                const typeText = HEALTH_TYPES[record.type] || record.type;
                
                let detailsHtml = 
                    '<div class="record-detail">' +
                        '<span class="record-detail-label">類型：</span>' +
                        '<span class="record-detail-value">' + typeText + '</span>' +
                    '</div>' +
                    '<div class="record-detail">' +
                        '<span class="record-detail-label">詳細：</span>' +
                        '<span class="record-detail-value">' + UIManager.escapeHtml(record.details) + '</span>' +
                    '</div>';
                
                if (record.bodyTemperature) {
                    const methodText = MEASUREMENT_METHODS[record.measurementMethod] || record.measurementMethod;
                    detailsHtml += 
                        '<div class="record-detail">' +
                            '<span class="record-detail-label">體溫：</span>' +
                            '<span class="record-detail-value">' + record.bodyTemperature + ' °C (' + methodText + ')</span>' +
                        '</div>';
                }
                
                html += 
                    '<div class="record-card">' +
                        '<div class="record-header">' +
                            '<div class="record-title">健康記錄</div>' +
                            '<div class="record-time">' + date + '</div>' +
                        '</div>' +
                        '<div class="record-details">' + detailsHtml + '</div>' +
                        (record.notes ? '<div class="record-notes">' + UIManager.escapeHtml(record.notes) + '</div>' : '') +
                        '<div class="record-actions">' +
                            '<button class="record-action-btn" onclick="UIManager.editHealthRecord(' + record.id + ')">✏️</button>' +
                            '<button class="record-action-btn" onclick="UIManager.deleteHealthRecord(' + record.id + ')">🗑️</button>' +
                        '</div>' +
                    '</div>';
            });
            
            container.innerHTML = html;
        },
        
        /**
         * 編輯健康記錄
         * @param {number} id - 記錄 ID
         */
        editHealthRecord: function(id) {
            DBManager.get(STORES.HEALTH, id).then(function(record) {
                if (record) {
                    UIManager.showHealthForm(record);
                }
            }).catch(function(error) {
                NotificationManager.error('錯誤', error);
            });
        },
        
        /**
         * 刪除健康記錄
         * @param {number} id - 記錄 ID
         */
        deleteHealthRecord: function(id) {
            if (confirm('確定要刪除這筆健康記錄嗎？')) {
                DBManager.delete(STORES.HEALTH, id).then(function() {
                    NotificationManager.success('成功', '健康記錄已刪除');
                    UIManager.loadHealthRecords();
                }).catch(function(error) {
                    NotificationManager.error('錯誤', error);
                });
            }
        },
        
        /**
         * 設定里程碑表單
         */
        setupMilestoneForm: function() {
            const addBtn = document.getElementById('addMilestoneBtn');
            const form = document.getElementById('milestoneForm');
            const cancelBtn = form ? form.querySelector('.cancel-btn') : null;
            
            if (addBtn && form) {
                addBtn.addEventListener('click', function() {
                    UIManager.showMilestoneForm();
                });
            }
            
            if (cancelBtn && form) {
                cancelBtn.addEventListener('click', function() {
                    UIManager.hideMilestoneForm();
                });
            }
            
            if (form) {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    UIManager.submitMilestoneForm();
                });
            }
        },
        
        /**
         * 顯示里程碑表單
         * @param {object} record - 要編輯的記錄（可選）
         */
        showMilestoneForm: function(record) {
            const form = document.getElementById('milestoneForm');
            if (!form) return;
            
            // 重設表單
            form.reset();
            editingRecordId = null;
            editingRecordType = null;
            
            if (record) {
                // 編輯模式
                editingRecordId = record.id;
                editingRecordType = STORES.MILESTONES;
                
                document.getElementById('milestoneDate').value = record.achievementDate || '';
                document.getElementById('milestoneCategory').value = record.category || '';
                document.getElementById('milestoneName').value = record.milestoneName || '';
                document.getElementById('milestoneNotes').value = record.notes || '';
            } else {
                // 新增模式，設定預設日期為今天
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('milestoneDate').value = today;
            }
            
            form.classList.remove('hidden');
            form.scrollIntoView({ behavior: 'smooth' });
        },
        
        /**
         * 隱藏里程碑表單
         */
        hideMilestoneForm: function() {
            const form = document.getElementById('milestoneForm');
            if (form) {
                form.classList.add('hidden');
                editingRecordId = null;
                editingRecordType = null;
            }
        },
        
        /**
         * 提交里程碑表單
         */
        submitMilestoneForm: function() {
            if (!currentChildId) {
                NotificationManager.error('錯誤', '請先選擇寶寶');
                return;
            }
            
            const date = document.getElementById('milestoneDate').value;
            const category = document.getElementById('milestoneCategory').value;
            const name = document.getElementById('milestoneName').value;
            const notes = document.getElementById('milestoneNotes').value;
            
            if (!date || !category || !name) {
                NotificationManager.error('錯誤', '請填入日期、類別和里程碑名稱');
                return;
            }
            
            const data = {
                childId: currentChildId,
                achievementDate: date,
                category: category,
                milestoneName: name,
                notes: notes
            };
            
            if (editingRecordId) {
                data.id = editingRecordId;
                DBManager.update(STORES.MILESTONES, data).then(function() {
                    NotificationManager.success('成功', '里程碑記錄已更新');
                    UIManager.hideMilestoneForm();
                    UIManager.loadMilestoneRecords();
                }).catch(function(error) {
                    NotificationManager.error('錯誤', error);
                });
            } else {
                DBManager.add(STORES.MILESTONES, data).then(function() {
                    NotificationManager.success('成功', '里程碑記錄已儲存');
                    UIManager.hideMilestoneForm();
                    UIManager.loadMilestoneRecords();
                }).catch(function(error) {
                    NotificationManager.error('錯誤', error);
                });
            }
        },
        
        /**
         * 載入里程碑記錄
         */
        loadMilestoneRecords: function() {
            if (!currentChildId) return;
            
            LoadingManager.show();
            
            DBManager.getAll(STORES.MILESTONES, 'childId', currentChildId).then(function(records) {
                LoadingManager.hide();
                
                // 按日期排序（最新的在前）
                records.sort(function(a, b) {
                    return new Date(b.achievementDate) - new Date(a.achievementDate);
                });
                
                UIManager.renderMilestoneRecords(records);
            }).catch(function(error) {
                LoadingManager.hide();
                NotificationManager.error('錯誤', error);
            });
        },
        
        /**
         * 渲染里程碑記錄
         * @param {Array} records - 記錄陣列
         */
        renderMilestoneRecords: function(records) {
            const container = document.getElementById('milestoneRecords');
            if (!container) return;
            
            if (records.length === 0) {
                container.innerHTML = '<p class="no-records">尚無里程碑記錄</p>';
                return;
            }
            
            let html = '';
            
            records.forEach(function(record) {
                const date = TimeZoneManager.utcToLocalDate(record.achievementDate + 'T00:00:00Z');
                const categoryText = MILESTONE_CATEGORIES[record.category] || (record.category === 'custom' ? '自訂' : record.category);
                
                html += 
                    '<div class="record-card">' +
                        '<div class="record-header">' +
                            '<div class="record-title">' + UIManager.escapeHtml(record.milestoneName) + '</div>' +
                            '<div class="record-time">' + date + '</div>' +
                        '</div>' +
                        '<div class="record-details">' +
                            '<div class="record-detail">' +
                                '<span class="record-detail-label">類別：</span>' +
                                '<span class="record-detail-value">' + categoryText + '</span>' +
                            '</div>' +
                        '</div>' +
                        (record.notes ? '<div class="record-notes">' + UIManager.escapeHtml(record.notes) + '</div>' : '') +
                        '<div class="record-actions">' +
                            '<button class="record-action-btn" onclick="UIManager.editMilestoneRecord(' + record.id + ')">✏️</button>' +
                            '<button class="record-action-btn" onclick="UIManager.deleteMilestoneRecord(' + record.id + ')">🗑️</button>' +
                        '</div>' +
                    '</div>';
            });
            
            container.innerHTML = html;
        },
        
        /**
         * 編輯里程碑記錄
         * @param {number} id - 記錄 ID
         */
        editMilestoneRecord: function(id) {
            DBManager.get(STORES.MILESTONES, id).then(function(record) {
                if (record) {
                    UIManager.showMilestoneForm(record);
                }
            }).catch(function(error) {
                NotificationManager.error('錯誤', error);
            });
        },
        
        /**
         * 刪除里程碑記錄
         * @param {number} id - 記錄 ID
         */
        deleteMilestoneRecord: function(id) {
            if (confirm('確定要刪除這筆里程碑記錄嗎？')) {
                DBManager.delete(STORES.MILESTONES, id).then(function() {
                    NotificationManager.success('成功', '里程碑記錄已刪除');
                    UIManager.loadMilestoneRecords();
                }).catch(function(error) {
                    NotificationManager.error('錯誤', error);
                });
            }
        },
        
        /**
         * 設定互動表單
         */
        setupInteractionForm: function() {
            const addBtn = document.getElementById('addInteractionBtn');
            const form = document.getElementById('interactionForm');
            const cancelBtn = form ? form.querySelector('.cancel-btn') : null;
            
            if (addBtn && form) {
                addBtn.addEventListener('click', function() {
                    UIManager.showInteractionForm();
                });
            }
            
            if (cancelBtn && form) {
                cancelBtn.addEventListener('click', function() {
                    UIManager.hideInteractionForm();
                });
            }
            
            if (form) {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    UIManager.submitInteractionForm();
                });
            }
            
            // 設定照片預覽
            FileHandler.setupImagePreview(
                'interactionPhoto', 
                'interactionPhotoPreview', 
                'interactionPhotoImg', 
                'removeInteractionPhoto'
            );
        },
        
        /**
         * 顯示互動表單
         * @param {object} record - 要編輯的記錄（可選）
         */
        showInteractionForm: function(record) {
            const form = document.getElementById('interactionForm');
            if (!form) return;
            
            // 重設表單
            form.reset();
            editingRecordId = null;
            editingRecordType = null;
            
            // 隱藏照片預覽
            const photoPreview = document.getElementById('interactionPhotoPreview');
            if (photoPreview) photoPreview.classList.add('hidden');
            
            if (record) {
                // 編輯模式
                editingRecordId = record.id;
                editingRecordType = STORES.INTERACTIONS;
                
                document.getElementById('interactionTime').value = TimeZoneManager.utcToInputFormat(record.eventTime);
                document.getElementById('emotionalState').value = record.emotionalState || '';
                document.getElementById('interactionEvent').value = record.interactionEvent || '';
                document.getElementById('interactionNotes').value = record.notes || '';
                
                // 顯示現有照片
                if (record.photo) {
                    const img = document.getElementById('interactionPhotoImg');
                    if (img) {
                        img.src = record.photo;
                        photoPreview.classList.remove('hidden');
                    }
                }
            } else {
                // 新增模式，設定預設時間為現在
                const now = new Date();
                const nowString = TimeZoneManager.utcToInputFormat(now.toISOString());
                document.getElementById('interactionTime').value = nowString;
            }
            
            form.classList.remove('hidden');
            form.scrollIntoView({ behavior: 'smooth' });
        },
        
        /**
         * 隱藏互動表單
         */
        hideInteractionForm: function() {
            const form = document.getElementById('interactionForm');
            if (form) {
                form.classList.add('hidden');
                editingRecordId = null;
                editingRecordType = null;
            }
        },
        
        /**
         * 提交互動表單
         */
        submitInteractionForm: function() {
            if (!currentChildId) {
                NotificationManager.error('錯誤', '請先選擇寶寶');
                return;
            }
            
            const time = document.getElementById('interactionTime').value;
            const emotionalState = document.getElementById('emotionalState').value;
            const interactionEvent = document.getElementById('interactionEvent').value;
            const notes = document.getElementById('interactionNotes').value;
            
            if (!time || !interactionEvent) {
                NotificationManager.error('錯誤', '請填入時間和互動事件');
                return;
            }
            
            const data = {
                childId: currentChildId,
                eventTime: TimeZoneManager.localToUtc(time),
                emotionalState: emotionalState,
                interactionEvent: interactionEvent,
                notes: notes
            };
            
            // 處理照片
            const photoInput = document.getElementById('interactionPhoto');
            const existingPhoto = document.getElementById('interactionPhotoImg').src;
            
            let photoPromise;
            if (photoInput && photoInput.files && photoInput.files[0]) {
                // 有新上傳的照片
                photoPromise = FileHandler.fileToBase64(photoInput.files[0]);
            } else if (existingPhoto && !existingPhoto.includes('data:')) {
                // 保留現有照片（編輯模式）
                photoPromise = Promise.resolve(existingPhoto);
            } else {
                photoPromise = Promise.resolve(null);
            }
            
            photoPromise.then(function(photoBase64) {
                if (photoBase64) {
                    data.photo = photoBase64;
                }
                
                if (editingRecordId) {
                    data.id = editingRecordId;
                    DBManager.update(STORES.INTERACTIONS, data).then(function() {
                        NotificationManager.success('成功', '互動記錄已更新');
                        UIManager.hideInteractionForm();
                        UIManager.loadInteractionRecords();
                    }).catch(function(error) {
                        NotificationManager.error('錯誤', error);
                    });
                } else {
                    DBManager.add(STORES.INTERACTIONS, data).then(function() {
                        NotificationManager.success('成功', '互動記錄已儲存');
                        UIManager.hideInteractionForm();
                        UIManager.loadInteractionRecords();
                    }).catch(function(error) {
                        NotificationManager.error('錯誤', error);
                    });
                }
            }).catch(function(error) {
                NotificationManager.error('錯誤', '照片處理失敗');
            });
        },
        
        /**
         * 載入互動記錄
         */
        loadInteractionRecords: function() {
            if (!currentChildId) return;
            
            LoadingManager.show();
            
            DBManager.getAll(STORES.INTERACTIONS, 'childId', currentChildId).then(function(records) {
                LoadingManager.hide();
                
                // 按時間排序（最新的在前）
                records.sort(function(a, b) {
                    return new Date(b.eventTime) - new Date(a.eventTime);
                });
                
                UIManager.renderInteractionRecords(records);
            }).catch(function(error) {
                LoadingManager.hide();
                NotificationManager.error('錯誤', error);
            });
        },
        
        /**
         * 渲染互動記錄
         * @param {Array} records - 記錄陣列
         */
        renderInteractionRecords: function(records) {
            const container = document.getElementById('interactionRecords');
            if (!container) return;
            
            if (records.length === 0) {
                container.innerHTML = '<p class="no-records">尚無互動記錄</p>';
                return;
            }
            
            let html = '';
            
            records.forEach(function(record) {
                const time = TimeZoneManager.utcToLocal(record.eventTime);
                
                html += 
                    '<div class="record-card">' +
                        '<div class="record-header">' +
                            '<div class="record-title">親子互動</div>' +
                            '<div class="record-time">' + time + '</div>' +
                        '</div>' +
                        '<div class="record-details">' +
                            (record.emotionalState ? 
                                '<div class="record-detail">' +
                                    '<span class="record-detail-label">情緒狀態：</span>' +
                                    '<span class="record-detail-value">' + UIManager.escapeHtml(record.emotionalState) + '</span>' +
                                '</div>' : '') +
                            '<div class="record-detail">' +
                                '<span class="record-detail-label">互動事件：</span>' +
                                '<span class="record-detail-value">' + UIManager.escapeHtml(record.interactionEvent) + '</span>' +
                            '</div>' +
                        '</div>' +
                        (record.photo ? 
                            '<div class="record-photo">' +
                                '<img src="' + record.photo + '" alt="互動照片">' +
                            '</div>' : '') +
                        (record.notes ? '<div class="record-notes">' + UIManager.escapeHtml(record.notes) + '</div>' : '') +
                        '<div class="record-actions">' +
                            '<button class="record-action-btn" onclick="UIManager.editInteractionRecord(' + record.id + ')">✏️</button>' +
                            '<button class="record-action-btn" onclick="UIManager.deleteInteractionRecord(' + record.id + ')">🗑️</button>' +
                        '</div>' +
                    '</div>';
            });
            
            container.innerHTML = html;
        },
        
        /**
         * 編輯互動記錄
         * @param {number} id - 記錄 ID
         */
        editInteractionRecord: function(id) {
            DBManager.get(STORES.INTERACTIONS, id).then(function(record) {
                if (record) {
                    UIManager.showInteractionForm(record);
                }
            }).catch(function(error) {
                NotificationManager.error('錯誤', error);
            });
        },
        
        /**
         * 刪除互動記錄
         * @param {number} id - 記錄 ID
         */
        deleteInteractionRecord: function(id) {
            if (confirm('確定要刪除這筆互動記錄嗎？')) {
                DBManager.delete(STORES.INTERACTIONS, id).then(function() {
                    NotificationManager.success('成功', '互動記錄已刪除');
                    UIManager.loadInteractionRecords();
                }).catch(function(error) {
                    NotificationManager.error('錯誤', error);
                });
            }
        },
        
        /**
         * 設定活動表單
         */
        setupActivityForm: function() {
            const addBtn = document.getElementById('addActivityBtn');
            const form = document.getElementById('activityForm');
            const cancelBtn = form ? form.querySelector('.cancel-btn') : null;
            
            if (addBtn && form) {
                addBtn.addEventListener('click', function() {
                    UIManager.showActivityForm();
                });
            }
            
            if (cancelBtn && form) {
                cancelBtn.addEventListener('click', function() {
                    UIManager.hideActivityForm();
                });
            }
            
            if (form) {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    UIManager.submitActivityForm();
                });
            }
            
            // 設定照片預覽
            FileHandler.setupImagePreview(
                'activityPhoto', 
                'activityPhotoPreview', 
                'activityPhotoImg', 
                'removeActivityPhoto'
            );
        },
        
        /**
         * 顯示活動表單
         * @param {object} record - 要編輯的記錄（可選）
         */
        showActivityForm: function(record) {
            const form = document.getElementById('activityForm');
            if (!form) return;
            
            // 重設表單
            form.reset();
            editingRecordId = null;
            editingRecordType = null;
            
            // 隱藏條件字段和照片預覽
            const customActivityField = document.getElementById('customActivityField');
            const photoPreview = document.getElementById('activityPhotoPreview');
            if (customActivityField) customActivityField.classList.add('hidden');
            if (photoPreview) photoPreview.classList.add('hidden');
            
            if (record) {
                // 編輯模式
                editingRecordId = record.id;
                editingRecordType = STORES.ACTIVITIES;
                
                if (record.type === 'custom') {
                    document.getElementById('activityName').value = 'custom';
                    document.getElementById('customActivityName').value = record.activityName || '';
                    if (customActivityField) customActivityField.classList.remove('hidden');
                } else {
                    document.getElementById('activityName').value = record.activityName || '';
                }
                
                document.getElementById('activityStartTime').value = TimeZoneManager.utcToInputFormat(record.startTime);
                document.getElementById('activityEndTime').value = TimeZoneManager.utcToInputFormat(record.endTime);
                document.getElementById('activityNotes').value = record.notes || '';
                
                // 計算時長
                const duration = record.duration || TimeZoneManager.calculateDuration(record.startTime, record.endTime);
                document.getElementById('activityDuration').value = duration;
                
                // 顯示現有照片
                if (record.photo) {
                    const img = document.getElementById('activityPhotoImg');
                    if (img) {
                        img.src = record.photo;
                        photoPreview.classList.remove('hidden');
                    }
                }
            } else {
                // 新增模式，設定預設時間為現在
                const now = new Date();
                const nowString = TimeZoneManager.utcToInputFormat(now.toISOString());
                document.getElementById('activityStartTime').value = nowString;
            }
            
            // 觸發條件字段邏輯
            const activityName = document.getElementById('activityName');
            if (activityName) {
                activityName.dispatchEvent(new Event('change'));
            }
            
            form.classList.remove('hidden');
            form.scrollIntoView({ behavior: 'smooth' });
        },
        
        /**
         * 隱藏活動表單
         */
        hideActivityForm: function() {
            const form = document.getElementById('activityForm');
            if (form) {
                form.classList.add('hidden');
                editingRecordId = null;
                editingRecordType = null;
            }
        },
        
        /**
         * 提交活動表單
         */
        submitActivityForm: function() {
            if (!currentChildId) {
                NotificationManager.error('錯誤', '請先選擇寶寶');
                return;
            }
            
            const activityName = document.getElementById('activityName').value;
            const startTime = document.getElementById('activityStartTime').value;
            const endTime = document.getElementById('activityEndTime').value;
            const notes = document.getElementById('activityNotes').value;
            
            if (!activityName || !startTime || !endTime) {
                NotificationManager.error('錯誤', '請填入活動名稱、開始和結束時間');
                return;
            }
            
            let finalActivityName = activityName;
            let activityType = 'preset';
            
            if (activityName === 'custom') {
                const customName = document.getElementById('customActivityName').value;
                if (!customName) {
                    NotificationManager.error('錯誤', '請填入自訂活動名稱');
                    return;
                }
                finalActivityName = customName;
                activityType = 'custom';
            }
            
            const startUtc = TimeZoneManager.localToUtc(startTime);
            const endUtc = TimeZoneManager.localToUtc(endTime);
            
            if (new Date(endUtc) <= new Date(startUtc)) {
                NotificationManager.error('錯誤', '結束時間必須晚於開始時間');
                return;
            }
            
            const data = {
                childId: currentChildId,
                activityName: finalActivityName,
                type: activityType,
                startTime: startUtc,
                endTime: endUtc,
                duration: TimeZoneManager.calculateDuration(startUtc, endUtc),
                notes: notes
            };
            
            // 處理照片
            const photoInput = document.getElementById('activityPhoto');
            const existingPhoto = document.getElementById('activityPhotoImg').src;
            
            let photoPromise;
            if (photoInput && photoInput.files && photoInput.files[0]) {
                // 有新上傳的照片
                photoPromise = FileHandler.fileToBase64(photoInput.files[0]);
            } else if (existingPhoto && !existingPhoto.includes('data:')) {
                // 保留現有照片（編輯模式）
                photoPromise = Promise.resolve(existingPhoto);
            } else {
                photoPromise = Promise.resolve(null);
            }
            
            photoPromise.then(function(photoBase64) {
                if (photoBase64) {
                    data.photo = photoBase64;
                }
                
                if (editingRecordId) {
                    data.id = editingRecordId;
                    DBManager.update(STORES.ACTIVITIES, data).then(function() {
                        NotificationManager.success('成功', '活動記錄已更新');
                        UIManager.hideActivityForm();
                        UIManager.loadActivityRecords();
                    }).catch(function(error) {
                        NotificationManager.error('錯誤', error);
                    });
                } else {
                    DBManager.add(STORES.ACTIVITIES, data).then(function() {
                        NotificationManager.success('成功', '活動記錄已儲存');
                        UIManager.hideActivityForm();
                        UIManager.loadActivityRecords();
                    }).catch(function(error) {
                        NotificationManager.error('錯誤', error);
                    });
                }
            }).catch(function(error) {
                NotificationManager.error('錯誤', '照片處理失敗');
            });
        },
        
        /**
         * 載入活動記錄
         */
        loadActivityRecords: function() {
            if (!currentChildId) return;
            
            LoadingManager.show();
            
            DBManager.getAll(STORES.ACTIVITIES, 'childId', currentChildId).then(function(records) {
                LoadingManager.hide();
                
                // 按開始時間排序（最新的在前）
                records.sort(function(a, b) {
                    return new Date(b.startTime) - new Date(a.startTime);
                });
                
                UIManager.renderActivityRecords(records);
            }).catch(function(error) {
                LoadingManager.hide();
                NotificationManager.error('錯誤', error);
            });
        },
        
        /**
         * 渲染活動記錄
         * @param {Array} records - 記錄陣列
         */
        renderActivityRecords: function(records) {
            const container = document.getElementById('activityRecords');
            if (!container) return;
            
            if (records.length === 0) {
                container.innerHTML = '<p class="no-records">尚無活動記錄</p>';
                return;
            }
            
            let html = '';
            
            records.forEach(function(record) {
                const startTime = TimeZoneManager.utcToLocal(record.startTime);
                const endTime = TimeZoneManager.utcToLocal(record.endTime);
                const duration = record.duration || TimeZoneManager.calculateDuration(record.startTime, record.endTime);
                
                let activityDisplayName = record.activityName;
                if (record.type === 'preset' && ACTIVITY_TYPES[record.activityName]) {
                    activityDisplayName = ACTIVITY_TYPES[record.activityName];
                }
                
                html += 
                    '<div class="record-card">' +
                        '<div class="record-header">' +
                            '<div class="record-title">' + UIManager.escapeHtml(activityDisplayName) + '</div>' +
                            '<div class="record-time">' + startTime + '</div>' +
                        '</div>' +
                        '<div class="record-details">' +
                            '<div class="record-detail">' +
                                '<span class="record-detail-label">開始：</span>' +
                                '<span class="record-detail-value">' + startTime + '</span>' +
                            '</div>' +
                            '<div class="record-detail">' +
                                '<span class="record-detail-label">結束：</span>' +
                                '<span class="record-detail-value">' + endTime + '</span>' +
                            '</div>' +
                            '<div class="record-detail">' +
                                '<span class="record-detail-label">時長：</span>' +
                                '<span class="record-detail-value">' + duration + '</span>' +
                            '</div>' +
                        '</div>' +
                        (record.photo ? 
                            '<div class="record-photo">' +
                                '<img src="' + record.photo + '" alt="活動照片">' +
                            '</div>' : '') +
                        (record.notes ? '<div class="record-notes">' + UIManager.escapeHtml(record.notes) + '</div>' : '') +
                        '<div class="record-actions">' +
                            '<button class="record-action-btn" onclick="UIManager.editActivityRecord(' + record.id + ')">✏️</button>' +
                            '<button class="record-action-btn" onclick="UIManager.deleteActivityRecord(' + record.id + ')">🗑️</button>' +
                        '</div>' +
                    '</div>';
            });
            
            container.innerHTML = html;
        },
        
        /**
         * 編輯活動記錄
         * @param {number} id - 記錄 ID
         */
        editActivityRecord: function(id) {
            DBManager.get(STORES.ACTIVITIES, id).then(function(record) {
                if (record) {
                    UIManager.showActivityForm(record);
                }
            }).catch(function(error) {
                NotificationManager.error('錯誤', error);
            });
        },
        
        /**
         * 刪除活動記錄
         * @param {number} id - 記錄 ID
         */
        deleteActivityRecord: function(id) {
            if (confirm('確定要刪除這筆活動記錄嗎？')) {
                DBManager.delete(STORES.ACTIVITIES, id).then(function() {
                    NotificationManager.success('成功', '活動記錄已刪除');
                    UIManager.loadActivityRecords();
                }).catch(function(error) {
                    NotificationManager.error('錯誤', error);
                });
            }
        },
        
        /**
         * 設定孩子表單
         */
        setupChildForm: function() {
            const form = document.getElementById('childForm');
            const cancelBtn = document.getElementById('cancelChildForm');
            
            if (cancelBtn && form) {
                cancelBtn.addEventListener('click', function() {
                    UIManager.hideChildForm();
                });
            }
            
            if (form) {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    UIManager.submitChildForm();
                });
            }
            
            // 設定照片預覽
            FileHandler.setupImagePreview(
                'childPhoto', 
                'childPhotoPreview', 
                'childPhotoImg', 
                'removeChildPhoto'
            );
        },
        
        /**
         * 開啟孩子管理模態框
         */
        openChildManagement: function() {
            const modal = document.getElementById('childManagementModal');
            if (modal) {
                modal.classList.remove('hidden');
                this.loadChildrenList();
                this.hideChildForm();
            }
        },
        
        /**
         * 顯示孩子表單
         * @param {object} child - 要編輯的孩子資料（可選）
         */
        showChildForm: function(child) {
            const form = document.getElementById('childForm');
            if (!form) return;
            
            // 重設表單
            form.reset();
            editingRecordId = null;
            editingRecordType = null;
            
            // 隱藏照片預覽
            const photoPreview = document.getElementById('childPhotoPreview');
            if (photoPreview) photoPreview.classList.add('hidden');
            
            if (child) {
                // 編輯模式
                editingRecordId = child.id;
                editingRecordType = STORES.CHILDREN;
                
                document.getElementById('childName').value = child.name || '';
                document.getElementById('childBirthDate').value = child.dateOfBirth || '';
                document.getElementById('childGender').value = child.gender || '';
                document.getElementById('childNotes').value = child.notes || '';
                
                // 顯示現有照片
                if (child.photo) {
                    const img = document.getElementById('childPhotoImg');
                    if (img) {
                        img.src = child.photo;
                        photoPreview.classList.remove('hidden');
                    }
                }
            }
            
            form.scrollIntoView({ behavior: 'smooth' });
        },
        
        /**
         * 隱藏孩子表單
         */
        hideChildForm: function() {
            const form = document.getElementById('childForm');
            if (form) {
                form.reset();
                editingRecordId = null;
                editingRecordType = null;
                
                // 隱藏照片預覽
                const photoPreview = document.getElementById('childPhotoPreview');
                if (photoPreview) photoPreview.classList.add('hidden');
            }
        },
        
        /**
         * 提交孩子表單
         */
        submitChildForm: function() {
            const name = document.getElementById('childName').value;
            const birthDate = document.getElementById('childBirthDate').value;
            const gender = document.getElementById('childGender').value;
            const notes = document.getElementById('childNotes').value;
            
            if (!name || !birthDate || !gender) {
                NotificationManager.error('錯誤', '請填入姓名、出生日期和性別');
                return;
            }
            
            const data = {
                name: name,
                dateOfBirth: birthDate,
                gender: gender,
                notes: notes
            };
            
            // 處理照片
            const photoInput = document.getElementById('childPhoto');
            const existingPhoto = document.getElementById('childPhotoImg').src;
            
            let photoPromise;
            if (photoInput && photoInput.files && photoInput.files[0]) {
                // 有新上傳的照片
                photoPromise = FileHandler.fileToBase64(photoInput.files[0]);
            } else if (existingPhoto && !existingPhoto.includes('data:')) {
                // 保留現有照片（編輯模式）
                photoPromise = Promise.resolve(existingPhoto);
            } else {
                photoPromise = Promise.resolve(null);
            }
            
            photoPromise.then(function(photoBase64) {
                if (photoBase64) {
                    data.photo = photoBase64;
                }
                
                if (editingRecordId) {
                    data.id = editingRecordId;
                    DBManager.update(STORES.CHILDREN, data).then(function() {
                        NotificationManager.success('成功', '寶寶資料已更新');
                        UIManager.hideChildForm();
                        UIManager.loadChildrenList();
                        UIManager.loadChildSelector();
                        
                        // 如果正在編輯當前選中的孩子，重新載入總覽
                        if (data.id === currentChildId) {
                            UIManager.loadOverviewData();
                        }
                    }).catch(function(error) {
                        NotificationManager.error('錯誤', error);
                    });
                } else {
                    DBManager.add(STORES.CHILDREN, data).then(function(childId) {
                        NotificationManager.success('成功', '寶寶資料已儲存');
                        UIManager.hideChildForm();
                        UIManager.loadChildrenList();
                        UIManager.loadChildSelector();
                        
                        // 自動選擇新新增的孩子
                        currentChildId = childId;
                        UIManager.updateChildSelector();
                        UIManager.loadOverviewData();
                    }).catch(function(error) {
                        NotificationManager.error('錯誤', error);
                    });
                }
            }).catch(function(error) {
                NotificationManager.error('錯誤', '照片處理失敗');
            });
        },
        
        /**
         * 載入孩子列表
         */
        loadChildrenList: function() {
            LoadingManager.show();
            
            DBManager.getAll(STORES.CHILDREN).then(function(children) {
                LoadingManager.hide();
                UIManager.renderChildrenList(children);
            }).catch(function(error) {
                LoadingManager.hide();
                NotificationManager.error('錯誤', error);
            });
        },
        
        /**
         * 渲染孩子列表
         * @param {Array} children - 孩子陣列
         */
        renderChildrenList: function(children) {
            const container = document.getElementById('childrenList');
            if (!container) return;
            
            if (children.length === 0) {
                container.innerHTML = '<p class="no-records">尚無寶寶資料</p>';
                return;
            }
            
            let html = '';
            
            children.forEach(function(child) {
                const age = TimeZoneManager.calculateAge(child.dateOfBirth);
                const genderText = GENDERS[child.gender] || child.gender;
                
                html += 
                    '<div class="child-list-item">' +
                        (child.photo ? 
                            '<img src="' + child.photo + '" alt="' + child.name + '" class="child-avatar">' :
                            '<div class="child-placeholder-avatar">👶</div>') +
                        '<div class="child-info">' +
                            '<div class="child-name">' + UIManager.escapeHtml(child.name) + '</div>' +
                            '<div class="child-details">' + genderText + ' • ' + age + '</div>' +
                        '</div>' +
                        '<div class="child-actions">' +
                            '<button class="child-action-btn" onclick="UIManager.editChild(' + child.id + ')">✏️</button>' +
                            '<button class="child-action-btn" onclick="UIManager.deleteChild(' + child.id + ')">🗑️</button>' +
                        '</div>' +
                    '</div>';
            });
            
            container.innerHTML = html;
        },
        
        /**
         * 編輯孩子
         * @param {number} id - 孩子 ID
         */
        editChild: function(id) {
            DBManager.get(STORES.CHILDREN, id).then(function(child) {
                if (child) {
                    UIManager.showChildForm(child);
                }
            }).catch(function(error) {
                NotificationManager.error('錯誤', error);
            });
        },
        
        /**
         * 刪除孩子
         * @param {number} id - 孩子 ID
         */
        deleteChild: function(id) {
            if (confirm('確定要刪除這位寶寶的所有資料嗎？此操作無法復原。')) {
                // 先刪除所有相關記錄
                const storeNames = [STORES.FEEDINGS, STORES.SLEEPS, STORES.DIAPERS, STORES.HEALTH, STORES.MILESTONES, STORES.INTERACTIONS, STORES.ACTIVITIES];
                
                Promise.all(storeNames.map(function(storeName) {
                    return DBManager.getAll(storeName, 'childId', id);
                })).then(function(allRecords) {
                    // 刪除所有相關記錄
                    const deletePromises = [];
                    
                    allRecords.forEach(function(records, index) {
                        const storeName = storeNames[index];
                        records.forEach(function(record) {
                            deletePromises.push(DBManager.delete(storeName, record.id));
                        });
                    });
                    
                    // 刪除孩子本身
                    deletePromises.push(DBManager.delete(STORES.CHILDREN, id));
                    
                    return Promise.all(deletePromises);
                }).then(function() {
                    NotificationManager.success('成功', '寶寶資料已刪除');
                    UIManager.loadChildrenList();
                    UIManager.loadChildSelector();
                    
                    // 如果刪除的是當前選中的孩子，清除選擇
                    if (currentChildId === id) {
                        currentChildId = null;
                        UIManager.updateChildSelector();
                        UIManager.loadOverviewData();
                    }
                }).catch(function(error) {
                    NotificationManager.error('錯誤', error);
                });
            }
        },
        
        /**
         * 載入孩子選擇器
         */
        loadChildSelector: function() {
            DBManager.getAll(STORES.CHILDREN).then(function(children) {
                UIManager.updateChildSelector(children);
            }).catch(function(error) {
                NotificationManager.error('錯誤', error);
            });
        },
        
        /**
         * 更新孩子選擇器
         * @param {Array} children - 孩子陣列（可選）
         */
        updateChildSelector: function(children) {
            const selector = document.getElementById('childSelector');
            if (!selector) return;
            
            if (children) {
                // 清空選項
                selector.innerHTML = '<option value="">選擇寶寶</option>';
                
                // 添加孩子選項
                children.forEach(function(child) {
                    const option = document.createElement('option');
                    option.value = child.id;
                    option.textContent = child.name;
                    selector.appendChild(option);
                });
            }
            
            // 設定當前選中的值
            selector.value = currentChildId || '';
        },
        
        /**
         * 設定孩子選擇器
         */
        setupChildSelector: function() {
            const selector = document.getElementById('childSelector');
            if (selector) {
                selector.addEventListener('change', function() {
                    currentChildId = this.value ? parseInt(this.value) : null;
                    UIManager.loadTabData(UIManager.getCurrentTab());
                });
            }
        },
        
        /**
         * 取得當前頁籤
         */
        getCurrentTab: function() {
            const activeTab = document.querySelector('.nav-tab.active');
            return activeTab ? activeTab.getAttribute('data-tab') : 'overview';
        },
        
        /**
         * 設定設定功能
         */
        setupSettings: function() {
            // 載入時區設定
            const savedTimezone = localStorage.getItem('babyTracker_timezone');
            if (savedTimezone) {
                currentTimezone = savedTimezone;
            }
            
            const timezoneSelector = document.getElementById('timezoneSelector');
            if (timezoneSelector) {
                timezoneSelector.value = currentTimezone;
                timezoneSelector.addEventListener('change', function() {
                    currentTimezone = this.value;
                    localStorage.setItem('babyTracker_timezone', currentTimezone);
                    NotificationManager.success('成功', '時區設定已更新');
                    
                    // 重新載入當前頁籤資料以反映時區變更
                    const currentTab = UIManager.getCurrentTab();
                    UIManager.loadTabData(currentTab);
                });
            }
            
            // 資料匯出
            const exportBtn = document.getElementById('exportDataBtn');
            if (exportBtn) {
                exportBtn.addEventListener('click', DataManager.exportData);
            }
            
            // 資料匯入
            const importBtn = document.getElementById('importDataFile');
            if (importBtn) {
                importBtn.addEventListener('change', function(e) {
                    const file = e.target.files[0];
                    if (file) {
                        DataManager.importData(file);
                    }
                });
            }
        },
        
        /**
         * 設定快速動作
         */
        setupQuickActions: function() {
            const quickActionBtns = document.querySelectorAll('.quick-action-btn');
            
            quickActionBtns.forEach(function(btn) {
                btn.addEventListener('click', function() {
                    const action = this.getAttribute('data-action');
                    UIManager.handleQuickAction(action);
                });
            });
        },
        
        /**
         * 處理快速動作
         * @param {string} action - 動作類型
         */
        handleQuickAction: function(action) {
            if (!currentChildId) {
                NotificationManager.warning('提醒', '請先選擇寶寶');
                this.openChildManagement();
                return;
            }
            
            // 切換到對應的頁籤
            this.showTab(action);
            
            // 顯示對應的表單
            switch (action) {
                case 'feeding':
                    this.showFeedingForm();
                    break;
                case 'sleep':
                    this.showSleepForm();
                    break;
                case 'diaper':
                    this.showDiaperForm();
                    break;
                case 'health':
                    this.showHealthForm();
                    break;
            }
        },
        
        /**
         * 設定時間跟蹤（自動計算時長）
         */
        setupTimeTracking: function() {
            // 睡眠時間計算
            const sleepStartTime = document.getElementById('sleepStartTime');
            const sleepEndTime = document.getElementById('sleepEndTime');
            const sleepDuration = document.getElementById('sleepDuration');
            
            if (sleepStartTime && sleepEndTime && sleepDuration) {
                function updateSleepDuration() {
                    const start = sleepStartTime.value;
                    const end = sleepEndTime.value;
                    
                    if (start && end) {
                        const startUtc = TimeZoneManager.localToUtc(start);
                        const endUtc = TimeZoneManager.localToUtc(end);
                        const duration = TimeZoneManager.calculateDuration(startUtc, endUtc);
                        sleepDuration.value = duration;
                    } else {
                        sleepDuration.value = '';
                    }
                }
                
                sleepStartTime.addEventListener('change', updateSleepDuration);
                sleepEndTime.addEventListener('change', updateSleepDuration);
            }
            
            // 活動時間計算
            const activityStartTime = document.getElementById('activityStartTime');
            const activityEndTime = document.getElementById('activityEndTime');
            const activityDuration = document.getElementById('activityDuration');
            
            if (activityStartTime && activityEndTime && activityDuration) {
                function updateActivityDuration() {
                    const start = activityStartTime.value;
                    const end = activityEndTime.value;
                    
                    if (start && end) {
                        const startUtc = TimeZoneManager.localToUtc(start);
                        const endUtc = TimeZoneManager.localToUtc(end);
                        const duration = TimeZoneManager.calculateDuration(startUtc, endUtc);
                        activityDuration.value = duration;
                    } else {
                        activityDuration.value = '';
                    }
                }
                
                activityStartTime.addEventListener('change', updateActivityDuration);
                activityEndTime.addEventListener('change', updateActivityDuration);
            }
        },
        
        /**
         * 載入總覽頁面資料
         */
        loadOverviewData: function() {
            const recentActivitiesList = document.getElementById('recentActivitiesList');
            const childProfileSummary = document.getElementById('childProfileSummary');
            
            if (!currentChildId) {
                if (recentActivitiesList) {
                    recentActivitiesList.innerHTML = '<p class="no-records">請選擇寶寶以查看最近記錄</p>';
                }
                if (childProfileSummary) {
                    childProfileSummary.innerHTML = '';
                }
                return;
            }
            
            // 載入孩子資料
            DBManager.get(STORES.CHILDREN, currentChildId).then(function(child) {
                if (child && childProfileSummary) {
                    UIManager.renderChildProfileSummary(child);
                }
            }).catch(function(error) {
                NotificationManager.error('錯誤', error);
            });
            
            // 載入最近活動
            UIManager.loadRecentActivities();
        },
        
        /**
         * 渲染孩子個人資料摘要
         * @param {object} child - 孩子資料
         */
        renderChildProfileSummary: function(child) {
            const container = document.getElementById('childProfileSummary');
            if (!container) return;
            
            const age = TimeZoneManager.calculateAge(child.dateOfBirth);
            const genderText = GENDERS[child.gender] || child.gender;
            
            container.innerHTML = 
                (child.photo ? 
                    '<img src="' + child.photo + '" alt="' + child.name + '" class="profile-avatar">' :
                    '<div class="profile-placeholder-avatar">👶</div>') +
                '<div class="profile-name">' + UIManager.escapeHtml(child.name) + '</div>' +
                '<div class="profile-details">' + genderText + ' • ' + age + '</div>' +
                (child.notes ? '<div class="profile-notes">' + UIManager.escapeHtml(child.notes) + '</div>' : '');
        },
        
        /**
         * 載入最近活動
         */
        loadRecentActivities: function() {
            if (!currentChildId) return;
            
            const storeNames = [STORES.FEEDINGS, STORES.SLEEPS, STORES.DIAPERS, STORES.HEALTH, STORES.MILESTONES, STORES.INTERACTIONS, STORES.ACTIVITIES];
            
            Promise.all(storeNames.map(function(storeName) {
                return DBManager.getAll(storeName, 'childId', currentChildId);
            })).then(function(allRecords) {
                // 合併所有記錄
                let activities = [];
                
                // 餵食記錄
                if (allRecords[0]) {
                    allRecords[0].forEach(function(record) {
                        activities.push({
                            type: 'feeding',
                            time: record.eventTimestamp || record.startTime || record.recordTimestamp,
                            title: FEEDING_TYPES[record.type] || record.type,
                            icon: '🍼'
                        });
                    });
                }
                
                // 睡眠記錄
                if (allRecords[1]) {
                    allRecords[1].forEach(function(record) {
                        activities.push({
                            type: 'sleep',
                            time: record.startTime,
                            title: '睡眠 (' + (record.duration || TimeZoneManager.calculateDuration(record.startTime, record.endTime)) + ')',
                            icon: '😴'
                        });
                    });
                }
                
                // 尿布記錄
                if (allRecords[2]) {
                    allRecords[2].forEach(function(record) {
                        activities.push({
                            type: 'diaper',
                            time: record.eventTime,
                            title: '尿布更換 (' + (DIAPER_TYPES[record.type] || record.type) + ')',
                            icon: '🧷'
                        });
                    });
                }
                
                // 健康記錄
                if (allRecords[3]) {
                    allRecords[3].forEach(function(record) {
                        activities.push({
                            type: 'health',
                            time: record.eventDate + 'T12:00:00Z',
                            title: HEALTH_TYPES[record.type] || record.type,
                            icon: '🏥'
                        });
                    });
                }
                
                // 里程碑記錄
                if (allRecords[4]) {
                    allRecords[4].forEach(function(record) {
                        activities.push({
                            type: 'milestone',
                            time: record.achievementDate + 'T12:00:00Z',
                            title: record.milestoneName,
                            icon: '🎉'
                        });
                    });
                }
                
                // 互動記錄
                if (allRecords[5]) {
                    allRecords[5].forEach(function(record) {
                        activities.push({
                            type: 'interaction',
                            time: record.eventTime,
                            title: '親子互動',
                            icon: '💝'
                        });
                    });
                }
                
                // 活動記錄
                if (allRecords[6]) {
                    allRecords[6].forEach(function(record) {
                        let activityName = record.activityName;
                        if (record.type === 'preset' && ACTIVITY_TYPES[record.activityName]) {
                            activityName = ACTIVITY_TYPES[record.activityName];
                        }
                        activities.push({
                            type: 'activity',
                            time: record.startTime,
                            title: activityName,
                            icon: '🎈'
                        });
                    });
                }
                
                // 按時間排序（最新的在前），並只取前 10 個
                activities.sort(function(a, b) {
                    return new Date(b.time) - new Date(a.time);
                });
                
                activities = activities.slice(0, 10);
                
                UIManager.renderRecentActivities(activities);
            }).catch(function(error) {
                NotificationManager.error('錯誤', error);
            });
        },
        
        /**
         * 渲染最近活動
         * @param {Array} activities - 活動陣列
         */
        renderRecentActivities: function(activities) {
            const container = document.getElementById('recentActivitiesList');
            if (!container) return;
            
            if (activities.length === 0) {
                container.innerHTML = '<p class="no-records">尚無記錄</p>';
                return;
            }
            
            let html = '';
            
            activities.forEach(function(activity) {
                const time = TimeZoneManager.utcToLocal(activity.time);
                
                html += 
                    '<div class="activity-item">' +
                        '<div class="activity-icon">' + activity.icon + '</div>' +
                        '<div class="activity-content">' +
                            '<div class="activity-title">' + UIManager.escapeHtml(activity.title) + '</div>' +
                            '<div class="activity-time">' + time + '</div>' +
                        '</div>' +
                    '</div>';
            });
            
            container.innerHTML = html;
        },
        
        /**
         * HTML 轉義
         * @param {string} text - 要轉義的文字
         */
        escapeHtml: function(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };
    
    /**
     * 圖表管理器
     * 負責生成和管理統計圖表
     */
    const ChartManager = {
        /**
         * 初始化圖表
         */
        init: function() {
            this.setupEventListeners();
            this.loadChart();
        },
        
        /**
         * 設定事件監聽器
         */
        setupEventListeners: function() {
            const chartType = document.getElementById('chartType');
            const chartPeriod = document.getElementById('chartPeriod');
            
            if (chartType) {
                chartType.addEventListener('change', function() {
                    ChartManager.loadChart();
                });
            }
            
            if (chartPeriod) {
                chartPeriod.addEventListener('change', function() {
                    ChartManager.loadChart();
                });
            }
        },
        
        /**
         * 載入圖表
         */
        loadChart: function() {
            if (!currentChildId) {
                this.showNoChildMessage();
                return;
            }
            
            const chartType = document.getElementById('chartType').value;
            const chartPeriod = document.getElementById('chartPeriod').value;
            
            switch (chartType) {
                case 'feeding':
                    this.loadFeedingChart(chartPeriod);
                    break;
                case 'sleep':
                    this.loadSleepChart(chartPeriod);
                    break;
                case 'diaper':
                    this.loadDiaperChart(chartPeriod);
                    break;
                case 'activity':
                    this.loadActivityChart(chartPeriod);
                    break;
            }
        },
        
        /**
         * 顯示無孩子訊息
         */
        showNoChildMessage: function() {
            const ctx = document.getElementById('mainChart');
            if (ctx) {
                // 清除現有圖表
                if (currentChart) {
                    currentChart.destroy();
                    currentChart = null;
                }
                
                // 隱藏畫布
                ctx.style.display = 'none';
            }
            
            const summary = document.getElementById('chartSummary');
            if (summary) {
                summary.innerHTML = '<p class="no-records">請選擇寶寶以查看統計圖表</p>';
            }
        },
        
        /**
         * 載入餵食圖表
         * @param {string} period - 時間範圍
         */
        loadFeedingChart: function(period) {
            const dateRange = this.getDateRange(period);
            
            DBManager.getAll(STORES.FEEDINGS, 'childId', currentChildId).then(function(records) {
                // 過濾時間範圍內的記錄
                const filteredRecords = records.filter(function(record) {
                    const recordDate = new Date(record.eventTimestamp || record.startTime || record.recordTimestamp);
                    return recordDate >= dateRange.start && recordDate <= dateRange.end;
                });
                
                ChartManager.renderFeedingChart(filteredRecords, period);
                ChartManager.renderFeedingSummary(filteredRecords, period);
            }).catch(function(error) {
                NotificationManager.error('錯誤', error);
            });
        },
        
        /**
         * 渲染餵食圖表
         * @param {Array} records - 記錄陣列
         * @param {string} period - 時間範圍
         */
        renderFeedingChart: function(records, period) {
            const ctx = document.getElementById('mainChart');
            if (!ctx) return;
            
            ctx.style.display = 'block';
            
            // 清除現有圖表
            if (currentChart) {
                currentChart.destroy();
            }
            
            // 按日期分組
            const groupedData = this.groupByDate(records, function(record) {
                return record.eventTimestamp || record.startTime || record.recordTimestamp;
            });
            
            // 準備圖表資料
            const dates = Object.keys(groupedData).sort();
            const breastfeedingData = [];
            const formulaData = [];
            const solidsData = [];
            
            dates.forEach(function(date) {
                const dayRecords = groupedData[date];
                
                // 計算每天的餵食次數
                const breastfeedingCount = dayRecords.filter(function(r) { return r.type === 'breastfeeding'; }).length;
                const formulaCount = dayRecords.filter(function(r) { return r.type === 'formula'; }).length;
                const solidsCount = dayRecords.filter(function(r) { return r.type === 'solids'; }).length;
                
                breastfeedingData.push(breastfeedingCount);
                formulaData.push(formulaCount);
                solidsData.push(solidsCount);
            });
            
            // 格式化日期標籤
            const labels = dates.map(function(date) {
                return new Date(date).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });
            });
            
            // 建立圖表
            currentChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: '母乳餵養',
                            data: breastfeedingData,
                            backgroundColor: 'rgba(232, 180, 184, 0.8)',
                            borderColor: 'rgba(232, 180, 184, 1)',
                            borderWidth: 1
                        },
                        {
                            label: '配方奶',
                            data: formulaData,
                            backgroundColor: 'rgba(212, 165, 165, 0.8)',
                            borderColor: 'rgba(212, 165, 165, 1)',
                            borderWidth: 1
                        },
                        {
                            label: '固體食物',
                            data: solidsData,
                            backgroundColor: 'rgba(243, 214, 214, 0.8)',
                            borderColor: 'rgba(243, 214, 214, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: '次數'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: '日期'
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: '餵食統計'
                        },
                        legend: {
                            display: true
                        }
                    }
                }
            });
        },
        
        /**
         * 渲染餵食摘要
         * @param {Array} records - 記錄陣列
         * @param {string} period - 時間範圍
         */
        renderFeedingSummary: function(records, period) {
            const container = document.getElementById('chartSummary');
            if (!container) return;
            
            const totalFeedings = records.length;
            const breastfeedingCount = records.filter(function(r) { return r.type === 'breastfeeding'; }).length;
            const formulaCount = records.filter(function(r) { return r.type === 'formula'; }).length;
            const solidsCount = records.filter(function(r) { return r.type === 'solids'; }).length;
            
            // 計算平均每日餵食次數
            const days = this.getDaysCount(period);
            const avgDaily = (totalFeedings / days).toFixed(1);
            
            container.innerHTML = 
                '<h3>餵食統計摘要</h3>' +
                '<div class="summary-grid">' +
                    '<div class="summary-item">' +
                        '<span class="summary-value">' + totalFeedings + '</span>' +
                        '<span class="summary-label">總餵食次數</span>' +
                    '</div>' +
                    '<div class="summary-item">' +
                        '<span class="summary-value">' + avgDaily + '</span>' +
                        '<span class="summary-label">平均每日餵食</span>' +
                    '</div>' +
                    '<div class="summary-item">' +
                        '<span class="summary-value">' + breastfeedingCount + '</span>' +
                        '<span class="summary-label">母乳餵養</span>' +
                    '</div>' +
                    '<div class="summary-item">' +
                        '<span class="summary-value">' + formulaCount + '</span>' +
                        '<span class="summary-label">配方奶</span>' +
                    '</div>' +
                '</div>';
        },
        
        /**
         * 載入睡眠圖表
         * @param {string} period - 時間範圍
         */
        loadSleepChart: function(period) {
            const dateRange = this.getDateRange(period);
            
            DBManager.getAll(STORES.SLEEPS, 'childId', currentChildId).then(function(records) {
                // 過濾時間範圍內的記錄
                const filteredRecords = records.filter(function(record) {
                    const recordDate = new Date(record.startTime);
                    return recordDate >= dateRange.start && recordDate <= dateRange.end;
                });
                
                ChartManager.renderSleepChart(filteredRecords, period);
                ChartManager.renderSleepSummary(filteredRecords, period);
            }).catch(function(error) {
                NotificationManager.error('錯誤', error);
            });
        },
        
        /**
         * 渲染睡眠圖表
         * @param {Array} records - 記錄陣列
         * @param {string} period - 時間範圍
         */
        renderSleepChart: function(records, period) {
            const ctx = document.getElementById('mainChart');
            if (!ctx) return;
            
            ctx.style.display = 'block';
            
            // 清除現有圖表
            if (currentChart) {
                currentChart.destroy();
            }
            
            // 按日期分組
            const groupedData = this.groupByDate(records, function(record) {
                return record.startTime;
            });
            
            // 準備圖表資料
            const dates = Object.keys(groupedData).sort();
            const sleepData = [];
            
            dates.forEach(function(date) {
                const dayRecords = groupedData[date];
                
                // 計算每天的總睡眠時間（小時）
                let totalMinutes = 0;
                dayRecords.forEach(function(record) {
                    const start = new Date(record.startTime);
                    const end = new Date(record.endTime);
                    const diffMs = end - start;
                    const minutes = Math.max(0, diffMs / (1000 * 60));
                    totalMinutes += minutes;
                });
                
                const hours = totalMinutes / 60;
                sleepData.push(hours);
            });
            
            // 格式化日期標籤
            const labels = dates.map(function(date) {
                return new Date(date).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });
            });
            
            // 建立圖表
            currentChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '睡眠時間',
                        data: sleepData,
                        backgroundColor: 'rgba(168, 213, 168, 0.8)',
                        borderColor: 'rgba(168, 213, 168, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: '小時'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: '日期'
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: '睡眠統計'
                        }
                    }
                }
            });
        },
        
        /**
         * 渲染睡眠摘要
         * @param {Array} records - 記錄陣列
         * @param {string} period - 時間範圍
         */
        renderSleepSummary: function(records, period) {
            const container = document.getElementById('chartSummary');
            if (!container) return;
            
            const totalSessions = records.length;
            
            // 計算總睡眠時間
            let totalMinutes = 0;
            records.forEach(function(record) {
                const start = new Date(record.startTime);
                const end = new Date(record.endTime);
                const diffMs = end - start;
                const minutes = Math.max(0, diffMs / (1000 * 60));
                totalMinutes += minutes;
            });
            
            const totalHours = (totalMinutes / 60).toFixed(1);
            const avgSessionMinutes = totalSessions > 0 ? (totalMinutes / totalSessions).toFixed(0) : 0;
            
            // 計算平均每日睡眠時間
            const days = this.getDaysCount(period);
            const avgDailyHours = (totalMinutes / (60 * days)).toFixed(1);
            
            container.innerHTML = 
                '<h3>睡眠統計摘要</h3>' +
                '<div class="summary-grid">' +
                    '<div class="summary-item">' +
                        '<span class="summary-value">' + totalHours + '</span>' +
                        '<span class="summary-label">總睡眠時間（小時）</span>' +
                    '</div>' +
                    '<div class="summary-item">' +
                        '<span class="summary-value">' + avgDailyHours + '</span>' +
                        '<span class="summary-label">平均每日睡眠（小時）</span>' +
                    '</div>' +
                    '<div class="summary-item">' +
                        '<span class="summary-value">' + totalSessions + '</span>' +
                        '<span class="summary-label">睡眠次數</span>' +
                    '</div>' +
                    '<div class="summary-item">' +
                        '<span class="summary-value">' + avgSessionMinutes + '</span>' +
                        '<span class="summary-label">平均每次時長（分鐘）</span>' +
                    '</div>' +
                '</div>';
        },
        
        /**
         * 載入尿布圖表
         * @param {string} period - 時間範圍
         */
        loadDiaperChart: function(period) {
            const dateRange = this.getDateRange(period);
            
            DBManager.getAll(STORES.DIAPERS, 'childId', currentChildId).then(function(records) {
                // 過濾時間範圍內的記錄
                const filteredRecords = records.filter(function(record) {
                    const recordDate = new Date(record.eventTime);
                    return recordDate >= dateRange.start && recordDate <= dateRange.end;
                });
                
                ChartManager.renderDiaperChart(filteredRecords, period);
                ChartManager.renderDiaperSummary(filteredRecords, period);
            }).catch(function(error) {
                NotificationManager.error('錯誤', error);
            });
        },
        
        /**
         * 渲染尿布圖表
         * @param {Array} records - 記錄陣列
         * @param {string} period - 時間範圍
         */
        renderDiaperChart: function(records, period) {
            const ctx = document.getElementById('mainChart');
            if (!ctx) return;
            
            ctx.style.display = 'block';
            
            // 清除現有圖表
            if (currentChart) {
                currentChart.destroy();
            }
            
            // 按日期分組
            const groupedData = this.groupByDate(records, function(record) {
                return record.eventTime;
            });
            
            // 準備圖表資料
            const dates = Object.keys(groupedData).sort();
            const wetData = [];
            const poopData = [];
            const mixedData = [];
            
            dates.forEach(function(date) {
                const dayRecords = groupedData[date];
                
                const wetCount = dayRecords.filter(function(r) { return r.type === 'wet'; }).length;
                const poopCount = dayRecords.filter(function(r) { return r.type === 'poop'; }).length;
                const mixedCount = dayRecords.filter(function(r) { return r.type === 'mixed'; }).length;
                
                wetData.push(wetCount);
                poopData.push(poopCount);
                mixedData.push(mixedCount);
            });
            
            // 格式化日期標籤
            const labels = dates.map(function(date) {
                return new Date(date).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });
            });
            
            // 建立圖表
            currentChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: '濕',
                            data: wetData,
                            backgroundColor: 'rgba(116, 185, 255, 0.8)',
                            borderColor: 'rgba(116, 185, 255, 1)',
                            borderWidth: 1
                        },
                        {
                            label: '便',
                            data: poopData,
                            backgroundColor: 'rgba(198, 167, 157, 0.8)',
                            borderColor: 'rgba(198, 167, 157, 1)',
                            borderWidth: 1
                        },
                        {
                            label: '混合',
                            data: mixedData,
                            backgroundColor: 'rgba(255, 193, 109, 0.8)',
                            borderColor: 'rgba(255, 193, 109, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: '次數'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: '日期'
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: '尿布更換統計'
                        },
                        legend: {
                            display: true
                        }
                    }
                }
            });
        },
        
        /**
         * 渲染尿布摘要
         * @param {Array} records - 記錄陣列
         * @param {string} period - 時間範圍
         */
        renderDiaperSummary: function(records, period) {
            const container = document.getElementById('chartSummary');
            if (!container) return;
            
            const totalChanges = records.length;
            const wetCount = records.filter(function(r) { return r.type === 'wet'; }).length;
            const poopCount = records.filter(function(r) { return r.type === 'poop'; }).length;
            const mixedCount = records.filter(function(r) { return r.type === 'mixed'; }).length;
            
            // 計算平均每日更換次數
            const days = this.getDaysCount(period);
            const avgDaily = (totalChanges / days).toFixed(1);
            
            container.innerHTML = 
                '<h3>尿布統計摘要</h3>' +
                '<div class="summary-grid">' +
                    '<div class="summary-item">' +
                        '<span class="summary-value">' + totalChanges + '</span>' +
                        '<span class="summary-label">總更換次數</span>' +
                    '</div>' +
                    '<div class="summary-item">' +
                        '<span class="summary-value">' + avgDaily + '</span>' +
                        '<span class="summary-label">平均每日更換</span>' +
                    '</div>' +
                    '<div class="summary-item">' +
                        '<span class="summary-value">' + wetCount + '</span>' +
                        '<span class="summary-label">濕尿布</span>' +
                    '</div>' +
                    '<div class="summary-item">' +
                        '<span class="summary-value">' + poopCount + '</span>' +
                        '<span class="summary-label">便便尿布</span>' +
                    '</div>' +
                '</div>';
        },
        
        /**
         * 載入活動圖表
         * @param {string} period - 時間範圍
         */
        loadActivityChart: function(period) {
            const dateRange = this.getDateRange(period);
            
            DBManager.getAll(STORES.ACTIVITIES, 'childId', currentChildId).then(function(records) {
                // 過濾時間範圍內的記錄
                const filteredRecords = records.filter(function(record) {
                    const recordDate = new Date(record.startTime);
                    return recordDate >= dateRange.start && recordDate <= dateRange.end;
                });
                
                ChartManager.renderActivityChart(filteredRecords, period);
                ChartManager.renderActivitySummary(filteredRecords, period);
            }).catch(function(error) {
                NotificationManager.error('錯誤', error);
            });
        },
        
        /**
         * 渲染活動圖表
         * @param {Array} records - 記錄陣列
         * @param {string} period - 時間範圍
         */
        renderActivityChart: function(records, period) {
            const ctx = document.getElementById('mainChart');
            if (!ctx) return;
            
            ctx.style.display = 'block';
            
            // 清除現有圖表
            if (currentChart) {
                currentChart.destroy();
            }
            
            // 按活動分組並計算總時間
            const activityTotals = {};
            
            records.forEach(function(record) {
                let activityName = record.activityName;
                if (record.type === 'preset' && ACTIVITY_TYPES[activityName]) {
                    activityName = ACTIVITY_TYPES[activityName];
                }
                
                const start = new Date(record.startTime);
                const end = new Date(record.endTime);
                const diffMs = end - start;
                const minutes = Math.max(0, diffMs / (1000 * 60));
                
                if (activityTotals[activityName]) {
                    activityTotals[activityName] += minutes;
                } else {
                    activityTotals[activityName] = minutes;
                }
            });
            
            // 準備圖表資料
            const labels = Object.keys(activityTotals);
            const data = labels.map(function(label) {
                return (activityTotals[label] / 60).toFixed(1); // 轉換為小時
            });
            
            // 生成顏色
            const colors = this.generateColors(labels.length);
            
            // 建立餅圖
            currentChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors.backgroundColor,
                        borderColor: colors.borderColor,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: '活動時間分布'
                        },
                        legend: {
                            display: true,
                            position: 'bottom'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.label + ': ' + context.parsed + ' 小時';
                                }
                            }
                        }
                    }
                }
            });
        },
        
        /**
         * 渲染活動摘要
         * @param {Array} records - 記錄陣列
         * @param {string} period - 時間範圍
         */
        renderActivitySummary: function(records, period) {
            const container = document.getElementById('chartSummary');
            if (!container) return;
            
            const totalActivities = records.length;
            
            // 計算總活動時間
            let totalMinutes = 0;
            records.forEach(function(record) {
                const start = new Date(record.startTime);
                const end = new Date(record.endTime);
                const diffMs = end - start;
                const minutes = Math.max(0, diffMs / (1000 * 60));
                totalMinutes += minutes;
            });
            
            const totalHours = (totalMinutes / 60).toFixed(1);
            
            // 計算平均每日活動時間
            const days = this.getDaysCount(period);
            const avgDailyMinutes = (totalMinutes / days).toFixed(0);
            const avgActivityMinutes = totalActivities > 0 ? (totalMinutes / totalActivities).toFixed(0) : 0;
            
            container.innerHTML = 
                '<h3>活動統計摘要</h3>' +
                '<div class="summary-grid">' +
                    '<div class="summary-item">' +
                        '<span class="summary-value">' + totalHours + '</span>' +
                        '<span class="summary-label">總活動時間（小時）</span>' +
                    '</div>' +
                    '<div class="summary-item">' +
                        '<span class="summary-value">' + avgDailyMinutes + '</span>' +
                        '<span class="summary-label">平均每日活動（分鐘）</span>' +
                    '</div>' +
                    '<div class="summary-item">' +
                        '<span class="summary-value">' + totalActivities + '</span>' +
                        '<span class="summary-label">活動次數</span>' +
                    '</div>' +
                    '<div class="summary-item">' +
                        '<span class="summary-value">' + avgActivityMinutes + '</span>' +
                        '<span class="summary-label">平均每次時長（分鐘）</span>' +
                    '</div>' +
                '</div>';
        },
        
        /**
         * 取得日期範圍
         * @param {string} period - 時間範圍
         */
        getDateRange: function(period) {
            const now = new Date();
            let start = new Date();
            
            switch (period) {
                case 'week':
                    start.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    start.setMonth(now.getMonth() - 1);
                    break;
                case 'quarter':
                    start.setMonth(now.getMonth() - 3);
                    break;
                default:
                    start.setDate(now.getDate() - 7);
            }
            
            return {
                start: start,
                end: now
            };
        },
        
        /**
         * 取得天數
         * @param {string} period - 時間範圍
         */
        getDaysCount: function(period) {
            switch (period) {
                case 'week':
                    return 7;
                case 'month':
                    return 30;
                case 'quarter':
                    return 90;
                default:
                    return 7;
            }
        },
        
        /**
         * 按日期分組記錄
         * @param {Array} records - 記錄陣列
         * @param {Function} getTimeFunc - 取得時間的函數
         */
        groupByDate: function(records, getTimeFunc) {
            const grouped = {};
            
            records.forEach(function(record) {
                const time = getTimeFunc(record);
                const date = new Date(time).toISOString().split('T')[0];
                
                if (grouped[date]) {
                    grouped[date].push(record);
                } else {
                    grouped[date] = [record];
                }
            });
            
            return grouped;
        },
        
        /**
         * 生成圖表顏色
         * @param {number} count - 顏色數量
         */
        generateColors: function(count) {
            const baseColors = [
                '#e8b4b8', '#d4a5a5', '#f3d6d6', '#c48589', '#b07478',
                '#a8d5a8', '#f4d4a7', '#f4a6a6', '#b8c8f0', '#ffd19b'
            ];
            
            const backgroundColor = [];
            const borderColor = [];
            
            for (let i = 0; i < count; i++) {
                const color = baseColors[i % baseColors.length];
                backgroundColor.push(color + '80'); // 半透明
                borderColor.push(color);
            }
            
            return { backgroundColor, borderColor };
        }
    };
    
    /**
     * 資料管理器
     * 負責資料匯出、匯入等功能
     */
    const DataManager = {
        /**
         * 匯出所有資料
         */
        exportData: function() {
            LoadingManager.show();
            
            const storeNames = Object.values(STORES);
            
            Promise.all(storeNames.map(function(storeName) {
                return DBManager.getAll(storeName);
            })).then(function(allData) {
                const exportData = {
                    version: '1.0',
                    exportDate: new Date().toISOString(),
                    data: {}
                };
                
                storeNames.forEach(function(storeName, index) {
                    exportData.data[storeName] = allData[index];
                });
                
                // 建立下載連結
                const dataStr = JSON.stringify(exportData, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = 'baby_tracker_backup_' + new Date().toISOString().split('T')[0] + '.json';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                URL.revokeObjectURL(url);
                
                LoadingManager.hide();
                NotificationManager.success('成功', '資料已匯出');
            }).catch(function(error) {
                LoadingManager.hide();
                NotificationManager.error('錯誤', error);
            });
        },
        
        /**
         * 匯入資料
         * @param {File} file - 要匯入的檔案
         */
        importData: function(file) {
            if (!file) return;
            
            if (!confirm('匯入資料將會覆蓋現有的所有資料。確定要繼續嗎？')) {
                return;
            }
            
            LoadingManager.show();
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importData = JSON.parse(e.target.result);
                    
                    // 驗證資料格式
                    if (!importData.data) {
                        throw new Error('無效的資料格式');
                    }
                    
                    // 清空現有資料
                    DBManager.clearAll().then(function() {
                        // 匯入新資料
                        const importPromises = [];
                        const storeNames = Object.values(STORES);
                        
                        storeNames.forEach(function(storeName) {
                            const storeData = importData.data[storeName];
                            if (storeData && Array.isArray(storeData)) {
                                storeData.forEach(function(record) {
                                    // 移除 id 讓資料庫自動產生新的 id
                                    delete record.id;
                                    importPromises.push(DBManager.add(storeName, record));
                                });
                            }
                        });
                        
                        return Promise.all(importPromises);
                    }).then(function() {
                        LoadingManager.hide();
                        NotificationManager.success('成功', '資料匯入完成，重新載入頁面以顯示新資料');
                        
                        // 重新載入頁面
                        setTimeout(function() {
                            location.reload();
                        }, 2000);
                    }).catch(function(error) {
                        LoadingManager.hide();
                        NotificationManager.error('錯誤', '匯入失敗：' + error);
                    });
                } catch (error) {
                    LoadingManager.hide();
                    NotificationManager.error('錯誤', '檔案格式不正確');
                }
            };
            
            reader.onerror = function() {
                LoadingManager.hide();
                NotificationManager.error('錯誤', '檔案讀取失敗');
            };
            
            reader.readAsText(file);
        }
    };
    
    /**
     * 應用程式初始化
     */
    function initApp() {
        LoadingManager.show();
        
        // 初始化資料庫
        DBManager.init().then(function() {
            // 初始化各個管理器
            ThemeManager.init();
            UIManager.init();
            
            LoadingManager.hide();
            
            // 載入孩子選擇器
            UIManager.loadChildSelector();
            
            NotificationManager.success('歡迎', '嬰兒照護追蹤系統已準備就緒');
        }).catch(function(error) {
            LoadingManager.hide();
            NotificationManager.error('錯誤', '系統初始化失敗：' + error);
        });
    }
    
    // 將需要的函數和物件暴露到全域範圍供 HTML 使用
    window.UIManager = UIManager;
    window.ChartManager = ChartManager;
    window.DataManager = DataManager;
    
    // 當 DOM 載入完成時初始化應用程式
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
    
})();