# iOS 端建设路线图

> 2026-07-05 确定。目标：构建网兜 iOS 客户端并上架 App Store。

## 已定决策

| 决策 | 结论 | 原因 |
|------|------|------|
| 技术路线 | **Expo / React Native**（apps/mobile） | 复用 Supabase 后端与 @pocket/shared；原生体验；支持分享扩展；过审最稳。Capacitor 套壳被否（现有 Next.js 纯 SSR 无法静态导出，远程 WebView 过审风险大） |
| 首版范围 | **对齐网页版全功能** | feed（全站/关注/订阅标签）、点赞、转存、评论、标签、个人主页、我的收藏、设置 |
| 上架区域 | **先上非中国区**（美区/港区等） | 大陆区强制 ICP 备案，wangdou.app 托管在 Vercel（境外）无法备案；后续要进国区再迁移备案 |
| 构建方式 | **EAS Build 云构建** | 本机无完整 Xcode（仅 CLT），EAS 免本地 Xcode 即可出包与提审；本地模拟器调试才需要装 Xcode |

## 过审硬性要求（缺一被拒）

1. **Sign in with Apple**（指南 4.8）：已提供 Google 登录就必须同时提供 Apple 登录。
   Supabase Dashboard 需开启 Apple provider（需 Apple Developer 账号的 Services ID/Key）。
2. **UGC 合规**（指南 1.2）：必须有「举报内容」与「拉黑用户」。目前网页版也没有 → 需新增
   Supabase 迁移（reports 表、blocks 表 + feed 过滤），iOS 与网页双端加入口。
3. **应用内注销账号**（指南 5.1.1(v)）：有注册就必须能在 App 内删号。需 security definer RPC
   级联清理数据，双端加入口。
4. 隐私政策 / 服务条款：网页已有 /privacy、/terms ✓，App Store Connect 填链接即可。

## 用户侧待办（代码解决不了）

- [ ] 注册 Apple Developer Program（$99/年，https://developer.apple.com，个人开发者即可）
- [ ] 注册后在 Supabase Dashboard 开启 Apple 登录 provider
- [ ] （可选）App Store 装完整 Xcode，用于本地模拟器调试
- [ ] App Store Connect 建应用（bundle id 建议 `app.wangdou.ios`）

## 实施进度（2026-07-05 首轮完成）

1. ✅ 脚手架：apps/mobile（Expo SDK 57 + expo-router + src/ 结构，bundle id `app.wangdou.ios`）
2. ✅ 登录：邮箱密码 + Google（PKCE 深链）+ Sign in with Apple（signInWithIdToken）
3. ✅ Feed：全站/关注/订阅标签三 tab、无限滚动、下拉刷新、点赞/转存乐观更新、标签页
4. ✅ 详情页 + 评论（发表/删除）+ 举报（复用 reports 表）+ 删除收藏
5. ✅ 保存：粘贴链接 → unfurl 预览 → 查重 → 入库 → AI enrich；expo-share-intent 分享扩展
   （source 新增 'ios' / 'ios-share'，迁移 20260705000002）
6. ✅ 我的（含私密收藏）/ 个人主页 / 关注按钮 / 设置（资料 + 安静模式）
7. ✅ 合规：拉黑（blocks 表 + feed 过滤）、注销账号（delete_account RPC 级联），
   迁移 20260705000003，已本地冒烟验证（RLS 拒伪造、级联删除干净）
8. ✅ eas.json（development/preview/production）
9. ⏸ 未完成（v1.1，任务 #21）：粉丝/关注列表、稍后读/星标筛选、订阅标签按钮、
   编辑收藏、web 端拉黑/注销入口
10. ⏸ 上架材料：品牌图标/启动图（现为模板占位图）、App Store 截图文案、App Privacy 表

## 重要技术说明

- feed 查询逻辑已下沉 `@pocket/shared/feed`（web 与 mobile 共用），web 的 lib/feed.ts 仅转发；
  next.config.ts 加了 `transpilePackages: ["@pocket/shared"]`
- 分享扩展与 Apple/Google 登录含原生模块，**Expo Go 跑不了**，需 dev client：
  `cd apps/mobile && eas build --profile development --platform ios`
- 生产构建：`eas build --profile production --platform ios`；提审：`eas submit -p ios`

## 上线前必做（新增）

- [ ] 生产数据库应用两个新迁移：`npx supabase db push`（20260705000002 + 20260705000003）
- [ ] Supabase Redirect URLs 加 `wangdou://**`（生产深链）；开发期再加 `exp://**`
- [ ] Supabase 开启 Apple provider：Apple Developer → Identifiers 里为 `app.wangdou.ios`
      开 Sign in with Apple；Supabase Apple provider 的 Client IDs 填 `app.wangdou.ios`
- [ ] 注册 Expo 账号并 `npx expo login`（EAS 云构建需要）

## 技术备忘

- 移动端直连 Supabase（RLS），unfurl/AI enrich 复用 web 的 API 路由（https://www.wangdou.app/api/...）
- feed 查询逻辑以 apps/web/src/lib/feed.ts 为准移植，保持 BOOKMARK_SELECT 一致
- 会话持久化用 SecureStore 大小有限制（2KB），Supabase session 较大 → 用 AsyncStorage +
  aes 加密（expo-secure-store 存 key）或社区方案 supabase 官方推荐的 large secure store 模式
- 分享扩展用 expo-share-intent（config plugin），需要 dev client / EAS build，Expo Go 跑不了
