// vditor-final.js - 终极定位与注入方案
(function() {
    'use strict';
    console.log('🔍 Vditor 终极注入脚本开始加载...');

    // 配置：这里需要你确认或调整选择器
    const CONFIG = {
        // 尝试寻找“正文”字段的标签或容器（根据你的CMS界面语言调整）
        fieldLabelText: ['正文', 'Body', '内容', 'Content', 'Markdown'],
        // 用于查找编辑器区域的父容器选择器
        editorAreaSelector: '.css-hn3jn7-EditorContainer, .cms-editor, [class*="EditorContainer"], .nc-editor',
        // 轮询查找的最大时间和间隔
        maxPollTime: 20000, // 20秒
        pollInterval: 500,
        debug: true
    };

    // ===== 状态 =====
    let isInjected = false;
    let pollTimer = null;
    let pollStartTime = null;

    // ===== 日志 =====
    function log(...args) {
        if (CONFIG.debug) console.log('[Vditor注入]', ...args);
    }

    // ===== 核心函数：寻找目标编辑器容器 =====
    function findTargetEditorContainer() {
        log('正在扫描页面，寻找正文编辑器...');

        // 方法1：通过字段标签文本寻找
        for (const labelText of CONFIG.fieldLabelText) {
            // 寻找包含“正文”等文本的标签元素
            const labels = Array.from(document.querySelectorAll('label, .cms-label, [class*="Label"]'))
                .filter(el => el.textContent && el.textContent.trim().includes(labelText));

            for (const label of labels) {
                log(`找到疑似标签: "${label.textContent.trim()}"`);
                // 尝试找到这个标签关联的编辑器区域（通常在其后面或父容器内）
                let editorContainer = label.nextElementSibling;
                while (editorContainer && !editorContainer.matches(CONFIG.editorAreaSelector)) {
                    editorContainer = editorContainer.nextElementSibling;
                }
                if (editorContainer && editorContainer.matches(CONFIG.editorAreaSelector)) {
                    log(`✅ 通过标签找到编辑器容器`);
                    return editorContainer;
                }
                // 如果在后面找不到，尝试在父级容器内找
                const parent = label.closest('.cms-field, .nc-field, [class*="Field"]');
                if (parent) {
                    const editor = parent.querySelector(CONFIG.editorAreaSelector);
                    if (editor) {
                        log(`✅ 在标签父容器内找到编辑器`);
                        return editor;
                    }
                }
            }
        }

        // 方法2：通过已知的编辑器容器选择器寻找
        log('尝试通过选择器直接查找...');
        const editorContainers = document.querySelectorAll(CONFIG.editorAreaSelector);
        log(`找到 ${editorContainers.length} 个编辑器容器`);
        
        // 如果有多个，尝试通过尺寸或位置找出最可能是“正文”的那个（通常是最大的）
        if (editorContainers.length > 0) {
            const editorsArray = Array.from(editorContainers);
            // 按面积排序，假设最大的那个是正文编辑器
            editorsArray.sort((a, b) => {
                const rectA = a.getBoundingClientRect();
                const rectB = b.getBoundingClientRect();
                return (rectB.width * rectB.height) - (rectA.width * rectA.height);
            });
            log(`选择面积最大的容器作为目标 (${editorsArray[0].className})`);
            return editorsArray[0];
        }

        log('❌ 未找到目标编辑器容器');
        return null;
    }

    // ===== 核心函数：注入Vditor并替换原始编辑器 =====
    function injectVditor(targetContainer) {
        if (!targetContainer || isInjected) return false;
        log('开始注入 Vditor...');

        // 1. 尝试从原始编辑器获取当前值（如果存在）
        let initialValue = '';
        // 查找可能的原始文本区域或内容可编辑div
        const originalTextarea = targetContainer.querySelector('textarea');
        const editableDiv = targetContainer.querySelector('[contenteditable="true"]');
        if (originalTextarea) {
            initialValue = originalTextarea.value || '';
            log(`从 textarea 获取初始值，长度: ${initialValue.length}`);
        } else if (editableDiv) {
            initialValue = editableDiv.textContent || editableDiv.innerText || '';
            log(`从 contenteditable div 获取初始值，长度: ${initialValue.length}`);
        }

        // 2. 生成唯一ID
        const vditorId = `vditor-main-${Date.now()}`;

        // 3. 创建Vditor容器
        const vditorWrapper = document.createElement('div');
        vditorWrapper.id = `wrapper-${vditorId}`;
        vditorWrapper.style.cssText = `
            width: 100%;
            min-height: 600px;
            position: relative;
            border: 3px solid #10b981; /* 绿色边框便于识别 */
            border-radius: 8px;
            margin: 15px 0;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        `;

        const vditorContainer = document.createElement('div');
        vditorContainer.id = vditorId;
        vditorContainer.style.cssText = 'width:100%; height:100%; min-height:600px;';
        vditorWrapper.appendChild(vditorContainer);

        // 4. 在目标位置插入Vditor（替换或插入在原始容器旁边）
        targetContainer.parentNode.insertBefore(vditorWrapper, targetContainer);
        // 隐藏原始编辑器，但保留在DOM中（以防CMS需要它）
        targetContainer.style.cssText = 'display: none !important;';

        // 5. 初始化Vditor
        setTimeout(() => {
            try {
                log(`正在初始化 Vditor (ID: ${vditorId})...`);
                const vditor = new Vditor(vditorId, {
                    height: 600,
                    placeholder: '开始撰写文章内容...（由 Vditor 提供支持）',
                    value: initialValue,
                    theme: 'classic',
                    icon: 'ant',
                    toolbar: [
                        'emoji', 'headings', 'bold', 'italic', 'strike', 'link',
                        '|', 'list', 'ordered-list', 'check', 'outdent', 'indent',
                        '|', 'quote', 'line', 'code', 'inline-code', 'insert-before', 'insert-after',
                        '|', 'upload', 'table',
                        '|', 'undo', 'redo',
                        '|', 'fullscreen', 'preview', 'outline'
                    ],
                    input: (value) => {
                        // 将值同步回隐藏的原始编辑器，确保CMS能捕获到数据
                        if (originalTextarea) {
                            originalTextarea.value = value;
                            // 触发input事件，让CMS知道值已改变
                            const inputEvent = new Event('input', { bubbles: true });
                            originalTextarea.dispatchEvent(inputEvent);
                        }
                        log(`编辑器内容变更，长度: ${value.length}`);
                    },
                    cache: { enable: false }
                });

                // 6. 标记成功并添加状态标识
                isInjected = true;
                log('🎉 Vditor 注入成功！');

                // 添加成功标识
                const badge = document.createElement('div');
                badge.style.cssText = `
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: #10b981;
                    color: white;
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: bold;
                    z-index: 1000;
                    opacity: 0.9;
                `;
                badge.textContent = 'Vditor ✓';
                vditorWrapper.appendChild(badge);

                // 存储引用，便于后续管理
                window.__vditorMainInstance = vditor;
                window.__vditorTargetContainer = targetContainer;

            } catch (error) {
                log(`❌ Vditor 初始化失败: ${error.message}`);
                // 恢复显示原始编辑器
                targetContainer.style.cssText = '';
                vditorWrapper.remove();
            }
        }, 100);

        return true;
    }

    // ===== 轮询与监控 =====
    function startPolling() {
        if (pollTimer) clearInterval(pollTimer);
        
        pollStartTime = Date.now();
        log(`启动轮询，最多等待 ${CONFIG.maxPollTime/1000} 秒`);

        pollTimer = setInterval(() => {
            // 检查是否超时
            if (Date.now() - pollStartTime > CONFIG.maxPollTime) {
                log('轮询超时，停止查找');
                clearInterval(pollTimer);
                return;
            }

            // 如果已注入，停止轮询
            if (isInjected) {
                clearInterval(pollTimer);
                log('已注入成功，停止轮询');
                return;
            }

            // 每次轮询都尝试查找并注入
            const target = findTargetEditorContainer();
            if (target) {
                log('找到目标，尝试注入...');
                if (injectVditor(target)) {
                    clearInterval(pollTimer);
                }
            }
        }, CONFIG.pollInterval);
    }

    // ===== 监控路由变化（单页应用的关键） =====
    function setupRouteMonitoring() {
        let lastHash = window.location.hash;
        
        setInterval(() => {
            const currentHash = window.location.hash;
            // 如果哈希变化且进入了编辑界面（包含 collections/terminal/entries 或 new）
            if (currentHash !== lastHash && 
                (currentHash.includes('collections/terminal/entries/') || 
                 currentHash.includes('collections/terminal/new'))) {
                log(`检测到路由变化到编辑页: ${currentHash}`);
                lastHash = currentHash;
                
                // 重置注入状态，等待新编辑器出现
                isInjected = false;
                // 短暂的延迟后重新开始轮询，等待新DOM渲染
                setTimeout(() => {
                    if (!isInjected) startPolling();
                }, 1000);
            }
        }, 500);
    }

    // ===== 初始化 =====
    function init() {
        log('初始化注入引擎...');
        
        // 等待必要的依赖
        if (typeof Vditor === 'undefined') {
            log('Vditor 库未加载，等待中...');
            setTimeout(init, 500);
            return;
        }
        log('✅ Vditor 库已加载');

        // 启动轮询查找
        startPolling();
        
        // 监控路由变化
        setupRouteMonitoring();

        // 暴露控制函数到全局，便于手动调试
        window.__injectVditorManual = function() {
            log('手动触发注入...');
            const target = findTargetEditorContainer();
            if (target) {
                return injectVditor(target);
            } else {
                log('未找到目标，无法手动注入');
                return false;
            }
        };

        log('注入引擎初始化完成。');
        log('如果自动注入失败，可以在控制台执行: __injectVditorManual()');
    }

    // ===== 启动 =====
    // 确保在DOM加载后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // 如果DOM早已就绪，直接初始化
        setTimeout(init, 1000); // 延迟1秒，确保CMS框架已启动
    }
})();