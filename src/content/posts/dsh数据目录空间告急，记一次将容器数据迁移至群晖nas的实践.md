---
title: Dsh数据目录空间告急，记一次将容器数据迁移至群晖NAS的实践
published: 2026-09-22
description: 正在尝试移植一个安卓游戏到PSV上，结果跑了一半说无法写入了，才发现空间早已被占满。100G的小机器，不堪重压了。
image: https://pximg.yumehinata.com/img-master/img/2026/09/12/13/15/23/149570298_p0_master1200.jpg
tags:
  - NFS
  - Systemd
  - NAS
category: 笔记
draft: true
---

封面图：[https://www.pixiv.net/artworks/149570298](https://www.pixiv.net/artworks/149570298)

## 前言：

这次用的是群晖NAS，因为需要挂载空间的机器系统是Debian所以使用了NFS服务。并且由于使用了1panel和1panel提供的Dsh应用包，所以Dsh的工作区对应的目录应该是`/opt/1panel/apps/deepseek-harness/deepseek-harness/data/dsh/home`，我们需要把这个目录迁移到一会挂载的NAS分区上。当主机重启后需要自动挂载NAS分区，当分区挂载成功后再启动Dsh容器，防止报错。

## 第一步：

群晖上打开NFS服务并创建一个目录供Dsh使用。

![](./images/dsh%E6%95%B0%E6%8D%AE%E7%9B%AE%E5%BD%95%E7%A9%BA%E9%97%B4%E5%91%8A%E6%80%A5%EF%BC%8C%E8%AE%B0%E4%B8%80%E6%AC%A1%E5%B0%86%E5%AE%B9%E5%99%A8%E6%95%B0%E6%8D%AE%E8%BF%81%E7%A7%BB%E8%87%B3%E7%BE%A4%E6%99%96nas%E7%9A%84%E5%AE%9E%E8%B7%B5/QQ20260922-190515.png)

在控制面板-共享文件夹中选择新增一个文件夹或编辑已有的文件夹权限，幻梦这边选择了已有的这个文件夹。

![](./images/dsh%E6%95%B0%E6%8D%AE%E7%9B%AE%E5%BD%95%E7%A9%BA%E9%97%B4%E5%91%8A%E6%80%A5%EF%BC%8C%E8%AE%B0%E4%B8%80%E6%AC%A1%E5%B0%86%E5%AE%B9%E5%99%A8%E6%95%B0%E6%8D%AE%E8%BF%81%E7%A7%BB%E8%87%B3%E7%BE%A4%E6%99%96nas%E7%9A%84%E5%AE%9E%E8%B7%B5/QQ20260922-190716.png)

由于幻梦的群晖只能在局域网内连接，所以就不用担心公网攻击的问题，这边的ip就填`192.168.0.0/24`；`Squash`这边就选择无映射（**如果有公网访问的需求，这边建议设置映射，但是映射可能会造成容器无法正确获取权限导致失败，最安全的做法是新建一个Dsh专用共享文件夹然后再进行设置**）。

接下来记住这个装载路径，我们后面是要把这个路径或者路径里给Dsh用的的子文件夹挂载到容器所在的设备上。
