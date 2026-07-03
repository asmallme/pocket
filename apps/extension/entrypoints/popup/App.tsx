import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase";
import { extractFromTab, type ExtractedPage } from "@/utils/extract";
import { findExistingBookmark, flushSaveQueue } from "@/utils/save";

const WEB_URL = (import.meta.env.WXT_WEB_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
);

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [page, setPage] = useState<ExtractedPage | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [showEmailLogin, setShowEmailLogin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthChecked(true);
      if (data.session) void flushSaveQueue();
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function loadPage() {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const extracted = await extractFromTab(tab ?? {});
      setPage(extracted);
    }
    void loadPage();
  }, []);

  // 登录后检测当前页是否已收藏过
  useEffect(() => {
    if (!session || !page?.url) return;
    findExistingBookmark(page.url).then(setExistingId);
  }, [session, page?.url]);

  function handleWebLogin() {
    void browser.tabs.create({
      url: `${WEB_URL}/extension-auth?ext=${browser.runtime.id}`,
    });
    window.close();
  }

  async function handleEmailLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.get("email") as string,
      password: form.get("password") as string,
    });
    if (error) setError("登录失败：" + error.message);
  }

  async function handleSave() {
    if (!page || !session) return;
    setStatus("saving");
    setError(null);
    const { data, error } = await supabase
      .from("bookmarks")
      .insert({
        user_id: session.user.id,
        url: page.url,
        title: page.title,
        description: page.description,
        cover_image: page.image,
        content_type: "link",
        note: note.trim() || null,
        is_public: isPublic,
        source: "extension",
      })
      .select("id")
      .single();
    if (error) {
      setStatus("idle");
      setError("保存失败，请重试");
      return;
    }
    setExistingId(data.id);
    setStatus("saved");
    setTimeout(() => window.close(), 900);
  }

  if (!authChecked) return <div className="app center">加载中...</div>;

  if (!session) {
    return (
      <div className="app">
        <h1 className="logo">Pocket</h1>
        <p className="hint">登录后即可一键收藏当前页面</p>

        <button className="primary" onClick={handleWebLogin}>
          使用网页账号登录
        </button>
        <p className="hint small">
          将打开 Pocket 网站完成授权，网页已登录则一键完成
        </p>

        {showEmailLogin ? (
          <form onSubmit={handleEmailLogin} className="form">
            <input name="email" type="email" placeholder="邮箱" required />
            <input
              name="password"
              type="password"
              placeholder="密码"
              required
            />
            {error && <p className="error">{error}</p>}
            <button type="submit" className="secondary">
              邮箱密码登录
            </button>
          </form>
        ) : (
          <button className="link" onClick={() => setShowEmailLogin(true)}>
            用邮箱密码登录
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <div className="topbar">
        <h1 className="logo">Pocket</h1>
        <button className="link" onClick={() => void supabase.auth.signOut()}>
          退出
        </button>
      </div>

      {page ? (
        <div className="preview">
          {page.image && <img src={page.image} alt="" className="cover" />}
          <p className="title">{page.title}</p>
          <p className="url">{new URL(page.url).hostname}</p>
        </div>
      ) : (
        <p className="hint">当前页面无法收藏</p>
      )}

      {existingId && status !== "saved" && (
        <div className="notice">
          已收藏过这个页面
          <button
            className="link"
            onClick={() =>
              void browser.tabs.create({ url: `${WEB_URL}/b/${existingId}` })
            }
          >
            查看
          </button>
        </div>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="写一句推荐语（可选）"
        rows={3}
      />

      <label className="toggle">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
        />
        公开这条收藏
      </label>

      {error && <p className="error">{error}</p>}

      <button
        className="primary"
        onClick={handleSave}
        disabled={!page || status !== "idle"}
      >
        {status === "saving"
          ? "保存中..."
          : status === "saved"
            ? "已收藏 ✓"
            : existingId
              ? "再收藏一次"
              : "收藏此页面"}
      </button>
    </div>
  );
}
