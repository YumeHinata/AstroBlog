(function () {
  const { CMS } = window;
  const { createClass, h } = CMS;

  // 控件组件（编辑界面）
  const VditorControl = createClass({
    componentDidMount: function () {
      // 确保 Vditor 已加载
      if (!window.Vditor) {
        console.error('Vditor 未加载，请检查脚本路径');
        return;
      }

      this.vditor = new window.Vditor(this.editor, {
        height: 500,
        mode: 'sv',
        cache: { enable: false },
        value: this.props.value || '', // 直接使用字符串
        input: (val) => {
          // 通知 Decap CMS 值已更改
          this.props.onChange(val);
        },
      });
    },

    componentWillUnmount: function () {
      if (this.vditor) {
        this.vditor.destroy();
      }
    },

    render: function () {
      // 返回一个空的 div，Vditor 将挂载到此元素
      return h('div', {
        ref: (el) => {
          this.editor = el;
        },
      });
    },
  });

  // 预览组件（预览界面）
  const VditorPreview = createClass({
    render: function () {
      const value = this.props.value || '';
      // 简单使用 <pre> 显示原始 Markdown
      return h('pre', { style: { whiteSpace: 'pre-wrap' } }, value);
    },
  });

  // 注册 Widget
  CMS.registerWidget('vditor-markdown', VditorControl, VditorPreview);

  console.log('[vditor] Widget 已注册（使用 createClass）');
})();