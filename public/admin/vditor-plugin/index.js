(function() {
  'use strict';

  if (window.decapCmsVditorPlugin) return;
  console.log('🔄 Vditor 插件初始化...');

  const CONFIG = {
    widgetName: 'vditor',
    debug: true  // 调试模式开启，便于排查
  };

  // 创建编辑器控件 - 修复数据同步问题
  function createControl() {
    if (!window.createClass || !window.h) {
      console.error('缺少 React 依赖');
      return null;
    }

    return createClass({
      getInitialState() {
        const initialValue = this.props.value || '';
        this._id = `vditor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        CONFIG.debug && console.log(`创建控件 ${this._id}，初始值长度:`, initialValue.length);
        
        return { 
          value: initialValue, 
          ready: false,
          syncCounter: 0
        };
      },

      componentDidMount() {
        CONFIG.debug && console.log(`组件挂载: ${this._id}`);
        setTimeout(() => this.initEditor(), 100);
      },

      componentDidUpdate(prevProps, prevState) {
        // 1. 当外部props变化时（例如从CMS加载已有内容），同步到编辑器
        if (prevProps.value !== this.props.value) {
          CONFIG.debug && console.log(`外部值变化: ${this._id}`, {
            旧长度: prevProps.value ? prevProps.value.length : 0,
            新长度: this.props.value ? this.props.value.length : 0
          });
          
          this.setState({ value: this.props.value || '' }, () => {
            // 更新Vditor实例的内容
            if (this._instance && this._instance.setValue) {
              this._instance.setValue(this.state.value);
            }
          });
        }
      },

      componentWillUnmount() {
        CONFIG.debug && console.log(`组件卸载: ${this._id}`);
        if (this._instance && this._instance.destroy) {
          try {
            this._instance.destroy();
          } catch (e) {
            console.warn('销毁Vditor时出错:', e);
          }
        }
      },

      initEditor() {
        const container = document.getElementById(this._id);
        if (!container) {
          CONFIG.debug && console.warn(`找不到容器 ${this._id}，重试...`);
          setTimeout(() => this.initEditor(), 200);
          return;
        }

        try {
          CONFIG.debug && console.log(`初始化Vditor: ${this._id}，内容长度:`, this.state.value.length);
          
          this._instance = new Vditor(this._id, {
            height: 500,
            placeholder: '开始编辑...',
            value: this.state.value,
            theme: 'classic',
            icon: 'ant',
            toolbar: [
              'emoji', 'headings', 'bold', 'italic', 'strike', 'link',
              '|', 'list', 'ordered-list', 'check',
              '|', 'quote', 'code', 'inline-code', 'table',
              '|', 'undo', 'redo', 'preview', 'fullscreen'
            ],
            upload: {
              accept: 'image/*',
              multiple: true,
              // 使用独立的上传模块
              handler: window.vditorUploader ? 
                window.vditorUploader.handleUpload.bind(window.vditorUploader) : 
                function(files) {
                  console.log('默认上传处理器，请安装上传模块');
                  return Promise.resolve([]);
                }
            },
            
            // 关键修复：使用防抖的输入处理，确保实时同步
            input: (value) => {
              // 防抖处理，避免频繁更新
              if (this._inputTimer) clearTimeout(this._inputTimer);
              
              this._inputTimer = setTimeout(() => {
                CONFIG.debug && console.log(`Vditor输入同步: ${this._id}，长度: ${value.length}`);
                
                // 更新组件状态
                this.setState({ 
                  value: value,
                  syncCounter: this.state.syncCounter + 1
                });
                
                // 关键：必须调用onChange通知Decap CMS数据已更新
                if (this.props.onChange) {
                  CONFIG.debug && console.log(`调用onChange回调，长度: ${value.length}`);
                  this.props.onChange(value);
                } else {
                  console.error('onChange回调不存在！');
                }
              }, 300); // 300ms防抖
            },
            
            // 额外的回调，确保各种操作都能同步
            blur: () => {
              const value = this._instance.getValue();
              CONFIG.debug && console.log(`编辑器失去焦点，同步内容，长度: ${value.length}`);
              this.syncValueToCMS(value);
            },
            
            // 工具栏操作后的回调
            after: () => {
              // 确保初始化后内容同步
              setTimeout(() => {
                const value = this._instance.getValue();
                if (value !== this.state.value) {
                  this.syncValueToCMS(value);
                }
              }, 100);
            }
          });

          this.setState({ ready: true });
          CONFIG.debug && console.log(`✅ Vditor初始化完成: ${this._id}`);
          
          // 初始化后立即同步一次
          setTimeout(() => {
            const value = this._instance.getValue();
            if (value !== this.state.value) {
              this.syncValueToCMS(value);
            }
          }, 500);
          
        } catch (e) {
          console.error(`Vditor初始化失败 (${this._id}):`, e);
          container.innerHTML = `
            <div style="padding:20px;border:2px dashed #e53e3e;color:#c53030;border-radius:8px;">
              <strong>Vditor加载失败</strong><br>
              <small>${e.message}</small><br>
              <button onclick="location.reload()" style="margin-top:10px;padding:5px 10px;background:#e53e3e;color:white;border:none;border-radius:4px;cursor:pointer;">
                刷新重试
              </button>
            </div>
          `;
        }
      },

      // 同步值到CMS的专用方法
      syncValueToCMS(value) {
        CONFIG.debug && console.log(`主动同步到CMS: ${this._id}，长度: ${value.length}`);
        
        this.setState({ value: value });
        
        if (this.props.onChange) {
          this.props.onChange(value);
        } else {
          console.error('无法同步：onChange回调不存在');
        }
      },

      // 添加一个隐藏的textarea，供Decap CMS表单提交使用（兼容性方案）
      render() {
        const fieldName = this.props.field ? this.props.field.get('name') : 'content';
        
        CONFIG.debug && console.log(`渲染控件 ${this._id}，字段: ${fieldName}，值长度: ${this.state.value.length}`);
        
        return h('div', { className: 'vditor-container' }, [
          // 关键：隐藏的textarea，确保Decap CMS表单提交能捕获到值
          h('textarea', {
            key: 'hidden-field',
            name: fieldName,  // 必须与字段名匹配
            value: this.state.value,
            readOnly: true,
            style: {
              display: 'none',
              position: 'absolute',
              left: '-9999px'
            },
            'data-decap-cms-field': fieldName  // 额外的标识
          }),
          
          // Vditor编辑器容器
          h('div', { 
            id: this._id,
            style: { 
              minHeight: '500px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              overflow: 'hidden'
            }
          }),
          
          // 状态指示器
          !this.state.ready && h('div', { 
            style: { 
              padding: '10px', 
              textAlign: 'center', 
              color: '#6b7280',
              fontSize: '14px',
              backgroundColor: '#f9fafb',
              borderRadius: '6px',
              marginTop: '10px'
            } 
          }, '编辑器加载中...'),
          
          // 调试信息（仅调试模式显示）
          CONFIG.debug && h('div', {
            style: {
              fontSize: '12px',
              color: '#6b7280',
              marginTop: '5px',
              padding: '5px',
              backgroundColor: '#f3f4f6',
              borderRadius: '4px',
              border: '1px dashed #d1d5db'
            }
          }, `同步次数: ${this.state.syncCounter} | 长度: ${this.state.value.length}`)
        ]);
      }
    });
  }

  // 创建预览组件（确保预览也能显示内容）
  function createPreview() {
    if (!window.createClass || !window.h) return null;
    
    return createClass({
      render() {
        const value = this.props.value || '';
        const preview = value.length > 300 ? value.substring(0, 300) + '...' : value;
        
        return h('div', {
          style: {
            padding: '15px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            background: '#f9fafb',
            fontSize: '14px',
            lineHeight: '1.6',
            maxHeight: '200px',
            overflowY: 'auto'
          }
        }, [
          h('div', {
            style: {
              fontSize: '12px',
              color: '#6b7280',
              marginBottom: '10px',
              fontWeight: 'bold'
            }
          }, '预览'),
          h('div', {}, preview || '(空内容)')
        ]);
      }
    });
  }

  // 注册插件
  function registerPlugin() {
    if (!window.CMS || !window.CMS.registerWidget) {
      console.log('等待CMS加载...');
      setTimeout(registerPlugin, 100);
      return;
    }

    if (typeof Vditor === 'undefined') {
      console.log('等待Vditor库加载...');
      setTimeout(registerPlugin, 100);
      return;
    }

    try {
      const Control = createControl();
      const Preview = createPreview();
      
      if (!Control) {
        throw new Error('无法创建控件');
      }

      // 注册控件（同时注册预览组件）
      window.CMS.registerWidget(CONFIG.widgetName, Control, Preview);
      
      window.decapCmsVditorPlugin = { 
        widget: CONFIG.widgetName, 
        version: '1.2',
        debug: CONFIG.debug
      };
      
      console.log(`✅ ${CONFIG.widgetName} 插件注册成功`);
      
      // 添加全局调试接口
      window.__vditorDebug = {
        getWidgetInfo: () => {
          const widget = window.CMS.getWidget(CONFIG.widgetName);
          return {
            registered: !!widget,
            controlType: widget ? typeof widget.control : '未找到',
            previewType: widget ? typeof widget.preview : '未找到'
          };
        },
        testOnChange: (fieldName = 'body') => {
          // 模拟CMS的onChange调用
          const mockProps = {
            field: { get: (key) => key === 'name' ? fieldName : null },
            onChange: (value) => console.log(`onChange被调用，值长度: ${value.length}`)
          };
          console.log('测试onChange回调:', mockProps.onChange);
        }
      };
      
    } catch (e) {
      console.error('插件注册失败:', e);
    }
  }

  // 启动
  function init() {
    if (typeof Vditor === 'undefined') {
      setTimeout(init, 500);
      return;
    }
    
    console.log('🚀 启动Vditor插件...');
    registerPlugin();
  }

  // 页面加载后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 1000);
  }
})();