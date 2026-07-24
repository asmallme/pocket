import { t } from "@/i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import type { Profile } from "@pocket/shared";
import { R, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { FeedList } from "@/components/feed-list";
import { ProfileHeader } from "@/components/profile-header";
import { ScreenHeader } from "@/components/screen-header";
import { PressableScale } from "@/components/pressable-scale";

const FILTERS = [
  { key: "all", label: t.me.filterAll },
  { key: "unread", label: t.me.filterUnread },
  { key: "starred", label: t.me.filterStarred },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

/** 随便看看：未读随机 / 重温两周前旧文（与 web /my serendipity 同规则） */
async function pickRandomBookmark(
  userId: string,
  mode: "unread" | "revisit"
): Promise<string | null> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);

  let countQuery = supabase
    .from("bookmarks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  countQuery =
    mode === "unread"
      ? countQuery.is("read_at", null)
      : countQuery.not("read_at", "is", null).lt("created_at", cutoff.toISOString());
  const { count } = await countQuery;
  if (!count) return null;

  const offset = Math.floor(Math.random() * count);
  let dataQuery = supabase.from("bookmarks").select("id").eq("user_id", userId);
  dataQuery =
    mode === "unread"
      ? dataQuery.is("read_at", null)
      : dataQuery.not("read_at", "is", null).lt("created_at", cutoff.toISOString());
  const { data } = await dataQuery.range(offset, offset).maybeSingle();
  return data?.id ?? null;
}

export default function MeScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { session, ready } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 300ms 防抖，避免每敲一个字都打一次接口
  function onSearchChange(v: string) {
    setSearchInput(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(v), 300);
  }

  function serendipity() {
    if (!session) return;
    Alert.alert(t.serendipity.title, undefined, [
      {
        text: t.serendipity.unread,
        onPress: async () => {
          const id = await pickRandomBookmark(session.user.id, "unread");
          if (id) router.push(`/b/${id}`);
          else Alert.alert(t.serendipity.empty);
        },
      },
      {
        text: t.serendipity.revisit,
        onPress: async () => {
          const id = await pickRandomBookmark(session.user.id, "revisit");
          if (id) router.push(`/b/${id}`);
          else Alert.alert(t.serendipity.empty);
        },
      },
      { text: t.common.cancel, style: "cancel" },
    ]);
  }

  const loadProfile = useCallback(async () => {
    if (!session) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();
    setProfile(data as Profile | null);
  }, [session]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  // 从设置页返回时刷新资料
  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  if (!ready) return <View style={{ flex: 1 }} />;

  if (!session) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader title={t.me.title} />
        <View style={styles.center}>
          <View style={[styles.emptyBadge, { backgroundColor: colors.accent }]}>
            <SymbolView
              name="bookmark"
              tintColor={colors.accentStrong}
              size={26}
            />
          </View>
          <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>
            {t.me.loginHint}
          </Text>
          <Link href="/login" asChild>
            <PressableScale
              haptic
              style={[styles.loginButton, { backgroundColor: colors.primary }]}
            >
              <Text
                style={{
                  color: colors.primaryForeground,
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                {t.me.loginButton}
              </Text>
            </PressableScale>
          </Link>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        title={t.me.title}
        right={
          <>
            <PressableScale
              scaleTo={0.88}
              hitSlop={8}
              haptic
              onPress={serendipity}
              accessibilityLabel={t.serendipity.title}
              style={[styles.gearButton, { backgroundColor: colors.muted }]}
            >
              <SymbolView
                name="die.face.5"
                tintColor={colors.mutedForeground}
                size={18}
              />
            </PressableScale>
            <Link href="/settings" asChild>
              <PressableScale
                scaleTo={0.88}
                hitSlop={8}
                style={[styles.gearButton, { backgroundColor: colors.muted }]}
              >
                <SymbolView
                  name="gearshape"
                  tintColor={colors.mutedForeground}
                  size={18}
                />
              </PressableScale>
            </Link>
          </>
        }
      />
      <View style={[styles.searchBox, { backgroundColor: colors.muted }]}>
        <SymbolView
          name="magnifyingglass"
          tintColor={colors.mutedForeground}
          size={15}
        />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder={t.me.searchPlaceholder}
          placeholderTextColor={colors.mutedForeground}
          value={searchInput}
          onChangeText={onSearchChange}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <PressableScale
              key={f.key}
              scaleTo={0.94}
              onPress={() => setFilter(f.key)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? colors.primary : colors.muted,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: active ? "600" : "500",
                  color: active
                    ? colors.primaryForeground
                    : colors.mutedForeground,
                }}
              >
                {f.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      <FeedList
        key={`${filter}:${search}`}
        scope="user"
        userId={session.user.id}
        includePrivate
        unreadOnly={filter === "unread"}
        starredOnly={filter === "starred"}
        search={search || undefined}
        dockSpace
        tabName="me"
        header={
          filter === "all" && !search && profile ? (
            <ProfileHeader profile={profile} />
          ) : undefined
        }
        emptyText={
          search
            ? t.me.emptySearch
            : filter === "unread"
              ? t.me.emptyUnread
              : filter === "starred"
                ? t.me.emptyStarred
                : t.me.emptyAll
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
    padding: Spacing.xl,
  },
  emptyBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  loginButton: {
    height: 50,
    minWidth: 220,
    borderRadius: R.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  gearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 38,
    borderRadius: R.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: "100%",
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm - 1,
    borderRadius: 999,
  },
});
