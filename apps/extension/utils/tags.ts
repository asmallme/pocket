export function toTagSlug(name: string): string {
  const trimmed = name.trim().slice(0, 30);
  if (!trimmed) return "tag";
  const slug = trimmed
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u4e00-\u9fa5_-]/g, "");
  return slug || "tag";
}

export function normalizeTagName(name: string): string {
  return name.trim().slice(0, 30);
}

export async function attachTagsToBookmark(
  bookmarkId: string,
  names: string[]
): Promise<void> {
  const { supabase } = await import("./supabase");
  const unique = [
    ...new Set(names.map(normalizeTagName).filter((n) => n.length > 0)),
  ];
  for (const name of unique.slice(0, 5)) {
    const slug = toTagSlug(name);
    const { data: existing } = await supabase
      .from("tags")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    let tagId = existing?.id;
    if (!tagId) {
      const { data: created, error } = await supabase
        .from("tags")
        .insert({ name, slug })
        .select("id")
        .single();
      if (error) {
        const { data: retry } = await supabase
          .from("tags")
          .select("id")
          .eq("slug", slug)
          .single();
        tagId = retry?.id;
      } else {
        tagId = created.id;
      }
    }
    if (!tagId) continue;
    await supabase
      .from("bookmark_tags")
      .upsert({ bookmark_id: bookmarkId, tag_id: tagId });
  }
}
