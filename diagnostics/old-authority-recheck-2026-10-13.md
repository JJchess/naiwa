# 旧阿里权威 DNS 复查

2026-10-13 20:32:16（北京时间），Globalping 广州腾讯网络探针分别查询正确根域的 A：

| 权威服务器 | 返回结果 | SOA 负缓存 TTL |
| --- | --- | --- |
| dns13.hichina.com | NOERROR，ANSWER 0（NODATA） | 600 秒 |
| dns14.hichina.com | NOERROR，ANSWER 0（NODATA） | 600 秒 |

旧解析区仍没有 A，主线程同期核验阿里公共 DNS 的当前 Cloudflare A 仍为 `104.21.28.129`、`172.67.146.49`。

因此，在旧阿里解析区临时补上当前根域 `@` 的这两个 A、同时保持注册商 NS 指向 Cloudflare，是针对“仍通过缓存旧委派询问阿里权威”的迁移缓解措施。它不是清除所有运营商或浏览器 NXDOMAIN 缓存的操作，也不能证明所有失败用户都走旧委派。已有旧负缓存还需到期或被相关解析器主动刷新；不承诺提交记录后所有访客立即恢复。

没有执行线上写入。

原始结果：[dns13](https://api.globalping.io/v1/measurements/2MzA1vCkR5X1l7vh700021JE8)、[dns14](https://api.globalping.io/v1/measurements/2OqssZ5lVnAOM13tz00021JE8)。本地保存 `recheck-result-old13.json`、`recheck-result-old14.json`。
