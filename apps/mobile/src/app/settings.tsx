import { t } from "@/i18n";
import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { CardShadow, R, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/auth-context";
import { supabase, WEB_URL } from "@/lib/supabase";
import { PressableScale } from "@/components/pressable-scale";

function Section({ title, children }: { title?: string; children: ReactNode }) {
  const colors = useTheme();
  return (
    <View style={styles.section}>
      {title ? (
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          {title}
        </Text>
      ) : null}
      <View
        style={[
          styles.sectionCard,
          CardShadow,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function Row({
  icon,
  label,
  onPress,
  right,
  destructive = false,
  last = false,
}: {
  icon: SymbolViewProps["name"];
  label: string;
  onPress?: () => void;
  right?: ReactNode;
  destructive?: boolean;
  last?: boolean;
}) {
  const colors = useTheme();
  const tint = destructive ? colors.destructive : colors.foreground;
  return (
    <PressableScale
      scaleTo={0.99}
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.row,
        !last && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}>
        <SymbolView
          name={icon}
          tintColor={destructive ? colors.destructive : colors.mutedForeground}
          size={16}
        />
      </View>
      <Text style={[styles.rowLabel, { color: tint }]}>{label}</Text>
      {right ??
        (onPress ? (
          <SymbolView
            name="chevron.right"
            tintColor={colors.mutedForeground}
            size={13}
            weight="semibold"
          />
        ) : null)}
    </PressableScale>
  );
}

export default function SettingsScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { session, signOut } = useAuth();
  const userId = session?.user.id ?? null;

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [quietMode, setQuietMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!userId) {
      router.replace("/login");
      return;
    }
    void supabase
      .from("profiles")
      .select("display_name, bio, quiet_mode")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name ?? "");
          setBio(data.bio ?? "");
          setQuietMode(data.quiet_mode ?? false);
        }
        setLoading(false);
      });
  }, [userId, router]);

  async function saveProfile(next?: { quiet_mode?: boolean }) {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        quiet_mode: next?.quiet_mode ?? quietMode,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      Alert.alert(t.settings.saveFailed, error.message);
    } else {
      setDirty(false);
    }
  }

  function openWebPage(path: string) {
    void WebBrowser.openBrowserAsync(`${WEB_URL}${path}`);
  }

  async function handleSignOut() {
    await signOut();
    router.dismissTo("/");
  }

  function deleteAccount() {
    Alert.alert(t.settings.deleteTitle, t.settings.deleteBody,
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.settings.deleteConfirm,
          style: "destructive",
          onPress: () => {
            Alert.alert(t.settings.deleteFinalTitle, t.settings.deleteFinalBody, [
              { text: t.common.cancel, style: "cancel" },
              {
                text: t.common.delete,
                style: "destructive",
                onPress: async () => {
                  const { error } = await supabase.rpc("delete_account");
                  if (error) {
                    Alert.alert(t.settings.deleteFailed, error.message);
                    return;
                  }
                  await signOut();
                  router.dismissTo("/");
                },
              },
            ]);
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: t.settings.title }} />
        <ActivityIndicator />
      </View>
    );
  }

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.muted, color: colors.foreground },
  ];
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: t.settings.title }} />

      <Section title={t.settings.sectionProfile}>
        <View style={styles.formArea}>
          <TextInput
            style={inputStyle}
            placeholder={t.settings.displayName}
            placeholderTextColor={colors.mutedForeground}
            value={displayName}
            onChangeText={(v) => {
              setDisplayName(v);
              setDirty(true);
            }}
            maxLength={30}
          />
          <TextInput
            style={[...inputStyle, styles.bioInput]}
            placeholder={t.settings.bio}
            placeholderTextColor={colors.mutedForeground}
            value={bio}
            onChangeText={(v) => {
              setBio(v);
              setDirty(true);
            }}
            maxLength={200}
            multiline
          />
          {dirty ? (
            <PressableScale
              haptic
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              disabled={saving}
              onPress={() => void saveProfile()}
            >
              {saving ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text
                  style={{
                    color: colors.primaryForeground,
                    fontSize: 15,
                    fontWeight: "600",
                  }}
                >
                  {t.settings.saveProfile}
                </Text>
              )}
            </PressableScale>
          ) : null}
        </View>
      </Section>

      <Section title={t.settings.sectionPrefs}>
        <Row
          icon="moon"
          label={t.settings.quietMode}
          last
          right={
            <Switch
              value={quietMode}
              onValueChange={(v) => {
                setQuietMode(v);
                void saveProfile({ quiet_mode: v });
              }}
            />
          }
        />
      </Section>

      <Section title={t.settings.sectionAbout}>
        <Row
          icon="doc.text"
          label={t.settings.terms}
          onPress={() => openWebPage("/terms")}
        />
        <Row
          icon="hand.raised"
          label={t.settings.privacy}
          onPress={() => openWebPage("/privacy")}
        />
        <Row
          icon="info.circle"
          label={t.settings.about}
          onPress={() => openWebPage("/about")}
        />
        <Row
          icon="number"
          label={t.settings.version}
          last
          right={
            <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
              {version}
            </Text>
          }
        />
      </Section>

      <Section title={t.settings.sectionAccount}>
        <Row
          icon="rectangle.portrait.and.arrow.right"
          label={t.settings.signOut}
          onPress={() => void handleSignOut()}
        />
        <Row
          icon="trash"
          label={t.settings.deleteTitle}
          destructive
          last
          onPress={deleteAccount}
        />
      </Section>

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        {t.settings.footer}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: Spacing.xs,
  },
  sectionCard: {
    borderRadius: R.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  formArea: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  input: {
    height: 46,
    borderRadius: R.sm,
    paddingHorizontal: Spacing.lg,
    fontSize: 15,
  },
  bioInput: {
    height: 76,
    paddingTop: Spacing.md,
    textAlignVertical: "top",
  },
  saveButton: {
    height: 44,
    borderRadius: R.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
  },
  footer: {
    textAlign: "center",
    fontSize: 12,
    marginTop: Spacing.sm,
  },
});
