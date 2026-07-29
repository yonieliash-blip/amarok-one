import AsyncStorage from "@react-native-async-storage/async-storage";

export interface WorkDayRecord {
  userId: string;
  startedAt: string;
  endedAt?: string;
}

function workDayKey(userId: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `@amarok/work-day:${userId}:${day}`;
}

export async function loadWorkDay(userId: string): Promise<WorkDayRecord | null> {
  const raw = await AsyncStorage.getItem(workDayKey(userId));
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as WorkDayRecord;
}

export async function startWorkDay(userId: string): Promise<WorkDayRecord> {
  const record: WorkDayRecord = { userId, startedAt: new Date().toISOString() };
  await AsyncStorage.setItem(workDayKey(userId), JSON.stringify(record));
  return record;
}

export async function endWorkDay(userId: string): Promise<WorkDayRecord | null> {
  const existing = await loadWorkDay(userId);
  if (!existing || existing.endedAt) {
    return existing;
  }
  const record: WorkDayRecord = { ...existing, endedAt: new Date().toISOString() };
  await AsyncStorage.setItem(workDayKey(userId), JSON.stringify(record));
  return record;
}

export interface VisitPhoto {
  id: string;
  uri: string;
  createdAt: string;
}

export interface LocalTimelineEntry {
  id: string;
  type: "note" | "photo" | "work_day";
  label: string;
  occurredAt: string;
}

function photosKey(visitId: string): string {
  return `@amarok/visit-photos:${visitId}`;
}

function timelineKey(visitId: string): string {
  return `@amarok/visit-timeline:${visitId}`;
}

export async function loadVisitPhotos(visitId: string): Promise<VisitPhoto[]> {
  const raw = await AsyncStorage.getItem(photosKey(visitId));
  if (!raw) {
    return [];
  }
  return JSON.parse(raw) as VisitPhoto[];
}

export async function addVisitPhoto(visitId: string, uri: string): Promise<VisitPhoto[]> {
  const photos = await loadVisitPhotos(visitId);
  const entry: VisitPhoto = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    uri,
    createdAt: new Date().toISOString(),
  };
  const next = [...photos, entry];
  await AsyncStorage.setItem(photosKey(visitId), JSON.stringify(next));
  await appendLocalTimeline(visitId, {
    id: entry.id,
    type: "photo",
    label: "Photo added",
    occurredAt: entry.createdAt,
  });
  return next;
}

export async function loadLocalTimeline(visitId: string): Promise<LocalTimelineEntry[]> {
  const raw = await AsyncStorage.getItem(timelineKey(visitId));
  if (!raw) {
    return [];
  }
  return JSON.parse(raw) as LocalTimelineEntry[];
}

export async function appendLocalTimeline(
  visitId: string,
  entry: LocalTimelineEntry,
): Promise<void> {
  const existing = await loadLocalTimeline(visitId);
  const next = [...existing, entry];
  await AsyncStorage.setItem(timelineKey(visitId), JSON.stringify(next));
}

export function newLocalEntryId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
}
