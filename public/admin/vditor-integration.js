// vditor-integration-simple.js
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
    console.log('初始化 Vditor Widget (简单版)...');
    
    // 创建一个全局的 Vditor 实例管理器
    const vditorInstances = {};
    let widgetIdCounter = 0;
    
    // 控件工厂函数
    function createVditorControl() {
      const id = ++widgetIdCounter;
      const containerId = 'vditor-' + id + '-' + Date.now();
      
      let vditorInstance = null;
      
      // 返回一个符合 Decap CMS 期望的控件对象
      return {
        // Decap CMS 会调用这个方法来渲染控件
        render: function(element, value, field, metadata) {
          console.log('渲染 Vditor 控件，containerId:', containerId);
          
          // 创建容器
          const container = document.createElement('div');
          container.id = containerId;
          container.style.minHeight = '500px';
          container.style.border = '1px solid #ddd';
          container.style.borderRadius = '4px';
          container.style.overflow = 'hidden';
          
          // 将容器添加到提供的元素中
          element.appendChild(container);
          
          // 获取初始值
          const initialValue = value || '';
          console.log('初始值:', initialValue.length, '字符');
          
          // 初始化 Vditor
          try {
            vditorInstance = new window.Vditor(container, {
              height: 500,
              mode: 'sv',
              cache: { enable: false },
              value: initialValue,
              input: (newValue) => {
                console.log('Vditor 输入变化');
                // 触发值变化事件
                if (element.dispatchEvent) {
                  const event = new CustomEvent('change', {
                    detail: { value: newValue }
                  });
                  element.dispatchEvent(event);
                }
              },
              after: () => {
                console.log('Vditor 初始化完成');
              }
            });
            
            vditorInstances[containerId] = vditorInstance;
          } catch (error) {
            console.error('Vditor 初始化错误:', error);
          }
          
          return container;
        },
        
        // 当控件被销毁时调用
        destroy: function() {
          console.log('销毁 Vditor 控件:', containerId);
          
          if (vditorInstance) {
            try {
              vditorInstance.destroy();
              delete vditorInstances[containerId];
            } catch (error) {
              console.error('Vditor 销毁错误:', error);
            }
          }
        },
        
        // 获取当前值
        getValue: function() {
          if (vditorInstance) {
            return vditorInstance.getValue();
          }
          return '';
        },
        
        // 设置值
        setValue: function(value) {
          if (vditorInstance && value !== undefined) {
            vditorInstance.setValue(value || '');
          }
        }
      };
    }
    
    // 预览组件工厂函数
    function createVditorPreview() {
      return {
        render: function(element, value) {
          console.log('渲染预览');
          
          const preview = document.createElement('div');
          preview.style.whiteSpace = 'pre-wrap';
          preview.style.fontFamily = 'monospace';
          preview.style.padding = '10px';
          preview.style.backgroundColor = '#f5f5f5';
          preview.style.borderRadius = '4px';
          preview.textContent = value || '';
          
          element.appendChild(preview);
          return preview;
        }
      };
    }
    
    // 注册 widget
    try {
      // Decap CMS 3.x 的 registerWidget 可能需要不同的格式
      // 尝试不同的注册方式
      
      // 方式1：直接注册工厂函数
      if (typeof CMS.registerWidget === 'function') {
        CMS.registerWidget('vditor-markdown', createVditorControl, createVditorPreview);
        console.log('✅ Vditor widget 注册成功 (方式1)');
      } 
      // 方式2：尝试注册为对象
      else if (CMS.registerWidget) {
        CMS.registerWidget({
          name: 'vditor-markdown',
          control: createVditorControl(),
          preview: createVditorPreview()
        });
        console.log('✅ Vditor widget 注册成功 (方式2)');
      } else {
        console.error('❌ 无法找到 CMS.registerWidget 方法');
      }
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