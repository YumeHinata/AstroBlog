// vditor-final.js - DOM拦截与替换方案 (绕过CMS内部机制)
(function() {
  'use strict';

  console.log('🎯 启动 Vditor DOM 拦截引擎...');

  // ==================== 配置 ====================
  const CONFIG = {
    // 要拦截的原始编辑器选择器 (根据你的CMS版本调整)
    targetSelectors: [
      '.cms-editor-markdown',          // 常见类名
      '.nc-markdownWidget-container',  // 常见类名
      'textarea[data-slate-editor]',   // 可能的textarea编辑器
      '.CodeMirror',                   // CodeMirror编辑器
      '[class*="markdown"]',           // 包含'markdown'的类
      '.cms-widget-markdown'           // 另一种常见类名
    ],
    pollInterval: 1000,                // 检查DOM变化的间隔(毫秒)
    maxPollTime: 30000,                // 最长轮询时间(30秒)
    debug: true,
    // 保险策略：同时尝试传统注册
    enableTraditionalRegister: true
  };

  // ==================== 状态 ====================
  let pollTimer = null;
  let pollStartTime = 0;
  let replacedEditors = new Set(); // 记录已替换的编辑器ID
  let vditorInstances = new Map(); // 管理Vditor实例

  // ==================== 日志工具 ====================
  function debugLog(...args) {
    if (CONFIG.debug) console.log('[Vditor拦截]', ...args);
  }

  // ==================== 核心函数：查找目标编辑器 ====================
  function findTargetEditors() {
    const editors = [];
    
    // 方法1: 通过配置的选择器查找
    CONFIG.targetSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (!el.__vditor_replaced && !editors.includes(el)) {
            editors.push(el);
          }
        });
      } catch (e) {
        // 忽略选择器错误
      }
    });

    // 方法2: 查找所有可能是编辑器的元素
    if (editors.length === 0) {
      const potentialEditors = document.querySelectorAll('textarea, div[contenteditable="true"], .cms-editor, [class*="Editor"], [class*="editor"]');
      potentialEditors.forEach(el => {
        // 通过尺寸和位置判断是否是主要内容编辑器
        const rect = el.getBoundingClientRect();
        const isLargeEditor = rect.width > 400 && rect.height > 200;
        const hasMarkdownClass = el.className && (
          el.className.includes('markdown') || 
          el.className.includes('Markdown') ||
          el.className.includes('md-')
        );
        
        if ((isLargeEditor || hasMarkdownClass) && !el.__vditor_replaced) {
          editors.push(el);
        }
      });
    }

    debugLog(`找到 ${editors.length} 个待处理编辑器`);
    return editors;
  }

  // ==================== 核心函数：用Vditor替换编辑器 ====================
  function replaceEditorWithVditor(originalElement) {
    if (!originalElement || !originalElement.parentNode) {
      debugLog('原始元素无效或无父节点');
      return false;
    }

    const originalId = originalElement.id || `vditor-original-${Date.now()}`;
    const vditorId = `vditor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 标记已处理，避免重复处理
    originalElement.__vditor_replaced = true;
    replacedEditors.add(originalId);
    
    debugLog(`开始替换编辑器: ${originalId} -> ${vditorId}`, {
      标签名: originalElement.tagName,
      类名: originalElement.className,
      尺寸: `${originalElement.offsetWidth}×${originalElement.offsetHeight}`
    });

    try {
      // 1. 保存原始编辑器的值
      let originalValue = '';
      if (originalElement.tagName === 'TEXTAREA') {
        originalValue = originalElement.value || '';
      } else if (originalElement.isContentEditable || originalElement.querySelector('[contenteditable="true"]')) {
        originalValue = originalElement.textContent || originalElement.innerHTML || '';
      } else {
        // 尝试从可能的数据属性中获取值
        originalValue = originalElement.dataset.value || 
                        originalElement.getAttribute('value') || 
                        '';
      }

      // 2. 创建Vditor容器
      const vditorContainer = document.createElement('div');
      vditorContainer.id = vditorId;
      vditorContainer.className = 'vditor-replaced-container';
      vditorContainer.style.cssText = `
        width: 100%;
        min-height: 500px;
        position: relative;
        border: 2px solid #10b981;
        border-radius: 8px;
        margin: 10px 0;
        overflow: hidden;
      `;

      // 3. 添加状态指示器
      const statusIndicator = document.createElement('div');
      statusIndicator.style.cssText = `
        position: absolute;
        top: 5px;
        right: 5px;
        z-index: 100;
        background: #10b981;
        color: white;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: bold;
        opacity: 0.8;
      `;
      statusIndicator.textContent = 'Vditor';
      vditorContainer.appendChild(statusIndicator);

      // 4. 在原始位置插入Vditor容器
      originalElement.parentNode.insertBefore(vditorContainer, originalElement);
      
      // 5. 隐藏原始编辑器（而不是移除，以防万一）
      originalElement.style.cssText = `
        position: absolute !important;
        left: -9999px !important;
        width: 1px !important;
        height: 1px !important;
        opacity: 0 !important;
        pointer-events: none !important;
      `;

      // 6. 初始化Vditor
      setTimeout(() => {
        try {
          const vditor = new Vditor(vditorId, {
            height: 500,
            placeholder: '由拦截引擎加载的 Vditor 编辑器...',
            value: originalValue,
            theme: 'classic',
            toolbar: [
              'emoji', 'headings', 'bold', 'italic', 'strike', 'link',
              '|', 'list', 'ordered-list', 'check',
              '|', 'quote', 'code', 'inline-code', 'table',
              '|', 'undo', 'redo', 'preview', 'fullscreen'
            ],
            input: (value) => {
              // 同步回原始编辑器（保持CMS数据流）
              if (originalElement.tagName === 'TEXTAREA') {
                originalElement.value = value;
              }
              
              // 触发可能的事件
              const event = new Event('input', { bubbles: true });
              originalElement.dispatchEvent(event);
              
              debugLog(`编辑器输入同步: ${vditorId}`, value.length);
            },
            cache: { enable: false }
          });

          // 存储Vditor实例引用
          vditorInstances.set(vditorId, {
            instance: vditor,
            originalElement: originalElement,
            container: vditorContainer
          });

          debugLog(`✅ 成功替换: ${originalId} -> ${vditorId}`);

          // 7. 添加成功标记
          const successBadge = document.createElement('div');
          successBadge.style.cssText = `
            position: absolute;
            bottom: 5px;
            right: 5px;
            background: rgba(16, 185, 129, 0.1);
            color: #10b981;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
            border: 1px solid #10b981;
          `;
          successBadge.textContent = '✓ 已启用';
          vditorContainer.appendChild(successBadge);

        } catch (vditorError) {
          debugLog(`❌ Vditor初始化失败: ${vditorError.message}`);
          
          // 恢复显示原始编辑器
          originalElement.style.cssText = '';
          vditorContainer.remove();
          originalElement.__vditor_replaced = false;
          replacedEditors.delete(originalId);
          
          // 显示错误信息
          const errorDiv = document.createElement('div');
          errorDiv.style.cssText = `
            padding: 20px;
            background: #fed7d7;
            color: #742a2a;
            border: 2px dashed #e53e3e;
            border-radius: 8px;
            margin: 10px 0;
          `;
          errorDiv.innerHTML = `
            <strong>Vditor 加载失败</strong><br>
            <small>${vditorError.message || '未知错误'}</small><br>
            <button onclick="this.parentElement.nextElementSibling.style.display='block';this.remove()" 
              style="margin-top:10px; padding:4px 8px; background:#e53e3e; color:white; border:none; border-radius:4px; cursor:pointer;">
              显示原始编辑器
            </button>
          `;
          
          originalElement.parentNode.insertBefore(errorDiv, originalElement);
          originalElement.style.display = 'block';
        }
      }, 100);

      return true;

    } catch (error) {
      debugLog(`❌ 替换过程出错: ${error.message}`);
      originalElement.__vditor_replaced = false;
      replacedEditors.delete(originalId);
      return false;
    }
  }

  // ==================== 轮询监控函数 ====================
  function startEditorPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
    }

    pollStartTime = Date.now();
    let pollCount = 0;

    pollTimer = setInterval(() => {
      pollCount++;
      
      // 安全检查：超时停止
      if (Date.now() - pollStartTime > CONFIG.maxPollTime) {
        debugLog(`轮询超时 (${CONFIG.maxPollTime}ms)，停止监控`);
        clearInterval(pollTimer);
        return;
      }

      debugLog(`第 ${pollCount} 次轮询检查...`);
      
      // 查找并替换编辑器
      const targetEditors = findTargetEditors();
      let replacedCount = 0;

      targetEditors.forEach(editor => {
        if (replaceEditorWithVditor(editor)) {
          replacedCount++;
        }
      });

      if (replacedCount > 0) {
        debugLog(`🎉 本轮替换了 ${replacedCount} 个编辑器`);
      }

      // 如果找到了CMS根容器，可以更精确地监控
      const cmsRoot = document.querySelector('.cms-root, .nc-root, #cms-root, [data-netlify-cms-root]');
      if (cmsRoot && !cmsRoot.__vditor_observed) {
        setupMutationObserver(cmsRoot);
      }

    }, CONFIG.pollInterval);
  }

  // ==================== 突变观察器 (更高效的监控) ====================
  function setupMutationObserver(rootElement) {
    if (!rootElement || rootElement.__vditor_observed) return;

    debugLog('设置突变观察器以监控DOM变化');
    
    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      
      mutations.forEach(mutation => {
        // 检查是否有新增的节点可能是编辑器
        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
          for (let node of mutation.addedNodes) {
            if (node.nodeType === 1) { // 元素节点
              const isEditorLike = node.querySelector && (
                node.querySelector('textarea') || 
                node.querySelector('[contenteditable="true"]') ||
                node.className && (
                  node.className.includes('markdown') ||
                  node.className.includes('editor') ||
                  node.className.includes('Editor')
                )
              );
              
              if (isEditorLike) {
                shouldCheck = true;
                break;
              }
            }
          }
        }
      });

      if (shouldCheck) {
        debugLog('检测到可能的编辑器DOM变化，立即检查');
        setTimeout(() => {
          const editors = findTargetEditors();
          editors.forEach(editor => {
            if (!editor.__vditor_replaced) {
              replaceEditorWithVditor(editor);
            }
          });
        }, 300);
      }
    });

    observer.observe(rootElement, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });

    rootElement.__vditor_observed = true;
    rootElement.__vditor_observer = observer;
  }

  // ==================== 传统注册方法 (备用) ====================
  function attemptTraditionalRegistration() {
    if (!CONFIG.enableTraditionalRegister || !window.CMS || !window.createClass) return;
    
    try {
      const VditorControl = createClass({
        getInitialState: function() {
          this._editorId = `vditor-registered-${Date.now()}`;
          return { value: this.props.value || '' };
        },
        componentDidMount: function() {
          setTimeout(() => {
            const container = document.getElementById(this._editorId);
            if (container) {
              new Vditor(this._editorId, {
                height: 400,
                value: this.state.value,
                input: (value) => {
                  if (this.props.onChange) this.props.onChange(value);
                }
              });
            }
          }, 100);
        },
        render: function() {
          return h('div', { id: this._editorId, style: { minHeight: '400px' } });
        }
      });

      CMS.registerWidget('vditor-markdown', VditorControl);
      debugLog('✅ 已通过传统方法注册 vditor-markdown 控件');
    } catch (e) {
      debugLog(`传统注册失败: ${e.message}`);
    }
  }

  // ==================== 全局管理接口 ====================
  window.__vditorInterceptor = {
    status: () => ({
      polling: !!pollTimer,
      replacedCount: replacedEditors.size,
      instances: vditorInstances.size,
      startTime: pollStartTime,
      config: CONFIG
    }),
    
    listReplaced: () => Array.from(replacedEditors),
    
    listInstances: () => Array.from(vditorInstances.keys()),
    
    forceReplace: () => {
      debugLog('手动触发替换检查...');
      const editors = findTargetEditors();
      editors.forEach(replaceEditorWithVditor);
      return editors.length;
    },
    
    destroyAll: () => {
      vditorInstances.forEach((data, id) => {
        try {
          data.instance.destroy();
          if (data.originalElement) {
            data.originalElement.style.cssText = '';
          }
          if (data.container) {
            data.container.remove();
          }
        } catch (e) {}
      });
      vditorInstances.clear();
      replacedEditors.clear();
      debugLog('已销毁所有Vditor实例');
    },
    
    stopPolling: () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
        debugLog('已停止轮询监控');
      }
    }
  };

  // ==================== 初始化 ====================
  function initialize() {
    debugLog('初始化拦截引擎...');
    
    // 等待Vditor库加载
    if (typeof Vditor === 'undefined') {
      debugLog('Vditor库未加载，等待中...');
      setTimeout(initialize, 500);
      return;
    }

    debugLog('✅ Vditor库已就绪，版本:', Vditor.version);
    
    // 尝试传统注册（备用）
    attemptTraditionalRegistration();
    
    // 启动轮询监控
    startEditorPolling();
    
    // 设置全局DOM监控
    setupMutationObserver(document.body);
    
    debugLog('🚀 Vditor拦截引擎已启动');
    
    // 添加可视化状态指示器
    addStatusIndicator();
  }

  // ==================== 状态指示器 ====================
  function addStatusIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'vditor-status-indicator';
    indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: #10b981;
      color: white;
      padding: 10px 15px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    
    const dot = document.createElement('div');
    dot.style.cssText = `
      width: 8px;
      height: 8px;
      background: #fff;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    `;
    
    const text = document.createElement('span');
    text.textContent = 'Vditor 拦截器运行中';
    
    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    indicator.appendChild(dot);
    indicator.appendChild(text);
    
    // 点击显示状态信息
    indicator.addEventListener('click', () => {
      const status = window.__vditorInterceptor.status();
      alert(`Vditor 拦截器状态:\n\n` +
            `已替换编辑器: ${status.replacedCount} 个\n` +
            `运行时间: ${Math.round((Date.now() - status.startTime) / 1000)} 秒\n` +
            `轮询状态: ${status.polling ? '运行中' : '已停止'}\n\n` +
            `在控制台使用 window.__vditorInterceptor 管理`);
    });
    
    document.body.appendChild(indicator);
    
    // 5秒后自动半透明
    setTimeout(() => {
      indicator.style.opacity = '0.7';
      indicator.style.transition = 'opacity 0.5s';
    }, 5000);
  }

  // ==================== 启动 ====================
  // 等待页面基本就绪
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initialize, 1000); // 额外等待确保CMS初始化
    });
  } else {
    setTimeout(initialize, 1000);
  }

  console.log('🎯 Vditor DOM拦截引擎脚本加载完成');
  console.log('💡 页面加载后将自动扫描并替换markdown编辑器');
  console.log('💡 使用 window.__vditorInterceptor 管理拦截器');
})();