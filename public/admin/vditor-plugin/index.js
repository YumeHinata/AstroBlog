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
      const userData = JSON.parse(localStorage.getItem('decap-cms-user'));
      if (!userData?.token) throw new Error('请先登录Decap CMS');
      return userData.token;
    },

    calculatePaths(filename, docTitle) {
      const sanitizeForPath = (str) => {
        return (str || 'untitled')
          .trim()
          .toLowerCase()
          .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
          .replace(/\s+/g, '-');
      };

      const folderName = sanitizeForPath(docTitle);
      const mediaFolder = this.config.mediaFolder.replace(/^\//, '');
      const targetDirInRepo = `${mediaFolder}/${folderName}`;
      const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const pathInRepo = `${targetDirInRepo}/${safeFilename}`;
      const markdownPath = `./images/${folderName}/${safeFilename}`;

      return { pathInRepo, markdownPath };
    },

    addImages(files) {
      const newImages = Array.from(files).map(file => ({
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
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
            const { pathInRepo, markdownPath } = this.calculatePaths(img.name, docTitle);
            const fileExists = await this.checkFileExists(token, repoOwner, repoName, pathInRepo);
            const content = await this.fileToBase64(img.file);
            const sha = fileExists ? fileExists.sha : null;

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
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      const res = await fetch(url, { headers: { Authorization: `token ${token}` } });
      return res.status === 200 ? await res.json() : null;
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
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error(`GitHub API错误: ${res.status}`);
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
      this.docCheckInterval = setInterval(() => this.checkDocTitle(), 2000);
    },

    componentWillUnmount() {
      clearInterval(this.docCheckInterval);
      if (this.vditor) this.vditor.destroy();
      ImageUploadManager.cleanupPreviews();
    },

    getDocTitle() {
      const entry = window.CMS?.activeEntry;
      if (entry?.data?.title) return entry.data.title;
      return entry?.slug || '未命名文档';
    },

    checkDocTitle() {
      const newTitle = this.getDocTitle();
      if (newTitle !== this.state.docTitle) {
        this.setState({ docTitle: newTitle });
      }
    },

    initVditor() {
      try {
        this.vditor = new Vditor(this.props.forID, {
          height: 500,
          value: this.state.value,
          mode: 'ir',
          cache: { enable: false },
          toolbar: this.getToolbarConfig(),
          input: (value) => {
            this.setState({ value });
            this.props.onChange(value);
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

      // 使用Iconify图标（需在HTML中引入Iconify脚本）
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

      return h('div', { className: 'vditor-full-container' }, [
        h('div', {
          key: 'editor',
          id: this.props.forID,
          className: 'vditor-editor'
        }),

        showUploadPanel && this.renderUploadPanel(h, pendingImages, uploadStatus, docTitle),

        !showUploadPanel && pendingImages.length > 0 && h('div', {
          key: 'upload-hint',
          className: 'upload-hint',
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
        className: 'vditor-upload-panel'
      }, [
        h('h4', {}, [
          h('iconify-icon', {
            icon: 'ic:baseline-folder',
            style: 'margin-right:6px;vertical-align:-2px'
          }),
          '图片上传到GitHub'
        ]),

        docTitle && h('div', { className: 'upload-doc-path' },
          `文档: ${docTitle} (图片将保存至: /images/${docTitle.replace(/\s+/g, '-').toLowerCase()}/)`
        ),

        h('div', { className: 'upload-controls' }, [
          h('input', {
            type: 'file',
            accept: 'image/*',
            multiple: true,
            onChange: this.handleFileSelect,
            className: 'upload-file-input'
          }),
          h('div', { className: 'upload-file-hint' }, '支持多选，图片将暂存在浏览器中')
        ]),

        pendingImages.length > 0 && this.renderPreviewArea(h, pendingImages),

        uploadStatus && h('div', {
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
        h('div', { className: 'upload-preview-label' }, 
          `已选择 ${pendingImages.length} 张图片:`
        ),
        ...pendingImages.map((img, idx) => h('div', {
          key: idx,
          className: 'upload-preview-item'
        }, [
          h('img', {
            src: img.previewUrl,
            className: 'upload-preview-img',
            alt: img.name
          }),
          h('div', { className: 'upload-preview-name' }, img.name)
        ]))
      ]);
    },

    renderActionButtons(h, pendingImages) {
      const isUploading = ImageUploadManager.isUploading;

      return h('div', { className: 'upload-button-container' }, [
        h('button', {
          onClick: this.handleUpload,
          disabled: pendingImages.length === 0 || isUploading,
          className: 'upload-primary-button'
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
          className: 'upload-secondary-button'
        }, [
          h('iconify-icon', {
            icon: 'ic:baseline-clear',
            style: 'margin-right:4px;vertical-align:-2px'
          }),
          '清空'
        ]),

        h('button', {
          onClick: () => this.setState({ showUploadPanel: false }),
          className: 'upload-secondary-button'
        }, [
          h('iconify-icon', {
            icon: 'ic:baseline-close',
            style: 'margin-right:4px;vertical-align:-2px'
          }),
          '关闭'
        ])
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

      console.log('✅ Vditor插件（图标优化版）已注册');
    } catch (e) {
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

  if (typeof Vditor !== 'undefined') {
    init();
  } else {
    const checkVditor = () => {
      typeof Vditor !== 'undefined' ? init() : setTimeout(checkVditor, 100);
    };
    checkVditor();
  }

})();