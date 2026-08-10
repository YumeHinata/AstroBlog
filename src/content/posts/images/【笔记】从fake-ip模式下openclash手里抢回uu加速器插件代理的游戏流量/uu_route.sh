#!/bin/sh
# ============================================================
# uu_route.sh — UU 路由: 游戏流量路由引导回 UU 加速通道
#
# 功能: OpenClash 会抢走被加速设备的游戏流量, 本脚本在
#   OpenClash 拦截点之前插入规则, 让游戏流量按 UU 的策略路由
#   走 tun163/tun164 加速隧道; 并守护监控, 设备加速状态变化时
#   自动增删规则 (事件驱动, 开机自启, 可彻底卸载还原)
#
# 背景 (已实测验证 2026-08-10):
#   - UU 加速器(iptables): PREROUTING 给加速设备 UDP 1025-65535/53
#     打 fwmark 0x163/0x164, 并建 ip rule "from <设备IP> lookup 179/180"
#     (游戏服务器网段表, 无 default) + fwmark 表 163/164(default via tun)
#   - OpenClash(nft/fw4): mangle_prerouting 链头 jump openclash_mangle
#     会把非国内 UDP 标记覆盖为 0x162(走 utun/clash TUN);
#     dstnat 链把全部 TCP redirect 到 7892(走 clash),
#     使 UU 的 TCP 策略路由(表179/180)永不生效 → TCP 游戏流量被抢
#   - 修复原理: 在 OpenClash 两个拦截点之前(链头 insert):
#     * UDP: accept, 保留 UU 标记 → fwmark 表163/164 → tun163/tun164
#     * TCP: 打 0x162 标记 + accept → 路由决策自然分流:
#       命中 UU 表179/180 的游戏网段 → tun163/tun164;
#       其余 → fwmark 0x162 表354(default via utun) → clash TUN
#     * 若无 fwmark 0x162 表(非 TUN 模式), 则降级为纯 accept
#       (游戏走 UU, 非游戏直连 — 已知副作用)
#
# 用法:
#   sh uu_route.sh                # 交互式菜单 (安装/卸载/状态/同步)
#   sh uu_route.sh install self   # 静默安装: /etc + 开机自启 + 启动守护
#   sh uu_route.sh uninstall self # 静默完整卸载 (规则/进程/自启/文件全清)
#   sh uu_route.sh install        # 立即接管当前所有加速设备
#   sh uu_route.sh uninstall      # 仅还原路由规则
#   sh uu_route.sh status         # 查看设备/规则/守护状态
#   sh uu_route.sh watch          # 守护模式 (供 init.d 调用, 事件驱动)
# ============================================================

# ---- 配置 ----
LOG_FILE="/tmp/uu_route.log"
PID_FILE="/tmp/uu_route.pid"
MON_FILE="/tmp/uu_route.mon"
MON_PID_FILE="/tmp/uu_route.mon.pid"
TAG="UU-ROUTE"
# 兼容旧版本遗留标识 (uu_fix/uu_express 时代安装的规则, 卸载时一并清理)
OLD_TAGS="UU-FIX|UU-EXPRESS"
# 排除目标: 局域网/组播 (不该进 UU, 避免影响管理与本地互访) + 198.18.0.0/16
# (OpenClash fake-ip 网段: fake-ip 的 UDP 必须留给 clash 解析真实域名,
#  塞进 UU 通道后 UU 无法解析 fake-ip 会导致游戏相关功能故障)
EXCLUDE="{ 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 198.18.0.0/16, 224.0.0.0/4, 255.255.255.255/32 }"
# OpenClash TUN 模式的 fwmark/路由表 (存在则 TCP 打此标记分流到 utun)
CLASH_MARK=0x00000162
CLASH_TABLE=354

log() {
    # 日志轮转: 超过 512KB 时备份为 .old, 防止 /tmp 被撑爆
    if [ -f "$LOG_FILE" ] && [ "$(wc -c < "$LOG_FILE" 2>/dev/null)" -gt 524288 ]; then
        mv -f "$LOG_FILE" "$LOG_FILE.old" 2>/dev/null
    fi
    echo "$(date '+%F %T') - $*" | tee -a "$LOG_FILE"
}

# ---- 检测正在加速的设备: 输出 IP 列表 (来自 ip rule, 与 nft/iptables 无关, 天然通用) ----
detect_devices() {
    ip rule 2>/dev/null | sed -n 's/.*from \([0-9.]*\) lookup [0-9][0-9]*.*/\1/p' | sort -u
}

# ---- 探测注入环境: 优先 nft (fw4), 否则尝试 iptables 兼容 ----
env_kind() {
    if nft list chain inet fw4 mangle_prerouting >/dev/null 2>&1 && \
       nft list chain inet fw4 dstnat 2>/dev/null | grep -q 'openclash'; then
        echo "nft"
    elif iptables -t mangle -L PREROUTING -n >/dev/null 2>&1 && \
         iptables -t nat -L PREROUTING -n 2>/dev/null | grep -q 'openclash'; then
        echo "iptables"
    else
        echo "none"
    fi
}

# ---- 探测 OpenClash TUN 分流表: fwmark 0x162 → 表354 存在则返回 0(真) ----
clash_tun_ok() {
    ip rule 2>/dev/null | grep -qE "fwmark 0x162" && \
    ip route show table $CLASH_TABLE 2>/dev/null | grep -q '^default'
}

# ---- 安装单台设备规则 ----
install_one() {
    local ip="$1" tag="$TAG-$ip" kind
    kind=$(env_kind)
    if [ "$kind" = "nft" ]; then
        if ! nft -a list chain inet fw4 mangle_prerouting 2>/dev/null | grep -q "$tag"; then
            nft insert rule inet fw4 mangle_prerouting \
                ip saddr "$ip" ip daddr != "$EXCLUDE" udp dport 1025-65535 \
                counter accept comment "$tag" && log "insert mangle(UDP) $tag"
        fi
        if ! nft -a list chain inet fw4 dstnat 2>/dev/null | grep -q "$tag"; then
            if clash_tun_ok; then
                # TUN 模式: 打 clash 标记, 游戏网段命中 UU 表, 其余走 utun
                nft insert rule inet fw4 dstnat \
                    ip saddr "$ip" ip daddr != "$EXCLUDE" tcp dport 1025-65535 \
                    counter meta mark set $CLASH_MARK accept comment "$tag" && \
                    log "insert dstnat(TCP,mark) $tag"
            else
                # 非 TUN 模式: 纯 accept (游戏走UU, 非游戏直连 — 已知副作用)
                nft insert rule inet fw4 dstnat \
                    ip saddr "$ip" ip daddr != "$EXCLUDE" tcp dport 1025-65535 \
                    counter accept comment "$tag" && log "insert dstnat(TCP,plain) $tag"
            fi
        fi
    elif [ "$kind" = "iptables" ]; then
        iptables -t mangle -C PREROUTING -s "$ip" -p udp --dport 1025:65535 -j ACCEPT \
            -m comment --comment "$tag" 2>/dev/null || \
            iptables -t mangle -I PREROUTING -s "$ip" -p udp --dport 1025:65535 -j ACCEPT \
            -m comment --comment "$tag" && log "insert iptables mangle(UDP) $tag"
        iptables -t nat -C PREROUTING -s "$ip" -p tcp --dport 1025:65535 -j ACCEPT \
            -m comment --comment "$tag" 2>/dev/null || \
            iptables -t nat -I PREROUTING -s "$ip" -p tcp --dport 1025:65535 -j ACCEPT \
            -m comment --comment "$tag" && log "insert iptables nat(TCP) $tag"
    else
        log "未检测到 fw4(nft) 或 iptables 中的 OpenClash 拦截点, 跳过 $ip"
        return 1
    fi
}

# ---- 卸载指定设备的规则 ----
uninstall_one() {
    local tag="$TAG-$1"
    local h
    for h in $(nft -a list chain inet fw4 mangle_prerouting 2>/dev/null | grep "$tag" | grep -oE 'handle [0-9]+' | awk '{print $2}'); do
        nft delete rule inet fw4 mangle_prerouting handle "$h" 2>/dev/null && log "remove mangle handle=$h ($tag)"
    done
    for h in $(nft -a list chain inet fw4 dstnat 2>/dev/null | grep "$tag" | grep -oE 'handle [0-9]+' | awk '{print $2}'); do
        nft delete rule inet fw4 dstnat handle "$h" 2>/dev/null && log "remove dstnat handle=$h ($tag)"
    done
    iptables -t mangle -D PREROUTING -m comment --comment "$tag" 2>/dev/null
    iptables -t nat -D PREROUTING -m comment --comment "$tag" 2>/dev/null
}

# ---- 增量同步: 按当前加速设备安装/卸载 ----
sync() {
    local devs installed ip tag
    devs=$(detect_devices)
    # 卸载已失效设备的规则
    installed=$(nft -a list chain inet fw4 mangle_prerouting 2>/dev/null | grep -oE "$TAG-[0-9.]+" | sort -u)
    for tag in $installed; do
        ip=${tag#"$TAG-"}
        if ! echo "$devs" | grep -qx "$ip"; then
            uninstall_one "$ip"
        fi
    done
    # 安装新设备
    for ip in $devs; do
        install_one "$ip"
    done
}

# ---- 全量还原规则 (含历史版本遗留规则, 保证卸载干净) ----
uninstall_all() {
    local h tag pat
    pat="$TAG|$OLD_TAGS"
    for tag in $(nft -a list chain inet fw4 mangle_prerouting 2>/dev/null | grep -oE "($pat)-[0-9.]+" | sort -u); do
        uninstall_one "${tag##*-}"
    done
    # 兜底: 按 handle 清任何残留
    for h in $(nft -a list chain inet fw4 mangle_prerouting 2>/dev/null | grep -E "$pat" | grep -oE 'handle [0-9]+' | awk '{print $2}'); do
        nft delete rule inet fw4 mangle_prerouting handle "$h" 2>/dev/null
    done
    for h in $(nft -a list chain inet fw4 dstnat 2>/dev/null | grep -E "$pat" | grep -oE 'handle [0-9]+' | awk '{print $2}'); do
        nft delete rule inet fw4 dstnat handle "$h" 2>/dev/null
    done
    iptables -t mangle -D PREROUTING -m comment --comment "$TAG" 2>/dev/null
    iptables -t nat -D PREROUTING -m comment --comment "$TAG" 2>/dev/null
    iptables -t mangle -D PREROUTING -m comment --comment "UU-FIX" 2>/dev/null
    iptables -t nat -D PREROUTING -m comment --comment "UU-FIX" 2>/dev/null
    iptables -t mangle -D PREROUTING -m comment --comment "UU-EXPRESS" 2>/dev/null
    iptables -t nat -D PREROUTING -m comment --comment "UU-EXPRESS" 2>/dev/null
    log "全部规则已还原"
}

status() {
    echo "== 当前加速设备 (ip rule from-IP lookup) =="
    detect_devices | while read -r ip; do
        [ -n "$ip" ] && echo "  $ip"
    done
    echo
    echo "== 已安装的 $TAG 规则 =="
    nft -a list chain inet fw4 mangle_prerouting 2>/dev/null | grep "$TAG" || echo "  (无 mangle 规则)"
    nft -a list chain inet fw4 dstnat 2>/dev/null | grep "$TAG" || echo "  (无 dstnat 规则)"
    iptables -t mangle -L PREROUTING -n 2>/dev/null | grep "$TAG"
    iptables -t nat -L PREROUTING -n 2>/dev/null | grep "$TAG"
    echo
    echo "== 注入环境 =="
    echo "  $(env_kind)"
    echo
    echo "== 守护状态 =="
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE" 2>/dev/null)" 2>/dev/null; then
        echo "  运行中 (PID $(cat "$PID_FILE"))"
    else
        echo "  未运行"
    fi
    echo
    echo "== 安装状态 =="
    [ -f /etc/uu_route.sh ] && echo "  已安装: /etc/uu_route.sh" || echo "  未安装"
    ls /etc/rc.d/S98uu_route >/dev/null 2>&1 && echo "  开机自启: 已注册 (S98)" || echo "  开机自启: 未注册"
}

# ---- 清理历史版本 (uu_fix/uu_express) 的安装残留 ----
clean_legacy() {
    local p
    # 停止旧服务
    /etc/init.d/uu_fix stop 2>/dev/null
    /etc/init.d/uu_express stop 2>/dev/null
    start-stop-daemon -K -p /tmp/uu_fix_watch.pid 2>/dev/null
    start-stop-daemon -K -p /tmp/uu_express.pid 2>/dev/null
    sleep 1
    # 杀旧守护进程
    for p in $(ps w | grep -E 'uu_fix\.sh watch|uu_express\.sh watch' | grep -v grep | awk '{print $1}'); do
        kill "$p" 2>/dev/null
    done
    sleep 1
    # 清旧文件与自启
    rm -f /etc/init.d/uu_fix /etc/uu_fix.sh /etc/rc.d/S98uu_fix /etc/rc.d/K10uu_fix
    rm -f /etc/init.d/uu_express /etc/uu_express.sh /etc/rc.d/S98uu_express /etc/rc.d/K10uu_express
    rm -f /tmp/uu_fix_watch.pid /tmp/uu_fix.mon /tmp/uu_fix.log* /tmp/uu_fix_watch.out
    rm -f /tmp/uu_express.pid /tmp/uu_express.mon /tmp/uu_express.mon.pid /tmp/uu_express.log* /tmp/uu_express.out
}

# ---- 安装: 复制到 /etc + 注册 init.d 开机自启 + 启动守护 ----
install_self() {
    # 清理历史版本安装, 避免多套脚本并存
    clean_legacy
    cp -f "$0" /etc/uu_route.sh && chmod +x /etc/uu_route.sh
    cat > /etc/init.d/uu_route <<'EOF'
#!/bin/sh /etc/rc.common
# uu_route 守护自启 (游戏流量 UU 路由引导)
START=98
STOP=10

start() {
    start-stop-daemon -S -b -m -p /tmp/uu_route.pid -x sh -- /etc/uu_route.sh watch
}

stop() {
    start-stop-daemon -K -p /tmp/uu_route.pid
}

restart() {
    stop
    # busybox ash 对信号有最多 5 秒延迟处理 (sleep 中不执行 trap), 需等旧进程完全退出
    sleep 6
    start
}
EOF
    chmod +x /etc/init.d/uu_route
    /etc/init.d/uu_route enable 2>/dev/null
    /etc/init.d/uu_route start 2>/dev/null
    if ls /etc/rc.d/S98uu_route >/dev/null 2>&1; then
        log "安装成功: /etc/uu_route.sh + init.d 自启(S98) + 守护已启动"
        echo "安装完成! 开机自启已注册, 守护进程已运行。"
    else
        log "安装完成但自启注册可能失败, 请检查 /etc/rc.d"
        echo "[警告] 自启注册可能失败, 请手动检查 /etc/rc.d/S98uu_route"
    fi
}

# ---- 完整卸载: 停止守护(含孤儿) + 还原规则 + 删除自启与文件 ----
uninstall_self() {
    echo "== 1. 停止守护进程 (含孤儿) =="
    start-stop-daemon -K -p "$PID_FILE" 2>/dev/null
    sleep 1
    for p in $(ps w | grep -E 'uu_route\.sh watch|uu_fix\.sh watch|uu_express\.sh watch' | grep -v grep | awk '{print $1}'); do
        kill "$p" 2>/dev/null
    done
    sleep 1
    # 清理 ip monitor 子进程: 先按 PID 文件, 再按孤儿(ppid=1)兜底, 不误杀其他进程
    [ -f "$MON_PID_FILE" ] && kill "$(cat "$MON_PID_FILE" 2>/dev/null)" 2>/dev/null
    for p in $(ps w | grep 'ip monitor rule' | grep -v grep | awk '{print $1}'); do
        ppid=$(awk '{print $4}' "/proc/$p/stat" 2>/dev/null)
        [ "$ppid" = "1" ] && kill "$p" 2>/dev/null
    done
    sleep 1
    echo "== 2. 还原防火墙规则 =="
    uninstall_all
    echo "== 3. 停止并删除自启服务与文件 =="
    /etc/init.d/uu_route stop 2>/dev/null
    clean_legacy
    rm -f /etc/rc.d/S98uu_route /etc/rc.d/K10uu_route /etc/init.d/uu_route /etc/uu_route.sh
    rm -f "$PID_FILE" "$MON_FILE" "$MON_PID_FILE" "$LOG_FILE" "$LOG_FILE.old"
    rm -f /tmp/uu_route.out
    echo "== 卸载完成: 规则/进程/自启/文件已全部清理 =="
}

# ---- 守护: 事件驱动 (ip monitor rule) + 30 秒兜底同步, 无 ip rule/nft 轮询开销 ----
watch() {
    if ! ip monitor help 2>&1 | grep -q 'rule'; then
        log "ip monitor 不可用, 进入轮询模式 (5 秒)"
        while true; do
            sync
            sleep 5
        done
        return
    fi
    log "进入被动监控模式 (ip monitor rule 事件驱动 + 30 秒兜底)"
    # 退出/被终止时自动清理 monitor 子进程, 避免孤儿残留
    # TERM/INT → exit → EXIT trap 负责杀 monitor 并清理 PID 文件
    WATCH_MON_PID=""
    trap 'kill "$WATCH_MON_PID" 2>/dev/null; rm -f "$MON_PID_FILE"' EXIT
    trap 'exit 0' TERM INT
    local last_lines elapsed lines
    while true; do
        # monitor 后台运行, 事件写入文件 (不丢事件); 启动时先 dump 当前规则 → 触发首次同步
        ip monitor rule > "$MON_FILE" 2>/dev/null &
        WATCH_MON_PID=$!
        echo "$WATCH_MON_PID" > "$MON_PID_FILE"
        last_lines=0
        elapsed=0
        while true; do
            sleep 5
            if ! kill -0 "$WATCH_MON_PID" 2>/dev/null; then
                wait "$WATCH_MON_PID" 2>/dev/null
                log "ip monitor 退出, 3 秒后重启"
                sleep 3
                break
            fi
            lines=$(wc -l < "$MON_FILE" 2>/dev/null)
            [ -z "$lines" ] && lines=0
            elapsed=$((elapsed + 5))
            if [ "$lines" != "$last_lines" ]; then
                last_lines=$lines
                sleep 1   # 去抖: 事件风暴/启动 dump 合并为一次 sync
                sync
                elapsed=0
            elif [ "$elapsed" -ge 30 ]; then
                elapsed=0
                sync   # 兜底: 即使事件丢失, 30 秒内必然收敛
            fi
        done
    done
}

# ---- 交互式菜单 ----
menu() {
    while true; do
        echo
        echo "============================================"
        echo "  UU Route — 游戏流量 UU 路由引导"
        echo "============================================"
        echo "  1) 安装   安装到系统 + 开机自启 + 启动守护"
        echo "  2) 卸载   彻底清理 (规则/进程/自启/文件)"
        echo "  3) 状态   查看设备/规则/守护运行状态"
        echo "  4) 同步   立即接管当前所有加速设备"
        echo "  5) 退出"
        echo "============================================"
        printf "请选择 [1-5]: "
        read -r choice || break
        case "$choice" in
            1) install_self;;
            2) confirm_uninstall;;
            3) status;;
            4) sync; echo "已同步完成";;
            5) echo "再见"; break;;
            *) echo "无效选择, 请输入 1-5";;
        esac
    done
}

confirm_uninstall() {
    echo "将彻底卸载 UU Route: 停止守护、还原全部规则、删除自启与文件。"
    printf "确认卸载? (yes/NO): "
    read -r ans || ans=NO
    case "$ans" in
        y|Y|yes|YES|Yes) uninstall_self;;
        *) echo "已取消卸载";;
    esac
}

# ---- 命令分发 ----
case "$1" in
    install)
        if [ "$2" = "self" ]; then install_self; else sync; fi;;
    uninstall)
        if [ "$2" = "self" ]; then uninstall_self; else uninstall_all; fi;;
    status) status;;
    watch)  watch;;
    menu|"") menu;;
    *) echo "用法: uu_route.sh [menu|install [self]|uninstall [self]|status|watch]";;
esac
