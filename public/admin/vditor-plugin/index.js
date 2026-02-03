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
            multiple: true, // 允许选择多张图片
            // 自定义上传处理器 (核心)
            handler: (files) => {
              // 返回一个 Promise，Vditor 会等待其完成
              return new Promise((resolve) => {
                const successFiles = [];
                const total = files.length;
                let processed = 0;

                Array.from(files).forEach((file) => {
                  const reader = new FileReader();

                  reader.onload = (e) => {
                    processed++;
                    // 构建 Base64 字符串
                    const base64Str = e.target.result;
                    // 生成一个简单的文件名（可选）
                    const altName = file.name.replace(/\.[^/.]+$/, ""); // 去掉扩展名
                    // 格式化为 Vditor 需要的成功返回项
                    successFiles.push({
                      file,
                      // 重点：将 Base64 字符串作为 URL 返回，并嵌入 Markdown 图片语法
                      url: `data:${file.type};base64,${base64Str.split(',')[1]}`,
                      // 用于在编辑器中显示的文本，这里用 ![alt](url) 格式
                      alt: altName
                    });

                    // 当所有文件处理完成时，解析 Promise
                    if (processed === total) {
                      // Vditor 需要特定的返回格式
                      resolve({
                        code: 0, // 0 表示成功
                        msg: '',
                        data: {
                          // succMap 是成功文件的映射，键为原始文件名，值为最终的 Markdown 字符串
                          succMap: successFiles.reduce((map, item) => {
                            map[item.file.name] = `![${item.alt}](${item.url})`;
                            return map;
                          }, {})
                        }
                      });
                    }
                  };

                  reader.onerror = () => {
                    processed++;
                    console.error(`文件读取失败: ${file.name}`);
                    // 即使有失败，也继续处理其他文件，但不在 succMap 中包含它
                    if (processed === total) {
                      resolve({
                        code: 0,
                        msg: '部分文件处理失败',
                        data: {
                          succMap: successFiles.reduce((map, item) => {
                            map[item.file.name] = `![${item.alt}](${item.url})`;
                            return map;
                          }, {})
                        }
                      });
                    }
                  };
                  // 开始读取文件为 Data URL (默认就是 Base64)
                  reader.readAsDataURL(file);
                });
              });
            },
            // 设置一个合理的文件大小限制，避免文档过大 (Base64会膨胀约33%)
            max: 20 * 10240 * 10240, // 示例：限制为 2MB
          },
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