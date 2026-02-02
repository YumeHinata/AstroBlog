// vditor-debug.js - 调试工具
(function() {
    console.log('=== Vditor 调试模式启动 ===');
    
    // 拦截并记录 CMS.registerWidget 调用
    if (window.CMS && typeof CMS.registerWidget === 'function') {
        const originalRegisterWidget = CMS.registerWidget;
        CMS.registerWidget = function(name, widget) {
            console.log('🔍 CMS.registerWidget 被调用:', [name, widget]);
            
            // 记录已注册的 widget
            if (!window.__vditorWidgets) {
                window.__vditorWidgets = {};
            }
            window.__vditorWidgets[name] = widget;
            console.log('📦 Widget "' + name + '" 已记录');
            
            return originalRegisterWidget.apply(this, arguments);
        };
    }
    
    // 拦截并记录 CMS.getWidget 调用
    if (window.CMS && typeof CMS.getWidget === 'function') {
        const originalGetWidget = CMS.getWidget;
        CMS.getWidget = function(name) {
            const result = originalGetWidget.apply(this, arguments);
            console.log('🔍 CMS.getWidget("' + name + '") 返回:', result);
            return result;
        };
    }
    
    // 暴露调试工具到全局
    window.__vditorDebug = {
        // 检查环境
        checkEnvironment: function() {
            return {
                React: typeof React,
                ReactDOM: typeof ReactDOM,
                createClass: typeof createClass,
                h: typeof h,
                Vditor: typeof Vditor,
                CMS: typeof CMS,
                registeredWidgets: window.__vditorWidgets ? Object.keys(window.__vditorWidgets) : []
            };
        },
        
        // 创建测试 Vditor 实例
        testVditor: function() {
            const testDiv = document.createElement('div');
            testDiv.id = 'test-vditor-' + Date.now();
            testDiv.style.cssText = 'height:200px;width:500px;border:1px solid #ccc;margin:20px;';
            document.body.appendChild(testDiv);
            
            try {
                const vditor = new Vditor(testDiv.id, {
                    height: 200,
                    placeholder: '测试编辑器...',
                    input: (value) => {
                        console.log('测试编辑器输入:', value);
                    }
                });
                console.log('✅ 测试 Vditor 实例创建成功');
                return vditor;
            } catch (error) {
                console.error('❌ 测试 Vditor 创建失败:', error);
                return null;
            }
        },
        
        // 验证当前 markdown 控件
        verifyMarkdownWidget: function() {
            if (!CMS) return 'CMS 未加载';
            
            const widget = CMS.getWidget('markdown');
            if (!widget) return '找不到 markdown 控件';
            
            console.log('当前 markdown 控件结构:', {
                control: widget.control,
                preview: widget.preview,
                schema: widget.schema
            });
            
            return 'markdown 控件验证完成';
        }
    };
    
    console.log('✅ Vditor 调试工具已加载');
    console.log('使用 window.__vditorDebug 访问调试工具');
    console.log('例如: window.__vditorDebug.checkEnvironment()');
    console.log('=== Vditor 调试模式就绪 ===');
})();