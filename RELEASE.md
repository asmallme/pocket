# Pocket 正式发布检查清单

> 基于 v1.0–v1.3 功能现状整理。完成一项可在 `[ ]` 中打 `x`：`[x]`。

---

## 一、阻塞发布（必须先完成）

### 1.1 生产环境变量（Vercel）

在 Vercel 项目 **Settings → Environment Variables** 配置：

| 变量 | 用途 | 完成 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API 地址 | [ ] |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 客户端鉴权 | [ ] |
| `SUPABASE_SERVICE_ROLE_KEY` | 插件网页授权 `/api/extension-token` | [ ] |
| `NEXT_PUBLIC_SITE_URL` | SEO、sitemap、OAuth 回调（如 `https://pocket-web-mu.vercel.app`） | [ ] |
| `DEEPSEEK_API_KEY` | v1.3 AI 摘要与自动打标（不配则 AI 静默失效，不影响收藏） | [ ] |

参考模板：`apps/web/.env.example`

### 1.2 浏览器插件环境变量

构建插件前确认 `apps/extension/.env`：

```env
WXT_SUPABASE_URL=https://<project-ref>.supabase.co
WXT_SUPABASE_ANON_KEY=<anon-key>
WXT_WEB_URL=https://<生产域名>
```

| 检查项 | 完成 |
|--------|------|
| `WXT_SUPABASE_URL` 为 `*.supabase.co`，非 Vercel 地址 | [ ] |
| `WXT_WEB_URL` 与线上 Web 域名一致 | [ ] |
| 生产构建：`pnpm --filter extension build` | [ ] |

### 1.3 Supabase 数据库 Migration

本地共 6 个 migration，**生产必须全部应用**，尤其 v1.3 与 iOS 快捷指令：

| Migration | 内容 | 完成 |
|-----------|------|------|
| `20260703000001_init.sql` | 基础表、RLS、Storage | [ ] |
| `20260703000002_v1_1.sql` | source 列等 | [ ] |
| `20260703000003_v1_2.sql` | v1.2 补充表结构与策略 | [ ] |
| `20260703000004_read_later.sql` | 稍后读 read_at | [ ] |
| `20260703000005_v1_3.sql` | 标签、订阅、星标、AI 字段、安静模式 | [ ] |
| `20260703000006_ios_shortcuts.sql` | iOS 快捷指令分享 Token | [ ] |

```bash
supabase link
supabase db push
```

### 1.4 Supabase Auth 回调地址

Dashboard → **Authentication → URL Configuration**：

| 配置项 | 值 | 完成 |
|--------|-----|------|
| Site URL | `https://<生产域名>` | [ ] |
| Redirect URLs 含 | `https://<生产域名>/auth/callback` | [ ] |
| Redirect URLs 含 | `http://localhost:3000/**`（本地开发） | [ ] |

若启用 GitHub / Google OAuth，需在对应平台配置相同回调域名。

### 1.5 插件 externally_connectable

`wxt.config.ts` 从 `WXT_WEB_URL` 生成 `externally_connectable`。生产构建前确认 `.env` 指向生产域名，否则网页授权登录失败。

| 检查项 | 完成 |
|--------|------|
| 生产插件 `externally_connectable` 包含生产 Web 域名 | [ ] |

---

## 二、强烈建议（上线前最好补齐）

### 2.1 法律与合规

| 项 | 说明 | 完成 |
|----|------|------|
| `/privacy` 隐私政策页 | Chrome Web Store 上架通常必填 | [x] |
| `/terms` 用户协议页 | UGC 平台基本合规 | [x] |
| 登录页 / 设置页链接上述页面 | 已接入；商店描述中记得附 `/privacy` 链接 | [x] |

品牌素材与 OAuth 控制台文案见 `docs/oauth-branding.md`；
产品 icon 已应用到网站 favicon、PWA manifest 和插件（`docs/brand/` 为原始素材）。

### 2.2 API 滥用防护

已按 **uid**（未登录 feed 按 IP）对各接口做滑动窗口限流，配置见 `apps/web/src/lib/rate-limit.ts`：

| 接口 | 限额（已登录） | 完成 |
|------|----------------|------|
| `/api/ai/enrich` | 20 次/分钟，150 次/小时 | [x] |
| `/api/ai/suggest` | 15 次/分钟，80 次/小时 | [x] |
| `/api/unfurl` | 40 次/分钟，300 次/小时 | [x] |
| `/api/feed` | 120 次/分钟（匿名 60 次/分钟） | [x] |
| `/api/extension-token` | 5 次/分钟，20 次/小时 | [x] |
| `/api/mobile-share` | 30 次/分钟，240 次/小时 | [x] |

超限返回 `429`，响应头含 `Retry-After`、`X-RateLimit-*`。

本地验证：`npx tsx scripts/rate-limit-check.mjs`

> 当前为进程内内存计数，适合单实例 / 本地。多实例 Serverless 部署时建议接入 Upstash Redis 等共享存储。

### 2.3 设计预览页

`/design-preview` 仅开发环境可访问，生产环境返回 404。

| 项 | 完成 |
|----|------|
| 限制仅开发环境可访问，或从生产移除 | [x] |
| `robots.txt` disallow `/design-preview` | [x] |

### 2.4 测试与 CI

| 项 | 完成 |
|----|------|
| 跑通 `node scripts/e2e-check.mjs`（需本地 Supabase + `pnpm dev`） | [ ] |
| 手动冒烟 v1.3：标签、订阅、AI enrich、主题切换 | [ ] |
| 配置 CI：PR 时 Web lint + Web build + 插件 build | [x] |

### 2.5 文档

| 项 | 完成 |
|----|------|
| 更新 `README.md`（v1.3、主题、DeepSeek、部署步骤） | [x] |

---

## 三、配置核对（功能已有，确认生效即可）

| 功能 | 需确认 | 完成 |
|------|--------|------|
| GitHub / Google 登录 | Supabase Dashboard → Providers 配置 Client ID / Secret | [ ] |
| 插件右键 / 快捷键 | 重新 build 并加载或发布新版 | [ ] |
| PWA 系统分享 | `manifest` share_target 已实现；HTTPS 下手动确认 | [ ] |
| iOS 快捷指令分享 | 个人中心内生成 Token 并查看完整配置步骤 | [ ] |
| AI 摘要 / 打标 | Vercel 配 `DEEPSEEK_API_KEY`；用户可在设置关闭 | [ ] |
| 主题（纸墨默认 + 三套可选） | 存 localStorage，换设备不同步（已知限制） | [x] |
| SEO | `NEXT_PUBLIC_SITE_URL` 正确，否则 sitemap / OG 指向错误 | [ ] |

---

## 四、已知产品边界（当前版本不做）

以下在 `story.md` 中明确排除，**不算发布缺口**：

- 端内纯净阅读模式
- 离线缓存与阅读进度同步
- 全文搜索引擎
- 主题偏好云端同步
- 忘记密码 / 邮件重置（已移除相关页面）

用户忘记密码时：依赖 GitHub / Google OAuth，或人工处理。

---

## 五、建议发布顺序

```
1. supabase db push（确保 v1.3 migration 已应用）
2. Vercel 补全环境变量（含 DEEPSEEK、SITE_URL、SERVICE_ROLE）
3. Supabase 配置 Auth URL（无需 SMTP，已去除邮件重置）
4. 部署 Web → 手动冒烟
5. 插件生产 build → 自测 → Chrome Web Store（需隐私政策）
6. API 限流 + CI（已补齐，上线前复跑）
```

---

## 六、发布前手动冒烟（约 15 分钟）

### 账号与登录

- [ ] 邮箱注册 + 登录
- [ ] GitHub / Google OAuth 登录（若已开启）
- [ ] 插件：网页授权登录 → 会话独立、可收藏

### 收藏与发现

- [ ] 网页收藏链接 / 文字 / 图片
- [ ] 收藏后后台 AI enrich（需 `DEEPSEEK_API_KEY`）
- [ ] 标签创建、订阅、Feed 按 tag 筛选
- [ ] 发现 / 关注 / 标签订阅 Tab
- [ ] 详情页相关推荐、OG 分享预览

### 个人管理

- [ ] `/my` 筛选、搜索、星标、批量管理
- [ ] 随机未读 / 温故知新
- [ ] 安静模式、主题切换（设置 → 外观主题）

### 插件

- [ ] Popup 预览正常（无定价表等乱码）
- [ ] 收藏后仅入库时触发 AI，打开 popup 不调用 AI
- [ ] 右键菜单 / 快捷键收藏

### 移动端

- [ ] 底栏导航（发现 / 我的 / 收藏 / 标签）
- [ ] PWA 添加到主屏幕
- [ ] 系统分享到 Pocket（share target）
- [ ] iOS 快捷指令：Safari / X App 分享链接或文本到 Pocket

---

## 七、生产信息备忘

| 项 | 值 |
|----|-----|
| Supabase 项目 ref | `xtiqsttyrcghypxeyqno` |
| 生产 Web（示例） | `https://pocket-web-mu.vercel.app` |
| 插件构建输出 | `apps/extension/.output/chrome-mv3` |
| 本地开发 | `pnpm db:start` → `pnpm dev` |
| E2E 测试 | `node scripts/e2e-check.mjs` |

---

*最后更新：加入 iOS 快捷指令收藏能力。*
