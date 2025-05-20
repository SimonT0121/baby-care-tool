/**
 * 嬰幼兒照護追蹤系統 1.0.0
 * 一個純前端應用程式，專為疲憊的新手父母設計，使用 IndexedDB 儲存資料並保護隱私
 */

// 確保嚴格模式
"use strict";

// 應用程式主命名空間
const BabyTracker = (function() {
    // 私有變數與常數
    const DB_NAME = "BabyTrackerDB";
    const DB_VERSION = 1;
    const STORES = {
        CHILDREN: "children",
        FEEDINGS: "feedings",
        SLEEPS: "sleeps",
        DIAPERS: "diapers",
        HEALTH_MEASUREMENTS: "health_measurements",
        VACCINES: "vaccines",
        MEDICATIONS: "medications",
        CHECKUPS: "checkups",
        MILESTONES: "milestones",
        INTERACTIONS: "interactions",
        ACTIVITIES: "activities",
        SETTINGS: "settings"
    };
    
    // 默認設定值
    const DEFAULT_SETTINGS = {
        theme: "auto",
        timezone: "Asia/Taipei",
        quickActions: ["feeding", "sleep", "diaper", "health"],
        lastBackup: null
    };
    
    // 預設里程碑數據
    const DEFAULT_MILESTONES = {
        motor: [
            { id: "m1", title: "抬頭", description: "能夠穩定抬頭約 45 度", ageRange: "1-2 個月", sortOrder: 1, category: "motor", achieved: false, achievedDate: null, notes: "" },
            { id: "m2", title: "翻身", description: "能夠由腹部翻轉至背部，或由背部翻轉至腹部", ageRange: "3-5 個月", sortOrder: 2, category: "motor", achieved: false, achievedDate: null, notes: "" },
            { id: "m3", title: "坐立", description: "能夠在有支撐的情況下坐立，頭部穩定", ageRange: "4-6 個月", sortOrder: 3, category: "motor", achieved: false, achievedDate: null, notes: "" },
            { id: "m4", title: "獨立坐", description: "能夠不需支撐獨立坐立", ageRange: "6-8 個月", sortOrder: 4, category: "motor", achieved: false, achievedDate: null, notes: "" },
            { id: "m5", title: "爬行", description: "能夠用四肢移動身體", ageRange: "7-10 個月", sortOrder: 5, category: "motor", achieved: false, achievedDate: null, notes: "" },
            { id: "m6", title: "扶站", description: "能夠扶著物體站立", ageRange: "8-10 個月", sortOrder: 6, category: "motor", achieved: false, achievedDate: null, notes: "" },
            { id: "m7", title: "獨立站", description: "能夠短暫獨立站立", ageRange: "9-12 個月", sortOrder: 7, category: "motor", achieved: false, achievedDate: null, notes: "" },
            { id: "m8", title: "走路", description: "能夠獨立走幾步", ageRange: "11-15 個月", sortOrder: 8, category: "motor", achieved: false, achievedDate: null, notes: "" }
        ],
        language: [
            { id: "l1", title: "咕咕聲", description: "能發出簡單的咕咕聲", ageRange: "1-3 個月", sortOrder: 1, category: "language", achieved: false, achievedDate: null, notes: "" },
            { id: "l2", title: "咯咯笑", description: "開始發出咯咯笑聲", ageRange: "3-4 個月", sortOrder: 2, category: "language", achieved: false, achievedDate: null, notes: "" },
            { id: "l3", title: "牙牙學語", description: "開始牙牙學語，嘗試發音", ageRange: "4-6 個月", sortOrder: 3, category: "language", achieved: false, achievedDate: null, notes: "" },
            { id: "l4", title: "重複音節", description: "開始重複發音如「爸爸」、「媽媽」", ageRange: "6-9 個月", sortOrder: 4, category: "language", achieved: false, achievedDate: null, notes: "" },
            { id: "l5", title: "理解詞語", description: "開始理解簡單的詞語和指令", ageRange: "8-10 個月", sortOrder: 5, category: "language", achieved: false, achievedDate: null, notes: "" },
            { id: "l6", title: "首個詞語", description: "能說出第一個有意義的詞語", ageRange: "10-14 個月", sortOrder: 6, category: "language", achieved: false, achievedDate: null, notes: "" }
        ],
        social: [
            { id: "s1", title: "社交微笑", description: "對人微笑作為回應", ageRange: "1-3 個月", sortOrder: 1, category: "social", achieved: false, achievedDate: null, notes: "" },
            { id: "s2", title: "認出親人", description: "能夠認出親近的家人", ageRange: "3-5 個月", sortOrder: 2, category: "social", achieved: false, achievedDate: null, notes: "" },
            { id: "s3", title: "陌生人焦慮", description: "開始對陌生人表現出焦慮", ageRange: "6-8 個月", sortOrder: 3, category: "social", achieved: false, achievedDate: null, notes: "" },
            { id: "s4", title: "模仿動作", description: "開始模仿簡單的動作或表情", ageRange: "7-10 個月", sortOrder: 4, category: "social", achieved: false, achievedDate: null, notes: "" },
            { id: "s5", title: "玩躲貓貓", description: "理解並享受躲貓貓等簡單遊戲", ageRange: "8-10 個月", sortOrder: 5, category: "social", achieved: false, achievedDate: null, notes: "" },
            { id: "s6", title: "揮手再見", description: "能夠揮手表示再見或其他社交互動", ageRange: "9-12 個月", sortOrder: 6, category: "social", achieved: false, achievedDate: null, notes: "" }
        ],
        cognitive: [
            { id: "c1", title: "注視物體", description: "能夠集中注意力注視物體", ageRange: "0-2 個月", sortOrder: 1, category: "cognitive", achieved: false, achievedDate: null, notes: "" },
            { id: "c2", title: "追蹤移動", description: "能以眼睛追蹤移動的物體", ageRange: "2-4 個月", sortOrder: 2, category: "cognitive", achieved: false, achievedDate: null, notes: "" },
            { id: "c3", title: "物體永久性", description: "尋找被遮蓋的物體，理解物體永久性", ageRange: "5-8 個月", sortOrder: 3, category: "cognitive", achieved: false, achievedDate: null, notes: "" },
            { id: "c4", title: "因果關係", description: "開始理解簡單的因果關係", ageRange: "6-10 個月", sortOrder: 4, category: "cognitive", achieved: false, achievedDate: null, notes: "" },
            { id: "c5", title: "探索物體", description: "主動探索物體的功能和特性", ageRange: "8-12 個月", sortOrder: 5, category: "cognitive", achieved: false, achievedDate: null, notes: "" },
            { id: "c6", title: "使用工具", description: "開始使用簡單工具，如湯匙", ageRange: "10-14 個月", sortOrder: 6, category: "cognitive", achieved: false, achievedDate: null, notes: "" }
        ]
    };
    
    // 私有變數
    let db = null;
    let currentChildId = null;
    let settings = Object.assign({}, DEFAULT_SETTINGS);
    let currentPage = "dashboard";
    let sleepTimer = null;
    let lastBackupTime = null;
    let currentDateFilter = new Date();
    
    // 初始化IndexedDB
    async function initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = (event) => {
                console.error("IndexedDB error:", event.target.error);
                showToast("資料庫初始化失敗，請確認您的瀏覽器支援IndexedDB。", "error");
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                db = event.target.result;
                console.log("IndexedDB 連接成功");
                resolve(db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log("IndexedDB 升級中...");
                
                // 嬰幼兒資訊
                if (!db.objectStoreNames.contains(STORES.CHILDREN)) {
                    const childrenStore = db.createObjectStore(STORES.CHILDREN, { keyPath: "id" });
                    childrenStore.createIndex("name", "name", { unique: false });
                    childrenStore.createIndex("birthdate", "birthdate", { unique: false });
                }
                
                // 餵食記錄
                if (!db.objectStoreNames.contains(STORES.FEEDINGS)) {
                    const feedingsStore = db.createObjectStore(STORES.FEEDINGS, { keyPath: "id" });
                    feedingsStore.createIndex("childId", "childId", { unique: false });
                    feedingsStore.createIndex("timestamp", "timestamp", { unique: false });
                    feedingsStore.createIndex("type", "type", { unique: false });
                    feedingsStore.createIndex("childId_timestamp", ["childId", "timestamp"], { unique: false });
                }
                
                // 睡眠記錄
                if (!db.objectStoreNames.contains(STORES.SLEEPS)) {
                    const sleepsStore = db.createObjectStore(STORES.SLEEPS, { keyPath: "id" });
                    sleepsStore.createIndex("childId", "childId", { unique: false });
                    sleepsStore.createIndex("startTime", "startTime", { unique: false });
                    sleepsStore.createIndex("childId_startTime", ["childId", "startTime"], { unique: false });
                }
                
                // 尿布記錄
                if (!db.objectStoreNames.contains(STORES.DIAPERS)) {
                    const diapersStore = db.createObjectStore(STORES.DIAPERS, { keyPath: "id" });
                    diapersStore.createIndex("childId", "childId", { unique: false });
                    diapersStore.createIndex("timestamp", "timestamp", { unique: false });
                    diapersStore.createIndex("type", "type", { unique: false });
                    diapersStore.createIndex("childId_timestamp", ["childId", "timestamp"], { unique: false });
                }
                
                // 健康測量記錄
                if (!db.objectStoreNames.contains(STORES.HEALTH_MEASUREMENTS)) {
                    const healthStore = db.createObjectStore(STORES.HEALTH_MEASUREMENTS, { keyPath: "id" });
                    healthStore.createIndex("childId", "childId", { unique: false });
                    healthStore.createIndex("timestamp", "timestamp", { unique: false });
                    healthStore.createIndex("type", "type", { unique: false });
                    healthStore.createIndex("childId_type_timestamp", ["childId", "type", "timestamp"], { unique: false });
                }
                
                // 疫苗記錄
                if (!db.objectStoreNames.contains(STORES.VACCINES)) {
                    const vaccinesStore = db.createObjectStore(STORES.VACCINES, { keyPath: "id" });
                    vaccinesStore.createIndex("childId", "childId", { unique: false });
                    vaccinesStore.createIndex("date", "date", { unique: false });
                    vaccinesStore.createIndex("childId_date", ["childId", "date"], { unique: false });
                }
                
                // 用藥記錄
                if (!db.objectStoreNames.contains(STORES.MEDICATIONS)) {
                    const medicationsStore = db.createObjectStore(STORES.MEDICATIONS, { keyPath: "id" });
                    medicationsStore.createIndex("childId", "childId", { unique: false });
                    medicationsStore.createIndex("startDate", "startDate", { unique: false });
                    medicationsStore.createIndex("childId_startDate", ["childId", "startDate"], { unique: false });
                }
                
                // 健康檢查記錄
                if (!db.objectStoreNames.contains(STORES.CHECKUPS)) {
                    const checkupsStore = db.createObjectStore(STORES.CHECKUPS, { keyPath: "id" });
                    checkupsStore.createIndex("childId", "childId", { unique: false });
                    checkupsStore.createIndex("date", "date", { unique: false });
                    checkupsStore.createIndex("childId_date", ["childId", "date"], { unique: false });
                }
                
                // 里程碑記錄
                if (!db.objectStoreNames.contains(STORES.MILESTONES)) {
                    const milestonesStore = db.createObjectStore(STORES.MILESTONES, { keyPath: "id" });
                    milestonesStore.createIndex("childId", "childId", { unique: false });
                    milestonesStore.createIndex("category", "category", { unique: false });
                    milestonesStore.createIndex("achieved", "achieved", { unique: false });
                    milestonesStore.createIndex("childId_category", ["childId", "category"], { unique: false });
                }
                
                // 親子互動記錄
                if (!db.objectStoreNames.contains(STORES.INTERACTIONS)) {
                    const interactionsStore = db.createObjectStore(STORES.INTERACTIONS, { keyPath: "id" });
                    interactionsStore.createIndex("childId", "childId", { unique: false });
                    interactionsStore.createIndex("timestamp", "timestamp", { unique: false });
                    interactionsStore.createIndex("childId_timestamp", ["childId", "timestamp"], { unique: false });
                }
                
                // 日常活動記錄
                if (!db.objectStoreNames.contains(STORES.ACTIVITIES)) {
                    const activitiesStore = db.createObjectStore(STORES.ACTIVITIES, { keyPath: "id" });
                    activitiesStore.createIndex("childId", "childId", { unique: false });
                    activitiesStore.createIndex("timestamp", "timestamp", { unique: false });
                    activitiesStore.createIndex("type", "type", { unique: false });
                    activitiesStore.createIndex("childId_timestamp", ["childId", "timestamp"], { unique: false });
                }
                
                // 設定
                if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                    db.createObjectStore(STORES.SETTINGS, { keyPath: "id" });
                }
                
                console.log("IndexedDB 資料結構建立完成");
            };
        });
    }
    
    // 初始化預設里程碑
    async function initDefaultMilestones(childId) {
        try {
            // 檢查這個孩子是否已有里程碑記錄
            const existingMilestones = await getRecords(STORES.MILESTONES, "childId", childId);
            if (existingMilestones.length > 0) {
                return; // 已有記錄，不需要初始化
            }
            
            // 為每個預設里程碑類別添加記錄
            for (const category in DEFAULT_MILESTONES) {
                for (const milestone of DEFAULT_MILESTONES[category]) {
                    const newMilestone = {
                        ...milestone,
                        id: generateUniqueId(),
                        childId: childId
                    };
                    await addRecord(STORES.MILESTONES, newMilestone);
                }
            }
            console.log(`已為孩子 ${childId} 初始化預設里程碑`);
        } catch (error) {
            console.error("初始化預設里程碑時發生錯誤:", error);
        }
    }
    
    // 初始化應用程式設定
    async function initSettings() {
        try {
            const storedSettings = await getRecord(STORES.SETTINGS, "appSettings");
            if (storedSettings) {
                settings = Object.assign({}, DEFAULT_SETTINGS, storedSettings);
                lastBackupTime = settings.lastBackup;
            } else {
                // 如果沒有儲存的設定，使用預設值並保存
                await addRecord(STORES.SETTINGS, {
                    id: "appSettings",
                    ...DEFAULT_SETTINGS,
                    createdAt: new Date().toISOString()
                });
            }
            
            // 根據設定應用主題
            applyTheme(settings.theme);
            
            // 更新時區設定
            updateTimezoneSelect(settings.timezone);
            
            // 更新快速操作按鈕
            updateQuickActions(settings.quickActions);
            
            // 更新最後備份時間顯示
            updateLastBackupDisplay();
            
            console.log("初始化應用程式設定完成", settings);
        } catch (error) {
            console.error("初始化應用程式設定時發生錯誤:", error);
        }
    }
    
    // IndexedDB 操作函數
    // 添加記錄
    function addRecord(storeName, record) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error("資料庫未初始化"));
                return;
            }
            
            const transaction = db.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            const request = store.add(record);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => {
                console.error(`添加記錄至 ${storeName} 時發生錯誤:`, event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // 更新記錄
    function updateRecord(storeName, record) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error("資料庫未初始化"));
                return;
            }
            
            const transaction = db.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            const request = store.put(record);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => {
                console.error(`更新 ${storeName} 記錄時發生錯誤:`, event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // 刪除記錄
    function deleteRecord(storeName, id) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error("資料庫未初始化"));
                return;
            }
            
            const transaction = db.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = (event) => {
                console.error(`刪除 ${storeName} 記錄時發生錯誤:`, event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // 根據ID獲取記錄
    function getRecord(storeName, id) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error("資料庫未初始化"));
                return;
            }
            
            const transaction = db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => {
                console.error(`獲取 ${storeName} 記錄時發生錯誤:`, event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // 獲取所有記錄
    function getAllRecords(storeName) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error("資料庫未初始化"));
                return;
            }
            
            const transaction = db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => {
                console.error(`獲取所有 ${storeName} 記錄時發生錯誤:`, event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // 根據索引查詢記錄
    function getRecords(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error("資料庫未初始化"));
                return;
            }
            
            const transaction = db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => {
                console.error(`使用索引 ${indexName} 獲取 ${storeName} 記錄時發生錯誤:`, event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // 根據複合索引查詢記錄
    function getRecordsByCompoundIndex(storeName, indexName, values) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error("資料庫未初始化"));
                return;
            }
            
            const transaction = db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(values);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => {
                console.error(`使用複合索引 ${indexName} 獲取 ${storeName} 記錄時發生錯誤:`, event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // 使用範圍查詢記錄 (例如查詢某時間範圍內的記錄)
    function getRecordsInRange(storeName, indexName, lowerBound, upperBound, inclusive = true) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error("資料庫未初始化"));
                return;
            }
            
            const transaction = db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const range = IDBKeyRange.bound(lowerBound, upperBound, inclusive, inclusive);
            const request = index.getAll(range);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => {
                console.error(`查詢範圍內的 ${storeName} 記錄時發生錯誤:`, event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // 生成獨特ID的函數
    function generateUniqueId() {
        const timestamp = new Date().getTime();
        const randomPart = Math.floor(Math.random() * 10000);
        return `${timestamp}-${randomPart}`;
    }
    
    // 時間格式轉換函數
    function formatDate(date, includeYear = true) {
        if (!date) return "";
        
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        return includeYear ? `${year}/${month}/${day}` : `${month}/${day}`;
    }
    
    function formatTime(date) {
        if (!date) return "";
        
        const d = new Date(date);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        
        return `${hours}:${minutes}`;
    }
    
    function formatDateTime(date) {
        if (!date) return "";
        return `${formatDate(date)} ${formatTime(date)}`;
    }
    
    // 計算兩個日期之間的差異（返回天、小時、分鐘）
    function getTimeDifference(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffMs = end - start;
        
        const hours = Math.floor(diffMs / 1000 / 60 / 60);
        const minutes = Math.floor((diffMs / 1000 / 60) % 60);
        
        if (hours < 1) {
            return `${minutes} 分鐘`;
        } else {
            return `${hours} 小時 ${minutes} 分鐘`;
        }
    }
    
    // 計算年齡
    function calculateAge(birthdate) {
        if (!birthdate) return "";
        
        const birth = new Date(birthdate);
        const now = new Date();
        
        let months = (now.getFullYear() - birth.getFullYear()) * 12;
        months -= birth.getMonth();
        months += now.getMonth();
        
        if (now.getDate() < birth.getDate()) {
            months--;
        }
        
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        const days = Math.max(0, now.getDate() - birth.getDate());
        
        if (years > 0) {
            return remainingMonths > 0 ? `${years} 歲 ${remainingMonths} 個月` : `${years} 歲`;
        } else if (months > 0) {
            return days > 0 ? `${months} 個月 ${days} 天` : `${months} 個月`;
        } else {
            return `${days} 天`;
        }
    }
    
    // 獲取當天的開始時間和結束時間 (採用當地時區)
    function getDayBoundaries(date) {
        const d = new Date(date);
        const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
        const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
        
        return {
            start: startOfDay.toISOString(),
            end: endOfDay.toISOString()
        };
    }
    
    // 根據日期返回前N天
    function getPreviousDays(date, numDays) {
        const result = [];
        const currentDate = new Date(date);
        
        for (let i = 0; i < numDays; i++) {
            const day = new Date(currentDate);
            day.setDate(day.getDate() - i);
            result.unshift(day);
        }
        
        return result;
    }
    
    // 圖表相關函數
    function createBasicChart(ctx, type, labels, datasets, options = {}) {
        // 深色模式判斷
        const isDarkMode = document.body.classList.contains('dark-theme');
        
        // 默認配置
        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: datasets.length > 1,
                    position: 'top',
                    labels: {
                        color: isDarkMode ? '#e0e0e0' : '#303030',
                        font: {
                            family: "'Noto Sans TC', 'Helvetica Neue', Arial, sans-serif"
                        }
                    }
                },
                tooltip: {
                    backgroundColor: isDarkMode ? '#252525' : '#ffffff',
                    titleColor: isDarkMode ? '#e0e0e0' : '#303030',
                    bodyColor: isDarkMode ? '#b0b0b0' : '#606060',
                    borderColor: isDarkMode ? '#383838' : '#e0e0e0',
                    borderWidth: 1,
                    boxPadding: 6,
                    cornerRadius: 8,
                    bodyFont: {
                        family: "'Noto Sans TC', 'Helvetica Neue', Arial, sans-serif"
                    },
                    titleFont: {
                        family: "'Noto Sans TC', 'Helvetica Neue', Arial, sans-serif"
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: isDarkMode ? '#383838' : '#e0e0e0'
                    },
                    ticks: {
                        color: isDarkMode ? '#b0b0b0' : '#606060',
                        font: {
                            family: "'Noto Sans TC', 'Helvetica Neue', Arial, sans-serif"
                        }
                    }
                },
                y: {
                    grid: {
                        color: isDarkMode ? '#383838' : '#e0e0e0'
                    },
                    ticks: {
                        color: isDarkMode ? '#b0b0b0' : '#606060',
                        font: {
                            family: "'Noto Sans TC', 'Helvetica Neue', Arial, sans-serif"
                        }
                    }
                }
            }
        };
        
        // 合併選項
        const mergedOptions = Object.assign({}, defaultOptions, options);
        
        // 如果已有圖表實例，摧毀它
        if (ctx.chart) {
            ctx.chart.destroy();
        }
        
        // 創建新圖表
        ctx.chart = new Chart(ctx, {
            type: type,
            data: {
                labels: labels,
                datasets: datasets
            },
            options: mergedOptions
        });
        
        return ctx.chart;
    }
    
    // UI操作相關函數
    // 顯示提示訊息
    function showToast(message, type = "info") {
        const toastContainer = document.getElementById("toast-container");
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        
        let icon = "";
        switch (type) {
            case "success":
                icon = '<i class="fas fa-check-circle toast-icon"></i>';
                break;
            case "warning":
                icon = '<i class="fas fa-exclamation-triangle toast-icon"></i>';
                break;
            case "error":
                icon = '<i class="fas fa-times-circle toast-icon"></i>';
                break;
            default:
                icon = '<i class="fas fa-info-circle toast-icon"></i>';
                break;
        }
        
        toast.innerHTML = `
            ${icon}
            <div class="toast-message">${message}</div>
        `;
        
        toastContainer.appendChild(toast);
        
        // 設定提示訊息移除的計時器
        setTimeout(() => {
            toast.style.opacity = "0";
            setTimeout(() => {
                if (toast.parentNode) {
                    toastContainer.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
    
    // 顯示模態框
    function showModal(title, content, onConfirm = null, showCancel = true) {
        const modalContainer = document.getElementById("modal-container");
        const modalTitle = document.getElementById("modal-title");
        const modalContent = document.getElementById("modal-content");
        const modalConfirm = document.getElementById("modal-confirm");
        const modalCancel = document.getElementById("modal-cancel");
        
        modalTitle.textContent = title;
        modalContent.innerHTML = content;
        
        // 設定確認按鈕事件
        modalConfirm.onclick = () => {
            if (onConfirm && typeof onConfirm === 'function') {
                onConfirm();
            }
            hideModal();
        };
        
        // 顯示/隱藏取消按鈕
        modalCancel.style.display = showCancel ? "block" : "none";
        
        // 顯示模態框
        modalContainer.classList.remove("hidden");
    }
    
    // 隱藏模態框
    function hideModal() {
        const modalContainer = document.getElementById("modal-container");
        modalContainer.classList.add("hidden");
    }
    
    // 顯示日期選擇器
    function showDatePicker(onSelect, initialDate = new Date()) {
        const datePickerContainer = document.getElementById("date-picker-container");
        const currentDate = initialDate ? new Date(initialDate) : new Date();
        
        // 更新日期選擇器的月份與年份顯示
        updateDatePickerDisplay(currentDate);
        
        // 日期選擇事件
        document.querySelectorAll("#date-picker-days .date-day").forEach(day => {
            day.addEventListener("click", function() {
                if (this.classList.contains("other-month")) return; // 不選擇其他月份的日期
                
                // 移除先前的選擇
                document.querySelectorAll("#date-picker-days .date-day.selected").forEach(el => {
                    el.classList.remove("selected");
                });
                
                // 添加新的選擇
                this.classList.add("selected");
                
                // 獲取選擇的日期
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth();
                const day = parseInt(this.textContent);
                const selectedDate = new Date(year, month, day);
                
                // 觸發選擇回調
                if (onSelect && typeof onSelect === 'function') {
                    onSelect(selectedDate);
                }
                
                // 隱藏日期選擇器
                hideDatePicker();
            });
        });
        
        // 今天按鈕事件
        document.getElementById("date-picker-today").onclick = function() {
            const today = new Date();
            if (onSelect && typeof onSelect === 'function') {
                onSelect(today);
            }
            hideDatePicker();
        };
        
        // 關閉按鈕事件
        document.getElementById("date-picker-close").onclick = hideDatePicker;
        
        // 上個月按鈕事件
        document.getElementById("date-picker-prev").onclick = function() {
            currentDate.setMonth(currentDate.getMonth() - 1);
            updateDatePickerDisplay(currentDate);
        };
        
        // 下個月按鈕事件
        document.getElementById("date-picker-next").onclick = function() {
            currentDate.setMonth(currentDate.getMonth() + 1);
            updateDatePickerDisplay(currentDate);
        };
        
        // 點擊背景關閉
        document.querySelector(".date-picker-backdrop").onclick = hideDatePicker;
        
        // 顯示日期選擇器
        datePickerContainer.classList.remove("hidden");
    }
    
    // 隱藏日期選擇器
    function hideDatePicker() {
        const datePickerContainer = document.getElementById("date-picker-container");
        datePickerContainer.classList.add("hidden");
    }
    
    // 更新日期選擇器顯示
    function updateDatePickerDisplay(date) {
        const monthYearDisplay = document.getElementById("date-picker-month-year");
        const daysContainer = document.getElementById("date-picker-days");
        
        // 設定月份與年份
        const year = date.getFullYear();
        const month = date.getMonth();
        const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
        monthYearDisplay.textContent = `${year}年${monthNames[month]}`;
        
        // 清空日期容器
        daysContainer.innerHTML = "";
        
        // 獲取當月第一天是星期幾 (0 = 星期日)
        const firstDay = new Date(year, month, 1).getDay();
        
        // 獲取當月天數
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // 獲取上個月天數
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        
        // 獲取今天日期
        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
        const todayDate = today.getDate();
        
        // 添加上個月的天數
        for (let i = 0; i < firstDay; i++) {
            const dayElement = document.createElement("div");
            const prevMonthDay = daysInPrevMonth - firstDay + i + 1;
            dayElement.textContent = prevMonthDay;
            dayElement.className = "date-day other-month";
            daysContainer.appendChild(dayElement);
        }
        
        // 添加當月天數
        for (let i = 1; i <= daysInMonth; i++) {
            const dayElement = document.createElement("div");
            dayElement.textContent = i;
            dayElement.className = "date-day";
            
            // 如果是今天，添加特殊樣式
            if (isCurrentMonth && i === todayDate) {
                dayElement.classList.add("today");
            }
            
            daysContainer.appendChild(dayElement);
        }
        
        // 添加下個月的天數 (填滿日曆)
        const totalCells = 42; // 6行 x 7列
        const cellsToAdd = totalCells - (firstDay + daysInMonth);
        for (let i = 1; i <= cellsToAdd; i++) {
            const dayElement = document.createElement("div");
            dayElement.textContent = i;
            dayElement.className = "date-day other-month";
            daysContainer.appendChild(dayElement);
        }
    }
    
    // 應用主題
    function applyTheme(theme) {
        const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const body = document.body;
        
        if (theme === "auto") {
            if (prefersDarkMode) {
                body.classList.add("dark-theme");
                document.getElementById("theme-toggle").innerHTML = '<i class="fas fa-sun"></i>';
            } else {
                body.classList.remove("dark-theme");
                document.getElementById("theme-toggle").innerHTML = '<i class="fas fa-moon"></i>';
            }
        } else if (theme === "dark") {
            body.classList.add("dark-theme");
            document.getElementById("theme-toggle").innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            body.classList.remove("dark-theme");
            document.getElementById("theme-toggle").innerHTML = '<i class="fas fa-moon"></i>';
        }
        
        // 更新設定選擇器
        if (document.getElementById("theme-select")) {
            document.getElementById("theme-select").value = theme;
        }
        
        // 重新載入所有圖表以應用新主題
        refreshAllCharts();
    }
    
    // 更新時區選擇器
    function updateTimezoneSelect(timezone) {
        const select = document.getElementById("timezone-select");
        if (select && timezone) {
            select.value = timezone;
        }
    }
    
    // 更新快速操作按鈕
    function updateQuickActions(actions) {
        // 更新快速操作區的按鈕顯示
        const quickActions = document.getElementById("quick-actions");
        quickActions.innerHTML = '';
        
        if (actions && actions.length > 0) {
            actions.forEach(action => {
                let icon, text;
                switch (action) {
                    case "feeding":
                        icon = "fas fa-utensils";
                        text = "餵食";
                        break;
                    case "sleep":
                        icon = "fas fa-moon";
                        text = "睡眠";
                        break;
                    case "diaper":
                        icon = "fas fa-baby";
                        text = "尿布";
                        break;
                    case "health":
                        icon = "fas fa-heartbeat";
                        text = "健康";
                        break;
                    case "activity":
                        icon = "fas fa-running";
                        text = "活動";
                        break;
                    default:
                        icon = "fas fa-star";
                        text = action;
                }
                
                const button = document.createElement("button");
                button.className = "quick-btn";
                button.setAttribute("data-action", action);
                button.innerHTML = `
                    <i class="${icon}"></i>
                    <span>${text}</span>
                `;
                
                // 添加事件監聽器
                button.addEventListener("click", function() {
                    handleQuickAction(action);
                });
                
                quickActions.appendChild(button);
            });
        }
        
        // 更新設定頁的複選框
        if (document.getElementById("quick-feeding")) {
            document.getElementById("quick-feeding").checked = actions && actions.includes("feeding");
            document.getElementById("quick-sleep").checked = actions && actions.includes("sleep");
            document.getElementById("quick-diaper").checked = actions && actions.includes("diaper");
            document.getElementById("quick-health").checked = actions && actions.includes("health");
            document.getElementById("quick-activity").checked = actions && actions.includes("activity");
        }
    }
    
    // 更新最後備份時間顯示
    function updateLastBackupDisplay() {
        const lastBackupElement = document.getElementById("last-backup-time");
        if (lastBackupElement) {
            if (lastBackupTime) {
                lastBackupElement.textContent = formatDateTime(lastBackupTime);
            } else {
                lastBackupElement.textContent = "從未備份";
            }
        }
    }
    
    // 處理快速操作
    function handleQuickAction(action) {
        // 檢查是否選擇了孩子
        if (!currentChildId) {
            showToast("請先選擇或新增一個寶寶檔案", "warning");
            return;
        }
        
        switch (action) {
            case "feeding":
                showAddFeedingModal();
                break;
            case "sleep":
                showAddSleepModal();
                break;
            case "diaper":
                showAddDiaperModal();
                break;
            case "health":
                showAddHealthMeasurementModal();
                break;
            case "activity":
                showAddActivityModal();
                break;
        }
    }
    
    // 頁面導航
    function navigateToPage(pageId) {
        const pages = document.querySelectorAll(".page");
        const navLinks = document.querySelectorAll(".nav-links a");
        
        // 隱藏所有頁面
        pages.forEach(page => {
            page.classList.remove("active");
        });
        
        // 移除所有導航連結的活躍狀態
        navLinks.forEach(link => {
            link.classList.remove("active");
        });
        
        // 顯示指定頁面
        const targetPage = document.getElementById(pageId + "-page");
        if (targetPage) {
            targetPage.classList.add("active");
            
            // 添加導航連結的活躍狀態
            const navLink = document.querySelector(`.nav-links a[data-page="${pageId}"]`);
            if (navLink) {
                navLink.classList.add("active");
            }
            
            // 如果在移動設備上，隱藏導航抽屜
            const navContent = document.getElementById("nav-content");
            if (window.innerWidth < 768 && navContent.style.display === "block") {
                navContent.style.display = "none";
            }
            
            // 更新當前頁面
            currentPage = pageId;
            
            // 載入頁面相關數據
            loadPageData(pageId);
        }
    }
    
    // 載入頁面相關數據
    async function loadPageData(pageId) {
        // 如果沒有選擇孩子，僅載入某些頁面的數據
        if (!currentChildId) {
            if (pageId === "settings") {
                // 載入設定頁面數據
                await loadSettingsPageData();
            }
            return;
        }
        
        // 根據頁面ID加載相關數據
        switch (pageId) {
            case "dashboard":
                await loadDashboardData();
                break;
            case "feeding":
                await loadFeedingRecords();
                break;
            case "sleep":
                await loadSleepRecords();
                break;
            case "diaper":
                await loadDiaperRecords();
                break;
            case "health":
                // 預設顯示一般健康標籤
                document.querySelectorAll("#health-page .tab-btn").forEach(btn => {
                    btn.classList.remove("active");
                });
                document.querySelectorAll("#health-page .tab-pane").forEach(pane => {
                    pane.classList.remove("active");
                });
                document.querySelector('#health-page .tab-btn[data-tab="health-general"]').classList.add("active");
                document.getElementById("health-general-tab").classList.add("active");
                
                await loadHealthData();
                break;
            case "milestone":
                // 預設顯示動作發展標籤
                document.querySelectorAll("#milestone-page .tab-btn").forEach(btn => {
                    btn.classList.remove("active");
                });
                document.querySelectorAll("#milestone-page .tab-pane").forEach(pane => {
                    pane.classList.remove("active");
                });
                document.querySelector('#milestone-page .tab-btn[data-tab="milestone-motor"]').classList.add("active");
                document.getElementById("milestone-motor-tab").classList.add("active");
                
                await loadMilestoneData();
                break;
            case "interaction":
                await loadInteractionRecords();
                break;
            case "activity":
                await loadActivityRecords();
                break;
            case "report":
                await loadReportData();
                break;
            case "settings":
                await loadSettingsPageData();
                break;
        }
    }
    
    // 檢查進行中的睡眠
    async function checkOngoingSleep() {
        if (!currentChildId) return null;
        
        try {
            // 獲取該孩子所有睡眠記錄
            const sleepRecords = await getRecords(STORES.SLEEPS, "childId", currentChildId);
            
            // 尋找正在進行中的睡眠（有開始時間但沒有結束時間）
            const ongoingSleep = sleepRecords.find(sleep => sleep.startTime && !sleep.endTime);
            
            return ongoingSleep;
        } catch (error) {
            console.error("檢查進行中的睡眠時發生錯誤:", error);
            return null;
        }
    }
    
    // 更新睡眠計時器顯示
    function updateSleepTimer(sleepRecord) {
        // 如果沒有正在進行中的睡眠，停止計時器
        if (!sleepRecord) {
            if (sleepTimer) {
                clearInterval(sleepTimer);
                sleepTimer = null;
            }
            
            // 隱藏目前睡眠按鈕
            const currentSleepBtn = document.getElementById("current-sleep-btn");
            if (currentSleepBtn) {
                currentSleepBtn.classList.add("hidden");
                currentSleepBtn.innerHTML = '<i class="fas fa-stopwatch"></i> 目前睡眠中';
            }
            
            return;
        }
        
        // 顯示目前睡眠按鈕
        const currentSleepBtn = document.getElementById("current-sleep-btn");
        if (currentSleepBtn) {
            currentSleepBtn.classList.remove("hidden");
            
            // 設置按鈕點擊事件為結束睡眠
            currentSleepBtn.onclick = function() {
                showEndSleepModal(sleepRecord);
            };
        }
        
        // 清除並重新開始計時器
        if (sleepTimer) {
            clearInterval(sleepTimer);
        }
        
        sleepTimer = setInterval(() => {
            const startTime = new Date(sleepRecord.startTime);
            const now = new Date();
            const duration = now - startTime;
            
            // 計算小時和分鐘
            const hours = Math.floor(duration / 1000 / 60 / 60);
            const minutes = Math.floor((duration / 1000 / 60) % 60);
            
            // 更新按鈕文字
            if (currentSleepBtn) {
                currentSleepBtn.innerHTML = `<i class="fas fa-stopwatch"></i> 睡眠中: ${hours}小時${minutes}分鐘`;
            }
        }, 1000);
    }
    
    // 顯示添加寶寶模態框
    function showAddChildModal(childData = null) {
        // 準備模態內容
        const isUpdate = childData !== null;
        const modalTitle = isUpdate ? "編輯寶寶資料" : "新增寶寶";
        
        // 今天日期作為預設出生日期
        const today = new Date();
        const birthdate = isUpdate && childData.birthdate ? childData.birthdate : today.toISOString().split('T')[0];
        
        const modalContent = `
            <div class="form-group">
                <label for="child-name">寶寶姓名 *</label>
                <input type="text" id="child-name" value="${isUpdate ? childData.name : ''}" placeholder="請輸入寶寶姓名" required>
            </div>
            <div class="form-group">
                <label for="child-birthdate">出生日期 *</label>
                <input type="date" id="child-birthdate" value="${birthdate}" required>
            </div>
            <div class="form-group">
                <label>性別</label>
                <div class="radio-group">
                    <div class="radio-btn">
                        <input type="radio" id="gender-male" name="child-gender" value="male" ${isUpdate && childData.gender === "male" ? "checked" : ""}>
                        <label for="gender-male">
                            <i class="fas fa-mars"></i>
                            男孩
                        </label>
                    </div>
                    <div class="radio-btn">
                        <input type="radio" id="gender-female" name="child-gender" value="female" ${isUpdate && childData.gender === "female" ? "checked" : ""}>
                        <label for="gender-female">
                            <i class="fas fa-venus"></i>
                            女孩
                        </label>
                    </div>
                    <div class="radio-btn">
                        <input type="radio" id="gender-other" name="child-gender" value="other" ${isUpdate && childData.gender === "other" ? "checked" : ""}>
                        <label for="gender-other">
                            <i class="fas fa-genderless"></i>
                            其他
                        </label>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label for="child-photo">照片</label>
                <input type="file" id="child-photo" accept="image/*">
                ${isUpdate && childData.photo ? `<div class="preview-photo"><img src="${childData.photo}" alt="${childData.name}" style="max-width: 100px; max-height: 100px; margin-top: 8px;"></div>` : ''}
            </div>
            <div class="form-group">
                <label for="child-notes">備註</label>
                <textarea id="child-notes" placeholder="可填寫寶寶的特徵、喜好等備註資訊">${isUpdate && childData.notes ? childData.notes : ''}</textarea>
            </div>
        `;
        
        // 設定確認動作
        const onConfirm = async function() {
            // 表單驗證
            const nameInput = document.getElementById("child-name");
            const birthdateInput = document.getElementById("child-birthdate");
            
            if (!nameInput.value.trim()) {
                showToast("請輸入寶寶姓名", "warning");
                return;
            }
            
            if (!birthdateInput.value) {
                showToast("請選擇出生日期", "warning");
                return;
            }
            
            // 準備資料
            const genderRadios = document.getElementsByName("child-gender");
            let selectedGender = "other";
            for (const radio of genderRadios) {
                if (radio.checked) {
                    selectedGender = radio.value;
                    break;
                }
            }
            
            // 處理照片
            const photoInput = document.getElementById("child-photo");
            let photoBase64 = isUpdate ? childData.photo : null;
            
            if (photoInput.files && photoInput.files[0]) {
                try {
                    photoBase64 = await readFileAsDataURL(photoInput.files[0]);
                } catch (error) {
                    console.error("讀取照片時發生錯誤:", error);
                    showToast("照片處理失敗，請選擇較小的檔案或不同格式", "error");
                    return;
                }
            }
            
            // 創建或更新孩子記錄
            try {
                const childRecord = {
                    name: nameInput.value.trim(),
                    birthdate: birthdateInput.value,
                    gender: selectedGender,
                    photo: photoBase64,
                    notes: document.getElementById("child-notes").value.trim(),
                    updatedAt: new Date().toISOString()
                };
                
                if (isUpdate) {
                    // 更新記錄
                    childRecord.id = childData.id;
                    childRecord.createdAt = childData.createdAt;
                    await updateRecord(STORES.CHILDREN, childRecord);
                    showToast(`${childRecord.name} 資料已更新`, "success");
                } else {
                    // 創建新記錄
                    childRecord.id = generateUniqueId();
                    childRecord.createdAt = new Date().toISOString();
                    await addRecord(STORES.CHILDREN, childRecord);
                    
                    // 為新孩子初始化預設里程碑
                    await initDefaultMilestones(childRecord.id);
                    
                    showToast(`已添加 ${childRecord.name}`, "success");
                    
                    // 如果是第一個孩子，自動選擇
                    const children = await getAllRecords(STORES.CHILDREN);
                    if (children.length === 1) {
                        await selectChild(childRecord.id);
                    }
                }
                
                // 重新加載孩子選擇器
                loadChildSelector();
            } catch (error) {
                console.error("儲存寶寶資料時發生錯誤:", error);
                showToast("儲存失敗，請稍後再試", "error");
            }
            
            hideModal();
        };
        
        showModal(modalTitle, modalContent, onConfirm);
    }
    
    // 將檔案讀取為DataURL (Base64)
    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error("檔案讀取失敗"));
            
            reader.readAsDataURL(file);
        });
    }
    
    // 顯示管理寶寶模態框
    async function showManageChildrenModal() {
        try {
            // 獲取所有孩子記錄
            const children = await getAllRecords(STORES.CHILDREN);
            
            let childrenListHTML = '';
            
            if (children.length === 0) {
                childrenListHTML = '<p class="empty-state">尚未添加寶寶資料。點擊「新增寶寶」按鈕開始使用。</p>';
            } else {
                children.forEach(child => {
                    const age = calculateAge(child.birthdate);
                    const photoSrc = child.photo || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="35" r="20" fill="%23ddd"/%3E%3Cpath d="M50 60 C 30 60 15 80 15 100 L 85 100 C 85 80 70 60 50 60 Z" fill="%23ddd"/%3E%3C/svg%3E';
                    
                    childrenListHTML += `
                        <div class="child-item" data-id="${child.id}">
                            <div class="child-item-content">
                                <div class="child-item-photo">
                                    <img src="${photoSrc}" alt="${child.name}">
                                </div>
                                <div class="child-item-details">
                                    <h4>${child.name}</h4>
                                    <p>${age}（${formatDate(child.birthdate)}）</p>
                                </div>
                            </div>
                            <div class="child-item-actions">
                                <button class="edit-child-btn" data-id="${child.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="delete-child-btn" data-id="${child.id}">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                    `;
                });
            }
            
            const modalContent = `
                <div class="manage-children-content">
                    <button id="add-new-child-btn" class="primary-btn">
                        <i class="fas fa-plus"></i> 新增寶寶
                    </button>
                    <div class="children-list">
                        ${childrenListHTML}
                    </div>
                </div>
            `;
            
            showModal("管理寶寶檔案", modalContent, null, true);
            
            // 為新增按鈕添加事件
            document.getElementById("add-new-child-btn").addEventListener("click", function() {
                hideModal();
                showAddChildModal();
            });
            
            // 為編輯按鈕添加事件
            document.querySelectorAll(".edit-child-btn").forEach(btn => {
                btn.addEventListener("click", async function() {
                    const childId = this.getAttribute("data-id");
                    try {
                        const childData = await getRecord(STORES.CHILDREN, childId);
                        hideModal();
                        showAddChildModal(childData);
                    } catch (error) {
                        console.error("獲取寶寶資料時發生錯誤:", error);
                        showToast("無法獲取寶寶資料", "error");
                    }
                });
            });
            
            // 為刪除按鈕添加事件
            document.querySelectorAll(".delete-child-btn").forEach(btn => {
                btn.addEventListener("click", function() {
                    const childId = this.getAttribute("data-id");
                    const childName = this.closest(".child-item").querySelector("h4").textContent;
                    showDeleteChildConfirmation(childId, childName);
                });
            });
            
            // 為孩子項目添加點擊事件（選擇該孩子）
            document.querySelectorAll(".child-item-content").forEach(item => {
                item.addEventListener("click", function() {
                    const childId = this.closest(".child-item").getAttribute("data-id");
                    selectChild(childId);
                    hideModal();
                });
            });
            
            // 添加樣式
            const style = document.createElement("style");
            style.textContent = `
                .manage-children-content {
                    padding-bottom: var(--spacing);
                }
                .children-list {
                    margin-top: var(--spacing);
                }
                .child-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--spacing);
                    border-bottom: 1px solid var(--divider-color);
                }
                .child-item:last-child {
                    border-bottom: none;
                }
                .child-item-content {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    flex: 1;
                }
                .child-item-photo {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    overflow: hidden;
                    margin-right: var(--spacing);
                    background-color: var(--surface-variant);
                }
                .child-item-photo img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .child-item-details h4 {
                    margin: 0;
                    font-weight: 500;
                }
                .child-item-details p {
                    margin: 0;
                    color: var(--text-secondary);
                    font-size: var(--font-size-sm);
                }
                .child-item-actions {
                    display: flex;
                    gap: var(--spacing-sm);
                }
                .child-item-actions button {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    border-radius: 50%;
                    transition: background-color var(--transition-fast);
                }
                .child-item-actions button:hover {
                    background-color: var(--surface-variant);
                }
                .edit-child-btn:hover {
                    color: var(--primary-color);
                }
                .delete-child-btn:hover {
                    color: var(--danger-color);
                }
            `;
            
            document.getElementById("modal-content").appendChild(style);
            
        } catch (error) {
            console.error("獲取寶寶資料時發生錯誤:", error);
            showToast("無法載入寶寶資料", "error");
        }
    }
    
    // 顯示刪除孩子確認
    function showDeleteChildConfirmation(childId, childName) {
        const confirmContent = `
            <p>您確定要刪除 <strong>${childName}</strong> 的所有資料嗎？</p>
            <p style="color: var(--danger-color);">此操作無法復原，所有與該寶寶相關的記錄都將被永久刪除。</p>
        `;
        
        const onConfirm = async function() {
            try {
                // 刪除孩子的所有相關記錄
                await deleteAllChildRecords(childId);
                
                // 重新載入孩子選擇器
                loadChildSelector();
                
                // 如果刪除的是當前選擇的孩子，重置選擇
                if (childId === currentChildId) {
                    await resetChildSelection();
                }
                
                showToast(`已刪除 ${childName} 的所有資料`, "success");
            } catch (error) {
                console.error("刪除寶寶資料時發生錯誤:", error);
                showToast("刪除失敗，請稍後再試", "error");
            }
            
            hideModal();
        };
        
        showModal(`刪除 ${childName}`, confirmContent, onConfirm);
    }
    
    // 刪除孩子所有相關記錄
    async function deleteAllChildRecords(childId) {
        const stores = Object.values(STORES);
        
        for (const storeName of stores) {
            // 處理孩子主記錄
            if (storeName === STORES.CHILDREN) {
                await deleteRecord(storeName, childId);
                continue;
            }
            
            // 處理孩子的相關記錄
            try {
                // 獲取該孩子的所有相關記錄
                const records = await getRecords(storeName, "childId", childId);
                
                // 逐個刪除記錄
                for (const record of records) {
                    await deleteRecord(storeName, record.id);
                }
            } catch (error) {
                console.warn(`刪除 ${storeName} 中孩子 ${childId} 的記錄時發生錯誤:`, error);
                // 繼續刪除其他記錄，不中斷流程
            }
        }
    }
    
    // 重置孩子選擇
    async function resetChildSelection() {
        currentChildId = null;
        
        // 更新 UI
        document.getElementById("current-child-photo").src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="35" r="20" fill="%23ddd"/%3E%3Cpath d="M50 60 C 30 60 15 80 15 100 L 85 100 C 85 80 70 60 50 60 Z" fill="%23ddd"/%3E%3C/svg%3E';
        document.getElementById("current-child-name").textContent = "歡迎使用";
        document.getElementById("current-child-age").textContent = "請點選左上角的選單選擇或新增寶寶";
        
        // 取消選擇器中的選擇
        const select = document.getElementById("current-child");
        if (select) select.value = "";
        
        // 重置各頁面數據
        resetPageData();
        
        // 導航到儀表板
        navigateToPage("dashboard");
    }
    
    // 重置頁面數據
    function resetPageData() {
         // 儀表板
    document.getElementById("today-feeding-summary").innerHTML = "<p>尚無記錄</p>";
    document.getElementById("today-sleep-summary").innerHTML = "<p>尚無記錄</p>";
    document.getElementById("today-diaper-summary").innerHTML = "<p>尚無記錄</p>";
    document.getElementById("recent-activities").innerHTML = "<p>尚無記錄</p>";
    
    // 清除圖表
    const sleepChartCtx = document.getElementById("sleep-chart").getContext("2d");
    if (sleepChartCtx.chart) sleepChartCtx.chart.destroy();
    
    const feedingChartCtx = document.getElementById("feeding-chart").getContext("2d");
    if (feedingChartCtx.chart) feedingChartCtx.chart.destroy();
    
    // 其他頁面的數據重置
    document.getElementById("feeding-records").innerHTML = '<p class="empty-state">尚無餵食記錄。點擊「新增餵食記錄」按鈕開始追蹤。</p>';
    document.getElementById("sleep-records").innerHTML = '<p class="empty-state">尚無睡眠記錄。點擊「新增睡眠記錄」按鈕開始追蹤。</p>';
    document.getElementById("diaper-records").innerHTML = '<p class="empty-state">尚無尿布記錄。點擊「新增尿布記錄」按鈕開始追蹤。</p>';
    document.getElementById("interaction-records").innerHTML = '<p class="empty-state">尚無互動記錄。點擊「新增互動記錄」按鈕開始記錄美好時光。</p>';
    document.getElementById("activity-records").innerHTML = '<p class="empty-state">尚無活動記錄。點擊「新增活動」按鈕開始記錄。</p>';
    
    // 健康頁面重置
    document.getElementById("latest-weight").textContent = "--";
    document.getElementById("latest-height").textContent = "--";
    document.getElementById("latest-temperature").textContent = "--";
    document.getElementById("latest-head").textContent = "--";
    
    const weightChartCtx = document.getElementById("weight-chart").getContext("2d");
    if (weightChartCtx.chart) weightChartCtx.chart.destroy();
    
    const heightChartCtx = document.getElementById("height-chart").getContext("2d");
    if (heightChartCtx.chart) heightChartCtx.chart.destroy();
    
    const tempChartCtx = document.getElementById("temperature-chart").getContext("2d");
    if (tempChartCtx.chart) tempChartCtx.chart.destroy();
    
    const headChartCtx = document.getElementById("head-chart").getContext("2d");
    if (headChartCtx.chart) headChartCtx.chart.destroy();
    
    // 報告頁面重置
    document.getElementById("feeding-report-summary").innerHTML = "<p>選擇時間區間以顯示餵食統計資料。</p>";
    document.getElementById("sleep-report-summary").innerHTML = "<p>選擇時間區間以顯示睡眠統計資料。</p>";
    document.getElementById("diaper-report-summary").innerHTML = "<p>選擇時間區間以顯示尿布統計資料。</p>";
    document.getElementById("growth-report-summary").innerHTML = "<p>選擇時間區間以顯示生長發展統計資料。</p>";
}

// 載入孩子選擇器
async function loadChildSelector() {
    const select = document.getElementById("current-child");
    
    try {
        // 獲取所有孩子記錄
        const children = await getAllRecords(STORES.CHILDREN);
        
        // 清空選擇器
        select.innerHTML = '<option value="">請選擇寶寶...</option>';
        
        // 添加孩子選項
        children.forEach(child => {
            const option = document.createElement("option");
            option.value = child.id;
            option.textContent = child.name;
            select.appendChild(option);
        });
        
        // 如果有當前選擇的孩子，設置選擇器
        if (currentChildId) {
            select.value = currentChildId;
        }
    } catch (error) {
        console.error("獲取寶寶資料時發生錯誤:", error);
        showToast("無法載入寶寶資料", "error");
    }
}

// 選擇孩子
async function selectChild(childId) {
    try {
        // 獲取孩子資料
        const childData = await getRecord(STORES.CHILDREN, childId);
        
        if (!childData) {
            showToast("找不到寶寶資料", "error");
            return;
        }
        
        // 設置當前孩子 ID
        currentChildId = childId;
        
        // 更新孩子選擇器
        const select = document.getElementById("current-child");
        select.value = childId;
        
        // 更新儀表板上的孩子資訊
        document.getElementById("current-child-name").textContent = childData.name;
        document.getElementById("current-child-age").textContent = calculateAge(childData.birthdate);
        
        if (childData.photo) {
            document.getElementById("current-child-photo").src = childData.photo;
        } else {
            document.getElementById("current-child-photo").src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="35" r="20" fill="%23ddd"/%3E%3Cpath d="M50 60 C 30 60 15 80 15 100 L 85 100 C 85 80 70 60 50 60 Z" fill="%23ddd"/%3E%3C/svg%3E';
        }
        
        // 載入當前頁面數據
        loadPageData(currentPage);
        
        // 檢查進行中的睡眠
        const ongoingSleep = await checkOngoingSleep();
        updateSleepTimer(ongoingSleep);
        
        showToast(`已選擇 ${childData.name}`, "success");
    } catch (error) {
        console.error("選擇寶寶時發生錯誤:", error);
        showToast("無法載入寶寶資料", "error");
    }
}

// 載入儀表板數據
async function loadDashboardData() {
    if (!currentChildId) return;
    
    try {
        // 取得今日日期範圍
        const today = new Date();
        const dayBoundaries = getDayBoundaries(today);
        
        // 載入今日餵食摘要
        await loadTodayFeedingSummary(dayBoundaries);
        
        // 載入今日睡眠摘要
        await loadTodaySleepSummary(dayBoundaries);
        
        // 載入今日尿布摘要
        await loadTodayDiaperSummary(dayBoundaries);
        
        // 載入最近活動
        await loadRecentActivities();
        
        // 載入睡眠圖表
        await loadSleepChart();
        
        // 載入餵食圖表
        await loadFeedingChart();
    } catch (error) {
        console.error("載入儀表板數據時發生錯誤:", error);
        showToast("載入儀表板數據失敗", "error");
    }
}

// 載入今日餵食摘要
async function loadTodayFeedingSummary(dayBoundaries) {
    try {
        // 獲取今日餵食記錄
        const feedingRecords = await getRecordsInRange(
            STORES.FEEDINGS,
            "childId_timestamp",
            [currentChildId, dayBoundaries.start],
            [currentChildId, dayBoundaries.end]
        );
        
        const summaryElement = document.getElementById("today-feeding-summary");
        
        if (feedingRecords.length === 0) {
            summaryElement.innerHTML = "<p>今日尚無餵食記錄</p>";
            return;
        }
        
        // 統計各類型餵食
        const breastCount = feedingRecords.filter(r => r.type === "breast").length;
        const formulaCount = feedingRecords.filter(r => r.type === "formula").length;
        const solidCount = feedingRecords.filter(r => r.type === "solid").length;
        
        // 計算配方奶總量
        const totalFormulaMl = feedingRecords
            .filter(r => r.type === "formula" && r.amount)
            .reduce((total, r) => total + parseFloat(r.amount), 0);
        
        // 顯示摘要
        let summaryHTML = "<ul>";
        
        if (breastCount > 0) {
            summaryHTML += `<li>母乳餵食: ${breastCount} 次</li>`;
        }
        
        if (formulaCount > 0) {
            summaryHTML += `<li>配方奶: ${formulaCount} 次 (共 ${totalFormulaMl.toFixed(0)} ml)</li>`;
        }
        
        if (solidCount > 0) {
            summaryHTML += `<li>副食品: ${solidCount} 次</li>`;
        }
        
        // 最近一次餵食時間
        const latestFeeding = feedingRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        const timeAgo = getTimeAgo(latestFeeding.timestamp);
        
        summaryHTML += `<li>最近餵食: ${timeAgo}</li>`;
        summaryHTML += "</ul>";
        
        summaryElement.innerHTML = summaryHTML;
    } catch (error) {
        console.error("載入今日餵食摘要時發生錯誤:", error);
        document.getElementById("today-feeding-summary").innerHTML = "<p>載入失敗</p>";
    }
}

// 取得經過時間的友好描述
function getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    
    const diffMinutes = Math.floor(diffMs / 1000 / 60);
    
    if (diffMinutes < 1) {
        return "剛剛";
    } else if (diffMinutes < 60) {
        return `${diffMinutes} 分鐘前`;
    } else {
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) {
            return `${diffHours} 小時前`;
        } else {
            return formatDateTime(timestamp);
        }
    }
}

// 載入今日睡眠摘要
async function loadTodaySleepSummary(dayBoundaries) {
    try {
        // 獲取當天或交叉當天的睡眠記錄
        const sleepRecords = await getRecords(STORES.SLEEPS, "childId", currentChildId);
        
        // 過濾出今天的睡眠記錄 (開始時間或結束時間在今天範圍內)
        const todaySleeps = sleepRecords.filter(sleep => {
            const startTime = new Date(sleep.startTime);
            const endTime = sleep.endTime ? new Date(sleep.endTime) : new Date();
            
            const dayStart = new Date(dayBoundaries.start);
            const dayEnd = new Date(dayBoundaries.end);
            
            return (startTime <= dayEnd && endTime >= dayStart);
        });
        
        const summaryElement = document.getElementById("today-sleep-summary");
        
        if (todaySleeps.length === 0) {
            summaryElement.innerHTML = "<p>今日尚無睡眠記錄</p>";
            return;
        }
        
        // 計算今日總睡眠時間
        let totalSleepMs = 0;
        
        todaySleeps.forEach(sleep => {
            const startTime = new Date(sleep.startTime);
            const endTime = sleep.endTime ? new Date(sleep.endTime) : new Date();
            
            // 調整為僅計算當天部分
            const dayStart = new Date(dayBoundaries.start);
            const dayEnd = new Date(dayBoundaries.end);
            
            const effectiveStart = startTime < dayStart ? dayStart : startTime;
            const effectiveEnd = endTime > dayEnd ? dayEnd : endTime;
            
            totalSleepMs += (effectiveEnd - effectiveStart);
        });
        
        // 轉換為小時和分鐘
        const totalHours = Math.floor(totalSleepMs / 1000 / 60 / 60);
        const totalMinutes = Math.floor((totalSleepMs / 1000 / 60) % 60);
        
        // 進行中的睡眠
        const ongoingSleep = todaySleeps.find(s => !s.endTime);
        
        // 顯示摘要
        let summaryHTML = "<ul>";
        summaryHTML += `<li>今日總睡眠: ${totalHours} 小時 ${totalMinutes} 分鐘</li>`;
        summaryHTML += `<li>睡眠次數: ${todaySleeps.length} 次</li>`;
        
        if (ongoingSleep) {
            const startTime = new Date(ongoingSleep.startTime);
            const now = new Date();
            const durationMs = now - startTime;
            const hours = Math.floor(durationMs / 1000 / 60 / 60);
            const minutes = Math.floor((durationMs / 1000 / 60) % 60);
            
            summaryHTML += `<li>目前狀態: <span style="color: var(--primary-color);">睡眠中 (${hours}小時${minutes}分鐘)</span></li>`;
        } else {
            // 最近一次睡眠
            const latestSleep = todaySleeps.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0];
            const endTime = latestSleep.endTime ? new Date(latestSleep.endTime) : new Date();
            const timeAgo = getTimeAgo(endTime);
            
            summaryHTML += `<li>最近睡眠: ${timeAgo}結束</li>`;
        }
        
        summaryHTML += "</ul>";
        
        summaryElement.innerHTML = summaryHTML;
    } catch (error) {
        console.error("載入今日睡眠摘要時發生錯誤:", error);
        document.getElementById("today-sleep-summary").innerHTML = "<p>載入失敗</p>";
    }
}

// 載入今日尿布摘要
async function loadTodayDiaperSummary(dayBoundaries) {
    try {
        // 獲取今日尿布記錄
        const diaperRecords = await getRecordsInRange(
            STORES.DIAPERS,
            "childId_timestamp",
            [currentChildId, dayBoundaries.start],
            [currentChildId, dayBoundaries.end]
        );
        
        const summaryElement = document.getElementById("today-diaper-summary");
        
        if (diaperRecords.length === 0) {
            summaryElement.innerHTML = "<p>今日尚無尿布記錄</p>";
            return;
        }
        
        // 統計各類型尿布
        const wetCount = diaperRecords.filter(r => r.type === "wet").length;
        const dirtyCount = diaperRecords.filter(r => r.type === "dirty").length;
        const mixedCount = diaperRecords.filter(r => r.type === "mixed").length;
        
        // 顯示摘要
        let summaryHTML = "<ul>";
        summaryHTML += `<li>今日尿布總數: ${diaperRecords.length} 片</li>`;
        
        if (wetCount > 0) {
            summaryHTML += `<li>濕尿布: ${wetCount} 片</li>`;
        }
        
        if (dirtyCount > 0) {
            summaryHTML += `<li>大便尿布: ${dirtyCount} 片</li>`;
        }
        
        if (mixedCount > 0) {
            summaryHTML += `<li>混合尿布: ${mixedCount} 片</li>`;
        }
        
        // 最近一次換尿布時間
        const latestDiaper = diaperRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        const timeAgo = getTimeAgo(latestDiaper.timestamp);
        
        summaryHTML += `<li>最近換尿布: ${timeAgo}</li>`;
        summaryHTML += "</ul>";
        
        summaryElement.innerHTML = summaryHTML;
    } catch (error) {
        console.error("載入今日尿布摘要時發生錯誤:", error);
        document.getElementById("today-diaper-summary").innerHTML = "<p>載入失敗</p>";
    }
}

// 載入最近活動
async function loadRecentActivities() {
    try {
        // 獲取各類最近記錄
        const feedings = await getRecords(STORES.FEEDINGS, "childId", currentChildId);
        const sleeps = await getRecords(STORES.SLEEPS, "childId", currentChildId);
        const diapers = await getRecords(STORES.DIAPERS, "childId", currentChildId);
        const activities = await getRecords(STORES.ACTIVITIES, "childId", currentChildId);
        
        // 合併並排序所有活動
        const allActivities = [];
        
        feedings.forEach(feeding => {
            allActivities.push({
                type: "feeding",
                timestamp: feeding.timestamp,
                data: feeding
            });
        });
        
        sleeps.forEach(sleep => {
            const timestamp = sleep.endTime || sleep.startTime;
            allActivities.push({
                type: "sleep",
                timestamp: timestamp,
                data: sleep
            });
        });
        
        diapers.forEach(diaper => {
            allActivities.push({
                type: "diaper",
                timestamp: diaper.timestamp,
                data: diaper
            });
        });
        
        activities.forEach(activity => {
            allActivities.push({
                type: "activity",
                timestamp: activity.timestamp,
                data: activity
            });
        });
        
        // 按時間排序 (最新的在前)
        allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // 顯示最近 5 筆活動
        const recentActivitiesElement = document.getElementById("recent-activities");
        
        if (allActivities.length === 0) {
            recentActivitiesElement.innerHTML = "<p>尚無活動記錄</p>";
            return;
        }
        
        let html = "<ul>";
        
        for (let i = 0; i < Math.min(5, allActivities.length); i++) {
            const activity = allActivities[i];
            const timeAgo = getTimeAgo(activity.timestamp);
            
            let activityText = "";
            
            switch (activity.type) {
                case "feeding":
                    let feedingType = "";
                    switch (activity.data.type) {
                        case "breast":
                            feedingType = "母乳餵食";
                            break;
                        case "formula":
                            feedingType = `配方奶 ${activity.data.amount || ""} ml`;
                            break;
                        case "solid":
                            feedingType = `副食品`;
                            break;
                    }
                    activityText = `<i class="fas fa-utensils"></i> ${feedingType}`;
                    break;
                    
                case "sleep":
                    if (activity.data.endTime) {
                        const duration = getTimeDifference(activity.data.startTime, activity.data.endTime);
                        activityText = `<i class="fas fa-moon"></i> 睡眠 (${duration})`;
                    } else {
                        activityText = `<i class="fas fa-moon"></i> 睡眠中`;
                    }
                    break;
                    
                case "diaper":
                    let diaperType = "";
                    switch (activity.data.type) {
                        case "wet":
                            diaperType = "濕尿布";
                            break;
                        case "dirty":
                            diaperType = "大便尿布";
                            break;
                        case "mixed":
                            diaperType = "混合尿布";
                            break;
                    }
                    activityText = `<i class="fas fa-baby"></i> ${diaperType}`;
                    break;
                    
                case "activity":
                    let activityType = "";
                    switch (activity.data.type) {
                        case "bath":
                            activityType = "洗澡";
                            break;
                        case "play":
                            activityType = "遊戲";
                            break;
                        case "massage":
                            activityType = "按摩";
                            break;
                        default:
                            activityType = activity.data.type;
                    }
                    activityText = `<i class="fas fa-running"></i> ${activityType}`;
                    break;
            }
            
            html += `<li>${activityText} <span class="time-ago">${timeAgo}</span></li>`;
        }
        
        html += "</ul>";
        
        recentActivitiesElement.innerHTML = html;
        
        // 添加樣式
        const style = document.createElement("style");
        style.textContent = `
            #recent-activities ul {
                list-style: none;
                margin: 0;
                padding: 0;
            }
            #recent-activities li {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: var(--spacing-sm);
            }
            #recent-activities li:last-child {
                margin-bottom: 0;
            }
            .time-ago {
                color: var(--text-hint);
                font-size: var(--font-size-xs);
            }
        `;
        
        recentActivitiesElement.appendChild(style);
    } catch (error) {
        console.error("載入最近活動時發生錯誤:", error);
        document.getElementById("recent-activities").innerHTML = "<p>載入失敗</p>";
    }
}

// 載入睡眠圖表
async function loadSleepChart() {
    try {
        // 獲取最近 7 天的日期
        const today = new Date();
        const last7Days = getPreviousDays(today, 7);
        
        // 每天的睡眠時間記錄
        const dailySleepData = [];
        
        // 為每一天計算睡眠時間
        for (const day of last7Days) {
            const dayBoundaries = getDayBoundaries(day);
            
            // 獲取該孩子的所有睡眠記錄
            const sleepRecords = await getRecords(STORES.SLEEPS, "childId", currentChildId);
            
            // 過濾出該天的睡眠記錄 (開始時間或結束時間在該天範圍內)
            const daySleeps = sleepRecords.filter(sleep => {
                const startTime = new Date(sleep.startTime);
                const endTime = sleep.endTime ? new Date(sleep.endTime) : new Date();
                
                const dayStart = new Date(dayBoundaries.start);
                const dayEnd = new Date(dayBoundaries.end);
                
                return (startTime <= dayEnd && endTime >= dayStart);
            });
            
            // 計算該天總睡眠時間
            let totalSleepMs = 0;
            
            daySleeps.forEach(sleep => {
                const startTime = new Date(sleep.startTime);
                const endTime = sleep.endTime ? new Date(sleep.endTime) : new Date();
                
                // 調整為僅計算當天部分
                const dayStart = new Date(dayBoundaries.start);
                const dayEnd = new Date(dayBoundaries.end);
                
                const effectiveStart = startTime < dayStart ? dayStart : startTime;
                const effectiveEnd = endTime > dayEnd ? dayEnd : endTime;
                
                totalSleepMs += (effectiveEnd - effectiveStart);
            });
            
            // 轉換為小時
            const totalHours = totalSleepMs / 1000 / 60 / 60;
            
            // 添加到日期陣列
            dailySleepData.push({
                date: formatDate(day, false),
                hours: parseFloat(totalHours.toFixed(1))
            });
        }
        
        // 創建圖表
        const ctx = document.getElementById("sleep-chart").getContext("2d");
        
        // 圖表標籤
        const labels = dailySleepData.map(item => item.date);
        
        // 圖表數據
        const data = dailySleepData.map(item => item.hours);
        
        // 定義 dataset
        const datasets = [
            {
                label: '睡眠時數',
                data: data,
                backgroundColor: 'rgba(75, 174, 209, 0.2)',
                borderColor: 'rgba(75, 174, 209, 1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }
        ];
        
        // 圖表選項
        const options = {
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '小時'
                    }
                }
            }
        };
        
        // 創建圖表
        createBasicChart(ctx, 'line', labels, datasets, options);
    } catch (error) {
        console.error("載入睡眠圖表時發生錯誤:", error);
    }
}

// 載入餵食圖表
async function loadFeedingChart() {
    try {
        // 獲取最近 7 天的日期
        const today = new Date();
        const last7Days = getPreviousDays(today, 7);
        
        // 每天的餵食次數記錄
        const dailyFeedingCounts = [];
        
        // 為每一天計算餵食次數
        for (const day of last7Days) {
            const dayBoundaries = getDayBoundaries(day);
            
            // 獲取該天的餵食記錄
            const feedingRecords = await getRecordsInRange(
                STORES.FEEDINGS,
                "childId_timestamp",
                [currentChildId, dayBoundaries.start],
                [currentChildId, dayBoundaries.end]
            );
            
            // 統計各類型餵食
            const breastCount = feedingRecords.filter(r => r.type === "breast").length;
            const formulaCount = feedingRecords.filter(r => r.type === "formula").length;
            const solidCount = feedingRecords.filter(r => r.type === "solid").length;
            
            // 添加到日期陣列
            dailyFeedingCounts.push({
                date: formatDate(day, false),
                breast: breastCount,
                formula: formulaCount,
                solid: solidCount
            });
        }
        
        // 創建圖表
        const ctx = document.getElementById("feeding-chart").getContext("2d");
        
        // 圖表標籤
        const labels = dailyFeedingCounts.map(item => item.date);
        
        // 定義 datasets
        const datasets = [
            {
                label: '母乳',
                data: dailyFeedingCounts.map(item => item.breast),
                backgroundColor: 'rgba(241, 165, 165, 0.7)',
                borderWidth: 0,
                borderRadius: 4
            },
            {
                label: '配方奶',
                data: dailyFeedingCounts.map(item => item.formula),
                backgroundColor: 'rgba(97, 154, 236, 0.7)',
                borderWidth: 0,
                borderRadius: 4
            },
            {
                label: '副食品',
                data: dailyFeedingCounts.map(item => item.solid),
                backgroundColor: 'rgba(109, 183, 108, 0.7)',
                borderWidth: 0,
                borderRadius: 4
            }
        ];
        
        // 圖表選項
        const options = {
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '次數'
                    },
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        };
        
        // 創建圖表
        createBasicChart(ctx, 'bar', labels, datasets, options);
    } catch (error) {
        console.error("載入餵食圖表時發生錯誤:", error);
    }
}

// 顯示添加餵食記錄模態框
function showAddFeedingModal(feedingData = null) {
    // 準備模態內容
    const isUpdate = feedingData !== null;
    const modalTitle = isUpdate ? "編輯餵食記錄" : "新增餵食記錄";
    
    // 預設值設定
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const feedingDate = isUpdate ? new Date(feedingData.timestamp).toISOString().split('T')[0] : dateStr;
    const feedingTime = isUpdate ? formatTime(feedingData.timestamp) : timeStr;
    const feedingType = isUpdate ? feedingData.type : "breast";
    const feedingAmount = isUpdate && feedingData.amount ? feedingData.amount : "";
    const feedingNote = isUpdate && feedingData.notes ? feedingData.notes : "";
    
    const modalContent = `
        <div class="form-group">
            <label for="feeding-date">日期 *</label>
            <input type="date" id="feeding-date" value="${feedingDate}" required>
        </div>
        <div class="form-group">
            <label for="feeding-time">時間 *</label>
            <input type="time" id="feeding-time" value="${feedingTime}" required>
        </div>
        <div class="form-group">
            <label>餵食類型 *</label>
            <div class="radio-group">
                <div class="radio-btn">
                    <input type="radio" id="feeding-breast" name="feeding-type" value="breast" ${feedingType === "breast" ? "checked" : ""}>
                    <label for="feeding-breast">
                        <i class="fas fa-baby"></i>
                        母乳
                    </label>
                </div>
                <div class="radio-btn">
                    <input type="radio" id="feeding-formula" name="feeding-type" value="formula" ${feedingType === "formula" ? "checked" : ""}>
                    <label for="feeding-formula">
                        <i class="fas fa-baby-carriage"></i>
                        配方奶
                    </label>
                </div>
                <div class="radio-btn">
                    <input type="radio" id="feeding-solid" name="feeding-type" value="solid" ${feedingType === "solid" ? "checked" : ""}>
                    <label for="feeding-solid">
                        <i class="fas fa-utensils"></i>
                        副食品
                    </label>
                </div>
            </div>
        </div>
        <div id="formula-amount-group" class="form-group" ${feedingType !== "formula" ? "style='display:none;'" : ""}>
            <label for="feeding-amount">奶量 (ml)</label>
            <input type="number" id="feeding-amount" value="${feedingAmount}" placeholder="輸入毫升數量">
        </div>
        <div id="solid-food-group" class="form-group" ${feedingType !== "solid" ? "style='display:none;'" : ""}>
            <label for="feeding-food">食物內容</label>
            <input type="text" id="feeding-food" value="${isUpdate && feedingData.food ? feedingData.food : ""}" placeholder="例如：蘋果泥、米糊">
        </div>
        <div class="form-group">
            <label for="feeding-note">備註</label>
            <textarea id="feeding-note" placeholder="可記錄餵食過程中的觀察或特殊情況">${feedingNote}</textarea>
        </div>
    `;
    
    // 設定確認動作
    const onConfirm = async function() {
        // 表單驗證
        const dateInput = document.getElementById("feeding-date");
        const timeInput = document.getElementById("feeding-time");
        
        if (!dateInput.value || !timeInput.value) {
            showToast("請填寫日期和時間", "warning");
            return;
        }
        
        // 獲取選擇的餵食類型
        const typeRadios = document.getElementsByName("feeding-type");
        let selectedType = "breast";
        for (const radio of typeRadios) {
            if (radio.checked) {
                selectedType = radio.value;
                break;
            }
        }
        
        // 構建時間戳
        const dateTimeStr = `${dateInput.value}T${timeInput.value}:00`;
        const timestamp = new Date(dateTimeStr).toISOString();
        
        // 準備餵食記錄
        const feedingRecord = {
            childId: currentChildId,
            timestamp: timestamp,
            type: selectedType,
            notes: document.getElementById("feeding-note").value.trim()
        };
        
        // 根據類型添加額外數據
        if (selectedType === "formula") {
            feedingRecord.amount = document.getElementById("feeding-amount").value || null;
        } else if (selectedType === "solid") {
            feedingRecord.food = document.getElementById("feeding-food").value.trim() || null;
        }
        
        try {
            if (isUpdate) {
                // 更新記錄
                feedingRecord.id = feedingData.id;
                feedingRecord.createdAt = feedingData.createdAt;
                feedingRecord.updatedAt = new Date().toISOString();
                
                await updateRecord(STORES.FEEDINGS, feedingRecord);
                showToast("餵食記錄已更新", "success");
            } else {
                // 創建新記錄
                feedingRecord.id = generateUniqueId();
                feedingRecord.createdAt = new Date().toISOString();
                
                await addRecord(STORES.FEEDINGS, feedingRecord);
                showToast("已添加餵食記錄", "success");
            }
            
            // 重新載入數據
            if (currentPage === "feeding") {
                loadFeedingRecords();
            } else if (currentPage === "dashboard") {
                loadDashboardData();
            }
        } catch (error) {
            console.error("儲存餵食記錄時發生錯誤:", error);
            showToast("儲存失敗，請稍後再試", "error");
        }
        
        hideModal();
    };
    
    showModal(modalTitle, modalContent, onConfirm);
    
    // 為餵食類型添加事件處理
    document.getElementsByName("feeding-type").forEach(radio => {
        radio.addEventListener("change", function() {
            const formulaAmountGroup = document.getElementById("formula-amount-group");
            const solidFoodGroup = document.getElementById("solid-food-group");
            
            if (this.value === "formula") {
                formulaAmountGroup.style.display = "block";
                solidFoodGroup.style.display = "none";
            } else if (this.value === "solid") {
                formulaAmountGroup.style.display = "none";
                solidFoodGroup.style.display = "block";
            } else {
                formulaAmountGroup.style.display = "none";
                solidFoodGroup.style.display = "none";
            }
        });
    });
}

// 載入餵食記錄
async function loadFeedingRecords() {
    if (!currentChildId) return;
    
    try {
        // 獲取所有餵食記錄
        const feedingRecords = await getRecords(STORES.FEEDINGS, "childId", currentChildId);
        
        // 獲取過濾設置
        const filterSelect = document.getElementById("feeding-filter");
        const filter = filterSelect.value;
        
        // 過濾記錄
        let filteredRecords = feedingRecords;
        if (filter !== "all") {
            filteredRecords = feedingRecords.filter(record => record.type === filter);
        }
        
        // 按時間排序 (最新的在前)
        filteredRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // 顯示記錄
        const recordsContainer = document.getElementById("feeding-records");
        
        if (filteredRecords.length === 0) {
            recordsContainer.innerHTML = '<p class="empty-state">無符合條件的餵食記錄。</p>';
            return;
        }
        
        let html = "";
        
        filteredRecords.forEach(record => {
            const date = formatDate(record.timestamp);
            const time = formatTime(record.timestamp);
            
            let typeText = "";
            let detailText = "";
            
            switch (record.type) {
                case "breast":
                    typeText = '<span class="record-badge breast"><i class="fas fa-baby"></i> 母乳</span>';
                    break;
                case "formula":
                    typeText = '<span class="record-badge formula"><i class="fas fa-baby-carriage"></i> 配方奶</span>';
                    if (record.amount) {
                        detailText = `<div class="record-detail">奶量: ${record.amount} ml</div>`;
                    }
                    break;
                case "solid":
                    typeText = '<span class="record-badge solid"><i class="fas fa-utensils"></i> 副食品</span>';
                    if (record.food) {
                        detailText = `<div class="record-detail">食物: ${record.food}</div>`;
                    }
                    break;
            }
            
            html += `
                <div class="record-item" data-id="${record.id}">
                    <div class="record-header">
                        <div class="record-title">
                            ${typeText}
                        </div>
                        <div class="record-time">${date} ${time}</div>
                    </div>
                    ${detailText}
                    ${record.notes ? `<div class="record-content">${record.notes}</div>` : ''}
                    <div class="record-actions">
                        <button class="edit-record-btn" data-id="${record.id}">
                            <i class="fas fa-edit"></i> 編輯
                        </button>
                        <button class="delete-record-btn" data-id="${record.id}">
                            <i class="fas fa-trash-alt"></i> 刪除
                        </button>
                    </div>
                </div>
            `;
        });
        
        recordsContainer.innerHTML = html;
        
        // 添加事件處理
        document.querySelectorAll(".edit-record-btn").forEach(btn => {
            btn.addEventListener("click", async function() {
                const recordId = this.getAttribute("data-id");
                const record = await getRecord(STORES.FEEDINGS, recordId);
                if (record) {
                    showAddFeedingModal(record);
                }
            });
        });
        
        document.querySelectorAll(".delete-record-btn").forEach(btn => {
            btn.addEventListener("click", function() {
                const recordId = this.getAttribute("data-id");
                showDeleteRecordConfirmation(STORES.FEEDINGS, recordId, "餵食記錄", () => {
                    loadFeedingRecords();
                    if (currentPage === "dashboard") {
                        loadDashboardData();
                    }
                });
            });
        });
        
        // 添加樣式
        const style = document.createElement("style");
        style.textContent = `
            .record-badge {
                display: inline-block;
                padding: var(--spacing-xs) var(--spacing-sm);
                border-radius: var(--border-radius-sm);
                font-size: var(--font-size-sm);
                font-weight: 500;
            }
            .record-badge.breast {
                background-color: rgba(241, 165, 165, 0.2);
                color: #e07979;
            }
            .record-badge.formula {
                background-color: rgba(97, 154, 236, 0.2);
                color: #4a86d5;
            }
            .record-badge.solid {
                background-color: rgba(109, 183, 108, 0.2);
                color: #4e9b4d;
            }
            .record-detail {
                font-size: var(--font-size-sm);
                color: var(--text-secondary);
                margin-bottom: var(--spacing-sm);
            }
        `;
        
        recordsContainer.appendChild(style);
    } catch (error) {
        console.error("載入餵食記錄時發生錯誤:", error);
        document.getElementById("feeding-records").innerHTML = '<p class="empty-state">載入失敗，請稍後再試。</p>';
    }
}

// 顯示刪除記錄確認
function showDeleteRecordConfirmation(storeName, recordId, recordType, onSuccess = null) {
    const confirmContent = `
        <p>您確定要刪除這筆${recordType}嗎？</p>
        <p style="color: var(--danger-color);">此操作無法復原。</p>
    `;
    
    const onConfirm = async function() {
        try {
            await deleteRecord(storeName, recordId);
            showToast(`已刪除${recordType}`, "success");
            
            if (onSuccess && typeof onSuccess === 'function') {
                onSuccess();
            }
        } catch (error) {
            console.error(`刪除${recordType}時發生錯誤:`, error);
            showToast(`刪除失敗，請稍後再試`, "error");
        }
        
        hideModal();
    };
    
    showModal(`刪除${recordType}`, confirmContent, onConfirm);
}

// 顯示添加睡眠記錄模態框
function showAddSleepModal(sleepData = null) {
    // 準備模態內容
    const isUpdate = sleepData !== null;
    const modalTitle = isUpdate ? "編輯睡眠記錄" : "新增睡眠記錄";
    
    // 預設值設定
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const startDate = isUpdate ? new Date(sleepData.startTime).toISOString().split('T')[0] : dateStr;
    const startTime = isUpdate ? formatTime(sleepData.startTime) : timeStr;
    
    const hasEndTime = isUpdate && sleepData.endTime;
    const endDate = hasEndTime ? new Date(sleepData.endTime).toISOString().split('T')[0] : dateStr;
    const endTime = hasEndTime ? formatTime(sleepData.endTime) : "";
    
    const sleepNote = isUpdate && sleepData.notes ? sleepData.notes : "";
    
    const modalContent = `
        <div class="form-group">
            <label for="sleep-start-date">開始日期 *</label>
            <input type="date" id="sleep-start-date" value="${startDate}" required>
        </div>
        <div class="form-group">
            <label for="sleep-start-time">開始時間 *</label>
            <input type="time" id="sleep-start-time" value="${startTime}" required>
        </div>
        <div class="form-group">
            <div class="form-check">
                <input type="checkbox" id="sleep-has-ended" ${hasEndTime ? "checked" : ""}>
                <label for="sleep-has-ended">已結束睡眠</label>
            </div>
        </div>
        <div id="sleep-end-group" ${!hasEndTime ? "style='display:none;'" : ""}>
            <div class="form-group">
                <label for="sleep-end-date">結束日期 *</label>
                <input type="date" id="sleep-end-date" value="${endDate}" ${hasEndTime ? "required" : ""}>
            </div>
            <div class="form-group">
                <label for="sleep-end-time">結束時間 *</label>
                <input type="time" id="sleep-end-time" value="${endTime}" ${hasEndTime ? "required" : ""}>
            </div>
        </div>
        <div class="form-group">
            <label for="sleep-quality">睡眠品質</label>
            <select id="sleep-quality">
                <option value="">-- 選擇睡眠品質 --</option>
                <option value="good" ${isUpdate && sleepData.quality === "good" ? "selected" : ""}>良好</option>
                <option value="fair" ${isUpdate && sleepData.quality === "fair" ? "selected" : ""}>一般</option>
                <option value="poor" ${isUpdate && sleepData.quality === "poor" ? "selected" : ""}>不佳</option>
            </select>
        </div>
        <div class="form-group">
            <label for="sleep-note">備註</label>
            <textarea id="sleep-note" placeholder="可記錄睡眠過程中的觀察或特殊情況">${sleepNote}</textarea>
        </div>
    `;
    
    // 設定確認動作
    const onConfirm = async function() {
        // 表單驗證
        const startDateInput = document.getElementById("sleep-start-date");
        const startTimeInput = document.getElementById("sleep-start-time");
        
        if (!startDateInput.value || !startTimeInput.value) {
            showToast("請填寫開始日期和時間", "warning");
            return;
        }
        
        // 構建開始時間戳
        const startDateTimeStr = `${startDateInput.value}T${startTimeInput.value}:00`;
        const startTimestamp = new Date(startDateTimeStr).toISOString();
        
        // 檢查是否有結束時間
        const hasEnded = document.getElementById("sleep-has-ended").checked;
        let endTimestamp = null;
        
        if (hasEnded) {
            const endDateInput = document.getElementById("sleep-end-date");
            const endTimeInput = document.getElementById("sleep-end-time");
            
            if (!endDateInput.value || !endTimeInput.value) {
                showToast("請填寫結束日期和時間", "warning");
                return;
            }
            
            // 構建結束時間戳
            const endDateTimeStr = `${endDateInput.value}T${endTimeInput.value}:00`;
            endTimestamp = new Date(endDateTimeStr).toISOString();
            
            // 檢查結束時間是否晚於開始時間
            if (new Date(endTimestamp) <= new Date(startTimestamp)) {
                showToast("結束時間必須晚於開始時間", "warning");
                return;
            }
        }
        
        // 準備睡眠記錄
        const sleepRecord = {
            childId: currentChildId,
            startTime: startTimestamp,
            endTime: endTimestamp,
            quality: document.getElementById("sleep-quality").value || null,
            notes: document.getElementById("sleep-note").value.trim()
        };
        
        try {
            if (isUpdate) {
                // 更新記錄
                sleepRecord.id = sleepData.id;
                sleepRecord.createdAt = sleepData.createdAt;
                sleepRecord.updatedAt = new Date().toISOString();
                
                await updateRecord(STORES.SLEEPS, sleepRecord);
                showToast("睡眠記錄已更新", "success");
            } else {
                // 檢查是否有進行中的睡眠
                const ongoingSleep = await checkOngoingSleep();
                
                if (ongoingSleep && !hasEnded) {
                    showToast("已有進行中的睡眠記錄，請先結束該記錄", "warning");
                    return;
                }
                
                // 創建新記錄
                sleepRecord.id = generateUniqueId();
                sleepRecord.createdAt = new Date().toISOString();
                
                await addRecord(STORES.SLEEPS, sleepRecord);
                showToast("已添加睡眠記錄", "success");
            }
            
            // 重新載入數據
            if (currentPage === "sleep") {
                loadSleepRecords();
            } else if (currentPage === "dashboard") {
                loadDashboardData();
            }
            
            // 更新睡眠計時器
            const ongoingSleep = await checkOngoingSleep();
            updateSleepTimer(ongoingSleep);
        } catch (error) {
            console.error("儲存睡眠記錄時發生錯誤:", error);
            showToast("儲存失敗，請稍後再試", "error");
        }
        
        hideModal();
    };
    
    showModal(modalTitle, modalContent, onConfirm);
    
    // 為睡眠結束複選框添加事件處理
    document.getElementById("sleep-has-ended").addEventListener("change", function() {
        const endGroup = document.getElementById("sleep-end-group");
        endGroup.style.display = this.checked ? "block" : "none";
        
        // 如果選擇了結束，設置結束時間為當前時間
        if (this.checked && !document.getElementById("sleep-end-time").value) {
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            document.getElementById("sleep-end-time").value = timeStr;
        }
    });
}

// 顯示結束睡眠模態框
function showEndSleepModal(sleepData) {
    // 預設值設定
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const startTime = new Date(sleepData.startTime);
    const duration = now - startTime;
    const hours = Math.floor(duration / 1000 / 60 / 60);
    const minutes = Math.floor((duration / 1000 / 60) % 60);
    
    const modalContent = `
        <p>寶寶已經睡了 <strong>${hours} 小時 ${minutes} 分鐘</strong>。</p>
        <div class="form-group">
            <label for="sleep-end-date">結束日期 *</label>
            <input type="date" id="sleep-end-date" value="${dateStr}" required>
        </div>
        <div class="form-group">
            <label for="sleep-end-time">結束時間 *</label>
            <input type="time" id="sleep-end-time" value="${timeStr}" required>
        </div>
        <div class="form-group">
            <label for="sleep-quality">睡眠品質</label>
            <select id="sleep-quality">
                <option value="">-- 選擇睡眠品質 --</option>
                <option value="good">良好</option>
                <option value="fair">一般</option>
                <option value="poor">不佳</option>
            </select>
        </div>
        <div class="form-group">
            <label for="sleep-note">備註</label>
            <textarea id="sleep-note" placeholder="可記錄睡眠過程中的觀察或特殊情況">${sleepData.notes || ""}</textarea>
        </div>
    `;
    
    // 設定確認動作
    const onConfirm = async function() {
        // 表單驗證
        const endDateInput = document.getElementById("sleep-end-date");
        const endTimeInput = document.getElementById("sleep-end-time");
        
        if (!endDateInput.value || !endTimeInput.value) {
            showToast("請填寫結束日期和時間", "warning");
            return;
        }
        
        // 構建結束時間戳
        const endDateTimeStr = `${endDateInput.value}T${endTimeInput.value}:00`;
        const endTimestamp = new Date(endDateTimeStr).toISOString();
        
        // 檢查結束時間是否晚於開始時間
        if (new Date(endTimestamp) <= new Date(sleepData.startTime)) {
            showToast("結束時間必須晚於開始時間", "warning");
            return;
        }
        
        // 更新睡眠記錄
        const updatedSleepData = {
            ...sleepData,
            endTime: endTimestamp,
            quality: document.getElementById("sleep-quality").value || sleepData.quality || null,
            notes: document.getElementById("sleep-note").value.trim(),
            updatedAt: new Date().toISOString()
        };
        
        try {
            await updateRecord(STORES.SLEEPS, updatedSleepData);
            showToast("睡眠記錄已更新", "success");
            
            // 重新載入數據
            if (currentPage === "sleep") {
                loadSleepRecords();
            } else if (currentPage === "dashboard") {
                loadDashboardData();
            }
            
            // 更新睡眠計時器
            updateSleepTimer(null);
        } catch (error) {
            console.error("更新睡眠記錄時發生錯誤:", error);
            showToast("更新失敗，請稍後再試", "error");
        }
        
        hideModal();
    };
    
    showModal("結束睡眠", modalContent, onConfirm);
}

// 載入睡眠記錄
async function loadSleepRecords() {
    if (!currentChildId) return;
    
    try {
        // 獲取所有睡眠記錄
        const sleepRecords = await getRecords(STORES.SLEEPS, "childId", currentChildId);
        
        // 檢查是否有進行中的睡眠
        const ongoingSleep = sleepRecords.find(sleep => sleep.startTime && !sleep.endTime);
        updateSleepTimer(ongoingSleep);
        
        // 按時間排序 (最新的在前)
        sleepRecords.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        
        // 顯示記錄
        const recordsContainer = document.getElementById("sleep-records");
        
        if (sleepRecords.length === 0) {
            recordsContainer.innerHTML = '<p class="empty-state">尚無睡眠記錄。點擊「新增睡眠記錄」按鈕開始追蹤。</p>';
            return;
        }
        
        let html = "";
        
        sleepRecords.forEach(record => {
            const startDate = formatDate(record.startTime);
            const startTime = formatTime(record.startTime);
            
            let durationText = "";
            let endTimeText = "";
            let statusBadge = "";
            
            if (record.endTime) {
                const endDate = formatDate(record.endTime);
                const endTime = formatTime(record.endTime);
                const duration = getTimeDifference(record.startTime, record.endTime);
                
                durationText = `<div class="record-duration">睡眠時間: ${duration}</div>`;
                endTimeText = `<div class="record-end-time">結束: ${endDate} ${endTime}</div>`;
            } else {
                statusBadge = '<span class="record-badge ongoing">進行中</span>';
            }
            
            let qualityText = "";
            if (record.quality) {
                let qualityLabel = "";
                let qualityClass = "";
                
                switch (record.quality) {
                    case "good":
                        qualityLabel = "良好";
                        qualityClass = "good";
                        break;
                    case "fair":
                        qualityLabel = "一般";
                        qualityClass = "fair";
                        break;
                    case "poor":
                        qualityLabel = "不佳";
                        qualityClass = "poor";
                        break;
                }
                
                qualityText = `<span class="record-quality ${qualityClass}">品質: ${qualityLabel}</span>`;
            }
            
            html += `
                <div class="record-item" data-id="${record.id}">
                    <div class="record-header">
                        <div class="record-title">
                            睡眠 ${statusBadge}
                        </div>
                        <div class="record-time">${startDate} ${startTime}</div>
                    </div>
                    ${durationText}
                    ${endTimeText}
                    <div class="record-meta">
                        ${qualityText}
                    </div>
                    ${record.notes ? `<div class="record-content">${record.notes}</div>` : ''}
                    <div class="record-actions">
                        <button class="edit-record-btn" data-id="${record.id}">
                            <i class="fas fa-edit"></i> 編輯
                        </button>
                        <button class="delete-record-btn" data-id="${record.id}">
                            <i class="fas fa-trash-alt"></i> 刪除
                        </button>
                    </div>
                </div>
            `;
        });
        
        recordsContainer.innerHTML = html;
        
        // 添加事件處理
        document.querySelectorAll(".edit-record-btn").forEach(btn => {
            btn.addEventListener("click", async function() {
                const recordId = this.getAttribute("data-id");
                const record = await getRecord(STORES.SLEEPS, recordId);
                if (record) {
                    showAddSleepModal(record);
                }
            });
        });
        
        document.querySelectorAll(".delete-record-btn").forEach(btn => {
            btn.addEventListener("click", function() {
                const recordId = this.getAttribute("data-id");
                showDeleteRecordConfirmation(STORES.SLEEPS, recordId, "睡眠記錄", async () => {
                    loadSleepRecords();
                    if (currentPage === "dashboard") {
                        loadDashboardData();
                    }
                    
                    // 更新睡眠計時器
                    const ongoingSleep = await checkOngoingSleep();
                    updateSleepTimer(ongoingSleep);
                });
            });
        });
        
        // 添加樣式
        const style = document.createElement("style");
        style.textContent = `
            .record-duration {
                font-weight: 500;
                color: var(--primary-color);
                margin-bottom: var(--spacing-xs);
            }
            .record-end-time, .record-meta {
                font-size: var(--font-size-sm);
                color: var(--text-secondary);
                margin-bottom: var(--spacing-sm);
            }
            .record-quality {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 12px;
                font-size: var(--font-size-xs);
            }
            .record-quality.good {
                background-color: rgba(109, 183, 108, 0.2);
                color: #4e9b4d;
            }
            .record-quality.fair {
                background-color: rgba(247, 185, 85, 0.2);
                color: #d99c24;
            }
            .record-quality.poor {
                background-color: rgba(226, 93, 93, 0.2);
                color: #c64343;
            }
            .record-badge.ongoing {
                background-color: rgba(97, 154, 236, 0.2);
                color: #4a86d5;
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0% { opacity: 0.7; }
                50% { opacity: 1; }
                100% { opacity: 0.7; }
            }
        `;
        
        recordsContainer.appendChild(style);
    } catch (error) {
        console.error("載入睡眠記錄時發生錯誤:", error);
        document.getElementById("sleep-records").innerHTML = '<p class="empty-state">載入失敗，請稍後再試。</p>';
    }
}

// 顯示添加尿布記錄模態框
function showAddDiaperModal(diaperData = null) {
    // 準備模態內容
    const isUpdate = diaperData !== null;
    const modalTitle = isUpdate ? "編輯尿布記錄" : "新增尿布記錄";
    
    // 預設值設定
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const diaperDate = isUpdate ? new Date(diaperData.timestamp).toISOString().split('T')[0] : dateStr;
    const diaperTime = isUpdate ? formatTime(diaperData.timestamp) : timeStr;
    const diaperType = isUpdate ? diaperData.type : "wet";
    const diaperNote = isUpdate && diaperData.notes ? diaperData.notes : "";
    
    const modalContent = `
        <div class="form-group">
            <label for="diaper-date">日期 *</label>
            <input type="date" id="diaper-date" value="${diaperDate}" required>
        </div>
        <div class="form-group">
            <label for="diaper-time">時間 *</label>
            <input type="time" id="diaper-time" value="${diaperTime}" required>
        </div>
        <div class="form-group">
            <label>尿布類型 *</label>
            <div class="radio-group">
                <div class="radio-btn">
                    <input type="radio" id="diaper-wet" name="diaper-type" value="wet" ${diaperType === "wet" ? "checked" : ""}>
                    <label for="diaper-wet">
                        <i class="fas fa-tint"></i>
                        尿液
                    </label>
                </div>
                <div class="radio-btn">
                    <input type="radio" id="diaper-dirty" name="diaper-type" value="dirty" ${diaperType === "dirty" ? "checked" : ""}>
                    <label for="diaper-dirty">
                        <i class="fas fa-poo"></i>
                        排便
                    </label>
                </div>
                <div class="radio-btn">
                    <input type="radio" id="diaper-mixed" name="diaper-type" value="mixed" ${diaperType === "mixed" ? "checked" : ""}>
                    <label for="diaper-mixed">
                        <i class="fas fa-wind"></i>
                        混合
                    </label>
                </div>
            </div>
        </div>
        <div id="stool-color-group" class="${(diaperType === 'dirty' || diaperType === 'mixed') ? '' : 'hidden'} form-group">
            <label for="stool-color">糞便顏色</label>
            <select id="stool-color">
                <option value="">-- 選擇顏色 --</option>
                <option value="yellow" ${isUpdate && diaperData.stoolColor === "yellow" ? "selected" : ""}>黃色</option>
                <option value="green" ${isUpdate && diaperData.stoolColor === "green" ? "selected" : ""}>綠色</option>
                <option value="brown" ${isUpdate && diaperData.stoolColor === "brown" ? "selected" : ""}>棕色</option>
                <option value="black" ${isUpdate && diaperData.stoolColor === "black" ? "selected" : ""}>黑色</option>
                <option value="red" ${isUpdate && diaperData.stoolColor === "red" ? "selected" : ""}>紅色</option>
                <option value="white" ${isUpdate && diaperData.stoolColor === "white" ? "selected" : ""}>白色</option>
            </select>
        </div>
        <div id="stool-consistency-group" class="${(diaperType === 'dirty' || diaperType === 'mixed') ? '' : 'hidden'} form-group">
            <label for="stool-consistency">糞便硬度</label>
            <select id="stool-consistency">
                <option value="">-- 選擇硬度 --</option>
                <option value="watery" ${isUpdate && diaperData.stoolConsistency === "watery" ? "selected" : ""}>水狀</option>
                <option value="soft" ${isUpdate && diaperData.stoolConsistency === "soft" ? "selected" : ""}>軟的</option>
                <option value="normal" ${isUpdate && diaperData.stoolConsistency === "normal" ? "selected" : ""}>正常</option>
                <option value="hard" ${isUpdate && diaperData.stoolConsistency === "hard" ? "selected" : ""}>硬的</option>
            </select>
        </div>
        <div class="form-group">
            <label for="diaper-note">備註</label>
            <textarea id="diaper-note" placeholder="可記錄尿布的顏色、量或其他觀察">${diaperNote}</textarea>
        </div>
    `;
    
    // 設定確認動作
    const onConfirm = async function() {
        // 表單驗證
        const dateInput = document.getElementById("diaper-date");
        const timeInput = document.getElementById("diaper-time");
        
        if (!dateInput.value || !timeInput.value) {
            showToast("請填寫日期和時間", "warning");
            return;
        }
        
        // 獲取選擇的尿布類型
        const typeRadios = document.getElementsByName("diaper-type");
        let selectedType = "wet";
        for (const radio of typeRadios) {
            if (radio.checked) {
                selectedType = radio.value;
                break;
            }
        }
        
        // 構建時間戳
        const dateTimeStr = `${dateInput.value}T${timeInput.value}:00`;
        const timestamp = new Date(dateTimeStr).toISOString();
        
        // 準備尿布記錄
        const diaperRecord = {
            childId: currentChildId,
            timestamp: timestamp,
            type: selectedType,
            notes: document.getElementById("diaper-note").value.trim()
        };
        
        // 如果是排便或混合類型，添加糞便相關資訊
        if (selectedType === "dirty" || selectedType === "mixed") {
            diaperRecord.stoolColor = document.getElementById("stool-color").value || null;
            diaperRecord.stoolConsistency = document.getElementById("stool-consistency").value || null;
        }
        
        try {
            if (isUpdate) {
                // 更新記錄
                diaperRecord.id = diaperData.id;
                diaperRecord.createdAt = diaperData.createdAt;
                diaperRecord.updatedAt = new Date().toISOString();
                
                await updateRecord(STORES.DIAPERS, diaperRecord);
                showToast("尿布記錄已更新", "success");
            } else {
                // 創建新記錄
                diaperRecord.id = generateUniqueId();
                diaperRecord.createdAt = new Date().toISOString();
                
                await addRecord(STORES.DIAPERS, diaperRecord);
                showToast("已添加尿布記錄", "success");
            }
            
            // 重新載入數據
            if (currentPage === "diaper") {
                loadDiaperRecords();
            } else if (currentPage === "dashboard") {
                loadDashboardData();
            }
        } catch (error) {
            console.error("儲存尿布記錄時發生錯誤:", error);
            showToast("儲存失敗，請稍後再試", "error");
        }
        
        hideModal();
    };
    
    showModal(modalTitle, modalContent, onConfirm);
    
    // 為尿布類型添加事件處理
    document.getElementsByName("diaper-type").forEach(radio => {
        radio.addEventListener("change", function() {
            const stoolColorGroup = document.getElementById("stool-color-group");
            const stoolConsistencyGroup = document.getElementById("stool-consistency-group");
            
            if (this.value === "dirty" || this.value === "mixed") {
                stoolColorGroup.classList.remove("hidden");
                stoolConsistencyGroup.classList.remove("hidden");
            } else {
                stoolColorGroup.classList.add("hidden");
                stoolConsistencyGroup.classList.add("hidden");
            }
        });
    });
}

// 載入尿布記錄
async function loadDiaperRecords() {
    if (!currentChildId) return;
    
    try {
        // 獲取所有尿布記錄
        const diaperRecords = await getRecords(STORES.DIAPERS, "childId", currentChildId);
        
        // 獲取過濾設置
        const filterSelect = document.getElementById("diaper-filter");
        const filter = filterSelect.value;
        
        // 過濾記錄
        let filteredRecords = diaperRecords;
        if (filter !== "all") {
            filteredRecords = diaperRecords.filter(record => record.type === filter);
        }
        
        // 按時間排序 (最新的在前)
        filteredRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // 顯示記錄
        const recordsContainer = document.getElementById("diaper-records");
        
        if (filteredRecords.length === 0) {
            recordsContainer.innerHTML = '<p class="empty-state">無符合條件的尿布記錄。</p>';
            return;
        }
        
        let html = "";
        
        filteredRecords.forEach(record => {
            const date = formatDate(record.timestamp);
            const time = formatTime(record.timestamp);
            
            let typeText = "";
            let stoolInfo = "";
            
            switch (record.type) {
                case "wet":
                    typeText = '<span class="record-badge wet"><i class="fas fa-tint"></i> 尿液</span>';
                    break;
                case "dirty":
                    typeText = '<span class="record-badge dirty"><i class="fas fa-poo"></i> 排便</span>';
                    break;
                case "mixed":
                    typeText = '<span class="record-badge mixed"><i class="fas fa-wind"></i> 混合</span>';
                    break;
            }
            
            // 如果有糞便相關資訊，顯示
            if ((record.type === "dirty" || record.type === "mixed") && 
                (record.stoolColor || record.stoolConsistency)) {
                
                let colorText = "";
                if (record.stoolColor) {
                    switch (record.stoolColor) {
                        case "yellow": colorText = "黃色"; break;
                        case "green": colorText = "綠色"; break;
                        case "brown": colorText = "棕色"; break;
                        case "black": colorText = "黑色"; break;
                        case "red": colorText = "紅色"; break;
                        case "white": colorText = "白色"; break;
                    }
                }
                
                let consistencyText = "";
                if (record.stoolConsistency) {
                    switch (record.stoolConsistency) {
                        case "watery": consistencyText = "水狀"; break;
                        case "soft": consistencyText = "軟的"; break;
                        case "normal": consistencyText = "正常"; break;
                        case "hard": consistencyText = "硬的"; break;
                    }
                }
                
                if (colorText && consistencyText) {
                    stoolInfo = `<div class="stool-info">糞便：${colorText}，${consistencyText}</div>`;
                } else if (colorText) {
                    stoolInfo = `<div class="stool-info">糞便顏色：${colorText}</div>`;
                } else if (consistencyText) {
                    stoolInfo = `<div class="stool-info">糞便硬度：${consistencyText}</div>`;
                }
            }
            
            html += `
                <div class="record-item" data-id="${record.id}">
                    <div class="record-header">
                        <div class="record-title">
                            ${typeText}
                        </div>
                        <div class="record-time">${date} ${time}</div>
                    </div>
                    ${stoolInfo}
                    ${record.notes ? `<div class="record-content">${record.notes}</div>` : ''}
                    <div class="record-actions">
                        <button class="edit-record-btn" data-id="${record.id}">
                            <i class="fas fa-edit"></i> 編輯
                        </button>
                        <button class="delete-record-btn" data-id="${record.id}">
                            <i class="fas fa-trash-alt"></i> 刪除
                        </button>
                    </div>
                </div>
            `;
        });
        
        recordsContainer.innerHTML = html;
        
        // 添加事件處理
        document.querySelectorAll(".edit-record-btn").forEach(btn => {
            btn.addEventListener("click", async function() {
                const recordId = this.getAttribute("data-id");
                const record = await getRecord(STORES.DIAPERS, recordId);
                if (record) {
                    showAddDiaperModal(record);
                }
            });
        });
        
        document.querySelectorAll(".delete-record-btn").forEach(btn => {
            btn.addEventListener("click", function() {
                const recordId = this.getAttribute("data-id");
                showDeleteRecordConfirmation(STORES.DIAPERS, recordId, "尿布記錄", () => {
                    loadDiaperRecords();
                    if (currentPage === "dashboard") {
                        loadDashboardData();
                    }
                });
            });
        });
        
        // 添加樣式
        const style = document.createElement("style");
        style.textContent = `
            .record-badge.wet {
                background-color: rgba(97, 154, 236, 0.2);
                color: #4a86d5;
            }
            .record-badge.dirty {
                background-color: rgba(226, 93, 93, 0.2);
                color: #c64343;
            }
            .record-badge.mixed {
                background-color: rgba(168, 132, 196, 0.2);
                color: #8765a8;
            }
            .stool-info {
                font-size: var(--font-size-sm);
                color: var(--text-secondary);
                margin-bottom: var(--spacing-sm);
            }
        `;
        
        recordsContainer.appendChild(style);
    } catch (error) {
        console.error("載入尿布記錄時發生錯誤:", error);
        document.getElementById("diaper-records").innerHTML = '<p class="empty-state">載入失敗，請稍後再試。</p>';
    }
}

// 顯示添加健康測量模態框
function showAddHealthMeasurementModal(healthData = null) {
    // 準備模態內容
    const isUpdate = healthData !== null;
    const modalTitle = isUpdate ? "編輯健康測量" : "新增健康測量";
    
    // 預設值設定
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const measureDate = isUpdate ? new Date(healthData.timestamp).toISOString().split('T')[0] : dateStr;
    const measureTime = isUpdate ? formatTime(healthData.timestamp) : timeStr;
    const measureType = isUpdate ? healthData.type : "weight";
    
    let valueField = "";
    let unitLabel = "";
    
    if (isUpdate) {
        switch (healthData.type) {
            case "weight":
                valueField = `<input type="number" id="health-value" value="${healthData.value || ''}" step="0.1" min="0" max="50" required>`;
                unitLabel = "公斤";
                break;
            case "height":
                valueField = `<input type="number" id="health-value" value="${healthData.value || ''}" step="0.1" min="0" max="200" required>`;
                unitLabel = "公分";
                break;
            case "temperature":
                valueField = `<input type="number" id="health-value" value="${healthData.value || ''}" step="0.1" min="35" max="42" required>`;
                unitLabel = "°C";
                break;
            case "head":
                valueField = `<input type="number" id="health-value" value="${healthData.value || ''}" step="0.1" min="0" max="100" required>`;
                unitLabel = "公分";
                break;
        }
    } else {
        valueField = `<input type="number" id="health-value" value="" step="0.1" required>`;
    }
    
    const modalContent = `
        <div class="form-group">
            <label for="health-date">日期 *</label>
            <input type="date" id="health-date" value="${measureDate}" required>
        </div>
        <div class="form-group">
            <label for="health-time">時間 *</label>
            <input type="time" id="health-time" value="${measureTime}" required>
        </div>
        <div class="form-group">
            <label>測量類型 *</label>
            <div class="radio-group">
                <div class="radio-btn">
                    <input type="radio" id="health-weight" name="health-type" value="weight" ${measureType === "weight" ? "checked" : ""}>
                    <label for="health-weight">
                        <i class="fas fa-weight"></i>
                        體重
                    </label>
                </div>
                <div class="radio-btn">
                    <input type="radio" id="health-height" name="health-type" value="height" ${measureType === "height" ? "checked" : ""}>
                    <label for="health-height">
                        <i class="fas fa-ruler-vertical"></i>
                        身高
                    </label>
                </div>
                <div class="radio-btn">
                    <input type="radio" id="health-temperature" name="health-type" value="temperature" ${measureType === "temperature" ? "checked" : ""}>
                    <label for="health-temperature">
                        <i class="fas fa-thermometer-half"></i>
                        體溫
                    </label>
                </div>
                <div class="radio-btn">
                    <input type="radio" id="health-head" name="health-type" value="head" ${measureType === "head" ? "checked" : ""}>
                    <label for="health-head">
                        <i class="fas fa-head-side"></i>
                        頭圍
                    </label>
                </div>
            </div>
        </div>
        <div class="form-group">
            <div class="form-row">
                <div class="form-col">
                    <label for="health-value">數值 *</label>
                    ${valueField}
                </div>
                <div class="form-col" style="flex: 0 0 80px;">
                    <label>&nbsp;</label>
                    <div style="height: 44px; display: flex; align-items: center; padding: 0 var(--spacing);">
                        <span id="unit-label">${unitLabel || "單位"}</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="form-group">
            <label for="health-note">備註</label>
            <textarea id="health-note" placeholder="可記錄測量的地點、方法或其他資訊">${isUpdate && healthData.notes ? healthData.notes : ""}</textarea>
        </div>
    `;
    
    // 設定確認動作
    const onConfirm = async function() {
        // 表單驗證
        const dateInput = document.getElementById("health-date");
        const timeInput = document.getElementById("health-time");
        const valueInput = document.getElementById("health-value");
        
        if (!dateInput.value || !timeInput.value) {
            showToast("請填寫日期和時間", "warning");
            return;
        }
        
        if (!valueInput.value) {
            showToast("請填寫測量值", "warning");
            return;
        }
        
        // 獲取選擇的測量類型
        const typeRadios = document.getElementsByName("health-type");
        let selectedType = "weight";
        for (const radio of typeRadios) {
            if (radio.checked) {
                selectedType = radio.value;
                break;
            }
        }
        
        // 構建時間戳
        const dateTimeStr = `${dateInput.value}T${timeInput.value}:00`;
        const timestamp = new Date(dateTimeStr).toISOString();
        
        // 準備健康測量記錄
        const healthRecord = {
            childId: currentChildId,
            timestamp: timestamp,
            type: selectedType,
            value: parseFloat(valueInput.value),
            notes: document.getElementById("health-note").value.trim()
        };
        
        try {
            if (isUpdate) {
                // 更新記錄
                healthRecord.id = healthData.id;
                healthRecord.createdAt = healthData.createdAt;
                healthRecord.updatedAt = new Date().toISOString();
                
                await updateRecord(STORES.HEALTH_MEASUREMENTS, healthRecord);
                showToast("健康測量已更新", "success");
            } else {
                // 創建新記錄
                healthRecord.id = generateUniqueId();
                healthRecord.createdAt = new Date().toISOString();
                
                await addRecord(STORES.HEALTH_MEASUREMENTS, healthRecord);
                showToast("已添加健康測量", "success");
            }
            
            // 重新載入數據
            if (currentPage === "health") {
                loadHealthData();
            } else if (currentPage === "dashboard") {
                loadDashboardData();
            }
        } catch (error) {
            console.error("儲存健康測量時發生錯誤:", error);
            showToast("儲存失敗，請稍後再試", "error");
        }
        
        hideModal();
    };
    
    showModal(modalTitle, modalContent, onConfirm);
    
    // 為測量類型添加事件處理
    document.getElementsByName("health-type").forEach(radio => {
        radio.addEventListener("change", function() {
            const valueInput = document.getElementById("health-value");
            const unitLabel = document.getElementById("unit-label");
            
            switch (this.value) {
                case "weight":
                    valueInput.min = "0";
                    valueInput.max = "50";
                    valueInput.step = "0.1";
                    unitLabel.textContent = "公斤";
                    break;
                case "height":
                    valueInput.min = "0";
                    valueInput.max = "200";
                    valueInput.step = "0.1";
                    unitLabel.textContent = "公分";
                    break;
                case "temperature":
                    valueInput.min = "35";
                    valueInput.max = "42";
                    valueInput.step = "0.1";
                    unitLabel.textContent = "°C";
                    break;
                case "head":
                    valueInput.min = "0";
                    valueInput.max = "100";
                    valueInput.step = "0.1";
                    unitLabel.textContent = "公分";
                    break;
            }
        });
    });
}

// 載入健康數據
async function loadHealthData() {
    if (!currentChildId) return;
    
    try {
        // 獲取所有健康測量記錄
        const healthRecords = await getRecords(STORES.HEALTH_MEASUREMENTS, "childId", currentChildId);
        
        // 分類記錄
        const weightRecords = healthRecords.filter(r => r.type === "weight")
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        const heightRecords = healthRecords.filter(r => r.type === "height")
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        const temperatureRecords = healthRecords.filter(r => r.type === "temperature")
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        const headRecords = healthRecords.filter(r => r.type === "head")
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // 顯示最新測量值
        if (weightRecords.length > 0) {
            const latestWeight = weightRecords[weightRecords.length - 1];
            document.getElementById("latest-weight").textContent = latestWeight.value.toFixed(1);
        }
        
        if (heightRecords.length > 0) {
            const latestHeight = heightRecords[heightRecords.length - 1];
            document.getElementById("latest-height").textContent = latestHeight.value.toFixed(1);
        }
        
        if (temperatureRecords.length > 0) {
            const latestTemp = temperatureRecords[temperatureRecords.length - 1];
            document.getElementById("latest-temperature").textContent = latestTemp.value.toFixed(1);
        }
        
        if (headRecords.length > 0) {
            const latestHead = headRecords[headRecords.length - 1];
            document.getElementById("latest-head").textContent = latestHead.value.toFixed(1);
        }
        
        // 生成圖表
        if (weightRecords.length > 0) {
            createMeasurementChart(
                document.getElementById("weight-chart").getContext("2d"),
                weightRecords,
                "weight",
                "體重 (公斤)"
            );
        }
        
        if (heightRecords.length > 0) {
            createMeasurementChart(
                document.getElementById("height-chart").getContext("2d"),
                heightRecords,
                "height",
                "身高 (公分)"
            );
        }
        
        if (temperatureRecords.length > 0) {
            createMeasurementChart(
                document.getElementById("temperature-chart").getContext("2d"),
                temperatureRecords,
                "temperature",
                "體溫 (°C)"
            );
        }
        
        if (headRecords.length > 0) {
            createMeasurementChart(
                document.getElementById("head-chart").getContext("2d"),
                headRecords,
                "head",
                "頭圍 (公分)"
            );
        }
        
        // 加載其他標籤頁的數據
        await loadVaccineRecords();
        await loadMedicationRecords();
        await loadCheckupRecords();
    } catch (error) {
        console.error("載入健康數據時發生錯誤:", error);
        showToast("載入健康數據失敗", "error");
    }
}

// 創建測量圖表
function createMeasurementChart(ctx, records, type, label) {
    // 確保有足夠的數據點
    if (records.length === 0) return;
    
    // 處理數據
    const labels = records.map(r => formatDate(r.timestamp, false));
    const data = records.map(r => r.value);
    
    // 獲取適當的顏色
    let color = "";
    switch (type) {
        case "weight":
            color = "rgba(75, 174, 209, 1)";
            break;
        case "height":
            color = "rgba(109, 183, 108, 1)";
            break;
        case "temperature":
            color = "rgba(226, 93, 93, 1)";
            break;
        case "head":
            color = "rgba(168, 132, 196, 1)";
            break;
    }
    
    // 創建數據集
    const datasets = [
        {
            label: label,
            data: data,
            backgroundColor: color.replace("1)", "0.2)"),
            borderColor: color,
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            pointRadius: 3
        }
    ];
    
    // 創建圖表
    createBasicChart(ctx, 'line', labels, datasets);
}

// 載入疫苗記錄
async function loadVaccineRecords() {
    if (!currentChildId) return;
    
    try {
        // 獲取所有疫苗記錄
        const vaccineRecords = await getRecords(STORES.VACCINES, "childId", currentChildId);
        
        // 按日期排序 (最新的在前)
        vaccineRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // 顯示記錄
        const recordsContainer = document.getElementById("vaccine-records");
        
        if (vaccineRecords.length === 0) {
            recordsContainer.innerHTML = '<p class="empty-state">尚無疫苗記錄。</p>';
            return;
        }
        
        let html = "";
        
        vaccineRecords.forEach(record => {
            const date = formatDate(record.date);
            
            html += `
                <div class="record-item" data-id="${record.id}">
                    <div class="record-header">
                        <div class="record-title">
                            ${record.name}
                        </div>
                        <div class="record-time">${date}</div>
                    </div>
                    <div class="vaccine-meta">
                        <span class="vaccine-dose">劑次: ${record.dose || "-"}</span>
                        ${record.manufacturer ? `<span class="vaccine-manufacturer">廠商: ${record.manufacturer}</span>` : ""}
                        ${record.batchNumber ? `<span class="vaccine-batch">批號: ${record.batchNumber}</span>` : ""}
                    </div>
                    ${record.location ? `<div class="vaccine-location">接種地點: ${record.location}</div>` : ""}
                    ${record.notes ? `<div class="record-content">${record.notes}</div>` : ""}
                    <div class="record-actions">
                        <button class="edit-vaccine-btn" data-id="${record.id}">
                            <i class="fas fa-edit"></i> 編輯
                        </button>
                        <button class="delete-vaccine-btn" data-id="${record.id}">
                            <i class="fas fa-trash-alt"></i> 刪除
                        </button>
                    </div>
                </div>
            `;
        });
        
        recordsContainer.innerHTML = html;
        
        // 添加事件處理
        document.querySelectorAll(".edit-vaccine-btn").forEach(btn => {
            btn.addEventListener("click", async function() {
                const recordId = this.getAttribute("data-id");
                const record = await getRecord(STORES.VACCINES, recordId);
                if (record) {
                    showAddVaccineModal(record);
                }
            });
        });
        
        document.querySelectorAll(".delete-vaccine-btn").forEach(btn => {
            btn.addEventListener("click", function() {
                const recordId = this.getAttribute("data-id");
                showDeleteRecordConfirmation(STORES.VACCINES, recordId, "疫苗記錄", () => {
                    loadVaccineRecords();
                });
            });
        });
        
        // 添加樣式
        const style = document.createElement("style");
        style.textContent = `
            .vaccine-meta {
                display: flex;
                flex-wrap: wrap;
                gap: var(--spacing-sm);
                margin-bottom: var(--spacing-sm);
                font-size: var(--font-size-sm);
                color: var(--text-secondary);
            }
            .vaccine-meta span {
                background-color: var(--surface-variant);
                padding: 2px 8px;
                border-radius: 12px;
            }
            .vaccine-location {
                font-size: var(--font-size-sm);
                color: var(--text-secondary);
                margin-bottom: var(--spacing-sm);
            }
        `;
        
        recordsContainer.appendChild(style);
    } catch (error) {
        console.error("載入疫苗記錄時發生錯誤:", error);
        document.getElementById("vaccine-records").innerHTML = '<p class="empty-state">載入失敗，請稍後再試。</p>';
    }
}

// 顯示添加疫苗記錄模態框
function showAddVaccineModal(vaccineData = null) {
    // 準備模態內容
    const isUpdate = vaccineData !== null;
    const modalTitle = isUpdate ? "編輯疫苗記錄" : "新增疫苗記錄";
    
    // 預設值設定
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    
    const vaccineDate = isUpdate ? (vaccineData.date ? new Date(vaccineData.date).toISOString().split('T')[0] : dateStr) : dateStr;
    
    const modalContent = `
        <div class="form-group">
            <label for="vaccine-name">疫苗名稱 *</label>
            <input type="text" id="vaccine-name" value="${isUpdate ? vaccineData.name : ''}" placeholder="例如：五合一疫苗、麻疹疫苗" required>
        </div>
        <div class="form-group">
            <label for="vaccine-date">接種日期 *</label>
            <input type="date" id="vaccine-date" value="${vaccineDate}" required>
        </div>
        <div class="form-group">
            <label for="vaccine-dose">劑次</label>
            <input type="text" id="vaccine-dose" value="${isUpdate && vaccineData.dose ? vaccineData.dose : ''}" placeholder="例如：第一劑、追加劑">
        </div>
        <div class="form-group">
            <label for="vaccine-manufacturer">疫苗廠商</label>
            <input type="text" id="vaccine-manufacturer" value="${isUpdate && vaccineData.manufacturer ? vaccineData.manufacturer : ''}" placeholder="例如：GSK、默沙東">
        </div>
        <div class="form-group">
            <label for="vaccine-batch">批號</label>
            <input type="text" id="vaccine-batch" value="${isUpdate && vaccineData.batchNumber ? vaccineData.batchNumber : ''}" placeholder="疫苗批號">
        </div>
        <div class="form-group">
            <label for="vaccine-location">接種地點</label>
            <input type="text" id="vaccine-location" value="${isUpdate && vaccineData.location ? vaccineData.location : ''}" placeholder="例如：衛生所、兒科診所">
        </div>
        <div class="form-group">
            <label for="vaccine-note">備註</label>
            <textarea id="vaccine-note" placeholder="可記錄接種後的反應或其他觀察">${isUpdate && vaccineData.notes ? vaccineData.notes : ""}</textarea>
        </div>
    `;
    
    // 設定確認動作
    const onConfirm = async function() {
        // 表單驗證
        const nameInput = document.getElementById("vaccine-name");
        const dateInput = document.getElementById("vaccine-date");
        
        if (!nameInput.value.trim()) {
            showToast("請填寫疫苗名稱", "warning");
            return;
        }
        
        if (!dateInput.value) {
            showToast("請選擇接種日期", "warning");
            return;
        }
        
        // 準備疫苗記錄
        const vaccineRecord = {
            childId: currentChildId,
            name: nameInput.value.trim(),
            date: dateInput.value,
            dose: document.getElementById("vaccine-dose").value.trim() || null,
            manufacturer: document.getElementById("vaccine-manufacturer").value.trim() || null,
            batchNumber: document.getElementById("vaccine-batch").value.trim() || null,
            location: document.getElementById("vaccine-location").value.trim() || null,
            notes: document.getElementById("vaccine-note").value.trim() || null
        };
        
        try {
            if (isUpdate) {
                // 更新記錄
                vaccineRecord.id = vaccineData.id;
                vaccineRecord.createdAt = vaccineData.createdAt;
                vaccineRecord.updatedAt = new Date().toISOString();
                
                await updateRecord(STORES.VACCINES, vaccineRecord);
                showToast("疫苗記錄已更新", "success");
            } else {
                // 創建新記錄
                vaccineRecord.id = generateUniqueId();
                vaccineRecord.createdAt = new Date().toISOString();
                
                await addRecord(STORES.VACCINES, vaccineRecord);
                showToast("已添加疫苗記錄", "success");
            }
            
            // 重新載入數據
            loadVaccineRecords();
        } catch (error) {
            console.error("儲存疫苗記錄時發生錯誤:", error);
            showToast("儲存失敗，請稍後再試", "error");
        }
        
        hideModal();
    };
    
    showModal(modalTitle, modalContent, onConfirm);
}

// 載入用藥記錄
async function loadMedicationRecords() {
    if (!currentChildId) return;
    
    try {
        // 獲取所有用藥記錄
        const medicationRecords = await getRecords(STORES.MEDICATIONS, "childId", currentChildId);
        
        // 按日期排序 (最新的在前)
        medicationRecords.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        
        // 顯示記錄
        const recordsContainer = document.getElementById("medication-records");
        
        if (medicationRecords.length === 0) {
            recordsContainer.innerHTML = '<p class="empty-state">尚無用藥記錄。</p>';
            return;
        }
        
        let html = "";
        
        medicationRecords.forEach(record => {
            const startDate = formatDate(record.startDate);
            const endDate = record.endDate ? formatDate(record.endDate) : "持續中";
            
            const statusClass = record.endDate ? "completed" : "ongoing";
            const statusText = record.endDate ? "已完成" : "用藥中";
            
            html += `
                <div class="record-item" data-id="${record.id}">
                    <div class="record-header">
                        <div class="record-title">
                            ${record.name}
                            <span class="medication-status ${statusClass}">${statusText}</span>
                        </div>
                        <div class="record-time">${startDate} ~ ${endDate}</div>
                    </div>
                    <div class="medication-meta">
                        ${record.dosage ? `<span class="medication-dosage">劑量: ${record.dosage}</span>` : ""}
                        ${record.frequency ? `<span class="medication-frequency">頻率: ${record.frequency}</span>` : ""}
                        ${record.reason ? `<span class="medication-reason">原因: ${record.reason}</span>` : ""}
                    </div>
                    ${record.notes ? `<div class="record-content">${record.notes}</div>` : ""}
                    <div class="record-actions">
                        <button class="edit-medication-btn" data-id="${record.id}">
                            <i class="fas fa-edit"></i> 編輯
                        </button>
                        <button class="delete-medication-btn" data-id="${record.id}">
                            <i class="fas fa-trash-alt"></i> 刪除
                        </button>
                    </div>
                </div>
            `;
        });
        
        recordsContainer.innerHTML = html;
        
        // 添加事件處理
        document.querySelectorAll(".edit-medication-btn").forEach(btn => {
            btn.addEventListener("click", async function() {
                const recordId = this.getAttribute("data-id");
                const record = await getRecord(STORES.MEDICATIONS, recordId);
                if (record) {
                    showAddMedicationModal(record);
                }
            });
        });
        
        document.querySelectorAll(".delete-medication-btn").forEach(btn => {
            btn.addEventListener("click", function() {
                const recordId = this.getAttribute("data-id");
                showDeleteRecordConfirmation(STORES.MEDICATIONS, recordId, "用藥記錄", () => {
                    loadMedicationRecords();
                });
            });
        });
        
        // 添加樣式
        const style = document.createElement("style");
        style.textContent = `
            .medication-status {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: var(--font-size-xs);
                margin-left: var(--spacing-sm);
            }
            .medication-status.completed {
                background-color: rgba(109, 183, 108, 0.2);
                color: #4e9b4d;
            }
            .medication-status.ongoing {
                background-color: rgba(97, 154, 236, 0.2);
                color: #4a86d5;
                animation: pulse 2s infinite;
            }
            .medication-meta {
                display: flex;
                flex-wrap: wrap;
                gap: var(--spacing-sm);
                margin-bottom: var(--spacing-sm);
                font-size: var(--font-size-sm);
                color: var(--text-secondary);
            }
            .medication-meta span {
                background-color: var(--surface-variant);
                padding: 2px 8px;
                border-radius: 12px;
            }
        `;
        
        recordsContainer.appendChild(style);
    } catch (error) {
        console.error("載入用藥記錄時發生錯誤:", error);
        document.getElementById("medication-records").innerHTML = '<p class="empty-state">載入失敗，請稍後再試。</p>';
    }
}

// 顯示添加用藥記錄模態框
function showAddMedicationModal(medicationData = null) {
    // 準備模態內容
    const isUpdate = medicationData !== null;
    const modalTitle = isUpdate ? "編輯用藥記錄" : "新增用藥記錄";
    
    // 預設值設定
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    
    const startDate = isUpdate ? (medicationData.startDate ? new Date(medicationData.startDate).toISOString().split('T')[0] : dateStr) : dateStr;
    const endDate = isUpdate && medicationData.endDate ? new Date(medicationData.endDate).toISOString().split('T')[0] : "";
    
    const modalContent = `
        <div class="form-group">
            <label for="medication-name">藥物名稱 *</label>
            <input type="text" id="medication-name" value="${isUpdate ? medicationData.name : ''}" placeholder="例如：感冒糖漿、抗生素" required>
        </div>
        <div class="form-group">
            <label for="medication-start-date">開始日期 *</label>
            <input type="date" id="medication-start-date" value="${startDate}" required>
        </div>
        <div class="form-group">
            <div class="form-check">
                <input type="checkbox" id="medication-has-ended" ${isUpdate && medicationData.endDate ? "checked" : ""}>
                <label for="medication-has-ended">已結束用藥</label>
            </div>
        </div>
        <div id="medication-end-group" ${isUpdate && medicationData.endDate ? "" : "style='display:none;'"}>
            <div class="form-group">
                <label for="medication-end-date">結束日期 *</label>
                <input type="date" id="medication-end-date" value="${endDate}" ${isUpdate && medicationData.endDate ? "required" : ""}>
            </div>
        </div>
        <div class="form-group">
            <label for="medication-dosage">劑量</label>
            <input type="text" id="medication-dosage" value="${isUpdate && medicationData.dosage ? medicationData.dosage : ''}" placeholder="例如：5ml、一湯匙">
        </div>
        <div class="form-group">
            <label for="medication-frequency">用藥頻率</label>
            <input type="text" id="medication-frequency" value="${isUpdate && medicationData.frequency ? medicationData.frequency : ''}" placeholder="例如：一天三次、每四小時一次">
        </div>
        <div class="form-group">
            <label for="medication-reason">用藥原因</label>
            <input type="text" id="medication-reason" value="${isUpdate && medicationData.reason ? medicationData.reason : ''}" placeholder="例如：感冒、發燒">
        </div>
        <div class="form-group">
            <label for="medication-note">備註</label>
            <textarea id="medication-note" placeholder="可記錄服藥反應或其他觀察">${isUpdate && medicationData.notes ? medicationData.notes : ""}</textarea>
        </div>
    `;
    
    // 設定確認動作
    const onConfirm = async function() {
        // 表單驗證
        const nameInput = document.getElementById("medication-name");
        const startDateInput = document.getElementById("medication-start-date");
        
        if (!nameInput.value.trim()) {
            showToast("請填寫藥物名稱", "warning");
            return;
        }
        
        if (!startDateInput.value) {
            showToast("請選擇開始日期", "warning");
            return;
        }
        
        // 檢查是否有結束日期
        const hasEnded = document.getElementById("medication-has-ended").checked;
        let endDate = null;
        
        if (hasEnded) {
            const endDateInput = document.getElementById("medication-end-date");
            
            if (!endDateInput.value) {
                showToast("請選擇結束日期", "warning");
                return;
            }
            
            endDate = endDateInput.value;
            
            // 檢查結束日期是否晚於開始日期
            if (new Date(endDate) < new Date(startDateInput.value)) {
                showToast("結束日期必須晚於或等於開始日期", "warning");
                return;
            }
        }
        
        // 準備用藥記錄
        const medicationRecord = {
            childId: currentChildId,
            name: nameInput.value.trim(),
            startDate: startDateInput.value,
            endDate: endDate,
            dosage: document.getElementById("medication-dosage").value.trim() || null,
            frequency: document.getElementById("medication-frequency").value.trim() || null,
            reason: document.getElementById("medication-reason").value.trim() || null,
            notes: document.getElementById("medication-note").value.trim() || null
        };
        
        try {
            if (isUpdate) {
                // 更新記錄
                medicationRecord.id = medicationData.id;
                medicationRecord.createdAt = medicationData.createdAt;
                medicationRecord.updatedAt = new Date().toISOString();
                
                await updateRecord(STORES.MEDICATIONS, medicationRecord);
                showToast("用藥記錄已更新", "success");
            } else {
                // 創建新記錄
                medicationRecord.id = generateUniqueId();
                medicationRecord.createdAt = new Date().toISOString();
                
                await addRecord(STORES.MEDICATIONS, medicationRecord);
                showToast("已添加用藥記錄", "success");
            }
            
            // 重新載入數據
            loadMedicationRecords();
        } catch (error) {
            console.error("儲存用藥記錄時發生錯誤:", error);
            showToast("儲存失敗，請稍後再試", "error");
        }
        
        hideModal();
    };
    
    showModal(modalTitle, modalContent, onConfirm);
    
    // 為結束用藥複選框添加事件處理
    document.getElementById("medication-has-ended").addEventListener("change", function() {
        const endGroup = document.getElementById("medication-end-group");
        endGroup.style.display = this.checked ? "block" : "none";
        
        if (this.checked && !document.getElementById("medication-end-date").value) {
            // 如果選擇了結束，預設為今天
            document.getElementById("medication-end-date").value = new Date().toISOString().split('T')[0];
        }
    });
}

// 載入健康檢查記錄
async function loadCheckupRecords() {
    if (!currentChildId) return;
    
    try {
        // 獲取所有健康檢查記錄
        const checkupRecords = await getRecords(STORES.CHECKUPS, "childId", currentChildId);
        
        // 按日期排序 (最新的在前)
        checkupRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // 顯示記錄
        const recordsContainer = document.getElementById("checkup-records");
        
        if (checkupRecords.length === 0) {
            recordsContainer.innerHTML = '<p class="empty-state">尚無健康檢查記錄。</p>';
            return;
        }
        
        let html = "";
        
        checkupRecords.forEach(record => {
            const date = formatDate(record.date);
            
            html += `
                <div class="record-item" data-id="${record.id}">
                    <div class="record-header">
                        <div class="record-title">
                            ${record.type}
                        </div>
                        <div class="record-time">${date}</div>
                    </div>
                    ${record.location ? `<div class="checkup-location">檢查地點: ${record.location}</div>` : ""}
                    ${record.doctor ? `<div class="checkup-doctor">檢查醫師: ${record.doctor}</div>` : ""}
                    ${record.results ? `<div class="checkup-results"><strong>檢查結果:</strong><br>${record.results}</div>` : ""}
                    ${record.notes ? `<div class="record-content">${record.notes}</div>` : ""}
                    <div class="record-actions">
                        <button class="edit-checkup-btn" data-id="${record.id}">
                            <i class="fas fa-edit"></i> 編輯
                        </button>
                        <button class="delete-checkup-btn" data-id="${record.id}">
                            <i class="fas fa-trash-alt"></i> 刪除
                        </button>
                    </div>
                </div>
            `;
        });
        
        recordsContainer.innerHTML = html;
        
        // 添加事件處理
        document.querySelectorAll(".edit-checkup-btn").forEach(btn => {
            btn.addEventListener("click", async function() {
                const recordId = this.getAttribute("data-id");
                const record = await getRecord(STORES.CHECKUPS, recordId);
                if (record) {
                    showAddCheckupModal(record);
                }
            });
        });
        
        document.querySelectorAll(".delete-checkup-btn").forEach(btn => {
            btn.addEventListener("click", function() {
                const recordId = this.getAttribute("data-id");
                showDeleteRecordConfirmation(STORES.CHECKUPS, recordId, "健康檢查記錄", () => {
                    loadCheckupRecords();
                });
            });
        });
        
        // 添加樣式
        const style = document.createElement("style");
        style.textContent = `
            .checkup-location, .checkup-doctor {
                font-size: var(--font-size-sm);
                color: var(--text-secondary);
                margin-bottom: var(--spacing-xs);
            }
            .checkup-results {
                background-color: var(--surface-variant);
                padding: var(--spacing-sm);
                border-radius: var(--border-radius-sm);
                margin-bottom: var(--spacing-sm);
                font-size: var(--font-size-sm);
                white-space: pre-line;
            }
        `;
        
        recordsContainer.appendChild(style);
    } catch (error) {
        console.error("載入健康檢查記錄時發生錯誤:", error);
        document.getElementById("checkup-records").innerHTML = '<p class="empty-state">載入失敗，請稍後再試。</p>';
    }
}

// 顯示添加健康檢查模態框
function showAddCheckupModal(checkupData = null) {
    // 準備模態內容
    const isUpdate = checkupData !== null;
    const modalTitle = isUpdate ? "編輯健康檢查" : "新增健康檢查";
    
    // 預設值設定
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    
    const checkupDate = isUpdate ? (checkupData.date ? new Date(checkupData.date).toISOString().split('T')[0] : dateStr) : dateStr;
    
    const modalContent = `
        <div class="form-group">
            <label for="checkup-type">檢查類型 *</label>
            <input type="text" id="checkup-type" value="${isUpdate ? checkupData.type : ''}" placeholder="例如：一般體檢、視力檢查" required>
        </div>
        <div class="form-group">
            <label for="checkup-date">檢查日期 *</label>
            <input type="date" id="checkup-date" value="${checkupDate}" required>
        </div>
        <div class="form-group">
            <label for="checkup-location">檢查地點</label>
            <input type="text" id="checkup-location" value="${isUpdate && checkupData.location ? checkupData.location : ''}" placeholder="例如：兒童醫院、診所">
        </div>
        <div class="form-group">
            <label for="checkup-doctor">檢查醫師</label>
            <input type="text" id="checkup-doctor" value="${isUpdate && checkupData.doctor ? checkupData.doctor : ''}" placeholder="醫師姓名">
        </div>
        <div class="form-group">
            <label for="checkup-results">檢查結果</label>
            <textarea id="checkup-results" placeholder="記錄檢查的詳細結果">${isUpdate && checkupData.results ? checkupData.results : ""}</textarea>
        </div>
        <div class="form-group">
            <label for="checkup-note">備註</label>
            <textarea id="checkup-note" placeholder="其他備註事項">${isUpdate && checkupData.notes ? checkupData.notes : ""}</textarea>
        </div>
    `;
    
    // 設定確認動作
    const onConfirm = async function() {
        // 表單驗證
        const typeInput = document.getElementById("checkup-type");
        const dateInput = document.getElementById("checkup-date");
        
        if (!typeInput.value.trim()) {
            showToast("請填寫檢查類型", "warning");
            return;
        }
        
        if (!dateInput.value) {
            showToast("請選擇檢查日期", "warning");
            return;
        }
        
        // 準備健康檢查記錄
        const checkupRecord = {
            childId: currentChildId,
            type: typeInput.value.trim(),
            date: dateInput.value,
            location: document.getElementById("checkup-location").value.trim() || null,
            doctor: document.getElementById("checkup-doctor").value.trim() || null,
            results: document.getElementById("checkup-results").value.trim() || null,
            notes: document.getElementById("checkup-note").value.trim() || null
        };
        
        try {
            if (isUpdate) {
                // 更新記錄
                checkupRecord.id = checkupData.id;
                checkupRecord.createdAt = checkupData.createdAt;
                checkupRecord.updatedAt = new Date().toISOString();
                
                await updateRecord(STORES.CHECKUPS, checkupRecord);
                showToast("健康檢查已更新", "success");
            } else {
                // 創建新記錄
                checkupRecord.id = generateUniqueId();
                checkupRecord.createdAt = new Date().toISOString();
                
                await addRecord(STORES.CHECKUPS, checkupRecord);
                showToast("已添加健康檢查", "success");
            }
            
            // 重新載入數據
            loadCheckupRecords();
        } catch (error) {
            console.error("儲存健康檢查時發生錯誤:", error);
            showToast("儲存失敗，請稍後再試", "error");
        }
        
        hideModal();
    };
    
    showModal(modalTitle, modalContent, onConfirm);
}

// 載入里程碑數據
async function loadMilestoneData() {
    if (!currentChildId) return;
    
    try {
        // 獲取所有里程碑記錄
        const milestoneRecords = await getRecords(STORES.MILESTONES, "childId", currentChildId);
        
        // 按類別分類
        const motorMilestones = milestoneRecords.filter(m => m.category === "motor")
            .sort((a, b) => a.sortOrder - b.sortOrder);
        
        const languageMilestones = milestoneRecords.filter(m => m.category === "language")
            .sort((a, b) => a.sortOrder - b.sortOrder);
        
        const socialMilestones = milestoneRecords.filter(m => m.category === "social")
            .sort((a, b) => a.sortOrder - b.sortOrder);
        
        const cognitiveMilestones = milestoneRecords.filter(m => m.category === "cognitive")
            .sort((a, b) => a.sortOrder - b.sortOrder);
        
        const customMilestones = milestoneRecords.filter(m => m.category === "custom")
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        // 顯示各類別里程碑
        displayMilestones("motor-milestones", motorMilestones);
        displayMilestones("language-milestones", languageMilestones);
        displayMilestones("social-milestones", socialMilestones);
        displayMilestones("cognitive-milestones", cognitiveMilestones);
        displayMilestones("custom-milestones", customMilestones, true);
    } catch (error) {
        console.error("載入里程碑數據時發生錯誤:", error);
        showToast("載入里程碑數據失敗", "error");
    }
}

// 顯示里程碑
function displayMilestones(containerId, milestones, isCustom = false) {
    const container = document.getElementById(containerId);
    
    if (milestones.length === 0) {
        container.innerHTML = `<p class="empty-state">${isCustom ? '尚無自訂里程碑。' : '載入中...'}</p>`;
        return;
    }
    
    let html = "";
    
    milestones.forEach(milestone => {
        const achievedDate = milestone.achievedDate ? formatDate(milestone.achievedDate) : "";
        
        html += `
            <div class="milestone-card" data-id="${milestone.id}">
                <div class="milestone-header">
                    <div class="milestone-title">${milestone.title}</div>
                    <div class="milestone-age">${milestone.ageRange}</div>
                </div>
                <div class="milestone-description">${milestone.description}</div>
                <div class="milestone-status">
                    <input type="checkbox" class="milestone-checkbox" id="milestone-${milestone.id}" 
                           ${milestone.achieved ? "checked" : ""} data-id="${milestone.id}">
                    <label for="milestone-${milestone.id}" class="milestone-date">
                        ${milestone.achieved ? `已達成（${achievedDate}）` : "尚未達成"}
                    </label>
                </div>
                ${isCustom ? `
                <div class="milestone-actions">
                    <button class="edit-milestone-btn" data-id="${milestone.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-milestone-btn" data-id="${milestone.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                ` : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // 添加事件處理
    container.querySelectorAll(".milestone-checkbox").forEach(checkbox => {
        checkbox.addEventListener("change", async function() {
            const milestoneId = this.getAttribute("data-id");
            const isAchieved = this.checked;
            
            try {
                const milestone = await getRecord(STORES.MILESTONES, milestoneId);
                
                if (milestone) {
                    milestone.achieved = isAchieved;
                    milestone.achievedDate = isAchieved ? new Date().toISOString() : null;
                    milestone.updatedAt = new Date().toISOString();
                    
                    await updateRecord(STORES.MILESTONES, milestone);
                    
                    // 更新標籤
                    const dateLabel = this.nextElementSibling;
                    if (isAchieved) {
                        dateLabel.textContent = `已達成（${formatDate(new Date())}）`;
                        showToast(`已標記 ${milestone.title} 為已達成！`, "success");
                    } else {
                        dateLabel.textContent = "尚未達成";
                    }
                }
            } catch (error) {
                console.error("更新里程碑狀態時發生錯誤:", error);
                showToast("更新失敗，請稍後再試", "error");
                
                // 恢復原狀態
                this.checked = !isAchieved;
            }
        });
    });
    
    // 為自訂里程碑添加編輯和刪除功能
    if (isCustom) {
        container.querySelectorAll(".edit-milestone-btn").forEach(btn => {
            btn.addEventListener("click", async function() {
                const milestoneId = this.getAttribute("data-id");
                const milestone = await getRecord(STORES.MILESTONES, milestoneId);
                if (milestone) {
                    showAddCustomMilestoneModal(milestone);
                }
            });
        });
        
        container.querySelectorAll(".delete-milestone-btn").forEach(btn => {
            btn.addEventListener("click", function() {
                const milestoneId = this.getAttribute("data-id");
                showDeleteRecordConfirmation(STORES.MILESTONES, milestoneId, "里程碑", () => {
                    loadMilestoneData();
                });
            });
        });
    }
    
    // 添加樣式
    if (isCustom) {
        const style = document.createElement("style");
        style.textContent = `
            .milestone-actions {
                display: flex;
                justify-content: flex-end;
                gap: var(--spacing-sm);
                margin-top: var(--spacing-sm);
            }
            .milestone-actions button {
                background: none;
                border: none;
                color: var(--text-secondary);
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                border-radius: 50%;
                transition: background-color var(--transition-fast);
            }
            .milestone-actions button:hover {
                background-color: var(--surface-variant);
            }
            .edit-milestone-btn:hover {
                color: var(--primary-color);
            }
            .delete-milestone-btn:hover {
                color: var(--danger-color);
            }
        `;
        
        container.appendChild(style);
    }
}

// 顯示添加自訂里程碑模態框
function showAddCustomMilestoneModal(milestoneData = null) {
    // 準備模態內容
    const isUpdate = milestoneData !== null;
    const modalTitle = isUpdate ? "編輯里程碑" : "新增自訂里程碑";
    
    const modalContent = `
        <div class="form-group">
            <label for="milestone-title">里程碑名稱 *</label>
            <input type="text" id="milestone-title" value="${isUpdate ? milestoneData.title : ''}" placeholder="例如：會自己穿襪子" required>
        </div>
        <div class="form-group">
            <label for="milestone-description">描述</label>
            <textarea id="milestone-description" placeholder="描述這個里程碑的詳情">${isUpdate ? milestoneData.description : ""}</textarea>
        </div>
        <div class="form-group">
            <label for="milestone-age">適當年齡範圍</label>
            <input type="text" id="milestone-age" value="${isUpdate ? milestoneData.ageRange : ''}" placeholder="例如：18-24 個月">
        </div>
        <div class="form-group">
            <div class="form-check">
                <input type="checkbox" id="milestone-achieved" ${isUpdate && milestoneData.achieved ? "checked" : ""}>
                <label for="milestone-achieved">已達成</label>
            </div>
        </div>
        <div id="milestone-date-group" class="${isUpdate && milestoneData.achieved ? "" : "hidden"}">
            <div class="form-group">
                <label for="milestone-achieved-date">達成日期</label>
                <input type="date" id="milestone-achieved-date" value="${isUpdate && milestoneData.achievedDate ? new Date(milestoneData.achievedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}">
            </div>
        </div>
        <div class="form-group">
            <label for="milestone-notes">備註</label>
            <textarea id="milestone-notes" placeholder="其他備註">${isUpdate && milestoneData.notes ? milestoneData.notes : ""}</textarea>
        </div>
    `;
    
    // 設定確認動作
    const onConfirm = async function() {
        // 表單驗證
        const titleInput = document.getElementById("milestone-title");
        
        if (!titleInput.value.trim()) {
            showToast("請填寫里程碑名稱", "warning");
            return;
        }
        
        // 獲取是否已達成
        const isAchieved = document.getElementById("milestone-achieved").checked;
        let achievedDate = null;
        
        if (isAchieved) {
            const dateInput = document.getElementById("milestone-achieved-date");
            achievedDate = dateInput.value ? new Date(dateInput.value).toISOString() : new Date().toISOString();
        }
        
        // 準備里程碑記錄
        const milestoneRecord = {
            childId: currentChildId,
            category: "custom",
            title: titleInput.value.trim(),
            description: document.getElementById("milestone-description").value.trim(),
            ageRange: document.getElementById("milestone-age").value.trim() || "自訂",
            achieved: isAchieved,
            achievedDate: achievedDate,
            notes: document.getElementById("milestone-notes").value.trim(),
            sortOrder: 0 // 自訂里程碑不需要排序
        };
        
        try {
            if (isUpdate) {
                // 更新記錄
                milestoneRecord.id = milestoneData.id;
                milestoneRecord.createdAt = milestoneData.createdAt;
                milestoneRecord.updatedAt = new Date().toISOString();
                
                await updateRecord(STORES.MILESTONES, milestoneRecord);
                showToast("里程碑已更新", "success");
            } else {
                // 創建新記錄
                milestoneRecord.id = generateUniqueId();
                milestoneRecord.createdAt = new Date().toISOString();
                
                await addRecord(STORES.MILESTONES, milestoneRecord);
                showToast("已添加自訂里程碑", "success");
            }
            
            // 重新載入數據
            loadMilestoneData();
        } catch (error) {
            console.error("儲存里程碑時發生錯誤:", error);
            showToast("儲存失敗，請稍後再試", "error");
        }
        
        hideModal();
    };
    
    showModal(modalTitle, modalContent, onConfirm);
    
    // 為已達成複選框添加事件處理
    document.getElementById("milestone-achieved").addEventListener("change", function() {
        const dateGroup = document.getElementById("milestone-date-group");
        dateGroup.classList.toggle("hidden", !this.checked);
    });
}

// 顯示添加親子互動記錄模態框
function showAddInteractionModal(interactionData = null) {
    // 準備模態內容
    const isUpdate = interactionData !== null;
    const modalTitle = isUpdate ? "編輯親子互動" : "新增親子互動";
    
    // 預設值設定
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const interactionDate = isUpdate ? new Date(interactionData.timestamp).toISOString().split('T')[0] : dateStr;
    const interactionTime = isUpdate ? formatTime(interactionData.timestamp) : timeStr;
    
    const modalContent = `
        <div class="form-group">
            <label for="interaction-title">互動標題 *</label>
            <input type="text" id="interaction-title" value="${isUpdate ? interactionData.title : ''}" placeholder="例如：第一次笑、游泳課" required>
        </div>
        <div class="form-group">
            <label for="interaction-date">日期 *</label>
            <input type="date" id="interaction-date" value="${interactionDate}" required>
        </div>
        <div class="form-group">
            <label for="interaction-time">時間 *</label>
            <input type="time" id="interaction-time" value="${interactionTime}" required>
        </div>
        <div class="form-group">
            <label for="interaction-mood">寶寶情緒</label>
            <select id="interaction-mood">
                <option value="">-- 選擇情緒 --</option>
                <option value="happy" ${isUpdate && interactionData.mood === "happy" ? "selected" : ""}>開心</option>
                <option value="calm" ${isUpdate && interactionData.mood === "calm" ? "selected" : ""}>平靜</option>
                <option value="excited" ${isUpdate && interactionData.mood === "excited" ? "selected" : ""}>興奮</option>
                <option value="curious" ${isUpdate && interactionData.mood === "curious" ? "selected" : ""}>好奇</option>
                <option value="tired" ${isUpdate && interactionData.mood === "tired" ? "selected" : ""}>疲憊</option>
                <option value="fussy" ${isUpdate && interactionData.mood === "fussy" ? "selected" : ""}>煩躁</option>
                <option value="upset" ${isUpdate && interactionData.mood === "upset" ? "selected" : ""}>不開心</option>
            </select>
        </div>
        <div class="form-group">
            <label for="interaction-description">描述</label>
            <textarea id="interaction-description" placeholder="描述這次互動的詳情">${isUpdate && interactionData.description ? interactionData.description : ""}</textarea>
        </div>
        <div class="form-group">
            <label for="interaction-photo">照片</label>
            <input type="file" id="interaction-photo" accept="image/*">
            ${isUpdate && interactionData.photo ? `<div class="preview-photo"><img src="${interactionData.photo}" alt="互動照片" style="max-width: 100%; max-height: 200px; margin-top: 8px;"></div>` : ''}
        </div>
    `;
    
    // 設定確認動作
    const onConfirm = async function() {
        // 表單驗證
        const titleInput = document.getElementById("interaction-title");
        const dateInput = document.getElementById("interaction-date");
        const timeInput = document.getElementById("interaction-time");
        
        if (!titleInput.value.trim()) {
            showToast("請填寫互動標題", "warning");
            return;
        }
        
        if (!dateInput.value || !timeInput.value) {
            showToast("請填寫日期和時間", "warning");
            return;
        }
        
        // 構建時間戳
        const dateTimeStr = `${dateInput.value}T${timeInput.value}:00`;
        const timestamp = new Date(dateTimeStr).toISOString();
        
        // 處理照片
        const photoInput = document.getElementById("interaction-photo");
        let photoBase64 = isUpdate ? interactionData.photo : null;
        
        if (photoInput.files && photoInput.files[0]) {
            try {
                photoBase64 = await readFileAsDataURL(photoInput.files[0]);
            } catch (error) {
                console.error("讀取照片時發生錯誤:", error);
                showToast("照片處理失敗，請選擇較小的檔案或不同格式", "error");
                return;
            }
        }
        
        // 準備互動記錄
        const interactionRecord = {
            childId: currentChildId,
            timestamp: timestamp,
            title: titleInput.value.trim(),
            description: document.getElementById("interaction-description").value.trim(),
            mood: document.getElementById("interaction-mood").value || null,
            photo: photoBase64
        };
        
        try {
            if (isUpdate) {
                // 更新記錄
                interactionRecord.id = interactionData.id;
                interactionRecord.createdAt = interactionData.createdAt;
                interactionRecord.updatedAt = new Date().toISOString();
                
                await updateRecord(STORES.INTERACTIONS, interactionRecord);
                showToast("親子互動已更新", "success");
            } else {
                // 創建新記錄
                interactionRecord.id = generateUniqueId();
                interactionRecord.createdAt = new Date().toISOString();
                
                await addRecord(STORES.INTERACTIONS, interactionRecord);
                showToast("已添加親子互動", "success");
            }
            
            // 重新載入數據
            if (currentPage === "interaction") {
                loadInteractionRecords();
            } else if (currentPage === "dashboard") {
                loadDashboardData();
            }
        } catch (error) {
            console.error("儲存親子互動時發生錯誤:", error);
            showToast("儲存失敗，請稍後再試", "error");
        }
        
        hideModal();
    };
    
    showModal(modalTitle, modalContent, onConfirm);
}

// 載入親子互動記錄
async function loadInteractionRecords() {
    if (!currentChildId) return;
    
    try {
        // 獲取所有親子互動記錄
        const interactionRecords = await getRecords(STORES.INTERACTIONS, "childId", currentChildId);
        
        // 按時間排序 (最新的在前)
        interactionRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // 顯示記錄
        const recordsContainer = document.getElementById("interaction-records");
        
        if (interactionRecords.length === 0) {
            recordsContainer.innerHTML = '<p class="empty-state">尚無互動記錄。點擊「新增互動記錄」按鈕開始記錄美好時光。</p>';
            return;
        }
        
        let html = "";
        
        interactionRecords.forEach(record => {
            const date = formatDate(record.timestamp);
            const time = formatTime(record.timestamp);
            
            let moodText = "";
            if (record.mood) {
                let moodLabel = "";
                let moodIcon = "";
                
                switch (record.mood) {
                    case "happy":
                        moodLabel = "開心";
                        moodIcon = "fa-smile";
                        break;
                    case "calm":
                        moodLabel = "平靜";
                        moodIcon = "fa-meh";
                        break;
                    case "excited":
                        moodLabel = "興奮";
                        moodIcon = "fa-grin-stars";
                        break;
                    case "curious":
                        moodLabel = "好奇";
                        moodIcon = "fa-question-circle";
                        break;
                    case "tired":
                        moodLabel = "疲憊";
                        moodIcon = "fa-tired";
                        break;
                    case "fussy":
                        moodLabel = "煩躁";
                        moodIcon = "fa-frown";
                        break;
                    case "upset":
                        moodLabel = "不開心";
                        moodIcon = "fa-sad-tear";
                        break;
                }
                
                moodText = `<span class="interaction-mood"><i class="far ${moodIcon}"></i> ${moodLabel}</span>`;
            }
            
            html += `
                <div class="interaction-item" data-id="${record.id}">
                    <div class="interaction-header">
                        <div class="interaction-title">${record.title}</div>
                        <div class="interaction-time">${date} ${time}</div>
                    </div>
                    ${record.photo ? `<img src="${record.photo}" alt="${record.title}" class="interaction-photo">` : ""}
                    ${record.description ? `<div class="interaction-description">${record.description}</div>` : ""}
                    <div class="interaction-meta">
                        ${moodText}
                    </div>
                    <div class="record-actions">
                        <button class="edit-interaction-btn" data-id="${record.id}">
                            <i class="fas fa-edit"></i> 編輯
                        </button>
                        <button class="delete-interaction-btn" data-id="${record.id}">
                            <i class="fas fa-trash-alt"></i> 刪除
                        </button>
                    </div>
                </div>
            `;
        });
        
        recordsContainer.innerHTML = html;
        
        // 添加事件處理
        document.querySelectorAll(".edit-interaction-btn").forEach(btn => {
            btn.addEventListener("click", async function() {
                const recordId = this.getAttribute("data-id");
                const record = await getRecord(STORES.INTERACTIONS, recordId);
                if (record) {
                    showAddInteractionModal(record);
                }
            });
        });
        
        document.querySelectorAll(".delete-interaction-btn").forEach(btn => {
            btn.addEventListener("click", function() {
                const recordId = this.getAttribute("data-id");
                showDeleteRecordConfirmation(STORES.INTERACTIONS, recordId, "互動記錄", () => {
                    loadInteractionRecords();
                    if (currentPage === "dashboard") {
                        loadDashboardData();
                    }
                });
            });
        });
    } catch (error) {
        console.error("載入親子互動記錄時發生錯誤:", error);
        document.getElementById("interaction-records").innerHTML = '<p class="empty-state">載入失敗，請稍後再試。</p>';
    }
}

// 顯示添加日常活動記錄模態框
function showAddActivityModal(activityData = null) {
    // 準備模態內容
    const isUpdate = activityData !== null;
    const modalTitle = isUpdate ? "編輯活動記錄" : "新增活動記錄";
    
    // 預設值設定
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const activityDate = isUpdate ? new Date(activityData.timestamp).toISOString().split('T')[0] : dateStr;
    const activityTime = isUpdate ? formatTime(activityData.timestamp) : timeStr;
    const activityType = isUpdate ? activityData.type : "bath";
    const activityDuration = isUpdate && activityData.duration ? activityData.duration : "";
    
    const modalContent = `
        <div class="form-group">
            <label>活動類型 *</label>
            <div class="radio-group">
                <div class="radio-btn">
                    <input type="radio" id="activity-bath" name="activity-type" value="bath" ${activityType === "bath" ? "checked" : ""}>
                    <label for="activity-bath">
                        <i class="fas fa-bath"></i>
                        洗澡
                    </label>
                </div>
                <div class="radio-btn">
                    <input type="radio" id="activity-play" name="activity-type" value="play" ${activityType === "play" ? "checked" : ""}>
                    <label for="activity-play">
                        <i class="fas fa-puzzle-piece"></i>
                        遊戲
                    </label>
                </div>
                <div class="radio-btn">
                    <input type="radio" id="activity-massage" name="activity-type" value="massage" ${activityType === "massage" ? "checked" : ""}>
                    <label for="activity-massage">
                        <i class="fas fa-hands"></i>
                        按摩
                    </label>
                </div>
                <div class="radio-btn">
                    <input type="radio" id="activity-other" name="activity-type" value="other" ${activityType === "other" ? "checked" : ""}>
                    <label for="activity-other">
                        <i class="fas fa-star"></i>
                        其他
                    </label>
                </div>
            </div>
        </div>
        <div id="activity-custom-type-group" class="${activityType === "other" ? "" : "hidden"} form-group">
            <label for="activity-custom-type">自訂活動類型 *</label>
            <input type="text" id="activity-custom-type" value="${isUpdate && activityData.customType ? activityData.customType : ''}" placeholder="例如：游泳、讀書">
        </div>
        <div class="form-group">
            <label for="activity-date">日期 *</label>
            <input type="date" id="activity-date" value="${activityDate}" required>
        </div>
        <div class="form-group">
            <label for="activity-time">時間 *</label>
            <input type="time" id="activity-time" value="${activityTime}" required>
        </div>
        <div class="form-group">
            <label for="activity-duration">持續時間 (分鐘)</label>
            <input type="number" id="activity-duration" value="${activityDuration}" placeholder="例如：30">
        </div>
        <div class="form-group">
            <label for="activity-note">備註</label>
            <textarea id="activity-note" placeholder="可記錄活動中的觀察或特殊情況">${isUpdate && activityData.notes ? activityData.notes : ""}</textarea>
        </div>
    `;
    
    // 設定確認動作
    const onConfirm = async function() {
        // 表單驗證
        const dateInput = document.getElementById("activity-date");
        const timeInput = document.getElementById("activity-time");
        
        if (!dateInput.value || !timeInput.value) {
            showToast("請填寫日期和時間", "warning");
            return;
        }
        
        // 獲取選擇的活動類型
        const typeRadios = document.getElementsByName("activity-type");
        let selectedType = "bath";
        for (const radio of typeRadios) {
            if (radio.checked) {
                selectedType = radio.value;
                break;
            }
        }
        
        // 如果是自訂類型，檢查是否填寫
        let customType = null;
        if (selectedType === "other") {
            customType = document.getElementById("activity-custom-type").value.trim();
            if (!customType) {
                showToast("請填寫自訂活動類型", "warning");
                return;
            }
        }
        
        // 構建時間戳
        const dateTimeStr = `${dateInput.value}T${timeInput.value}:00`;
        const timestamp = new Date(dateTimeStr).toISOString();
        
        // 準備活動記錄
        const activityRecord = {
            childId: currentChildId,
            timestamp: timestamp,
            type: selectedType,
            customType: customType,
            duration: document.getElementById("activity-duration").value || null,
            notes: document.getElementById("activity-note").value.trim()
        };
        
        try {
            if (isUpdate) {
                // 更新記錄
                activityRecord.id = activityData.id;
                activityRecord.createdAt = activityData.createdAt;
                activityRecord.updatedAt = new Date().toISOString();
                
                await updateRecord(STORES.ACTIVITIES, activityRecord);
                showToast("活動記錄已更新", "success");
            } else {
                // 創建新記錄
                activityRecord.id = generateUniqueId();
                activityRecord.createdAt = new Date().toISOString();
                
                await addRecord(STORES.ACTIVITIES, activityRecord);
                showToast("已添加活動記錄", "success");
            }
            
            // 重新載入數據
            if (currentPage === "activity") {
                loadActivityRecords();
            } else if (currentPage === "dashboard") {
                loadDashboardData();
            }
        } catch (error) {
            console.error("儲存活動記錄時發生錯誤:", error);
            showToast("儲存失敗，請稍後再試", "error");
        }
        
        hideModal();
    };
    
    showModal(modalTitle, modalContent, onConfirm);
    
    // 為活動類型添加事件處理
    document.getElementsByName("activity-type").forEach(radio => {
        radio.addEventListener("change", function() {
            const customTypeGroup = document.getElementById("activity-custom-type-group");
            
            if (this.value === "other") {
                customTypeGroup.classList.remove("hidden");
            } else {
                customTypeGroup.classList.add("hidden");
            }
        });
    });
}

// 載入日常活動記錄
async function loadActivityRecords() {
    if (!currentChildId) return;
    
    try {
        // 獲取所有日常活動記錄
        const activityRecords = await getRecords(STORES.ACTIVITIES, "childId", currentChildId);
        
        // 獲取過濾設置
        const filterSelect = document.getElementById("activity-filter");
        const filter = filterSelect.value;
        
        // 過濾記錄
        let filteredRecords = activityRecords;
        if (filter !== "all") {
            filteredRecords = activityRecords.filter(record => record.type === filter);
        }
        
        // 按時間排序 (最新的在前)
        filteredRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // 顯示記錄
        const recordsContainer = document.getElementById("activity-records");
        
        if (filteredRecords.length === 0) {
            recordsContainer.innerHTML = '<p class="empty-state">無符合條件的活動記錄。</p>';
            return;
        }
        
        let html = "";
        
        filteredRecords.forEach(record => {
            const date = formatDate(record.timestamp);
            const time = formatTime(record.timestamp);
            
            let typeText = "";
            let typeIcon = "";
            
            switch (record.type) {
                case "bath":
                    typeText = "洗澡";
                    typeIcon = "fa-bath";
                    break;
                case "play":
                    typeText = "遊戲";
                    typeIcon = "fa-puzzle-piece";
                    break;
                case "massage":
                    typeText = "按摩";
                    typeIcon = "fa-hands";
                    break;
                case "other":
                    typeText = record.customType || "其他";
                    typeIcon = "fa-star";
                    break;
            }
            
            html += `
                <div class="record-item" data-id="${record.id}">
                    <div class="record-header">
                        <div class="record-title">
                            <span class="activity-type"><i class="fas ${typeIcon}"></i> ${typeText}</span>
                        </div>
                        <div class="record-time">${date} ${time}</div>
                    </div>
                    ${record.duration ? `<div class="activity-duration">持續時間: ${record.duration} 分鐘</div>` : ""}
                    ${record.notes ? `<div class="record-content">${record.notes}</div>` : ""}
                    <div class="record-actions">
                        <button class="edit-activity-btn" data-id="${record.id}">
                            <i class="fas fa-edit"></i> 編輯
                        </button>
                        <button class="delete-activity-btn" data-id="${record.id}">
                            <i class="fas fa-trash-alt"></i> 刪除
                        </button>
                    </div>
                </div>
            `;
        });
        
        recordsContainer.innerHTML = html;
        
        // 添加事件處理
        document.querySelectorAll(".edit-activity-btn").forEach(btn => {
            btn.addEventListener("click", async function() {
                const recordId = this.getAttribute("data-id");
                const record = await getRecord(STORES.ACTIVITIES, recordId);
                if (record) {
                    showAddActivityModal(record);
                }
            });
        });
        
        document.querySelectorAll(".delete-activity-btn").forEach(btn => {
            btn.addEventListener("click", function() {
                const recordId = this.getAttribute("data-id");
                showDeleteRecordConfirmation(STORES.ACTIVITIES, recordId, "活動記錄", () => {
                    loadActivityRecords();
                    if (currentPage === "dashboard") {
                        loadDashboardData();
                    }
                });
            });
        });
        
        // 添加樣式
        const style = document.createElement("style");
        style.textContent = `
            .activity-type {
                display: inline-block;
                padding: var(--spacing-xs) var(--spacing-sm);
                border-radius: var(--border-radius-sm);
                font-size: var(--font-size-sm);
                background-color: var(--primary-very-light);
                color: var(--primary-color);
            }
            .activity-duration {
                font-size: var(--font-size-sm);
                color: var(--text-secondary);
                margin-bottom: var(--spacing-sm);
            }
        `;
        
        recordsContainer.appendChild(style);
    } catch (error) {
        console.error("載入日常活動記錄時發生錯誤:", error);
        document.getElementById("activity-records").innerHTML = '<p class="empty-state">載入失敗，請稍後再試。</p>';
    }
}

// 載入報告數據
async function loadReportData() {
    if (!currentChildId) return;
    
    try {
        // 獲取選擇的報告期間
        const reportPeriodSelect = document.getElementById("report-period");
        const reportPeriod = reportPeriodSelect.value;
        
        // 計算日期範圍
        const endDate = new Date();
        let startDate = new Date();
        
        switch (reportPeriod) {
            case "7days":
                startDate.setDate(startDate.getDate() - 7);
                break;
            case "30days":
                startDate.setDate(startDate.getDate() - 30);
                break;
            case "3months":
                startDate.setMonth(startDate.getMonth() - 3);
                break;
            case "custom":
                // 這裡應該顯示自訂日期選擇器，暫時使用30天
                startDate.setDate(startDate.getDate() - 30);
                break;
        }
        
        // 轉換為時間戳
        const startTimestamp = startDate.toISOString();
        const endTimestamp = endDate.toISOString();
        
        // 載入各類報告數據
        await loadFeedingReport(startTimestamp, endTimestamp);
        await loadSleepReport(startTimestamp, endTimestamp);
        await loadDiaperReport(startTimestamp, endTimestamp);
        await loadGrowthReport(startTimestamp, endTimestamp);
    } catch (error) {
        console.error("載入報告數據時發生錯誤:", error);
        showToast("載入報告數據失敗", "error");
    }
}

// 載入餵食報告
async function loadFeedingReport(startTimestamp, endTimestamp) {
    try {
        // 獲取指定時間範圍內的餵食記錄
        const feedingRecords = await getRecordsInRange(
            STORES.FEEDINGS,
            "childId_timestamp",
            [currentChildId, startTimestamp],
            [currentChildId, endTimestamp]
        );
        
        // 按日期分組
        const feedingsByDate = {};
        const dateLabels = [];
        
        // 獲取日期範圍內的所有日期
        const startDate = new Date(startTimestamp);
        const endDate = new Date(endTimestamp);
        const dateRange = [];
        
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateStr = formatDate(currentDate);
            dateRange.push(dateStr);
            feedingsByDate[dateStr] = { breast: 0, formula: 0, solid: 0, totalFormula: 0 };
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // 統計每天各類型餵食次數
        feedingRecords.forEach(record => {
            const date = formatDate(record.timestamp);
            
            if (feedingsByDate[date]) {
                if (record.type === "breast") {
                    feedingsByDate[date].breast++;
                } else if (record.type === "formula") {
                    feedingsByDate[date].formula++;
                    if (record.amount) {
                        feedingsByDate[date].totalFormula += parseFloat(record.amount);
                    }
                } else if (record.type === "solid") {
                    feedingsByDate[date].solid++;
                }
            }
        });
        
        // 準備圖表數據
        const labels = dateRange;
        const breastData = labels.map(date => feedingsByDate[date].breast);
        const formulaData = labels.map(date => feedingsByDate[date].formula);
        const solidData = labels.map(date => feedingsByDate[date].solid);
        const totalData = labels.map(date => feedingsByDate[date].breast + feedingsByDate[date].formula + feedingsByDate[date].solid);
        
        // 創建餵食概覽圖表
        const feedingOverviewCtx = document.getElementById("feeding-overview-chart").getContext("2d");
        const feedingOverviewDatasets = [
            {
                label: '總餵食次數',
                data: totalData,
                backgroundColor: 'rgba(75, 174, 209, 0.7)',
                borderColor: 'rgba(75, 174, 209, 1)',
                borderWidth: 2,
                fill: false,
                tension: 0.3
            }
        ];
        
        createBasicChart(feedingOverviewCtx, 'line', labels, feedingOverviewDatasets);
        
        // 計算餵食類型比例
        const breastCount = feedingRecords.filter(r => r.type === "breast").length;
        const formulaCount = feedingRecords.filter(r => r.type === "formula").length;
        const solidCount = feedingRecords.filter(r => r.type === "solid").length;
        const totalCount = breastCount + formulaCount + solidCount;
        
        // 創建餵食類型圖表
        const feedingTypeCtx = document.getElementById("feeding-type-chart").getContext("2d");
        const feedingTypeDatasets = [
            {
                data: [breastCount, formulaCount, solidCount],
                backgroundColor: [
                    'rgba(241, 165, 165, 0.7)',
                    'rgba(97, 154, 236, 0.7)',
                    'rgba(109, 183, 108, 0.7)'
                ]
            }
        ];
        
        createBasicChart(feedingTypeCtx, 'doughnut', ['母乳', '配方奶', '副食品'], feedingTypeDatasets, {
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        });
        
        // 生成摘要文字
        let summaryHtml = "";
        
        if (totalCount === 0) {
            summaryHtml = "<p>所選時間範圍內沒有餵食記錄。</p>";
        } else {
            // 計算平均每日餵食次數
            const daysCount = dateRange.length;
            const avgFeedingsPerDay = (totalCount / daysCount).toFixed(1);
            
            // 計算配方奶總量
            const totalFormulaMl = feedingRecords
                .filter(r => r.type === "formula" && r.amount)
                .reduce((total, r) => total + parseFloat(r.amount), 0);
            
            // 計算比例
            const breastPercentage = totalCount > 0 ? ((breastCount / totalCount) * 100).toFixed(1) : 0;
            const formulaPercentage = totalCount > 0 ? ((formulaCount / totalCount) * 100).toFixed(1) : 0;
            const solidPercentage = totalCount > 0 ? ((solidCount / totalCount) * 100).toFixed(1) : 0;
            
            summaryHtml = `
                <p><strong>總覽:</strong> 期間內共有 ${totalCount} 次餵食記錄，平均每天 ${avgFeedingsPerDay} 次。</p>
                <p><strong>餵食類型分布:</strong></p>
                <ul>
                    <li>母乳: ${breastCount} 次 (${breastPercentage}%)</li>
                    <li>配方奶: ${formulaCount} 次 (${formulaPercentage}%)，共 ${totalFormulaMl.toFixed(0)} ml</li>
                    <li>副食品: ${solidCount} 次 (${solidPercentage}%)</li>
                </ul>
            `;
        }
        
        document.getElementById("feeding-report-summary").innerHTML = summaryHtml;
    } catch (error) {
        console.error("載入餵食報告時發生錯誤:", error);
        document.getElementById("feeding-report-summary").innerHTML = "<p>載入失敗，請稍後再試。</p>";
    }
}

// 載入睡眠報告
async function loadSleepReport(startTimestamp, endTimestamp) {
    try {
        // 獲取可能落在時間範圍內的睡眠記錄 (根據開始時間)
        const sleepRecords = await getRecordsInRange(
            STORES.SLEEPS,
            "childId_startTime",
            [currentChildId, startTimestamp],
            [currentChildId, endTimestamp]
        );
        
        // 按日期分組
        const sleepsByDate = {};
        
        // 獲取日期範圍內的所有日期
        const startDate = new Date(startTimestamp);
        const endDate = new Date(endTimestamp);
        const dateRange = [];
        
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateStr = formatDate(currentDate);
            dateRange.push(dateStr);
            sleepsByDate[dateStr] = { totalMinutes: 0, count: 0 };
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // 統計每天睡眠時間
        sleepRecords.forEach(record => {
            if (!record.endTime) return; // 跳過尚未結束的睡眠
            
            const startTime = new Date(record.startTime);
            const endTime = new Date(record.endTime);
            
            // 確保開始時間在範圍內
            if (startTime >= startDate && startTime <= endDate) {
                const dateStr = formatDate(startTime);
                
                // 計算睡眠時間 (分鐘)
                const durationMs = endTime - startTime;
                const durationMinutes = Math.floor(durationMs / 1000 / 60);
                
                if (sleepsByDate[dateStr]) {
                    sleepsByDate[dateStr].totalMinutes += durationMinutes;
                    sleepsByDate[dateStr].count++;
                }
            }
        });
        
        // 準備圖表數據
        const labels = dateRange;
        const sleepHoursData = labels.map(date => (sleepsByDate[date].totalMinutes / 60).toFixed(1));
        
        // 創建睡眠概覽圖表
        const sleepOverviewCtx = document.getElementById("sleep-overview-chart").getContext("2d");
        const sleepOverviewDatasets = [
            {
                label: '睡眠時間 (小時)',
                data: sleepHoursData,
                backgroundColor: 'rgba(168, 132, 196, 0.7)',
                borderColor: 'rgba(168, 132, 196, 1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }
        ];
        
        createBasicChart(sleepOverviewCtx, 'line', labels, sleepOverviewDatasets);
        
        // 計算睡眠模式（白天vs晚上）
        const daySleepMinutes = [];
        const nightSleepMinutes = [];
        
        // 定義白天和晚上的時間範圍 (6am-8pm是白天)
        const isDaytime = (hour) => hour >= 6 && hour < 20;
        
        // 計算每天的白天/晚上睡眠時間
        for (const dateStr of dateRange) {
            const date = new Date(dateStr);
            let dayMinutes = 0;
            let nightMinutes = 0;
            
            for (const record of sleepRecords) {
                if (!record.endTime) continue;
                
                const startTime = new Date(record.startTime);
                const endTime = new Date(record.endTime);
                const recordDateStr = formatDate(startTime);
                
                // 只計算當天的睡眠
                if (recordDateStr === dateStr) {
                    // 計算睡眠時間 (分鐘)
                    const durationMs = endTime - startTime;
                    const durationMinutes = Math.floor(durationMs / 1000 / 60);
                    
                    // 根據開始時間判斷是白天還是晚上
                    if (isDaytime(startTime.getHours())) {
                        dayMinutes += durationMinutes;
                    } else {
                        nightMinutes += durationMinutes;
                    }
                }
            }
            
            // 轉換為小時
            daySleepMinutes.push((dayMinutes / 60).toFixed(1));
            nightSleepMinutes.push((nightMinutes / 60).toFixed(1));
        }
        
        // 創建睡眠模式圖表
        const sleepPatternCtx = document.getElementById("sleep-pattern-chart").getContext("2d");
        const sleepPatternDatasets = [
            {
                label: '白天睡眠',
                data: daySleepMinutes,
                backgroundColor: 'rgba(241, 165, 165, 0.7)',
                borderColor: 'rgba(241, 165, 165, 1)',
                borderWidth: 2,
                fill: false
            },
            {
                label: '夜間睡眠',
                data: nightSleepMinutes,
                backgroundColor: 'rgba(97, 154, 236, 0.7)',
                borderColor: 'rgba(97, 154, 236, 1)',
                borderWidth: 2,
                fill: false
            }
        ];
        
        createBasicChart(sleepPatternCtx, 'line', labels, sleepPatternDatasets);
        
        // 生成摘要文字
        let summaryHtml = "";
        
        if (sleepRecords.length === 0) {
            summaryHtml = "<p>所選時間範圍內沒有睡眠記錄。</p>";
        } else {
            // 計算總睡眠時間
            const completedSleeps = sleepRecords.filter(record => record.endTime);
            const totalSleepMinutes = completedSleeps.reduce((total, record) => {
                const startTime = new Date(record.startTime);
                const endTime = new Date(record.endTime);
                return total + (endTime - startTime) / 1000 / 60;
            }, 0);
            
            // 計算平均每日睡眠時間
            const daysCount = dateRange.length;
            const avgSleepHoursPerDay = (totalSleepMinutes / 60 / daysCount).toFixed(1);
            
            // 計算平均每次睡眠時間
            const avgSleepDuration = (totalSleepMinutes / completedSleeps.length).toFixed(0);
            const avgSleepHours = Math.floor(avgSleepDuration / 60);
            const avgSleepMinutes = Math.floor(avgSleepDuration % 60);
            
            // 計算白天和晚上睡眠時間
            const totalDaySleepMinutes = completedSleeps.reduce((total, record) => {
                const startTime = new Date(record.startTime);
                const endTime = new Date(record.endTime);
                
                if (isDaytime(startTime.getHours())) {
                    return total + (endTime - startTime) / 1000 / 60;
                }
                return total;
            }, 0);
            
            const totalNightSleepMinutes = completedSleeps.reduce((total, record) => {
                const startTime = new Date(record.startTime);
                const endTime = new Date(record.endTime);
                
                if (!isDaytime(startTime.getHours())) {
                    return total + (endTime - startTime) / 1000 / 60;
                }
                return total;
            }, 0);
            
            const avgDaySleepHours = (totalDaySleepMinutes / 60 / daysCount).toFixed(1);
            const avgNightSleepHours = (totalNightSleepMinutes / 60 / daysCount).toFixed(1);
            
            summaryHtml = `
                <p><strong>總覽:</strong> 期間內共有 ${completedSleeps.length} 次睡眠記錄，平均每天睡眠 ${avgSleepHoursPerDay} 小時。</p>
                <p><strong>平均每次睡眠時間:</strong> ${avgSleepHours} 小時 ${avgSleepMinutes} 分鐘</p>
                <p><strong>睡眠分布:</strong></p>
                <ul>
                    <li>白天睡眠 (6am-8pm): 平均每天 ${avgDaySleepHours} 小時</li>
                    <li>夜間睡眠 (8pm-6am): 平均每天 ${avgNightSleepHours} 小時</li>
                </ul>
            `;
        }
        
        document.getElementById("sleep-report-summary").innerHTML = summaryHtml;
    } catch (error) {
        console.error("載入睡眠報告時發生錯誤:", error);
        document.getElementById("sleep-report-summary").innerHTML = "<p>載入失敗，請稍後再試。</p>";
    }
}

// 載入尿布報告
async function loadDiaperReport(startTimestamp, endTimestamp) {
    try {
        // 獲取指定時間範圍內的尿布記錄
        const diaperRecords = await getRecordsInRange(
            STORES.DIAPERS,
            "childId_timestamp",
            [currentChildId, startTimestamp],
            [currentChildId, endTimestamp]
        );
        
        // 按日期分組
        const diapersByDate = {};
        
        // 獲取日期範圍內的所有日期
        const startDate = new Date(startTimestamp);
        const endDate = new Date(endTimestamp);
        const dateRange = [];
        
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateStr = formatDate(currentDate);
            dateRange.push(dateStr);
            diapersByDate[dateStr] = { wet: 0, dirty: 0, mixed: 0 };
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // 統計每天各類型尿布次數
        diaperRecords.forEach(record => {
            const date = formatDate(record.timestamp);
            
            if (diapersByDate[date]) {
                diapersByDate[date][record.type]++;
            }
        });
        
        // 準備圖表數據
        const labels = dateRange;
        const wetData = labels.map(date => diapersByDate[date].wet);
        const dirtyData = labels.map(date => diapersByDate[date].dirty);
        const mixedData = labels.map(date => diapersByDate[date].mixed);
        const totalData = labels.map(date => diapersByDate[date].wet + diapersByDate[date].dirty + diapersByDate[date].mixed);
        
        // 創建尿布概覽圖表
        const diaperOverviewCtx = document.getElementById("diaper-overview-chart").getContext("2d");
        const diaperOverviewDatasets = [
            {
                label: '總尿布數',
                data: totalData,
                backgroundColor: 'rgba(75, 174, 209, 0.7)',
                borderColor: 'rgba(75, 174, 209, 1)',
                borderWidth: 2,
                fill: false,
                tension: 0.3
            }
        ];
        
        createBasicChart(diaperOverviewCtx, 'line', labels, diaperOverviewDatasets);
        
        // 計算尿布類型比例
        const wetCount = diaperRecords.filter(r => r.type === "wet").length;
        const dirtyCount = diaperRecords.filter(r => r.type === "dirty").length;
        const mixedCount = diaperRecords.filter(r => r.type === "mixed").length;
        const totalCount = wetCount + dirtyCount + mixedCount;
        
        // 創建尿布類型圖表
        const diaperTypeCtx = document.getElementById("diaper-type-chart").getContext("2d");
        const diaperTypeDatasets = [
            {
                data: [wetCount, dirtyCount, mixedCount],
                backgroundColor: [
                    'rgba(97, 154, 236, 0.7)',
                    'rgba(226, 93, 93, 0.7)',
                    'rgba(168, 132, 196, 0.7)'
                ]
            }
        ];
        
        createBasicChart(diaperTypeCtx, 'doughnut', ['尿液', '排便', '混合'], diaperTypeDatasets, {
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        });
        
        // 生成摘要文字
        let summaryHtml = "";
        
        if (totalCount === 0) {
            summaryHtml = "<p>所選時間範圍內沒有尿布記錄。</p>";
        } else {
            // 計算平均每日尿布次數
            const daysCount = dateRange.length;
            const avgDiapersPerDay = (totalCount / daysCount).toFixed(1);
            
            // 計算比例
            const wetPercentage = totalCount > 0 ? ((wetCount / totalCount) * 100).toFixed(1) : 0;
            const dirtyPercentage = totalCount > 0 ? ((dirtyCount / totalCount) * 100).toFixed(1) : 0;
            const mixedPercentage = totalCount > 0 ? ((mixedCount / totalCount) * 100).toFixed(1) : 0;
            
            summaryHtml = `
                <p><strong>總覽:</strong> 期間內共有 ${totalCount} 片尿布記錄，平均每天 ${avgDiapersPerDay} 片。</p>
                <p><strong>尿布類型分布:</strong></p>
                <ul>
                    <li>濕尿布: ${wetCount} 片 (${wetPercentage}%)</li>
                    <li>排便尿布: ${dirtyCount} 片 (${dirtyPercentage}%)</li>
                    <li>混合尿布: ${mixedCount} 片 (${mixedPercentage}%)</li>
                </ul>
            `;
        }
        
        document.getElementById("diaper-report-summary").innerHTML = summaryHtml;
    } catch (error) {
        console.error("載入尿布報告時發生錯誤:", error);
        document.getElementById("diaper-report-summary").innerHTML = "<p>載入失敗，請稍後再試。</p>";
    }
}

// 載入生長報告
async function loadGrowthReport(startTimestamp, endTimestamp) {
    try {
        // 獲取所有健康測量記錄
        const healthRecords = await getRecords(STORES.HEALTH_MEASUREMENTS, "childId", currentChildId);
        
        // 按類型分類
        const weightRecords = healthRecords.filter(r => r.type === "weight")
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        const heightRecords = healthRecords.filter(r => r.type === "height")
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        const headRecords = healthRecords.filter(r => r.type === "head")
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // 準備圖表數據
        const weightDates = weightRecords.map(r => formatDate(r.timestamp));
        const weightValues = weightRecords.map(r => r.value);
        
        const heightDates = heightRecords.map(r => formatDate(r.timestamp));
        const heightValues = heightRecords.map(r => r.value);
        
        const headDates = headRecords.map(r => formatDate(r.timestamp));
        const headValues = headRecords.map(r => r.value);
        
        // 創建生長概覽圖表
        const growthOverviewCtx = document.getElementById("growth-overview-chart").getContext("2d");
        
        // 檢查是否有數據
        const hasData = weightRecords.length > 0 || heightRecords.length > 0 || headRecords.length > 0;
        
        if (!hasData) {
            // 沒有數據，顯示空圖表
            createBasicChart(growthOverviewCtx, 'line', [], []);
            document.getElementById("growth-report-summary").innerHTML = "<p>無生長記錄數據可顯示。</p>";
            return;
        }
        
        // 創建數據集
        const datasets = [];
        
        if (weightRecords.length > 0) {
            datasets.push({
                label: '體重 (公斤)',
                data: weightValues,
                backgroundColor: 'rgba(75, 174, 209, 0.2)',
                borderColor: 'rgba(75, 174, 209, 1)',
                borderWidth: 2,
                fill: false,
                tension: 0.3,
                yAxisID: 'weight'
            });
        }
        
        if (heightRecords.length > 0) {
            datasets.push({
                label: '身高 (公分)',
                data: heightValues,
                backgroundColor: 'rgba(109, 183, 108, 0.2)',
                borderColor: 'rgba(109, 183, 108, 1)',
                borderWidth: 2,
                fill: false,
                tension: 0.3,
                yAxisID: 'height'
            });
        }
        
        if (headRecords.length > 0) {
            datasets.push({
                label: '頭圍 (公分)',
                data: headValues,
                backgroundColor: 'rgba(168, 132, 196, 0.2)',
                borderColor: 'rgba(168, 132, 196, 1)',
                borderWidth: 2,
                fill: false,
                tension: 0.3,
                yAxisID: 'head'
            });
        }
        
        // 使用第一個有數據的日期陣列作為標籤
        let labels = [];
        if (weightRecords.length > 0) {
            labels = weightDates;
        } else if (heightRecords.length > 0) {
            labels = heightDates;
        } else if (headRecords.length > 0) {
            labels = headDates;
        }
        
        // 創建圖表選項
        const options = {
            scales: {
                weight: {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: weightRecords.length > 0,
                        text: '體重 (公斤)'
                    },
                    grid: {
                        drawOnChartArea: true
                    }
                },
                height: {
                    type: 'linear',
                    position: 'right',
                    title: {
                        display: heightRecords.length > 0,
                        text: '身高/頭圍 (公分)'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                },
                head: {
                    type: 'linear',
                    position: 'right',
                    title: {
                        display: false
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        };
        
        createBasicChart(growthOverviewCtx, 'line', labels, datasets, options);
        
        // 生成摘要文字
        let summaryHtml = "";
        
        // 計算體重變化
        if (weightRecords.length >= 2) {
            const firstWeight = weightRecords[0].value;
            const lastWeight = weightRecords[weightRecords.length - 1].value;
            const weightChange = lastWeight - firstWeight;
            const weightChangeStr = weightChange >= 0 ? `增加了 ${weightChange.toFixed(2)} 公斤` : `減少了 ${Math.abs(weightChange).toFixed(2)} 公斤`;
            
            summaryHtml += `<p><strong>體重變化:</strong> 從 ${firstWeight.toFixed(2)} 公斤 到 ${lastWeight.toFixed(2)} 公斤，${weightChangeStr}。</p>`;
        } else if (weightRecords.length === 1) {
            summaryHtml += `<p><strong>體重記錄:</strong> ${weightRecords[0].value.toFixed(2)} 公斤 (${formatDate(weightRecords[0].timestamp)})。</p>`;
        }
        
        // 計算身高變化
        if (heightRecords.length >= 2) {
            const firstHeight = heightRecords[0].value;
            const lastHeight = heightRecords[heightRecords.length - 1].value;
            const heightChange = lastHeight - firstHeight;
            const heightChangeStr = heightChange >= 0 ? `增加了 ${heightChange.toFixed(1)} 公分` : `減少了 ${Math.abs(heightChange).toFixed(1)} 公分`;
            
            summaryHtml += `<p><strong>身高變化:</strong> 從 ${firstHeight.toFixed(1)} 公分 到 ${lastHeight.toFixed(1)} 公分，${heightChangeStr}。</p>`;
        } else if (heightRecords.length === 1) {
            summaryHtml += `<p><strong>身高記錄:</strong> ${heightRecords[0].value.toFixed(1)} 公分 (${formatDate(heightRecords[0].timestamp)})。</p>`;
        }
        
        // 計算頭圍變化
        if (headRecords.length >= 2) {
            const firstHead = headRecords[0].value;
            const lastHead = headRecords[headRecords.length - 1].value;
            const headChange = lastHead - firstHead;
            const headChangeStr = headChange >= 0 ? `增加了 ${headChange.toFixed(1)} 公分` : `減少了 ${Math.abs(headChange).toFixed(1)} 公分`;
            
            summaryHtml += `<p><strong>頭圍變化:</strong> 從 ${firstHead.toFixed(1)} 公分 到 ${lastHead.toFixed(1)} 公分，${headChangeStr}。</p>`;
        } else if (headRecords.length === 1) {
            summaryHtml += `<p><strong>頭圍記錄:</strong> ${headRecords[0].value.toFixed(1)} 公分 (${formatDate(headRecords[0].timestamp)})。</p>`;
        }
        
        // 如果沒有任何記錄
        if (summaryHtml === "") {
            summaryHtml = "<p>無生長記錄數據可顯示。</p>";
        }
        
        document.getElementById("growth-report-summary").innerHTML = summaryHtml;
    } catch (error) {
        console.error("載入生長報告時發生錯誤:", error);
        document.getElementById("growth-report-summary").innerHTML = "<p>載入失敗，請稍後再試。</p>";
    }
}

// 載入設定頁面數據
async function loadSettingsPageData() {
    try {
        // 獲取儲存的設定
        const storedSettings = await getRecord(STORES.SETTINGS, "appSettings");
        
        if (storedSettings) {
            // 更新主題選擇器
            document.getElementById("theme-select").value = storedSettings.theme || "auto";
            
            // 更新時區選擇器
            document.getElementById("timezone-select").value = storedSettings.timezone || "Asia/Taipei";
            
            // 更新快速操作選擇器
            const quickActions = storedSettings.quickActions || ["feeding", "sleep", "diaper", "health"];
            document.getElementById("quick-feeding").checked = quickActions.includes("feeding");
            document.getElementById("quick-sleep").checked = quickActions.includes("sleep");
            document.getElementById("quick-diaper").checked = quickActions.includes("diaper");
            document.getElementById("quick-health").checked = quickActions.includes("health");
            document.getElementById("quick-activity").checked = quickActions.includes("activity");
        }
        
        // 更新最後備份時間顯示
        updateLastBackupDisplay();
    } catch (error) {
        console.error("載入設定頁面數據時發生錯誤:", error);
        showToast("載入設定失敗", "error");
    }
}

// 儲存設定
async function saveSettings() {
    try {
        // 獲取當前設定值
        const theme = document.getElementById("theme-select").value;
        const timezone = document.getElementById("timezone-select").value;
        
        // 獲取快速操作選項
        const quickActions = [];
        if (document.getElementById("quick-feeding").checked) quickActions.push("feeding");
        if (document.getElementById("quick-sleep").checked) quickActions.push("sleep");
        if (document.getElementById("quick-diaper").checked) quickActions.push("diaper");
        if (document.getElementById("quick-health").checked) quickActions.push("health");
        if (document.getElementById("quick-activity").checked) quickActions.push("activity");
        
        // 建立新的設定對象
        const newSettings = {
            id: "appSettings",
            theme,
            timezone,
            quickActions,
            lastBackup: lastBackupTime,
            updatedAt: new Date().toISOString()
        };
        
        // 獲取舊的設定
        const oldSettings = await getRecord(STORES.SETTINGS, "appSettings");
        
        if (oldSettings) {
            // 保留建立時間
            newSettings.createdAt = oldSettings.createdAt;
            
            // 更新設定
            await updateRecord(STORES.SETTINGS, newSettings);
        } else {
            // 如果沒有舊的設定，創建新的
            newSettings.createdAt = new Date().toISOString();
            await addRecord(STORES.SETTINGS, newSettings);
        }
        
        // 更新全局設定變數
        settings = Object.assign({}, DEFAULT_SETTINGS, newSettings);
        
        // 應用新的設定
        applyTheme(theme);
        updateQuickActions(quickActions);
        
        showToast("設定已儲存", "success");
    } catch (error) {
        console.error("儲存設定時發生錯誤:", error);
        showToast("儲存設定失敗", "error");
    }
}

// 匯出所有數據
async function exportAllData() {
    try {
        // 獲取所有存儲的數據
        const exportData = {};
        
        for (const storeName of Object.values(STORES)) {
            const records = await getAllRecords(storeName);
            exportData[storeName] = records;
        }
        
        // 添加匯出時間
        exportData.exportTime = new Date().toISOString();
        exportData.appVersion = "1.0.0";
        
        // 轉換為 JSON 字串
        const jsonData = JSON.stringify(exportData, null, 2);
        
        // 創建下載文件
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // 創建下載連結
        const a = document.createElement('a');
        a.href = url;
        a.download = `babytracker_backup_${formatDate(new Date())}.json`;
        document.body.appendChild(a);
        a.click();
        
        // 清理
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // 更新最後備份時間
        lastBackupTime = new Date().toISOString();
        
        // 更新設定中的最後備份時間
        const storedSettings = await getRecord(STORES.SETTINGS, "appSettings");
        if (storedSettings) {
            storedSettings.lastBackup = lastBackupTime;
            await updateRecord(STORES.SETTINGS, storedSettings);
        }
        
        // 更新顯示
        updateLastBackupDisplay();
        
        showToast("資料已匯出", "success");
    } catch (error) {
        console.error("匯出資料時發生錯誤:", error);
        showToast("匯出資料失敗", "error");
    }
}

// 匯入數據
async function importData(jsonFile) {
    try {
        // 讀取 JSON 文件
        const jsonData = await readFileAsText(jsonFile);
        
        // 解析 JSON
        const importData = JSON.parse(jsonData);
        
        // 確認數據格式正確
        if (!importData || typeof importData !== 'object') {
            showToast("無效的備份檔案格式", "error");
            return;
        }
        
        // 確認是否包含必要的存儲
        const requiredStores = [STORES.CHILDREN, STORES.SETTINGS];
        for (const store of requiredStores) {
            if (!importData[store]) {
                showToast(`備份檔缺少必要的 ${store} 數據`, "error");
                return;
            }
        }
        
        // 顯示確認對話框
        const confirmContent = `
            <p>即將匯入備份數據。此操作將會：</p>
            <ul>
                <li>合併寶寶檔案數據</li>
                <li>合併所有記錄數據</li>
            </ul>
            <p style="color: var(--danger-color);">注意：如有相同 ID 的記錄將被覆蓋。</p>
            <p>確定要繼續嗎？</p>
        `;
        
        const onConfirm = async function() {
            try {
                // 顯示載入中提示
                showToast("正在匯入數據，請稍候...", "info");
                
                // 逐個處理每個存儲
                for (const storeName of Object.values(STORES)) {
                    if (importData[storeName] && Array.isArray(importData[storeName])) {
                        for (const record of importData[storeName]) {
                            // 檢查記錄是否已存在
                            const existingRecord = await getRecord(storeName, record.id);
                            
                            if (existingRecord) {
                                // 更新記錄
                                await updateRecord(storeName, { ...record, updatedAt: new Date().toISOString() });
                            } else {
                                // 添加新記錄
                                await addRecord(storeName, record);
                            }
                        }
                    }
                }
                
                // 更新 UI
                showToast("數據匯入成功", "success");
                
                // 重新加載數據
                loadChildSelector();
                
                // 如果當前有選擇的孩子，重新載入數據
                if (currentChildId) {
                    loadPageData(currentPage);
                }
            } catch (error) {
                console.error("匯入數據時發生錯誤:", error);
                showToast("匯入數據失敗", "error");
            }
        };
        
        showModal("匯入備份數據", confirmContent, onConfirm);
    } catch (error) {
        console.error("讀取備份檔案時發生錯誤:", error);
        showToast("讀取備份檔案失敗", "error");
    }
}

// 讀取文件為文本
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("檔案讀取失敗"));
        
        reader.readAsText(file);
    });
}

// 匯出 CSV 數據
async function exportCsvData() {
    try {
        if (!currentChildId) {
            showToast("請先選擇一個寶寶", "warning");
            return;
        }
        
        // 獲取當前寶寶信息
        const childData = await getRecord(STORES.CHILDREN, currentChildId);
        
        if (!childData) {
            showToast("無法獲取寶寶資料", "error");
            return;
        }
        
        // 準備 CSV 數據
        const csvFiles = {};
        
        // 餵食記錄
        const feedings = await getRecords(STORES.FEEDINGS, "childId", currentChildId);
        if (feedings.length > 0) {
            csvFiles.feedings = createCsvContent([
                ['日期', '時間', '類型', '數量', '備註'],
                ...feedings.map(f => [
                    formatDate(f.timestamp),
                    formatTime(f.timestamp),
                    f.type === 'breast' ? '母乳' : f.type === 'formula' ? '配方奶' : '副食品',
                    f.amount || '',
                    f.notes || ''
                ])
            ]);
        }
        
        // 睡眠記錄
        const sleeps = await getRecords(STORES.SLEEPS, "childId", currentChildId);
        if (sleeps.length > 0) {
            csvFiles.sleeps = createCsvContent([
                ['開始日期', '開始時間', '結束日期', '結束時間', '時長(分鐘)', '品質', '備註'],
                ...sleeps.map(s => {
                    const startDate = formatDate(s.startTime);
                    const startTime = formatTime(s.startTime);
                    let endDate = '';
                    let endTime = '';
                    let duration = '';
                    
                    if (s.endTime) {
                        endDate = formatDate(s.endTime);
                        endTime = formatTime(s.endTime);
                        duration = Math.floor((new Date(s.endTime) - new Date(s.startTime)) / 1000 / 60);
                    }
                    
                    return [
                        startDate,
                        startTime,
                        endDate,
                        endTime,
                        duration,
                        s.quality || '',
                        s.notes || ''
                    ];
                })
            ]);
        }
        
        // 尿布記錄
        const diapers = await getRecords(STORES.DIAPERS, "childId", currentChildId);
        if (diapers.length > 0) {
            csvFiles.diapers = createCsvContent([
                ['日期', '時間', '類型', '備註'],
                ...diapers.map(d => [
                    formatDate(d.timestamp),
                    formatTime(d.timestamp),
                    d.type === 'wet' ? '尿液' : d.type === 'dirty' ? '排便' : '混合',
                    d.notes || ''
                ])
            ]);
        }
        
        // 健康測量記錄
        const health = await getRecords(STORES.HEALTH_MEASUREMENTS, "childId", currentChildId);
        if (health.length > 0) {
            csvFiles.health = createCsvContent([
                ['日期', '時間', '類型', '數值', '備註'],
                ...health.map(h => [
                    formatDate(h.timestamp),
                    formatTime(h.timestamp),
                    h.type === 'weight' ? '體重' : h.type === 'height' ? '身高' : h.type === 'temperature' ? '體溫' : '頭圍',
                    h.value,
                    h.notes || ''
                ])
            ]);
        }
        
        // 如果沒有任何數據
        if (Object.keys(csvFiles).length === 0) {
            showToast("沒有可匯出的記錄", "warning");
            return;
        }
        
        // 為每個 CSV 文件創建下載連結
        const child_name = childData.name.replace(/[^\w\d]/g, '_');
        
        for (const [type, content] of Object.entries(csvFiles)) {
            const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // 設定檔名
            const today = formatDate(new Date()).replace(/\//g, '');
            a.download = `${child_name}_${type}_${today}.csv`;
            
            document.body.appendChild(a);
            a.click();
            
            // 清理
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
        
        showToast("CSV 檔案已匯出", "success");
    } catch (error) {
        console.error("匯出 CSV 數據時發生錯誤:", error);
        showToast("匯出 CSV 失敗", "error");
    }
}

// 創建 CSV 內容
function createCsvContent(rows) {
    return rows.map(row => 
        row.map(cell => {
            // 處理包含逗號、換行符或引號的單元格
            if (/[",\n\r]/.test(cell)) {
                return `"${String(cell).replace(/"/g, '""')}"`;
            }
            return String(cell);
        }).join(',')
    ).join('\n');
}

// 列印報告
function printReport() {
    window.print();
}

// 刷新所有圖表以應用新主題
function refreshAllCharts() {
    // 獲取所有圖表元素
    const chartElements = document.querySelectorAll('canvas');
    
    // 檢查每個圖表元素是否有圖表實例
    chartElements.forEach(canvas => {
        if (canvas.chart) {
            // 儲存當前數據
            const type = canvas.chart.config.type;
            const labels = canvas.chart.data.labels;
            const datasets = canvas.chart.data.datasets;
            const options = canvas.chart.options;
            
            // 銷毀當前圖表
            canvas.chart.destroy();
            
            // 重新創建圖表
            createBasicChart(canvas.getContext('2d'), type, labels, datasets, options);
        }
    });
}

// 事件處理
function setupEventListeners() {
    // 主選單切換
    document.getElementById("menu-toggle").addEventListener("click", function() {
        const navContent = document.getElementById("nav-content");
        
        if (window.innerWidth < 768) {
            if (navContent.style.display === "block") {
                navContent.style.display = "none";
            } else {
                navContent.style.display = "block";
            }
        }
    });
    
    // 主題切換
    document.getElementById("theme-toggle").addEventListener("click", function() {
        const body = document.body;
        const isDarkMode = body.classList.contains("dark-theme");
        
        if (isDarkMode) {
            body.classList.remove("dark-theme");
            this.innerHTML = '<i class="fas fa-moon"></i>';
            document.getElementById("theme-select").value = "light";
        } else {
            body.classList.add("dark-theme");
            this.innerHTML = '<i class="fas fa-sun"></i>';
            document.getElementById("theme-select").value = "dark";
        }
        
        // 更新設定
        saveSettings();
        
        // 重新載入所有圖表以應用新主題
        refreshAllCharts();
    });
    
    // 孩子選擇器變更
    document.getElementById("current-child").addEventListener("change", function() {
        const childId = this.value;
        if (childId) {
            selectChild(childId);
        } else {
            resetChildSelection();
        }
    });
    
    // 添加孩子按鈕
    document.getElementById("add-child-btn").addEventListener("click", function() {
        showAddChildModal();
    });
    
    // 導航連結
    document.querySelectorAll(".nav-links a").forEach(link => {
        link.addEventListener("click", function(e) {
            e.preventDefault();
            
            const pageId = this.getAttribute("data-page");
            navigateToPage(pageId);
        });
    });
    
    // 快速操作按鈕
    document.querySelectorAll(".quick-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            const action = this.getAttribute("data-action");
            handleQuickAction(action);
        });
    });
    
    // 添加餵食記錄按鈕
    document.getElementById("add-feeding-btn").addEventListener("click", function() {
        if (!currentChildId) {
            showToast("請先選擇一個寶寶", "warning");
            return;
        }
        
        showAddFeedingModal();
    });
    
    // 添加睡眠記錄按鈕
    document.getElementById("add-sleep-btn").addEventListener("click", function() {
        if (!currentChildId) {
            showToast("請先選擇一個寶寶", "warning");
            return;
        }
        
        showAddSleepModal();
    });
    
    // 添加尿布記錄按鈕
    document.getElementById("add-diaper-btn").addEventListener("click", function() {
        if (!currentChildId) {
            showToast("請先選擇一個寶寶", "warning");
            return;
        }
        
        showAddDiaperModal();
    });
    
    // 添加健康測量按鈕
    document.getElementById("add-health-measurement-btn").addEventListener("click", function() {
        if (!currentChildId) {
            showToast("請先選擇一個寶寶", "warning");
            return;
        }
        
        showAddHealthMeasurementModal();
    });
    
    // 添加疫苗記錄按鈕
    document.getElementById("add-vaccine-btn").addEventListener("click", function() {
        if (!currentChildId) {
            showToast("請先選擇一個寶寶", "warning");
            return;
        }
        
        showAddVaccineModal();
    });
    
    // 添加用藥記錄按鈕
    document.getElementById("add-medication-btn").addEventListener("click", function() {
        if (!currentChildId) {
            showToast("請先選擇一個寶寶", "warning");
            return;
        }
        
        showAddMedicationModal();
    });
    
    // 添加健康檢查按鈕
    document.getElementById("add-checkup-btn").addEventListener("click", function() {
        if (!currentChildId) {
            showToast("請先選擇一個寶寶", "warning");
            return;
        }
        
        showAddCheckupModal();
    });
    
    // 添加自訂里程碑按鈕
    document.getElementById("add-custom-milestone-btn").addEventListener("click", function() {
        if (!currentChildId) {
            showToast("請先選擇一個寶寶", "warning");
            return;
        }
        
        showAddCustomMilestoneModal();
    });
    
    // 添加親子互動按鈕
    document.getElementById("add-interaction-btn").addEventListener("click", function() {
        if (!currentChildId) {
            showToast("請先選擇一個寶寶", "warning");
            return;
        }
        
        showAddInteractionModal();
    });
    
    // 添加活動按鈕
    document.getElementById("add-activity-btn").addEventListener("click", function() {
        if (!currentChildId) {
            showToast("請先選擇一個寶寶", "warning");
            return;
        }
        
        showAddActivityModal();
    });
    
    // 管理寶寶檔案按鈕
    document.getElementById("manage-children-btn").addEventListener("click", function() {
        showManageChildrenModal();
    });
    
    // 備份資料按鈕
    document.getElementById("backup-data-btn").addEventListener("click", function() {
        exportAllData();
    });
    
    // 還原資料按鈕
    document.getElementById("restore-data-btn").addEventListener("click", function() {
        document.getElementById("restore-file-input").click();
    });
    
    // 處理還原文件選擇
    document.getElementById("restore-file-input").addEventListener("change", function(e) {
        if (e.target.files && e.target.files[0]) {
            importData(e.target.files[0]);
            
            // 重置文件輸入框
            e.target.value = null;
        }
    });
    
    // 匯出全部資料按鈕
    document.getElementById("export-all-btn").addEventListener("click", function() {
        exportCsvData();
    });
    
    // 匯出報告按鈕
    document.getElementById("export-report-btn").addEventListener("click", function() {
        exportCsvData();
    });
    
    // 列印報告按鈕
    document.getElementById("print-report-btn").addEventListener("click", function() {
        printReport();
    });
    
    // 健康標籤頁切換
    document.querySelectorAll("#health-page .tab-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            const tabId = this.getAttribute("data-tab");
            
            // 移除所有標籤頁的 active 類
            document.querySelectorAll("#health-page .tab-btn").forEach(b => {
                b.classList.remove("active");
            });
            
            document.querySelectorAll("#health-page .tab-pane").forEach(p => {
                p.classList.remove("active");
            });
            
            // 添加 active 類到當前標籤頁
            this.classList.add("active");
            document.getElementById(tabId + "-tab").classList.add("active");
        });
    });
    
    // 里程碑標籤頁切換
    document.querySelectorAll("#milestone-page .tab-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            const tabId = this.getAttribute("data-tab");
            
            // 移除所有標籤頁的 active 類
            document.querySelectorAll("#milestone-page .tab-btn").forEach(b => {
                b.classList.remove("active");
            });
            
            document.querySelectorAll("#milestone-page .tab-pane").forEach(p => {
                p.classList.remove("active");
            });
            
            // 添加 active 類到當前標籤頁
            this.classList.add("active");
            document.getElementById(tabId + "-tab").classList.add("active");
        });
    });
    
    // 餵食過濾器
    document.getElementById("feeding-filter").addEventListener("change", function() {
        loadFeedingRecords();
    });
    
    // 尿布過濾器
    document.getElementById("diaper-filter").addEventListener("change", function() {
        loadDiaperRecords();
    });
    
    // 活動過濾器
    document.getElementById("activity-filter").addEventListener("change", function() {
        loadActivityRecords();
    });
    
    // 報告期間選擇器
    document.getElementById("report-period").addEventListener("change", function() {
        loadReportData();
    });
    
    // 主題選擇器
    document.getElementById("theme-select").addEventListener("change", function() {
        const theme = this.value;
        applyTheme(theme);
        saveSettings();
    });
    
    // 時區選擇器
    document.getElementById("timezone-select").addEventListener("change", function() {
        saveSettings();
    });
    
    // 快速操作複選框
    document.querySelectorAll("#quick-feeding, #quick-sleep, #quick-diaper, #quick-health, #quick-activity").forEach(checkbox => {
        checkbox.addEventListener("change", function() {
            saveSettings();
        });
    });
    
    // 餵食日期過濾按鈕
    document.getElementById("feeding-filter-date").addEventListener("click", function() {
        showDatePicker(date => {
            currentDateFilter = date;
            loadFeedingRecords();
        }, currentDateFilter);
    });
    
    // 睡眠日期過濾按鈕
    document.getElementById("sleep-filter-date").addEventListener("click", function() {
        showDatePicker(date => {
            currentDateFilter = date;
            loadSleepRecords();
        }, currentDateFilter);
    });
    
    // 尿布日期過濾按鈕
    document.getElementById("diaper-filter-date").addEventListener("click", function() {
        showDatePicker(date => {
            currentDateFilter = date;
            loadDiaperRecords();
        }, currentDateFilter);
    });
    
    // 健康日期過濾按鈕
    document.getElementById("health-filter-date").addEventListener("click", function() {
        showDatePicker(date => {
            currentDateFilter = date;
            loadHealthData();
        }, currentDateFilter);
    });
    
    // 親子互動日期過濾按鈕
    document.getElementById("interaction-filter-date").addEventListener("click", function() {
        showDatePicker(date => {
            currentDateFilter = date;
            loadInteractionRecords();
        }, currentDateFilter);
    });
    
    // 活動日期過濾按鈕
    document.getElementById("activity-filter-date").addEventListener("click", function() {
        showDatePicker(date => {
            currentDateFilter = date;
            loadActivityRecords();
        }, currentDateFilter);
    });
    
    // 模態對話框關閉按鈕
    document.getElementById("modal-close").addEventListener("click", hideModal);
    document.getElementById("modal-cancel").addEventListener("click", hideModal);
    
    // 點擊模態背景關閉
    document.querySelector(".modal-backdrop").addEventListener("click", function(e) {
        if (e.target === this) {
            hideModal();
        }
    });
    
    // 視窗大小變化處理
    window.addEventListener("resize", function() {
        if (window.innerWidth >= 768) {
            document.getElementById("nav-content").style.display = "block";
        } else {
            document.getElementById("nav-content").style.display = "none";
        }
    });
    
    // 自動備份功能 (每 24 小時檢查一次)
    setInterval(async function() {
        // 檢查上次備份時間
        if (lastBackupTime) {
            const now = new Date();
            const lastBackup = new Date(lastBackupTime);
            const daysSinceLastBackup = (now - lastBackup) / (1000 * 60 * 60 * 24);
            
            // 如果超過 1 天沒有備份，自動備份
            if (daysSinceLastBackup >= 1) {
                await exportAllData();
            }
        }
    }, 1000 * 60 * 60); // 每小時檢查一次
}

// 應用程式初始化
async function init() {
    try {
        // 顯示載入畫面
        document.getElementById("loading-screen").style.display = "flex";
        
        // 初始化資料庫
        await initDatabase();
        
        // 初始化設定
        await initSettings();
        
        // 載入孩子選擇器
        await loadChildSelector();
        
        // 設置事件監聽器
        setupEventListeners();
        
        // 如果有多個孩子，自動選擇第一個
        const children = await getAllRecords(STORES.CHILDREN);
        if (children.length > 0) {
            await selectChild(children[0].id);
        }
        
        // 隱藏載入畫面
        setTimeout(() => {
            document.getElementById("loading-screen").style.opacity = "0";
            setTimeout(() => {
                document.getElementById("loading-screen").style.display = "none";
            }, 500);
        }, 1000);
        
        console.log("應用程式初始化完成");
    } catch (error) {
        console.error("應用程式初始化失敗:", error);
        alert("應用程式初始化失敗，請重新載入頁面。");
    }
}

// 啟動應用程式
init();

// 將公共方法暴露給全局命名空間
return {
    // 公共 API
    initDatabase,
    selectChild,
    navigateToPage,
    showAddChildModal,
    showAddFeedingModal,
    showAddSleepModal,
    showAddDiaperModal,
    showAddHealthMeasurementModal
};

})();