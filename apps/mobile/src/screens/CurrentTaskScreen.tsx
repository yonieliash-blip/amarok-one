import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { isApiRequestError } from "../api/client";
import { getTechnicianCurrentTask } from "../api/service-calls";
import { Button, ScreenSubtitle, ScreenTitle } from "../components/ui";
import { colors, spacing } from "../theme";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "CurrentTask">;

export function CurrentTaskScreen({ navigation }: Props) {
  const { user, accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<Awaited<ReturnType<typeof getTechnicianCurrentTask>>>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentTask(): Promise<void> {
      if (!user || !accessToken) return;

      setError(null);

      try {
        const currentTask = await getTechnicianCurrentTask(user.organization.id, accessToken);
        if (cancelled) return;
        setTask(currentTask);
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
          <Text style={styles.taskTitle}>{task.serviceCall.title}</Text>
          <Text style={styles.meta}>{task.serviceCall.serviceCallNumber}</Text>
          <Text style={styles.meta}>Visit status: {task.visit.status.replace(/_/g, " ")}</Text>
          {task.serviceCall.customer ? (
            <Text style={styles.meta}>Customer: {task.serviceCall.customer.name}</Text>
          ) : null}
          {task.serviceCall.equipment ? (
            <Text style={styles.meta}>
              Equipment: {task.serviceCall.equipment.name}
              {task.serviceCall.equipment.internalNumber
                ? ` · ${task.serviceCall.equipment.internalNumber}`
                : ""}
            </Text>
          ) : null}
          {task.serviceCall.location ? (
            <Text style={styles.meta}>Location: {task.serviceCall.location}</Text>
          ) : null}
          <Button
            label="Open visit"
            onPress={() =>
              navigation.navigate("Visit", {
                serviceCallId: task.serviceCall.id,
                title: task.serviceCall.title,
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
