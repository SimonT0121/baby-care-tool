/**
 * HTML診斷工具
 * 檢查HTML結構並提供修復建議
 */

function diagnoseHTML() {
    console.log('=== HTML診斷開始 ===');
    
    const diagnosis = {
        hasBasicStructure: true,
        missingElements: [],
        recommendations: []
    };
    
    // 檢查基本結構
    const basicElements = [
        { id: 'loadingScreen', name: '載入畫面' },
        { id: 'app', name: '主應用容器' },
        { id: 'childSelect', name: '孩子選擇器' },
        { id: 'addChildBtn', name: '添加孩子按鈕' },
        { id: 'todaySummary', name: '今日摘要容器' },
        { id: 'themeToggle', name: '主題切換按鈕' },
        { id: 'toast', name: 'Toast通知容器' }
    ];
    
    console.log('檢查基本元素...');
    basicElements.forEach(item => {
        const element = document.getElementById(item.id);
        if (element) {
            console.log(`✓ ${item.name} (${item.id}) 存在`);
        } else {
            console.error(`✗ ${item.name} (${item.id}) 缺失`);
            diagnosis.missingElements.push(item);
        }
    });
    
    // 檢查CSS載入
    console.log('檢查CSS載入...');
    const bodyStyles = window.getComputedStyle(document.body);
    const hasCustomCSS = bodyStyles.fontFamily.includes('system') || bodyStyles.fontFamily.includes('Segoe');
    
    if (hasCustomCSS) {
        console.log('✓ CSS已正確載入');
    } else {
        console.warn('✗ CSS可能未正確載入');
        diagnosis.recommendations.push('檢查style.css是否正確引用');
    }
    
    // 檢查Script載入
    console.log('檢查Script載入...');
    const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src);
    console.log('已載入的腳本:', scripts);
    
    // 生成修復建議
    if (diagnosis.missingElements.length > 0) {
        diagnosis.recommendations.push('HTML結構不完整，可能需要重新下載index.html');
        diagnosis.recommendations.push('清除瀏覽器快取後重新載入');
    }
    
    // 輸出診斷結果
    console.log('=== 診斷結果 ===');
    console.log('缺失元素數量:', diagnosis.missingElements.length);
    console.log('修復建議:', diagnosis.recommendations);
    
    // 嘗試創建缺失的關鍵元素
    if (diagnosis.missingElements.length > 0) {
        console.log('嘗試創建缺失的關鍵元素...');
        createMissingElements(diagnosis.missingElements);
    }
    
    return diagnosis;
}

function createMissingElements(missingElements) {
    const app = document.getElementById('app') || document.body;
    
    missingElements.forEach(item => {
        switch (item.id) {
            case 'loadingScreen':
                // 如果沒有載入畫面，直接顯示主應用
                if (document.getElementById('app')) {
                    document.getElementById('app').style.display = 'block';
                }
                break;
                
            case 'childSelect':
                const selectContainer = document.createElement('div');
                selectContainer.innerHTML = `
                    <div class="child-selector">
                        <div class="child-selector-content">
                            <select id="childSelect" class="child-select">
                                <option value="">請先添加孩子</option>
                            </select>
                            <button id="addChildBtn" class="add-child-btn">
                                <i class="fas fa-plus"></i> 添加孩子
                            </button>
                        </div>
                    </div>
                `;
                app.insertBefore(selectContainer.firstElementChild, app.firstChild);
                console.log('✓ 已創建孩子選擇器');
                break;
                
            case 'todaySummary':
                const summaryContainer = document.createElement('div');
                summaryContainer.innerHTML = `
                    <main class="main-content">
                        <section class="today-summary">
                            <h2><i class="fas fa-calendar-day"></i> 今日摘要</h2>
                            <div id="todaySummary" class="summary-cards"></div>
                        </section>
                    </main>
                `;
                app.appendChild(summaryContainer.firstElementChild);
                console.log('✓ 已創建今日摘要容器');
                break;
                
            case 'toast':
                const toast = document.createElement('div');
                toast.id = 'toast';
                toast.className = 'toast';
                document.body.appendChild(toast);
                console.log('✓ 已創建Toast容器');
                break;
        }
    });
    
    // 重新初始化事件監聽器
    if (window.initEventListeners) {
        console.log('重新初始化事件監聽器...');
        initEventListeners();
    }
}

// 提供全域診斷函數
window.diagnoseHTML = diagnoseHTML;

// 在DOM載入後自動執行診斷
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(diagnoseHTML, 500);
    });
} else {
    setTimeout(diagnoseHTML, 500);
}

console.log('HTML診斷工具已載入，使用 diagnoseHTML() 執行診斷');