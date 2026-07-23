import { t } from "@/i18n";
import { useLocalSearchParams, Stack } from "expo-router";
import { View } from "react-native";
import { FeedList } from "@/components/feed-list";

export default function TagScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: `#${slug}` }} />
      <FeedList scope="tag" tagSlug={slug} emptyText={t.tag.empty} />
    </View>
  );
}
