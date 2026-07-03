/**
 * 端到端冒烟测试：直接用 supabase-js 模拟两个用户完成
 * 注册 → 收藏 → 点赞 → 评论 → 关注 → feed 查询 的完整闭环。
 * 用法：node scripts/e2e-check.mjs
 */
import { createClient } from "../apps/web/node_modules/@supabase/supabase-js/dist/index.mjs";

const URL = "http://127.0.0.1:54321";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const suffix = Date.now().toString(36);
let failures = 0;

function check(name, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  -- " + extra : ""}`);
  if (!ok) failures++;
}

function newClient() {
  return createClient(URL, ANON, { auth: { persistSession: false } });
}

// --- 用户 A 注册 ---
const alice = newClient();
const { data: aliceAuth, error: e1 } = await alice.auth.signUp({
  email: `alice_${suffix}@test.com`,
  password: "password123",
  options: { data: { username: `alice_${suffix}` } },
});
check("用户A注册并获得session", !!aliceAuth?.session, e1?.message);

// profile 由触发器自动创建
const { data: aliceProfile } = await alice
  .from("profiles")
  .select("*")
  .eq("id", aliceAuth.user.id)
  .single();
check("触发器自动创建 profile", aliceProfile?.username === `alice_${suffix}`);

// --- 用户 B 注册 ---
const bob = newClient();
const { data: bobAuth, error: e2 } = await bob.auth.signUp({
  email: `bob_${suffix}@test.com`,
  password: "password123",
  options: { data: { username: `bob_${suffix}` } },
});
check("用户B注册", !!bobAuth?.session, e2?.message);

// --- A 创建公开收藏 ---
const { data: pubBookmark, error: e3 } = await alice
  .from("bookmarks")
  .insert({
    user_id: aliceAuth.user.id,
    url: "https://example.com/article",
    title: "一篇好文章",
    content_type: "link",
    note: "强烈推荐",
    is_public: true,
  })
  .select()
  .single();
check("A 创建公开收藏", !!pubBookmark, e3?.message);

// --- A 创建私密收藏 ---
const { data: privBookmark } = await alice
  .from("bookmarks")
  .insert({
    user_id: aliceAuth.user.id,
    content_type: "text",
    note: "这是私密笔记",
    is_public: false,
  })
  .select()
  .single();
check("A 创建私密收藏", !!privBookmark);

// --- RLS：B 看不到 A 的私密收藏 ---
const { data: bView } = await bob
  .from("bookmarks")
  .select("id")
  .eq("id", privBookmark.id);
check("RLS: B 看不到 A 的私密收藏", (bView ?? []).length === 0);

// --- RLS：匿名用户能看到公开收藏 ---
const anon = newClient();
const { data: anonView } = await anon
  .from("bookmarks")
  .select("id")
  .eq("id", pubBookmark.id);
check("RLS: 匿名可见公开收藏", (anonView ?? []).length === 1);

// --- RLS: B 不能替 A 发收藏 ---
const { error: forgeErr } = await bob.from("bookmarks").insert({
  user_id: aliceAuth.user.id,
  content_type: "text",
  note: "伪造",
  is_public: true,
});
check("RLS: 不能伪造他人收藏", !!forgeErr);

// --- B 点赞 A 的公开收藏 ---
const { error: likeErr } = await bob
  .from("likes")
  .insert({ bookmark_id: pubBookmark.id, user_id: bobAuth.user.id });
check("B 点赞", !likeErr, likeErr?.message);

// --- B 评论 ---
const { error: cmtErr } = await bob.from("comments").insert({
  bookmark_id: pubBookmark.id,
  user_id: bobAuth.user.id,
  content: "写得真好！",
});
check("B 评论", !cmtErr, cmtErr?.message);

// --- 计数触发器 ---
const { data: counted } = await anon
  .from("bookmarks")
  .select("like_count, comment_count")
  .eq("id", pubBookmark.id)
  .single();
check(
  "计数触发器更新 like/comment_count",
  counted?.like_count === 1 && counted?.comment_count === 1,
  JSON.stringify(counted)
);

// --- B 关注 A ---
const { error: followErr } = await bob
  .from("follows")
  .insert({ follower_id: bobAuth.user.id, following_id: aliceAuth.user.id });
check("B 关注 A", !followErr, followErr?.message);

// --- B 的关注 feed 能看到 A 的公开收藏（但看不到私密） ---
const { data: bobFollows } = await bob
  .from("follows")
  .select("following_id")
  .eq("follower_id", bobAuth.user.id);
const followingIds = bobFollows.map((f) => f.following_id);
const { data: feedRows } = await bob
  .from("bookmarks")
  .select("id, is_public")
  .in("user_id", followingIds)
  .eq("is_public", true);
check(
  "关注 feed 只含公开收藏",
  feedRows.length === 1 && feedRows[0].id === pubBookmark.id
);

// --- Next.js API: /api/feed ---
const feedRes = await fetch("http://localhost:3000/api/feed");
const feedJson = await feedRes.json();
check(
  "GET /api/feed 返回公开收藏",
  feedRes.ok && feedJson.items?.some((b) => b.id === pubBookmark.id),
  `status=${feedRes.status} items=${feedJson.items?.length}`
);
check(
  "feed 附带作者信息",
  feedJson.items?.[0]?.author?.username != null
);

// --- Next.js API: /api/unfurl 需要登录 ---
const unfurlAnon = await fetch("http://localhost:3000/api/unfurl", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: "https://example.com" }),
});
check("未登录调用 /api/unfurl 返回 401", unfurlAnon.status === 401);

// --- /api/unfurl 带 bearer token 抓取 OG ---
const unfurlAuth = await fetch("http://localhost:3000/api/unfurl", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${aliceAuth.session.access_token}`,
  },
  body: JSON.stringify({ url: "https://github.com" }),
});
const unfurlJson = await unfurlAuth.json().catch(() => ({}));
check(
  "带 token 调用 /api/unfurl 抓取标题",
  unfurlAuth.ok && !!unfurlJson.title,
  `status=${unfurlAuth.status} title=${JSON.stringify(unfurlJson.title)}`
);

// --- SSRF 防护 ---
const ssrf = await fetch("http://localhost:3000/api/unfurl", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${aliceAuth.session.access_token}`,
  },
  body: JSON.stringify({ url: "http://127.0.0.1:54321/health" }),
});
check("unfurl 拒绝内网地址", ssrf.status === 422);

// --- 页面渲染 ---
for (const path of ["/", "/login", `/b/${pubBookmark.id}`, `/u/alice_${suffix}`]) {
  const res = await fetch(`http://localhost:3000${path}`);
  const html = await res.text();
  check(`页面 ${path} 渲染 200`, res.ok && html.includes("<html"), `status=${res.status}`);
}

// --- 详情页包含评论内容 ---
const detailHtml = await (
  await fetch(`http://localhost:3000/b/${pubBookmark.id}`)
).text();
check("详情页包含收藏与评论内容", detailHtml.includes("一篇好文章") && detailHtml.includes("写得真好"));

console.log(failures === 0 ? "\n全部通过 ✓" : `\n${failures} 项失败 ✗`);
process.exit(failures === 0 ? 0 : 1);
