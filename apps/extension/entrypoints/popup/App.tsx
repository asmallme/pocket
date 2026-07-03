import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase";

interface PageInfo {
  url: string;
  title: string;
  description: string | null;
  image: string | null;
}

/** Runs inside the page to read Open Graph metadata. */
function collectPageMeta() {
  const meta = (key: string) =>
    document
      .querySelector<HTMLMetaElement>(
        `meta[property="${key}"], meta[name="${key}"]`
      )
      ?.content?.trim() || null;
  return {
    description: meta("og:description") ?? meta("description"),
    image: meta("og:image") ?? meta("twitter:image"),
    ogTitle: meta("og:title"),
  };
}

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [page, setPage] = useState<PageInfo | null>(null);
  const [note, setNote] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthChecked(true);
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
      if (!tab?.url || !/^https?:\/\//.test(tab.url)) return;

      const info: PageInfo = {
        url: tab.url,
        title: tab.title ?? tab.url,
        description: null,
        image: null,
      };

      try {
        const [result] = await browser.scripting.executeScript({
          target: { tabId: tab.id! },
          func: collectPageMeta,
        });
        const meta = result?.result as ReturnType<typeof collectPageMeta>;
        if (meta) {
          info.description = meta.description;
          info.image = meta.image;
          if (meta.ogTitle) info.title = meta.ogTitle;
        }
      } catch {
        // Restricted pages (chrome://, web store) don't allow injection.
      }
      setPage(info);
    }
    void loadPage();
  }, []);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
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
    const { error } = await supabase.from("bookmarks").insert({
      user_id: session.user.id,
      url: page.url,
      title: page.title,
      description: page.description,
      cover_image: page.image,
      content_type: "link",
      note: note.trim() || null,
      is_public: isPublic,
    });
    if (error) {
      setStatus("idle");
      setError("保存失败，请重试");
      return;
    }
    setStatus("saved");
    setTimeout(() => window.close(), 900);
  }

  if (!authChecked) return <div className="app center">加载中...</div>;

  if (!session) {
    return (
      <div className="app">
        <h1 className="logo">Pocket</h1>
        <p className="hint">登录后即可一键收藏当前页面</p>
        <form onSubmit={handleLogin} className="form">
          <input name="email" type="email" placeholder="邮箱" required />
          <input name="password" type="password" placeholder="密码" required />
          {error && <p className="error">{error}</p>}
          <button type="submit" className="primary">
            登录
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="topbar">
        <h1 className="logo">Pocket</h1>
        <button
          className="link"
          onClick={() => void supabase.auth.signOut()}
        >
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
            : "收藏此页面"}
      </button>
    </div>
  );
}
