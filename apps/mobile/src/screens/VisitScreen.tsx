import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { ServiceCall, ServiceCallLifecycleView } from "@amarok-one/types";
import { useAuth } from "../auth/AuthContext";
import { isApiRequestError } from "../api/client";
import {
  finishVisit,
  getServiceCall,
  getServiceCallLifecycle,
  patchServiceCallNotes,
  startVisitDriving,
  startVisitWorking,
} from "../api/service-calls";
import { Button, Card, Eyebrow, ScreenSubtitle, ScreenTitle, StatusPill } from "../components/ui";
import { mergeTimeline } from "../lib/timeline";
import { selectTechnicianActiveVisit } from "../lib/visit-selection";
import {
  addVisitPhoto,
  appendLocalTimeline,
  loadLocalTimeline,
  loadVisitPhotos,
  newLocalEntryId,
  type LocalTimelineEntry,
  type VisitPhoto,
} from "../storage/technician-storage";
import { colors, spacing } from "../theme";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Visit">;

function visitStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    assigned: "Assigned",
    planned: "Planned",
    checked_in: "Checked in",
    driving: "Driving",
    working: "Working on site",
    in_progress: "Work in progress",
    completed: "Visit completed",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

function visitStatusTone(status: string): "neutral" | "success" | "warning" {
  if (status === "working" || status === "in_progress") return "success";
  if (status === "driving") return "warning";
  return "neutral";
}

export function VisitScreen({ route, navigation }: Props) {
  const { serviceCallId, title } = route.params;
  const { user, accessToken } = useAuth();
  const [call, setCall] = useState<ServiceCall | null>(null);
  const [lifecycle, setLifecycle] = useState<ServiceCallLifecycleView | null>(null);
  const [photos, setPhotos] = useState<VisitPhoto[]>([]);
  const [localTimeline, setLocalTimeline] = useState<LocalTimelineEntry[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const visit =
    user && lifecycle
      ? (selectTechnicianActiveVisit(lifecycle.visits, user.id) ??
        lifecycle.visits.find((v) => v.technicianId === user.id))
      : undefined;

  useEffect(() => {
    let cancelled = false;

    async function loadVisit(): Promise<void> {
      if (!user || !accessToken) return;

      setError(null);

      try {
        const [detail, life] = await Promise.all([
          getServiceCall(user.organization.id, serviceCallId, accessToken),
          getServiceCallLifecycle(user.organization.id, serviceCallId, accessToken),
        ]);
        if (cancelled) return;
        setCall(detail);
        setLifecycle(life);
        setNoteDraft(detail.notes ?? "");
        const activeVisit = selectTechnicianActiveVisit(life.visits, user.id);
        if (activeVisit) {
          const [storedPhotos, storedTimeline] = await Promise.all([
            loadVisitPhotos(activeVisit.id),
            loadLocalTimeline(activeVisit.id),
          ]);
          if (cancelled) return;
          setPhotos(storedPhotos);
          setLocalTimeline(storedTimeline);
        } else {
          setPhotos([]);
          setLocalTimeline([]);
        }
      } catch (err) {
        if (cancelled) return;
        setError(isApiRequestError(err) ? err.message : "Unable to load visit");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadVisit();
    return () => {
      cancelled = true;
    };
  }, [user, accessToken, serviceCallId, reloadToken]);

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  async function runWorkflow(action: () => Promise<ServiceCallLifecycleView>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const next = await action();
      setLifecycle(next);
      setReloadToken((value) => value + 1);
    } catch (err) {
      setError(isApiRequestError(err) ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddNote(): Promise<void> {
    if (!user || !accessToken || !visit) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await patchServiceCallNotes(
        user.organization.id,
        serviceCallId,
        accessToken,
        noteDraft.trim(),
      );
      setCall(updated);
      await appendLocalTimeline(visit.id, {
        id: newLocalEntryId("note"),
        type: "note",
        label: "Field note updated",
        occurredAt: new Date().toISOString(),
      });
      setReloadToken((value) => value + 1);
    } catch (err) {
      setError(isApiRequestError(err) ? err.message : "Could not save note");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddPhoto(): Promise<void> {
    if (!visit) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library permission is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }
    setBusy(true);
    try {
      const next = await addVisitPhoto(visit.id, result.assets[0].uri);
      setPhotos(next);
      setReloadToken((value) => value + 1);
    } finally {
      setBusy(false);
    }
  }

  const canDrive =
    visit &&
    (visit.status === "assigned" || visit.status === "planned" || visit.status === "checked_in");
  const canWork = visit && visit.status === "driving";
  const canFinish = visit && (visit.status === "working" || visit.status === "in_progress");

  function confirmFinish(destination: "dispatcher" | "waiting_for_parts"): void {
    if (!visit || !user || !accessToken) return;
    const waitingForParts = destination === "waiting_for_parts";
    Alert.alert(
      waitingForParts ? "Finish and wait for parts?" : "Finish this visit?",
      waitingForParts
        ? "The visit will end and the service call will be marked as waiting for parts."
        : "The visit will end and return to the service dispatcher for the next decision.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Finish visit",
          style: waitingForParts ? "default" : "destructive",
          onPress: () =>
            void runWorkflow(() =>
              finishVisit(user.organization.id, serviceCallId, visit.id, accessToken, destination),
            ).then(() => navigation.goBack()),
        },
      ],
    );
  }

  if (loading && !lifecycle) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Eyebrow>Service call · field visit</Eyebrow>
      <ScreenTitle>{title}</ScreenTitle>
      {call ? (
        <ScreenSubtitle>
          {call.serviceCallNumber}
          {call.location ? ` · ${call.location}` : ""}
        </ScreenSubtitle>
      ) : null}

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <Card accent={Boolean(canWork || canFinish)}>
        {visit ? (
          <>
            <View style={styles.cardHeading}>
              <View style={styles.headingCopy}>
                <Text style={styles.cardLabel}>CURRENT VISIT</Text>
                <Text style={styles.cardTitle}>{visitStatusLabel(visit.status)}</Text>
              </View>
              <StatusPill label={`Visit ${visit.sequence}`} tone={visitStatusTone(visit.status)} />
            </View>
            <Text style={styles.cardHint}>
              {canDrive
                ? "Confirm when you leave for the customer."
                : canWork
                  ? "You are on the way. Confirm when work begins on site."
                  : canFinish
                    ? "Work is active. Add notes and photos before finishing the visit."
                    : "This visit has no available field action."}
            </Text>
            {canDrive ? (
              <Button
                label="Start driving"
                loading={busy}
                onPress={() =>
                  void runWorkflow(() =>
                    startVisitDriving(user!.organization.id, serviceCallId, visit.id, accessToken!),
                  )
                }
              />
            ) : null}
            {canWork ? (
              <Button
                label="Start work on site"
                loading={busy}
                onPress={() =>
                  void runWorkflow(() =>
                    startVisitWorking(user!.organization.id, serviceCallId, visit.id, accessToken!),
                  )
                }
              />
            ) : null}
          </>
        ) : (
          <Text style={styles.body}>No visit assigned to you on this call.</Text>
        )}
      </Card>

      {call ? (
        <Card>
          <View style={styles.sectionHeader}>
            <View>
              <Eyebrow>Job details</Eyebrow>
              <Text style={styles.sectionTitle}>Customer and equipment</Text>
            </View>
            <StatusPill
              label={call.priority}
              tone={
                call.priority === "urgent"
                  ? "danger"
                  : call.priority === "high"
                    ? "warning"
                    : "neutral"
              }
            />
          </View>
          <DetailRow label="Customer" value={call.customer?.name ?? "Not provided"} />
          <DetailRow
            label="Equipment"
            value={
              call.equipment
                ? `${call.equipment.name}${call.equipment.internalNumber ? ` · ${call.equipment.internalNumber}` : ""}`
                : "Not provided"
            }
          />
          {call.location ? <DetailRow label="Location" value={call.location} /> : null}
          {call.contactName || call.contactPhone ? (
            <DetailRow
              label="Contact"
              value={[call.contactName, call.contactPhone].filter(Boolean).join(" · ")}
            />
          ) : null}
          {call.description ? (
            <View style={styles.descriptionBlock}>
              <Text style={styles.detailLabel}>SERVICE REQUEST</Text>
              <Text style={styles.description}>{call.description}</Text>
            </View>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <Eyebrow>Field report</Eyebrow>
        <Text style={styles.sectionTitle}>Work notes</Text>
        <TextInput
          multiline
          value={noteDraft}
          onChangeText={setNoteDraft}
          style={styles.noteInput}
          placeholder="Describe the fault, work performed and next action…"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Field work notes"
        />
        <Button
          label="Save work notes"
          variant="secondary"
          loading={busy}
          onPress={() => void handleAddNote()}
        />
      </Card>

      <Card>
        <View style={styles.sectionHeader}>
          <View>
            <Eyebrow>Attachments</Eyebrow>
            <Text style={styles.sectionTitle}>Visit photos</Text>
          </View>
          <Text style={styles.photoCount}>{photos.length}</Text>
        </View>
        {photos.length > 0 ? (
          <View style={styles.photoRow}>
            {photos.map((photo) => (
              <Image key={photo.id} source={{ uri: photo.uri }} style={styles.thumbnail} />
            ))}
          </View>
        ) : (
          <Text style={styles.bodyMuted}>No photos added on this device.</Text>
        )}
        <Button
          label="Add photo"
          variant="secondary"
          loading={busy}
          onPress={() => void handleAddPhoto()}
        />
      </Card>

      <Card>
        <Eyebrow>Activity</Eyebrow>
        <Text style={styles.sectionTitle}>Technician timeline</Text>
        <VisitTimeline lifecycle={lifecycle} localTimeline={localTimeline} />
      </Card>

      {visit && canFinish ? (
        <>
          <Button
            label="Finish visit — return to dispatcher"
            variant="danger"
            loading={busy}
            onPress={() => confirmFinish("dispatcher")}
          />
          <Button
            label="Finish visit — waiting for parts"
            variant="secondary"
            loading={busy}
            onPress={() => confirmFinish("waiting_for_parts")}
          />
        </>
      ) : null}

      <Text style={styles.hint}>
        Technicians finish visits only. The service manager decides assignment, parts, or closing
        the call.
      </Text>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

/** Loaded in child to avoid async in render for main timeline block */
function VisitTimeline({
  lifecycle,
  localTimeline,
}: {
  lifecycle: ServiceCallLifecycleView | null;
  localTimeline: LocalTimelineEntry[];
}) {
  const items = mergeTimeline(lifecycle?.timeline ?? [], localTimeline);

  if (items.length === 0) {
    return <Text style={styles.bodyMuted}>No timeline events yet.</Text>;
  }

  return (
    <View style={styles.timeline}>
      {items.map((item) => (
        <View key={item.id} style={styles.timelineRow}>
          <Text style={styles.timelineTime}>{new Date(item.occurredAt).toLocaleString()}</Text>
          <Text style={styles.timelineLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  cardHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headingCopy: { flex: 1, paddingRight: spacing.sm },
  cardLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  cardTitle: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: spacing.xs },
  cardHint: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: "800", marginTop: spacing.xs },
  body: { color: colors.text, lineHeight: 22 },
  bodyMuted: { color: colors.textMuted },
  error: {
    color: colors.error,
    backgroundColor: "rgba(239,68,68,0.12)",
    padding: spacing.md,
    borderRadius: 12,
  },
  noteInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
    borderRadius: 14,
    padding: spacing.md,
    color: colors.text,
    textAlignVertical: "top",
    fontSize: 15,
    lineHeight: 22,
  },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  thumbnail: { width: 88, height: 88, borderRadius: 12, backgroundColor: colors.bgElevated },
  photoCount: {
    color: colors.primaryOn,
    backgroundColor: colors.primary,
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    textAlign: "center",
    textAlignVertical: "center",
    fontWeight: "800",
  },
  detailRow: {
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  detailLabel: { color: colors.textSubtle, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  detailValue: { color: colors.text, fontSize: 15, fontWeight: "600", lineHeight: 21 },
  descriptionBlock: {
    backgroundColor: colors.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  description: { color: colors.text, fontSize: 15, lineHeight: 23 },
  timeline: { gap: spacing.sm },
  timelineRow: {
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
  },
  timelineTime: { color: colors.textMuted, fontSize: 12 },
  timelineLabel: { color: colors.text, fontSize: 14 },
  hint: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
});
