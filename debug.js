/**
 * 嬰幼兒照護追蹤系統 - 調試工具
 * 用於診斷健康數據載入失敗問題
 */

const BabyTrackerDebug = (function() {
    // 基本配置
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

    let db = null;
    let debugDiv = null;
    let currentChildId = null;

    // 初始化調試工具
    function init() {
        // 創建調試界面
        createDebugUI();
        
        // 檢查瀏覽器支援
        if (!checkBrowserSupport()) {
            return;
        }

        // 嘗試連接數據庫
        connectToDatabase();
    }

    // 創建調試界面
    function createDebugUI() {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            #baby-tracker-debug {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.9);
                color: #fff;
                font-family: monospace;
                font-size: 14px;
                padding: 20px;
                overflow: auto;
                z-index: 9999;
            }
            #debug-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            #debug-close {
                background: #f44336;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
            }
            .debug-section {
                margin-bottom: 20px;
                padding: 15px;
                background-color: rgba(255, 255, 255, 0.1);
                border-radius: 5px;
            }
            .debug-title {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 10px;
                color: #4caf50;
            }
            .debug-success {
                color: #4caf50;
            }
            .debug-error {
                color: #f44336;
            }
            .debug-warning {
                color: #ff9800;
            }
            .debug-info {
                color: #2196f3;
            }
            .debug-btn {
                background: #2196f3;
                color: white;
                border: none;
                padding: 8px 16px;
                margin: 5px;
                border-radius: 4px;
                cursor: pointer;
            }
            .debug-message {
                margin: 5px 0;
                padding: 5px;
                border-left: 3px solid #555;
            }
            #debug-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-bottom: 20px;
            }
            .debug-child-selector {
                padding: 8px;
                border-radius: 4px;
                margin-bottom: 10px;
                background: #333;
                color: white;
                border: 1px solid #555;
            }
            .db-store {
                padding: 5px;
                margin: 5px 0;
                background-color: rgba(255, 255, 255, 0.05);
            }
        `;
        document.head.appendChild(styleElement);

        debugDiv = document.createElement('div');
        debugDiv.id = 'baby-tracker-debug';
        
        debugDiv.innerHTML = `
            <div id="debug-header">
                <h1>BabyTracker 調試工具</h1>
                <button id="debug-close">關閉</button>
            </div>
            <div id="debug-actions">
                <button id="check-db" class="debug-btn">檢查數據庫</button>
                <button id="inspect-health" class="debug-btn">檢查健康數據</button>
                <button id="fix-db" class="debug-btn">嘗試修復數據庫</button>
                <button id="clear-console" class="debug-btn">清除控制台</button>
            </div>
            <div id="debug-child-selector-container">
                <select id="debug-child-selector" class="debug-child-selector">
                    <option value="">選擇寶寶...</option>
                </select>
            </div>
            <div class="debug-section">
                <div class="debug-title">系統信息</div>
                <div id="system-info"></div>
            </div>
            <div class="debug-section">
                <div class="debug-title">數據庫狀態</div>
                <div id="db-status"></div>
            </div>
            <div class="debug-section">
                <div class="debug-title">控制台輸出</div>
                <div id="debug-console"></div>
            </div>
        `;

        document.body.appendChild(debugDiv);

        // 添加事件監聽器
        document.getElementById('debug-close').addEventListener('click', function() {
            document.body.removeChild(debugDiv);
        });

        document.getElementById('check-db').addEventListener('click', checkDatabase);
        document.getElementById('inspect-health').addEventListener('click', inspectHealthData);
        document.getElementById('fix-db').addEventListener('click', attemptDatabaseFix);
        document.getElementById('clear-console').addEventListener('click', clearDebugConsole);

        // 顯示系統信息
        displaySystemInfo();
    }

    // 檢查瀏覽器支援
    function checkBrowserSupport() {
        const systemInfo = document.getElementById('system-info');
        
        if (!window.indexedDB) {
            logMessage('您的瀏覽器不支援 IndexedDB，應用無法正常運行', 'error');
            systemInfo.innerHTML += `<div class="debug-message debug-error">瀏覽器不支援 IndexedDB</div>`;
            return false;
        }
        
        logMessage('瀏覽器支援 IndexedDB', 'success');
        return true;
    }

    // 顯示系統信息
    function displaySystemInfo() {
        const systemInfo = document.getElementById('system-info');
        const deviceInfo = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            vendor: navigator.vendor,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            storage: {
                localStorage: !!window.localStorage,
                sessionStorage: !!window.sessionStorage,
                indexedDB: !!window.indexedDB
            },
            screen: {
                width: window.screen.width,
                height: window.screen.height,
                colorDepth: window.screen.colorDepth,
                orientation: window.screen.orientation ? window.screen.orientation.type : 'N/A'
            }
        };

        systemInfo.innerHTML = `
            <div class="debug-message">
                <strong>瀏覽器:</strong> ${deviceInfo.vendor} (${deviceInfo.userAgent.split(/[()]/)[1]})<br>
                <strong>平台:</strong> ${deviceInfo.platform}<br>
                <strong>語言:</strong> ${deviceInfo.language}<br>
                <strong>屏幕尺寸:</strong> ${deviceInfo.screen.width}x${deviceInfo.screen.height}<br>
                <strong>在線狀態:</strong> ${deviceInfo.onLine ? '在線' : '離線'}<br>
                <strong>儲存支持:</strong> IndexedDB: ${deviceInfo.storage.indexedDB ? '✓' : '✗'}, 
                                 LocalStorage: ${deviceInfo.storage.localStorage ? '✓' : '✗'}<br>
            </div>
        `;
    }

    // 連接到數據庫
    function connectToDatabase() {
        const dbStatus = document.getElementById('db-status');
        dbStatus.innerHTML = `<div class="debug-message debug-info">嘗試連接數據庫...</div>`;
        
        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = function(event) {
                dbStatus.innerHTML += `<div class="debug-message debug-error">數據庫連接錯誤: ${event.target.error}</div>`;
                logMessage(`數據庫連接錯誤: ${event.target.error}`, 'error');
            };
            
            request.onsuccess = function(event) {
                db = event.target.result;
                dbStatus.innerHTML += `<div class="debug-message debug-success">數據庫連接成功</div>`;
                logMessage('數據庫連接成功', 'success');
                
                // 數據庫連接成功後載入孩子選擇器
                loadChildSelector();
            };
            
            request.onupgradeneeded = function(event) {
                dbStatus.innerHTML += `<div class="debug-message debug-warning">數據庫需要升級...</div>`;
                logMessage('數據庫需要升級...', 'warning');
            };
        } catch (error) {
            dbStatus.innerHTML += `<div class="debug-message debug-error">數據庫連接異常: ${error.message}</div>`;
            logMessage(`數據庫連接異常: ${error.message}`, 'error');
        }
    }

    // 檢查數據庫結構
    async function checkDatabase() {
        if (!db) {
            logMessage('數據庫未連接', 'error');
            return;
        }
        
        logMessage('開始檢查數據庫結構...', 'info');
        
        const dbInfo = {
            name: db.name,
            version: db.version,
            objectStores: Array.from(db.objectStoreNames),
            storeDetails: {}
        };
        
        logMessage(`數據庫名稱: ${dbInfo.name}, 版本: ${dbInfo.version}`, 'info');
        logMessage(`存儲區: ${dbInfo.objectStores.join(', ')}`, 'info');
        
        // 檢查是否所有必要的存儲區都存在
        for (const storeName in STORES) {
            const storeValue = STORES[storeName];
            
            if (dbInfo.objectStores.includes(storeValue)) {
                logMessage(`存儲區 ${storeValue} 存在`, 'success');
                
                // 獲取存儲區中的記錄數量
                try {
                    const count = await getRecordCount(storeValue);
                    logMessage(`${storeValue} 存儲區中有 ${count} 條記錄`, 'info');
                    dbInfo.storeDetails[storeValue] = { count };
                } catch (error) {
                    logMessage(`無法獲取 ${storeValue} 存儲區記錄數量: ${error}`, 'error');
                }
            } else {
                logMessage(`存儲區 ${storeValue} 不存在！`, 'error');
            }
        }
        
        // 特別檢查健康測量存儲區
        if (dbInfo.objectStores.includes(STORES.HEALTH_MEASUREMENTS)) {
            const transaction = db.transaction(STORES.HEALTH_MEASUREMENTS, "readonly");
            const store = transaction.objectStore(STORES.HEALTH_MEASUREMENTS);
            const indexNames = Array.from(store.indexNames);
            
            logMessage(`健康測量存儲區的索引: ${indexNames.join(', ')}`, 'info');
            
            // 檢查必要的索引是否存在
            const requiredIndices = ['childId', 'timestamp', 'type', 'childId_type_timestamp'];
            
            for (const index of requiredIndices) {
                if (indexNames.includes(index)) {
                    logMessage(`索引 ${index} 存在`, 'success');
                } else {
                    logMessage(`索引 ${index} 不存在！`, 'error');
                }
            }
        }
        
        return dbInfo;
    }

    // 檢查健康數據
    async function inspectHealthData() {
        if (!db) {
            logMessage('數據庫未連接，無法檢查健康數據', 'error');
            return;
        }
        
        if (!currentChildId) {
            logMessage('請先選擇一個寶寶進行檢查', 'warning');
            return;
        }
        
        logMessage(`開始檢查寶寶 ID: ${currentChildId} 的健康數據...`, 'info');
        
        try {
            // 檢查健康測量記錄
            const healthRecords = await getRecords(STORES.HEALTH_MEASUREMENTS, "childId", currentChildId);
            logMessage(`找到 ${healthRecords.length} 條健康測量記錄`, 'info');
            
            // 按類型分類
            const weightRecords = healthRecords.filter(r => r.type === "weight");
            const heightRecords = healthRecords.filter(r => r.type === "height");
            const temperatureRecords = healthRecords.filter(r => r.type === "temperature");
            const headRecords = healthRecords.filter(r => r.type === "head");
            
            logMessage(`體重記錄: ${weightRecords.length}`, 'info');
            logMessage(`身高記錄: ${heightRecords.length}`, 'info');
            logMessage(`體溫記錄: ${temperatureRecords.length}`, 'info');
            logMessage(`頭圍記錄: ${headRecords.length}`, 'info');
            
            // 檢查記錄格式
            if (healthRecords.length > 0) {
                const sampleRecord = healthRecords[0];
                logMessage('檢查記錄格式...', 'info');
                
                // 檢查必要字段
                const requiredFields = ['id', 'childId', 'timestamp', 'type', 'value'];
                const missingFields = requiredFields.filter(field => !(field in sampleRecord));
                
                if (missingFields.length > 0) {
                    logMessage(`記錄缺少必要字段: ${missingFields.join(', ')}`, 'error');
                } else {
                    logMessage('記錄包含所有必要字段', 'success');
                }
                
                // 顯示樣本記錄
                logMessage('樣本記錄:', 'info');
                logMessage(JSON.stringify(sampleRecord, null, 2), 'info');
            }
            
            // 檢查疫苗記錄
            const vaccineRecords = await getRecords(STORES.VACCINES, "childId", currentChildId);
            logMessage(`找到 ${vaccineRecords.length} 條疫苗記錄`, 'info');
            
            // 檢查用藥記錄
            const medicationRecords = await getRecords(STORES.MEDICATIONS, "childId", currentChildId);
            logMessage(`找到 ${medicationRecords.length} 條用藥記錄`, 'info');
            
            // 檢查健康檢查記錄
            const checkupRecords = await getRecords(STORES.CHECKUPS, "childId", currentChildId);
            logMessage(`找到 ${checkupRecords.length} 條健康檢查記錄`, 'info');
            
            // 檢查 DOM 元素
            logMessage('檢查健康頁面 DOM 元素...', 'info');
            const chartElements = [
                'weight-chart', 'height-chart', 'temperature-chart', 'head-chart'
            ];
            
            for (const elementId of chartElements) {
                const element = document.getElementById(elementId);
                if (element) {
                    logMessage(`元素 ${elementId} 存在`, 'success');
                } else {
                    logMessage(`元素 ${elementId} 不存在！`, 'error');
                }
            }
            
            logMessage('健康數據檢查完成', 'info');
        } catch (error) {
            logMessage(`檢查健康數據時發生錯誤: ${error.message}`, 'error');
            logMessage(`錯誤堆疊: ${error.stack}`, 'error');
        }
    }

    // 嘗試修復數據庫
    async function attemptDatabaseFix() {
        if (!db) {
            logMessage('數據庫未連接，無法修復', 'error');
            return;
        }
        
        logMessage('開始嘗試修復數據庫...', 'info');
        
        try {
            // 先檢查數據庫結構
            const dbInfo = await checkDatabase();
            
            // 檢查是否缺少存儲區
            const missingStores = [];
            for (const storeName in STORES) {
                const storeValue = STORES[storeName];
                if (!dbInfo.objectStores.includes(storeValue)) {
                    missingStores.push(storeValue);
                }
            }
            
            if (missingStores.length > 0) {
                logMessage(`發現缺少的存儲區: ${missingStores.join(', ')}`, 'warning');
                logMessage('需要重新創建數據庫，這將導致數據丟失', 'warning');
                
                if (confirm('需要重新創建數據庫，這將導致數據丟失，是否繼續？')) {
                    // 關閉現有數據庫連接
                    db.close();
                    
                    // 刪除並重新創建數據庫
                    await deleteDatabase();
                    await createNewDatabase();
                }
            } else {
                logMessage('數據庫結構完整，檢查具體存儲區...', 'info');
                
                // 檢查健康測量存儲區的索引
                if (dbInfo.objectStores.includes(STORES.HEALTH_MEASUREMENTS)) {
                    const transaction = db.transaction(STORES.HEALTH_MEASUREMENTS, "readonly");
                    const store = transaction.objectStore(STORES.HEALTH_MEASUREMENTS);
                    const indexNames = Array.from(store.indexNames);
                    
                    // 檢查必要的索引是否存在
                    const requiredIndices = ['childId', 'timestamp', 'type', 'childId_type_timestamp'];
                    const missingIndices = requiredIndices.filter(index => !indexNames.includes(index));
                    
                    if (missingIndices.length > 0) {
                        logMessage(`健康測量存儲區缺少索引: ${missingIndices.join(', ')}`, 'warning');
                        logMessage('需要重新創建數據庫以修復索引，這將導致數據丟失', 'warning');
                        
                        if (confirm('需要重新創建數據庫以修復索引，這將導致數據丟失，是否繼續？')) {
                            // 關閉現有數據庫連接
                            db.close();
                            
                            // 刪除並重新創建數據庫
                            await deleteDatabase();
                            await createNewDatabase();
                        }
                    } else {
                        logMessage('健康測量存儲區的索引結構完整', 'success');
                        
                        // 檢查健康數據記錄格式
                        if (currentChildId) {
                            const healthRecords = await getRecords(STORES.HEALTH_MEASUREMENTS, "childId", currentChildId);
                            
                            if (healthRecords.length > 0) {
                                const invalidRecords = [];
                                
                                for (let i = 0; i < healthRecords.length; i++) {
                                    const record = healthRecords[i];
                                    if (!record.id || !record.childId || !record.timestamp || !record.type || record.value === undefined) {
                                        invalidRecords.push(record);
                                    }
                                }
                                
                                if (invalidRecords.length > 0) {
                                    logMessage(`發現 ${invalidRecords.length} 條無效的健康記錄`, 'warning');
                                    
                                    // 嘗試修復記錄
                                    for (const record of invalidRecords) {
                                        logMessage(`嘗試修復記錄 ID: ${record.id}`, 'info');
                                        
                                        // 修復缺失字段
                                        if (!record.id) record.id = generateUniqueId();
                                        if (!record.childId) record.childId = currentChildId;
                                        if (!record.timestamp) record.timestamp = new Date().toISOString();
                                        if (!record.type) record.type = 'unknown';
                                        if (record.value === undefined) record.value = 0;
                                        
                                        // 更新記錄
                                        await updateRecord(STORES.HEALTH_MEASUREMENTS, record);
                                        logMessage(`記錄已修復`, 'success');
                                    }
                                } else {
                                    logMessage('所有健康記錄格式正確', 'success');
                                }
                            }
                        }
                        
                        logMessage('數據庫結構和數據檢查完成，未發現需要修復的問題', 'success');
                    }
                }
            }
        } catch (error) {
            logMessage(`修復數據庫時發生錯誤: ${error.message}`, 'error');
        }
    }

    // 刪除數據庫
    function deleteDatabase() {
        return new Promise((resolve, reject) => {
            logMessage('正在刪除數據庫...', 'warning');
            
            const request = indexedDB.deleteDatabase(DB_NAME);
            
            request.onsuccess = function() {
                logMessage('數據庫刪除成功', 'success');
                resolve();
            };
            
            request.onerror = function(event) {
                logMessage(`數據庫刪除失敗: ${event.target.error}`, 'error');
                reject(event.target.error);
            };
        });
    }

    // 創建新數據庫
    function createNewDatabase() {
        return new Promise((resolve, reject) => {
            logMessage('正在創建新數據庫...', 'info');
            
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = function(event) {
                logMessage(`創建數據庫失敗: ${event.target.error}`, 'error');
                reject(event.target.error);
            };
            
            request.onsuccess = function(event) {
                db = event.target.result;
                logMessage('新數據庫創建成功', 'success');
                resolve(db);
            };
            
            request.onupgradeneeded = function(event) {
                const db = event.target.result;
                logMessage('正在創建存儲區...', 'info');
                
                // 創建所有存儲區
                if (!db.objectStoreNames.contains(STORES.CHILDREN)) {
                    const childrenStore = db.createObjectStore(STORES.CHILDREN, { keyPath: "id" });
                    childrenStore.createIndex("name", "name", { unique: false });
                    childrenStore.createIndex("birthdate", "birthdate", { unique: false });
                    logMessage(`${STORES.CHILDREN} 存儲區創建成功`, 'success');
                }
                
                if (!db.objectStoreNames.contains(STORES.FEEDINGS)) {
                    const feedingsStore = db.createObjectStore(STORES.FEEDINGS, { keyPath: "id" });
                    feedingsStore.createIndex("childId", "childId", { unique: false });
                    feedingsStore.createIndex("timestamp", "timestamp", { unique: false });
                    feedingsStore.createIndex("type", "type", { unique: false });
                    feedingsStore.createIndex("childId_timestamp", ["childId", "timestamp"], { unique: false });
                    logMessage(`${STORES.FEEDINGS} 存儲區創建成功`, 'success');
                }
                
                if (!db.objectStoreNames.contains(STORES.SLEEPS)) {
                    const sleepsStore = db.createObjectStore(STORES.SLEEPS, { keyPath: "id" });
                    sleepsStore.createIndex("childId", "childId", { unique: false });
                    sleepsStore.createIndex("startTime", "startTime", { unique: false });
                    sleepsStore.createIndex("childId_startTime", ["childId", "startTime"], { unique: false });
                    logMessage(`${STORES.SLEEPS} 存儲區創建成功`, 'success');
                }
                
                if (!db.objectStoreNames.contains(STORES.DIAPERS)) {
                    const diapersStore = db.createObjectStore(STORES.DIAPERS, { keyPath: "id" });
                    diapersStore.createIndex("childId", "childId", { unique: false });
                    diapersStore.createIndex("timestamp", "timestamp", { unique: false });
                    diapersStore.createIndex("type", "type", { unique: false });
                    diapersStore.createIndex("childId_timestamp", ["childId", "timestamp"], { unique: false });
                    logMessage(`${STORES.DIAPERS} 存儲區創建成功`, 'success');
                }
                
                if (!db.objectStoreNames.contains(STORES.HEALTH_MEASUREMENTS)) {
                    const healthStore = db.createObjectStore(STORES.HEALTH_MEASUREMENTS, { keyPath: "id" });
                    healthStore.createIndex("childId", "childId", { unique: false });
                    healthStore.createIndex("timestamp", "timestamp", { unique: false });
                    healthStore.createIndex("type", "type", { unique: false });
                    healthStore.createIndex("childId_type_timestamp", ["childId", "type", "timestamp"], { unique: false });
                    logMessage(`${STORES.HEALTH_MEASUREMENTS} 存儲區創建成功`, 'success');
                }
                
                if (!db.objectStoreNames.contains(STORES.VACCINES)) {
                    const vaccinesStore = db.createObjectStore(STORES.VACCINES, { keyPath: "id" });
                    vaccinesStore.createIndex("childId", "childId", { unique: false });
                    vaccinesStore.createIndex("date", "date", { unique: false });
                    vaccinesStore.createIndex("childId_date", ["childId", "date"], { unique: false });
                    logMessage(`${STORES.VACCINES} 存儲區創建成功`, 'success');
                }
                
                if (!db.objectStoreNames.contains(STORES.MEDICATIONS)) {
                    const medicationsStore = db.createObjectStore(STORES.MEDICATIONS, { keyPath: "id" });
                    medicationsStore.createIndex("childId", "childId", { unique: false });
                    medicationsStore.createIndex("startDate", "startDate", { unique: false });
                    medicationsStore.createIndex("childId_startDate", ["childId", "startDate"], { unique: false });
                    logMessage(`${STORES.MEDICATIONS} 存儲區創建成功`, 'success');
                }
                
                if (!db.objectStoreNames.contains(STORES.CHECKUPS)) {
                    const checkupsStore = db.createObjectStore(STORES.CHECKUPS, { keyPath: "id" });
                    checkupsStore.createIndex("childId", "childId", { unique: false });
                    checkupsStore.createIndex("date", "date", { unique: false });
                    checkupsStore.createIndex("childId_date", ["childId", "date"], { unique: false });
                    logMessage(`${STORES.CHECKUPS} 存儲區創建成功`, 'success');
                }
                
                if (!db.objectStoreNames.contains(STORES.MILESTONES)) {
                    const milestonesStore = db.createObjectStore(STORES.MILESTONES, { keyPath: "id" });
                    milestonesStore.createIndex("childId", "childId", { unique: false });
                    milestonesStore.createIndex("category", "category", { unique: false });
                    milestonesStore.createIndex("achieved", "achieved", { unique: false });
                    milestonesStore.createIndex("childId_category", ["childId", "category"], { unique: false });
                    logMessage(`${STORES.MILESTONES} 存儲區創建成功`, 'success');
                }
                
                if (!db.objectStoreNames.contains(STORES.INTERACTIONS)) {
                    const interactionsStore = db.createObjectStore(STORES.INTERACTIONS, { keyPath: "id" });
                    interactionsStore.createIndex("childId", "childId", { unique: false });
                    interactionsStore.createIndex("timestamp", "timestamp", { unique: false });
                    interactionsStore.createIndex("childId_timestamp", ["childId", "timestamp"], { unique: false });
                    logMessage(`${STORES.INTERACTIONS} 存儲區創建成功`, 'success');
                }
                
                if (!db.objectStoreNames.contains(STORES.ACTIVITIES)) {
                    const activitiesStore = db.createObjectStore(STORES.ACTIVITIES, { keyPath: "id" });
                    activitiesStore.createIndex("childId", "childId", { unique: false });
                    activitiesStore.createIndex("timestamp", "timestamp", { unique: false });
                    activitiesStore.createIndex("type", "type", { unique: false });
                    activitiesStore.createIndex("childId_timestamp", ["childId", "timestamp"], { unique: false });
                    logMessage(`${STORES.ACTIVITIES} 存儲區創建成功`, 'success');
                }
                
                if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                    db.createObjectStore(STORES.SETTINGS, { keyPath: "id" });
                    logMessage(`${STORES.SETTINGS} 存儲區創建成功`, 'success');
                }
                
                logMessage('所有存儲區創建完成', 'success');
            };
        });
    }

    // 加載孩子選擇器
    async function loadChildSelector() {
        if (!db) {
            logMessage('數據庫未連接，無法加載孩子選擇器', 'error');
            return;
        }
        
        const select = document.getElementById('debug-child-selector');
        
        try {
            // 獲取所有孩子記錄
            const children = await getAllRecords(STORES.CHILDREN);
            
            // 清空選擇器
            select.innerHTML = '<option value="">選擇寶寶...</option>';
            
            // 添加孩子選項
            children.forEach(child => {
                const option = document.createElement('option');
                option.value = child.id;
                option.textContent = child.name;
                select.appendChild(option);
            });
            
            // 設置選擇器事件
            select.addEventListener('change', function() {
                currentChildId = this.value;
                if (currentChildId) {
                    logMessage(`已選擇寶寶 ID: ${currentChildId}`, 'info');
                }
            });
            
            logMessage(`加載了 ${children.length} 個寶寶選項`, 'success');
        } catch (error) {
            logMessage(`加載孩子選擇器時發生錯誤: ${error.message}`, 'error');
        }
    }

    // 生成唯一ID
    function generateUniqueId() {
        const timestamp = new Date().getTime();
        const randomPart = Math.floor(Math.random() * 10000);
        return `${timestamp}-${randomPart}`;
    }

    // 獲取存儲區中的記錄數量
    function getRecordCount(storeName) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('數據庫未連接'));
                return;
            }
            
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const countRequest = store.count();
            
            countRequest.onsuccess = function() {
                resolve(countRequest.result);
            };
            
            countRequest.onerror = function(event) {
                reject(event.target.error);
            };
        });
    }

    // 獲取所有記錄
    function getAllRecords(storeName) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('數據庫未連接'));
                return;
            }
            
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = function() {
                resolve(request.result);
            };
            
            request.onerror = function(event) {
                reject(event.target.error);
            };
        });
    }

    // 根據索引獲取記錄
    function getRecords(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('數據庫未連接'));
                return;
            }
            
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);
            
            request.onsuccess = function() {
                resolve(request.result);
            };
            
            request.onerror = function(event) {
                reject(event.target.error);
            };
        });
    }

    // 更新記錄
    function updateRecord(storeName, record) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('數據庫未連接'));
                return;
            }
            
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(record);
            
            request.onsuccess = function() {
                resolve(request.result);
            };
            
            request.onerror = function(event) {
                reject(event.target.error);
            };
        });
    }

    // 記錄消息到調試控制台
    function logMessage(message, type = 'info') {
        const console = document.getElementById('debug-console');
        const messageDiv = document.createElement('div');
        messageDiv.className = `debug-message debug-${type}`;
        
        // 添加時間戳
        const timestamp = new Date().toLocaleTimeString();
        messageDiv.textContent = `[${timestamp}] ${message}`;
        
        console.appendChild(messageDiv);
        
        // 自動滾動到底部
        console.scrollTop = console.scrollHeight;
    }

    // 清除調試控制台
    function clearDebugConsole() {
        const console = document.getElementById('debug-console');
        console.innerHTML = '';
        logMessage('控制台已清除', 'info');
    }

    // 公開API
    return {
        init,
        checkDatabase,
        inspectHealthData,
        attemptDatabaseFix,
        logMessage
    };
})();

// 初始化調試工具
document.addEventListener('DOMContentLoaded', function() {
    // 添加啟動調試工具的按鈕
    const debugButton = document.createElement('button');
    debugButton.id = 'launch-debug';
    debugButton.innerText = '啟動調試工具';
    debugButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #2196f3;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        z-index: 9998;
        font-size: 14px;
        cursor: pointer;
    `;
    
    document.body.appendChild(debugButton);
    
    // 添加點擊事件
    debugButton.addEventListener('click', function() {
        BabyTrackerDebug.init();
    });
    
    // 添加全局錯誤捕獲
    window.addEventListener('error', function(event) {
        if (document.getElementById('baby-tracker-debug')) {
            BabyTrackerDebug.logMessage(`全局錯誤: ${event.message} (${event.filename}:${event.lineno})`, 'error');
        }
    });
    
    // 覆蓋 console.error 以捕獲應用錯誤
    const originalConsoleError = console.error;
    console.error = function() {
        // 調用原始 console.error
        originalConsoleError.apply(console, arguments);
        
        // 如果調試工具已初始化，記錄錯誤
        if (document.getElementById('baby-tracker-debug')) {
            const errorMessage = Array.from(arguments).join(' ');
            BabyTrackerDebug.logMessage(`應用錯誤: ${errorMessage}`, 'error');
        }
    };
});