# 奶蛙网站部分用户无法访问：只读诊断

**19:39 更新：已有正确根域的真实手机失败样本，错误为 `net::ERR_DNS_NAME_NXDOMAIN`。当前优先结论和操作见 [NXDOMAIN 追加诊断](nxdomain-followup-2026-10-13.md)。用户明确不处理 www，以下 www 记录只保留为早期旁支观测，不作为此次修复建议。**

观测时间：2026-10-13 19:25–19:26（北京时间；UTC 11:25–11:26）。
域名：`奶蛙职业技术学院.com` / `xn--vhqt0ztpb01mkjgbk6bnujgj4a.com`。

用户后续明确：不处理 `www`，继续聚焦实际入口/跳转故障。下文保留其观测记录，`www` 不再作为待修复任务，也不能算作已定位手机打不开的原因。根域受影响手机的共同根因仍待失败样本。

## 新增实际失败样本：19:37 北京时间

用户提供手机地址 `http://xn--vhqt0zdma09by9qtjhzq1cq6yb.com/`。
IDNA 解码是 **奶娃职业技术学院.com**（娃），而正确域名是 **奶蛙职业技术学院.com**（蛙），对应 `xn--vhqt0ztpb01mkjgbk6bnujgj4a.com`。
Google DNS 对错误的“奶娃”域名返回 Status 3 / NXDOMAIN。这能解释该地址为何无法打开。
正确“奶蛙”域名 HTTP HEAD 返回 200、无 Location；已读取的现网脚本只跳转清华官网，没有“奶娃”地址。
尚不能确定错误字来自输入联想、历史记录、转发链接或其他来源，也不能据此把此前校园 DNS 故障归为同一原因。

## 结论

早期附带发现：带 `www` 的域名不存在 DNS 记录，但最新失败样本使用不带 `www` 的正确域名，**因此该发现不解释本次手机故障**。用户明确不处理此旁支。

国内移动、电信、联通的新一轮 IPv4、IPv6 HTTPS 测量共 12 次，全部返回 200，TLS 证书验证成功。因此没有证据支持“手机普遍不能访问”“必须 VPN”或“IPv6 全部有问题”。这些是各运营商终端网络探针，**不等于实际受影响手机的蜂窝网络和微信环境**。

此前校园网用户的普通请求确实解析失败，而指定地址后 HTTPS 200，已证明那个案例有 DNS 问题。旧阿里 DNS 仍无 A 记录，父区 NS 缓存周期较长，因而“部分递归服务器仍缓存旧委派”是合理假设；尚未拿到受影响校园 DNS 的 NS 回包，不能当作已证实根因，更不能推广到所有手机。

## 本次证据

| 检查 | 结果 | 置信度与限制 |
| --- | --- | --- |
| 根域公共 DNS | Google、阿里 A 均为 `104.21.28.129`、`172.67.146.49` | 高，当前公共递归视角 |
| 根域 AAAA | `2606:4700:3035::6815:1c81`、`2606:4700:3036::ac43:9231` | 高，Google DNS |
| `www` | Google 与 Cloudflare 均 NXDOMAIN | 高，确定缺口 |
| `.com` 父区委派 | `ashton.ns.cloudflare.com`、`stephane.ns.cloudflare.com`，TTL 172800 秒 | 高；48 小时是该委派 TTL，不是保证每个用户都要等 48 小时 |
| 两个 Cloudflare 权威 NS | 都返回上述两个 A，TTL 300 秒 | 高，广州探针分别查询 |
| 旧 `dns13.hichina.com` | NOERROR，但 ANSWER 0；SOA 负缓存 TTL 600 秒 | 高，广州探针；未证明失败终端仍使用它 |
| DNSSEC | Google、Cloudflare 查询 DS 均 NOERROR 无 DS | 当前未发现残留 DS 导致验证失败的证据 |
| HTTPS / TLS | 下列 12 次均 200，`tls.authorized=true` | 当前采样成功，不代表全天、所有地域 |
| HTTP | 台山移动 AS9808，19:26:20 发起，HTTP 200 | 单点成功，无入口重定向循环 |
| 手机 User-Agent | 主线程对 iPhone Safari、Android 微信 UA 得到相同 HTML、HTTP 200；图片/脚本也 200 | 只排除这两种请求头在该测试网络触发差别响应；不是实际手机浏览器验证 |

IPv4 测量发起于 **19:25:38.747**，IPv6 发起于 **19:25:39.197**；均于几秒内完成。

| 协议 | 运营商 / ASN | 探针城市 | HTTPS |
| --- | --- | --- | --- |
| IPv4 | 移动 AS9808 | 南宁、上海 | 2/2，200 |
| IPv4 | 电信 AS4134 | 广州、桂林 | 2/2，200 |
| IPv4 | 联通 AS4837 | 南宁、芜湖 | 2/2，200 |
| IPv6 | 移动 AS9808 | 南宁、昆明 | 2/2，200 |
| IPv6 | 电信 AS4134 | 桂林、西安 | 2/2，200 |
| IPv6 | 联通 AS4837 | 武汉、长沙 | 2/2，200 |

12 个结果均标记 `eyeball-network`。HEAD 总耗时约 0.76–2.48 秒，CF-RAY 指向境外节点；这证明采样时入口通，但 HEAD 不测整页图片下载和动画渲染，也不能证明实际手机访问速度。证书签发者 Google Trust Services WE1，覆盖根域及通配子域，有效期 2026-10-13 至 2027-01-11；证书覆盖 `www` 不意味着 `www` 已有 DNS 或 Worker 绑定。

公开原始测量：

- [IPv4 六探针结果](https://api.globalping.io/v1/measurements/2hNNg2Cz84m1R9rAZ00021JD3)
- [IPv6 六探针结果](https://api.globalping.io/v1/measurements/2bf3CFB3S7q98tAPA00021JD3)
- [父区委派](https://api.globalping.io/v1/measurements/2qUBISq2nXm2akHM300021JD3)
- [Cloudflare 权威 ashton](https://api.globalping.io/v1/measurements/2CyWM4RAgEcw1LJX500021JD3)、[stephane](https://api.globalping.io/v1/measurements/2hCqVwZzeoAkc26KV00021JD4)
- [旧阿里权威](https://api.globalping.io/v1/measurements/2r4GeRWDOyySgIfJ300021JD3)
- [HTTP 台山移动](https://api.globalping.io/v1/measurements/22KuK3WI3tmq3KFdM00021JD4)

本目录保存对应 `result-*.json`、公共 DNS 查询 JSON 和 `mobile-ua-and-assets.json`。`local-python-network-unavailable.json` 是本地工具网络限制记录，不代表网站的 DNS 故障；成功观测使用另行可用的 curl 请求和远端探针。

## 可执行的下一步

1. **找一个实际失败手机做最小对照**：复制精确入口 `https://奶蛙职业技术学院.com/?preview=1` 到系统浏览器，分别使用原 Wi-Fi 与关闭 Wi-Fi 后的手机流量。这个链接不自动离开奶蛙页，便于区分入口失败和 6 秒后清华目标失败。记录运营商、浏览器、失败画面和地址栏完整地址；只需一个可重复失败样本，不需要所有同学改设置。
2. **按失败阶段处理**：从未出现奶蛙且提示找不到服务器，优先取失败网络 DNS 回包；微信失败但同网络系统浏览器成功，再查微信提示或链接识别；看到奶蛙后才报错，查地址栏是否已进入清华官网；超时、连接关闭或证书错误则分别定位连接或 TLS。不要仅凭“打不开”就更换服务器或关闭 IPv6。
3. **校园 DNS 迁移假设核实**：在仍失败的校园网电脑运行 `nslookup -type=ns xn--vhqt0ztpb01mkjgbk6bnujgj4a.com 166.111.8.28`，并保存 A 查询结果。若仍指向旧阿里 NS，再处理旧缓存或请网络管理员刷新；修改电脑 DNS 只能缓解该设备，并不能修复所有访客。NS 修改后存在递归缓存差异，阿里文档建议迁移期间新旧 DNS 数据保持一致。[阿里云说明](https://help.aliyun.com/zh/dns/pubz-dns-server-related-faq)

本次未修改域名、DNS、Cloudflare 或页面。未真实运行手机浏览器、微信，也未访问受影响手机的网络；根域手机失败仍待该最小样本确认。
