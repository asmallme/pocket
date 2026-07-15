import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/auth-context";
import { FeedList } from "@/components/feed-list";

const TABS = [
  { key: "global", label: "全站" },
  { key: "following", label: "关注" },
  { key: "subscribed_tags", label: "订阅标签" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function HomeScreen() {
  const colors = useTheme();
  const { session } = useAuth();
  const [tab, setTab] = useState<TabKey>("global");

  return (
    <View style={{ flex: 1 }}>
      {session ? (
        <View style={[styles.tabs, { backgroundColor: colors.muted }]}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                style={[
                  styles.tab,
                  active && {
                    backgroundColor: colors.card,
                    borderRadius: Radius - 2,
                  },
                ]}
                onPress={() => setTab(t.key)}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: active
                        ? colors.foreground
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <FeedList
        key={session ? tab : "global"}
        scope={session ? tab : "global"}
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

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius,
    padding: 2,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
