---
title: 【教程】利用GA4统计实现静态博客阅读统计
published: 2026-05-31
description: 静态博客很多人会选用umami来实现阅读量的统计，但是这就不够serverless了，也不方便将白嫖进行到底，所以就有了现在这个方案，当然这个方案也是有缺点的。
image: https://pximg.yumehinata.com/img-master/img/2026/05/23/12/06/19/145105485_p0_master1200.jpg
tags:
  - GA4
  - Analytics
  - Google
  - 阅读统计
category: 笔记
draft: false
---
封面图：https://www.pixiv.net/artworks/145105485

## 前言：

Umami无疑是最适合个人静态博客的自建统计系统了，但是你需要一个服务器来部署Umami。那么有没有一个不需要自己准备服务器就能使用的统计工具呢？有的，Google Analytics正是我们需要的。不过GA4的缺点就是**可能会被用户过滤**，**统计结果不够及时**，以及**谷歌服务本身在当前环境下的不稳定性**。幸好幻梦是不在意这些问题的，如果要选择这个方案最好也衡量一下自己是否也不在意。

## 第一步：使用Analytics统计

<https://marketingplatform.google.com/about/analytics/?hl=zh-CN>

在首页开始，注册一个Analytics账号。

![](./images/qq20260531-193722.png)

![](./images/qq20260531-193911.png)

![](./images/qq20260531-194053.png)

![](./images/qq20260531-194205.png)

点击创建，进入下一个环节，选择网站。

![](./images/qq20260531-194601.png)

google会给你一串代码，我们放到需要统计的网页中

![](./images/qq20260531-194833.png)

完成后点击测试，当有数据时会是以下的显示

![](./images/qq20260531-195315.png)

## 第二步：调用
