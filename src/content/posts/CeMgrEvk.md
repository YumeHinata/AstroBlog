---
title: 搭建CS2社区服【满十、训练、管理员插件】群晖docker环境
published: 2025-06-13
# description: "How to use this blog template."
image: "https://rdimg.yumehinata.com/random-wallpaper"
tags: ["群晖","CS2","steam"]
category: 笔记
draft: false
legacyHash: CeMgrEvk
---
**11月2日临时更新文章：目前cs2已支持ipv6解析，暂未测试是否支持srv记录。有nat1的朋友们想知道如何用Lucky的webhook功能发送到kook频道的可以看这个文章**[**https://www.yumehinata.com/archives/T0vSHpCO**](https://www.yumehinata.com/archives/T0vSHpCO)

**前言：提示看到这篇笔记的读者，~~截止发稿时cs2无法完成ipv6解析，不用费心做SRV、TXT记录亦或是ipv6的ddns，敬爱的v社至今无法对上述dns记录进行解析。~~另外301重定向仅支持http协议，而cs2是udp协议也不用想了。老老实实用内网穿透工具吧，或者你有办法解决实时更新Stun穿透会变化的端口和地址（当然stun是完全可以用的，用起来麻烦罢了）。**

## 一、docker拉取镜像

1.  注册表中搜索"steamcmd"，下载cm2network/steamcmd这个镜像
    
2.  注册表中搜索“cs2”，下载cm2network/cs镜像
    
3.  两个都选latest，等下载完进行下一步
    

## 二、安装steamcmd

1.  进入“映像”选项
    
2.  双击刚刚下载的steamcmd镜像
    
3.  网络用默认的bridge就行->下一步
    
4.  容器名称改成自己觉得好记好看的->使用高权限执行容器（防止出现奇怪报错）->启用自动更新启动->下一步->下一步->完成
    
5.  docker容器中双击容器进入->终端机（终端机输入常出现问题建议换个工具进容器）|使用putty之类ssh工具，`sudo -i`获取root权限，执行`docker ps`命令，找到steamcmd的容器id，执行`docker exec -it 容器id /bin/bash` 命令（记得替换）进入
    
6.  执行`./steamcmd.sh`
    
7.  等待下载完成出现`Steam>`
    
8.  执行`login steam账号`
    
9.  输入密码
    
10.  （有手机令牌需要进行验证）
     
11.  （未来重启steamcmd需要再输入账号登录）
     

## 三、安装cs2客户端

1.  docker文件夹中新建一个`cs2`文件夹之后存文件用（都用群晖了有条件打开samba的记得打开samba，之后管理文件也方便）
    
2.  进入“映像”选项
    
3.  双击刚刚下载的`cs2`镜像
    
4.  网络用默认的bridge->下一步
    
5.  改容器名->使用高权限执行容器->启用自动更新启动->下一步
    
6.  端口设置本地端口就和容器端口一致（除非你的端口被占用了，当然除非你有公网的ipv4不然内网穿透还是要变，要不要改、怎么改就看自己了）->下一步
    
7.  添加文件夹->找到刚刚建好的`docker/cs2`文件夹，选择->装载目录为`/home/steam/cs2-dedicated/` ->下一步->完成
    
8.  进“终端机”看cs2的下载进度，等待下载完成（上一步的文件夹千万不能错）
    
9.  出现`[STARTUP] {0.000} activated session on GC` 说明服务成功上线，进行下一步
    
10.  停止容器
     
11.  `cs2`容器->右键`编辑`\->高级设置->（删除以下变量），这个界面先别管也别保存（因为还有东西没填也保存不了）
     

    CS2_RCON_PORT
    CS2_RCONPW
    CS2_PW
    CS2_GAMEALIAS
    CS2_CFG_URL
    CS2_ADDITIONAL_ARGS
    TV_PW
    TV_RELAY_PW

1.  申请一个srcds-token->进入[https://steamcommunity.com/dev/managegameservers](https://steamcommunity.com/dev/managegameservers)\->`appid`填730->创建
    
2.  复制刚刚创建的登录令牌->进入刚刚高级设置的变量->找到`SRCDS_TOKEN` ->值粘贴刚刚复制的令牌->保存->保存
    
3.  进入`/docker/cs2/game/csgo/cfg` 文件夹找到`server.cfg`（有开samba的就直接windows文件夹里打开编辑）编辑
    
4.  找刚刚上面删过的变量，把这个cfg文件中的这些参数后面的值`changeme`修改成空串，保存替换
    
5.  运行容器，出现`[STARTUP] {0.000} activated session on GC` 说明成功启动
    
6.  游戏控制台输入`connect 服务器ip:27015`（记得替换，刚刚没改端口就是27015，改了就改成自己的）
    
7.  能够顺利进入就没问题了，下一步
    

## 四、安装插件核心

**目前需要的两个核心为css和metamod，未来也许sourcemod会重装上阵？**

[**【扩展阅读】****CounterStrikeSharp官方文档**](https://docs.cssharp.dev/docs/guides/getting-started.html)

1.  下载metamod->[https://www.metamodsource.net/downloads.php/?branch=master](https://www.metamodsource.net/downloads.php/?branch=master)\->群晖当然选linux下载
    
2.  解压下载的文件，最后得到一个`addons` 文件夹，复制这个文件夹->`cs2/game/csgo/` 粘贴
    
3.  进入`cs2/game/csgo/` 找到`gameinfo.gi` 编辑，在`Game_LowViolence csgo_lv` 下换行添加一行`Game csgo/addons/metamod` （对比一下其他的格式）
    
4.  下载css->[https://github.com/roflmuffin/CounterStrikeSharp/releases](https://github.com/roflmuffin/CounterStrikeSharp/releases)\->就下载最新的，记得下载带“with-runtime”的linux版本
    
5.  解压下载的文件，最后得到一个`addons` 文件夹，还是复制这个文件夹->`cs2/game/csgo/` 粘贴
    
6.  重启cs2容器->等待启动完成（进终端机看，等信息输出基本上不动了，基本上就启动完了）->终端机中输入`meta list` 如果输出
    

    meta list
    Listing 1 plugin:
      [01] CounterStrikeSharp (0.1.0) by Roflmuffin

输出以上内容就证明安装成功，有更多问题看扩展阅读，官方文档能解决大部分问题，解决不了的问题进issue去看有没有人遇到类似的

## 五、安装管理员插件

管理员插件有很多，但是目前最推荐的是**CS2-SimpleAdmin:**[**https://github.com/daffyyyy/CS2-SimpleAdmin**](https://github.com/daffyyyy/CS2-SimpleAdmin)

[**【扩展阅读】CS2-SimpleAdmin官方wiki**](https://cs2-simpleadmin.daffyy.dev/getting-started/quickstart)

1.  先看上面github的readme，一定一定要看完，之后高级使用看wiki，扩展阅读就是
    
2.  先下载安装依赖，[PlayerSettings](https://github.com/NickFox007/PlayerSettingsCS2)、[AnyBaseLibCS2](https://github.com/NickFox007/AnyBaseLibCS2)、[MenuManagerCS2](https://github.com/NickFox007/MenuManagerCS2)。下载完就解压都会得到`addons` 文件夹，全都复制到`cs2/game/csgo/` 粘贴。
    
3.  下载CS2-SimpleAdmin，去[releases](https://github.com/daffyyyy/CS2-SimpleAdmin/releases)下载最新的，下载完解压得到`addons` 文件夹，依旧粘贴到`cs2/game/csgo/`
    
4.  **关键来了，这步很重要。**进入`cs2\game\csgo\addons\counterstrikesharp\configs` 文件夹，找到`admins.example.json` ，复制、重命名为`admins.json` ，编辑这个新的文件。注意看以下的内容，默认是下面这些内容，我加了些注释。
    
5.  [**【扩展阅读】SteamID、Steam 帐户名称、合并帐户以及删除帐户**](https://help.steampowered.com/zh-cn/faqs/view/2816-BE67-5B69-0FEC)
    

    {
      "Erikj": {                              //用户的名字，字符串记得写在引号内，写个简单好记的英文，别写中文，虽然json对象可以有中文但是也别写
        "identity": "76561197960265731",      //用户的steam64id，这个有steam官方的文档，看文档。文档放在上面扩展阅读
        "immunity": 100,                      //可以不改
        "flags": [                            //这里面的数组是对应的用户权限，如果你不想给root权限，那就要单独给他设置权限，可以有的类型看之前的css官方文档-Admin Framework-Defining Admins-Standard Permissions
          "@css/custom-flag-1",               //建议服主就给自己一个root权限后面进服务器后用插件添加管理，改成@css/root
          "@css/custom-flag-2"                //类型不是root就要按需添加，当然可以有好几个，数组中的值记得用逗号隔开，服主是root就删掉多余的记得删掉上面那个逗号
        ],
        "groups": [
          "#css/admin"                         //管理员分组，一般个人玩的不设置，默认就好
        ],
        "command_overrides": {
          "css_plugins": true,
          "css": false                         //是服主的用户就把这边改成true
        }
      },
      "Another erikj": {                       //这一行开始就和上面的用户没关系了，只是告诉你万一有同名用户怎么办。别管，反正你只要知道用户名和steam用户名没啥关系，这边爱写啥写啥。
        "identity": "STEAM_0:1:1",             //steam32id，但是实际填入不起作用，干脆就用steam64id，获取方便经过检验也好用
        "flags": ["@mycustomplugin/admin"]     //简化写法，懒人就用下面这种用户写法好了，完事给root权限@css/root
      }
    }

最后得到以下的内容（写自己的别复制）：

    {
      "Erikj": {
        "identity": "7656********88471",
        "immunity": 100,
        "flags": [
          "@css/root"
        ],
        "groups": [
          "#css/admin"
        ],
        "command_overrides": {
          "css_plugins": true,
          "css": true
        }
      }
    }

重启cs2容器，进游戏，聊天框输入`!admin` 屏幕中间下方有弹出一个小提示窗口里面选项选择就说明成功配置了管理员权限，没有成功会在聊天框输出内容，出现问题看是不是写错了最后文档和issue解决问题

## 六、安装满十插件

目前最好的满十插件是MatchZy:[https://github.com/shobhit-pathak/MatchZy](https://github.com/shobhit-pathak/MatchZy)

[**【扩展阅读】MatchZy官方文档**](https://shobhit-pathak.github.io/MatchZy/)

1.  下载releases中最新的然后解压，得到`addons、cfg` 文件夹，依旧复制到`cs2/game/csgo/`
    
2.  这个插件基本上不用设置，虽然他有另一套管理员系统，但是他同时还兼容css的管理员（刚刚已经设置过的）
    
3.  需要动的配置去看上面的官方文档这边不做赘述
    
4.  另外记得在`cs2\game\csgo\addons\counterstrikesharp\configs` 找到`core.cfg` 文件，编辑。`"ServerLanguage"`从`en`改为`zh-Hans` 切换为简体中文，上述插件已完成简体中文支持
    
5.  设置完成重启cs2容器