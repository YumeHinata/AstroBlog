(function() {
  'use strict';

  if (window.decapCmsVditorPlugin) return;
  
  const CONFIG = {
    widgetName: 'vditor',
    uploadHandler: window.vditorUploader?.handleUpload
  };

  // 创建 Vditor 编辑器控件（修复工具栏问题）
  function createVditorControl() {
    return createClass({
      getInitialState: function() {
        this._editorId = 'vditor-' + Date.now();
        this._editorRef = null; // 用于保存 Vditor 实例引用
        return {
          value: this.props.value || '',
          initialized: false,
          isFocused: false
        };
      },

      componentDidMount: function() {
        // 确保 DOM 渲染完成
        requestAnimationFrame(() => {
          this._initVditor();
        });
      },

      componentDidUpdate: function(prevProps) {
        // 外部值变化时更新编辑器
        if (prevProps.value !== this.props.value && this._editorRef) {
          const newValue = this.props.value || '';
          const currentValue = this._editorRef.getValue();
          if (newValue !== currentValue) {
            this._editorRef.setValue(newValue);
            this.setState({ value: newValue });
          }
        }
      },

      componentWillUnmount: function() {
        if (this._editorRef && this._editorRef.destroy) {
          this._editorRef.destroy();
        }
      },

      _initVditor: function() {
        const container = document.getElementById(this._editorId);
        if (!container) {
          // 重试机制
          setTimeout(() => this._initVditor(), 100);
          return;
        }

        try {
          // 清除可能存在的旧内容
          container.innerHTML = '';
          
          // 正确的工具栏配置
          const toolbarConfig = [
            'emoji',
            'headings',
            'bold',
            'italic',
            'strike',
            'link', // 链接按钮
            '|',
            'list',
            'ordered-list',
            'check',
            'outdent',
            'indent',
            '|',
            'quote',
            'code',
            'inline-code',
            'table',
            '|',
            'undo',
            'redo',
            '|',
            {
              name: 'more',
              toolbar: [
                'both',
                'code-theme',
                'content-theme',
                'preview',
                'fullscreen',
                'outline',
                'devtools'
              ]
            }
          ];

          // 初始化 Vditor
          this._editorRef = new Vditor(this._editorId, {
            mode: 'sv', // 使用 splitview 模式确保工具栏正常工作
            height: 500,
            placeholder: '开始编辑内容...',
            value: this.state.value,
            theme: 'classic',
            icon: 'ant',
            typewriterMode: true,
            toolbar: toolbarConfig,
            upload: CONFIG.uploadHandler ? {
              accept: 'image/*',
              multiple: true,
              handler: CONFIG.uploadHandler
            } : undefined,
            input: (value) => {
              this.setState({ value: value });
              if (this.props.onChange) {
                this.props.onChange(value);
              }
            },
            focus: () => {
              this.setState({ isFocused: true });
            },
            blur: () => {
              this.setState({ isFocused: false });
            },
            after: () => {
              this.setState({ initialized: true });
              
              // 确保工具栏事件绑定完成
              setTimeout(() => {
                this._setupToolbarDebug();
              }, 500);
            },
            cache: { enable: false },
            preview: {
              hljs: {
                style: 'github'
              }
            }
          });

        } catch (error) {
          console.error('Vditor 初始化失败:', error);
          container.innerHTML = `
            <div style="
              padding: 20px;
              border: 2px dashed #e53e3e;
              border-radius: 8px;
              color: #c53030;
              background: #fed7d7;
            ">
              Vditor 加载失败: ${error.message}
            </div>
          `;
        }
      },

      // 工具栏调试辅助（可选）
      _setupToolbarDebug: function() {
        // 可选：为调试添加事件监听
        if (typeof window !== 'undefined' && window.location.search.includes('debug')) {
          const toolbar = document.querySelector('.vditor-toolbar');
          if (toolbar) {
            toolbar.addEventListener('click', (e) => {
              const target = e.target.closest('[data-type]');
              if (target) {
                console.log('工具栏按钮点击:', target.dataset.type);
              }
            });
          }
        }
      },

      // 手动测试链接功能的方法
      _testLinkFunction: function() {
        if (this._editorRef) {
          // 手动插入测试链接
          const cursorPosition = this._editorRef.getCursorPosition();
          const testLink = '[Vditor 官网](https://b3log.org/vditor)';
          this._editorRef.insertValue(testLink);
          console.log('测试链接已插入');
        }
      },

      render: function() {
        const fieldName = this.props.field ? this.props.field.get('name') : 'content';
        
        return h('div', { 
          className: 'vditor-container',
          style: { 
            position: 'relative',
            width: '100%'
          }
        }, [
          // 隐藏的表单字段
          h('textarea', {
            name: fieldName,
            value: this.state.value,
            readOnly: true,
            style: { 
              position: 'absolute',
              left: '-9999px',
              width: '1px',
              height: '1px',
              opacity: '0',
              pointerEvents: 'none'
            }
          }),
          
          // 编辑器容器
          h('div', { 
            id: this._editorId,
            key: 'editor',
            style: { 
              minHeight: '500px',
              width: '100%',
              border: this.state.isFocused ? '2px solid #4299e1' : '1px solid #cbd5e0',
              borderRadius: '8px',
              overflow: 'hidden',
              transition: 'border-color 0.2s'
            }
          }),
          
          // 状态指示器（可选）
          !this.state.initialized && h('div', {
            style: {
              position: 'absolute',
              top: '10px',
              right: '10px',
              padding: '4px 8px',
              background: '#edf2f7',
              color: '#4a5568',
              borderRadius: '4px',
              fontSize: '12px',
              zIndex: '10'
            }
          }, '加载中...')
        ]);
      }
    });
  }

  // 创建预览组件
  function createVditorPreview() {
    return createClass({
      render: function() {
        const value = this.props.value || '';
        const previewText = value.length > 250 ? value.substring(0, 250) + '...' : value;
        
        return h('div', {
          style: {
            padding: '15px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            background: '#f7fafc',
            fontSize: '14px',
            lineHeight: '1.6',
            maxHeight: '300px',
            overflowY: 'auto',
            wordBreak: 'break-word'
          }
        }, [
          h('div', {
            style: {
              fontSize: '12px',
              color: '#718096',
              marginBottom: '10px',
              fontWeight: '500'
            }
          }, '预览'),
          h('div', {}, previewText || '(空内容)')
        ]);
      }
    });
  }

  // 插件注册
  function registerPlugin() {
    if (!window.CMS || !window.CMS.registerWidget || typeof Vditor === 'undefined') {
      setTimeout(registerPlugin, 100);
      return;
    }

    try {
      const Control = createVditorControl();
      const Preview = createVditorPreview();
      
      if (!Control) throw new Error('无法创建控件');

      // 注册控件
      window.CMS.registerWidget(CONFIG.widgetName, Control, Preview);
      
      window.decapCmsVditorPlugin = { 
        widget: CONFIG.widgetName, 
        version: '1.1.0'
      };
      
      // 添加测试方法（仅开发环境）
      if (typeof window !== 'undefined' && window.location.search.includes('debug')) {
        window.testVditorLink = function() {
          const containers = document.querySelectorAll('.vditor-container');
          containers.forEach(container => {
            const control = container.__reactInternalInstance;
            if (control && control._testLinkFunction) {
              control._testLinkFunction();
            }
          });
        };
      }
      
    } catch (error) {
      console.error('Vditor 插件注册失败:', error);
    }
  }

  // 初始化
  function init() {
    if (typeof Vditor === 'undefined') {
      console.log('等待 Vditor 加载...');
      setTimeout(init, 500);
      return;
    }
    
    console.log('🚀 初始化 Vditor 插件...');
    registerPlugin();
  }

  // 启动插件
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 800);
  }
})();