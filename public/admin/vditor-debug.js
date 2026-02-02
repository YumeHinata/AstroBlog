// vditor-debug.js
(function() {
  console.log('=== Vditor Widget 调试器 ===');
  
  // 存储调试信息
  window.vditorDebug = {
    widgets: {},
    errors: [],
    logs: []
  };
  
  // 重写 console.log 来捕获日志
  const originalLog = console.log;
  console.log = function(...args) {
    window.vditorDebug.logs.push({
      time: new Date().toISOString(),
      args: args
    });
    originalLog.apply(console, args);
  };
  
  // 重写 console.error
  const originalError = console.error;
  console.error = function(...args) {
    window.vditorDebug.errors.push({
      time: new Date().toISOString(),
      args: args
    });
    originalError.apply(console, args);
  };
  
  // 监控 widget 注册
  const originalRegister = CMS.registerWidget;
  CMS.registerWidget = function(...args) {
    console.log('🔍 CMS.registerWidget 被调用:', args);
    
    // 保存 widget 信息
    const widgetName = typeof args[0] === 'string' ? args[0] : args[0]?.name;
    if (widgetName) {
      window.vditorDebug.widgets[widgetName] = {
        time: new Date().toISOString(),
        args: args,
        control: args[1],
        preview: args[2]
      };
      console.log(`📦 Widget "${widgetName}" 已记录`);
    }
    
    // 调用原始函数
    return originalRegister.apply(CMS, args);
  };
  
  // 监控 getWidget
  if (CMS.getWidget) {
    const originalGetWidget = CMS.getWidget;
    CMS.getWidget = function(name) {
      const result = originalGetWidget.call(CMS, name);
      console.log(`🔍 CMS.getWidget("${name}") 返回:`, result);
      return result;
    };
  }
  
  // 添加调试命令
  window.debugVditor = {
    // 查看所有已注册的 widget
    listWidgets: function() {
      console.log('=== 已注册的 Widget ===');
      for (const name in window.vditorDebug.widgets) {
        console.log(`- ${name}:`, window.vditorDebug.widgets[name]);
      }
    },
    
    // 检查特定 widget
    checkWidget: function(name) {
      console.log(`=== 检查 Widget: ${name} ===`);
      if (window.vditorDebug.widgets[name]) {
        console.log('已记录:', window.vditorDebug.widgets[name]);
      } else {
        console.log('未找到记录');
      }
      
      if (CMS.getWidget) {
        console.log('CMS.getWidget:', CMS.getWidget(name));
      }
    },
    
    // 查看错误
    showErrors: function() {
      console.log('=== 错误日志 ===');
      window.vditorDebug.errors.forEach((error, i) => {
        console.log(`${i + 1}. [${error.time}]`, ...error.args);
      });
    },
    
    // 查看日志
    showLogs: function() {
      console.log('=== 最近日志 ===');
      const recentLogs = window.vditorDebug.logs.slice(-20);
      recentLogs.forEach((log, i) => {
        console.log(`${i + 1}. [${log.time}]`, ...log.args);
      });
    },
    
    // 手动触发 widget 渲染
    testRender: function() {
      console.log('=== 测试 Widget 渲染 ===');
      
      if (!CMS.getWidget) {
        console.error('CMS.getWidget 不存在');
        return;
      }
      
      const widget = CMS.getWidget('vditor-markdown');
      if (!widget) {
        console.error('vditor-markdown widget 未找到');
        return;
      }
      
      console.log('找到 widget:', widget);
      
      // 创建一个测试容器
      const testContainer = document.createElement('div');
      testContainer.id = 'vditor-test-container';
      testContainer.style.position = 'fixed';
      testContainer.style.top = '50px';
      testContainer.style.right = '50px';
      testContainer.style.width = '400px';
      testContainer.style.height = '300px';
      testContainer.style.zIndex = '9999';
      testContainer.style.border = '3px solid red';
      testContainer.style.backgroundColor = 'white';
      testContainer.style.padding = '10px';
      
      document.body.appendChild(testContainer);
      
      // 尝试渲染控件
      try {
        const control = widget.control || widget;
        const rendered = control({
          value: '# 测试标题\n\n这是一个测试内容。',
          onChange: function(newValue) {
            console.log('控件 onChange:', newValue);
          }
        });
        
        if (rendered && rendered.nodeType) {
          testContainer.appendChild(rendered);
          console.log('✅ 控件渲染成功');
        } else {
          testContainer.innerHTML = '<div style="color: red;">控件未返回有效DOM元素</div>';
          console.error('控件返回:', rendered);
        }
      } catch (error) {
        testContainer.innerHTML = '<div style="color: red;">渲染错误: ' + error.message + '</div>';
        console.error('渲染错误:', error);
      }
    }
  };
  
  console.log('✅ 调试器已加载，使用 window.debugVditor 访问调试命令');
  console.log('可用命令:');
  console.log('  debugVditor.listWidgets() - 列出所有已注册的 widget');
  console.log('  debugVditor.checkWidget("vditor-markdown") - 检查特定 widget');
  console.log('  debugVditor.showErrors() - 显示错误日志');
  console.log('  debugVditor.showLogs() - 显示最近日志');
  console.log('  debugVditor.testRender() - 测试 widget 渲染');
  
})();