// script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 元素 ---
    const app = document.getElementById('app');
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const themeToggle = document.getElementById('themeToggle');
    const quickRecordBtn = document.getElementById('quickRecordBtn');
    const quickRecordDrawer = document.getElementById('quickRecordDrawer');
    const closeQuickRecordDrawerBtn = document.getElementById('closeQuickRecord');
    const mainContent = document.getElementById('mainContent');
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    const modalContainer = document.getElementById('modalContainer');
    const toastContainer = document.getElementById('toastContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const todayDateEl = document.getElementById('todayDate');
    const babySelect = document.getElementById('babySelect');
    const addBabyBtn = document.getElementById('addBabyBtn'); // 儀表板上的按鈕
    const addBabyBtnPage = document.getElementById('addBabyBtnPage'); // 寶寶檔案頁面上的按鈕
    const currentBabyNameSidebar = document.getElementById('currentBabyName');
    const babiesListPage = document.getElementById('babiesList');

    // 儀表板統計
    const todayFeedingEl = document.getElementById('todayFeeding');
    const todaySleepEl = document.getElementById('todaySleep');
    const todayDiaperEl = document.getElementById('todayDiaper');
    const todayActivityEl = document.getElementById('todayActivity');
    const recentRecordsListEl = document.getElementById('recentRecordsList');

    // 快速操作按鈕 (儀表板)
    const quickActionBtns = document.querySelectorAll('.quick-actions .quick-action-btn');
    // 快速記錄選項 (抽屜)
    const quickRecordOptionsDrawer = document.querySelectorAll('#quickRecordDrawer .quick-option');
    // 快速記錄頁面卡片
    const recordTypeCardsPage = document.querySelectorAll('#recordPage .record-type-card');


    // 睡眠計時器
    const sleepTimerEl = document.getElementById('sleepTimer');
    const timerDisplayEl = document.getElementById('timerDisplay');
    const stopSleepBtn = document.getElementById('stopSleepBtn');
    let sleepTimerInterval;
    let sleepStartTime;

    // 設定頁面
    const darkModeToggle = document.getElementById('darkModeToggle');
    const languageSelect = document.getElementById('languageSelect');
    const exportDataBtn = document.getElementById('exportDataBtn');
    const importDataBtn = document.getElementById('importDataBtn');
    const importFileInput = document.getElementById('importFileInput');
    const clearDataBtn = document.getElementById('clearDataBtn');

    // 照片上傳
    const hiddenFileInput = document.getElementById('hiddenFileInput');
    let currentPhotoUploadCallback = null;

    // 分析圖表
    const mainChartCanvas = document.getElementById('mainChart');
    const analyticsTypeSelect = document.getElementById('analyticsType');
    const analyticsRangeSelect = document.getElementById('analyticsRange');
    const chartTitleEl = document.getElementById('chartTitle');
    const statsContainerEl = document.getElementById('statsContainer');
    let mainChartInstance = null;

    // --- 應用程式狀態 ---
    let state = {
        theme: localStorage.getItem('theme') || 'light',
        babies: JSON.parse(localStorage.getItem('babies')) || [],
        currentBabyId: localStorage.getItem('currentBabyId') || null,
        records: JSON.parse(localStorage.getItem('records')) || {
            feeding: [], sleep: [], diaper: [], activity: [], health: [], mood: []
        },
        milestones: JSON.parse(localStorage.getItem('milestones')) || [],
        memories: JSON.parse(localStorage.getItem('memories')) || [],
        settings: JSON.parse(localStorage.getItem('settings')) || {
            language: 'zh-TW',
            notifications: { feeding: true, sleep: true }
        }
    };

    // --- 初始化 ---
    function init() {
        // 設定主題
        document.documentElement.setAttribute('data-theme', state.theme);
        if (state.theme === 'dark') {
            themeToggle.textContent = '☀️';
            darkModeToggle.checked = true;
        } else {
            themeToggle.textContent = '🌙';
            darkModeToggle.checked = false;
        }

        // 設定今天日期
        if (todayDateEl) {
            const today = new Date();
            todayDateEl.textContent = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
        }

        // 載入寶寶選擇器
        populateBabySelect();
        if (state.currentBabyId) {
            babySelect.value = state.currentBabyId;
            updateCurrentBabyNameSidebar();
        } else if (state.babies.length > 0) {
            state.currentBabyId = state.babies[0].id;
            localStorage.setItem('currentBabyId', state.currentBabyId);
            babySelect.value = state.currentBabyId;
            updateCurrentBabyNameSidebar();
        }


        // 顯示預設頁面 (儀表板)
        navigateToPage(window.location.hash || '#dashboard');

        // 更新儀表板
        updateDashboard();
        // 渲染寶寶列表
        renderBabiesList();

        // 綁定通用事件監聽器
        bindCommonEventListeners();

        // 綁定各頁面新增按鈕事件
        bindAddRecordButtonEvents();

        // 綁定里程碑頁面事件
        bindMilestoneEvents();

        // 綁定記憶寶盒事件
        bindMemoryEvents();

        // 綁定分析頁面事件
        bindAnalyticsEvents();
        renderAnalyticsChart(); // 初始渲染圖表

        // 綁定設定頁面事件
        bindSettingsEvents();

        // 檢查是否有寶寶，若無則提示新增
        if (state.babies.length === 0) {
            showToast('歡迎使用！請先新增一個寶寶檔案。', 'info');
            if (document.getElementById('dashboardPage').classList.contains('active')) {
                 // 如果在儀表板，可以考慮自動彈出新增寶寶模態框
                 // setTimeout(openAddBabyModal, 1000);
            }
        }
    }

    // --- 事件監聽器 ---
    function bindCommonEventListeners() {
        menuBtn.addEventListener('click', toggleSidebar);
        overlay.addEventListener('click', closeSidebarAndDrawer);
        themeToggle.addEventListener('click', toggleTheme);
        quickRecordBtn.addEventListener('click', toggleQuickRecordDrawer);
        closeQuickRecordDrawerBtn.addEventListener('click', toggleQuickRecordDrawer);

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetPageId = link.getAttribute('href');
                navigateToPage(targetPageId);
                if (sidebar.classList.contains('open')) {
                    closeSidebarAndDrawer();
                }
            });
        });

        if (addBabyBtn) addBabyBtn.addEventListener('click', openAddBabyModal);
        if (addBabyBtnPage) addBabyBtnPage.addEventListener('click', openAddBabyModal);

        babySelect.addEventListener('change', (e) => {
            state.currentBabyId = e.target.value;
            localStorage.setItem('currentBabyId', state.currentBabyId);
            updateCurrentBabyNameSidebar();
            updateDashboard(); // 切換寶寶後更新儀表板
            renderAllRecordLists(); // 切換寶寶後更新所有記錄列表
            renderAnalyticsChart(); // 切換寶寶後更新圖表
            showToast(`已切換到寶寶：${getCurrentBaby()?.name || '未知'}`, 'info');
        });

        // 儀表板快速操作按鈕
        quickActionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                openAddRecordModal(type);
            });
        });

        // 快速記錄抽屜選項
        quickRecordOptionsDrawer.forEach(option => {
            option.addEventListener('click', () => {
                const type = option.dataset.type;
                openAddRecordModal(type);
                toggleQuickRecordDrawer(); // 關閉抽屜
            });
        });

        // 快速記錄頁面卡片
        recordTypeCardsPage.forEach(card => {
            card.addEventListener('click', () => {
                const type = card.dataset.type;
                openAddRecordModal(type);
            });
        });

        // 睡眠計時器相關
        const addSleepBtn = document.getElementById('addSleepBtn');
        if (addSleepBtn) {
            // 修改新增睡眠按鈕的行為，使其也作為開始睡眠計時的按鈕
            addSleepBtn.removeEventListener('click', openAddSleepModal); // 移除舊的監聽器
            addSleepBtn.addEventListener('click', () => {
                if (!state.currentBabyId) {
                    showToast('請先選擇或新增一位寶寶！', 'warning');
                    return;
                }
                if (sleepTimerEl.style.display === 'none') {
                    startSleepTimer();
                } else {
                    // 如果計時器已顯示，則打開手動新增模態框
                    openAddRecordModal('sleep');
                }
            });
        }
        if (stopSleepBtn) stopSleepBtn.addEventListener('click', stopSleepTimerAndSave);

         // 處理圖片上傳
        hiddenFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && currentPhotoUploadCallback) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    currentPhotoUploadCallback(e.target.result);
                };
                reader.readAsDataURL(file);
            }
            hiddenFileInput.value = ''; // 重置以便下次選擇同檔案
        });
    }

    function bindAddRecordButtonEvents() {
        const recordTypes = ['feeding', 'diaper', 'activity', 'health', 'mood'];
        recordTypes.forEach(type => {
            const btn = document.getElementById(`add${capitalizeFirstLetter(type)}Btn`);
            if (btn) {
                 // 睡眠按鈕已在 bindCommonEventListeners 中特殊處理
                if (type !== 'sleep') {
                    btn.addEventListener('click', () => openAddRecordModal(type));
                }
            }
        });
    }

    // --- 導航 ---
    function navigateToPage(pageId) {
        pages.forEach(page => {
            page.classList.remove('active');
            if (`#${page.id}` === pageId || (pageId === '#dashboard' && page.id === 'dashboardPage')) {
                page.classList.add('active');
            }
        });
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === pageId) {
                link.classList.add('active');
            }
        });
        window.location.hash = pageId;

        // 特定頁面加載時的操作
        if (pageId === '#babies') renderBabiesList();
        if (pageId === '#feeding') renderRecordList('feeding');
        if (pageId === '#sleep') renderRecordList('sleep');
        if (pageId === '#diaper') renderRecordList('diaper');
        if (pageId === '#activity') renderRecordList('activity');
        if (pageId === '#health') renderRecordList('health');
        if (pageId === '#mood') renderRecordList('mood');
        if (pageId === '#milestones') renderMilestones();
        if (pageId === '#memories') renderMemories();
        if (pageId === '#analytics') renderAnalyticsChart();

    }

    // --- 側邊欄 ---
    function toggleSidebar() {
        sidebar.classList.toggle('open');
        menuBtn.classList.toggle('active');
        overlay.classList.toggle('show', sidebar.classList.contains('open'));
    }

    function closeSidebarAndDrawer() {
        if (sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            menuBtn.classList.remove('active');
            overlay.classList.remove('show');
        }
        if (quickRecordDrawer.classList.contains('open')) {
            quickRecordDrawer.classList.remove('open');
            overlay.classList.remove('show');
        }
    }

    // --- 主題切換 ---
    function toggleTheme() {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', state.theme);
        document.documentElement.setAttribute('data-theme', state.theme);
        if (state.theme === 'dark') {
            themeToggle.textContent = '☀️';
            darkModeToggle.checked = true;
        } else {
            themeToggle.textContent = '🌙';
            darkModeToggle.checked = false;
        }
        // 更新圖表主題
        if (mainChartInstance) {
            renderAnalyticsChart();
        }
    }

    // --- 快速記錄抽屜 ---
    function toggleQuickRecordDrawer() {
        quickRecordDrawer.classList.toggle('open');
        overlay.classList.toggle('show', quickRecordDrawer.classList.contains('open'));
    }

    // --- 模態框 ---
    function openModal(title, contentHtml, footerHtml, onOpen = null) {
        const modalId = `modal-${Date.now()}`;
        const modalHTML = `
            <div class="modal" id="${modalId}">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">${title}</h3>
                        <button class="close-btn" data-dismiss="modal" aria-label="關閉">✕</button>
                    </div>
                    <div class="modal-body">
                        ${contentHtml}
                    </div>
                    ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
                </div>
            </div>
        `;
        modalContainer.innerHTML = modalHTML;
        const modalElement = document.getElementById(modalId);
        
        // 強制重繪以觸發動畫
        // void modalElement.offsetWidth; // 這行有時用於強制重繪，但在此處可能不是必須的

        modalElement.style.display = 'flex'; // 先讓 modal 可見
        // 使用 setTimeout 確保 CSS 過渡生效
        setTimeout(() => {
            modalElement.classList.add('show'); // 假設 .show 控制 opacity 和 transform
            overlay.classList.add('show');
        }, 10);


        modalElement.querySelector('[data-dismiss="modal"]').addEventListener('click', () => closeModal(modalElement));
        overlay.addEventListener('click', () => closeModal(modalElement), { once: true }); // 確保只觸發一次

        if (onOpen && typeof onOpen === 'function') {
            onOpen(modalElement);
        }
        return modalElement;
    }

    function closeModal(modalElement) {
        if (modalElement) {
            modalElement.classList.remove('show'); // 觸發關閉動畫
             // 等待動畫完成後再移除
            setTimeout(() => {
                modalElement.remove();
                if (modalContainer.children.length === 0) { // 如果沒有其他模態框了
                    overlay.classList.remove('show');
                }
            }, 300); // 假設動畫時間為 0.3s (var(--transition-normal))
        } else { // 如果沒有傳入 modalElement，則關閉所有
            const activeModal = modalContainer.querySelector('.modal');
            if (activeModal) {
                activeModal.classList.remove('show');
                setTimeout(() => {
                    activeModal.remove();
                    overlay.classList.remove('show');
                }, 300);
            }
        }
    }

    // --- 提示訊息 (Toast) ---
    function showToast(message, type = 'info', duration = 3000) {
        const toastId = `toast-${Date.now()}`;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.id = toastId;
        toast.innerHTML = `
            ${message}
            <button class="toast-close" data-dismiss="toast" aria-label="關閉">✕</button>
        `;
        toast.style.setProperty('--toast-duration', `${duration}ms`); // 用於進度條動畫

        toastContainer.appendChild(toast);

        toast.querySelector('[data-dismiss="toast"]').addEventListener('click', () => {
            toast.remove();
        });

        setTimeout(() => {
            if (document.getElementById(toastId)) {
                toast.remove();
            }
        }, duration);
    }

    // --- 載入指示器 ---
    function showLoading(show = true) {
        loadingIndicator.classList.toggle('show', show);
    }

    // --- 資料存儲 (封裝 localStorage 操作) ---
    function saveData() {
        localStorage.setItem('theme', state.theme);
        localStorage.setItem('babies', JSON.stringify(state.babies));
        localStorage.setItem('currentBabyId', state.currentBabyId);
        localStorage.setItem('records', JSON.stringify(state.records));
        localStorage.setItem('milestones', JSON.stringify(state.milestones));
        localStorage.setItem('memories', JSON.stringify(state.memories));
        localStorage.setItem('settings', JSON.stringify(state.settings));
    }

    // --- 寶寶管理 ---
    function populateBabySelect() {
        babySelect.innerHTML = '<option value="">選擇寶寶</option>';
        state.babies.forEach(baby => {
            const option = document.createElement('option');
            option.value = baby.id;
            option.textContent = baby.name;
            babySelect.appendChild(option);
        });
        if (state.currentBabyId) {
            babySelect.value = state.currentBabyId;
        }
    }

    function updateCurrentBabyNameSidebar() {
        const currentBaby = getCurrentBaby();
        if (currentBaby) {
            currentBabyNameSidebar.textContent = currentBaby.name;
        } else {
            currentBabyNameSidebar.textContent = '選擇寶寶';
        }
    }

    function getCurrentBaby() {
        return state.babies.find(b => b.id === state.currentBabyId);
    }

    function openAddBabyModal(babyToEdit = null) {
        const isEdit = babyToEdit !== null;
        const title = isEdit ? '編輯寶寶檔案' : '新增寶寶檔案';
        const submitText = isEdit ? '儲存變更' : '新增寶寶';

        let photoPreview = babyToEdit?.photo || 'https://placehold.co/100x100/FFD93D/2D3436?text=👶';

        const content = `
            <form id="addBabyForm">
                <div class="photo-upload" id="babyPhotoUploadArea">
                    <div class="photo-preview" id="babyPhotoPreviewContainer">
                        <img src="${photoPreview}" alt="寶寶照片預覽" id="babyPhotoPreview">
                    </div>
                    <p>點擊此處上傳照片</p>
                </div>
                <input type="hidden" id="babyPhotoDataUrl" value="${babyToEdit?.photo || ''}">
                <div class="form-group">
                    <label for="babyName">寶寶姓名:</label>
                    <input type="text" id="babyName" class="form-control" value="${babyToEdit?.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="babyDob">出生日期:</label>
                    <input type="date" id="babyDob" class="form-control" value="${babyToEdit?.dob || ''}" required>
                </div>
                <div class="form-group">
                    <label for="babyGender">性別:</label>
                    <select id="babyGender" class="form-control">
                        <option value="Male" ${babyToEdit?.gender === 'Male' ? 'selected' : ''}>男孩</option>
                        <option value="Female" ${babyToEdit?.gender === 'Female' ? 'selected' : ''}>女孩</option>
                        <option value="Other" ${babyToEdit?.gender === 'Other' ? 'selected' : ''}>其他</option>
                    </select>
                </div>
            </form>
        `;
        const footer = `<button type="button" class="btn btn-secondary" data-dismiss="modal">取消</button>
                        <button type="submit" form="addBabyForm" class="btn btn-primary">${submitText}</button>`;

        const modalElement = openModal(title, content, footer, (modal) => {
            const form = modal.querySelector('#addBabyForm');
            const photoUploadArea = modal.querySelector('#babyPhotoUploadArea');
            const photoPreviewImg = modal.querySelector('#babyPhotoPreview');
            const babyPhotoDataUrlInput = modal.querySelector('#babyPhotoDataUrl');

            photoUploadArea.addEventListener('click', () => {
                currentPhotoUploadCallback = (dataUrl) => {
                    photoPreviewImg.src = dataUrl;
                    babyPhotoDataUrlInput.value = dataUrl;
                    currentPhotoUploadCallback = null; // 重置回調
                };
                hiddenFileInput.click(); // 觸發隱藏的文件輸入
            });

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = modal.querySelector('#babyName').value.trim();
                const dob = modal.querySelector('#babyDob').value;
                const gender = modal.querySelector('#babyGender').value;
                const photo = babyPhotoDataUrlInput.value || photoPreviewImg.src; // 如果沒有新上傳，則使用預覽中的

                if (!name || !dob) {
                    showToast('請填寫寶寶姓名和出生日期！', 'error');
                    return;
                }

                if (isEdit) {
                    babyToEdit.name = name;
                    babyToEdit.dob = dob;
                    babyToEdit.gender = gender;
                    babyToEdit.photo = photo;
                } else {
                    const newBaby = {
                        id: generateUUID(),
                        name,
                        dob,
                        gender,
                        photo: photo || 'https://placehold.co/100x100/FFD93D/2D3436?text=👶'
                    };
                    state.babies.push(newBaby);
                    state.currentBabyId = newBaby.id; // 新增後自動選中
                    localStorage.setItem('currentBabyId', state.currentBabyId);
                }

                saveData();
                populateBabySelect();
                updateCurrentBabyNameSidebar();
                renderBabiesList();
                closeModal(modalElement);
                showToast(isEdit ? '寶寶檔案已更新！' : '寶寶檔案已新增！', 'success');
                updateDashboard(); // 更新儀表板，因為寶寶列表可能變化
            });
        });
    }

    function renderBabiesList() {
        if (!babiesListPage) return;
        babiesListPage.innerHTML = '';
        if (state.babies.length === 0) {
            babiesListPage.innerHTML = `<div class="empty-state">
                <span class="icon">👶</span>
                <h3>尚無寶寶檔案</h3>
                <p>點擊「新增寶寶」按鈕來開始記錄吧！</p>
            </div>`;
            return;
        }

        state.babies.forEach(baby => {
            const babyCard = document.createElement('div');
            babyCard.className = 'baby-card';
            babyCard.innerHTML = `
                <div class="baby-photo ${baby.photo ? '' : 'placeholder'}">
                    ${baby.photo ? `<img src="${baby.photo}" alt="${baby.name}">` : '👶'}
                </div>
                <div class="baby-info">
                    <h3>${baby.name}</h3>
                    <p>生日: ${baby.dob}</p>
                    <p>性別: ${translateGender(baby.gender)}</p>
                </div>
                <div class="baby-actions">
                    <button class="btn btn-secondary btn-sm edit-baby-btn" data-id="${baby.id}">編輯</button>
                    <button class="btn btn-danger btn-sm delete-baby-btn" data-id="${baby.id}">刪除</button>
                </div>
            `;
            babiesListPage.appendChild(babyCard);
        });

        // 綁定編輯和刪除按鈕事件
        babiesListPage.querySelectorAll('.edit-baby-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const babyId = e.target.dataset.id;
                const babyToEdit = state.babies.find(b => b.id === babyId);
                if (babyToEdit) {
                    openAddBabyModal(babyToEdit);
                }
            });
        });

        babiesListPage.querySelectorAll('.delete-baby-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const babyId = e.target.dataset.id;
                // 確認刪除模態框
                openConfirmationModal('確認刪除', `您確定要刪除此寶寶 (${state.babies.find(b=>b.id === babyId)?.name}) 的所有相關資料嗎？此操作無法復原。`, () => {
                    deleteBaby(babyId);
                });
            });
        });
    }
    
    function deleteBaby(babyId) {
        state.babies = state.babies.filter(b => b.id !== babyId);
        // 同時刪除該寶寶的所有相關記錄
        for (const type in state.records) {
            state.records[type] = state.records[type].filter(r => r.babyId !== babyId);
        }
        state.milestones = state.milestones.filter(m => m.babyId !== babyId);
        state.memories = state.memories.filter(m => m.babyId !== babyId);

        if (state.currentBabyId === babyId) {
            state.currentBabyId = state.babies.length > 0 ? state.babies[0].id : null;
            localStorage.setItem('currentBabyId', state.currentBabyId);
        }
        saveData();
        populateBabySelect();
        updateCurrentBabyNameSidebar();
        renderBabiesList();
        updateDashboard();
        renderAllRecordLists();
        showToast('寶寶檔案及相關記錄已刪除。', 'success');
    }


    // --- 記錄管理 ---
    function openAddRecordModal(type, recordToEdit = null) {
        if (!state.currentBabyId) {
            showToast('請先選擇或新增一位寶寶！', 'warning');
            // 可以考慮跳轉到寶寶選擇或新增寶寶的流程
            // navigateToPage('#babies');
            // openAddBabyModal();
            return;
        }

        const isEdit = recordToEdit !== null;
        const babyName = getCurrentBaby()?.name;
        let title = isEdit ? `編輯${getRecordTypeName(type)}` : `新增${getRecordTypeName(type)}`;
        if (babyName) title += ` - ${babyName}`;

        let formContent = '';
        const now = new Date();
        const defaultDateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        switch (type) {
            case 'feeding':
                formContent = `
                    <div class="form-group">
                        <label for="feedingTime">時間:</label>
                        <input type="datetime-local" id="feedingTime" class="form-control" value="${recordToEdit?.timestamp ? formatISOToDateTimeLocal(recordToEdit.timestamp) : defaultDateTime}" required>
                    </div>
                    <div class="form-group">
                        <label for="feedingType">類型:</label>
                        <select id="feedingType" class="form-control">
                            <option value="母乳" ${recordToEdit?.type === '母乳' ? 'selected' : ''}>母乳</option>
                            <option value="配方奶" ${recordToEdit?.type === '配方奶' ? 'selected' : ''}>配方奶</option>
                            <option value="副食品" ${recordToEdit?.type === '副食品' ? 'selected' : ''}>副食品</option>
                            <option value="水" ${recordToEdit?.type === '水' ? 'selected' : ''}>水</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="feedingAmount">份量:</label>
                            <input type="number" id="feedingAmount" class="form-control" placeholder="例如: 120" value="${recordToEdit?.amount || ''}">
                        </div>
                        <div class="form-group">
                            <label for="feedingUnit">單位:</label>
                            <input type="text" id="feedingUnit" class="form-control" placeholder="例如: ml, g" value="${recordToEdit?.unit || 'ml'}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="feedingNotes">備註:</label>
                        <textarea id="feedingNotes" class="form-control">${recordToEdit?.notes || ''}</textarea>
                    </div>
                `;
                break;
            case 'sleep':
                formContent = `
                    <div class="form-group">
                        <label for="sleepStartTime">開始時間:</label>
                        <input type="datetime-local" id="sleepStartTime" class="form-control" value="${recordToEdit?.startTime ? formatISOToDateTimeLocal(recordToEdit.startTime) : defaultDateTime}" required>
                    </div>
                    <div class="form-group">
                        <label for="sleepEndTime">結束時間:</label>
                        <input type="datetime-local" id="sleepEndTime" class="form-control" value="${recordToEdit?.endTime ? formatISOToDateTimeLocal(recordToEdit.endTime) : defaultDateTime}">
                    </div>
                     <div class="form-group">
                        <label for="sleepDuration">持續時間 (若手動輸入):</label>
                        <input type="text" id="sleepDuration" class="form-control" placeholder="例如: 1h 30m 或 90 (分鐘)" value="${recordToEdit?.duration ? formatDurationForInput(recordToEdit.duration) : ''}">
                        <small class="form-text text-muted">如果填寫了開始和結束時間，將自動計算。否則請手動輸入總分鐘數或 "Xh Ym" 格式。</small>
                    </div>
                    <div class="form-group">
                        <label for="sleepNotes">備註:</label>
                        <textarea id="sleepNotes" class="form-control">${recordToEdit?.notes || ''}</textarea>
                    </div>
                `;
                break;
            case 'diaper':
                formContent = `
                    <div class="form-group">
                        <label for="diaperTime">時間:</label>
                        <input type="datetime-local" id="diaperTime" class="form-control" value="${recordToEdit?.timestamp ? formatISOToDateTimeLocal(recordToEdit.timestamp) : defaultDateTime}" required>
                    </div>
                    <div class="form-group">
                        <label for="diaperType">類型:</label>
                        <select id="diaperType" class="form-control">
                            <option value="濕" ${recordToEdit?.type === '濕' ? 'selected' : ''}>濕 (尿)</option>
                            <option value="髒" ${recordToEdit?.type === '髒' ? 'selected' : ''}>髒 (便)</option>
                            <option value="濕髒" ${recordToEdit?.type === '濕髒' ? 'selected' : ''}>濕+髒</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="diaperNotes">備註 (例如: 顏色、狀態):</label>
                        <textarea id="diaperNotes" class="form-control">${recordToEdit?.notes || ''}</textarea>
                    </div>
                `;
                break;
            case 'activity':
                 formContent = `
                    <div class="form-group">
                        <label for="activityTime">時間:</label>
                        <input type="datetime-local" id="activityTime" class="form-control" value="${recordToEdit?.timestamp ? formatISOToDateTimeLocal(recordToEdit.timestamp) : defaultDateTime}" required>
                    </div>
                    <div class="form-group">
                        <label for="activityName">活動名稱:</label>
                        <input type="text" id="activityName" class="form-control" placeholder="例如: 玩耍, 散步, 閱讀" value="${recordToEdit?.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="activityDuration">持續時間 (分鐘, 可選):</label>
                        <input type="number" id="activityDuration" class="form-control" placeholder="例如: 30" value="${recordToEdit?.duration || ''}">
                    </div>
                    <div class="form-group">
                        <label for="activityNotes">備註:</label>
                        <textarea id="activityNotes" class="form-control">${recordToEdit?.notes || ''}</textarea>
                    </div>
                `;
                break;
            case 'health':
                formContent = `
                    <div class="form-group">
                        <label for="healthTime">時間:</label>
                        <input type="datetime-local" id="healthTime" class="form-control" value="${recordToEdit?.timestamp ? formatISOToDateTimeLocal(recordToEdit.timestamp) : defaultDateTime}" required>
                    </div>
                    <div class="form-group">
                        <label for="healthType">記錄類型:</label>
                        <select id="healthType" class="form-control">
                            <option value="體溫" ${recordToEdit?.healthType === '體溫' ? 'selected' : ''}>體溫</option>
                            <option value="體重" ${recordToEdit?.healthType === '體重' ? 'selected' : ''}>體重</option>
                            <option value="身高" ${recordToEdit?.healthType === '身高' ? 'selected' : ''}>身高</option>
                            <option value="頭圍" ${recordToEdit?.healthType === '頭圍' ? 'selected' : ''}>頭圍</option>
                            <option value="用藥" ${recordToEdit?.healthType === '用藥' ? 'selected' : ''}>用藥</option>
                            <option value="症狀" ${recordToEdit?.healthType === '症狀' ? 'selected' : ''}>症狀</option>
                            <option value="疫苗" ${recordToEdit?.healthType === '疫苗' ? 'selected' : ''}>疫苗</option>
                            <option value="其他" ${recordToEdit?.healthType === '其他' ? 'selected' : ''}>其他</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="healthValue">數值/說明:</label>
                        <input type="text" id="healthValue" class="form-control" placeholder="例如: 37.5 (體溫), 5000g (體重), 阿莫西林 (用藥)" value="${recordToEdit?.value || ''}" required>
                    </div>
                     <div class="form-group">
                        <label for="healthUnit">單位 (若適用):</label>
                        <input type="text" id="healthUnit" class="form-control" placeholder="例如: °C, kg, cm, mg" value="${recordToEdit?.unit || ''}">
                    </div>
                    <div class="form-group">
                        <label for="healthNotes">備註:</label>
                        <textarea id="healthNotes" class="form-control">${recordToEdit?.notes || ''}</textarea>
                    </div>
                `;
                break;
            case 'mood':
                formContent = `
                    <div class="form-group">
                        <label for="moodTime">時間:</label>
                        <input type="datetime-local" id="moodTime" class="form-control" value="${recordToEdit?.timestamp ? formatISOToDateTimeLocal(recordToEdit.timestamp) : defaultDateTime}" required>
                    </div>
                    <div class="form-group">
                        <label for="moodState">情緒狀態:</label>
                        <select id="moodState" class="form-control">
                            <option value="開心" ${recordToEdit?.state === '開心' ? 'selected' : ''}>開心 😊</option>
                            <option value="平靜" ${recordToEdit?.state === '平靜' ? 'selected' : ''}>平靜 🙂</option>
                            <option value="哭鬧" ${recordToEdit?.state === '哭鬧' ? 'selected' : ''}>哭鬧 😭</option>
                            <option value="煩躁" ${recordToEdit?.state === '煩躁' ? 'selected' : ''}>煩躁 😠</option>
                            <option value="疲倦" ${recordToEdit?.state === '疲倦' ? 'selected' : ''}>疲倦 😴</option>
                            <option value="其他" ${recordToEdit?.state === '其他' ? 'selected' : ''}>其他</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="moodTriggers">可能原因/觸發事件 (可選):</label>
                        <input type="text" id="moodTriggers" class="form-control" value="${recordToEdit?.triggers || ''}">
                    </div>
                    <div class="form-group">
                        <label for="moodNotes">備註:</label>
                        <textarea id="moodNotes" class="form-control">${recordToEdit?.notes || ''}</textarea>
                    </div>
                `;
                break;
            default:
                showToast(`未知的記錄類型: ${type}`, 'error');
                return;
        }

        const formId = `addRecordForm-${type}`;
        const fullFormContent = `<form id="${formId}">${formContent}</form>`;
        const footer = `<button type="button" class="btn btn-secondary" data-dismiss="modal">取消</button>
                        <button type="submit" form="${formId}" class="btn btn-primary">${isEdit ? '儲存變更' : '新增記錄'}</button>`;

        const modalElement = openModal(title, fullFormContent, footer);
        const form = modalElement.querySelector(`#${formId}`);

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const recordData = { babyId: state.currentBabyId };
            if (isEdit) recordData.id = recordToEdit.id;
            else recordData.id = generateUUID();

            try {
                switch (type) {
                    case 'feeding':
                        recordData.timestamp = new Date(form.querySelector('#feedingTime').value).toISOString();
                        recordData.type = form.querySelector('#feedingType').value;
                        recordData.amount = parseFloat(form.querySelector('#feedingAmount').value) || null;
                        recordData.unit = form.querySelector('#feedingUnit').value.trim();
                        recordData.notes = form.querySelector('#feedingNotes').value.trim();
                        if (!recordData.timestamp || !recordData.type) throw new Error("時間和類型為必填項。");
                        break;
                    case 'sleep':
                        const startTime = form.querySelector('#sleepStartTime').value;
                        const endTime = form.querySelector('#sleepEndTime').value;
                        const manualDuration = form.querySelector('#sleepDuration').value.trim();
                        
                        recordData.startTime = startTime ? new Date(startTime).toISOString() : null;
                        recordData.endTime = endTime ? new Date(endTime).toISOString() : null;
                        recordData.notes = form.querySelector('#sleepNotes').value.trim();

                        if (recordData.startTime && recordData.endTime) {
                            const diffMs = new Date(recordData.endTime) - new Date(recordData.startTime);
                            if (diffMs < 0) throw new Error("結束時間不能早於開始時間。");
                            recordData.duration = formatDuration(diffMs);
                        } else if (manualDuration) {
                            recordData.duration = parseDurationInput(manualDuration);
                             if (!recordData.startTime && !recordData.endTime) { // 如果沒有起訖時間，則用當前時間減去時長作為開始時間
                                const durationMs = durationToMilliseconds(recordData.duration);
                                recordData.startTime = new Date(Date.now() - durationMs).toISOString();
                            }
                        } else if (recordData.startTime && !recordData.endTime) {
                            // 如果只有開始時間，可以視為正在睡眠，或提示用戶
                            throw new Error("請填寫結束時間或手動輸入持續時長。");
                        } else {
                             throw new Error("請填寫開始/結束時間，或手動輸入持續時長。");
                        }
                        if (!recordData.startTime) throw new Error("開始時間為必填項。");
                        break;
                    case 'diaper':
                        recordData.timestamp = new Date(form.querySelector('#diaperTime').value).toISOString();
                        recordData.type = form.querySelector('#diaperType').value;
                        recordData.notes = form.querySelector('#diaperNotes').value.trim();
                        if (!recordData.timestamp || !recordData.type) throw new Error("時間和類型為必填項。");
                        break;
                    case 'activity':
                        recordData.timestamp = new Date(form.querySelector('#activityTime').value).toISOString();
                        recordData.name = form.querySelector('#activityName').value.trim();
                        const activityDurationMinutes = parseInt(form.querySelector('#activityDuration').value);
                        recordData.duration = activityDurationMinutes > 0 ? `${activityDurationMinutes}m` : null; // 存儲為 "Xm" 格式
                        recordData.notes = form.querySelector('#activityNotes').value.trim();
                        if (!recordData.timestamp || !recordData.name) throw new Error("時間和活動名稱為必填項。");
                        break;
                    case 'health':
                        recordData.timestamp = new Date(form.querySelector('#healthTime').value).toISOString();
                        recordData.healthType = form.querySelector('#healthType').value;
                        recordData.value = form.querySelector('#healthValue').value.trim();
                        recordData.unit = form.querySelector('#healthUnit').value.trim();
                        recordData.notes = form.querySelector('#healthNotes').value.trim();
                        if (!recordData.timestamp || !recordData.healthType || !recordData.value) throw new Error("時間、記錄類型和數值/說明為必填項。");
                        break;
                    case 'mood':
                        recordData.timestamp = new Date(form.querySelector('#moodTime').value).toISOString();
                        recordData.state = form.querySelector('#moodState').value;
                        recordData.triggers = form.querySelector('#moodTriggers').value.trim();
                        recordData.notes = form.querySelector('#moodNotes').value.trim();
                        if (!recordData.timestamp || !recordData.state) throw new Error("時間和情緒狀態為必填項。");
                        break;
                }

                if (isEdit) {
                    const index = state.records[type].findIndex(r => r.id === recordToEdit.id);
                    if (index !== -1) state.records[type][index] = recordData;
                } else {
                    state.records[type].push(recordData);
                }

                saveData();
                renderRecordList(type);
                updateDashboard();
                closeModal(modalElement);
                showToast(`${getRecordTypeName(type)}已${isEdit ? '更新' : '新增'}！`, 'success');

            } catch (error) {
                showToast(`錯誤: ${error.message}`, 'error');
                console.error("表單提交錯誤:", error);
            }
        });
    }
    
    function openAddSleepModal() { // 此函數現在主要用於手動添加，計時器有單獨邏輯
        openAddRecordModal('sleep');
    }

    function renderRecordList(type) {
        const listEl = document.getElementById(`${type}List`);
        if (!listEl) return;

        const currentBabyRecords = state.records[type]
            .filter(r => r.babyId === state.currentBabyId)
            .sort((a, b) => new Date(b.timestamp || b.startTime) - new Date(a.timestamp || a.startTime)); // 按時間倒序

        listEl.innerHTML = '';
        if (currentBabyRecords.length === 0) {
            listEl.innerHTML = `<div class="empty-state">
                <span class="icon">${getRecordTypeIcon(type)}</span>
                <h3>尚無${getRecordTypeName(type)}</h3>
                <p>點擊「新增記錄」按鈕來開始記錄吧！</p>
            </div>`;
            return;
        }

        currentBabyRecords.forEach(record => {
            const item = document.createElement('div');
            item.className = 'record-item';
            item.innerHTML = `
                <div class="record-header">
                    <span class="record-type">${getRecordTypeIcon(type)} ${getRecordTypeName(type)}</span>
                    <span class="record-time">${formatTimestamp(record.timestamp || record.startTime)}</span>
                </div>
                <div class="record-details">
                    ${getRecordDetailsHTML(record, type)}
                </div>
                <div class="record-actions">
                    <button class="btn btn-secondary btn-sm edit-record-btn" data-id="${record.id}" data-type="${type}">編輯</button>
                    <button class="btn btn-danger btn-sm delete-record-btn" data-id="${record.id}" data-type="${type}">刪除</button>
                </div>
            `;
            listEl.appendChild(item);
        });

        listEl.querySelectorAll('.edit-record-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recordId = e.target.dataset.id;
                const recordType = e.target.dataset.type;
                const recordToEdit = state.records[recordType].find(r => r.id === recordId);
                if (recordToEdit) {
                    openAddRecordModal(recordType, recordToEdit);
                }
            });
        });

        listEl.querySelectorAll('.delete-record-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                 const recordId = e.target.dataset.id;
                 const recordType = e.target.dataset.type;
                 openConfirmationModal('確認刪除', `您確定要刪除這條${getRecordTypeName(recordType)}嗎？`, () => {
                    deleteRecord(recordType, recordId);
                 });
            });
        });
    }

    function deleteRecord(type, recordId) {
        state.records[type] = state.records[type].filter(r => r.id !== recordId);
        saveData();
        renderRecordList(type);
        updateDashboard();
        showToast(`${getRecordTypeName(type)}已刪除。`, 'success');
    }

    function renderAllRecordLists() {
        const recordTypes = ['feeding', 'sleep', 'diaper', 'activity', 'health', 'mood'];
        recordTypes.forEach(type => renderRecordList(type));
    }


    function getRecordDetailsHTML(record, type) {
        let details = '';
        switch (type) {
            case 'feeding':
                details = `類型: ${record.type}, 份量: ${record.amount || '未記錄'} ${record.unit || ''}`;
                break;
            case 'sleep':
                details = `開始: ${formatTimestamp(record.startTime, true)}, 結束: ${record.endTime ? formatTimestamp(record.endTime, true) : '仍在睡眠'}<br>
                           時長: ${record.duration ? formatDuration(durationToMilliseconds(record.duration)) : '計算中...'}`;
                break;
            case 'diaper':
                details = `類型: ${record.type}`;
                break;
            case 'activity':
                details = `活動: ${record.name}${record.duration ? `, 時長: ${formatDuration(durationToMilliseconds(record.duration))}` : ''}`;
                break;
            case 'health':
                details = `類型: ${record.healthType}, 記錄: ${record.value} ${record.unit || ''}`;
                break;
            case 'mood':
                details = `狀態: ${record.state}${record.triggers ? `, 原因: ${record.triggers}` : ''}`;
                break;
        }
        if (record.notes) {
            details += `<br>備註: ${escapeHTML(record.notes)}`;
        }
        return details;
    }

    // --- 儀表板更新 ---
    function updateDashboard() {
        if (!state.currentBabyId) {
            todayFeedingEl.textContent = 'N/A';
            todaySleepEl.textContent = 'N/A';
            todayDiaperEl.textContent = 'N/A';
            todayActivityEl.textContent = 'N/A';
            recentRecordsListEl.innerHTML = '<p class="text-center text-light">請先選擇或新增一位寶寶以查看記錄。</p>';
            return;
        }

        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const currentBaby = getCurrentBaby();
        if (!currentBaby) return;


        // 餵食次數
        const todayFeedings = state.records.feeding.filter(r => r.babyId === state.currentBabyId && r.timestamp.startsWith(today));
        todayFeedingEl.textContent = todayFeedings.length;

        // 睡眠時間
        const todaySleepRecords = state.records.sleep.filter(r => r.babyId === state.currentBabyId && (r.startTime.startsWith(today) || (r.endTime && r.endTime.startsWith(today))));
        let totalSleepMs = 0;
        todaySleepRecords.forEach(r => {
            if (r.duration) {
                 totalSleepMs += durationToMilliseconds(r.duration);
            } else if (r.startTime && r.endTime) { // Fallback if duration somehow not pre-calculated
                const start = new Date(r.startTime);
                const end = new Date(r.endTime);
                if (end > start) totalSleepMs += (end - start);
            }
        });
        todaySleepEl.textContent = (totalSleepMs / (1000 * 60 * 60)).toFixed(1); // 小時

        // 換尿布次數
        const todayDiapers = state.records.diaper.filter(r => r.babyId === state.currentBabyId && r.timestamp.startsWith(today));
        todayDiaperEl.textContent = todayDiapers.length;

        // 活動記錄數
        const todayActivities = state.records.activity.filter(r => r.babyId === state.currentBabyId && r.timestamp.startsWith(today));
        todayActivityEl.textContent = todayActivities.length;

        // 最近記錄
        renderRecentRecords();
    }

    function renderRecentRecords() {
        recentRecordsListEl.innerHTML = '';
        if (!state.currentBabyId) return;

        const allRecords = [];
        for (const type in state.records) {
            state.records[type]
                .filter(r => r.babyId === state.currentBabyId)
                .forEach(r => allRecords.push({ ...r, recordType: type }));
        }

        allRecords.sort((a, b) => new Date(b.timestamp || b.startTime) - new Date(a.timestamp || a.startTime));
        const recent = allRecords.slice(0, 5); // 取最近5條

        if (recent.length === 0) {
            recentRecordsListEl.innerHTML = '<p class="text-center text-light">今天尚無記錄。</p>';
            return;
        }

        recent.forEach(record => {
            const item = document.createElement('div');
            item.className = 'record-item';
            // 根據記錄類型調整邊框顏色
            const borderColorVar = getRecordTypeColorVar(record.recordType);
            if (borderColorVar) {
                item.style.borderLeftColor = `var(${borderColorVar})`;
            }

            item.innerHTML = `
                <div class="record-header">
                    <span class="record-type">${getRecordTypeIcon(record.recordType)} ${getRecordTypeName(record.recordType)}</span>
                    <span class="record-time">${formatTimestamp(record.timestamp || record.startTime)}</span>
                </div>
                <div class="record-details">
                    ${getRecordDetailsHTML(record, record.recordType)}
                </div>
            `;
            recentRecordsListEl.appendChild(item);
        });
    }

    // --- 睡眠計時器 ---
    function startSleepTimer() {
        if (!state.currentBabyId) {
            showToast('請先選擇寶寶！', 'warning');
            return;
        }
        sleepStartTime = new Date();
        sleepTimerEl.style.display = 'block';
        document.getElementById('addSleepBtn').textContent = '手動新增睡眠'; // 修改按鈕文字提示

        sleepTimerInterval = setInterval(() => {
            const now = new Date();
            const elapsedMs = now - sleepStartTime;
            timerDisplayEl.textContent = formatDuration(elapsedMs, true); // true for HH:MM:SS format
        }, 1000);
        showToast(`寶寶 ${getCurrentBaby()?.name} 開始睡眠了。`, 'info');
    }

    function stopSleepTimerAndSave() {
        clearInterval(sleepTimerInterval);
        const sleepEndTime = new Date();
        const durationMs = sleepEndTime - sleepStartTime;

        const newSleepRecord = {
            id: generateUUID(),
            babyId: state.currentBabyId,
            startTime: sleepStartTime.toISOString(),
            endTime: sleepEndTime.toISOString(),
            duration: formatDuration(durationMs), // 存儲為 "Xh Ym Zs" 或簡化格式
            notes: '透過計時器記錄'
        };

        state.records.sleep.push(newSleepRecord);
        saveData();
        renderRecordList('sleep');
        updateDashboard();

        sleepTimerEl.style.display = 'none';
        timerDisplayEl.textContent = '00:00:00';
        document.getElementById('addSleepBtn').textContent = '新增記錄'; // 恢復按鈕文字
        showToast(`寶寶 ${getCurrentBaby()?.name} 睡眠結束，已記錄。時長: ${formatDuration(durationMs)}`, 'success');
    }


    // --- 里程碑 ---
    function bindMilestoneEvents() {
        const addMilestoneBtn = document.getElementById('addMilestoneBtn');
        const milestoneTabs = document.querySelectorAll('#milestonesPage .tab-btn');

        if (addMilestoneBtn) {
            addMilestoneBtn.addEventListener('click', () => openAddMilestoneModal());
        }

        milestoneTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                milestoneTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderMilestones();
            });
        });
    }

    function openAddMilestoneModal(milestoneToEdit = null) {
        if (!state.currentBabyId) {
            showToast('請先選擇寶寶！', 'warning');
            return;
        }
        const isEdit = milestoneToEdit !== null;
        const babyName = getCurrentBaby()?.name;
        let title = isEdit ? `編輯里程碑` : `新增里程碑`;
        if (babyName) title += ` - ${babyName}`;

        const content = `
            <form id="milestoneForm">
                <div class="form-group">
                    <label for="milestoneTitle">里程碑標題:</label>
                    <input type="text" id="milestoneTitle" class="form-control" value="${milestoneToEdit?.title || ''}" required>
                </div>
                <div class="form-group">
                    <label for="milestoneDateAchieved">達成日期 (若已達成):</label>
                    <input type="date" id="milestoneDateAchieved" class="form-control" value="${milestoneToEdit?.dateAchieved || ''}">
                </div>
                <div class="form-group">
                    <label for="milestoneExpectedAge">預期月齡 (可選):</label>
                    <input type="text" id="milestoneExpectedAge" class="form-control" placeholder="例如: 3個月, 1歲" value="${milestoneToEdit?.expectedAge || ''}">
                </div>
                <div class="form-group">
                    <label for="milestoneCategory">分類 (可選):</label>
                    <input type="text" id="milestoneCategory" class="form-control" placeholder="例如: 動作, 認知, 社交" value="${milestoneToEdit?.category || ''}">
                </div>
                <div class="form-group">
                    <label for="milestoneDescription">描述 (可選):</label>
                    <textarea id="milestoneDescription" class="form-control">${milestoneToEdit?.description || ''}</textarea>
                </div>
                 <div class="form-group">
                    <label>
                        <input type="checkbox" id="milestoneIsCustom" ${milestoneToEdit?.isCustom ? 'checked' : ''}>
                        自定義里程碑
                    </label>
                </div>
            </form>
        `;
        const footer = `<button type="button" class="btn btn-secondary" data-dismiss="modal">取消</button>
                        <button type="submit" form="milestoneForm" class="btn btn-primary">${isEdit ? '儲存變更' : '新增'}</button>`;

        const modalElement = openModal(title, content, footer);
        const form = modalElement.querySelector('#milestoneForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const newMilestone = {
                id: isEdit ? milestoneToEdit.id : generateUUID(),
                babyId: state.currentBabyId,
                title: form.querySelector('#milestoneTitle').value.trim(),
                dateAchieved: form.querySelector('#milestoneDateAchieved').value || null,
                expectedAge: form.querySelector('#milestoneExpectedAge').value.trim(),
                category: form.querySelector('#milestoneCategory').value.trim(),
                description: form.querySelector('#milestoneDescription').value.trim(),
                isCustom: form.querySelector('#milestoneIsCustom').checked,
            };

            if (!newMilestone.title) {
                showToast('里程碑標題為必填項！', 'error');
                return;
            }

            if (isEdit) {
                const index = state.milestones.findIndex(m => m.id === milestoneToEdit.id);
                state.milestones[index] = newMilestone;
            } else {
                state.milestones.push(newMilestone);
            }
            saveData();
            renderMilestones();
            closeModal(modalElement);
            showToast(`里程碑已${isEdit ? '更新' : '新增'}！`, 'success');
        });
    }

    function renderMilestones() {
        const listEl = document.getElementById('milestonesList');
        if (!listEl) return;
        if (!state.currentBabyId) {
             listEl.innerHTML = `<div class="empty-state"><span class="icon">🎖️</span><h3>請先選擇寶寶</h3></div>`;
             return;
        }

        const activeTab = document.querySelector('#milestonesPage .tab-btn.active').dataset.tab;
        let filteredMilestones = state.milestones.filter(m => m.babyId === state.currentBabyId);

        if (activeTab === 'upcoming') {
            filteredMilestones = filteredMilestones.filter(m => !m.dateAchieved);
        } else if (activeTab === 'achieved') {
            filteredMilestones = filteredMilestones.filter(m => m.dateAchieved);
        } else if (activeTab === 'custom') {
            filteredMilestones = filteredMilestones.filter(m => m.isCustom);
        }
        
        filteredMilestones.sort((a,b) => (a.expectedAge || "").localeCompare(b.expectedAge || "") || (a.title || "").localeCompare(b.title || ""));


        listEl.innerHTML = '';
        if (filteredMilestones.length === 0) {
            listEl.innerHTML = `<div class="empty-state"><span class="icon">🎖️</span><h3>此分類下尚無里程碑</h3><p>試試新增一個或切換分類查看。</p></div>`;
            return;
        }

        filteredMilestones.forEach(m => {
            const item = document.createElement('div');
            item.className = `milestone-item ${m.dateAchieved ? 'achieved' : ''}`;
            item.innerHTML = `
                <div class="milestone-header">
                    <span class="milestone-title">${escapeHTML(m.title)} ${m.isCustom ? '<span class="tag">自定義</span>': ''}</span>
                    ${m.expectedAge ? `<span class="milestone-age">預期: ${escapeHTML(m.expectedAge)}</span>` : ''}
                </div>
                ${m.description ? `<p class="milestone-description">${escapeHTML(m.description)}</p>` : ''}
                ${m.category ? `<p><small>分類: ${escapeHTML(m.category)}</small></p>` : ''}
                ${m.dateAchieved ? `<p class="text-success">達成日期: ${m.dateAchieved}</p>` : ''}
                <div class="milestone-actions">
                    <button class="btn btn-secondary btn-sm edit-milestone-btn" data-id="${m.id}">編輯</button>
                    ${!m.dateAchieved ? `<button class="btn btn-success btn-sm mark-achieved-btn" data-id="${m.id}">標記為已達成</button>` : `<button class="btn btn-warning btn-sm unmark-achieved-btn" data-id="${m.id}">標記為未達成</button>`}
                    <button class="btn btn-danger btn-sm delete-milestone-btn" data-id="${m.id}">刪除</button>
                </div>
            `;
            listEl.appendChild(item);
        });

        // 綁定事件
        listEl.querySelectorAll('.edit-milestone-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const milestone = state.milestones.find(m => m.id === id);
                openAddMilestoneModal(milestone);
            });
        });
        listEl.querySelectorAll('.mark-achieved-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const milestone = state.milestones.find(m => m.id === id);
                if (milestone) {
                    milestone.dateAchieved = new Date().toISOString().slice(0,10); // 設為今天
                    saveData();
                    renderMilestones();
                    showToast(`里程碑 "${milestone.title}" 已標記為達成！`, 'success');
                }
            });
        });
        listEl.querySelectorAll('.unmark-achieved-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const milestone = state.milestones.find(m => m.id === id);
                if (milestone) {
                    milestone.dateAchieved = null;
                    saveData();
                    renderMilestones();
                    showToast(`里程碑 "${milestone.title}" 已標記為未達成。`, 'info');
                }
            });
        });
        listEl.querySelectorAll('.delete-milestone-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                openConfirmationModal('確認刪除', `您確定要刪除此里程碑嗎？`, () => {
                    state.milestones = state.milestones.filter(m => m.id !== id);
                    saveData();
                    renderMilestones();
                    showToast('里程碑已刪除。', 'success');
                });
            });
        });
    }

    // --- 記憶寶盒 ---
    function bindMemoryEvents() {
        const addMemoryBtn = document.getElementById('addMemoryBtn');
        const memoryFilter = document.getElementById('memoryFilter');

        if (addMemoryBtn) {
            addMemoryBtn.addEventListener('click', () => openAddMemoryModal());
        }
        if (memoryFilter) {
            memoryFilter.addEventListener('change', renderMemories);
        }
    }

    function openAddMemoryModal(memoryToEdit = null) {
        if (!state.currentBabyId) {
            showToast('請先選擇寶寶！', 'warning');
            return;
        }
        const isEdit = memoryToEdit !== null;
        const babyName = getCurrentBaby()?.name;
        let title = isEdit ? `編輯記憶` : `新增記憶`;
        if (babyName) title += ` - ${babyName}`;

        let photoPreviewsHTML = '';
        (memoryToEdit?.photos || []).forEach((photoUrl, index) => {
            photoPreviewsHTML += `<div class="memory-photo-preview-item">
                                    <img src="${photoUrl}" alt="記憶照片 ${index + 1}">
                                    <button type="button" class="remove-photo-btn" data-index="${index}">✕</button>
                                 </div>`;
        });


        const content = `
            <form id="memoryForm">
                <div class="form-group">
                    <label for="memoryTitle">標題:</label>
                    <input type="text" id="memoryTitle" class="form-control" value="${memoryToEdit?.title || ''}" required>
                </div>
                <div class="form-group">
                    <label for="memoryDate">日期:</label>
                    <input type="date" id="memoryDate" class="form-control" value="${memoryToEdit?.date || new Date().toISOString().slice(0,10)}" required>
                </div>
                <div class="form-group">
                    <label for="memoryType">類型:</label>
                    <select id="memoryType" class="form-control">
                        <option value="daily" ${memoryToEdit?.type === 'daily' ? 'selected' : ''}>每日亮點</option>
                        <option value="story" ${memoryToEdit?.type === 'story' ? 'selected' : ''}>成長故事</option>
                        <option value="photo" ${memoryToEdit?.type === 'photo' ? 'selected' : ''}>照片日記</option>
                        <option value="quote" ${memoryToEdit?.type === 'quote' ? 'selected' : ''}>語錄收集</option>
                        <option value="first" ${memoryToEdit?.type === 'first' ? 'selected' : ''}>第一次</option>
                        <option value="other" ${memoryToEdit?.type === 'other' ? 'selected' : ''}>其他</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="memoryContent">內容:</label>
                    <textarea id="memoryContent" class="form-control" rows="5">${memoryToEdit?.content || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>照片:</label>
                    <div class="photo-upload" id="memoryPhotoUploadArea">點擊此處上傳照片</div>
                    <div id="memoryPhotoPreviews" class="memory-photos" style="margin-top: 10px;">
                        ${photoPreviewsHTML}
                    </div>
                    <input type="hidden" id="memoryPhotosData" value="${JSON.stringify(memoryToEdit?.photos || [])}">
                </div>
            </form>
        `;
        const footer = `<button type="button" class="btn btn-secondary" data-dismiss="modal">取消</button>
                        <button type="submit" form="memoryForm" class="btn btn-primary">${isEdit ? '儲存變更' : '新增'}</button>`;

        const modalElement = openModal(title, content, footer, (modal) => {
            const photoUploadArea = modal.querySelector('#memoryPhotoUploadArea');
            const photoPreviewsContainer = modal.querySelector('#memoryPhotoPreviews');
            const photosDataInput = modal.querySelector('#memoryPhotosData');
            let currentPhotos = JSON.parse(photosDataInput.value);

            const rerenderPhotoPreviews = () => {
                photoPreviewsContainer.innerHTML = '';
                currentPhotos.forEach((photoUrl, index) => {
                    const div = document.createElement('div');
                    div.className = 'memory-photo-preview-item'; // 自定義樣式
                    div.style.position = 'relative';
                    div.style.display = 'inline-block';
                    div.style.margin = '5px';
                    div.innerHTML = `
                        <img src="${photoUrl}" alt="記憶照片 ${index + 1}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;">
                        <button type="button" class="remove-photo-btn" data-index="${index}" style="position: absolute; top: 0; right: 0; background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 12px; cursor: pointer;">✕</button>
                    `;
                    photoPreviewsContainer.appendChild(div);
                });
                photosDataInput.value = JSON.stringify(currentPhotos);

                // 重新綁定刪除按鈕事件
                photoPreviewsContainer.querySelectorAll('.remove-photo-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const indexToRemove = parseInt(e.target.dataset.index);
                        currentPhotos.splice(indexToRemove, 1);
                        rerenderPhotoPreviews();
                    });
                });
            };


            photoUploadArea.addEventListener('click', () => {
                currentPhotoUploadCallback = (dataUrl) => {
                    currentPhotos.push(dataUrl);
                    rerenderPhotoPreviews();
                    currentPhotoUploadCallback = null;
                };
                hiddenFileInput.accept = "image/*"; // 確保只接受圖片
                hiddenFileInput.multiple = true; // 允許選擇多張，但我們一次處理一張
                hiddenFileInput.click();
            });
            
            rerenderPhotoPreviews(); // 初始渲染預覽 (編輯時)


            const form = modal.querySelector('#memoryForm');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const newMemory = {
                    id: isEdit ? memoryToEdit.id : generateUUID(),
                    babyId: state.currentBabyId,
                    title: form.querySelector('#memoryTitle').value.trim(),
                    date: form.querySelector('#memoryDate').value,
                    type: form.querySelector('#memoryType').value,
                    content: form.querySelector('#memoryContent').value.trim(),
                    photos: JSON.parse(photosDataInput.value),
                };

                if (!newMemory.title || !newMemory.date) {
                    showToast('標題和日期為必填項！', 'error');
                    return;
                }

                if (isEdit) {
                    const index = state.memories.findIndex(m => m.id === memoryToEdit.id);
                    state.memories[index] = newMemory;
                } else {
                    state.memories.push(newMemory);
                }
                saveData();
                renderMemories();
                closeModal(modalElement);
                showToast(`記憶已${isEdit ? '更新' : '新增'}！`, 'success');
            });
        });
    }

    function renderMemories() {
        const listEl = document.getElementById('memoriesList');
        const filterValue = document.getElementById('memoryFilter').value;
        if (!listEl) return;
         if (!state.currentBabyId) {
             listEl.innerHTML = `<div class="empty-state"><span class="icon">💝</span><h3>請先選擇寶寶</h3></div>`;
             return;
        }

        let filteredMemories = state.memories.filter(m => m.babyId === state.currentBabyId);
        if (filterValue !== 'all') {
            filteredMemories = filteredMemories.filter(m => m.type === filterValue);
        }
        filteredMemories.sort((a,b) => new Date(b.date) - new Date(a.date)); // 按日期倒序

        listEl.innerHTML = '';
        if (filteredMemories.length === 0) {
            listEl.innerHTML = `<div class="empty-state"><span class="icon">💝</span><h3>此分類下尚無記憶</h3><p>試試新增一個或切換篩選條件。</p></div>`;
            return;
        }

        filteredMemories.forEach(m => {
            const item = document.createElement('div');
            item.className = 'memory-item';
            let photosHTML = '';
            if (m.photos && m.photos.length > 0) {
                photosHTML = '<div class="memory-photos">';
                m.photos.forEach(p => {
                    photosHTML += `<div class="memory-photo"><img src="${p}" alt="${escapeHTML(m.title)} 照片" loading="lazy"></div>`;
                });
                photosHTML += '</div>';
            }

            item.innerHTML = `
                <div class="memory-header">
                    <span class="memory-type">${getMemoryTypeName(m.type)}</span>
                    <span class="memory-date">${m.date}</span>
                </div>
                <h3 class="memory-title">${escapeHTML(m.title)}</h3>
                ${m.content ? `<div class="memory-content">${escapeHTML(m.content).replace(/\n/g, '<br>')}</div>` : ''}
                ${photosHTML}
                <div class="record-actions"> <button class="btn btn-secondary btn-sm edit-memory-btn" data-id="${m.id}">編輯</button>
                    <button class="btn btn-danger btn-sm delete-memory-btn" data-id="${m.id}">刪除</button>
                </div>
            `;
            listEl.appendChild(item);
        });

        listEl.querySelectorAll('.edit-memory-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const memory = state.memories.find(m => m.id === id);
                openAddMemoryModal(memory);
            });
        });
        listEl.querySelectorAll('.delete-memory-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                 openConfirmationModal('確認刪除', `您確定要刪除這條記憶嗎？`, () => {
                    state.memories = state.memories.filter(m => m.id !== id);
                    saveData();
                    renderMemories();
                    showToast('記憶已刪除。', 'success');
                });
            });
        });
    }

    // --- 數據分析 ---
    function bindAnalyticsEvents() {
        if (analyticsTypeSelect) analyticsTypeSelect.addEventListener('change', renderAnalyticsChart);
        if (analyticsRangeSelect) analyticsRangeSelect.addEventListener('change', renderAnalyticsChart);
    }

    function renderAnalyticsChart() {
        if (!mainChartCanvas || !document.getElementById('analyticsPage').classList.contains('active')) return;
        if (!state.currentBabyId) {
            chartTitleEl.textContent = '請先選擇寶寶';
            statsContainerEl.innerHTML = '<p class="text-center text-light">請先選擇寶寶以查看分析數據。</p>';
            if (mainChartInstance) mainChartInstance.destroy();
            mainChartInstance = null;
            return;
        }


        const analyticsType = analyticsTypeSelect.value;
        const analyticsRange = analyticsRangeSelect.value;
        const babyName = getCurrentBaby()?.name;

        chartTitleEl.textContent = `${getAnalyticsChartTitle(analyticsType)} - ${babyName || '寶寶'}`;

        const { labels, data, summaryStats } = prepareChartData(analyticsType, analyticsRange);

        if (mainChartInstance) {
            mainChartInstance.destroy();
        }

        const chartType = (analyticsType === 'feeding' || analyticsType === 'mood') ? 'bar' : 'line';
        const isDarkMode = state.theme === 'dark';
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDarkMode ? '#F8F9FA' : '#2D3436';


        mainChartInstance = new Chart(mainChartCanvas, {
            type: chartType,
            data: {
                labels: labels,
                datasets: [{
                    label: getAnalyticsChartTitle(analyticsType),
                    data: data,
                    borderColor: 'var(--primary-color)',
                    backgroundColor: 'var(--primary-light)',
                    tension: 0.1,
                    fill: chartType === 'line' // 只有折線圖需要填充
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: gridColor },
                        ticks: { color: textColor }
                    },
                    x: {
                        grid: { color: gridColor },
                        ticks: { color: textColor }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: textColor }
                    }
                }
            }
        });

        renderSummaryStats(summaryStats);
    }

    function prepareChartData(type, range) {
        let labels = [];
        let data = [];
        let summaryStats = {}; // { '平均值': 10, '總計': 100 }

        const records = state.records[type]?.filter(r => r.babyId === state.currentBabyId) || [];
        if (type === 'growth') { // 成長曲線特殊處理，可能需要從 health 記錄中提取體重/身高
            // 這裡簡化，假設 health 記錄中有 '體重' 或 '身高' 的 healthType
            // 實際應用中可能需要更複雜的邏輯
            const growthRecords = state.records.health?.filter(r => r.babyId === state.currentBabyId && (r.healthType === '體重' || r.healthType === '身高')) || [];
            // 按時間排序
            growthRecords.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));

            // 篩選時間範圍 (這裡簡化，實際應根據 range 篩選)
            const endDate = new Date();
            const startDate = new Date();
            if (range === 'week') startDate.setDate(endDate.getDate() - 7);
            else if (range === 'month') startDate.setMonth(endDate.getMonth() - 1);
            else if (range === 'quarter') startDate.setMonth(endDate.getMonth() - 3);
            else if (range === 'year') startDate.setFullYear(endDate.getFullYear() - 1);

            const filteredGrowthRecords = growthRecords.filter(r => new Date(r.timestamp) >= startDate && new Date(r.timestamp) <= endDate);

            // 假設分析體重
            const weightRecords = filteredGrowthRecords.filter(r => r.healthType === '體重' && parseFloat(r.value));
            labels = weightRecords.map(r => formatDate(r.timestamp));
            data = weightRecords.map(r => parseFloat(r.value)); // 假設單位是 kg 或 g，需要統一
            
            if (data.length > 0) {
                summaryStats['最新體重'] = `${data[data.length - 1]} ${weightRecords[weightRecords.length-1].unit || 'kg'}`;
                summaryStats['平均體重'] = `${(data.reduce((a,b)=>a+b,0) / data.length).toFixed(2)} ${weightRecords[0].unit || 'kg'}`;
            } else {
                 summaryStats['數據'] = '不足';
            }


        } else if (type === 'feeding') {
            // 餵食分析: 每日總量或次數
            const dailyFeeding = {}; // { 'YYYY-MM-DD': { count: 0, totalAmount: 0 } }
            const { startDate, endDate } = getDateRange(range);

            records.forEach(r => {
                const recordDate = new Date(r.timestamp);
                if (recordDate >= startDate && recordDate <= endDate) {
                    const dateStr = r.timestamp.slice(0, 10);
                    if (!dailyFeeding[dateStr]) dailyFeeding[dateStr] = { count: 0, totalAmount: 0, unit: r.unit || 'ml' };
                    dailyFeeding[dateStr].count++;
                    if (r.amount) dailyFeeding[dateStr].totalAmount += parseFloat(r.amount);
                }
            });
            
            const sortedDates = Object.keys(dailyFeeding).sort();
            labels = sortedDates.map(date => formatDate(date, false)); // false for MM-DD
            data = sortedDates.map(date => dailyFeeding[date].totalAmount); // 分析總量

            if (data.length > 0) {
                const totalAmountSum = data.reduce((a,b) => a+b, 0);
                const totalDays = data.length;
                summaryStats['總餵食量'] = `${totalAmountSum.toFixed(1)} ${dailyFeeding[sortedDates[0]]?.unit || 'ml'}`;
                summaryStats['平均每日餵食量'] = `${(totalAmountSum / totalDays).toFixed(1)} ${dailyFeeding[sortedDates[0]]?.unit || 'ml'}`;
                summaryStats['總餵食次數'] = Object.values(dailyFeeding).reduce((sum, day) => sum + day.count, 0);
            } else {
                summaryStats['數據'] = '不足';
            }


        } else if (type === 'sleep') {
            // 睡眠分析: 每日總睡眠時長
            const dailySleep = {}; // { 'YYYY-MM-DD': totalDurationMs }
            const { startDate, endDate } = getDateRange(range);

            records.forEach(r => {
                const recordStartDate = new Date(r.startTime);
                 // 考慮睡眠記錄可能跨天，這裡簡化為以開始日期為準
                if (recordStartDate >= startDate && recordStartDate <= endDate) {
                    const dateStr = r.startTime.slice(0, 10);
                    if (!dailySleep[dateStr]) dailySleep[dateStr] = 0;
                    if (r.duration) dailySleep[dateStr] += durationToMilliseconds(r.duration);
                }
            });

            const sortedDates = Object.keys(dailySleep).sort();
            labels = sortedDates.map(date => formatDate(date, false));
            data = sortedDates.map(date => parseFloat((dailySleep[date] / (1000 * 60 * 60)).toFixed(1))); // 轉換為小時

            if (data.length > 0) {
                const totalSleepHours = data.reduce((a,b) => a+b, 0);
                const totalDays = data.length;
                summaryStats['總睡眠時長'] = `${totalSleepHours.toFixed(1)} 小時`;
                summaryStats['平均每日睡眠'] = `${(totalSleepHours / totalDays).toFixed(1)} 小時`;
            } else {
                summaryStats['數據'] = '不足';
            }
        } else if (type === 'mood') {
            // 情緒分析: 各種情緒出現次數 (柱狀圖)
            const moodCounts = {}; // { '開心': 5, '哭鬧': 3 }
            const { startDate, endDate } = getDateRange(range);

            records.forEach(r => {
                 const recordDate = new Date(r.timestamp);
                if (recordDate >= startDate && recordDate <= endDate) {
                    if (!moodCounts[r.state]) moodCounts[r.state] = 0;
                    moodCounts[r.state]++;
                }
            });
            labels = Object.keys(moodCounts);
            data = Object.values(moodCounts);

            if (labels.length > 0) {
                let mostFrequentMood = '';
                let maxCount = 0;
                for(const mood in moodCounts) {
                    if (moodCounts[mood] > maxCount) {
                        maxCount = moodCounts[mood];
                        mostFrequentMood = mood;
                    }
                }
                summaryStats['最常出現情緒'] = `${mostFrequentMood} (${maxCount}次)`;
                summaryStats['總記錄次數'] = data.reduce((a,b) => a+b, 0);
            } else {
                 summaryStats['數據'] = '不足';
            }
        }


        // 填充缺失日期 (適用於折線圖)
        if ((type === 'feeding' || type === 'sleep') && labels.length > 0) {
            const { startDate, endDate } = getDateRange(range);
            const fullDateRange = [];
            let currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                fullDateRange.push(currentDate.toISOString().slice(0,10));
                currentDate.setDate(currentDate.getDate() + 1);
            }

            const filledLabels = fullDateRange.map(d => formatDate(d, false));
            const filledData = fullDateRange.map(dateStr => {
                const originalDateStr = Object.keys(labels.reduce((acc, label, i) => { // 將 MM-DD 轉回 YYYY-MM-DD 查找
                    const parts = label.split('-'); // MM-DD
                    const year = new Date().getFullYear(); // 假設是當年，或從 rangeStartDate 獲取年份
                    // 這裡需要更可靠的方式從 MM-DD 和 range 確定 YYYY-MM-DD
                    // 為了簡化，我們假設 labels 中的日期是唯一的並且可以直接匹配
                    // 這部分需要改進以處理跨年等情況
                    const originalLabelIndex = labels.findIndex(l => l === formatDate(dateStr, false));
                    return originalLabelIndex !== -1 ? data[originalLabelIndex] : 0;
                }, dateStr))[0]; // 這裡的邏輯需要修正，目前是簡化版
                
                const index = labels.findIndex(l => {
                    // 嘗試將 MM-DD 格式的 label 轉換回 YYYY-MM-DD 以便比較
                    // 這是一個簡化的匹配，可能不完美
                    const [month, day] = l.split('-');
                    const year = new Date(dateStr).getFullYear(); // 從完整日期中獲取年份
                    return `${String(year).slice(2)}-${month}-${day}` === `${String(new Date(dateStr).getFullYear()).slice(2)}-${formatDate(dateStr,false)}`;
                });

                // 更簡單的填充方式：如果 labels 是 YYYY-MM-DD 格式
                // const index = labels.indexOf(dateStr);
                // return index !== -1 ? data[index] : 0;

                // 由於 labels 已經是 MM-DD，我們需要找到對應的 data
                const formattedDateStr = formatDate(dateStr, false); // MM-DD
                const labelIndex = labels.indexOf(formattedDateStr);
                return labelIndex !== -1 ? data[labelIndex] : 0;
            });
            return { labels: filledLabels, data: filledData, summaryStats };
        }


        return { labels, data, summaryStats };
    }
    
    function getDateRange(rangeType) {
        const endDate = new Date();
        const startDate = new Date();
        switch (rangeType) {
            case 'week':
                startDate.setDate(endDate.getDate() - 6); // 包括今天共7天
                break;
            case 'month':
                startDate.setMonth(endDate.getMonth() - 1);
                startDate.setDate(startDate.getDate() + 1); // 使其為整一個月前的今天
                break;
            case 'quarter':
                startDate.setMonth(endDate.getMonth() - 3);
                startDate.setDate(startDate.getDate() + 1);
                break;
            case 'year':
                startDate.setFullYear(endDate.getFullYear() - 1);
                startDate.setDate(startDate.getDate() + 1);
                break;
            default: // 默認為 week
                startDate.setDate(endDate.getDate() - 6);
        }
        return { startDate, endDate };
    }


    function renderSummaryStats(stats) {
        statsContainerEl.innerHTML = '';
        if (Object.keys(stats).length === 0 || stats['數據'] === '不足') {
            statsContainerEl.innerHTML = '<p class="text-center text-light">此範圍內數據不足以生成摘要。</p>';
            return;
        }
        for (const [label, value] of Object.entries(stats)) {
            const statItem = document.createElement('div');
            statItem.className = 'stats-item';
            statItem.innerHTML = `
                <div class="stats-label">${escapeHTML(label)}</div>
                <div class="stats-value">${escapeHTML(String(value))}</div>
            `;
            statsContainerEl.appendChild(statItem);
        }
    }


    // --- 設定 ---
    function bindSettingsEvents() {
        darkModeToggle.addEventListener('change', () => {
            // themeToggle click handler already manages theme state and localStorage
            // This just syncs the toggle state if changed from settings page
            const currentThemeIsDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (darkModeToggle.checked !== currentThemeIsDark) {
                toggleTheme(); // Call the main theme toggle function
            }
        });

        languageSelect.addEventListener('change', (e) => {
            state.settings.language = e.target.value;
            saveData();
            showToast(`語言已切換為 ${e.target.options[e.target.selectedIndex].text} (功能待實現)`, 'info');
            // 實際的語言切換需要重新渲染所有文本內容，這裡僅保存設定
        });

        // 通知開關 (僅UI，無實際功能)
        document.getElementById('feedingNotifications')?.addEventListener('change', (e) => {
            state.settings.notifications.feeding = e.target.checked;
            saveData();
        });
        document.getElementById('sleepNotifications')?.addEventListener('change', (e) => {
            state.settings.notifications.sleep = e.target.checked;
            saveData();
        });


        exportDataBtn.addEventListener('click', exportData);
        importDataBtn.addEventListener('click', () => importFileInput.click());
        importFileInput.addEventListener('change', importData);
        clearDataBtn.addEventListener('click', () => {
            openConfirmationModal('確認清除所有數據', '您確定要清除所有寶寶的數據嗎？此操作無法復原！', () => {
                localStorage.clear(); // 清除所有 localStorage 數據
                // 重置狀態為初始狀態
                state = {
                    theme: 'light', // 保留主題或也重置
                    babies: [],
                    currentBabyId: null,
                    records: { feeding: [], sleep: [], diaper: [], activity: [], health: [], mood: [] },
                    milestones: [],
                    memories: [],
                    settings: { language: 'zh-TW', notifications: { feeding: true, sleep: true } }
                };
                // 重新初始化應用
                init();
                showToast('所有數據已清除！', 'success');
                navigateToPage('#dashboard'); // 返回儀表板
            });
        });
    }

    function exportData() {
        const dataToExport = {
            babies: state.babies,
            currentBabyId: state.currentBabyId,
            records: state.records,
            milestones: state.milestones,
            memories: state.memories,
            settings: state.settings
        };
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `寶貝成長紀錄_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('數據已匯出！', 'success');
    }

    function importData(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    // 驗證導入的數據結構 (可選但推薦)
                    if (importedData.babies && importedData.records) {
                        openConfirmationModal('確認匯入數據', '這將會覆蓋現有的所有數據，確定要匯入嗎？', () => {
                            state.babies = importedData.babies || [];
                            state.currentBabyId = importedData.currentBabyId || (state.babies.length > 0 ? state.babies[0].id : null);
                            state.records = importedData.records || { feeding: [], sleep: [], diaper: [], activity: [], health: [], mood: [] };
                            state.milestones = importedData.milestones || [];
                            state.memories = importedData.memories || [];
                            state.settings = importedData.settings || { language: 'zh-TW', notifications: { feeding: true, sleep: true } };
                            
                            saveData();
                            init(); // 重新初始化以應用數據
                            showToast('數據匯入成功！', 'success');
                            navigateToPage('#dashboard');
                        });
                    } else {
                        showToast('匯入失敗：文件格式不正確。', 'error');
                    }
                } catch (error) {
                    showToast(`匯入失敗：${error.message}`, 'error');
                    console.error("導入錯誤:", error);
                } finally {
                    importFileInput.value = ''; // 重置文件輸入
                }
            };
            reader.readAsText(file);
        }
    }

    function openConfirmationModal(title, message, onConfirm) {
        const content = `<p>${message}</p>`;
        const footer = `
            <button type="button" class="btn btn-secondary" data-dismiss="modal">取消</button>
            <button type="button" id="confirmActionBtn" class="btn btn-danger">確定</button>
        `;
        const modalElement = openModal(title, content, footer);
        modalElement.querySelector('#confirmActionBtn').addEventListener('click', () => {
            onConfirm();
            closeModal(modalElement);
        });
    }


    // --- 輔助函數 ---
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function formatTimestamp(isoString, showTimeOnly = false) {
        if (!isoString) return 'N/A';
        const date = new Date(isoString);
        if (isNaN(date)) return '無效日期';

        if (showTimeOnly) {
            return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        }
        return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    
    function formatDate(isoOrDateString, short = true) { // short for MM-DD
        if (!isoOrDateString) return 'N/A';
        const date = new Date(isoOrDateString);
         if (isNaN(date)) return '無效日期';
        if (short) {
            return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        }
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }


    function formatISOToDateTimeLocal(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        // 校正時區偏移
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() - userTimezoneOffset);
        return localDate.toISOString().slice(0, 16);
    }
    
    function formatDuration(ms, useColonFormat = false) { // useColonFormat for HH:MM:SS
        if (ms < 0) ms = 0;
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (useColonFormat) {
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        let str = '';
        if (hours > 0) str += `${hours}h `;
        if (minutes > 0) str += `${minutes}m `;
        if (hours === 0 && minutes === 0 || seconds > 0) str += `${seconds}s`; // 即使只有秒數也顯示
        return str.trim() || '0s'; // 避免空字串
    }

    function durationToMilliseconds(durationStr) { // "1h 30m" or "90m" or "1h30m0s" or "PT1H30M" (ISO-like)
        if (!durationStr) return 0;
        if (typeof durationStr === 'number') return durationStr; // Already ms

        let totalMs = 0;
        const durationRegex = /(\d+)\s*(h|hr|小時|hour)?\s*(\d+)?\s*(m|min|分鐘|minute)?\s*(\d+)?\s*(s|sec|秒|second)?/i;
        const simpleMinutesRegex = /^(\d+)$/; // Only numbers, assume minutes

        let match = durationStr.match(durationRegex);
        if (match) {
            const hours = parseInt(match[1]) || 0;
            const minutes = parseInt(match[3]) || 0;
            const seconds = parseInt(match[5]) || 0;
            
            // Check if the first number was actually hours or minutes based on suffix
            if (match[2]) { // h, hr, 小時, hour
                 totalMs += hours * 3600 * 1000;
                 totalMs += minutes * 60 * 1000; // if '30m' followed '1h'
                 totalMs += seconds * 1000;
            } else if (match[4]) { // m, min, 分鐘, minute (and no hour part before it)
                totalMs += hours * 60 * 1000; // first number was minutes
                totalMs += minutes * 1000; // if '30s' followed '1m'
            } else if (match[6]) { // s, sec, 秒, second (and no hour/min part before it)
                 totalMs += hours * 1000; // first number was seconds
            } else if (!match[2] && !match[4] && !match[6] && hours > 0 && !minutes && !seconds) {
                // Only a number, assume minutes if no suffix
                 totalMs += hours * 60 * 1000;
            }


        } else if (simpleMinutesRegex.test(durationStr)) {
             totalMs = parseInt(durationStr) * 60 * 1000; // Assume minutes if just a number
        } else {
            // Fallback for simple "Xh Ym Zs" without spaces or mixed
            const hMatch = durationStr.match(/(\d+)h/i);
            const mMatch = durationStr.match(/(\d+)m/i);
            const sMatch = durationStr.match(/(\d+)s/i);
            if (hMatch) totalMs += parseInt(hMatch[1]) * 3600 * 1000;
            if (mMatch) totalMs += parseInt(mMatch[1]) * 60 * 1000;
            if (sMatch) totalMs += parseInt(sMatch[1]) * 1000;
        }
        
        // If still 0, try parsing "XhYmZs" format
        if (totalMs === 0) {
            let h = 0, m = 0, s = 0;
            const parts = durationStr.toLowerCase().match(/(\d+h)?(\d+m)?(\d+s)?/);
            if(parts){
                if(parts[1]) h = parseInt(parts[1].replace('h', ''));
                if(parts[2]) m = parseInt(parts[2].replace('m', ''));
                if(parts[3]) s = parseInt(parts[3].replace('s', ''));
                totalMs = (h * 3600 + m * 60 + s) * 1000;
            }
        }


        return totalMs;
    }
    
    function parseDurationInput(inputStr) { // "1h 30m" or "90" (minutes) -> "Xh Ym Zs"
        if (!inputStr) return null;
        const justDigits = /^\d+$/;
        if (justDigits.test(inputStr)) { // If just a number, assume minutes
            const minutes = parseInt(inputStr);
            return formatDuration(minutes * 60 * 1000);
        }
        // Otherwise, assume it's already in a parseable format like "1h 30m"
        // We can re-format it to ensure consistency
        const ms = durationToMilliseconds(inputStr);
        return formatDuration(ms);
    }

    function formatDurationForInput(durationStr) { // "1h 30m 0s" -> "1h 30m" or "90" (if only minutes)
        if (!durationStr) return '';
        const ms = durationToMilliseconds(durationStr);
        const totalMinutes = Math.floor(ms / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
        if (hours > 0 && minutes === 0) return `${hours}h`;
        if (hours === 0 && minutes > 0) return `${minutes}m`; // or just minutes as number: String(minutes)
        if (ms > 0 && totalMinutes === 0) return `${Math.floor(ms/1000)}s`; // if less than a minute
        return '';
    }


    function getRecordTypeName(type) {
        const names = {
            feeding: '餵食記錄', sleep: '睡眠記錄', diaper: '排泄記錄',
            activity: '活動記錄', health: '健康記錄', mood: '情緒行為'
        };
        return names[type] || '記錄';
    }

    function getRecordTypeIcon(type) {
        const icons = {
            feeding: '🍼', sleep: '😴', diaper: '🚽',
            activity: '🎯', health: '🏥', mood: '😊'
        };
        return icons[type] || '📝';
    }
    
    function getRecordTypeColorVar(type) {
        const colors = { // CSS variable names for border colors
            feeding: '--error-color', // Example, can be customized
            sleep: '--secondary-color',
            diaper: '--info-color',
            activity: '--success-color',
            health: '--warning-color', // Using warning for health
            mood: '--accent-color'
        };
        return colors[type];
    }


    function getMemoryTypeName(type) {
        const names = {
            daily: '每日亮點', story: '成長故事', photo: '照片日記',
            quote: '語錄收集', first: '第一次', other: '其他'
        };
        return names[type] || '記憶';
    }

    function getAnalyticsChartTitle(type) {
        const titles = {
            feeding: '餵食分析', sleep: '睡眠分析', growth: '成長分析', mood: '情緒分析'
        };
        return titles[type] || '數據分析';
    }
    
    function translateGender(gender) {
        if (gender === 'Male') return '男孩';
        if (gender === 'Female') return '女孩';
        if (gender === 'Other') return '其他';
        return gender;
    }

    function escapeHTML(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/[&<>"']/g, function (match) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[match];
        });
    }


    // --- 啟動應用程式 ---
    init();
});

