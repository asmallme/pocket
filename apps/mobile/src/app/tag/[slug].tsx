import { t } from "@/i18n";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { R, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { FeedList } from "@/components/feed-list";
import { PressableScale } from "@/components/pressable-scale";

export default function TagScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const viewerId = session?.user.id ?? null;

  const [tagId, setTagId] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: tag } = await supabase
        .from("tags")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled || !tag) return;
      setTagId(tag.id);
      if (!viewerId) return;
      const { data: sub } = await supabase
        .from("tag_subscriptions")
        .select("tag_id")
        .eq("user_id", viewerId)
        .eq("tag_id", tag.id)
        .maybeSingle();
      if (!cancelled) setSubscribed(!!sub);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, viewerId]);

  async function toggleSubscribe() {
    if (!viewerId) {
      router.push("/login");
      return;
    }
    if (!tagId || pending) return;
    setPending(true);
    const next = !subscribed;
    setSubscribed(next);
    const { error } = next
      ? await supabase
          .from("tag_subscriptions")
          .insert({ user_id: viewerId, tag_id: tagId })
      : await supabase
          .from("tag_subscriptions")
          .delete()
          .eq("user_id", viewerId)
          .eq("tag_id", tagId);
    if (error) setSubscribed(!next);
    setPending(false);
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: `#${slug}`,
          headerRight: () =>
            tagId ? (
              <PressableScale
                haptic
                onPress={toggleSubscribe}
                style={[
                  styles.subscribeButton,
                  subscribed
                    ? {
                        backgroundColor: colors.card,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: colors.border,
                      }
                    : { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: subscribed
                      ? colors.mutedForeground
                      : colors.primaryForeground,
                  }}
                >
                  {subscribed ? t.tag.subscribed : t.tag.subscribe}
                </Text>
              </PressableScale>
            ) : null,
        }}
      />
      <FeedList scope="tag" tagSlug={slug} emptyText={t.tag.empty} />
    </View>
  );
}

const styles = StyleSheet.create({
  subscribeButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm - 1,
    borderRadius: R.md,
  },
});
