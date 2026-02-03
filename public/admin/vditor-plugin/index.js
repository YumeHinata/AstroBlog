(function() {
  'use strict';

  if (window.decapCmsVditorPlugin) return;
  
  const CONFIG = {
    widgetName: 'vditor'
  };

  // 创建 Vditor 控件 - 参考官方 React 实现
  function createVditorControl() {
    return createClass({
      getInitialState: function() {
        this._editorId = 'vditor-' + Date.now();
        return {
          value: this.props.value || '',
          vditor: null,
          isMounted: false
        };
      },

      componentDidMount: function() {
        this.setState({ isMounted: true }, () => {
          this._initVditor();
        });
      },

      componentDidUpdate: function(prevProps) {
        if (prevProps.value !== this.props.value && this.state.vditor) {
          const newValue = this.props.value || '';
          this.state.vditor.setValue(newValue);
        }
      },

      componentWillUnmount: function() {
        if (this.state.vditor) {
          this.state.vditor.destroy();
        }
      },

      _initVditor: function() {
        if (!this.state.isMounted) return;
        
        const container = document.getElementById(this._editorId);
        if (!container) return;

        // 参考官方 React 组件的初始化方式
        const vditor = new Vditor(this._editorId, {
          height: 500,
          value: this.state.value,
          theme: 'classic',
          icon: 'ant',
          typewriterMode: true,
          toolbar: [
            'emoji',
            'headings',
            'bold',
            'italic',
            'strike',
            'link',  // 链接按钮
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
            'fullscreen',
            'preview'
          ],
          input: (value) => {
            this.setState({ value: value });
            if (this.props.onChange) {
              this.props.onChange(value);
            }
          },
          after: () => {
            // 类似官方代码中的 after 回调
            this.setState({ vditor: vditor });
          },
          cache: {
            enable: false
          },
          preview: {
            hljs: {
              style: 'github'
            }
          },
          // 关键：确保工具栏事件能正常触发
          toolbarConfig: {
            pin: true  // 工具栏始终显示
          }
        });
      },

      render: function() {
        const fieldName = this.props.field ? this.props.field.get('name') : 'content';
        
        return h('div', { 
          className: 'vditor-widget',
          style: { 
            width: '100%',
            position: 'relative'
          }
        }, [
          // 隐藏字段确保表单提交
          h('textarea', {
            name: fieldName,
            value: this.state.value,
            readOnly: true,
            style: {
              position: 'absolute',
              left: '-9999px',
              opacity: '0',
              width: '1px',
              height: '1px'
            }
          }),
          
          // 编辑器容器 - 与官方 React 代码结构一致
          h('div', {
            id: this._editorId,
            className: 'vditor',
            style: {
              width: '100%',
              minHeight: '500px'
            }
          })
        ]);
      }
    });
  }

  // 创建预览组件
  function createVditorPreview() {
    return createClass({
      render: function() {
        const value = this.props.value || '';
        return h('div', {
          style: {
            padding: '12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            background: '#f9fafb',
            fontSize: '14px',
            lineHeight: '1.6'
          }
        }, value || '(空内容)');
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
      
      window.CMS.registerWidget(CONFIG.widgetName, Control, Preview);
      
      window.decapCmsVditorPlugin = { 
        widget: CONFIG.widgetName,
        version: '2.0.0'
      };
    } catch (error) {
      // 静默失败
    }
  }

  // 初始化
  function init() {
    if (typeof Vditor === 'undefined') {
      setTimeout(init, 500);
      return;
    }
    registerPlugin();
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 1000);
  }
})();