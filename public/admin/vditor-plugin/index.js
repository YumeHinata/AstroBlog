(function () {
  'use strict';
  if (window.decapCmsVditorPlugin) return;

  // 全局变量用于存储待提交的图片
  let pendingMediaFiles = [];

  const ImageUploadManager = {
    pendingImages: [],
    isUploading: false,

    config: {
      repoOwner: 'YumeHinata',
      repoName: 'AstroBlog',
      branch: 'main',
      mediaFolder: 'src/content/posts'
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
      
      // 保留字母、数字、中文、连字符、下划线和点，替换其他特殊字符为下划线
      const safeFilename = filename.replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]/g, '_');
      // 对slug也做同样处理，保留中文字符
      const safeSlug = slug.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
      
      // 在post目录下的images子目录中创建以slug命名的子目录存放图片
      const pathInRepo = `${mediaFolder}/images/${safeSlug}/${safeFilename}`;
      const markdownPath = `./images/${safeSlug}/${safeFilename}`;
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
        console.log("路径计算成功"); // 调试日志
      } catch(error) {
        console.error("路径计算失败:", error); // 调试日志
        throw new Error(error.message);
      }

      const token = this.getToken();
      const { repoOwner, repoName, mediaBranch } = this.config; // 使用媒体分支
      const commitCfg = this.commitConfig;

      const results = { success: 0, errors: [], markdowns: [] };

      try {
        // 确保媒体分支存在
        await this.ensureMediaBranchExists(token, repoOwner, repoName, mediaBranch);

        for (const img of this.pendingImages) {
          try {
            console.log("处理图片:", img.name); // 调试日志
            const { pathInRepo, markdownPath } = this.calculatePaths(img.name);

            // 检查文件是否已存在
            const checkUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${pathInRepo}?ref=${mediaBranch}`;
            const checkRes = await fetch(checkUrl, {
              headers: { Authorization: `token ${token}` }
            });
            
            if (checkRes.ok) {
              // 文件已存在，直接使用现有文件
              console.log(`文件已存在: ${pathInRepo}，使用现有文件`);
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

            // 上传到媒体分支
            await this.commitMediaFile(token, repoOwner, repoName, pathInRepo, content, mediaBranch, img.name, commitCfg);

            results.success++;
            results.markdowns.push(`![${img.name}](${markdownPath})`);
            
            this.uploadedButUncommitted.add(pathInRepo);
            
            // 释放预览URL
            URL.revokeObjectURL(img.previewUrl);
          } catch (error) {
            console.error("处理图片出错:", img.name, error); // 调试日志
            results.errors.push(`${img.name}: ${error.message}`);
          }
        }

        // 即使有部分失败，也将成功上传的图片插入到编辑器中
        if (results.success > 0 && results.markdowns.length > 0 && vditorInstance) {
          vditorInstance.insertValue('\n' + results.markdowns.join('\n') + '\n');
        }

        if (results.errors.length > 0) {
          console.error('以下图片上传失败:', results.errors);
          alert(`部分图片上传失败:\n${results.errors.join('\n')}\n\n但已成功上传的图片已插入编辑器。`);
        } else if(results.success > 0){
          alert(`✅ 成功处理 ${results.success} 张图片到媒体库`);
        }

        this.pendingImages = [];
        console.log("上传完成，成功:", results.success, "错误:", results.errors.length); // 调试日志
        return results;
      } finally {
        this.isUploading = false;
      }
    },


    // 提交单个媒体文件到GitHub
    async commitMediaFile(token, owner, repo, path, content, branch, filename, commitCfg, sha) {
      // 使用原始路径，让fetch自动处理编码
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
        console.error(`请求体: ${JSON.stringify({message: body.message, contentLength: content.length, branch: body.branch}, null, 2)}`);
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
        console.log(`分支已存在: ${mediaBranch}`);
        return;
      } else if (branchCheckRes.status === 404) {
        // 分支不存在，需要创建
        console.log(`分支不存在，正在创建: ${mediaBranch}`);

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

        console.log(`成功创建分支: ${mediaBranch}`);
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
        // 初始化Vditor时添加自定义渲染规则，用于在预览时替换图片URL为CDN链接
        this.vditor = new Vditor(this.props.forID, {
          height: 500,
          value: this.state.value,
          mode: 'ir',
          cache: { enable: false },
          toolbar: this.getToolbarConfig(),
          input: (value) => {
            this.setState({ value });
            this.props.onChange(value);
          },
          // 添加自定义渲染规则
          preview: {
            hljs: {
              enable: true,
              style: 'github',
            },
            markdown: {
              renderer: (mathBlock, previewElement) => {
                // 在预览区域渲染图片时，将相对路径替换为CDN链接
                const images = previewElement.querySelectorAll('img');
                images.forEach(img => {
                  if (img.src.startsWith('./images/')) {
                    // 从当前文档路径提取slug
                    const currentPath = this.getCurrentDocPath();
                    
                    // 从文档路径中提取slug，例如从 src/content/posts/test-post.md 中提取 test-post
                    let slug = null;
                    if (currentPath && currentPath.includes('/')) {
                      const pathParts = currentPath.split('/');
                      
                      // 如果是形如 src/content/posts/[slug].md 的路径
                      if (pathParts.length >= 4 && pathParts[pathParts.length - 1].endsWith('.md')) {
                        slug = pathParts[pathParts.length - 1].slice(0, -3); // 移除 .md 后缀
                      }
                    }
                    
                    if (slug) {
                      // 从图片路径中提取文件名部分
                      const imageMatch = img.src.match(/^\.\/images\/([^\/]+)\/(.+)$/);
                      if (imageMatch) {
                        const imgSlug = imageMatch[1];  // 从路径中提取的slug部分
                        const filename = imageMatch[2]; // 文件名部分
                        img.src = ImageUploadManager.getCdnUrl(imgSlug, filename);
                      } else {
                        // 如果路径格式不匹配，尝试直接处理
                        const filename = img.src.substring('./images/'.length);
                        img.src = ImageUploadManager.getCdnUrl(slug, filename);
                      }
                    }
                  }
                });
              }
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
      console.log("待上传图片数量:", pendingCount); // 调试日志
      
      if (pendingCount === 0) {
        this.setState({ uploadStatus: '请先选择图片' });
        return;
      }

      this.setState({
        uploadStatus: '上传中...',
        showUploadPanel: false
      });

      try {
        console.log("开始上传..."); // 调试日志
        const result = await ImageUploadManager.uploadAll(this.vditor);
        console.log("上传结果:", result); // 调试日志

        if (result.success > 0) {
          this.setState({
            uploadStatus: `✅ 上传完成！成功 ${result.success}/${pendingCount} 张`
          });
          setTimeout(() => this.setState({ uploadStatus: null }), 5000);
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
        console.error('上传过程出错:', error); // 输出完整的错误信息
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
        }, isUploading ? '上传中...' : '🚀 开始上传'),

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
          
          // 注意：在这里我们不合并分支，因为这会在每次保存时触发
          // 我们只在发布时合并分支，因此这部分留空
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

  if (typeof Vditor !== 'undefined') {
    init();
  } else {
    const checkVditor = () => {
      typeof Vditor !== 'undefined' ? init() : setTimeout(checkVditor, 100);
    };
    checkVditor();
  }

})();