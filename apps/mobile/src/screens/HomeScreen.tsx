import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ServiceCall } from "@amarok-one/types";
import { useAuth } from "../auth/AuthContext";
import { listMyServiceCalls } from "../api/service-calls";
import { isApiRequestError } from "../api/client";
import { Button, ScreenSubtitle, ScreenTitle } from "../components/ui";
import {
  endWorkDay,
  loadWorkDay,
  startWorkDay,
  type WorkDayRecord,
} from "../storage/technician-storage";
import { colors, spacing } from "../theme";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const { user, accessToken, logout } = useAuth();
  const [workDay, setWorkDay] = useState<WorkDayRecord | null>(null);
  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadAssignments(): Promise<void> {
      if (!user || !accessToken) return;

      setError(null);

      try {
        const [day, list] = await Promise.all([
          loadWorkDay(user.id),
          listMyServiceCalls(user.organization.id, accessToken),
        ]);
        if (cancelled) return;
        setWorkDay(day);
        setCalls(list.filter((call) => call.lifecycleState !== "closed"));
      } catch (err) {
        if (cancelled) return;
        setError(isApiRequestError(err) ? err.message : "Unable to load assignments");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadAssignments();
    return () => {
      cancelled = true;
    };
  }, [user, accessToken, reloadToken]);

  const workDayActive = Boolean(workDay?.startedAt && !workDay.endedAt);

  async function handleStartWorkDay(): Promise<void> {
    if (!user) return;
    const record = await startWorkDay(user.id);
    setWorkDay(record);
  }

  async function handleEndWorkDay(): Promise<void> {
    if (!user) return;
    const record = await endWorkDay(user.id);
    setWorkDay(record);
  }

  function handleRefresh(): void {
    setRefreshing(true);
    setReloadToken((value) => value + 1);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ScreenTitle>Hello, {user?.displayName ?? "Technician"}</ScreenTitle>
        <ScreenSubtitle>{user?.organization.name}</ScreenSubtitle>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Work day</Text>
        {workDayActive ? (
          <>
            <Text style={styles.cardBody}>
              Started {new Date(workDay!.startedAt).toLocaleTimeString()}
            </Text>
            <Button label="Current task" onPress={() => navigation.navigate("CurrentTask")} />
            <Button
              label="End work day"
              variant="secondary"
              onPress={() => void handleEndWorkDay()}
            />
          </>
        ) : (
          <>
            <Text style={styles.cardBody}>Start your shift to begin field visits.</Text>
            <Button label="Start work day" onPress={() => void handleStartWorkDay()} />
          </>
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <>
          <Text style={styles.sectionTitle}>Assigned service calls</Text>
          <FlatList
            data={calls}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>No active assignments.</Text>}
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                disabled={!workDayActive}
                onPress={() =>
                  navigation.navigate("Visit", {
                    serviceCallId: item.id,
                    title: item.title,
                  })
                }
              >
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowMeta}>{item.serviceCallNumber}</Text>
                {!workDayActive ? (
                  <Text style={styles.rowHint}>Start work day to open visits</Text>
                ) : null}
              </Pressable>
            )}
          />
        </>
      )}

      <Button label="Sign out" variant="secondary" onPress={() => void logout()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg, gap: spacing.md },
  header: { gap: spacing.xs },
  card: {
    backgroundColor: colors.bgPanel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: { color: colors.text, fontWeight: "700", fontSize: 16 },
  cardBody: { color: colors.textMuted },
  sectionTitle: { color: colors.text, fontWeight: "600", fontSize: 16 },
  list: { gap: spacing.sm, paddingBottom: spacing.lg },
  row: {
    backgroundColor: colors.bgPanel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  rowTitle: { color: colors.text, fontWeight: "600", fontSize: 16 },
  rowMeta: { color: colors.textMuted, fontSize: 13 },
  rowHint: { color: colors.warning, fontSize: 12, marginTop: 4 },
  empty: { color: colors.textMuted, textAlign: "center", paddingVertical: spacing.lg },
  error: { color: colors.error },
  loader: { marginVertical: spacing.lg },
});
