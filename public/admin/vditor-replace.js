// vditor-replace.js
(function() {
  // 配置
  const CONFIG = {
    targetWidget: 'markdown', // 要替换的原始widget类型
    customWidget: 'vditor-markdown', // 在config.yml中使用的widget名称
    vditorOptions: {
      height: 600,
      mode: 'sv', // 所见即所得模式
      cache: { enable: false },
      toolbar: [
        'emoji',
        'headings',
        'bold',
        'italic',
        'strike',
        'link',
        '|',
        'list',
        'ordered-list',
        'check',
        'outdent',
        'indent',
        '|',
        'quote',
        'line',
        'code',
        'inline-code',
        'insert-before',
        'insert-after',
        '|',
        'table',
        'upload',
        '|',
        'undo',
        'redo',
        '|',
        'fullscreen',
        'preview',
        'both',
        'outline',
        'code-theme',
        'content-theme'
      ]
    }
  };

  console.log('Vditor替换脚本加载...');

  // 等待Decap CMS完全加载
  function waitForCMS() {
    if (window.CMS && window.Vditor) {
      console.log('依赖已加载，开始初始化...');
      init();
    } else {
      console.log('等待依赖... CMS:', !!window.CMS, 'Vditor:', !!window.Vditor);
      setTimeout(waitForCMS, 100);
    }
  }

  // 监视DOM变化，检测编辑器出现
  function observeDOM() {
    console.log('开始监视DOM变化...');
    
    // 创建MutationObserver来检测编辑器出现
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeType === 1) { // 元素节点
              // 检查是否有markdown编辑器
              if (node.querySelector && (
                node.querySelector('[data-slate-editor]') || // Decap CMS的编辑器
                node.querySelector('.cms-editor') || // 编辑器类名
                node.querySelector('textarea[data-schema]') // 文本域
              )) {
                console.log('检测到编辑器节点，开始替换...');
                replaceEditors();
              }
            }
          });
        }
      });
    });

    // 开始观察整个body
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // 查找并替换所有markdown编辑器
  function replaceEditors() {
    console.log('搜索要替换的编辑器...');
    
    // 方法1：查找所有可能的编辑器容器
    const selectors = [
      '[data-slate-editor]', // Decap CMS的Slate编辑器
      '.cms-widget-markdown', // markdown widget容器
      'textarea[data-schema]', // 文本域
      '.cms-control-markdown', // markdown控件
      'div[data-testid="editor"]' // 可能的测试标识
    ];
    
    let found = false;
    
    selectors.forEach(selector => {
      const editors = document.querySelectorAll(selector);
      if (editors.length > 0) {
        console.log(`找到 ${editors.length} 个编辑器 (${selector})`);
        editors.forEach(editor => replaceEditor(editor, selector));
        found = true;
      }
    });
    
    if (!found) {
      console.log('未找到匹配的编辑器，使用备用方法...');
      // 备用方法：查找所有包含"body"字段的控件
      setTimeout(findEditorsByLabel, 500);
    }
  }

  // 备用方法：通过标签查找编辑器
  function findEditorsByLabel() {
    console.log('通过标签查找编辑器...');
    
    // 查找包含"正文"或"body"的标签
    const labels = document.querySelectorAll('label');
    labels.forEach(label => {
      const labelText = label.textContent.toLowerCase();
      if (labelText.includes('正文') || labelText.includes('body')) {
        console.log('找到body字段标签:', labelText);
        
        // 找到对应的控件容器
        let control = label.nextElementSibling || label.parentElement.nextElementSibling;
        while (control && !control.classList.contains('cms-control') && !control.querySelector('textarea')) {
          control = control.nextElementSibling;
        }
        
        if (control && (control.classList.contains('cms-control') || control.querySelector('textarea'))) {
          console.log('找到对应的编辑器控件');
          replaceEditor(control, 'label-sibling');
        }
      }
    });
  }

  // 替换单个编辑器
  function replaceEditor(originalElement, selector) {
    // 检查是否已经替换过
    if (originalElement.getAttribute('data-vditor-replaced')) {
      return;
    }
    
    console.log(`替换编辑器: ${selector}`);
    
    // 保存原始元素和值
    const original = {
      element: originalElement,
      value: getValueFromElement(originalElement),
      isVisible: true
    };
    
    // 隐藏原始编辑器（但不移除，这样Decap CMS仍能获取值）
    original.element.style.display = 'none';
    original.element.setAttribute('data-vditor-original', 'true');
    
    // 创建Vditor容器
    const container = document.createElement('div');
    container.className = 'vditor-container';
    container.setAttribute('data-vditor-id', Date.now());
    
    // 插入到原始编辑器之前
    original.element.parentNode.insertBefore(container, original.element);
    
    // 初始化Vditor
    try {
      console.log('初始化Vditor，初始值:', original.value);
      
      const vditor = new Vditor(container, {
        ...CONFIG.vditorOptions,
        value: original.value || '',
        input: function(value) {
          console.log('Vditor内容变化，同步到原始编辑器');
          setValueToElement(original.element, value);
          
          // 触发事件让Decap CMS知道值变化了
          triggerChangeEvent(original.element, value);
        }
      });
      
      // 标记为已替换
      original.element.setAttribute('data-vditor-replaced', 'true');
      container.setAttribute('data-vditor-instance', 'true');
      
      console.log('Vditor替换成功');
      
      // 监听原始编辑器的变化（以防其他方式修改值）
      observeOriginalElement(original.element, vditor);
      
    } catch (error) {
      console.error('Vditor初始化失败:', error);
      // 失败时恢复原始编辑器
      original.element.style.display = '';
    }
  }

  // 从原始元素获取值
  function getValueFromElement(element) {
    // 尝试不同的方法获取值
    if (element.tagName === 'TEXTAREA') {
      return element.value;
    }
    
    // 尝试查找内部的textarea
    const textarea = element.querySelector('textarea');
    if (textarea) {
      return textarea.value;
    }
    
    // 尝试获取data-value属性
    const dataValue = element.getAttribute('data-value');
    if (dataValue) {
      return dataValue;
    }
    
    // 检查是否包含特定的编辑器内容
    const editorContent = element.querySelector('[contenteditable="true"]');
    if (editorContent) {
      return editorContent.textContent;
    }
    
    console.log('无法从元素获取值，返回空字符串');
    return '';
  }

  // 设置值到原始元素
  function setValueToElement(element, value) {
    // 尝试不同的方法设置值
    if (element.tagName === 'TEXTAREA') {
      element.value = value;
      return true;
    }
    
    // 尝试查找内部的textarea
    const textarea = element.querySelector('textarea');
    if (textarea) {
      textarea.value = value;
      return true;
    }
    
    // 设置data-value属性作为备选
    element.setAttribute('data-value', value);
    
    console.log('设置值到元素，值长度:', value.length);
    return false;
  }

  // 触发变化事件
  function triggerChangeEvent(element, value) {
    // 创建并触发input事件
    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
    element.dispatchEvent(inputEvent);
    
    // 创建并触发change事件
    const changeEvent = new Event('change', { bubbles: true, cancelable: true });
    element.dispatchEvent(changeEvent);
    
    // 尝试触发React的onChange
    if (element.onchange && typeof element.onchange === 'function') {
      element.onchange({ target: { value: value } });
    }
    
    console.log('已触发变化事件');
  }

  // 观察原始元素的变化
  function observeOriginalElement(element, vditor) {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-value') {
          const newValue = element.getAttribute('data-value');
          if (newValue !== null) {
            console.log('原始元素值变化，同步到Vditor');
            vditor.setValue(newValue);
          }
        }
      });
    });
    
    // 开始观察
    observer.observe(element, {
      attributes: true,
      attributeFilter: ['data-value', 'value']
    });
    
    // 监听input事件
    element.addEventListener('input', function(e) {
      if (e.target.value !== undefined) {
        vditor.setValue(e.target.value);
      }
    });
  }

  // 主初始化函数
  function init() {
    console.log('初始化Vditor替换系统...');
    
    // 先尝试立即查找并替换
    setTimeout(replaceEditors, 500);
    
    // 然后开始监视DOM变化
    observeDOM();
    
    // 监听路由变化（单页应用）
    window.addEventListener('popstate', function() {
      console.log('路由变化，重新查找编辑器...');
      setTimeout(replaceEditors, 1000);
    });
    
    // 监听hash变化
    window.addEventListener('hashchange', function() {
      console.log('hash变化，重新查找编辑器...');
      setTimeout(replaceEditors, 1000);
    });
    
    console.log('Vditor替换系统已启动');
  }

  // 启动
  document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM加载完成，等待CMS...');
    waitForCMS();
  });
  
  // 如果DOM已经加载完成
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    console.log('DOM已准备，等待CMS...');
    waitForCMS();
  }
})();