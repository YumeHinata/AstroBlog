// vditor-plugin/index.js
(function(global) {
  'use strict';

  // 检查是否已经加载
  if (global.decapCmsVditorPlugin) {
    return;
  }

  console.log('📦 Vditor Plugin for Decap CMS 开始加载...');

  // ==================== 插件配置 ====================
  const PLUGIN_CONFIG = {
    name: 'vditor-plugin',
    version: '1.0.0',
    widgetName: 'vditor',
    debug: true
  };

  // ==================== 核心 Vditor 组件 ====================
  function createVditorControl() {
    // 使用 Decap CMS 提供的 React 工具
    const React = window.CMS.React || (window.createClass && { createClass: window.createClass });
    const h = window.h || (React && React.createElement);
    
    if (!React || !h) {
      console.error('无法找到 React 工具');
      return null;
    }

    // 创建控制组件
    return React.createClass({
      displayName: 'VditorControl',

      getInitialState: function() {
        const fieldName = this.props.field ? this.props.field.get('name') : 'content';
        this._editorId = `vditor-${fieldName}-${Date.now()}`;
        
        if (PLUGIN_CONFIG.debug) {
          console.log(`[Vditor插件] 创建控件: ${this._editorId}`);
        }

        return {
          value: this.props.value || '',
          initialized: false,
          error: null
        };
      },

      componentDidMount: function() {
        // 等待一小段时间确保 DOM 渲染完成
        this._initTimeout = setTimeout(() => {
          this.initializeVditor();
        }, 100);
      },

      componentDidUpdate: function(prevProps) {
        // 外部值变化时更新编辑器
        if (prevProps.value !== this.props.value && this._vditorInstance) {
          const newValue = this.props.value || '';
          if (newValue !== this._vditorInstance.getValue()) {
            this._vditorInstance.setValue(newValue);
            this.setState({ value: newValue });
          }
        }
      },

      componentWillUnmount: function() {
        // 清理定时器
        if (this._initTimeout) {
          clearTimeout(this._initTimeout);
        }
        
        // 销毁 Vditor 实例
        if (this._vditorInstance && this._vditorInstance.destroy) {
          try {
            this._vditorInstance.destroy();
            if (PLUGIN_CONFIG.debug) {
              console.log(`[Vditor插件] 销毁实例: ${this._editorId}`);
            }
          } catch (e) {
            console.warn('销毁 Vditor 时出错:', e);
          }
        }
      },

      initializeVditor: function() {
        if (!this._editorId) return;

        try {
          const container = document.getElementById(this._editorId);
          if (!container) {
            throw new Error(`找不到容器元素: ${this._editorId}`);
          }

          if (PLUGIN_CONFIG.debug) {
            console.log(`[Vditor插件] 初始化编辑器: ${this._editorId}`);
          }

          // 创建 Vditor 实例
          this._vditorInstance = new Vditor(this._editorId, {
            height: 500,
            placeholder: '开始编辑内容...',
            value: this.state.value,
            theme: 'classic',
            icon: 'ant',
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
            input: (value) => {
              // 更新本地状态
              this.setState({ value: value });
              
              // 调用 CMS 的 onChange 回调
              if (this.props.onChange) {
                this.props.onChange(value);
              }
              
              if (PLUGIN_CONFIG.debug) {
                console.log(`[Vditor插件] 输入变化: ${value.length} 字符`);
              }
            },
            cache: {
              enable: false
            },
            // 上传配置（需要根据你的后端调整）
            upload: {
              accept: 'image/*',
              handler: (files) => {
                if (PLUGIN_CONFIG.debug) {
                  console.log('[Vditor插件] 上传文件:', files);
                }
                // 这里应该实现你的上传逻辑
                return Promise.resolve([]);
              }
            }
          });

          this.setState({ initialized: true });
          
          if (PLUGIN_CONFIG.debug) {
            console.log(`[Vditor插件] ✅ 初始化成功: ${this._editorId}`);
          }

        } catch (error) {
          console.error('[Vditor插件] ❌ 初始化失败:', error);
          this.setState({ error: error.message });
        }
      },

      render: function() {
        // 使用 h 函数（React.createElement 的别名）创建虚拟 DOM
        return h('div', {
          className: 'vditor-plugin-container',
          style: {
            width: '100%',
            position: 'relative'
          }
        }, [
          // 编辑器容器
          h('div', {
            key: 'editor',
            id: this._editorId,
            style: {
              width: '100%',
              minHeight: '500px',
              border: this.state.error ? '2px dashed #e53e3e' : '1px solid #d1d5db',
              borderRadius: '8px',
              overflow: 'hidden'
            }
          }),
          
          // 错误信息
          this.state.error && h('div', {
            key: 'error',
            style: {
              marginTop: '10px',
              padding: '10px',
              background: '#fed7d7',
              border: '1px solid #feb2b2',
              borderRadius: '6px',
              color: '#742a2a',
              fontSize: '14px'
            }
          }, `错误: ${this.state.error}`),
          
          // 状态指示器
          h('div', {
            key: 'status',
            style: {
              marginTop: '8px',
              fontSize: '12px',
              color: '#6b7280',
              textAlign: 'right'
            }
          }, this.state.initialized ? '✅ Vditor 已就绪' : '🔄 初始化中...')
        ]);
      }
    });
  }

  // ==================== 预览组件 ====================
  function createVditorPreview() {
    const React = window.CMS.React || (window.createClass && { createClass: window.createClass });
    const h = window.h || (React && React.createElement);
    
    if (!React || !h) return null;

    return React.createClass({
      displayName: 'VditorPreview',

      render: function() {
        const value = this.props.value || '';
        const previewText = value.length > 200 ? value.substring(0, 200) + '...' : value;
        
        return h('div', {
          className: 'vditor-preview',
          style: {
            padding: '15px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            background: '#f9fafb',
            fontSize: '14px',
            lineHeight: '1.6'
          }
        }, [
          h('div', {
            style: {
              fontSize: '12px',
              color: '#6b7280',
              marginBottom: '10px',
              fontWeight: 'bold'
            }
          }, 'Vditor 预览'),
          h('div', {}, previewText || '(空内容)')
        ]);
      }
    });
  }

  // ==================== 插件注册函数 ====================
  function registerPlugin() {
    // 等待 CMS 加载完成
    if (!window.CMS || !window.CMS.registerWidget) {
      setTimeout(registerPlugin, 100);
      return;
    }

    // 等待 Vditor 加载
    if (typeof Vditor === 'undefined') {
      console.log('[Vditor插件] 等待 Vditor 库加载...');
      setTimeout(registerPlugin, 100);
      return;
    }

    try {
      // 创建控件和预览组件
      const VditorControl = createVditorControl();
      const VditorPreview = createVditorPreview();
      
      if (!VditorControl) {
        throw new Error('无法创建 Vditor 控件');
      }

      // 注册插件
      window.CMS.registerWidget(PLUGIN_CONFIG.widgetName, VditorControl, VditorPreview);
      
      console.log(`✅ [Vditor插件] 成功注册为 "${PLUGIN_CONFIG.widgetName}" 控件`);
      
      // 也注册为 markdown 的替代品
      window.CMS.registerWidget('markdown', VditorControl, VditorPreview);
      console.log('✅ [Vditor插件] 同时注册为 "markdown" 控件');
      
      // 标记插件已加载
      global.decapCmsVditorPlugin = {
        version: PLUGIN_CONFIG.version,
        widgetName: PLUGIN_CONFIG.widgetName,
        config: PLUGIN_CONFIG
      };

    } catch (error) {
      console.error('[Vditor插件] ❌ 注册失败:', error);
    }
  }

  // ==================== SPA 路由监控 ====================
  function setupRouteMonitoring() {
    let lastHash = window.location.hash;
    
    // 监控哈希变化
    setInterval(() => {
      const currentHash = window.location.hash;
      if (currentHash !== lastHash) {
        lastHash = currentHash;
        
        // 如果是进入编辑界面，确保插件正常工作
        if (currentHash.includes('collections/') && 
            (currentHash.includes('/entries/') || currentHash.includes('/new'))) {
          
          if (PLUGIN_CONFIG.debug) {
            console.log('[Vditor插件] 检测到路由变化:', currentHash);
          }
          
          // 延迟检查，等待 CMS 渲染新界面
          setTimeout(() => {
            const widget = window.CMS.getWidget(PLUGIN_CONFIG.widgetName);
            if (!widget) {
              console.warn('[Vditor插件] 路由变化后控件丢失，重新注册...');
              registerPlugin();
            }
          }, 500);
        }
      }
    }, 300);
  }

  // ==================== 插件初始化 ====================
  function initializePlugin() {
    console.log('[Vditor插件] 初始化...');
    
    // 开始注册插件
    registerPlugin();
    
    // 设置路由监控
    setupRouteMonitoring();
    
    // 添加全局辅助函数
    global.vditorPlugin = {
      getStatus: function() {
        return {
          pluginLoaded: !!global.decapCmsVditorPlugin,
          widgetRegistered: !!(window.CMS && window.CMS.getWidget && window.CMS.getWidget(PLUGIN_CONFIG.widgetName)),
          vditorLoaded: typeof Vditor !== 'undefined',
          reactAvailable: !!(window.CMS && window.CMS.React) || !!(window.createClass && window.h)
        };
      },
      forceRegister: function() {
        registerPlugin();
      },
      testVditor: function() {
        const testDiv = document.createElement('div');
        testDiv.id = 'vditor-plugin-test-' + Date.now();
        testDiv.style.cssText = 'height:200px;width:500px;border:2px solid blue;margin:20px;';
        document.body.appendChild(testDiv);
        
        try {
          new Vditor(testDiv.id, {
            height: 200,
            placeholder: '插件测试编辑器...'
          });
          console.log('✅ Vditor 测试成功');
        } catch (error) {
          console.error('❌ Vditor 测试失败:', error);
        }
      }
    };
    
    console.log('[Vditor插件] 初始化完成');
    console.log('使用 vditorPlugin.getStatus() 检查插件状态');
  }

  // ==================== 启动插件 ====================
  // 等待页面加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePlugin);
  } else {
    // 如果页面已经加载，延迟初始化以确保其他脚本已加载
    setTimeout(initializePlugin, 1000);
  }

})(window);