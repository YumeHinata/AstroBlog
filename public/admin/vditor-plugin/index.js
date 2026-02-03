(function() {
  'use strict';
  if (window.decapCmsVditorPlugin) return;

  const VditorControl = createClass({
    getInitialState: function() {
      // 直接使用Decap CMS提供的唯一ID，无需自己生成
      return { value: this.props.value || '' };
    },
    componentDidMount: function() {
      this.initVditor();
    },
    componentWillReceiveProps: function(nextProps) {
      if (this.vditor && nextProps.value !== this.props.value) {
        this.vditor.setValue(nextProps.value || '');
      }
    },
    componentWillUnmount: function() {
      this.vditor?.destroy?.();
    },
    initVditor: function() {
      try {
        this.vditor = new Vditor(this.props.forID, {
          height: 500,
          value: this.state.value,
          mode: 'ir',
          cache: { enable: false },
          toolbar: [ // 完整工具栏
            'emoji', 'headings', 'bold', 'italic', 'strike', 'link', 'quote', 'code', 'inline-code',
            'insert-before', 'insert-after', '|', 'list', 'ordered-list', 'check', 'outdent', 'indent',
            '|', 'upload', 'table', '|', 'undo', 'redo', '|', 'edit-mode', 'content-theme', 'code-theme',
            'export', 'outline', 'preview', 'devtools', 'info', 'help', 'br'
          ],
          input: (value) => this.props.onChange(value)
        });
      } catch(e) {
        console.error('Vditor初始化失败:', e);
      }
    },
    render: function() {
      return h('div', { id: this.props.forID, style: { minHeight: '500px' } });
    }
  });

  // 修正后的预览组件：安全渲染，避免HTML解析错误
  const VditorPreview = createClass({
    render: function() {
      const value = this.props.value || '';
      // 安全渲染：将内容放在纯文本节点中，并添加基础样式容器
      return h('div', {
        className: 'vditor-preview',
        style: {
          padding: '1rem',
          minHeight: '200px',
          fontSize: '14px',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap' // 保留换行和空格
        }
      }, value || '(无内容)');
    }
  });

  // 精简的插件注册逻辑
  function registerPlugin() {
    if (window.CMS?.registerWidget && typeof Vditor !== 'undefined') {
      window.CMS.registerWidget('vditor', VditorControl, VditorPreview);
      window.decapCmsVditorPlugin = true;
      console.log('✅ Vditor插件已注册');
    } else {
      setTimeout(registerPlugin, 100);
    }
  }
  // 启动
  registerPlugin();
})();