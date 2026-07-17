import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

type Mode = "login" | "signup";

export default function LoginScreen() {
  const router = useRouter();
  const colors = useTheme();
  const scheme = useColorScheme();
  const { signInWithProvider, signInWithApple } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  // Apple 登录不可用时渲染官方按钮会抛错（如未登录 Apple ID 的模拟器）
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  function done() {
    router.dismissTo("/");
  }

  async function run(kind: string, fn: () => Promise<void>) {
    setPending(kind);
    try {
      await fn();
      done();
    } catch (e) {
      Alert.alert("登录失败", e instanceof Error ? e.message : "请稍后重试");
    } finally {
      setPending(null);
    }
  }

  async function handleEmailSubmit() {
    if (mode === "signup" && !/^[a-zA-Z0-9_]{2,20}$/.test(username)) {
      Alert.alert("用户名格式不对", "只能包含字母、数字和下划线，长度 2-20");
      return;
    }
    await run("email", async () => {
      const { error } =
        mode === "login"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              options: { data: { username } },
            });
      if (error) throw error;
    });
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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.logo, { color: colors.foreground }]}>网兜</Text>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          收藏你在全网看到的好内容
        </Text>

        {/* 指南 4.8：有第三方登录必须同时提供 Apple 登录 */}
        {appleAvailable && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={
              scheme === "dark"
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={Radius}
            style={styles.appleButton}
            onPress={() => run("apple", signInWithApple)}
          />
        )}

        {(["google", "github"] as const).map((provider) => (
          <Pressable
            key={provider}
            style={[
              styles.button,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            disabled={pending !== null}
            onPress={() => run(provider, () => signInWithProvider(provider))}
          >
            {pending === provider ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text style={[styles.buttonText, { color: colors.foreground }]}>
                使用 {provider === "google" ? "Google" : "GitHub"} 登录
              </Text>
            )}
          </Pressable>
        ))}

        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>
            或使用邮箱
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {mode === "signup" && (
          <TextInput
            style={inputStyle}
            placeholder="用户名（字母、数字或下划线）"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
          />
        )}
        <TextInput
          style={inputStyle}
          placeholder="邮箱"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={inputStyle}
          placeholder={mode === "signup" ? "密码（至少 6 位）" : "密码"}
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable
          style={[styles.button, { backgroundColor: colors.primary }]}
          disabled={pending !== null || !email || password.length < 6}
          onPress={handleEmailSubmit}
        >
          {pending === "email" ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text
              style={[styles.buttonText, { color: colors.primaryForeground }]}
            >
              {mode === "login" ? "登录" : "注册"}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => setMode(mode === "login" ? "signup" : "login")}
        >
          <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
            {mode === "login" ? "没有账号？注册一个" : "已有账号？直接登录"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  logo: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginTop: Spacing.xl,
  },
  hint: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  appleButton: {
    height: 48,
    width: "100%",
  },
  input: {
    height: 48,
    borderRadius: Radius,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  button: {
    height: 48,
    borderRadius: Radius,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginVertical: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 12,
  },
  switchText: {
    fontSize: 14,
    textAlign: "center",
    padding: Spacing.md,
  },
});
