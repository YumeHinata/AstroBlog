// vditor-widget-official.js
(function() {
  console.log('=== Decap CMS 官方方式注册 Vditor Widget ===');
  
  // 等待依赖
  function init() {
    if (!window.CMS || !window.Vditor) {
      console.log('等待依赖...');
      setTimeout(init, 100);
      return;
    }
    
    console.log('✅ 依赖已加载');
    
    // 检查 CMS API
    console.log('CMS.registerWidget:', typeof CMS.registerWidget);
    console.log('CMS.h:', typeof CMS.h);
    
    // 获取 React 和 createElement
    // Decap CMS 将 React 暴露为 CMS.React，createElement 暴露为 CMS.h
    const React = CMS.React || window.React;
    const h = CMS.h || (React && React.createElement);
    
    if (!React || !h) {
      console.error('❌ 缺少 React 或 createElement');
      return;
    }
    
    console.log('React:', React.version);
    console.log('h (createElement):', typeof h);
    
    // 创建控件组件
    class VditorControl extends React.Component {
      constructor(props) {
        super(props);
        console.log('VditorControl 构造函数');
        this.containerRef = React.createRef();
        this.vditor = null;
      }
      
      componentDidMount() {
        console.log('📌 VditorControl 挂载');
        console.log('props.value 类型:', typeof this.props.value);
        console.log('props.value:', this.props.value);
        
        if (!this.containerRef.current) {
          console.error('❌ 没有容器元素');
          return;
        }
        
        // 获取初始值
        let initialValue = '';
        if (this.props.value) {
          if (typeof this.props.value === 'string') {
            initialValue = this.props.value;
          } else if (this.props.value.toString) {
            // 可能是 Immutable 对象
            initialValue = this.props.value.toString();
          }
        }
        
        console.log('初始化 Vditor，值长度:', initialValue.length);
        
        try {
          this.vditor = new Vditor(this.containerRef.current, {
            height: 500,
            mode: 'sv',
            cache: { enable: false },
            value: initialValue,
            input: (value) => {
              console.log('✏️ Vditor 内容变化');
              // 调用 onChange 通知 Decap CMS
              if (this.props.onChange) {
                this.props.onChange(value);
              }
            },
            after: () => {
              console.log('✅ Vditor 初始化完成');
            }
          });
        } catch (error) {
          console.error('❌ Vditor 初始化失败:', error);
        }
      }
      
      componentWillUnmount() {
        console.log('🗑️ VditorControl 卸载');
        if (this.vditor) {
          this.vditor.destroy();
        }
      }
      
      render() {
        console.log('🖌️ 渲染 VditorControl');
        return h('div', {
          ref: this.containerRef,
          style: {
            minHeight: '500px',
            border: '2px solid #007bff',
            borderRadius: '6px',
            overflow: 'hidden'
          }
        });
      }
    }
    
    // 预览组件
    const VditorPreview = (props) => {
      const value = props.value || '';
      console.log('预览组件，值长度:', value.length);
      
      return h('div', {
        style: {
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          maxHeight: '300px',
          overflow: 'auto'
        }
      }, value || '(空内容)');
    };
    
    // 注册 widget
    try {
      console.log('📝 注册 widget: vditor-markdown');
      CMS.registerWidget('vditor-markdown', VditorControl, VditorPreview);
      console.log('✅ Widget 注册完成');
    } catch (error) {
      console.error('❌ Widget 注册失败:', error);
    }
  }
  
  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();