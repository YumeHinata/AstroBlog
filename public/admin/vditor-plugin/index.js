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
        // 关键修改：移除所有可能干扰的配置，只保留最核心的
        mode: 'ir', // 先用 ir 模式测试，更稳定
        after: () => {
          this.setState({ vditor: vditor });
          console.log('Vditor after回调触发');
        },
        input: (value) => {
          // 关键诊断：延迟更新状态，观察是否改善
          setTimeout(() => {
            this.setState({ value: value });
            if (this.props.onChange) {
              this.props.onChange(value);
            }
          }, 0);
          console.log('Vditor input事件触发，值长度:', value.length);
        }
      });
    },

    componentWillUnmount: function () {
      this.state.vditor && this.state.vditor.destroy();
    },

    render: function () {
      console.log('React组件渲染调用，值长度:', this.state.value.length);
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
    console.log('插件注册完成');
  }

  if (typeof Vditor !== 'undefined') {
    register();
  } else {
    setTimeout(() => { if (typeof Vditor !== 'undefined') register(); }, 1000);
  }
})();