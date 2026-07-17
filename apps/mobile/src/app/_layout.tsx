import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useShareIntent } from "expo-share-intent";
import { SymbolView } from "expo-symbols";
import { useTheme } from "@/hooks/use-theme";
import { AuthProvider } from "@/lib/auth-context";
import { PressableScale } from "@/components/pressable-scale";

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
        pathname: "/save",
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

/** 模态弹层左上角的关闭按钮：不依赖“下滑关闭”手势的显式出口 */
function ModalClose() {
  const router = useRouter();
  const colors = useTheme();
  return (
    <PressableScale
      scaleTo={0.88}
      hitSlop={8}
      onPress={() => router.back()}
      accessibilityLabel="关闭"
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.muted,
      }}
    >
      <SymbolView
        name="xmark"
        tintColor={colors.mutedForeground}
        size={13}
        weight="semibold"
      />
    </PressableScale>
  );
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
          // 回退按钮只显示箭头，不显示上一级标题（tab 名会造成误导）
          headerBackButtonDisplayMode: "minimal",
          // 整屏任意位置右滑即可返回，不必够到左边缘
          fullScreenGestureEnabled: true,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="login"
          options={{
            title: "登录",
            presentation: "modal",
            headerLeft: () => <ModalClose />,
          }}
        />
        <Stack.Screen
          name="save"
          options={{
            title: "收藏链接",
            presentation: "modal",
            headerLeft: () => <ModalClose />,
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
