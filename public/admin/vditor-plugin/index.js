(function () {
  'use strict';
  if (window.decapCmsVditorPlugin) return;

  const VditorControl = createClass({
    getInitialState: function () {
      // 直接使用Decap CMS提供的唯一ID，无需自己生成
      return { value: this.props.value || '' };
    },
    componentDidMount: function () {
      this.initVditor();
    },
    componentWillReceiveProps: function (nextProps) {
      if (this.vditor && nextProps.value !== this.props.value) {
        this.vditor.setValue(nextProps.value || '');
      }
    },
    componentWillUnmount: function () {
      this.vditor?.destroy?.();
    },
    initVditor: function () {
      try {
        this.vditor = new Vditor(this.props.forID, {
          height: 500,
          value: this.state.value,
          mode: 'ir',
          cache: { enable: false },
          toolbar: [ // 完整工具栏
            'emoji', 'headings', 'bold', 'italic', 'strike', 'link', 'quote', 'code', 'inline-code',
            'insert-before', 'insert-after', '|', 'list', 'ordered-list', 'check', 'outdent', 'indent',
            '|', 'upload', 'table', '|', 'undo', 'redo', '|', 'edit-mode', 'content-theme', 'code-theme',
            'export', 'outline', 'preview', 'devtools', 'info', 'help', 'br'
          ],
          input: (value) => this.props.onChange(value),
          // 图片上传配置 - Base64 方案
          upload: {
            accept: 'image/*',
            multiple: true,
            // 设置一个合理的文件大小限制，避免文档过大 (Base64会膨胀约33%)
            max: 20 * 1024 * 1024, // 修正为 5MB

            handler: (files) => {
              console.log('📤 上传处理器被调用，收到文件:', files);

              // 使用 Promise.all 并行处理所有文件，结构更清晰
              const filePromises = Array.from(files).map(file => {
                return new Promise((resolveFile) => {
                  console.log(`正在处理文件: ${file.name} (${file.size} bytes)`);
                  const reader = new FileReader();

                  reader.onload = (e) => {
                    const base64Str = e.target.result;
                    console.log(`✅ 文件 ${file.name} 读取完成`);
                    // 成功：返回文件名和构建好的Markdown图片字符串
                    resolveFile({
                      name: file.name,
                      markdown: `![${file.name.replace(/\.[^/.]+$/, "")}](${base64Str})`
                    });
                  };

                  reader.onerror = () => {
                    console.error(`文件读取失败: ${file.name}`);
                    // 失败：返回 null，后续过滤掉
                    resolveFile(null);
                  };

                  reader.readAsDataURL(file);
                });
              });

              // 等待所有文件处理完毕
              return Promise.all(filePromises).then(fileResults => {
                // 过滤掉失败（null）的结果
                const successFiles = fileResults.filter(item => item !== null);
                console.log(`处理完成，成功 ${successFiles.length} 个，失败 ${fileResults.length - successFiles.length} 个`);

                // 构建 Vditor 要求的返回格式
                const succMap = {};
                successFiles.forEach(item => {
                  succMap[item.name] = item.markdown;
                });

                const finalResult = {
                  code: 0,
                  msg: successFiles.length === files.length ? '' : '部分文件处理失败',
                  data: { succMap }
                };

                console.log('🎯 返回给Vditor的最终结果:', finalResult);
                return finalResult;
              });
            }
          }
        });
      } catch (e) {
        console.error('Vditor初始化失败:', e);
      }
    },
    render: function () {
      return h('div', { id: this.props.forID, style: { minHeight: '500px' } });
    }
  });

  // 修正后的预览组件：安全渲染，避免HTML解析错误
  const VditorPreview = createClass({
    render: function () {
      const value = this.props.value || '';
      // 安全渲染：将内容放在纯文本节点中，并添加基础样式容器
      return h('div', {
        className: 'vditor-preview',
        style: {
          padding: '1rem',
          minHeight: '200px',
          fontSize: '14px',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap' // 保留换行和空格
        }
      }, value || '(无内容)');
    }
  });

  // 精简的插件注册逻辑
  function registerPlugin() {
    if (window.CMS?.registerWidget && typeof Vditor !== 'undefined') {
      window.CMS.registerWidget('vditor', VditorControl, VditorPreview);
      window.decapCmsVditorPlugin = true;
      console.log('✅ Vditor插件已注册');
    } else {
      setTimeout(registerPlugin, 100);
    }
  }
  // 启动
  registerPlugin();
})();