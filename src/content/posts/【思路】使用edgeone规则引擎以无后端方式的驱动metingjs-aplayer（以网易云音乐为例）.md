---
title: 【思路】使用Edgeone规则引擎以无后端方式的驱动MetingJS+Aplayer（以网易云音乐为例）
published: 2026-11-14
description: 其实在前端可以完成大部分Meting（也就是 MetingJS 的后端）的工作，毕竟数据来源都是那几个平台。这个思路也只是以网易云音乐平台为例
image: https://rdimg.yumehinata.com/random-wallpaper
tags:
  - MetingJS
  - Edgeone
  - Aplayer
category: 笔记
draft: false
---

## 警告：

这篇文章只是提供一种思路，并不是一个全新的替代了 Meting 的统一平台 API 的项目。也不涉及版权破解等方法，只有你拥有平台的 VIP 权限，或者你购买了相应的专辑才能播放出对应的音乐。

## 1. 替换掉 MetingJS 调用后端的方法

原版的 MetingJS 通过：

```plain
let t = this.api.replace(":server",…).replace(":type",…).replace(":id",…);
fetch(t).then(t=>t.json()).then(t=>this._loadPlayer(t)); 
```

我们替换掉这里的方法`_parse`

```plain
var origParse = El.prototype._parse;
El.prototype._parse = function () {
  syncConfig();
  if (!ENABLED || this.meta.url) return origParse.call(this);
  if (this.__metingLoaded && this.aplayer) return;
  this.__metingLoaded = true;
  return load(this);
};
```

这里的`load` 写的是调多个网易云原生 GET 请求

```plain
case 'playlist': return '/api/v3/playlist/detail?id=' + enc(id) + '&n=1000&s=0';
function nativeUrlPath(ids){ return '/api/song/enhance/player/url?ids=['+…+']&br='+BR; }
function nativeLyricPath(id){ return '/api/song/lyric?id='+enc(id)+'&lv=-1&kv=-1&tv=-1'; }

function fetchOnce(url){ return fetch(url,{credentials:'omit'}).then(res=>{ … return res.json(); }); }
function fetchJSON(kind,path,id){ var url = MODE==='proxy' ? PROXY_BASE+path : mockFile(kind,id); … }
```

## 2. 返回转换为 Meting 格式

网易云的返回大概是这样的`{ playlist:{ tracks:[ {id,name, ar:[{name}], al:{picUrl} } ] } }`，首先就要取出曲目

```plain
function extractTracks(json,type){ case 'playlist': return json.playlist.tracks || json.result.tracks || []; … }
function normalizeTrack(t){
  var artists = t.ar || t.artists || [];      // 原生 ar:[{name}]
  var album   = t.al || t.album || {};        // 原生 al:{picUrl}
  return { id:t.id, name:t.name,
    artist: artists.map(a=>a.name).join(' / '),   // → 字符串
    cover: httpsUpgrade(album.picUrl||'') };      // → cover,并 http→https
}
```

再合成出播放地址信息

```plain
function resolveUrls(ids){ … fetchJSON('url', nativeUrlPath(chunk)).then(json=>{
  json.data.forEach(d=>{ map[d.id] = { url:d.url?httpsUpgrade(d.url):'', br:d.br, expi:d.expi, fee:d.fee, code:d.code, payed:d.payed }; });
}); … }
```

还有把返回的 JSON 格式歌词变成 LRC 文本形式

```plain
audios.push({ name:t.name, artist:t.artist, url:u?u.url:'', cover:t.cover,
              lrc:'', _lyricId:t.id, _id:t.id, _urlAt:now, _expi:(u&&u.expi)||1200 });
…
element.config.lrcType = LYRICS ? 1 : 0;
element._loadPlayer(audios);   // ← 正是 stock MetingJS 的标准化入口 [{name,artist,url,cover,lrc}]
```

## 3. Edgeone 配置规则

如果需要播放会员或者购买的专辑的歌曲，就需要登录 VIP 账号了，但是肯定不可能再前端写 Cookie 信息的，Edgeone 的 修改回源请求头的功能就可以帮助我们把 Cookie 信息安全的写进去了。

```plain
{
  "FormatVersion": "1.0",
  "Rules": [
    {
      "RuleName": "www/music/163/api 副本",
      "Branches": [
        {
          "Condition": "${http.request.host} in ['www.yumehinata.com'] and ${http.request.method} in ['GET']",
          "Actions": [],
          "SubRules": [
            {
              "Branches": [
                {
                  "Condition": "${http.request.uri.path} matches '^/music/163(/api/(v3/playlist/detail|song/detail|album/.*|artist/.*|search/get|song/lyric).*)$'",
                  "Actions": [
                    {
                      "Name": "ModifyOrigin",
                      "ModifyOriginParameters": {
                        "HTTPSOriginPort": 443,
                        "OriginType": "IPDomain",
                        "Origin": "music.163.com",
                        "OriginProtocol": "https"
                      }
                    },
                    {
                      "Name": "HostHeader",
                      "HostHeaderParameters": {
                        "Action": "custom",
                        "ServerName": "music.163.com"
                      }
                    },
                    {
                      "Name": "UpstreamURLRewrite",
                      "UpstreamURLRewriteParameters": {
                        "Type": "Path",
                        "Action": "regexReplace",
                        "Value": "$1",
                        "Regex": "^/music/163(/.*)$"
                      }
                    },
                    {
                      "Name": "ModifyRequestHeader",
                      "ModifyRequestHeaderParameters": {
                        "HeaderActions": [
                          {
                            "Action": "set",
                            "Name": "Referer",
                            "Value": "https://music.163.com/"
                          },
                          {
                            "Action": "set",
                            "Name": "User-Agent",
                            "Value": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
                          }
                        ]
                      }
                    },
                    {
                      "Name": "ModifyResponseHeader",
                      "ModifyResponseHeaderParameters": {
                        "HeaderActions": [
                          {
                            "Action": "set",
                            "Name": "Access-Control-Allow-Origin",
                            "Value": "${http.request.headers[\"Origin\"]}"
                          },
                          {
                            "Action": "set",
                            "Name": "Access-Control-Allow-Methods",
                            "Value": "GET"
                          },
                          {
                            "Action": "set",
                            "Name": "Access-Control-Max-Age",
                            "Value": "86400"
                          },
                          {
                            "Action": "add",
                            "Name": "Vary",
                            "Value": "Origin"
                          }
                        ]
                      }
                    },
                    {
                      "Name": "MaxAge",
                      "MaxAgeParameters": {
                        "FollowOrigin": "on",
                        "CacheTime": 0
                      }
                    },
                    {
                      "Name": "UpstreamRequest",
                      "UpstreamRequestParameters": {
                        "QueryString": {
                          "Switch": "on",
                          "Action": "excludeCustom",
                          "Values": [
                            "r"
                          ]
                        }
                      }
                    }
                  ]
                }
              ],
              "Description": [
                "R1"
              ]
            },
            {
              "Branches": [
                {
                  "Condition": "${http.request.uri.path} matches '^/music/163(/api/song/enhance/player/url.*)$'",
                  "Actions": [
                    {
                      "Name": "ModifyOrigin",
                      "ModifyOriginParameters": {
                        "HTTPSOriginPort": 443,
                        "OriginType": "IPDomain",
                        "Origin": "music.163.com",
                        "OriginProtocol": "https"
                      }
                    },
                    {
                      "Name": "HostHeader",
                      "HostHeaderParameters": {
                        "Action": "custom",
                        "ServerName": "music.163.com"
                      }
                    },
                    {
                      "Name": "UpstreamURLRewrite",
                      "UpstreamURLRewriteParameters": {
                        "Type": "Path",
                        "Action": "regexReplace",
                        "Value": "$1",
                        "Regex": "^/music/163(/.*)$"
                      }
                    },
                    {
                      "Name": "ModifyRequestHeader",
                      "ModifyRequestHeaderParameters": {
                        "HeaderActions": [
                          {
                            "Action": "set",
                            "Name": "Referer",
                            "Value": "https://music.163.com/"
                          },
                          {
                            "Action": "set",
                            "Name": "User-Agent",
                            "Value": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
                          },
                          {
                            "Action": "set",
                            "Name": "Cookie",
                            "Value": " MUSIC_U=*****; os=pc; appver=3.1.43"
                          }
                        ]
                      }
                    },
                    {
                      "Name": "ModifyResponseHeader",
                      "ModifyResponseHeaderParameters": {
                        "HeaderActions": [
                          {
                            "Action": "set",
                            "Name": "Access-Control-Allow-Origin",
                            "Value": "https://www.yumehinata.com"
                          },
                          {
                            "Action": "set",
                            "Name": "Access-Control-Allow-Methods",
                            "Value": "GET"
                          }
                        ]
                      }
                    },
                    {
                      "Name": "MaxAge",
                      "MaxAgeParameters": {
                        "FollowOrigin": "off",
                        "CacheTime": 0
                      }
                    }
                  ]
                }
              ],
              "Description": [
                "R2·播放地址"
              ]
            },
            {
              "Branches": [
                {
                  "Condition": "${http.request.uri.path} in ['/music/163/']",
                  "Actions": [
                    {
                      "Name": "HttpResponse",
                      "HttpResponseParameters": {
                        "ResponsePage": "p-3f7fqymmu3rj",
                        "StatusCode": 403
                      }
                    }
                  ]
                }
              ],
              "Description": []
            }
          ]
        }
      ],
      "Description": []
    }
  ]
}
```

![](./images/%E3%80%90%E6%80%9D%E8%B7%AF%E3%80%91%E4%BD%BF%E7%94%A8edgeone%E8%A7%84%E5%88%99%E5%BC%95%E6%93%8E%E4%BB%A5%E6%97%A0%E5%90%8E%E7%AB%AF%E6%96%B9%E5%BC%8F%E7%9A%84%E9%A9%B1%E5%8A%A8metingjs-aplayer%EF%BC%88%E4%BB%A5%E7%BD%91%E6%98%93%E4%BA%91%E9%9F%B3%E4%B9%90%E4%B8%BA%E4%BE%8B%EF%BC%89/QQ_2026-11-16_13-46-19.png)![](./images/%E3%80%90%E6%80%9D%E8%B7%AF%E3%80%91%E4%BD%BF%E7%94%A8edgeone%E8%A7%84%E5%88%99%E5%BC%95%E6%93%8E%E4%BB%A5%E6%97%A0%E5%90%8E%E7%AB%AF%E6%96%B9%E5%BC%8F%E7%9A%84%E9%A9%B1%E5%8A%A8metingjs-aplayer%EF%BC%88%E4%BB%A5%E7%BD%91%E6%98%93%E4%BA%91%E9%9F%B3%E4%B9%90%E4%B8%BA%E4%BE%8B%EF%BC%89/QQ_2026-11-16_13-49-27.png)![](./images/%E3%80%90%E6%80%9D%E8%B7%AF%E3%80%91%E4%BD%BF%E7%94%A8edgeone%E8%A7%84%E5%88%99%E5%BC%95%E6%93%8E%E4%BB%A5%E6%97%A0%E5%90%8E%E7%AB%AF%E6%96%B9%E5%BC%8F%E7%9A%84%E9%A9%B1%E5%8A%A8metingjs-aplayer%EF%BC%88%E4%BB%A5%E7%BD%91%E6%98%93%E4%BA%91%E9%9F%B3%E4%B9%90%E4%B8%BA%E4%BE%8B%EF%BC%89/QQ_2026-11-16_13-56-30.png)![](./images/%E3%80%90%E6%80%9D%E8%B7%AF%E3%80%91%E4%BD%BF%E7%94%A8edgeone%E8%A7%84%E5%88%99%E5%BC%95%E6%93%8E%E4%BB%A5%E6%97%A0%E5%90%8E%E7%AB%AF%E6%96%B9%E5%BC%8F%E7%9A%84%E9%A9%B1%E5%8A%A8metingjs-aplayer%EF%BC%88%E4%BB%A5%E7%BD%91%E6%98%93%E4%BA%91%E9%9F%B3%E4%B9%90%E4%B8%BA%E4%BE%8B%EF%BC%89/QQ_2026-11-16_13-51-18.png)

这边注意 Cookie 信息。如果没有 VIP 的不想用自己账户，就使用 MUSIC_A 的匿名账户即可，os=pc指的是pc客户端而不是网页端，appver这边填入正确的客户端版本号，截止发稿时为`3.1.43`

保存等待部署完成后即可访问测试
