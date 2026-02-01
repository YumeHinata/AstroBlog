// vditor-integration.js
(function() {
  // 等待所有依赖加载完成
  function waitForDependencies() {
    if (window.CMS && window.Vditor) {
      initVditorWidget();
    } else {
      setTimeout(waitForDependencies, 100);
    }
  }

  function initVditorWidget() {
    console.log('初始化 Vditor Widget...');
    
    // 检查 CMS API
    console.log('CMS API 检查:');
    console.log('- CMS.registerWidget:', typeof CMS.registerWidget);
    console.log('- CMS.createClass:', typeof CMS.createClass); // 这个应该不存在
    console.log('- CMS.h:', typeof CMS.h);
    console.log('- CMS.React:', typeof CMS.React);
    
    // 尝试获取 React 和 createElement
    const React = CMS.React || (window.React);
    const h = CMS.h || (React && React.createElement);
    
    if (!h) {
      console.error('无法获取 React.createElement');
      return;
    }
    
    console.log('React:', React ? '已找到' : '未找到');
    console.log('h (createElement):', h ? '已找到' : '未找到');
    
    // 创建一个全局的 Vditor 实例管理器
    const vditorInstances = {};
    
    // 使用 ES6 类定义控件组件
    class VditorControl extends React.Component {
      constructor(props) {
        super(props);
        
        // 生成唯一的容器 ID
        this.containerId = 'vditor-' + Date.now() + '-' + Math.random().toString(36).substr(2);
        this.vditor = null;
        
        console.log('VditorControl 构造函数，containerId:', this.containerId);
      }
      
      componentDidMount() {
        console.log('VditorControl 组件挂载');
        
        // 延迟初始化，确保 DOM 已经渲染
        setTimeout(() => {
          this.initVditor();
        }, 200);
      }
      
      initVditor() {
        const container = document.getElementById(this.containerId);
        if (!container) {
          console.error('找不到容器元素:', this.containerId);
          return;
        }
        
        // 清理容器
        container.innerHTML = '';
        
        // 获取值，确保是字符串
        let value = this.props.value;
        if (value && typeof value === 'object' && value.toString) {
          value = value.toString();
        } else if (value === undefined || value === null) {
          value = '';
        }
        
        console.log('Vditor 初始值:', typeof value, '长度:', value.length);
        
        try {
          // 初始化 Vditor
          this.vditor = new window.Vditor(container, {
            height: 500,
            mode: 'sv',
            cache: { enable: false },
            value: value,
            input: (newValue) => {
              console.log('Vditor 输入变化');
              this.props.onChange(newValue);
            },
            blur: () => {
              console.log('Vditor 失焦');
            },
            focus: () => {
              console.log('Vditor 聚焦');
            },
            after: () => {
              console.log('Vditor 初始化完成');
            }
          });
          
          // 保存实例引用
          vditorInstances[this.containerId] = this.vditor;
        } catch (error) {
          console.error('Vditor 初始化错误:', error);
        }
      }
      
      componentWillUnmount() {
        console.log('VditorControl 组件卸载');
        
        // 销毁 Vditor 实例
        if (this.vditor) {
          try {
            this.vditor.destroy();
            delete vditorInstances[this.containerId];
          } catch (error) {
            console.error('Vditor 销毁错误:', error);
          }
        }
      }
      
      render() {
        console.log('渲染 VditorControl');
        
        // 使用 h (React.createElement) 创建元素
        return h('div', {
          id: this.containerId,
          key: this.containerId,
          style: {
            minHeight: '500px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            overflow: 'hidden'
          }
        });
      }
    }
    
    // 预览组件 - 使用函数组件
    const VditorPreview = (props) => {
      const value = props.value || '';
      return h('div', {
        style: {
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
          padding: '10px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px'
        }
      }, value);
    };
    
    // 注册 widget
    try {
      CMS.registerWidget('vditor-markdown', VditorControl, VditorPreview);
      console.log('✅ Vditor widget 注册成功');
    } catch (error) {
      console.error('❌ Vditor widget 注册失败:', error);
    }
  }
  
  // 启动
  document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM 加载完成，开始等待依赖...');
    waitForDependencies();
  });
  
  // 也立即检查，以防 DOM 已经加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForDependencies);
  } else {
    waitForDependencies();
  }
})();