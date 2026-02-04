(function() {
  'use strict';
  if (window.decapCmsVditorPlugin) return;

  const ImageUploadManager = {
    pendingImages: [],
    isUploading: false,
    uploadedButUncommitted: new Set(),
    
    config: {
      repoOwner: 'YumeHinata',
      repoName: 'AstroBlog',
      branch: 'main',
      mediaFolder: 'src/content/posts/images'
    },
    
    commitConfig: {
      authorName: 'Decap CMS Editor',
      authorEmail: 'editor@example.com',
      commitPrefix: '[Media] Upload: '
    },
    
    getToken() {
      try {
        const userData = JSON.parse(localStorage.getItem('decap-cms-user'));
        if (!userData?.token) throw new Error('请先登录Decap CMS');
        return userData.token;
      } catch (e) {
        throw new Error('认证失败: ' + e.message);
      }
    },
    
    calculatePaths(filename, docTitle) {
      // 安全清理文档标题作为文件夹名
      const sanitizeFolderName = (title) => {
        if (!title || typeof title !== 'string') return 'untitled';
        
        return title
          .toLowerCase()
          .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')  // 移除非法字符，保留中文、字母、数字、空格、连字符
          .replace(/\s+/g, '-')                   // 空格替换为连字符
          .replace(/-+/g, '-')                    // 多个连字符合并为一个
          .replace(/^-|-$/g, '');                 // 移除开头和结尾的连字符
      };
      
      const folderName = sanitizeFolderName(docTitle || 'untitled');
      const mediaFolder = this.config.mediaFolder.replace(/^\//, '');
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000);
      const safeFilename = `${timestamp}-${randomSuffix}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const targetDirInRepo = `${mediaFolder}/${folderName}`;
      const pathInRepo = `${targetDirInRepo}/${safeFilename}`;
      const markdownPath = `./images/${folderName}/${safeFilename}`;
      
      return { 
        pathInRepo, 
        markdownPath,
        folderName
      };
    },
    
    addImages(files) {
      const newImages = Array.from(files).map(file => ({
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        id: Date.now() + Math.random()
      }));
      
      this.pendingImages.push(...newImages);
      return newImages;
    },
    
    cleanupPreviews() {
      this.pendingImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
      this.pendingImages = [];
    },
    
    async uploadAll(vditorInstance, docTitle) {
      if (this.pendingImages.length === 0) throw new Error('没有图片需要上传');
      if (this.isUploading) throw new Error('上传正在进行中');
      
      this.isUploading = true;
      const token = this.getToken();
      const { repoOwner, repoName, branch } = this.config;
      const commitCfg = this.commitConfig;
      
      const results = { success: 0, errors: [], markdowns: [] };
      
      try {
        for (const img of this.pendingImages) {
          try {
            const { pathInRepo, markdownPath, folderName } = this.calculatePaths(img.name, docTitle);
            
            // 检查文件夹是否存在，如果不存在则尝试创建（通过上传一个空文件）
            const folderPath = `${this.config.mediaFolder}/${folderName}`;
            const folderExists = await this.checkFileExists(token, repoOwner, repoName, folderPath + '/.gitkeep');
            
            if (!folderExists) {
              console.log(`文件夹 ${folderName} 不存在，尝试创建...`);
              // GitHub会在上传文件时自动创建不存在的文件夹，所以我们不需要手动创建
            }
            
            const content = await this.fileToBase64(img.file);
            const sha = null; // 默认不检查文件是否存在，直接上传
            
            await this.pushToGitHub(token, repoOwner, repoName, pathInRepo, content, branch, commitCfg, img.name, sha);
            
            results.success++;
            results.markdowns.push(`![${img.name}](${markdownPath})`);
            this.uploadedButUncommitted.add(pathInRepo);
            
            URL.revokeObjectURL(img.previewUrl);
          } catch (error) {
            results.errors.push(`${img.name}: ${error.message}`);
          }
        }
        
        if (results.markdowns.length > 0 && vditorInstance) {
          vditorInstance.insertValue('\n' + results.markdowns.join('\n') + '\n');
        }
        
        this.pendingImages = [];
        return results;
      } finally {
        this.isUploading = false;
      }
    },
    
    async checkFileExists(token, owner, repo, path) {
      try {
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
        const res = await fetch(url, { 
          headers: { 
            Authorization: `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          } 
        });
        return res.status === 200 ? await res.json() : null;
      } catch (error) {
        console.error('检查文件存在失败:', error);
        return null;
      }
    },
    
    async fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },
    
    async pushToGitHub(token, owner, repo, path, content, branch, commitCfg, filename, sha) {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
      const body = {
        message: `${commitCfg.commitPrefix}${filename}`,
        content,
        branch,
        committer: { name: commitCfg.authorName, email: commitCfg.authorEmail },
        author: { name: commitCfg.authorName, email: commitCfg.authorEmail }
      };
      
      if (sha) body.sha = sha;
      
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(body)
      });
      
      if (!res.ok) {
        let errorMsg = `GitHub API错误: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg += ` - ${errorData.message || '未知错误'}`;
        } catch (e) {
          // 忽略JSON解析错误
        }
        throw new Error(errorMsg);
      }
    }
  };

  const VditorControl = createClass({
    getInitialState() {
      return {
        value: this.props.value || '',
        showUploadPanel: false,
        uploadStatus: null,
        docTitle: this.getDocTitle()
      };
    },
    
    componentDidMount() {
      this.initVditor();
      this.titleCheckInterval = setInterval(() => this.checkDocTitle(), 2000);
    },
    
    componentWillUnmount() {
      clearInterval(this.titleCheckInterval);
      if (this.vditor) this.vditor.destroy();
      ImageUploadManager.cleanupPreviews();
    },
    
    getDocTitle() {
      try {
        const entry = window.CMS?.activeEntry;
        if (entry?.data?.title) return entry.data.title;
        if (entry?.slug) return entry.slug;
        return '未命名文档';
      } catch (e) {
        return '未命名文档';
      }
    },
    
    checkDocTitle() {
      try {
        const newTitle = this.getDocTitle();
        if (newTitle !== this.state.docTitle) {
          this.setState({ docTitle: newTitle });
        }
      } catch (e) {
        console.warn('检查文档标题失败:', e);
      }
    },
    
    initVditor() {
      try {
        // 确保元素存在
        const element = document.getElementById(this.props.forID);
        if (!element) {
          console.error('找不到元素:', this.props.forID);
          return;
        }
        
        this.vditor = new Vditor(this.props.forID, {
          height: 500,
          value: this.state.value,
          mode: 'ir',
          cache: { enable: false },
          toolbar: this.getToolbarConfig(),
          input: (value) => {
            this.setState({ value });
            if (this.props.onChange) {
              this.props.onChange(value);
            }
          }
        });
        
        window.vditorInstance = this.vditor;
      } catch (e) {
        console.error('Vditor初始化失败:', e);
      }
    },
    
    getToolbarConfig() {
      const baseTools = [
        'emoji', 'headings', 'bold', 'italic', 'strike', 'link', 'quote', 'code', 'inline-code',
        'insert-before', 'insert-after', '|', 'list', 'ordered-list', 'check', 'outdent', 'indent',
        '|', 'table', '|', 'undo', 'redo', '|'
      ];
      
      const uploadButton = {
        name: 'image-upload',
        tip: '上传图片到GitHub',
        className: 'toolbar__image-upload',
        icon: '<iconify-icon icon="ic:baseline-image" style="font-size:16px;vertical-align:-2px"></iconify-icon>',
        click: () => this.setState({ showUploadPanel: true })
      };
      
      const remainingTools = [
        'edit-mode', 'content-theme', 'code-theme', 'export', 'outline', 'preview', 'devtools', 'info', 'help', 'br'
      ];
      
      return [...baseTools, uploadButton, '|', ...remainingTools];
    },
    
    handleFileSelect(event) {
      const files = event.target.files;
      if (!files.length) return;
      
      ImageUploadManager.addImages(files);
      this.setState({ 
        uploadStatus: `已暂存 ${files.length} 张图片，共 ${ImageUploadManager.pendingImages.length} 张待上传`
      });
      
      event.target.value = '';
    },
    
    async handleUpload() {
      const pendingCount = ImageUploadManager.pendingImages.length;
      if (pendingCount === 0) {
        this.setState({ uploadStatus: '请先选择图片' });
        return;
      }
      
      this.setState({ 
        uploadStatus: '上传中...',
        showUploadPanel: false
      });
      
      try {
        const result = await ImageUploadManager.uploadAll(this.vditor, this.state.docTitle);
        
        if (result.success > 0) {
          this.setState({ 
            uploadStatus: `✅ 上传完成！成功 ${result.success}/${pendingCount} 张`
          });
          setTimeout(() => this.setState({ uploadStatus: null }), 3000);
        } else {
          this.setState({ 
            uploadStatus: '上传失败，请查看控制台',
            showUploadPanel: true
          });
        }
        
        if (result.errors.length > 0) {
          console.error('上传错误:', result.errors);
        }
      } catch (error) {
        console.error('上传过程出错:', error);
        this.setState({ 
          uploadStatus: `错误: ${error.message}`,
          showUploadPanel: true
        });
      }
    },
    
    handleClear() {
      ImageUploadManager.cleanupPreviews();
      this.setState({ 
        uploadStatus: '已清空暂存图片',
        showUploadPanel: false
      });
      setTimeout(() => this.setState({ uploadStatus: null }), 2000);
    },
    
    render() {
      const h = window.h;
      const { showUploadPanel, uploadStatus, docTitle } = this.state;
      const pendingImages = ImageUploadManager.pendingImages;
      
      // 使用内联样式，避免React渲染错误
      const styles = {
        uploadHint: {
          fontSize: '12px',
          color: '#57606a',
          padding: '6px',
          backgroundColor: '#f6f8fa',
          border: '1px dashed #d0d7de',
          borderRadius: '4px',
          marginTop: '8px',
          cursor: 'pointer'
        }
      };
      
      return h('div', { className: 'vditor-full-container' }, [
        h('div', { 
          key: 'editor',
          id: this.props.forID, 
          style: { 
            minHeight: '500px',
            marginBottom: '10px'
          }
        }),
        
        showUploadPanel && this.renderUploadPanel(h, pendingImages, uploadStatus, docTitle),
        
        !showUploadPanel && pendingImages.length > 0 && h('div', {
          key: 'upload-hint',
          style: styles.uploadHint,
          onClick: () => this.setState({ showUploadPanel: true })
        }, [
          h('iconify-icon', { 
            icon: 'ic:baseline-image',
            style: 'margin-right:4px;vertical-align:-2px'
          }),
          `${pendingImages.length} 张图片待上传，点击管理`
        ])
      ]);
    },
    
    renderUploadPanel(h, pendingImages, uploadStatus, docTitle) {
      return h('div', {
        key: 'upload-panel',
        className: 'vditor-upload-panel',
        style: {
          border: '1px solid #e1e4e8',
          borderRadius: '6px',
          padding: '16px',
          backgroundColor: '#f6f8fa',
          marginTop: '10px'
        }
      }, [
        h('h4', { style: { marginTop: 0 } }, [
          h('iconify-icon', {
            icon: 'ic:baseline-folder',
            style: 'margin-right:6px;vertical-align:-2px'
          }),
          '图片上传到GitHub'
        ]),
        
        docTitle && h('div', { 
          style: {
            fontSize: '12px',
            color: '#586069',
            marginBottom: '10px',
            padding: '4px 8px',
            backgroundColor: '#fff',
            borderRadius: '3px',
            border: '1px solid #e1e4e8'
          }
        }, `文档: ${docTitle} (图片将保存至: /images/${docTitle.replace(/\s+/g, '-').toLowerCase()}/)`),
        
        h('div', { style: { marginBottom: '12px' } }, [
          h('input', {
            type: 'file',
            accept: 'image/*',
            multiple: true,
            onChange: this.handleFileSelect,
            style: { marginBottom: '8px' }
          }),
          h('div', { 
            style: {
              fontSize: '12px',
              color: '#586069'
            }
          }, '支持多选，图片将暂存在浏览器中')
        ]),
        
        pendingImages.length > 0 && this.renderPreviewArea(h, pendingImages),
        
        uploadStatus && h('div', {
          style: this.getStatusStyle(uploadStatus)
        }, uploadStatus),
        
        this.renderActionButtons(h, pendingImages)
      ]);
    },
    
    renderPreviewArea(h, pendingImages) {
      return h('div', { 
        key: 'preview-area',
        style: {
          maxHeight: '200px',
          overflowY: 'auto',
          border: '1px dashed #d1d5da',
          borderRadius: '4px',
          padding: '8px',
          marginBottom: '12px',
          backgroundColor: '#fff'
        }
      }, [
        h('div', { 
          style: {
            fontSize: '12px',
            color: '#586069',
            marginBottom: '4px'
          }
        }, `已选择 ${pendingImages.length} 张图片:`),
        ...pendingImages.map((img, idx) => h('div', {
          key: idx,
          style: {
            display: 'inline-block',
            margin: '4px',
            textAlign: 'center',
            verticalAlign: 'top'
          }
        }, [
          h('img', {
            src: img.previewUrl,
            style: {
              maxWidth: '60px',
              maxHeight: '60px',
              display: 'block',
              border: '1px solid #e1e4e8'
            }
          }),
          h('div', { 
            style: {
              width: '60px',
              fontSize: '10px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }
          }, img.name)
        ]))
      ]);
    },
    
    renderActionButtons(h, pendingImages) {
      const isUploading = ImageUploadManager.isUploading;
      
      return h('div', { 
        style: {
          display: 'flex',
          gap: '8px'
        }
      }, [
        h('button', {
          onClick: this.handleUpload,
          disabled: pendingImages.length === 0 || isUploading,
          style: {
            flex: 1,
            backgroundColor: '#2da44e',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            opacity: pendingImages.length === 0 ? 0.6 : 1,
            cursor: pendingImages.length === 0 ? 'not-allowed' : 'pointer'
          }
        }, [
          isUploading ? h('iconify-icon', {
            icon: 'ic:baseline-hourglass-bottom',
            style: 'margin-right:4px;vertical-align:-2px'
          }) : h('iconify-icon', {
            icon: 'ic:baseline-rocket-launch',
            style: 'margin-right:4px;vertical-align:-2px'
          }),
          isUploading ? '上传中...' : '开始上传'
        ]),
        
        h('button', {
          onClick: this.handleClear,
          style: {
            backgroundColor: '#f6f8fa',
            color: '#24292f',
            border: '1px solid #d1d5da',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }
        }, [
          h('iconify-icon', {
            icon: 'ic:baseline-clear',
            style: 'margin-right:4px;vertical-align:-2px'
          }),
          '清空'
        ]),
        
        h('button', {
          onClick: () => this.setState({ showUploadPanel: false }),
          style: {
            backgroundColor: '#f6f8fa',
            color: '#24292f',
            border: '1px solid #d1d5da',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }
        }, [
          h('iconify-icon', {
            icon: 'ic:baseline-close',
            style: 'margin-right:4px;vertical-align:-2px'
          }),
          '关闭'
        ])
      ]);
    },
    
    getStatusStyle(status) {
      const isSuccess = status.includes('✅');
      const isError = status.includes('❌') || status.includes('错误');
      
      return {
        padding: '8px',
        marginBottom: '12px',
        borderRadius: '4px',
        backgroundColor: isSuccess ? '#dafbe1' : isError ? '#ffebe9' : '#fff8c5',
        border: isSuccess ? '1px solid #ace1af' : isError ? '1px solid #ffc1c1' : '1px solid #f0c23e',
        color: isSuccess ? '#1a7f37' : isError ? '#cf222e' : '#9a6700'
      };
    }
  });

  const VditorPreview = createClass({
    render() {
      const h = window.h;
      const value = this.props.value || '';
      
      return h('div', {
        className: 'vditor-preview',
        style: {
          padding: '1rem',
          minHeight: '200px',
          fontSize: '14px',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          backgroundColor: '#f6f8fa',
          border: '1px solid #e1e4e8',
          borderRadius: '6px'
        }
      }, value || '(无内容)');
    }
  });

  function registerPlugin() {
    if (!window.CMS?.registerWidget || typeof Vditor === 'undefined') {
      setTimeout(registerPlugin, 100);
      return;
    }

    try {
      window.CMS.registerWidget('vditor', VditorControl, VditorPreview);
      window.decapCmsVditorPlugin = { 
        version: '4.0',
        hasUpload: true,
        manager: ImageUploadManager
      };
      
      console.log('✅ Vditor插件已注册');
    } catch(e) {
      console.error('插件注册失败:', e);
    }
  }

  function init() {
    if (!window.createClass || !window.h) {
      setTimeout(init, 100);
      return;
    }
    registerPlugin();
  }

  // 等待Iconify加载
  function checkIconify() {
    if (typeof Iconify === 'undefined') {
      setTimeout(checkIconify, 100);
    } else {
      init();
    }
  }

  if (typeof Vditor !== 'undefined') {
    checkIconify();
  } else {
    const checkVditor = () => {
      if (typeof Vditor !== 'undefined') {
        checkIconify();
      } else {
        setTimeout(checkVditor, 100);
      }
    };
    checkVditor();
  }

})();