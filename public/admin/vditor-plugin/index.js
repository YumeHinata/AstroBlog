(function() {
  'use strict';

  if (window.decapCmsVditorPlugin) return;
  console.log('🔄 Vditor 插件初始化...');

  // 自定义超链接按钮解决失焦问题
  const customLinkToolbar = {
    name: 'link',
    tip: '插入链接',
    className: 'toolbar__button',
    icon: '<svg>...</svg>', // 建议使用与Vditor风格一致的SVG图标
    click: function(event) {
      const vditor = this; // Vditor实例
      // 1. 执行默认的插入链接操作
      vditor.tip = '插入链接';
      vditor.insertValue(`[${vditor.vditor.currentModeValue || '链接描述'}](${vditor.vditor.currentModeValue ? '' : 'https://'})`);
      // 2. 【核心修复】操作完成后，手动将焦点设置回编辑区域
      setTimeout(() => {
        vditor.focus();
        // 如果有选中文本，可以调整光标位置到链接URL部分
      }, 10);
    }
  };

  // 创建编辑器控件 - 遵循 Decap CMS 插件规范
  const VditorControl = createClass({
    componentDidMount: function() {
      this.initVditor();
    },

    componentWillReceiveProps: function(nextProps) {
      // 安全地更新编辑器内容
      if (this.vditor && nextProps.value !== this.props.value) {
        const currentValue = this.vditor.getValue();
        if (nextProps.value !== currentValue) {
          this.vditor.setValue(nextProps.value || '');
        }
      }
    },

    componentWillUnmount: function() {
      // 安全销毁
      if (this.vditor && typeof this.vditor.destroy === 'function') {
        try {
          this.vditor.destroy();
        } catch(e) {
          // 静默失败
          console.debug('Vditor销毁时产生不影响流程的异常');
        }
      }
      this.vditor = null;
    },

    initVditor: function() {
      const containerId = this.props.forID;
      
      try {
        // 初始化 Vditor，配置分屏预览模式
        this.vditor = new Vditor(containerId, {
          height: 500,
          value: this.props.value || '', // 初始值
          theme: 'classic',
          mode: 'sv', // 【核心】启用分屏预览模式，左侧源码，右侧预览[citation:6]
          preview: {
            mode: 'editor', // 分屏下，左侧为编辑区，右侧为预览区[citation:10]
          },
          cache: {
            enable: false // 禁用本地缓存，避免与CMS冲突[citation:9]
          },
          toolbar: [
            'emoji', 'headings', 'bold', 'italic', 'strike',
            '|', customLinkToolbar, // 使用自定义的超链接按钮
            '|', 'list', 'ordered-list', 'check',
            '|', 'quote', 'code', 'inline-code', 'table',
            '|', 'undo', 'redo', 'fullscreen',
            '|', {
              name: 'preview-toggle',
              tip: '切换预览',
              icon: '<svg>...</svg>',
              click: () => { this.vditor.togglePreview(); }
            }
          ],
          input: (value) => {
            // 内容变化时，立即通知Decap CMS更新
            this.props.onChange(value);
          },
          after: () => {
            // 编辑器完全初始化后的回调
            console.log('✅ Vditor 分屏预览模式已加载');
            // 可在此进行额外的初始状态设置
          }
        });
      } catch(e) {
        console.error('Vditor 初始化失败:', e);
      }
    },

    render: function() {
      return h('div', { 
        id: this.props.forID,
        style: { 
          minHeight: '500px',
          border: '1px solid #e1e1e1',
          borderRadius: '4px'
        }
      });
    }
  });

  // 注册插件到 Decap CMS
  function registerPlugin() {
    if (!window.CMS || !window.CMS.registerWidget) {
      setTimeout(registerPlugin, 100);
      return;
    }
    if (typeof Vditor === 'undefined') {
      console.log('等待 Vditor 库加载...');
      setTimeout(registerPlugin, 100);
      return;
    }

    try {
      window.CMS.registerWidget('vditor', VditorControl);
      window.decapCmsVditorPlugin = { version: '1.2', mode: 'split-view' };
      console.log('✅ Vditor 插件 (分屏预览模式) 已成功注册到 Decap CMS');
    } catch(e) {
      console.error('注册 Vditor 插件失败:', e);
    }
  }

  // 启动
  function init() {
    // 确保 Decap CMS 环境就绪
    if (!window.createClass || !window.h) {
      setTimeout(init, 100);
      return;
    }
    registerPlugin();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();