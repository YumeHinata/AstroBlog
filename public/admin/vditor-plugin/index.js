(function() {
  'use strict';
  if (window.decapCmsVditorPlugin) return;

  const VditorControl = createClass({
    componentDidMount: function() {
      this.vditor = new Vditor(this.props.forID, {
        height: 500,
        value: this.props.value || '',
        mode: 'ir',
        cache: { enable: false },
        toolbar: [
          'emoji', 'headings', 'bold', 'italic', 'strike', 'link', 'quote', 'code', 'inline-code', 'insert-before', 'insert-after',
          '|', 'list', 'ordered-list', 'check', 'outdent', 'indent',
          '|', 'upload', 'table', '|', 'undo', 'redo',
          '|', 'edit-mode', 'content-theme', 'code-theme', 'export', 'outline', 'preview', 'devtools', 'info', 'help', 'br'
        ],
        input: (value) => this.props.onChange(value),
        after: () => console.log('Vditor IR 模式就绪')
      });
    },

    componentWillReceiveProps: function(nextProps) {
      if (this.vditor && nextProps.value !== this.props.value) {
        this.vditor.setValue(nextProps.value || '');
      }
    },

    componentWillUnmount: function() {
      this.vditor?.destroy?.();
    },

    render: function() {
      return h('div', { id: this.props.forID });
    }
  });

  // 极简预览组件
  const VditorPreview = createClass({
    render: function() {
      return h('div', this.props.value || '');
    }
  });

  // 插件注册
  function init() {
    if (window.CMS?.registerWidget && typeof Vditor !== 'undefined') {
      window.CMS.registerWidget('vditor', VditorControl, VditorPreview);
      window.decapCmsVditorPlugin = true;
    } else {
      setTimeout(init, 100);
    }
  }
  init();
})();