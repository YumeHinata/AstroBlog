(function() {
  'use strict';
  
  if (window.decapCmsVditorWidget) return;
  
  // 最简化的 Vditor 控制组件
  const VditorControl = createClass({
    getInitialState: function() {
      return {
        value: this.props.value || '',
        id: 'vditor-' + Date.now()
      };
    },
    
    componentDidMount: function() {
      // 使用 Vditor 官方推荐的最简配置
      const vditor = new Vditor(this.state.id, {
        height: 500,
        value: this.state.value,
        input: (value) => {
          this.handleChange(value);
        }
      });
    },
    
    handleChange: function(value) {
      this.setState({ value: value });
      this.props.onChange(value);
    },
    
    render: function() {
      return h('div', [
        h('input', {
          type: 'hidden',
          name: this.props.field.get('name'),
          value: this.state.value
        }),
        h('div', { id: this.state.id })
      ]);
    }
  });

  // 注册组件
  function register() {
    if (window.CMS && window.CMS.registerWidget) {
      window.CMS.registerWidget('vditor', VditorControl);
      window.decapCmsVditorWidget = true;
    } else {
      setTimeout(register, 100);
    }
  }
  
  // 当 Vditor 可用时注册
  if (typeof Vditor !== 'undefined') {
    register();
  } else {
    const checkVditor = setInterval(() => {
      if (typeof Vditor !== 'undefined') {
        clearInterval(checkVditor);
        register();
      }
    }, 100);
  }
})();