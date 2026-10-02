---
title: 【笔记】Dsh数据目录空间告急，记一次将容器数据迁移至群晖NAS的实践
published: 2026-09-22
description: 正在尝试移植一个安卓游戏到PSV上，结果跑了一半说无法写入了，才发现空间早已被占满。100G的小机器，不堪重压了。
image: https://pximg.yumehinata.com/img-master/img/2026/09/12/13/15/23/149570298_p0_master1200.jpg
tags:
  - NFS
  - Systemd
  - NAS
category: 笔记
draft: false
---

封面图：[https://www.pixiv.net/artworks/149570298](https://www.pixiv.net/artworks/149570298)

## 前言：

这次用的是群晖 NAS，因为需要挂载空间的机器系统是 Debian 所以使用了NFS服务。并且由于使用了 1panel 和 1panel 提供的 Dsh 应用包，所以Dsh的工作区对应的目录应该是`/opt/1panel/apps/deepseek-harness/deepseek-harness/data/`，我们需要把这个目录迁移到一会挂载的 NAS分区上。当主机重启后需要自动挂载NAS分区，当分区挂载成功后再启动 Dsh容器，防止报错。

## 第一步：群晖上准备好 NFS

群晖上打开NFS服务并创建一个目录供Dsh使用。

![](./images/dsh%E6%95%B0%E6%8D%AE%E7%9B%AE%E5%BD%95%E7%A9%BA%E9%97%B4%E5%91%8A%E6%80%A5%EF%BC%8C%E8%AE%B0%E4%B8%80%E6%AC%A1%E5%B0%86%E5%AE%B9%E5%99%A8%E6%95%B0%E6%8D%AE%E8%BF%81%E7%A7%BB%E8%87%B3%E7%BE%A4%E6%99%96nas%E7%9A%84%E5%AE%9E%E8%B7%B5/QQ20260922-190515.png)

在控制面板-共享文件夹中选择新增一个文件夹或编辑已有的文件夹权限，幻梦这边选择了已有的这个文件夹。

![](./images/dsh%E6%95%B0%E6%8D%AE%E7%9B%AE%E5%BD%95%E7%A9%BA%E9%97%B4%E5%91%8A%E6%80%A5%EF%BC%8C%E8%AE%B0%E4%B8%80%E6%AC%A1%E5%B0%86%E5%AE%B9%E5%99%A8%E6%95%B0%E6%8D%AE%E8%BF%81%E7%A7%BB%E8%87%B3%E7%BE%A4%E6%99%96nas%E7%9A%84%E5%AE%9E%E8%B7%B5/QQ20260922-190716.png)

由于幻梦的群晖只能在局域网内连接，所以就不用担心公网攻击的问题，这边的ip就填`192.168.0.0/24`；`Squash`这边就选择无映射（**如果有公网访问的需求，这边建议设置映射，但是映射可能会造成容器无法正确获取权限导致失败，最安全的做法是新建一个 Dsh专用共享文件夹然后再进行设置**）。

接下来记住这个装载路径，我们后面是要把这个路径或者路径里给Dsh用的的子文件夹挂载到容器所在的设备上。

## 第二步：在 Debian 上挂载 NFS

先安装 NFS 客户端：

```plain
sudo apt install nfs-common
```

创建挂载目录：

```plain
sudo mkdir -p /mnt/nas/NasOther
```

先手动测试：

```plain
sudo mount -t nfs4 192.168.0.13:/volume3/NasOther/DSH /mnt/nas/NasOther
```

确认：

```plain
findmnt /mnt/nas/NasOther
```

正常的话可以看到：

```plain
192.168.0.13:/volume3/NasOther/DSH
```

如果这里没有问题，就可以把下面的内容写入到 `/etc/fstab`。

```plain
192.168.0.13:/volume3/NasOther/DSH /mnt/nas/NasOther nfs4 _netdev,nofail,x-systemd.automount,noatime 0 0
```

然后：

```plain
sudo systemctl daemon-reload
```

这里建议保留 `nofail` 和 `x-systemd.automount`。NAS 没开的时候，让 Debian 自己正常起来，不要因为远程存储暂时不可用把整台机器拖住。

## 第三步：把整个 data 目录迁移到 NAS

这里直接迁移**完整的 `data` 目录**

先创建 NAS 上的目标目录：

```plain
sudo mkdir -p /mnt/nas/NasOther/deepseek-harness-data
```

然后把原来的整个 `data` 目录复制过去：

```plain
sudo rsync -aHAX --info=progress2 \
  /opt/1panel/apps/deepseek-harness/deepseek-harness/data/ \
  /mnt/nas/NasOther/deepseek-harness-data/
```

这里一定要注意结尾的 `/`。

源目录是：

```plain
/opt/1panel/apps/deepseek-harness/deepseek-harness/data/
```

目标目录是：

```plain
/mnt/nas/NasOther/deepseek-harness-data/
```

这样 `dsh`、`workspace`、`caddy` 以及 `home` 都会一次性搬过去

复制完成后检查：

```plain
sudo du -sh /mnt/nas/NasOther/deepseek-harness-data
sudo du -sh /mnt/nas/NasOther/deepseek-harness-data/dsh/home
sudo du -sh /mnt/nas/NasOther/deepseek-harness-data/workspace
```

确认数据规模和原来的 `data` 基本一致。

## 第四步：把原来的 data 路径接回去

数据复制完成后，先把原来的目录改名留作备份：

```plain
sudo mv \
  /opt/1panel/apps/deepseek-harness/deepseek-harness/data \
  /opt/1panel/apps/deepseek-harness/deepseek-harness/data.local.bak
```

然后重新创建原路径：

```plain
sudo mkdir -p \
  /opt/1panel/apps/deepseek-harness/deepseek-harness/data
```

建立 bind mount：

```plain
sudo mount --bind \
  /mnt/nas/NasOther/deepseek-harness-data \
  /opt/1panel/apps/deepseek-harness/deepseek-harness/data
```

检查：

```plain
findmnt -T /opt/1panel/apps/deepseek-harness/deepseek-harness/data
```

以及：

```plain
df -h /opt/1panel/apps/deepseek-harness/deepseek-harness/data
```

正常情况下这里应该已经指向 NAS。这一步之后，Dsh 原本的路径没有任何变化：

```plain
/opt/1panel/apps/deepseek-harness/deepseek-harness/data/
```

只是这个目录的实际内容已经来自 NAS

## 第五步：让 Dsh 开机时等 NAS

这里不要把 `data` 的 bind mount 再写进 `/etc/fstab`。

这次让 `fstab` 只负责 NFS，Dsh 自己负责确认 NAS 并建立 data 的 bind mount。

创建启动脚本：

```plain
sudo nano /usr/local/sbin/start-dsh.sh
```

填入：

```plain
#!/bin/bash
set -euo pipefail

NAS_MOUNT="/mnt/nas/NasOther"
NFS_SOURCE="192.168.0.13:/volume3/NasOther/DSH"

DATA_SOURCE="$NAS_MOUNT/deepseek-harness-data"
DATA="/opt/1panel/apps/deepseek-harness/deepseek-harness/data"
CONTAINER="Dsh"

NFS_UNIT="mnt-nas-NasOther.mount"

echo "[DSH] Waiting for NAS NFS..."

while true; do
    if findmnt -rn -T "$NAS_MOUNT" -o SOURCE,FSTYPE \
        | grep -Eq "^${NFS_SOURCE} nfs4$"; then
        echo "[DSH] NAS NFS is ready."
        break
    fi

    echo "[DSH] NAS not ready, retrying in 5s..."

    systemctl reset-failed "$NFS_UNIT" 2>/dev/null || true
    systemctl start --no-block "$NFS_UNIT" 2>/dev/null || true

    sleep 5
done

if [[ ! -d "$DATA_SOURCE" ]]; then
    echo "[DSH] ERROR: NAS data directory does not exist:"
    echo "$DATA_SOURCE"
    exit 1
fi

DATA_FSTYPE="$(findmnt -rn -T "$DATA" -o FSTYPE 2>/dev/null || true)"
DATA_SOURCE_MOUNT="$(findmnt -rn -T "$DATA" -o SOURCE 2>/dev/null || true)"

if [[ "$DATA_FSTYPE" == "nfs4" ]] && \
   [[ "$DATA_SOURCE_MOUNT" == "$NFS_SOURCE"/* ]]; then

    echo "[DSH] Data is already mounted from NAS:"
    echo "[DSH] $DATA_SOURCE_MOUNT"

else
    mkdir -p "$DATA"

    echo "[DSH] Creating data bind mount..."

    if ! mountpoint -q "$DATA"; then
        mount --bind "$DATA_SOURCE" "$DATA"
    fi

    DATA_FSTYPE="$(findmnt -rn -T "$DATA" -o FSTYPE 2>/dev/null || true)"
    DATA_SOURCE_MOUNT="$(findmnt -rn -T "$DATA" -o SOURCE 2>/dev/null || true)"

    if [[ "$DATA_FSTYPE" != "nfs4" ]] || \
       [[ "$DATA_SOURCE_MOUNT" != "$NFS_SOURCE" && \
          "$DATA_SOURCE_MOUNT" != "$NFS_SOURCE"/* ]]; then
        echo "[DSH] ERROR: data is not mounted from expected NAS."
        echo "[DSH] FSTYPE=$DATA_FSTYPE"
        echo "[DSH] SOURCE=$DATA_SOURCE_MOUNT"
        exit 1
    fi
fi

echo "[DSH] Data mount verified."
echo "[DSH] Starting container: $CONTAINER"

docker start "$CONTAINER"

echo "[DSH] Container started successfully."
```

保存后：

```plain
sudo chmod 755 /usr/local/sbin/start-dsh.sh
sudo bash -n /usr/local/sbin/start-dsh.sh
```

没有输出就说明脚本语法没问题。

## 第六步：创建 systemd 服务

创建：

```plain
sudo nano /etc/systemd/system/dsh.service
```

内容：

```plain
[Unit]
Description=DeepSeek Harness Dsh with NAS storage
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/bin/bash /usr/local/sbin/start-dsh.sh
RemainAfterExit=yes
TimeoutStartSec=infinity

[Install]
WantedBy=multi-user.target
```

然后：

```plain
sudo systemctl daemon-reload
sudo systemctl enable dsh.service
```

启动测试：

```plain
sudo systemctl reset-failed dsh.service
sudo systemctl start dsh.service
```

查看：

```plain
systemctl status dsh.service --no-pager
```

这里如果看到：

```plain
Active: active (exited)
```

不用紧张。

因为这是 `Type=oneshot` 服务，脚本执行完成以后保持 active，真正的 Dsh 容器是另外一个进程。

检查容器：

```plain
docker inspect -f 'Dsh: {{.State.Status}}' Dsh
```

应该是：

```plain
Dsh: running
```

再确认数据目录：

```plain
findmnt -T /opt/1panel/apps/deepseek-harness/deepseek-harness/data
```

这里应该能看到 NAS 对应的 NFS 文件系统。

## 第七步：重启进行测试

迁移到这里其实还不算结束，直接重启：

```plain
sudo reboot
```

回来以后不要手动运行脚本，直接检查：

```plain
findmnt /mnt/nas/NasOther
```

```plain
findmnt -T /opt/1panel/apps/deepseek-harness/deepseek-harness/data
```

```plain
systemctl status dsh.service --no-pager
```

```plain
docker inspect -f 'Dsh: {{.State.Status}}' Dsh
```

正常情况下，`NFS`正常工作，`data`目录指向 NAS，`dsh.server`为`active (exited)`，Dsh容器成功运行

如果 NAS 启动得比较慢也没关系。`start-dsh.sh` 会一直等待真正的 NFS 挂载出现，NAS 没准备好时不会启动 Dsh容器。

## 第八步：确认运行稳定后清理旧文件

确认 NAS、data 和 Dsh 都正常以后，再处理之前留下的本地备份`/opt/1panel/apps/deepseek-harness/deepseek-harness/data.local.bak`

先看一下大小：

```plain
sudo du -sh \
  /opt/1panel/apps/deepseek-harness/deepseek-harness/data.local.bak
```

确认没有问题后删除：

```plain
sudo rm -rf \
  /opt/1panel/apps/deepseek-harness/deepseek-harness/data.local.bak
```

删掉它以后，原来的本地 data 就算正式退休了。
