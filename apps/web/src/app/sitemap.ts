import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const [{ data: bookmarks }, { data: profiles }] = await Promise.all([
    supabase
      .from("bookmarks")
      .select("id, created_at")
      .eq("is_public", true)
      .is("removed_at", null)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("profiles")
      .select("username, created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  return [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    ...(bookmarks ?? []).map((b) => ({
      url: `${SITE_URL}/b/${b.id}`,
      lastModified: b.created_at,
      priority: 0.8,
    })),
    ...(profiles ?? []).map((p) => ({
      url: `${SITE_URL}/u/${p.username}`,
      lastModified: p.created_at,
      priority: 0.5,
    })),
  ];
}
