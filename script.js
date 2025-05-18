// =======================
// 嬰幼兒照顧追蹤應用 - 核心邏輯
// 設計原則：認知負擔最小化、錯誤預防優先
// =======================

class BabyTracker {
    constructor() {
        this.db = null;
        this.currentBaby = null;
        this.chart = null;
        this.initializeApp();
    }

    // 初始化應用
    async initializeApp() {
        try {
            // 初始化資料庫
            await this.initDatabase();
            
            // 綁定事件監聽器
            this.bindEventListeners();
            
            // 初始化介面
            this.initializeUI();
            
            // 載入寶寶列表
            await this.loadBabies();
            
            // 隱藏載入畫面
            this.hideLoadingScreen();
            
            // 初始化PWA功能
            this.initializePWA();
            
            // 處理URL參數（支援快捷方式）
            this.handleURLParams();
            
        } catch (error) {
            console.error('應用初始化失敗:', error);
            this.showToast('應用初始化失敗', 'error');
        }
    }

    // 初始化IndexedDB
    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('BabyTrackerDB', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 建立寶寶資料表
                if (!db.objectStoreNames.contains('babies')) {
                    const babiesStore = db.createObjectStore('babies', { keyPath: 'id', autoIncrement: true });
                    babiesStore.createIndex('name', 'name', { unique: false });
                    babiesStore.createIndex('birthdate', 'birthdate', { unique: false });
                }
                
                // 建立記錄資料表
                if (!db.objectStoreNames.contains('records')) {
                    const recordsStore = db.createObjectStore('records', { keyPath: 'id', autoIncrement: true });
                    recordsStore.createIndex('babyId', 'babyId', { unique: false });
                    recordsStore.createIndex('type', 'type', { unique: false });
                    recordsStore.createIndex('datetime', 'datetime', { unique: false });
                }
                
                // 建立里程碑資料表
                if (!db.objectStoreNames.contains('milestones')) {
                    const milestonesStore = db.createObjectStore('milestones', { keyPath: 'id', autoIncrement: true });
                    milestonesStore.createIndex('babyId', 'babyId', { unique: false });
                    milestonesStore.createIndex('category', 'category', { unique: false });
                    milestonesStore.createIndex('date', 'date', { unique: false });
                }
                
                // 建立記憶資料表
                if (!db.objectStoreNames.contains('memories')) {
                    const memoriesStore = db.createObjectStore('memories', { keyPath: 'id', autoIncrement: true });
                    memoriesStore.createIndex('babyId', 'babyId', { unique: false });
                    memoriesStore.createIndex('type', 'type', { unique: false });
                    memoriesStore.createIndex('date', 'date', { unique: false });
                }
            };
        });
    }

    // 綁定事件監聽器
    bindEventListeners() {
        // 頁籤切換
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // 寶寶選擇器
        const babySelector = document.getElementById('baby-selector-btn');
        if (babySelector) {
            babySelector.addEventListener('click', () => this.toggleBabyDropdown());
        }

        // 新增寶寶
        const addBabyBtn = document.getElementById('add-baby-btn');
        if (addBabyBtn) {
            addBabyBtn.addEventListener('click', () => this.openBabyModal());
        }

        const editBabyBtn = document.getElementById('edit-baby-btn');
        if (editBabyBtn) {
            editBabyBtn.addEventListener('click', () => this.openBabyModal(this.currentBaby));
        }

        // 記錄分類
        document.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', (e) => this.openRecordModal(e.currentTarget.dataset.category));
        });

        // 快速行動按鈕
        const quickActionBtn = document.getElementById('quick-action-btn');
        if (quickActionBtn) {
            quickActionBtn.addEventListener('click', () => this.openQuickActions());
        }

        // 模態框關閉
        document.querySelectorAll('.modal-close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
        });

        // 模態框背景點擊關閉
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal(modal);
            });
        });

        // 表單提交
        const babyForm = document.getElementById('baby-form');
        if (babyForm) {
            babyForm.addEventListener('submit', (e) => this.saveBaby(e));
        }

        const milestoneForm = document.getElementById('milestone-form');
        if (milestoneForm) {
            milestoneForm.addEventListener('submit', (e) => this.saveMilestone(e));
        }

        const memoryForm = document.getElementById('memory-form');
        if (memoryForm) {
            memoryForm.addEventListener('submit', (e) => this.saveMemory(e));
        }

        // 照片上傳
        const photoUploadBtn = document.getElementById('photo-upload-btn');
        if (photoUploadBtn) {
            photoUploadBtn.addEventListener('click', () => {
                document.getElementById('baby-photo-input').click();
            });
        }

        const babyPhotoInput = document.getElementById('baby-photo-input');
        if (babyPhotoInput) {
            babyPhotoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
        }

        // 設定
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettingsModal());
        }

        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        const exportBtn = document.getElementById('export-data-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }

        const importData = document.getElementById('import-data');
        if (importData) {
            importData.addEventListener('change', (e) => this.importData(e));
        }

        // 里程碑和記憶相關按鈕
        const addMilestoneBtn = document.getElementById('add-milestone-btn');
        if (addMilestoneBtn) {
            addMilestoneBtn.addEventListener('click', () => this.openMilestoneModal());
        }

        const addMemoryBtn = document.getElementById('add-memory-btn');
        if (addMemoryBtn) {
            addMemoryBtn.addEventListener('click', () => this.openMemoryModal());
        }

        // 圖表頁籤
        document.querySelectorAll('.chart-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchChart(e.target.dataset.chart));
        });

        // 里程碑分類頁籤
        document.querySelectorAll('.milestone-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.filterMilestones(e.target.dataset.category));
        });

        // 記憶篩選
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterMemories(e.target.dataset.filter));
        });

        // ESC鍵關閉模態框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal.show');
                if (openModal) this.closeModal(openModal);
            }
        });

        // 點擊外部關閉下拉選單
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.baby-selector')) {
                const dropdown = document.getElementById('baby-dropdown');
                if (dropdown) {
                    dropdown.classList.remove('show');
                }
            }
        });

        // 儲存記錄按鈕
        const saveRecordBtn = document.getElementById('save-record-btn');
        if (saveRecordBtn) {
            saveRecordBtn.addEventListener('click', () => this.saveRecord());
        }

        // 主題設定變更
        const themeSetting = document.getElementById('theme-setting');
        if (themeSetting) {
            themeSetting.addEventListener('change', (e) => {
                const theme = e.target.value;
                this.applyTheme(theme);
                localStorage.setItem('baby-tracker-theme', theme);
            });
        }
    }

    // 初始化UI
    initializeUI() {
        // 設定預設主題
        const savedTheme = localStorage.getItem('baby-tracker-theme') || 'auto';
        this.applyTheme(savedTheme);
        
        const themeSetting = document.getElementById('theme-setting');
        if (themeSetting) {
            themeSetting.value = savedTheme;
        }

        // 設定今天的日期為預設值
        const today = new Date().toISOString().split('T')[0];
        const dateInputs = [
            'baby-birthdate',
            'milestone-date',
            'memory-date'
        ];

        dateInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.value = today;
            }
        });

        // 初始化圖表
        this.initializeChart();
    }

    // 隱藏載入畫面
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 300);
        }
    }

    // 初始化PWA
    initializePWA() {
        // 註冊Service Worker
        if ('serviceWorker' in navigator) {
            const swContent = `
                const CACHE_NAME = 'baby-tracker-v1';
                const urlsToCache = [
                    '/',
                    '/style.css',
                    '/script.js',
                    'https://cdn.jsdelivr.net/npm/chart.js'
                ];

                self.addEventListener('install', event => {
                    event.waitUntil(
                        caches.open(CACHE_NAME)
                            .then(cache => cache.addAll(urlsToCache))
                    );
                });

                self.addEventListener('fetch', event => {
                    event.respondWith(
                        caches.match(event.request)
                            .then(response => {
                                if (response) {
                                    return response;
                                }
                                return fetch(event.request);
                            })
                    );
                });
            `;
            
            navigator.serviceWorker.register(
                URL.createObjectURL(new Blob([swContent], { type: 'application/javascript' }))
            ).catch(error => {
                console.log('Service Worker 註冊失敗:', error);
            });
        }

        // 處理安裝提示
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            const installBtn = document.createElement('button');
            installBtn.textContent = '安裝應用';
            installBtn.className = 'primary-btn';
            installBtn.addEventListener('click', () => {
                e.prompt();
                installBtn.remove();
            });
            const headerActions = document.querySelector('.header-actions');
            if (headerActions) {
                headerActions.appendChild(installBtn);
            }
        });
    }

    // 處理URL參數
    handleURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const quick = urlParams.get('quick');
        const tab = urlParams.get('tab');

        if (quick && this.currentBaby) {
            // 延遲執行以確保UI已載入
            setTimeout(() => {
                this.openRecordModal(quick);
            }, 500);
        }

        if (tab) {
            this.switchTab(tab);
        }
    }

    // 切換頁籤
    switchTab(tabName) {
        // 更新導航狀態
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
        });
        
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
            activeTab.setAttribute('aria-selected', 'true');
        }

        // 切換內容
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const activeContent = document.getElementById(`${tabName}-tab`);
        if (activeContent) {
            activeContent.classList.add('active');
        }

        // 載入對應數據
        switch (tabName) {
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

    // 切換寶寶下拉選單
    toggleBabyDropdown() {
        const dropdown = document.getElementById('baby-dropdown');
        const isOpen = dropdown.classList.contains('show');
        
        dropdown.classList.toggle('show');
        const selectorBtn = document.getElementById('baby-selector-btn');
        if (selectorBtn) {
            selectorBtn.setAttribute('aria-expanded', !isOpen);
        }
    }

    // 載入寶寶列表
    async loadBabies() {
        try {
            const babies = await this.getAllBabies();
            const babyList = document.getElementById('baby-list');
            if (!babyList) return;

            babyList.innerHTML = '';

            if (babies.length === 0) {
                babyList.innerHTML = '<div class="empty-state"><p>尚未新增寶寶</p></div>';
                return;
            }

            babies.forEach(baby => {
                const babyItem = this.createBabyItem(baby);
                babyList.appendChild(babyItem);
            });

            // 自動選擇第一個寶寶或最後使用的寶寶
            const lastBabyId = localStorage.getItem('baby-tracker-current-baby');
            const targetBaby = lastBabyId ? 
                babies.find(b => b.id === parseInt(lastBabyId)) || babies[0] : 
                babies[0];
            
            if (targetBaby) {
                this.selectBaby(targetBaby);
            }
        } catch (error) {
            console.error('載入寶寶列表失敗:', error);
            this.showToast('載入寶寶列表失敗', 'error');
        }
    }

    // 建立寶寶項目元素
    createBabyItem(baby) {
        const item = document.createElement('div');
        item.className = 'baby-item';
        item.addEventListener('click', () => this.selectBaby(baby));

        const avatar = document.createElement('div');
        avatar.className = 'baby-item-avatar';
        
        if (baby.photo) {
            const img = document.createElement('img');
            img.src = baby.photo;
            img.alt = baby.name;
            avatar.appendChild(img);
        } else {
            avatar.textContent = baby.gender === 'female' ? '👧' : '👶';
        }

        const name = document.createElement('div');
        name.className = 'baby-item-name';
        name.textContent = baby.name;

        item.appendChild(avatar);
        item.appendChild(name);

        return item;
    }

    // 選擇寶寶
    selectBaby(baby) {
        this.currentBaby = baby;
        localStorage.setItem('baby-tracker-current-baby', baby.id);

        // 更新UI
        this.updateCurrentBabyDisplay();
        this.toggleBabyDropdown();
        this.loadDashboard();

        this.showToast(`已選擇 ${baby.name}`, 'success');
    }

    // 更新當前寶寶顯示
    updateCurrentBabyDisplay() {
        if (!this.currentBaby) return;

        const baby = this.currentBaby;
        
        // 更新標頭
        const currentBabyName = document.getElementById('current-baby-name');
        if (currentBabyName) {
            currentBabyName.textContent = baby.name;
        }
        
        // 更新寶寶卡片
        const babyDisplayName = document.getElementById('baby-display-name');
        if (babyDisplayName) {
            babyDisplayName.textContent = baby.name;
        }

        const babyAge = document.getElementById('baby-age');
        if (babyAge) {
            babyAge.textContent = this.calculateAge(baby.birthdate);
        }
        
        // 更新照片
        const photoElement = document.getElementById('baby-photo');
        const placeholderElement = document.getElementById('baby-placeholder');
        
        if (baby.photo && photoElement && placeholderElement) {
            photoElement.src = baby.photo;
            photoElement.style.display = 'block';
            placeholderElement.style.display = 'none';
        } else if (photoElement && placeholderElement) {
            photoElement.style.display = 'none';
            placeholderElement.style.display = 'flex';
            placeholderElement.textContent = baby.gender === 'female' ? '👧' : '👶';
        }
        
        // 顯示編輯按鈕
        const editBtn = document.getElementById('edit-baby-btn');
        if (editBtn) {
            editBtn.style.display = 'block';
        }
    }

    // 計算年齡
    calculateAge(birthdate) {
        const birth = new Date(birthdate);
        const now = new Date();
        const diffTime = Math.abs(now - birth);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 30) {
            return `${diffDays} 天`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            const days = diffDays % 30;
            return days > 0 ? `${months} 個月 ${days} 天` : `${months} 個月`;
        } else {
            const years = Math.floor(diffDays / 365);
            const months = Math.floor((diffDays % 365) / 30);
            return months > 0 ? `${years} 歲 ${months} 個月` : `${years} 歲`;
        }
    }

    // 開啟寶寶模態框
    openBabyModal(baby = null) {
        const modal = document.getElementById('baby-modal');
        const title = document.getElementById('baby-modal-title');
        const form = document.getElementById('baby-form');
        
        if (!modal || !title || !form) return;
        
        if (baby) {
            title.textContent = '編輯寶寶資料';
            this.populateBabyForm(baby);
            form.dataset.editId = baby.id;
        } else {
            title.textContent = '新增寶寶';
            form.reset();
            this.resetPhotoPreview();
            delete form.dataset.editId;
        }
        
        this.showModal(modal);
    }

    // 填入寶寶表單
    populateBabyForm(baby) {
        const fields = [
            { id: 'baby-name', value: baby.name || '' },
            { id: 'baby-gender', value: baby.gender || '' },
            { id: 'baby-birthdate', value: baby.birthdate || '' },
            { id: 'baby-notes', value: baby.notes || '' }
        ];

        fields.forEach(field => {
            const element = document.getElementById(field.id);
            if (element) {
                element.value = field.value;
            }
        });
        
        if (baby.photo) {
            const preview = document.getElementById('photo-preview');
            if (preview) {
                preview.innerHTML = `<img src="${baby.photo}" alt="寶寶照片">`;
            }
        }
    }

    // 重置照片預覽
    resetPhotoPreview() {
        const preview = document.getElementById('photo-preview');
        if (preview) {
            preview.innerHTML = '<span class="photo-placeholder">👶</span>';
        }
    }

    // 處理照片上傳
    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // 檔案大小檢查 (最大 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showToast('照片檔案過大，請選擇小於 5MB 的照片', 'error');
            return;
        }

        // 檔案類型檢查
        if (!file.type.startsWith('image/')) {
            this.showToast('請選擇有效的圖片檔案', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('photo-preview');
            if (preview) {
                preview.innerHTML = `<img src="${e.target.result}" alt="寶寶照片">`;
            }
        };
        reader.readAsDataURL(file);
    }

    // 儲存寶寶
    async saveBaby(event) {
        event.preventDefault();
        
        try {
            const form = event.target;
            const formData = new FormData(form);
            
            const baby = {
                name: formData.get('baby-name') || document.getElementById('baby-name').value,
                gender: formData.get('baby-gender') || document.getElementById('baby-gender').value,
                birthdate: formData.get('baby-birthdate') || document.getElementById('baby-birthdate').value,
                notes: formData.get('baby-notes') || document.getElementById('baby-notes').value,
                createdAt: new Date().toISOString()
            };

            // 驗證必填欄位
            if (!baby.name || !baby.birthdate) {
                this.showToast('請填寫必填欄位', 'error');
                return;
            }

            // 處理照片
            const photoPreview = document.querySelector('#photo-preview img');
            if (photoPreview) {
                baby.photo = photoPreview.src;
            }

            // 如果是編輯模式，保留ID
            if (form.dataset.editId) {
                baby.id = parseInt(form.dataset.editId);
            }

            await this.saveBabyToDb(baby);
            
            this.closeModal(document.getElementById('baby-modal'));
            await this.loadBabies();
            this.showToast('寶寶資料已儲存', 'success');
        } catch (error) {
            console.error('儲存寶寶失敗:', error);
            this.showToast('儲存失敗，請重試', 'error');
        }
    }

    // 開啟記錄模態框
    openRecordModal(category) {
        const modal = document.getElementById('record-modal');
        const title = document.getElementById('record-modal-title');
        const body = document.getElementById('record-modal-body');

        if (!modal || !title || !body) return;

        if (!this.currentBaby) {
            this.showToast('請先選擇寶寶', 'warning');
            return;
        }

        title.textContent = this.getRecordTitle(category);
        body.innerHTML = this.getRecordForm(category);
        
        // 設定當前時間為預設值
        const timeInput = body.querySelector('input[type="datetime-local"]');
        if (timeInput) {
            timeInput.value = this.getCurrentDateTime();
        }

        this.showModal(modal);
        modal.dataset.category = category;
    }

    // 取得記錄標題
    getRecordTitle(category) {
        const titles = {
            feeding: '餵食記錄',
            sleep: '睡眠記錄',
            diaper: '排泄記錄',
            growth: '成長記錄',
            health: '健康記錄',
            activity: '活動記錄',
            mood: '情緒記錄',
            note: '自由記錄'
        };
        return titles[category] || '新增記錄';
    }

    // 產生記錄表單
    getRecordForm(category) {
        const commonFields = `
            <div class="form-group">
                <label for="record-datetime">時間 *</label>
                <input type="datetime-local" id="record-datetime" required>
            </div>
        `;

        const forms = {
            feeding: `
                ${commonFields}
                <div class="form-group">
                    <label for="feeding-type">餵食類型 *</label>
                    <select id="feeding-type" required>
                        <option value="">選擇類型</option>
                        <option value="breast">母乳</option>
                        <option value="formula">配方奶</option>
                        <option value="solids">副食品</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="feeding-amount">份量</label>
                    <input type="number" id="feeding-amount" placeholder="ml 或 g">
                </div>
                <div class="form-group">
                    <label for="feeding-duration">持續時間（分鐘）</label>
                    <input type="number" id="feeding-duration" min="1">
                </div>
                <div class="form-group">
                    <label for="feeding-notes">備註</label>
                    <textarea id="feeding-notes" rows="3"></textarea>
                </div>
            `,
            sleep: `
                ${commonFields}
                <div class="form-group">
                    <label for="sleep-type">睡眠類型 *</label>
                    <select id="sleep-type" required>
                        <option value="">選擇類型</option>
                        <option value="night">夜間睡眠</option>
                        <option value="nap">白天小睡</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="sleep-duration">持續時間（分鐘）</label>
                    <input type="number" id="sleep-duration" min="1">
                </div>
                <div class="form-group">
                    <label for="sleep-quality">睡眠品質</label>
                    <select id="sleep-quality">
                        <option value="">選擇品質</option>
                        <option value="excellent">非常好</option>
                        <option value="good">良好</option>
                        <option value="fair">普通</option>
                        <option value="poor">不佳</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="sleep-notes">備註</label>
                    <textarea id="sleep-notes" rows="3"></textarea>
                </div>
            `,
            diaper: `
                ${commonFields}
                <div class="form-group">
                    <label for="diaper-type">類型 *</label>
                    <select id="diaper-type" required>
                        <option value="">選擇類型</option>
                        <option value="wet">尿濕</option>
                        <option value="soiled">排便</option>
                        <option value="both">兩者都有</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="diaper-notes">備註</label>
                    <textarea id="diaper-notes" rows="3"></textarea>
                </div>
            `,
            growth: `
                ${commonFields}
                <div class="form-group">
                    <label for="growth-weight">體重（公斤）</label>
                    <input type="number" id="growth-weight" step="0.1" min="0">
                </div>
                <div class="form-group">
                    <label for="growth-height">身高（公分）</label>
                    <input type="number" id="growth-height" step="0.1" min="0">
                </div>
                <div class="form-group">
                    <label for="growth-head">頭圍（公分）</label>
                    <input type="number" id="growth-head" step="0.1" min="0">
                </div>
                <div class="form-group">
                    <label for="growth-notes">備註</label>
                    <textarea id="growth-notes" rows="3"></textarea>
                </div>
            `,
            health: `
                ${commonFields}
                <div class="form-group">
                    <label for="health-type">健康類型 *</label>
                    <select id="health-type" required>
                        <option value="">選擇類型</option>
                        <option value="temperature">體溫</option>
                        <option value="medicine">用藥</option>
                        <option value="symptoms">症狀</option>
                        <option value="checkup">健檢</option>
                        <option value="vaccine">疫苗</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="health-value">數值/描述</label>
                    <input type="text" id="health-value" placeholder="例如：37.5°C 或 症狀描述">
                </div>
                <div class="form-group">
                    <label for="health-notes">詳細記錄</label>
                    <textarea id="health-notes" rows="3"></textarea>
                </div>
            `,
            activity: `
                ${commonFields}
                <div class="form-group">
                    <label for="activity-type">活動類型 *</label>
                    <select id="activity-type" required>
                        <option value="">選擇類型</option>
                        <option value="tummy">趴睡練習</option>
                        <option value="play">遊戲時間</option>
                        <option value="reading">親子共讀</option>
                        <option value="music">音樂互動</option>
                        <option value="walk">散步/外出</option>
                        <option value="massage">按摩</option>
                        <option value="bath">洗澡</option>
                        <option value="other">其他</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="activity-duration">持續時間（分鐘）</label>
                    <input type="number" id="activity-duration" min="1">
                </div>
                <div class="form-group">
                    <label for="activity-notes">活動描述</label>
                    <textarea id="activity-notes" rows="3"></textarea>
                </div>
            `,
            mood: `
                ${commonFields}
                <div class="form-group">
                    <label for="mood-emotion">情緒狀態 *</label>
                    <select id="mood-emotion" required>
                        <option value="">選擇情緒</option>
                        <option value="happy">😊 開心愉悅</option>
                        <option value="calm">😌 平靜滿足</option>
                        <option value="excited">🤩 興奮好奇</option>
                        <option value="fussy">😕 不安焦慮</option>
                        <option value="cranky">😣 煩躁易怒</option>
                        <option value="crying">😭 大哭不適</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="mood-behavior">行為狀態</label>
                    <select id="mood-behavior">
                        <option value="">選擇行為</option>
                        <option value="sleeping">😴 睡眠狀態</option>
                        <option value="feeding">🍼 進食狀態</option>
                        <option value="alert">🎯 專注狀態</option>
                        <option value="exploring">🔍 探索狀態</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="mood-notes">情況描述</label>
                    <textarea id="mood-notes" rows="3" placeholder="記錄當時的情況和可能的原因..."></textarea>
                </div>
            `,
            note: `
                ${commonFields}
                <div class="form-group">
                    <label for="note-title">標題 *</label>
                    <input type="text" id="note-title" required placeholder="為這個記錄取個標題">
                </div>
                <div class="form-group">
                    <label for="note-content">內容 *</label>
                    <textarea id="note-content" rows="5" required placeholder="記錄任何想要保存的時刻..."></textarea>
                </div>
                <div class="form-group">
                    <label for="note-tags">標籤（用逗號分隔）</label>
                    <input type="text" id="note-tags" placeholder="例如：第一次,可愛,特別">
                </div>
            `
        };

        // 為所有表單添加照片上傳欄位
        const photoField = `
            <div class="form-group">
                <label for="record-photo">照片</label>
                <input type="file" id="record-photo" accept="image/*">
            </div>
        `;

        return (forms[category] || forms.note) + photoField;
    }

    // 取得當前日期時間
    getCurrentDateTime() {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localTime = new Date(now.getTime() - offset);
        return localTime.toISOString().slice(0, 16);
    }

    // 儲存記錄
    async saveRecord() {
        try {
            const modal = document.getElementById('record-modal');
            const category = modal.dataset.category;
            const datetimeInput = document.getElementById('record-datetime');
            const datetime = datetimeInput ? datetimeInput.value : null;

            if (!datetime) {
                this.showToast('請選擇時間', 'error');
                return;
            }

            const record = {
                babyId: this.currentBaby.id,
                type: category,
                datetime: datetime,
                data: this.extractRecordData(category),
                createdAt: new Date().toISOString()
            };

            // 處理照片
            const photoInput = document.getElementById('record-photo');
            if (photoInput && photoInput.files[0]) {
                record.photo = await this.convertFileToBase64(photoInput.files[0]);
            }

            await this.saveRecordToDb(record);
            
            this.closeModal(modal);
            this.loadDashboard();
            this.showToast('記錄已儲存', 'success');
        } catch (error) {
            console.error('儲存記錄失敗:', error);
            this.showToast('儲存失敗，請重試', 'error');
        }
    }

    // 提取記錄數據
    extractRecordData(category) {
        const data = {};
        
        // 根據記錄類型提取不同的數據
        switch (category) {
            case 'feeding':
                data.type = this.getElementValue('feeding-type');
                data.amount = this.getElementValue('feeding-amount');
                data.duration = this.getElementValue('feeding-duration');
                data.notes = this.getElementValue('feeding-notes');
                break;
            case 'sleep':
                data.type = this.getElementValue('sleep-type');
                data.duration = this.getElementValue('sleep-duration');
                data.quality = this.getElementValue('sleep-quality');
                data.notes = this.getElementValue('sleep-notes');
                break;
            case 'diaper':
                data.type = this.getElementValue('diaper-type');
                data.notes = this.getElementValue('diaper-notes');
                break;
            case 'growth':
                data.weight = this.getElementValue('growth-weight');
                data.height = this.getElementValue('growth-height');
                data.head = this.getElementValue('growth-head');
                data.notes = this.getElementValue('growth-notes');
                break;
            case 'health':
                data.type = this.getElementValue('health-type');
                data.value = this.getElementValue('health-value');
                data.notes = this.getElementValue('health-notes');
                break;
            case 'activity':
                data.type = this.getElementValue('activity-type');
                data.duration = this.getElementValue('activity-duration');
                data.notes = this.getElementValue('activity-notes');
                break;
            case 'mood':
                data.emotion = this.getElementValue('mood-emotion');
                data.behavior = this.getElementValue('mood-behavior');
                data.notes = this.getElementValue('mood-notes');
                break;
            case 'note':
                data.title = this.getElementValue('note-title');
                data.content = this.getElementValue('note-content');
                data.tags = this.getElementValue('note-tags').split(',').map(t => t.trim()).filter(t => t);
                break;
        }

        return data;
    }

    // 取得元素值的輔助方法
    getElementValue(id) {
        const element = document.getElementById(id);
        return element ? element.value : '';
    }

    // 載入儀表板
    async loadDashboard() {
        if (!this.currentBaby) {
            this.showEmptyDashboard();
            return;
        }

        try {
            await this.loadQuickStats();
            await this.loadRecentRecords();
            this.updateChart();
        } catch (error) {
            console.error('載入儀表板失敗:', error);
            this.showToast('載入儀表板失敗', 'error');
        }
    }

    // 顯示空的儀表板
    showEmptyDashboard() {
        const stats = [
            { id: 'today-feeds', value: '0' },
            { id: 'today-sleep', value: '0h' },
            { id: 'today-diapers', value: '0' },
            { id: 'today-activities', value: '0' }
        ];

        stats.forEach(stat => {
            const element = document.getElementById(stat.id);
            if (element) {
                element.textContent = stat.value;
            }
        });
        
        const recentList = document.getElementById('recent-list');
        if (recentList) {
            recentList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <p>尚無記錄</p>
                    <button class="start-recording-btn" onclick="document.getElementById('quick-action-btn').click()">開始記錄</button>
                </div>
            `;
        }
    }

    // 載入快速統計
    async loadQuickStats() {
        const today = new Date().toISOString().split('T')[0];
        const records = await this.getRecordsByBabyAndDate(this.currentBaby.id, today);

        const stats = {
            feeds: records.filter(r => r.type === 'feeding').length,
            sleep: this.calculateTotalSleep(records.filter(r => r.type === 'sleep')),
            diapers: records.filter(r => r.type === 'diaper').length,
            activities: records.filter(r => r.type === 'activity').length
        };

        // 更新統計顯示
        const statElements = [
            { id: 'today-feeds', value: stats.feeds },
            { id: 'today-sleep', value: stats.sleep },
            { id: 'today-diapers', value: stats.diapers },
            { id: 'today-activities', value: stats.activities }
        ];

        statElements.forEach(stat => {
            const element = document.getElementById(stat.id);
            if (element) {
                element.textContent = stat.value;
            }
        });
    }

    // 計算總睡眠時間
    calculateTotalSleep(sleepRecords) {
        let totalMinutes = 0;
        sleepRecords.forEach(record => {
            if (record.data.duration) {
                totalMinutes += parseInt(record.data.duration);
            }
        });
        
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        if (hours === 0) {
            return `${minutes}m`;
        } else if (minutes === 0) {
            return `${hours}h`;
        } else {
            return `${hours}h ${minutes}m`;
        }
    }

    // 載入最近記錄
    async loadRecentRecords() {
        const records = await this.getRecentRecords(this.currentBaby.id, 10);
        const recentList = document.getElementById('recent-list');

        if (!recentList) return;

        if (records.length === 0) {
            recentList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <p>尚無記錄</p>
                    <button class="start-recording-btn" onclick="document.getElementById('quick-action-btn').click()">開始記錄</button>
                </div>
            `;
            return;
        }

        recentList.innerHTML = records.map(record => this.createRecentRecordItem(record)).join('');
    }

    // 建立最近記錄項目
    createRecentRecordItem(record) {
        const icons = {
            feeding: '🍼',
            sleep: '😴',
            diaper: '👶',
            growth: '📏',
            health: '🏥',
            activity: '🎈',
            mood: '😊',
            note: '💭'
        };

        const time = new Date(record.datetime).toLocaleString('zh-TW', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        let description = this.getRecordDescription(record);

        return `
            <div class="recent-item">
                <div class="recent-item-icon">${icons[record.type] || '📝'}</div>
                <div class="recent-item-content">
                    <div class="recent-item-title">${this.getRecordTitle(record.type)}</div>
                    <div class="recent-item-meta">${description}</div>
                </div>
                <div class="recent-item-time">${time}</div>
            </div>
        `;
    }

    // 取得記錄描述
    getRecordDescription(record) {
        const data = record.data;
        
        switch (record.type) {
            case 'feeding':
                let desc = data.type ? this.getFeedingTypeLabel(data.type) : '';
                if (data.amount) desc += ` ${data.amount}ml`;
                if (data.duration) desc += ` (${data.duration}分鐘)`;
                return desc;
            case 'sleep':
                return data.duration ? `${data.duration} 分鐘` : '睡眠記錄';
            case 'diaper':
                return this.getDiaperTypeLabel(data.type);
            case 'growth':
                let growth = [];
                if (data.weight) growth.push(`體重 ${data.weight}kg`);
                if (data.height) growth.push(`身高 ${data.height}cm`);
                return growth.join(', ') || '成長記錄';
            case 'health':
                return data.value || this.getHealthTypeLabel(data.type);
            case 'activity':
                return this.getActivityTypeLabel(data.type);
            case 'mood':
                return this.getMoodLabel(data.emotion);
            case 'note':
                return data.title || '記錄';
            default:
                return '記錄';
        }
    }

    // 取得餵食類型標籤
    getFeedingTypeLabel(type) {
        const labels = {
            breast: '母乳',
            formula: '配方奶',
            solids: '副食品'
        };
        return labels[type] || type;
    }

    // 取得尿布類型標籤
    getDiaperTypeLabel(type) {
        const labels = {
            wet: '尿濕',
            soiled: '排便',
            both: '尿濕+排便'
        };
        return labels[type] || type;
    }

    // 取得健康類型標籤
    getHealthTypeLabel(type) {
        const labels = {
            temperature: '體溫測量',
            medicine: '用藥記錄',
            symptoms: '症狀記錄',
            checkup: '健康檢查',
            vaccine: '疫苗接種'
        };
        return labels[type] || type;
    }

    // 取得活動類型標籤
    getActivityTypeLabel(type) {
        const labels = {
            tummy: '趴睡練習',
            play: '遊戲時間',
            reading: '親子共讀',
            music: '音樂互動',
            walk: '散步/外出',
            massage: '按摩',
            bath: '洗澡',
            other: '其他活動'
        };
        return labels[type] || type;
    }

    // 取得情緒標籤
    getMoodLabel(emotion) {
        const labels = {
            happy: '😊 開心愉悅',
            calm: '😌 平靜滿足',
            excited: '🤩 興奮好奇',
            fussy: '😕 不安焦慮',
            cranky: '😣 煩躁易怒',
            crying: '😭 大哭不適'
        };
        return labels[emotion] || emotion;
    }

    // 初始化圖表
    initializeChart() {
        const ctx = document.getElementById('trendChart');
        if (!ctx) return;

        this.chart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // 切換圖表
    switchChart(chartType) {
        // 更新按鈕狀態
        document.querySelectorAll('.chart-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const activeTab = document.querySelector(`[data-chart="${chartType}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // 更新圖表數據
        this.updateChart(chartType);
    }

    // 更新圖表
    async updateChart(chartType = 'feeding') {
        if (!this.currentBaby || !this.chart) return;

        try {
            const data = await this.getChartData(chartType);
            this.chart.data = data;
            this.chart.update();
        } catch (error) {
            console.error('更新圖表失敗:', error);
        }
    }

    // 取得圖表數據
    async getChartData(chartType) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 7); // 最近7天

        const records = await this.getRecordsByDateRange(this.currentBaby.id, startDate, endDate);

        switch (chartType) {
            case 'feeding':
                return this.getFeedingChartData(records);
            case 'sleep':
                return this.getSleepChartData(records);
            case 'growth':
                return this.getGrowthChartData(records);
            default:
                return { labels: [], datasets: [] };
        }
    }

    // 取得餵食圖表數據
    getFeedingChartData(records) {
        const feedingRecords = records.filter(r => r.type === 'feeding');
        const dailyData = this.groupRecordsByDay(feedingRecords);
        
        const labels = Object.keys(dailyData).sort();
        const breastData = [];
        const formulaData = [];
        const solidsData = [];

        labels.forEach(date => {
            const dayRecords = dailyData[date];
            breastData.push(dayRecords.filter(r => r.data.type === 'breast').length);
            formulaData.push(dayRecords.filter(r => r.data.type === 'formula').length);
            solidsData.push(dayRecords.filter(r => r.data.type === 'solids').length);
        });

        return {
            labels: labels.map(date => new Date(date).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })),
            datasets: [
                {
                    label: '母乳',
                    data: breastData,
                    borderColor: '#FF8A7A',
                    backgroundColor: 'rgba(255, 138, 122, 0.1)',
                },
                {
                    label: '配方奶',
                    data: formulaData,
                    borderColor: '#7FB3D3',
                    backgroundColor: 'rgba(127, 179, 211, 0.1)',
                },
                {
                    label: '副食品',
                    data: solidsData,
                    borderColor: '#FFD93D',
                    backgroundColor: 'rgba(255, 217, 61, 0.1)',
                }
            ]
        };
    }

    // 取得睡眠圖表數據
    getSleepChartData(records) {
        const sleepRecords = records.filter(r => r.type === 'sleep');
        const dailyData = this.groupRecordsByDay(sleepRecords);
        
        const labels = Object.keys(dailyData).sort();
        const sleepData = [];

        labels.forEach(date => {
            const dayRecords = dailyData[date];
            const totalMinutes = dayRecords.reduce((sum, record) => {
                return sum + (parseInt(record.data.duration) || 0);
            }, 0);
            sleepData.push(totalMinutes / 60); // 轉換為小時
        });

        return {
            labels: labels.map(date => new Date(date).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })),
            datasets: [
                {
                    label: '睡眠時間 (小時)',
                    data: sleepData,
                    borderColor: '#7FB3D3',
                    backgroundColor: 'rgba(127, 179, 211, 0.1)',
                    fill: true
                }
            ]
        };
    }

    // 取得成長圖表數據
    getGrowthChartData(records) {
        const growthRecords = records.filter(r => r.type === 'growth' && (r.data.weight || r.data.height))
                                    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
        
        const labels = [];
        const weightData = [];
        const heightData = [];

        growthRecords.forEach(record => {
            const date = new Date(record.datetime).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
            labels.push(date);
            weightData.push(parseFloat(record.data.weight) || null);
            heightData.push(parseFloat(record.data.height) || null);
        });

        return {
            labels,
            datasets: [
                {
                    label: '體重 (kg)',
                    data: weightData,
                    borderColor: '#FF8A7A',
                    backgroundColor: 'rgba(255, 138, 122, 0.1)',
                    yAxisID: 'y',
                },
                {
                    label: '身高 (cm)',
                    data: heightData,
                    borderColor: '#FFD93D',
                    backgroundColor: 'rgba(255, 217, 61, 0.1)',
                    yAxisID: 'y1',
                }
            ]
        };
    }

    // 按日期分組記錄
    groupRecordsByDay(records) {
        return records.reduce((groups, record) => {
            const date = record.datetime.split('T')[0];
            if (!groups[date]) groups[date] = [];
            groups[date].push(record);
            return groups;
        }, {});
    }

    // 載入里程碑
    async loadMilestones(category = 'all') {
        if (!this.currentBaby) return;

        try {
            const milestones = await this.getMilestonesByBaby(this.currentBaby.id, category);
            const timeline = document.getElementById('milestone-timeline');

            if (!timeline) return;

            if (milestones.length === 0) {
                timeline.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🌟</div>
                        <p>尚未記錄里程碑</p>
                        <button class="add-milestone-btn" onclick="document.getElementById('add-milestone-btn').click()">開始記錄</button>
                    </div>
                `;
                return;
            }

            timeline.innerHTML = milestones.map(milestone => this.createMilestoneItem(milestone)).join('');
        } catch (error) {
            console.error('載入里程碑失敗:', error);
            this.showToast('載入里程碑失敗', 'error');
        }
    }

    // 建立里程碑項目
    createMilestoneItem(milestone) {
        const categoryIcons = {
            motor: '🏃',
            fine: '✋',
            language: '💬',
            cognitive: '🧠',
            social: '👥',
            custom: '⭐'
        };

        const date = new Date(milestone.date).toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return `
            <div class="milestone-item">
                <div class="milestone-icon">${categoryIcons[milestone.category] || '⭐'}</div>
                <div class="milestone-content">
                    <div class="milestone-title">${milestone.title}</div>
                    <div class="milestone-date">${date}</div>
                    ${milestone.description ? `<div class="milestone-description">${milestone.description}</div>` : ''}
                </div>
            </div>
        `;
    }

    // 篩選里程碑
    filterMilestones(category) {
        // 更新按鈕狀態
        document.querySelectorAll('.milestone-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const activeTab = document.querySelector(`[data-category="${category}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // 載入對應分類
        this.loadMilestones(category);
    }

    // 開啟里程碑模態框
    openMilestoneModal() {
        if (!this.currentBaby) {
            this.showToast('請先選擇寶寶', 'warning');
            return;
        }

        const modal = document.getElementById('milestone-modal');
        const form = document.getElementById('milestone-form');
        if (form) {
            form.reset();
        }
        
        const dateInput = document.getElementById('milestone-date');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
        
        this.showModal(modal);
    }

    // 儲存里程碑
    async saveMilestone(event) {
        event.preventDefault();

        try {
            const form = event.target;
            const formData = new FormData(form);
            
            const milestone = {
                babyId: this.currentBaby.id,
                category: formData.get('milestone-category') || this.getElementValue('milestone-category'),
                title: formData.get('milestone-title') || this.getElementValue('milestone-title'),
                date: formData.get('milestone-date') || this.getElementValue('milestone-date'),
                description: formData.get('milestone-description') || this.getElementValue('milestone-description'),
                createdAt: new Date().toISOString()
            };

            // 驗證必填欄位
            if (!milestone.category || !milestone.title || !milestone.date) {
                this.showToast('請填寫必填欄位', 'error');
                return;
            }

            // 處理照片
            const photoInput = document.getElementById('milestone-photo');
            if (photoInput && photoInput.files[0]) {
                milestone.photo = await this.convertFileToBase64(photoInput.files[0]);
            }

            await this.saveMilestoneToDb(milestone);
            
            this.closeModal(document.getElementById('milestone-modal'));
            this.loadMilestones();
            this.showToast('里程碑已記錄', 'success');
        } catch (error) {
            console.error('儲存里程碑失敗:', error);
            this.showToast('儲存失敗，請重試', 'error');
        }
    }

    // 載入記憶
    async loadMemories(filter = 'all') {
        if (!this.currentBaby) return;

        try {
            const memories = await this.getMemoriesByBaby(this.currentBaby.id, filter);
            const grid = document.getElementById('memories-grid');

            if (!grid) return;

            if (memories.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📚</div>
                        <p>還沒有記憶</p>
                        <button class="add-memory-btn" onclick="document.getElementById('add-memory-btn').click()">建立第一個記憶</button>
                    </div>
                `;
                return;
            }

            grid.innerHTML = memories.map(memory => this.createMemoryCard(memory)).join('');
        } catch (error) {
            console.error('載入記憶失敗:', error);
            this.showToast('載入記憶失敗', 'error');
        }
    }

    // 建立記憶卡片
    createMemoryCard(memory) {
        const typeLabels = {
            highlights: '每日亮點',
            stories: '成長故事',
            photos: '照片日記',
            quotes: '語錄收集'
        };

        const date = memory.date ? 
            new Date(memory.date).toLocaleDateString('zh-TW') : 
            new Date(memory.createdAt).toLocaleDateString('zh-TW');

        const photoHtml = memory.photos && memory.photos.length > 0 ? 
            `<img src="${memory.photos[0]}" alt="${memory.title}" class="memory-photo">` : '';

        return `
            <div class="memory-card">
                ${photoHtml}
                <div class="memory-content">
                    <div class="memory-type">${typeLabels[memory.type] || memory.type}</div>
                    <div class="memory-title">${memory.title}</div>
                    <div class="memory-text">${memory.content.substring(0, 100)}${memory.content.length > 100 ? '...' : ''}</div>
                    <div class="memory-date">${date}</div>
                </div>
            </div>
        `;
    }

    // 篩選記憶
    filterMemories(filter) {
        // 更新按鈕狀態
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-filter="${filter}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // 載入對應篩選
        this.loadMemories(filter === 'all' ? null : filter);
    }

    // 開啟記憶模態框
    openMemoryModal() {
        if (!this.currentBaby) {
            this.showToast('請先選擇寶寶', 'warning');
            return;
        }

        const modal = document.getElementById('memory-modal');
        const form = document.getElementById('memory-form');
        if (form) {
            form.reset();
        }
        
        const dateInput = document.getElementById('memory-date');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
        
        this.showModal(modal);
    }

    // 儲存記憶
    async saveMemory(event) {
        event.preventDefault();

        try {
            const form = event.target;
            const formData = new FormData(form);
            
            const memory = {
                babyId: this.currentBaby.id,
                type: formData.get('memory-type') || this.getElementValue('memory-type'),
                title: formData.get('memory-title') || this.getElementValue('memory-title'),
                content: formData.get('memory-content') || this.getElementValue('memory-content'),
                date: formData.get('memory-date') || this.getElementValue('memory-date'),
                createdAt: new Date().toISOString()
            };

            // 驗證必填欄位
            if (!memory.type || !memory.title || !memory.content) {
                this.showToast('請填寫必填欄位', 'error');
                return;
            }

            // 處理照片
            const photoInput = document.getElementById('memory-photos');
            if (photoInput && photoInput.files.length > 0) {
                memory.photos = [];
                for (let file of photoInput.files) {
                    const base64 = await this.convertFileToBase64(file);
                    memory.photos.push(base64);
                }
            }

            await this.saveMemoryToDb(memory);
            
            this.closeModal(document.getElementById('memory-modal'));
            this.loadMemories();
            this.showToast('記憶已儲存', 'success');
        } catch (error) {
            console.error('儲存記憶失敗:', error);
            this.showToast('儲存失敗，請重試', 'error');
        }
    }

    // 開啟快速行動
    openQuickActions() {
        if (!this.currentBaby) {
            this.showToast('請先選擇寶寶', 'warning');
            return;
        }

        // 顯示快速行動選單
        const actions = [
            { text: '🍼 餵食', category: 'feeding' },
            { text: '😴 睡眠', category: 'sleep' },
            { text: '👶 換尿布', category: 'diaper' },
            { text: '😊 情緒', category: 'mood' }
        ];

        const menu = document.createElement('div');
        menu.className = 'quick-actions-menu';
        menu.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            padding: 8px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 4px;
        `;
        
        menu.innerHTML = actions.map(action => 
            `<button class="quick-action-item" data-category="${action.category}" style="
                padding: 12px 20px;
                border: none;
                background: #f8f9fa;
                border-radius: 8px;
                cursor: pointer;
                transition: background-color 0.2s;
                white-space: nowrap;
            ">${action.text}</button>`
        ).join('');

        document.body.appendChild(menu);

        // 綁定事件
        menu.querySelectorAll('.quick-action-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.openRecordModal(e.target.dataset.category);
                document.body.removeChild(menu);
            });
            
            // 添加hover效果
            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = '#e9ecef';
            });
            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = '#f8f9fa';
            });
        });

        // 點擊外部關閉
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target) && !document.getElementById('quick-action-btn').contains(e.target)) {
                    if (document.body.contains(menu)) {
                        document.body.removeChild(menu);
                    }
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 0);
    }

    // 開啟設定模態框
    openSettingsModal() {
        const modal = document.getElementById('settings-modal');
        const themeSetting = document.getElementById('theme-setting');
        if (themeSetting) {
            themeSetting.value = localStorage.getItem('baby-tracker-theme') || 'auto';
        }
        this.showModal(modal);
    }

    // 切換主題
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        localStorage.setItem('baby-tracker-theme', newTheme);
    }

    // 應用主題
    applyTheme(theme) {
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = prefersDark ? 'dark' : 'light';
        }
        
        document.documentElement.setAttribute('data-theme', theme);
        
        // 更新主題切換按鈕圖示
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    }

    // 匯出資料
    async exportData() {
        try {
            const data = {
                babies: await this.getAllBabies(),
                records: await this.getAllRecords(),
                milestones: await this.getAllMilestones(),
                memories: await this.getAllMemories(),
                exportDate: new Date().toISOString(),
                version: '1.0'
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `baby-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.showToast('資料匯出成功', 'success');
        } catch (error) {
            console.error('匯出資料失敗:', error);
            this.showToast('匯出失敗，請重試', 'error');
        }
    }

    // 匯入資料
    async importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // 驗證資料格式
            if (!data.babies || !Array.isArray(data.babies)) {
                throw new Error('無效的資料格式');
            }

            // 確認匯入
            const confirmed = await this.showConfirmModal(
                '匯入資料',
                '此操作將覆蓋現有資料，確定要繼續嗎？'
            );

            if (!confirmed) return;

            // 清空現有資料
            await this.clearAllData();

            // 匯入新資料
            for (const baby of data.babies) {
                await this.saveBabyToDb(baby);
            }

            if (data.records) {
                for (const record of data.records) {
                    await this.saveRecordToDb(record);
                }
            }

            if (data.milestones) {
                for (const milestone of data.milestones) {
                    await this.saveMilestoneToDb(milestone);
                }
            }

            if (data.memories) {
                for (const memory of data.memories) {
                    await this.saveMemoryToDb(memory);
                }
            }

            // 重新載入介面
            await this.loadBabies();
            this.loadDashboard();
            
            this.showToast('資料匯入成功', 'success');
        } catch (error) {
            console.error('匯入資料失敗:', error);
            this.showToast('匯入失敗，請檢查檔案格式', 'error');
        }

        // 重置檔案輸入
        event.target.value = '';
    }

    // 顯示模態框
    showModal(modal) {
        if (!modal) return;
        
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        
        // 焦點管理
        const firstFocusable = modal.querySelector('input, textarea, select, button');
        if (firstFocusable) firstFocusable.focus();
    }

    // 關閉模態框
    closeModal(modal) {
        if (!modal) return;
        
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        
        // 返回焦點
        const quickActionBtn = document.getElementById('quick-action-btn');
        if (quickActionBtn) quickActionBtn.focus();
    }

    // 顯示確認模態框
    showConfirmModal(title, message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirm-modal');
            const titleEl = document.getElementById('confirm-modal-title');
            const messageEl = document.getElementById('confirm-modal-message');
            
            if (!modal || !titleEl || !messageEl) {
                resolve(false);
                return;
            }
            
            titleEl.textContent = title;
            messageEl.textContent = message;
            
            const actionBtn = document.getElementById('confirm-modal-action');
            
            // 移除舊的事件監聽器
            const newActionBtn = actionBtn.cloneNode(true);
            actionBtn.parentNode.replaceChild(newActionBtn, actionBtn);
            
            // 添加新的事件監聽器
            newActionBtn.addEventListener('click', () => {
                this.closeModal(modal);
                resolve(true);
            });
            
            // 取消按鈕
            const cancelBtn = modal.querySelector('[data-dismiss="modal"]');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    this.closeModal(modal);
                    resolve(false);
                }, { once: true });
            }
            
            this.showModal(modal);
        });
    }

    // 顯示Toast通知
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="關閉">&times;</button>
        `;

        container.appendChild(toast);
        
        // 顯示Toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // 關閉按鈕
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.removeToast(toast);
        });
        
        // 自動關閉
        setTimeout(() => {
            if (container.contains(toast)) {
                this.removeToast(toast);
            }
        }, 5000);
    }

    // 移除Toast
    removeToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    // 檔案轉Base64
    convertFileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // === 資料庫操作方法 ===

    // 取得所有寶寶
    getAllBabies() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['babies'], 'readonly');
            const store = transaction.objectStore('babies');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 儲存寶寶到資料庫
    saveBabyToDb(baby) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['babies'], 'readwrite');
            const store = transaction.objectStore('babies');
            const request = baby.id ? store.put(baby) : store.add(baby);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 儲存記錄到資料庫
    saveRecordToDb(record) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['records'], 'readwrite');
            const store = transaction.objectStore('records');
            const request = store.add(record);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 取得寶寶的記錄（依日期）
    getRecordsByBabyAndDate(babyId, date) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['records'], 'readonly');
            const store = transaction.objectStore('records');
            const index = store.index('babyId');
            const request = index.getAll(babyId);
            
            request.onsuccess = () => {
                const records = request.result.filter(record => 
                    record.datetime.startsWith(date)
                );
                resolve(records);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // 取得最近記錄
    getRecentRecords(babyId, limit = 10) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['records'], 'readonly');
            const store = transaction.objectStore('records');
            const index = store.index('babyId');
            const request = index.getAll(babyId);
            
            request.onsuccess = () => {
                const records = request.result
                    .sort((a, b) => new Date(b.datetime) - new Date(a.datetime))
                    .slice(0, limit);
                resolve(records);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // 取得日期範圍內的記錄
    getRecordsByDateRange(babyId, startDate, endDate) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['records'], 'readonly');
            const store = transaction.objectStore('records');
            const index = store.index('babyId');
            const request = index.getAll(babyId);
            
            request.onsuccess = () => {
                const records = request.result.filter(record => {
                    const recordDate = new Date(record.datetime);
                    return recordDate >= startDate && recordDate <= endDate;
                });
                resolve(records);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // 儲存里程碑到資料庫
    saveMilestoneToDb(milestone) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['milestones'], 'readwrite');
            const store = transaction.objectStore('milestones');
            const request = store.add(milestone);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 取得寶寶的里程碑
    getMilestonesByBaby(babyId, category = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['milestones'], 'readonly');
            const store = transaction.objectStore('milestones');
            const index = store.index('babyId');
            const request = index.getAll(babyId);
            
            request.onsuccess = () => {
                let milestones = request.result;
                if (category && category !== 'all') {
                    milestones = milestones.filter(m => m.category === category);
                }
                milestones.sort((a, b) => new Date(b.date) - new Date(a.date));
                resolve(milestones);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // 儲存記憶到資料庫
    saveMemoryToDb(memory) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['memories'], 'readwrite');
            const store = transaction.objectStore('memories');
            const request = store.add(memory);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 取得寶寶的記憶
    getMemoriesByBaby(babyId, type = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['memories'], 'readonly');
            const store = transaction.objectStore('memories');
            const index = store.index('babyId');
            const request = index.getAll(babyId);
            
            request.onsuccess = () => {
                let memories = request.result;
                if (type) {
                    memories = memories.filter(m => m.type === type);
                }
                memories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                resolve(memories);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // 取得所有記錄
    getAllRecords() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['records'], 'readonly');
            const store = transaction.objectStore('records');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 取得所有里程碑
    getAllMilestones() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['milestones'], 'readonly');
            const store = transaction.objectStore('milestones');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 取得所有記憶
    getAllMemories() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['memories'], 'readonly');
            const store = transaction.objectStore('memories');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 清空所有資料
    async clearAllData() {
        const stores = ['babies', 'records', 'milestones', 'memories'];
        
        for (const storeName of stores) {
            await new Promise((resolve, reject) => {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.clear();
                
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
    }
}

// === 應用程式入口點 ===
document.addEventListener('DOMContentLoaded', () => {
    window.babyTracker = new BabyTracker();
});

// 監聽系統顏色主題變化
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (localStorage.getItem('baby-tracker-theme') === 'auto') {
            document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
    });
}