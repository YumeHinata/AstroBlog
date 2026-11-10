---
title: 【笔记】使用 Shizuku 免 root 通过热点分享 Clash 代理
published: 2026-11-08
description: Shizzi给了这个项目非常多的帮助。通过Shizuku 调用 TestNetworkManager.createTunInterface 创建 testtun 网络。并调用 TetheringManager.setPreferTestNetworks(true) 把 testtun 选为上游，最终就是把经过代理的流量通过热点共享出去。
image: https://pximg.yumehinata.com/img-master/img/2026/07/26/01/37/22/147634195_p0_master1200.jpg
tags:
  - Shizuku
  - Clash
  - CMFA
  - Shizzi
category: 笔记
draft: true
---

封面图：[https://www.pixiv.net/artworks/147634195](https://www.pixiv.net/artworks/147634195)

## 前言：

首先必须得说在如今root权限获取其实已经是一件日渐简单的事情了。但是，幻梦还是固执的认为 Shizuku 获取的权限其实已经足够完成让热点流量经过 clash代理的工作。所幸，已经有前人完成了 Shizzi 这个项目，再次感谢 Shizzi 项目的开发者们的工作。

所以，这个确实又是一个“Ai 融合项目”（阿里 Qoder 发赛博鸡蛋了，你还不领吗）
