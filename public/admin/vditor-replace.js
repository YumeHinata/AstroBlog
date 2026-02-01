// vditor-minimal.js
(function () {
  console.log('=== 开始加载 Vditor 最简 widget ===');

  // 等待 Decap CMS 完全加载
  function waitForCMS() {
    if (window.CMS && window.Vditor) {
      console.log('✅ 依赖已加载');
      console.log('CMS.registerWidget:', typeof CMS.registerWidget);
      console.log('CMS.h:', typeof CMS.h);
      console.log('CMS.createClass:', typeof CMS.createClass);
      initSimpleWidget();
    } else {
      console.log('⏳ 等待依赖...');
      setTimeout(waitForCMS, 100);
    }
  }

  function initSimpleWidget() {
    console.log('🚀 初始化最简 widget...');

    try {
      // 方法1: 尝试使用 CMS.createClass (如果存在)
      if (typeof CMS.createClass === 'function') {
        console.log('使用 CMS.createClass');
        createWithCreateClass();
      }
      // 方法2: 尝试使用 React 直接创建组件
      else if (window.React && window.React.Component) {
        console.log('使用 React.Component');
        createWithReactComponent();
      }
      // 方法3: 尝试使用 Decap CMS 的新 API
      else {
        console.log('尝试使用 registerWidget 直接注册');
        createWithSimpleObject();
      }
    } catch (error) {
      console.error('❌ 初始化失败:', error);
    }
  }

  // 方法1: 使用 CMS.createClass (最符合 Decap CMS 文档)
  function createWithCreateClass() {
    const { createClass, h } = CMS;

    // 控件组件
    const VditorControl = createClass({
      componentDidMount: function () {
        console.log('📌 VditorControl 挂载');
        console.log('this.props:', this.props);
        console.log('this.props.value:', this.props.value);

        // 确保有容器元素
        if (!this.container) {
          console.error('❌ 没有容器元素');
          return;
        }

        // 初始化 Vditor
        try {
          console.log('🎨 初始化 Vditor...');
          this.vditor = new Vditor(this.container, {
            height: 400,
            mode: 'sv',
            cache: { enable: false },
            value: this.props.value || '',
            input: function (value) {
              console.log('✏️ Vditor 输入:', value.length, '字符');
            }
          });
          console.log('✅ Vditor 初始化成功');
        } catch (error) {
          console.error('❌ Vditor 初始化失败:', error);
        }
      },

      componentWillUnmount: function () {
        console.log('🗑️ VditorControl 卸载');
        if (this.vditor) {
          this.vditor.destroy();
        }
      },

      render: function () {
        console.log('🖌️ 渲染 VditorControl');

        // 使用 h 函数创建一个简单的 div
        const element = h('div', {
          ref: (el) => {
            console.log('🔗 ref 回调被调用，el:', el);
            this.container = el;
          },
          style: {
            minHeight: '400px',
            border: '2px solid #007bff',
            borderRadius: '4px',
            padding: '10px',
            backgroundColor: '#f8f9fa'
          }
        });

        console.log('创建的 element:', element);
        return element;
      }
    });

    // 预览组件
    const VditorPreview = createClass({
      render: function () {
        const value = this.props.value || '';
        console.log('预览组件渲染，值长度:', value.length);
        return h('div', {
          style: {
            padding: '10px',
            backgroundColor: '#e9ecef',
            borderRadius: '4px',
            border: '1px solid #dee2e6'
          }
        }, '预览: ' + (value.length > 100 ? value.substring(0, 100) + '...' : value));
      }
    });

    // 注册 widget
    console.log('📝 注册 widget: vditor-markdown');
    CMS.registerWidget('vditor-markdown', VditorControl, VditorPreview);
    console.log('✅ Widget 注册完成');
  }

  // 方法2: 使用 React.Component
  function createWithReactComponent() {
    console.log('🔧 尝试使用 React.Component 创建');

    // 获取 React
    const React = window.React;
    const h = CMS.h || React.createElement;

    if (!h) {
      console.error('❌ 没有找到 createElement 方法');
      return;
    }

    // 创建 React 类组件
    class VditorControl extends React.Component {
      constructor(props) {
        super(props);
        console.log('📌 VditorControl 构造函数');
        this.containerRef = React.createRef();
      }

      componentDidMount() {
        console.log('📌 VditorControl 组件挂载');
        console.log('props:', this.props);

        if (!this.containerRef.current) {
          console.error('❌ 没有容器引用');
          return;
        }

        try {
          console.log('🎨 初始化 Vditor...');
          this.vditor = new Vditor(this.containerRef.current, {
            height: 400,
            mode: 'sv',
            cache: { enable: false },
            value: this.props.value || '',
            input: (value) => {
              console.log('✏️ Vditor 输入:', value.length, '字符');
              // 暂时不处理 onChange
            }
          });
          console.log('✅ Vditor 初始化成功');
        } catch (error) {
          console.error('❌ Vditor 初始化失败:', error);
        }
      }

      componentWillUnmount() {
        console.log('🗑️ VditorControl 组件卸载');
        if (this.vditor) {
          this.vditor.destroy();
        }
      }

      render() {
        console.log('🖌️ 渲染 VditorControl');
        return h('div', {
          ref: this.containerRef,
          style: {
            minHeight: '400px',
            border: '2px solid #28a745',
            borderRadius: '4px',
            padding: '10px',
            backgroundColor: '#d4edda'
          }
        });
      }
    }

    // 预览组件
    const VditorPreview = (props) => {
      const value = props.value || '';
      console.log('预览组件渲染，值长度:', value.length);
      return h('div', {
        style: {
          padding: '10px',
          backgroundColor: '#d1ecf1',
          borderRadius: '4px',
          border: '1px solid #bee5eb'
        }
      }, '预览内容: ' + (value.length > 50 ? value.substring(0, 50) + '...' : value));
    };

    // 注册 widget
    console.log('📝 注册 widget: vditor-markdown (React.Component)');
    CMS.registerWidget('vditor-markdown', VditorControl, VditorPreview);
    console.log('✅ Widget 注册完成');
  }

  // 方法3: 最简单的对象形式
  function createWithSimpleObject() {
    console.log('🔧 尝试最简单的对象形式');

    // 创建一个简单的控件对象
    const VditorControl = {
      // 这个方法会被 Decap CMS 调用以渲染控件
      render: function (opts) {
        console.log('🖌️ 简单对象 render 被调用');
        console.log('opts:', opts);

        const element = document.createElement('div');
        element.id = 'vditor-simple-' + Date.now();
        element.style.minHeight = '400px';
        element.style.border = '2px solid #ffc107';
        element.style.borderRadius = '4px';
        element.style.padding = '10px';
        element.style.backgroundColor = '#fff3cd';
        element.innerHTML = '<div style="padding: 20px; text-align: center; color: #856404;">Vditor 编辑器 (简单模式)</div>';

        // 将元素返回给 Decap CMS
        return element;
      }
    };

    // 预览组件
    const VditorPreview = {
      render: function (opts) {
        console.log('预览组件 render 被调用');
        const element = document.createElement('div');
        element.style.padding = '10px';
        element.style.backgroundColor = '#e2e3e5';
        element.style.borderRadius = '4px';
        element.textContent = '这是 Vditor 预览';
        return element;
      }
    };

    // 尝试不同的注册方式
    try {
      console.log('📝 尝试注册 widget (对象形式)');

      // 方式1: 直接传递对象
      if (CMS.registerWidget.length === 1) {
        CMS.registerWidget({
          name: 'vditor-markdown',
          control: VditorControl,
          preview: VditorPreview
        });
      }
      // 方式2: 传递三个参数
      else if (CMS.registerWidget.length === 3) {
        CMS.registerWidget('vditor-markdown', VditorControl, VditorPreview);
      }
      // 方式3: 尝试使用不同的 API
      else {
        console.log('尝试使用 CMS.registerEditorComponent');
        if (CMS.registerEditorComponent) {
          CMS.registerEditorComponent({
            id: 'vditor-markdown',
            label: 'Vditor',
            widget: 'vditor-markdown',
            type: 'vditor-markdown'
          });
        }
      }

      console.log('✅ Widget 注册完成 (简单对象)');
    } catch (error) {
      console.error('❌ Widget 注册失败:', error);
    }
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForCMS);
  } else {
    waitForCMS();
  }

  console.log('=== Vditor 最简 widget 脚本加载完成 ===');
})();