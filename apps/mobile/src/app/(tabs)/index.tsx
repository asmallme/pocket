import { useState } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { R, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/auth-context";
import { FeedList } from "@/components/feed-list";
import { ScreenHeader } from "@/components/screen-header";
import { PressableScale } from "@/components/pressable-scale";

const TABS = [
  { key: "global", label: "全站" },
  { key: "following", label: "关注" },
  { key: "subscribed_tags", label: "订阅标签" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/** 分段切换：滑块用弹簧跟手滑动，而不是生硬地换背景色 */
function SegmentedTabs({
  value,
  onChange,
}: {
  value: TabKey;
  onChange: (key: TabKey) => void;
}) {
  const colors = useTheme();
  const [innerWidth, setInnerWidth] = useState(0);
  const index = TABS.findIndex((t) => t.key === value);
  const segmentWidth = innerWidth / TABS.length;

  const offset = useSharedValue(0);
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  function onLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width - PAD * 2;
    setInnerWidth(w);
    offset.value = (w / TABS.length) * index;
  }

  function select(key: TabKey, i: number) {
    if (key === value) return;
    void Haptics.selectionAsync();
    offset.value = withSpring(segmentWidth * i, {
      damping: 20,
      stiffness: 260,
    });
    onChange(key);
  }

  return (
    <View
      style={[styles.tabs, { backgroundColor: colors.muted }]}
      onLayout={onLayout}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          style={[
            styles.indicator,
            indicatorStyle,
            { width: segmentWidth, backgroundColor: colors.card },
          ]}
        />
      ) : null}
      {TABS.map((t, i) => (
        <PressableScale
          key={t.key}
          scaleTo={0.95}
          style={styles.tab}
          onPress={() => select(t.key, i)}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  value === t.key ? colors.foreground : colors.mutedForeground,
                fontWeight: value === t.key ? "600" : "500",
              },
            ]}
          >
            {t.label}
          </Text>
        </PressableScale>
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const { session } = useAuth();
  const [tab, setTab] = useState<TabKey>("global");

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title="网兜" caption="兜住全网的好内容" />
      {session ? <SegmentedTabs value={tab} onChange={setTab} /> : null}
      <FeedList
        key={session ? tab : "global"}
        scope={session ? tab : "global"}
        dockSpace
        tabName="index"
        emptyText={
          tab === "following"
            ? "关注一些人，这里会出现他们的收藏"
            : tab === "subscribed_tags"
              ? "订阅一些标签，这里会出现相关收藏"
              : "还没有内容"
        }
      />
    </View>
  );
}

const PAD = 3;

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
    borderRadius: R.md,
    padding: PAD,
  },
  indicator: {
    position: "absolute",
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: R.md - PAD,
    shadowColor: "#2A1B10",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm + 1,
  },
  tabText: {
    fontSize: 14,
  },
});
