/**
 * astro-meting-player · 免编译独立加载器（纯 IIFE，无构建依赖）
 * ------------------------------------------------------------------
 * 用法：把整个 client/ 目录拷到博客 public/meting/（或任意静态目录），页面加：
 *   <script src="/meting/standalone.js"></script>
 * 配置放在同目录 config.js（设置 window.MetingPlayerConfig），改 config.js 即可
 * 热更新，无需重新编译 Astro / 重新 build。也可在引入本脚本前 inline 设置全局配置。
 *
 * 加载顺序：config.js(可选) → APlayer.css → APlayer.js → Meting.js → 适配层 → 核心 → setup。
 * APlayer/MetingJS 默认读本目录 vendor/ 下的静态 JS（国内可靠）；在 config 里填
 * aplayerJs / aplayerCss / metingJs 可切换为 CDN（如 jsdelivr）实现零本地文件。
 * 本文件与适配层/核心均为经典脚本，不经过任何打包器，EdgeOne 纯静态部署即可。
 */
(function () {
  'use strict';

  var current = document.currentScript;
  var base = current && current.src ? current.src.replace(/[^/]*$/, '') : '/meting/';

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('加载失败: ' + src)); };
      document.head.appendChild(s);
    });
  }
  function loadCss(href) {
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.setAttribute('data-meting-player', '');
    document.head.appendChild(l);
  }

  function boot() {
    var CFG = window.MetingPlayerConfig || {};
    if (CFG.enabled === false) return;
    loadCss(CFG.aplayerCss || base + 'vendor/APlayer.min.css');
    loadScript(CFG.aplayerJs || base + 'vendor/APlayer.min.js')
      .then(function () { return loadScript(CFG.metingJs || base + 'vendor/Meting.min.js'); })
      .then(function () { return loadScript(base + 'meting-adapter.js'); })
      .then(function () { return loadScript(base + 'core.js'); })
      .then(function () { window.MetingPlayerCore.setup(CFG); })
      .catch(function (err) { if (window.console) console.error('[meting-player]', err); });
  }

  // 同目录 config.js 可选：存在则先加载以注入 window.MetingPlayerConfig
  loadScript(base + 'config.js').catch(function () { /* 无 config.js，用 inline 全局或默认 */ }).then(boot);
})();