---
title: 【笔记】Docker+Qemu运行Aarch64版本网易UU加速器插件
published: 2026-07-26
description: 总所周知，uu加速器插件的openwrt版本是缺少手机与pc加速功能的。直接反编译uuplugin也不太靠谱，而且不方便后期维护。如果通过qemu进行模拟，就可以直接使用原版的加速器插件。
image: https://rdimg.yumehinata.com/random-wallpaper
tags:
  - Qemu
  - UUplugin
  - UUgamebooster
  - Docker
  - UU
category: 笔记
draft: false
---

## 声明：

这个版本是ai辅助搓出来的（实际上幻梦和ai编辑的部分只有Dockerfile和start.sh，其他文件是小米的rootfs和uu的nx30pro版uu插件原本拼出来的，**不存在逆向程序逻辑的行为**），目前仅是能够日常使用，有没有更多的bug还不知道。**这个项目仅为学习qemu和docker使用，请勿进行盈利，尊重网易与小米的知识产权。**

## **前言：**

**目前幻梦搜索遍了全网也没找到一个x86架构uu加速器插件激活pc、手机加速功能的版本。但是幻梦真的很想要这些功能，又不好把这些品牌路由器作为主路由，所以就有了现在这个整体上不够完美的方案。**

**在这过程中也参考了各个社区里其他大佬在比的平台上适配的方案。具体如下：**

[**https://www.right.com.cn/forum/forum.php?mod=viewthread&tid=8301860&highlight=UU**](https://www.right.com.cn/forum/forum.php?mod=viewthread&tid=8301860&highlight=UU)

[**https://www.right.com.cn/forum/thread-8266895-1-1.html**](https://www.right.com.cn/forum/thread-8266895-1-1.html)

[**https://github.com/lmq8267/luci-app-uugamebooster**](https://github.com/lmq8267/luci-app-uugamebooster)

**根据以上大佬的项目，幻梦提取到了一个接口**`https://router.uu.163.com/api/`。其中我们openwrt-x86一般是通过[https://router.uu.163.com/api/plugin?type=openwrt-x86_64](https://router.uu.163.com/api/plugin?type=openwrt-x86_64)来获取最新发布的版本，并通过合理的推测幻梦目前探索到更多的接口。

https://router.uu.163.com/api/plugin?type=h3c （版本过旧为4.14.6）

https://router.uu.163.com/api/plugin?type=h3c-nx30pro （aarch64架构）

https://router.uu.163.com/api/plugin?type=h3c-nx15

https://router.uu.163.com/api/plugin?type=h3c-bx54 （arm32架构）

https://router.uu.163.com/api/plugin?type=jd-hr06 （mipsel架构）

https://router.uu.163.com/api/plugin?type=steam-deck-plugin-x86_64 （steamdeck专属）

https://router.uu.163.com/api/plugin?type=merlin-mipsel （华硕梅林，可供padavan使用）

当下的uu远程桌面支持WOL的路由器机型如下：[https://uuyc.163.com/help/20260407/40220_1294974.html](https://uuyc.163.com/help/20260407/40220_1294974.html) 

幻梦最后选定了已h3c-nx30pro为基础进行方案的实施。

## 借物表：

要想用qemu肯定得有完整的运行库文件支持，那么去哪里找aarch64的运行库呢？还记得我们上一篇内容刚刚解包了一个小米的路由器固件，这里刚好借用一下。uu插件更简单，https://router.uu.163.com/api/plugin?type=h3c-nx30pro 能获取到最新的运行程序的url直接下载下来就好了。

最后幻梦把文件组合成以下的结构

```plain
uu-docker/

├── Dockerfile
├── start.sh
├── rootfs/
│
├── bin/
├── sbin/
├── lib/
├── usr/
├── etc/
├── tmp/
│
├── uuplugin
├── xuplugin-guardian
└── uu.conf
```

其中：

| 文件 | 作用 |
| --- | --- |
| uuplugin | UU 主程序 |
| xuplugin-guardian | 守护程序 |
| uu.conf | 配置文件 |
| rootfs | 从小米 固件提取的运行环境 |

## 启动脚本与Dockerfile：

start.sh

```sh
#!/bin/sh
echo "=================================="
echo "UU Plugin Docker Runtime"
echo "=================================="


# ── QEMU 环境（仅影响动态库加载，不影响 openat 等文件 syscall） ──
export QEMU_LD_PREFIX=/arm-root
export LD_LIBRARY_PATH=/lib:/usr/lib
cd /arm-root


# ── 动态链接器检查 ──
[ -s /arm-root/lib/ld-musl-aarch64.so.1 ] || ln -sf libc.so /arm-root/lib/ld-musl-aarch64.so.1


# ── iptables legacy 切换 ──
update-alternatives --set iptables /usr/sbin/iptables-legacy 2>/dev/null
update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy 2>/dev/null


# ── 设备标识文件（绑定必需，创建在容器真实路径） ──
echo "CST-8" > /etc/TZ
echo "R3600" > /var/model
mkdir -p /var/tmp/uu /tmp/uu
if [ ! -f /var/tmp/uu/h3c_info ]; then
    MAC=$(cat /sys/class/net/eth0/address 2>/dev/null || cat /sys/class/net/br-lan/address 2>/dev/null || echo "00:00:00:00:00:00")
    SN=$(cat /proc/sys/kernel/random/uuid | tr -d '-' | head -c 16)
    printf 'manucode=R3600\nproductname=R3600\nmac=%s\nsn=%s\n' "$MAC" "$SN" > /var/tmp/uu/h3c_info
    echo "[INFO] h3c_info created (MAC=$MAC, SN=$SN)"
fi


# ── 启动 ──
echo "[INFO] Starting uuplugin..."
exec /usr/bin/qemu-aarch64-static ./uuplugin
```

Dockerfile

```docker
FROM debian:bullseye-slim


ENV DEBIAN_FRONTEND=noninteractive


RUN apt-get update && \
    apt-get install -y \
        qemu-user-static \
        bridge-utils \
        iproute2 \
        iptables \
        procps \
        net-tools \
        tcpdump \
        strace \
        curl \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/*


# ARM rootfs（精简版：仅含 uuplugin 运行所需的最小依赖集）
COPY rootfs /arm-root
COPY start.sh /start.sh


RUN chmod +x /start.sh /arm-root/uuplugin /arm-root/xuplugin-guardian && \
    # ── 1. 修复符号链接（Windows 构建会丢失 symlink） ──
    ln -sf libc.so /arm-root/lib/ld-musl-aarch64.so.1 && \
    cd /arm-root/bin && \
    for cmd in sh cat tar mv rm grep mkdir echo sleep ps kill ls pwd date \
               ln cp chmod touch uname gzip gunzip sed head ping netstat \
               zcat dd df sync true false mktemp watch ip; do \
        ln -sf busybox "$cmd"; \
    done && \
    # ── 2. 创建运行时目录和 sbin 工具链接 ──
    mkdir -p /arm-root/var/tmp/uu /arm-root/tmp/uu /arm-root/sbin && \
    cd /arm-root/sbin && \
    for cmd in ifconfig insmod route; do \
        ln -sf ../bin/busybox "$cmd"; \
    done && \
    # ── 3. iptables 兼容（ARM 进程调用 iptables 时回退到宿主机） ──
    XTD=$(dirname $(find /usr/lib -name "libxt_tcp.so" | head -1)) && \
    mv /usr/sbin/iptables-legacy /usr/sbin/iptables-legacy.real && \
    mv /usr/sbin/ip6tables-legacy /usr/sbin/ip6tables-legacy.real && \
    mkdir -p /usr/libexec/iptables && \
    ln -sf /usr/sbin/iptables-legacy.real /usr/libexec/iptables/iptables-legacy && \
    ln -sf /usr/sbin/iptables-legacy.real /usr/libexec/iptables/iptables-legacy-save && \
    ln -sf /usr/sbin/iptables-legacy.real /usr/libexec/iptables/iptables-legacy-restore && \
    ln -sf /usr/sbin/ip6tables-legacy.real /usr/libexec/iptables/ip6tables-legacy && \
    ln -sf /usr/sbin/ip6tables-legacy.real /usr/libexec/iptables/ip6tables-legacy-save && \
    ln -sf /usr/sbin/ip6tables-legacy.real /usr/libexec/iptables/ip6tables-legacy-restore && \
    printf '#!/bin/sh\nexport XTABLES_LIBDIR=%s\nexec /usr/libexec/iptables/iptables-legacy "$@"\n' "$XTD" > /usr/sbin/iptables-legacy && \
    printf '#!/bin/sh\nexport XTABLES_LIBDIR=%s\nexec /usr/libexec/iptables/ip6tables-legacy "$@"\n' "$XTD" > /usr/sbin/ip6tables-legacy && \
    chmod +x /usr/sbin/iptables-legacy /usr/sbin/ip6tables-legacy && \
    update-alternatives --set iptables /usr/sbin/iptables-legacy 2>/dev/null || true && \
    update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy 2>/dev/null || true


WORKDIR /arm-root
ENTRYPOINT ["/start.sh"]
```

## 编译与使用：

::github{repo="YumeHinata/uugamebooster-docker"}

### 从源文件编译：

在`uugamebooster-docker`目录下执行

```bash
docker build \ 
-t uugamebooster-docker:latest .
```

完成编译，并通过以下命令完成镜像的导出

```plain
docker save \ 
-o uugamebooster-docker.tar \ 
uugamebooster-docker:latest
```

这个命令会生成一个`uugamebooster-docker.tar`文件，把文件上传到路由器的tmp文件夹，执行以下命令。

```plain
docker load \ 
-i uugamebooster-docker.tar
```

得到镜像文件。

### 拉取镜像：

```bash
docker pull yumehinata/uugamebooster-docker:main
```

可通过这个命令拉取镜像或通过网页面板`yumehinata/uugamebooster-docker:main`完成拉取

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91docker-qemu%E8%BF%90%E8%A1%8Caarch64%E7%89%88%E6%9C%AC%E7%BD%91%E6%98%93uu%E5%8A%A0%E9%80%9F%E5%99%A8%E6%8F%92%E4%BB%B6/QQ20260726-193412.png)

### 添加容器：

IstoreOS的docker可按如下设置

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91docker-qemu%E8%BF%90%E8%A1%8Caarch64%E7%89%88%E6%9C%AC%E7%BD%91%E6%98%93uu%E5%8A%A0%E9%80%9F%E5%99%A8%E6%8F%92%E4%BB%B6/QQ20260726-193730.png)

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91docker-qemu%E8%BF%90%E8%A1%8Caarch64%E7%89%88%E6%9C%AC%E7%BD%91%E6%98%93uu%E5%8A%A0%E9%80%9F%E5%99%A8%E6%8F%92%E4%BB%B6/QQ20260726-193811.png)

设置完毕后点击提交

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91docker-qemu%E8%BF%90%E8%A1%8Caarch64%E7%89%88%E6%9C%AC%E7%BD%91%E6%98%93uu%E5%8A%A0%E9%80%9F%E5%99%A8%E6%8F%92%E4%BB%B6/QQ20260726-193924.png)

勾选对应容器后点击启动

### 绑定路由器：

手机uu主机加速器中选择合作款路由器

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91docker-qemu%E8%BF%90%E8%A1%8Caarch64%E7%89%88%E6%9C%AC%E7%BD%91%E6%98%93uu%E5%8A%A0%E9%80%9F%E5%99%A8%E6%8F%92%E4%BB%B6/Screenshot_2026-07-26-19-40-57-168_com.netease.uurouter_0_2026-07-26_19-41-34_134.jpg)

会识别到路由器，点击下一步，完成。

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91docker-qemu%E8%BF%90%E8%A1%8Caarch64%E7%89%88%E6%9C%AC%E7%BD%91%E6%98%93uu%E5%8A%A0%E9%80%9F%E5%99%A8%E6%8F%92%E4%BB%B6/Screenshot_2026-07-26-19-43-47-901_com.netease.uurouter_0_2026-07-26_19-44-02_024.jpg)

成功识别到pc和手机。

## 疑问：

`rootfs`应该还能再进行精简的，目前只是能让这个uuplugin能够不报错的跑起来，是否能够成功加速还有待观察。

`start.sh`伪造了`h3c_info`文件并且成功的让uu的手机客户端识别到了。不过，不清楚合作款路由器的识别与激活手游、pc加速，是否是通过这个文件完成，是否有可能在官方openwrt原版实现激活？
