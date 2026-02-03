(function() {
  'use strict';

  if (window.decapCmsVditorPlugin) return;
  
  // 创建 Vditor 控件 - 完全按照官方模式
  const VditorControl = createClass({
    getInitialState: function() {
      this.id = 'vditor-' + Date.now();
      return { value: this.props.value || '', vditor: null };
    },

    componentDidMount: function() {
      const vditor = new Vditor(this.id, {
        height: 500,
        value: this.state.value,
        after: () => {
          this.setState({ vditor: vditor });
        },
        input: (value) => {
          this.setState({ value: value });
          this.props.onChange && this.props.onChange(value);
        }
      });
    },

    componentWillUnmount: function() {
      this.state.vditor && this.state.vditor.destroy();
    },

    render: function() {
      return h('div', [
        h('textarea', {
          name: this.props.field ? this.props.field.get('name') : 'content',
          value: this.state.value,
          style: { display: 'none' }
        }),
        h('div', { id: this.id })
      ]);
    }
  });

  // 注册插件
  function register() {
    if (!window.CMS || !window.CMS.registerWidget) {
      setTimeout(register, 100);
      return;
    }

    window.CMS.registerWidget('vditor', VditorControl);
    window.decapCmsVditorPlugin = true;
  }

  // 初始化
  if (typeof Vditor !== 'undefined') {
    register();
  } else {
    setTimeout(() => {
      if (typeof Vditor !== 'undefined') register();
    }, 1000);
  }
})();