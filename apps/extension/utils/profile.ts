import { supabase } from "./supabase";

export interface ExtensionProfile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export async function fetchProfile(
  userId: string
): Promise<ExtensionProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return data;
}

export function displayName(profile: ExtensionProfile): string {
  return profile.display_name ?? profile.username;
}

export function avatarInitial(profile: ExtensionProfile): string {
  return displayName(profile).slice(0, 1).toUpperCase();
}
