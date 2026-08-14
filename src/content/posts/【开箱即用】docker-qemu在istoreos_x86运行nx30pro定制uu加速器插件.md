---
title: 【开箱即用】Docker+Qemu在IstoreOS_x86运行NX30pro定制UU加速器插件
published: 2026-08-13
description: 幻梦整了一个新活，通过qemu进行模拟，在IsroteOS上运行NX30pro的定制UU加速器插件，实现PC、手机游戏加速功能的解锁。
image: https://pximg.yumehinata.com/img-master/img/2026/01/17/00/28/00/140018479_p0_master1200.jpg
tags:
  - NX30pro
  - UU
  - UUgamebooster
  - Docker
  - Qemu
category: 笔记
draft: false
---

## 声明：

这个版本是Deepseek辅助搓出来的，主要开发贡献者是DS，目前仅能够日常使用，有没有更多的bug还不知道。**这个项目仅为学习Qemu和Docker使用，请勿进行盈利，尊重网易的知识产权。**

## 前言：

这一定是目前全网第一个在x86架构Openwrt上激活UU插件PC、手机加速功能的内容分享。github仓库如下：

::github{repo="YumeHinata/uugamebooster-docker"}

目前来说这个模拟器的方案可能是解锁的唯一途径（如果你想直接尝试对原版二进制程序探索，来找出新的可能性可以跳过前面的安装使用环节）

## 部署与使用：

目前建议通过命令行下载docker-compose部署的方法，而不是IstoreOS网页端进行安装

```shellscript
curl -fsSL -o docker-compose.yml http://fastly.jsdelivr.net/gh/YumeHinata/uugamebooster-docker@main/docker-compose.yml && \
docker compose pull && \
docker compose up -d
```

![](./images/%E3%80%90%E5%BC%80%E7%AE%B1%E5%8D%B3%E7%94%A8%E3%80%91docker-qemu%E5%9C%A8istoreos_x86%E8%BF%90%E8%A1%8Cnx30pro%E5%AE%9A%E5%88%B6uu%E5%8A%A0%E9%80%9F%E5%99%A8%E6%8F%92%E4%BB%B6/Screenshot_2026-08-13-19-00-28-562_com.netease.uurouter_0_2026-08-13_19-00-39_802.jpg)

当容器启动后，打开移动端的UU主机加速器APP完成绑定即可正常使用。如果遭遇Openclash+UU加速器插件的，遇到加速效果不太成功的可以参考幻梦上一篇 [【笔记】从Fake-ip模式下Openclash手里抢回UU加速器插件代理的游戏流量](https://www.yumehinata.com/posts/%E7%AC%94%E8%AE%B0%E4%BB%8Efake-ip%E6%A8%A1%E5%BC%8F%E4%B8%8Bopenclash%E6%89%8B%E9%87%8C%E6%8A%A2%E5%9B%9Euu%E5%8A%A0%E9%80%9F%E5%99%A8%E6%8F%92%E4%BB%B6%E4%BB%A3%E7%90%86%E7%9A%84%E6%B8%B8%E6%88%8F%E6%B5%81%E9%87%8F/)

## 碎碎念：

幻梦确实尝试过通过对x86原版加速器插件进行伪装的方式来实现功能解锁，不过失败了。当然这也是可以给后人带来一定的经验分享的，但是也许这条路子到底是条死路。但是首先先要说借物表。

### 借物表：

[https://www.right.com.cn/forum/forum.php?mod=viewthread&tid=8301860&highlight=UU](https://www.right.com.cn/forum/forum.php?mod=viewthread&tid=8301860&highlight=UU)

[https://www.right.com.cn/forum/thread-8363665-1-1.html](https://www.right.com.cn/forum/thread-8363665-1-1.html)

尤其感谢第二篇帖子的内容，他解决了最难的没有工厂信息文件`factoryinfo`和`/etc/init.d/uu`问题

### 官方插件下载：

UU官方提供了一个下载插件的接口，所有的安装脚本都是通过这个接口进行下载的，目前根据大佬们公开的信息，幻梦做出如下汇总。

https://router.uu.163.com/api/plugin?type=h3c （版本过旧为4.14.6）

https://router.uu.163.com/api/plugin?type=h3c-nx30pro （aarch64架构）

https://router.uu.163.com/api/plugin?type=h3c-nx15

https://router.uu.163.com/api/plugin?type=h3c-bx54 （arm32架构）

https://router.uu.163.com/api/plugin?type=jd-hr06 （mipsel架构）

https://router.uu.163.com/api/plugin?type=steam-deck-plugin-x86_64 （steamdeck专属）

https://router.uu.163.com/api/plugin?type=merlin-mipsel （华硕梅林，可供padavan使用）

当下的uu远程桌面支持WOL的路由器机型如下：[https://uuyc.163.com/help/20260407/40220_1294974.html](https://uuyc.163.com/help/20260407/40220_1294974.html) 

幻梦最后选定了已h3c-nx30pro为基础进行方案的实施。

### 关于伪装：

前面提到，幻梦实际上尝试通过一些手段让Openwrt_x86版UUplugin认为自己是h3c定制版（其实是让注册服务器认为）。

1. 首先定制版插件（以nx30pro为例，下称为h3c版）与Openwrt通用版（下简称通用版版）有显著的差异。两者通过硬硬编码的方式指向不同的注册服务器域名，h3c版为：h3crglg.uu.163.com，通用版为：rglg.uu.163.com。
2. 两者的端口与协议也有不同，通用版可直接通过443端口访问，h3c版则是使用16000端口和tls1.2协议。
3. 通用版采用硬编码的方式将系统名称Openwrt写入执行程序中，h3c版则通过读取工厂信息文件完成识别。

以上是第一阶段的显著差异，解决这一部分并不难，硬编码字符串可通过修改内存完成补丁。

| 偏移 | 原始值 | 修改为 | 说明 |
| 4096733 | \`v14.2.2\` | \`v14.4.20\` | 固件版本号 |
| 4097259 | \`openwrt\` | \`h3cnx30\` | 设备类型 |
| 4115215 | \`OpenWrt\` | \`NX30Pro\` | 主机名 |
| 4099439 | \`openwrt-x86_64\0\` | \`h3c-nx30pro\0\0\0\0\` | 完整型号标识 |
| 4099834 | \`UU_SN\` | \`XX_SN\` | SN 环境变量名 |

注册服务器域名可通过代理的方式重定向到h3c的服务器，在代理过程中我们可以修改向注册服务器发送的数据。

| 消息类型 | 方向 | 修改内容 |
| --- | --- | --- |
| **Register** (0x24) | C→S | `vendor` → `h3c`, 注入 `fw_version=v14.4.20`, SN 透传 |
| **FullRegister** (0x02) | C→S | 精简为 3 字段: `device_uid` + `vendor=h3c` + `sn` |
| **DeviceInfo** (0x04) | C→S | `vendor` → `h3c` (触发设备扫描) |
| **ConnectReply** (0x11) | C→S | **故意不修复 vendor** (保留 h3cnx30, 避免触发 H3C 专属策略) |
| **Log** (0x0A) | C→S | 拦截 [FATAL]/[FORCE] → 不转发; 清理 `openwrt`/`x86_64` 字样 |

此时的通用版插件基本上可以完整的被识别为h3c版。但是要记住，这两者还是有本质区别的（你骗得了别人，骗不过自己），很快第一个问题就出现了。当你打开APP试图绑定，设备确实被识别为NX30pro，点击下一步后却会提示你输入“极路由”管理员密码，我们不知道网易为**极路由**写了多么底层的代码，但是也许你会尝试输入ssh密码或者别的什么，结果无一例外全部都会提示错误。不过要解决这个也不难，现在幻梦直接告诉大家流程如下。

手机将会通过16363与14554端口与通用版插件通信，插件通过内部的密钥来验证密码是否正确，当密码正确将会返回HTTP 200，错误则是HTTP 400。这个处理起来比较简单粗暴，直接把HTTP 400拦截下来，发送HTTP 200即可让APP通过绑定。顺便将**activate_status = 1**。

到这里其实整个注册流程已经完成了，服务器将会向客户端发送一组用于识别局域网设备类型的信息。接收到信息后插件就会把识别到的设备显示在手机APP上（这里幻梦有一个猜测，如果直接向插件发送这个完整识别信息，是否就无需伪装了。当然幻梦还没来得及尝试这个方案）

接下来，幻梦满心欢喜的点击了APP上对应设备的加速按钮。很快啊，加速就失败了。

服务端发送的连接节点的配置信息h3c版与通用版依旧存在区别，这两者无法互通。

| 字段 | openwrt | H3C | 差异 |
| --- | --- | --- | --- |
| f1 | device_id | device_id | 相同 |
| f2 | **0** (int) | **2** (int) | **路由策略不同！** |
| f4 | UUEnv (device_rule + feature_switch) | UUEnv (仅 feature_switch) | H3C 缺少 device_rule |
| f5 | relay_config | relay_config | 格式不同 |
| f6 | extra_params | extra_params | 部分相同 |
| f7 | **proxy 配置** | **缺失** | H3C 不包含 |
| f8 | **游戏 配置** | **缺失** | H3C 不包含 |
| f9 | **DNS 配置** | **缺失** | H3C 不包含 |
| f10 | **console 配置** | console 配置 | L0 更完整 |
| **总字段** | **9 个** | **6 个** |  |

这个时候的f2会直接导致报错，如果替换f2的值呢？但是你改得了f2，f7-f9又要怎么办呢？于是这个方案就卡在这了（不过现在的Qemu模拟的版本已经跑通了，也许有兴趣的朋友又可以尝试抓一下看看完整的加速流程又是怎么样的，也许会有不同的）。

## 结尾：

这个项目目前就是这样一个情况了，也许未来哪位大佬能够实现原生运行状态下解锁PC、手机加速功能，又或者UU官方推出PC、手机加速这个功能吧。
