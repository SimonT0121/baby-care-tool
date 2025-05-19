/**
 * 手機端除錯工具 - debug.js
 * 提供虛擬控制台和除錯功能
 */

class MobileDebugger {
    constructor() {
        this.logs = [];
        this.errors = [];
        this.warnings = [];
        this.isVisible = false;
        this.maxLogs = 100;
        
        this.init();
        this.setupGlobalErrorHandling();
        this.replaceConsoleMethods();
    }
    
    init() {
        // 創建除錯面板
        this.createDebugPanel();
        this.createToggleButton();
        this.setupEventListeners();
        
        // 初始化訊息
        this.log('手機除錯工具已啟動');
        this.log('點擊右上角 🐛 按鈕打開/關閉除錯面板');
    }
    
    createDebugPanel() {
        // 創建主容器
        this.debugPanel = document.createElement('div');
        this.debugPanel.id = 'mobileDebugPanel';
        this.debugPanel.innerHTML = `
            <div class="debug-header">
                <h3>🐛 除錯控制台</h3>
                <div class="debug-controls">
                    <button id="clearDebugLogs" class="debug-btn">清除</button>
                    <button id="exportDebugLogs" class="debug-btn">匯出</button>
                    <button id="closeDebugPanel" class="debug-btn">關閉</button>
                </div>
            </div>
            <div class="debug-tabs">
                <button class="debug-tab active" data-tab="logs">日誌</button>
                <button class="debug-tab" data-tab="errors">錯誤</button>
                <button class="debug-tab" data-tab="warnings">警告</button>
                <button class="debug-tab" data-tab="system">系統</button>
            </div>
            <div class="debug-content">
                <div id="debugLogs" class="debug-tab-content active"></div>
                <div id="debugErrors" class="debug-tab-content"></div>
                <div id="debugWarnings" class="debug-tab-content"></div>
                <div id="debugSystem" class="debug-tab-content"></div>
            </div>
            <div class="debug-input">
                <input type="text" id="debugCommandInput" placeholder="輸入JavaScript指令..." />
                <button id="executeCommand" class="debug-btn">執行</button>
            </div>
        `;
        
        // 添加樣式
        this.addDebugStyles();
        
        // 添加到頁面
        document.body.appendChild(this.debugPanel);
        
        // 初始顯示系統資訊
        this.showSystemInfo();
    }
    
    createToggleButton() {
        this.toggleButton = document.createElement('div');
        this.toggleButton.id = 'debugToggleBtn';
        this.toggleButton.innerHTML = '🐛';
        this.toggleButton.title = '打開/關閉除錯面板';
        
        document.body.appendChild(this.toggleButton);
    }
    
    addDebugStyles() {
        if (document.getElementById('debugStyles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'debugStyles';
        styles.textContent = `
            #debugToggleBtn {
                position: fixed;
                top: 10px;
                right: 10px;
                width: 40px;
                height: 40px;
                background: #ff6b9d;
                color: white;
                border-radius: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                cursor: pointer;
                z-index: 10000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                user-select: none;
            }
            
            #debugToggleBtn:hover {
                background: #e55a8a;
                transform: scale(1.1);
            }
            
            #mobileDebugPanel {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.95);
                color: #fff;
                z-index: 9999;
                font-family: monospace;
                font-size: 12px;
                display: none;
                flex-direction: column;
            }
            
            #mobileDebugPanel.show {
                display: flex;
            }
            
            .debug-header {
                background: #333;
                padding: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #555;
            }
            
            .debug-header h3 {
                margin: 0;
                font-size: 16px;
            }
            
            .debug-controls {
                display: flex;
                gap: 5px;
            }
            
            .debug-btn {
                background: #ff6b9d;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            }
            
            .debug-btn:hover {
                background: #e55a8a;
            }
            
            .debug-tabs {
                background: #444;
                padding: 0;
                display: flex;
                border-bottom: 1px solid #555;
            }
            
            .debug-tab {
                background: none;
                border: none;
                color: #ccc;
                padding: 10px 15px;
                cursor: pointer;
                border-bottom: 2px solid transparent;
                flex: 1;
                font-size: 12px;
            }
            
            .debug-tab.active {
                color: #ff6b9d;
                border-bottom-color: #ff6b9d;
                background: #555;
            }
            
            .debug-content {
                flex: 1;
                overflow: hidden;
                position: relative;
            }
            
            .debug-tab-content {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                overflow-y: auto;
                padding: 10px;
                display: none;
                white-space: pre-wrap;
                word-break: break-all;
            }
            
            .debug-tab-content.active {
                display: block;
            }
            
            .debug-input {
                background: #333;
                padding: 10px;
                display: flex;
                gap: 10px;
                border-top: 1px solid #555;
            }
            
            #debugCommandInput {
                flex: 1;
                background: #555;
                border: 1px solid #777;
                color: white;
                padding: 8px;
                border-radius: 4px;
                font-family: monospace;
                font-size: 12px;
            }
            
            .debug-log-item {
                margin-bottom: 8px;
                padding: 5px;
                border-left: 3px solid #666;
                background: rgba(255,255,255,0.05);
                border-radius: 3px;
            }
            
            .debug-log-item.log {
                border-left-color: #4ecdc4;
            }
            
            .debug-log-item.warn {
                border-left-color: #ffd93d;
                background: rgba(255,217,61,0.1);
            }
            
            .debug-log-item.error {
                border-left-color: #ff6b6b;
                background: rgba(255,107,107,0.1);
            }
            
            .debug-log-time {
                color: #888;
                font-size: 10px;
                margin-right: 8px;
            }
            
            .debug-log-content {
                color: #fff;
            }
            
            .debug-system-info {
                background: rgba(255,255,255,0.05);
                padding: 10px;
                margin-bottom: 10px;
                border-radius: 4px;
                border-left: 3px solid #ff6b9d;
            }
            
            .debug-system-info h4 {
                margin: 0 0 8px 0;
                color: #ff6b9d;
                font-size: 14px;
            }
            
            .debug-system-info p {
                margin: 2px 0;
                font-size: 12px;
            }
            
            @media (max-width: 480px) {
                #mobileDebugPanel {
                    font-size: 11px;
                }
                
                .debug-header h3 {
                    font-size: 14px;
                }
                
                .debug-tab {
                    padding: 8px 10px;
                    font-size: 11px;
                }
                
                #debugCommandInput {
                    font-size: 11px;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    setupEventListeners() {
        // 切換面板顯示
        this.toggleButton.addEventListener('click', () => {
            this.toggle();
        });
        
        // 關閉面板
        document.getElementById('closeDebugPanel').addEventListener('click', () => {
            this.hide();
        });
        
        // 清除日誌
        document.getElementById('clearDebugLogs').addEventListener('click', () => {
            this.clear();
        });
        
        // 匯出日誌
        document.getElementById('exportDebugLogs').addEventListener('click', () => {
            this.exportLogs();
        });
        
        // 標籤切換
        document.querySelectorAll('.debug-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });
        
        // 執行指令
        document.getElementById('executeCommand').addEventListener('click', () => {
            this.executeCommand();
        });
        
        // Enter鍵執行指令
        document.getElementById('debugCommandInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.executeCommand();
            }
        });
        
        // 阻止面板內部點擊事件冒泡
        this.debugPanel.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // 點擊背景關閉面板
        this.debugPanel.addEventListener('click', (e) => {
            if (e.target === this.debugPanel) {
                this.hide();
            }
        });
    }
    
    setupGlobalErrorHandling() {
        // 捕獲JavaScript錯誤
        window.addEventListener('error', (e) => {
            this.error(`錯誤: ${e.message} (${e.filename}:${e.lineno}:${e.colno})`);
        });
        
        // 捕獲Promise拒絕
        window.addEventListener('unhandledrejection', (e) => {
            this.error(`未處理的Promise拒絕: ${e.reason}`);
        });
        
        // 捕獲資源載入錯誤
        window.addEventListener('error', (e) => {
            if (e.target !== window) {
                this.error(`資源載入失敗: ${e.target.src || e.target.href}`);
            }
        }, true);
    }
    
    replaceConsoleMethods() {
        // 保存原始方法
        this.originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            info: console.info,
            debug: console.debug
        };
        
        // 替換console方法
        console.log = (...args) => {
            this.originalConsole.log.apply(console, args);
            this.log(args.map(arg => this.formatArg(arg)).join(' '));
        };
        
        console.warn = (...args) => {
            this.originalConsole.warn.apply(console, args);
            this.warn(args.map(arg => this.formatArg(arg)).join(' '));
        };
        
        console.error = (...args) => {
            this.originalConsole.error.apply(console, args);
            this.error(args.map(arg => this.formatArg(arg)).join(' '));
        };
        
        console.info = (...args) => {
            this.originalConsole.info.apply(console, args);
            this.log(args.map(arg => this.formatArg(arg)).join(' '));
        };
        
        console.debug = (...args) => {
            this.originalConsole.debug.apply(console, args);
            this.log(args.map(arg => this.formatArg(arg)).join(' '));
        };
    }
    
    formatArg(arg) {
        if (typeof arg === 'object') {
            try {
                return JSON.stringify(arg, null, 2);
            } catch (e) {
                return arg.toString();
            }
        }
        return String(arg);
    }
    
    log(message, type = 'log') {
        const logItem = {
            timestamp: new Date(),
            message: String(message),
            type: type
        };
        
        this.logs.push(logItem);
        
        if (type === 'error') {
            this.errors.push(logItem);
        } else if (type === 'warn') {
            this.warnings.push(logItem);
        }
        
        // 限制日誌數量
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        if (this.errors.length > this.maxLogs) {
            this.errors.shift();
        }
        if (this.warnings.length > this.maxLogs) {
            this.warnings.shift();
        }
        
        this.updateDisplay();
    }
    
    warn(message) {
        this.log(message, 'warn');
    }
    
    error(message) {
        this.log(message, 'error');
    }
    
    updateDisplay() {
        if (!this.isVisible) return;
        
        // 更新各個標籤的內容
        this.updateTab('logs', this.logs);
        this.updateTab('errors', this.errors);
        this.updateTab('warnings', this.warnings);
    }
    
    updateTab(tabName, logs) {
        const container = document.getElementById(`debug${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
        if (!container) return;
        
        container.innerHTML = logs.map(log => `
            <div class="debug-log-item ${log.type}">
                <span class="debug-log-time">${this.formatTime(log.timestamp)}</span>
                <span class="debug-log-content">${log.message}</span>
            </div>
        `).join('');
        
        // 自動滾動到底部
        container.scrollTop = container.scrollHeight;
    }
    
    formatTime(date) {
        return date.toLocaleTimeString('zh-TW', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    
    switchTab(tabName) {
        // 更新標籤狀態
        document.querySelectorAll('.debug-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // 更新內容顯示
        document.querySelectorAll('.debug-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        if (tabName === 'system') {
            document.getElementById('debugSystem').classList.add('active');
        } else {
            document.getElementById(`debug${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
        }
    }
    
    executeCommand() {
        const input = document.getElementById('debugCommandInput');
        const command = input.value.trim();
        
        if (!command) return;
        
        this.log(`> ${command}`, 'log');
        
        try {
            const result = eval(command);
            this.log(`< ${this.formatArg(result)}`, 'log');
        } catch (error) {
            this.error(`執行錯誤: ${error.message}`);
        }
        
        input.value = '';
    }
    
    showSystemInfo() {
        const systemContainer = document.getElementById('debugSystem');
        
        // 收集系統資訊
        const systemInfo = {
            'User Agent': navigator.userAgent,
            '螢幕尺寸': `${screen.width}x${screen.height}`,
            '視窗尺寸': `${window.innerWidth}x${window.innerHeight}`,
            '語言': navigator.language,
            '時區': Intl.DateTimeFormat().resolvedOptions().timeZone,
            '線上狀態': navigator.onLine ? '線上' : '離線',
            '平台': navigator.platform,
            '記憶體': navigator.deviceMemory ? `${navigator.deviceMemory}GB` : '未知',
            'CPU核心': navigator.hardwareConcurrency || '未知'
        };
        
        // 檢查應用狀態
        const appStatus = {
            'IndexedDB': typeof indexedDB !== 'undefined' ? '支援' : '不支援',
            'LocalStorage': typeof localStorage !== 'undefined' ? '支援' : '不支援',
            'Chart.js': typeof Chart !== 'undefined' ? '已載入' : '未載入',
            '當前孩子': window.currentChild ? window.currentChild.name : '未選擇',
            '資料庫狀態': window.db ? '已連接' : '未連接'
        };
        
        systemContainer.innerHTML = `
            <div class="debug-system-info">
                <h4>系統資訊</h4>
                ${Object.entries(systemInfo).map(([key, value]) => 
                    `<p><strong>${key}:</strong> ${value}</p>`
                ).join('')}
            </div>
            <div class="debug-system-info">
                <h4>應用狀態</h4>
                ${Object.entries(appStatus).map(([key, value]) => 
                    `<p><strong>${key}:</strong> ${value}</p>`
                ).join('')}
            </div>
            <div class="debug-system-info">
                <h4>頁面載入時間</h4>
                <p><strong>DOM載入:</strong> ${this.getDOMLoadTime()}ms</p>
                <p><strong>頁面載入:</strong> ${this.getPageLoadTime()}ms</p>
            </div>
        `;
    }
    
    getDOMLoadTime() {
        if (performance && performance.timing) {
            return performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart;
        }
        return '未知';
    }
    
    getPageLoadTime() {
        if (performance && performance.timing) {
            return performance.timing.loadEventEnd - performance.timing.navigationStart;
        }
        return '未知';
    }
    
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    show() {
        this.isVisible = true;
        this.debugPanel.classList.add('show');
        this.updateDisplay();
        this.showSystemInfo();
    }
    
    hide() {
        this.isVisible = false;
        this.debugPanel.classList.remove('show');
    }
    
    clear() {
        this.logs = [];
        this.errors = [];
        this.warnings = [];
        this.updateDisplay();
        this.log('除錯日誌已清除');
    }
    
    exportLogs() {
        const exportData = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            logs: this.logs,
            errors: this.errors,
            warnings: this.warnings
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `debug-logs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.log('除錯日誌已匯出');
    }
    
    // 工具方法
    checkElementExists(selector) {
        const element = document.querySelector(selector);
        this.log(`元素 "${selector}" ${element ? '存在' : '不存在'}`);
        return element;
    }
    
    checkStylesLoaded() {
        const computed = window.getComputedStyle(document.body);
        this.log(`body背景色: ${computed.backgroundColor}`);
        this.log(`body字體: ${computed.fontFamily}`);
        
        const header = document.querySelector('.header');
        if (header) {
            const headerStyles = window.getComputedStyle(header);
            this.log(`header背景: ${headerStyles.background}`);
        } else {
            this.warn('未找到 .header 元素');
        }
    }
    
    testDatabase() {
        if (typeof window.db !== 'undefined' && window.db) {
            this.log('資料庫連接正常');
            
            // 測試資料庫操作
            try {
                const transaction = window.db.transaction(['children'], 'readonly');
                const store = transaction.objectStore('children');
                const request = store.count();
                
                request.onsuccess = () => {
                    this.log(`資料庫中有 ${request.result} 個孩子記錄`);
                };
                
                request.onerror = (error) => {
                    this.error(`資料庫查詢錯誤: ${error}`);
                };
            } catch (error) {
                this.error(`資料庫操作錯誤: ${error.message}`);
            }
        } else {
            this.error('資料庫未初始化');
        }
    }
}

// 初始化除錯器
document.addEventListener('DOMContentLoaded', function() {
    window.debugger = new MobileDebugger();
    
    // 提供一些全域除錯方法
    window.debug = {
        log: (...args) => window.debugger.log(args.join(' ')),
        warn: (...args) => window.debugger.warn(args.join(' ')),
        error: (...args) => window.debugger.error(args.join(' ')),
        clear: () => window.debugger.clear(),
        show: () => window.debugger.show(),
        hide: () => window.debugger.hide(),
        checkElement: (selector) => window.debugger.checkElementExists(selector),
        checkStyles: () => window.debugger.checkStylesLoaded(),
        testDB: () => window.debugger.testDatabase()
    };
    
    // 記錄初始化完成
    console.log('手機除錯工具已初始化');
    console.log('可用方法: debug.log(), debug.warn(), debug.error(), debug.clear(), debug.show(), debug.hide()');
    console.log('測試方法: debug.checkElement(), debug.checkStyles(), debug.testDB()');
});