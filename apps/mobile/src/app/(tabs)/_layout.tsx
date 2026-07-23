import { t } from "@/i18n";
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { R, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { PressableScale } from "@/components/pressable-scale";
import { emitTabRepress } from "@/lib/tab-repress";

const TAB_SYMBOLS: Record<
  string,
  { idle: SymbolViewProps["name"]; active: SymbolViewProps["name"] }
> = {
  index: { idle: "house", active: "house.fill" },
  me: { idle: "person", active: "person.fill" },
};

/** 从 Tabs 组件反推 tabBar 的参数类型，避免与独立安装的 bottom-tabs 类型冲突 */
type DockProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

/**
 * 悬浮玻璃 Dock：两个 tab 环抱中间的「收藏」大按钮——收藏是这个 App 的心脏，
 * 值得占据 Dock 正中。iOS 26 用液态玻璃，旧系统降级为半透明卡片。
 */
function Dock({ state, navigation }: DockProps) {
  const colors = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const glass = isLiquidGlassAvailable();

  const Shell = glass ? GlassView : View;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + Spacing.md }]}
    >
      <Shell
        style={[
          styles.dock,
          !glass && {
            backgroundColor: `${colors.card}F0`,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const symbols = TAB_SYMBOLS[route.name];
          if (!symbols) return null;
          return (
            <View key={route.key} style={styles.slotRow}>
              {/* 中间的收藏按钮插在两个 tab 之间 */}
              {index === 1 ? (
                <PressableScale
                  scaleTo={0.9}
                  haptic
                  onPress={() => router.push("/save")}
                  style={[
                    styles.saveButton,
                    { backgroundColor: colors.primary },
                  ]}
                  accessibilityLabel={t.tabs.saveAction}
                >
                  <SymbolView
                    name="plus"
                    tintColor={colors.primaryForeground}
                    size={22}
                    weight="semibold"
                  />
                </PressableScale>
              ) : null}
              <PressableScale
                scaleTo={0.9}
                onPress={() => {
                  const event = navigation.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (focused) {
                    // 重复点按当前 tab：列表滚回顶部（iOS 惯例）
                    emitTabRepress(route.name);
                  } else if (!event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
                style={[
                  styles.tabItem,
                  focused && { backgroundColor: colors.accent },
                ]}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
              >
                <SymbolView
                  name={focused ? symbols.active : symbols.idle}
                  tintColor={
                    focused ? colors.foreground : colors.mutedForeground
                  }
                  size={22}
                />
              </PressableScale>
            </View>
          );
        })}
      </Shell>
    </View>
  );
}

export default function TabLayout() {
  const colors = useTheme();

  return (
    <Tabs
      tabBar={(props) => <Dock {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.tabs.home }} />
      <Tabs.Screen name="me" options={{ title: t.tabs.me }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  dock: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 64,
    borderRadius: R.xl + 6,
    overflow: "hidden",
    shadowColor: "#2A1B10",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  tabItem: {
    width: 56,
    height: 44,
    borderRadius: R.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
