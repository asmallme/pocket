import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SerifFont, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

interface Props {
  title: string;
  /** 标题右侧的小注（如 slogan），衬线气质 */
  caption?: string;
  right?: ReactNode;
}

/** Tab 页的品牌页头：宋体大字标 + 右侧操作位，替代默认导航条 */
export function ScreenHeader({ title, caption, right }: Props) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {title}
        </Text>
        {caption ? (
          <Text style={[styles.caption, { color: colors.mutedForeground }]}>
            {caption}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg + Spacing.xs,
    paddingBottom: Spacing.sm + 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.md,
    flex: 1,
  },
  title: {
    fontFamily: SerifFont,
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: 1,
  },
  caption: {
    fontFamily: SerifFont,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingBottom: 4,
  },
});
