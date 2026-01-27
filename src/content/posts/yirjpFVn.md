---
title: 无需Gapps解决googlePlayStore三件套安装
published: 2024-12-17
# description: "How to use this blog template."
image: "./images/125160058_p0_master1200.jpg"
tags: ["GMS","安卓","笔记"]
category: 笔记
draft: false
legacyHash: yirjpFVn
---
**参考文献**：《**Android 8.0 安装Google服务**》[https://blog.csdn.net/baobei0112/article/details/90210409](https://blog.csdn.net/baobei0112/article/details/90210409)

所需软件**下载地址**为：[https://www.apkmirror.com](https://blog.csdn.net/baobei0112/article/details/90210409)

**注意事项**：尽量围绕gfs和GooglePlayServices的发布时间选择安装包。GFS选择需要注意安卓版本，GooglePlayService选择需要注意安卓版本、处理器指令集、屏幕分辨率支持。

**第一步**，安装googleAccountManger。包名：com.google.android.gsf.login。

**第二步**，安装googleServicesFramework（GFS）。包名：com.google.android.gsf（注意小版本号，如8.1和8.0为两个不同安卓版本对应不同安装包）

**第三步**，安装googlePlayService。包名：com.google.android.gms。（无脑选arm64+nodpi版本，不确定对应包的安卓版本选择和GFS相近发布时间的新包）

**第四步**，安装googlePlayStore。包名：com.android.vending。（无脑下载taptap，进附件管理装palyStore）

**第五步**，Enjoy（按道理到这步就结束了，但是参考文献提到了GMScore，笔者在mix上安装时无需安装此应用即可正常启动play商店，疑似非❀系手机无需此步操作）

**额外注意1**：google登录需要手机启动魔法工具，笔者路由的shellclash对手机应用的兼容性存在较大问题。（不启动卡加载是很正常的现象）

**额外注意2**：play商店无法直接找到应用请前往网页端查询，网页端地址：[https://play.google.com/](https://play.google.com/)。无法直接安装请多准备不同版本的安卓机，可以先在低版本安卓机上完成一次安装，再切换到高版本安卓机，playStore->头像->管理应用和设备->管理->此设备（切换至完成安装的低版本设备或未安装选项）->点开应用->安装。或者mt工具箱提取暴力解决问题。