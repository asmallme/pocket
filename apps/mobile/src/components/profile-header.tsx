import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import type { Profile } from "@pocket/shared";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

export function ProfileHeader({ profile }: { profile: Profile }) {
  const colors = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const viewerId = session?.user.id ?? null;
  const isSelf = viewerId === profile.id;

  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [following, setFollowing] = useState(false);
  const [pending, setPending] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [followers, followings, mine, blockRow] = await Promise.all([
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", profile.id),
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", profile.id),
        viewerId && !isSelf
          ? supabase
              .from("follows")
              .select("follower_id")
              .eq("follower_id", viewerId)
              .eq("following_id", profile.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        viewerId && !isSelf
          ? supabase
              .from("blocks")
              .select("blocked_id")
              .eq("blocker_id", viewerId)
              .eq("blocked_id", profile.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      setFollowerCount(followers.count ?? 0);
      setFollowingCount(followings.count ?? 0);
      setFollowing(!!mine.data);
      setBlocked(!!blockRow.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile.id, viewerId, isSelf]);

  async function toggleFollow() {
    if (!viewerId) {
      router.push("/login");
      return;
    }
    if (pending) return;
    setPending(true);
    const next = !following;
    setFollowing(next);
    setFollowerCount((c) => (c ?? 0) + (next ? 1 : -1));
    const { error } = next
      ? await supabase
          .from("follows")
          .insert({ follower_id: viewerId, following_id: profile.id })
      : await supabase
          .from("follows")
          .delete()
          .eq("follower_id", viewerId)
          .eq("following_id", profile.id);
    if (error) {
      setFollowing(!next);
      setFollowerCount((c) => (c ?? 0) + (next ? -1 : 1));
    }
    setPending(false);
  }

  function toggleBlock() {
    if (!viewerId) {
      router.push("/login");
      return;
    }
    if (blocked) {
      void (async () => {
        const { error } = await supabase
          .from("blocks")
          .delete()
          .eq("blocker_id", viewerId)
          .eq("blocked_id", profile.id);
        if (!error) setBlocked(false);
      })();
      return;
    }
    Alert.alert(
      "拉黑该用户",
      "拉黑后，TA 的收藏将不再出现在你的信息流中。",
      [
        { text: "取消", style: "cancel" },
        {
          text: "拉黑",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("blocks")
              .insert({ blocker_id: viewerId, blocked_id: profile.id });
            if (!error) setBlocked(true);
          },
        },
      ]
    );
  }

  const name = profile.display_name ?? profile.username;

  return (
    <View style={styles.container}>
      {profile.avatar_url ? (
        <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
          <Text style={{ color: colors.mutedForeground, fontSize: 22 }}>
            {name.slice(0, 1).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.name, { color: colors.foreground }]}>{name}</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
          @{profile.username}
        </Text>
        {profile.bio ? (
          <Text
            style={{ color: colors.foreground, fontSize: 13, marginTop: 2 }}
          >
            {profile.bio}
          </Text>
        ) : null}
        {!profile.quiet_mode && followerCount !== null ? (
          <Text
            style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 2 }}
          >
            {followerCount} 粉丝 · {followingCount} 关注
          </Text>
        ) : null}
      </View>
      {!isSelf ? (
        <View style={{ alignItems: "flex-end", gap: Spacing.sm }}>
        <Pressable
          style={[
            styles.followButton,
            following
              ? {
                  backgroundColor: colors.card,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.border,
                }
              : { backgroundColor: colors.primary },
          ]}
          onPress={toggleFollow}
        >
          <Text
            style={{
              color: following ? colors.mutedForeground : colors.primaryForeground,
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            {following ? "已关注" : "关注"}
          </Text>
        </Pressable>
        <Pressable onPress={toggleBlock} hitSlop={8}>
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
            {blocked ? "取消拉黑" : "拉黑"}
          </Text>
        </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.lg,
    alignItems: "flex-start",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
  },
  followButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius,
  },
});
