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

::github{repo="YumeHinata/ClashMetaForAndroid-Tether"}

## 前言：

首先必须得说在如今root权限获取其实已经是一件日渐简单的事情了。但是，幻梦还是固执的认为 Shizuku 获取的权限其实已经足够完成让热点流量经过 clash代理的工作。所幸，已经有前人完成了 Shizzi 这个项目，再次感谢 Shizzi 项目的开发者们的工作。

所以，这个确实又是一个“Ai 融合项目”（阿里 Qoder 发赛博鸡蛋了，这还不领吗）。这篇文章更多也就是分享软件和思路了，没特别多技术含量。

## 1.使用方法：

首先我们要准备好 Shizuku，有了权限才能打开测试网络功能，才能进行下一步。

[https://github.com/RikkaApps/Shizuku/releases](https://github.com/RikkaApps/Shizuku/releases) 可以下载最新版的 Shizuku。

下文默认 Shizuku已经安装并配置完成。

### 1.1 获取 CMFA-Tether

[https://github.com/YumeHinata/ClashMetaForAndroid-Tether/releases](https://github.com/YumeHinata/ClashMetaForAndroid-Tether/releases) Release页可以获取到比较稳定的版本，最新编译的版本通常在 Action页 [https://github.com/YumeHinata/ClashMetaForAndroid-Tether/actions/workflows/build.yml](https://github.com/YumeHinata/ClashMetaForAndroid-Tether/actions/workflows/build.yml)

### 1.2 打开 CMFA 的权限

安装 CMFA 后，进入 Shizuku 为应用授权

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E4%BD%BF%E7%94%A8-shizuku-%E5%85%8D-root-%E9%80%9A%E8%BF%87%E7%83%AD%E7%82%B9%E5%88%86%E4%BA%AB-clash-%E4%BB%A3%E7%90%86/Screenshot_2026-11-11-10-21-21-046_moe.shizuku.privileged.api.jpg)

点击中间齿轮图标按钮，进入授权

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E4%BD%BF%E7%94%A8-shizuku-%E5%85%8D-root-%E9%80%9A%E8%BF%87%E7%83%AD%E7%82%B9%E5%88%86%E4%BA%AB-clash-%E4%BB%A3%E7%90%86/Screenshot_2026-11-11-10-21-31-855_moe.shizuku.privileged.api_1794363974222edit.jpg)

为 CMFA 授权

## 1.3 开启 Tether功能，共享代理

打开我们安装好的 CMFA，完成常规的配置后，点击设置。

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E4%BD%BF%E7%94%A8-shizuku-%E5%85%8D-root-%E9%80%9A%E8%BF%87%E7%83%AD%E7%82%B9%E5%88%86%E4%BA%AB-clash-%E4%BB%A3%E7%90%86/Screenshot_2026-11-11-10-28-37-544_com.github.metacubex.clash.meta.jpg)

点击设置，可设置 Tether 是否自动打开。

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E4%BD%BF%E7%94%A8-shizuku-%E5%85%8D-root-%E9%80%9A%E8%BF%87%E7%83%AD%E7%82%B9%E5%88%86%E4%BA%AB-clash-%E4%BB%A3%E7%90%86/Screenshot_2026-11-11-10-28-44-629_com.github.metacubex.clash.meta.jpg)

可以看到下方比原版多出了一个 Shizuku Tether 按钮

点击进入

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E4%BD%BF%E7%94%A8-shizuku-%E5%85%8D-root-%E9%80%9A%E8%BF%87%E7%83%AD%E7%82%B9%E5%88%86%E4%BA%AB-clash-%E4%BB%A3%E7%90%86/Screenshot_2026-11-11-10-28-48-295_com.github.metacubex.clash.meta.jpg)

Start Tether 单击后可以单次开启共享功能，下方的自动开启按钮为默认打开。如需每次个人判断是否需要开启，可关闭常开按钮，后续通过上方 Start Tether 进行单次的开启。

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E4%BD%BF%E7%94%A8-shizuku-%E5%85%8D-root-%E9%80%9A%E8%BF%87%E7%83%AD%E7%82%B9%E5%88%86%E4%BA%AB-clash-%E4%BB%A3%E7%90%86/Screenshot_2026-11-11-10-35-13-524_com.github.metacubex.clash.meta.jpg)

打开时，当热点或代理未开启时，Tether将会进入等待

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E4%BD%BF%E7%94%A8-shizuku-%E5%85%8D-root-%E9%80%9A%E8%BF%87%E7%83%AD%E7%82%B9%E5%88%86%E4%BA%AB-clash-%E4%BB%A3%E7%90%86/Screenshot_2026-11-11-10-36-02-531_com.github.metacubex.clash.meta.jpg)

当两者均开启后，将会从等待转换为开启。此时再次点击按钮或者直接关闭代理（清除后台）将会关闭 Tether与 testtun 网络。

（Auto-start on Launch 开关打开后的实际功能是在每次开启代理后自动打开热点并开启 Tether）

**使用教程到此完毕**

## 2. 功能实现思路
