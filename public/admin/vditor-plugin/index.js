(function() {
  'use strict';

  if (window.decapCmsVditorPlugin) return;
  console.log('🔄 Vditor 插件初始化...');

  // ==================== 编辑器控件组件 ====================
  const VditorControl = createClass({
    getInitialState: function() {
      return {
        value: this.props.value || '',
        editorId: `vditor-${Date.now()}`
      };
    },

    componentDidMount: function() {
      this.initVditor();
    },

    // 修复：变量名更正为 nextProps.value
    componentWillReceiveProps: function(nextProps) {
      if (this.vditor && nextProps.value !== this.props.value) {
        const currentValue = this.vditor.getValue();
        if (nextProps.value !== currentValue) {
          this.vditor.setValue(nextProps.value || '');
        }
      }
    },

    componentWillUnmount: function() {
      if (this.vditor && this.vditor.destroy) {
        try {
          this.vditor.destroy();
        } catch(e) {
          console.debug('编辑器清理完成');
        }
      }
    },

    initVditor: function() {
      try {
        this.vditor = new Vditor(this.state.editorId, {
          height: 500,
          value: this.state.value,
          theme: 'classic',
          mode: 'ir', // IR模式，实时渲染
          cache: { enable: false },
          // ✅ 完整的官方工具栏配置
          toolbar: [
            'emoji', 'headings', 'bold', 'italic', 'strike', 'link', 'quote', 
            'code', 'inline-code', 'insert-before', 'insert-after',
            '|', 'list', 'ordered-list', 'check', 'outdent', 'indent',
            '|', 'upload', 'table', '|', 'undo', 'redo',
            '|', 'edit-mode', 'content-theme', 'code-theme', 'export', 
            'outline', 'preview', 'devtools', 'info', 'help', 'br'
          ],
          input: (value) => {
            this.setState({ value: value });
            this.props.onChange(value);
          }
        });
      } catch(e) {
        console.error('Vditor 初始化失败:', e);
      }
    },

    render: function() {
      return h('div', { 
        id: this.state.editorId,
        style: { 
          minHeight: '500px',
          width: '100%'
        }
      });
    }
  });

  // ==================== 预览组件（关键新增部分） ====================
  const VditorPreview = createClass({
    render: function() {
      const value = this.props.value || '';
      
      // 创建预览容器
      return h('div', {
        className: 'vditor-preview',
        style: {
          padding: '16px',
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          minHeight: '200px',
          maxHeight: '600px',
          overflow: 'auto'
        }
      }, [
        // 预览标题
        h('div', {
          style: {
            fontSize: '12px',
            color: '#6b7280',
            fontWeight: 'bold',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }
        }, '内容预览'),
        
        // 预览内容
        h('div', {
          style: {
            fontSize: '14px',
            lineHeight: '1.6',
            color: '#374151'
          },
          dangerouslySetInnerHTML: { __html: this.renderMarkdown(value) }
        }),
        
        // 字符统计
        h('div', {
          style: {
            fontSize: '12px',
            color: '#9ca3af',
            marginTop: '16px',
            paddingTop: '8px',
            borderTop: '1px solid #e5e7eb'
          }
        }, `字数: ${value.length} 字符`)
      ]);
    },
    
    // 简单的Markdown渲染函数
    renderMarkdown: function(text) {
      if (!text) return '<em style="color:#9ca3af">（暂无内容）</em>';
      
      // 基本Markdown转换（实际使用中可用专业库）
      let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/~~(.*?)~~/g, '<del>$1</del>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" style="max-width:100%;border-radius:4px;"/>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br/>');
      
      return `<p>${html}</p>`;
    }
  });

  // ==================== 插件注册 ====================
  function registerPlugin() {
    if (!window.CMS || !window.CMS.registerWidget) {
      setTimeout(registerPlugin, 100);
      return;
    }
    
    if (typeof Vditor === 'undefined') {
      console.log('等待 Vditor 加载...');
      setTimeout(registerPlugin, 100);
      return;
    }

    try {
      // ✅ 关键：同时注册控件和预览组件
      window.CMS.registerWidget('vditor', VditorControl, VditorPreview);
      
      window.decapCmsVditorPlugin = { 
        version: '1.5',
        hasPreview: true 
      };
      
      console.log('✅ Vditor 插件 (含预览组件) 已成功注册');
      
    } catch(e) {
      console.error('注册失败:', e);
    }
  }

  // ==================== 启动 ====================
  function init() {
    if (!window.createClass || !window.h) {
      setTimeout(init, 100);
      return;
    }
    registerPlugin();
  }

  // 检查并启动
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