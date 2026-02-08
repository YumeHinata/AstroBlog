(function () {
  'use strict';
  // 防止重复加载
  if (window.decapCmsVditorPlugin) return;

  // 创建一个模拟Toastify的通知函数
  function showToast(message, type = 'info', duration = 3000) {
    // 检查是否已有Toastify容器，如果没有则创建
    let container = document.querySelector('.Toastify');
    if (!container) {
      container = document.createElement('div');
      container.className = 'Toastify';
      // 默认放置在右上角
      container.style.cssText = `
        position: fixed;
        top: 1em;
        right: 1em;
        z-index: 9999;
        padding: 4px;
        width: 320px;
        box-sizing: border-box;
      `;
      document.body.appendChild(container);
    }

    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = `Toastify__toast Toastify__toast-theme--colored Toastify__toast--${type}`;
    
    // 根据类型设置背景色
    const bgColorMap = {
      'success': 'var(--toastify-color-success)',
      'error': 'var(--toastify-color-error)',
      'warning': 'var(--toastify-color-warning)',
      'info': 'var(--toastify-color-info)'
    };
    
    toast.style.cssText = `
      position: relative;
      min-height: var(--toastify-toast-min-height);
      box-sizing: border-box;
      margin-bottom: 1rem;
      padding: 8px;
      border-radius: 4px;
      box-shadow: 0 1px 10px 0 rgba(0,0,0,.1), 0 2px 15px 0 rgba(0,0,0,.05);
      display: flex;
      justify-content: space-between;
      max-height: var(--toastify-toast-max-height);
      overflow: hidden;
      font-family: var(--toastify-font-family);
      cursor: default;
      direction: ltr;
      z-index: 0;
      background: ${bgColorMap[type] || 'var(--toastify-color-light)'};
      color: ${type === 'success' || type === 'error' || type === 'warning' || type === 'info' 
        ? 'var(--toastify-text-color-' + type + ')' 
        : 'var(--toastify-text-color-light)'};
    `;

    // 添加内容
    const body = document.createElement('div');
    body.className = 'Toastify__toast-body';
    body.innerHTML = `<div>${message.replace(/\n/g, '<br>')}</div>`;
    
    toast.appendChild(body);

    // 添加关闭按钮
    const closeButton = document.createElement('button');
    closeButton.className = 'Toastify__close-button';
    closeButton.innerHTML = '&times;';
    closeButton.onclick = () => {
      container.removeChild(toast);
    };
    toast.appendChild(closeButton);

    container.appendChild(toast);

    // 自动移除toast
    setTimeout(() => {
      if (container.contains(toast)) {
        container.removeChild(toast);
      }
    }, duration);
  }

  // Slug工具类，用于处理slug相关的功能
  const SlugUtils = {
    // 从URL中提取slug
    extractSlugFromUrl() {
      const url = window.location.href;
      try {
        // 提取URL中的slug部分，例如从 https://www.yumehinata.com/admin#/collections/terminal/entries/slug
        const match = url.match(/\/entries\/([^\/\?#]+)/);
        if (match && match[1]) {
          const decodedSlug = decodeURIComponent(match[1]); // 解码URL编码的slug
          // 检查是否是有效的slug格式（不是特殊占位符或无法解码的内容）
          if (decodedSlug && decodedSlug !== 'new' && decodedSlug !== 'create' && decodedSlug !== 'default') {
            return decodedSlug;
          }
        }
      } catch (e) {
        console.error('无法从URL中提取slug:', e);
      }
      return null; // 返回null表示无法获取有效slug
    },

    // 获取当前文档的slug，如果无法获取则抛出错误
    getCurrentSlug() {
      const slug = this.extractSlugFromUrl();

      if (!slug) {
        // 使用自定义通知而不是直接抛出错误（虽然仍需抛出以中断流程）
        // 但在抛出前显示通知
        showToast('无法确定文章标识符，请先保存文章标题后再上传图片', 'error', 4000);
        throw new Error('无法确定文章标识符，请先保存文章标题后再上传图片');
      }
      // 保留字母、数字、中文、连字符、下划线，替换其他特殊字符为下划线
      return slug.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
    }
  };

  // 全局变量用于存储待提交的图片
  let pendingMediaFiles = [];

  const ImageUploadManager = {
    pendingImages: [],
    isUploading: false,
    uploadedButUncommitted: new Set(),  // 初始化为Set对象

    config: {
      repoOwner: 'YumeHinata',
      repoName: 'AstroBlog',
      branch: 'main',
      mediaFolder: 'src/content/posts',
      mediaBranch: 'cms/media-assets'  // 添加媒体分支配置
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

    // 使用SlugUtils来获取slug
    extractSlugFromUrl: SlugUtils.extractSlugFromUrl,

    getCurrentSlug: SlugUtils.getCurrentSlug,

    calculatePaths(filename) {
      const mediaFolder = this.config.mediaFolder.replace(/^\//, '');

      // 获取当前文档的slug
      const slug = this.getCurrentSlug();

      // 保留字母、数字、中文、连字符、下划线和点，替换其他特殊字符为下划线
      const safeFilename = filename.replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]/g, '_');

      // 在post目录下的images子目录中创建以slug命名的子目录存放图片
      const pathInRepo = `${mediaFolder}/images/${slug}/${safeFilename}`;
      const markdownPath = `./images/${slug}/${safeFilename}`;
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

    // 上传所有图片并返回markdown字符串
    async uploadAll(vditorInstance) {
      if (this.pendingImages.length === 0) throw new Error('没有图片需要上传');
      if (this.isUploading) throw new Error('上传正在进行中');

      this.isUploading = true;

      // 在开始上传前验证能否获取到slug
      try {
        this.calculatePaths('test.jpg'); // 只是为了验证能否成功计算路径
      } catch (error) {
        console.error("路径计算失败:", error);
        throw new Error(error.message);
      }

      const token = this.getToken();
      const { repoOwner, repoName, mediaBranch = 'cms/media-assets' } = this.config; // 设置默认值
      const commitCfg = this.commitConfig;

      const results = { success: 0, errors: [], markdowns: [] };

      try {
        // 确保媒体分支存在
        await this.ensureMediaBranchExists(token, repoOwner, repoName, mediaBranch);

        for (const img of this.pendingImages) {
          try {
            const { pathInRepo, markdownPath } = this.calculatePaths(img.name);

            // 检查文件是否已存在
            const checkUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${pathInRepo}?ref=${mediaBranch}`;
            const checkRes = await fetch(checkUrl, {
              headers: { Authorization: `token ${token}` }
            });

            if (checkRes.ok) {
              // 文件已存在，直接使用现有文件
              results.success++;
              results.markdowns.push(`![${img.name}](${markdownPath})`);

              // 添加到已上传集合，但不实际上传
              this.uploadedButUncommitted.add(pathInRepo);

              // 释放预览URL
              URL.revokeObjectURL(img.previewUrl);
              continue; // 跳过上传步骤
            }

            // 文件不存在，执行上传
            const content = await this.fileToBase64(img.file);

            // 上传到媒体分支 - 现在commitMediaFile会自己处理文件存在性检查
            await this.commitMediaFile(token, repoOwner, repoName, pathInRepo, content, mediaBranch, img.name, commitCfg);

            results.success++;
            results.markdowns.push(`![${img.name}](${markdownPath})`);

            this.uploadedButUncommitted.add(pathInRepo);

            // 释放预览URL
            URL.revokeObjectURL(img.previewUrl);
          } catch (error) {
            console.error("处理图片出错:", img.name, error);
            results.errors.push(`${img.name}: ${error.message}`);
          }
        }

        // 即使有部分失败，也将成功上传的图片插入到编辑器中
        if (results.success > 0 && results.markdowns.length > 0 && vditorInstance) {
          vditorInstance.insertValue('\n' + results.markdowns.join('\n') + '\n');
        }

        if (results.errors.length > 0) {
          console.error('以下图片上传失败:', results.errors);
          
          // 使用自定义的Toastify样式通知
          showToast(`部分图片上传失败:\n${results.errors.join('\n')}\n\n但已成功上传的图片已插入编辑器。`, 'error', 5000);
        } else if(results.success > 0){
          // 使用自定义的Toastify样式通知
          showToast(`✅ 成功处理 ${results.success} 张图片到媒体库`, 'success');
        }

        this.pendingImages = [];
        return results;
      } finally {
        this.isUploading = false;
      }
    },


    // 提交单个媒体文件到GitHub
    async commitMediaFile(token, owner, repo, path, content, branch, filename, commitCfg) {
      // 首先检查文件是否已存在
      const checkUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
      let sha = null;

      try {
        const checkRes = await fetch(checkUrl, {
          headers: { Authorization: `token ${token}` }
        });

        if (checkRes.ok) {
          // 文件已存在，获取SHA
          const fileInfo = await checkRes.json();
          sha = fileInfo.sha;
        }
        // 如果文件不存在，checkRes.status 会是 404，我们将继续创建新文件
      } catch (error) {
        console.error(`检查文件是否存在时出错: ${error.message}`);
        // 如果检查失败，继续上传新文件
      }

      // 构建API URL和请求体
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      const body = {
        message: `${commitCfg.commitPrefix}${filename}`,
        content: content, // 确保内容是base64编码的
        branch: branch,
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
        console.error(`GitHub API错误详情: ${errorData}`);
        console.error(`请求URL: ${url}`);
        console.error(`路径原始值: ${path}`);
        console.error(`请求体: ${JSON.stringify({ message: body.message, contentLength: content.length, branch: body.branch }, null, 2)}`);
        throw new Error(`GitHub API错误: ${res.status}, ${errorData}`);
      }

      // 成功上传后返回数据
      return await res.json();
    },

    // 确保媒体分支存在，如果不存在则从主分支创建
    async ensureMediaBranchExists(token, repoOwner, repoName, mediaBranch) {
      // 检查媒体分支是否存在
      const branchCheckUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/branches/${mediaBranch}`;
      const branchCheckRes = await fetch(branchCheckUrl, {
        headers: { Authorization: `token ${token}` }
      });

      if (branchCheckRes.ok) {
        // 分支已存在
        return;
      } else if (branchCheckRes.status === 404) {
        // 分支不存在，需要创建

        // 获取主分支信息
        const mainBranchName = this.config.branch;
        const mainBranchUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/git/refs/heads/${mainBranchName}`;
        const mainBranchRes = await fetch(mainBranchUrl, {
          headers: { Authorization: `token ${token}` }
        });

        if (!mainBranchRes.ok) {
          throw new Error(`无法获取主分支信息: ${mainBranchRes.status}`);
        }

        const mainBranchData = await mainBranchRes.json();
        const mainBranchSha = mainBranchData.object.sha;

        // 创建媒体分支
        const createBranchUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/git/refs`;
        const createRes = await fetch(createBranchUrl, {
          method: 'POST',
          headers: {
            Authorization: `token ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ref: `refs/heads/${mediaBranch}`,
            sha: mainBranchSha
          })
        });

        if (!createRes.ok) {
          const errorData = await createRes.text();
          throw new Error(`创建分支失败: ${createRes.status}, ${errorData}`);
        }
      } else {
        const errorData = await branchCheckRes.text();
        throw new Error(`检查分支状态失败: ${branchCheckRes.status}, ${errorData}`);
      }
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
            const { repoOwner, repoName, mediaBranch } = ImageUploadManager.config; // 使用媒体分支
            const contentBranch = ImageUploadManager.getCurrentContentBranch();

            // 提交所有待处理的媒体文件到媒体分支
            for (const mediaFile of pendingMediaFiles) {
              try {
                await this.commitMediaFile(
                  token,
                  repoOwner,
                  repoName,
                  mediaFile.path,
                  mediaFile.content,
                  mediaBranch, // 使用媒体分支
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


    componentWillUnmount() {
      // 清除定时器
      clearInterval(this.pathCheckInterval);

      // 由于我们使用全局hashchange监听器，不需要在组件中移除
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
        const slug = SlugUtils.extractSlugFromUrl();
        if (slug) {
          return `src/content/posts/${slug}.md`;
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
        uploadStatus: '上传中...',
        showUploadPanel: false
      });

      try {
        const result = await ImageUploadManager.uploadAll(this.vditor);

        if (result.success > 0) {
          this.setState({
            uploadStatus: `✅ 上传完成！成功 ${result.success}/${pendingCount} 张`
          });
          setTimeout(() => this.setState({ uploadStatus: null }), 5000);
          
          // 显示成功通知
          showToast(`✅ 成功上传 ${result.success} 张图片`, 'success');
        } else {
          this.setState({
            uploadStatus: '上传失败，请查看控制台',
            showUploadPanel: true
          });
          
          // 显示失败通知
          showToast('❌ 图片上传失败，请重试', 'error');
        }

        if (result.errors.length > 0) {
          console.error('上传错误:', result.errors);
        }
      } catch (error) {
        console.error('上传过程出错:', error); // 保留错误信息到控制台
        this.setState({
          uploadStatus: `错误: ${error.message}`,
          showUploadPanel: true
        });
        
        // 显示错误通知
        showToast(`❌ 上传出错: ${error.message}`, 'error', 5000);
      }
    },

    handleClear() {
      ImageUploadManager.cleanupPreviews();
      this.setState({
        uploadStatus: '已清空暂存图片',
        showUploadPanel: false
      });
      
      // 显示清空成功的通知
      showToast('🗑️ 已清空暂存图片', 'info');
    },

    render() {
      const h = window.h;
      const { showUploadPanel, uploadStatus } = this.state;
      const pendingImages = ImageUploadManager.pendingImages;

      return h('div', { className: 'vditor-full-container' }, [
        h('div', {
          key: 'editor',
          id: this.props.forID,
          className: 'vditor-editor'
        }),

        showUploadPanel && this.renderUploadPanel(h, pendingImages, uploadStatus),

        !showUploadPanel && pendingImages.length > 0 && h('div', {
          key: 'upload-hint',
          className: 'upload-hint'
        }, `📷 ${pendingImages.length} 张图片待上传，点击管理`)
      ]);
    },

    renderUploadPanel(h, pendingImages, uploadStatus) {
      const currentDocPath = this.getCurrentDocPath();

      return h('div', {
        key: 'upload-panel',
        className: 'vditor-upload-panel'
      }, [
        h('h4', {}, '📁 图片上传到GitHub'),

        currentDocPath && h('div', { className: 'doc-path' }, `文档路径: ${currentDocPath}`),

        h('div', { className: 'file-input-container' }, [
          h('input', {
            type: 'file',
            accept: 'image/*',
            multiple: true,
            onChange: this.handleFileSelect,
            className: 'file-input'
          }),
          h('div', { className: 'file-hint' }, '支持多选，图片将暂存在浏览器中')
        ]),

        pendingImages.length > 0 && this.renderPreviewArea(h, pendingImages),

        uploadStatus && h('div', {
          className: `upload-status ${this.getStatusClass(uploadStatus)}`
        }, uploadStatus),

        this.renderActionButtons(h, pendingImages)
      ]);
    },

    renderPreviewArea(h, pendingImages) {
      return h('div', {
        key: 'preview-area',
        className: 'preview-area'
      }, [
        h('div', { className: 'preview-label' }, `已选择 ${pendingImages.length} 张图片:`),
        ...pendingImages.map((img, idx) => h('div', {
          key: idx,
          className: 'preview-item'
        }, [
          h('img', {
            src: img.previewUrl,
            className: 'preview-image'
          }),
          h('div', { className: 'preview-name' }, img.name)
        ]))
      ]);
    },

    renderActionButtons(h, pendingImages) {
      const isUploading = ImageUploadManager.isUploading;

      return h('div', { className: 'button-container' }, [
        h('button', {
          onClick: this.handleUpload,
          disabled: pendingImages.length === 0 || isUploading,
          className: `primary-button ${pendingImages.length === 0 ? 'disabled' : ''}`
        }, isUploading ? '上传中...' : '🚀 开始上传'),

        h('button', {
          onClick: this.handleClear,
          className: 'secondary-button'
        }, '清空'),

        h('button', {
          onClick: () => this.setState({ showUploadPanel: false }),
          className: 'secondary-button'
        }, '关闭')
      ]);
    },

    getStatusClass(status) {
      if (status.includes('✅')) return 'success';
      if (status.includes('❌') || status.includes('错误')) return 'error';
      return 'warning';
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
      // 注册widget，添加数据持久化方法
      const widget = {
        control: VditorControl,
        preview: VditorPreview,
        // 添加一个方法用于在提交前处理媒体文件
        beforeSubmit: async function (entry) {
          if (window.vditorInstance && window.vditorInstance.getValue) {
            // 更新entry中的内容
            entry.set(window.vditorInstance.getValue());
          }

          // 处理待提交的媒体文件
          if (pendingMediaFiles.length > 0) {
            try {
              // 获取token
              const token = ImageUploadManager.getToken();
              const { repoOwner, repoName, mediaBranch } = ImageUploadManager.config; // 使用媒体分支
              const contentBranch = ImageUploadManager.getCurrentContentBranch();

              // 提交所有待处理的媒体文件到媒体分支
              for (const mediaFile of pendingMediaFiles) {
                try {
                  await VditorControl.prototype.commitMediaFile.call(
                    { commitMediaFile: VditorControl.prototype.commitMediaFile }, // 为调用提供上下文
                    token,
                    repoOwner,
                    repoName,
                    mediaFile.path,
                    mediaFile.content,
                    mediaBranch, // 使用媒体分支
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

      // 使用正确的事件注册方式注册发布事件监听器
      if (window.CMS && typeof window.CMS.registerEventListener === 'function') {
        window.CMS.registerEventListener({
          name: 'prePublish',
          handler: async (obj) => {
            console.log('检测到prePublish事件，即将发布文章');
            // 发布前合并媒体分支到主分支
            await mergeMediaToMain();
          }
        });
      }

      window.decapCmsVditorPlugin = {
        version: '4.7',
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

  // 合并媒体文件到主分支的函数
  async function mergeMediaToMain() {
    if (!ImageUploadManager.uploadedButUncommitted || ImageUploadManager.uploadedButUncommitted.size === 0) {
      // 没有未提交的图片，无需合并
      console.log('没有未提交的图片，无需合并媒体分支');
      return;
    }

    try {
      const token = ImageUploadManager.getToken();
      const { repoOwner, repoName, branch: mainBranch, mediaBranch } = ImageUploadManager.config;

      console.log('开始合并媒体分支到主分支...');

      // 尝试将媒体分支合并到主分支
      const mergeRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/merges`, {
        method: 'POST',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          base: mainBranch,
          head: mediaBranch,
          commit_message: '[Auto] Merge media assets to main'
        })
      });

      if (mergeRes.ok) {
        console.log('成功将媒体分支合并到主分支');
        showToast('✅ 成功将媒体分支合并到主分支', 'success');
        
        // 合并成功后删除媒体分支
        try {
          const deleteUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/git/refs/heads/${mediaBranch}`;

          const deleteRes = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
              Authorization: `token ${token}`
            }
          });

          if (deleteRes.ok) {
            console.log('成功删除媒体分支');
            showToast('🗑️ 成功删除媒体分支', 'info');
          } else {
            const errorData = await deleteRes.text();
            console.error('删除分支失败:', deleteRes.status, errorData);
          }
        } catch (error) {
          console.error('删除媒体分支失败:', error);
          // 不抛出错误，因为合并已经成功
        }

        // 清空已上传但未提交的记录
        ImageUploadManager.uploadedButUncommitted.clear();
      } else if (mergeRes.status === 409) {
        // 合并冲突，可能需要手动处理
        console.warn('媒体分支与主分支存在冲突，无法自动合并');
        showToast('⚠️ 媒体分支与主分支存在冲突，无法自动合并', 'warning', 5000);
      } else {
        const errorText = await mergeRes.text();
        console.error(`合并失败: ${mergeRes.status}`, errorText);
        showToast(`❌ 合并失败: ${mergeRes.status}`, 'error', 5000);
      }
    } catch (error) {
      console.error('合并媒体分支时出错:', error);
      showToast(`❌ 合并媒体分支时出错: ${error.message}`, 'error', 5000);
    }
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