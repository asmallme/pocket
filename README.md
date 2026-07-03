<p align="center">
  <img src="apps/web/public/icons/icon-192.png" alt="Pocket" width="88" />
</p>

<h1 align="center">Pocket</h1>

<p align="center"><strong>收藏你在全网看到的好内容，分享给同样热爱阅读的人。</strong></p>

---

## 为什么做 Pocket

每个人的浏览器收藏夹里，都躺着几百条「以后再看」——然后再也没有打开过。
与此同时，我们每天在信息流里刷到的东西越来越多，真正值得读的却越来越难被发现。

Pocket 想解决的就是这两件事：**让收藏这个动作变得毫不费力，让好内容因为「人的推荐」而流动起来。**

它既是你的个人收藏库，也是一个由真实阅读者组成的推荐网络：

- 对自己，它是一个**随手可达、越用越有序**的第二大脑；
- 对他人，你的每一次公开收藏，都是一句「这个值得看」的真诚推荐。

## 三个核心理念

### 1. 收藏应该发生在内容出现的地方

值得收藏的东西不会等你打开某个 App 才出现，所以 Pocket 把收藏入口铺到了每一个场景：

- **浏览器插件**：点击图标、右键菜单、快捷键 `Cmd/Ctrl+Shift+S`，收藏当前页面、选中的文字、图片或链接，全程不离开当前页；
- **手机分享菜单**：PWA 支持系统级 Share Target，在任何 App 里点「分享 → Pocket」即可收藏；
- **剪贴板识别**：复制了一个链接再打开 Pocket？它会主动问你要不要存下来。

针对 X、微信公众号、知乎、B站、Hacker News、Reddit、少数派等站点做了**帖子级内容提取**——收藏下来的不是一个光秃秃的 URL，而是带标题、摘要、封面的完整卡片。

### 2. 收藏不是终点，被再次读到才是

大多数收藏工具的问题在于「存进去就死了」。Pocket 在两端发力：

- **AI 在后台默默整理**：收藏保存后，AI（DeepSeek）会在后台异步生成摘要和标签建议——不打断你的操作，不需要你手动整理，打开列表时一切已经就绪。摘要和自动标签均可在设置中一键关闭。
- **对抗「收藏夹坟场」**：「随机未读」帮你从积压里捞出一条重读；「温故知新」定期把一年前的今天你收藏的内容翻出来。收藏支持已读/未读、星标、全文搜索和多维筛选，几百条收藏也能秒级定位。

### 3. 一个安静的、以推荐语为中心的社区

Pocket 的社区部分刻意做得「慢」：

- **推荐语（金句）优先**：公开一条收藏时，你写下的那句「为什么值得读」会以金句排版呈现在信息流的最显眼处——观点先于链接；
- **三条信息流**：「发现」看全站、「关注」看你信任的人、「标签订阅」只看你关心的主题，没有算法插队；
- **安静模式**：一键隐藏关注者数量等社交计数，回归纯粹的阅读与收藏；
- **公开 / 私密由你决定**：每条收藏独立设置可见性，私密内容通过数据库行级安全策略（RLS）在存储层强制隔离。

## 产品形态一览

| 端 | 说明 |
| --- | --- |
| **Web** | 完整的收藏管理、信息流、标签系统、个人主页；支持「纸墨」等多套主题 |
| **浏览器插件** | Chrome / Edge / Firefox，一键收藏 + 网页授权登录（无需重复输密码） |
| **移动端 PWA** | 可安装到主屏，Android 支持系统分享菜单收藏 |
| **iOS 快捷指令** | Safari / X App / 多数 iOS App 可通过系统分享面板保存到 Pocket（在个人中心配置） |

## 技术栈

- **Web**：Next.js（App Router）+ Tailwind CSS + shadcn/ui
- **后端**：Supabase（Postgres / Auth / Storage / RLS）
- **AI**：DeepSeek（摘要与自动标签，后台异步执行）
- **插件**：WXT + React，兼容 Chrome / Edge / Firefox
- **仓库**：pnpm monorepo

```
pocket/
├── apps/
│   ├── web/          # Next.js 网站（页面 + API）
│   └── extension/    # 浏览器插件（WXT）
├── packages/
│   └── shared/       # 共享 TypeScript 类型
├── supabase/         # 数据库 migration 与配置
└── docs/             # 品牌素材、OAuth 配置等文档
```

## 本地开发

前置要求：Node.js 22+、pnpm、Docker（跑本地 Supabase）。

```bash
# 1. 安装依赖
pnpm install

# 2. 启动本地 Supabase（首次会拉取 Docker 镜像）
pnpm db:start

# 3. 配置环境变量
#    supabase start 输出的 API URL 和 anon key 填入：
cp apps/web/.env.example apps/web/.env.local
cp apps/extension/.env.example apps/extension/.env

# 4. 启动网站
pnpm dev
# 打开 http://localhost:3000
```

可选能力对应的环境变量：

| 变量 | 用途 |
| --- | --- |
| `DEEPSEEK_API_KEY` | AI 摘要与自动标签 |
| `SUPABASE_SERVICE_ROLE_KEY` | 插件网页授权登录（`/extension-auth`）与 iOS 快捷指令保存 |

### 浏览器插件

```bash
pnpm --filter extension dev     # 开发模式（自动打开浏览器）
pnpm --filter extension build   # 构建到 apps/extension/.output/
```

构建后在 Chrome 的「扩展程序 → 加载已解压的扩展程序」中选择
`apps/extension/.output/chrome-mv3` 目录。

### 常用命令

```bash
pnpm db:reset   # 重置数据库并重跑所有 migration
pnpm db:types   # 从本地数据库生成 TypeScript 类型
pnpm build      # 构建所有包

# 端到端冒烟测试（需先启动 supabase 与 pnpm dev）
node scripts/e2e-check.mjs
```

## 部署

1. 在 [supabase.com](https://supabase.com) 创建项目，执行 `supabase link` 后
   `supabase db push` 应用 migration
2. 网站部署到 Vercel，设置 `NEXT_PUBLIC_SUPABASE_URL` 和
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`（以及上表中的可选变量）
3. 插件用生产环境变量重新构建后发布到 Chrome Web Store

完整的发布检查清单见 [RELEASE.md](RELEASE.md)，OAuth 应用配置与品牌素材见
[docs/oauth-branding.md](docs/oauth-branding.md)。

## 相关文档

- [产品介绍](/about)（线上路径 `/about`）
- [隐私政策](/privacy)（线上路径 `/privacy`）
- [用户协议](/terms)（线上路径 `/terms`）
- [发布清单 RELEASE.md](RELEASE.md)
- [OAuth 品牌与配置 docs/oauth-branding.md](docs/oauth-branding.md)
