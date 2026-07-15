import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useTheme } from "@/hooks/use-theme";

export default function TabLayout() {
  const colors = useTheme();

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
        name="save"
        options={{
          title: "收藏",
          tabBarIcon: ({ color }) => (
            <SymbolView name="plus.circle.fill" tintColor={color} size={24} />
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
