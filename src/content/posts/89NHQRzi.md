---
title: 【笔记】通过shizuku+installerX安装应用程序
published: 2025-10-21
# description: "How to use this blog template."
image: "https://rdimg.yumehinata.com/random-wallpaper"
tags: ["CTS","shizuku","InstallerX","安装器","笔记"]
category: 笔记
draft: false
legacyHash: 89NHQRzi
---
## 前言：

本来不想写这个内容的，但是最近某些厂商越来越不安分了，于是收集整理了一些**无需root**干掉或者替代自带的**应用包管理组件**的方法。至于为什么不root，或者不买能root的手机？大概是因为手机上有了一些如果root了可能会导致财产损失的应用，有这种应用的懂的都懂，尽量避免root或者越狱吧，毕竟就算是开源也顶不住供应链投毒。

## shizuku+installerX+np/mt文件管理器

shizuku的版本其实还挺多的，不考虑未在github开源的分支。没有特别需求的推荐原版的[RikkaApps/Shizuku](https://github.com/RikkaApps/Shizuku/releases)（目前原版疑似加入了无root自启动功能？）；希望能无root通过无线adb来开机自启动的推荐这个分支[pixincreate/Shizuku](https://github.com/pixincreate/Shizuku/releases)；幻梦在用的是另一位作者在以上进行二改的版本[yangFenTuoZi/Shizuku](https://github.com/yangFenTuoZi/Shizuku)，这里只是贴出来不做推荐。顺带一提现在很多作者的releases里都不是最新的安装包，得去actions里翻一下最新的文件。

![](https://openlist.yumehinata.com/d///Tianyicloud/blog/Screenshot_2025-10-21-02-36-39-810_moe.shizuku.privileged.api.jpg?sign=E4bvziUD2rVCPq-mcAzh-blCNzSz2HN4_bbDqu1b3fk=:0)

shizuku的设置其实没什么好说的，就这个开机启动（无线调试）勾上然后根据提示启动服务就好了。

![](https://openlist.yumehinata.com/d///Tianyicloud/blog/Screenshot_2025-10-21-02-39-46-149_com.miui.securitycenter.jpg?sign=o-7BNvoeNmcZ3AqmZGKRQtojjz64aYCCgruFYEDpDOs=:0)

![](https://openlist.yumehinata.com/d///Tianyicloud/blog/Screenshot_2025-10-21-02-39-37-850_com.miui.securitycenter.jpg?sign=oOro1VTEDSsGkpUyF_88CzqUb494AwXis2hYSlV014Q=:0)

shizuku外面的设置其实比较重要，耗电记得无限制，自启动记得打开，有些情况可能shizuku没开通知权限也要记得开起来。

![](https://openlist.yumehinata.com/d///Tianyicloud/blog/Screenshot_2025-10-21-02-42-36-835_com.android.settings.jpg?sign=Y76lUt-2SBoW6RY-NUr13jl9JRG8QaCM3CWD-rfI45E=:0)

开发者选项里除了在shizuku启动时会提示开启的选项，还要记得开启**usb安装、usb调试（安全设置）、停用adb授权超时功能**。

到这里shizuku的部分暂告段落，接下来安装installerX。这里就要提一点，幻梦选installerX是因为这个软件长得好看，除了这个以外还有很多安装器可以选择的。

原版[iamr0s/InstallerX](https://github.com/iamr0s/InstallerX)在23年作者就停止更新归档了。不过，目前在a16版本下依旧能正常工作。在幻梦写这篇笔记的时候发现github有了一个新的分支[wxxsfxyzm/InstallerX-Revived](https://github.com/wxxsfxyzm/InstallerX-Revived)，值得关注后续维护状态。

![](https://openlist.yumehinata.com/d///Tianyicloud/blog/Screenshot_2025-10-21-02-50-53-453_com.rosan.installer.x.jpg?sign=XPTU3SyIivxMKMLLlPOqjNITKUmTf9axFCjkDAzxboQ=:0)

![](https://openlist.yumehinata.com/d///Tianyicloud/blog/Screenshot_2025-10-21-02-51-45-067_com.rosan.installer.x.jpg?sign=CDRoUd1d-v7v6uWl0LxJOrSDzO6_BXGTmEFoWUXyj30=:0)

installerX内如此设置，设置完成记得右下角点击保存。

另外锁定为默认安装器记得点一下，虽然基本上就是一个心里安慰的作用。

还有记得在shizuku里授权installerX。

到这里其实就结束了，标题里面为什么还有一个文件管理器？因为在非root的情况下无法将系统自带的文件管理器默认包管理组件换成installerX，上一步的锁定为默认安装器主要是针对比如**应用宝、taptap、第三方浏览器**默认调用installerX。mt管理器在有shizuku授权的情况下，其实无需installerX即可完成应用安装（np管理器不行）。

## Dhizuku+installerX

installerX还有一个优势是兼容Dhizuku授权，Dhizuku的优势比shizuku主要在于开机启动不会掉权限（因为Dhizuku依赖的是设备管理员权限而非ADB），但是这个方案不做推荐，因为会影响应用双开，而且使用过应用双开的用户会出现各种各样奇怪的错误。

## CTS兼容性测试套件

这个方案依旧不做推荐。CTS能够把厂商的包装管理器换成安卓原版安装器，也就能把许多系统定制的功能变成安卓原版，效果类似于关闭miui/hyperos优化，但是效果更强且不可逆（连miui优化开关效果都可逆了，这个效果不可逆知道后果有多严重了吧）。链接还是贴在这里了[https://source.android.google.cn/docs/compatibility/cts/downloads?hl=zh-cn](https://source.android.google.cn/docs/compatibility/cts/downloads?hl=zh-cn)，毕竟不是每一个人都喜欢厂商的定制系统，很多人还是喜欢原生安卓的，**但是用了CTS出现问题别再去给厂商反馈问题了**。