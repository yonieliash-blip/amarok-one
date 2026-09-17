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

function visitStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    assigned: "הוקצה",
    planned: "מתוכנן",
    checked_in: "הגעה אושרה",
    driving: "בנסיעה",
    working: "בעבודה באתר",
    in_progress: "העבודה מתבצעת",
    completed: "הביקור הושלם",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

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
        setError(isApiRequestError(err) ? err.message : "לא ניתן לטעון את המשימה הנוכחית");
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
      <Eyebrow>משימה פעילה</Eyebrow>
      <ScreenTitle>המשימה הנוכחית</ScreenTitle>
      <ScreenSubtitle>ביקור השטח שדורש את הטיפול שלך כעת.</ScreenSubtitle>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : task ? (
        <Card accent>
          <View style={styles.cardTop}>
            <Text style={styles.callNumber}>{task.serviceCall.serviceCallNumber}</Text>
            <StatusPill label={visitStatusLabel(task.visit.status)} tone="success" />
          </View>
          <Text style={styles.taskTitle}>{task.serviceCall.title}</Text>
          <View style={styles.details}>
            {task.serviceCall.customer ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>לקוח</Text>
                <Text style={styles.detailValue}>{task.serviceCall.customer.name}</Text>
              </View>
            ) : null}
            {task.serviceCall.equipment ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>ציוד</Text>
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
                <Text style={styles.detailLabel}>מיקום</Text>
                <Text style={styles.detailValue}>{task.serviceCall.location}</Text>
              </View>
            ) : null}
          </View>
          <Button
            label="פתיחת ביקור שטח"
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
          <StatusPill label="אין ביקור פעיל" />
          <Text style={styles.empty}>הביקור הפעיל הבא יוצג כאן אוטומטית.</Text>
        </Card>
      )}

      <Button
        label="רענון"
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
