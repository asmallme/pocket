import { Pressable } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export default function TabLayout() {
  const colors = useTheme();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        headerTintColor: colors.foreground,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.background },
        // 顶部右侧「+」：应用内收藏入口（系统分享面板之外的补充路径）
        headerRight: () => (
          <Pressable
            onPress={() => router.push("/save")}
            hitSlop={8}
            style={{ paddingHorizontal: Spacing.lg }}
          >
            <SymbolView
              name="plus.circle.fill"
              tintColor={colors.foreground}
              size={24}
            />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "首页",
          tabBarIcon: ({ color }) => (
            <SymbolView name="house.fill" tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: "我的",
          tabBarIcon: ({ color }) => (
            <SymbolView name="person.fill" tintColor={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
