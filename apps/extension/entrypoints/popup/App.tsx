import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase";
import { extractFromTab, type ExtractedPage } from "@/utils/extract";
import { mergePageMeta, sanitizeExtracted } from "@/utils/page-meta";
import { unfurlViaWeb } from "@/utils/unfurl";
import { findExistingBookmark, flushSaveQueue, saveBookmark } from "@/utils/save";
import {
  avatarInitial,
  displayName,
  fetchProfile,
  type ExtensionProfile,
} from "@/utils/profile";

const WEB_URL = (import.meta.env.WXT_WEB_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
);

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ExtensionProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [page, setPage] = useState<ExtractedPage | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [savedId, setSavedId] = useState<string | null>(null);
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
    if (!session) {
      setProfile(null);
      return;
    }
    void fetchProfile(session.user.id).then(setProfile);
  }, [session]);

  useEffect(() => {
    async function loadPage() {
      setPageLoading(true);
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const extracted = await extractFromTab(tab ?? {});
      setPage(extracted ? sanitizeExtracted(extracted) : null);
      setPageLoading(false);
    }
    void loadPage();
  }, []);

  useEffect(() => {
    if (!session || !page?.url) return;
    findExistingBookmark(page.url).then(setExistingId);
  }, [session, page?.url]);

  // 收藏成功后轻提示，稍晚自动关闭弹窗
  useEffect(() => {
    if (status !== "saved") return;
    const timer = setTimeout(() => window.close(), 1400);
    return () => clearTimeout(timer);
  }, [status]);

  function openSettings() {
    void browser.tabs.create({ url: `${WEB_URL}/settings` });
    window.close();
  }

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
    const tags = tagInput
      .split(/[,，\s]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 5);

    // 收藏时再拉一次 unfurl 补全元数据；AI 摘要/打标由 saveBookmark 入库后在后台触发
    const unfurled = await unfurlViaWeb(page.url);
    const meta = mergePageMeta(page, unfurled);

    const result = await saveBookmark({
      url: meta.url,
      title: meta.title,
      description: meta.description,
      cover_image: meta.image,
      content_type: "link",
      note: note.trim() || null,
      is_public: isPublic,
      source: "extension",
      tags,
      content: meta.content,
    });

    if (result.status === "saved" || result.status === "duplicate") {
      setExistingId(result.id);
      setSavedId(result.id);
      setStatus("saved");
      return;
    }
    if (result.status === "queued") {
      setStatus("idle");
      setError("已暂存，联网后自动重试");
      return;
    }
    setStatus("idle");
    setError("保存失败，请重试");
  }

  if (!authChecked) return <div className="app center">加载中...</div>;

  if (!session) {
    return (
      <div className="app">
        <h1 className="logo">网兜</h1>
        <p className="hint">登录后即可一键收藏当前页面</p>

        <button className="primary" onClick={handleWebLogin}>
          使用网页账号登录
        </button>
        <p className="hint small">
          将打开网兜网站完成授权，网页已登录则一键完成
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

  const name = profile ? displayName(profile) : "…";

  return (
    <div className="app">
      {status === "saved" && (
        <div className="save-toast" role="status">
          <span className="save-toast-text">已收藏</span>
          {savedId && (
            <button
              type="button"
              className="save-toast-link"
              onClick={() =>
                void browser.tabs.create({ url: `${WEB_URL}/b/${savedId}` })
              }
            >
              查看
            </button>
          )}
        </div>
      )}

      <div className="topbar">
        <h1 className="logo">网兜</h1>
        <div className="topbar-actions">
          <button
            type="button"
            className="user-chip"
            onClick={openSettings}
            title="个人中心"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="user-avatar" />
            ) : (
              <span className="user-avatar user-avatar-fallback">
                {profile ? avatarInitial(profile) : "?"}
              </span>
            )}
            <span className="user-name">{name}</span>
          </button>
          <button
            type="button"
            className="link"
            onClick={() => void supabase.auth.signOut()}
          >
            退出
          </button>
        </div>
      </div>

      {pageLoading ? (
        <p className="hint">读取页面信息...</p>
      ) : page ? (
        <div className="preview">
          <div className="preview-body">
            {page.image ? (
              <img src={page.image} alt="" className="preview-thumb" />
            ) : (
              <div className="preview-thumb preview-thumb-fallback" />
            )}
            <div className="preview-meta">
              <p className="preview-title">{page.title}</p>
              {page.description && (
                <p className="preview-desc">{page.description}</p>
              )}
              <p className="preview-url">{new URL(page.url).hostname}</p>
            </div>
          </div>
        </div>
      ) : (
        <p className="hint">当前页面无法收藏</p>
      )}

      {existingId && status !== "saved" && (
        <div className="notice">
          已收藏过这个页面
          <button
            type="button"
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
        placeholder="写一句推荐语或金句（可选）"
        rows={3}
        disabled={status === "saved"}
      />

      <input
        type="text"
        value={tagInput}
        onChange={(e) => setTagInput(e.target.value)}
        placeholder="标签，逗号分隔（可选）"
        disabled={status === "saved"}
        className="tag-input"
      />

      <label className="toggle">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          disabled={status === "saved"}
        />
        公开这条收藏
      </label>

      {error && <p className="error">{error}</p>}

      <button
        className={`primary${status === "saved" ? " primary-success" : ""}`}
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
