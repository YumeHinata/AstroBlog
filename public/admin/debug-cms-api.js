// debug-cms-api.js
(function() {
  console.log('=== Decap CMS API 调试 ===');
  
  function checkCMSAPI() {
    if (!window.CMS) {
      console.log('CMS 未加载');
      return;
    }
    
    console.log('=== CMS 对象属性 ===');
    const functions = [];
    const others = [];
    
    for (let key in CMS) {
      if (typeof CMS[key] === 'function') {
        functions.push(key);
      } else {
        others.push(key);
      }
    }
    
    console.log('函数:', functions.sort());
    console.log('其他属性:', others.sort());
    
    // 检查特定的 API
    console.log('=== 重要 API 检查 ===');
    console.log('CMS.registerWidget:', typeof CMS.registerWidget);
    console.log('CMS.getWidget:', typeof CMS.getWidget);
    console.log('CMS.h:', typeof CMS.h);
    console.log('CMS.React:', typeof CMS.React);
    console.log('CMS.createClass:', typeof CMS.createClass);
    console.log('CMS.getEditorComponents:', typeof CMS.getEditorComponents);
    
    // 检查 React 版本
    if (CMS.React) {
      console.log('CMS.React.version:', CMS.React.version);
    }
    if (window.React) {
      console.log('window.React.version:', window.React.version);
    }
  }
  
  // 等待 CMS 加载
  function waitForCMS() {
    if (window.CMS) {
      checkCMSAPI();
    } else {
      setTimeout(waitForCMS, 100);
    }
  }
  
  // 监听 URL 变化，因为 Decap CMS 是单页应用
  let lastUrl = location.href;
  new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log('URL 变化:', currentUrl);
      setTimeout(checkCMSAPI, 1000);
    }
  }).observe(document, { subtree: true, childList: true });
  
  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForCMS);
  } else {
    waitForCMS();
  }
})();