export type ContentType = "link" | "text" | "image" | "video";

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
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
  like_count: number;
  comment_count: number;
  created_at: string;
}

/** Bookmark row joined with its author profile, as returned by feed queries. */
export interface BookmarkWithAuthor extends Bookmark {
  author: Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;
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
}
