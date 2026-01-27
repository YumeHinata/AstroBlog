---
title: 【笔记】解决开启openclash后steam下载速度异常
published: 2025-09-27
# description: "How to use this blog template."
image: "https://rdimg.yumehinata.com/random-wallpaper"
tags: ["steam ","clash"]
category: 笔记
draft: false
legacyHash: kAVVzzEq
---
其实没什么复杂的，直接看这个[阅读原文](https://github.com/coolsnowwolf/lede/issues/7188)

    - DOMAIN-SUFFIX,steamcontent.com,DIRECT
    - DOMAIN-SUFFIX,steamstatic.com,DIRECT
    - DOMAIN-SUFFIX,steamserver.net,DIRECT
    - DOMAIN-SUFFIX,test.steampowered.com,DIRECT
    ##- DOMAIN-SUFFIX,api.steampowered.com,DIRECT 默认注释掉了。当前网络环境api子域名已被污染，直连可能会导致登录时出现通讯失败

基本上把这些加上就可以解决下载速度的问题。

找不到写哪的。覆写设置->规则设置->自定义规则（勾选上）

![](https://openlist.yumehinata.com/d///Tianyicloud/blog/QQ20250927-004359.png?sign=tkpjuOM4F_k5oMbS22aOJ9_bAmb3kTjqmjlYf7JF808=:0)

填写在这里

![](https://openlist.yumehinata.com/d///Tianyicloud/blog/QQ20250927-004538.png?sign=aIiJ6V88EvufDTTcVXFBdX27RP7KaySNrFC5Rwp7Fb0=:0)