# App Store 上架文案（粘贴用）

> 2026-07-18 准备。提交页在 App Store Connect → 网兜 → 1.0 准备提交。

## 基本信息

| 字段 | 内容 |
|------|------|
| 名称 | 网兜 - 收藏与发现 |
| 副标题（30 字符内） | 兜住全网的好内容 |
| 类别 | 主要：社交；次要：效率 |
| 年龄分级 | 按问卷如实填（含 UGC，预计 17+ 或 12+，选「频繁/强烈」都选无即可） |

## 描述

```
网兜是一个安静的收藏与分享社区。

看到好文章、好视频，从系统分享面板一键收进网兜；AI 自动生成摘要和标签，
让你回头翻找时一眼判断"这篇值不值得读"。

· 一键收藏：Safari 或任意 App 的分享面板，选「网兜」即可
· AI 摘要：自动提炼关键内容，拒绝标题党
· 金句策展：为收藏写一句推荐语，好内容配好观点
· 标签订阅：按兴趣订阅标签，信息流只留你关心的领域
· 关注同好：看别人兜住了什么，一键转存到自己的网兜
· 安静模式：隐藏社交数字，回归内容本身

没有算法推荐轰炸，没有无限刷新焦虑——只有你和同好们
认真挑选过的好内容。
```

## 关键词（100 字符内，英文逗号分隔）

```
收藏,稍后读,书签,阅读,剪藏,分享,AI摘要,标签,read later,bookmark
```

## 技术支持 / 隐私

| 字段 | 内容 |
|------|------|
| 技术支持网址 | https://www.wangdou.app/about |
| 隐私政策网址 | https://www.wangdou.app/privacy |

## App 隐私（数据收集问卷）

选「收集数据」，逐项填：

| 数据类型 | 用途 | 是否关联身份 | 是否用于追踪 |
|----------|------|--------------|--------------|
| 电子邮件地址 | App 功能（账号） | 是 | 否 |
| 用户 ID | App 功能 | 是 | 否 |
| 用户内容（收藏/评论） | App 功能 | 是 | 否 |
| 姓名（昵称，可选） | App 功能 | 是 | 否 |

不收集：位置、健康、财务、浏览历史（站外）、设备标识符用于广告。无第三方广告 SDK。

## 审核备注（App Review Information → Notes）

```
测试账号：请填一个你注册好的演示账号（邮箱+密码）
Notes 建议写：
This is a bookmarking & sharing community app. Users save links via the
system share extension, and the app generates AI summaries. UGC moderation:
users can report content (report button on every bookmark detail page) and
block users (block button on profile pages). Account deletion is available
in Settings. Sign in with Apple / Google / GitHub / email are all supported.
```

## 提交前核对

- [ ] 截图：6.7 英寸（1290×2796）至少 3 张——待生成
- [ ] 演示账号在生产环境可登录、feed 有内容
- [ ] Supabase Apple provider 已开启（Apple 审核员会实测 Apple 登录）
- [ ] 出口合规：使用标准 HTTPS 加密 → 选"是→符合豁免"（App 未含专有加密）
