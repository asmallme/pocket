import { t } from "@/i18n";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import type { Profile } from "@pocket/shared";
import { R, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { PressableScale } from "@/components/pressable-scale";

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
      t.profile.blockConfirmTitle,      t.profile.blockConfirmBody,
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.profile.blockAction,
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

  function showMoreActions() {
    Alert.alert(name, undefined, [
      {
        text: blocked ? t.profile.unblock : t.profile.block,
        style: blocked ? "default" : "destructive",
        onPress: toggleBlock,
      },
      { text: t.common.cancel, style: "cancel" },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
            <Text style={{ color: colors.mutedForeground, fontSize: 26 }}>
              {name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {name}
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            @{profile.username}
          </Text>
        </View>
        {!isSelf ? (
          <View style={styles.actionsRow}>
            <PressableScale
              haptic
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
                  color: following
                    ? colors.mutedForeground
                    : colors.primaryForeground,
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                {following ? t.profile.following : t.profile.follow}
              </Text>
            </PressableScale>
            {/* 低频操作收进「···」菜单，不裸露在页面上 */}
            <PressableScale
              scaleTo={0.88}
              hitSlop={8}
              onPress={showMoreActions}
              accessibilityLabel={t.profile.more}
              style={[styles.moreButton, { backgroundColor: colors.muted }]}
            >
              <SymbolView
                name="ellipsis"
                tintColor={colors.mutedForeground}
                size={16}
              />
            </PressableScale>
          </View>
        ) : null}
      </View>
      {profile.bio ? (
        <Text style={[styles.bio, { color: colors.foreground }]}>
          {profile.bio}
        </Text>
      ) : null}
      {!profile.quiet_mode && followerCount !== null ? (
        <View style={styles.statsRow}>
          <PressableScale
            scaleTo={0.95}
            hitSlop={6}
            onPress={() =>
              router.push(`/u/${profile.username}/connections?tab=followers`)
            }
          >
            <Text style={[styles.statNum, { color: colors.foreground }]}>
              {followerCount}
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                {" "}{t.profile.followers}
              </Text>
            </Text>
          </PressableScale>
          <PressableScale
            scaleTo={0.95}
            hitSlop={6}
            onPress={() =>
              router.push(`/u/${profile.username}/connections?tab=following`)
            }
          >
            <Text style={[styles.statNum, { color: colors.foreground }]}>
              {followingCount}
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                {" "}{t.profile.followingCount}
              </Text>
            </Text>
          </PressableScale>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm + 2,
    paddingHorizontal: Spacing.xs,
    paddingBottom: Spacing.md,
  },
  topRow: {
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "center",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  bio: {
    fontSize: 14,
    lineHeight: 21,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  statNum: {
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "400",
  },
  followButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: R.md,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
