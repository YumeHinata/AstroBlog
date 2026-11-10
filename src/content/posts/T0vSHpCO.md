---
title: 【笔记】CS2服务器利用stun或ipv6公网连接，通过webhook让kook机器人将改变的ip与端口发送至频道
published: 2025-11-02
# description: "How to use this blog template."
image: "https://rdimg.yumehinata.com/random-wallpaper"
tags: ["webhook","KOOK","CS2","steam"]
category: 笔记
draft: false
legacyHash: T0vSHpCO
---
**重大消息，我们的v社终于是支持ipv6域名解析和通过ipv6地址的方式连接到服务器了。不知道什么时候支持的，幻梦也不记得在更新日志里面有提到相关内容，且用且珍惜。（这种好事应该不会撤回吧）**

## 前言：

记得之前讲过stun方式连接非常复杂吗？因为实在搞不定不规则变化的端口与ip，如果能在端口或者ip变化时能够发送消息就好了。没错lucky是支持webhook的，但是webhook也得有接收端嘛，而且数据持久化必须得依赖一台服务器，那么就存在一个自建的成本了。有没有不需要自建又可以发送消息的服务呢？消息机器人、消息机器人早已不罕见了，qq官方都已经支持了消息机器人，而幻梦通常与好友联机的平台则是kook，正好kook也有官方的机器人支持。

## 创建一个机器人

kook开发者平台内创建一个应用。[https://developer.kookapp.cn/app/index](https://developer.kookapp.cn/app/index)

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91CS2%E6%9C%8D%E5%8A%A1%E5%99%A8%E5%88%A9%E7%94%A8stun%E6%88%96ipv6%E5%85%AC%E7%BD%91%E8%BF%9E%E6%8E%A5%EF%BC%8C%E9%80%9A%E8%BF%87webhook%E8%AE%A9kook%E6%9C%BA%E5%99%A8%E4%BA%BA%E5%B0%86%E6%94%B9%E5%8F%98%E7%9A%84ip%E4%B8%8E%E7%AB%AF%E5%8F%A3%E5%8F%91%E9%80%81%E8%87%B3%E9%A2%91%E9%81%93/QQ20251101-235428_1.png)

在邀请链接里做如下设置

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91CS2%E6%9C%8D%E5%8A%A1%E5%99%A8%E5%88%A9%E7%94%A8stun%E6%88%96ipv6%E5%85%AC%E7%BD%91%E8%BF%9E%E6%8E%A5%EF%BC%8C%E9%80%9A%E8%BF%87webhook%E8%AE%A9kook%E6%9C%BA%E5%99%A8%E4%BA%BA%E5%B0%86%E6%94%B9%E5%8F%98%E7%9A%84ip%E4%B8%8E%E7%AB%AF%E5%8F%A3%E5%8F%91%E9%80%81%E8%87%B3%E9%A2%91%E9%81%93/QQ20251101-235648.png)

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91CS2%E6%9C%8D%E5%8A%A1%E5%99%A8%E5%88%A9%E7%94%A8stun%E6%88%96ipv6%E5%85%AC%E7%BD%91%E8%BF%9E%E6%8E%A5%EF%BC%8C%E9%80%9A%E8%BF%87webhook%E8%AE%A9kook%E6%9C%BA%E5%99%A8%E4%BA%BA%E5%B0%86%E6%94%B9%E5%8F%98%E7%9A%84ip%E4%B8%8E%E7%AB%AF%E5%8F%A3%E5%8F%91%E9%80%81%E8%87%B3%E9%A2%91%E9%81%93/QQ20251101-235721_1.png)

通过邀请链接将机器人添加到需要的服务器内

## 消息模板

这里就要痛骂kook开发文档了，提供了KMarkdown和卡片消息的功能，但是如果我们直接看文档中的频道消息相关接口的内容你会发现完全无法使用卡片消息，以及KMarkdown会存在各种奇怪bug。两者正确的打开方式是通过机器人的模板管理功能，但是开发者文档里从来没提到模板这一项内容。

首先是编辑一个自己需要的消息模板

官方提供了卡片编辑器与markdown编辑器[https://www.kookapp.cn/tools/message-builder.html#/kmarkdown](https://www.kookapp.cn/tools/message-builder.html#/kmarkdown)。进入后按需自行切换即可

设计完消息内容后，点击复制代码

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91CS2%E6%9C%8D%E5%8A%A1%E5%99%A8%E5%88%A9%E7%94%A8stun%E6%88%96ipv6%E5%85%AC%E7%BD%91%E8%BF%9E%E6%8E%A5%EF%BC%8C%E9%80%9A%E8%BF%87webhook%E8%AE%A9kook%E6%9C%BA%E5%99%A8%E4%BA%BA%E5%B0%86%E6%94%B9%E5%8F%98%E7%9A%84ip%E4%B8%8E%E7%AB%AF%E5%8F%A3%E5%8F%91%E9%80%81%E8%87%B3%E9%A2%91%E9%81%93/QQ20251102-000523.png)

进入模板管理-新建模板-填写内容

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91CS2%E6%9C%8D%E5%8A%A1%E5%99%A8%E5%88%A9%E7%94%A8stun%E6%88%96ipv6%E5%85%AC%E7%BD%91%E8%BF%9E%E6%8E%A5%EF%BC%8C%E9%80%9A%E8%BF%87webhook%E8%AE%A9kook%E6%9C%BA%E5%99%A8%E4%BA%BA%E5%B0%86%E6%94%B9%E5%8F%98%E7%9A%84ip%E4%B8%8E%E7%AB%AF%E5%8F%A3%E5%8F%91%E9%80%81%E8%87%B3%E9%A2%91%E9%81%93/QQ20251102-000725_1.png)

模板标题按自己习惯填写不重要

模板类型暂时只支持twig

消息类型刚刚选择卡片消息的这里选**卡片消息json**，kmarkdown的选kmarkdown

**测试数据里面不要填内容**，测试完他也不会自己删掉的

把刚刚复制的代码填到模板内容里

twig语法我们这里不做介绍，可自行点击官方提供的twig文档查看。

我们这里只需要twig的变量功能`{{content}}` 这对于用过vue开发的人应该已经非常熟悉了吧。

在需要变量的地方填入这个，就像这样

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91CS2%E6%9C%8D%E5%8A%A1%E5%99%A8%E5%88%A9%E7%94%A8stun%E6%88%96ipv6%E5%85%AC%E7%BD%91%E8%BF%9E%E6%8E%A5%EF%BC%8C%E9%80%9A%E8%BF%87webhook%E8%AE%A9kook%E6%9C%BA%E5%99%A8%E4%BA%BA%E5%B0%86%E6%94%B9%E5%8F%98%E7%9A%84ip%E4%B8%8E%E7%AB%AF%E5%8F%A3%E5%8F%91%E9%80%81%E8%87%B3%E9%A2%91%E9%81%93/QQ20251102-001335_1.png)

这里的`data.ip` 是要根据之后你webhook请求中的content来决定的，但是`data`这个是全局变量不需要调整的。开发者文档里又没提，还是看生成示例数据得到的。

设置完成后点击提交

## Lucky中设置webhook

在正常配置完stun的相关部分后，我们打开webhook开关。

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91CS2%E6%9C%8D%E5%8A%A1%E5%99%A8%E5%88%A9%E7%94%A8stun%E6%88%96ipv6%E5%85%AC%E7%BD%91%E8%BF%9E%E6%8E%A5%EF%BC%8C%E9%80%9A%E8%BF%87webhook%E8%AE%A9kook%E6%9C%BA%E5%99%A8%E4%BA%BA%E5%B0%86%E6%94%B9%E5%8F%98%E7%9A%84ip%E4%B8%8E%E7%AB%AF%E5%8F%A3%E5%8F%91%E9%80%81%E8%87%B3%E9%A2%91%E9%81%93/QQ20251102-002111.png)

接口地址是`https://www.kookapp.cn/api/v3/message/create`

请求头是两部分`Authorization: Bot` (这里确实有一个空格)`你的机器人token令牌` token去机器人中找，连接方式下有一个Token点击复制。

最后这一行是`Authorization: Bot 123123123` 这样一个效果

请求体：

    {"type": 10,
    "target_id":"",
    "guild_id":"",
    "content":"{\"ip\":\"#{ipAddr}\"}",
    "template_id":
    }

`type` 只有两个值9和10，9是kmarkdown或者普通消息，10是卡片消息

`target_id` 是频道的id，服务器内的频道右键复制id

`guild_id` 是服务器id，服务器右键复制id。开发者文档里又没写，只有测试报错才说要写guild\_id

`content` 是我们需要传入的内容，可以简单粗暴的理解为上文的`data` 全局变量等于`content` ，这里可以注意到我们的`content`用了转义字符，因为`content`只允许字符串，但是实际上最后又可以被转换成对象。

之前幻梦设置的是`{{data.ip}}` 这里传的就自然是`ip`这个变量和他的值了

`template_id` 是刚刚创建的模板的id，去模板管理中复制即可

## 结尾

这个其实没什么困难的，如果有详细的开发者文档的话。可是他没有，并且还留了一堆的坑。

webhook中的内容填完了，点击测试发送一个消息看看是否正确。正确的点击修改进行保存。

祝大家玩得愉快