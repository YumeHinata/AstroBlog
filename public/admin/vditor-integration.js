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
    
    const { createClass, h } = CMS;
    
    // 创建一个全局的 Vditor 实例管理器
    const vditorInstances = {};
    
    // 控件组件
    const VditorControl = createClass({
      getInitialState() {
        return {
          containerId: 'vditor-' + Date.now() + '-' + Math.random().toString(36).substr(2)
        };
      },
      
      componentDidMount() {
        console.log('VditorControl 挂载，containerId:', this.state.containerId);
        
        // 延迟初始化，确保 DOM 已经渲染
        setTimeout(() => {
          this.initVditor();
        }, 200);
      },
      
      initVditor() {
        const container = document.getElementById(this.state.containerId);
        if (!container) {
          console.error('找不到容器元素:', this.state.containerId);
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
        
        console.log('Vditor 初始值:', typeof value, value);
        
        try {
          // 初始化 Vditor
          const vditor = new window.Vditor(container, {
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
          vditorInstances[this.state.containerId] = vditor;
        } catch (error) {
          console.error('Vditor 初始化错误:', error);
        }
      },
      
      componentWillUnmount() {
        // 销毁 Vditor 实例
        if (vditorInstances[this.state.containerId]) {
          try {
            vditorInstances[this.state.containerId].destroy();
            delete vditorInstances[this.state.containerId];
          } catch (error) {
            console.error('Vditor 销毁错误:', error);
          }
        }
      },
      
      render() {
        console.log('渲染 VditorControl');
        
        // 返回一个简单的 div 元素
        return h('div', {
          id: this.state.containerId,
          key: this.state.containerId,
          style: {
            minHeight: '500px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            overflow: 'hidden'
          }
        });
      }
    });
    
    // 预览组件
    const VditorPreview = createClass({
      render() {
        const value = this.props.value || '';
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