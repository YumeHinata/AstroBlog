// vditor-final.js
(function() {
  console.log('=== Vditor Widget 最终版 ===');
  
  // 等待 Decap CMS 完全加载
  function init() {
    if (!window.CMS || !window.Vditor) {
      console.log('等待依赖...');
      setTimeout(init, 100);
      return;
    }
    
    console.log('✅ 依赖已加载');
    console.log('CMS.registerWidget 签名:', CMS.registerWidget.length, '个参数');
    
    // 测试 CMS.registerWidget 的实际行为
    testRegisterWidget();
    
    // 创建最简单的控件先测试
    createSimpleTestWidget();
  }
  
  function testRegisterWidget() {
    console.log('🧪 测试 registerWidget API...');
    
    try {
      // 创建一个最简单的测试控件
      const TestControl = function(props) {
        console.log('测试控件被调用，props:', props);
        
        // 创建一个简单的 DOM 元素
        const div = document.createElement('div');
        div.innerHTML = '<h3 style="color: green;">✅ 测试控件工作正常</h3>';
        div.style.padding = '20px';
        div.style.border = '2px solid green';
        div.style.borderRadius = '8px';
        div.style.backgroundColor = '#e8f5e9';
        
        return div;
      };
      
      const TestPreview = function(value) {
        const div = document.createElement('div');
        div.innerHTML = '<p>测试预览: ' + (value || '空') + '</p>';
        return div;
      };
      
      // 尝试注册测试 widget
      CMS.registerWidget('test-widget', TestControl, TestPreview);
      console.log('✅ 测试 widget 注册成功');
      
    } catch (error) {
      console.error('❌ 测试 widget 注册失败:', error);
    }
  }
  
  function createSimpleTestWidget() {
    console.log('🔧 创建简单 Vditor widget...');
    
    // 创建 Vditor 控件 - 使用简单的函数返回 DOM 元素
    const VditorControl = function(opts) {
      console.log('VditorControl 被调用，opts:', opts);
      
      // 创建一个容器 div
      const container = document.createElement('div');
      container.className = 'vditor-control-container';
      container.style.minHeight = '500px';
      container.style.border = '3px solid #007bff';
      container.style.borderRadius = '8px';
      container.style.overflow = 'hidden';
      container.style.position = 'relative';
      
      // 添加加载指示器
      const loading = document.createElement('div');
      loading.innerHTML = '正在加载 Vditor 编辑器...';
      loading.style.padding = '20px';
      loading.style.textAlign = 'center';
      loading.style.color = '#666';
      container.appendChild(loading);
      
      // 获取初始值
      const initialValue = opts.value || '';
      console.log('初始值长度:', initialValue.length);
      
      // 延迟初始化 Vditor，确保容器已经渲染
      setTimeout(() => {
        try {
          console.log('初始化 Vditor...');
          
          // 移除加载指示器
          container.innerHTML = '';
          
          const vditor = new Vditor(container, {
            height: 500,
            mode: 'sv',
            cache: { enable: false },
            value: initialValue,
            input: function(value) {
              console.log('Vditor 内容变化:', value.length, '字符');
              
              // 触发变化事件
              if (opts.onChange) {
                opts.onChange(value);
              }
            },
            after: function() {
              console.log('✅ Vditor 初始化完成');
              
              // 保存 vditor 实例到容器上
              container._vditor = vditor;
            }
          });
          
        } catch (error) {
          console.error('❌ Vditor 初始化失败:', error);
          container.innerHTML = '<div style="padding: 20px; color: red;">Vditor 初始化失败: ' + error.message + '</div>';
        }
      }, 100);
      
      // 返回容器
      return container;
    };
    
    // 创建预览控件
    const VditorPreview = function(value) {
      console.log('VditorPreview 被调用，value:', value);
      
      const preview = document.createElement('div');
      preview.className = 'vditor-preview';
      preview.style.padding = '15px';
      preview.style.backgroundColor = '#f8f9fa';
      preview.style.border = '1px solid #dee2e6';
      preview.style.borderRadius = '6px';
      preview.style.maxHeight = '300px';
      preview.style.overflow = 'auto';
      preview.style.whiteSpace = 'pre-wrap';
      preview.style.fontFamily = 'monospace';
      preview.style.fontSize = '14px';
      
      const displayValue = value || '';
      preview.textContent = displayValue || '(空内容)';
      
      return preview;
    };
    
    // 尝试注册 widget
    try {
      console.log('📝 注册 vditor-markdown widget...');
      
      // 从函数签名看，registerWidget 接受 4 个参数
      // 第四个参数可能是选项
      CMS.registerWidget('vditor-markdown', VditorControl, VditorPreview, {
        globalStyles: true
      });
      
      console.log('✅ vditor-markdown widget 注册成功');
      
    } catch (error) {
      console.error('❌ widget 注册失败:', error);
      
      // 尝试不同的注册方式
      tryAlternativeRegistration(VditorControl, VditorPreview);
    }
  }
  
  function tryAlternativeRegistration(control, preview) {
    console.log('🔄 尝试备选注册方式...');
    
    // 方式1: 只传递控件
    try {
      CMS.registerWidget('vditor-markdown', control);
      console.log('✅ 方式1成功 (只传递控件)');
      return;
    } catch (e1) {
      console.log('方式1失败:', e1.message);
    }
    
    // 方式2: 传递控件和预览
    try {
      CMS.registerWidget('vditor-markdown', control, preview);
      console.log('✅ 方式2成功 (控件+预览)');
      return;
    } catch (e2) {
      console.log('方式2失败:', e2.message);
    }
    
    // 方式3: 作为对象传递
    try {
      CMS.registerWidget({
        name: 'vditor-markdown',
        control: control,
        preview: preview
      });
      console.log('✅ 方式3成功 (对象形式)');
      return;
    } catch (e3) {
      console.log('方式3失败:', e3.message);
    }
    
    console.error('❌ 所有注册方式都失败了');
  }
  
  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();