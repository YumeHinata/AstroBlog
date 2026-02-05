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

    // [修复] 确保 addImages 函数正确定义
    addImages(files) {
      const newImages = Array.from(files).map(file => ({
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        id: Date.now() + Math.random()
      }));

      console.log('[ImageUploadManager] 添加图片:', newImages.length, '张');
      this.pendingImages.push(...newImages);
      return newImages;
    },

    // [修复] 清理预览
    cleanupPreviews() {
      console.log('[ImageUploadManager] 清理预览图片');
      this.pendingImages.forEach(img => {
        try {
          URL.revokeObjectURL(img.previewUrl);
        } catch (e) {
          // 忽略清理错误
        }
      });
      this.pendingImages = [];
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
      console.log('[ImageUploadManager] 检查分支是否存在:', url);

      try {
        const res = await fetch(url, {
          headers: { Authorization: `token ${token}` }
        });
        return res.status === 200;
      } catch (error) {
        console.error('[ImageUploadManager] 检查分支失败:', error);
        return false;
      }
    },

    // [修改] 上传逻辑现在需要目标分支和文档标题
    async uploadAll(vditorInstance, targetBranch, docTitle) {
      if (this.pendingImages.length === 0) throw new Error('没有图片需要上传');
      if (this.isUploading) throw new Error('上传正在进行中');

      this.isUploading = true;
      console.log('[ImageUploadManager] 开始上传，目标分支:', targetBranch);

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
            console.log('[ImageUploadManager] 上传图片:', img.name, '路径:', pathInRepo);

            const content = await this.fileToBase64(img.file);

            // [修改] 上传到目标分支，不检查文件是否存在（直接创建/覆盖）
            await this.pushToGitHub(token, repoOwner, repoName, pathInRepo, content, targetBranch, commitCfg, img.name);

            results.success++;
            results.markdowns.push(`![${img.name}](${markdownPath})`);

            try {
              URL.revokeObjectURL(img.previewUrl);
            } catch (e) {
              console.warn('[ImageUploadManager] 清理预览URL失败:', e);
            }
          } catch (error) {
            console.error('[ImageUploadManager] 单张图片上传失败:', error);
            results.errors.push(`${img.name}: ${error.message}`);
          }
        }

        if (results.markdowns.length > 0 && vditorInstance) {
          try {
            vditorInstance.insertValue('\n' + results.markdowns.join('\n') + '\n');
          } catch (e) {
            console.error('[ImageUploadManager] 插入Markdown失败:', e);
          }
        }

        this.pendingImages = [];
        console.log('[ImageUploadManager] 上传完成，成功:', results.success);
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
      const branchName = `cms/${this.config.collectionName}/${folderName}`;
      console.log('[ImageUploadManager] 生成分支名:', branchName, '基于标题:', docTitle);
      return branchName;
    },

    // [新增] 文件转Base64
    async fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = () => reject(new Error('读取文件失败'));
        reader.readAsDataURL(file);
      });
    },

    // [新增] 推送到GitHub
    async pushToGitHub(token, owner, repo, path, content, branch, commitCfg, filename) {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
      console.log('[ImageUploadManager] 推送到GitHub:', url, '分支:', branch);

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

      console.log('[ImageUploadManager] 推送成功:', filename);
      return await res.json();
    }
  };

  // VditorControl 组件代码保持不变，与之前提供的一致
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
      console.log('[VditorControl] 正在查找文档标题...');

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

      if (titleInput) {
        console.log('[VditorControl] 找到标题输入框:', titleInput);
        if (titleInput.value && titleInput.value.trim() !== '') {
          const title = titleInput.value.trim();
          console.log('[VditorControl] 获取到标题:', title);
          return title;
        } else {
          console.warn('[VditorControl] 标题输入框为空');
        }
      } else {
        console.warn('[VditorControl] 未找到标题输入字段');
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
        console.log('[VditorControl] Vditor初始化完成');
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
        click: () => {
          console.log('[VditorControl] 打开上传面板');
          this.setState({ showUploadPanel: true });
        }
      };

      const remainingTools = [
        'edit-mode', 'content-theme', 'code-theme', 'export', 'outline', 'preview', 'devtools', 'info', 'help', 'br'
      ];

      return [...baseTools, uploadButton, '|', ...remainingTools];
    },

    handleFileSelect(event) {
      console.log('[VditorControl] 处理文件选择');
      const files = event.target.files;
      if (!files || !files.length) {
        console.warn('[VditorControl] 未选择文件');
        return;
      }

      try {
        // 使用正确的函数调用
        ImageUploadManager.addImages(files);
        this.setState({
          uploadStatus: `已暂存 ${files.length} 张图片，共 ${ImageUploadManager.pendingImages.length} 张待上传`
        });

        event.target.value = '';
        console.log('[VditorControl] 文件已添加到待上传列表');
      } catch (error) {
        console.error('[VditorControl] 处理文件选择失败:', error);
        this.setState({
          uploadStatus: `添加文件失败: ${error.message}`,
          showUploadPanel: true
        });
      }
    },

    // [修改] 核心上传逻辑，包含标题验证和分支检查
    async handleUpload() {
      console.log('[VditorControl] 开始处理上传');
      const pendingCount = ImageUploadManager.pendingImages.length;
      if (pendingCount === 0) {
        console.warn('[VditorControl] 没有待上传的图片');
        this.setState({ uploadStatus: '请先选择图片' });
        return;
      }

      // 1. 获取文档标题
      const docTitle = this.getDocTitle();
      if (!docTitle) {
        console.warn('[VditorControl] 未找到文档标题');
        this.setState({
          uploadStatus: '❌ 未找到文档标题。请确保：1. 已填写标题栏；2. 标题不为空。',
          showUploadPanel: true
        });
        return;
      }

      console.log('[VditorControl] 文档标题:', docTitle);

      // 2. 构造并验证草稿分支
      const expectedBranch = ImageUploadManager.generateBranchName(docTitle);
      console.log('[VditorControl] 预期分支:', expectedBranch);

      this.setState({ uploadStatus: `正在验证分支 ${expectedBranch} ...` });

      try {
        const token = ImageUploadManager.getToken();
        console.log('[VditorControl] 检查分支是否存在');
        const branchExists = await ImageUploadManager.checkBranchExists(token, expectedBranch);

        if (!branchExists) {
          console.warn('[VditorControl] 草稿分支不存在');
          this.setState({
            uploadStatus: `❌ 草稿分支不存在。请先点击Decap CMS的"保存草稿"按钮。`,
            showUploadPanel: true
          });
          return;
        }

        console.log('[VditorControl] 分支存在，开始上传');

        // 3. 分支存在，开始上传
        this.setState({
          uploadStatus: `上传中至分支: ${expectedBranch}...`,
          showUploadPanel: false
        });

        const result = await ImageUploadManager.uploadAll(this.vditor, expectedBranch, docTitle);

        if (result.success > 0) {
          console.log('[VditorControl] 上传成功:', result.success, '张图片');
          this.setState({
            uploadStatus: `✅ 上传完成！${result.success}张图片已保存至草稿分支。`
          });
          setTimeout(() => this.setState({ uploadStatus: null }), 4000);
        } else {
          console.error('[VditorControl] 上传失败');
          this.setState({
            uploadStatus: '上传失败，请查看控制台。',
            showUploadPanel: true
          });
        }

        if (result.errors.length > 0) {
          console.error('上传错误:', result.errors);
        }
      } catch (error) {
        console.error('[VditorControl] 上传过程出错:', error);
        this.setState({
          uploadStatus: `错误: ${error.message}`,
          showUploadPanel: true
        });
      }
    },

    handleClear() {
      console.log('[VditorControl] 清空待上传图片');
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

      console.log('[VditorControl] 渲染，显示上传面板:', showUploadPanel, '待上传图片:', pendingImages.length);

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
          onClick: () => {
            console.log('[VditorControl] 点击上传提示');
            this.setState({ showUploadPanel: true });
          }
        }, `📷 ${pendingImages.length} 张图片待上传，点击管理`)
      ]);
    },

    renderUploadPanel(h, pendingImages, uploadStatus) {
      console.log('[VditorControl] 渲染上传面板');

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
            onChange: this.handleFileSelect.bind(this),
            style: { marginBottom: '8px' },
            key: 'file-input'
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
            style: styles.previewImage,
            alt: img.name
          }),
          h('div', { style: styles.previewName }, img.name)
        ]))
      ]);
    },

    renderActionButtons(h, pendingImages) {
      const isUploading = ImageUploadManager.isUploading;
      const pendingCount = pendingImages.length;
      const isDisabled = pendingCount === 0 || isUploading;

      console.log('[VditorControl] 渲染操作按钮，禁用状态:', isDisabled, '上传中:', isUploading);

      return h('div', { style: styles.buttonContainer }, [
        h('button', {
          onClick: this.handleUpload.bind(this),
          disabled: isDisabled,
          style: {
            ...styles.primaryButton,
            opacity: isDisabled ? 0.6 : 1,
            cursor: isDisabled ? 'not-allowed' : 'pointer'
          },
          key: 'upload-button'
        }, isUploading ? '上传中...' : '🚀 开始上传'),

        h('button', {
          onClick: this.handleClear.bind(this),
          style: styles.secondaryButton,
          key: 'clear-button'
        }, '清空'),

        h('button', {
          onClick: () => {
            console.log('[VditorControl] 关闭上传面板');
            this.setState({ showUploadPanel: false });
          },
          style: styles.secondaryButton,
          key: 'close-button'
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

  // 其余代码保持不变...
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
      console.log('[插件注册] 等待依赖加载...');
      setTimeout(registerPlugin, 100);
      return;
    }

    try {
      console.log('[插件注册] 开始注册Vditor插件');
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
      console.log('[插件初始化] 等待React工具...');
      setTimeout(init, 100);
      return;
    }
    registerPlugin();
  }

  if (typeof Vditor !== 'undefined') {
    console.log('[插件] Vditor已加载，开始初始化');
    init();
  } else {
    console.log('[插件] 等待Vditor加载...');
    const checkVditor = () => {
      if (typeof Vditor !== 'undefined') {
        console.log('[插件] Vditor已加载');
        init();
      } else {
        setTimeout(checkVditor, 100);
      }
    };
    checkVditor();
  }

})();