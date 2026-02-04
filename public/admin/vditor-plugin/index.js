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
    
    calculatePaths(filename) {
      // 使用文档标题来创建文件夹
      const entry = window.CMS?.activeEntry;
      let docTitle = 'untitled';
      
      try {
        if (entry?.data?.title) {
          docTitle = entry.data.title;
        } else if (entry?.slug) {
          docTitle = entry.slug;
        }
      } catch (e) {
        console.warn('无法获取文档标题，使用默认值:', e);
      }
      
      // 清理文件夹名
      const folderName = docTitle
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
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
      this.pendingImages.forEach(img => {
        try {
          URL.revokeObjectURL(img.previewUrl);
        } catch (e) {
          // 忽略清理错误
        }
      });
      this.pendingImages = [];
    },
    
    async uploadAll(vditorInstance) {
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
            const { pathInRepo, markdownPath, folderName } = this.calculatePaths(img.name);
            
            // 确保文件夹存在 - 先尝试获取文件夹信息
            try {
              await this.checkFileExists(token, repoOwner, repoName, `${this.config.mediaFolder}/${folderName}/.keep`);
            } catch (folderError) {
              console.log(`文件夹 ${folderName} 可能不存在，尝试创建`);
              // 如果文件夹不存在，GitHub API会在上传文件时自动创建
            }
            
            const content = await this.fileToBase64(img.file);
            
            // 检查文件是否已存在
            const fileExists = await this.checkFileExists(token, repoOwner, repoName, pathInRepo);
            const sha = fileExists ? fileExists.sha : null;
            
            // 上传文件到GitHub
            await this.pushToGitHub(token, repoOwner, repoName, pathInRepo, content, branch, commitCfg, img.name, sha);
            
            results.success++;
            results.markdowns.push(`![${img.name}](${markdownPath})`);
            this.uploadedButUncommitted.add(pathInRepo);
            
            URL.revokeObjectURL(img.previewUrl);
          } catch (error) {
            console.error(`上传图片 ${img.name} 失败:`, error);
            results.errors.push(`${img.name}: ${error.message}`);
          }
        }
        
        if (results.markdowns.length > 0 && vditorInstance) {
          try {
            vditorInstance.insertValue('\n' + results.markdowns.join('\n') + '\n');
          } catch (insertError) {
            console.error('插入Markdown失败:', insertError);
          }
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
        reader.onerror = () => reject(new Error('读取文件失败'));
        reader.readAsDataURL(file);
      });
    },
    
    async pushToGitHub(token, owner, repo, path, content, branch, commitCfg, filename, sha) {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
      const body = {
        message: `${commitCfg.commitPrefix}${filename}`,
        content,
        branch,
        committer: { 
          name: commitCfg.authorName, 
          email: commitCfg.authorEmail 
        },
        author: { 
          name: commitCfg.authorName, 
          email: commitCfg.authorEmail 
        }
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
      
      return await res.json();
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
      // 延迟初始化，避免与React渲染冲突
      setTimeout(() => {
        this.initVditor();
      }, 100);
      
      this.titleCheckInterval = setInterval(() => {
        this.checkDocTitle();
      }, 2000);
    },
    
    componentWillUnmount() {
      clearInterval(this.titleCheckInterval);
      if (this.vditor) {
        try {
          this.vditor.destroy();
        } catch (e) {
          // 忽略清理错误
        }
      }
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
      const newTitle = this.getDocTitle();
      if (newTitle !== this.state.docTitle) {
        this.setState({ docTitle: newTitle });
      }
    },
    
    initVditor() {
      try {
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
      
      // 使用安全的Iconify图标
      const uploadButton = {
        name: 'image-upload',
        tip: '上传图片到GitHub',
        className: 'toolbar__image-upload',
        icon: '<span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;"><svg viewBox="0 0 24 24" width="16" height="16" style="fill:currentColor;"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M16.5 6.5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM19 19H5v-2.3l3.3-3.3 2.5 2.5 4.8-4.8 3.4 3.4V19z"/></svg></span>',
        click: () => this.setState({ showUploadPanel: true })
      };
      
      const remainingTools = [
        'edit-mode', 'content-theme', 'code-theme', 'export', 'outline', 'preview', 'devtools', 'info', 'help', 'br'
      ];
      
      return [...baseTools, uploadButton, '|', ...remainingTools];
    },
    
    handleFileSelect(event) {
      try {
        const files = event.target.files;
        if (!files.length) return;
        
        ImageUploadManager.addImages(files);
        this.setState({ 
          uploadStatus: `已暂存 ${files.length} 张图片，共 ${ImageUploadManager.pendingImages.length} 张待上传`
        });
        
        event.target.value = '';
      } catch (e) {
        console.error('选择文件失败:', e);
        this.setState({ uploadStatus: '选择文件失败' });
      }
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
        const result = await ImageUploadManager.uploadAll(this.vditor);
        
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
      
      // 简化渲染，只渲染必要元素
      const children = [
        h('div', { 
          key: 'editor',
          id: this.props.forID,
          className: 'vditor-editor'
        })
      ];
      
      if (showUploadPanel) {
        children.push(this.renderUploadPanel(h, pendingImages, uploadStatus, docTitle));
      } else if (pendingImages.length > 0) {
        children.push(h('div', {
          key: 'upload-hint',
          className: 'upload-hint',
          onClick: () => this.setState({ showUploadPanel: true })
        }, [
          h('span', { style: 'margin-right:4px' }, '📷'),
          `${pendingImages.length} 张图片待上传，点击管理`
        ]));
      }
      
      return h('div', { className: 'vditor-full-container' }, children);
    },
    
    renderUploadPanel(h, pendingImages, uploadStatus, docTitle) {
      return h('div', {
        key: 'upload-panel',
        className: 'vditor-upload-panel'
      }, [
        h('h4', { key: 'title' }, [
          h('span', { style: 'margin-right:6px' }, '📁'),
          '图片上传到GitHub'
        ]),
        
        docTitle && h('div', { 
          key: 'path',
          className: 'upload-doc-path' 
        }, `文档: ${docTitle} (图片将保存至: /images/${docTitle.replace(/\s+/g, '-').toLowerCase()}/)`),
        
        h('div', { key: 'controls', className: 'upload-controls' }, [
          h('input', {
            type: 'file',
            accept: 'image/*',
            multiple: true,
            onChange: this.handleFileSelect.bind(this),
            className: 'upload-file-input',
            key: 'file-input'
          }),
          h('div', { 
            key: 'hint',
            className: 'upload-file-hint' 
          }, '支持多选，图片将暂存在浏览器中')
        ]),
        
        pendingImages.length > 0 && this.renderPreviewArea(h, pendingImages),
        
        uploadStatus && h('div', {
          key: 'status',
          className: this.getStatusClassName(uploadStatus)
        }, uploadStatus),
        
        this.renderActionButtons(h, pendingImages)
      ]);
    },
    
    renderPreviewArea(h, pendingImages) {
      return h('div', {
        key: 'preview-area',
        className: 'upload-preview-area'
      }, [
        h('div', { 
          key: 'label',
          className: 'upload-preview-label' 
        }, `已选择 ${pendingImages.length} 张图片:`),
        ...pendingImages.map((img, idx) => h('div', {
          key: idx,
          className: 'upload-preview-item'
        }, [
          h('img', {
            src: img.previewUrl,
            className: 'upload-preview-img',
            alt: img.name,
            key: 'img'
          }),
          h('div', { 
            className: 'upload-preview-name',
            key: 'name'
          }, img.name)
        ]))
      ]);
    },
    
    renderActionButtons(h, pendingImages) {
      const isUploading = ImageUploadManager.isUploading;
      
      return h('div', { 
        key: 'buttons',
        className: 'upload-button-container' 
      }, [
        h('button', {
          onClick: this.handleUpload.bind(this),
          disabled: pendingImages.length === 0 || isUploading,
          className: 'upload-primary-button',
          key: 'upload'
        }, isUploading ? '上传中...' : '🚀 开始上传'),
        
        h('button', {
          onClick: this.handleClear.bind(this),
          className: 'upload-secondary-button',
          key: 'clear'
        }, '清空'),
        
        h('button', {
          onClick: () => this.setState({ showUploadPanel: false }),
          className: 'upload-secondary-button',
          key: 'close'
        }, '关闭')
      ]);
    },
    
    getStatusClassName(status) {
      const baseClass = 'upload-status';
      if (status.includes('✅')) return `${baseClass} upload-status-success`;
      if (status.includes('❌') || status.includes('错误')) return `${baseClass} upload-status-error`;
      return `${baseClass} upload-status-warning`;
    }
  });

  const VditorPreview = createClass({
    render() {
      const h = window.h;
      const value = this.props.value || '';
      
      return h('div', {
        className: 'vditor-preview'
      }, value || '(无内容)');
    }
  });

  function registerPlugin() {
    try {
      if (!window.CMS?.registerWidget || typeof Vditor === 'undefined') {
        setTimeout(registerPlugin, 100);
        return;
      }
      
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

  // 简化初始化逻辑
  function init() {
    if (typeof Vditor !== 'undefined' && window.createClass && window.h) {
      setTimeout(registerPlugin, 500); // 给页面更多时间加载
    } else {
      setTimeout(init, 100);
    }
  }

  // 等待DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }

})();