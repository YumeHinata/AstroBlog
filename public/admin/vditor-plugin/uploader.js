// vditor-plugin/uploader.js - Decap CMS 图片上传模块
(function() {
  'use strict';

  console.log('📤 Vditor 图片上传模块加载...');

  const Uploader = {
    config: {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      debug: true
    },

    // 主上传处理函数
    async handleUpload(files) {
      if (!files || !files.length) return [];
      
      this.log(`开始上传 ${files.length} 个文件`);
      const results = [];
      
      for (const file of files) {
        try {
          const result = await this.uploadSingle(file);
          results.push(result);
        } catch (error) {
          this.log(`文件 ${file.name} 上传失败:`, error);
          results.push({
            url: '',
            alt: file.name,
            error: error.message
          });
        }
      }
      
      return results;
    },

    // 单文件上传
    async uploadSingle(file) {
      // 1. 验证文件
      this.validateFile(file);
      
      // 2. 准备上传数据
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);
      formData.append('type', file.type);
      
      // 3. 调用 Decap CMS 上传 API
      const result = await this.callCmsApi(file);
      
      // 4. 返回 Vditor 需要的格式
      return {
        url: result.url,
        alt: file.name,
        title: file.name,
        width: result.width,
        height: result.height
      };
    },

    // 文件验证
    validateFile(file) {
      if (!file) throw new Error('文件无效');
      
      if (file.size > this.config.maxSize) {
        throw new Error(`文件大小不能超过 ${this.config.maxSize / 1024 / 1024}MB`);
      }
      
      if (!this.config.allowedTypes.includes(file.type)) {
        throw new Error(`不支持的文件类型: ${file.type}`);
      }
    },

    // 调用 Decap CMS API
    async callCmsApi(file) {
      return new Promise((resolve, reject) => {
        if (!window.CMS || !window.CMS.mediaLibrary) {
          reject(new Error('CMS 媒体库不可用'));
          return;
        }

        // 获取当前配置的媒体文件夹
        const config = window.CMS.getConfig();
        const mediaFolder = config.media_folder || 'static/images';
        const publicFolder = config.public_folder || '/images';
        
        // 创建文件对象
        const cmsFile = {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        };
        
        // 使用 CMS 的持久化存储
        const storage = window.CMS.getMediaLibrary();
        if (!storage || !storage.persist) {
          reject(new Error('媒体存储不可用'));
          return;
        }
        
        // 读取文件为 Data URL
        const reader = new FileReader();
        reader.onload = (e) => {
          const fileData = {
            name: file.name,
            path: `${mediaFolder}/${Date.now()}-${file.name}`,
            url: e.target.result,
            size: file.size,
            type: file.type
          };
          
          // 模拟上传到 GitHub（实际应根据你的后端调整）
          setTimeout(() => {
            // 这里应该替换为你的实际上传逻辑
            const mockUrl = `${publicFolder}/${Date.now()}-${file.name}`;
            
            resolve({
              url: mockUrl,
              name: file.name,
              path: fileData.path,
              size: file.size,
              width: 0, // 可从图片元数据获取
              height: 0
            });
            
            this.log(`文件上传完成: ${file.name} -> ${mockUrl}`);
          }, 500);
        };
        
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsDataURL(file);
      });
    },

    // 获取图片尺寸（辅助函数）
    getImageDimensions(file) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => resolve({ width: 0, height: 0 });
        img.src = URL.createObjectURL(file);
      });
    },

    // 日志函数
    log(...args) {
      if (this.config.debug) {
        console.log('[Vditor上传器]', ...args);
      }
    },

    // 设置配置
    setConfig(newConfig) {
      Object.assign(this.config, newConfig);
    },

    // 测试函数
    test() {
      console.log('上传模块测试:', this.config);
      return '上传模块运行正常';
    }
  };

  // 暴露到全局
  window.vditorUploader = Uploader;
  
  // 自动初始化
  function init() {
    // 等待 CMS 加载
    if (!window.CMS) {
      setTimeout(init, 500);
      return;
    }
    
    console.log('✅ Vditor 上传模块就绪');
    
    // 监听媒体库事件（可选）
    if (window.CMS.events) {
      window.CMS.events.subscribe('mediaLibrary:upload', (data) => {
        Uploader.log('CMS 媒体库上传事件:', data);
      });
    }
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 1000);
  }
})();