// vditor-final.js - 适用于 Decap CMS 单页应用的增强版
(function () {
  'use strict';

  console.log('🔧 Vditor 集成脚本加载 (SPA优化版)');

  // ==================== 配置区域 ====================
  const CONFIG = {
    widgetName: 'markdown',          // 要替换的控件名称
    maxRetryCount: 50,               // 最大重试次数
    retryInterval: 300,              // 重试间隔（毫秒）
    debug: true,                     // 启用详细日志
    monitorRouteChanges: true        // 监控路由变化
  };

  // ==================== 状态管理 ====================
  let integrationAttempts = 0;
  let isIntegrated = false;
  let routeChangeHandler = null;

  // ==================== 工具函数 ====================
  function debugLog(...args) {
    if (CONFIG.debug) {
      console.log('[Vditor]', ...args);
    }
  }

  function errorLog(...args) {
    console.error('[Vditor]', ...args);
  }

  // ==================== 核心检查函数 ====================
  function checkDependencies() {
    const deps = {
      createClass: typeof createClass,
      h: typeof h,
      Vditor: typeof Vditor,
      CMS: typeof CMS,
      CMS_registerWidget: CMS && typeof CMS.registerWidget,
      CMS_getWidget: CMS && typeof CMS.getWidget
    };

    debugLog('依赖检查结果:', Object.entries(deps).map(([k, v]) => `${k}: ${v}`).join(', '));

    const allOk = deps.createClass === 'function' &&
      deps.h === 'function' &&
      deps.Vditor === 'function' &&
      deps.CMS_registerWidget === 'function';

    if (!allOk) {
      debugLog('部分依赖未就绪:', Object.entries(deps)
        .filter(([_, v]) => !v || v === 'undefined')
        .map(([k]) => k));
    }

    return allOk;
  }

  // ==================== 创建编辑器控件 ====================
  function createVditorWidget() {
    return createClass({
      getInitialState: function () {
        // 生成唯一ID，避免冲突
        const fieldName = this.props.field ? this.props.field.get('name') : 'body';
        const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this._editorId = `vditor-${fieldName}-${uniqueId}`;
        this._isMounted = false;

        debugLog(`控件实例创建: ${this._editorId}`, {
          字段名: fieldName,
          初始值长度: (this.props.value || '').length,
          有onChange回调: !!this.props.onChange
        });

        return {
          value: this.props.value || '',
          initialized: false,
          error: null
        };
      },

      componentDidMount: function () {
        this._isMounted = true;
        debugLog(`组件挂载完成: ${this._editorId}`);

        // 使用微任务确保DOM已更新
        setTimeout(() => {
          if (this._isMounted) {
            this._initializeVditor();
          }
        }, 0);
      },

      componentDidUpdate: function (prevProps) {
        // 当外部值变化时同步到编辑器
        if (prevProps.value !== this.props.value && this._vditor) {
          const newValue = this.props.value || '';
          const currentValue = this._vditor.getValue();

          if (newValue !== currentValue) {
            debugLog(`外部值变化，同步到编辑器: ${this._editorId}`, {
              旧长度: currentValue.length,
              新长度: newValue.length
            });

            this._vditor.setValue(newValue);
            this.setState({ value: newValue });
          }
        }
      },

      componentWillUnmount: function () {
        this._isMounted = false;
        debugLog(`组件即将卸载: ${this._editorId}`);

        // 清理Vditor实例
        if (this._vditor && typeof this._vditor.destroy === 'function') {
          try {
            this._vditor.destroy();
            debugLog(`Vditor实例已销毁: ${this._editorId}`);
          } catch (e) {
            debugLog(`销毁Vditor时出错: ${e.message}`);
          }
        }
      },

      _initializeVditor: function () {
        if (!this._isMounted) {
          debugLog(`组件未挂载，跳过初始化: ${this._editorId}`);
          return;
        }

        const container = document.getElementById(this._editorId);
        if (!container) {
          const errorMsg = `找不到容器元素 #${this._editorId}`;
          errorLog(errorMsg);
          this.setState({ error: errorMsg });

          // 尝试重新查找（可能DOM还没更新完）
          setTimeout(() => {
            if (this._isMounted && !this.state.initialized) {
              debugLog(`重新尝试查找容器: ${this._editorId}`);
              this._initializeVditor();
            }
          }, 100);

          return;
        }

        try {
          debugLog(`开始初始化Vditor: ${this._editorId}`, {
            容器存在: true,
            容器尺寸: `${container.offsetWidth}×${container.offsetHeight}`
          });

          // 创建Vditor实例
          this._vditor = new Vditor(this._editorId, {
            height: 500,
            placeholder: '开始编辑内容...',
            value: this.state.value,
            theme: 'classic',
            icon: 'ant',
            // 完整的工具栏配置
            toolbar: [
              'emoji',
              'headings',
              'bold',
              'italic',
              'strike',
              'link',
              '|',
              'list',
              'ordered-list',
              'check',
              'outdent',
              'indent',
              '|',
              'quote',
              'line',
              'code',
              'inline-code',
              'insert-before',
              'insert-after',
              '|',
              'upload',
              'table',
              '|',
              'undo',
              'redo',
              '|',
              'fullscreen',
              'preview',
              'outline'
            ],
            // 输入事件处理
            input: (value) => {
              if (!this._isMounted) return;

              this.setState({ value: value });

              // 通知CMS值已变化
              if (this.props.onChange) {
                this.props.onChange(value);
              }

              debugLog(`编辑器输入: ${this._editorId}`, {
                长度: value.length,
                前50字符: value.substring(0, 50) + (value.length > 50 ? '...' : '')
              });
            },
            // 缓存设置
            cache: {
              enable: false
            },
            // 上传处理（需要根据实际情况配置）
            upload: {
              accept: 'image/*',
              handler: (files) => {
                debugLog(`上传文件: ${files.length}个`);
                // 这里需要实现你的上传逻辑
                return Promise.resolve([]);
              }
            },
            // 额外的回调
            after: () => {
              debugLog(`Vditor after回调: ${this._editorId}`);
              this.setState({ initialized: true });
            },
            focus: () => debugLog(`编辑器获得焦点: ${this._editorId}`),
            blur: () => debugLog(`编辑器失去焦点: ${this._editorId}`)
          });

          debugLog(`✅ Vditor初始化完成: ${this._editorId}`);

        } catch (error) {
          const errorMsg = `Vditor初始化失败: ${error.message}`;
          errorLog(errorMsg, error);
          this.setState({ error: errorMsg });

          // 显示错误信息
          container.innerHTML = `
            <div style="
              padding: 20px;
              margin: 10px 0;
              border: 2px solid #e53e3e;
              border-radius: 8px;
              background: #fed7d7;
              color: #742a2a;
              font-family: system-ui, -apple-system, sans-serif;
            ">
              <div style="font-weight: bold; margin-bottom: 8px;">
                ⚠️ Vditor 编辑器加载失败
              </div>
              <div style="font-size: 14px; margin-bottom: 12px;">
                错误: ${error.message || '未知错误'}
              </div>
              <button onclick="location.reload()" style="
                background: #e53e3e;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
              ">
                刷新页面重试
              </button>
            </div>
          `;
        }
      },

      render: function () {
        // 重要：只返回虚拟DOM，不进行直接DOM操作
        return h('div', {
          className: 'vditor-widget-container',
          'data-vditor-instance': this._editorId,
          style: {
            width: '100%',
            position: 'relative'
          }
        }, [
          // 可选的标题区域
          h('div', {
            key: 'header',
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
              fontSize: '12px',
              color: '#4a5568'
            }
          }, [
            h('span', { style: { fontWeight: 'bold' } },
              this.props.field ? this.props.field.get('label') || '内容' : 'Vditor编辑器'),
            h('span', {
              style: {
                padding: '2px 8px',
                borderRadius: '12px',
                background: this.state.initialized ? '#c6f6d5' :
                  this.state.error ? '#fed7d7' : '#bee3f8',
                color: this.state.initialized ? '#22543d' :
                  this.state.error ? '#742a2a' : '#2a4365',
                fontSize: '11px'
              }
            }, this.state.initialized ? '已加载' :
              this.state.error ? '错误' : '初始化中...')
          ]),

          // 编辑器容器
          h('div', {
            key: 'editor-container',
            id: this._editorId,
            style: {
              width: '100%',
              minHeight: '500px',
              border: this.state.error ? '2px dashed #e53e3e' : '1px solid #cbd5e0',
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: '#fff'
            }
          }),

          // 错误信息显示
          this.state.error && h('div', {
            key: 'error',
            style: {
              marginTop: '10px',
              padding: '10px',
              background: '#fff5f5',
              border: '1px solid #fed7d7',
              borderRadius: '6px',
              color: '#c53030',
              fontSize: '12px'
            }
          }, `错误: ${this.state.error}`)
        ]);
      }
    });
  }

  // ==================== 创建预览组件 ====================
  function createVditorPreview() {
    return createClass({
      render: function () {
        const value = this.props.value || '';
        const previewText = value.length > 250 ?
          value.substring(0, 250) + '...' : value;

        return h('div', {
          className: 'vditor-preview-widget',
          style: {
            padding: '15px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            background: '#f7fafc',
            fontSize: '14px',
            lineHeight: '1.6'
          }
        }, [
          h('div', {
            style: {
              fontSize: '12px',
              color: '#718096',
              marginBottom: '10px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }
          }, '预览'),
          h('div', {
            style: {
              maxHeight: '200px',
              overflowY: 'auto',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }
          }, previewText || '(空内容)'),
          value.length > 250 && h('div', {
            style: {
              fontSize: '11px',
              color: '#a0aec0',
              marginTop: '8px',
              fontStyle: 'italic'
            }
          }, `... 预览已截断，全文共 ${value.length} 个字符`)
        ]);
      }
    });
  }

  // ==================== 核心集成函数 ====================
  function integrateVditor() {
    integrationAttempts++;

    if (integrationAttempts > CONFIG.maxRetryCount) {
      errorLog(`达到最大重试次数 (${CONFIG.maxRetryCount})，放弃集成`);
      return;
    }

    debugLog(`集成尝试 #${integrationAttempts}`);

    // 检查依赖
    if (!checkDependencies()) {
      debugLog(`依赖未就绪，${CONFIG.retryInterval}ms后重试...`);
      setTimeout(integrateVditor, CONFIG.retryInterval);
      return;
    }

    try {
      // 创建控件
      const VditorControl = createVditorWidget();
      const VditorPreview = createVditorPreview();

      debugLog('Vditor控件创建成功');

      // 检查当前是否已注册
      const existingWidget = CMS.getWidget(CONFIG.widgetName);
      const isAlreadyOurWidget = existingWidget &&
        existingWidget.control &&
        existingWidget.control.prototype &&
        existingWidget.control.prototype._editorId !== undefined;

      if (isAlreadyOurWidget) {
        debugLog(`✅ ${CONFIG.widgetName} 控件已经是我们的Vditor版本`);
        isIntegrated = true;
        return;
      }

      // 注册控件
      debugLog(`正在注册控件: ${CONFIG.widgetName}`);
      CMS.registerWidget(CONFIG.widgetName, VditorControl, VditorPreview);

      // 验证注册
      setTimeout(() => {
        const registeredWidget = CMS.getWidget(CONFIG.widgetName);
        if (registeredWidget && registeredWidget.control === VditorControl) {
          debugLog(`✅ 成功替换 ${CONFIG.widgetName} 控件为 Vditor！`);
          isIntegrated = true;

          // 同时注册一个备用名称
          CMS.registerWidget('vditor-markdown', VditorControl, VditorPreview);
          debugLog('✅ 已注册备用控件: vditor-markdown');

          // 在页面上添加一个可视化标记
          addIntegrationMarker();

        } else {
          errorLog(`❌ 控件注册验证失败，${CONFIG.retryInterval}ms后重试`);
          isIntegrated = false;
          setTimeout(integrateVditor, CONFIG.retryInterval);
        }
      }, 100);

    } catch (error) {
      errorLog(`集成过程中出错: ${error.message}`, error);
      debugLog(`${CONFIG.retryInterval}ms后重试...`);
      setTimeout(integrateVditor, CONFIG.retryInterval);
    }
  }

  // ==================== 路由监控 ====================
  function setupRouteMonitoring() {
    if (!CONFIG.monitorRouteChanges) return;

    debugLog('设置路由变化监控...');

    let lastHash = window.location.hash;

    routeChangeHandler = setInterval(() => {
      const currentHash = window.location.hash;

      if (currentHash !== lastHash) {
        debugLog(`路由变化: ${lastHash} -> ${currentHash}`);
        lastHash = currentHash;

        // 路由变化后，重新检查集成状态
        if (isIntegrated) {
          debugLog('路由变化，检查集成状态...');

          // 延迟一点时间，让CMS有时间创建新的编辑器
          setTimeout(() => {
            const widget = CMS.getWidget(CONFIG.widgetName);
            if (!widget || widget.control !== createVditorWidget) {
              debugLog('检测到控件可能被重置，重新集成...');
              isIntegrated = false;
              integrateVditor();
            }
          }, 1000);
        }
      }
    }, 500);
  }

  // ==================== 添加集成标记 ====================
  function addIntegrationMarker() {
    // 在页面上添加一个小的标记，方便确认集成成功
    const marker = document.createElement('div');
    marker.id = 'vditor-integration-marker';
    marker.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      padding: 6px 12px;
      background: #38a169;
      color: white;
      font-size: 11px;
      font-weight: bold;
      border-radius: 20px;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      opacity: 0.9;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    marker.textContent = '✓ Vditor 已激活';
    marker.title = 'Vditor 编辑器已成功集成到 Decap CMS';

    document.body.appendChild(marker);

    // 5秒后淡出
    setTimeout(() => {
      marker.style.opacity = '0.3';
    }, 5000);
  }

  // ==================== 初始化函数 ====================
  function initialize() {
    debugLog('初始化 Vditor 集成...');

    // 立即开始集成尝试
    integrateVditor();

    // 设置路由监控
    setupRouteMonitoring();

    // 添加全局帮助函数
    window.__vditorIntegration = {
      status: () => ({
        integrated: isIntegrated,
        attempts: integrationAttempts,
        widgetName: CONFIG.widgetName,
        dependencies: checkDependencies()
      }),
      retry: () => {
        isIntegrated = false;
        integrateVditor();
      },
      checkWidget: () => CMS.getWidget(CONFIG.widgetName)
    };

    debugLog('全局帮助函数可用: window.__vditorIntegration');
  }

  // ==================== 启动集成 ====================
  // 等待DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    // DOM已就绪，直接初始化
    setTimeout(initialize, 100);
  }

  // 防止内存泄漏
  window.addEventListener('unload', () => {
    if (routeChangeHandler) {
      clearInterval(routeChangeHandler);
    }
  });

  console.log('🔧 Vditor SPA集成脚本加载完成');
})();