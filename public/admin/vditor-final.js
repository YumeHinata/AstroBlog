// vditor-final.js - Decap CMS Vditor 集成
(function () {
  console.log('=== vditor-final.js 开始执行 ===');

  // 等待所有依赖加载完成
  function initVditorWidget() {
    console.log('检查依赖:');
    console.log('- React:', typeof React);
    console.log('- ReactDOM:', typeof ReactDOM);
    console.log('- createClass:', typeof createClass);
    console.log('- h:', typeof h);
    console.log('- Vditor:', typeof Vditor);
    console.log('- CMS:', typeof CMS);

    // 检查关键依赖
    if (typeof createClass === 'undefined' || typeof h === 'undefined') {
      console.error('缺少 React 依赖 (createClass 或 h)');
      setTimeout(initVditorWidget, 100);
      return;
    }

    if (typeof Vditor === 'undefined') {
      console.error('Vditor 未加载');
      setTimeout(initVditorWidget, 100);
      return;
    }

    if (typeof CMS === 'undefined') {
      console.error('CMS 未加载');
      setTimeout(initVditorWidget, 100);
      return;
    }

    console.log('所有依赖已加载，开始注册 Vditor 组件...');

    // 创建 Vditor 编辑器组件
    var VditorEditor = createClass({
      getInitialState: function () {
        return {
          vditor: null,
          value: this.props.value || ''
        };
      },

      componentDidMount: function () {
        console.log('VditorEditor componentDidMount, 值:', this.state.value);
        this.initVditor();
      },

      componentDidUpdate: function (prevProps) {
        // 如果 props.value 改变，更新编辑器内容
        if (prevProps.value !== this.props.value && this.state.vditor) {
          console.log('VditorEditor 更新值:', this.props.value);
          this.state.vditor.setValue(this.props.value || '');
          this.setState({ value: this.props.value || '' });
        }
      },

      componentWillUnmount: function () {
        // 清理 Vditor 实例
        if (this.state.vditor) {
          console.log('销毁 Vditor 实例');
          this.state.vditor.destroy();
        }
      },

      initVditor: function () {
        try {
          console.log('初始化 Vditor, ID:', this.editorId);

          const vditor = new Vditor(this.editorId, {
            height: 500,
            placeholder: '开始编辑内容...',
            value: this.state.value,
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
              '|',
              'undo',
              'redo',
              '|',
              'fullscreen',
              'preview'
            ],
            input: (value) => {
              console.log('Vditor 输入事件, 值长度:', value.length);
              this.setState({ value: value });

              // 通知父组件值已改变
              if (this.props.onChange) {
                this.props.onChange(value);
              }
            },
            cache: {
              enable: false
            }
          });

          this.setState({ vditor: vditor });
          console.log('Vditor 初始化成功');
        } catch (error) {
          console.error('Vditor 初始化失败:', error);
        }
      },

      render: function () {
        // 生成唯一 ID
        if (!this.editorId) {
          this.editorId = 'vditor-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
          console.log('生成编辑器 ID:', this.editorId);
        }

        return h('div', {
          className: 'vditor-editor-wrapper',
          style: {
            minHeight: '500px',
            position: 'relative'
          }
        }, [
          h('div', {
            id: this.editorId,
            key: 'editor',
            style: {
              width: '100%',
              height: '100%'
            }
          })
        ]);
      }
    });

    // 创建 Vditor 小部件（Decap CMS 格式）
    var VditorWidget = createClass({
      getInitialState: function () {
        const value = this.props.value || '';
        console.log('VditorWidget 初始化, 值长度:', value.length);
        return {
          value: value
        };
      },

      handleChange: function (value) {
        console.log('VditorWidget 处理变化, 值长度:', value.length);
        this.setState({ value: value });

        // 通知 CMS 值已改变
        if (this.props.onChange) {
          this.props.onChange(value);
        }
      },

      render: function () {
        console.log('VditorWidget 渲染');

        return h('div', {
          className: 'nc-widget-markdown vditor-cms-widget',
          style: {
            width: '100%',
            position: 'relative'
          }
        }, [
          h(VditorEditor, {
            key: this.props.field ? this.props.field.get('name') || 'vditor' : 'vditor',
            value: this.state.value,
            onChange: this.handleChange,
            field: this.props.field
          })
        ]);
      }
    });

    // 替换默认的 markdown 编辑器
    try {
      console.log('正在注册 Vditor 控件...');

      // 获取原始 markdown 控件作为参考
      const originalMarkdown = CMS.getWidget('markdown');
      console.log('原始 markdown 控件:', originalMarkdown);

      // 注册 Vditor 作为 markdown 控件
      CMS.registerWidget('markdown', VditorWidget);
      console.log('✅ Vditor 已成功注册为 markdown 控件');

      // 验证注册是否成功
      const registeredWidget = CMS.getWidget('markdown');
      console.log('✅ 验证注册 - 当前 markdown 控件:', registeredWidget);

    } catch (error) {
      console.error('❌ 注册 Vditor 控件失败:', error);

      // 尝试备用方案
      try {
        console.log('尝试备用方案: 注册为 vditor 类型');
        CMS.registerWidget('vditor', VditorWidget);
        console.log('✅ Vditor 已注册为 vditor 类型控件');
      } catch (fallbackError) {
        console.error('❌ 备用方案也失败:', fallbackError);
      }
    }

    console.log('=== vditor-final.js 执行完成 ===');
  }

  // 延迟初始化，确保所有依赖已加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      console.log('DOMContentLoaded 事件触发');
      setTimeout(initVditorWidget, 500);
    });
  } else {
    console.log('DOM 已加载完成，直接初始化');
    setTimeout(initVditorWidget, 500);
  }
})();