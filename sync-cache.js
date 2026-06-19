import fs from 'node:fs';
import path from 'node:path';

// 1. 确定插件生成的最新、最正确的源文件
const sourcePath = './public/.astro-indexnow-cache.json';

if (!fs.existsSync(sourcePath)) {
    console.error(`❌ [Cache Sync] 错误：找不到源缓存文件 ${sourcePath}`);
    process.exit(0);
}

const sourceSize = fs.statSync(sourcePath).size;
console.log(`📦 [Cache Sync] 探测到源文件大小为: ${sourceSize} 字节。开始全盘地毯式强推覆盖...`);

// 2. 递归扫描全盘（包含隐藏目录如 .edgeone），见一个杀一个，全部替换
function syncEverywhere(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);

        // 跳过 node_modules 和 .git 提高扫描速度
        if (file === 'node_modules' || file === '.git') continue;

        if (fs.statSync(fullPath).isDirectory()) {
            syncEverywhere(fullPath);
        } else if (file === '.astro-indexnow-cache.json') {
            // 排除掉源文件自身，防止套娃
            if (path.normalize(fullPath) !== path.normalize(sourcePath)) {
                try {
                    fs.copyFileSync(sourcePath, fullPath);
                    console.log(`🚀 [Cache Sync] 强行覆盖成功 -> ${fullPath} (现已同步为 ${fs.statSync(fullPath).size} 字节)`);
                } catch (err) {
                    console.error(`❌ [Cache Sync] 覆盖失败 -> ${fullPath}:`, err.message);
                }
            }
        }
    }
}

syncEverywhere('.');
console.log('✨ [Cache Sync] 全盘盲区同步彻底完成！');