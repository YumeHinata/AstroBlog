// 等待CMS加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 检查必要依赖
    if (typeof CMS === 'undefined' || typeof createClass === 'undefined' || typeof h === 'undefined') {
        console.error('CMS dependencies not found');
        return;
    }

    if (typeof Vditor === 'undefined') {
        console.error('Vditor not loaded');
        return;
    }

    // 创建Vditor编辑器核心组件
    var VditorEditor = createClass({
        getInitialState: function() {
            return {
                vditor: null,
                value: this.props.value || ''
            };
        },

        componentDidMount: function() {
            this.initVditor();
        },

        componentWillUnmount: function() {
            // 清理Vditor实例
            if (this.state.vditor) {
                this.state.vditor.destroy();
            }
        },

        initVditor: function() {
            try {
                const vditor = new Vditor(this.editorId, {
                    height: 400,
                    placeholder: '开始编辑...',
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
                    }
                });

                this.setState({ vditor: vditor });
            } catch (error) {
                console.error('Failed to initialize Vditor:', error);
            }
        },

        render: function() {
            // 生成唯一ID
            this.editorId = 'vditor-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            
            return h('div', {
                className: 'vditor-wrapper',
                style: {
                    minHeight: '400px'
                }
            }, [
                h('div', {
                    id: this.editorId,
                    key: 'editor'
                })
            ]);
        }
    });

    // 创建Vditor小部件（Decap CMS需要的格式）
    var VditorWidget = createClass({
        getInitialState: function() {
            return {
                value: this.props.value || ''
            };
        },

        handleChange: function(value) {
            this.setState({ value: value });
            
            // 通知CMS值已改变
            if (this.props.onChange) {
                this.props.onChange(value);
            }
        },

        render: function() {
            return h('div', {
                className: 'nc-widget-markdown vditor-widget',
                style: {
                    width: '100%',
                    position: 'relative'
                }
            }, [
                h(VditorEditor, {
                    key: this.props.field ? this.props.field.get('name') : 'vditor',
                    value: this.state.value,
                    onChange: this.handleChange,
                    field: this.props.field
                })
            ]);
        }
    });

    // 替换默认的markdown编辑器
    try {
        CMS.registerWidget('markdown', VditorWidget);
        console.log('✅ Vditor编辑器已成功注册为markdown控件');
        
        // 同时注册为vditor类型以便备用
        CMS.registerWidget('vditor', VditorWidget);
        console.log('✅ Vditor编辑器已同时注册为vditor控件');
    } catch (error) {
        console.error('❌ 注册Vditor控件失败:', error);
    }
});