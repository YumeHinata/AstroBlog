(function() {
  'use strict';
  
  if (window.decapCmsVditorWidget) return;
  
  // 纯 ES6 类，不依赖 React
  class VditorControl {
    constructor({ value, field, onChange, classNameWrapper }) {
      this.value = value || '';
      this.onChange = onChange;
      this.id = `vditor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.vditor = null;
      
      // 创建隐藏的 input
      this.hiddenInput = document.createElement('input');
      this.hiddenInput.type = 'hidden';
      this.hiddenInput.name = field.get('name');
      this.hiddenInput.value = this.value;
      
      // 创建容器
      this.container = document.createElement('div');
      this.container.className = classNameWrapper;
      
      // Vditor 容器
      this.editorContainer = document.createElement('div');
      this.editorContainer.id = this.id;
      
      this.container.appendChild(this.hiddenInput);
      this.container.appendChild(this.editorContainer);
    }
    
    // Decap CMS 需要的方法
    getValue() {
      return this.value;
    }
    
    // Decap CMS 需要的方法
    setValue(value) {
      this.value = value || '';
      this.hiddenInput.value = this.value;
      if (this.vditor) {
        this.vditor.setValue(this.value);
      }
      return this;
    }
    
    // Decap CMS 需要的方法
    getWidget() {
      return this.container;
    }
    
    // Decap CMS 需要的方法
    isValid() {
      return true;
    }
    
    // 初始化 Vditor
    init() {
      if (this.vditor || !document.getElementById(this.id)) return;
      
      // Vditor 官方最简配置
      this.vditor = new Vditor(this.id, {
        height: 500,
        value: this.value,
        cache: {
          enable: false  // 禁用缓存避免冲突
        },
        input: (value) => {
          this.value = value;
          this.hiddenInput.value = value;
          if (this.onChange) {
            this.onChange(value);
          }
        }
      });
    }
  }
  
  // 注册函数
  function register() {
    if (!window.CMS || !window.CMS.registerWidget) {
      setTimeout(register, 100);
      return;
    }
    
    // 检查 Vditor
    if (typeof Vditor === 'undefined') {
      console.warn('Vditor not loaded, retrying...');
      setTimeout(register, 100);
      return;
    }
    
    window.CMS.registerWidget('vditor', VditorControl);
    window.decapCmsVditorWidget = true;
    console.log('Vditor widget registered');
  }
  
  // 立即尝试注册
  register();
})();