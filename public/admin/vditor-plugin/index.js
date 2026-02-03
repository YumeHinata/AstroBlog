(function() {
  'use strict';

  if (window.decapCmsVditorPlugin) return;

  // Decap CMS 插件规范实现
  const VditorControl = createClass({
    componentDidMount: function() {
      this.vditor = new Vditor(this.props.forID, {
        value: this.props.value || '',
        input: (value) => this.props.onChange(value),
        cache: { enable: false }
      });
    },

    componentDidUpdate: function(prevProps) {
      if (this.vditor && this.props.value !== prevProps.value) {
        this.vditor.setValue(this.props.value || '');
      }
    },

    componentWillUnmount: function() {
      // 修复：安全销毁
      try {
        this.vditor?.destroy?.();
      } catch(e) {
        // 忽略错误
      }
    },

    render: function() {
      return h('div', { id: this.props.forID });
    }
  });

  // 注册到 Decap CMS
  function init() {
    if (window.CMS?.registerWidget) {
      window.CMS.registerWidget('vditor', VditorControl);
      window.decapCmsVditorPlugin = true;
      console.log('✅ Vditor 插件已注册');
    } else {
      setTimeout(init, 100);
    }
  }

  // 确保 Vditor 已加载
  if (typeof Vditor !== 'undefined') {
    init();
  } else {
    // 等待 Vditor 加载
    const checkVditor = () => {
      if (typeof Vditor !== 'undefined') {
        init();
      } else {
        setTimeout(checkVditor, 100);
      }
    };
    checkVditor();
  }
})();