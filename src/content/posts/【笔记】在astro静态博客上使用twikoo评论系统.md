---
title: 【笔记】在Astro静态博客上使用Twikoo评论系统
published: 2026-10-03
description: Giscus的评论系统虽然简单方便，但是对于希望保证数据安全或是匿名的访客来说有点不友好了，而且近段时间的网络访问也时常出现问题，于是幻梦把博客的评论系统换成了 Twikoo（又是白嫖 Edgeone 的一天），写这个笔记的目的实际是顺便测试一下评论功能是否正常。
image: https://pximg.yumehinata.com/img-master/img/2026/10/03/00/30/13/150379690_p0_master1200.jpg
tags:
  - Fuwari
  - Astro
  - Edgeone
  - Twikoo
  - 评论
category: 笔记
draft: false
---

封面图：[https://www.pixiv.net/artworks/150379690](https://www.pixiv.net/artworks/150379690)

## 前言：

其实简介里写了，就是Gisucs不好用，而且因为一些奇妙的问题最近网页加载评论也总是出错，那就换一个评论系统吧。

与静态页面不同，评论系统是必定要数据库的。排除了家里云，幻梦要上哪搞一个容量充足的廉价数据库呢？传统的手法是 MongoDB Atlas，他提供了500MiB的数据库，也是 Twikoo 在以往推荐的方案。那么有没有更大的呢？有的，有的。Edgeone Makers（以前叫Pages）提供了1GB 的 Blob 存储和1GB的 KV存储（这次 KV存储用不上）。需要注意，这个评论加载是需要用到 Edgeone Functions 的，而幻梦之前已经部署了一个随机图API，虽然说 Edgeone Functions 请求数一个月有 300W次，但是幻梦还是果断用了 Edgeone 的海外账号（反正空着也是空着）

## 第一步：部署 Twikoo 到 Edgeone

其实官方文档已经写的很详细了，[https://twikoo.js.org/backend.html#edgeone-makers-%E9%83%A8%E7%BD%B2](https://twikoo.js.org/backend.html#edgeone-makers-%E9%83%A8%E7%BD%B2)

我们只需要下载[https://github.com/twikoojs/twikoo/raw/main/templates/edgeone-makers/twikoo-edgeone-makers.zip](https://github.com/twikoojs/twikoo/raw/main/templates/edgeone-makers/twikoo-edgeone-makers.zip)

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E5%9C%A8astro%E9%9D%99%E6%80%81%E5%8D%9A%E5%AE%A2%E4%B8%8A%E4%BD%BF%E7%94%A8twikoo%E8%AF%84%E8%AE%BA%E7%B3%BB%E7%BB%9F/QQ20261003-193641.png)

直接把 ZIP 上传到 Edgeone Makers上完成部署。并在设置里对`node.js` 的版本进行调整和新增环境变量`TWIKOO_SMTP_BRIDGE_TOKEN`，值可以是一个任意复杂的字符串

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E5%9C%A8astro%E9%9D%99%E6%80%81%E5%8D%9A%E5%AE%A2%E4%B8%8A%E4%BD%BF%E7%94%A8twikoo%E8%AF%84%E8%AE%BA%E7%B3%BB%E7%BB%9F/QQ20261003-223137.png)

并且绑定一个域名，由于幻梦可以用中国区的加速，所以这里的CNAME可以不管他

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E5%9C%A8astro%E9%9D%99%E6%80%81%E5%8D%9A%E5%AE%A2%E4%B8%8A%E4%BD%BF%E7%94%A8twikoo%E8%AF%84%E8%AE%BA%E7%B3%BB%E7%BB%9F/QQ20261007-002231.png)

如果你也是这样的情况，那么我们通过 CDN 的方式进行代理即可

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E5%9C%A8astro%E9%9D%99%E6%80%81%E5%8D%9A%E5%AE%A2%E4%B8%8A%E4%BD%BF%E7%94%A8twikoo%E8%AF%84%E8%AE%BA%E7%B3%BB%E7%BB%9F/QQ20261007-002841.png)

源站这里填写前面 CNAME 的值即可，回源的 host 头就是我们之前填写绑定的域名。之后的访问就是使用成功加速的域名

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E5%9C%A8astro%E9%9D%99%E6%80%81%E5%8D%9A%E5%AE%A2%E4%B8%8A%E4%BD%BF%E7%94%A8twikoo%E8%AF%84%E8%AE%BA%E7%B3%BB%E7%BB%9F/QQ20261007-003523.png)

这样能够访问就成功了

## 第二步：部署到 Fuwari 前端

由于官方没有提供 Astro 的方法所以我们需要自行解决一下，这里幻梦以 Fuwari 为例

首先，我们新增一个`Twikoo.astro`。我们后面的大部分修改该都在这里进行，这样不会严重影响到博客本身。文件路径可以参考这个`src\components\Twikoo.astro`

```plain
<script
    is:inline
    src="https://fastly.jsdelivr.net/npm/twikoo@2.0.12/dist/twikoo.min.js"
></script>


<div
    id="comments-container"
    class="flex card-base z-10 px-6 md:px-9 pt-6 pb-4 relative w-full mt-4"
>
</div>


<script is:inline>
    (() => {
        const init = () => {
            const container = document.getElementById("comments-container");


            if (!container) return;
            if (container.dataset.twikooInitialized === "true") return;


            if (typeof twikoo === "undefined") {
                setTimeout(init, 50);
                return;
            }


            container.dataset.twikooInitialized = "true";


            twikoo.init({
                envId: "https://这里写你刚刚绑定的域名/",
                el: "#comments-container",
                lang: "zh-CN",
            });
        };


        init();


        document.addEventListener("astro:page-load", init);
    })();
</script>
```

然后我们在`src\layouts\MainGridLayout.astro`中通过`import Twikoo from "@components/Twikoo.astro";`引入文件，并在以下位置插入评论

```plain
<main
id="swup-container"
class="transition-swup-fade col-span-2 lg:col-span-1 overflow-hidden"
>
<div id="content-wrapper" class="onload-animation">
<!-- the overflow-hidden here prevent long text break the layout-->
<!-- make id different from windows.swup global property -->
<slot />

{showComments && <Twikoo />} //这里就是我们放评论的位置

<div
class="footer col-span-2 onload-animation hidden lg:block"
>
<Footer />
</div>
</div>
</main>
```

这样我们就在文章页内加入了Twikoo评论功能

## 第三步：获取管理员权限并设置 Twikoo

当首次打开 Twikoo 评论时需要及时设置管理员密码，管理员入口在评论框右下角设置按钮

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E5%9C%A8astro%E9%9D%99%E6%80%81%E5%8D%9A%E5%AE%A2%E4%B8%8A%E4%BD%BF%E7%94%A8twikoo%E8%AF%84%E8%AE%BA%E7%B3%BB%E7%BB%9F/QQ20261008-001141.png)

设置密码并登录，我们进行以下设置

这里填写我们的邮箱地址，当我们收到回复时可以及时发现

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E5%9C%A8astro%E9%9D%99%E6%80%81%E5%8D%9A%E5%AE%A2%E4%B8%8A%E4%BD%BF%E7%94%A8twikoo%E8%AF%84%E8%AE%BA%E7%B3%BB%E7%BB%9F/QQ20261008-001418.png)

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E5%9C%A8astro%E9%9D%99%E6%80%81%E5%8D%9A%E5%AE%A2%E4%B8%8A%E4%BD%BF%E7%94%A8twikoo%E8%AF%84%E8%AE%BA%E7%B3%BB%E7%BB%9F/QQ20261008-001637.png)

这里的差别不大，拿 itdog 跑一下看看延迟最低的那个选择就好了

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E5%9C%A8astro%E9%9D%99%E6%80%81%E5%8D%9A%E5%AE%A2%E4%B8%8A%E4%BD%BF%E7%94%A8twikoo%E8%AF%84%E8%AE%BA%E7%B3%BB%E7%BB%9F/QQ20261008-001723.png)

这里很重要，我们设置一个口令。当我们输入这个口令后，右下角的设置图标才会出现，建议单独设置口令

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E5%9C%A8astro%E9%9D%99%E6%80%81%E5%8D%9A%E5%AE%A2%E4%B8%8A%E4%BD%BF%E7%94%A8twikoo%E8%AF%84%E8%AE%BA%E7%B3%BB%E7%BB%9F/QQ20261008-001756.png)

在官方文档里有介绍，Edgeone makers 是无法使用反垃圾功能的，但是可以先准备好，也许哪次更新后就可以用了，也可以在我的评论区里试试，到底有没有用（**别发真的广告**）

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E5%9C%A8astro%E9%9D%99%E6%80%81%E5%8D%9A%E5%AE%A2%E4%B8%8A%E4%BD%BF%E7%94%A8twikoo%E8%AF%84%E8%AE%BA%E7%B3%BB%E7%BB%9F/QQ20261008-001945.png)

最后是设置一个邮箱用于通知大家收到的回复，邮箱系统我们之前介绍过，以前的动态博客时幻梦就有准备，可以看往期内容，这里不过多介绍。[**【白嫖】使用Lark建立邮箱服务**](https://www.yumehinata.com/posts/oyeiedxp/)

需要注意，如果使用支持 ssl 协议的 stmp 端口，请在`STMP_SECURE`中写上`true`

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E5%9C%A8astro%E9%9D%99%E6%80%81%E5%8D%9A%E5%AE%A2%E4%B8%8A%E4%BD%BF%E7%94%A8twikoo%E8%AF%84%E8%AE%BA%E7%B3%BB%E7%BB%9F/QQ20261008-002221.png)

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E5%9C%A8astro%E9%9D%99%E6%80%81%E5%8D%9A%E5%AE%A2%E4%B8%8A%E4%BD%BF%E7%94%A8twikoo%E8%AF%84%E8%AE%BA%E7%B3%BB%E7%BB%9F/QQ20261008-002307.png)

**_一定要记得点击保存_**

**_一定要记得点击保存_**

**_一定要记得点击保存_**

最后再我们进行发件测试

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E5%9C%A8astro%E9%9D%99%E6%80%81%E5%8D%9A%E5%AE%A2%E4%B8%8A%E4%BD%BF%E7%94%A8twikoo%E8%AF%84%E8%AE%BA%E7%B3%BB%E7%BB%9F/QQ20261008-003637.png)

到此我们的 Twikoo 基本上就部署好了，Twikoo 还有官方文档介绍了API调用的方式，不过这里就不过多写了[https://twikoo.js.org/api.html#on-twikoo-loaded](https://twikoo.js.org/api.html#on-twikoo-loaded)

希望大家玩得愉快
