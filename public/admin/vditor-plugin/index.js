(function () {
  'use strict';

  if (window.decapCmsVditorPlugin) return;

  // 工具函数：File -> Base64 (保持不变)
  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

  // 创建 Vditor 控件
  const VditorControl = createClass({
    getInitialState: function () {
      this.id = 'vditor-' + Date.now();
      return { value: this.props.value || '', vditor: null };
    },

    componentDidMount: function () {
      const vditor = new Vditor(this.id, {
        // --- 核心修复：设置模式为 'sv' (分屏预览/所见即所得) ---
        mode: 'sv',
        height: 500,
        value: this.state.value,
        // 保持工具栏始终可见（与之前有效配置一致）
        toolbarConfig: {
          pin: true
        },
        after: () => {
          this.setState({ vditor: vditor });
        },
        input: (value) => {
          this.setState({ value: value });
          this.props.onChange && this.props.onChange(value);
        },
        // --- 上传配置 (保持Base64方案) ---
        upload: {
          accept: 'image/*',
          multiple: true,
          handler: async (files) => {
            const succMap = {};
            const errFiles = [];
            for (const file of files) {
              try {
                // 转换为Base64
                const base64Url = await fileToBase64(file);
                // 将文件名映射到Base64 URL
                succMap[file.name] = base64Url;
              } catch (error) {
                errFiles.push(file.name);
              }
            }
            // 返回标准格式，在 'sv' 模式下，Vditor应能正确接收并插入
            return {
              msg: '',
              code: 0,
              data: { errFiles, succMap }
            };
          }
        },
        // --- 可选：添加更明确的成功回调用于调试 ---
        // success: (editor, msg) => {
        //   console.log('上传成功，Vditor回调消息:', msg);
        // }
      });
    },

    componentWillUnmount: function () {
      this.state.vditor && this.state.vditor.destroy();
    },

    render: function () {
      return h('div', [
        h('textarea', {
          name: this.props.field ? this.props.field.get('name') : 'content',
          value: this.state.value,
          style: { display: 'none' }
        }),
        h('div', { id: this.id })
      ]);
    }
  });

  // 注册插件
  function register() {
    if (!window.CMS || !window.CMS.registerWidget) {
      setTimeout(register, 100);
      return;
    }
    window.CMS.registerWidget('vditor', VditorControl);
    window.decapCmsVditorPlugin = true;
  }

  // 初始化
  if (typeof Vditor !== 'undefined') {
    register();
  } else {
    setTimeout(() => {
      if (typeof Vditor !== 'undefined') register();
    }, 1000);
  }
})();