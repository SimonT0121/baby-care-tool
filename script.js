// 核心資料模型
const appData = {
    children: [],        // 兒童資料
    selectedChild: null, // 當前選中的兒童
    records: {},         // 各類型記錄
    growthData: {},      // 成長記錄
    medicines: {},       // 藥物記錄 
    reminders: {},       // 提醒事項
    sleepStartTime: null // 睡眠計時器
};

// 初始化應用程式
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    initEventListeners();
    setCurrentDateTime();
    updateChildSelector();
    checkSelectedChild();
    checkOngoingSleep();
    checkAndUpdateReminders();
    
    // 設置定時檢查提醒
    setInterval(checkAndUpdateReminders, 60000); // 每分鐘檢查一次
});

// 載入資料
function loadData() {
    // 載入兒童資料
    const savedChildren = localStorage.getItem('children');
    if (savedChildren) {
        appData.children = JSON.parse(savedChildren);
    }
    
    // 載入選中的兒童
    const selectedChildId = localStorage.getItem('selectedChild');
    if (selectedChildId) {
        appData.selectedChild = selectedChildId;
        loadChildData(selectedChildId);
    }
    
    // 載入睡眠計時器狀態
    const sleepTimer = localStorage.getItem('sleepTimer');
    if (sleepTimer) {
        appData.sleepStartTime = JSON.parse(sleepTimer);
    }
    
    // 載入提醒資料
    const reminders = localStorage.getItem('reminders');
    if (reminders) {
        appData.reminders = JSON.parse(reminders);
    } else {
        appData.reminders = {};
        saveReminders();
    }
    
    // 載入藥物資料
    const medicines = localStorage.getItem('medicines');
    if (medicines) {
        appData.medicines = JSON.parse(medicines);
    } else {
        appData.medicines = {};
        saveMedicines();
    }
    
    // 載入成長資料
    const growthData = localStorage.getItem('growthData');
    if (growthData) {
        appData.growthData = JSON.parse(growthData);
    } else {
        appData.growthData = {};
        saveGrowthData();
    }
}

// 載入特定兒童的記錄資料
function loadChildData(childId) {
    if (!childId) return;
    
    const records = localStorage.getItem(`records_${childId}`);
    if (records) {
        appData.records[childId] = JSON.parse(records);
    } else {
        appData.records[childId] = [];
    }
    
    // 確保數據結構存在
    if (!appData.medicines[childId]) {
        appData.medicines[childId] = [];
    }
    
    if (!appData.growthData[childId]) {
        appData.growthData[childId] = [];
    }
    
    if (!appData.reminders[childId]) {
        appData.reminders[childId] = [];
    }
}

// 儲存資料的通用函數
function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// 儲存兒童資料
function saveChildren() {
    saveData('children', appData.children);
}

// 儲存記錄資料
function saveRecords(childId) {
    saveData(`records_${childId}`, appData.records[childId]);
}

// 儲存提醒資料
function saveReminders() {
    saveData('reminders', appData.reminders);
}

// 儲存藥物資料
function saveMedicines() {
    saveData('medicines', appData.medicines);
}

// 儲存成長資料
function saveGrowthData() {
    saveData('growthData', appData.growthData);
}

// 儲存睡眠計時器狀態
function saveSleepTimer() {
    saveData('sleepTimer', appData.sleepStartTime);
}

// 初始化事件監聽器
function initEventListeners() {
    // 頂部標籤頁切換
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchTab(this.getAttribute('data-tab'));
        });
    });
    
    // 底部導航切換
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.addEventListener('click', function() {
            switchTab(this.getAttribute('data-tab'));
        });
    });
    
    // 兒童選擇器變更
    document.getElementById('childSelect').addEventListener('change', function() {
        if (this.value) {
            appData.selectedChild = this.value;
            localStorage.setItem('selectedChild', this.value);
            loadChildData(this.value);
            updateChildInfo();
            updateAllTabs();
        } else {
            appData.selectedChild = null;
            localStorage.removeItem('selectedChild');
            updateChildInfo();
        }
    });
    
    // 新增兒童按鈕
    document.getElementById('addChildBtn').addEventListener('click', showAddChildModal);
    
    // 儲存兒童按鈕
    document.getElementById('saveChildBtn').addEventListener('click', saveChild);
    
    // 記錄類型選擇器
    document.querySelectorAll('.record-type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchRecordForm(this.getAttribute('data-record-type'));
        });
    });
    
    // 各表單儲存按鈕
    document.getElementById('saveFeedingBtn').addEventListener('click', saveFeeding);
    document.getElementById('saveSleepBtn').addEventListener('click', saveSleep);
    document.getElementById('saveDiaperBtn').addEventListener('click', saveDiaper);
    document.getElementById('saveOtherBtn').addEventListener('click', saveOther);
    
    // 歷史記錄日期選擇和過濾
    document.getElementById('historyDate').addEventListener('change', updateHistoryContent);
    document.getElementById('historyFilter').addEventListener('change', updateHistoryContent);
    
    // 統計時段選擇
    document.querySelectorAll('.stats-period-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.stats-period-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            updateStatsCharts(this.getAttribute('data-period'));
        });
    });
    
    // 藥物管理標籤功能
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabContent = this.getAttribute('data-tab-content');
            
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.tab-content-section').forEach(section => {
                section.style.display = 'none';
            });
            document.getElementById(tabContent).style.display = 'block';
        });
    });
    
    // 保存藥物按鈕
    document.getElementById('saveMedicineBtn').addEventListener('click', saveMedicine);
    
    // 保存成長記錄
    document.getElementById('saveGrowthBtn').addEventListener('click', saveGrowthRecord);
    
    // 新增提醒按鈕
    document.getElementById('addReminderBtn').addEventListener('click', showAddReminderModal);
    
    // 儲存提醒按鈕
    document.getElementById('saveReminderBtn').addEventListener('click', saveReminder);
    
    // 刪除兒童按鈕
    document.getElementById('deleteChildBtn').addEventListener('click', function() {
        if (!appData.selectedChild) {
            showToast('請先選擇一位兒童');
            return;
        }
        
        const child = appData.children.find(c => c.id === appData.selectedChild);
        if (!child) return;
        
        document.getElementById('deleteChildName').textContent = child.name;
        showModal('deleteChildModal');
    });
    
    // 確認刪除兒童按鈕
    document.getElementById('confirmDeleteChildBtn').addEventListener('click', deleteSelectedChild);
    
    // 模態框關閉按鈕事件
    document.querySelectorAll('.modal-close, #cancelAddChildBtn, #cancelAddReminderBtn, #cancelDeleteChildBtn').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });
    
    // 睡眠計時器徽章
    document.getElementById('sleepTimerBadge').addEventListener('click', function() {
        if (confirm('是否結束記錄睡眠？')) {
            endSleepTimer();
        }
    });
    
    // 點擊遮罩關閉模態框
    document.getElementById('overlay').addEventListener('click', closeModals);
    
    // 防止模態框內容點擊穿透
    document.querySelectorAll('.modal-content').forEach(content => {
        content.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });
}

// 切換標籤頁
function switchTab(tabId) {
    // 更新標籤和內容狀態
    document.querySelectorAll('.nav-tab, .bottom-nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // 激活選中的標籤
    document.querySelectorAll(`.nav-tab[data-tab="${tabId}"], .bottom-nav-item[data-tab="${tabId}"]`).forEach(item => item.classList.add('active'));
    document.getElementById(tabId + 'Tab').classList.add('active');
    
    // 更新對應標籤頁內容
    updateTabContent(tabId);
}

// 切換記錄表單
function switchRecordForm(formType) {
    document.querySelectorAll('.record-type-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.record-form').forEach(form => form.classList.remove('active'));
    
    document.querySelector(`.record-type-btn[data-record-type="${formType}"]`).classList.add('active');
    document.getElementById(formType + 'Form').classList.add('active');
}

// 設置當前日期時間
function setCurrentDateTime() {
    const now = new Date();
    const isoString = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    
    // 設置各表單的日期時間欄位
    document.getElementById('feedingTime').value = isoString;
    document.getElementById('sleepStart').value = isoString;
    document.getElementById('sleepEnd').value = isoString;
    document.getElementById('diaperTime').value = isoString;
    document.getElementById('otherTime').value = isoString;
    
    // 設置歷史日期為今天
    document.getElementById('historyDate').value = now.toISOString().split('T')[0];
    
    // 設置成長記錄日期為今天
    document.getElementById('growthDate').value = now.toISOString().split('T')[0];
    
    // 設置藥物開始日期為今天
    document.getElementById('medicineStartDate').value = now.toISOString().split('T')[0];
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '';
    const datePart = dateString.split('T')[0];
    return datePart.replace(/-/g, '/');
}

// 格式化日期時間
function formatDateTime(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// 格式化時間
function formatTime(dateTimeStr) {
    if (!dateTimeStr) return '';
    
    const date = new Date(dateTimeStr);
    return date.toTimeString().slice(0, 5); // 格式為 "HH:MM"
}

// 計算兩個日期時間之間的時間差
function calculateTimeDifference(startDate, endDate) {
    const diffMs = new Date(endDate) - new Date(startDate);
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
        hours: diffHours,
        minutes: diffMinutes,
        totalMinutes: diffHours * 60 + diffMinutes
    };
}

// 獲取日期範圍內的所有日期
function getDatesInRange(startDate, endDate) {
    const dates = [];
    let currentDate = new Date(startDate);
    
    // 設定為當天的開始時間
    currentDate.setHours(0, 0, 0, 0);
    
    const lastDate = new Date(endDate);
    lastDate.setHours(0, 0, 0, 0);
    
    while (currentDate <= lastDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
}

// 更新兒童選擇器
function updateChildSelector() {
    const childSelect = document.getElementById('childSelect');
    childSelect.innerHTML = '<option value="">選擇兒童</option>';
    
    appData.children.forEach(child => {
        const option = document.createElement('option');
        option.value = child.id;
        option.textContent = child.name;
        
        if (child.id === appData.selectedChild) {
            option.selected = true;
        }
        
        childSelect.appendChild(option);
    });
}

// 計算年齡
function calculateAge(birthday) {
    const birthDate = new Date(birthday);
    const now = new Date();
    
    let years = now.getFullYear() - birthDate.getFullYear();
    let months = now.getMonth() - birthDate.getMonth();
    
    if (months < 0) {
        years--;
        months += 12;
    }
    
    if (years > 0) {
        return `${years}歲${months > 0 ? months + '個月' : ''}`;
    } else {
        return `${months}個月`;
    }
}

// 檢查是否已選擇兒童
function checkSelectedChild() {
    const childInfoElements = document.querySelectorAll('[id$="ChildInfo"]');
    const formElements = document.querySelectorAll('input, textarea, select, button[id^="save"]');
    const addButtons = document.querySelectorAll('#addReminderBtn, #saveGrowthBtn, #saveMedicineBtn');
    
    if (!appData.selectedChild) {
        // 未選擇兒童時禁用表單和按鈕
        childInfoElements.forEach(el => {
            el.textContent = '請先選擇或新增一位兒童';
        });
        
        formElements.forEach(input => {
            if (input.id !== 'childSelect' && 
                input.id !== 'childName' && 
                input.id !== 'childBirthday' && 
                input.id !== 'childGender' && 
                input.id !== 'saveChildBtn' && 
                input.id !== 'cancelAddChildBtn' && 
                !input.classList.contains('modal-close')) {
                input.disabled = true;
            }
        });
        
        addButtons.forEach(btn => btn.disabled = true);
    } else {
        // 已選擇兒童時啟用表單和按鈕
        const selectedChild = appData.children.find(child => child.id === appData.selectedChild);
        
        childInfoElements.forEach(el => {
            el.textContent = `選擇的兒童: ${selectedChild.name} (${calculateAge(selectedChild.birthday)})`;
        });
        
        formElements.forEach(input => {
            input.disabled = false;
        });
        
        addButtons.forEach(btn => btn.disabled = false);
    }
}

// 更新兒童資訊
function updateChildInfo() {
    checkSelectedChild();
}

// 更新所有標籤頁內容
function updateAllTabs() {
    updateHistoryContent();
    updateReminderList();
    updateStatsCharts('week');
    updateMedicineList();
    updateGrowthRecords();
}

// 根據標籤ID更新標籤頁內容
function updateTabContent(tabId) {
    switch (tabId) {
        case 'history':
            updateHistoryContent();
            break;
        case 'reminder':
            updateReminderList();
            break;
        case 'stats':
            updateStatsCharts(document.querySelector('.stats-period-btn.active').getAttribute('data-period'));
            break;
        case 'medicine':
            document.getElementById('medicineList').style.display = 'block';
            document.getElementById('medicineAdd').style.display = 'none';
            document.querySelectorAll('.tab').forEach(tab => {
                if (tab.getAttribute('data-tab-content') === 'medicineList') {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
            updateMedicineList();
            break;
        case 'growth':
            updateGrowthRecords();
            break;
    }
}

// 顯示新增兒童模態框
function showAddChildModal() {
    document.getElementById('childName').value = '';
    document.getElementById('childBirthday').value = '';
    document.getElementById('childGender').value = '男';
    
    showModal('addChildModal');
}

// 顯示新增提醒模態框
function showAddReminderModal() {
    document.getElementById('reminderTitle').value = '';
    document.getElementById('reminderMessage').value = '';
    
    // 設置當前時間
    const now = new Date();
    document.getElementById('reminderTime').value = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    
    showModal('addReminderModal');
}

// 顯示模態框的通用函數
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

// 關閉模態框
function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    
    document.getElementById('overlay').classList.remove('active');
}

// 顯示通知
function showToast(message) {
    const toast = document.getElementById('toastNotification');
    document.getElementById('toastMessage').textContent = message;
    
    toast.classList.add('active');
    
    // 自動隱藏
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

// 儲存兒童資料
function saveChild() {
    const name = document.getElementById('childName').value.trim();
    const birthday = document.getElementById('childBirthday').value;
    const gender = document.getElementById('childGender').value;
    
    if (!name) {
        showToast('請輸入兒童姓名');
        return;
    }
    
    if (!birthday) {
        showToast('請選擇出生日期');
        return;
    }
    
    const child = {
        id: 'child_' + Date.now(),
        name: name,
        birthday: birthday,
        gender: gender,
        dateAdded: new Date().toISOString()
    };
    
    appData.children.push(child);
    saveChildren();
    
    // 選擇新增的兒童
    appData.selectedChild = child.id;
    localStorage.setItem('selectedChild', child.id);
    
    // 初始化此兒童的數據結構
    loadChildData(child.id);
    
    updateChildSelector();
    updateChildInfo();
    updateAllTabs();
    
    closeModals();
    showToast('兒童資料已儲存');
}

// 刪除選擇的兒童
function deleteSelectedChild() {
    if (!appData.selectedChild) return;
    
    // 從兒童列表中刪除
    appData.children = appData.children.filter(c => c.id !== appData.selectedChild);
    saveChildren();
    
    // 刪除與此兒童相關的所有資料
    localStorage.removeItem(`records_${appData.selectedChild}`);
    
    // 從提醒中刪除
    delete appData.reminders[appData.selectedChild];
    saveReminders();
    
    // 從藥物中刪除
    delete appData.medicines[appData.selectedChild];
    saveMedicines();
    
    // 從成長數據中刪除
    delete appData.growthData[appData.selectedChild];
    saveGrowthData();
    
    // 重置選擇
    appData.selectedChild = null;
    localStorage.removeItem('selectedChild');
    
    // 如果還有其他兒童，選擇第一個
    if (appData.children.length > 0) {
        appData.selectedChild = appData.children[0].id;
        localStorage.setItem('selectedChild', appData.children[0].id);
        loadChildData(appData.children[0].id);
    }
    
    updateChildSelector();
    updateChildInfo();
    updateAllTabs();
    
    closeModals();
    showToast('兒童資料已刪除');
}

// 保存餵食記錄
function saveFeeding() {
    if (!appData.selectedChild) {
        showToast('請先選擇一位兒童');
        return;
    }
    
    const type = document.getElementById('feedingType').value;
    const amount = document.getElementById('feedingAmount').value;
    const unit = document.getElementById('feedingUnit').value;
    const time = document.getElementById('feedingTime').value;
    const note = document.getElementById('feedingNote').value.trim();
    
    if (!amount) {
        showToast('請輸入餵食量');
        return;
    }
    
    if (!time) {
        showToast('請選擇時間');
        return;
    }
    
    const record = {
        id: 'record_' + Date.now(),
        type: 'feeding',
        feedingType: type,
        amount: amount,
        unit: unit,
        date: time,
        time: time,
        note: note
    };
    
    // 添加記錄
    if (!appData.records[appData.selectedChild]) {
        appData.records[appData.selectedChild] = [];
    }
    
    appData.records[appData.selectedChild].push(record);
    saveRecords(appData.selectedChild);
    
    showToast('餵食記錄已儲存');
    
    // 重置表單
    document.getElementById('feedingAmount').value = '';
    document.getElementById('feedingNote').value = '';
    setCurrentDateTime();
    
    // 更新顯示
    updateHistoryContent();
}

// 保存睡眠記錄
function saveSleep() {
    if (!appData.selectedChild) {
        showToast('請先選擇一位兒童');
        return;
    }
    
    const start = document.getElementById('sleepStart').value;
    const end = document.getElementById('sleepEnd').value;
    const note = document.getElementById('sleepNote').value.trim();
    
    if (!start) {
        showToast('請選擇開始時間');
        return;
    }
    
    if (!end) {
        showToast('請選擇結束時間');
        return;
    }
    
    // 驗證開始時間早於結束時間
    if (new Date(start) >= new Date(end)) {
        showToast('結束時間必須晚於開始時間');
        return;
    }
    
    // 計算睡眠時長
    const duration = calculateTimeDifference(start, end);
    
    const record = {
        id: 'record_' + Date.now(),
        type: 'sleep',
        start: start,
        end: end,
        duration: {
            hours: duration.hours,
            minutes: duration.minutes,
            totalMinutes: duration.totalMinutes
        },
        date: start,
        time: start,
        note: note
    };
    
    // 添加記錄
    if (!appData.records[appData.selectedChild]) {
        appData.records[appData.selectedChild] = [];
    }
    
    appData.records[appData.selectedChild].push(record);
    saveRecords(appData.selectedChild);
    
    showToast('睡眠記錄已儲存');
    
    // 重置表單
    document.getElementById('sleepNote').value = '';
    setCurrentDateTime();
    
    // 重置睡眠計時器
    appData.sleepStartTime = null;
    saveSleepTimer();
    document.getElementById('sleepTimerBadge').classList.remove('active');
    
    // 更新顯示
    updateHistoryContent();
}

// 保存尿布記錄
function saveDiaper() {
    if (!appData.selectedChild) {
        showToast('請先選擇一位兒童');
        return;
    }
    
    const urine = document.getElementById('diaperUrine').checked;
    const stool = document.getElementById('diaperStool').checked;
    const condition = document.getElementById('diaperCondition').value;
    const time = document.getElementById('diaperTime').value;
    const note = document.getElementById('diaperNote').value.trim();
    
    if (!urine && !stool) {
        showToast('請至少選擇一種排泄類型');
        return;
    }
    
    if (!time) {
        showToast('請選擇時間');
        return;
    }
    
    const record = {
        id: 'record_' + Date.now(),
        type: 'diaper',
        urine: urine,
        stool: stool,
        condition: condition,
        date: time,
        time: time,
        note: note
    };
    
    // 添加記錄
    if (!appData.records[appData.selectedChild]) {
        appData.records[appData.selectedChild] = [];
    }
    
    appData.records[appData.selectedChild].push(record);
    saveRecords(appData.selectedChild);
    
    showToast('尿布記錄已儲存');
    
    // 重置表單
    document.getElementById('diaperNote').value = '';
    document.getElementById('diaperCondition').value = '正常';
    setCurrentDateTime();
    
    // 更新顯示
    updateHistoryContent();
}

// 保存其他記錄
function saveOther() {
    if (!appData.selectedChild) {
        showToast('請先選擇一位兒童');
        return;
    }
    
    const title = document.getElementById('otherTitle').value.trim();
    const time = document.getElementById('otherTime').value;
    const content = document.getElementById('otherContent').value.trim();
    
    if (!title) {
        showToast('請輸入標題');
        return;
    }
    
    if (!time) {
        showToast('請選擇時間');
        return;
    }
    
    if (!content) {
        showToast('請輸入內容');
        return;
    }
    
    const record = {
        id: 'record_' + Date.now(),
        type: 'other',
        title: title,
        content: content,
        date: time,
        time: time
    };
    
    // 添加記錄
    if (!appData.records[appData.selectedChild]) {
        appData.records[appData.selectedChild] = [];
    }
    
    appData.records[appData.selectedChild].push(record);
    saveRecords(appData.selectedChild);
    
    showToast('記錄已儲存');
    
    // 重置表單
    document.getElementById('otherTitle').value = '';
    document.getElementById('otherContent').value = '';
    setCurrentDateTime();
    
    // 更新顯示
    updateHistoryContent();
}

// 更新歷史記錄內容
function updateHistoryContent() {
    const historyContent = document.getElementById('historyContent');
    historyContent.innerHTML = '';
    
    if (!appData.selectedChild || !appData.records[appData.selectedChild] || 
        appData.records[appData.selectedChild].length === 0) {
        historyContent.innerHTML = '<p>沒有歷史記錄</p>';
        return;
    }
    
    // 獲取日期和過濾類型
    const selectedDate = document.getElementById('historyDate').value;
    const filterType = document.getElementById('historyFilter').value;
    
    // 過濾記錄
    let filteredRecords = [...appData.records[appData.selectedChild]];
    
    // 按日期過濾
    if (selectedDate) {
        filteredRecords = filteredRecords.filter(record => 
            record.date && record.date.startsWith(selectedDate)
        );
    }
    
    // 按類型過濾
    if (filterType !== 'all') {
        filteredRecords = filteredRecords.filter(record => 
            record.type === filterType
        );
    }
    
    // 如果沒有匹配的記錄
    if (filteredRecords.length === 0) {
        historyContent.innerHTML = '<p>沒有符合條件的記錄</p>';
        return;
    }
    
    // 按日期分組記錄
    const recordsByDate = {};
    
    filteredRecords.forEach(record => {
        const dateStr = record.date ? record.date.split('T')[0] : 'unknown';
        
        if (!recordsByDate[dateStr]) {
            recordsByDate[dateStr] = [];
        }
        
        recordsByDate[dateStr].push(record);
    });
    
    // 按日期遞減排序
    const sortedDates = Object.keys(recordsByDate).sort((a, b) => {
        return new Date(b) - new Date(a);
    });
    
    // 生成日期分組的記錄
    sortedDates.forEach(date => {
        const records = recordsByDate[date];
        
        // 排序記錄 (按時間遞減)
        records.sort((a, b) => {
            return new Date(b.time || b.date) - new Date(a.time || a.date);
        });
        
        // 創建日期分組
        const dayContainer = document.createElement('div');
        dayContainer.className = 'history-day';
        
        // 創建日期標頭
        const dayHeader = document.createElement('div');
        dayHeader.className = 'history-day-header';
        dayHeader.textContent = formatDate(date);
        
        // 創建記錄容器
        const recordsContainer = document.createElement('div');
        recordsContainer.className = 'history-records';
        
        // 添加記錄
        records.forEach(record => {
            const recordElement = createRecordElement(record);
            recordsContainer.appendChild(recordElement);
        });
        
        dayContainer.appendChild(dayHeader);
        dayContainer.appendChild(recordsContainer);
        historyContent.appendChild(dayContainer);
    });
}

// 創建記錄元素
function createRecordElement(record) {
    const recordElement = document.createElement('div');
    recordElement.className = 'history-record';
    recordElement.setAttribute('data-id', record.id);
    recordElement.setAttribute('data-type', record.type);
    
    // 獲取時間部分
    const timeStr = record.time ? new Date(record.time).toTimeString().slice(0, 5) : '';
    
    // 標題和內容
    let title = '';
    let content = '';
    
    switch (record.type) {
        case 'feeding':
            title = '餵食';
            content = `${record.feedingType} ${record.amount} ${record.unit}${record.note ? ` - ${record.note}` : ''}`;
            break;
        case 'sleep':
            title = '睡眠';
            const duration = record.duration ? `${record.duration.hours}小時${record.duration.minutes}分鐘` : '';
            content = `${formatTime(record.start)} - ${formatTime(record.end)} (${duration})${record.note ? ` - ${record.note}` : ''}`;
            break;
        case 'diaper':
            title = '尿布';
            const typeStr = (record.urine ? '小便' : '') + (record.urine && record.stool ? ' + ' : '') + (record.stool ? '大便' : '');
            content = `${typeStr} - ${record.condition}${record.note ? ` - ${record.note}` : ''}`;
            break;
        case 'growth':
            title = '成長測量';
            content = record.content || '';
            break;
        case 'medicine':
            title = '用藥記錄';
            content = record.content || '';
            break;
        case 'other':
            title = record.title || '其他';
            content = record.content || '';
            break;
    }
    
    // 創建記錄HTML
    recordElement.innerHTML = `
        <div class="history-record-time">${timeStr}</div>
        <div class="history-record-type">${title}</div>
        <div class="history-record-info">${content}</div>
        <div class="history-record-actions">
            <button class="btn btn-danger btn-delete-record" data-id="${record.id}">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    // 添加刪除按鈕事件
    recordElement.querySelector('.btn-delete-record').addEventListener('click', function(e) {
        e.stopPropagation();
        const recordId = this.getAttribute('data-id');
        if (confirm('確定要刪除此記錄嗎？')) {
            deleteRecord(recordId);
        }
    });
    
    return recordElement;
}

// 刪除記錄
function deleteRecord(recordId) {
    if (!appData.selectedChild || !appData.records[appData.selectedChild]) {
        return;
    }
    
    // 刪除記錄
    appData.records[appData.selectedChild] = appData.records[appData.selectedChild].filter(r => r.id !== recordId);
    saveRecords(appData.selectedChild);
    
    // 更新顯示
    updateHistoryContent();
    
    showToast('記錄已刪除');
}

// 保存提醒
function saveReminder() {
    if (!appData.selectedChild) {
        showToast('請先選擇一位兒童');
        closeModals();
        return;
    }
    
    const title = document.getElementById('reminderTitle').value.trim();
    const time = document.getElementById('reminderTime').value;
    const message = document.getElementById('reminderMessage').value.trim();
    
    if (!title) {
        showToast('請輸入提醒標題');
        return;
    }
    
    if (!time) {
        showToast('請選擇提醒時間');
        return;
    }
    
    // 創建提醒
    const reminder = {
        id: 'reminder_' + Date.now(),
        title: title,
        time: new Date(time).toISOString(),
        message: message,
        completed: false
    };
    
    // 添加提醒
    if (!appData.reminders[appData.selectedChild]) {
        appData.reminders[appData.selectedChild] = [];
    }
    
    appData.reminders[appData.selectedChild].push(reminder);
    saveReminders();
    
    closeModals();
    updateReminderList();
    
    showToast('提醒已儲存');
}

// 更新提醒列表
function updateReminderList() {
    const reminderList = document.getElementById('reminderList');
    if (!reminderList) return;
    
    reminderList.innerHTML = '';
    
    if (!appData.selectedChild || !appData.reminders[appData.selectedChild] || 
        appData.reminders[appData.selectedChild].length === 0) {
        reminderList.innerHTML = '<p>目前沒有提醒項目。</p>';
        return;
    }
    
    // 複製提醒列表並進行排序（按時間）
    let reminders = [...appData.reminders[appData.selectedChild]];
    
    // 排序提醒 (未完成的和未來的優先)
    reminders.sort((a, b) => {
        // 先按照完成狀態排序
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        
        // 然後按照時間排序
        const aTime = new Date(a.time);
        const bTime = new Date(b.time);
        
        // 對於未完成的提醒，未來的時間排在前面
        if (!a.completed) {
            return aTime - bTime;
        }
        
        // 對於已完成的提醒，最近完成的排在前面
        return bTime - aTime;
    });
    
    const now = new Date();
    
    // 生成提醒列表
    reminders.forEach(reminder => {
        const reminderTime = new Date(reminder.time);
        
        // 判斷提醒狀態
        let statusClass = '';
        let isExpired = false;
        
        if (reminder.completed) {
            statusClass = 'active';
        } else if (reminderTime < now) {
            statusClass = 'expired';
            isExpired = true;
        }
        
        // 創建提醒元素
        const reminderItem = document.createElement('div');
        reminderItem.className = `reminder-item ${statusClass}`;
        reminderItem.setAttribute('data-id', reminder.id);
        
        reminderItem.innerHTML = `
            <div class="reminder-info">
                <div class="reminder-title">${reminder.title}</div>
                <div class="reminder-time">${formatDateTime(reminderTime)} 
                ${isExpired ? '<span class="badge badge-warning">已過期</span>' : ''}
                </div>
                ${reminder.message ? `<div class="reminder-message">${reminder.message}</div>` : ''}
            </div>
            <div class="reminder-actions">
                ${!reminder.completed ? `
                    <button class="btn btn-success btn-complete-reminder">
                        <i class="fas fa-check"></i>
                    </button>
                ` : ''}
                <button class="btn btn-danger btn-delete-reminder">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        reminderList.appendChild(reminderItem);
    });
    
    // 添加按鈕事件
    document.querySelectorAll('.btn-complete-reminder').forEach(btn => {
        btn.addEventListener('click', function() {
            const reminderItem = this.closest('.reminder-item');
            const reminderId = reminderItem.getAttribute('data-id');
            completeReminder(reminderId);
        });
    });
    
    document.querySelectorAll('.btn-delete-reminder').forEach(btn => {
        btn.addEventListener('click', function() {
            const reminderItem = this.closest('.reminder-item');
            const reminderId = reminderItem.getAttribute('data-id');
            if (confirm('確定要刪除此提醒嗎？')) {
                deleteReminder(reminderId);
            }
        });
    });
}

// 完成提醒
function completeReminder(reminderId) {
    if (!appData.selectedChild || !appData.reminders[appData.selectedChild]) {
        return;
    }
    
    // 尋找提醒
    const reminderIndex = appData.reminders[appData.selectedChild].findIndex(r => r.id === reminderId);
    if (reminderIndex === -1) return;
    
    // 標記為已完成
    appData.reminders[appData.selectedChild][reminderIndex].completed = true;
    appData.reminders[appData.selectedChild][reminderIndex].completedTime = new Date().toISOString();
    
    // 保存提醒
    saveReminders();
    
    // 更新列表
    updateReminderList();
    
    // 顯示成功消息
    showToast('提醒已標記為完成');
}

// 刪除提醒
function deleteReminder(reminderId) {
    if (!appData.selectedChild || !appData.reminders[appData.selectedChild]) {
        return;
    }
    
    // 從提醒列表中刪除
    appData.reminders[appData.selectedChild] = appData.reminders[appData.selectedChild].filter(
        r => r.id !== reminderId
    );
    
    // 保存提醒
    saveReminders();
    
    // 更新列表
    updateReminderList();
    
    // 顯示成功消息
    showToast('提醒已刪除');
}

// 檢查和更新提醒
function checkAndUpdateReminders() {
    const reminderBadge = document.querySelector('.reminder-count-badge');
    let totalActiveReminders = 0;
    
    // 檢查所有兒童的提醒
    for (const childId in appData.reminders) {
        if (!appData.reminders[childId] || appData.reminders[childId].length === 0) {
            continue;
        }
        
        const now = new Date();
        
        // 計算活動提醒數
        const activeReminders = appData.reminders[childId].filter(reminder => 
            !reminder.completed && new Date(reminder.time) <= now
        );
        
        totalActiveReminders += activeReminders.length;
    }
    
    // 更新提醒徽章
    if (totalActiveReminders > 0) {
        reminderBadge.textContent = totalActiveReminders;
        reminderBadge.style.display = 'inline-block';
    } else {
        reminderBadge.style.display = 'none';
    }
    
    // 更新提醒列表（如果當前在提醒頁面）
    if (document.getElementById('reminderTab').classList.contains('active')) {
        updateReminderList();
    }
}

// 獲取藥物頻率描述文字
function getMedicineFrequencyText(frequency) {
    switch (frequency) {
        case 'once': return '每天1次';
        case 'twice': return '每天2次';
        case 'thrice': return '每天3次';
        case 'needed': return '需要時服用';
        default: return frequency;
    }
}

// 保存藥物
function saveMedicine() {
    if (!appData.selectedChild) {
        showToast('請先選擇一位兒童');
        return;
    }
    
    // 收集表單數據
    const name = document.getElementById('medicineName').value.trim();
    const category = document.getElementById('medicineCategory').value;
    const dosage = document.getElementById('medicineDosage').value.trim();
    const dosageUnit = document.getElementById('medicineDosageUnit').value;
    const frequency = document.getElementById('medicineFrequency').value;
    const startDate = document.getElementById('medicineStartDate').value;
    const duration = document.getElementById('medicineDuration').value;
    const durationUnit = document.getElementById('medicineDurationUnit').value;
    const instructions = document.getElementById('medicineInstructions').value.trim();
    
    // 驗證必填欄位
    if (!name) {
        showToast('請輸入藥物名稱');
        return;
    }
    
    if (!dosage) {
        showToast('請輸入藥物劑量');
        return;
    }
    
    if (!startDate) {
        showToast('請選擇開始日期');
        return;
    }
    
    // 計算結束日期
    let endDate = null;
    if (duration && duration !== '0') {
        const durationValue = parseInt(duration);
        const startDateTime = new Date(startDate);
        
        if (durationUnit === 'days') {
            endDate = new Date(startDateTime.getTime() + durationValue * 24 * 60 * 60 * 1000);
        } else if (durationUnit === 'weeks') {
            endDate = new Date(startDateTime.getTime() + durationValue * 7 * 24 * 60 * 60 * 1000);
        }
        
        endDate = endDate.toISOString().split('T')[0];
    }
    
    // 創建藥物記錄
    const medicineId = 'medicine_' + Date.now();
    const medicine = {
        id: medicineId,
        name: name,
        category: category,
        dosage: dosage,
        dosageUnit: dosageUnit,
        frequency: frequency,
        startDate: startDate,
        endDate: endDate,
        duration: {
            value: duration,
            unit: durationUnit
        },
        instructions: instructions,
        dateAdded: new Date().toISOString(),
        status: 'active',
        doses: []
    };
    
    // 添加到藥物列表
    if (!appData.medicines[appData.selectedChild]) {
        appData.medicines[appData.selectedChild] = [];
    }
    
    appData.medicines[appData.selectedChild].push(medicine);
    saveMedicines();
    
    // 創建藥物開始記錄
    const record = {
        id: 'record_' + Date.now(),
        type: 'medicine',
        date: new Date().toISOString(),
        medicineId: medicineId,
        action: 'start',
        time: new Date().toISOString(),
        title: `開始服用 ${name}`,
        content: `開始服用 ${name} ${dosage}${dosageUnit}，${getMedicineFrequencyText(frequency)}`
    };
    
    if (!appData.records[appData.selectedChild]) {
        appData.records[appData.selectedChild] = [];
    }
    appData.records[appData.selectedChild].push(record);
    saveRecords(appData.selectedChild);
    
    // 切換回藥物列表標籤
    document.querySelectorAll('.tab').forEach(t => {
        if (t.getAttribute('data-tab-content') === 'medicineList') {
            t.click();
        }
    });
    
    // 顯示成功消息
    showToast('藥物資料已保存');
}

// 更新藥物列表
function updateMedicineList() {
    const medicineList = document.getElementById('activeMedicineList');
    medicineList.innerHTML = '';
    
    if (!appData.selectedChild || !appData.medicines[appData.selectedChild] || 
        appData.medicines[appData.selectedChild].length === 0) {
        medicineList.innerHTML = '<p>目前沒有藥物記錄</p>';
        return;
    }
    
    // 獲取藥物列表
    let medicines = appData.medicines[appData.selectedChild];
    
    // 按開始日期降序排列
    medicines.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    
    // 生成列表
    medicines.forEach(medicine => {
        const medicineItem = document.createElement('div');
        medicineItem.className = 'medicine-item';
        medicineItem.setAttribute('data-medicine-id', medicine.id);
        
        medicineItem.innerHTML = `
            <div class="medicine-header">
                <div class="medicine-title">${medicine.name}</div>
                <span class="medicine-status">${medicine.status === 'active' ? '使用中' : '已完成'}</span>
            </div>
            <div class="medicine-detail">
                <label>劑量：</label>
                <span>${medicine.dosage} ${medicine.dosageUnit}</span>
            </div>
            <div class="medicine-detail">
                <label>頻率：</label>
                <span>${getMedicineFrequencyText(medicine.frequency)}</span>
            </div>
            <div class="medicine-detail">
                <label>使用期間：</label>
                <span>${formatDate(medicine.startDate)} ${medicine.endDate ? '至 ' + formatDate(medicine.endDate) : '持續中'}</span>
            </div>
            <div class="medicine-actions">
                <button class="btn btn-primary btn-record-dose" data-medicine-id="${medicine.id}">
                    <i class="fas fa-check"></i> 記錄服藥
                </button>
                <button class="btn btn-danger btn-delete-medicine" data-medicine-id="${medicine.id}">
                    <i class="fas fa-trash"></i> 刪除
                </button>
            </div>
        `;
        
        medicineList.appendChild(medicineItem);
    });
    
    // 添加按鈕事件
    document.querySelectorAll('.btn-record-dose').forEach(btn => {
        btn.addEventListener('click', function() {
            const medicineId = this.getAttribute('data-medicine-id');
            recordMedicineDose(medicineId);
        });
    });
    
    document.querySelectorAll('.btn-delete-medicine').forEach(btn => {
        btn.addEventListener('click', function() {
            const medicineId = this.getAttribute('data-medicine-id');
            if (confirm('確定要刪除此藥物記錄嗎？')) {
                deleteMedicine(medicineId);
            }
        });
    });
}

// 查找藥物通過ID
function findMedicineById(medicineId) {
    if (!appData.selectedChild || !appData.medicines[appData.selectedChild]) {
        return null;
    }
    
    return appData.medicines[appData.selectedChild].find(m => m.id === medicineId);
}

// 記錄藥物服用
function recordMedicineDose(medicineId) {
    const medicine = findMedicineById(medicineId);
    if (!medicine) {
        showToast('找不到指定的藥物');
        return;
    }
    
    // 創建服用記錄
    const now = new Date();
    const doseRecord = {
        id: 'dose_' + Date.now(),
        medicineId: medicineId,
        time: now.toISOString(),
        status: 'taken'
    };
    
    // 添加到藥物服用歷史
    if (!medicine.doses) {
        medicine.doses = [];
    }
    
    medicine.doses.push(doseRecord);
    
    // 保存更新後的藥物資料
    saveMedicines();
    
    // 創建服用記錄
    const record = {
        id: 'record_' + Date.now(),
        type: 'medicine',
        date: now.toISOString(),
        medicineId: medicineId,
        action: 'dose',
        time: now.toISOString(),
        title: `服用 ${medicine.name}`,
        content: `服用 ${medicine.name} ${medicine.dosage}${medicine.dosageUnit}`
    };
    
    if (!appData.records[appData.selectedChild]) {
        appData.records[appData.selectedChild] = [];
    }
    appData.records[appData.selectedChild].push(record);
    saveRecords(appData.selectedChild);
    
    // 更新藥物列表
    updateMedicineList();
    
    // 顯示成功訊息
    showToast('服藥記錄已保存');
}

// 刪除藥物
function deleteMedicine(medicineId) {
    if (!appData.selectedChild || !appData.medicines[appData.selectedChild]) {
        return;
    }
    
    // 刪除藥物
    appData.medicines[appData.selectedChild] = appData.medicines[appData.selectedChild].filter(
        m => m.id !== medicineId
    );
    
    // 保存更新後的藥物資料
    saveMedicines();
    
    // 更新藥物列表
    updateMedicineList();
    
    // 顯示成功訊息
    showToast('藥物記錄已刪除');
}

// 保存成長記錄
function saveGrowthRecord() {
    if (!appData.selectedChild) {
        showToast('請先選擇一位兒童');
        return;
    }
    
    // 收集表單數據
    const date = document.getElementById('growthDate').value;
    const height = document.getElementById('growthHeight').value;
    const weight = document.getElementById('growthWeight').value;
    const headCircumference = document.getElementById('growthHeadCircumference').value;
    
    // 驗證
    if (!date) {
        showToast('請選擇記錄日期');
        return;
    }
    
    if (!height && !weight && !headCircumference) {
        showToast('請至少填寫一項測量值(身高/體重/頭圍)');
        return;
    }
    
    // 創建記錄
    const growthRecord = {
        id: 'growth_' + Date.now(),
        date: date,
        dateAdded: new Date().toISOString(),
        measurements: {}
    };
    
    // 添加測量值
    if (height) growthRecord.measurements.height = parseFloat(height);
    if (weight) growthRecord.measurements.weight = parseFloat(weight);
    if (headCircumference) growthRecord.measurements.headCircumference = parseFloat(headCircumference);
    
    // 計算BMI(如果有身高和體重)
    if (height && weight) {
        const heightInMeters = parseFloat(height) / 100;
        const bmi = parseFloat(weight) / (heightInMeters * heightInMeters);
        growthRecord.measurements.bmi = Math.round(bmi * 10) / 10; // 四捨五入到小數點後一位
    }
    
    // 添加成長記錄
    if (!appData.growthData[appData.selectedChild]) {
        appData.growthData[appData.selectedChild] = [];
    }
    
    appData.growthData[appData.selectedChild].push(growthRecord);
    saveGrowthData();
    
    // 添加到一般記錄
    const recordContent = [
        height ? `身高: ${height} 公分` : '',
        weight ? `體重: ${weight} 公斤` : '',
        headCircumference ? `頭圍: ${headCircumference} 公分` : '',
        growthRecord.measurements.bmi ? `BMI: ${growthRecord.measurements.bmi}` : ''
    ].filter(Boolean).join('\n');
    
    const record = {
        id: 'record_' + Date.now(),
        type: 'growth',
        date: date + 'T00:00:00',
        time: date + 'T00:00:00',
        title: '成長測量記錄',
        content: recordContent
    };
    
    if (!appData.records[appData.selectedChild]) {
        appData.records[appData.selectedChild] = [];
    }
    appData.records[appData.selectedChild].push(record);
    saveRecords(appData.selectedChild);
    
    // 重置表單
    document.getElementById('growthHeight').value = '';
    document.getElementById('growthWeight').value = '';
    document.getElementById('growthHeadCircumference').value = '';
    
    // 更新成長記錄顯示
    updateGrowthRecords();
    
    // 顯示成功訊息
    showToast('成長記錄已儲存');
}

// 更新成長記錄顯示
function updateGrowthRecords() {
    const recordsContainer = document.getElementById('growthRecords');
    recordsContainer.innerHTML = '';
    
    if (!appData.selectedChild || !appData.growthData[appData.selectedChild] || 
        appData.growthData[appData.selectedChild].length === 0) {
        recordsContainer.innerHTML = '<p>尚無成長記錄</p>';
        return;
    }
    
    // 排序記錄（最新的在前）
    const sortedRecords = [...appData.growthData[appData.selectedChild]].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    );
    
    // 生成記錄
    sortedRecords.forEach(record => {
        // 創建記錄元素
        const recordElement = document.createElement('div');
        recordElement.className = 'growth-record-item';
        
        // 構建項目內容HTML
        let dataItemsHtml = '';
        
        if (record.measurements.height) {
            dataItemsHtml += `
                <div class="growth-data-item">
                    <h4>身高</h4>
                    <div class="growth-data-value">
                        ${record.measurements.height} <span class="growth-data-unit">公分</span>
                    </div>
                </div>
            `;
        }
        
        if (record.measurements.weight) {
            dataItemsHtml += `
                <div class="growth-data-item">
                    <h4>體重</h4>
                    <div class="growth-data-value">
                        ${record.measurements.weight} <span class="growth-data-unit">公斤</span>
                    </div>
                </div>
            `;
        }
        
        if (record.measurements.headCircumference) {
            dataItemsHtml += `
                <div class="growth-data-item">
                    <h4>頭圍</h4>
                    <div class="growth-data-value">
                        ${record.measurements.headCircumference} <span class="growth-data-unit">公分</span>
                    </div>
                </div>
            `;
        }
        
        if (record.measurements.bmi) {
            dataItemsHtml += `
                <div class="growth-data-item">
                    <h4>BMI</h4>
                    <div class="growth-data-value">
                        ${record.measurements.bmi}
                    </div>
                </div>
            `;
        }
        
        // 內容
        recordElement.innerHTML = `
            <div class="record-date">
                ${formatDate(record.date)}
            </div>
            <div class="growth-record-data">
                ${dataItemsHtml}
            </div>
            <div style="text-align: right; margin-top: 10px;">
                <button class="btn btn-danger btn-delete-growth" data-id="${record.id}">
                    <i class="fas fa-trash"></i> 刪除
                </button>
            </div>
        `;
        
        recordsContainer.appendChild(recordElement);
    });
    
    // 添加刪除按鈕事件
    document.querySelectorAll('.btn-delete-growth').forEach(btn => {
        btn.addEventListener('click', function() {
            const recordId = this.getAttribute('data-id');
            if (confirm('確定要刪除此成長記錄嗎？')) {
                deleteGrowthRecord(recordId);
            }
        });
    });
}

// 刪除成長記錄
function deleteGrowthRecord(recordId) {
    if (!appData.selectedChild || !appData.growthData[appData.selectedChild]) {
        return;
    }
    
    // 刪除記錄
    appData.growthData[appData.selectedChild] = appData.growthData[appData.selectedChild].filter(r => r.id !== recordId);
    saveGrowthData();
    
    // 更新顯示
    updateGrowthRecords();
    
    // 顯示成功消息
    showToast('成長記錄已刪除');
}

// 更新統計圖表
function updateStatsCharts(period) {
    if (!appData.selectedChild || !appData.records[appData.selectedChild] || 
        appData.records[appData.selectedChild].length === 0) {
        // 清空圖表
        clearCharts();
        return;
    }
    
    // 計算日期範圍
    const now = new Date();
    let startDate, endDate;
    
    if (period === 'week') {
        // 過去7天
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        endDate = now;
    } else if (period === 'month') {
        // 過去30天
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        endDate = now;
    }
    
    // 過濾記錄
    const records = appData.records[appData.selectedChild].filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= startDate && recordDate <= endDate;
    });
    
    if (records.length === 0) {
        // 清空圖表
        clearCharts();
        return;
    }
    
    // 更新各類型圖表
    updateSleepChart(records, startDate, endDate);
    updateFeedingChart(records, startDate, endDate);
}

// 清空圖表
function clearCharts() {
    const emptyData = {
        labels: ['無數據'],
        datasets: [{
            label: '數據點',
            data: [0],
            backgroundColor: 'rgba(142, 202, 230, 0.2)',
            borderColor: 'rgba(142, 202, 230, 1)',
            borderWidth: 1
        }]
    };
    
    const emptyOptions = {
        scales: {
            y: {
                beginAtZero: true
            }
        }
    };
    
    if (window.sleepChart) window.sleepChart.destroy();
    window.sleepChart = new Chart(document.getElementById('sleepChart').getContext('2d'), {
        type: 'bar',
        data: emptyData,
        options: emptyOptions
    });
    
    if (window.feedingChart) window.feedingChart.destroy();
    window.feedingChart = new Chart(document.getElementById('feedingChart').getContext('2d'), {
        type: 'bar',
        data: emptyData,
        options: emptyOptions
    });
}

// 更新睡眠圖表
function updateSleepChart(records, startDate, endDate) {
    // 過濾睡眠記錄
    const sleepRecords = records.filter(record => record.type === 'sleep');
    
    if (sleepRecords.length === 0) {
        if (window.sleepChart) window.sleepChart.destroy();
        window.sleepChart = new Chart(document.getElementById('sleepChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['無睡眠數據'],
                datasets: [{
                    label: '睡眠時間',
                    data: [0],
                    backgroundColor: 'rgba(147, 129, 255, 0.2)',
                    borderColor: 'rgba(147, 129, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        return;
    }
    
    // 按日期分組
    const sleepByDate = {};
    
    sleepRecords.forEach(record => {
        const dateStr = record.date.split('T')[0];
        
        if (!sleepByDate[dateStr]) {
            sleepByDate[dateStr] = 0;
        }
        
        // 累加睡眠時間
        if (record.duration && record.duration.totalMinutes) {
            sleepByDate[dateStr] += record.duration.totalMinutes;
        }
    });
    
    // 處理日期
    const dates = getDatesInRange(startDate, endDate);
    
    // 準備圖表數據
    const labels = [];
    const sleepData = [];
    
    dates.forEach(date => {
        const dateStr = date.toISOString().split('T')[0];
        labels.push(formatDate(dateStr));
        
        // 睡眠時間（小時）
        sleepData.push(sleepByDate[dateStr] ? sleepByDate[dateStr] / 60 : 0);
    });
    
    // 創建圖表
    if (window.sleepChart) window.sleepChart.destroy();
    window.sleepChart = new Chart(document.getElementById('sleepChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '睡眠時間 (小時)',
                    data: sleepData,
                    backgroundColor: 'rgba(147, 129, 255, 0.2)',
                    borderColor: 'rgba(147, 129, 255, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '睡眠時間 (小時)'
                    }
                }
            }
        }
    });
}

// 更新餵食圖表
function updateFeedingChart(records, startDate, endDate) {
    // 過濾餵食記錄
    const feedingRecords = records.filter(record => record.type === 'feeding');
    
    if (feedingRecords.length === 0) {
        if (window.feedingChart) window.feedingChart.destroy();
        window.feedingChart = new Chart(document.getElementById('feedingChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['無餵食數據'],
                datasets: [{
                    label: '餵食量',
                    data: [0],
                    backgroundColor: 'rgba(142, 202, 230, 0.2)',
                    borderColor: 'rgba(142, 202, 230, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        return;
    }
    
    // 按日期和類型分組
    const feedingByDate = {};
    
    // 識別餵食類型
    const feedingTypes = [...new Set(feedingRecords.map(record => record.feedingType))];
    
    feedingRecords.forEach(record => {
        const dateStr = record.date.split('T')[0];
        
        if (!feedingByDate[dateStr]) {
            feedingByDate[dateStr] = {};
            
            // 初始化每種類型
            feedingTypes.forEach(type => {
                feedingByDate[dateStr][type] = {
                    ml: 0,
                    min: 0
                };
            });
        }
        
        // 確保類型存在
        if (!feedingByDate[dateStr][record.feedingType]) {
            feedingByDate[dateStr][record.feedingType] = {
                ml: 0,
                min: 0
            };
        }
        
        // 累加數量
        if (record.amount && record.unit) {
            feedingByDate[dateStr][record.feedingType][record.unit] += parseFloat(record.amount);
        }
    });
    
    // 處理日期
    const dates = getDatesInRange(startDate, endDate);
    
    // 準備圖表數據
    const labels = [];
    
    // 創建每種類型的數據集
    const datasets = [];
    
    // 設定主要單位 (ml 或 min)
    const primaryUnit = feedingRecords.some(r => r.unit === 'ml') ? 'ml' : 'min';
    
    // 顏色映射
    const colorMap = {
        '母乳': {
            backgroundColor: 'rgba(142, 202, 230, 0.2)',
            borderColor: 'rgba(142, 202, 230, 1)'
        },
        '配方奶': {
            backgroundColor: 'rgba(33, 158, 188, 0.2)',
            borderColor: 'rgba(33, 158, 188, 1)'
        },
        '副食品': {
            backgroundColor: 'rgba(255, 183, 3, 0.2)',
            borderColor: 'rgba(255, 183, 3, 1)'
        },
        '水/飲料': {
            backgroundColor: 'rgba(147, 129, 255, 0.2)',
            borderColor: 'rgba(147, 129, 255, 1)'
        }
    };
    
    // 為每個日期創建標籤
    dates.forEach(date => {
        const dateStr = date.toISOString().split('T')[0];
        labels.push(formatDate(dateStr));
    });
    
    // 為每種類型創建數據集
    feedingTypes.forEach(type => {
        const data = [];
        
        dates.forEach(date => {
            const dateStr = date.toISOString().split('T')[0];
            
            if (feedingByDate[dateStr] && feedingByDate[dateStr][type]) {
                data.push(feedingByDate[dateStr][type][primaryUnit]);
            } else {
                data.push(0);
            }
        });
        
        const color = colorMap[type] || {
            backgroundColor: 'rgba(108, 117, 125, 0.2)',
            borderColor: 'rgba(108, 117, 125, 1)'
        };
        
        datasets.push({
            label: `${type} (${primaryUnit})`,
            data: data,
            backgroundColor: color.backgroundColor,
            borderColor: color.borderColor,
            borderWidth: 1
        });
    });
    
    // 創建堆疊柱狀圖
    if (window.feedingChart) window.feedingChart.destroy();
    window.feedingChart = new Chart(document.getElementById('feedingChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: `餵食量 (${primaryUnit})`
                    }
                }
            }
        }
    });
}

// 檢查是否有進行中的睡眠記錄
function checkOngoingSleep() {
    if (appData.sleepStartTime) {
        const startTime = new Date(appData.sleepStartTime);
        // 更新睡眠計時器顯示
        updateSleepTimerDisplay(startTime);
        document.getElementById('sleepTimerBadge').classList.add('active');
    }
}

// 更新睡眠計時器顯示
function updateSleepTimerDisplay(startTime) {
    const updateTimer = () => {
        if (!appData.sleepStartTime) {
            return;
        }
        
        const now = new Date();
        const elapsed = now - new Date(startTime);
        
        const hours = String(Math.floor(elapsed / (1000 * 60 * 60))).padStart(2, '0');
        const minutes = String(Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
        const seconds = String(Math.floor((elapsed % (1000 * 60)) / 1000)).padStart(2, '0');
        
        document.querySelector('.sleep-timer-text').textContent = `正在睡眠中: ${hours}:${minutes}:${seconds}`;
        
        // 每秒更新
        setTimeout(updateTimer, 1000);
    };
    
    updateTimer();
}

// 開始睡眠計時
function startSleepTimer() {
    if (!appData.selectedChild) {
        showToast('請先選擇一位兒童');
        return;
    }
    
    // 開始新的睡眠計時
    appData.sleepStartTime = new Date().toISOString();
    saveSleepTimer();
    
    // 顯示計時器
    updateSleepTimerDisplay(new Date(appData.sleepStartTime));
    document.getElementById('sleepTimerBadge').classList.add('active');
    
    showToast('睡眠計時開始');
}

// 結束睡眠計時
function endSleepTimer() {
    if (!appData.sleepStartTime) {
        return;
    }
    
    const startTime = new Date(appData.sleepStartTime);
    const endTime = new Date();
    
    // 計算睡眠時間
    const duration = calculateTimeDifference(startTime, endTime);
    
    // 創建睡眠記錄
    const record = {
        id: 'record_' + Date.now(),
        type: 'sleep',
        start: appData.sleepStartTime,
        end: endTime.toISOString(),
        duration: {
            hours: duration.hours,
            minutes: duration.minutes,
            totalMinutes: duration.totalMinutes
        },
        date: appData.sleepStartTime,
        time: appData.sleepStartTime,
        note: '使用睡眠計時器記錄'
    };
    
    // 添加記錄
    if (!appData.records[appData.selectedChild]) {
        appData.records[appData.selectedChild] = [];
    }
    
    appData.records[appData.selectedChild].push(record);
    saveRecords(appData.selectedChild);
    
    // 重置計時器
    appData.sleepStartTime = null;
    saveSleepTimer();
    
    // 隱藏計時器徽章
    document.getElementById('sleepTimerBadge').classList.remove('active');
    
    // 更新歷史記錄
    updateHistoryContent();
    
    showToast('睡眠記錄已儲存');
}
