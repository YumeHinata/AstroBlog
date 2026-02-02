// vditor-final.js - Decap CMS Vditor 编辑器生产集成
(function() {
  console.log('🚀 正在集成 Vditor Markdown 编辑器...');
  
  // 等待关键依赖加载
  function initVditorWidget() {
    // 环境检查
    if (!window.createClass || !window.h || !window.Vditor || !window.CMS) {
      console.warn('⏳ 等待依赖加载...');
      setTimeout(initVditorWidget, 100);
      return;
    }
    
    console.log('✅ 依赖加载完成，开始注册 Vditor 控件');
    
    // ==================== 1. Vditor 编辑器控件 ====================
    var VditorControl = createClass({
      getInitialState: function() {
        // 生成唯一编辑器ID，使用字段名避免冲突
        var fieldName = this.props.field ? this.props.field.get('name') : 'content';
        this._editorId = 'vditor-' + fieldName + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        return {
          value: this.props.value || '',
          initialized: false
        };
      },
      
      componentDidMount: function() {
        var self = this;
        
        // 延迟确保DOM渲染完成
        setTimeout(function() {
          self._initializeVditor();
        }, 50);
      },
      
      componentDidUpdate: function(prevProps) {
        // 当外部props中的value改变时，同步到编辑器
        if (prevProps.value !== this.props.value && this._vditor) {
          var newValue = this.props.value || '';
          if (newValue !== this._vditor.getValue()) {
            this._vditor.setValue(newValue);
            this.setState({ value: newValue });
          }
        }
      },
      
      componentWillUnmount: function() {
        // 清理Vditor实例，避免内存泄漏
        if (this._vditor && typeof this._vditor.destroy === 'function') {
          try {
            this._vditor.destroy();
          } catch (e) {
            console.warn('Vditor销毁时出现小问题:', e.message);
          }
        }
      },
      
      _initializeVditor: function() {
        try {
          var container = document.getElementById(this._editorId);
          if (!container) {
            console.error('找不到Vditor容器元素:', this._editorId);
            return;
          }
          
          // 创建Vditor实例
          this._vditor = new Vditor(this._editorId, {
            height: 500,
            placeholder: '开始编辑内容...',
            value: this.state.value,
            theme: 'classic',
            icon: 'ant',
            // 完整的工具栏配置
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
              'upload',
              'table',
              '|',
              'undo',
              'redo',
              '|',
              'fullscreen',
              'preview',
              'outline'
            ],
            // 输入处理 - 连接React状态和CMS
            input: (function(value) {
              this.setState({ value: value });
              
              // 调用CMS的onChange回调，这是数据更新的关键
              if (typeof this.props.onChange === 'function') {
                this.props.onChange(value);
              }
            }).bind(this),
            // 缓存设置
            cache: {
              enable: false
            },
            // 上传配置（需要根据你的后端调整）
            upload: {
              accept: 'image/*',
              multiple: true,
              handler: function(files) {
                console.log('上传文件:', files);
                // 这里需要实现你自己的上传逻辑
                // 返回格式: [{url: '图片地址', alt: '描述'}]
                return Promise.resolve([]);
              }
            }
          });
          
          this.setState({ initialized: true });
          
        } catch (error) {
          console.error('Vditor初始化失败:', error);
          // 优雅降级：显示错误信息
          var container = document.getElementById(this._editorId);
          if (container) {
            container.innerHTML = '<div style="color: #d32f2f; padding: 20px; border: 2px dashed #d32f2f; border-radius: 4px;">' +
                                 '<strong>Vditor编辑器加载失败</strong><br>' +
                                 '请检查控制台获取详细信息' +
                                 '</div>';
          }
        }
      },
      
      render: function() {
        // 重要：render方法只返回虚拟DOM，不进行任何DOM操作
        return window.h('div', {
          className: 'nc-widget-markdown vditor-widget',
          style: {
            width: '100%',
            position: 'relative'
          }
        }, [
          // 编辑器容器
          window.h('div', {
            id: this._editorId,
            key: 'editor',
            style: {
              width: '100%',
              minHeight: '500px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              overflow: 'hidden'
            }
          })
        ]);
      }
    });
    
    // ==================== 2. 预览组件 ====================
    var VditorPreview = createClass({
      render: function() {
        var value = this.props.value || '';
        var previewText = value.length > 200 ? value.substring(0, 200) + '...' : value;
        
        return window.h('div', {
          className: 'nc-markdownPreview vditor-preview',
          style: {
            padding: '12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            backgroundColor: '#f9fafb',
            fontSize: '14px',
            lineHeight: '1.6'
          }
        }, [
          window.h('div', {
            style: {
              fontSize: '11px',
              color: '#6b7280',
              marginBottom: '8px',
              textTransform: 'uppercase'
            }
          }, '内容预览'),
          window.h('div', {}, previewText || '(空内容)')
        ]);
      }
    });
    
    // ==================== 3. 注册到Decap CMS ====================
    try {
      // 方案A：直接替换默认markdown控件（推荐）
      // 这样无需修改config.yml中的widget配置
      window.CMS.registerWidget('markdown', VditorControl, VditorPreview);
      console.log('✅ 已成功替换默认markdown编辑器为Vditor');
      
      // 方案B：同时注册为独立控件（备用）
      // 如果需要保留原markdown编辑器，可在config.yml中使用widget: "vditor-markdown"
      window.CMS.registerWidget('vditor-markdown', VditorControl, VditorPreview);
      console.log('✅ 已注册独立控件 "vditor-markdown"');
      
      // 验证注册
      setTimeout(function() {
        var widget = window.CMS.getWidget('markdown');
        if (widget && widget.control === VditorControl) {
          console.log('🎉 Vditor编辑器集成成功！');
          console.log('💡 现在所有markdown字段都将使用Vditor编辑器');
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ 注册Vditor控件失败:', error);
    }
  }
  
  // 启动初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      // 稍等一会儿，确保所有脚本加载完成
      setTimeout(initVditorWidget, 300);
    });
  } else {
    // 如果DOM已经加载完成，直接初始化
    setTimeout(initVditorWidget, 300);
  }
})();