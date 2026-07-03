/** 将标签名转为 URL 安全的 slug（支持中文）。 */
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
