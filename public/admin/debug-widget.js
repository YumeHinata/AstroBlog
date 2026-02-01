// debug-widget.js
(function () {
    console.log('=== Widget 调试脚本 ===');

    // 检查当前已注册的 widget
    function checkRegisteredWidgets() {
        console.log('检查已注册的 widget...');

        // 尝试获取已注册的 widget
        if (CMS.getWidget) {
            const widget = CMS.getWidget('vditor-markdown');
            console.log('CMS.getWidget("vditor-markdown"):', widget);
        }

        if (CMS.getEditorComponents) {
            const components = CMS.getEditorComponents();
            console.log('CMS.getEditorComponents():', components);
        }

        // 检查全局 widget 注册表
        if (CMS.widgets) {
            console.log('CMS.widgets:', CMS.widgets);
        }
    }

    // 定期检查
    setInterval(checkRegisteredWidgets, 3000);

    // 监听 CMS 初始化完成
    document.addEventListener('cms:initialize', function () {
        console.log('CMS 初始化事件触发');
        checkRegisteredWidgets();
    });

    console.log('=== 调试脚本加载完成 ===');
})();