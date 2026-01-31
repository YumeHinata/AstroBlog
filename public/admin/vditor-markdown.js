(function () {
  const { CMS } = window;
  const { createClass, h } = CMS;

  // 极简的控件组件
  const SimpleControl = createClass({
    handleChange: function (e) {
      this.props.onChange(e.target.value);
    },

    render: function () {
      console.log('SimpleControl render, value:', this.props.value);
      return h('textarea', {
        value: this.props.value || '',
        onChange: this.handleChange,
        style: {
          width: '100%',
          height: '300px',
          padding: '10px',
          fontFamily: 'monospace'
        }
      });
    }
  });

  // 预览组件
  const SimplePreview = createClass({
    render: function () {
      return h('div', {
        style: { whiteSpace: 'pre-wrap' }
      }, this.props.value || '');
    }
  });

  // 注册 Widget
  CMS.registerWidget('simple-markdown', SimpleControl, SimplePreview);

  console.log('[debug] Simple Widget 已注册');
})();