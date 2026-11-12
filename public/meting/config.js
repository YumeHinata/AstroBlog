/**
 * astro-meting-player · 站点配置（免编译模式）
 * ------------------------------------------------------------------
 * 改本文件并重新上传即可生效，无需重新编译 / build Astro。
 * 必填 id；proxy 模式必填 proxyBase。
 */
window.MetingPlayerConfig = {
  // ---- 数据源（必填 id）----
  server: 'netease',
  type: 'playlist',        // playlist | album | song | artist | search
  id: '3095963800',        // 歌单「Defaults」

  // ---- 链路（proxy 必填 proxyBase；Cookie 仅在你的 EdgeOne 回源侧保管）----
  mode: 'proxy',           // proxy | mock
  proxyBase: 'https://www.yumehinata.com/music/163',
  mockBase: '/mock',       // mock 模式快照目录

  // ---- vendor 来源：留空读 ./vendor/ 静态文件；填 URL 走 CDN（免本地文件）----
  // aplayerJs:  'https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.js',
  // aplayerCss: 'https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.css',
  // metingJs:   'https://cdn.jsdelivr.net/npm/meting@2.0.2/dist/Meting.min.js',

  // ---- 播放器（透传原版 APlayer）----
  fixed: true,             // 吸底迷你播放器
  slideOut: true,          // 平时缩回左边缘（留封面窄条），悬停/聚焦滑出；仅 fixed 生效，false 关闭
  autoInject: true,        // 每页自动挂载
  theme: '#b7daff',        // 原版默认色
  order: 'random',         // random | list | single
  loop: 'all',             // all | one | none
  volume: 0.7,
  autoplay: false,
  preload: 'none',
  mutex: true,
  listMaxHeight: '240px',

  // ---- 适配层 ----
  lyrics: true,
  keepUnavailable: false,  // true = 受限曲目也置灰显示在列表
  bitrate: 320000,
  urlChunkSize: 100,
  enabled: true,           // false = 整站关闭播放器（无需删 script 引用）
};