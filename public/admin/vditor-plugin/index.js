(function () {
  'use strict';

  if (window.decapCmsVditorWidget) return;

  class VditorControl {
    constructor({ value, field, onChange, classNameWrapper }) {
      this.value = value || '';
      this.onChange = onChange;
      this.id = 'vditor-' + Date.now();
      this.fieldName = field.get('name');

      // 创建唯一的 wrapper
      this.wrapper = document.createElement('div');
      this.wrapper.className = classNameWrapper;
      this.wrapper.id = 'wrapper-' + this.id;

      // 创建隐藏的 textarea - 这是 Decap CMS 实际读取的
      this.hiddenTextarea = document.createElement('textarea');
      this.hiddenTextarea.name = this.fieldName;
      this.hiddenTextarea.value = this.value;
      this.hiddenTextarea.style.display = 'none';
      this.hiddenTextarea.id = 'hidden-' + this.id;

      // 创建 Vditor 容器
      this.editorDiv = document.createElement('div');
      this.editorDiv.id = this.id;

      // 组装
      this.wrapper.appendChild(this.hiddenTextarea);
      this.wrapper.appendChild(this.editorDiv);

      // 关键：立即初始化 Vditor，不要延迟
      this.initVditorImmediately();
    }

    initVditorImmediately() {
      // 检查 Vditor 是否可用
      if (typeof Vditor === 'undefined') {
        console.error('Vditor not loaded');
        return;
      }

      console.log('Initializing Vditor for field:', this.fieldName);

      // 最简配置，避免任何可能冲突的功能
      this.vditor = new Vditor(this.id, {
        height: 500,
        value: this.value,
        mode: 'wysiwyg', // 使用 WYSIWYG 模式可能更稳定
        cache: {
          enable: false
        },
        toolbar: [], // 空工具栏，避免按钮事件冲突
        input: (value) => {
          // 直接同步，不要任何延迟
          this.value = value;
          this.hiddenTextarea.value = value;

          // 关键：直接调用 onChange，不经过任何包装
          if (this.onChange && typeof this.onChange === 'function') {
            try {
              this.onChange(value);
            } catch (e) {
              console.error('onChange error:', e);
            }
          }
        }
      });

      // 关键：手动处理所有工具栏事件
      this.setupToolbarHandlers();
    }

    setupToolbarHandlers() {
      if (!this.vditor || !this.vditor.vditor) return;

      // 获取 Vditor 内部元素
      const editorElement = document.getElementById(this.id);
      if (!editorElement) return;

      // 监听编辑器区域的所有点击事件
      editorElement.addEventListener('click', (e) => {
        // 阻止所有点击事件冒泡到 React 层
        e.stopPropagation();
        e.preventDefault();

        // 确保编辑器获得焦点
        setTimeout(() => {
          if (this.vditor) {
            this.vditor.focus();
          }
        }, 10);
      }, true); // 使用捕获阶段，确保最先处理

      // 也阻止 mousedown 事件
      editorElement.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      }, true);

      // 阻止 focus 事件
      editorElement.addEventListener('focus', (e) => {
        e.stopPropagation();
      }, true);
    }

    // Decap CMS 必要的方法
    getValue() {
      return this.hiddenTextarea.value;
    }

    setValue(value) {
      this.value = value || '';
      this.hiddenTextarea.value = this.value;
      if (this.vditor && this.vditor.getValue() !== this.value) {
        this.vditor.setValue(this.value);
      }
      return this;
    }

    getWidget() {
      return this.wrapper;
    }

    isValid() {
      return true;
    }
  }

  // 简化的注册逻辑
  window.decapCmsVditorWidget = true;

  // 使用事件监听确保在正确时机注册
  document.addEventListener('DOMContentLoaded', function () {
    if (window.CMS && window.CMS.registerWidget) {
      window.CMS.registerWidget('vditor', VditorControl);
      console.log('Vditor widget registered (DOM ready)');
    }
  });

  // 也尝试立即注册
  if (window.CMS && window.CMS.registerWidget) {
    window.CMS.registerWidget('vditor', VditorControl);
    console.log('Vditor widget registered (immediate)');
  }
})();