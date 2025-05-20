console.log('Script loaded');
/**
 * 嬰兒照護追蹤應用程式 - 主要JavaScript檔案
 * 使用純粹的前端技術和IndexedDB進行資料存儲
 * 支援繁體中文和台灣使用者需求
 */

// 全域變數和設定
const APP_CONFIG = {
    dbName: 'BabyTrackerDB',
    dbVersion: 1,
    defaultTimezone: 'Asia/Taipei',
    dateFormat: 'YYYY/MM/DD',
    timeFormat: 'HH:mm',
    charts: null // Chart.js實例將被存儲在這裡
};

// 應用程式主物件 - 使用Revealing Module Pattern
const BabyTrackerApp = (function() {
    'use strict';
    
    // 私有變數
    let db;
    let currentChild = null;
    let currentChart = null;
    
    // IndexedDB物件存儲名稱
    const STORES = {
        children: 'children',
        feedings: 'feedings',
        sleeps: 'sleeps',
        diapers: 'diapers',
        health: 'health',
        milestones: 'milestones',
        interactions: 'interactions',
        activities: 'activities'
    };
    
    /**
     * 資料庫管理模組
     * 處理IndexedDB的所有操作
     */
    const DBManager = {
        /**
         * 初始化資料庫
         * @returns {Promise} 資料庫初始化Promise
         */
        init: function() {
            return new Promise(function(resolve, reject) {
                const request = indexedDB.open(APP_CONFIG.dbName, APP_CONFIG.dbVersion);
                
                request.onerror = function() {
                    reject('無法開啟資料庫: ' + request.error);
                };
                
                request.onsuccess = function() {
                    db = request.result;
                    resolve(db);
                };
                
                request.onupgradeneeded = function(event) {
                    db = event.target.result;
                    
                    // 建立孩子檔案存儲
                    if (!db.objectStoreNames.contains(STORES.children)) {
                        const childrenStore = db.createObjectStore(STORES.children, {
                            keyPath: 'childId',
                            autoIncrement: false
                        });
                        childrenStore.createIndex('name', 'name', { unique: false });
                        childrenStore.createIndex('dateOfBirth', 'dateOfBirth', { unique: false });
                    }
                    
                    // 建立餵食記錄存儲
                    if (!db.objectStoreNames.contains(STORES.feedings)) {
                        const feedingsStore = db.createObjectStore(STORES.feedings, {
                            keyPath: 'id',
                            autoIncrement: true
                        });
                        feedingsStore.createIndex('childId', 'childId', { unique: false });
                        feedingsStore.createIndex('type', 'type', { unique: false });
                        feedingsStore.createIndex('eventTimestamp', 'eventTimestamp', { unique: false });
                    }
                    
                    // 建立睡眠記錄存儲
                    if (!db.objectStoreNames.contains(STORES.sleeps)) {
                        const sleepsStore = db.createObjectStore(STORES.sleeps, {
                            keyPath: 'id',
                            autoIncrement: true
                        });
                        sleepsStore.createIndex('childId', 'childId', { unique: false });
                        sleepsStore.createIndex('startTime', 'startTime', { unique: false });
                    }
                    
                    // 建立尿布記錄存儲
                    if (!db.objectStoreNames.contains(STORES.diapers)) {
                        const diapersStore = db.createObjectStore(STORES.diapers, {
                            keyPath: 'id',
                            autoIncrement: true
                        });
                        diapersStore.createIndex('childId', 'childId', { unique: false });
                        diapersStore.createIndex('type', 'type', { unique: false });
                        diapersStore.createIndex('eventTime', 'eventTime', { unique: false });
                    }
                    
                    // 建立健康記錄存儲
                    if (!db.objectStoreNames.contains(STORES.health)) {
                        const healthStore = db.createObjectStore(STORES.health, {
                            keyPath: 'id',
                            autoIncrement: true
                        });
                        healthStore.createIndex('childId', 'childId', { unique: false });
                        healthStore.createIndex('type', 'type', { unique: false });
                        healthStore.createIndex('eventDate', 'eventDate', { unique: false });
                    }
                    
                    // 建立里程碑記錄存儲
                    if (!db.objectStoreNames.contains(STORES.milestones)) {
                        const milestonesStore = db.createObjectStore(STORES.milestones, {
                            keyPath: 'id',
                            autoIncrement: true
                        });
                        milestonesStore.createIndex('childId', 'childId', { unique: false });
                        milestonesStore.createIndex('category', 'category', { unique: false });
                        milestonesStore.createIndex('achievementDate', 'achievementDate', { unique: false });
                    }
                    
                    // 建立親子互動記錄存儲
                    if (!db.objectStoreNames.contains(STORES.interactions)) {
                        const interactionsStore = db.createObjectStore(STORES.interactions, {
                            keyPath: 'id',
                            autoIncrement: true
                        });
                        interactionsStore.createIndex('childId', 'childId', { unique: false });
                        interactionsStore.createIndex('eventTime', 'eventTime', { unique: false });
                    }
                    
                    // 建立日常活動記錄存儲
                    if (!db.objectStoreNames.contains(STORES.activities)) {
                        const activitiesStore = db.createObjectStore(STORES.activities, {
                            keyPath: 'id',
                            autoIncrement: true
                        });
                        activitiesStore.createIndex('childId', 'childId', { unique: false });
                        activitiesStore.createIndex('activityName', 'activityName', { unique: false });
                        activitiesStore.createIndex('startTime', 'startTime', { unique: false });
                    }
                };
            });
        },
        
        /**
         * 新增記錄到指定的物件存儲
         * @param {string} storeName 存儲名稱
         * @param {Object} data 要儲存的資料
         * @returns {Promise} 新增操作Promise
         */
        add: function(storeName, data) {
            return new Promise(function(resolve, reject) {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.add(data);
                
                request.onsuccess = function() {
                    resolve(request.result);
                };
                
                request.onerror = function() {
                    reject('新增資料失敗: ' + request.error);
                };
            });
        },
        
        /**
         * 更新指定物件存儲中的記錄
         * @param {string} storeName 存儲名稱
         * @param {Object} data 要更新的資料
         * @returns {Promise} 更新操作Promise
         */
        update: function(storeName, data) {
            return new Promise(function(resolve, reject) {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.put(data);
                
                request.onsuccess = function() {
                    resolve(request.result);
                };
                
                request.onerror = function() {
                    reject('更新資料失敗: ' + request.error);
                };
            });
        },
        
        /**
         * 從指定物件存儲中刪除記錄
         * @param {string} storeName 存儲名稱
         * @param {string|number} key 要刪除的記錄鍵
         * @returns {Promise} 刪除操作Promise
         */
        delete: function(storeName, key) {
            return new Promise(function(resolve, reject) {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(key);
                
                request.onsuccess = function() {
                    resolve();
                };
                
                request.onerror = function() {
                    reject('刪除資料失敗: ' + request.error);
                };
            });
        },
        
        /**
         * 從指定物件存儲中取得單一記錄
         * @param {string} storeName 存儲名稱
         * @param {string|number} key 記錄鍵
         * @returns {Promise} 取得操作Promise
         */
        get: function(storeName, key) {
            return new Promise(function(resolve, reject) {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.get(key);
                
                request.onsuccess = function() {
                    resolve(request.result);
                };
                
                request.onerror = function() {
                    reject('取得資料失敗: ' + request.error);
                };
            });
        },
        
        /**
         * 從指定物件存儲中取得所有記錄
         * @param {string} storeName 存儲名稱
         * @returns {Promise} 取得操作Promise
         */
        getAll: function(storeName) {
            return new Promise(function(resolve, reject) {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();
                
                request.onsuccess = function() {
                    resolve(request.result);
                };
                
                request.onerror = function() {
                    reject('取得資料失敗: ' + request.error);
                };
            });
        },
        
        /**
         * 使用索引從指定物件存儲中取得記錄
         * @param {string} storeName 存儲名稱
         * @param {string} indexName 索引名稱
         * @param {*} value 索引值
         * @returns {Promise} 查詢操作Promise
         */
        getByIndex: function(storeName, indexName, value) {
            return new Promise(function(resolve, reject) {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const index = store.index(indexName);
                const request = index.getAll(value);
                
                request.onsuccess = function() {
                    resolve(request.result);
                };
                
                request.onerror = function() {
                    reject('查詢資料失敗: ' + request.error);
                };
            });
        },
        
        /**
         * 匯出所有資料
         * @returns {Promise} 包含所有資料的Promise
         */
        exportData: function() {
            return new Promise(function(resolve, reject) {
                const data = {};
                const storeNames = Object.values(STORES);
                let completedStores = 0;
                
                storeNames.forEach(function(storeName) {
                    DBManager.getAll(storeName)
                        .then(function(storeData) {
                            data[storeName] = storeData;
                            completedStores++;
                            
                            if (completedStores === storeNames.length) {
                                resolve(data);
                            }
                        })
                        .catch(reject);
                });
            });
        },
        
        /**
         * 匯入資料
         * @param {Object} data 要匯入的資料
         * @returns {Promise} 匯入操作Promise
         */
        importData: function(data) {
            return new Promise(function(resolve, reject) {
                const storeNames = Object.keys(data);
                let completedStores = 0;
                let hasErrors = false;
                
                // 清空現有資料（可選）
                // 這裡我們選擇覆蓋而不是清空
                
                storeNames.forEach(function(storeName) {
                    if (!STORES[storeName]) {
                        completedStores++;
                        if (completedStores === storeNames.length) {
                            resolve(!hasErrors);
                        }
                        return;
                    }
                    
                    const records = data[storeName];
                    let completedRecords = 0;
                    
                    if (records.length === 0) {
                        completedStores++;
                        if (completedStores === storeNames.length) {
                            resolve(!hasErrors);
                        }
                        return;
                    }
                    
                    records.forEach(function(record) {
                        DBManager.update(storeName, record)
                            .then(function() {
                                completedRecords++;
                                if (completedRecords === records.length) {
                                    completedStores++;
                                    if (completedStores === storeNames.length) {
                                        resolve(!hasErrors);
                                    }
                                }
                            })
                            .catch(function() {
                                hasErrors = true;
                                completedRecords++;
                                if (completedRecords === records.length) {
                                    completedStores++;
                                    if (completedStores === storeNames.length) {
                                        resolve(!hasErrors);
                                    }
                                }
                            });
                    });
                });
            });
        }
    };
    
    /**
     * 時區管理模組
     * 處理所有時區相關的操作
     */
    const TimeZoneManager = {
        /**
         * 取得當前時區設定
         * @returns {string} 時區字串
         */
        getCurrentTimezone: function() {
            return localStorage.getItem('timezone') || APP_CONFIG.defaultTimezone;
        },
        
        /**
         * 設定時區
         * @param {string} timezone 時區字串
         */
        setTimezone: function(timezone) {
            localStorage.setItem('timezone', timezone);
        },
        
        /**
         * 將UTC時間轉換為當前時區時間
         * @param {string|Date} utcTime UTC時間
         * @returns {Date} 本地時間
         */
        utcToLocal: function(utcTime) {
            const date = new Date(utcTime);
            const timezone = this.getCurrentTimezone();
            
            // 使用Intl.DateTimeFormat進行時區轉換
            const options = {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            };
            
            const formatter = new Intl.DateTimeFormat('zh-TW', options);
            const parts = formatter.formatToParts(date);
            
            const year = parseInt(parts.find(part => part.type === 'year').value);
            const month = parseInt(parts.find(part => part.type === 'month').value) - 1;
            const day = parseInt(parts.find(part => part.type === 'day').value);
            const hour = parseInt(parts.find(part => part.type === 'hour').value);
            const minute = parseInt(parts.find(part => part.type === 'minute').value);
            const second = parseInt(parts.find(part => part.type === 'second').value);
            
            return new Date(year, month, day, hour, minute, second);
        },
        
        /**
         * 將本地時間轉換為UTC時間
         * @param {string|Date} localTime 本地時間
         * @returns {Date} UTC時間
         */
        localToUtc: function(localTime) {
            const date = new Date(localTime);
            const timezone = this.getCurrentTimezone();
            
            // 建立一個帶時區資訊的日期
            const utcTime = new Date(date.toLocaleString('sv-SE', { timeZone: 'UTC' }));
            const localTimeInTimezone = new Date(date.toLocaleString('sv-SE', { timeZone: timezone }));
            
            // 計算時差並調整
            const timezoneOffset = localTimeInTimezone.getTime() - utcTime.getTime();
            return new Date(date.getTime() - timezoneOffset);
        },
        
        /**
         * 格式化日期為本地格式
         * @param {string|Date} date 日期
         * @param {boolean} includeTime 是否包含時間
         * @returns {string} 格式化的日期字串
         */
        formatDate: function(date, includeTime) {
            if (!date) return '';
            
            const localDate = this.utcToLocal(date);
            const year = localDate.getFullYear();
            const month = String(localDate.getMonth() + 1).padStart(2, '0');
            const day = String(localDate.getDate()).padStart(2, '0');
            
            let formatted = year + '/' + month + '/' + day;
            
            if (includeTime) {
                const hours = String(localDate.getHours()).padStart(2, '0');
                const minutes = String(localDate.getMinutes()).padStart(2, '0');
                formatted += ' ' + hours + ':' + minutes;
            }
            
            return formatted;
        },
        
        /**
         * 將本地日期時間字串轉換為datetime-local格式
         * @param {string|Date} date 日期
         * @returns {string} datetime-local格式字串
         */
        toDateTimeLocal: function(date) {
            if (!date) return '';
            
            const localDate = this.utcToLocal(date);
            const year = localDate.getFullYear();
            const month = String(localDate.getMonth() + 1).padStart(2, '0');
            const day = String(localDate.getDate()).padStart(2, '0');
            const hours = String(localDate.getHours()).padStart(2, '0');
            const minutes = String(localDate.getMinutes()).padStart(2, '0');
            
            return year + '-' + month + '-' + day + 'T' + hours + ':' + minutes;
        },
        
        /**
         * 將datetime-local格式轉換為UTC
         * @param {string} datetimeLocal datetime-local格式字串
         * @returns {string} UTC ISO字串
         */
        fromDateTimeLocal: function(datetimeLocal) {
            if (!datetimeLocal) return '';
            
            const localDate = new Date(datetimeLocal);
            return this.localToUtc(localDate).toISOString();
        }
    };
    
    /**
     * UI管理模組
     * 處理所有UI更新和互動
     */
    const UIManager = {
        /**
         * 初始化UI
         */
        init: function() {
            this.setupEventListeners();
            this.loadTheme();
            this.loadTimezone();
            this.setupTabs();
        },
        
        /**
         * 設定事件監聽器
         */
        setupEventListeners: function() {
            // 主題切換
            document.getElementById('themeToggle').addEventListener('click', this.toggleTheme.bind(this));
            
            // 設定按鈕
            document.getElementById('settingsBtn').addEventListener('click', this.openSettingsModal.bind(this));
            
            // 孩子選擇器
            document.getElementById('childSelect').addEventListener('change', this.onChildChange.bind(this));
            document.getElementById('addChildBtn').addEventListener('click', this.openChildModal.bind(this));
            
            // 快速動作按鈕
            const quickActionBtns = document.querySelectorAll('.quick-action-btn');
            quickActionBtns.forEach(function(btn) {
                btn.addEventListener('click', function() {
                    const action = this.getAttribute('data-action');
                    UIManager.openRecordModal(action);
                });
            });
            
            // 各分頁的新增按鈕
            document.getElementById('addFeedingBtn').addEventListener('click', function() {
                UIManager.openRecordModal('feeding');
            });
            document.getElementById('addSleepBtn').addEventListener('click', function() {
                UIManager.openRecordModal('sleep');
            });
            document.getElementById('addDiaperBtn').addEventListener('click', function() {
                UIManager.openRecordModal('diaper');
            });
            document.getElementById('addHealthBtn').addEventListener('click', function() {
                UIManager.openRecordModal('health');
            });
            document.getElementById('addMilestoneBtn').addEventListener('click', function() {
                UIManager.openRecordModal('milestone');
            });
            document.getElementById('addInteractionBtn').addEventListener('click', function() {
                UIManager.openRecordModal('interaction');
            });
            document.getElementById('addActivityBtn').addEventListener('click', function() {
                UIManager.openRecordModal('activity');
            });
            
            // 編輯孩子按鈕
            document.getElementById('editChildBtn').addEventListener('click', function() {
                if (currentChild) {
                    UIManager.openChildModal(currentChild);
                }
            });
            
            // 模態視窗關閉
            document.getElementById('modalCloseBtn').addEventListener('click', this.closeModal.bind(this));
            document.getElementById('modalOverlay').addEventListener('click', function(e) {
                if (e.target === this) {
                    UIManager.closeModal();
                }
            });
            
            // 圖表控制
            document.getElementById('chartType').addEventListener('change', this.updateChart.bind(this));
            document.getElementById('chartPeriod').addEventListener('change', this.updateChart.bind(this));
        },
        
        /**
         * 設定分頁切換
         */
        setupTabs: function() {
            const navTabs = document.querySelectorAll('.nav-tab');
            const tabContents = document.querySelectorAll('.tab-content');
            
            navTabs.forEach(function(tab) {
                tab.addEventListener('click', function() {
                    const targetTab = this.getAttribute('data-tab');
                    
                    // 移除所有活動狀態
                    navTabs.forEach(function(t) {
                        t.classList.remove('active');
                    });
                    tabContents.forEach(function(content) {
                        content.classList.remove('active');
                    });
                    
                    // 設定新的活動分頁
                    this.classList.add('active');
                    document.getElementById('tab-' + targetTab).classList.add('active');
                    
                    // 如果是圖表分頁，更新圖表
                    if (targetTab === 'charts') {
                        UIManager.updateChart();
                    }
                });
            });
        },
        
        /**
         * 載入主題設定
         */
        loadTheme: function() {
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
            this.updateThemeIcon(savedTheme);
        },
        
        /**
         * 切換主題
         */
        toggleTheme: function() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            this.updateThemeIcon(newTheme);
        },
        
        /**
         * 更新主題圖示
         * @param {string} theme 主題
         */
        updateThemeIcon: function(theme) {
            const icon = document.querySelector('.theme-icon');
            icon.textContent = theme === 'light' ? '🌙' : '☀️';
        },
        
        /**
         * 載入時區設定
         */
        loadTimezone: function() {
            const timezone = TimeZoneManager.getCurrentTimezone();
            const timezoneSelect = document.getElementById('timezoneSelect');
            if (timezoneSelect) {
                timezoneSelect.value = timezone;
            }
        },
        
        /**
         * 開啟設定模態視窗
         */
        openSettingsModal: function() {
            const modalTitle = document.getElementById('modalTitle');
            const modalBody = document.getElementById('modalBody');
            const settingsContent = document.getElementById('settingsModalContent');
            
            modalTitle.textContent = '應用程式設定';
            modalBody.innerHTML = settingsContent.innerHTML;
            
            // 載入當前設定
            document.getElementById('timezoneSelect').value = TimeZoneManager.getCurrentTimezone();
            
            // 設定事件監聽器
            const settingsForm = document.getElementById('settingsForm');
            settingsForm.addEventListener('submit', this.saveSettings.bind(this));
            
            const exportBtn = document.getElementById('exportDataBtn');
            exportBtn.addEventListener('click', this.exportData.bind(this));
            
            const importBtn = document.getElementById('importDataBtn');
            importBtn.addEventListener('click', function() {
                document.getElementById('importFileInput').click();
            });
            
            const importFileInput = document.getElementById('importFileInput');
            importFileInput.addEventListener('change', this.importData.bind(this));
            
            // 關閉按鈕
            const dismissBtns = document.querySelectorAll('[data-dismiss="modal"]');
            dismissBtns.forEach(function(btn) {
                btn.addEventListener('click', UIManager.closeModal.bind(UIManager));
            });
            
            this.showModal();
        },
        
        /**
         * 儲存設定
         * @param {Event} event 表單提交事件
         */
        saveSettings: function(event) {
            event.preventDefault();
            
            const timezone = document.getElementById('timezoneSelect').value;
            TimeZoneManager.setTimezone(timezone);
            
            this.showToast('設定已儲存', 'success');
            this.closeModal();
        },
        
        /**
         * 匯出資料
         */
        exportData: function() {
            const loadingIndicator = document.getElementById('loadingIndicator');
            loadingIndicator.style.display = 'flex';
            
            DBManager.exportData()
                .then(function(data) {
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    
                    const now = new Date();
                    const filename = 'baby_tracker_backup_' + now.getFullYear() + 
                                   String(now.getMonth() + 1).padStart(2, '0') + 
                                   String(now.getDate()).padStart(2, '0') + '.json';
                    
                    a.href = url;
                    a.download = filename;
                    a.click();
                    
                    URL.revokeObjectURL(url);
                    UIManager.showToast('資料匯出成功', 'success');
                })
                .catch(function(error) {
                    console.error('匯出失敗:', error);
                    UIManager.showToast('匯出失敗: ' + error, 'error');
                })
                .finally(function() {
                    loadingIndicator.style.display = 'none';
                });
        },
        
        /**
         * 匯入資料
         * @param {Event} event 檔案選擇事件
         */
        importData: function(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const loadingIndicator = document.getElementById('loadingIndicator');
            loadingIndicator.style.display = 'flex';
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    DBManager.importData(data)
                        .then(function(success) {
                            if (success) {
                                UIManager.showToast('資料匯入成功', 'success');
                                // 重新載入應用程式
                                location.reload();
                            } else {
                                UIManager.showToast('部分資料匯入失敗', 'warning');
                            }
                        })
                        .catch(function(error) {
                            console.error('匯入失敗:', error);
                            UIManager.showToast('匯入失敗: ' + error, 'error');
                        })
                        .finally(function() {
                            loadingIndicator.style.display = 'none';
                        });
                } catch (error) {
                    loadingIndicator.style.display = 'none';
                    UIManager.showToast('檔案格式錯誤', 'error');
                }
            };
            
            reader.readAsText(file);
            
            // 重設檔案輸入
            event.target.value = '';
        },
        
        /**
         * 載入孩子列表
         */
        loadChildren: function() {
            DBManager.getAll(STORES.children)
                .then(function(children) {
                    const childSelect = document.getElementById('childSelect');
                    
                    // 清空現有選項
                    childSelect.innerHTML = '<option value="">請選擇寶寶</option>';
                    
                    // 添加孩子選項
                    children.forEach(function(child) {
                        const option = document.createElement('option');
                        option.value = child.childId;
                        option.textContent = child.name;
                        childSelect.appendChild(option);
                    });
                    
                    // 如果沒有孩子，顯示提示
                    if (children.length === 0) {
                        UIManager.showNoChildMessage();
                    } else {
                        // 選擇第一個孩子
                        if (!currentChild && children.length > 0) {
                            currentChild = children[0];
                            childSelect.value = currentChild.childId;
                            UIManager.onChildChange();
                        }
                    }
                })
                .catch(function(error) {
                    console.error('載入孩子列表失敗:', error);
                    UIManager.showToast('載入孩子列表失敗', 'error');
                });
        },
        
        /**
         * 孩子選擇變更事件
         */
        onChildChange: function() {
            const childSelect = document.getElementById('childSelect');
            const childId = childSelect.value;
            
            if (childId) {
                DBManager.get(STORES.children, childId)
                    .then(function(child) {
                        currentChild = child;
                        UIManager.updateUI();
                    })
                    .catch(function(error) {
                        console.error('載入孩子資料失敗:', error);
                        UIManager.showToast('載入孩子資料失敗', 'error');
                    });
            } else {
                currentChild = null;
                UIManager.updateUI();
            }
        },
        
        /**
         * 更新所有UI元件
         */
        updateUI: function() {
            this.updateChildProfile();
            this.updateRecentRecords();
            this.updateTodaySummary();
            this.loadFeedingRecords();
            this.loadSleepRecords();
            this.loadDiaperRecords();
            this.loadHealthRecords();
            this.loadMilestoneRecords();
            this.loadInteractionRecords();
            this.loadActivityRecords();
        },
        
        /**
         * 更新孩子檔案顯示
         */
        updateChildProfile: function() {
            const profileDisplay = document.getElementById('childProfileDisplay');
            const editBtn = document.getElementById('editChildBtn');
            
            if (!currentChild) {
                profileDisplay.innerHTML = '<p class="no-child-message">請先新增寶寶檔案</p>';
                editBtn.style.display = 'none';
                return;
            }
            
            // 計算年齡
            const birthDate = new Date(currentChild.dateOfBirth);
            const today = new Date();
            const ageInDays = Math.floor((today - birthDate) / (1000 * 60 * 60 * 24));
            const ageMonths = Math.floor(ageInDays / 30);
            const ageDays = ageInDays % 30;
            
            let ageText = '';
            if (ageMonths > 0) {
                ageText = ageMonths + '個月' + (ageDays > 0 ? ageDays + '天' : '');
            } else {
                ageText = ageInDays + '天';
            }
            
            let html = '<div class="child-profile-info">';
            
            // 照片
            if (currentChild.photo) {
                html += '<img src="' + currentChild.photo + '" alt="' + currentChild.name + '的照片" class="child-photo">';
            }
            
            html += '<h4>' + currentChild.name + '</h4>';
            html += '<p><strong>年齡：</strong><span class="child-age">' + ageText + '</span></p>';
            html += '<p><strong>出生日期：</strong>' + TimeZoneManager.formatDate(currentChild.dateOfBirth) + '</p>';
            
            if (currentChild.gender) {
                html += '<p><strong>性別：</strong>' + currentChild.gender + '</p>';
            }
            
            if (currentChild.notes) {
                html += '<p><strong>備註：</strong>' + currentChild.notes + '</p>';
            }
            
            html += '</div>';
            
            profileDisplay.innerHTML = html;
            editBtn.style.display = 'block';
        },
        
        /**
         * 顯示無孩子訊息
         */
        showNoChildMessage: function() {
            // 在所有記錄容器中顯示提示
            const recordContainers = [
                'recentRecordsList',
                'todaysSummary',
                'feedingRecords',
                'sleepRecords',
                'diaperRecords',
                'healthRecords',
                'milestoneRecords',
                'interactionRecords',
                'activityRecords'
            ];
            
            recordContainers.forEach(function(containerId) {
                const container = document.getElementById(containerId);
                if (container) {
                    container.innerHTML = '<p class="no-child-message">請先選擇或新增寶寶</p>';
                }
            });
        },
        
        /**
         * 更新最近記錄
         */
        updateRecentRecords: function() {
            const recentRecordsList = document.getElementById('recentRecordsList');
            
            if (!currentChild) {
                recentRecordsList.innerHTML = '<p class="no-child-message">請先選擇寶寶</p>';
                return;
            }
            
            // 取得最近的記錄（各種類型各取最新5筆）
            Promise.all([
                DBManager.getByIndex(STORES.feedings, 'childId', currentChild.childId),
                DBManager.getByIndex(STORES.sleeps, 'childId', currentChild.childId),
                DBManager.getByIndex(STORES.diapers, 'childId', currentChild.childId),
                DBManager.getByIndex(STORES.health, 'childId', currentChild.childId)
            ])
            .then(function(results) {
                const allRecords = [];
                
                // 餵食記錄
                results[0].forEach(function(record) {
                    allRecords.push({
                        type: '餵食',
                        time: record.eventTimestamp || record.startTime || record.time,
                        data: record
                    });
                });
                
                // 睡眠記錄
                results[1].forEach(function(record) {
                    allRecords.push({
                        type: '睡眠',
                        time: record.startTime,
                        data: record
                    });
                });
                
                // 尿布記錄
                results[2].forEach(function(record) {
                    allRecords.push({
                        type: '尿布',
                        time: record.eventTime,
                        data: record
                    });
                });
                
                // 健康記錄
                results[3].forEach(function(record) {
                    allRecords.push({
                        type: '健康',
                        time: record.eventDate,
                        data: record
                    });
                });
                
                // 按時間排序，取最新5筆
                allRecords.sort(function(a, b) {
                    return new Date(b.time) - new Date(a.time);
                });
                
                const recentRecords = allRecords.slice(0, 5);
                
                if (recentRecords.length === 0) {
                    recentRecordsList.innerHTML = '<p class="no-records-message">尚無記錄</p>';
                    return;
                }
                
                let html = '';
                recentRecords.forEach(function(record) {
                    html += '<div class="recent-record-item">';
                    html += '<span class="recent-record-type">' + record.type + '</span>';
                    html += '<span class="recent-record-time">' + TimeZoneManager.formatDate(record.time, true) + '</span>';
                    html += '</div>';
                });
                
                recentRecordsList.innerHTML = html;
            })
            .catch(function(error) {
                console.error('載入最近記錄失敗:', error);
                recentRecordsList.innerHTML = '<p class="no-records-message">載入失敗</p>';
            });
        },
        
        /**
         * 更新今日摘要
         */
        updateTodaySummary: function() {
            const todaysSummary = document.getElementById('todaysSummary');
            
            if (!currentChild) {
                todaysSummary.innerHTML = '<p class="no-child-message">請先選擇寶寶</p>';
                return;
            }
            
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
            
            Promise.all([
                DBManager.getByIndex(STORES.feedings, 'childId', currentChild.childId),
                DBManager.getByIndex(STORES.sleeps, 'childId', currentChild.childId),
                DBManager.getByIndex(STORES.diapers, 'childId', currentChild.childId)
            ])
            .then(function(results) {
                // 篩選今日記錄
                const todayFeedings = results[0].filter(function(record) {
                    const recordTime = new Date(record.eventTimestamp || record.startTime || record.time);
                    return recordTime >= startOfDay && recordTime < endOfDay;
                });
                
                const todaySleeps = results[1].filter(function(record) {
                    const recordTime = new Date(record.startTime);
                    return recordTime >= startOfDay && recordTime < endOfDay;
                });
                
                const todayDiapers = results[2].filter(function(record) {
                    const recordTime = new Date(record.eventTime);
                    return recordTime >= startOfDay && recordTime < endOfDay;
                });
                
                // 計算總睡眠時間
                let totalSleepMinutes = 0;
                todaySleeps.forEach(function(sleep) {
                    if (sleep.endTime) {
                        const start = new Date(sleep.startTime);
                        const end = new Date(sleep.endTime);
                        totalSleepMinutes += (end - start) / (1000 * 60);
                    }
                });
                
                const sleepHours = Math.floor(totalSleepMinutes / 60);
                const sleepMinutes = Math.floor(totalSleepMinutes % 60);
                
                // 計算餵食總量（配方奶）
                let totalFormula = 0;
                todayFeedings.forEach(function(feeding) {
                    if (feeding.type === 'formula' && feeding.quantity) {
                        totalFormula += parseFloat(feeding.quantity);
                    }
                });
                
                let html = '';
                
                if (todayFeedings.length > 0 || todaySleeps.length > 0 || todayDiapers.length > 0) {
                    html += '<div class="summary-item">';
                    html += '<span class="summary-label">餵食次數</span>';
                    html += '<span class="summary-value">' + todayFeedings.length + '次</span>';
                    html += '</div>';
                    
                    if (totalFormula > 0) {
                        html += '<div class="summary-item">';
                        html += '<span class="summary-label">配方奶總量</span>';
                        html += '<span class="summary-value">' + totalFormula + 'ml</span>';
                        html += '</div>';
                    }
                    
                    html += '<div class="summary-item">';
                    html += '<span class="summary-label">睡眠時間</span>';
                    html += '<span class="summary-value">' + sleepHours + '小時' + sleepMinutes + '分鐘</span>';
                    html += '</div>';
                    
                    html += '<div class="summary-item">';
                    html += '<span class="summary-label">尿布更換</span>';
                    html += '<span class="summary-value">' + todayDiapers.length + '次</span>';
                    html += '</div>';
                } else {
                    html = '<p class="no-summary-message">尚無今日記錄</p>';
                }
                
                todaysSummary.innerHTML = html;
            })
            .catch(function(error) {
                console.error('載入今日摘要失敗:', error);
                todaysSummary.innerHTML = '<p class="no-summary-message">載入失敗</p>';
            });
        },
        
        /**
         * 開啟孩子表單模態視窗
         * @param {Object} child 要編輯的孩子資料（可選）
         */
        openChildModal: function(child) {
            const modalTitle = document.getElementById('modalTitle');
            const modalBody = document.getElementById('modalBody');
            const childFormContent = document.getElementById('childFormModalContent');
            
            modalTitle.textContent = child ? '編輯寶寶檔案' : '新增寶寶檔案';
            modalBody.innerHTML = childFormContent.innerHTML;
            
            // 如果是編輯模式，填入現有資料
            if (child) {
                document.getElementById('childId').value = child.childId;
                document.getElementById('childName').value = child.name || '';
                document.getElementById('childBirthDate').value = child.dateOfBirth ? child.dateOfBirth.split('T')[0] : '';
                document.getElementById('childGender').value = child.gender || '';
                document.getElementById('childNotes').value = child.notes || '';
                
                if (child.photo) {
                    const preview = document.getElementById('childPhotoPreview');
                    preview.innerHTML = '<img src="' + child.photo + '" alt="照片預覽">';
                }
                
                document.getElementById('deleteChildBtn').style.display = 'block';
            }
            
            // 設定事件監聽器
            const childForm = document.getElementById('childForm');
            childForm.addEventListener('submit', this.saveChild.bind(this));
            
            const deleteBtn = document.getElementById('deleteChildBtn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', this.deleteChild.bind(this));
            }
            
            const photoInput = document.getElementById('childPhoto');
            photoInput.addEventListener('change', this.handlePhotoUpload.bind(this));
            
            // 關閉按鈕
            const dismissBtns = document.querySelectorAll('[data-dismiss="modal"]');
            dismissBtns.forEach(function(btn) {
                btn.addEventListener('click', UIManager.closeModal.bind(UIManager));
            });
            
            this.showModal();
        },
        
        /**
         * 處理照片上傳
         * @param {Event} event 檔案上傳事件
         */
        handlePhotoUpload: function(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('childPhotoPreview') ||
                              document.getElementById('interactionPhotoPreview') ||
                              document.getElementById('activityPhotoPreview');
                if (preview) {
                    preview.innerHTML = '<img src="' + e.target.result + '" alt="照片預覽">';
                }
            };
            reader.readAsDataURL(file);
        },
        
        /**
         * 儲存孩子資料
         * @param {Event} event 表單提交事件
         */
        saveChild: function(event) {
            event.preventDefault();
            
            const formData = new FormData(event.target);
            const childData = {
                name: formData.get('name'),
                dateOfBirth: formData.get('dateOfBirth'),
                gender: formData.get('gender'),
                notes: formData.get('notes')
            };
            
            // 處理照片
            const photoPreview = document.querySelector('#childPhotoPreview img');
            if (photoPreview) {
                childData.photo = photoPreview.src;
            }
            
            const childId = formData.get('childId');
            
            if (childId) {
                // 編輯模式
                childData.childId = childId;
                DBManager.update(STORES.children, childData)
                    .then(function() {
                        UIManager.showToast('寶寶檔案已更新', 'success');
                        UIManager.closeModal();
                        UIManager.loadChildren();
                        if (currentChild && currentChild.childId === childId) {
                            currentChild = childData;
                            UIManager.updateChildProfile();
                        }
                    })
                    .catch(function(error) {
                        console.error('更新失敗:', error);
                        UIManager.showToast('更新失敗: ' + error, 'error');
                    });
            } else {
                // 新增模式
                childData.childId = 'child_' + Date.now();
                DBManager.add(STORES.children, childData)
                    .then(function() {
                        UIManager.showToast('寶寶檔案已新增', 'success');
                        UIManager.closeModal();
                        UIManager.loadChildren();
                        
                        // 自動選擇新增的孩子
                        currentChild = childData;
                        document.getElementById('childSelect').value = childData.childId;
                        UIManager.updateUI();
                    })
                    .catch(function(error) {
                        console.error('新增失敗:', error);
                        UIManager.showToast('新增失敗: ' + error, 'error');
                    });
            }
        },
        
        /**
         * 刪除孩子
         */
        deleteChild: function() {
            if (!currentChild) return;
            
            const confirmed = confirm('確定要刪除 ' + currentChild.name + ' 的所有資料嗎？此操作無法復原。');
            if (!confirmed) return;
            
            const loadingIndicator = document.getElementById('loadingIndicator');
            loadingIndicator.style.display = 'flex';
            
            // 刪除所有相關記錄
            Promise.all([
                DBManager.delete(STORES.children, currentChild.childId),
                this.deleteAllRecords(STORES.feedings, currentChild.childId),
                this.deleteAllRecords(STORES.sleeps, currentChild.childId),
                this.deleteAllRecords(STORES.diapers, currentChild.childId),
                this.deleteAllRecords(STORES.health, currentChild.childId),
                this.deleteAllRecords(STORES.milestones, currentChild.childId),
                this.deleteAllRecords(STORES.interactions, currentChild.childId),
                this.deleteAllRecords(STORES.activities, currentChild.childId)
            ])
            .then(function() {
                UIManager.showToast('寶寶檔案已刪除', 'success');
                UIManager.closeModal();
                UIManager.loadChildren();
                currentChild = null;
                UIManager.updateUI();
            })
            .catch(function(error) {
                console.error('刪除失敗:', error);
                UIManager.showToast('刪除失敗: ' + error, 'error');
            })
            .finally(function() {
                loadingIndicator.style.display = 'none';
            });
        },
        
        /**
         * 刪除特定孩子的所有記錄
         * @param {string} storeName 存儲名稱
         * @param {string} childId 孩子ID
         * @returns {Promise} 刪除操作Promise
         */
        deleteAllRecords: function(storeName, childId) {
            return DBManager.getByIndex(storeName, 'childId', childId)
                .then(function(records) {
                    const deletePromises = records.map(function(record) {
                        return DBManager.delete(storeName, record.id);
                    });
                    return Promise.all(deletePromises);
                });
        },
        
        /**
         * 開啟記錄表單模態視窗
         * @param {string} type 記錄類型
         * @param {Object} record 要編輯的記錄（可選）
         */
        openRecordModal: function(type, record) {
            if (!currentChild) {
                this.showToast('請先選擇寶寶', 'warning');
                return;
            }
            
            const modalTitle = document.getElementById('modalTitle');
            const modalBody = document.getElementById('modalBody');
            
            let templateId = '';
            let titleText = '';
            
            switch (type) {
                case 'feeding':
                    templateId = 'feedingFormModalContent';
                    titleText = record ? '編輯餵食記錄' : '新增餵食記錄';
                    break;
                case 'sleep':
                    templateId = 'sleepFormModalContent';
                    titleText = record ? '編輯睡眠記錄' : '新增睡眠記錄';
                    break;
                case 'diaper':
                    templateId = 'diaperFormModalContent';
                    titleText = record ? '編輯尿布記錄' : '新增尿布記錄';
                    break;
                case 'health':
                    templateId = 'healthFormModalContent';
                    titleText = record ? '編輯健康記錄' : '新增健康記錄';
                    break;
                case 'milestone':
                    templateId = 'milestoneFormModalContent';
                    titleText = record ? '編輯里程碑記錄' : '新增里程碑記錄';
                    break;
                case 'interaction':
                    templateId = 'interactionFormModalContent';
                    titleText = record ? '編輯互動記錄' : '新增互動記錄';
                    break;
                case 'activity':
                    templateId = 'activityFormModalContent';
                    titleText = record ? '編輯活動記錄' : '新增活動記錄';
                    break;
            }
            
            const templateContent = document.getElementById(templateId);
            if (!templateContent) return;
            
            modalTitle.textContent = titleText;
            modalBody.innerHTML = templateContent.innerHTML;
            
            // 設定表單的特定邏輯
            this.setupRecordForm(type, record);
            
            this.showModal();
        },
        
        /**
         * 設定記錄表單的特定邏輯
         * @param {string} type 記錄類型
         * @param {Object} record 記錄資料（編輯模式）
         */
        setupRecordForm: function(type, record) {
            switch (type) {
                case 'feeding':
                    this.setupFeedingForm(record);
                    break;
                case 'sleep':
                    this.setupSleepForm(record);
                    break;
                case 'diaper':
                    this.setupDiaperForm(record);
                    break;
                case 'health':
                    this.setupHealthForm(record);
                    break;
                case 'milestone':
                    this.setupMilestoneForm(record);
                    break;
                case 'interaction':
                    this.setupInteractionForm(record);
                    break;
                case 'activity':
                    this.setupActivityForm(record);
                    break;
            }
        },
        
        /**
         * 設定餵食表單
         * @param {Object} record 記錄資料（編輯模式）
         */
        setupFeedingForm: function(record) {
            const feedingTypeSelect = document.getElementById('feedingType');
            const breastfeedingFields = document.getElementById('breastfeedingFields');
            const formulaFields = document.getElementById('formulaFields');
            const solidsFields = document.getElementById('solidsFields');
            
            // 餵食類型變更事件
            feedingTypeSelect.addEventListener('change', function() {
                breastfeedingFields.style.display = 'none';
                formulaFields.style.display = 'none';
                solidsFields.style.display = 'none';
                
                switch (this.value) {
                    case 'breastfeeding':
                        breastfeedingFields.style.display = 'block';
                        break;
                    case 'formula':
                        formulaFields.style.display = 'block';
                        break;
                    case 'solids':
                        solidsFields.style.display = 'block';
                        break;
                }
            });
            
            // 如果是編輯模式，填入資料
            if (record) {
                document.getElementById('feedingId').value = record.id;
                document.getElementById('feedingType').value = record.type;
                
                // 觸發類型變更事件以顯示對應欄位
                feedingTypeSelect.dispatchEvent(new Event('change'));
                
                switch (record.type) {
                    case 'breastfeeding':
                        if (record.startTime) {
                            document.getElementById('breastfeedingStartTime').value = 
                                TimeZoneManager.toDateTimeLocal(record.startTime);
                        }
                        if (record.endTime) {
                            document.getElementById('breastfeedingEndTime').value = 
                                TimeZoneManager.toDateTimeLocal(record.endTime);
                        }
                        if (record.leftBreastDuration) {
                            document.getElementById('leftBreastDuration').value = record.leftBreastDuration;
                        }
                        if (record.rightBreastDuration) {
                            document.getElementById('rightBreastDuration').value = record.rightBreastDuration;
                        }
                        break;
                    case 'formula':
                        if (record.time) {
                            document.getElementById('formulaTime').value = 
                                TimeZoneManager.toDateTimeLocal(record.time);
                        }
                        if (record.quantity) {
                            document.getElementById('formulaQuantity').value = record.quantity;
                        }
                        if (record.unit) {
                            document.getElementById('formulaUnit').value = record.unit;
                        }
                        break;
                    case 'solids':
                        if (record.time) {
                            document.getElementById('solidsTime').value = 
                                TimeZoneManager.toDateTimeLocal(record.time);
                        }
                        if (record.foodItem) {
                            document.getElementById('foodItem').value = record.foodItem;
                        }
                        if (record.quantity) {
                            document.getElementById('solidsQuantity').value = record.quantity;
                        }
                        break;
                }
                
                if (record.notes) {
                    document.getElementById('feedingNotes').value = record.notes;
                }
                
                document.getElementById('deleteFeedingBtn').style.display = 'block';
            } else {
                // 新增模式，設定預設時間為現在
                const now = new Date();
                const defaultTime = TimeZoneManager.toDateTimeLocal(now);
                document.getElementById('breastfeedingStartTime').value = defaultTime;
                document.getElementById('formulaTime').value = defaultTime;
                document.getElementById('solidsTime').value = defaultTime;
            }
            
            // 表單提交事件
            const feedingForm = document.getElementById('feedingForm');
            feedingForm.addEventListener('submit', this.saveFeeding.bind(this));
            
            // 刪除按鈕事件
            const deleteBtn = document.getElementById('deleteFeedingBtn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function() {
                    UIManager.deleteRecord(STORES.feedings, record.id, '餵食記錄');
                });
            }
            
            // 關閉按鈕
            const dismissBtns = document.querySelectorAll('[data-dismiss="modal"]');
            dismissBtns.forEach(function(btn) {
                btn.addEventListener('click', UIManager.closeModal.bind(UIManager));
            });
        },
        
        /**
         * 儲存餵食記錄
         * @param {Event} event 表單提交事件
         */
        saveFeeding: function(event) {
            event.preventDefault();
            
            const formData = new FormData(event.target);
            const type = formData.get('type');
            
            const recordData = {
                childId: currentChild.childId,
                type: type,
                notes: formData.get('notes') || '',
                recordTimestamp: new Date().toISOString()
            };
            
            switch (type) {
                case 'breastfeeding':
                    const startTime = formData.get('startTime');
                    const endTime = formData.get('endTime');
                    if (startTime) {
                        recordData.startTime = TimeZoneManager.fromDateTimeLocal(startTime);
                        recordData.eventTimestamp = recordData.startTime;
                    }
                    if (endTime) {
                        recordData.endTime = TimeZoneManager.fromDateTimeLocal(endTime);
                    }
                    if (formData.get('leftBreastDuration')) {
                        recordData.leftBreastDuration = parseInt(formData.get('leftBreastDuration'));
                    }
                    if (formData.get('rightBreastDuration')) {
                        recordData.rightBreastDuration = parseInt(formData.get('rightBreastDuration'));
                    }
                    break;
                case 'formula':
                    const formulaTime = formData.get('time');
                    if (formulaTime) {
                        recordData.time = TimeZoneManager.fromDateTimeLocal(formulaTime);
                        recordData.eventTimestamp = recordData.time;
                    }
                    if (formData.get('quantity')) {
                        recordData.quantity = parseFloat(formData.get('quantity'));
                    }
                    recordData.unit = formData.get('unit') || 'ml';
                    break;
                case 'solids':
                    const solidsTime = formData.get('time');
                    if (solidsTime) {
                        recordData.time = TimeZoneManager.fromDateTimeLocal(solidsTime);
                        recordData.eventTimestamp = recordData.time;
                    }
                    recordData.foodItem = formData.get('foodItem') || '';
                    recordData.quantity = formData.get('quantity') || '';
                    break;
            }
            
            const recordId = formData.get('feedingId');
            
            if (recordId) {
                // 編輯模式
                recordData.id = parseInt(recordId);
                DBManager.update(STORES.feedings, recordData)
                    .then(function() {
                        UIManager.showToast('餵食記錄已更新', 'success');
                        UIManager.closeModal();
                        UIManager.loadFeedingRecords();
                        UIManager.updateRecentRecords();
                        UIManager.updateTodaySummary();
                    })
                    .catch(function(error) {
                        console.error('更新失敗:', error);
                        UIManager.showToast('更新失敗: ' + error, 'error');
                    });
            } else {
                // 新增模式
                DBManager.add(STORES.feedings, recordData)
                    .then(function() {
                        UIManager.showToast('餵食記錄已新增', 'success');
                        UIManager.closeModal();
                        UIManager.loadFeedingRecords();
                        UIManager.updateRecentRecords();
                        UIManager.updateTodaySummary();
                    })
                    .catch(function(error) {
                        console.error('新增失敗:', error);
                        UIManager.showToast('新增失敗: ' + error, 'error');
                    });
            }
        },
        
        /**
         * 設定睡眠表單
         * @param {Object} record 記錄資料（編輯模式）
         */
        setupSleepForm: function(record) {
            if (record) {
                document.getElementById('sleepId').value = record.id;
                
                if (record.startTime) {
                    document.getElementById('sleepStartTime').value = 
                        TimeZoneManager.toDateTimeLocal(record.startTime);
                }
                if (record.endTime) {
                    document.getElementById('sleepEndTime').value = 
                        TimeZoneManager.toDateTimeLocal(record.endTime);
                }
                if (record.notes) {
                    document.getElementById('sleepNotes').value = record.notes;
                }
                
                document.getElementById('deleteSleepBtn').style.display = 'block';
            } else {
                // 新增模式，設定預設開始時間為現在
                const now = new Date();
                document.getElementById('sleepStartTime').value = TimeZoneManager.toDateTimeLocal(now);
            }
            
            // 表單提交事件
            const sleepForm = document.getElementById('sleepForm');
            sleepForm.addEventListener('submit', this.saveSleep.bind(this));
            
            // 刪除按鈕事件
            const deleteBtn = document.getElementById('deleteSleepBtn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function() {
                    UIManager.deleteRecord(STORES.sleeps, record.id, '睡眠記錄');
                });
            }
            
            // 關閉按鈕
            const dismissBtns = document.querySelectorAll('[data-dismiss="modal"]');
            dismissBtns.forEach(function(btn) {
                btn.addEventListener('click', UIManager.closeModal.bind(UIManager));
            });
        },
        
        /**
         * 儲存睡眠記錄
         * @param {Event} event 表單提交事件
         */
        saveSleep: function(event) {
            event.preventDefault();
            
            const formData = new FormData(event.target);
            const startTime = formData.get('startTime');
            const endTime = formData.get('endTime');
            
            const recordData = {
                childId: currentChild.childId,
                startTime: TimeZoneManager.fromDateTimeLocal(startTime),
                notes: formData.get('notes') || '',
                recordTimestamp: new Date().toISOString()
            };
            
            if (endTime) {
                recordData.endTime = TimeZoneManager.fromDateTimeLocal(endTime);
                
                // 計算睡眠時長
                const start = new Date(recordData.startTime);
                const end = new Date(recordData.endTime);
                recordData.duration = Math.round((end - start) / (1000 * 60)); // 分鐘
            }
            
            const recordId = formData.get('sleepId');
            
            if (recordId) {
                // 編輯模式
                recordData.id = parseInt(recordId);
                DBManager.update(STORES.sleeps, recordData)
                    .then(function() {
                        UIManager.showToast('睡眠記錄已更新', 'success');
                        UIManager.closeModal();
                        UIManager.loadSleepRecords();
                        UIManager.updateRecentRecords();
                        UIManager.updateTodaySummary();
                    })
                    .catch(function(error) {
                        console.error('更新失敗:', error);
                        UIManager.showToast('更新失敗: ' + error, 'error');
                    });
            } else {
                // 新增模式
                DBManager.add(STORES.sleeps, recordData)
                    .then(function() {
                        UIManager.showToast('睡眠記錄已新增', 'success');
                        UIManager.closeModal();
                        UIManager.loadSleepRecords();
                        UIManager.updateRecentRecords();
                        UIManager.updateTodaySummary();
                    })
                    .catch(function(error) {
                        console.error('新增失敗:', error);
                        UIManager.showToast('新增失敗: ' + error, 'error');
                    });
            }
        },
        
        /**
         * 設定尿布表單
         * @param {Object} record 記錄資料（編輯模式）
         */
        setupDiaperForm: function(record) {
            if (record) {
                document.getElementById('diaperId').value = record.id;
                document.getElementById('diaperType').value = record.type;
                
                if (record.eventTime) {
                    document.getElementById('diaperTime').value = 
                        TimeZoneManager.toDateTimeLocal(record.eventTime);
                }
                if (record.notes) {
                    document.getElementById('diaperNotes').value = record.notes;
                }
                
                document.getElementById('deleteDiaperBtn').style.display = 'block';
            } else {
                // 新增模式，設定預設時間為現在
                const now = new Date();
                document.getElementById('diaperTime').value = TimeZoneManager.toDateTimeLocal(now);
            }
            
            // 表單提交事件
            const diaperForm = document.getElementById('diaperForm');
            diaperForm.addEventListener('submit', this.saveDiaper.bind(this));
            
            // 刪除按鈕事件
            const deleteBtn = document.getElementById('deleteDiaperBtn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function() {
                    UIManager.deleteRecord(STORES.diapers, record.id, '尿布記錄');
                });
            }
            
            // 關閉按鈕
            const dismissBtns = document.querySelectorAll('[data-dismiss="modal"]');
            dismissBtns.forEach(function(btn) {
                btn.addEventListener('click', UIManager.closeModal.bind(UIManager));
            });
        },
        
        /**
         * 儲存尿布記錄
         * @param {Event} event 表單提交事件
         */
        saveDiaper: function(event) {
            event.preventDefault();
            
            const formData = new FormData(event.target);
            const eventTime = formData.get('eventTime');
            
            const recordData = {
                childId: currentChild.childId,
                type: formData.get('type'),
                eventTime: TimeZoneManager.fromDateTimeLocal(eventTime),
                notes: formData.get('notes') || '',
                recordTimestamp: new Date().toISOString()
            };
            
            const recordId = formData.get('diaperId');
            
            if (recordId) {
                // 編輯模式
                recordData.id = parseInt(recordId);
                DBManager.update(STORES.diapers, recordData)
                    .then(function() {
                        UIManager.showToast('尿布記錄已更新', 'success');
                        UIManager.closeModal();
                        UIManager.loadDiaperRecords();
                        UIManager.updateRecentRecords();
                        UIManager.updateTodaySummary();
                    })
                    .catch(function(error) {
                        console.error('更新失敗:', error);
                        UIManager.showToast('更新失敗: ' + error, 'error');
                    });
            } else {
                // 新增模式
                DBManager.add(STORES.diapers, recordData)
                    .then(function() {
                        UIManager.showToast('尿布記錄已新增', 'success');
                        UIManager.closeModal();
                        UIManager.loadDiaperRecords();
                        UIManager.updateRecentRecords();
                        UIManager.updateTodaySummary();
                    })
                    .catch(function(error) {
                        console.error('新增失敗:', error);
                        UIManager.showToast('新增失敗: ' + error, 'error');
                    });
            }
        },
        
        /**
         * 設定健康表單
         * @param {Object} record 記錄資料（編輯模式）
         */
        setupHealthForm: function(record) {
            const healthTypeSelect = document.getElementById('healthType');
            const temperatureFields = document.getElementById('temperatureFields');
            
            // 健康記錄類型變更事件
            healthTypeSelect.addEventListener('change', function() {
                if (this.value === '疾病' || this.value === '健康檢查') {
                    temperatureFields.style.display = 'block';
                } else {
                    temperatureFields.style.display = 'none';
                }
            });
            
            if (record) {
                document.getElementById('healthId').value = record.id;
                document.getElementById('healthType').value = record.type;
                
                // 觸發類型變更事件以顯示對應欄位
                healthTypeSelect.dispatchEvent(new Event('change'));
                
                if (record.eventDate) {
                    document.getElementById('healthEventDate').value = 
                        TimeZoneManager.toDateTimeLocal(record.eventDate);
                }
                if (record.details) {
                    document.getElementById('healthDetails').value = record.details;
                }
                if (record.bodyTemperature) {
                    document.getElementById('bodyTemperature').value = record.bodyTemperature;
                }
                if (record.temperatureUnit) {
                    document.getElementById('temperatureUnit').value = record.temperatureUnit;
                }
                if (record.measurementMethod) {
                    document.getElementById('measurementMethod').value = record.measurementMethod;
                }
                if (record.notes) {
                    document.getElementById('healthNotes').value = record.notes;
                }
                
                document.getElementById('deleteHealthBtn').style.display = 'block';
            } else {
                // 新增模式，設定預設時間為現在
                const now = new Date();
                document.getElementById('healthEventDate').value = TimeZoneManager.toDateTimeLocal(now);
            }
            
            // 表單提交事件
            const healthForm = document.getElementById('healthForm');
            healthForm.addEventListener('submit', this.saveHealth.bind(this));
            
            // 刪除按鈕事件
            const deleteBtn = document.getElementById('deleteHealthBtn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function() {
                    UIManager.deleteRecord(STORES.health, record.id, '健康記錄');
                });
            }
            
            // 關閉按鈕
            const dismissBtns = document.querySelectorAll('[data-dismiss="modal"]');
            dismissBtns.forEach(function(btn) {
                btn.addEventListener('click', UIManager.closeModal.bind(UIManager));
            });
        },
        
        /**
         * 儲存健康記錄
         * @param {Event} event 表單提交事件
         */
        saveHealth: function(event) {
            event.preventDefault();
            
            const formData = new FormData(event.target);
            const eventDate = formData.get('eventDate');
            
            const recordData = {
                childId: currentChild.childId,
                type: formData.get('type'),
                eventDate: TimeZoneManager.fromDateTimeLocal(eventDate),
                details: formData.get('details') || '',
                notes: formData.get('notes') || '',
                recordTimestamp: new Date().toISOString()
            };
            
            // 如果是疾病或健康檢查，加入體溫資料
            if (recordData.type === '疾病' || recordData.type === '健康檢查') {
                const bodyTemperature = formData.get('bodyTemperature');
                if (bodyTemperature) {
                    recordData.bodyTemperature = parseFloat(bodyTemperature);
                    recordData.temperatureUnit = formData.get('temperatureUnit') || '攝氏';
                    recordData.measurementMethod = formData.get('measurementMethod') || '';
                }
            }
            
            const recordId = formData.get('healthId');
            
            if (recordId) {
                // 編輯模式
                recordData.id = parseInt(recordId);
                DBManager.update(STORES.health, recordData)
                    .then(function() {
                        UIManager.showToast('健康記錄已更新', 'success');
                        UIManager.closeModal();
                        UIManager.loadHealthRecords();
                        UIManager.updateRecentRecords();
                    })
                    .catch(function(error) {
                        console.error('更新失敗:', error);
                        UIManager.showToast('更新失敗: ' + error, 'error');
                    });
            } else {
                // 新增模式
                DBManager.add(STORES.health, recordData)
                    .then(function() {
                        UIManager.showToast('健康記錄已新增', 'success');
                        UIManager.closeModal();
                        UIManager.loadHealthRecords();
                        UIManager.updateRecentRecords();
                    })
                    .catch(function(error) {
                        console.error('新增失敗:', error);
                        UIManager.showToast('新增失敗: ' + error, 'error');
                    });
            }
        },
        
        /**
         * 設定里程碑表單
         * @param {Object} record 記錄資料（編輯模式）
         */
        setupMilestoneForm: function(record) {
            if (record) {
                document.getElementById('milestoneId').value = record.id;
                document.getElementById('milestoneCategory').value = record.category;
                document.getElementById('milestoneName').value = record.milestoneName;
                document.getElementById('milestoneAchievementDate').value = 
                    record.achievementDate ? record.achievementDate.split('T')[0] : '';
                if (record.notes) {
                    document.getElementById('milestoneNotes').value = record.notes;
                }
                
                document.getElementById('deleteMilestoneBtn').style.display = 'block';
            } else {
                // 新增模式，設定預設日期為今天
                const today = new Date();
                const todayString = today.getFullYear() + '-' + 
                                  String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                                  String(today.getDate()).padStart(2, '0');
                document.getElementById('milestoneAchievementDate').value = todayString;
            }
            
            // 表單提交事件
            const milestoneForm = document.getElementById('milestoneForm');
            milestoneForm.addEventListener('submit', this.saveMilestone.bind(this));
            
            // 刪除按鈕事件
            const deleteBtn = document.getElementById('deleteMilestoneBtn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function() {
                    UIManager.deleteRecord(STORES.milestones, record.id, '里程碑記錄');
                });
            }
            
            // 關閉按鈕
            const dismissBtns = document.querySelectorAll('[data-dismiss="modal"]');
            dismissBtns.forEach(function(btn) {
                btn.addEventListener('click', UIManager.closeModal.bind(UIManager));
            });
        },
        
        /**
         * 儲存里程碑記錄
         * @param {Event} event 表單提交事件
         */
        saveMilestone: function(event) {
            event.preventDefault();
            
            const formData = new FormData(event.target);
            const achievementDate = formData.get('achievementDate');
            
            const recordData = {
                childId: currentChild.childId,
                category: formData.get('category'),
                milestoneName: formData.get('milestoneName'),
                achievementDate: achievementDate + 'T00:00:00.000Z',
                notes: formData.get('notes') || '',
                recordTimestamp: new Date().toISOString()
            };
            
            const recordId = formData.get('milestoneId');
            
            if (recordId) {
                // 編輯模式
                recordData.id = parseInt(recordId);
                DBManager.update(STORES.milestones, recordData)
                    .then(function() {
                        UIManager.showToast('里程碑記錄已更新', 'success');
                        UIManager.closeModal();
                        UIManager.loadMilestoneRecords();
                    })
                    .catch(function(error) {
                       console.error('更新失敗:', error);
                        UIManager.showToast('更新失敗: ' + error, 'error');
                    });
            } else {
                // 新增模式
                DBManager.add(STORES.milestones, recordData)
                    .then(function() {
                        UIManager.showToast('里程碑記錄已新增', 'success');
                        UIManager.closeModal();
                        UIManager.loadMilestoneRecords();
                    })
                    .catch(function(error) {
                        console.error('新增失敗:', error);
                        UIManager.showToast('新增失敗: ' + error, 'error');
                    });
            }
        },
        
        /**
         * 設定互動表單
         * @param {Object} record 記錄資料（編輯模式）
         */
        setupInteractionForm: function(record) {
            if (record) {
                document.getElementById('interactionId').value = record.id;
                
                if (record.eventTime) {
                    document.getElementById('interactionEventTime').value = 
                        TimeZoneManager.toDateTimeLocal(record.eventTime);
                }
                if (record.emotionalState) {
                    document.getElementById('emotionalState').value = record.emotionalState;
                }
                if (record.interactionEvent) {
                    document.getElementById('interactionEvent').value = record.interactionEvent;
                }
                if (record.notes) {
                    document.getElementById('interactionNotes').value = record.notes;
                }
                if (record.photo) {
                    const preview = document.getElementById('interactionPhotoPreview');
                    preview.innerHTML = '<img src="' + record.photo + '" alt="照片預覽">';
                }
                
                document.getElementById('deleteInteractionBtn').style.display = 'block';
            } else {
                // 新增模式，設定預設時間為現在
                const now = new Date();
                document.getElementById('interactionEventTime').value = TimeZoneManager.toDateTimeLocal(now);
            }
            
            // 照片上傳處理
            const photoInput = document.getElementById('interactionPhoto');
            photoInput.addEventListener('change', this.handlePhotoUpload.bind(this));
            
            // 表單提交事件
            const interactionForm = document.getElementById('interactionForm');
            interactionForm.addEventListener('submit', this.saveInteraction.bind(this));
            
            // 刪除按鈕事件
            const deleteBtn = document.getElementById('deleteInteractionBtn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function() {
                    UIManager.deleteRecord(STORES.interactions, record.id, '互動記錄');
                });
            }
            
            // 關閉按鈕
            const dismissBtns = document.querySelectorAll('[data-dismiss="modal"]');
            dismissBtns.forEach(function(btn) {
                btn.addEventListener('click', UIManager.closeModal.bind(UIManager));
            });
        },
        
        /**
         * 儲存互動記錄
         * @param {Event} event 表單提交事件
         */
        saveInteraction: function(event) {
            event.preventDefault();
            
            const formData = new FormData(event.target);
            const eventTime = formData.get('eventTime');
            
            const recordData = {
                childId: currentChild.childId,
                eventTime: TimeZoneManager.fromDateTimeLocal(eventTime),
                emotionalState: formData.get('emotionalState') || '',
                interactionEvent: formData.get('interactionEvent') || '',
                notes: formData.get('notes') || '',
                recordTimestamp: new Date().toISOString()
            };
            
            // 處理照片
            const photoPreview = document.querySelector('#interactionPhotoPreview img');
            if (photoPreview) {
                recordData.photo = photoPreview.src;
            }
            
            const recordId = formData.get('interactionId');
            
            if (recordId) {
                // 編輯模式
                recordData.id = parseInt(recordId);
                DBManager.update(STORES.interactions, recordData)
                    .then(function() {
                        UIManager.showToast('互動記錄已更新', 'success');
                        UIManager.closeModal();
                        UIManager.loadInteractionRecords();
                    })
                    .catch(function(error) {
                        console.error('更新失敗:', error);
                        UIManager.showToast('更新失敗: ' + error, 'error');
                    });
            } else {
                // 新增模式
                DBManager.add(STORES.interactions, recordData)
                    .then(function() {
                        UIManager.showToast('互動記錄已新增', 'success');
                        UIManager.closeModal();
                        UIManager.loadInteractionRecords();
                    })
                    .catch(function(error) {
                        console.error('新增失敗:', error);
                        UIManager.showToast('新增失敗: ' + error, 'error');
                    });
            }
        },
        
        /**
         * 設定活動表單
         * @param {Object} record 記錄資料（編輯模式）
         */
        setupActivityForm: function(record) {
            const activitySelect = document.getElementById('activityName');
            const customActivityField = document.getElementById('customActivityField');
            
            // 活動名稱變更事件
            activitySelect.addEventListener('change', function() {
                if (this.value === 'custom') {
                    customActivityField.style.display = 'block';
                } else {
                    customActivityField.style.display = 'none';
                }
            });
            
            if (record) {
                document.getElementById('activityId').value = record.id;
                
                if (record.type === 'custom') {
                    document.getElementById('activityName').value = 'custom';
                    document.getElementById('customActivityName').value = record.activityName;
                    customActivityField.style.display = 'block';
                } else {
                    document.getElementById('activityName').value = record.activityName;
                }
                
                if (record.startTime) {
                    document.getElementById('activityStartTime').value = 
                        TimeZoneManager.toDateTimeLocal(record.startTime);
                }
                if (record.endTime) {
                    document.getElementById('activityEndTime').value = 
                        TimeZoneManager.toDateTimeLocal(record.endTime);
                }
                if (record.notes) {
                    document.getElementById('activityNotes').value = record.notes;
                }
                if (record.photo) {
                    const preview = document.getElementById('activityPhotoPreview');
                    preview.innerHTML = '<img src="' + record.photo + '" alt="照片預覽">';
                }
                
                document.getElementById('deleteActivityBtn').style.display = 'block';
            } else {
                // 新增模式，設定預設時間為現在
                const now = new Date();
                document.getElementById('activityStartTime').value = TimeZoneManager.toDateTimeLocal(now);
            }
            
            // 照片上傳處理
            const photoInput = document.getElementById('activityPhoto');
            photoInput.addEventListener('change', this.handlePhotoUpload.bind(this));
            
            // 表單提交事件
            const activityForm = document.getElementById('activityForm');
            activityForm.addEventListener('submit', this.saveActivity.bind(this));
            
            // 刪除按鈕事件
            const deleteBtn = document.getElementById('deleteActivityBtn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function() {
                    UIManager.deleteRecord(STORES.activities, record.id, '活動記錄');
                });
            }
            
            // 關閉按鈕
            const dismissBtns = document.querySelectorAll('[data-dismiss="modal"]');
            dismissBtns.forEach(function(btn) {
                btn.addEventListener('click', UIManager.closeModal.bind(UIManager));
            });
        },
        
        /**
         * 儲存活動記錄
         * @param {Event} event 表單提交事件
         */
        saveActivity: function(event) {
            event.preventDefault();
            
            const formData = new FormData(event.target);
            const activityName = formData.get('activityName');
            const startTime = formData.get('startTime');
            const endTime = formData.get('endTime');
            
            const recordData = {
                childId: currentChild.childId,
                startTime: TimeZoneManager.fromDateTimeLocal(startTime),
                notes: formData.get('notes') || '',
                recordTimestamp: new Date().toISOString()
            };
            
            // 處理活動名稱
            if (activityName === 'custom') {
                recordData.activityName = formData.get('customActivityName');
                recordData.type = 'custom';
            } else {
                recordData.activityName = activityName;
                recordData.type = 'preset';
            }
            
            if (endTime) {
                recordData.endTime = TimeZoneManager.fromDateTimeLocal(endTime);
                
                // 計算活動時長
                const start = new Date(recordData.startTime);
                const end = new Date(recordData.endTime);
                recordData.duration = Math.round((end - start) / (1000 * 60)); // 分鐘
            }
            
            // 處理照片
            const photoPreview = document.querySelector('#activityPhotoPreview img');
            if (photoPreview) {
                recordData.photo = photoPreview.src;
            }
            
            const recordId = formData.get('activityId');
            
            if (recordId) {
                // 編輯模式
                recordData.id = parseInt(recordId);
                DBManager.update(STORES.activities, recordData)
                    .then(function() {
                        UIManager.showToast('活動記錄已更新', 'success');
                        UIManager.closeModal();
                        UIManager.loadActivityRecords();
                    })
                    .catch(function(error) {
                        console.error('更新失敗:', error);
                        UIManager.showToast('更新失敗: ' + error, 'error');
                    });
            } else {
                // 新增模式
                DBManager.add(STORES.activities, recordData)
                    .then(function() {
                        UIManager.showToast('活動記錄已新增', 'success');
                        UIManager.closeModal();
                        UIManager.loadActivityRecords();
                    })
                    .catch(function(error) {
                        console.error('新增失敗:', error);
                        UIManager.showToast('新增失敗: ' + error, 'error');
                    });
            }
        },
        
        /**
         * 載入餵食記錄
         */
        loadFeedingRecords: function() {
            const recordsContainer = document.getElementById('feedingRecords');
            
            if (!currentChild) {
                recordsContainer.innerHTML = '<p class="no-child-message">請先選擇寶寶</p>';
                return;
            }
            
            DBManager.getByIndex(STORES.feedings, 'childId', currentChild.childId)
                .then(function(records) {
                    if (records.length === 0) {
                        recordsContainer.innerHTML = '<p class="no-records-message">尚無餵食記錄</p>';
                        return;
                    }
                    
                    // 按時間降序排列
                    records.sort(function(a, b) {
                        const timeA = new Date(a.eventTimestamp || a.startTime || a.time);
                        const timeB = new Date(b.eventTimestamp || b.startTime || b.time);
                        return timeB - timeA;
                    });
                    
                    let html = '';
                    records.forEach(function(record) {
                        html += UIManager.renderFeedingRecord(record);
                    });
                    
                    recordsContainer.innerHTML = html;
                })
                .catch(function(error) {
                    console.error('載入餵食記錄失敗:', error);
                    recordsContainer.innerHTML = '<p class="no-records-message">載入失敗</p>';
                });
        },
        
        /**
         * 渲染餵食記錄卡片
         * @param {Object} record 餵食記錄
         * @returns {string} HTML字串
         */
        renderFeedingRecord: function(record) {
            let html = '<div class="record-card">';
            html += '<div class="record-header">';
            
            let typeText = '';
            switch (record.type) {
                case 'breastfeeding':
                    typeText = '母乳餵養';
                    break;
                case 'formula':
                    typeText = '配方奶';
                    break;
                case 'solids':
                    typeText = '副食品';
                    break;
            }
            
            html += '<span class="record-type">' + typeText + '</span>';
            html += '<span class="record-time">' + 
                   TimeZoneManager.formatDate(record.eventTimestamp || record.startTime || record.time, true) + 
                   '</span>';
            html += '</div>';
            
            html += '<div class="record-content">';
            
            switch (record.type) {
                case 'breastfeeding':
                    if (record.startTime && record.endTime) {
                        const start = TimeZoneManager.utcToLocal(record.startTime);
                        const end = TimeZoneManager.utcToLocal(record.endTime);
                        const duration = Math.round((end - start) / (1000 * 60));
                        html += '<div class="record-detail"><strong>時長：</strong>' + duration + '分鐘</div>';
                    }
                    if (record.leftBreastDuration) {
                        html += '<div class="record-detail"><strong>左側：</strong>' + record.leftBreastDuration + '分鐘</div>';
                    }
                    if (record.rightBreastDuration) {
                        html += '<div class="record-detail"><strong>右側：</strong>' + record.rightBreastDuration + '分鐘</div>';
                    }
                    break;
                case 'formula':
                    if (record.quantity) {
                        html += '<div class="record-detail"><strong>份量：</strong>' + record.quantity + ' ' + (record.unit || 'ml') + '</div>';
                    }
                    break;
                case 'solids':
                    if (record.foodItem) {
                        html += '<div class="record-detail"><strong>食物：</strong>' + record.foodItem + '</div>';
                    }
                    if (record.quantity) {
                        html += '<div class="record-detail"><strong>份量：</strong>' + record.quantity + '</div>';
                    }
                    break;
            }
            
            if (record.notes) {
                html += '<div class="record-notes">' + record.notes + '</div>';
            }
            
            html += '</div>';
            
            html += '<div class="record-actions">';
            html += '<button class="edit-btn" onclick="UIManager.openRecordModal(\'feeding\', ' + 
                   JSON.stringify(record).replace(/"/g, '&quot;') + ')">編輯</button>';
            html += '<button class="delete-btn" onclick="UIManager.deleteRecord(\'' + STORES.feedings + '\', ' + 
                   record.id + ', \'餵食記錄\')">刪除</button>';
            html += '</div>';
            
            html += '</div>';
            return html;
        },
        
        /**
         * 載入睡眠記錄
         */
        loadSleepRecords: function() {
            const recordsContainer = document.getElementById('sleepRecords');
            
            if (!currentChild) {
                recordsContainer.innerHTML = '<p class="no-child-message">請先選擇寶寶</p>';
                return;
            }
            
            DBManager.getByIndex(STORES.sleeps, 'childId', currentChild.childId)
                .then(function(records) {
                    if (records.length === 0) {
                        recordsContainer.innerHTML = '<p class="no-records-message">尚無睡眠記錄</p>';
                        return;
                    }
                    
                    // 按開始時間降序排列
                    records.sort(function(a, b) {
                        return new Date(b.startTime) - new Date(a.startTime);
                    });
                    
                    let html = '';
                    records.forEach(function(record) {
                        html += UIManager.renderSleepRecord(record);
                    });
                    
                    recordsContainer.innerHTML = html;
                })
                .catch(function(error) {
                    console.error('載入睡眠記錄失敗:', error);
                    recordsContainer.innerHTML = '<p class="no-records-message">載入失敗</p>';
                });
        },
        
        /**
         * 渲染睡眠記錄卡片
         * @param {Object} record 睡眠記錄
         * @returns {string} HTML字串
         */
        renderSleepRecord: function(record) {
            let html = '<div class="record-card">';
            html += '<div class="record-header">';
            html += '<span class="record-type">睡眠</span>';
            html += '<span class="record-time">' + TimeZoneManager.formatDate(record.startTime, true) + '</span>';
            html += '</div>';
            
            html += '<div class="record-content">';
            html += '<div class="record-detail"><strong>開始時間：</strong>' + 
                   TimeZoneManager.formatDate(record.startTime, true) + '</div>';
            
            if (record.endTime) {
                html += '<div class="record-detail"><strong>結束時間：</strong>' + 
                       TimeZoneManager.formatDate(record.endTime, true) + '</div>';
                
                const start = new Date(record.startTime);
                const end = new Date(record.endTime);
                const durationMinutes = Math.round((end - start) / (1000 * 60));
                const hours = Math.floor(durationMinutes / 60);
                const minutes = durationMinutes % 60;
                html += '<div class="record-detail"><strong>時長：</strong>' + hours + '小時' + minutes + '分鐘</div>';
            } else {
                html += '<div class="record-detail"><strong>狀態：</strong>進行中</div>';
            }
            
            if (record.notes) {
                html += '<div class="record-notes">' + record.notes + '</div>';
            }
            
            html += '</div>';
            
            html += '<div class="record-actions">';
            html += '<button class="edit-btn" onclick="UIManager.openRecordModal(\'sleep\', ' + 
                   JSON.stringify(record).replace(/"/g, '&quot;') + ')">編輯</button>';
            html += '<button class="delete-btn" onclick="UIManager.deleteRecord(\'' + STORES.sleeps + '\', ' + 
                   record.id + ', \'睡眠記錄\')">刪除</button>';
            html += '</div>';
            
            html += '</div>';
            return html;
        },
        
        /**
         * 載入尿布記錄
         */
        loadDiaperRecords: function() {
            const recordsContainer = document.getElementById('diaperRecords');
            
            if (!currentChild) {
                recordsContainer.innerHTML = '<p class="no-child-message">請先選擇寶寶</p>';
                return;
            }
            
            DBManager.getByIndex(STORES.diapers, 'childId', currentChild.childId)
                .then(function(records) {
                    if (records.length === 0) {
                        recordsContainer.innerHTML = '<p class="no-records-message">尚無尿布記錄</p>';
                        return;
                    }
                    
                    // 按事件時間降序排列
                    records.sort(function(a, b) {
                        return new Date(b.eventTime) - new Date(a.eventTime);
                    });
                    
                    let html = '';
                    records.forEach(function(record) {
                        html += UIManager.renderDiaperRecord(record);
                    });
                    
                    recordsContainer.innerHTML = html;
                })
                .catch(function(error) {
                    console.error('載入尿布記錄失敗:', error);
                    recordsContainer.innerHTML = '<p class="no-records-message">載入失敗</p>';
                });
        },
        
        /**
         * 渲染尿布記錄卡片
         * @param {Object} record 尿布記錄
         * @returns {string} HTML字串
         */
        renderDiaperRecord: function(record) {
            let html = '<div class="record-card">';
            html += '<div class="record-header">';
            html += '<span class="record-type">尿布 - ' + record.type + '</span>';
            html += '<span class="record-time">' + TimeZoneManager.formatDate(record.eventTime, true) + '</span>';
            html += '</div>';
            
            html += '<div class="record-content">';
            html += '<div class="record-detail"><strong>類型：</strong>' + record.type + '</div>';
            html += '<div class="record-detail"><strong>時間：</strong>' + 
                   TimeZoneManager.formatDate(record.eventTime, true) + '</div>';
            
            if (record.notes) {
                html += '<div class="record-notes">' + record.notes + '</div>';
            }
            
            html += '</div>';
            
            html += '<div class="record-actions">';
            html += '<button class="edit-btn" onclick="UIManager.openRecordModal(\'diaper\', ' + 
                   JSON.stringify(record).replace(/"/g, '&quot;') + ')">編輯</button>';
            html += '<button class="delete-btn" onclick="UIManager.deleteRecord(\'' + STORES.diapers + '\', ' + 
                   record.id + ', \'尿布記錄\')">刪除</button>';
            html += '</div>';
            
            html += '</div>';
            return html;
        },
        
        /**
         * 載入健康記錄
         */
        loadHealthRecords: function() {
            const recordsContainer = document.getElementById('healthRecords');
            
            if (!currentChild) {
                recordsContainer.innerHTML = '<p class="no-child-message">請先選擇寶寶</p>';
                return;
            }
            
            DBManager.getByIndex(STORES.health, 'childId', currentChild.childId)
                .then(function(records) {
                    if (records.length === 0) {
                        recordsContainer.innerHTML = '<p class="no-records-message">尚無健康記錄</p>';
                        return;
                    }
                    
                    // 按事件日期降序排列
                    records.sort(function(a, b) {
                        return new Date(b.eventDate) - new Date(a.eventDate);
                    });
                    
                    let html = '';
                    records.forEach(function(record) {
                        html += UIManager.renderHealthRecord(record);
                    });
                    
                    recordsContainer.innerHTML = html;
                })
                .catch(function(error) {
                    console.error('載入健康記錄失敗:', error);
                    recordsContainer.innerHTML = '<p class="no-records-message">載入失敗</p>';
                });
        },
        
        /**
         * 渲染健康記錄卡片
         * @param {Object} record 健康記錄
         * @returns {string} HTML字串
         */
        renderHealthRecord: function(record) {
            let html = '<div class="record-card">';
            html += '<div class="record-header">';
            html += '<span class="record-type">' + record.type + '</span>';
            html += '<span class="record-time">' + TimeZoneManager.formatDate(record.eventDate, true) + '</span>';
            html += '</div>';
            
            html += '<div class="record-content">';
            html += '<div class="record-detail"><strong>類型：</strong>' + record.type + '</div>';
            html += '<div class="record-detail"><strong>日期：</strong>' + 
                   TimeZoneManager.formatDate(record.eventDate, true) + '</div>';
            
            if (record.details) {
                html += '<div class="record-detail"><strong>詳細說明：</strong>' + record.details + '</div>';
            }
            
            if (record.bodyTemperature) {
                html += '<div class="record-detail"><strong>體溫：</strong>' + record.bodyTemperature + ' °C';
                if (record.measurementMethod) {
                    html += ' (' + record.measurementMethod + ')';
                }
                html += '</div>';
            }
            
            if (record.notes) {
                html += '<div class="record-notes">' + record.notes + '</div>';
            }
            
            html += '</div>';
            
            html += '<div class="record-actions">';
            html += '<button class="edit-btn" onclick="UIManager.openRecordModal(\'health\', ' + 
                   JSON.stringify(record).replace(/"/g, '&quot;') + ')">編輯</button>';
            html += '<button class="delete-btn" onclick="UIManager.deleteRecord(\'' + STORES.health + '\', ' + 
                   record.id + ', \'健康記錄\')">刪除</button>';
            html += '</div>';
            
            html += '</div>';
            return html;
        },
        
        /**
         * 載入里程碑記錄
         */
        loadMilestoneRecords: function() {
            const recordsContainer = document.getElementById('milestoneRecords');
            
            if (!currentChild) {
                recordsContainer.innerHTML = '<p class="no-child-message">請先選擇寶寶</p>';
                return;
            }
            
            DBManager.getByIndex(STORES.milestones, 'childId', currentChild.childId)
                .then(function(records) {
                    if (records.length === 0) {
                        recordsContainer.innerHTML = '<p class="no-records-message">尚無里程碑記錄</p>';
                        return;
                    }
                    
                    // 按達成日期降序排列
                    records.sort(function(a, b) {
                        return new Date(b.achievementDate) - new Date(a.achievementDate);
                    });
                    
                    let html = '';
                    records.forEach(function(record) {
                        html += UIManager.renderMilestoneRecord(record);
                    });
                    
                    recordsContainer.innerHTML = html;
                })
                .catch(function(error) {
                    console.error('載入里程碑記錄失敗:', error);
                    recordsContainer.innerHTML = '<p class="no-records-message">載入失敗</p>';
                });
        },
        
        /**
         * 渲染里程碑記錄卡片
         * @param {Object} record 里程碑記錄
         * @returns {string} HTML字串
         */
        renderMilestoneRecord: function(record) {
            let html = '<div class="record-card">';
            html += '<div class="record-header">';
            html += '<span class="record-type">' + record.category + '</span>';
            html += '<span class="record-time">' + TimeZoneManager.formatDate(record.achievementDate) + '</span>';
            html += '</div>';
            
            html += '<div class="record-content">';
            html += '<div class="record-detail"><strong>里程碑：</strong>' + record.milestoneName + '</div>';
            html += '<div class="record-detail"><strong>類別：</strong>' + record.category + '</div>';
            html += '<div class="record-detail"><strong>達成日期：</strong>' + 
                   TimeZoneManager.formatDate(record.achievementDate) + '</div>';
            
            if (record.notes) {
                html += '<div class="record-notes">' + record.notes + '</div>';
            }
            
            html += '</div>';
            
            html += '<div class="record-actions">';
            html += '<button class="edit-btn" onclick="UIManager.openRecordModal(\'milestone\', ' + 
                   JSON.stringify(record).replace(/"/g, '&quot;') + ')">編輯</button>';
            html += '<button class="delete-btn" onclick="UIManager.deleteRecord(\'' + STORES.milestones + '\', ' + 
                   record.id + ', \'里程碑記錄\')">刪除</button>';
            html += '</div>';
            
            html += '</div>';
            return html;
        },
        
        /**
         * 載入互動記錄
         */
        loadInteractionRecords: function() {
            const recordsContainer = document.getElementById('interactionRecords');
            
            if (!currentChild) {
                recordsContainer.innerHTML = '<p class="no-child-message">請先選擇寶寶</p>';
                return;
            }
            
            DBManager.getByIndex(STORES.interactions, 'childId', currentChild.childId)
                .then(function(records) {
                    if (records.length === 0) {
                        recordsContainer.innerHTML = '<p class="no-records-message">尚無互動記錄</p>';
                        return;
                    }
                    
                    // 按事件時間降序排列
                    records.sort(function(a, b) {
                        return new Date(b.eventTime) - new Date(a.eventTime);
                    });
                    
                    let html = '';
                    records.forEach(function(record) {
                        html += UIManager.renderInteractionRecord(record);
                    });
                    
                    recordsContainer.innerHTML = html;
                })
                .catch(function(error) {
                    console.error('載入互動記錄失敗:', error);
                    recordsContainer.innerHTML = '<p class="no-records-message">載入失敗</p>';
                });
        },
        
        /**
         * 渲染互動記錄卡片
         * @param {Object} record 互動記錄
         * @returns {string} HTML字串
         */
        renderInteractionRecord: function(record) {
            let html = '<div class="record-card">';
            html += '<div class="record-header">';
            html += '<span class="record-type">親子互動</span>';
            html += '<span class="record-time">' + TimeZoneManager.formatDate(record.eventTime, true) + '</span>';
            html += '</div>';
            
            html += '<div class="record-content">';
            html += '<div class="record-detail"><strong>時間：</strong>' + 
                   TimeZoneManager.formatDate(record.eventTime, true) + '</div>';
            
            if (record.emotionalState) {
                html += '<div class="record-detail"><strong>情緒狀態：</strong>' + record.emotionalState + '</div>';
            }
            
            if (record.interactionEvent) {
                html += '<div class="record-detail"><strong>互動內容：</strong>' + record.interactionEvent + '</div>';
            }
            
            if (record.photo) {
                html += '<img src="' + record.photo + '" alt="互動照片" class="record-photo">';
            }
            
            if (record.notes) {
                html += '<div class="record-notes">' + record.notes + '</div>';
            }
            
            html += '</div>';
            
            html += '<div class="record-actions">';
            html += '<button class="edit-btn" onclick="UIManager.openRecordModal(\'interaction\', ' + 
                   JSON.stringify(record).replace(/"/g, '&quot;') + ')">編輯</button>';
            html += '<button class="delete-btn" onclick="UIManager.deleteRecord(\'' + STORES.interactions + '\', ' + 
                   record.id + ', \'互動記錄\')">刪除</button>';
            html += '</div>';
            
            html += '</div>';
            return html;
        },
        
        /**
         * 載入活動記錄
         */
        loadActivityRecords: function() {
            const recordsContainer = document.getElementById('activityRecords');
            
            if (!currentChild) {
                recordsContainer.innerHTML = '<p class="no-child-message">請先選擇寶寶</p>';
                return;
            }
            
            DBManager.getByIndex(STORES.activities, 'childId', currentChild.childId)
                .then(function(records) {
                    if (records.length === 0) {
                        recordsContainer.innerHTML = '<p class="no-records-message">尚無活動記錄</p>';
                        return;
                    }
                    
                    // 按開始時間降序排列
                    records.sort(function(a, b) {
                        return new Date(b.startTime) - new Date(a.startTime);
                    });
                    
                    let html = '';
                    records.forEach(function(record) {
                        html += UIManager.renderActivityRecord(record);
                    });
                    
                    recordsContainer.innerHTML = html;
                })
                .catch(function(error) {
                    console.error('載入活動記錄失敗:', error);
                    recordsContainer.innerHTML = '<p class="no-records-message">載入失敗</p>';
                });
        },
        
        /**
         * 渲染活動記錄卡片
         * @param {Object} record 活動記錄
         * @returns {string} HTML字串
         */
        renderActivityRecord: function(record) {
            let html = '<div class="record-card">';
            html += '<div class="record-header">';
            html += '<span class="record-type">' + record.activityName + '</span>';
            html += '<span class="record-time">' + TimeZoneManager.formatDate(record.startTime, true) + '</span>';
            html += '</div>';
            
            html += '<div class="record-content">';
            html += '<div class="record-detail"><strong>活動：</strong>' + record.activityName + '</div>';
            html += '<div class="record-detail"><strong>開始時間：</strong>' + 
                   TimeZoneManager.formatDate(record.startTime, true) + '</div>';
            
            if (record.endTime) {
                html += '<div class="record-detail"><strong>結束時間：</strong>' + 
                       TimeZoneManager.formatDate(record.endTime, true) + '</div>';
                
                const start = new Date(record.startTime);
                const end = new Date(record.endTime);
                const durationMinutes = Math.round((end - start) / (1000 * 60));
                const hours = Math.floor(durationMinutes / 60);
                const minutes = durationMinutes % 60;
                
                if (hours > 0) {
                    html += '<div class="record-detail"><strong>時長：</strong>' + hours + '小時' + minutes + '分鐘</div>';
                } else {
                    html += '<div class="record-detail"><strong>時長：</strong>' + minutes + '分鐘</div>';
                }
            } else {
                html += '<div class="record-detail"><strong>狀態：</strong>進行中</div>';
            }
            
            if (record.photo) {
                html += '<img src="' + record.photo + '" alt="活動照片" class="record-photo">';
            }
            
            if (record.notes) {
                html += '<div class="record-notes">' + record.notes + '</div>';
            }
            
            html += '</div>';
            
            html += '<div class="record-actions">';
            html += '<button class="edit-btn" onclick="UIManager.openRecordModal(\'activity\', ' + 
                   JSON.stringify(record).replace(/"/g, '&quot;') + ')">編輯</button>';
            html += '<button class="delete-btn" onclick="UIManager.deleteRecord(\'' + STORES.activities + '\', ' + 
                   record.id + ', \'活動記錄\')">刪除</button>';
            html += '</div>';
            
            html += '</div>';
            return html;
        },
        
        /**
         * 刪除記錄
         * @param {string} storeName 存儲名稱
         * @param {number} recordId 記錄ID
         * @param {string} recordType 記錄類型（用於顯示訊息）
         */
        deleteRecord: function(storeName, recordId, recordType) {
            const confirmed = confirm('確定要刪除這筆' + recordType + '嗎？此操作無法復原。');
            if (!confirmed) return;
            
            DBManager.delete(storeName, recordId)
                .then(function() {
                    UIManager.showToast(recordType + '已刪除', 'success');
                    
                    // 重新載入對應的記錄列表
                    switch (storeName) {
                        case STORES.feedings:
                            UIManager.loadFeedingRecords();
                            break;
                        case STORES.sleeps:
                            UIManager.loadSleepRecords();
                            break;
                        case STORES.diapers:
                            UIManager.loadDiaperRecords();
                            break;
                        case STORES.health:
                            UIManager.loadHealthRecords();
                            break;
                        case STORES.milestones:
                            UIManager.loadMilestoneRecords();
                            break;
                        case STORES.interactions:
                            UIManager.loadInteractionRecords();
                            break;
                        case STORES.activities:
                            UIManager.loadActivityRecords();
                            break;
                    }
                    
                    // 更新相關UI
                    UIManager.updateRecentRecords();
                    UIManager.updateTodaySummary();
                    
                    // 關閉模態視窗
                    UIManager.closeModal();
                })
                .catch(function(error) {
                    console.error('刪除失敗:', error);
                    UIManager.showToast('刪除失敗: ' + error, 'error');
                });
        },
        
        /**
         * 更新圖表
         */
        updateChart: function() {
            if (!currentChild) {
                const canvas = document.getElementById('statisticsChart');
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#999';
                ctx.textAlign = 'center';
                ctx.font = '18px Arial';
                ctx.fillText('請先選擇寶寶', canvas.width / 2, canvas.height / 2);
                return;
            }
            
            const chartType = document.getElementById('chartType').value;
            const chartPeriod = parseInt(document.getElementById('chartPeriod').value);
            
            // 清除舊圖表
            if (currentChart) {
                currentChart.destroy();
                currentChart = null;
            }
            
            switch (chartType) {
                case 'feeding':
                    this.createFeedingChart(chartPeriod);
                    break;
                case 'sleep':
                    this.createSleepChart(chartPeriod);
                    break;
                case 'diaper':
                    this.createDiaperChart(chartPeriod);
                    break;
                case 'activity':
                    this.createActivityChart(chartPeriod);
                    break;
            }
        },
        
        /**
         * 建立餵食統計圖表
         * @param {number} days 天數
         */
        createFeedingChart: function(days) {
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
            
            DBManager.getByIndex(STORES.feedings, 'childId', currentChild.childId)
                .then(function(records) {
                    // 篩選指定期間的記錄
                    const filteredRecords = records.filter(function(record) {
                        const recordDate = new Date(record.eventTimestamp || record.startTime || record.time);
                        return recordDate >= startDate && recordDate <= endDate;
                    });
                    
                    // 按日期分組
                    const dailyData = {};
                    for (let i = 0; i < days; i++) {
                        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
                        const dateKey = date.getFullYear() + '/' + 
                                       String(date.getMonth() + 1).padStart(2, '0') + '/' + 
                                       String(date.getDate()).padStart(2, '0');
                        dailyData[dateKey] = {
                            breastfeeding: 0,
                            formula: 0,
                            solids: 0,
                            formulaVolume: 0
                        };
                    }
                    
                    filteredRecords.forEach(function(record) {
                        const recordDate = new Date(record.eventTimestamp || record.startTime || record.time);
                        const dateKey = recordDate.getFullYear() + '/' + 
                                       String(recordDate.getMonth() + 1).padStart(2, '0') + '/' + 
                                       String(recordDate.getDate()).padStart(2, '0');
                        
                        if (dailyData[dateKey]) {
                            dailyData[dateKey][record.type]++;
                            if (record.type === 'formula' && record.quantity) {
                                dailyData[dateKey].formulaVolume += parseFloat(record.quantity);
                            }
                        }
                    });
                    
                    const labels = Object.keys(dailyData);
                    const breastfeedingData = labels.map(function(date) { return dailyData[date].breastfeeding; });
                    const formulaData = labels.map(function(date) { return dailyData[date].formula; });
                    const solidsData = labels.map(function(date) { return dailyData[date].solids; });
                    const formulaVolumeData = labels.map(function(date) { return dailyData[date].formulaVolume; });
                    
                    const ctx = document.getElementById('statisticsChart').getContext('2d');
                    currentChart = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: labels,
                            datasets: [
                                {
                                    label: '母乳餵養次數',
                                    data: breastfeedingData,
                                    backgroundColor: 'rgba(248, 165, 194, 0.7)',
                                    borderColor: 'rgba(248, 165, 194, 1)',
                                    borderWidth: 1,
                                    yAxisID: 'y'
                                },
                                {
                                    label: '配方奶次數',
                                    data: formulaData,
                                    backgroundColor: 'rgba(135, 206, 235, 0.7)',
                                    borderColor: 'rgba(135, 206, 235, 1)',
                                    borderWidth: 1,
                                    yAxisID: 'y'
                                },
                                {
                                    label: '副食品次數',
                                    data: solidsData,
                                    backgroundColor: 'rgba(255, 212, 163, 0.7)',
                                    borderColor: 'rgba(255, 212, 163, 1)',
                                    borderWidth: 1,
                                    yAxisID: 'y'
                                },
                                {
                                    label: '配方奶總量 (ml)',
                                    data: formulaVolumeData,
                                    type: 'line',
                                    backgroundColor: 'rgba(144, 238, 144, 0.2)',
                                    borderColor: 'rgba(144, 238, 144, 1)',
                                    borderWidth: 2,
                                    fill: false,
                                    yAxisID: 'y1'
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                title: {
                                    display: true,
                                    text: '餵食統計（過去' + days + '天）'
                                },
                                legend: {
                                    display: true
                                }
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
                                        text: '次數'
                                    }
                                },
                                y1: {
                                    type: 'linear',
                                    display: true,
                                    position: 'right',
                                    title: {
                                        display: true,
                                        text: '配方奶總量 (ml)'
                                    },
                                    grid: {
                                        drawOnChartArea: false
                                    }
                                }
                            }
                        }
                    });
                })
                .catch(function(error) {
                    console.error('建立餵食圖表失敗:', error);
                });
        },
        
        /**
         * 建立睡眠統計圖表
         * @param {number} days 天數
         */
        createSleepChart: function(days) {
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
            
            DBManager.getByIndex(STORES.sleeps, 'childId', currentChild.childId)
                .then(function(records) {
                    // 篩選指定期間且有結束時間的記錄
                    const filteredRecords = records.filter(function(record) {
                        const recordDate = new Date(record.startTime);
                        return recordDate >= startDate && recordDate <= endDate && record.endTime;
                    });
                    
                    // 按日期分組
                    const dailyData = {};
                    for (let i = 0; i < days; i++) {
                        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
                        const dateKey = date.getFullYear() + '/' + 
                                       String(date.getMonth() + 1).padStart(2, '0') + '/' + 
                                       String(date.getDate()).padStart(2, '0');
                        dailyData[dateKey] = {
                            totalMinutes: 0,
                            sessions: 0
                        };
                    }
                    
                    filteredRecords.forEach(function(record) {
                        const recordDate = new Date(record.startTime);
                        const dateKey = recordDate.getFullYear() + '/' + 
                                       String(recordDate.getMonth() + 1).padStart(2, '0') + '/' + 
                                       String(recordDate.getDate()).padStart(2, '0');
                        
                        if (dailyData[dateKey]) {
                            const start = new Date(record.startTime);
                            const end = new Date(record.endTime);
                            const minutes = (end - start) / (1000 * 60);
                            dailyData[dateKey].totalMinutes += minutes;
                            dailyData[dateKey].sessions++;
                        }
                    });
                    
                    const labels = Object.keys(dailyData);
                    const totalHoursData = labels.map(function(date) { 
                        return (dailyData[date].totalMinutes / 60).toFixed(1); 
                    });
                    const sessionsData = labels.map(function(date) { 
                        return dailyData[date].sessions; 
                    });
                    
                    const ctx = document.getElementById('statisticsChart').getContext('2d');
                    currentChart = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: labels,
                            datasets: [
                                {
                                    label: '總睡眠時間 (小時)',
                                    data: totalHoursData,
                                    backgroundColor: 'rgba(186, 104, 200, 0.7)',
                                    borderColor: 'rgba(186, 104, 200, 1)',
                                    borderWidth: 1,
                                    yAxisID: 'y'
                                },
                                {
                                    label: '睡眠次數',
                                    data: sessionsData,
                                    type: 'line',
                                    backgroundColor: 'rgba(255, 159, 64, 0.2)',
                                    borderColor: 'rgba(255, 159, 64, 1)',
                                    borderWidth: 2,
                                    fill: false,
                                    yAxisID: 'y1'
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                title: {
                                    display: true,
                                    text: '睡眠統計（過去' + days + '天）'
                                },
                                legend: {
                                    display: true
                                }
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
                                        text: '睡眠時間 (小時)'
                                    }
                                },
                                y1: {
                                    type: 'linear',
                                    display: true,
                                    position: 'right',
                                    title: {
                                        display: true,
                                        text: '睡眠次數'
                                    },
                                    grid: {
                                        drawOnChartArea: false
                                    }
                                }
                            }
                        }
                    });
                })
                .catch(function(error) {
                    console.error('建立睡眠圖表失敗:', error);
                });
        },
        
        /**
         * 建立尿布統計圖表
         * @param {number} days 天數
         */
        createDiaperChart: function(days) {
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
            
            DBManager.getByIndex(STORES.diapers, 'childId', currentChild.childId)
                .then(function(records) {
                    // 篩選指定期間的記錄
                    const filteredRecords = records.filter(function(record) {
                        const recordDate = new Date(record.eventTime);
                        return recordDate >= startDate && recordDate <= endDate;
                    });
                    
                    // 按日期分組
                    const dailyData = {};
                    for (let i = 0; i < days; i++) {
                        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
                        const dateKey = date.getFullYear() + '/' + 
                                       String(date.getMonth() + 1).padStart(2, '0') + '/' + 
                                       String(date.getDate()).padStart(2, '0');
                        dailyData[dateKey] = {
                            '濕': 0,
                            '便': 0,
                            '混合': 0
                        };
                    }
                    
                    filteredRecords.forEach(function(record) {
                        const recordDate = new Date(record.eventTime);
                        const dateKey = recordDate.getFullYear() + '/' + 
                                       String(recordDate.getMonth() + 1).padStart(2, '0') + '/' + 
                                       String(recordDate.getDate()).padStart(2, '0');
                        
                        if (dailyData[dateKey]) {
                            dailyData[dateKey][record.type]++;
                        }
                    });
                    
                    const labels = Object.keys(dailyData);
                    const wetData = labels.map(function(date) { return dailyData[date]['濕']; });
                    const poopData = labels.map(function(date) { return dailyData[date]['便']; });
                    const mixedData = labels.map(function(date) { return dailyData[date]['混合']; });
                    
                    const ctx = document.getElementById('statisticsChart').getContext('2d');
                    currentChart = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: labels,
                            datasets: [
                                {
                                    label: '濕',
                                    data: wetData,
                                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                                    borderColor: 'rgba(54, 162, 235, 1)',
                                    borderWidth: 1
                                },
                                {
                                    label: '便',
                                    data: poopData,
                                    backgroundColor: 'rgba(165, 102, 45, 0.7)',
                                    borderColor: 'rgba(165, 102, 45, 1)',
                                    borderWidth: 1
                                },
                                {
                                    label: '混合',
                                    data: mixedData,
                                    backgroundColor: 'rgba(255, 206, 86, 0.7)',
                                    borderColor: 'rgba(255, 206, 86, 1)',
                                    borderWidth: 1
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                title: {
                                    display: true,
                                    text: '尿布統計（過去' + days + '天）'
                                },
                                legend: {
                                    display: true
                                }
                            },
                            scales: {
                                x: {
                                    display: true,
                                    title: {
                                        display: true,
                                        text: '日期'
                                    },
                                    stacked: true
                                },
                                y: {
                                    display: true,
                                    title: {
                                        display: true,
                                        text: '次數'
                                    },
                                    stacked: true
                                }
                            }
                        }
                    });
                })
                .catch(function(error) {
                    console.error('建立尿布圖表失敗:', error);
                });
        },
        
        /**
         * 建立活動統計圖表
         * @param {number} days 天數
         */
        createActivityChart: function(days) {
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
            
            DBManager.getByIndex(STORES.activities, 'childId', currentChild.childId)
                .then(function(records) {
                    // 篩選指定期間且有結束時間的記錄
                    const filteredRecords = records.filter(function(record) {
                        const recordDate = new Date(record.startTime);
                        return recordDate >= startDate && recordDate <= endDate && record.endTime;
                    });
                    
                    // 按活動類型分組
                    const activityData = {};
                    filteredRecords.forEach(function(record) {
                        if (!activityData[record.activityName]) {
                            activityData[record.activityName] = 0;
                        }
                        
                        const start = new Date(record.startTime);
                        const end = new Date(record.endTime);
                        const minutes = (end - start) / (1000 * 60);
                        activityData[record.activityName] += minutes;
                    });
                    
                    const labels = Object.keys(activityData);
                    const data = labels.map(function(activity) { 
                        return (activityData[activity] / 60).toFixed(1); // 轉換為小時
                    });
                    
                    // 產生不同顏色
                    const colors = [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 205, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 159, 64, 0.7)',
                        'rgba(199, 199, 199, 0.7)',
                        'rgba(83, 102, 255, 0.7)',
                        'rgba(255, 99, 255, 0.7)',
                        'rgba(99, 255, 132, 0.7)'
                    ];
                    
                    const backgroundColor = labels.map(function(label, index) {
                        return colors[index % colors.length];
                    });
                    
                    const ctx = document.getElementById('statisticsChart').getContext('2d');
                    currentChart = new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: labels,
                            datasets: [{
                                data: data,
                                backgroundColor: backgroundColor,
                                borderWidth: 2
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                title: {
                                    display: true,
                                    text: '活動時間分佈（過去' + days + '天）'
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
                })
                .catch(function(error) {
                    console.error('建立活動圖表失敗:', error);
                });
        },
        
        /**
         * 顯示模態視窗
         */
        showModal: function() {
            const modalOverlay = document.getElementById('modalOverlay');
            modalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        },
        
        /**
         * 關閉模態視窗
         */
        closeModal: function() {
            const modalOverlay = document.getElementById('modalOverlay');
            modalOverlay.classList.remove('active');
            document.body.style.overflow = '';
        },
        
        /**
         * 顯示Toast通知
         * @param {string} message 訊息內容
         * @param {string} type 類型（success, warning, error）
         */
        showToast: function(message, type) {
            const toastContainer = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            toast.className = 'toast ' + (type || 'success');
            
            toast.innerHTML = '<div class="toast-message">' + message + '</div>';
            
            toastContainer.appendChild(toast);
            
            // 3秒後自動移除
            setTimeout(function() {
                toast.style.animation = 'slideOut 0.3s forwards';
                setTimeout(function() {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }, 3000);
        }
    };
    
    /**
     * 圖表管理模組
     * 處理所有圖表相關功能
     */
    const ChartManager = {
        /**
         * 初始化圖表
         */
        init: function() {
            // Chart.js已經通過script標籤載入
            if (typeof Chart === 'undefined') {
                console.error('Chart.js未載入');
                return;
            }
            
            // 設定Chart.js預設值
            Chart.defaults.font.family = 'system-ui, -apple-system, "PingFang TC", "Microsoft JhengHei", "Helvetica Neue", sans-serif';
            Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text-primary');
        }
    };
    
    // 暴露公開方法
    return {
        /**
         * 初始化應用程式
         */
        init: function() {
            // 初始化資料庫
            DBManager.init()
                .then(function() {
                    console.log('資料庫初始化成功');
                    
                    // 初始化UI
                    UIManager.init();
                    
                    // 初始化圖表
                    ChartManager.init();
                    
                    // 載入孩子列表
                    UIManager.loadChildren();
                    
                    console.log('應用程式初始化完成');
                })
                .catch(function(error) {
                    console.error('資料庫初始化失敗:', error);
                    UIManager.showToast('應用程式初始化失敗: ' + error, 'error');
                });
        },
        
        // 暴露UI管理器的方法供外部使用
        UI: UIManager
    };
})();

// 當DOM載入完成時初始化應用程式
document.addEventListener('DOMContentLoaded', function() {
    BabyTrackerApp.init();
});

// 全域函數，用於HTML中的事件處理
window.UIManager = BabyTrackerApp.UI; 