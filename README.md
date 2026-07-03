# Pocket - 收藏与发现

收藏你在全网看到的好内容，分享给同样热爱阅读的人。

## 功能

- 收藏链接（自动抓取标题 / 摘要 / 封面）、文字、图片
- 每条收藏可公开或私密，公开内容进入全局 feed
- 点赞、评论、关注，支持「发现 / 关注」双 feed
- 浏览器插件一键收藏当前页面
- 移动端 PWA + 剪贴板链接识别，快捷收藏

## 技术栈

- **Web**：Next.js（App Router）+ Tailwind CSS + shadcn/ui
- **后端**：Supabase（Postgres / Auth / Storage / RLS）
- **插件**：WXT + React，兼容 Chrome / Edge / Firefox
- **仓库**：pnpm monorepo

## 目录结构

```
pocket/
├── apps/
│   ├── web/          # Next.js 网站（页面 + API）
│   └── extension/    # 浏览器插件（WXT）
├── packages/
│   └── shared/       # 共享 TypeScript 类型
└── supabase/         # 数据库 migration 与配置
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
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. 插件用生产环境变量重新构建后发布到 Chrome Web Store
