(function () {
  const { CMS } = window;
  const { createClass, h } = CMS;

  // 控件组件（编辑界面）
  const VditorControl = createClass({
    getInitialState: function () {
      return {
        isVditorReady: false,
        editorRef: null,
        vditor: null
      };
    },

    componentDidMount: function () {
      // 检查 Vditor 是否已加载
      if (typeof window.Vditor === 'undefined') {
        console.error('Vditor 未加载，请检查脚本路径');
        setTimeout(() => {
          if (typeof window.Vditor !== 'undefined') {
            this.initVditor();
          }
        }, 100);
        return;
      }
      
      this.initVditor();
    },

    initVditor: function () {
      // 确保 DOM 元素存在
      if (!this.editorRef) {
        console.error('编辑器元素未找到');
        return;
      }

      try {
        // 从 props 获取值，处理可能的 Immutable 对象
        const value = this.props.value ? 
          (typeof this.props.value === 'string' ? this.props.value : String(this.props.value)) : 
          '';
        
        console.log('初始化 Vditor，值类型:', typeof this.props.value, '值:', this.props.value);

        this.setState({ vditor: new window.Vditor(this.editorRef, {
          height: 500,
          mode: 'sv',
          cache: { enable: false },
          value: value,
          input: (val) => {
            console.log('Vditor 输入:', val);
            this.props.onChange(val);
          },
          after: () => {
            console.log('Vditor 初始化完成');
            this.setState({ isVditorReady: true });
          }
        }) });
      } catch (error) {
        console.error('Vditor 初始化失败:', error);
      }
    },

    componentWillUnmount: function () {
      if (this.state.vditor) {
        this.state.vditor.destroy();
      }
    },

    render: function () {
      // 使用简单的对象字面量方式设置 ref
      const refCallback = (el) => {
        if (el && !this.editorRef) {
          this.editorRef = el;
          // 如果 Vditor 已加载但还未初始化，现在初始化
          if (typeof window.Vditor !== 'undefined' && !this.state.vditor && this.props.value !== undefined) {
            setTimeout(() => this.initVditor(), 0);
          }
        }
      };

      return h('div', {
        key: 'vditor-container',
        ref: refCallback,
        style: { 
          minHeight: '500px',
          border: this.state.isVditorReady ? 'none' : '1px solid #ddd',
          borderRadius: '4px'
        }
      });
    }
  });

  // 预览组件（预览界面）
  const VditorPreview = createClass({
    render: function () {
      const value = this.props.value || '';
      // 使用 div 而不是 pre 来避免空白符问题
      return h('div', {
        style: { 
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
          padding: '10px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px'
        }
      }, value);
    }
  });

  // 注册 Widget
  CMS.registerWidget('vditor-markdown', VditorControl, VditorPreview);

  console.log('[vditor] Widget 已成功注册');
})();