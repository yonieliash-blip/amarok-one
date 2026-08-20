import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import {
  endBreak,
  endWorkDay,
  getCurrentWorkDay,
  startBreak,
  startWorkDay,
  type WorkDay,
} from "../api/attendance";
import { Button, Card, Eyebrow, ScreenSubtitle, ScreenTitle, StatusPill } from "../components/ui";
import { captureClockLocation } from "../location/clock-location";
import {
  enableBackgroundShiftTracking,
  isBackgroundShiftTrackingActive,
  stopBackgroundShiftTracking,
} from "../location/background-shift-location";
import {
  flushTrackedLocations,
  startForegroundShiftTracking,
} from "../location/shift-location-tracking";
import { colors, spacing } from "../theme";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

function priorityTone(priority: ServiceCall["priority"]): "neutral" | "warning" | "danger" {
  if (priority === "urgent") return "danger";
  if (priority === "high") return "warning";
  return "neutral";
}

export function HomeScreen({ navigation }: Props) {
  const { user, accessToken, logout } = useAuth();
  const [workDay, setWorkDay] = useState<WorkDay | null>(null);
  const [clocking, setClocking] = useState(false);
  const [gpsTracking, setGpsTracking] = useState(false);
  const [backgroundGpsTracking, setBackgroundGpsTracking] = useState(false);
  const [backgroundGpsBusy, setBackgroundGpsBusy] = useState(false);
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
          getCurrentWorkDay(user.organization.id, accessToken),
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

  const workDayStartedAt = workDay?.startedAt ?? null;
  const workDayActive = Boolean(workDayStartedAt && !workDay?.endedAt);

  useEffect(() => {
    if (!workDayActive || !workDayStartedAt || !user || !accessToken) return;
    let disposed = false;
    let subscription: Awaited<ReturnType<typeof startForegroundShiftTracking>> = null;
    void startForegroundShiftTracking(user.organization.id, accessToken, workDayStartedAt).then(
      (result) => {
        if (disposed) result?.remove();
        else {
          subscription = result;
          setGpsTracking(Boolean(result));
        }
      },
    );
    return () => {
      disposed = true;
      subscription?.remove();
      setGpsTracking(false);
    };
  }, [accessToken, user, workDayActive, workDayStartedAt]);

  useEffect(() => {
    if (workDayActive) {
      void isBackgroundShiftTrackingActive()
        .then(setBackgroundGpsTracking)
        .catch(() => setBackgroundGpsTracking(false));
      return;
    }
    void stopBackgroundShiftTracking()
      .catch(() => undefined)
      .finally(() => setBackgroundGpsTracking(false));
  }, [workDayActive]);

  async function handleStartWorkDay(): Promise<void> {
    if (!user || !accessToken) return;
    await runClockAction((location) => startWorkDay(user.organization.id, accessToken, location));
  }

  async function handleEndWorkDay(): Promise<void> {
    if (!user || !accessToken) return;
    await flushTrackedLocations(user.organization.id, accessToken, workDay?.startedAt).catch(
      () => undefined,
    );
    const result = await runClockAction((location) =>
      endWorkDay(user.organization.id, accessToken, location),
    );
    if (result?.endedAt) {
      await stopBackgroundShiftTracking().catch(() => undefined);
      setBackgroundGpsTracking(false);
    }
  }

  async function runClockAction(
    action: (location: Awaited<ReturnType<typeof captureClockLocation>>) => Promise<WorkDay>,
  ): Promise<WorkDay | null> {
    setClocking(true);
    setError(null);
    try {
      const result = await action(await captureClockLocation());
      setWorkDay(result);
      return result;
    } catch (err) {
      setError(isApiRequestError(err) ? err.message : "Unable to update work day");
      return null;
    } finally {
      setClocking(false);
    }
  }

  function handleEnableBackgroundGps(): void {
    Alert.alert(
      "Background shift location",
      "While your work day is active, AMAROK ONE will record periodic locations even when the app is in the background. Tracking stops when you end the work day or sign out.",
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Allow",
          onPress: () => {
            setBackgroundGpsBusy(true);
            void enableBackgroundShiftTracking()
              .then((enabled) => {
                setBackgroundGpsTracking(enabled);
                if (!enabled) {
                  Alert.alert(
                    "Permission not granted",
                    "Background GPS remains off. You can enable location access later in device settings.",
                  );
                }
              })
              .catch(() => {
                setBackgroundGpsTracking(false);
                Alert.alert("Unable to enable GPS", "Please check the device location settings.");
              })
              .finally(() => setBackgroundGpsBusy(false));
          },
        },
      ],
    );
  }

  async function handleLogout(): Promise<void> {
    await stopBackgroundShiftTracking().catch(() => undefined);
    await logout();
  }

  const activeBreak = workDay?.breaks.find((entry) => entry.status === "ACTIVE");

  async function handleBreak(): Promise<void> {
    if (!user || !accessToken) return;
    await runClockAction((location) =>
      activeBreak
        ? endBreak(user.organization.id, accessToken, location)
        : startBreak(user.organization.id, accessToken, location),
    );
  }

  function handleRefresh(): void {
    setRefreshing(true);
    setReloadToken((value) => value + 1);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Eyebrow>Field operations</Eyebrow>
        <ScreenTitle>Hello, {user?.displayName?.split(" ")[0] ?? "Technician"}</ScreenTitle>
        <ScreenSubtitle>{`${user?.organization.name} · Today's field overview`}</ScreenSubtitle>
      </View>

      <Card accent={workDayActive}>
        <View style={styles.cardHeading}>
          <View>
            <Text style={styles.cardLabel}>WORK DAY</Text>
            <Text style={styles.cardTitle}>
              {workDayActive ? "Shift in progress" : "Ready to start"}
            </Text>
          </View>
          <StatusPill
            label={workDayActive ? "Active" : "Not started"}
            tone={workDayActive ? "success" : "neutral"}
          />
        </View>
        {workDayActive ? (
          <>
            <View style={styles.shiftFacts}>
              <View style={styles.fact}>
                <Text style={styles.factLabel}>STARTED</Text>
                <Text style={styles.factValue}>
                  {new Date(workDay!.startedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <View style={styles.fact}>
                <Text style={styles.factLabel}>GPS</Text>
                <Text style={styles.factValue}>
                  {backgroundGpsTracking ? "Background" : gpsTracking ? "Foreground" : "Off"}
                </Text>
              </View>
            </View>
            <StatusPill
              label={
                backgroundGpsTracking
                  ? "Location tracking protected"
                  : gpsTracking
                    ? "GPS active while app is open"
                    : "GPS tracking unavailable"
              }
              tone={backgroundGpsTracking || gpsTracking ? "success" : "warning"}
            />
            {!backgroundGpsTracking ? (
              <Button
                label={backgroundGpsBusy ? "Enabling background GPS…" : "Enable background GPS"}
                variant="secondary"
                disabled={backgroundGpsBusy}
                onPress={handleEnableBackgroundGps}
              />
            ) : null}
            <Button label="Current task" onPress={() => navigation.navigate("CurrentTask")} />
            <Button
              label={activeBreak ? "End break" : "Start break"}
              variant="secondary"
              disabled={clocking}
              onPress={() => void handleBreak()}
            />
            <Button
              label="End work day"
              variant="secondary"
              disabled={clocking}
              onPress={() => void handleEndWorkDay()}
            />
          </>
        ) : (
          <>
            <Text style={styles.cardBody}>
              Clock in before opening service calls. Your start time and optional location will be
              recorded.
            </Text>
            <Button
              label="Start work day"
              disabled={clocking}
              onPress={() => void handleStartWorkDay()}
            />
          </>
        )}
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <>
          <View style={styles.sectionHeading}>
            <View>
              <Eyebrow>Work queue</Eyebrow>
              <Text style={styles.sectionTitle}>Assigned service calls</Text>
            </View>
            <Text style={styles.count}>{calls.length}</Text>
          </View>
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
                <View style={styles.rowTop}>
                  <Text style={styles.rowNumber}>{item.serviceCallNumber}</Text>
                  <StatusPill label={item.priority} tone={priorityTone(item.priority)} />
                </View>
                <Text style={styles.rowTitle}>{item.title}</Text>
                {item.customer ? <Text style={styles.rowMeta}>{item.customer.name}</Text> : null}
                {item.equipment ? (
                  <Text style={styles.rowMeta}>
                    {item.equipment.name}
                    {item.equipment.internalNumber ? ` · ${item.equipment.internalNumber}` : ""}
                  </Text>
                ) : null}
                {!workDayActive ? (
                  <Text style={styles.rowHint}>Start work day to open visits</Text>
                ) : null}
              </Pressable>
            )}
          />
        </>
      )}

      <Button label="Sign out" variant="secondary" onPress={() => void handleLogout()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg, gap: spacing.lg },
  header: { gap: spacing.xs, paddingTop: spacing.xs },
  cardHeading: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  cardLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  cardTitle: { color: colors.text, fontWeight: "800", fontSize: 21, marginTop: 4 },
  cardBody: { color: colors.textMuted, lineHeight: 21 },
  shiftFacts: { flexDirection: "row", gap: spacing.sm },
  fact: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  factLabel: { color: colors.textSubtle, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  factValue: { color: colors.text, fontSize: 17, fontWeight: "800", marginTop: 4 },
  sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { color: colors.text, fontWeight: "800", fontSize: 19, marginTop: 4 },
  count: {
    color: colors.primaryOn,
    backgroundColor: colors.primary,
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    textAlign: "center",
    textAlignVertical: "center",
    fontWeight: "800",
  },
  list: { gap: spacing.md, paddingBottom: spacing.xl },
  row: {
    backgroundColor: colors.bgPanel,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowNumber: { color: colors.primary, fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  rowTitle: { color: colors.text, fontWeight: "700", fontSize: 17 },
  rowMeta: { color: colors.textMuted, fontSize: 13 },
  rowHint: { color: colors.warning, fontSize: 12, marginTop: 4 },
  empty: { color: colors.textMuted, textAlign: "center", paddingVertical: spacing.lg },
  error: { color: colors.error },
  loader: { marginVertical: spacing.lg },
});
