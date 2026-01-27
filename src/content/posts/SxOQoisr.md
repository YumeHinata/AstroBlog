---
title: 【思路】CS2服务端自动检查并更新脚本（Linux+Docker环境）
published: 2026-01-02
# description: "How to use this blog template."
image: "https://rdimg.yumehinata.com/random-wallpaper"
tags: ["群晖","CS2","steam"]
category: 笔记
draft: false
legacyHash: SxOQoisr
---
## 前言：

首先看标题这个是linux+docker环境，幻梦的steamcmd和cs2服务端都是分别跑在容器里的。如果不是这个环境的没法直接使用脚本，但是只看思路是足够的。

然后这个脚本理论上应该适配所有V社游戏的服务器，但是幻梦暂时没有对本文的脚本进行完整的测试，所以只算提供一个思路而不是教程。

CS2之前其实是有自动更新插件的，但是作者已经快1年没更新了。issue里其他人fork的版本也不怎么好用，迫于实际需求幻梦就只能自己写一个了。

为什么是shell脚本而不是一个插件？很简单，幻梦没有看完CSS插件的开发文档，同时也没兴趣不断维护一个随时可能失效的插件，幻梦的需求是功能简单、稳定能用。有什么能稳的过shell和Valve官方提供的api呢？

## 第一步：通过steamcmd获取最新的buildID

完成更新一共分四步。获取官方最新的buildID，获取本地的buildID，对比两者，不一致则进行更新。

获取buildID的命令是`steamcmd +login anonymous +app_status 730 +quit`

docker环境获取的脚本则是，注意更改容器名称再运行

    docker exec [steamcmd容器名] \
      /home/steam/steamcmd/steamcmd.sh \
      +login anonymous \
      +app_info_print 730 \
      +quit

正常情况下steamcmd会返回一个json，里面对我们有用的只有`branches`\-`public`\-`buildid`。其他的幻梦下文里省略掉了

    "branches"{
            "public"{
                    "buildid"               "21248816"
                    "timeupdated"           "1766101800"
            }
    }

接下来我们上docker的提取脚本

    #!/usr/bin/env bash
    set -euo pipefail
    
    CONTAINER="steamcmd"
    STEAMCMD="/home/steam/steamcmd/steamcmd.sh"
    APPID=730
    
    #执行steamcmd并获取输出
    OUTPUT=$(docker exec "$CONTAINER" \
      "$STEAMCMD" \
      +login anonymous \
      +app_info_print "$APPID" \
      +quit 2>/dev/null)
    
    #提取public分支的buildid
    BUILDID=$(echo "$OUTPUT" | awk '
      /"branches"/ {in_branches=1}
      in_branches && /"public"/ {in_public=1}
      in_public && /"buildid"/ {
        gsub(/"/,"")
        print $2
        exit
      }')
    
    if [[ -z "$BUILDID" ]]; then
      echo "ERROR: failed to extract buildid" >&2
      exit 1
    fi
    
    echo "$BUILDID"

正常情况下这个脚本应该输出`21248816` ，或者类似的id

## 第二步：获取服务端buildID

服务端的buildID在`appmanifest_730.acf` 这个文件中，通常他在docker里的路径如下`/home/steam/cs2-dedicated/steamapps/appmanifest_730.acf`

docker环境的我们通过以下指令获取，注意修改容器名称再运行

    docker exec [修改容器名称] \
      awk -F'"' '/"buildid"/ {print $4}' \
      /home/steam/cs2-dedicated/steamapps/appmanifest_730.acf

现在得到结果是`21248816` 说明无需更新

## 第三步：检查更新的完整脚本

    #!/usr/bin/env bash
    #请在此处进行配置
    # SteamCMD 容器
    STEAMCMD_CONTAINER="steamcmd"
    STEAMCMD_BIN="/home/steam/steamcmd/steamcmd.sh"
    
    # CS2 服务器容器
    CS2_CONTAINER="CS2-normal" #容器名字
    CS2_APP_MANIFEST="/home/steam/cs2-dedicated/steamapps/appmanifest_730.acf" #acf文件位置
    
    # Steam AppID，cs2为730，csgo为740，请自行查阅
    APPID=730
    
    # SteamCMD 超时
    STEAMCMD_TIMEOUT=60
    
    #更新运行脚本，根据实际情况进行选择
    # UPDATE_HANDLER="docker restart CS2-huifang"
    # UPDATE_HANDLER="/volume2/docker/CS2/update_cs2.sh"
    # UPDATE_HANDLER="docker exec CS2-huifang ./update.sh"
    UPDATE_HANDLER="docker restart CS2-normal"
    
    #log输出函数
    log() {
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
    }
    
    #更新脚本函数
    run_update_handler() {
      log "Executing update handler:"
      log ">>> $UPDATE_HANDLER"
      set +e
      eval "$UPDATE_HANDLER"
      RC=$?
      set -e
      if [[ $RC -ne 0 ]]; then
        log "ERROR: Update handler failed with code $RC"
        exit 11
      fi
    }
    
    log "CS2 update check started" #检查脚本开始
    
    #检查steamcmd最新的id
    log "Querying remote buildid..."
    set +e
    STEAMCMD_OUTPUT=$(
      docker exec "$STEAMCMD_CONTAINER" \
        timeout "$STEAMCMD_TIMEOUT" \
        "$STEAMCMD_BIN" \
          +login anonymous \
          +app_info_print "$APPID" \
          +quit 2>&1
    )
    STEAMCMD_RC=$?
    set -e
    REMOTE_BUILDID=$(echo "$STEAMCMD_OUTPUT" | awk -F'"' '/"buildid"/ {print $4; exit}')
    if [[ -z "$REMOTE_BUILDID" ]]; then
      log "ERROR: Failed to retrieve remote buildid"
      exit 2
    fi
    log "Remote buildid: $REMOTE_BUILDID" #输出线上最新的构建id
    
    #检查本地的构建id
    log "Reading local buildid..."
    
    LOCAL_BUILDID=$(
      docker exec "$CS2_CONTAINER" \
        awk -F'"' '/"buildid"/ {print $4}' "$CS2_APP_MANIFEST" #配置的acf位置变量
    )
    
    if [[ -z "$LOCAL_BUILDID" ]]; then
      log "ERROR: Failed to retrieve local buildid"
      exit 3
    fi
    log "Local buildid : $LOCAL_BUILDID"
    
    #对比本地与steamcmd的版本是否存在差别
    if [[ "$LOCAL_BUILDID" == "$REMOTE_BUILDID" ]]; then
      log "RESULT: CS2 server is up to date."
      exit 0
    fi
    log "RESULT: UPDATE REQUIRED!!!" 
    run_update_handler #调用更新
    
    log "Update handler finished"
    exit 10

首先我放出脚本，请注意阅读注释，对一些变量进行配置。

## 第四步：执行更新命令

需要注意到上面的脚本提供了`UPDATE_HANDLER` 这个变量。其中的字符串会作为命令被运行，因为考虑到可能你不是重启容器即可完成更新的情况，可按自身需求进行修改。

## 结尾：

最后我们只需要添加一个计划任务来定期执行这个脚本。脚本周期运行即可完成自动检查，并理论上在有新的更新时自动完成更新。不过截止到发稿时，由于并没有新的更新，所以这个脚本并没有完成全部的测试。