(function () {
  'use strict';
  if (window.decapCmsVditorPlugin) return;

  const VditorControl = createClass({
    getInitialState: function () {
      this.id = 'vditor-' + Date.now();
      return { value: this.props.value || '', vditor: null };
    },
    componentDidMount: function () {
      const vditor = new Vditor(this.id, {
        height: 500,
        value: this.state.value,
        // --- 唯一新增的配置：尝试激活官方 sv 模式 ---
        mode: 'ir',
        // --- 保持以下原有配置绝对不变 ---
        after: () => { this.setState({ vditor: vditor }); },
        input: (value) => {
          this.setState({ value: value });
          this.props.onChange && this.props.onChange(value);
        }
      });
    },
    componentWillUnmount: function () {
      this.state.vditor && this.state.vditor.destroy();
    },
    render: function () {
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

  function register() {
    if (!window.CMS || !window.CMS.registerWidget) {
      setTimeout(register, 100);
      return;
    }
    window.CMS.registerWidget('vditor', VditorControl);
    window.decapCmsVditorPlugin = true;
  }
  if (typeof Vditor !== 'undefined') {
    register();
  } else {
    setTimeout(() => { if (typeof Vditor !== 'undefined') register(); }, 1000);
  }
})();