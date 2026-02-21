---
title: 【笔记】在Ubuntu系统下使用OpCore-Simplify做安装黑苹果的准备工作
published: 2026-02-21
description: 估计不会有几个人有这种需求的。哪有放着好好的linux不用，装黑苹果的。
image: https://rdimg.yumehinata.com/random-wallpaper
tags:
  - 黑苹果
  - Ubuntu
  - OpCore-Simplify
  - "5250"
  - NUC
  - NUC5i5RYK
category: 笔记
draft: true
---
## 题记：

这大概是一种极其小众的需求吧，结果被幻梦遇上了。之前应该有提到过，幻梦的动态博客halo部署在一台nuc小主机上，总受周知nuc在这个时代成为软路由圣体之前其实是安装黑苹果的首选项，尤其是nuc5中的NUC5i5RYK。因为这台机器搭载了一个可能是除了苹果以外只有intel在自家主机上有使用过的5代i5处理器，5250u。现在动态博客不用了，小主机也就闲置下来了，于是在黑苹果生命的末期来体验一下，圆上幻梦一个折腾黑苹果的梦。

## 警告：

这篇笔记里还存在一些未解决的问题，仅供参考。如果你在安装环节遇到一些问题，且项目的issues里没有提供解决方案的话，请善用Ai工具来完成检索和解答。此外目前由于5250u的核显为hd6000，因此Mac OS15应该是5250u最后支持的一个版本。

## 安装Hardware-Sniffer

通常Hardware-Sniffer是OpCore-Simplify自带的一个模块，但是由于我们是linux环境所以得特意安装一个linux支持的。

```
git clone https://github.com/lzhoang2801/Hardware-Sniffer.git
```
