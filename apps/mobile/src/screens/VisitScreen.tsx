import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { Button, Card, ScreenSubtitle, ScreenTitle } from "../components/ui";
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

  if (loading && !lifecycle) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
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

      <Card>
        <Text style={styles.sectionLabel}>Visit</Text>
        {visit ? (
          <>
            <Text style={styles.body}>Status: {visit.status.replace(/_/g, " ")}</Text>
            <Text style={styles.body}>Sequence #{visit.sequence}</Text>
          </>
        ) : (
          <Text style={styles.body}>No visit assigned to you on this call.</Text>
        )}
      </Card>

      {call?.description ? (
        <Card>
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.body}>{call.description}</Text>
        </Card>
      ) : null}

      <Text style={styles.sectionLabel}>Technician timeline</Text>
      <VisitTimeline lifecycle={lifecycle} localTimeline={localTimeline} />

      <Text style={styles.sectionLabel}>Field note</Text>
      <TextInput
        multiline
        value={noteDraft}
        onChangeText={setNoteDraft}
        style={styles.noteInput}
        placeholder="Add notes for the service manager…"
        placeholderTextColor={colors.textMuted}
      />
      <Button
        label="Save note"
        variant="secondary"
        loading={busy}
        onPress={() => void handleAddNote()}
      />

      <Text style={styles.sectionLabel}>Photos (on device)</Text>
      <View style={styles.photoRow}>
        {photos.map((photo) => (
          <Image key={photo.id} source={{ uri: photo.uri }} style={styles.thumbnail} />
        ))}
      </View>
      <Button
        label="Add photo"
        variant="secondary"
        loading={busy}
        onPress={() => void handleAddPhoto()}
      />

      {visit && canDrive ? (
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

      {visit && canWork ? (
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

      {visit && canFinish ? (
        <>
          <Button
            label="Finish visit — return to dispatcher"
            loading={busy}
            onPress={() =>
              void runWorkflow(() =>
                finishVisit(
                  user!.organization.id,
                  serviceCallId,
                  visit.id,
                  accessToken!,
                  "dispatcher",
                ),
              ).then(() => navigation.goBack())
            }
          />
          <Button
            label="Finish visit — waiting for parts"
            variant="secondary"
            loading={busy}
            onPress={() =>
              void runWorkflow(() =>
                finishVisit(
                  user!.organization.id,
                  serviceCallId,
                  visit.id,
                  accessToken!,
                  "waiting_for_parts",
                ),
              ).then(() => navigation.goBack())
            }
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
  sectionLabel: { color: colors.text, fontWeight: "600", fontSize: 16 },
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
    borderRadius: 12,
    padding: spacing.md,
    color: colors.text,
    textAlignVertical: "top",
  },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  thumbnail: { width: 88, height: 88, borderRadius: 8, backgroundColor: colors.bgElevated },
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
