/**
 * astro-meting-player · 客户端核心（无导入，依赖全局 APlayer / MetingJSElement / MetingAdapter）
 * ------------------------------------------------------------------
 * 既被 Vite 入口 auto.mjs 导入，也可在静态 demo 里以 <script> 直接加载，
 * 保证两条加载路径运行完全相同的逻辑。职责：写配置、安装补丁、升级占位、
 * 自动注入吸底播放器、跨 Astro View Transitions 持久化。
 * 不附加装饰样式（圆角 / 旋转 / 配色一律原版）；仅 slideOut 边缘缩回交互注入
 * 少量位移行为样式，外观其余部分完全交给 stock APlayer.min.css。
 */
(function () {
  'use strict';

  var fixedRoot = null;
  var listenersBound = false;
  var currentOpts = null;

  // 边缘缩回（仅 fixed + narrow 迷你态）：平时左移留出封面窄条，悬停/聚焦滑出。
  // 只改 left 位移与过渡，不动圆角 / 旋转 / 配色，保持原版外观。
  function injectSlideCss() {
    if (typeof document === 'undefined') return;
    // 按 DOM 存在判断：swup HeadPlugin 导航后会移除该样式，需可重复补回。
    if (document.querySelector('style[data-meting-slideout]')) return;
    var s = document.createElement('style');
    s.setAttribute('data-meting-slideout', '');
    s.textContent =
      '.meting-slideout .aplayer.aplayer-fixed.aplayer-narrow .aplayer-body{' +
        'left:-46px;transition:left .35s cubic-bezier(.4,0,.2,1);}' +
      '.meting-slideout .aplayer.aplayer-fixed.aplayer-narrow:hover .aplayer-body,' +
      '.meting-slideout .aplayer.aplayer-fixed.aplayer-narrow:focus-within .aplayer-body{' +
        'left:0;}';
    document.head.appendChild(s);
  }

  function playerAttrs(opts, forceFixed) {
    var a = {
      server: opts.server || 'netease',
      type: opts.type || 'playlist',
      id: opts.id != null ? String(opts.id) : '',
      theme: opts.theme || '#b7daff',
      order: opts.order || 'random',
      loop: opts.loop || 'all',
      preload: opts.preload || 'none',
      volume: String(opts.volume != null ? opts.volume : 0.7),
      autoplay: String(!!opts.autoplay),
      mutex: String(opts.mutex !== false),
      listMaxHeight: opts.listMaxHeight || '240px'
    };
    a.fixed = String(forceFixed ? true : !!opts.fixed);
    if (opts.mini != null) a.mini = String(!!opts.mini);
    if (opts.listFolded != null) a['list-folded'] = String(!!opts.listFolded);
    return a;
  }

  function createElement(opts, forceFixed) {
    var el = document.createElement('meting-js');
    var attrs = playerAttrs(opts, forceFixed);
    Object.keys(attrs).forEach(function (k) {
      if (attrs[k] !== '' && attrs[k] != null) el.setAttribute(k, attrs[k]);
    });
    // lock：MetingJS 自带扩展点，置真后 disconnectedCallback 不销毁 APlayer，
    // 配合适配层 _parse「已加载即跳过」守卫，导航后重挂载而不重建 / 不中断播放。
    el.lock = true;
    if (forceFixed && opts.slideOut !== false) el.classList.add('meting-slideout');
    return el;
  }

  function upgradePlaceholders(opts) {
    var slots = document.querySelectorAll('[data-meting]:not([data-meting-done])');
    Array.prototype.forEach.call(slots, function (slot) {
      var cfg;
      try { cfg = JSON.parse(slot.getAttribute('data-meting') || '{}'); } catch (e) { cfg = {}; }
      var merged = Object.assign({}, opts, cfg);
      var el = createElement(merged, !!cfg.fixed);
      slot.setAttribute('data-meting-done', '1');
      slot.replaceWith(el);
    });
  }

  function ensureFixedPlayer(opts) {
    if (opts.autoInject === false) return;
    // 兜底：即使本核心被重新执行，也复用 body 里已持久化的播放器，绝不重复挂载。
    if (!fixedRoot && typeof document !== 'undefined') {
      fixedRoot = document.querySelector('meting-js[data-astro-transition-persist="meting-player"]');
    }
    if (fixedRoot) {
      if (!fixedRoot.isConnected && document.body) document.body.appendChild(fixedRoot);
      return;
    }
    if (!document.body) return;
    fixedRoot = createElement(opts, true);
    fixedRoot.setAttribute('data-astro-transition-persist', 'meting-player');
    document.body.appendChild(fixedRoot);
  }

  function bindListeners() {
    if (listenersBound) return;
    listenersBound = true;
    function refresh() {
      if (!currentOpts) return;
      if (currentOpts.slideOut !== false) injectSlideCss();
      upgradePlaceholders(currentOpts);
      ensureFixedPlayer(currentOpts);
    }
    document.addEventListener('astro:after-swap', refresh);
    document.addEventListener('astro:page-load', refresh);
  }

  function setup(opts) {
    currentOpts = Object.assign({}, opts);
    window.MetingAdapterConfig = {
      mode: currentOpts.mode === 'mock' ? 'mock' : 'proxy',
      proxyBase: currentOpts.proxyBase || '',
      mockBase: currentOpts.mockBase || '/mock',
      bitrate: currentOpts.bitrate || 320000,
      lyrics: currentOpts.lyrics !== false,
      keepUnavailable: !!currentOpts.keepUnavailable,
      urlChunkSize: currentOpts.urlChunkSize || 100,
      enabled: currentOpts.enabled !== false
    };
    if (window.MetingAdapter) window.MetingAdapter.install();
    if (currentOpts.slideOut !== false) injectSlideCss();
    upgradePlaceholders(currentOpts);
    ensureFixedPlayer(currentOpts);
    bindListeners();
  }

  // 销毁当前吸底播放器（demo 预览切换 / 重建用）
  function reset() {
    if (fixedRoot) {
      try { if (fixedRoot.aplayer) fixedRoot.aplayer.destroy(); } catch (e) {}
      fixedRoot.remove();
      fixedRoot = null;
    }
  }

  function getRoot() { return fixedRoot; }

  window.MetingPlayerCore = {
    setup: setup, reset: reset, getRoot: getRoot,
    createElement: createElement, upgradePlaceholders: upgradePlaceholders, ensureFixedPlayer: ensureFixedPlayer
  };
})();