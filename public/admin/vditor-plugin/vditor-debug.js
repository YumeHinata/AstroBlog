// vditor-debug.js - Vditor Widget 调试器
(function() {
    console.log('=== Vditor Widget 调试器 ===');
    
    // 存储日志和错误
    var logs = [];
    var errors = [];
    
    // 原始方法拦截
    if (window.CMS) {
        // 拦截 registerWidget
        var originalRegisterWidget = CMS.registerWidget;
        if (originalRegisterWidget) {
            CMS.registerWidget = function() {
                console.log('🔍 CMS.registerWidget 被调用:', Array.from(arguments));
                logs.push({
                    type: 'registerWidget',
                    args: Array.from(arguments),
                    time: new Date().toISOString()
                });
                return originalRegisterWidget.apply(this, arguments);
            };
        }
        
        // 拦截 getWidget
        var originalGetWidget = CMS.getWidget;
        if (originalGetWidget) {
            CMS.getWidget = function() {
                var result = originalGetWidget.apply(this, arguments);
                console.log('🔍 CMS.getWidget 被调用:', Array.from(arguments), '返回:', result);
                logs.push({
                    type: 'getWidget',
                    args: Array.from(arguments),
                    result: result,
                    time: new Date().toISOString()
                });
                return result;
            };
        }
    }
    
    // 调试命令
    window.debugVditor = {
        // 列出所有已注册的 widget
        listWidgets: function() {
            if (!CMS || !CMS.getWidgets) {
                console.log('❌ CMS.getWidgets 不可用');
                return null;
            }
            
            try {
                var widgets = CMS.getWidgets();
                console.log('📋 已注册的 widgets:');
                for (var i = 0; i < widgets.length; i++) {
                    var widget = widgets[i];
                    console.log(`  ${i}:`, widget);
                }
                return widgets;
            } catch (error) {
                console.log('❌ 获取 widgets 失败:', error);
                return null;
            }
        },
        
        // 检查特定 widget
        checkWidget: function(name) {
            if (!CMS || !CMS.getWidget) {
                console.log('❌ CMS.getWidget 不可用');
                return null;
            }
            
            try {
                var widget = CMS.getWidget(name);
                console.log(`🔍 Widget "${name}":`, widget);
                return widget;
            } catch (error) {
                console.log(`❌ 获取 widget "${name}" 失败:`, error);
                return null;
            }
        },
        
        // 显示错误日志
        showErrors: function() {
            console.log('📛 错误日志:', errors);
            return errors;
        },
        
        // 显示最近日志
        showLogs: function() {
            console.log('📝 最近日志:', logs.slice(-10));
            return logs;
        },
        
        // 测试 widget 渲染
        testRender: function() {
            if (!window.createClass || !window.h) {
                console.log('❌ React 工具不可用');
                return;
            }
            
            try {
                var TestWidget = createClass({
                    render: function() {
                        return h('div', {
                            style: {
                                border: '2px solid red',
                                padding: '10px',
                                margin: '10px'
                            }
                        }, '测试 Widget - ' + Date.now());
                    }
                });
                
                // 尝试注册
                if (CMS && CMS.registerWidget) {
                    CMS.registerWidget('test-render', TestWidget);
                    console.log('✅ 测试渲染 widget 已注册');
                }
            } catch (error) {
                console.log('❌ 测试渲染失败:', error);
            }
        },
        
        // 检查环境
        checkEnvironment: function() {
            return {
                React: typeof React,
                ReactDOM: typeof ReactDOM,
                createClass: typeof createClass,
                h: typeof h,
                Vditor: typeof Vditor,
                CMS: typeof CMS,
                CMS_version: window.CMS ? window.CMS.version : 'unknown'
            };
        }
    };
    
    // 错误捕获
    window.addEventListener('error', function(event) {
        errors.push({
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            time: new Date().toISOString()
        });
    });
    
    console.log('✅ 调试器已加载，使用 window.debugVditor 访问调试命令');
    console.log('可用命令:');
    console.log('  debugVditor.listWidgets() - 列出所有已注册的 widget');
    console.log('  debugVditor.checkWidget("vditor-markdown") - 检查特定 widget');
    console.log('  debugVditor.showErrors() - 显示错误日志');
    console.log('  debugVditor.showLogs() - 显示最近日志');
    console.log('  debugVditor.testRender() - 测试 widget 渲染');
})();