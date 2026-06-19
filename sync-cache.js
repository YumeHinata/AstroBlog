import fs from 'node:fs';
import path from 'node:path';

console.log('🔍 [Cache Sync] 开始全盘检索 IndexNow 缓存文件...');

let foundPath = null;

// 1. 自动全盘扫描，外加排除无关干扰目录
function findCache(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
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

// 2. 找到后强行同步到 EdgeOne 所有的潜在静态发布目录
if (foundPath) {
    const size = fs.statSync(foundPath).size;
    console.log(`✨ [Cache Sync] 抓到你了！位于: ${foundPath}，文件大小: ${size} 字节`);

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