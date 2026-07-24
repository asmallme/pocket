import { t } from "@/i18n";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { Profile } from "@pocket/shared";
import { R, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/lib/supabase";
import { PressableScale } from "@/components/pressable-scale";

type Tab = "followers" | "following";
type MiniProfile = Pick<
  Profile,
  "id" | "username" | "display_name" | "avatar_url" | "bio"
>;

const PROFILE_SELECT = "id, username, display_name, avatar_url, bio";

export default function ConnectionsScreen() {
  const { username, tab: tabParam } = useLocalSearchParams<{
    username: string;
    tab?: string;
  }>();
  const colors = useTheme();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>(
    tabParam === "following" ? "following" : "followers"
  );
  const [profiles, setProfiles] = useState<MiniProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const { data: target } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      if (!target) {
        if (!cancelled) setLoading(false);
        return;
      }
      // followers：谁关注了 TA；following：TA 关注了谁
      const { data } =
        tab === "followers"
          ? await supabase
              .from("follows")
              .select(`profile:profiles!follows_follower_id_fkey(${PROFILE_SELECT})`)
              .eq("following_id", target.id)
          : await supabase
              .from("follows")
              .select(`profile:profiles!follows_following_id_fkey(${PROFILE_SELECT})`)
              .eq("follower_id", target.id);
      if (cancelled) return;
      const rows = (data ?? [])
        .map((r) => (r as unknown as { profile: MiniProfile }).profile)
        .filter(Boolean);
      setProfiles(rows);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [username, tab]);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: `@${username}` }} />

      <View style={[styles.tabs, { backgroundColor: colors.muted }]}>
        {(["followers", "following"] as const).map((k) => {
          const active = tab === k;
          return (
            <PressableScale
              key={k}
              scaleTo={0.95}
              style={[
                styles.tab,
                active && { backgroundColor: colors.card, borderRadius: R.md - 3 },
              ]}
              onPress={() => setTab(k)}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: active ? "600" : "500",
                  color: active ? colors.foreground : colors.mutedForeground,
                }}
              >
                {k === "followers"
                  ? t.connections.followers
                  : t.connections.following}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const name = item.display_name ?? item.username;
            return (
              <PressableScale
                scaleTo={0.98}
                style={styles.row}
                onPress={() => router.push(`/u/${item.username}`)}
              >
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
                ) : (
                  <View
                    style={[styles.avatar, { backgroundColor: colors.muted }]}
                  >
                    <Text
                      style={{ color: colors.mutedForeground, fontSize: 16 }}
                    >
                      {name.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1, gap: 1 }}>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                  <Text
                    style={{ color: colors.mutedForeground, fontSize: 13 }}
                    numberOfLines={1}
                  >
                    @{item.username}
                    {item.bio ? ` · ${item.bio}` : ""}
                  </Text>
                </View>
              </PressableScale>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: colors.mutedForeground }}>
                {tab === "followers"
                  ? t.connections.emptyFollowers
                  : t.connections.emptyFollowing}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    margin: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: R.md,
    padding: 3,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.md,
    flexGrow: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 2,
  },
});
