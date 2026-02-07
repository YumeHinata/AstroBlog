(function () {
  'use strict';
  if (window.decapCmsVditorPlugin) return;

  // 全局变量用于存储待提交的图片
  let pendingMediaFiles = [];

  const ImageUploadManager = {
    pendingImages: [],
    isUploading: false,
    uploadedButUncommitted: new Set(),

    config: {
      repoOwner: 'YumeHinata',
      repoName: 'AstroBlog',
      branch: 'main',
      mediaFolder: 'src/content/posts'  // 修改：使用posts根目录，然后根据slug创建子目录
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

    // 从URL中提取slug
    extractSlugFromUrl() {
      const url = window.location.href;
      try {
        // 提取URL中的slug部分，例如从 https://www.yumehinata.com/admin#/collections/terminal/entries/slug
        const match = url.match(/\/entries\/([^\/\?#]+)/);
        if (match && match[1]) {
          const decodedSlug = decodeURIComponent(match[1]); // 解码URL编码的slug
          // 检查是否是有效的slug格式（不是特殊占位符或无法解码的内容）
          if(decodedSlug && decodedSlug !== 'new' && decodedSlug !== 'create' && decodedSlug !== 'default') {
            return decodedSlug;
          }
        }
      } catch (e) {
        console.error('无法从URL中提取slug:', e);
      }
      return null; // 返回null表示无法获取有效slug
    },

    // 从编辑器内容或CMS数据中尝试获取标题并生成slug
    getTitleBasedSlug() {
      try {
        // 尝试从CMS的活动条目获取标题
        if(window.CMS?.activeEntry?.data) {
          const title = window.CMS.activeEntry.data.title;
          if(title) {
            // 简单的标题到slug转换
            return title.toLowerCase()
              .replace(/[^\w\u4e00-\u9fff\s-]/g, '')  // 保留中文、英文字母、数字、空格和连字符
              .trim()
              .replace(/\s+/g, '-');  // 空格替换为连字符
          }
        }
      } catch(e) {
        console.error('无法从CMS数据中生成slug:', e);
      }
      return null;
    },

    calculatePaths(filename) {
      const mediaFolder = this.config.mediaFolder.replace(/^\//, '');
      
      // 尝试获取slug，如果获取不到则尝试从标题生成，否则抛出错误
      let slug = this.extractSlugFromUrl();
      if(!slug) {
        slug = this.getTitleBasedSlug();
      }
      
      if(!slug) {
        throw new Error('无法确定文章标识符，请先保存文章标题后再上传图片');
      }
      
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000);
      const safeFilename = `${timestamp}-${randomSuffix}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      // 在post目录下创建以slug命名的子目录存放图片，使用解码后的slug
      const pathInRepo = `${mediaFolder}/${slug}/images/${safeFilename}`;
      const markdownPath = `./images/${safeFilename}`;
      return { pathInRepo, markdownPath };
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

    // 准备上传所有图片并返回markdown字符串，但暂不提交
    async prepareUploadAll() {
      if (this.pendingImages.length === 0) throw new Error('没有图片需要上传');

      // 在开始上传前验证能否获取到slug
      try {
        this.calculatePaths('test.jpg'); // 只是为了验证能否成功计算路径
      } catch(error) {
        throw new Error(error.message);
      }

      const token = this.getToken();
      const contentBranch = this.getCurrentContentBranch();
      const { repoOwner, repoName } = this.config;
      const commitCfg = this.commitConfig;

      const results = { success: 0, errors: [], markdowns: [], mediaFiles: [] };

      for (const img of this.pendingImages) {
        try {
          const { pathInRepo, markdownPath } = this.calculatePaths(img.name);

          // 不检查文件是否存在，直接准备上传
          const content = await this.fileToBase64(img.file);

          // 不立即提交，而是存储到待提交列表
          results.mediaFiles.push({
            path: pathInRepo,
            content: content,
            sha: null, // 新文件没有SHA
            filename: img.name
          });

          results.success++;
          results.markdowns.push(`![${img.name}](${markdownPath})`);
          
          this.uploadedButUncommitted.add(pathInRepo);
        } catch (error) {
          results.errors.push(`${img.name}: ${error.message}`);
        }
      }

      // 将媒体文件添加到全局待提交列表
      pendingMediaFiles.push(...results.mediaFiles);
      
      this.pendingImages = [];
      return results;
    },

    // 获取当前内容所在分支
    getCurrentContentBranch() {
      if (window.CMS?.localBackend) {
        return this.config.branch;
      }
      
      if (window.CMS?.activeEntry) {
        return this.config.branch;
      }
      
      return this.config.branch;
    },

    // 恢复checkFileExists函数，尽管目前在上传流程中不需要使用它，但保留该函数以备将来使用
    async checkFileExists(token, owner, repo, path, branch = null) {
      // 对路径进行URL编码以用于API请求
      const encodedPath = encodeURIComponent(path).replace(/\//g, '%2F');
      let url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;
      if (branch) {
        url += `?ref=${branch}`;
      }
      
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
      this.pathCheckInterval = setInterval(() => this.checkDocPath(), 2000);
    },
    
    // 在props中提供的控件方法中处理提交前逻辑
    control: {
      // 这个方法将在外部调用，当需要提交内容时
      async persist(entry) {
        if (pendingMediaFiles.length > 0) {
          try {
            // 获取token
            const token = ImageUploadManager.getToken();
            const { repoOwner, repoName } = ImageUploadManager.config;
            const contentBranch = ImageUploadManager.getCurrentContentBranch();
            
            // 提交所有待处理的媒体文件
            for (const mediaFile of pendingMediaFiles) {
              try {
                await this.commitMediaFile(
                  token, 
                  repoOwner, 
                  repoName, 
                  mediaFile.path, 
                  mediaFile.content, 
                  contentBranch,
                  mediaFile.filename,
                  ImageUploadManager.commitConfig,
                  mediaFile.sha
                );
              } catch (error) {
                console.error('提交媒体文件失败:', error);
              }
            }
            
            // 清空待提交列表
            pendingMediaFiles = [];
          } catch (error) {
            console.error('处理媒体文件时出错:', error);
          }
        }
      }
    },
    
    // 提交单个媒体文件
    async commitMediaFile(token, owner, repo, path, content, branch, filename, commitCfg, sha) {
      // 对路径进行URL编码以用于API请求
      const encodedPath = encodeURIComponent(path).replace(/\//g, '%2F');
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;
      const body = {
        message: `${commitCfg.commitPrefix}${filename}`,
        content,
        branch,
        committer: { name: commitCfg.authorName, email: commitCfg.authorEmail },
        author: { name: commitCfg.authorName, email: commitCfg.authorEmail }
      };

      // 只有当文件确实存在（有SHA）时才添加sha字段
      if (sha) {
        body.sha = sha;
      }

      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(`GitHub API错误: ${res.status}, ${errorData}`);
      }
    },

    componentWillUnmount() {
      clearInterval(this.pathCheckInterval);
      if (this.vditor) this.vditor.destroy();
      ImageUploadManager.cleanupPreviews();
    },

    checkDocPath() {
      const newPath = this.getCurrentDocPath();
      if (newPath !== this.state.currentDocPath) {
        this.setState({ currentDocPath: newPath });
      }
    },

    getCurrentDocPath() {
      if (window.CMS?.activeEntry?.path) {
        // 解码路径中的URL编码字符
        return decodeURIComponent(window.CMS.activeEntry.path);
      }
      if (this.props.entry?.path) {
        return decodeURIComponent(this.props.entry.path);
      }
      
      // 尝试从URL中获取当前文档路径
      try {
        const url = window.location.href;
        const match = url.match(/\/entries\/([^\/\?#]+)/);
        if (match && match[1]) {
          const slug = decodeURIComponent(match[1]);
          if (slug && slug !== 'new' && slug !== 'create') {
            return `src/content/posts/${slug}.md`;
          }
        }
      } catch (e) {
        console.error('无法从URL中确定文档路径:', e);
      }
      
      return '无法确定当前文档路径';
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

    async handleUpload() {
      const pendingCount = ImageUploadManager.pendingImages.length;
      if (pendingCount === 0) {
        this.setState({ uploadStatus: '请先选择图片' });
        return;
      }

      this.setState({
        uploadStatus: '准备中...',
        showUploadPanel: false
      });

      try {
        const result = await ImageUploadManager.prepareUploadAll();

        if (result.success > 0) {
          this.setState({
            uploadStatus: `✅ 准备完成！${result.success}/${pendingCount} 张图片将在保存时一并提交`
          });
          setTimeout(() => this.setState({ uploadStatus: null }), 5000);
        } else {
          this.setState({
            uploadStatus: '准备失败，请查看控制台',
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
      const currentDocPath = this.getCurrentDocPath();

      return h('div', {
        key: 'upload-panel',
        className: 'vditor-upload-panel',
        style: styles.uploadPanel
      }, [
        h('h4', { style: { marginTop: 0 } }, '📁 图片上传到GitHub'),

        currentDocPath && h('div', { style: styles.docPath }, `文档路径: ${currentDocPath}`),

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
          onClick: this.handleUpload,
          disabled: pendingImages.length === 0 || isUploading,
          style: {
            ...styles.primaryButton,
            opacity: pendingImages.length === 0 ? 0.6 : 1,
            cursor: pendingImages.length === 0 ? 'not-allowed' : 'pointer'
          }
        }, '🚀 准备上传'),

        h('button', {
          onClick: this.handleClear,
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
        border: isSuccess ? '1px solid #ace1af' : isError ? '1px solid #ffc1c1' : '1px solid #f0c23e'
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
    docPath: {
      fontSize: '12px',
      color: '#586069',
      marginBottom: '10px',
      padding: '4px 8px',
      backgroundColor: '#fff',
      borderRadius: '3px',
      border: '1px solid #e1e4e8'
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
      border: '1px solid #e1e4e8'
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
      borderRadius: '4px'
    },
    secondaryButton: {
      backgroundColor: '#f6f8fa',
      color: '#24292f',
      border: '1px solid #d1d5da',
      padding: '8px 16px',
      borderRadius: '4px',
      cursor: 'pointer'
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
      // 注册widget，添加数据持久化方法
      const widget = {
        control: VditorControl,
        preview: VditorPreview,
        // 添加一个方法用于在提交前处理媒体文件
        beforeSubmit: async function(entry) {
          if (window.vditorInstance && window.vditorInstance.getValue) {
            // 更新entry中的内容
            entry.set(window.vditorInstance.getValue());
          }
          
          // 处理待提交的媒体文件
          if (pendingMediaFiles.length > 0) {
            try {
              // 获取token
              const token = ImageUploadManager.getToken();
              const { repoOwner, repoName } = ImageUploadManager.config;
              const contentBranch = ImageUploadManager.getCurrentContentBranch();
              
              // 提交所有待处理的媒体文件
              for (const mediaFile of pendingMediaFiles) {
                try {
                  await VditorControl.prototype.commitMediaFile.call(
                    { commitMediaFile: VditorControl.prototype.commitMediaFile }, // 为调用提供上下文
                    token, 
                    repoOwner, 
                    repoName, 
                    mediaFile.path, 
                    mediaFile.content, 
                    contentBranch,
                    mediaFile.filename,
                    ImageUploadManager.commitConfig,
                    mediaFile.sha
                  );
                } catch (error) {
                  console.error('提交媒体文件失败:', error);
                }
              }
              
              // 清空待提交列表
              pendingMediaFiles = [];
            } catch (error) {
              console.error('处理媒体文件时出错:', error);
            }
          }
        }
      };
      
      window.CMS.registerWidget('vditor', widget.control, widget.preview);
      
      // 添加beforeSubmit处理器到全局，供CMS调用
      if (window.CMS_EVENTS) {
        window.CMS_EVENTS.beforeSubmit = widget.beforeSubmit;
      } else {
        window.CMS_EVENTS = { beforeSubmit: widget.beforeSubmit };
      }

      window.decapCmsVditorPlugin = {
        version: '4.1',
        hasUpload: true,
        manager: ImageUploadManager
      };

      console.log('✅ Vditor插件已注册');
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