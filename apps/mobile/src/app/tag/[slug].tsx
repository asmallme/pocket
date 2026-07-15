import { useLocalSearchParams, Stack } from "expo-router";
import { View } from "react-native";
import { FeedList } from "@/components/feed-list";

export default function TagScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: `#${slug}` }} />
      <FeedList scope="tag" tagSlug={slug} emptyText="这个标签下还没有收藏" />
    </View>
  );
}
