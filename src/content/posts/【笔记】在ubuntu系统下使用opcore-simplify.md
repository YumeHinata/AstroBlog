---
title: 【笔记】在Ubuntu系统下进行安装黑苹果的准备工作，并安装黑苹果
published: 2026-03-01
description: 估计不会有几个人有这种需求的。哪有放着好好的linux不用，装黑苹果的。
image: https://pximg.yumehinata.com/img-master/img/2026/02/02/22/01/21/140682798_p0_master1200.jpg
tags:
  - 黑苹果
  - Ubuntu
  - OpCore-Simplify
  - "5250"
  - NUC
  - NUC5i5RYK
category: 笔记
draft: false
---
## 题记：

这大概是一种极其小众的需求吧，结果被幻梦遇上了。之前应该有提到过，幻梦的动态博客halo部署在一台nuc小主机上，总受周知nuc在这个时代成为软路由圣体之前其实是安装黑苹果的首选项，尤其是nuc5中的NUC5i5RYK。因为这台机器搭载了一个可能是除了苹果以外只有intel在自家主机上有使用过的5代i5处理器，5250u。现在动态博客不用了，小主机也就闲置下来了，于是在黑苹果生命的末期来体验一下，圆上幻梦一个折腾黑苹果的梦。

## 警告：

只是部分一定要在被安装的主机上进行的工作会在ubuntu上完成，剩下非必要环节放在Windows上完成（例如：烧录到U盘）与MacOS完成（例如：usb映射），另外这篇笔记里还存在一些未解决的问题，仅供参考。如果你在安装环节遇到一些问题，且项目的issues里没有提供解决方案的话，请善用Ai工具来完成检索和解答。此外目前由于5250u的核显为hd6000，因此Mac OS15应该是5250u最后支持的一个版本，但是我们不选15而是选择12作为体验。

## 安装Hardware-Sniffer

通常Hardware-Sniffer是OpCore-Simplify自带的一个模块，但是由于我们是linux环境所以得特意安装一个linux支持的。

```
# 新建一个目录然后克隆项目
git clone https://github.com/lzhoang2801/Hardware-Sniffer.git

# 进入目录运行HardwareSniffer.py
python3 HardwareSniffer.py
```

进入后，选H输出Report.json

回车返回，选A输出ACPI

现在`Hardware-Sniffer`文件夹下会有一个`SysReport`，`SysReport`下有一个`Report.json`和`ACPI`文件夹，把这两个复制到一回会克隆好的OpCore-Simplify文件夹里。

## 安装OpCore-Simplify

```
# 新建一个目录然后克隆
git clone https://github.com/lzhoang2801/OpCore-Simplify.git

# 把刚刚复制的json和文件夹丢到项目里
# 运行OpCore-Simplify.py
python3 OpCore-Simplify.py
```

选择1，输入`Report.json`的路径。nuc5可能会出现以下报错

### nuc5提取时遇到的问题及解决方法

```
Validation report for: /home/yume/opcore/OpCore-Simplify/Report.json

Hardware report is not valid! Please check the errors and warnings below.

Errors (7):
    1. Root.Monitor.ICD2400.Connector Type: Value 'HDMI-A' does not match pattern '^(VGA|DVI|HDMI|LVDS|DP|eDP|Internal|Uninitialized)$'
    2. Root.Monitor.ICD2400: Missing required key 'Connector Type'
    3. Root.System Devices.PNP0C0B.ACPI Path: Value '\_TZ_.FAN3' does not match pattern '^[\\]?_SB(\.[A-Z0-9_]+)+$'
    4. Root.System Devices.PNP0C0B_#1.ACPI Path: Value '\_TZ_.FAN1' does not match pattern '^[\\]?_SB(\.[A-Z0-9_]+)+$'
    5. Root.System Devices.PNP0C0B_#2.ACPI Path: Value '\_TZ_.FAN4' does not match pattern '^[\\]?_SB(\.[A-Z0-9_]+)+$'
    6. Root.System Devices.PNP0C0B_#3.ACPI Path: Value '\_TZ_.FAN2' does not match pattern '^[\\]?_SB(\.[A-Z0-9_]+)+$'
    7. Root.System Devices.PNP0C0B_#4.ACPI Path: Value '\_TZ_.FAN0' does not match pattern '^[\\]?_SB(\.[A-Z0-9_]+)+$'

Warnings (4):
    1. Root.BIOS: Unknown key 'Above 4G Decoding'
    2. Root.GPU.Intel Corporation HD Graphics 6000: Unknown key 'Bus Type'
    3. Root.Sound.Realtek ALC283: Unknown key 'PCI Path'
    4. Root.Sound.Realtek ALC283: Unknown key 'ACPI Path'
```

我们根据提示进行修改即可，唯一需要关注的点是风扇的ACPI 路径。

```
# 安装acpica-tool
sudo apt install acpica-tools -y

# 导出ACPI log
sudo acpidump > acpi.log

#提取dat
acpixtract -a acpi.log

# 反编译dsdt
iasl -d dsdt.dat
```

我们打开`dsdt.dsl`文件，检索关键词`fan`。会发现以下内容

```
If ((Arg0 == 0x03))
        {
            If ((Zero == ACTT))
            {
                If ((ECON == One))
                {
                    \_SB.PCI0.LPCB.H_EC.ECWT (Zero, RefOf (\_SB.PCI0.LPCB.H_EC.CFAN))
                }
            }
        }
```

`\\_SB.PCI0.LPCB.H_EC` 替换掉所有`\_TZ_.FAN`相关内容，保存。

### 导入Report.json后

接着根据提示我们导入ACPI文件，之前我们已经把ACPI文件夹复制到了OpCore-Simplify里，可以直接输入`ACPI`回车，下一步，如果没有导入的输入`ACPI`文件夹的绝对路径。

### 导出EFI文件

前面根据自己需求选完选项后，会回到脚本主页（不清楚的选项就默认，MacOS的版本能最新就最新）。选择6导出EFI。

EFI会被导出到`/tmp/`路径下，这个时候我们不要点任何按钮进行下一步，立刻通过其他工具将EFI复制到其他稳定的路径里。如果不小心点击了下一步，恭喜你重新导入Report.json把选项重新选一遍把，临时文件夹关闭后即刻删除。

## 下载MacOS12镜像

先安装`acidanthera/OpenCorePkg`工具

还是在一个合适的位置克隆项目

```
# 克隆项目
git clone https://github.com/acidanthera/OpenCorePkg.git

# 进入工具目录
cd ./OpenCorePkg/Utilities/macrecovery

# 拉取15版本镜像
python3 macrecovery.py -b Mac-E43C1C25D4880AD6 -m 00000000000000000 download
```

把包含镜像的文件夹`com.apple.recovery.boot`、此前的**EFI文件夹**，保存到一台可以制作启动u盘的系统上。幻梦这边还是使用了另一台Windows来完成这两步的工作。

## 制作启动U盘

下载一个Rufus来制作启动盘

[https://github.com/pbatard/rufus/releases](https://github.com/pbatard/rufus/releases)

![QQ20260223-183117.png](./images/_笔记_在ubuntu系统下使用opcore-simplify/QQ20260223-183117.png)

**千万要注意**，此操作需要**格式化u盘**，请确保u盘里已经**做好备份**或内部无再需要的文件。

初始化u盘后将`EFI`、`com.apple.recovery.boot`文件夹、`usb_blueprint.json`拖入盘内。

启动U盘制作完成，安全弹出后插在准备安装U盘的主机上，进入bios选择u盘启动。

## 进入启动盘

进入引导后选择第一个选项运行。此时会出现黑屏，这是正常情况，等一段时间会出现跑码，此时说明成功进入安装环节。

![IMG_20260223_184736.jpg](./images/_笔记_在ubuntu系统下使用opcore-simplify/IMG_20260223_184736.jpg)

选择对应的语言
![IMG_20260223_184758.jpg](./images/_笔记_在ubuntu系统下使用opcore-simplify/IMG_20260223_184758.jpg)

选择磁盘工具对硬盘进行操作
![IMG_20260223_185153.jpg](./images/_笔记_在ubuntu系统下使用opcore-simplify/IMG_20260223_185153.jpg)

点进去先别急着操作，想清楚**自己有几块硬盘**；**需要在哪一块硬盘上安装系统**；**需要抹除的硬盘是否还有重要资料未保存**；**是否真的需要抹除硬盘**。

想清楚上面的内容再进行后面的操作

幻梦这边是单硬盘，空间也不够只能选择抹除掉原来的ubuntu来安装MacOS
![IMG_20260223_185403.jpg](./images/_笔记_在ubuntu系统下使用opcore-simplify/IMG_20260223_185403.jpg)

抹除硬盘后选择正确的硬盘进行安装（Mac OS 12名称应该为Monterey，幻梦第一次就安装错了，这是最后检查的机会，不然一会只能重装了）

后面就等待进度条完成，过程中可能会反复重启几次。

最后进入设置界面完成设置。

## 生成UTBMap.kext文件

现在我们应该顺利进入到MacOS系统了，可能还存在一些小问题或者卡顿的大问题，如果出现卡顿问题先跳转到下面疑难杂症里面尝试解决，为了保证阅读到流畅性还是先写如何导入。

这一步，取下刚刚带启动EFI的u盘，把u盘内的文件进行备份。备份完成后我们装一个Windows PE系统到U盘里，制作winPE是必须要做的，因为我们等会替换EFI还是要用winPE的。

（这步生成USB Map主要是力求完美的操作，之前自动化生产的EFI通常已经能驱动usb设备了，真不想做可以不做这一步）

制作PE盘，我们挑一个USB3.0的U盘。这个很重要，一定要是USB3.0的，不然之后这个USB端口在Mac下就只有2.0的速度了。

PE系统很多，请自行选择。幻梦选了老牌的[微PE](https://www.wepe.com.cn/download.html)

做好PE后下载[https://github.com/USBToolBox/tool/releases](https://github.com/USBToolBox/tool/releases)，下载windows.zip文件复制到PE里等会要用到。

刚刚备份的，尤其是EFI也复制进去。

然后，在准备一个USB3.0的设备，推荐是U盘，之后识别端口需要用到，u盘还能方便我们制作新的config.plist。

进入pe后解压zip并进入文件夹，双击Windows.exe启动工具，启动不了的可以试试在文件夹位置打开cmd然后`./Windows.exe`尝试打开

选择D.  Discover Ports

![QQ20260228-230823.png](./images/_笔记_在ubuntu系统下使用opcore-simplify/QQ20260228-230823.png)

掏出我们刚刚另外准备好的usb3.0设备，依次测试每个usb接口。**注意：工具5秒进行一次识别，确认工具刷新，识别成功后，再试下一个**

全部完成后，B退出。到第一页后选择S.  Select Ports and Build Kext

确认识别到的USB口数量正确，选择K，进行生成。

生成完成在这个工具的目录下会多一个`UTBMap.kext`我们把这个复制到`/EFI/OC/Kexts`下，我们现在要想办法更新`config.plist`。第一种办法，把整个EFI文件夹复制到一个新的U盘里备用；第二种方法，关机拔出U盘进行下一步

把U盘插到一个Windows系统的主机上，我们需要使用到一个工具[https://github.com/corpnewt/ProperTree](https://github.com/corpnewt/ProperTree)

拉取以后运行`ProperTree.bat`

![屏幕截图 2026-02-28 232337.png](./images/_笔记_在ubuntu系统下使用opcore-simplify/屏幕截图_2026-02-28_232337.png)

我们导入刚刚`/EFI/OC`下的`config.plist`

然后我们再选择OC snapshot

![屏幕截图 2026-02-28 232454.png](./images/_笔记_在ubuntu系统下使用opcore-simplify/屏幕截图_2026-02-28_232454.png)

ctrl+s保存，保存完后退出取下U盘，我们在来到winPE完成后续操作。

## 导入EFI

进入PE后我们使用自带的磁盘精灵工具，左侧找到一个名为ESP的卷，卷标为EFI，通常情况下这个卷里是空的我们选到文件预览，直接把我们刚刚完成修改后的整个EFI文件夹丢到里面。

由于我们是单系统，直接重新启动在bios中将硬盘设置为第一启动项完成我们的所有工作。

## 疑难杂症

幻梦目前遇到的最严重的问题是与核显输出相关，暂时也无法完全解决。

### 系统很卡

MacOS12对于5250u和他的hd6000来说有压力，但是绝对不会出现画面撕裂、锯齿边，动画掉的只有1帧的问题的。出现这种问题一般就是显存分配的问题了。

我们点击左上角的`苹果图标-关于本机-系统报告`左侧`硬件-图形卡/显示器-VRAM`出现这种情况时显存分配可能只有14M，5250U的HD6000核显正常有1536MB的显存，如果过少就说明出现了问题。

我们打开`config.plist`检查`Nvram`项

![QQ20260228-234649.png](./images/_笔记_在ubuntu系统下使用opcore-simplify/QQ20260228-234649.png)

注意看这个`-igfxvesa`如果你有这个问题，那么他就是罪魁祸首，直接删掉即可。但是删掉会带来下一个问题，hdmi接口无法输出1080p60hz的视频信号。但是我们至少先要系统能正常用再最求画面。

### 显示器分辨率低

幻梦使用的是一个2k分辨率的显示器，2560*1440分辨率。我们去掉上面的参数以后，hdmi接口输出的时钟频率被限制，导致信号出现问题。幻梦暂时没有找到完美解决方案，但是我们可以缓解一下。

[https://github.com/xzhih/one-key-hidpi](https://github.com/xzhih/one-key-hidpi)，这个工具可以帮我们解锁hidpi功能。

要用这个工具我们要先关闭`SIP`。

重启进入引导，这里我们选择`Recovery`，选择语言，顶部导航栏选择`实用工具-终端`输入以下指令

```
csrutil disable
```

关闭SIP，关闭后重启进入系统拉取工具。

```
git clone https://github.com/xzhih/one-key-hidpi.git
```

运行`hidpi.command`

根据你的需求进行选择，作为nuc通常我们选择imac+自己显示器的分辨率，**笔记本用户装黑苹果的别照抄**

完成设置后重启

重启后进入系统，默认就是你选择的显示器分辨率，但是实际上输出的依旧是1080p不过不再是50hz而是正常的60hz了。但是你应该会感觉还是有点糊，我们进入系统选择`系统偏好设置-显示器-缩放-显示所有分辨率`选择带**HiDPI**的一个分辨率。不过这只能改善一点你的使用体验，并没有真的解决掉时钟频率受限的核心问题。如果你有好的办法，能发到评论区吗，拜托了。

对了，不要忘记重新开启`SIP`

老位置输入

```
csrutil enable
```

SIP还是能够增加一点点安全性的，虽然是黑果。

## 最后

享受你的黑苹果吧，目前这个还不是完美黑苹果系统，不过至少能够正常使用了，这个笔记到这里也就结束啦。
