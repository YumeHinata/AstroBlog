/**
 * astro-meting-player · 样式注入（Vite 路径专用）
 * ------------------------------------------------------------------
 * 只注入 stock APlayer.min.css，不叠加任何自定义样式（外观完全原版）。
 * 若 options.aplayerCss 提供 URL（CDN / 静态文件），改用 <link> 运行时加载；
 * 否则用 Vite `?inline` 取回包内 CSS 文本注入单个 <style>（注入式 page script
 * 的裸 CSS import 在 Astro client build 中可能被丢弃）。静态 demo 路径仍用 <link>。
 */
import aplayerCss from './vendor/APlayer.min.css?inline';

let injected = false;
export function injectStyles(opts) {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  if (opts && opts.aplayerCss) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = opts.aplayerCss;
    link.setAttribute('data-meting-player', '');
    document.head.appendChild(link);
    return;
  }
  const style = document.createElement('style');
  style.setAttribute('data-meting-player', '');
  style.textContent = aplayerCss;
  document.head.appendChild(style);
}