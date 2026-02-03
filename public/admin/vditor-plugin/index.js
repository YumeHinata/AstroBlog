(function() {
  'use strict';

  if (window.decapCmsVditorPlugin) return;
  console.log('🔄 Vditor 插件初始化...');

  const VditorControl = createClass({
    componentDidMount: function() {
      this.initVditor();
    },

    // 修复：变量名错误，`nextContent` 改为 `nextProps.value`
    componentWillReceiveProps: function(nextProps) {
      if (this.vditor && nextProps.value !== this.props.value) {
        const currentValue = this.vditor.getValue();
        // 使用正确的变量名
        if (nextProps.value !== currentValue) {
          this.vditor.setValue(nextProps.value || '');
        }
      }
    },

    componentWillUnmount: function() {
      if (this.vditor && typeof this.vditor.destroy === 'function') {
        try {
          this.vditor.destroy();
        } catch(e) {
          // 静默处理
        }
      }
      this.vditor = null;
    },

    initVditor: function() {
      const containerId = this.props.forID;
      
      try {
        this.vditor = new Vditor(containerId, {
          height: 500,
          value: this.props.value || '',
          theme: 'classic',
          mode: 'ir',
          cache: { enable: false },
          // ✅ 使用Vditor最完整的默认工具栏配置
          toolbar: [
            'emoji',
            'headings',
            'bold',
            'italic',
            'strike',
            'link',
            '|',
            'list',
            'ordered-list',
            'check',
            'outdent',
            'indent',
            '|',
            'quote',
            'code',
            'inline-code',
            'insert-before',
            'insert-after',
            '|',
            'upload',
            'record',
            'table',
            '|',
            'undo',
            'redo',
            '|',
            'edit-mode',
            'content-theme',
            'code-theme',
            'export',
            'outline',
            'preview',
            'devtools',
            'info',
            'help',
            'br'
          ],
          input: (value) => {
            this.props.onChange(value);
          },
          after: () => {
            console.log('✅ Vditor 初始化完成');
          }
        });

        // ✅ 超链接按钮焦点修复
        setTimeout(() => {
          const linkBtn = document.querySelector(`#${containerId} button[data-type="link"]`);
          if (linkBtn && this.vditor) {
            const originalClick = linkBtn.onclick;
            linkBtn.onclick = (e) => {
              if (originalClick) originalClick.call(linkBtn, e);
              setTimeout(() => {
                this.vditor.focus && this.vditor.focus();
              }, 200);
            };
          }
        }, 800);

      } catch(e) {
        console.error('Vditor 初始化失败:', e);
      }
    },

    render: function() {
      return h('div', { 
        id: this.props.forID,
        style: { 
          minHeight: '500px'
        }
      });
    }
  });

  // 注册插件
  function registerPlugin() {
    if (!window.CMS || !window.CMS.registerWidget) {
      setTimeout(registerPlugin, 100);
      return;
    }
    if (typeof Vditor === 'undefined') {
      setTimeout(registerPlugin, 100);
      return;
    }

    try {
      window.CMS.registerWidget('vditor', VditorControl);
      window.decapCmsVditorPlugin = { version: '1.4-fixed' };
      console.log('✅ Vditor 插件 (完整工具栏) 已注册');
    } catch(e) {
      console.error('注册失败:', e);
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

  // 确保Vditor已加载
  if (typeof Vditor !== 'undefined') {
    init();
  } else {
    const check = () => {
      if (typeof Vditor !== 'undefined') init();
      else setTimeout(check, 100);
    };
    check();
  }
})();