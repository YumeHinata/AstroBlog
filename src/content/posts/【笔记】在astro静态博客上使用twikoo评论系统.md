---
title: 【笔记】在Astro静态博客上使用Twikoo评论系统
published: 2026-10-03
description: Giscus的评论系统虽然简单方便，但是对于希望保证数据安全或是匿名的访客来说有点不友好了，而且近段时间的网络访问也时常出现问题，于是幻梦把博客的评论系统换成了 Twikoo（又是白嫖 Edgeone 的一天），写这个笔记的目的实际是顺便测试一下评论功能是否正常。
image: https://pximg.yumehinata.com/img-master/img/2026/10/03/00/30/13/150379690_p0_master1200.jpg
tags:
  - Fuwari
  - Astro
  - Edgeone
  - Twikoo
  - 评论
category: 笔记
draft: true
---

封面图：[https://www.pixiv.net/artworks/150379690](https://www.pixiv.net/artworks/150379690)

## 前言：

其实简介里写了，就是Gisucs不好用，而且因为一些奇妙的问题最近网页加载评论也总是出错，那就换一个评论系统吧。

与静态页面不同，评论系统是必定要数据库的。排除了家里云幻梦要上哪搞一个容量充足的廉价数据库呢？传统的手法是 MongoDB Atlas，他提供了500MiB的数据库，也是 Twikoo 在以往推荐的方案。那么有没有更大的呢？有的，有的。Edgeone Makers（以前叫Pages）提供了1GB 的 Blob 存储和1GB的 KV存储（这次 KV存储用不上）。需要注意，这个评论加载是需要用到 Edgeone Functions 的，而幻梦之前已经部署了一个随机图API，虽然说 Edgeone Functions 请求数一个月有 300W次，但是幻梦还是果断用了Edgeone的海外账号（反正空着也是空着）

## 第一步：部署 Twikoo 到 Edgeone

其实官方文档已经写的很详细了，[https://twikoo.js.org/backend.html#edgeone-makers-%E9%83%A8%E7%BD%B2](https://twikoo.js.org/backend.html#edgeone-makers-%E9%83%A8%E7%BD%B2)。

我们只需要下载[https://github.com/twikoojs/twikoo/raw/main/templates/edgeone-makers/twikoo-edgeone-makers.zip](https://github.com/twikoojs/twikoo/raw/main/templates/edgeone-makers/twikoo-edgeone-makers.zip)

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E5%9C%A8astro%E9%9D%99%E6%80%81%E5%8D%9A%E5%AE%A2%E4%B8%8A%E4%BD%BF%E7%94%A8twikoo%E8%AF%84%E8%AE%BA%E7%B3%BB%E7%BB%9F/QQ20261003-193641.png)

然后直接把 ZIP 上传到 Edgeone Makers上完成部署。
