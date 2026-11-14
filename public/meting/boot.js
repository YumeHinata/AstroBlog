/**
 * astro-meting-player · 免编译独立加载器（纯 IIFE，无构建依赖）
 * ------------------------------------------------------------------
 * 用法：把整个 client/ 目录拷到博客 public/meting/（或任意静态目录），页面加：
 *   <script src="/meting/boot.js"></script>
 * 配置放在同目录 config.js（设置 window.MetingPlayerConfig），改 config.js 即可
 * 热更新，无需重新编译 Astro / 重新 build。也可在引入本脚本前 inline 设置全局配置。
 *
 * 加载顺序：config.js(可选) → APlayer.css → APlayer.js → Meting.js → 适配层 → 核心 → setup。
 * APlayer/MetingJS 默认读本目录 vendor/ 下的静态 JS（国内可靠）；在 config 里填
 * aplayerJs / aplayerCss / metingJs 可切换为 CDN（如 jsdelivr）实现零本地文件。
 * 本文件与适配层/核心均为经典脚本，不经过任何打包器，EdgeOne 纯静态部署即可。
 *
 * SPA 兼容：window 级单例守卫保证整站只 boot 一次（swup 的 ScriptsPlugin 每次导航
 * 会重跑 document 内所有脚本，无守卫会重复挂载播放器）；播放器本体挂在 body 上随
 * swup 持久化，动态注入的 CSS 会在导航后被 HeadPlugin 移除，故在 Astro 生命周期
 * 事件（@swup/astro 会派发 astro:after-swap / astro:page-load）里补回。
 */
(function () {
  'use strict';

  // 单例守卫：swup 导航重跑本脚本时直接返回，避免重复加载 / 重复挂载播放器。
  if (window.__metingPlayerBooted) return;
  window.__metingPlayerBooted = true;

  var current = document.currentScript;
  var base = current && current.src ? current.src.replace(/[^/]*$/, '') : '/meting/';

  // 版本号由注入片段写入 window.__metingVer（集中在 astro.config.mjs 一处维护）。
  // 给加载链加 ?v= 形成新缓存键，绕过 EdgeOne 边缘缓存，改版后访客立即取新代码。
  var VER = window.__metingVer || '';
  var q = VER ? '?v=' + VER : '';

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      // 标记后 swup ScriptsPlugin 不会重跑这些脚本（防止 Meting 重复 define 报错）。
      s.setAttribute('data-swup-ignore-script', '');
      s.onload = resolve;
      s.onerror = function () { reject(new Error('加载失败: ' + src)); };
      document.head.appendChild(s);
    });
  }
  function loadCss(href) {
    // 静态 head 已有同 href 样式表（推荐做法）则不重复注入，也不改动它，
    // 避免被 swup HeadPlugin 当作差异摘除再补回造成播放器 UI 闪烁。
    var existing = document.querySelectorAll('link[rel="stylesheet"]');
    for (var i = 0; i < existing.length; i++) {
      if (existing[i].href === href) return;
    }
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.setAttribute('data-meting-player', '');
    document.head.appendChild(l);
  }

  function boot() {
    var CFG = window.MetingPlayerConfig || {};
    if (CFG.enabled === false) return;
    var cssHref = CFG.aplayerCss || base + 'vendor/APlayer.min.css';
    loadCss(cssHref);
    // swup HeadPlugin 导航后会移除动态 CSS；静态 head 已含则 loadCss 按 href 去重直接返回。
    function ensureCss() { loadCss(cssHref); }
    document.addEventListener('astro:after-swap', ensureCss);
    document.addEventListener('astro:page-load', ensureCss);
    loadScript(CFG.aplayerJs || (base + 'vendor/APlayer.min.js' + q))
      .then(function () { return loadScript(CFG.metingJs || (base + 'vendor/Meting.min.js' + q)); })
      .then(function () { return loadScript(base + 'meting-adapter.js' + q); })
      .then(function () { return loadScript(base + 'player-core.js' + q); })
      .then(function () { window.MetingPlayerCore.setup(CFG); })
      .catch(function (err) { if (window.console) console.error('[meting-player]', err); });
  }

  // 同目录 config.js 可选：存在则先加载以注入 window.MetingPlayerConfig
  loadScript(base + 'config.js' + q).catch(function () { /* 无 config.js，用 inline 全局或默认 */ }).then(boot);
})();