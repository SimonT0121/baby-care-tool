// 嬰幼兒照顧追蹤應用 - 主要JavaScript檔案
// 版本: 1.0.0
// 作者: AI Assistant
// 最後更新: 2025

// 全域應用狀態
const APP_STATE = {
    currentChild: null,
    currentSection: 'dashboard',
    theme: 'light',
    isLoading: false,
    charts: {}
};

// 資料庫管理類別
class BabyTrackerDB {
    constructor() {
        this.dbName = 'BabyTrackerDB';
        this.version = 1;
        this.db = null;
    }

    // 初始化資料庫
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // 創建孩子資料表
                if (!db.objectStoreNames.contains('children')) {
                    const childrenStore = db.createObjectStore('children', { keyPath: 'id', autoIncrement: true });
                    childrenStore.createIndex('name', 'name', { unique: false });
                }

                // 創建記錄資料表
                if (!db.objectStoreNames.contains('records')) {
                    const recordsStore = db.createObjectStore('records', { keyPath: 'id', autoIncrement: true });
                    recordsStore.createIndex('childId', 'childId', { unique: false });
                    recordsStore.createIndex('type', 'type', { unique: false });
                    recordsStore.createIndex('date', 'date', { unique: false });
                }

                // 創建里程碑資料表
                if (!db.objectStoreNames.contains('milestones')) {
                    const milestonesStore = db.createObjectStore('milestones', { keyPath: 'id', autoIncrement: true });
                    milestonesStore.createIndex('childId', 'childId', { unique: false });
                    milestonesStore.createIndex('category', 'category', { unique: false });
                }

                // 創建記憶資料表
                if (!db.objectStoreNames.contains('memories')) {
                    const memoriesStore = db.createObjectStore('memories', { keyPath: 'id', autoIncrement: true });
                    memoriesStore.createIndex('childId', 'childId', { unique: false });
                    memoriesStore.createIndex('type', 'type', { unique: false });
                }

                // 創建設定資料表
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    // 通用資料庫操作方法
    async add(storeName, data) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return store.add(data);
    }

    async get(storeName, key) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        return store.get(key);
    }

    async getAll(storeName) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        return store.getAll();
    }

    async update(storeName, data) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return store.put(data);
    }

    async delete(storeName, key) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return store.delete(key);
    }

    // 根據索引查詢
    async getByIndex(storeName, indexName, value) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        return index.getAll(value);
    }
}

// 主應用類別
class BabyTrackerApp {
    constructor() {
        this.db = new BabyTrackerDB();
        this.currentChild = null;
        this.init();
    }

    // 應用初始化
    async init() {
        try {
            // 顯示載入畫面
            this.showLoading();

            // 初始化資料庫
            await this.db.init();

            // 載入設定
            await this.loadSettings();

            // 載入孩子列表
            await this.loadChildren();

            // 初始化事件監聽器
            this.initEventListeners();

            // 初始化圖表
            this.initCharts();

            // 隱藏載入畫面
            this.hideLoading();

            // 顯示歡迎訊息
            this.showToast('歡迎使用寶貝成長記錄！', 'success');

        } catch (error) {
            console.error('應用初始化失敗:', error);
            this.showToast('應用載入失敗，請重新整理頁面', 'error');
        }
    }

    // 顯示載入畫面
    showLoading() {
        const loadingScreen = document.getElementById('loadingScreen');
        const app = document.getElementById('app');
        loadingScreen.style.display = 'flex';
        app.style.display = 'none';
        APP_STATE.isLoading = true;
    }

    // 隱藏載入畫面
    hideLoading() {
        const loadingScreen = document.getElementById('loadingScreen');
        const app = document.getElementById('app');
        loadingScreen.style.display = 'none';
        app.style.display = 'flex';
        APP_STATE.isLoading = false;
    }

    // 初始化事件監聽器
    initEventListeners() {
        // 主題切換
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // 設定按鈕
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openModal('settingsModal');
        });

        // 新增孩子按鈕
        document.getElementById('addChildBtn').addEventListener('click', () => {
            this.openModal('addChildModal');
        });

        // 導航切換
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.switchSection(section);
            });
        });

        // 記錄分類切換
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.switchRecordCategory(category);
            });
        });

        // 浮動操作按鈕
        this.initFAB();

        // 模態視窗相關
        this.initModals();

        // 表單提交
        this.initForms();

        // 快速操作按鈕
        this.initQuickActions();

        // 里程碑相關
        this.initMilestones();

        // 記憶相關
        this.initMemories();

        // 設定相關
        this.initSettings();

        // 檔案上傳預覽
        this.initFilePreview();

        // 餵食類型切換
        this.initFeedingTypeSwitch();

        // 睡眠類型切換
        this.initSleepTypeSwitch();

        // 健康類型切換
        this.initHealthTypeSwitch();

        // 排泄類型切換
        this.initDiaperTypeSwitch();
    }

    // 初始化浮動操作按鈕
    initFAB() {
        const fabMain = document.getElementById('quickRecordFab');
        const fabMenu = document.querySelector('.fab-menu');
        
        fabMain.addEventListener('click', () => {
            fabMain.classList.toggle('open');
            fabMenu.classList.toggle('open');
        });

        // 點擊其他地方關閉FAB
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.fab-container')) {
                fabMain.classList.remove('open');
                fabMenu.classList.remove('open');
            }
        });

        // FAB選項點擊
        document.querySelectorAll('.fab-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.quickRecord(action);
                fabMain.classList.remove('open');
                fabMenu.classList.remove('open');
            });
        });
    }

    // 快速記錄
    quickRecord(type) {
        this.switchSection('record');
        this.switchRecordCategory(type);
    }

    // 初始化模態視窗
    initModals() {
        // 模態關閉按鈕
        document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.closeModal(modal.id);
            });
        });

        // 點擊背景關閉模態
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    // 開啟模態視窗
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // 關閉模態視窗
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        
        // 重置表單
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
            this.clearPhotoPreview(modal);
        }
    }

    // 切換分頁
    switchSection(sectionName) {
        // 更新導航狀態
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // 更新內容區域
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionName).classList.add('active');

        APP_STATE.currentSection = sectionName;

        // 載入對應內容
        switch (sectionName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'milestones':
                this.loadMilestones();
                break;
            case 'memories':
                this.loadMemories();
                break;
        }
    }

    // 切換記錄分類
    switchRecordCategory(category) {
        // 更新分類按鈕狀態
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');

        // 更新表單顯示
        document.querySelectorAll('.record-form').forEach(form => {
            form.classList.remove('active');
        });
        document.getElementById(`${category}Form`).classList.add('active');

        // 設置當前時間
        this.setCurrentDateTime(category);
    }

    // 設置當前時間
    setCurrentDateTime(category) {
        const now = new Date();
        const dateTimeString = now.toISOString().slice(0, 16);
        
        const timeInputs = {
            feeding: '#feedingTime',
            sleep: '#sleepStartTime',
            diaper: '#diaperTime',
            mood: '#moodTime',
            activity: '#activityTime',
            health: '#healthTime'
        };

        const timeInput = document.querySelector(timeInputs[category]);
        if (timeInput) {
            timeInput.value = dateTimeString;
        }
    }

    // 載入設定
    async loadSettings() {
        try {
            const settings = await this.db.getAll('settings');
            
            settings.forEach(setting => {
                switch (setting.key) {
                    case 'theme':
                        this.setTheme(setting.value);
                        break;
                    case 'notifications':
                        document.getElementById('notificationsToggle').checked = setting.value;
                        break;
                }
            });
        } catch (error) {
            console.error('載入設定失敗:', error);
        }
    }

    // 載入孩子列表
    async loadChildren() {
        try {
            const children = await this.db.getAll('children');
            const childList = document.getElementById('childList');
            
            childList.innerHTML = '';

            children.forEach(child => {
                const childCard = this.createChildCard(child);
                childList.appendChild(childCard);
            });

            // 如果有孩子，選擇第一個
            if (children.length > 0 && !this.currentChild) {
                this.selectChild(children[0]);
            }
        } catch (error) {
            console.error('載入孩子列表失敗:', error);
        }
    }

    // 創建孩子卡片
    createChildCard(child) {
        const div = document.createElement('div');
        div.className = 'child-card';
        div.dataset.childId = child.id;

        const age = this.calculateAge(child.birthdate);
        const avatar = child.photo ? 
            `<img src="${child.photo}" alt="${child.name}">` : 
            this.getGenderEmoji(child.gender);

        div.innerHTML = `
            <div class="child-avatar">${avatar}</div>
            <div class="child-name">${child.name}</div>
            <div class="child-age">${age}</div>
        `;

        div.addEventListener('click', () => {
            this.selectChild(child);
        });

        return div;
    }

    // 選擇孩子
    selectChild(child) {
        // 更新當前孩子
        this.currentChild = child;
        APP_STATE.currentChild = child;

        // 更新UI狀態
        document.querySelectorAll('.child-card').forEach(card => {
            card.classList.remove('active');
        });
        document.querySelector(`[data-child-id="${child.id}"]`).classList.add('active');

        // 重新載入相關內容
        if (APP_STATE.currentSection === 'dashboard') {
            this.loadDashboard();
        }
    }

    // 計算年齡
    calculateAge(birthdate) {
        const birth = new Date(birthdate);
        const now = new Date();
        const ageInMs = now - birth;
        const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));

        if (ageInDays < 30) {
            return `${ageInDays}天`;
        } else if (ageInDays < 365) {
            const months = Math.floor(ageInDays / 30);
            const days = ageInDays % 30;
            return days > 0 ? `${months}個月${days}天` : `${months}個月`;
        } else {
            const years = Math.floor(ageInDays / 365);
            const months = Math.floor((ageInDays % 365) / 30);
            return months > 0 ? `${years}歲${months}個月` : `${years}歲`;
        }
    }

    // 獲取性別表情符號
    getGenderEmoji(gender) {
        switch (gender) {
            case 'male': return '👦';
            case 'female': return '👧';
            default: return '👶';
        }
    }

    // 主題切換
    toggleTheme() {
        const currentTheme = document.documentElement.dataset.theme || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
        this.saveSettings();
    }

    // 設置主題
    setTheme(theme) {
        document.documentElement.dataset.theme = theme;
        APP_STATE.theme = theme;
        
        const themeIcon = document.querySelector('.theme-icon');
        themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
        
        document.getElementById('darkModeToggle').checked = theme === 'dark';
    }

    // 儲存設定
    async saveSettings() {
        try {
            await this.db.update('settings', { key: 'theme', value: APP_STATE.theme });
            await this.db.update('settings', { key: 'notifications', value: document.getElementById('notificationsToggle').checked });
        } catch (error) {
            console.error('儲存設定失敗:', error);
        }
    }

    // 載入儀表板
    async loadDashboard() {
        if (!this.currentChild) return;

        try {
            // 設置當前日期
            document.getElementById('currentDate').textContent = 
                new Date().toLocaleDateString('zh-TW', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric', 
                    weekday: 'long' 
                });

            // 載入今日統計
            await this.loadTodayStats();

            // 載入最近活動
            await this.loadRecentActivities();

            // 更新圖表
            await this.updateCharts();

        } catch (error) {
            console.error('載入儀表板失敗:', error);
        }
    }

    // 載入今日統計
    async loadTodayStats() {
        const today = new Date().toDateString();
        const records = await this.db.getByIndex('records', 'childId', this.currentChild.id);
        
        const todayRecords = records.filter(record => 
            new Date(record.date).toDateString() === today
        );

        // 統計各類型記錄
        const stats = {
            feedings: todayRecords.filter(r => r.type === 'feeding').length,
            sleep: this.calculateTotalSleep(todayRecords.filter(r => r.type === 'sleep')),
            diapers: todayRecords.filter(r => r.type === 'diaper').length,
            mood: this.getCurrentMood(todayRecords.filter(r => r.type === 'mood'))
        };

        // 更新UI
        document.getElementById('todayFeedings').textContent = stats.feedings;
        document.getElementById('todaySleep').textContent = stats.sleep;
        document.getElementById('todayDiapers').textContent = stats.diapers;
        document.getElementById('currentMood').textContent = stats.mood;
    }

    // 計算總睡眠時間
    calculateTotalSleep(sleepRecords) {
        let totalMinutes = 0;
        
        sleepRecords.forEach(record => {
            if (record.data.endTime && record.data.startTime) {
                const start = new Date(record.data.startTime);
                const end = new Date(record.data.endTime);
                totalMinutes += (end - start) / (1000 * 60);
            }
        });

        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.floor(totalMinutes % 60);
        
        return hours > 0 ? `${hours}h${minutes}m` : `${minutes}m`;
    }

    // 獲取當前情緒
    getCurrentMood(moodRecords) {
        if (moodRecords.length === 0) return '平靜';
        
        const latest = moodRecords.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const moodMap = {
            happy: '開心',
            calm: '平靜',
            excited: '興奮',
            anxious: '不安',
            fussy: '煩躁',
            crying: '哭泣'
        };
        
        return moodMap[latest.data.moodState] || '平靜';
    }

    // 載入最近活動
    async loadRecentActivities() {
        const records = await this.db.getByIndex('records', 'childId', this.currentChild.id);
        const recentRecords = records
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        const activitiesList = document.getElementById('recentActivitiesList');
        activitiesList.innerHTML = '';

        recentRecords.forEach(record => {
            const activityItem = this.createActivityItem(record);
            activitiesList.appendChild(activityItem);
        });
    }

    // 創建活動項目
    createActivityItem(record) {
        const div = document.createElement('div');
        div.className = 'activity-item';

        const icon = this.getRecordIcon(record.type);
        const title = this.getRecordTitle(record);
        const time = new Date(record.date).toLocaleString('zh-TW');

        div.innerHTML = `
            <div class="activity-icon">${icon}</div>
            <div class="activity-details">
                <div class="activity-title">${title}</div>
                <div class="activity-time">${time}</div>
            </div>
        `;

        return div;
    }

    // 獲取記錄圖標
    getRecordIcon(type) {
        const icons = {
            feeding: '🍼',
            sleep: '😴',
            diaper: '🍼',
            mood: '😊',
            activity: '🎯',
            health: '🏥'
        };
        return icons[type] || '📝';
    }

    // 獲取記錄標題
    getRecordTitle(record) {
        const titles = {
            feeding: '餵食記錄',
            sleep: '睡眠記錄',
            diaper: '更換尿布',
            mood: '情緒記錄',
            activity: '活動記錄',
            health: '健康記錄'
        };
        return titles[record.type] || '記錄';
    }

    // 初始化圖表
    initCharts() {
        const ctx = document.getElementById('weeklyChart').getContext('2d');
        
        APP_STATE.charts.weekly = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: '餵食次數',
                        data: [],
                        borderColor: '#FF8A7A',
                        backgroundColor: 'rgba(255, 138, 122, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: '睡眠時數',
                        data: [],
                        borderColor: '#7FB3D3',
                        backgroundColor: 'rgba(127, 179, 211, 0.1)',
                        yAxisID: 'y1',
                        tension: 0.4
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
                            text: '睡眠時數'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    }

    // 更新圖表
    async updateCharts() {
        if (!this.currentChild || !APP_STATE.charts.weekly) return;

        try {
            const records = await this.db.getByIndex('records', 'childId', this.currentChild.id);
            const lastWeek = this.getLastWeekData(records);

            APP_STATE.charts.weekly.data.labels = lastWeek.labels;
            APP_STATE.charts.weekly.data.datasets[0].data = lastWeek.feedings;
            APP_STATE.charts.weekly.data.datasets[1].data = lastWeek.sleep;
            APP_STATE.charts.weekly.update();

        } catch (error) {
            console.error('更新圖表失敗:', error);
        }
    }

    // 獲取最近一週資料
    getLastWeekData(records) {
        const lastWeek = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            lastWeek.push(date);
        }

        const labels = lastWeek.map(date => 
            date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
        );

        const feedings = lastWeek.map(date => {
            const dayRecords = records.filter(record => 
                record.type === 'feeding' && 
                new Date(record.date).toDateString() === date.toDateString()
            );
            return dayRecords.length;
        });

        const sleep = lastWeek.map(date => {
            const dayRecords = records.filter(record => 
                record.type === 'sleep' && 
                new Date(record.date).toDateString() === date.toDateString()
            );
            return this.calculateTotalSleepHours(dayRecords);
        });

        return { labels, feedings, sleep };
    }

    // 計算總睡眠小時數
    calculateTotalSleepHours(sleepRecords) {
        let totalMinutes = 0;
        
        sleepRecords.forEach(record => {
            if (record.data.endTime && record.data.startTime) {
                const start = new Date(record.data.startTime);
                const end = new Date(record.data.endTime);
                totalMinutes += (end - start) / (1000 * 60);
            }
        });

        return parseFloat((totalMinutes / 60).toFixed(1));
    }

    // 初始化表單提交
    initForms() {
        // 新增孩子表單
        document.getElementById('addChildForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleAddChild(e.target);
        });

        // 記錄表單
        document.querySelectorAll('.record-form form').forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleRecordSubmit(e.target);
            });
        });

        // 新增里程碑表單
        document.getElementById('addMilestoneForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleAddMilestone(e.target);
        });

        // 新增記憶表單
        document.getElementById('addMemoryForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleAddMemory(e.target);
        });
    }

    // 處理新增孩子
    async handleAddChild(form) {
        try {
            const formData = new FormData(form);
            const photo = await this.processPhoto(formData.get('childPhoto'));

            const child = {
                name: formData.get('childName'),
                gender: formData.get('childGender'),
                birthdate: formData.get('childBirthdate'),
                photo: photo,
                createdAt: new Date().toISOString()
            };

            await this.db.add('children', child);
            await this.loadChildren();
            this.closeModal('addChildModal');
            this.showToast('成功建立孩子檔案！', 'success');

        } catch (error) {
            console.error('新增孩子失敗:', error);
            this.showToast('建立檔案失敗，請重試', 'error');
        }
    }

    // 處理記錄提交
    async handleRecordSubmit(form) {
        if (!this.currentChild) {
            this.showToast('請先選擇孩子', 'warning');
            return;
        }

        try {
            const formData = new FormData(form);
            const recordType = form.closest('.record-form').id.replace('Form', '');
            
            const record = {
                childId: this.currentChild.id,
                type: recordType,
                date: new Date().toISOString(),
                data: await this.processRecordData(recordType, formData)
            };

            await this.db.add('records', record);
            form.reset();
            this.showToast('記錄儲存成功！', 'success');

            // 更新儀表板
            if (APP_STATE.currentSection === 'dashboard') {
                await this.loadDashboard();
            }

        } catch (error) {
            console.error('儲存記錄失敗:', error);
            this.showToast('儲存失敗，請重試', 'error');
        }
    }

    // 處理記錄資料
    async processRecordData(type, formData) {
        const data = {};

        switch (type) {
            case 'feeding':
                data.feedingType = formData.get('feedingType');
                data.time = formData.get('feedingTime');
                data.notes = formData.get('feedingNotes');
                data.photo = await this.processPhoto(formData.get('feedingPhoto'));

                if (data.feedingType === 'breast') {
                    data.breastSide = formData.get('breastSide');
                    data.duration = formData.get('feedingDuration');
                } else if (data.feedingType === 'formula') {
                    data.amount = formData.get('formulaAmount');
                } else if (data.feedingType === 'solid') {
                    data.foodType = formData.get('solidType');
                    data.amount = formData.get('solidAmount');
                }
                break;

            case 'sleep':
                data.sleepType = formData.get('sleepType');
                data.notes = formData.get('sleepNotes');

                if (data.sleepType === 'start') {
                    data.startTime = formData.get('sleepStartTime');
                } else if (data.sleepType === 'end') {
                    data.endTime = formData.get('sleepEndTime');
                } else if (data.sleepType === 'complete') {
                    data.startTime = formData.get('sleepCompleteStart');
                    data.endTime = formData.get('sleepCompleteEnd');
                    data.quality = formData.get('sleepQuality');
                }
                break;

            case 'diaper':
                data.time = formData.get('diaperTime');
                data.types = formData.getAll('diaperType');
                data.notes = formData.get('diaperNotes');

                if (data.types.includes('dirty')) {
                    data.stoolConsistency = formData.get('stoolConsistency');
                    data.stoolColor = formData.get('stoolColor');
                }
                break;

            case 'mood':
                data.time = formData.get('moodTime');
                data.moodState = formData.get('moodState');
                data.behaviorState = formData.get('behaviorState');
                data.trigger = formData.get('moodTrigger');
                data.notes = formData.get('moodNotes');
                break;

            case 'activity':
                data.time = formData.get('activityTime');
                data.types = formData.getAll('activityType');
                data.duration = formData.get('activityDuration');
                data.custom = formData.get('activityCustom');
                data.notes = formData.get('activityNotes');
                data.photo = await this.processPhoto(formData.get('activityPhoto'));
                break;

            case 'health':
                data.time = formData.get('healthTime');
                data.healthType = formData.get('healthType');
                data.notes = formData.get('healthNotes');

                if (data.healthType === 'temperature') {
                    data.temperature = formData.get('temperature');
                    data.method = formData.get('temperatureMethod');
                } else if (data.healthType === 'weight') {
                    data.weight = formData.get('weight');
                    data.height = formData.get('height');
                } else if (data.healthType === 'symptom') {
                    data.symptoms = formData.getAll('symptoms');
                } else if (data.healthType === 'medication') {
                    data.medicationName = formData.get('medicationName');
                    data.dose = formData.get('medicationDose');
                } else if (data.healthType === 'vaccination') {
                    data.vaccineName = formData.get('vaccineName');
                    data.location = formData.get('vaccineLocation');
                }
                break;
        }

        return data;
    }

    // 處理照片
    async processPhoto(file) {
        if (!file || file.size === 0) return null;

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }

    // 初始化快速操作
    initQuickActions() {
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.quickRecord(action);
            });
        });
    }

    // 初始化里程碑
    initMilestones() {
        document.getElementById('addMilestoneBtn').addEventListener('click', () => {
            this.openModal('addMilestoneModal');
        });
    }

    // 載入里程碑
    async loadMilestones() {
        if (!this.currentChild) return;

        try {
            const milestones = await this.db.getByIndex('milestones', 'childId', this.currentChild.id);
            const predefinedMilestones = this.getPredefinedMilestones();

            // 載入各分類的里程碑
            const categories = ['motor', 'fine', 'language', 'cognitive', 'social', 'self-care'];
            
            categories.forEach(category => {
                const container = document.getElementById(`${category}Milestones`);
                container.innerHTML = '';

                const categoryMilestones = [
                    ...predefinedMilestones[category] || [],
                    ...milestones.filter(m => m.category === category)
                ];

                categoryMilestones.forEach(milestone => {
                    const item = this.createMilestoneItem(milestone);
                    container.appendChild(item);
                });
            });

            // 載入時間軸
            this.loadMilestoneTimeline(milestones);

        } catch (error) {
            console.error('載入里程碑失敗:', error);
        }
    }

    // 獲取預定義里程碑
    getPredefinedMilestones() {
        return {
            motor: [
                { title: '抬頭', expectedAge: '2個月', completed: false },
                { title: '翻身', expectedAge: '4-6個月', completed: false },
                { title: '不需支撐坐立', expectedAge: '6-8個月', completed: false },
                { title: '爬行', expectedAge: '7-10個月', completed: false },
                { title: '站立', expectedAge: '9-12個月', completed: false },
                { title: '走路', expectedAge: '12-15個月', completed: false }
            ],
            fine: [
                { title: '握拳反射', expectedAge: '0-3個月', completed: false },
                { title: '主動抓握', expectedAge: '3-4個月', completed: false },
                { title: '用拇指和食指捏取', expectedAge: '8-10個月', completed: false },
                { title: '疊積木', expectedAge: '12-15個月', completed: false }
            ],
            language: [
                { title: '發出聲音', expectedAge: '0-2個月', completed: false },
                { title: '咿呀學語', expectedAge: '4-6個月', completed: false },
                { title: '說第一個字', expectedAge: '10-14個月', completed: false },
                { title: '說第一個詞組', expectedAge: '15-20個月', completed: false }
            ],
            cognitive: [
                { title: '眼神追蹤', expectedAge: '2-3個月', completed: false },
                { title: '物體恆存概念', expectedAge: '8-12個月', completed: false },
                { title: '模仿行為', expectedAge: '12-18個月', completed: false }
            ],
            social: [
                { title: '社交微笑', expectedAge: '6-8週', completed: false },
                { title: '認識照顧者', expectedAge: '2-3個月', completed: false },
                { title: '表現分離焦慮', expectedAge: '6-8個月', completed: false },
                { title: '與他人玩耍', expectedAge: '12-18個月', completed: false }
            ],
            'self-care': [
                { title: '自己拿奶瓶', expectedAge: '6-10個月', completed: false },
                { title: '用杯子喝水', expectedAge: '12-15個月', completed: false },
                { title: '用湯匙吃飯', expectedAge: '15-18個月', completed: false }
            ]
        };
    }

    // 創建里程碑項目
    createMilestoneItem(milestone) {
        const div = document.createElement('div');
        div.className = `milestone-item ${milestone.completed ? 'completed' : ''}`;

        div.innerHTML = `
            <div class="milestone-title">${milestone.title}</div>
            <div class="milestone-age">${milestone.achievedDate ? 
                `達成於 ${new Date(milestone.achievedDate).toLocaleDateString('zh-TW')}` : 
                `預期 ${milestone.expectedAge}`
            }</div>
        `;

        if (!milestone.completed) {
            div.addEventListener('click', () => {
                this.markMilestoneCompleted(milestone);
            });
        }

        return div;
    }

    // 標記里程碑完成
    async markMilestoneCompleted(milestone) {
        try {
            const completedMilestone = {
                ...milestone,
                completed: true,
                achievedDate: new Date().toISOString(),
                childId: this.currentChild.id
            };

            if (milestone.id) {
                await this.db.update('milestones', completedMilestone);
            } else {
                await this.db.add('milestones', completedMilestone);
            }

            this.loadMilestones();
            this.showToast('恭喜！里程碑達成！', 'success');

        } catch (error) {
            console.error('標記里程碑失敗:', error);
            this.showToast('標記失敗，請重試', 'error');
        }
    }

    // 載入里程碑時間軸
    loadMilestoneTimeline(milestones) {
        const timeline = document.getElementById('milestoneTimeline');
        timeline.innerHTML = '';

        const completed = milestones
            .filter(m => m.completed)
            .sort((a, b) => new Date(a.achievedDate) - new Date(b.achievedDate));

        completed.forEach(milestone => {
            const item = this.createTimelineItem(milestone);
            timeline.appendChild(item);
        });
    }

    // 創建時間軸項目
    createTimelineItem(milestone) {
        const div = document.createElement('div');
        div.className = 'timeline-item';

        div.innerHTML = `
            <div class="timeline-date">${new Date(milestone.achievedDate).toLocaleDateString('zh-TW')}</div>
            <div class="timeline-content">
                <div class="timeline-title">${milestone.title}</div>
                <div class="timeline-description">${milestone.description || ''}</div>
            </div>
        `;

        return div;
    }

    // 處理新增里程碑
    async handleAddMilestone(form) {
        if (!this.currentChild) {
            this.showToast('請先選擇孩子', 'warning');
            return;
        }

        try {
            const formData = new FormData(form);
            const photo = await this.processPhoto(formData.get('milestonePhoto'));

            const milestone = {
                childId: this.currentChild.id,
                category: formData.get('milestoneCategory'),
                title: formData.get('milestoneTitle'),
                achievedDate: formData.get('milestoneDate'),
                ageMonths: formData.get('milestoneAgeMonths'),
                ageDays: formData.get('milestoneAgeDays'),
                description: formData.get('milestoneDescription'),
                photo: photo,
                completed: true,
                createdAt: new Date().toISOString()
            };

            await this.db.add('milestones', milestone);
            this.closeModal('addMilestoneModal');
            this.loadMilestones();
            this.showToast('里程碑記錄成功！', 'success');

        } catch (error) {
            console.error('新增里程碑失敗:', error);
            this.showToast('記錄失敗，請重試', 'error');
        }
    }

    // 初始化記憶
    initMemories() {
        document.getElementById('addMemoryBtn').addEventListener('click', () => {
            this.openModal('addMemoryModal');
        });

        // 記憶篩選
        document.querySelectorAll('.memory-filter').forEach(filter => {
            filter.addEventListener('click', (e) => {
                this.filterMemories(e.target.dataset.filter);
            });
        });
    }

    // 載入記憶
    async loadMemories() {
        if (!this.currentChild) return;

        try {
            const memories = await this.db.getByIndex('memories', 'childId', this.currentChild.id);
            this.displayMemories(memories);

        } catch (error) {
            console.error('載入記憶失敗:', error);
        }
    }

    // 顯示記憶
    displayMemories(memories) {
        const grid = document.getElementById('memoriesGrid');
        grid.innerHTML = '';

        memories
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .forEach(memory => {
                const card = this.createMemoryCard(memory);
                grid.appendChild(card);
            });
    }

    // 創建記憶卡片
    createMemoryCard(memory) {
        const div = document.createElement('div');
        div.className = 'memory-card';
        div.dataset.memoryType = memory.type;

        const photo = memory.photos && memory.photos[0] ? 
            `<img src="${memory.photos[0]}" alt="${memory.title}">` : '';

        const typeLabels = {
            'daily-highlight': '💫 每日亮點',
            'growth-story': '📖 成長故事',
            'photo-diary': '📷 照片日記',
            'quotes': '💬 語錄收集',
            'first-time': '🌟 第一次'
        };

        div.innerHTML = `
            <div class="memory-photo">
                ${photo}
                <div class="memory-type-badge">${typeLabels[memory.type]}</div>
            </div>
            <div class="memory-content">
                <div class="memory-header">
                    <div class="memory-title">${memory.title}</div>
                    <div class="memory-date">${new Date(memory.date).toLocaleDateString('zh-TW')}</div>
                </div>
                <div class="memory-excerpt">${memory.content}</div>
                <div class="memory-tags">
                    ${memory.tags ? memory.tags.map(tag => `<span class="memory-tag">${tag}</span>`).join('') : ''}
                </div>
            </div>
        `;

        return div;
    }

    // 篩選記憶
    filterMemories(filter) {
        // 更新篩選按鈕狀態
        document.querySelectorAll('.memory-filter').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');

        // 篩選記憶卡片
        const cards = document.querySelectorAll('.memory-card');
        cards.forEach(card => {
            if (filter === 'all' || card.dataset.memoryType === filter) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // 處理新增記憶
    async handleAddMemory(form) {
        if (!this.currentChild) {
            this.showToast('請先選擇孩子', 'warning');
            return;
        }

        try {
            const formData = new FormData(form);
            const photos = await this.processMultiplePhotos(formData.getAll('memoryPhotos'));
            const tags = formData.get('memoryTags') ? 
                formData.get('memoryTags').split(',').map(tag => tag.trim()) : [];

            const memory = {
                childId: this.currentChild.id,
                type: formData.get('memoryType'),
                title: formData.get('memoryTitle'),
                date: formData.get('memoryDate'),
                content: formData.get('memoryContent'),
                photos: photos,
                tags: tags,
                createdAt: new Date().toISOString()
            };

            await this.db.add('memories', memory);
            this.closeModal('addMemoryModal');
            this.loadMemories();
            this.showToast('記憶儲存成功！', 'success');

        } catch (error) {
            console.error('新增記憶失敗:', error);
            this.showToast('儲存失敗，請重試', 'error');
        }
    }

    // 處理多張照片
    async processMultiplePhotos(files) {
        const photos = [];
        
        for (const file of files) {
            if (file && file.size > 0) {
                const photo = await this.processPhoto(file);
                if (photo) photos.push(photo);
            }
        }

        return photos;
    }

    // 初始化設定
    initSettings() {
        document.getElementById('exportDataBtn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('importDataBtn').addEventListener('click', () => {
            document.getElementById('importDataFile').click();
        });

        document.getElementById('importDataFile').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.importData(e.target.files[0]);
            }
        });

        document.getElementById('darkModeToggle').addEventListener('change', (e) => {
            this.setTheme(e.target.checked ? 'dark' : 'light');
            this.saveSettings();
        });

        document.getElementById('notificationsToggle').addEventListener('change', () => {
            this.saveSettings();
        });
    }

    // 匯出資料
    async exportData() {
        try {
            const data = {
                children: await this.db.getAll('children'),
                records: await this.db.getAll('records'),
                milestones: await this.db.getAll('milestones'),
                memories: await this.db.getAll('memories'),
                settings: await this.db.getAll('settings'),
                exportDate: new Date().toISOString(),
                version: '1.0.0'
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `baby_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showToast('資料匯出成功！', 'success');

        } catch (error) {
            console.error('匯出資料失敗:', error);
            this.showToast('匯出失敗，請重試', 'error');
        }
    }

    // 匯入資料
    async importData(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // 驗證資料格式
            if (!data.children || !data.records) {
                throw new Error('無效的資料格式');
            }

            // 確認匯入
            if (!confirm('匯入資料將會覆蓋現有資料，確定要繼續嗎？')) {
                return;
            }

            // 清空現有資料
            await this.clearAllData();

            // 匯入新資料
            for (const child of data.children) {
                delete child.id;
                await this.db.add('children', child);
            }

            for (const record of data.records) {
                delete record.id;
                await this.db.add('records', record);
            }

            if (data.milestones) {
                for (const milestone of data.milestones) {
                    delete milestone.id;
                    await this.db.add('milestones', milestone);
                }
            }

            if (data.memories) {
                for (const memory of data.memories) {
                    delete memory.id;
                    await this.db.add('memories', memory);
                }
            }

            if (data.settings) {
                for (const setting of data.settings) {
                    await this.db.update('settings', setting);
                }
            }

            // 重新載入應用
            await this.loadChildren();
            await this.loadSettings();
            this.showToast('資料匯入成功！', 'success');
            this.closeModal('settingsModal');

        } catch (error) {
            console.error('匯入資料失敗:', error);
            this.showToast('匯入失敗，請檢查檔案格式', 'error');
        }
    }

    // 清空所有資料
    async clearAllData() {
        const stores = ['children', 'records', 'milestones', 'memories'];
        
        for (const store of stores) {
            const items = await this.db.getAll(store);
            for (const item of items) {
                await this.db.delete(store, item.id);
            }
        }
    }

    // 初始化檔案預覽
    initFilePreview() {
        document.querySelectorAll('input[type="file"]').forEach(input => {
            input.addEventListener('change', (e) => {
                this.handleFilePreview(e.target);
            });
        });
    }

    // 處理檔案預覽
    handleFilePreview(input) {
        const previewContainer = document.getElementById(input.id + 'Preview');
        if (!previewContainer) return;

        previewContainer.innerHTML = '';

        const files = Array.from(input.files);
        files.forEach((file, index) => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const item = document.createElement('div');
                    item.className = 'photo-preview-item';
                    item.innerHTML = `
                        <img src="${e.target.result}" alt="預覽">
                        <button type="button" class="photo-remove" onclick="this.parentElement.remove()">×</button>
                    `;
                    previewContainer.appendChild(item);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // 清除照片預覽
    clearPhotoPreview(container) {
        container.querySelectorAll('.photo-preview').forEach(preview => {
            preview.innerHTML = '';
        });
    }

    // 初始化餵食類型切換
    initFeedingTypeSwitch() {
        const feedingTypeInputs = document.querySelectorAll('input[name="feedingType"]');
        feedingTypeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.toggleFeedingFields(e.target.value);
            });
        });
    }

    // 切換餵食欄位
    toggleFeedingFields(type) {
        const breastFields = document.querySelector('.breast-fields');
        const formulaFields = document.querySelector('.formula-fields');
        const solidFields = document.querySelector('.solid-fields');

        breastFields.style.display = type === 'breast' ? 'block' : 'none';
        formulaFields.style.display = type === 'formula' ? 'block' : 'none';
        solidFields.style.display = type === 'solid' ? 'block' : 'none';
    }

    // 初始化睡眠類型切換
    initSleepTypeSwitch() {
        const sleepTypeInputs = document.querySelectorAll('input[name="sleepType"]');
        sleepTypeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.toggleSleepFields(e.target.value);
            });
        });
    }

    // 切換睡眠欄位
    toggleSleepFields(type) {
        const startFields = document.querySelector('.sleep-start-fields');
        const endFields = document.querySelector('.sleep-end-fields');
        const completeFields = document.querySelector('.sleep-complete-fields');

        startFields.style.display = type === 'start' ? 'block' : 'none';
        endFields.style.display = type === 'end' ? 'block' : 'none';
        completeFields.style.display = type === 'complete' ? 'block' : 'none';
    }

    // 初始化健康類型切換
    initHealthTypeSwitch() {
        const healthTypeSelect = document.getElementById('healthType');
        healthTypeSelect.addEventListener('change', (e) => {
            this.toggleHealthFields(e.target.value);
        });
    }

    // 切換健康欄位
    toggleHealthFields(type) {
        const fields = {
            temperature: '.health-temperature-fields',
            weight: '.health-weight-fields',
            symptom: '.health-symptom-fields',
            medication: '.health-medication-fields',
            vaccination: '.health-vaccination-fields'
        };

        Object.values(fields).forEach(selector => {
            const field = document.querySelector(selector);
            if (field) field.style.display = 'none';
        });

        if (fields[type]) {
            const field = document.querySelector(fields[type]);
            if (field) field.style.display = 'block';
        }
    }

    // 初始化排泄類型切換
    initDiaperTypeSwitch() {
        const diaperTypeInputs = document.querySelectorAll('input[name="diaperType"]');
        diaperTypeInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.toggleDiaperFields();
            });
        });
    }

    // 切換排泄欄位
    toggleDiaperFields() {
        const dirtyChecked = document.querySelector('input[name="diaperType"][value="dirty"]').checked;
        const stoolFields = document.querySelector('.stool-fields');
        stoolFields.style.display = dirtyChecked ? 'block' : 'none';
    }

    // 顯示Toast訊息
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        toastMessage.textContent = message;
        toast.className = `toast show ${type}`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// 工具函式
class Utils {
    // 格式化日期
    static formatDate(date) {
        return new Date(date).toLocaleDateString('zh-TW');
    }

    // 格式化時間
    static formatTime(date) {
        return new Date(date).toLocaleTimeString('zh-TW', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    // 格式化持續時間
    static formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        
        if (hours > 0) {
            return `${hours}小時${mins}分鐘`;
        } else {
            return `${mins}分鐘`;
        }
    }

    // 驗證表單
    static validateForm(form) {
        const requiredFields = form.querySelectorAll('input[required], select[required], textarea[required]');
        
        for (const field of requiredFields) {
            if (!field.value.trim()) {
                field.focus();
                return false;
            }
        }
        
        return true;
    }

    // 防抖函式
    static debounce(func, wait) {
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

    // 節流函式
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// 當DOM載入完成時啟動應用
document.addEventListener('DOMContentLoaded', () => {
    // 檢查瀏覽器支援
    if (!window.indexedDB) {
        alert('您的瀏覽器不支援IndexedDB，無法正常使用此應用');
        return;
    }

    // 初始化應用
    const app = new BabyTrackerApp();
    
    // 將應用實例暴露到全域，方便除錯
    window.babyTrackerApp = app;
});

// 服務工作器註冊 (PWA支援)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// 全域錯誤處理
window.addEventListener('unhandledrejection', (event) => {
    console.error('未處理的Promise拒絕:', event.reason);
    
    // 顯示用戶友善的錯誤訊息
    if (window.babyTrackerApp) {
        window.babyTrackerApp.showToast('發生了一個錯誤，請重試', 'error');
    }
});

window.addEventListener('error', (event) => {
    console.error('全域錯誤:', event.error);
    
    // 顯示用戶友善的錯誤訊息
    if (window.babyTrackerApp) {
        window.babyTrackerApp.showToast('應用發生錯誤，請重新整理頁面', 'error');
    }
});