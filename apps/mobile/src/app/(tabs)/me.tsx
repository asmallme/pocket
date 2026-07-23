import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import type { Profile } from "@pocket/shared";
import { R, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { FeedList } from "@/components/feed-list";
import { ProfileHeader } from "@/components/profile-header";
import { ScreenHeader } from "@/components/screen-header";
import { PressableScale } from "@/components/pressable-scale";

const FILTERS = [
  { key: "all", label: "全部" },
  { key: "unread", label: "稍后读" },
  { key: "starred", label: "星标" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default function MeScreen() {
  const colors = useTheme();
  const { session, ready } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  const loadProfile = useCallback(async () => {
    if (!session) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();
    setProfile(data as Profile | null);
  }, [session]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  // 从设置页返回时刷新资料
  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  if (!ready) return <View style={{ flex: 1 }} />;

  if (!session) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader title="我的" />
        <View style={styles.center}>
          <View style={[styles.emptyBadge, { backgroundColor: colors.accent }]}>
            <SymbolView
              name="bookmark"
              tintColor={colors.accentStrong}
              size={26}
            />
          </View>
          <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>
            登录后管理你的收藏
          </Text>
          <Link href="/login" asChild>
            <PressableScale
              haptic
              style={[styles.loginButton, { backgroundColor: colors.primary }]}
            >
              <Text
                style={{
                  color: colors.primaryForeground,
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                登录 / 注册
              </Text>
            </PressableScale>
          </Link>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        title="我的"
        right={
          <Link href="/settings" asChild>
            <PressableScale
              scaleTo={0.88}
              hitSlop={8}
              style={[styles.gearButton, { backgroundColor: colors.muted }]}
            >
              <SymbolView
                name="gearshape"
                tintColor={colors.mutedForeground}
                size={18}
              />
            </PressableScale>
          </Link>
        }
      />
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <PressableScale
              key={f.key}
              scaleTo={0.94}
              onPress={() => setFilter(f.key)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? colors.primary : colors.muted,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: active ? "600" : "500",
                  color: active
                    ? colors.primaryForeground
                    : colors.mutedForeground,
                }}
              >
                {f.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      <FeedList
        key={filter}
        scope="user"
        userId={session.user.id}
        includePrivate
        unreadOnly={filter === "unread"}
        starredOnly={filter === "starred"}
        dockSpace
        tabName="me"
        header={
          filter === "all" && profile ? (
            <ProfileHeader profile={profile} />
          ) : undefined
        }
        emptyText={
          filter === "unread"
            ? "没有待读的收藏，全部读完了"
            : filter === "starred"
              ? "还没有星标收藏，在详情页点亮 ★"
              : "你还没有收藏，去收藏第一条内容吧"
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
    padding: Spacing.xl,
  },
  emptyBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  loginButton: {
    height: 50,
    minWidth: 220,
    borderRadius: R.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  gearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm - 1,
    borderRadius: 999,
  },
});
