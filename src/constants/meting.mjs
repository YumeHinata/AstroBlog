// 吸底音乐播放器版本常量（集中一处维护）。
// 升级播放器三步：① 把 public/meting@<旧版本> 文件夹改名为 public/meting@<新版本>；
// ② 只改下面的 METING_VERSION；③ 提交推送（EdgeOne 重新构建部署）。
// 新文件夹路径=新缓存键，绕过 EdgeOne 边缘缓存，访客立即取新代码（同 jsdelivr package@version）。
export const METING_VERSION = "0.1";
export const METING_BASE = `/meting@${METING_VERSION}/`;