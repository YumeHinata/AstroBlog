/**
 * MetingJS 兼容适配层（生产版 · 路线 B）
 * ------------------------------------------------------------------
 * 在 MetingJS 与网易云原生接口之间做「请求映射 + 响应标准化 + 错误处理」。
 * 不重写 APlayer 内核，不替换 MetingJS 的播放器管理 / 生命周期 / 初始化。
 * 仅扩展 MetingJSElement.prototype._parse；_init / _loadPlayer /
 * connectedCallback / disconnectedCallback 全部保留。<meting-js> 用法不变。
 *
 * 数据契约：_loadPlayer([{ name, artist, url, cover, lrc }])，强制 lrcType=1
 * （内联歌词文本），因为原生歌词接口返回 JSON 且无 CORS。
 *
 * 安全：本文件公开、不含任何 Cookie / 密钥。Cookie 由 EdgeOne 回源请求头注入。
 * 安装由 auto.mjs 在写入 window.MetingAdapterConfig 后显式调用 install()。
 */
(function () {
  'use strict';

  var MODE, PROXY_BASE, MOCK_BASE, BR, LYRICS, KEEP_UNAVAILABLE, CHUNK, ENABLED;
  function syncConfig() {
    var CFG = window.MetingAdapterConfig || {};
    MODE = CFG.mode === 'proxy' ? 'proxy' : 'mock';
    PROXY_BASE = (CFG.proxyBase || '').replace(/\/$/, '');
    MOCK_BASE = (CFG.mockBase || '/mock').replace(/\/$/, '');
    BR = CFG.bitrate || 320000;
    LYRICS = CFG.lyrics !== false;
    KEEP_UNAVAILABLE = !!CFG.keepUnavailable;
    CHUNK = CFG.urlChunkSize || 100;
    ENABLED = CFG.enabled !== false;
  }
  syncConfig();

  function httpsUpgrade(u) {
    return typeof u === 'string' ? u.replace(/^http:\/\//i, 'https://') : u;
  }
  function enc(s) { return encodeURIComponent(String(s)); }
  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // ---------- 请求映射：Meting type → 网易云原生 GET 路径 ----------
  function nativeListPath(meta) {
    var id = meta.id;
    switch (meta.type) {
      case 'playlist': return '/api/v3/playlist/detail?id=' + enc(id) + '&n=1000&s=0';
      case 'song':     return '/api/song/detail/?id=' + enc(id) + '&ids=[' + enc(id) + ']';
      case 'album':    return '/api/album/' + enc(id);
      case 'artist':   return '/api/artist/' + enc(id);
      case 'search':   return '/api/search/get?s=' + enc(id) + '&type=1&limit=30&offset=0';
      default: throw new Error('不支持的 type: ' + meta.type);
    }
  }
  function nativeUrlPath(ids) {
    return '/api/song/enhance/player/url?ids=[' + ids.map(enc).join(',') + ']&br=' + BR;
  }
  function nativeSongsPath(ids) {
    return '/api/song/detail/?id=' + enc(ids[0]) + '&ids=[' + ids.map(enc).join(',') + ']';
  }
  function nativeLyricPath(id) {
    return '/api/song/lyric?id=' + enc(id) + '&lv=-1&kv=-1&tv=-1';
  }

  function mockFile(kind, id) {
    if (kind === 'list') return MOCK_BASE + '/playlist.json';
    if (kind === 'songs') return MOCK_BASE + '/songs.json';
    if (kind === 'url') return MOCK_BASE + '/url.json';
    if (kind === 'lyric') return MOCK_BASE + '/lyric-' + id + '.json';
    throw new Error('未知 mock 类型 ' + kind);
  }

  function fetchOnce(url) {
    return fetch(url, { credentials: 'omit' }).then(function (res) {
      if (!res.ok) throw new Error('上游 HTTP ' + res.status + ' (' + url + ')');
      return res.json();
    });
  }
  function fetchJSON(kind, path, id) {
    var url = MODE === 'proxy' ? PROXY_BASE + path : mockFile(kind, id);
    if (MODE === 'proxy' && !PROXY_BASE) {
      return Promise.reject(new Error('proxy 模式未配置 proxyBase'));
    }
    // 网易云偶发风控 -462：退避重试一次（仅 proxy）
    return fetchOnce(url).then(function (json) {
      if (MODE === 'proxy' && json && json.code === -462) {
        return delay(800).then(function () { return fetchOnce(url); });
      }
      return json;
    });
  }

  // ---------- 响应标准化 ----------
  function assertCode(json) {
    if (!json || typeof json !== 'object') throw new Error('上游返回非 JSON 对象');
    if (json.code !== 200) {
      var msg = (json.data && json.data.blockText) || json.message || ('上游 code=' + json.code);
      var e = new Error(msg); e.upstreamCode = json.code; throw e;
    }
  }
  function extractTracks(json, type) {
    assertCode(json);
    switch (type) {
      case 'playlist': return (json.result && json.result.tracks) || (json.playlist && json.playlist.tracks) || [];
      case 'song':     return json.songs || [];
      case 'album':    return json.songs || (json.album && json.album.songs) || [];
      case 'artist':   return json.hotSongs || [];
      case 'search':   return (json.result && json.result.songs) || [];
      default: return [];
    }
  }
  function normalizeTrack(t) {
    var artists = t.ar || t.artists || [];
    var album = t.al || t.album || {};
    return {
      id: t.id,
      name: t.name || '未知歌曲',
      artist: artists.map(function (a) { return a.name; }).filter(Boolean).join(' / ') || '未知歌手',
      cover: httpsUpgrade(album.picUrl || '')
    };
  }

  // ---------- 大歌单：v3 只水合前若干首，其余用 song/detail 批量补齐 ----------
  function playlistTrackIds(json) {
    var p = json.playlist || json.result || {};
    return (p.trackIds || []).map(function (t) { return t.id || t; });
  }
  function hydrateTracks(tracks, ids) {
    var have = {}; tracks.forEach(function (t) { have[t.id] = 1; });
    var missing = ids.filter(function (id) { return !have[id]; });
    if (!missing.length) return Promise.resolve(tracks);
    var chunks = []; for (var i = 0; i < missing.length; i += 100) chunks.push(missing.slice(i, i + 100));
    return Promise.all(chunks.map(function (c) {
      return fetchJSON('songs', nativeSongsPath(c)).then(function (j) { assertCode(j); return j.songs || []; });
    })).then(function (arrs) {
      var all = tracks.concat([].concat.apply([], arrs));
      var byId = {}; all.forEach(function (t) { byId[t.id] = t; });
      return ids.map(function (id) { return byId[id]; }).filter(Boolean);
    });
  }

  // ---------- 播放地址批量解析 ----------
  function resolveUrls(ids) {
    var map = {};
    var chunks = [];
    for (var i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK));
    return Promise.all(chunks.map(function (chunk) {
      return fetchJSON('url', nativeUrlPath(chunk)).then(function (json) {
        assertCode(json);
        (json.data || []).forEach(function (d) {
          map[d.id] = d.url ? { url: httpsUpgrade(d.url), br: d.br, expi: d.expi } : null;
        });
      });
    })).then(function () { return map; });
  }

  // ---------- 歌词：JSON → LRC 文本（含翻译合并） ----------
  function mergeLyric(lrc, tlyric) {
    if (!tlyric) return lrc || '';
    var trans = {};
    tlyric.split('\n').forEach(function (line) {
      var m = line.match(/^(\[\d{2}:\d{2}(?:\.\d{2,3})?\])(.*)$/);
      if (m && m[2].trim()) trans[m[1]] = m[2].trim();
    });
    return (lrc || '').split('\n').map(function (line) {
      var m = line.match(/^(\[\d{2}:\d{2}(?:\.\d{2,3})?\])(.*)$/);
      if (m && trans[m[1]] && m[2].trim()) return m[1] + m[2] + ' (' + trans[m[1]] + ')';
      return line;
    }).join('\n');
  }
  function fetchLyric(id) {
    return fetchJSON('lyric', nativeLyricPath(id), id).then(function (json) {
      assertCode(json);
      var lrc = (json.lrc && json.lrc.lyric) || '';
      var tlyric = (json.tlyric && json.tlyric.lyric) || '';
      return mergeLyric(lrc, tlyric);
    });
  }

  // ---------- APlayer 实例上的薄增强（仅用公开属性/事件，不改源码） ----------
  function attachLazyLyrics(player) {
    if (!LYRICS || !player || !player.lrc) return;
    function load(index) {
      var audio = player.list.audios[index];
      if (!audio || !audio._lyricId || audio.lrc) return;
      fetchLyric(audio._lyricId).then(function (text) {
        if (player._adapterDestroyed) return;
        audio.lrc = text || '';
        if (player.list.index === index && player.lrc) {
          player.lrc.parsed[index] = null;
          player.lrc.switch(index);
        }
      }).catch(function () {});
    }
    player.on('listswitch', function (e) { load(e.index); });
    load(player.list.index);
  }

  function attachUrlRefresh(player) {
    if (!player) return;
    player.on('destroy', function () { player._adapterDestroyed = true; });
    player.on('error', function () {
      if (player._adapterDestroyed) return;
      var idx = player.list.index;
      var audio = player.list.audios[idx];
      if (!audio || !audio._id || audio._retried) return;
      audio._retried = true;
      resolveUrls([audio._id]).then(function (map) {
        if (player._adapterDestroyed) return;
        var fresh = map[audio._id];
        if (fresh && fresh.url) {
          audio.url = fresh.url;
          player.list.switch(idx);
          player.play();
        }
      }).catch(function () {});
    });
    player.on('canplay', function () {
      if (player._adapterDestroyed) return;
      var a = player.list.audios[player.list.index];
      if (a) a._retried = false;
    });
  }

  // ---------- 主流程 ----------
  function load(element) {
    var meta = element.meta;
    var listOk = false;
    if (!meta.id) {
      showMessage(element, '未配置歌曲/歌单 id（集成 options.id 或 config.js 的 id）');
      return Promise.resolve();
    }
    return fetchJSON('list', nativeListPath(meta)).then(function (json) {
      listOk = true;
      var raw = extractTracks(json, meta.type);
      var ids = meta.type === 'playlist' ? playlistTrackIds(json) : raw.map(function (t) { return t.id; });
      var prep = meta.type === 'playlist' ? hydrateTracks(raw, ids) : Promise.resolve(raw);
      return prep.then(function (full) {
        var tracks = full.map(normalizeTrack);
        if (!tracks.length) { showMessage(element, '歌单为空或上游无数据'); return; }
        return resolveUrls(tracks.map(function (t) { return t.id; })).then(function (urlMap) {
          var audios = [], unavailable = 0;
          tracks.forEach(function (t) {
            var u = urlMap[t.id];
            if (!u || !u.url) {
              unavailable++;
              if (!KEEP_UNAVAILABLE) return;
            }
            audios.push({
              name: t.name, artist: t.artist,
              url: u ? u.url : '', cover: t.cover,
              lrc: '', _lyricId: t.id, _id: t.id
            });
          });
          if (!audios.length) {
            showMessage(element, '无可播放歌曲（' + unavailable + ' 首受版权/会员/地区限制）');
            return;
          }
          element.config.lrcType = LYRICS ? 1 : 0;
          element._loadPlayer(audios);
          attachLazyLyrics(element.aplayer);
          attachUrlRefresh(element.aplayer);
          var playableCount = audios.filter(function (a) { return a.url; }).length;
          report(element, { total: tracks.length, playable: playableCount, unavailable: unavailable });
        });
      });
    }).catch(function (err) {
      showMessage(element, describeError(err, listOk));
      if (window.console) console.error('[MetingAdapter]', err);
    });
  }

  // 区分「代理不可达」与「R2 同源锁导致的 CORS 拦截」，避免把预期的跨域限制误报成代理故障。
  function describeError(err, listOk) {
    var msg = err && err.message ? err.message : String(err);
    if (MODE === 'proxy' && err instanceof TypeError) {
      var proxyOrigin = '';
      try { proxyOrigin = new URL(PROXY_BASE).origin; } catch (e) {}
      if (!listOk) {
        return '无法连接代理 ' + PROXY_BASE + '（元数据 R1 也失败）：请检查 proxyBase 与 EdgeOne 规则是否已上线。';
      }
      if (proxyOrigin && window.location.origin !== proxyOrigin) {
        return '代理正常，但播放地址接口(R2)仅对主站同源开放：当前页面 ' + window.location.origin +
          ' 被浏览器 CORS 拦截（EdgeOne 白名单 ' + proxyOrigin + '）。请部署到主站试听，或本地改用 mock 模式。';
      }
    }
    return '音乐加载失败：' + msg;
  }

  function showMessage(element, msg) {
    element.textContent = msg;
    element.dispatchEvent(new CustomEvent('meting-adapter-error', { detail: { message: msg } }));
  }
  function report(element, stats) {
    element.dispatchEvent(new CustomEvent('meting-adapter-ready', { detail: stats }));
  }

  // ---------- 安装：仅扩展 _parse（由 auto.mjs 显式调用） ----------
  function install() {
    var El = window.MetingJSElement;
    if (!El) { if (window.console) console.error('[MetingAdapter] 未找到 window.MetingJSElement'); return; }
    if (El.prototype.__adapterPatched) return;
    var origParse = El.prototype._parse;
    El.prototype._parse = function () {
      syncConfig();
      if (!ENABLED || this.meta.url) return origParse.call(this);
      // SPA 导航后重挂载：已初始化则跳过，避免重建 APlayer / 中断播放。
      if (this.__metingLoaded && this.aplayer) return;
      this.__metingLoaded = true;
      return load(this);
    };
    El.prototype.__adapterPatched = true;
  }

  window.MetingAdapter = {
    install: install, load: load, fetchLyric: fetchLyric, resolveUrls: resolveUrls,
    normalizeTrack: normalizeTrack, extractTracks: extractTracks, mergeLyric: mergeLyric,
    syncConfig: syncConfig,
    getConfig: function () { syncConfig(); return { MODE: MODE, PROXY_BASE: PROXY_BASE, MOCK_BASE: MOCK_BASE, BR: BR, LYRICS: LYRICS, KEEP_UNAVAILABLE: KEEP_UNAVAILABLE, ENABLED: ENABLED }; }
  };
})();