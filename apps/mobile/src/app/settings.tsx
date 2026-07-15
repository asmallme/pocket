import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

export default function SettingsScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { session, signOut } = useAuth();
  const userId = session?.user.id ?? null;

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [quietMode, setQuietMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) {
      router.replace("/login");
      return;
    }
    void supabase
      .from("profiles")
      .select("display_name, bio, quiet_mode")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name ?? "");
          setBio(data.bio ?? "");
          setQuietMode(data.quiet_mode ?? false);
        }
        setLoading(false);
      });
  }, [userId, router]);

  async function save() {
    if (!userId || saving) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        quiet_mode: quietMode,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      Alert.alert("保存失败", error.message);
    } else {
      router.back();
    }
  }

  async function handleSignOut() {
    await signOut();
    router.dismissTo("/");
  }

  function deleteAccount() {
    Alert.alert(
      "注销账号",
      "将永久删除你的账号和全部收藏、评论、点赞数据，不可恢复。确定继续吗？",
      [
        { text: "取消", style: "cancel" },
        {
          text: "永久删除",
          style: "destructive",
          onPress: () => {
            Alert.alert("最后确认", "真的要删除账号吗？此操作无法撤销。", [
              { text: "取消", style: "cancel" },
              {
                text: "删除",
                style: "destructive",
                onPress: async () => {
                  const { error } = await supabase.rpc("delete_account");
                  if (error) {
                    Alert.alert("注销失败", error.message);
                    return;
                  }
                  await signOut();
                  router.dismissTo("/");
                },
              },
            ]);
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "设置" }} />
        <ActivityIndicator />
      </View>
    );
  }

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.card,
      borderColor: colors.border,
      color: colors.foreground,
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: "设置" }} />

      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        昵称
      </Text>
      <TextInput
        style={inputStyle}
        placeholder="展示名称"
        placeholderTextColor={colors.mutedForeground}
        value={displayName}
        onChangeText={setDisplayName}
        maxLength={30}
      />

      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        简介
      </Text>
      <TextInput
        style={[...inputStyle, styles.bioInput]}
        placeholder="一句话介绍自己"
        placeholderTextColor={colors.mutedForeground}
        value={bio}
        onChangeText={setBio}
        maxLength={200}
        multiline
      />

      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.foreground, fontSize: 15 }}>
            安静模式
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
            隐藏关注/粉丝等社交数字
          </Text>
        </View>
        <Switch value={quietMode} onValueChange={setQuietMode} />
      </View>

      <Pressable
        style={[styles.button, { backgroundColor: colors.primary }]}
        disabled={saving}
        onPress={save}
      >
        {saving ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text
            style={{
              color: colors.primaryForeground,
              fontSize: 16,
              fontWeight: "600",
            }}
          >
            保存
          </Text>
        )}
      </Pressable>

      <Pressable
        style={[
          styles.button,
          {
            backgroundColor: colors.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
          },
        ]}
        onPress={handleSignOut}
      >
        <Text style={{ color: colors.foreground, fontSize: 16 }}>
          退出登录
        </Text>
      </Pressable>

      <Pressable style={styles.dangerLink} onPress={deleteAccount}>
        <Text style={{ color: colors.destructive, fontSize: 14 }}>
          注销账号（永久删除所有数据）
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  label: {
    fontSize: 13,
    marginTop: Spacing.sm,
  },
  input: {
    height: 48,
    borderRadius: Radius,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    fontSize: 15,
  },
  bioInput: {
    height: 80,
    paddingTop: Spacing.md,
    textAlignVertical: "top",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  button: {
    height: 50,
    borderRadius: Radius,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  dangerLink: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    marginTop: Spacing.xl,
  },
});
