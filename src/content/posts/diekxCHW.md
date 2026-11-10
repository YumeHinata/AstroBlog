---
title: 【笔记】群晖计划任务自动更新SSL证书，已通过Certimate工作流将证书上传到群晖服务器
published: 2025-12-20
# description: "How to use this blog template."
image: "https://rdimg.yumehinata.com/random-wallpaper"
tags: ["群晖","Certimate"]
category: 笔记
draft: false
legacyHash: diekxCHW
---
## 前言：

幻梦为了给博客的域名自动续签SSL证书并且自动更新CDN的SSL证书到最新，所以安装了一个Certimate来进行续签和向提供商部署证书。也正因为已经有了Certimate进行续签工作，所以幻梦极度反感再在群晖上额外部署一个acme.sh。

**_注意看标题_**，后文会**省略**Certimate的安装和工作流如何申请、并部署到CDN提供商的部分，**只讲**怎么向个人的群晖服务器上传证书。如果想直接抄群晖自动计划的脚本请手动跳转。

## 第一步：部署证书到群晖

直入主题我们已经申请好了证书，增加一步节点**部署证书到……**

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E7%BE%A4%E6%99%96%E8%AE%A1%E5%88%92%E4%BB%BB%E5%8A%A1%E8%87%AA%E5%8A%A8%E6%9B%B4%E6%96%B0SSL%E8%AF%81%E4%B9%A6%EF%BC%8C%E5%B7%B2%E9%80%9A%E8%BF%87Certimate%E5%B7%A5%E4%BD%9C%E6%B5%81%E5%B0%86%E8%AF%81%E4%B9%A6%E4%B8%8A%E4%BC%A0%E5%88%B0%E7%BE%A4%E6%99%96%E6%9C%8D%E5%8A%A1%E5%99%A8/QQ20251220-025858.png)

待部署证书选择刚刚申请的证书

部署目标选择远程主机SSH

主机提供商授权选择已有的或者新建

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E7%BE%A4%E6%99%96%E8%AE%A1%E5%88%92%E4%BB%BB%E5%8A%A1%E8%87%AA%E5%8A%A8%E6%9B%B4%E6%96%B0SSL%E8%AF%81%E4%B9%A6%EF%BC%8C%E5%B7%B2%E9%80%9A%E8%BF%87Certimate%E5%B7%A5%E4%BD%9C%E6%B5%81%E5%B0%86%E8%AF%81%E4%B9%A6%E4%B8%8A%E4%BC%A0%E5%88%B0%E7%BE%A4%E6%99%96%E6%9C%8D%E5%8A%A1%E5%99%A8/QQ20251220-030136.png)

名称自己选择记得住的

服务器地址，有DDNS的写DDNS的域名，在内网的写内网ip，有固定公网的写公网ip

服务器端口号同理，看你的群晖设定的端口

认证方式开启了群晖的SSH功能后，即可通过群晖的用户名与密码进行SSH登录

用户名与密码就填写群晖登录用的用户名与密码

完成后提交

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E7%BE%A4%E6%99%96%E8%AE%A1%E5%88%92%E4%BB%BB%E5%8A%A1%E8%87%AA%E5%8A%A8%E6%9B%B4%E6%96%B0SSL%E8%AF%81%E4%B9%A6%EF%BC%8C%E5%B7%B2%E9%80%9A%E8%BF%87Certimate%E5%B7%A5%E4%BD%9C%E6%B5%81%E5%B0%86%E8%AF%81%E4%B9%A6%E4%B8%8A%E4%BC%A0%E5%88%B0%E7%BE%A4%E6%99%96%E6%9C%8D%E5%8A%A1%E5%99%A8/QQ20251220-030531.png)

**注意：一定要打开回退使用SCP，除非你开启了群晖的SFTP功能**

文件格式就PEM

后面的路径，可以先通过scp或者ssh，查看自己想要把证书保存到群晖上挂载的哪一个硬盘的哪一个文件夹

需要注意一点群晖作为个人存储服务器通常需要保证较高的安全性，所以不建议非必要情况下使用root权限

没有root权限的情况下，除了挂载的硬盘外，其余位置基本上无法访问。

    #生成server.pem
    awk '
    /BEGIN CERTIFICATE/ {i++}
    i==1 {print}
    ' [你选择保存的服务器证书文件路径]/fullchain.pem > [你选择保存的服务器证书文件路径]/server.pem

在后置命令中插入以下代码，记得编辑修改占位的内容

完成后**保存更改，选择发布，点击运行**

进入仪表板，查看刚刚运行的工作流是否成功

成功后我们选择的保存位置会得到以下几个文件

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E7%BE%A4%E6%99%96%E8%AE%A1%E5%88%92%E4%BB%BB%E5%8A%A1%E8%87%AA%E5%8A%A8%E6%9B%B4%E6%96%B0SSL%E8%AF%81%E4%B9%A6%EF%BC%8C%E5%B7%B2%E9%80%9A%E8%BF%87Certimate%E5%B7%A5%E4%BD%9C%E6%B5%81%E5%B0%86%E8%AF%81%E4%B9%A6%E4%B8%8A%E4%BC%A0%E5%88%B0%E7%BE%A4%E6%99%96%E6%9C%8D%E5%8A%A1%E5%99%A8/QQ20251220-031737.png)

注意观察server.pem文件的大小一定不能是0kb

到此第一步结束

## 第二步：自动计划

首先讲群晖原本提供了一套官方的api，但是那个api过于的繁琐了。我们直接修改默认证书文件夹里的文件，并在修改后重启web服务完成证书的更新。

我们要修改文件的文件夹会在`/usr/syno/etc/certificate/_archive/` 路径下

我们先通过ssh连接到群晖服务器，进行sudo提权

    sudo -i
    #输入你登录的账户密码，进入root账户
    ls /usr/syno/etc/certificate/_archive
    #查看_archive文件夹下有还有哪些文件或文件夹
    #该路径必须要root权限才可以访问，请不要跳过sudo -i

正常情况他会输出四个目录`DEFAULT`、`INFO`、`SERVICES` 和一个没有明确意义字符的文件夹

我们要找的就是那个看起来像乱码的文件夹，先记住他的名字，等会要用到

进入群晖的**控制面板**\-选择**任务计划**

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E7%BE%A4%E6%99%96%E8%AE%A1%E5%88%92%E4%BB%BB%E5%8A%A1%E8%87%AA%E5%8A%A8%E6%9B%B4%E6%96%B0SSL%E8%AF%81%E4%B9%A6%EF%BC%8C%E5%B7%B2%E9%80%9A%E8%BF%87Certimate%E5%B7%A5%E4%BD%9C%E6%B5%81%E5%B0%86%E8%AF%81%E4%B9%A6%E4%B8%8A%E4%BC%A0%E5%88%B0%E7%BE%A4%E6%99%96%E6%9C%8D%E5%8A%A1%E5%99%A8/QQ20251220-033229.png)

选择**新增-计划的任务-用户定义的脚步**

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E7%BE%A4%E6%99%96%E8%AE%A1%E5%88%92%E4%BB%BB%E5%8A%A1%E8%87%AA%E5%8A%A8%E6%9B%B4%E6%96%B0SSL%E8%AF%81%E4%B9%A6%EF%BC%8C%E5%B7%B2%E9%80%9A%E8%BF%87Certimate%E5%B7%A5%E4%BD%9C%E6%B5%81%E5%B0%86%E8%AF%81%E4%B9%A6%E4%B8%8A%E4%BC%A0%E5%88%B0%E7%BE%A4%E6%99%96%E6%9C%8D%E5%8A%A1%E5%99%A8/QQ20251220-033415.png)

任务名称选择一个自己记得住的英文名

用户账户一定要是root账户，否则无法编辑文件夹里的文件。

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E7%BE%A4%E6%99%96%E8%AE%A1%E5%88%92%E4%BB%BB%E5%8A%A1%E8%87%AA%E5%8A%A8%E6%9B%B4%E6%96%B0SSL%E8%AF%81%E4%B9%A6%EF%BC%8C%E5%B7%B2%E9%80%9A%E8%BF%87Certimate%E5%B7%A5%E4%BD%9C%E6%B5%81%E5%B0%86%E8%AF%81%E4%B9%A6%E4%B8%8A%E4%BC%A0%E5%88%B0%E7%BE%A4%E6%99%96%E6%9C%8D%E5%8A%A1%E5%99%A8/QQ20251220-033552.png)

选择的每月重复日期要和Certimate续签的日期一致

开始时间一定要晚于Certimate续签完成后的时间

如果之后出现无法保存的情况，先勾选在以下天重运行-每天，然后再切换回在以下日期运行

    #cert_id为刚刚记下的文件夹名字
    CERT_ID=[记得替换成你自己的文件夹名字]
    CERT_DIR=/usr/syno/etc/certificate/_archive/$CERT_ID
    
    #下面是刚刚存放证书的路径，记得改成自己的。文件名默认你们和幻梦的一致了
    sudo cp [改成自己存放证书的路径]/server.pem    $CERT_DIR/cert.pem
    sudo cp [改成自己存放证书的路径]/fullchain.pem $CERT_DIR/fullchain.pem
    sudo cp [改成自己存放证书的路径]/privkey.pem   $CERT_DIR/privkey.pem
    
    #设定权限
    sudo chown root:root $CERT_DIR/*
    sudo chmod 600 $CERT_DIR/*
    
    #重新启动服务
    sudo synosystemctl restart nginx

修改后复制进去

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E7%BE%A4%E6%99%96%E8%AE%A1%E5%88%92%E4%BB%BB%E5%8A%A1%E8%87%AA%E5%8A%A8%E6%9B%B4%E6%96%B0SSL%E8%AF%81%E4%B9%A6%EF%BC%8C%E5%B7%B2%E9%80%9A%E8%BF%87Certimate%E5%B7%A5%E4%BD%9C%E6%B5%81%E5%B0%86%E8%AF%81%E4%B9%A6%E4%B8%8A%E4%BC%A0%E5%88%B0%E7%BE%A4%E6%99%96%E6%9C%8D%E5%8A%A1%E5%99%A8/QQ20251220-034256.png)

根据个人需要自行选择是否发送邮件给自己提醒

如果需要发邮件的记得在**控制面板-通知设置-电子邮件-发件人**中添加

完成后**确定**保存

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E7%BE%A4%E6%99%96%E8%AE%A1%E5%88%92%E4%BB%BB%E5%8A%A1%E8%87%AA%E5%8A%A8%E6%9B%B4%E6%96%B0SSL%E8%AF%81%E4%B9%A6%EF%BC%8C%E5%B7%B2%E9%80%9A%E8%BF%87Certimate%E5%B7%A5%E4%BD%9C%E6%B5%81%E5%B0%86%E8%AF%81%E4%B9%A6%E4%B8%8A%E4%BC%A0%E5%88%B0%E7%BE%A4%E6%99%96%E6%9C%8D%E5%8A%A1%E5%99%A8/QQ20251220-034533.png)

勾选刚刚保存的任务，点击应用完成计划的启动

也可以选中刚刚保存的计划，点击运行，查看运行效果

或者进入ssh终端

    sudo -i
    #输入密码
    cd /usr/syno/etc/certificate/_archive/[你存放证书的默认文件夹]
    #记得替换成你的路径
    ls -l
    #输出所有文件的修改日期

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E7%BE%A4%E6%99%96%E8%AE%A1%E5%88%92%E4%BB%BB%E5%8A%A1%E8%87%AA%E5%8A%A8%E6%9B%B4%E6%96%B0SSL%E8%AF%81%E4%B9%A6%EF%BC%8C%E5%B7%B2%E9%80%9A%E8%BF%87Certimate%E5%B7%A5%E4%BD%9C%E6%B5%81%E5%B0%86%E8%AF%81%E4%B9%A6%E4%B8%8A%E4%BC%A0%E5%88%B0%E7%BE%A4%E6%99%96%E6%9C%8D%E5%8A%A1%E5%99%A8/QQ20251220-035056.png)

确认文件为近期修改即可

## END：

就这么简单，祝大家玩得愉快