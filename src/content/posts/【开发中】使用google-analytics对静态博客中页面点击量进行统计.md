---
title: 【开发中】使用Google Analytics对静态博客中页面点击量进行统计
published: 2026-02-20
description: 还在开发中
image: https://rdimg.yumehinata.com/random-wallpaper
tags:
  - GA4
  - Analytics
  - Google
category: 笔记
draft: true
---
首先已经在pages页安装了GA4，也获取到了用户点击数据。现在已知晓API调用需要消耗一定的配额，所以断不可实时进行获取，而是要统一获取后进行缓存，之后获取缓存的数据。幻梦打算通过github action进行更新一个json文件，文件里面是整理后可直接使用的数据。先写到这里，后面接着开发
