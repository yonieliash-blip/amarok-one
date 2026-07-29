import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { isApiRequestError } from "../api/client";
import { getServiceCallLifecycle, listMyServiceCalls } from "../api/service-calls";
import { Button, ScreenSubtitle, ScreenTitle } from "../components/ui";
import { selectTechnicianActiveVisit } from "../lib/visit-selection";
import { colors, spacing } from "../theme";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "CurrentTask">;

export function CurrentTaskScreen({ navigation }: Props) {
  const { user, accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<{ serviceCallId: string; title: string } | null>(null);
  const [visitStatus, setVisitStatus] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentTask(): Promise<void> {
      if (!user || !accessToken) return;

      setError(null);

      try {
        const calls = await listMyServiceCalls(user.organization.id, accessToken);
        const open = calls.filter((call) => call.lifecycleState !== "closed");

        for (const call of open) {
          const lifecycle = await getServiceCallLifecycle(
            user.organization.id,
            call.id,
            accessToken,
          );
          const visit = selectTechnicianActiveVisit(lifecycle.visits, user.id);
          if (visit) {
            if (cancelled) return;
            setTask({ serviceCallId: call.id, title: call.title });
            setVisitStatus(visit.status);
            return;
          }
        }
        if (cancelled) return;
        setTask(null);
        setVisitStatus(null);
      } catch (err) {
        if (cancelled) return;
        setError(isApiRequestError(err) ? err.message : "Unable to load current task");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCurrentTask();
    return () => {
      cancelled = true;
    };
  }, [user, accessToken, reloadToken]);

  return (
    <View style={styles.container}>
      <ScreenTitle>Current task</ScreenTitle>
      <ScreenSubtitle>Your active visit from assigned service calls.</ScreenSubtitle>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : task ? (
        <View style={styles.card}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          {visitStatus ? (
            <Text style={styles.meta}>Visit status: {visitStatus.replace(/_/g, " ")}</Text>
          ) : null}
          <Button
            label="Open visit"
            onPress={() =>
              navigation.navigate("Visit", {
                serviceCallId: task.serviceCallId,
                title: task.title,
              })
            }
          />
        </View>
      ) : (
        <Text style={styles.empty}>
          No active visit. Pick a service call from home when assigned.
        </Text>
      )}

      <Button
        label="Refresh"
        variant="secondary"
        onPress={() => {
          setLoading(true);
          setReloadToken((value) => value + 1);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.bgPanel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  taskTitle: { color: colors.text, fontWeight: "700", fontSize: 18 },
  meta: { color: colors.textMuted },
  empty: { color: colors.textMuted, lineHeight: 22 },
  error: { color: colors.error },
});
