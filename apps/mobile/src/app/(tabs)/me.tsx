import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import type { Profile } from "@pocket/shared";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { FeedList } from "@/components/feed-list";
import { ProfileHeader } from "@/components/profile-header";

export default function MeScreen() {
  const colors = useTheme();
  const { session, ready } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

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
      <View style={styles.center}>
        <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>
          登录后管理你的收藏
        </Text>
        <Link href="/login" asChild>
          <Pressable
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
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {profile ? (
        <View>
          <View style={styles.settingsRow}>
            <Link href="/settings" asChild>
              <Pressable hitSlop={8} style={styles.settingsButton}>
                <SymbolView
                  name="gearshape"
                  tintColor={colors.mutedForeground}
                  size={20}
                />
              </Pressable>
            </Link>
          </View>
          <ProfileHeader profile={profile} />
        </View>
      ) : null}
      <FeedList
        scope="user"
        userId={session.user.id}
        includePrivate
        emptyText="你还没有收藏，去收藏第一条内容吧"
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
  loginButton: {
    height: 48,
    minWidth: 200,
    borderRadius: Radius,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  settingsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  settingsButton: {
    padding: Spacing.xs,
  },
});
