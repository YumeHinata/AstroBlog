// vditor-final.js - Decap CMS Vditor 编辑器集成
(function() {
    console.log('🚀 Vditor 编辑器集成启动...');
    
    // 存储当前页面中所有的Vditor实例
    window.__vditorInstances = window.__vditorInstances || {};
    
    // 等待所有依赖加载
    function initVditorIntegration() {
        console.log('🔍 检查依赖状态:');
        console.log('- createClass:', typeof createClass);
        console.log('- h:', typeof h);
        console.log('- Vditor:', typeof Vditor);
        console.log('- CMS.registerWidget:', typeof CMS.registerWidget);
        
        if (!createClass || !h || !Vditor || !CMS || !CMS.registerWidget) {
            console.error('❌ 依赖不完整，等待100ms后重试...');
            setTimeout(initVditorIntegration, 100);
            return;
        }
        
        console.log('✅ 所有依赖已加载，开始注册Vditor编辑器...');
        
        // ==================== Vditor控制组件 ====================
        var VditorControl = createClass({
            getInitialState: function() {
                var value = this.props.value || '';
                return {
                    vditor: null,
                    value: value,
                    isMounted: false
                };
            },
            
            componentDidMount: function() {
                console.log('📝 Vditor控制组件挂载，字段:', this.props.field ? this.props.field.get('name') : 'unknown');
                this.setState({ isMounted: true }, function() {
                    this.initVditor();
                }.bind(this));
            },
            
            componentDidUpdate: function(prevProps) {
                // 如果值从外部改变，更新编辑器
                if (prevProps.value !== this.props.value && this.state.vditor) {
                    var newValue = this.props.value || '';
                    if (newValue !== this.state.vditor.getValue()) {
                        this.state.vditor.setValue(newValue);
                    }
                }
            },
            
            componentWillUnmount: function() {
                console.log('🗑️ Vditor控制组件卸载');
                if (this.state.vditor) {
                    this.state.vditor.destroy();
                    delete window.__vditorInstances[this.editorId];
                }
            },
            
            initVditor: function() {
                if (!this.state.isMounted) return;
                
                try {
                    // 确保容器元素存在
                    var container = document.getElementById(this.editorId);
                    if (!container) {
                        console.error('❌ 找不到编辑器容器:', this.editorId);
                        return;
                    }
                    
                    console.log('🎨 初始化Vditor实例，ID:', this.editorId);
                    
                    var vditor = new Vditor(this.editorId, {
                        height: 500,
                        width: '100%',
                        placeholder: '开始编辑内容...',
                        value: this.state.value,
                        theme: 'classic',
                        icon: 'ant',
                        cache: {
                            enable: false
                        },
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
                            'preview'
                        ],
                        input: (value) => {
                            // 更新组件状态
                            this.setState({ value: value });
                            
                            // 通知父组件值已改变
                            if (this.props.onChange) {
                                this.props.onChange(value);
                            }
                        },
                        focus: () => {
                            console.log('🎯 Vditor获得焦点:', this.editorId);
                        },
                        blur: () => {
                            console.log('🔘 Vditor失去焦点:', this.editorId);
                        }
                    });
                    
                    // 保存实例引用
                    this.setState({ vditor: vditor });
                    window.__vditorInstances[this.editorId] = vditor;
                    
                    console.log('✅ Vditor初始化成功');
                    
                } catch (error) {
                    console.error('❌ Vditor初始化失败:', error);
                }
            },
            
            render: function() {
                // 生成唯一ID
                if (!this.editorId) {
                    var fieldName = this.props.field ? this.props.field.get('name') : 'content';
                    this.editorId = 'vditor-' + fieldName + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
                }
                
                return h('div', {
                    className: 'nc-markdownWidget-container vditor-container',
                    style: {
                        width: '100%',
                        position: 'relative'
                    }
                }, [
                    // 编辑器标题
                    h('div', {
                        key: 'header',
                        style: {
                            marginBottom: '8px',
                            fontSize: '12px',
                            color: '#666',
                            fontWeight: 'bold'
                        }
                    }, 'Vditor 编辑器'),
                    
                    // 编辑器容器
                    h('div', {
                        key: 'editor',
                        id: this.editorId,
                        style: {
                            width: '100%',
                            minHeight: '500px',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                        }
                    })
                ]);
            }
        });
        
        // ==================== Vditor预览组件 ====================
        var VditorPreview = createClass({
            render: function() {
                var value = this.props.value || '';
                var previewLength = 150;
                var previewText = value.length > previewLength ? 
                    value.substring(0, previewLength) + '...' : value;
                
                return h('div', {
                    className: 'nc-markdownPreview vditor-preview',
                    style: {
                        padding: '12px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '4px',
                        backgroundColor: '#f9f9f9',
                        fontSize: '14px',
                        lineHeight: '1.5'
                    }
                }, [
                    h('div', {
                        style: {
                            fontSize: '11px',
                            color: '#888',
                            marginBottom: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }
                    }, '预览'),
                    h('div', {}, previewText || '(空内容)')
                ]);
            }
        });
        
        // ==================== 注册到Decap CMS ====================
        try {
            console.log('📝 正在注册vditor-markdown widget...');
            
            // 注册vditor-markdown widget
            CMS.registerWidget('vditor-markdown', VditorControl, VditorPreview);
            
            console.log('✅ vditor-markdown widget 注册成功！');
            
            // 验证注册
            setTimeout(function() {
                var widget = CMS.getWidget('vditor-markdown');
                if (widget) {
                    console.log('🎉 验证通过！现在可以在config.yml中使用 widget: "vditor-markdown"');
                    
                    // 输出使用说明
                    console.log('\n📖 使用说明:');
                    console.log('1. 修改 config.yml 文件');
                    console.log('2. 将 markdown 字段的 widget 改为 "vditor-markdown"');
                    console.log('3. 示例:');
                    console.log('   - label: "正文"');
                    console.log('     name: "body"');
                    console.log('     widget: "vditor-markdown"');
                    console.log('\n4. 保存并重新加载管理页面');
                    
                    // 检查是否有markdown字段可以替换
                    console.log('\n🔍 当前已注册的widget类型:');
                    var widgets = CMS.getWidgets();
                    if (widgets && widgets.length) {
                        var widgetNames = widgets.map(function(w) { return w.name; }).filter(Boolean);
                        console.log('  可用widget:', widgetNames.join(', '));
                    }
                } else {
                    console.error('❌ 验证失败：找不到vditor-markdown widget');
                }
            }, 100);
            
        } catch (error) {
            console.error('❌ 注册widget失败:', error);
            
            // 尝试备用注册方式
            try {
                console.log('🔄 尝试备用注册方式...');
                CMS.registerWidget('vditor-markdown', VditorControl);
                console.log('✅ 备用方式注册成功');
            } catch (fallbackError) {
                console.error('❌ 备用方式也失败:', fallbackError);
            }
        }
        
        console.log('🏁 Vditor集成初始化完成');
    }
    
    // 启动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('📄 DOM加载完成，开始初始化...');
            setTimeout(initVditorIntegration, 300);
        });
    } else {
        console.log('📄 DOM已就绪，开始初始化...');
        setTimeout(initVditorIntegration, 300);
    }
})();