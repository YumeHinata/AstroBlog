---
title: 【笔记】Clash 免 root 代理热点流量（使用 Shizuku）
published: 2026-11-08
description: Shizzi给了这个项目非常多的帮助。通过Shizuku 调用 TestNetworkManager.createTunInterface 创建 testtun 网络。并调用 TetheringManager.setPreferTestNetworks(true) 把 testtun 选为上游，最终就是把经过代理的流量通过热点共享出去。
image: https://pximg.yumehinata.com/img-master/img/2026/07/26/01/37/22/147634195_p0_master1200.jpg
tags:
  - Shizuku
  - Clash
  - CMFA
  - Shizzi
category: 笔记
draft: false
---

封面图：[https://www.pixiv.net/artworks/147634195](https://www.pixiv.net/artworks/147634195)

::github{repo="YumeHinata/ClashMetaForAndroid-Tether"}

## 前言：

首先必须得说在如今root权限获取其实已经是一件日渐简单的事情了。但是，幻梦还是固执的认为 Shizuku 获取的权限其实已经足够完成让热点流量经过 clash代理的工作。所幸，已经有前人完成了 Shizzi 这个项目，再次感谢 Shizzi 项目的开发者们的工作。

所以，这个确实又是一个“Ai 融合项目”（阿里 Qoder 发赛博鸡蛋了，这还不领吗）。这篇文章更多也就是分享软件和思路了，没特别多技术含量。

## 1.使用方法：

首先我们要准备好 Shizuku，有了权限才能打开测试网络功能，才能进行下一步。

[https://github.com/RikkaApps/Shizuku/releases](https://github.com/RikkaApps/Shizuku/releases) 可以下载最新版的 Shizuku。

下文默认 Shizuku已经安装并配置完成。

### 1.1 获取 CMFA-Tether

[https://github.com/YumeHinata/ClashMetaForAndroid-Tether/releases](https://github.com/YumeHinata/ClashMetaForAndroid-Tether/releases) Release页可以获取到比较稳定的版本，最新编译的版本通常在 Action页 [https://github.com/YumeHinata/ClashMetaForAndroid-Tether/actions/workflows/build.yml](https://github.com/YumeHinata/ClashMetaForAndroid-Tether/actions/workflows/build.yml)

### 1.2 打开 CMFA 的权限

安装 CMFA 后，进入 Shizuku 为应用授权

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E4%BD%BF%E7%94%A8-shizuku-%E5%85%8D-root-%E9%80%9A%E8%BF%87%E7%83%AD%E7%82%B9%E5%88%86%E4%BA%AB-clash-%E4%BB%A3%E7%90%86/Screenshot_2026-11-11-10-21-21-046_moe.shizuku.privileged.api.jpg)

点击中间齿轮图标按钮，进入授权

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E4%BD%BF%E7%94%A8-shizuku-%E5%85%8D-root-%E9%80%9A%E8%BF%87%E7%83%AD%E7%82%B9%E5%88%86%E4%BA%AB-clash-%E4%BB%A3%E7%90%86/Screenshot_2026-11-11-10-21-31-855_moe.shizuku.privileged.api_1794363974222edit.jpg)

为 CMFA 授权

## 1.3 开启 Tether功能，共享代理

打开我们安装好的 CMFA，完成常规的配置后，点击设置。

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E4%BD%BF%E7%94%A8-shizuku-%E5%85%8D-root-%E9%80%9A%E8%BF%87%E7%83%AD%E7%82%B9%E5%88%86%E4%BA%AB-clash-%E4%BB%A3%E7%90%86/Screenshot_2026-11-11-10-28-37-544_com.github.metacubex.clash.meta.jpg)

点击设置，可设置 Tether 是否自动打开。

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E4%BD%BF%E7%94%A8-shizuku-%E5%85%8D-root-%E9%80%9A%E8%BF%87%E7%83%AD%E7%82%B9%E5%88%86%E4%BA%AB-clash-%E4%BB%A3%E7%90%86/Screenshot_2026-11-11-10-28-44-629_com.github.metacubex.clash.meta.jpg)

可以看到下方比原版多出了一个 Shizuku Tether 按钮

点击进入

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E4%BD%BF%E7%94%A8-shizuku-%E5%85%8D-root-%E9%80%9A%E8%BF%87%E7%83%AD%E7%82%B9%E5%88%86%E4%BA%AB-clash-%E4%BB%A3%E7%90%86/Screenshot_2026-11-11-10-28-48-295_com.github.metacubex.clash.meta.jpg)

Start Tether 单击后可以单次开启共享功能，下方的自动开启按钮为默认打开。如需每次个人判断是否需要开启，可关闭常开按钮，后续通过上方 Start Tether 进行单次的开启。

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E4%BD%BF%E7%94%A8-shizuku-%E5%85%8D-root-%E9%80%9A%E8%BF%87%E7%83%AD%E7%82%B9%E5%88%86%E4%BA%AB-clash-%E4%BB%A3%E7%90%86/Screenshot_2026-11-11-10-35-13-524_com.github.metacubex.clash.meta.jpg)

打开时，当热点或代理未开启时，Tether将会进入等待

![](./images/%E3%80%90%E7%AC%94%E8%AE%B0%E3%80%91%E4%BD%BF%E7%94%A8-shizuku-%E5%85%8D-root-%E9%80%9A%E8%BF%87%E7%83%AD%E7%82%B9%E5%88%86%E4%BA%AB-clash-%E4%BB%A3%E7%90%86/Screenshot_2026-11-11-10-36-02-531_com.github.metacubex.clash.meta.jpg)

当两者均开启后，将会从等待转换为开启。此时再次点击按钮或者直接关闭代理（清除后台）将会关闭 Tether与 testtun 网络。

（Auto-start on Launch 开关打开后的实际功能是在每次开启代理后自动打开热点并开启 Tether）

**使用教程到此完毕**

## 2. 功能实现思路

### 2.1 建立测试网络（testtun）

第一步是造一个虚拟网卡并把它注册成 Android 认识的一个"网络"。用的是 `@TestApi` 的 `TestNetworkManager`。`createTunInterface` 的签名在不同版本上有 `Array<LinkAddress>` 与 `Collection` 两种，按序探测：

```kotlin
// shizuku-tether/src/main/java/com/github/kr328/clash/tether/testnetwork/TestNetworkApi.kt
private fun findCreateTunMethod(): Method {
    val clazz = manager::class.java

    return try {
        clazz.getDeclaredMethod("createTunInterface", Array<LinkAddress>::class.java)
    } catch (_: NoSuchMethodException) {
        clazz.getDeclaredMethod("createTunInterface", Collection::class.java)
    }.apply { isAccessible = true }
}
```

返回的 `TestNetworkInterface` 里是 TUN 的文件描述符和接口名，同样反射取出：

```kotlin
// TestNetworkApi.kt（createTunInterface 内）
val fd = result::class.java.getMethod("getFileDescriptor").invoke(result) as ParcelFileDescriptor
val name = result::class.java.getMethod("getInterfaceName").invoke(result) as String
```

拿到 fd 后，调 `setupTestNetwork` 把它注册为网络。该方法在不同版本/OEM 构建上重载不一（有的带 `NetworkCapabilities`，有的不带），我们枚举全部重载、按参数个数降序，挑第一个参数列表能完全满足的调用：

```kotlin
// TestNetworkApi.kt（setupTestNetwork 内）
val candidates = manager::class.java.declaredMethods
    .filter { it.name == "setupTestNetwork" }
    .sortedByDescending { it.parameterCount }
```

参数构造逻辑（`buildArgsFor`）能填满 `LinkProperties` / `IBinder` / `String` / `boolean` / `NetworkCapabilities` 这几类参数；其中 `NetworkCapabilities` 必须补上 `INTERNET`、`TRUSTED` 等能力位——缺了它们，Tethering 的上游过滤器根本不会把测试网络当作候选，`preferTestNetworks` 也就无从选起。

注册成功后，ConnectivityManager 的 `allNetworks` 里会出现一个 `TRANSPORT_TEST` 的网络。MIUI/HyperOS 上 `setupTestNetwork` 可能返回 null 但注册实际成功，因此以轮询 `allNetworks` 为准，并 `requestNetwork` 注册一个空回调做 keep-alive，防止系统把它 linger 回收。

### 2.2 让热点把 testtun 选为上游

热点（tethering）默认会把蜂窝或 WiFi 选为上游。要改成 testtun，需要两步：

1. 拨偏好开关：`TetheringManager.setPreferTestNetworks(true)`。它告诉 Tethering 模块：上游选举时优先考虑测试网络。
2. 触发一次选择：启动（或重启）下游。选择发生在下游启动时，因此若热点在 testtun 建立之前就已经开着（上游已选蜂窝），仅拨开关不够，必须 `stopTethering` + `startTethering` 强制重选。

```kotlin
// shizuku-tether/src/main/java/com/github/kr328/clash/tether/control/TetheringControl.kt
val method = tetheringManager::class.java
    .getDeclaredMethod("setPreferTestNetworks", Boolean::class.javaPrimitiveType)
method.isAccessible = true
method.invoke(tetheringManager, enable)
```

下游优先用 `TetheringManager.startTethering(TetheringRequest)` 启动——这是能配合 `setPreferTestNetworks` 触发上游选举的正规隐藏 API；请求对象本身也反射构造，可豁免运营商 entitlement 检查：

```kotlin
// TetheringControl.kt（buildTetheringRequest）
val builderClass = Class.forName("android.net.TetheringManager\$TetheringRequest\$Builder")
val builder = builderClass
    .getConstructor(Int::class.javaPrimitiveType)
    .newInstance(TETHERING_WIFI)

if (isExemptFromEntitlement) {
    runCatching {
        builderClass
            .getDeclaredMethod("setExemptFromEntitlementCheck", Boolean::class.java)
            .invoke(builder, true)
    }
}
return builderClass.getMethod("build").invoke(builder)!!
```

选举结果可以直接从 `dumpsys tethering` 读到：

```plain
wlan1 - TetheredState - lastError = 0
Current upstream interface(s): [testtun0]
```

我们解析 `Current upstream interface(s): [...]` 这一行做校验：只有当列表里确实是自己的 testtun 才算成功；否则重启下游再验一次。

到这一步，热点客户端的报文已经被路由进 `testtun0`，报文在 fd 里。

### 2.3 gVisor 劫持客户端流量

TUN fd 被交给一个 Go 编译的库（gomobile bind 成 `tetherpath.aar`，内含 `libgojni.so`），它内部跑 **gVisor 的 netstack**。gVisor 是一个用户态 TCP/IP 栈：从 TUN fd 读到的原始 IP 报文由它解析，完成 TCP 握手、UDP 收发，对上层暴露成"一条条连接"。建栈与接 fd 的核心如下：

```go
// shizuku-tether/src/main/golang/tetherpath/tetherpath.go（StartNetstack）
netStack := stack.New(stack.Options{
    NetworkProtocols: []stack.NetworkProtocolFactory{
        ipv4.NewProtocol,
        ipv6.NewProtocol,
    },
    TransportProtocols: []stack.TransportProtocolFactory{
        tcp.NewProtocol,
        udp.NewProtocol,
        icmp.NewProtocol4,
        icmp.NewProtocol6,
    },
})

endpoint, err := fdbased.New(&fdbased.Options{
    FDs: []int{tunFD},
    MTU: uint32(mtu),
})
// …（错误处理）
if tcpipErr := netStack.CreateNIC(nicID, endpoint); tcpipErr != nil {
    // …
}

netStack.SetPromiscuousMode(nicID, true)
netStack.SetSpoofing(nicID, true)

netStack.SetRouteTable([]tcpip.Route{
    {Destination: header.IPv4EmptySubnet, NIC: nicID},
    {Destination: header.IPv6EmptySubnet, NIC: nicID},
})
```

TCP/UDP 各挂一个 forwarder，forwarder 会直接 dial 原始目的地

```go
// tetherpath.go（forwardTCP，UDP 同构）
func forwardTCP(request *tcp.ForwarderRequest, dialer *net.Dialer, socksAddr string) {
    id := request.ID()
    dest := destinationOf(id)

    logMsg("TCP forward: %s", dest)
    upstream, err := dialer.Dial("tcp", dest)
    // …（失败则 request.Complete(true) 复位连接）
```

这里 dial 用的 `net.Dialer`：在启动 forwarder 之前，Kotlin 侧找到 Clash 的 VPN 网络并把它的 network handle 传了进来，dialer 在**每个 socket 创建时**把它 pin 到该网络

```go
// tetherpath.go（installForwarders）
dialer := &net.Dialer{Timeout: dialTimeout}

// If VPN handle is set, pin sockets to the VPN network
if vpnHandle != 0 {
    logMsg("Pinning sockets to VPN network handle %d", vpnHandle)
    dialer.Control = func(network, address string, c syscall.RawConn) error {
        return c.Control(func(fd uintptr) {
            if err := bindToNetwork(vpnHandle, int(fd)); err != nil {
                logMsg("bindToNetwork failed for %s: %v", address, err)
            }
        })
    }
}

tcpForwarder := tcp.NewForwarder(netStack, defaultRcvWnd, maxInFlight,
    func(request *tcp.ForwarderRequest) { forwardTCP(request, dialer, socksAddr) })
netStack.SetTransportProtocolHandler(tcp.ProtocolNumber, tcpForwarder.HandlePacket)
```

`bindToNetwork` 的底层是 NDK 函数 `android_setsocknetwork`，从 `libandroid.so` dlsym 取得（见 `bind_android.go`），跨 Android 13–16 稳定。

于是整条数据面是：客户端报文 → testtun → gVisor 连接 → 以普通 socket 重发往原目的地，而这些 socket 全部被 pin 在 Clash 的 VPN 网络上 → 报文进入 Clash 的 TUN，由 Clash 接管。

### 2.4 Clash 如何完成对 testtun 流量的代理

在启动 gVisor 之前，通过 Android 的网络绑定机制把流量送进 Clash

```kotlin
// shizuku-tether/src/main/java/com/github/kr328/clash/tether/control/TetherSession.kt
val vpnNetwork = findVpnNetwork()
if (vpnNetwork != null) {
    bindProcessToVpn(vpnNetwork)
} else {
    android.util.Log.w(TAG, "No VPN network found; tethered traffic may bypass the proxy")
}
val vpnHandle = vpnNetwork?.let { getNetworkHandle(it) } ?: 0L
// …
TetherPathBridge.start(handle.fileDescriptor.fd, vpnHandle = vpnHandle)
```

1. `ConnectivityManager.bindProcessToNetwork(vpn)`（公开 API，23+），把 shell 进程此后创建的所有 socket 默认绑到 VPN 网络。
2. 把 VPN 的 network handle 传给 Go 侧，`dialer.Control` 里逐 socket 调 `android_setsocknetwork` 。

`findVpnNetwork` 会在 `allNetworks` 里找带 `TRANSPORT_VPN` 的那个网络——即 Clash 以 `VpnService` 建立的全局 VPN：

```kotlin
// TetherSession.kt（findVpnNetwork）
connectivityManager.allNetworks.firstOrNull { network ->
    val caps = connectivityManager.getNetworkCapabilities(network)
    caps?.hasTransport(transportVpn) == true
}
```

报文进入 Clash 的 TUN 后，Clash 将会如往常，按自己的配置处理：解析目标地址，走规则匹配（rule / domain / geoip 等）决定直连还是某个代理组，命中代理则经选中节点出站。因此**不需要 Clash 做任何特殊配置**：testtun 负责"把客户端流量收集起来"，gVisor 负责"劫持并以 socket 重发"，网络绑定负责"把重发的流量送进 Clash"，Clash 负责"按规则送出去"。

这里没有路由回环：forwarder 的 socket 被显式绑到 VPN 网络，不会落回 testtun 的路由；而 Clash 自己的出站 socket 由 `VpnService.protect()` 保护，不会再次进入自己的 TUN。testtun 只承载热点下游的流量，两条路径互不相交。

**END.**

**END.**

**END.**
