(function() {
  'use strict';

  if (window.decapCmsVditorPlugin) return;
  
  // 工具函数：File -> Base64
  const fileToBase64 = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
  });

  // 创建 Vditor 控件
  const VditorControl = createClass({
    getInitialState: function() {
      this.id = 'vditor-' + Date.now();
      // 用于保存实例引用，便于修复函数访问
      this.vditorInstance = null;
      return { value: this.props.value || '', vditor: null };
    },

    componentDidMount: function() {
      const vditor = new Vditor(this.id, {
        height: 500,
        value: this.state.value,
        after: () => {
          this.setState({ vditor: vditor });
          this.vditorInstance = vditor;
          // 关键修复：确保链接按钮能工作
          this._fixLinkButton();
        },
        input: (value) => {
          this.setState({ value: value });
          this.props.onChange && this.props.onChange(value);
        },
        // 集成Base64上传
        upload: {
          accept: 'image/*',
          multiple: false, // 先设为单文件，更稳定
          handler: async (files) => {
            // 简化处理，只处理第一个文件
            const file = files[0];
            if (!file) return { code: 1, msg: '无文件', data: { errFiles: [], succMap: {} } };
            
            try {
              const base64Url = await fileToBase64(file);
              return {
                msg: '',
                code: 0,
                data: {
                  errFiles: [],
                  succMap: { [file.name]: base64Url }
                }
              };
            } catch (error) {
              return {
                code: 1,
                msg: '转换失败',
                data: { errFiles: [file.name], succMap: {} }
              };
            }
          }
        }
      });
    },

    // 核心修复：确保链接按钮点击能插入文本
    _fixLinkButton: function() {
      // 等待DOM更新
      setTimeout(() => {
        const toolbar = document.querySelector('.vditor-toolbar');
        if (!toolbar || !this.vditorInstance) return;

        const linkButton = toolbar.querySelector('[data-type="link"]');
        if (linkButton) {
          // 移除可能存在的旧监听器，添加新的
          linkButton.replaceWith(linkButton.cloneNode(true));
          const newLinkButton = toolbar.querySelector('[data-type="link"]');
          
          newLinkButton.addEventListener('click', () => {
            // 手动执行链接插入逻辑
            if (this.vditorInstance && this.vditorInstance.insertValue) {
              // 插入标准的链接标记，用户后续自行替换
              this.vditorInstance.insertValue('[](https://example.com)');
              // 将光标定位到中括号内，方便用户直接输入链接文字
              // 注意：Vditor API 可能没有直接设置光标位置的方法，这里先确保插入
            }
          });
        }
      }, 500); // 稍等确保Vditor完全初始化
    },

    componentWillUnmount: function() {
      this.state.vditor && this.state.vditor.destroy();
    },

    render: function() {
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