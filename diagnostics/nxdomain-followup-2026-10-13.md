# 正确根域手机 NXDOMAIN：追加诊断

时间：2026-10-13 19:39（北京时间）。没有更改线上 DNS 或页面。

## 已经确定的范围

用户真实失败地址为 `http://xn--vhqt0ztpb01mkjgbk6bnujgj4a.com/`，对应正确的“奶蛙职业技术学院.com”；错误 `-903`，详情 `net::ERR_DNS_NAME_NXDOMAIN`。这个样本失败在**域名解析阶段**，尚未进入奶蛙网页、动画或跳转到清华的逻辑。修改动画、切换 HTTP/HTTPS、增加 URL 参数都不能直接修复域名解析。

此前另一个样本 `xn--vhqt0zdma09by9qtjhzq1cq6yb.com` 解码为“奶娃职业技术学院.com”，属于另一个域名；不能用那个拼写问题解释本次正确域名的失败。www 同样与当前样本无关，按用户要求不继续处理。

## 本轮最小复查

| 观测 | 结果 |
| --- | --- |
| Google 公共 DNS：正确根域 A | NOERROR，两个正确 Cloudflare IPv4 |
| 阿里公共 DNS：A、AAAA、NS | 均 NOERROR；IPv4/IPv6 与前轮一致，NS 为 `ashton.ns.cloudflare.com` / `stephane.ns.cloudflare.com` |
| 北京腾讯探针 → 旧 dns13.hichina.com | 19:39:47.938 发起；NOERROR，A 空答，SOA 负缓存 TTL 600 秒 |
| 北京腾讯探针 → 旧 dns14.hichina.com | 19:39:48.392 发起；同样 NOERROR，A 空答，TTL 600 秒 |
| 北京腾讯探针 → .com 父区 a.gtld-servers.net | 19:39:48.661 发起，UDP 查询超时；没有得到 NXDOMAIN 或委派记录 |

父区上一轮成功证据是 19:25 广州探针：正确委派到两个 Cloudflare NS，TTL 172800 秒。本轮单探针超时不能证明委派配置错误。Google 最新 A 回包注明来自 `172.64.34.112`（Cloudflare stephane 地址），也有正常权威解析路径。

本轮原始文件为本目录 `nxdomain-*.json`。远端结果：[旧 dns13](https://api.globalping.io/v1/measurements/2EjT9ebdJYneEV0aa00021JDH)、[旧 dns14](https://api.globalping.io/v1/measurements/25HOGX9wXsjJFqPvc00021JDH)、[父区查询超时](https://api.globalping.io/v1/measurements/2enThS6ULy0WGXbDB00021JDH)。

**关键区别：旧阿里返回 NOERROR / NODATA（名字存在，但没有 A），手机显示 NXDOMAIN（名字不存在）。两者不能直接画等号。** 当前只知道手机的解析过程失败，还不知道产生或缓存该负答的是运营商/校园递归服务器、系统、浏览器安全 DNS，还是网络策略。没有证据足以认定拦截或 DNS 污染。

## 不安装工具的最短对照

让这个失败手机用原来的浏览器，复制同一个正确完整链接，关闭 Wi-Fi 后用手机流量再打开一次；记录是否出现奶蛙页面，以及流量运营商。不要在对照期间改 VPN 或其他设置。

- Wi-Fi 失败、流量成功：问题与原网络解析路径或缓存有关，优先调查那个 Wi-Fi 的 DNS；不能仅凭这个结果确定是缓存还是策略。
- 两种网络都失败：保持流量，在系统自带浏览器再次打开同一链接。若只有原浏览器失败，检查它的安全 DNS、缓存和链接处理；若都失败，再需要该手机 DNS 设置及具体网络信息。
- 同网络一个浏览器成功、另一个失败：这是浏览器解析配置或缓存差异的线索，不足以直接断定某应用拦截。

如担心成功后自动跳走，可统一使用 `https://xn--vhqt0ztpb01mkjgbk6bnujgj4a.com/?preview=1`；参数只暂停站点自动跳转，**不会绕过 DNS 或清除 DNS 缓存**。第一轮最有价值的是“同手机、同浏览器、同链接，只切 Wi-Fi/流量”的结果，不需要立刻让所有用户改 DNS。

## 怎样有证据地修复

1. 若失败 Wi-Fi 有同网电脑，让电脑保存默认 DNS 的 A、AAAA 和 NS 查询，以及指定 `223.5.5.5` 的 A 对照。若校园 DNS 仍为 `166.111.8.28`，保留其完整输出；浏览器可能使用独立安全 DNS，所以电脑默认 DNS 的正常结果不能排除手机浏览器问题。
2. 若受影响递归服务器明确仍使用旧阿里 NS，并且旧 NS 没有地址，才把“迁移期旧权威数据不同步”作为修复对象。在阿里原解析区临时补齐根域 `@` 的 A：`104.21.28.129`、`172.67.146.49`，使旧委派使用者也能到达当前 Worker；保留注册商 NS 指向 Cloudflare。修复前先重新核验当前 Cloudflare A，修复后从旧 NS 查询确认有答，再在失败网络复测。旧区仅作为迁移过渡，不把这些 Cloudflare IP 当作永久固定地址。
3. 若失败递归服务器已经知道 Cloudflare NS，却仍返回 NXDOMAIN，应保存其完整负答和 SOA、TTL，交由该网络 DNS 管理员检查缓存或策略；新增网页记录和重复切换 NS 不能保证解决。浏览器单独失败则先查其解析路径，改系统 DNS 未必作用于浏览器安全 DNS。

未知负答的来源和 TTL 时，不承诺“等十分钟”或“等 48 小时一定好”。旧阿里 NODATA 的 600 秒与父区委派的 172800 秒分别是不同缓存对象，也不等于这部手机所见 NXDOMAIN 的 TTL。

当前结论：**实际手机的失败阶段已定位到 DNS，但制造或缓存 NXDOMAIN 的具体环节仍需上述一个终端对照确认。**
