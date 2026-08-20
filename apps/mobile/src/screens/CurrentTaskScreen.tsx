import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { isApiRequestError } from "../api/client";
import { getTechnicianCurrentTask } from "../api/service-calls";
import { Button, Card, Eyebrow, ScreenSubtitle, ScreenTitle, StatusPill } from "../components/ui";
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
      <Eyebrow>Live assignment</Eyebrow>
      <ScreenTitle>Current task</ScreenTitle>
      <ScreenSubtitle>The field visit that needs your attention now.</ScreenSubtitle>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : task ? (
        <Card accent>
          <View style={styles.cardTop}>
            <Text style={styles.callNumber}>{task.serviceCall.serviceCallNumber}</Text>
            <StatusPill label={task.visit.status.replace(/_/g, " ")} tone="success" />
          </View>
          <Text style={styles.taskTitle}>{task.serviceCall.title}</Text>
          <View style={styles.details}>
            {task.serviceCall.customer ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>CUSTOMER</Text>
                <Text style={styles.detailValue}>{task.serviceCall.customer.name}</Text>
              </View>
            ) : null}
            {task.serviceCall.equipment ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>EQUIPMENT</Text>
                <Text style={styles.detailValue}>
                  {task.serviceCall.equipment.name}
                  {task.serviceCall.equipment.internalNumber
                    ? ` · ${task.serviceCall.equipment.internalNumber}`
                    : ""}
                </Text>
              </View>
            ) : null}
            {task.serviceCall.location ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>LOCATION</Text>
                <Text style={styles.detailValue}>{task.serviceCall.location}</Text>
              </View>
            ) : null}
          </View>
          <Button
            label="Open field visit"
            onPress={() =>
              navigation.navigate("Visit", {
                serviceCallId: task.serviceCall.id,
                title: task.serviceCall.title,
              })
            }
          />
        </Card>
      ) : (
        <Card>
          <StatusPill label="No active visit" />
          <Text style={styles.empty}>Your next active visit will appear here automatically.</Text>
        </Card>
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
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  callNumber: { color: colors.primary, fontWeight: "800", fontSize: 13, letterSpacing: 0.6 },
  taskTitle: { color: colors.text, fontWeight: "800", fontSize: 22, lineHeight: 28 },
  details: { gap: 0, borderTopWidth: 1, borderTopColor: colors.border },
  detailRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { color: colors.textSubtle, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  detailValue: { color: colors.text, fontSize: 15, fontWeight: "600", marginTop: 4 },
  empty: { color: colors.textMuted, lineHeight: 22 },
  error: { color: colors.error },
});
