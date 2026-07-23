# 4.2.2 拒审回复信（Resolution Center 粘贴用）

> 2026-07-23。用法：App Store Connect → 拒审消息下方「回复」→ 粘贴以下英文
> → 同时把版本页的构建版本换成 1.0 (3) → 重新提交审核。

```
Hello,

Thank you for the review. We would like to respectfully clarify that Wangdou
is a fully native app (built with React Native / native iOS components — it
contains no webviews for its core experience) and offers substantial native
functionality beyond viewing links:

1. System Share Extension: users save content to Wangdou directly from
   Safari or any app via the iOS share sheet — the core workflow of the app,
   impossible in a web browsing experience. (Please try: open any page in
   Safari → Share → Wangdou.)

2. AI summarization: every saved link is automatically summarized and tagged
   by our AI pipeline, shown natively in the feed (marked with a sparkle icon).

3. A social community: users follow each other, like, comment on, and
   re-save ("repost") each other's bookmarks. Content in the feed is created
   and curated by our user community — not aggregated by us.

4. Native reading workflow: read-later queue, star/favorite, mark-as-read,
   full editing of bookmarks (title, note, tags, visibility) — all added in
   build 3, visible under the "我的" (Me) tab filters and bookmark detail page.

5. Native platform integration: Sign in with Apple, haptic feedback
   throughout, clipboard link detection, home-screen quick actions via the
   share sheet, and a fully native tab dock UI.

6. Trust & safety: in-app reporting of content, user blocking, and in-app
   account deletion.

To experience these features, please log in with the demo account provided
in App Review Information and try: (a) the share-sheet save flow from Safari,
(b) tapping the "+" button in the bottom dock, (c) the filters on the Me tab.

We built Wangdou natively from the ground up specifically to provide an
experience a website cannot. We hope you will reconsider, and we are happy
to provide a demo video or any additional information.

Thank you!
```

## 同时做的产品动作（build 3 内容）

- 我的页：全部 / 稍后读 / 星标 筛选
- 详情页（自己的收藏）：星标、标为已读、编辑（标题/推荐语/标签/公开性）
- 保存页：剪贴板链接检测提示

## 若再次被拒的升级路径

1. 回复中附上功能演示视频链接（录屏 30 秒：分享面板收藏 → AI 摘要出现 → 点赞评论转存）
2. 申诉到 App Review Board：https://developer.apple.com/contact/app-store/?topic=appeal
3. 终极加码：iOS 主屏小组件（最新收藏/随机回顾），原生功能的最强信号
```
