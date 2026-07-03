export type ContentType = "link" | "text" | "image" | "video";

export type BookmarkSource =
  | "web"
  | "extension"
  | "contextmenu"
  | "shortcut"
  | "pwa-share";

export interface Tag {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
}

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  quiet_mode: boolean;
  ai_summary_enabled: boolean;
  ai_auto_tag_enabled: boolean;
  created_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  url: string | null;
  title: string | null;
  description: string | null;
  cover_image: string | null;
  content_type: ContentType;
  note: string | null;
  is_public: boolean;
  source: BookmarkSource;
  like_count: number;
  comment_count: number;
  removed_at: string | null;
  read_at: string | null;
  ai_summary: string | null;
  is_starred: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  bookmark_id: string;
  reporter_id: string;
  reason: string;
  status: "pending" | "resolved" | "dismissed";
  created_at: string;
}

/** Bookmark row joined with its author profile, as returned by feed queries. */
export interface BookmarkWithAuthor extends Bookmark {
  author: Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;
  tags?: Tag[];
}

export interface Comment {
  id: string;
  bookmark_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;
}

export interface UnfurlResult {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

export interface CreateBookmarkInput {
  url?: string | null;
  title?: string | null;
  description?: string | null;
  cover_image?: string | null;
  content_type: ContentType;
  note?: string | null;
  is_public: boolean;
  source?: BookmarkSource;
  tag_names?: string[];
}

export interface AiEnrichResult {
  summary: string | null;
  tags: string[];
}
