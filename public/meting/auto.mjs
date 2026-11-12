/**
 * astro-meting-player · Vite 客户端入口
 * ------------------------------------------------------------------
 * 由 Astro 集成通过 injectScript 注入到每个页面。
 *
 * stock APlayer / MetingJS 以 ?url 资产 + 经典 <script> 加载（与静态 demo 完全
 * 同路径），避免打包器把 UMD 转成 CJS 壳而丢失 window.APlayer / window.MetingJSElement。
 * 适配层 / 核心为纯 IIFE ESM，直接 import；样式经 ?inline 注入单个 <style>。
 * 核心逻辑与静态 demo 共用 core.js，保证两条加载路径行为一致。
 *
 * 时序：vendor 经典脚本加载完成后才 install() + 创建 <meting-js>，
 *       确保 _parse 补丁先于 connectedCallback 生效（不依赖 SSR 标签）。
 */
import aplayerUrl from './vendor/APlayer.min.js?url';
import metingUrl from './vendor/Meting.min.js?url';
import './meting-adapter.js';
import './core.js';
import { injectStyles } from './styles.js';

function loadClassic(src) {
  return new Promise(function (resolve, reject) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = function () { reject(new Error('加载失败: ' + src)); };
    document.head.appendChild(s);
  });
}

var vendorReady = null;
function ensureVendor(opts) {
  if (!vendorReady) {
    // options 提供 CDN / 静态 JS URL 时优先运行时加载（免编译），否则用 bundled 资产。
    var a = (opts && opts.aplayerJs) || aplayerUrl;
    var m = (opts && opts.metingJs) || metingUrl;
    vendorReady = loadClassic(a).then(function () { return loadClassic(m); });
  }
  return vendorReady;
}

export function setup(opts) {
  injectStyles(opts);
  return ensureVendor(opts).then(function () {
    window.MetingPlayerCore.setup(opts);
  });
}

export default setup;