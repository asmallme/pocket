# OAuth 应用配置与品牌素材

配置 GitHub / Google 登录（经由 Supabase Auth）时，需要在对方的开发者控制台填写产品信息。
本文档提供可直接复制的文案与素材路径。

## 品牌素材

| 文件 | 尺寸 | 用途 |
| --- | --- | --- |
| `docs/brand/logo-120.png` | 120×120 | Google OAuth 同意屏幕 Logo |
| `docs/brand/logo-512.png` | 512×512 | GitHub OAuth App Logo、应用商店 |
| `docs/brand/logo-1024.png` | 1024×1024 | 原始尺寸，衍生其它规格 |

品牌色（与「纸墨」主题一致）：

- 纸色背景：`#FAF8F5`
- 墨色主体：`#3D3229`
- 赭金点缀：`#C08A3E`

## 产品文案（可直接复制）

**产品名称**

> 网兜

**一句话介绍（Tagline）**

> 收藏你在全网看到的好内容，分享给同样热爱阅读的人。

**短描述（约 80 字，用于 OAuth 同意屏幕 / 应用商店简介）**

> 网兜是一款内容收藏与分享工具。通过浏览器插件、手机分享菜单一键收藏网页、文字和图片，AI 自动生成摘要与标签；你可以私密保存，也可以附上推荐语公开分享，在安静的信息流里发现值得读的内容。

**长描述（用于 Chrome Web Store / 详细介绍）**

> 网兜让「收藏」这个动作发生在内容出现的任何地方：浏览器里点一下图标、手机上点一下分享，一条带标题、摘要和封面的收藏卡片就存好了。
>
> 收藏之后，AI 会在后台自动生成摘要和标签建议，你无需手动整理；「随机未读」和「温故知新」帮你把积压的收藏重新捞出来读完。
>
> 每条收藏都可以选择私密保存或公开分享。公开时写下你的推荐语，它会以金句排版出现在信息流里——在网兜，观点先于链接。关注你信任的人、订阅你关心的标签，没有算法插队的安静阅读流。

**英文短描述（如需）**

> Scoop (网兜) is a bookmarking and content-sharing tool. Save web pages, text, and images in one click via the browser extension or mobile share sheet. AI summarizes and tags your saves in the background. Keep them private, or share with a note in a calm, algorithm-free feed.

## Google OAuth（Google Cloud Console）

位置：APIs & Services → OAuth consent screen

| 字段 | 填写内容 |
| --- | --- |
| App name | `网兜` |
| App logo | 上传 `docs/brand/logo-120.png` |
| User support email | 你的联系邮箱 |
| App domain - Home page | `https://<你的域名>` |
| Privacy policy link | `https://<你的域名>/privacy` |
| Terms of service link | `https://<你的域名>/terms` |
| Authorized domains | `<你的域名>` 和 `supabase.co` |
| Scopes | 仅默认的 `openid` / `email` / `profile`，无需敏感权限 |

然后在 Credentials → Create OAuth client ID（Web application）：

| 字段 | 填写内容 |
| --- | --- |
| Authorized JavaScript origins | `https://<你的域名>` |
| Authorized redirect URIs | `https://<项目 ref>.supabase.co/auth/v1/callback` |

将得到的 Client ID / Client Secret 填入 Supabase Dashboard → Authentication → Providers → Google。

## GitHub OAuth（GitHub Developer Settings）

位置：Settings → Developer settings → OAuth Apps → New OAuth App

| 字段 | 填写内容 |
| --- | --- |
| Application name | `网兜` |
| Homepage URL | `https://<你的域名>` |
| Application description | 使用上文「短描述」 |
| Authorization callback URL | `https://<项目 ref>.supabase.co/auth/v1/callback` |
| Logo | 上传 `docs/brand/logo-512.png` |

将得到的 Client ID / Client Secret 填入 Supabase Dashboard → Authentication → Providers → GitHub。

## 权限说明（审核时可能被问到）

- 我们只请求基础身份信息（邮箱、昵称、头像），用于创建和识别网兜账号；
- 不读取用户在 GitHub / Google 的任何其它数据（仓库、邮件、云端硬盘等）；
- 数据使用方式详见隐私政策：`https://<你的域名>/privacy`。

## 本地开发提示

本地 Supabase 的 OAuth 回调地址为 `http://127.0.0.1:54321/auth/v1/callback`，
可在 `supabase/config.toml` 中启用对应 provider 并配置测试用的 Client ID / Secret。
