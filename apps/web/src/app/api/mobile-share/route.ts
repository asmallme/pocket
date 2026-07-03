import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { attachTagsToBookmark } from "@/lib/tag-service";
import { generateSummary, suggestTags } from "@/lib/deepseek";
import { checkApiRateLimit, withRateLimitHeaders } from "@/lib/api-rate-limit";
import { hashMobileShareToken } from "@/lib/mobile-share-token";
import { isSafeUrl, unfurl } from "@/lib/unfurl";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

type MobileShareBody = {
  url?: unknown;
  title?: unknown;
  text?: unknown;
  note?: unknown;
  is_public?: unknown;
  tags?: unknown;
};

type MobileShareTokenRow = {
  id: string;
  user_id: string;
};

type ProfileAiPrefs = {
  ai_summary_enabled: boolean;
  ai_auto_tag_enabled: boolean;
};

type BookmarkIdRow = {
  id: string;
};

type MobileShareDatabase = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string } & ProfileAiPrefs;
        Insert: never;
        Update: Partial<ProfileAiPrefs>;
        Relationships: [];
      };
      bookmarks: {
        Row: BookmarkIdRow & {
          user_id: string;
          url: string | null;
        };
        Insert: {
          user_id: string;
          url: string | null;
          title: string | null;
          description: string | null;
          cover_image: string | null;
          content_type: "link" | "text";
          note: string | null;
          is_public: boolean;
          source: "shortcut";
        };
        Update: { ai_summary?: string | null };
        Relationships: [];
      };
      mobile_share_tokens: {
        Row: MobileShareTokenRow & {
          token_hash: string;
          last_used_at: string | null;
          revoked_at: string | null;
        };
        Insert: never;
        Update: { last_used_at?: string | null };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function extractFirstUrl(...parts: string[]) {
  const joined = parts.filter(Boolean).join("\n");
  const match = joined.match(/https?:\/\/[^\s<>"']+/i);
  if (!match) return null;
  const cleaned = match[0].replace(/[),.!?，。！？]+$/g, "");
  const url = isSafeUrl(cleaned);
  return url?.toString() ?? null;
}

function buildNote(text: string, url: string | null, explicitNote: string) {
  if (explicitNote) return explicitNote.slice(0, 5000);
  if (!text) return null;
  const withoutUrl = url ? text.replace(url, "").trim() : text;
  return (withoutUrl || text).slice(0, 5000);
}

async function enrichBookmark(
  admin: SupabaseClient<MobileShareDatabase>,
  bookmarkId: string,
  userId: string,
  input: {
    title: string | null;
    description: string | null;
    note: string | null;
    url: string | null;
  }
) {
  const { data: rawProfile } = await admin
    .from("profiles")
    .select("ai_summary_enabled, ai_auto_tag_enabled")
    .eq("id", userId)
    .single();
  const profile = rawProfile as unknown as ProfileAiPrefs | null;

  if (profile?.ai_summary_enabled !== false) {
    const summary = await generateSummary(input);
    if (summary) {
      await admin
        .from("bookmarks")
        .update({ ai_summary: summary })
        .eq("id", bookmarkId);
    }
  }

  if (profile?.ai_auto_tag_enabled !== false) {
    const tags = await suggestTags(input);
    if (tags.length > 0) {
      await attachTagsToBookmark(admin, bookmarkId, tags);
    }
  }
}

export async function POST(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer /i, "");
  if (!bearer) {
    return NextResponse.json(
      { error: "缺少分享 Token" },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "服务端未配置 SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  const admin = createAdminClient<MobileShareDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const tokenHash = hashMobileShareToken(bearer);
  const { data: rawTokenRow } = await admin
    .from("mobile_share_tokens")
    .select("id, user_id")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .maybeSingle();
  const tokenRow = rawTokenRow as unknown as MobileShareTokenRow | null;

  if (!tokenRow) {
    return NextResponse.json(
      { error: "分享 Token 无效或已撤销" },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const { blocked, result: rateLimitResult } = checkApiRateLimit(
    request,
    "mobile-share",
    tokenRow.user_id
  );
  if (blocked) {
    const headers = new Headers(CORS_HEADERS);
    blocked.headers.forEach((value, key) => headers.set(key, value));
    return new NextResponse(blocked.body, {
      status: blocked.status,
      headers,
    });
  }

  const body = (await request.json().catch(() => ({}))) as MobileShareBody;
  const rawUrl = textValue(body.url);
  const titleFromShare = textValue(body.title);
  const textFromShare = textValue(body.text);
  const explicitNote = textValue(body.note);
  const url = rawUrl
    ? (isSafeUrl(rawUrl)?.toString() ?? null)
    : extractFirstUrl(titleFromShare, textFromShare, explicitNote);

  if (!url && !textFromShare && !explicitNote) {
    return NextResponse.json(
      { error: "缺少可收藏的链接或文本" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const contentType = url ? "link" : "text";
  const meta = url
    ? await unfurl(url).catch(() => ({
        url,
        title: null,
        description: null,
        image: null,
        siteName: null,
      }))
    : null;

  const note = buildNote(textFromShare, url, explicitNote);
  const isPublic = body.is_public === true;
  const tagNames = Array.isArray(body.tags)
    ? body.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 5)
    : [];

  if (url) {
    const { data: rawExisting } = await admin
      .from("bookmarks")
      .select("id")
      .eq("user_id", tokenRow.user_id)
      .eq("url", url)
      .maybeSingle();
    const existing = rawExisting as unknown as BookmarkIdRow | null;

    if (existing) {
      await admin
        .from("mobile_share_tokens")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", tokenRow.id);

      return withRateLimitHeaders(
        NextResponse.json(
          { id: existing.id, duplicate: true },
          { headers: CORS_HEADERS }
        ),
        rateLimitResult
      );
    }
  }

  const { data: rawBookmark, error } = await admin
    .from("bookmarks")
    .insert({
      user_id: tokenRow.user_id,
      url,
      title:
        contentType === "link"
          ? titleFromShare || meta?.title || url
          : titleFromShare || null,
      description: meta?.description ?? null,
      cover_image: meta?.image ?? null,
      content_type: contentType,
      note,
      is_public: isPublic,
      source: "shortcut",
    })
    .select("id")
    .single();
  const bookmark = rawBookmark as unknown as BookmarkIdRow | null;

  if (error || !bookmark) {
    return NextResponse.json(
      { error: "保存失败" },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  if (tagNames.length > 0) {
    await attachTagsToBookmark(admin, bookmark.id, tagNames);
  }

  await admin
    .from("mobile_share_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  void enrichBookmark(admin, bookmark.id, tokenRow.user_id, {
    title:
      contentType === "link"
        ? titleFromShare || meta?.title || url
        : titleFromShare || null,
    description: meta?.description ?? null,
    note,
    url,
  });

  return withRateLimitHeaders(
    NextResponse.json(
      { id: bookmark.id, duplicate: false },
      { status: 201, headers: CORS_HEADERS }
    ),
    rateLimitResult
  );
}
