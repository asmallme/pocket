import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import type { Profile } from "@pocket/shared";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/lib/supabase";
import { FeedList } from "@/components/feed-list";
import { ProfileHeader } from "@/components/profile-header";

export default function UserScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const colors = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data as Profile | null);
        setLoading(false);
      });
  }, [username]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: `@${username}` }} />
        <ActivityIndicator />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "用户" }} />
        <Text style={{ color: colors.mutedForeground }}>用户不存在</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{ title: profile.display_name ?? profile.username }}
      />
      <ProfileHeader profile={profile} />
      <FeedList
        scope="user"
        userId={profile.id}
        emptyText="TA 还没有公开的收藏"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
});
