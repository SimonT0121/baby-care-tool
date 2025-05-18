// 嬰幼兒照顧追蹤應用 - 主要 JavaScript 檔案

'use strict';

// ==================================================
// 全域變數與設定
// ==================================================
const APP_CONFIG = {
    name: 'BabyTracker',
    version: '1.0.0',
    dbName: 'BabyTrackerDB',
    dbVersion: 1,
    maxPhotoSize: 5 * 1024 * 1024, // 5MB
    defaultLocale: 'zh-TW',
    chartColors: {
        primary: '#FF8A7A',
        secondary: '#7FB3D3',
        accent: '#FFD93D',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444'
    }
};

// 全域狀態
let app = {
    db: null,
    currentChild: null,
    children: [],
    records: [],
    milestones: [],
    memories: [],
    charts: {},
    settings: {
        theme: 'light',
        timeFormat: '24',
        notifications: {
            feeding: false,
            sleep: false
        }
    }
};

// ==================================================
// 工具函數
// ==================================================
const Utils = {
    // 格式化日期時間
    formatDateTime(date, format = 'datetime') {
        if (!date) return '--';
        const d = new Date(date);
        const now = new Date();
        const diffTime = Math.abs(now - d);
        const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
        
        if (format === 'relative' && diffHours < 24) {
            if (diffHours < 1) return '剛剛';
            return `${diffHours} 小時前`;
        }
        
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: format === 'date' ? undefined : '2-digit',
            minute: format === 'date' ? undefined : '2-digit',
            hour12: app.settings.timeFormat === '12'
        };
        
        return new Intl.DateTimeFormat('zh-TW', options).format(d);
    },

    // 計算年齡
    calculateAge(birthDate) {
        const birth = new Date(birthDate);
        const now = new Date();
        const ageMs = now - birth;
        const ageDate = new Date(ageMs);
        
        const years = ageDate.getUTCFullYear() - 1970;
        const months = ageDate.getUTCMonth();
        const days = ageDate.getUTCDate() - 1;
        
        if (years > 0) {
            return `${years}歲${months}個月`;
        } else if (months > 0) {
            return `${months}個月${days}天`;
        } else {
            return `${days}天`;
        }
    },

    // 計算持續時間
    calculateDuration(startTime, endTime) {
        if (!startTime || !endTime) return null;
        const start = new Date(startTime);
        const end = new Date(endTime);
        const diffMs = end - start;
        const diffMins = Math.round(diffMs / (1000 * 60));
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        } else {
            return `${mins}m`;
        }
    },

    // 轉換檔案為 Base64
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            if (file.size > APP_CONFIG.maxPhotoSize) {
                reject(new Error('檔案太大'));
                return;
            }
            
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    // 生成唯一 ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // 防抖函數
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // 節流函數
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    },

    // 深拷貝
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    // 清理空值
    cleanObject(obj) {
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== null && value !== undefined && value !== '') {
                cleaned[key] = value;
            }
        }
        return cleaned;
    }
};

// ==================================================
// IndexedDB 資料庫管理
// ==================================================
const DB = {
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(APP_CONFIG.dbName, APP_CONFIG.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                app.db = request.result;
                resolve(app.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 孩子資料表
                if (!db.objectStoreNames.contains('children')) {
                    const childStore = db.createObjectStore('children', { keyPath: 'id' });
                    childStore.createIndex('name', 'name', { unique: false });
                }
                
                // 記錄資料表
                if (!db.objectStoreNames.contains('records')) {
                    const recordStore = db.createObjectStore('records', { keyPath: 'id' });
                    recordStore.createIndex('childId', 'childId', { unique: false });
                    recordStore.createIndex('type', 'type', { unique: false });
                    recordStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                // 里程碑資料表
                if (!db.objectStoreNames.contains('milestones')) {
                    const milestoneStore = db.createObjectStore('milestones', { keyPath: 'id' });
                    milestoneStore.createIndex('childId', 'childId', { unique: false });
                    milestoneStore.createIndex('date', 'date', { unique: false });
                }
                
                // 記憶資料表
                if (!db.objectStoreNames.contains('memories')) {
                    const memoryStore = db.createObjectStore('memories', { keyPath: 'id' });
                    memoryStore.createIndex('childId', 'childId', { unique: false });
                    memoryStore.createIndex('date', 'date', { unique: false });
                }
                
                // 設定資料表
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    },

    async add(storeName, data) {
        const transaction = app.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return store.add(data);
    },

    async put(storeName, data) {
        const transaction = app.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return store.put(data);
    },

    async get(storeName, id) {
        const transaction = app.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getAll(storeName, indexName = null, query = null) {
        const transaction = app.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const source = indexName ? store.index(indexName) : store;
        
        return new Promise((resolve, reject) => {
            const request = query ? source.getAll(query) : source.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async delete(storeName, id) {
        const transaction = app.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return store.delete(id);
    },

    async clear(storeName) {
        const transaction = app.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return store.clear();
    }
};

// ==================================================
// 通知系統
// ==================================================
const Notification = {
    container: null,

    init() {
        this.container = document.getElementById('notification-container');
    },

    show(message, type = 'success', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" aria-label="關閉通知">&times;</button>
            </div>
        `;

        // 添加關閉按鈕事件
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => this.hide(notification));

        this.container.appendChild(notification);

        // 自動隱藏
        if (duration > 0) {
            setTimeout(() => this.hide(notification), duration);
        }

        return notification;
    },

    hide(notification) {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 250);
    },

    success(message, duration) {
        return this.show(message, 'success', duration);
    },

    error(message, duration) {
        return this.show(message, 'error', duration);
    },

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    },

    info(message, duration) {
        return this.show(message, 'info', duration);
    }
};

// ==================================================
// 主題切換
// ==================================================
const Theme = {
    init() {
        this.loadTheme();
        this.bindEvents();
    },

    loadTheme() {
        const savedTheme = localStorage.getItem('baby-tracker-theme') || 'light';
        this.setTheme(savedTheme);
    },

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        app.settings.theme = theme;
        localStorage.setItem('baby-tracker-theme', theme);
        
        // 更新主題按鈕圖標
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
        }
    },

    toggle() {
        const currentTheme = app.settings.theme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    },

    bindEvents() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggle());
        }
    }
};

// ==================================================
// 模態對話框管理
// ==================================================
const Modal = {
    current: null,

    show(modalId) {
        this.hideAll();
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('show');
            this.current = modal;
            
            // 聚焦到第一個輸入欄位
            const firstInput = modal.querySelector('input, select, textarea');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
            
            // ESC 鍵關閉
            document.addEventListener('keydown', this.handleEscape);
        }
    },

    hide(modal = null) {
        const targetModal = modal || this.current;
        if (targetModal) {
            targetModal.classList.remove('show');
            setTimeout(() => {
                targetModal.classList.add('hidden');
                if (targetModal === this.current) {
                    this.current = null;
                }
            }, 250);
            
            document.removeEventListener('keydown', this.handleEscape);
        }
    },

    hideAll() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.remove('show');
            modal.classList.add('hidden');
        });
        this.current = null;
    },

    handleEscape(event) {
        if (event.key === 'Escape') {
            Modal.hide();
        }
    },

    init() {
        // 綁定關閉按鈕事件
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal-close') || 
                event.target.classList.contains('modal-cancel')) {
                this.hide();
            } else if (event.target.classList.contains('modal')) {
                this.hide();
            }
        });

        // 阻止模態內容點擊事件冒泡
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal-content') || 
                event.target.closest('.modal-content')) {
                event.stopPropagation();
            }
        });
    }
};

// ==================================================
// 孩子管理
// ==================================================
const ChildManager = {
    async loadChildren() {
        try {
            app.children = await DB.getAll('children');
            this.renderChildTabs();
            
            // 如果有孩子，設置第一個為當前孩子
            if (app.children.length > 0 && !app.currentChild) {
                this.setCurrentChild(app.children[0].id);
            }
        } catch (error) {
            console.error('載入孩子資料失敗:', error);
            Notification.error('載入孩子資料失敗');
        }
    },

    async addChild(childData) {
        try {
            const child = {
                id: Utils.generateId(),
                ...childData,
                createdAt: new Date().toISOString()
            };
            
            await DB.add('children', child);
            app.children.push(child);
            this.renderChildTabs();
            this.setCurrentChild(child.id);
            
            Notification.success(`已添加 ${child.name}`);
            Modal.hide();
        } catch (error) {
            console.error('添加孩子失敗:', error);
            Notification.error('添加孩子失敗');
        }
    },

    async updateChild(childId, updateData) {
        try {
            const childIndex = app.children.findIndex(c => c.id === childId);
            if (childIndex !== -1) {
                app.children[childIndex] = { ...app.children[childIndex], ...updateData };
                await DB.put('children', app.children[childIndex]);
                this.renderChildTabs();
                Notification.success('孩子資料已更新');
            }
        } catch (error) {
            console.error('更新孩子資料失敗:', error);
            Notification.error('更新孩子資料失敗');
        }
    },

    async deleteChild(childId) {
        try {
            await DB.delete('children', childId);
            
            // 刪除相關記錄
            const records = await DB.getAll('records', 'childId', childId);
            for (const record of records) {
                await DB.delete('records', record.id);
            }
            
            // 刪除相關里程碑
            const milestones = await DB.getAll('milestones', 'childId', childId);
            for (const milestone of milestones) {
                await DB.delete('milestones', milestone.id);
            }
            
            // 刪除相關記憶
            const memories = await DB.getAll('memories', 'childId', childId);
            for (const memory of memories) {
                await DB.delete('memories', memory.id);
            }
            
            app.children = app.children.filter(c => c.id !== childId);
            this.renderChildTabs();
            
            // 如果刪除的是當前孩子，切換到其他孩子
            if (app.currentChild?.id === childId) {
                if (app.children.length > 0) {
                    this.setCurrentChild(app.children[0].id);
                } else {
                    app.currentChild = null;
                    Dashboard.render();
                }
            }
            
            Notification.success('已刪除孩子資料');
        } catch (error) {
            console.error('刪除孩子失敗:', error);
            Notification.error('刪除孩子失敗');
        }
    },

    setCurrentChild(childId) {
        app.currentChild = app.children.find(c => c.id === childId);
        
        // 更新 UI
        this.renderChildTabs();
        Dashboard.render();
        
        // 儲存到本地
        localStorage.setItem('baby-tracker-current-child', childId);
    },

    renderChildTabs() {
        const tabsContainer = document.getElementById('child-tabs');
        const addButton = tabsContainer.querySelector('.add-child-btn');
        
        // 清除現有的孩子標籤
        const existingTabs = tabsContainer.querySelectorAll('.child-tab');
        existingTabs.forEach(tab => tab.remove());
        
        // 渲染孩子標籤
        app.children.forEach(child => {
            const tab = document.createElement('button');
            tab.className = `child-tab ${child.id === app.currentChild?.id ? 'active' : ''}`;
            tab.innerHTML = `
                <div class="child-avatar">
                    ${child.photo ? 
                        `<img src="${child.photo}" alt="${child.name}">` : 
                        child.name.charAt(0)
                    }
                </div>
                <div class="child-info">
                    <span class="child-name">${child.name}</span>
                    <span class="child-age">${Utils.calculateAge(child.birthdate)}</span>
                </div>
            `;
            
            tab.addEventListener('click', () => this.setCurrentChild(child.id));
            tabsContainer.insertBefore(tab, addButton);
        });
    },

    bindEvents() {
        // 添加孩子按鈕
        const addChildBtn = document.getElementById('add-child-btn');
        if (addChildBtn) {
            addChildBtn.addEventListener('click', () => {
                Modal.show('add-child-modal');
                this.resetAddChildForm();
            });
        }

        // 添加孩子表單
        const addChildForm = document.getElementById('add-child-form');
        if (addChildForm) {
            addChildForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const formData = new FormData(addChildForm);
                const childData = Object.fromEntries(formData.entries());
                
                // 處理照片
                const photoFile = document.getElementById('child-photo').files[0];
                if (photoFile) {
                    try {
                        childData.photo = await Utils.fileToBase64(photoFile);
                    } catch (error) {
                        Notification.error('照片處理失敗');
                        return;
                    }
                }
                
                await this.addChild(childData);
            });
        }

        // 照片預覽
        const photoInput = document.getElementById('child-photo');
        if (photoInput) {
            photoInput.addEventListener('change', this.handlePhotoPreview);
        }
    },

    handlePhotoPreview(event) {
        const file = event.target.files[0];
        const preview = document.getElementById('photo-preview');
        const previewImg = document.getElementById('preview-img');
        
        if (file) {
            if (file.size > APP_CONFIG.maxPhotoSize) {
                Notification.error('照片大小不能超過 5MB');
                event.target.value = '';
                preview.classList.add('hidden');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                preview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        } else {
            preview.classList.add('hidden');
        }
    },

    resetAddChildForm() {
        const form = document.getElementById('add-child-form');
        if (form) {
            form.reset();
            document.getElementById('photo-preview').classList.add('hidden');
        }
    }
};

// ==================================================
// 記錄管理
// ==================================================
const RecordManager = {
    async addRecord(recordData) {
        try {
            const record = {
                id: Utils.generateId(),
                childId: app.currentChild.id,
                timestamp: new Date().toISOString(),
                ...recordData
            };
            
            await DB.add('records', record);
            app.records.push(record);
            
            // 更新 UI
            Dashboard.updateTodayStats();
            Dashboard.renderRecentRecords();
            
            Notification.success('記錄已儲存');
            Modal.hide();
        } catch (error) {
            console.error('儲存記錄失敗:', error);
            Notification.error('儲存記錄失敗');
        }
    },

    async loadRecords() {
        try {
            if (!app.currentChild) return;
            
            app.records = await DB.getAll('records', 'childId', app.currentChild.id);
            app.records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            Dashboard.renderRecentRecords();
            Dashboard.updateTodayStats();
        } catch (error) {
            console.error('載入記錄失敗:', error);
            Notification.error('載入記錄失敗');
        }
    },

    async updateRecord(recordId, updateData) {
        try {
            const recordIndex = app.records.findIndex(r => r.id === recordId);
            if (recordIndex !== -1) {
                app.records[recordIndex] = { ...app.records[recordIndex], ...updateData };
                await DB.put('records', app.records[recordIndex]);
                
                Dashboard.renderRecentRecords();
                Dashboard.updateTodayStats();
                Notification.success('記錄已更新');
            }
        } catch (error) {
            console.error('更新記錄失敗:', error);
            Notification.error('更新記錄失敗');
        }
    },

    async deleteRecord(recordId) {
        try {
            await DB.delete('records', recordId);
            app.records = app.records.filter(r => r.id !== recordId);
            
            Dashboard.renderRecentRecords();
            Dashboard.updateTodayStats();
            Notification.success('記錄已刪除');
        } catch (error) {
            console.error('刪除記錄失敗:', error);
            Notification.error('刪除記錄失敗');
        }
    },

    getRecordsByType(type, days = null) {
        let records = app.records.filter(r => r.type === type);
        
        if (days !== null) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            records = records.filter(r => new Date(r.timestamp) >= cutoffDate);
        }
        
        return records;
    },

    getTodayRecords() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return app.records.filter(r => {
            const recordDate = new Date(r.timestamp);
            return recordDate >= today && recordDate < tomorrow;
        });
    },

    formatRecordForDisplay(record) {
        const baseInfo = {
            id: record.id,
            time: Utils.formatDateTime(record.timestamp, 'relative'),
            timestamp: record.timestamp
        };

        switch (record.type) {
            case 'feeding':
                return {
                    ...baseInfo,
                    icon: '🍼',
                    title: this.getFeedingTitle(record),
                    details: this.getFeedingDetails(record)
                };
            case 'sleep':
                return {
                    ...baseInfo,
                    icon: '😴',
                    title: '睡眠',
                    details: this.getSleepDetails(record)
                };
            case 'diaper':
                return {
                    ...baseInfo,
                    icon: '💩',
                    title: '換尿布',
                    details: this.getDiaperDetails(record)
                };
            case 'activity':
                return {
                    ...baseInfo,
                    icon: '🎈',
                    title: '活動',
                    details: this.getActivityDetails(record)
                };
            case 'health':
                return {
                    ...baseInfo,
                    icon: '🏥',
                    title: '健康',
                    details: this.getHealthDetails(record)
                };
            case 'emotion':
                return {
                    ...baseInfo,
                    icon: this.getEmotionIcon(record.emotion),
                    title: '情緒',
                    details: this.getEmotionDetails(record)
                };
            default:
                return {
                    ...baseInfo,
                    icon: '📝',
                    title: '記錄',
                    details: record.notes || '--'
                };
        }
    },

    getFeedingTitle(record) {
        const types = {
            breast: '母乳餵養',
            formula: '配方奶',
            solid: '固體食物'
        };
        return types[record.feedingType] || '餵食';
    },

    getFeedingDetails(record) {
        const details = [];
        
        if (record.feedingType === 'breast') {
            if (record.side) details.push(record.side === 'both' ? '雙側' : record.side === 'left' ? '左側' : '右側');
            if (record.duration) details.push(`${record.duration}分鐘`);
        } else if (record.feedingType === 'formula') {
            if (record.amount) details.push(`${record.amount}ml`);
        } else if (record.feedingType === 'solid') {
            if (record.food) details.push(record.food);
            if (record.weight) details.push(`${record.weight}g`);
        }
        
        return details.join(' • ') || '--';
    },

    getSleepDetails(record) {
        const details = [];
        
        if (record.startTime && record.endTime) {
            const duration = Utils.calculateDuration(record.startTime, record.endTime);
            if (duration) details.push(`持續 ${duration}`);
        }
        
        if (record.quality) {
            const qualities = {
                deep: '深層睡眠',
                light: '淺層睡眠',
                restless: '頻繁醒來'
            };
            details.push(qualities[record.quality]);
        }
        
        return details.join(' • ') || '--';
    },

    getDiaperDetails(record) {
        const types = [];
        if (record.type) {
            if (Array.isArray(record.type)) {
                if (record.type.includes('urine')) types.push('尿液');
                if (record.type.includes('stool')) types.push('大便');
            } else {
                types.push(record.type);
            }
        }
        
        const details = [];
        if (types.length > 0) details.push(types.join('、'));
        if (record.color) details.push(record.color);
        if (record.texture) details.push(record.texture);
        
        return details.join(' • ') || '--';
    },

    getActivityDetails(record) {
        const activities = {
            bath: '洗澡',
            massage: '按摩',
            dressing: '換衣服',
            'tummy-time': '趴睡練習',
            'sensory-play': '感官遊戲',
            reading: '親子共讀',
            music: '音樂互動',
            walk: '散步',
            sunlight: '曬太陽',
            social: '社交互動',
            custom: record.customActivity || '自定義活動'
        };
        
        const activity = activities[record.type] || record.type;
        const details = [activity];
        
        if (record.duration) details.push(`${record.duration}分鐘`);
        
        return details.join(' • ');
    },

    getHealthDetails(record) {
        const types = {
            temperature: '體溫',
            weight: '體重',
            height: '身高',
            vaccination: '疫苗接種',
            medication: '用藥',
            symptoms: '症狀',
            doctor: '就診'
        };
        
        const details = [types[record.type] || record.type];
        
        if (record.temperature) details.push(`${record.temperature}°C`);
        if (record.weight) details.push(`${record.weight}kg`);
        if (record.height) details.push(`${record.height}cm`);
        if (record.vaccineName) details.push(record.vaccineName);
        if (record.medicationName) details.push(record.medicationName);
        
        return details.join(' • ');
    },

    getEmotionDetails(record) {
        const emotions = {
            happy: '開心愉悅',
            calm: '平靜滿足',
            excited: '興奮好奇',
            anxious: '不安焦慮',
            irritated: '煩躁易怒',
            crying: '大哭不適'
        };
        
        const behaviors = {
            sleeping: '睡眠中',
            feeding: '進食中',
            playing: '專注遊戲',
            exploring: '觀察探索'
        };
        
        const details = [];
        if (record.emotion) details.push(emotions[record.emotion]);
        if (record.behavior) details.push(behaviors[record.behavior]);
        if (record.interaction) details.push(`互動：${record.interaction}`);
        
        return details.join(' • ') || '--';
    },

    getEmotionIcon(emotion) {
        const icons = {
            happy: '😊',
            calm: '😌',
            excited: '🤩',
            anxious: '😕',
            irritated: '😣',
            crying: '😭'
        };
        return icons[emotion] || '😊';
    },

    bindEvents() {
        // 快速動作按鈕
        const actionButtons = document.querySelectorAll('.action-btn');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.showRecordModal(action);
            });
        });

        // 動態表單欄位切換
        this.bindFormFieldToggle();
        
        // 表單提交
        this.bindFormSubmissions();
    },

    showRecordModal(type) {
        if (!app.currentChild) {
            Notification.warning('請先選擇或添加孩子');
            return;
        }

        const modalId = `${type}-modal`;
        const modal = document.getElementById(modalId);
        
        if (modal) {
            // 重置表單
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
                this.setCurrentDateTime(form);
                this.resetDynamicFields(form);
            }
            
            Modal.show(modalId);
        }
    },

    setCurrentDateTime(form) {
        const inputs = form.querySelectorAll('input[type="datetime-local"]');
        inputs.forEach(input => {
            if (!input.value) {
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                input.value = now.toISOString().slice(0, 16);
            }
        });
    },

    resetDynamicFields(form) {
        const dynamicFields = form.querySelectorAll('.feeding-fields, .health-fields, .stool-fields');
        dynamicFields.forEach(field => {
            field.classList.add('hidden');
        });

        // 顯示預設欄位
        const breastFields = form.querySelector('#breast-fields');
        if (breastFields) {
            breastFields.classList.remove('hidden');
        }

        const temperatureFields = form.querySelector('#temperature-fields');
        if (temperatureFields) {
            temperatureFields.classList.remove('hidden');
        }
    },

    bindFormFieldToggle() {
        // 餵食類型切換
        const feedingTypeInputs = document.querySelectorAll('input[name="feedingType"]');
        feedingTypeInputs.forEach(input => {
            input.addEventListener('change', (event) => {
                const form = event.target.closest('form');
                const allFields = form.querySelectorAll('.feeding-fields');
                const targetField = form.querySelector(`#${event.target.value}-fields`);
                
                allFields.forEach(field => field.classList.add('hidden'));
                if (targetField) {
                    targetField.classList.remove('hidden');
                }
            });
        });

        // 健康記錄類型切換
        const healthTypeSelect = document.getElementById('health-type');
        if (healthTypeSelect) {
            healthTypeSelect.addEventListener('change', (event) => {
                const form = event.target.closest('form');
                const allFields = form.querySelectorAll('.health-fields');
                const targetField = form.querySelector(`#${event.target.value}-fields`);
                
                allFields.forEach(field => field.classList.add('hidden'));
                if (targetField) {
                    targetField.classList.remove('hidden');
                }
            });
        }

        // 活動類型切換
        const activityTypeSelect = document.getElementById('activity-type');
        if (activityTypeSelect) {
            activityTypeSelect.addEventListener('change', (event) => {
                const customField = document.getElementById('custom-activity');
                if (event.target.value === 'custom') {
                    customField.classList.remove('hidden');
                } else {
                    customField.classList.add('hidden');
                }
            });
        }

        // 尿布類型切換
        const diaperTypes = document.querySelectorAll('input[name="type"][value="stool"]');
        diaperTypes.forEach(checkbox => {
            checkbox.addEventListener('change', (event) => {
                const stoolDetails = document.getElementById('stool-details');
                const anyStoolChecked = document.querySelector('input[name="type"][value="stool"]:checked');
                
                if (anyStoolChecked) {
                    stoolDetails.classList.remove('hidden');
                } else {
                    stoolDetails.classList.add('hidden');
                }
            });
        });
    },

    bindFormSubmissions() {
        // 餵食表單
        const feedingForm = document.getElementById('feeding-form');
        if (feedingForm) {
            feedingForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                await this.handleFeedingSubmit(event.target);
            });
        }

        // 睡眠表單
        const sleepForm = document.getElementById('sleep-form');
        if (sleepForm) {
            sleepForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                await this.handleSleepSubmit(event.target);
            });
        }

        // 尿布表單
        const diaperForm = document.getElementById('diaper-form');
        if (diaperForm) {
            diaperForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                await this.handleDiaperSubmit(event.target);
            });
        }

        // 活動表單
        const activityForm = document.getElementById('activity-form');
        if (activityForm) {
            activityForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                await this.handleActivitySubmit(event.target);
            });
        }

        // 健康表單
        const healthForm = document.getElementById('health-form');
        if (healthForm) {
            healthForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                await this.handleHealthSubmit(event.target);
            });
        }

        // 情緒表單
        const emotionForm = document.getElementById('emotion-form');
        if (emotionForm) {
            emotionForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                await this.handleEmotionSubmit(event.target);
            });
        }
    },

    async handleFeedingSubmit(form) {
        const formData = new FormData(form);
        const recordData = {
            type: 'feeding',
            time: formData.get('time'),
            feedingType: formData.get('feedingType'),
            notes: formData.get('notes')
        };

        // 處理不同餵食類型的欄位
        if (recordData.feedingType === 'breast') {
            recordData.side = formData.get('side');
            recordData.duration = formData.get('duration') ? parseInt(formData.get('duration')) : null;
        } else if (recordData.feedingType === 'formula') {
            recordData.amount = formData.get('amount') ? parseInt(formData.get('amount')) : null;
        } else if (recordData.feedingType === 'solid') {
            recordData.weight = formData.get('weight') ? parseInt(formData.get('weight')) : null;
            recordData.food = formData.get('food');
        }

        // 處理照片
        const photoFile = form.querySelector('input[type="file"]').files[0];
        if (photoFile) {
            try {
                recordData.photo = await Utils.fileToBase64(photoFile);
            } catch (error) {
                Notification.error('照片處理失敗');
                return;
            }
        }

        await this.addRecord(Utils.cleanObject(recordData));
    },

    async handleSleepSubmit(form) {
        const formData = new FormData(form);
        const recordData = {
            type: 'sleep',
            startTime: formData.get('startTime'),
            endTime: formData.get('endTime'),
            quality: formData.get('quality'),
            notes: formData.get('notes')
        };

        await this.addRecord(Utils.cleanObject(recordData));
    },

    async handleDiaperSubmit(form) {
        const formData = new FormData(form);
        const types = formData.getAll('type');
        
        const recordData = {
            type: 'diaper',
            time: formData.get('time'),
            type: types.length > 0 ? types : null,
            color: formData.get('color'),
            texture: formData.get('texture'),
            notes: formData.get('notes')
        };

        await this.addRecord(Utils.cleanObject(recordData));
    },

    async handleActivitySubmit(form) {
        const formData = new FormData(form);
        const recordData = {
            type: 'activity',
            time: formData.get('time'),
            activityType: formData.get('type'),
            customActivity: formData.get('customActivity'),
            duration: formData.get('duration') ? parseInt(formData.get('duration')) : null,
            notes: formData.get('notes')
        };

        // 處理照片
        const photoFile = form.querySelector('input[type="file"]').files[0];
        if (photoFile) {
            try {
                recordData.photo = await Utils.fileToBase64(photoFile);
            } catch (error) {
                Notification.error('照片處理失敗');
                return;
            }
        }

        await this.addRecord(Utils.cleanObject(recordData));
    },

    async handleHealthSubmit(form) {
        const formData = new FormData(form);
        const healthType = formData.get('type');
        
        const recordData = {
            type: 'health',
            time: formData.get('time'),
            healthType: healthType,
            notes: formData.get('notes')
        };

        // 根據健康記錄類型添加特定欄位
        switch (healthType) {
            case 'temperature':
                recordData.temperature = formData.get('temperature') ? parseFloat(formData.get('temperature')) : null;
                recordData.method = formData.get('method');
                break;
            case 'weight':
                recordData.weight = formData.get('weight') ? parseFloat(formData.get('weight')) : null;
                break;
            case 'height':
                recordData.height = formData.get('height') ? parseFloat(formData.get('height')) : null;
                break;
            case 'vaccination':
                recordData.vaccineName = formData.get('vaccineName');
                recordData.reaction = formData.get('reaction');
                break;
            case 'medication':
                recordData.medicationName = formData.get('medicationName');
                recordData.dosage = formData.get('dosage');
                recordData.frequency = formData.get('frequency');
                break;
            case 'symptoms':
                recordData.symptoms = formData.getAll('symptoms');
                recordData.description = formData.get('description');
                break;
            case 'doctor':
                recordData.reason = formData.get('reason');
                recordData.diagnosis = formData.get('diagnosis');
                recordData.prescription = formData.get('prescription');
                break;
        }

        await this.addRecord(Utils.cleanObject(recordData));
    },

    async handleEmotionSubmit(form) {
        const formData = new FormData(form);
        const recordData = {
            type: 'emotion',
            time: formData.get('time'),
            emotion: formData.get('emotion'),
            behavior: formData.get('behavior'),
            interaction: formData.get('interaction'),
            notes: formData.get('notes')
        };

        // 處理照片
        const photoFile = form.querySelector('input[type="file"]').files[0];
        if (photoFile) {
            try {
                recordData.photo = await Utils.fileToBase64(photoFile);
            } catch (error) {
                Notification.error('照片處理失敗');
                return;
            }
        }

        await this.addRecord(Utils.cleanObject(recordData));
    }
};

// ==================================================
// 儀表板
// ==================================================
const Dashboard = {
    render() {
        this.updateTodayStats();
        this.renderRecentRecords();
    },

    updateTodayStats() {
        if (!app.currentChild) {
            this.clearStats();
            return;
        }

        const todayRecords = RecordManager.getTodayRecords();
        
        // 更新餵食次數
        const feedingCount = todayRecords.filter(r => r.type === 'feeding').length;
        document.getElementById('today-feedings').textContent = feedingCount;

        // 更新總睡眠時間
        const sleepRecords = todayRecords.filter(r => r.type === 'sleep');
        let totalSleepMinutes = 0;
        sleepRecords.forEach(record => {
            if (record.startTime && record.endTime) {
                const start = new Date(record.startTime);
                const end = new Date(record.endTime);
                totalSleepMinutes += (end - start) / (1000 * 60);
            }
        });
        const sleepHours = Math.floor(totalSleepMinutes / 60);
        const sleepMins = Math.round(totalSleepMinutes % 60);
        document.getElementById('today-sleep').textContent = `${sleepHours}h ${sleepMins}m`;

        // 更新換尿布次數
        const diaperCount = todayRecords.filter(r => r.type === 'diaper').length;
        document.getElementById('today-diapers').textContent = diaperCount;

        // 更新心情狀態
        const emotionRecords = todayRecords.filter(r => r.type === 'emotion');
        const lastEmotion = emotionRecords[emotionRecords.length - 1];
        const moodElement = document.getElementById('today-mood');
        if (lastEmotion && lastEmotion.emotion) {
            const emotions = {
                happy: '😊',
                calm: '😌',
                excited: '🤩',
                anxious: '😕',
                irritated: '😣',
                crying: '😭'
            };
            moodElement.textContent = emotions[lastEmotion.emotion] || '--';
        } else {
            moodElement.textContent = '--';
        }
    },

    clearStats() {
        document.getElementById('today-feedings').textContent = '0';
        document.getElementById('today-sleep').textContent = '0h 0m';
        document.getElementById('today-diapers').textContent = '0';
        document.getElementById('today-mood').textContent = '--';
    },

    renderRecentRecords() {
        const container = document.getElementById('recent-records-list');
        
        if (!app.currentChild || app.records.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>尚無記錄</p>
                    <p class="text-sm text-muted">開始記錄寶貝的成長點滴吧！</p>
                </div>
            `;
            return;
        }

        const recentRecords = app.records.slice(0, 5);
        const recordsHtml = recentRecords.map(record => {
            const displayData = RecordManager.formatRecordForDisplay(record);
            return `
                <div class="record-item" data-record-id="${record.id}">
                    <span class="record-icon">${displayData.icon}</span>
                    <div class="record-content">
                        <div class="record-title">${displayData.title}</div>
                        <div class="record-details">${displayData.details}</div>
                    </div>
                    <span class="record-time">${displayData.time}</span>
                </div>
            `;
        }).join('');

        container.innerHTML = recordsHtml;
    }
};

// ==================================================
// 記錄頁面
// ==================================================
const RecordsPage = {
    currentFilter: {
        type: 'all',
        date: 'all'
    },

    init() {
        this.bindEvents();
    },

    bindEvents() {
        // 過濾器
        const typeFilter = document.getElementById('record-type-filter');
        const dateFilter = document.getElementById('date-filter');

        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.currentFilter.type = e.target.value;
                this.renderRecords();
            });
        }

        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.currentFilter.date = e.target.value;
                this.renderRecords();
            });
        }
    },

    show() {
        this.renderRecords();
    },

    renderRecords() {
        const container = document.getElementById('all-records-list');
        
        if (!app.currentChild || app.records.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>尚無記錄</p>
                    <p class="text-sm text-muted">開始記錄寶貝的成長點滴吧！</p>
                </div>
            `;
            return;
        }

        let filteredRecords = this.filterRecords(app.records);
        
        const recordsHtml = filteredRecords.map(record => {
            const displayData = RecordManager.formatRecordForDisplay(record);
            return `
                <div class="record-item" data-record-id="${record.id}">
                    <span class="record-icon">${displayData.icon}</span>
                    <div class="record-content">
                        <div class="record-title">${displayData.title}</div>
                        <div class="record-details">${displayData.details}</div>
                        <div class="record-time">${Utils.formatDateTime(record.timestamp)}</div>
                    </div>
                    <div class="record-actions">
                        <button class="btn-edit" data-record-id="${record.id}" title="編輯">✏️</button>
                        <button class="btn-delete" data-record-id="${record.id}" title="刪除">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = recordsHtml;

        // 綁定編輯和刪除事件
        this.bindRecordActions();
    },

    filterRecords(records) {
        let filtered = [...records];

        // 類型過濾
        if (this.currentFilter.type !== 'all') {
            filtered = filtered.filter(record => record.type === this.currentFilter.type);
        }

        // 日期過濾
        const now = new Date();
        switch (this.currentFilter.date) {
            case 'today':
                const today = new Date(now);
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                filtered = filtered.filter(record => {
                    const recordDate = new Date(record.timestamp);
                    return recordDate >= today && recordDate < tomorrow;
                });
                break;
            case 'week':
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                filtered = filtered.filter(record => new Date(record.timestamp) >= weekAgo);
                break;
            case 'month':
                const monthAgo = new Date(now);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                filtered = filtered.filter(record => new Date(record.timestamp) >= monthAgo);
                break;
        }

        return filtered;
    },

    bindRecordActions() {
        // 編輯按鈕
        const editButtons = document.querySelectorAll('.btn-edit');
        editButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const recordId = btn.dataset.recordId;
                this.editRecord(recordId);
            });
        });

        // 刪除按鈕
        const deleteButtons = document.querySelectorAll('.btn-delete');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const recordId = btn.dataset.recordId;
                this.deleteRecord(recordId);
            });
        });
    },

    editRecord(recordId) {
        // TODO: 實現記錄編輯功能
        Notification.info('編輯功能即將推出');
    },

    deleteRecord(recordId) {
        const record = app.records.find(r => r.id === recordId);
        if (!record) return;

        const displayData = RecordManager.formatRecordForDisplay(record);
        
        if (confirm(`確定要刪除這筆記錄嗎？\n${displayData.title} - ${displayData.details}`)) {
            RecordManager.deleteRecord(recordId);
            this.renderRecords();
        }
    }
};

// ==================================================
// 統計分析頁面
// ==================================================
const AnalyticsPage = {
    chartPeriod: 'week',

    init() {
        this.bindEvents();
    },

    bindEvents() {
        const periodSelect = document.getElementById('chart-period');
        if (periodSelect) {
            periodSelect.addEventListener('change', (e) => {
                this.chartPeriod = e.target.value;
                this.renderCharts();
            });
        }
    },

    show() {
        this.renderCharts();
    },

    renderCharts() {
        if (!app.currentChild) {
            this.clearCharts();
            return;
        }

        // 延遲渲染確保容器已顯示
        setTimeout(() => {
            this.renderSleepChart();
            this.renderFeedingChart();
            this.renderEmotionChart();
            this.renderGrowthChart();
        }, 100);
    },

    clearCharts() {
        Object.keys(app.charts).forEach(key => {
            if (app.charts[key]) {
                app.charts[key].destroy();
                delete app.charts[key];
            }
        });
    },

    getPeriodData() {
        const now = new Date();
        let startDate;

        switch (this.chartPeriod) {
            case 'week':
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now);
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case '3months':
                startDate = new Date(now);
                startDate.setMonth(startDate.getMonth() - 3);
                break;
            default:
                startDate = new Date(0);
        }

        return app.records.filter(record => new Date(record.timestamp) >= startDate);
    },

    renderSleepChart() {
        const ctx = document.getElementById('sleep-chart');
        if (!ctx) return;

        if (app.charts.sleep) {
            app.charts.sleep.destroy();
        }

        const periodData = this.getPeriodData();
        const sleepRecords = periodData.filter(r => r.type === 'sleep');
        
        // 按日期分組
        const sleepByDate = this.groupRecordsByDate(sleepRecords);
        const dates = Object.keys(sleepByDate).sort();
        
        const data = dates.map(date => {
            const records = sleepByDate[date];
            let totalMinutes = 0;
            
            records.forEach(record => {
                if (record.startTime && record.endTime) {
                    const start = new Date(record.startTime);
                    const end = new Date(record.endTime);
                    totalMinutes += (end - start) / (1000 * 60);
                }
            });
            
            return totalMinutes / 60; // 轉換為小時
        });

        app.charts.sleep = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates.map(date => Utils.formatDateTime(date, 'date')),
                datasets: [{
                    label: '睡眠時間 (小時)',
                    data: data,
                    borderColor: APP_CONFIG.chartColors.primary,
                    backgroundColor: APP_CONFIG.chartColors.primary + '20',
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
                        title: {
                            display: true,
                            text: '小時'
                        }
                    }
                }
            }
        });
    },

    renderFeedingChart() {
        const ctx = document.getElementById('feeding-chart');
        if (!ctx) return;

        if (app.charts.feeding) {
            app.charts.feeding.destroy();
        }

        const periodData = this.getPeriodData();
        const feedingRecords = periodData.filter(r => r.type === 'feeding');
        
        // 按類型分組
        const feedingByType = {};
        feedingRecords.forEach(record => {
            const type = record.feedingType || 'unknown';
            feedingByType[type] = (feedingByType[type] || 0) + 1;
        });

        const labels = Object.keys(feedingByType);
        const data = Object.values(feedingByType);
        const colors = [
            APP_CONFIG.chartColors.primary,
            APP_CONFIG.chartColors.secondary,
            APP_CONFIG.chartColors.accent
        ];

        app.charts.feeding = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels.map(label => {
                    const typeNames = {
                        breast: '母乳',
                        formula: '配方奶',
                        solid: '固體食物'
                    };
                    return typeNames[label] || label;
                }),
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    },

    renderEmotionChart() {
        const ctx = document.getElementById('emotion-chart');
        if (!ctx) return;

        if (app.charts.emotion) {
            app.charts.emotion.destroy();
        }

        const periodData = this.getPeriodData();
        const emotionRecords = periodData.filter(r => r.type === 'emotion');
        
        // 按情緒分組
        const emotionCounts = {};
        emotionRecords.forEach(record => {
            const emotion = record.emotion || 'unknown';
            emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
        });

        const emotionNames = {
            happy: '開心',
            calm: '平靜',
            excited: '興奮',
            anxious: '不安',
            irritated: '煩躁',
            crying: '哭泣'
        };

        const labels = Object.keys(emotionCounts).map(key => emotionNames[key] || key);
        const data = Object.values(emotionCounts);

        app.charts.emotion = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '次數',
                    data: data,
                    backgroundColor: APP_CONFIG.chartColors.accent,
                    borderColor: APP_CONFIG.chartColors.accent,
                    borderWidth: 1
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
    },

    renderGrowthChart() {
        const ctx = document.getElementById('growth-chart');
        if (!ctx) return;

        if (app.charts.growth) {
            app.charts.growth.destroy();
        }

        const periodData = this.getPeriodData();
        const healthRecords = periodData.filter(r => 
            r.type === 'health' && (r.healthType === 'weight' || r.healthType === 'height')
        );

        // 分別處理體重和身高
        const weightData = healthRecords
            .filter(r => r.healthType === 'weight' && r.weight)
            .map(r => ({
                x: Utils.formatDateTime(r.timestamp, 'date'),
                y: r.weight
            }));

        const heightData = healthRecords
            .filter(r => r.healthType === 'height' && r.height)
            .map(r => ({
                x: Utils.formatDateTime(r.timestamp, 'date'),
                y: r.height
            }));

        // 如果沒有數據，顯示空狀態
        if (weightData.length === 0 && heightData.length === 0) {
            ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
            const parent = ctx.parentElement;
            parent.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 300px; color: var(--text-muted);">
                    <p>尚無成長數據</p>
                </div>
            `;
            return;
        }

        const datasets = [];

        if (weightData.length > 0) {
            datasets.push({
                label: '體重 (kg)',
                data: weightData,
                borderColor: APP_CONFIG.chartColors.primary,
                backgroundColor: APP_CONFIG.chartColors.primary,
                yAxisID: 'y',
                tension: 0.4
            });
        }

        if (heightData.length > 0) {
            datasets.push({
                label: '身高 (cm)',
                data: heightData,
                borderColor: APP_CONFIG.chartColors.secondary,
                backgroundColor: APP_CONFIG.chartColors.secondary,
                yAxisID: 'y1',
                tension: 0.4
            });
        }

        app.charts.growth = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            parser: 'YYYY-MM-DD',
                            displayFormats: {
                                day: 'MM/DD'
                            }
                        }
                    },
                    y: {
                        type: 'linear',
                        display: weightData.length > 0,
                        position: 'left',
                        title: {
                            display: true,
                            text: '體重 (kg)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: heightData.length > 0,
                        position: 'right',
                        title: {
                            display: true,
                            text: '身高 (cm)'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    },

    groupRecordsByDate(records) {
        return records.reduce((groups, record) => {
            const date = new Date(record.timestamp).toISOString().split('T')[0];
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(record);
            return groups;
        }, {});
    }
};

// ==================================================
// 里程碑管理
// ==================================================
const MilestoneManager = {
    async loadMilestones() {
        try {
            if (!app.currentChild) return;
            
            app.milestones = await DB.getAll('milestones', 'childId', app.currentChild.id);
            app.milestones.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            this.renderMilestones();
        } catch (error) {
            console.error('載入里程碑失敗:', error);
            Notification.error('載入里程碑失敗');
        }
    },

    async addMilestone(milestoneData) {
        try {
            const milestone = {
                id: Utils.generateId(),
                childId: app.currentChild.id,
                ...milestoneData,
                createdAt: new Date().toISOString()
            };
            
            await DB.add('milestones', milestone);
            app.milestones.unshift(milestone);
            this.renderMilestones();
            
            Notification.success('里程碑已添加');
            Modal.hide();
        } catch (error) {
            console.error('添加里程碑失敗:', error);
            Notification.error('添加里程碑失敗');
        }
    },

    async deleteMilestone(milestoneId) {
        try {
            await DB.delete('milestones', milestoneId);
            app.milestones = app.milestones.filter(m => m.id !== milestoneId);
            this.renderMilestones();
            Notification.success('里程碑已刪除');
        } catch (error) {
            console.error('刪除里程碑失敗:', error);
            Notification.error('刪除里程碑失敗');
        }
    },

    renderMilestones() {
        const container = document.getElementById('milestones-timeline');
        
        if (!app.currentChild || app.milestones.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>尚無里程碑記錄</p>
                    <p class="text-sm text-muted">記錄寶貝的重要時刻吧！</p>
                </div>
            `;
            return;
        }

        const milestonesHtml = app.milestones.map(milestone => {
            const categoryNames = {
                motor: '大動作',
                'fine-motor': '精細動作',
                language: '語言',
                cognitive: '認知',
                social: '社交',
                'self-care': '自理',
                custom: '自定義'
            };

            return `
                <div class="milestone-item" data-milestone-id="${milestone.id}">
                    <div class="milestone-header">
                        <span class="milestone-date">${Utils.formatDateTime(milestone.date, 'date')}</span>
                        <span class="milestone-category">${categoryNames[milestone.category] || milestone.category}</span>
                    </div>
                    <h3 class="milestone-title">${milestone.title}</h3>
                    ${milestone.description ? `<p class="milestone-description">${milestone.description}</p>` : ''}
                    ${milestone.photo ? `<img src="${milestone.photo}" alt="${milestone.title}" class="milestone-photo" style="max-width: 200px; border-radius: 8px; margin-top: 10px;">` : ''}
                    <div class="milestone-actions">
                        <button class="btn-delete-milestone" data-milestone-id="${milestone.id}" title="刪除">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = milestonesHtml;

        // 綁定刪除事件
        this.bindMilestoneActions();
    },

    bindMilestoneActions() {
        const deleteButtons = document.querySelectorAll('.btn-delete-milestone');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const milestoneId = btn.dataset.milestoneId;
                const milestone = app.milestones.find(m => m.id === milestoneId);
                
                if (confirm(`確定要刪除里程碑"${milestone.title}"嗎？`)) {
                    this.deleteMilestone(milestoneId);
                }
            });
        });
    },

    bindEvents() {
        // 添加里程碑按鈕
        const addBtn = document.getElementById('add-milestone-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                if (!app.currentChild) {
                    Notification.warning('請先選擇或添加孩子');
                    return;
                }
                Modal.show('milestone-modal');
                this.resetMilestoneForm();
            });
        }

        // 里程碑表單
        const milestoneForm = document.getElementById('milestone-form');
        if (milestoneForm) {
            milestoneForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                await this.handleMilestoneSubmit(event.target);
            });
        }
    },

    async handleMilestoneSubmit(form) {
        const formData = new FormData(form);
        const milestoneData = {
            date: formData.get('date'),
            category: formData.get('category'),
            title: formData.get('title'),
            description: formData.get('description')
        };

        // 處理照片
        const photoFile = form.querySelector('input[type="file"]').files[0];
        if (photoFile) {
            try {
                milestoneData.photo = await Utils.fileToBase64(photoFile);
            } catch (error) {
                Notification.error('照片處理失敗');
                return;
            }
        }

        await this.addMilestone(Utils.cleanObject(milestoneData));
    },

    resetMilestoneForm() {
        const form = document.getElementById('milestone-form');
        if (form) {
            form.reset();
            // 設定預設日期為今天
            const dateInput = form.querySelector('input[type="date"]');
            if (dateInput) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
        }
    },

    show() {
        this.loadMilestones();
    }
};

// ==================================================
// 記憶管理
// ==================================================
const MemoryManager = {
    async loadMemories() {
        try {
            if (!app.currentChild) return;
            
            app.memories = await DB.getAll('memories', 'childId', app.currentChild.id);
            app.memories.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            this.renderMemories();
        } catch (error) {
            console.error('載入記憶失敗:', error);
            Notification.error('載入記憶失敗');
        }
    },

    async addMemory(memoryData) {
        try {
            const memory = {
                id: Utils.generateId(),
                childId: app.currentChild.id,
                ...memoryData,
                createdAt: new Date().toISOString()
            };
            
            await DB.add('memories', memory);
            app.memories.unshift(memory);
            this.renderMemories();
            
            Notification.success('記憶已添加');
            Modal.hide();
        } catch (error) {
            console.error('添加記憶失敗:', error);
            Notification.error('添加記憶失敗');
        }
    },

    async deleteMemory(memoryId) {
        try {
            await DB.delete('memories', memoryId);
            app.memories = app.memories.filter(m => m.id !== memoryId);
            this.renderMemories();
            Notification.success('記憶已刪除');
        } catch (error) {
            console.error('刪除記憶失敗:', error);
            Notification.error('刪除記憶失敗');
        }
    },

    renderMemories() {
        const container = document.getElementById('memories-grid');
        
        if (!app.currentChild || app.memories.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>尚無記憶收藏</p>
                    <p class="text-sm text-muted">記錄珍貴的回憶時光吧！</p>
                </div>
            `;
            return;
        }

        const memoriesHtml = app.memories.map(memory => {
            const typeNames = {
                'daily-highlight': '每日亮點',
                'growth-story': '成長故事',
                'photo-diary': '照片日記',
                'quotes': '語錄收集',
                'first-time': '第一次'
            };

            // 獲取第一張照片作為預覽
            const firstPhoto = Array.isArray(memory.photos) && memory.photos.length > 0 
                ? memory.photos[0] 
                : memory.photos || null;

            return `
                <div class="memory-card" data-memory-id="${memory.id}">
                    ${firstPhoto ? 
                        `<img src="${firstPhoto}" alt="${memory.title}" class="memory-photo">` :
                        `<div class="memory-photo" style="background-color: var(--gray-200); display: flex; align-items: center; justify-content: center; color: var(--text-muted);">📷</div>`
                    }
                    <div class="memory-content">
                        <span class="memory-type">${typeNames[memory.type] || memory.type}</span>
                        <h3 class="memory-title">${memory.title}</h3>
                        <p class="memory-text">${memory.content.substring(0, 100)}${memory.content.length > 100 ? '...' : ''}</p>
                        <div class="memory-footer">
                            <span class="memory-date">${Utils.formatDateTime(memory.date, 'date')}</span>
                            <button class="btn-delete-memory" data-memory-id="${memory.id}" title="刪除">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = memoriesHtml;

        // 綁定事件
        this.bindMemoryActions();
    },

    bindMemoryActions() {
        // 記憶卡片點擊 - 展開詳情
        const memoryCards = document.querySelectorAll('.memory-card');
        memoryCards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn-delete-memory')) {
                    const memoryId = card.dataset.memoryId;
                    this.showMemoryDetail(memoryId);
                }
            });
        });

        // 刪除按鈕
        const deleteButtons = document.querySelectorAll('.btn-delete-memory');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const memoryId = btn.dataset.memoryId;
                const memory = app.memories.find(m => m.id === memoryId);
                
                if (confirm(`確定要刪除記憶"${memory.title}"嗎？`)) {
                    this.deleteMemory(memoryId);
                }
            });
        });
    },

    showMemoryDetail(memoryId) {
        const memory = app.memories.find(m => m.id === memoryId);
        if (!memory) return;

        // 創建記憶詳情模態
        const modalHtml = `
            <div id="memory-detail-modal" class="modal show">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">${memory.title}</h3>
                        <button class="modal-close" aria-label="關閉">&times;</button>
                    </div>
                    <div class="modal-body" style="padding: var(--space-lg);">
                        <div style="margin-bottom: var(--space-lg);">
                            <span class="memory-type">${this.getTypeName(memory.type)}</span>
                            <span class="memory-date" style="float: right; color: var(--text-muted);">${Utils.formatDateTime(memory.date, 'date')}</span>
                        </div>
                        <div style="white-space: pre-wrap; line-height: var(--line-height-relaxed); margin-bottom: var(--space-lg);">
                            ${memory.content}
                        </div>
                        ${this.renderMemoryPhotos(memory.photos)}
                    </div>
                </div>
            </div>
        `;

        // 移除現有的詳情模態
        const existingModal = document.getElementById('memory-detail-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // 添加到 DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // 綁定關閉事件
        const modal = document.getElementById('memory-detail-modal');
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    },

    getTypeName(type) {
        const typeNames = {
            'daily-highlight': '每日亮點',
            'growth-story': '成長故事',
            'photo-diary': '照片日記',
            'quotes': '語錄收集',
            'first-time': '第一次'
        };
        return typeNames[type] || type;
    },

    renderMemoryPhotos(photos) {
        if (!photos) return '';
        
        const photoArray = Array.isArray(photos) ? photos : [photos];
        
        if (photoArray.length === 0) return '';

        return `
            <div class="memory-photos" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-sm);">
                ${photoArray.map((photo, index) => `
                    <img src="${photo}" alt="記憶照片 ${index + 1}" 
                         style="width: 100%; height: 150px; object-fit: cover; border-radius: var(--border-radius); cursor: pointer;"
                         onclick="window.open('${photo}', '_blank')">
                `).join('')}
            </div>
        `;
    },

    bindEvents() {
        // 添加記憶按鈕
        const addBtn = document.getElementById('add-memory-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                if (!app.currentChild) {
                    Notification.warning('請先選擇或添加孩子');
                    return;
                }
                Modal.show('memory-modal');
                this.resetMemoryForm();
            });
        }

        // 記憶表單
        const memoryForm = document.getElementById('memory-form');
        if (memoryForm) {
            memoryForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                await this.handleMemorySubmit(event.target);
            });
        }
    },

    async handleMemorySubmit(form) {
        const formData = new FormData(form);
        const memoryData = {
            date: formData.get('date'),
            type: formData.get('type'),
            title: formData.get('title'),
            content: formData.get('content')
        };

        // 處理多張照片
        const photoFiles = form.querySelector('input[type="file"]').files;
        if (photoFiles.length > 0) {
            try {
                const photos = [];
                for (let i = 0; i < photoFiles.length; i++) {
                    const photoBase64 = await Utils.fileToBase64(photoFiles[i]);
                    photos.push(photoBase64);
                }
                memoryData.photos = photos;
            } catch (error) {
                Notification.error('照片處理失敗');
                return;
            }
        }

        await this.addMemory(Utils.cleanObject(memoryData));
    },

    resetMemoryForm() {
        const form = document.getElementById('memory-form');
        if (form) {
            form.reset();
            // 設定預設日期為今天
            const dateInput = form.querySelector('input[type="date"]');
            if (dateInput) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
        }
    },

    show() {
        this.loadMemories();
    }
};

// ==================================================
// 設定管理
// ==================================================
const SettingsManager = {
    bindEvents() {
        // 設定按鈕
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                Modal.show('settings-modal');
                this.loadSettings();
            });
        }

        // 匯出資料
        const exportBtn = document.getElementById('export-data-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }

        // 匯入資料
        const importBtn = document.getElementById('import-data-btn');
        const importFile = document.getElementById('import-file');
        if (importBtn && importFile) {
            importBtn.addEventListener('click', () => importFile.click());
            importFile.addEventListener('change', (e) => this.importData(e.target.files[0]));
        }

        // 清除資料
        const clearBtn = document.getElementById('clear-data-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearData());
        }

        // 通知設定
        const notifyFeedingCheckbox = document.getElementById('notify-feeding');
        const notifySleepCheckbox = document.getElementById('notify-sleep');
        
        if (notifyFeedingCheckbox) {
            notifyFeedingCheckbox.addEventListener('change', (e) => {
                app.settings.notifications.feeding = e.target.checked;
                this.saveSettings();
            });
        }

        if (notifySleepCheckbox) {
            notifySleepCheckbox.addEventListener('change', (e) => {
                app.settings.notifications.sleep = e.target.checked;
                this.saveSettings();
            });
        }

        // 時間格式設定
        const timeFormatSelect = document.getElementById('time-format');
        if (timeFormatSelect) {
            timeFormatSelect.addEventListener('change', (e) => {
                app.settings.timeFormat = e.target.value;
                this.saveSettings();
                
                // 重新渲染頁面以更新時間格式
                const currentView = Navigation.getCurrentView();
                Navigation.showView(currentView);
            });
        }
    },

    loadSettings() {
        // 載入通知設定
        const notifyFeedingCheckbox = document.getElementById('notify-feeding');
        const notifySleepCheckbox = document.getElementById('notify-sleep');
        
        if (notifyFeedingCheckbox) {
            notifyFeedingCheckbox.checked = app.settings.notifications.feeding;
        }
        
        if (notifySleepCheckbox) {
            notifySleepCheckbox.checked = app.settings.notifications.sleep;
        }

        // 載入時間格式設定
        const timeFormatSelect = document.getElementById('time-format');
        if (timeFormatSelect) {
            timeFormatSelect.value = app.settings.timeFormat;
        }
    },

    async saveSettings() {
        try {
            await DB.put('settings', { key: 'app-settings', value: app.settings });
            localStorage.setItem('baby-tracker-settings', JSON.stringify(app.settings));
        } catch (error) {
            console.error('儲存設定失敗:', error);
        }
    },

    async loadAppSettings() {
        try {
            // 從 localStorage 載入設定
            const savedSettings = localStorage.getItem('baby-tracker-settings');
            if (savedSettings) {
                app.settings = { ...app.settings, ...JSON.parse(savedSettings) };
            }

            // 從 IndexedDB 載入設定
            const dbSettings = await DB.get('settings', 'app-settings');
            if (dbSettings && dbSettings.value) {
                app.settings = { ...app.settings, ...dbSettings.value };
            }
        } catch (error) {
            console.error('載入設定失敗:', error);
        }
    },

    async exportData() {
        try {
            const exportData = {
                version: APP_CONFIG.version,
                exportDate: new Date().toISOString(),
                children: await DB.getAll('children'),
                records: await DB.getAll('records'),
                milestones: await DB.getAll('milestones'),
                memories: await DB.getAll('memories'),
                settings: app.settings
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `baby-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            Notification.success('資料匯出成功');
        } catch (error) {
            console.error('匯出資料失敗:', error);
            Notification.error('匯出資料失敗');
        }
    },

    async importData(file) {
        if (!file) return;

        try {
            const text = await file.text();
            const importData = JSON.parse(text);

            // 驗證資料格式
            if (!importData.version || !importData.children) {
                throw new Error('無效的備份檔案格式');
            }

            // 確認匯入
            if (!confirm('匯入資料將覆蓋現有資料，確定要繼續嗎？')) {
                return;
            }

            // 清除現有資料
            await this.clearAllData();

            // 匯入資料
            if (importData.children) {
                for (const child of importData.children) {
                    await DB.add('children', child);
                }
            }

            if (importData.records) {
                for (const record of importData.records) {
                    await DB.add('records', record);
                }
            }

            if (importData.milestones) {
                for (const milestone of importData.milestones) {
                    await DB.add('milestones', milestone);
                }
            }

            if (importData.memories) {
                for (const memory of importData.memories) {
                    await DB.add('memories', memory);
                }
            }

            if (importData.settings) {
                app.settings = { ...app.settings, ...importData.settings };
                await this.saveSettings();
            }

            // 重新載入應用
            await this.reloadApp();
            
            Notification.success('資料匯入成功');
            Modal.hide();
        } catch (error) {
            console.error('匯入資料失敗:', error);
            Notification.error('匯入資料失敗：' + error.message);
        }
    },

    async clearData() {
        if (!confirm('這將刪除所有資料，包括孩子、記錄、里程碑和記憶。此操作無法復原，確定要繼續嗎？')) {
            return;
        }

        if (!confirm('請再次確認：確定要刪除所有資料嗎？')) {
            return;
        }

        try {
            await this.clearAllData();
            await this.reloadApp();
            
            Notification.success('所有資料已清除');
            Modal.hide();
        } catch (error) {
            console.error('清除資料失敗:', error);
            Notification.error('清除資料失敗');
        }
    },

    async clearAllData() {
        const stores = ['children', 'records', 'milestones', 'memories', 'settings'];
        for (const store of stores) {
            await DB.clear(store);
        }
        
        // 清除本地存儲
        localStorage.removeItem('baby-tracker-current-child');
        localStorage.removeItem('baby-tracker-settings');
        localStorage.removeItem('baby-tracker-theme');
    },

    async reloadApp() {
        // 重置應用狀態
        app.currentChild = null;
        app.children = [];
        app.records = [];
        app.milestones = [];
        app.memories = [];

        // 重新載入資料
        await ChildManager.loadChildren();
        if (app.currentChild) {
            await RecordManager.loadRecords();
        }

        // 重新渲染界面
        ChildManager.renderChildTabs();
        Dashboard.render();
        Navigation.showView('dashboard');
    }
};

// ==================================================
// 導覽管理
// ==================================================
const Navigation = {
    currentView: 'dashboard',

    init() {
        this.bindEvents();
    },

    bindEvents() {
        // 底部導覽按鈕
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.