(function () {
  'use strict';
  if (window.decapCmsVditorPlugin) return;

  const VditorControl = createClass({
    componentDidMount: function () {
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

    componentWillReceiveProps: function (nextProps) {
      if (this.vditor && nextProps.value !== this.props.value) {
        this.vditor.setValue(nextProps.value || '');
      }
    },

    componentWillUnmount: function () {
      this.vditor?.destroy?.();
    },

    render: function () {
      return h('div', { id: this.props.forID });
    }
  });

  // 极简预览组件
  const VditorPreview = createClass({
    render: function () {
      const value = this.props.value || '';

      return h('div', {
        // 基础容器样式，确保在CMS预览窗格内正常显示
        style: {
          padding: '1rem',
          minHeight: '200px',
          fontSize: '14px',
          lineHeight: '1.6',
        }
      }, [
        // 仅在有内容时渲染转换后的HTML
        value ? this._renderMarkdown(value) : '(无内容)'
      ]);
    },

    // 基础Markdown文本转换
    _renderMarkdown: function (text) {
      // 这是一个非常基础的转换，用于确保预览的可用性
      // 如需更完善的效果，可考虑引入轻量级Markdown解析器
      let html = text
        // 处理标题
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // 处理粗体、斜体、删除线
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/~~(.*?)~~/g, '<del>$1</del>')
        // 处理代码块和内联代码
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // 处理图片和链接
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" style="max-width:100%;" />')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        // 处理换行：将两个换行符视为段落分隔
        .replace(/\n\n+/g, '</p><p>')
        .replace(/\n/g, '<br>');

      // 包装在段落中，并安全地设置HTML
      return {
        __html: `<p>${html}</p>`
      };
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