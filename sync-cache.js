const fs = require('node:fs');
const path = require('node:path');

console.log('🔍 [Cache Sync] 开始全盘检索 IndexNow 缓存文件...');

let foundPath = null;

// 1. 自动全盘扫描，揪出插件到底把文件写在哪个犄角旮旯了
function findCache(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            // 跳过无关目录，防止死循环
            if (!['node_modules', '.git', 'dist', '.edgeone'].includes(file)) {
                findCache(fullPath);
            }
        } else if (file === '.astro-indexnow-cache.json') {
            foundPath = fullPath;
            break;
        }
    }
}

findCache('.');

// 2. 找到后强行同步到最终的线上传输目录
if (foundPath) {
    const size = fs.statSync(foundPath).size;
    console.log(`✨ [Cache Sync] 抓到你了！位于: ${foundPath}，文件大小: ${size} 字节`);

    // 无论 EdgeOne 认哪个目录，我们给它所有可能的地方都复制一份，确保万无一失
    const targets = [
        './dist/.astro-indexnow-cache.json',
        './dist/client/.astro-indexnow-cache.json'
    ];

    targets.forEach(target => {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(foundPath, target);
        console.log(`🚀 [Cache Sync] 已成功强制覆盖到: ${target}`);
    });
} else {
    console.log('❌ [Cache Sync] 警告：在当前工作区未找到任何 .astro-indexnow-cache.json 文件！');
}