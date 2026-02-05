(function () {
  'use strict';
  if (window.decapCmsVditorPlugin) return;

  const ImageUploadManager = {
    pendingImages: [],
    isUploading: false,

    config: {
      repoOwner: 'YumeHinata',
      repoName: 'AstroBlog',
      // [新增] 集合名，根据你的yml配置
      collectionName: 'terminal',
      mediaFolder: 'src/content/posts/images'
    },

    commitConfig: {
      authorName: 'Decap CMS Editor',
      authorEmail: 'editor@yumehinata.com',
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

    // [修改] 根据文档标题创建文件夹，使用原文件名
    calculatePaths(filename, folderName) { // 新增folderName参数
      const mediaFolder = this.config.mediaFolder.replace(/^\//, '');
      // 使用原文件名，仅做安全替换
      const safeFilename = filename.replace(/[^a-zA-Z0-9\u4e00-\u9fa5.-]/g, '_');
      // 路径改为：媒体文件夹/文档标题文件夹/文件名
      const pathInRepo = `${mediaFolder}/${folderName}/${safeFilename}`;
      // Markdown路径适配Fuwari
      const markdownPath = `./images/${folderName}/${safeFilename}`;
      return { pathInRepo, markdownPath };
    },

    // [新增] 检查GitHub分支是否存在
    async checkBranchExists(token, branchName) {
      const { repoOwner, repoName } = this.config;
      const url = `https://api.github.com/repos/${repoOwner}/${repoName}/branches/${encodeURIComponent(branchName)}`;
      const res = await fetch(url, {
        headers: { Authorization: `token ${token}` }
      });
      return res.status === 200;
    },

    // [修改] 上传逻辑现在需要目标分支和文档标题
    async uploadAll(vditorInstance, targetBranch, docTitle) {
      if (this.pendingImages.length === 0) throw new Error('没有图片需要上传');
      if (this.isUploading) throw new Error('上传正在进行中');

      this.isUploading = true;
      const token = this.getToken();
      const { repoOwner, repoName } = this.config;
      const commitCfg = this.commitConfig;

      // [新增] 生成文件夹名（用于路径）
      const folderName = this.generateFolderName(docTitle);

      const results = { success: 0, errors: [], markdowns: [] };

      try {
        for (const img of this.pendingImages) {
          try {
            // [修改] 计算路径时传入文件夹名
            const { pathInRepo, markdownPath } = this.calculatePaths(img.name, folderName);
            const content = await this.fileToBase64(img.file);

            // [修改] 上传到目标分支，不检查文件是否存在（直接创建/覆盖）
            await this.pushToGitHub(token, repoOwner, repoName, pathInRepo, content, targetBranch, commitCfg, img.name);

            results.success++;
            results.markdowns.push(`![${img.name}](${markdownPath})`);
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

    // [新增] 生成URL安全的文件夹名
    generateFolderName(docTitle) {
      if (!docTitle || docTitle.trim() === '') return 'untitled';
      return docTitle
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    },

    // [新增] 从标题生成分支名
    generateBranchName(docTitle) {
      const folderName = this.generateFolderName(docTitle);
      return `cms/${this.config.collectionName}/${folderName}`;
    },

    async pushToGitHub(token, owner, repo, path, content, branch, commitCfg, filename) {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
      const body = {
        message: `${commitCfg.commitPrefix}${filename}`,
        content,
        branch, // 使用传入的动态分支
        committer: { name: commitCfg.authorName, email: commitCfg.authorEmail },
        author: { name: commitCfg.authorName, email: commitCfg.authorEmail }
      };

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
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`GitHub API错误 [${res.status}]: ${errorData.message || '未知错误'}`);
      }
    }
  };

  const VditorControl = createClass({
    getInitialState() {
      return {
        value: this.props.value || '',
        showUploadPanel: false,
        uploadStatus: null
      };
    },

    componentDidMount() {
      this.initVditor();
    },

    componentWillUnmount() {
      if (this.vditor) this.vditor.destroy();
      ImageUploadManager.cleanupPreviews();
    },

    // [新增] 获取页面上的文档标题
    getDocTitle() {
      // 方法1: 查找 data-field="title" 的输入框（Decap CMS常用）
      let titleInput = document.querySelector('[data-field="title"] input, [data-field="title"] textarea');

      // 方法2: 查找ID包含"title-field"的输入框（你的观察）
      if (!titleInput) {
        titleInput = document.querySelector('input[id*="title-field-"], textarea[id*="title-field-"]');
      }

      // 方法3: 查找包含"title"文本的label附近的输入框
      if (!titleInput) {
        const titleLabel = Array.from(document.querySelectorAll('label')).find(
          label => label.textContent.includes('标题') || label.textContent.includes('Title')
        );
        if (titleLabel) {
          const inputId = titleLabel.getAttribute('for');
          if (inputId) titleInput = document.getElementById(inputId);
        }
      }

      if (titleInput && titleInput.value && titleInput.value.trim() !== '') {
        return titleInput.value.trim();
      }

      return null; // 明确返回null表示未找到或为空
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

      const uploadButton = {
        name: 'image-upload',
        tip: '上传图片到GitHub',
        className: 'toolbar__image-upload',
        icon: '<svg viewBox="0 0 1024 1024" width="16" height="16"><path d="M959.9 774.4c0 70.4-57.6 128-128 128H192c-70.4 0-128-57.6-128-128V249.6c0-70.4 57.6-128 128-128h640c70.4 0 128 57.6 128 128v524.8z" fill="#FF8A00"></path><path d="M825.6 300.8c0 57.6-44.8 102.4-102.4 102.4s-102.4-44.8-102.4-102.4 44.8-102.4 102.4-102.4 102.4 44.8 102.4 102.4zM710.4 556.8l-108.8-108.8-185.6 185.6-108.8-108.8L128 697.6v76.8c0 70.4 57.6 128 128 128h640c70.4 0 128-57.6 128-128v-76.8L710.4 556.8z" fill="#FFFFFF"></path></svg>',
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

    // [修改] 核心上传逻辑，包含标题验证和分支检查
    async handleUpload() {
      const pendingCount = ImageUploadManager.pendingImages.length;
      if (pendingCount === 0) {
        this.setState({ uploadStatus: '请先选择图片' });
        return;
      }

      // 1. 获取文档标题
      const docTitle = this.getDocTitle();
      if (!docTitle) {
        this.setState({
          uploadStatus: '❌ 未找到文档标题。请确保：标题不为空。',
          showUploadPanel: true
        });
        return;
      }

      // 2. 构造并验证草稿分支
      const expectedBranch = ImageUploadManager.generateBranchName(docTitle);
      this.setState({ uploadStatus: `正在验证分支 ${expectedBranch} ...` });

      try {
        const token = ImageUploadManager.getToken();
        const branchExists = await ImageUploadManager.checkBranchExists(token, expectedBranch);

        if (!branchExists) {
          this.setState({
            uploadStatus: `❌ 草稿分支不存在。请先点击Decap CMS的"保存草稿"按钮。`,
            showUploadPanel: true
          });
          return;
        }

        // 3. 分支存在，开始上传
        this.setState({
          uploadStatus: `上传中至分支: ${expectedBranch}...`,
          showUploadPanel: false
        });

        const result = await ImageUploadManager.uploadAll(this.vditor, expectedBranch, docTitle);

        if (result.success > 0) {
          this.setState({
            uploadStatus: `✅ 上传完成！${result.success}张图片已保存至草稿分支。`
          });
          setTimeout(() => this.setState({ uploadStatus: null }), 4000);
        } else {
          this.setState({
            uploadStatus: '上传失败，请查看控制台。',
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
      const { showUploadPanel, uploadStatus } = this.state;
      const pendingImages = ImageUploadManager.pendingImages;

      return h('div', { className: 'vditor-full-container' }, [
        h('div', {
          key: 'editor',
          id: this.props.forID,
          style: {
            minHeight: '500px',
            marginBottom: '10px'
          }
        }),

        showUploadPanel && this.renderUploadPanel(h, pendingImages, uploadStatus),

        !showUploadPanel && pendingImages.length > 0 && h('div', {
          key: 'upload-hint',
          style: styles.uploadHint,
          onClick: () => this.setState({ showUploadPanel: true })
        }, `📷 ${pendingImages.length} 张图片待上传，点击管理`)
      ]);
    },

    renderUploadPanel(h, pendingImages, uploadStatus) {
      return h('div', {
        key: 'upload-panel',
        className: 'vditor-upload-panel',
        style: styles.uploadPanel
      }, [
        h('h4', { style: { marginTop: 0 } }, '📁 图片上传到GitHub'),

        h('div', { style: { marginBottom: '12px' } }, [
          h('input', {
            type: 'file',
            accept: 'image/*',
            multiple: true,
            onChange: this.handleFileSelect,
            style: { marginBottom: '8px' }
          }),
          h('div', { style: styles.fileHint }, '支持多选，图片将暂存在浏览器中')
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
        style: styles.previewArea
      }, [
        h('div', { style: styles.previewLabel }, `已选择 ${pendingImages.length} 张图片:`),
        ...pendingImages.map((img, idx) => h('div', {
          key: idx,
          style: styles.previewItem
        }, [
          h('img', {
            src: img.previewUrl,
            style: styles.previewImage
          }),
          h('div', { style: styles.previewName }, img.name)
        ]))
      ]);
    },

    renderActionButtons(h, pendingImages) {
      const isUploading = ImageUploadManager.isUploading;

      return h('div', { style: styles.buttonContainer }, [
        h('button', {
          onClick: this.handleUpload.bind(this),
          disabled: pendingImages.length === 0 || isUploading,
          style: {
            ...styles.primaryButton,
            opacity: (pendingImages.length === 0 || isUploading) ? 0.6 : 1,
            cursor: (pendingImages.length === 0 || isUploading) ? 'not-allowed' : 'pointer'
          }
        }, isUploading ? '上传中...' : '🚀 开始上传'),

        h('button', {
          onClick: this.handleClear.bind(this),
          style: styles.secondaryButton
        }, '清空'),

        h('button', {
          onClick: () => this.setState({ showUploadPanel: false }),
          style: styles.secondaryButton
        }, '关闭')
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
        style: styles.previewContainer
      }, value || '(无内容)');
    }
  });

  const styles = {
    uploadPanel: {
      border: '1px solid #e1e4e8',
      borderRadius: '6px',
      padding: '16px',
      backgroundColor: '#f6f8fa',
      marginTop: '10px'
    },
    fileHint: {
      fontSize: '12px',
      color: '#586069'
    },
    previewArea: {
      maxHeight: '200px',
      overflowY: 'auto',
      border: '1px dashed #d1d5da',
      borderRadius: '4px',
      padding: '8px',
      marginBottom: '12px',
      backgroundColor: '#fff'
    },
    previewLabel: {
      fontSize: '12px',
      color: '#586069',
      marginBottom: '4px'
    },
    previewItem: {
      display: 'inline-block',
      margin: '4px',
      textAlign: 'center',
      verticalAlign: 'top'
    },
    previewImage: {
      maxWidth: '60px',
      maxHeight: '60px',
      display: 'block',
      border: '1px solid #e1e4e8',
      borderRadius: '3px'
    },
    previewName: {
      width: '60px',
      fontSize: '10px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },
    buttonContainer: {
      display: 'flex',
      gap: '8px'
    },
    primaryButton: {
      flex: 1,
      backgroundColor: '#2da44e',
      color: 'white',
      border: 'none',
      padding: '8px 16px',
      borderRadius: '4px',
      fontSize: '13px',
      fontWeight: '500'
    },
    secondaryButton: {
      backgroundColor: '#f6f8fa',
      color: '#24292f',
      border: '1px solid #d1d5da',
      padding: '8px 16px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500'
    },
    uploadHint: {
      fontSize: '12px',
      color: '#57606a',
      padding: '6px',
      backgroundColor: '#f6f8fa',
      border: '1px dashed #d0d7de',
      borderRadius: '4px',
      marginTop: '8px',
      cursor: 'pointer'
    },
    previewContainer: {
      padding: '1rem',
      minHeight: '200px',
      fontSize: '14px',
      lineHeight: '1.6',
      whiteSpace: 'pre-wrap',
      backgroundColor: '#f6f8fa',
      border: '1px solid #e1e4e8',
      borderRadius: '6px'
    }
  };

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

      console.log('✅ Vditor插件已注册 (支持editorial_workflow)');
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