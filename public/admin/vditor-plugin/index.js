// 最简版本 - 仅保留核心功能
(function() {
  if (window.decapCmsVditorWidget) return;
  
  class VditorControl {
    constructor({ value, field, onChange }) {
      this.id = 'vditor-' + Date.now();
      this.value = value || '';
      
      // 创建元素
      const textarea = document.createElement('textarea');
      textarea.style.display = 'none';
      textarea.name = field.get('name');
      textarea.value = this.value;
      
      const editor = document.createElement('div');
      editor.id = this.id;
      
      this.container = document.createElement('div');
      this.container.appendChild(textarea);
      this.container.appendChild(editor);
      
      // 初始化
      if (Vditor) {
        this.vditor = new Vditor(this.id, {
          height: 500,
          value: this.value,
          input: (val) => {
            textarea.value = val;
            if (onChange) onChange(val);
          }
        });
        
        // 阻止事件冒泡
        editor.addEventListener('click', e => e.stopPropagation(), true);
      }
    }
    
    getValue() { return this.container.querySelector('textarea').value; }
    setValue(v) { 
      const textarea = this.container.querySelector('textarea');
      textarea.value = v;
      if (this.vditor) this.vditor.setValue(v);
      return this;
    }
    getWidget() { return this.container; }
    isValid() { return true; }
  }
  
  if (window.CMS) window.CMS.registerWidget('vditor', VditorControl);
  window.decapCmsVditorWidget = true;
})();