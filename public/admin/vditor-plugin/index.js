(function () {
  'use strict';
  if (window.decapCmsVditorPlugin) return;

  const ImageUploadManager = {
    pendingImages: [],
    isUploading: false,

    config: {
      repoOwner: 'YumeHinata',
      repoName: 'AstroBlog',
      collectionName: 'terminal',
      mediaFolder: 'src/content/posts/images',
      mediaBranch: 'cms/media-assets'
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

    extractSlugFromBranch(branchName) {
      const match = branchName.match(/cms\/terminal\/(.+)/);
      return match ? match[1] : null;
    },

    generateBranchName(slug) {
      if (!slug) throw new Error('需要slug来生成分支名');
      const safeSlug = this.slugify(slug);
      const branchName = `cms/${this.config.collectionName}/${safeSlug}`;
      console.log('[ImageUploadManager] 生成分支名:', branchName, '基于slug:', slug);
      return branchName;
    },

    // [修复] 改进的slugify函数，正确处理中文字符
    slugify(text) {
      if (!text || text.trim() === '') return 'untitled';
      
      console.log('[ImageUploadManager] slugify 输入:', text);
      
      // 保留中文字符，只移除特殊字符和空格
      let result = text
        .trim()
        .toLowerCase()
        // 保留中文字符、英文字母、数字、连字符、下划线
        .replace(/[^\u4e00-\u9fa5a-z0-9_\s-]/g, '')
        // 将连续的空格、下划线、连字符替换为单个连字符
        .replace(/[\s_-]+/g, '-')
        // 移除开头和结尾的连字符
        .replace(/^-+|-+$/g, '');
      
      console.log('[ImageUploadManager] slugify 输出:', result);
      return result;
    },

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

    // [修复] 改进的文件名处理，避免中文字符被错误转换
    calculatePaths(filename, slug) {
      const mediaFolder = this.config.mediaFolder.replace(/^\//, '');
      
      // 使用安全的文件名处理
      const safeFilename = this.safeFilename(filename);
      
      // 使用slug作为文件夹名
      const folderName = this.slugify(slug);
      
      console.log('[ImageUploadManager] calculatePaths:', {
        originalName: filename,
        safeFilename,
        folderName,
        slug
      });
      
      // 路径：媒体文件夹/slug/文件名
      const pathInRepo = `${mediaFolder}/${folderName}/${safeFilename}`;
      // Markdown路径：相对于文章位置的路径
      const markdownPath = `./images/${folderName}/${safeFilename}`;
      
      return { pathInRepo, markdownPath, folderName };
    },

    // [新增] 安全的文件名处理函数
    safeFilename(filename) {
      // 获取文件名和扩展名
      const lastDotIndex = filename.lastIndexOf('.');
      const name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
      const ext = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';
      
      // 处理文件名部分，保留中文字符
      const safeName = name
        // 移除非法字符，但保留中文字符
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
      
      return safeName + ext;
    },

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

    // [修复] 改进的媒体文件夹检查，添加详细日志
    async checkMediaFolderExists(token, slug) {
      const { repoOwner, repoName, mediaBranch } = this.config;
      const folderName = this.slugify(slug);
      const mediaFolder = `${this.config.mediaFolder}/${folderName}`;
      
      const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${encodeURIComponent(mediaFolder)}?ref=${mediaBranch}`;
      console.log('[ImageUploadManager] 检查媒体文件夹:', {
        slug,
        folderName,
        mediaFolder,
        url
      });

      try {
        const res = await fetch(url, {
          headers: { Authorization: `token ${token}` }
        });
        
        console.log('[ImageUploadManager] 检查结果状态:', res.status);
        
        if (res.status === 200) {
          const data = await res.json();
          console.log('[ImageUploadManager] 文件夹内容:', data);
          return true;
        } else if (res.status === 404) {
          console.log('[ImageUploadManager] 文件夹不存在');
          return false;
        } else {
          console.warn('[ImageUploadManager] 检查文件夹异常状态:', res.status);
          return false;
        }
      } catch (error) {
        console.error('[ImageUploadManager] 检查媒体文件夹失败:', error);
        return false;
      }
    },

    // [修复] 改进的上传到媒体分支，确保上传成功
    async uploadToMediaBranch(vditorInstance, slug, docTitle) {
      if (this.pendingImages.length === 0) throw new Error('没有图片需要上传');
      if (this.isUploading) throw new Error('上传正在进行中');

      this.isUploading = true;
      console.log('[ImageUploadManager] 上传到媒体分支，slug:', slug, 'docTitle:', docTitle);

      const token = this.getToken();
      const { repoOwner, repoName, mediaBranch } = this.config;
      const commitCfg = this.commitConfig;

      const results = { 
        success: 0, 
        errors: [], 
        markdowns: [],
        uploadedFiles: []
      };

      try {
        // 确保媒体分支存在
        console.log('[ImageUploadManager] 确保媒体分支存在...');
        await this.ensureMediaBranchExists(token);
        console.log('[ImageUploadManager] 媒体分支已确认存在');
        
        for (const img of this.pendingImages) {
          try {
            const { pathInRepo, markdownPath } = this.calculatePaths(img.name, slug);
            console.log('[ImageUploadManager] 上传图片:', {
              originalName: img.name,
              pathInRepo,
              markdownPath,
              size: img.size
            });

            const content = await this.fileToBase64(img.file);

            // 上传到媒体分支
            console.log(`[ImageUploadManager] 调用pushToGitHub: ${img.name} -> ${mediaBranch}`);
            const uploadResult = await this.pushToGitHub(
              token, 
              repoOwner, 
              repoName, 
              pathInRepo, 
              content, 
              mediaBranch, 
              commitCfg, 
              img.name
            );
            
            console.log('[ImageUploadManager] 上传结果:', uploadResult);

            results.success++;
            results.markdowns.push(`![${img.name}](${markdownPath})`);
            results.uploadedFiles.push(markdownPath);

            // 清理预览
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

        // 插入Markdown到编辑器
        if (results.markdowns.length > 0 && vditorInstance) {
          try {
            vditorInstance.insertValue('\n' + results.markdowns.join('\n') + '\n');
          } catch (e) {
            console.error('[ImageUploadManager] 插入Markdown失败:', e);
          }
        }

        this.pendingImages = [];
        console.log('[ImageUploadManager] 上传完成，结果:', results);
        return results;
      } finally {
        this.isUploading = false;
      }
    },

    // [修复] 确保媒体分支存在，添加重试机制
    async ensureMediaBranchExists(token) {
      const { repoOwner, repoName, mediaBranch } = this.config;
      
      console.log('[ImageUploadManager] 确保媒体分支存在:', mediaBranch);
      
      try {
        const exists = await this.checkBranchExists(token, mediaBranch);
        if (!exists) {
          console.log('[ImageUploadManager] 创建媒体分支:', mediaBranch);
          await this.createBranchFromMain(token, mediaBranch);
        } else {
          console.log('[ImageUploadManager] 媒体分支已存在');
        }
        return true;
      } catch (error) {
        console.error('[ImageUploadManager] 确保媒体分支存在失败:', error);
        throw new Error(`无法创建媒体分支: ${error.message}`);
      }
    },

    async createBranchFromMain(token, branchName) {
      const { repoOwner, repoName } = this.config;
      
      console.log('[ImageUploadManager] 从main分支创建分支:', branchName);
      
      // 获取main分支的最新提交SHA
      const refUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/git/refs/heads/main`;
      const refRes = await fetch(refUrl, {
        headers: { Authorization: `token ${token}` }
      });
      
      if (!refRes.ok) {
        throw new Error(`无法获取main分支信息: ${refRes.status}`);
      }
      
      const refData = await refRes.json();
      const mainSha = refData.object.sha;
      
      // 创建新分支
      const createUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/git/refs`;
      const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: mainSha
        })
      });
      
      if (!createRes.ok && createRes.status !== 409) {
        const errorData = await createRes.json();
        throw new Error(`创建分支失败: ${errorData.message}`);
      }
      
      console.log(`[ImageUploadManager] 分支 ${branchName} 已创建或已存在`);
      return true;
    },

    // [修复] 改进的合并媒体文件到main分支，确保合并执行
    async mergeMediaToMain(slug, docTitle) {
      console.log(`[ImageUploadManager] 开始合并媒体文件到main分支，slug: ${slug}`);
      
      const token = this.getToken();
      if (!token) {
        throw new Error('未登录，无法合并媒体');
      }
      
      const { repoOwner, repoName, mediaBranch } = this.config;
      
      // 检查是否有媒体文件需要合并
      const hasMedia = await this.checkMediaFolderExists(token, slug);
      
      if (!hasMedia) {
        console.log('[ImageUploadManager] 没有媒体文件需要合并');
        return { 
          success: true, 
          mergedCount: 0, 
          message: '没有找到媒体文件需要合并，可能图片未上传到媒体分支' 
        };
      }
      
      // 获取媒体文件夹中的所有文件
      const folderName = this.slugify(slug);
      const mediaFolder = `${this.config.mediaFolder}/${folderName}`;
      
      console.log(`[ImageUploadManager] 获取文件夹内容: ${mediaFolder}`);
      
      try {
        // 获取文件夹内容
        const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${encodeURIComponent(mediaFolder)}?ref=${mediaBranch}`;
        console.log('[ImageUploadManager] 获取文件夹URL:', url);
        
        const res = await fetch(url, {
          headers: { Authorization: `token ${token}` }
        });
        
        if (!res.ok) {
          console.error('[ImageUploadManager] 获取文件夹内容失败:', res.status);
          throw new Error(`无法获取媒体文件夹: ${res.status}`);
        }
        
        const contents = await res.json();
        console.log('[ImageUploadManager] 文件夹内容:', contents);
        
        // 过滤出文件
        const files = contents.filter(item => item.type === 'file');
        console.log(`[ImageUploadManager] 找到 ${files.length} 个文件需要合并`);
        
        if (files.length === 0) {
          return { 
            success: true, 
            mergedCount: 0, 
            message: '文件夹中没有文件需要合并' 
          };
        }
        
        // 批量处理所有文件
        const result = await this.batchCopyFilesToMain(token, files, docTitle);
        
        return result;
      } catch (error) {
        console.error('[ImageUploadManager] 合并媒体文件失败:', error);
        throw error;
      }
    },
    
    // [新增] 批量复制文件到main分支，使用Git Tree API一次性提交所有文件
    async batchCopyFilesToMain(token, files, docTitle) {
      const { repoOwner, repoName } = this.config;
      
      console.log(`[ImageUploadManager] 批量复制 ${files.length} 个文件到main分支`);
      
      try {
        // 1. 获取main分支的最新提交SHA
        const mainBranchInfo = await this.getBranchInfo(token, repoOwner, repoName, 'main');
        const latestCommitSha = mainBranchInfo.commit.sha;
        console.log('[ImageUploadManager] 最新提交SHA:', latestCommitSha);
        
        // 2. 获取该提交对应的tree SHA
        const commitDetails = await this.getCommitDetails(token, repoOwner, repoName, latestCommitSha);
        const baseTreeSha = commitDetails.commit.tree.sha;
        console.log('[ImageUploadManager] 基础Tree SHA:', baseTreeSha);
        
        // 3. 为所有文件准备新的tree
        const newTreeItems = [];
        
        for (const file of files) {
          // 获取每个文件的内容
          const fileContent = await this.getFileContentFromBranch(token, repoOwner, repoName, file.path, this.config.mediaBranch);
          
          // 添加到新tree项
          newTreeItems.push({
            path: file.path,
            mode: '100644', // 文件模式
            type: 'blob',
            content: fileContent
          });
        }
        
        // 4. 创建新的tree
        const newTree = await this.createTree(token, repoOwner, repoName, baseTreeSha, newTreeItems);
        console.log('[ImageUploadManager] 新Tree创建成功:', newTree.sha);
        
        // 5. 创建新的提交，指向这个tree
        const commitMessage = `chore: add media files for "${docTitle}" (${files.length} files)`;
        const newCommit = await this.createCommit(token, repoOwner, repoName, commitMessage, newTree.sha, [latestCommitSha]);
        console.log('[ImageUploadManager] 新提交创建成功:', newCommit.sha);
        
        // 6. 更新main分支引用到新提交
        const updateRefResult = await this.updateReference(token, repoOwner, repoName, 'main', newCommit.sha);
        console.log('[ImageUploadManager] 分支引用更新成功:', updateRefResult);
        
        console.log(`[ImageUploadManager] 成功批量合并 ${files.length} 个文件到main分支`);
        return {
          success: true,
          mergedCount: files.length,
          errorCount: 0,
          message: `成功批量合并 ${files.length} 个文件到main分支`
        };
      } catch (error) {
        console.error('[ImageUploadManager] 批量复制文件失败:', error);
        throw error;
      }
    },
    
    // 获取分支信息
    async getBranchInfo(token, owner, repo, branch) {
      const url = `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`;
      const response = await fetch(url, {
        headers: { Authorization: `token ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`获取分支信息失败: ${errorData.message || response.status}`);
      }
      
      return await response.json();
    },
    
    // 获取提交详情
    async getCommitDetails(token, owner, repo, commitSha) {
      const url = `https://api.github.com/repos/${owner}/${repo}/git/commits/${commitSha}`;
      const response = await fetch(url, {
        headers: { Authorization: `token ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`获取提交详情失败: ${errorData.message || response.status}`);
      }
      
      return await response.json();
    },
    
    // 从指定分支获取文件内容
    async getFileContentFromBranch(token, owner, repo, filePath, branch) {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}?ref=${branch}`;
      const response = await fetch(url, {
        headers: { Authorization: `token ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`获取文件内容失败: ${errorData.message || response.status}`);
      }
      
      const data = await response.json();
      return atob(data.content); // 解码base64内容
    },
    
    // 创建Git tree
    async createTree(token, owner, repo, baseTreeSha, treeItems) {
      const url = `https://api.github.com/repos/${owner}/${repo}/git/trees`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeItems
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`创建Tree失败: ${errorData.message || response.status}`);
      }
      
      return await response.json();
    },
    
    // 创建提交
    async createCommit(token, owner, repo, message, treeSha, parentShas) {
      const url = `https://api.github.com/repos/${owner}/${repo}/git/commits`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          tree: treeSha,
          parents: parentShas
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`创建提交失败: ${errorData.message || response.status}`);
      }
      
      return await response.json();
    },
    
    // 更新引用
    async updateReference(token, owner, repo, ref, sha) {
      const url = `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${ref}`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sha,
          force: false
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`更新引用失败: ${errorData.message || response.status}`);
      }
      
      return await response.json();
    },

    // [修复] 改进的复制文件到main分支
    async copyFileToMain(token, filePath, docTitle) {
      const { repoOwner, repoName, mediaBranch } = this.config;
      const fileName = filePath.split('/').pop();
      
      console.log(`[ImageUploadManager] 复制文件到main: ${fileName}`);
      
      try {
        // 获取文件内容
        const fileUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${encodeURIComponent(filePath)}?ref=${mediaBranch}`;
        console.log('[ImageUploadManager] 获取文件URL:', fileUrl);
        
        const fileRes = await fetch(fileUrl, {
          headers: { Authorization: `token ${token}` }
        });
        
        if (!fileRes.ok) {
          console.error('[ImageUploadManager] 获取文件失败:', fileRes.status);
          throw new Error(`无法获取文件: ${fileRes.status}`);
        }
        
        const fileData = await fileRes.json();
        console.log('[ImageUploadManager] 文件数据获取成功');
        
        // 上传到main分支
        const uploadUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${encodeURIComponent(filePath)}`;
        
        const body = {
          message: `chore: add media file for "${docTitle}" - ${fileName}`,
          content: fileData.content,
          branch: 'main'
        };
        
        console.log('[ImageUploadManager] 准备上传到main分支');
        
        // 检查文件是否已存在于main分支
        try {
          const existingRes = await fetch(uploadUrl + '?ref=main', {
            headers: { Authorization: `token ${token}` }
          });
          
          if (existingRes.ok) {
            const existingData = await existingRes.json();
            body.sha = existingData.sha; // 提供SHA以更新现有文件
            console.log('[ImageUploadManager] 文件已存在于main分支，将更新');
          }
        } catch (e) {
          // 文件不存在，继续上传
          console.log('[ImageUploadManager] 文件在main分支中不存在，将创建');
        }
        
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            Authorization: `token ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify(body)
        });
        
        console.log('[ImageUploadManager] 上传响应状态:', uploadRes.status);
        
        if (!uploadRes.ok) {
          const errorData = await uploadRes.json().catch(() => ({}));
          console.error('[ImageUploadManager] 上传失败:', errorData);
          throw new Error(`上传失败: ${errorData.message || uploadRes.status}`);
        }
        
        console.log(`[ImageUploadManager] 文件已成功合并到main: ${fileName}`);
        return true;
      } catch (error) {
        console.error(`[ImageUploadManager] 复制文件失败 ${fileName}:`, error);
        throw error;
      }
    },

    async uploadAll(vditorInstance, targetBranch, slug) {
      return await this.uploadToMediaBranch(vditorInstance, slug, slug);
    },

    generateFolderName(text) {
      return this.slugify(text);
    },

    async fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = () => reject(new Error('读取文件失败'));
        reader.readAsDataURL(file);
      });
    },

    // [修复] 改进的GitHub推送，添加详细错误处理
    async pushToGitHub(token, owner, repo, path, content, branch, commitCfg, filename) {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
      console.log('[ImageUploadManager] 推送到GitHub:', {
        url,
        path,
        branch,
        filename
      });

      const body = {
        message: `${commitCfg.commitPrefix}${filename}`,
        content,
        branch,
        committer: { name: commitCfg.authorName, email: commitCfg.authorEmail },
        author: { name: commitCfg.authorName, email: commitCfg.authorEmail }
      };

      console.log('[ImageUploadManager] 请求体准备完成');

      try {
        const res = await fetch(url, {
          method: 'PUT',
          headers: {
            Authorization: `token ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify(body)
        });

        console.log('[ImageUploadManager] 响应状态:', res.status);
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error('[ImageUploadManager] 错误响应:', errorData);
          
          // 409错误表示文件已存在，这在重复上传时是正常的
          if (res.status === 409) {
            console.log(`[ImageUploadManager] 文件已存在于分支 ${branch}: ${filename}`);
            return { status: 'skipped', message: '文件已存在' };
          }
          
          throw new Error(`GitHub API错误 [${res.status}]: ${errorData.message || '未知错误'}`);
        }

        const responseData = await res.json();
        console.log('[ImageUploadManager] 推送成功:', responseData);
        return responseData;
      } catch (error) {
        console.error('[ImageUploadManager] 推送失败:', error);
        throw error;
      }
    }
  };

  // [新增] 调试工具，帮助我们了解发生了什么
  const DebugTools = {
    init() {
      console.log('[DebugTools] 初始化调试工具');
      
      // 创建调试按钮
      this.createDebugButton();
      
      // 监控网络请求
      this.monitorNetworkRequests();
      
      // 检查当前状态
      this.checkCurrentState();
    },
    
    createDebugButton() {
      const debugBtn = document.createElement('button');
      debugBtn.textContent = '🔍 调试媒体上传';
      debugBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        z-index: 9999;
        padding: 8px 16px;
        background: #6f42c1;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      `;
      
      debugBtn.addEventListener('click', () => {
        this.runDebugChecks();
      });
      
      document.body.appendChild(debugBtn);
      console.log('[DebugTools] 调试按钮已添加');
    },
    
    runDebugChecks() {
      console.log('=== 媒体上传调试信息 ===');
      
      // 检查token
      try {
        const token = ImageUploadManager.getToken();
        console.log('✅ Token可用:', token ? '是' : '否');
      } catch (e) {
        console.log('❌ Token错误:', e.message);
      }
      
      // 检查当前文章
      const slug = this.getCurrentSlug();
      const title = this.getDocTitle();
      console.log('当前文章:', { slug, title });
      
      // 检查待上传图片
      console.log('待上传图片:', ImageUploadManager.pendingImages.length);
      
      // 检查媒体分支
      const mediaBranch = ImageUploadManager.config.mediaBranch;
      console.log('媒体分支:', mediaBranch);
      
      // 检查本地存储
      const mediaRecords = localStorage.getItem('decap-media-records');
      console.log('媒体记录:', mediaRecords ? JSON.parse(mediaRecords) : '无');
      
      console.log('=== 调试结束 ===');
    },
    
    getCurrentSlug() {
      const hash = window.location.hash;
      const match = hash.match(/\/collections\/terminal\/entries\/([^\/?#]+)/);
      return match ? match[1] : null;
    },
    
    getDocTitle() {
      const titleInput = document.querySelector('[data-field="title"] input, [data-field="title"] textarea');
      return titleInput ? titleInput.value.trim() : null;
    },
    
    monitorNetworkRequests() {
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const [url, options] = args;
        
        // 监控GitHub API请求
        if (url && url.includes('github.com') && url.includes('contents')) {
          console.log('[Network] GitHub API请求:', {
            url,
            method: options?.method || 'GET',
            path: url.split('contents/')[1]?.split('?')[0]
          });
        }
        
        return originalFetch.apply(this, args);
      };
      
      console.log('[DebugTools] 网络请求监控已启用');
    },
    
    checkCurrentState() {
      // 延迟检查，等待页面加载完成
      setTimeout(() => {
        console.log('[DebugTools] 当前页面状态检查:');
        console.log('URL:', window.location.href);
        console.log('Hash:', window.location.hash);
        console.log('CMS对象:', window.CMS ? '存在' : '不存在');
        console.log('Vditor对象:', window.Vditor ? '存在' : '不存在');
      }, 2000);
    }
  };

  const DecapEventManager = {
    articleMediaMap: new Map(),
    
    init() {
      console.log('[DecapEventManager] 初始化');
      
      if (!window.CMS || !window.CMS.registerEventListener) {
        console.warn('[DecapEventManager] Decap CMS事件系统不可用');
        return false;
      }
      
      this.registerEvents();
      this.loadFromStorage();
      
      // 初始化调试工具
      DebugTools.init();
      
      return true;
    },
    
    registerEvents() {
      console.log('[DecapEventManager] 注册Decap CMS事件');
      
      // 保存草稿后：记录媒体文件
      window.CMS.registerEventListener({
        name: 'postSave',
        handler: ({ entry }) => {
          console.log('[DecapEventManager] 文章已保存', entry);
          return this.handleSave(entry);
        }
      });
      
      // 发布前：确保媒体文件已上传
      window.CMS.registerEventListener({
        name: 'prePublish',
        handler: ({ entry }) => {
          console.log('[DecapEventManager] 文章即将发布', entry);
          return this.handlePrePublish(entry);
        }
      });
      
      // 发布后：合并媒体分支到main
      window.CMS.registerEventListener({
        name: 'postPublish',
        handler: ({ entry }) => {
          console.log('[DecapEventManager] 文章已发布', entry);
          return this.handlePostPublish(entry);
        }
      });
      
      console.log('[DecapEventManager] 事件监听器已注册');
    },
    
    // [修复] 改进的slug提取
    getEntrySlug(entry) {
      console.log('[DecapEventManager] 提取slug，entry对象类型:', typeof entry);
      
      // 方法1：直接获取slug属性
      if (entry.slug) {
        console.log('[DecapEventManager] 从entry.slug获取:', entry.slug);
        return entry.slug;
      }
      
      // 方法2：使用get方法（Immutable Map）
      if (entry.get && typeof entry.get === 'function') {
        try {
          const slug = entry.get('slug');
          console.log('[DecapEventManager] 从entry.get("slug")获取:', slug);
          if (slug) return slug;
        } catch (e) {
          console.warn('[DecapEventManager] 使用get方法失败:', e);
        }
      }
      
      // 方法3：从数据中提取
      if (entry.data) {
        if (entry.data.slug) {
          console.log('[DecapEventManager] 从entry.data.slug获取:', entry.data.slug);
          return entry.data.slug;
        }
        
        if (entry.data.get && typeof entry.data.get === 'function') {
          try {
            const slug = entry.data.get('slug');
            if (slug) {
              console.log('[DecapEventManager] 从entry.data.get("slug")获取:', slug);
              return slug;
            }
          } catch (e) {
            console.warn('[DecapEventManager] 从data获取slug失败:', e);
          }
        }
      }
      
      // 方法4：从URL中提取
      const slugFromUrl = this.extractSlugFromURL();
      if (slugFromUrl) {
        console.log('[DecapEventManager] 从URL提取slug:', slugFromUrl);
        return slugFromUrl;
      }
      
      console.warn('[DecapEventManager] 无法提取slug');
      return null;
    },
    
    extractSlugFromURL() {
      const hash = window.location.hash;
      const match = hash.match(/\/collections\/terminal\/entries\/([^\/?#]+)/);
      return match ? match[1] : null;
    },
    
    getEntryTitle(entry) {
      console.log('[DecapEventManager] 提取title');
      
      if (entry.data) {
        if (entry.data.title) {
          return entry.data.title;
        }
        if (entry.data.get && typeof entry.data.get === 'function') {
          try {
            return entry.data.get('title');
          } catch (e) {
            console.warn('[DecapEventManager] 获取title失败:', e);
          }
        }
      }
      
      if (entry.get && typeof entry.get === 'function') {
        try {
          const data = entry.get('data');
          if (data && data.get) {
            return data.get('title');
          }
        } catch (e) {
          console.warn('[DecapEventManager] 使用get方法获取title失败:', e);
        }
      }
      
      // 从页面输入框获取
      const titleInput = document.querySelector('[data-field="title"] input, [data-field="title"] textarea');
      return titleInput ? titleInput.value.trim() : '未命名文章';
    },
    
    async handleSave(entry) {
      try {
        const slug = this.getEntrySlug(entry);
        const title = this.getEntryTitle(entry);
        
        if (!slug) {
          console.warn('[DecapEventManager] 无法获取文章slug');
          return Promise.resolve();
        }
        
        console.log(`[DecapEventManager] 文章保存: ${title || '无标题'} (slug: ${slug})`);
        
        // 如果有待上传图片，上传到媒体分支
        if (ImageUploadManager.pendingImages.length > 0) {
          console.log(`[DecapEventManager] 有 ${ImageUploadManager.pendingImages.length} 张图片需要上传`);
          
          try {
            const result = await ImageUploadManager.uploadToMediaBranch(
              null,
              slug,
              title || slug
            );
            
            console.log(`[DecapEventManager] 媒体文件已上传: ${result.success}个`);
            
            // 记录哪些媒体文件属于这篇文章
            if (result.uploadedFiles && result.uploadedFiles.length > 0) {
              this.recordMediaFiles(slug, result.uploadedFiles);
            }
          } catch (error) {
            console.error('[DecapEventManager] 上传图片失败:', error);
          }
        }
        
        return Promise.resolve();
      } catch (error) {
        console.error('[DecapEventManager] 保存处理失败:', error);
        return Promise.resolve();
      }
    },
    
    // [新增] 发布前处理，确保所有图片已上传
    async handlePrePublish(entry) {
      try {
        const slug = this.getEntrySlug(entry);
        const title = this.getEntryTitle(entry);
        
        if (!slug) {
          console.warn('[DecapEventManager] 无法获取文章slug');
          return Promise.resolve();
        }
        
        console.log(`[DecapEventManager] 文章即将发布: ${title || '无标题'} (slug: ${slug})`);
        
        // 检查是否还有未上传的图片
        if (ImageUploadManager.pendingImages.length > 0) {
          console.log(`[DecapEventManager] 发布前上传 ${ImageUploadManager.pendingImages.length} 张图片`);
          
          try {
            // 获取vditor实例
            const vditorInstance = window.vditorInstance;
            const result = await ImageUploadManager.uploadToMediaBranch(
              vditorInstance,
              slug,
              title || slug
            );
            
            console.log(`[DecapEventManager] 发布前图片上传完成: ${result.success}个`);
            
            if (result.uploadedFiles && result.uploadedFiles.length > 0) {
              this.recordMediaFiles(slug, result.uploadedFiles);
            }
          } catch (error) {
            console.error('[DecapEventManager] 发布前上传图片失败:', error);
          }
        }
        
        return Promise.resolve();
      } catch (error) {
        console.error('[DecapEventManager] 发布前处理失败:', error);
        return Promise.resolve();
      }
    },
    
    // [修复] 改进的发布后处理
    async handlePostPublish(entry) {
      try {
        const slug = this.getEntrySlug(entry);
        const title = this.getEntryTitle(entry);
        
        if (!slug) {
          console.warn('[DecapEventManager] 无法获取文章slug，跳过媒体合并');
          return Promise.resolve();
        }
        
        console.log(`[DecapEventManager] 文章已发布，开始合并媒体: ${title || '无标题'} (slug: ${slug})`);
        
        // 显示合并状态
        this.showNotification('开始合并媒体文件到主分支...', 'info');
        
        // 等待一小段时间，确保Decap CMS的发布流程完成
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 合并媒体分支到main
        const result = await ImageUploadManager.mergeMediaToMain(slug, title || slug);
        
        console.log('[DecapEventManager] 合并结果:', result);
        
        if (result.success && result.mergedCount > 0) {
          console.log(`[DecapEventManager] 媒体合并成功: ${result.mergedCount}个文件`);
          this.showNotification(`✅ ${result.message || '媒体文件已合并到主分支'}`, 'success');
          
          // 清理记录
          this.clearArticleMedia(slug);
        } else {
          console.warn('[DecapEventManager] 媒体合并失败或没有需要合并的文件');
          if (result.message) {
            this.showNotification(`⚠️ ${result.message}`, 'warning');
          }
        }
        
        return Promise.resolve();
      } catch (error) {
        console.error('[DecapEventManager] 发布后处理失败:', error);
        this.showNotification(`❌ 媒体合并失败: ${error.message}`, 'error');
        return Promise.resolve();
      }
    },
    
    recordMediaFiles(slug, files) {
      if (!this.articleMediaMap.has(slug)) {
        this.articleMediaMap.set(slug, new Set());
      }
      
      const fileSet = this.articleMediaMap.get(slug);
      files.forEach(file => fileSet.add(file));
      
      this.saveToStorage();
    },
    
    clearArticleMedia(slug) {
      this.articleMediaMap.delete(slug);
      this.saveToStorage();
    },
    
    saveToStorage() {
      const serialized = {};
      this.articleMediaMap.forEach((files, slug) => {
        serialized[slug] = Array.from(files);
      });
      
      localStorage.setItem('decap-media-records', JSON.stringify(serialized));
    },
    
    loadFromStorage() {
      const stored = localStorage.getItem('decap-media-records');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          Object.entries(parsed).forEach(([slug, files]) => {
            this.articleMediaMap.set(slug, new Set(files));
          });
          console.log('[DecapEventManager] 加载了历史记录:', this.articleMediaMap.size, '篇文章');
        } catch (e) {
          console.warn('[DecapEventManager] 加载存储失败:', e);
        }
      }
    },
    
    showNotification(message, type = 'info') {
      console.log(`[Notification] ${type}: ${message}`);
      
      if (window.CMS && window.CMS.showNotification) {
        window.CMS.showNotification(message, type);
        return;
      }
      
      const notification = document.createElement('div');
      notification.textContent = message;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        padding: 12px 20px;
        border-radius: 6px;
        background-color: ${this.getNotificationColor(type)};
        color: white;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
        word-break: break-word;
      `;
      
      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          notification.remove();
          style.remove();
        }, 300);
      }, 5000);
    },
    
    getNotificationColor(type) {
      switch (type) {
        case 'success': return '#2ea44f';
        case 'error': return '#cf222e';
        case 'warning': return '#d29922';
        default: return '#0366d6';
      }
    }
  };

  // VditorControl 组件
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

    // [修复] 改进的slug获取
    getCurrentSlug() {
      console.log('[VditorControl] 获取当前slug...');
      
      // 方法1：从URL中提取
      const hash = window.location.hash;
      const match = hash.match(/\/collections\/terminal\/entries\/([^\/?#]+)/);
      if (match && match[1] !== 'new') {
        const slug = decodeURIComponent(match[1]);
        console.log('[VditorControl] 从URL获取slug:', slug);
        return slug;
      }
      
      // 方法2：查找slug输入框
      const slugInput = document.querySelector('[data-field="slug"] input');
      if (slugInput && slugInput.value) {
        const slug = slugInput.value.trim();
        console.log('[VditorControl] 从slug输入框获取:', slug);
        return slug;
      }
      
      // 方法3：新文章
      if (match && match[1] === 'new') {
        console.log('[VditorControl] 新文章，无法获取slug');
        return null;
      }
      
      console.warn('[VditorControl] 无法获取slug');
      return null;
    },

    getDocTitle() {
      console.log('[VditorControl] 查找文档标题...');

      let titleInput = document.querySelector('[data-field="title"] input, [data-field="title"] textarea');

      if (!titleInput) {
        titleInput = document.querySelector('input[id*="title-field-"], textarea[id*="title-field-"]');
      }

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

      return null;
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

    // [修复] 改进的上传逻辑
    async handleUpload() {
      console.log('[VditorControl] 开始处理上传');
      const pendingCount = ImageUploadManager.pendingImages.length;
      if (pendingCount === 0) {
        console.warn('[VditorControl] 没有待上传的图片');
        this.setState({ uploadStatus: '请先选择图片' });
        return;
      }

      // 1. 获取slug
      const slug = this.getCurrentSlug();
      if (!slug) {
        console.warn('[VditorControl] 无法获取文章slug');
        this.setState({
          uploadStatus: '❌ 无法获取文章标识。请先保存文章或检查URL。',
          showUploadPanel: true
        });
        return;
      }

      console.log('[VditorControl] 文章slug:', slug);

      // 获取标题用于显示
      const docTitle = this.getDocTitle() || slug;

      this.setState({
        uploadStatus: '正在上传到媒体分支...',
        showUploadPanel: false
      });

      try {
        const result = await ImageUploadManager.uploadToMediaBranch(
          this.vditor,
          slug,
          docTitle
        );

        if (result.success > 0) {
          console.log('[VditorControl] 上传成功:', result.success, '张图片');
          this.setState({
            uploadStatus: `✅ 上传完成！${result.success}张图片已保存到媒体分支。`
          });
          setTimeout(() => this.setState({ uploadStatus: null }), 4000);
        } else {
          console.error('[VditorControl] 上传失败');
          this.setState({
            uploadStatus: '上传失败，请查看控制台。',
            showUploadPanel: true
          });
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
        version: '5.0',
        hasUpload: true,
        manager: ImageUploadManager,
        eventManager: DecapEventManager,
        debugTools: DebugTools
      };

      console.log('✅ Vditor插件已注册 (支持editorial_workflow + 媒体分支)');
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
    
    // 初始化事件管理器
    DecapEventManager.init();
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