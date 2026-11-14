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
          // 保留 fee/code/payed 用于「登录态缺失」诊断；url 为空表示受限/下架。
          map[d.id] = { url: d.url ? httpsUpgrade(d.url) : '', br: d.br, expi: d.expi, fee: d.fee, code: d.code, payed: d.payed };
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

  // ---------- 播放地址保鲜：过期前主动换新 + 出错稳健恢复 ----------
  // 网易云播放地址带签名有效期（expi，约 20 分钟）。页面挂一整晚后旧地址会 403，
  // 而 APlayer 自带「出错 2 秒后自动跳下一首」会连锁跳过整张过期歌单并弹报错。
  // 对策：记录每条地址签发时间，回到前台/聚焦时若过期就静默换新（不自动播放）；
  // 真出错时先取消 APlayer 的跳歌定时器，再刷新当前曲目并续播。
  function urlStale(audio) {
    if (!audio || !audio._urlAt) return false;
    var ttl = ((audio._expi || 1200) - 120) * 1000; // 提前 2 分钟视为过期
    return Date.now() >= audio._urlAt + ttl;
  }
  function refreshAudio(player, idx, resume) {
    if (!player || player._adapterDestroyed) return Promise.resolve();
    var audio = player.list.audios[idx];
    if (!audio || !audio._id) return Promise.resolve();
    var now = Date.now();
    if (audio._refreshing) return audio._refreshing;            // 并发去重
    if (audio._lastRefresh && now - audio._lastRefresh < 2000) return Promise.resolve(); // 节流，防紧循环
    audio._lastRefresh = now;
    audio._refreshing = resolveUrls([audio._id]).then(function (map) {
      audio._refreshing = null;
      if (player._adapterDestroyed) return;
      var fresh = map[audio._id];
      if (!fresh || !fresh.url) return;
      audio.url = fresh.url;
      audio._urlAt = Date.now();
      audio._expi = fresh.expi || 1200;
      if (player.list.index !== idx) return;
      if (resume) {
        // list.switch 重载 audio.src 并触发 listswitch（顺带清掉 APlayer 跳歌定时器），再续播。
        player.list.switch(idx);
        player.play();
      } else {
        // 暂停态静默换新：仅当地址真变化时才改 src，避免无谓的 audio 重置 / 歌词闪烁。
        if (player.audio.src !== fresh.url) { try { player.audio.src = fresh.url; } catch (e) {} }
      }
    }).catch(function () { audio._refreshing = null; });
    return audio._refreshing;
  }
  function attachUrlRefresh(player) {
    if (!player) return;
    player.on('destroy', function () { player._adapterDestroyed = true; });
    player.on('error', function () {
      if (player._adapterDestroyed) return;
      var idx = player.list.index;
      // 立即取消 APlayer 内置「2 秒后跳歌」，给刷新留时间，避免整晚后连锁跳歌报错。
      try { player.events.trigger('listswitch', { index: idx }); } catch (e) {}
      refreshAudio(player, idx, true);
    });
    // 回到前台 / 窗口聚焦：旧地址多半已过期，暂停态下静默换新，用户再点播放即可顺畅播放。
    function onReturn() {
      if (player._adapterDestroyed || document.visibilityState === 'hidden') return;
      var idx = player.list.index;
      if (player.paused && urlStale(player.list.audios[idx])) refreshAudio(player, idx, false);
    }
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('focus', onReturn);
    player.on('destroy', function () {
      document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('focus', onReturn);
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
          var blocked = { vip: 0, paid: 0, other: 0 };
          var now = Date.now();
          tracks.forEach(function (t) {
            var u = urlMap[t.id];
            if (!u || !u.url) {
              unavailable++;
              if (u && u.fee === 1) blocked.vip++;
              else if (u && u.fee === 4) blocked.paid++;
              else blocked.other++;
              if (!KEEP_UNAVAILABLE) return;
            }
            audios.push({
              name: t.name, artist: t.artist,
              url: u ? u.url : '', cover: t.cover,
              lrc: '', _lyricId: t.id, _id: t.id,
              _urlAt: now, _expi: (u && u.expi) || 1200
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
          report(element, { total: tracks.length, playable: playableCount, unavailable: unavailable, blocked: blocked });
          // 登录态诊断（仅提示，不阻断）：proxy 模式下会员/已购歌曲拿到匿名结果，
          // 多半是 EdgeOne 对 R2 回源未注入登录 Cookie。已购歌曲 payed=0 是最明确的信号。
          if (MODE === 'proxy' && (blocked.vip || blocked.paid)) {
            var anonymousPaid = tracks.some(function (t) { var u = urlMap[t.id]; return u && u.fee === 4 && !u.url && u.payed === 0; });
            if (window.console) console.info('[MetingAdapter] 受限 ' + unavailable + ' 首（会员 ' + blocked.vip + ' / 已购 ' + blocked.paid + ' / 版权下架 ' + blocked.other + '）。' +
              (anonymousPaid
                ? '已购歌曲返回 payed=0，说明 R2 回源未携带登录态：请在 EdgeOne 对 /api/song/enhance/player/url 的回源请求头注入有效登录 Cookie（与 R1 一致）。'
                : '若已开通会员/购买专辑却仍不可播，请检查 EdgeOne R2 回源 Cookie 是否有效。'));
          }
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