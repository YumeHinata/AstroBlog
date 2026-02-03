(function () {
  'use strict';

  if (window.decapCmsVditorPlugin) return;
  console.log('🔄 Vditor 插件初始化 (修复版)...');

  // 创建编辑器控件
  const VditorControl = createClass({
    componentDidMount: function () {
      this.initVditor();
    },

    componentWillReceiveProps: function (nextProps) {
      // 在props变化时安全更新编辑器内容
      if (this.vditor && nextProps.value !== this.props.value) {
        const currentValue = this.vditor.getValue();
        if (nextContent !== currentValue) {
          this.vditor.setValue(nextContent);
        }
      }
    },

    componentWillUnmount: function () {
      // 安全销毁：这是修复之前错误的关键
      if (this.vditor && typeof this.vditor.destroy === 'function') {
        try {
          this.vditor.destroy();
        } catch (e) {
          // 静默处理
        }
      }
      this.vditor = null;
    },

    initVditor: function () {
      const containerId = this.props.forID;

      try {
        this.vditor = new Vditor(containerId, {
          height: 500,
          value: this.props.value || '',
          theme: 'classic',
          mode: 'ir', // 恢复为即时渲染模式，稳定可靠
          cache: { enable: false },
          // ✅ 关键：启用工具栏并完全保留所有默认功能
          toolbar: [
            'emoji', 'headings', 'bold', 'italic', 'strike', 'link', 'quote', 'code', 'inline-code', 'upload',
            '|', 'list', 'ordered-list', 'check', 'outdent', 'indent',
            '|', 'table', '|', 'undo', 'redo',
            '|', {
              name: 'more',
              toolbar: [
                'both', 'code-theme', 'content-theme', 'export', 'outline', 'preview', 'devtools',
                'info', 'help', 'br'
              ]
            }
          ],
          input: (value) => {
            // 内容变化时，立即同步到Decap CMS
            // 这是最可靠的同步方式
            this.props.onChange(value);
          },
          // ✅ 关键：通过 `after` 回调解决原生按钮可能的失焦问题
          after: () => {
            console.log('✅ Vditor 初始化完成 (IR模式)');
            // 可以在这里绑定一些额外的事件监听，但非必需
          }
        });

        // ✅ 关键修复：在初始化后，为原生超链接按钮添加一个兜底的焦点恢复逻辑
        // 找到工具栏中的链接按钮并包装其点击事件
        setTimeout(() => {
          const linkBtn = document.querySelector(`#${containerId} .vditor-toolbar__item[data-type="link"]`);
          if (linkBtn) {
            const originalClick = linkBtn.onclick;
            linkBtn.onclick = (e) => {
              if (originalClick) originalClick.call(linkBtn, e);
              // 无论原生逻辑如何，300ms后强制让编辑器获得焦点
              setTimeout(() => {
                if (this.vditor && this.vditor.focus) {
                  this.vditor.focus();
                }
              }, 300);
            };
          }
        }, 500); // 稍等确保DOM渲染完成

      } catch (e) {
        console.error('Vditor 初始化失败:', e);
      }
    },

    render: function () {
      return h('div', {
        id: this.props.forID,
        style: {
          minHeight: '500px'
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
      window.decapCmsVditorPlugin = { version: '1.3-fixed', mode: 'ir' };
      console.log('✅ Vditor 插件 (修复版) 已成功注册到 Decap CMS');
    } catch (e) {
      console.error('注册 Vditor 插件失败:', e);
    }
  }

  // 启动
  function init() {
    if (!window.createClass || !window.h) {
      setTimeout(init, 100);
      return;
    }
    registerPlugin();
  }

  // 确保 Vditor 库已加载
  if (typeof Vditor !== 'undefined') {
    init();
  } else {
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