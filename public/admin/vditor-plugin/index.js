(function () {
  'use strict';

  if (window.decapCmsVditorPlugin) return;
  console.log('🔄 Vditor 插件初始化...');

  const CONFIG = {
    widgetName: 'vditor',
    debug: false
  };

  // 创建编辑器控件
  function createControl() {
    if (!window.createClass || !window.h) return null;

    return createClass({
      getInitialState() {
        this._id = `vditor-${Date.now()}`;
        return {
          value: this.props.value || '',
          ready: false
        };
      },

      componentDidMount() {
        setTimeout(() => this.initEditor(), 50);
      },

      componentDidUpdate(prevProps) {
        if (prevProps.value !== this.props.value && this._instance) {
          const newValue = this.props.value || '';
          if (newValue !== this._instance.getValue()) {
            this._instance.setValue(newValue);
          }
        }
      },

      componentWillUnmount() {
        this._instance && this._instance.destroy && this._instance.destroy();
      },

      initEditor() {
        const container = document.getElementById(this._id);
        if (!container) {
          setTimeout(() => this.initEditor(), 100);
          return;
        }

        try {
          this._instance = new Vditor(this._id, {
            height: 500,
            placeholder: '开始编辑...',
            value: this.state.value,
            theme: 'classic',
            toolbar: [
              'emoji', 'headings', 'bold', 'italic', 'strike', 'link',
              '|', 'list', 'ordered-list', 'check',
              '|', 'quote', 'code', 'inline-code', 'table',
              '|', 'undo', 'redo', 'preview', 'fullscreen'
            ],
            upload: {
              accept: 'image/*',
              multiple: true,
              handler: window.vditorUploader?.handleUpload || defaultUploadHandler
            },
            input: (value) => {
              this.props.onChange && this.props.onChange(value);
            }
          });

          this.setState({ ready: true });
        } catch (e) {
          console.error('编辑器初始化失败:', e);
        }
      },

      render() {
        return h('div', { className: 'vditor-container' }, [
          h('div', { id: this._id, style: { minHeight: '500px' } }),
          !this.state.ready && h('div', {
            style: {
              padding: '10px',
              textAlign: 'center',
              color: '#666'
            }
          }, '编辑器加载中...')
        ]);
      }
    });
  }

  // 默认上传处理器（备用）
  function defaultUploadHandler(files) {
    console.log('默认上传处理器:', files);
    return Promise.resolve([]);
  }

  // 注册插件
  function registerPlugin() {
    if (!window.CMS || !window.CMS.registerWidget) {
      setTimeout(registerPlugin, 100);
      return;
    }

    if (typeof Vditor === 'undefined') {
      setTimeout(registerPlugin, 100);
      return;
    }

    const Control = createControl();
    if (!Control) return;

    // 只注册一个：vditor
    window.CMS.registerWidget(CONFIG.widgetName, Control);

    window.decapCmsVditorPlugin = {
      widget: CONFIG.widgetName,
      version: '1.1'
    };

    console.log(`✅ ${CONFIG.widgetName} 插件注册成功`);
  }

  // 启动
  function init() {
    if (typeof Vditor === 'undefined') {
      setTimeout(init, 500);
      return;
    }
    registerPlugin();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 1000);
  }
})();