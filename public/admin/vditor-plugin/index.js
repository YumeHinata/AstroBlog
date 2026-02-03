(function () {
  'use strict';
  
  // 避免重复注册
  if (window.decapCmsVditorWidget) return;
  
  // 使用官方示例的结构
  class VditorControl extends window.CMS.Widget {
    constructor(props) {
      super(props);
      
      this.state = {
        value: props.value || ''
      };
      
      // 创建唯一的 ID
      this.id = 'vditor-' + Date.now();
      this.vditor = null;
    }
    
    getValue() {
      return this.state.value;
    }
    
    setValue(value) {
      this.setState({ value: value });
      
      // 同步更新 Vditor 实例
      if (this.vditor && this.vditor.getValue() !== value) {
        this.vditor.setValue(value);
      }
      
      return this;
    }
    
    componentDidMount() {
      // 延迟初始化，确保 DOM 已渲染
      setTimeout(() => {
        this.initVditor();
      }, 0);
    }
    
    initVditor() {
      if (this.vditor || !document.getElementById(this.id)) {
        return;
      }
      
      const config = {
        height: 500,
        value: this.state.value,
        after: () => {
          console.log('Vditor initialized');
        },
        input: (value) => {
          // 直接更新状态
          this.setState({ value: value });
          
          // 触发 Decap CMS 的 onChange
          if (this.props.onChange) {
            this.props.onChange(value);
          }
        },
        focus: () => {
          // 保持焦点
          this.vditor.focus();
        }
      };
      
      this.vditor = new Vditor(this.id, config);
    }
    
    render() {
      // 创建隐藏的 textarea 用于 Decap CMS
      const textarea = document.createElement('textarea');
      textarea.name = this.props.field.get('name');
      textarea.value = this.state.value;
      textarea.style.display = 'none';
      
      // 创建 Vditor 容器
      const container = document.createElement('div');
      container.id = this.id;
      
      // 包装元素
      const wrapper = document.createElement('div');
      wrapper.className = this.props.classNameWrapper;
      wrapper.appendChild(textarea);
      wrapper.appendChild(container);
      
      return wrapper;
    }
  }
  
  // 注册插件
  function registerPlugin() {
    if (!window.CMS) {
      console.warn('Decap CMS not loaded yet');
      setTimeout(registerPlugin, 100);
      return;
    }
    
    // 检查 Vditor 是否已加载
    if (typeof Vditor === 'undefined') {
      console.warn('Vditor not loaded yet');
      setTimeout(registerPlugin, 100);
      return;
    }
    
    window.CMS.registerWidget('vditor', VditorControl);
    window.decapCmsVditorWidget = true;
    console.log('Vditor widget registered successfully');
  }
  
  // 当 DOM 准备好时注册
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerPlugin);
  } else {
    registerPlugin();
  }
})();