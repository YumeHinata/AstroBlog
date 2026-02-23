---
title: 【笔记】在Ubuntu系统下进行安装黑苹果的准备工作，并安装黑苹果
published: 2026-02-21
description: 估计不会有几个人有这种需求的。哪有放着好好的linux不用，装黑苹果的。
image: https://rdimg.yumehinata.com/random-wallpaper
tags:
  - 黑苹果
  - Ubuntu
  - OpCore-Simplify
  - "5250"
  - NUC
  - NUC5i5RYK
category: 笔记
draft: true
---
## 题记：

这大概是一种极其小众的需求吧，结果被幻梦遇上了。之前应该有提到过，幻梦的动态博客halo部署在一台nuc小主机上，总受周知nuc在这个时代成为软路由圣体之前其实是安装黑苹果的首选项，尤其是nuc5中的NUC5i5RYK。因为这台机器搭载了一个可能是除了苹果以外只有intel在自家主机上有使用过的5代i5处理器，5250u。现在动态博客不用了，小主机也就闲置下来了，于是在黑苹果生命的末期来体验一下，圆上幻梦一个折腾黑苹果的梦。

## 警告：

只是部分一定要在被安装的主机上进行的工作会在ubuntu上完成，剩下非必要环节放在Windows上完成（例如：烧录到U盘）与MacOS完成（例如：usb映射），另外这篇笔记里还存在一些未解决的问题，仅供参考。如果你在安装环节遇到一些问题，且项目的issues里没有提供解决方案的话，请善用Ai工具来完成检索和解答。此外目前由于5250u的核显为hd6000，因此Mac OS15应该是5250u最后支持的一个版本。

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

## 安装USBToolBox

由于我们是linux系统，所以我们得选择适合linux的分支。

::github{repo="Rakib7425/USBToolBoxTool"}

```
git clone https://github.com/Rakib7425/USBToolBoxTool.git
```

解压后进入`./USBToolBoxTool/`运行`Linux.py`

```
# 运行脚本
python3 Linux.py
```

选择D，然后选择B导出Json文件。和其他教程不同我们还需要之后再MacOS中通过Hackintool导入json完成工作。

我们把生成好的`usb\_blueprint.json`进行单独保存

## 下载MacOS15镜像

先安装`acidanthera/OpenCorePkg`工具

还是在一个合适的位置克隆项目

```
# 克隆项目
git clone https://github.com/acidanthera/OpenCorePkg.git

# 进入工具目录
cd ./OpenCorePkg/Utilities/macrecovery

# 拉取15版本镜像
python3 macrecovery.py -b Mac-CFF7D910A743CAAF -m 00000000000000000 -os latest download
```

把包含镜像的文件夹和此前的EFI文件夹保存到一台可以制作启动u盘的系统上，幻梦这边还是使用了Windows来完成这个工作。
