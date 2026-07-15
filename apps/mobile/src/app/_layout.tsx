import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useShareIntent } from "expo-share-intent";
import { useTheme } from "@/hooks/use-theme";
import { AuthProvider } from "@/lib/auth-context";

/** 系统分享面板进入：带着链接跳到保存页。 */
function ShareIntentHandler() {
  const router = useRouter();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  useEffect(() => {
    if (!hasShareIntent) return;
    const url = shareIntent.webUrl ?? null;
    const text = shareIntent.text ?? null;
    if (url || text) {
      router.push({
        pathname: "/(tabs)/save",
        params: {
          ...(url ? { sharedUrl: url } : {}),
          ...(!url && text ? { sharedText: text } : {}),
        },
      });
    }
    resetShareIntent();
  }, [hasShareIntent, shareIntent, resetShareIntent, router]);

  return null;
}

export default function RootLayout() {
  const colors = useTheme();

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <ShareIntentHandler />
      <Stack
        screenOptions={{
          headerTintColor: colors.foreground,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="login"
          options={{ title: "登录", presentation: "modal" }}
        />
      </Stack>
    </AuthProvider>
  );
}
