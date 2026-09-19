import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Equipment, OrganizationMember, ServiceCall, ServiceCallLifecycleView } from "@amarok-one/types";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { listCurrentTechnicianLocations, listCustomers, listEquipment, type CurrentTechnicianLocation } from "../api/manager";
import { assignServiceCallTechnician, createManagerServiceCall, getServiceCall, getServiceCallLifecycle, listAssignableTechnicians, listMyServiceCalls } from "../api/service-calls";
import { isApiRequestError } from "../api/client";
import { BrandWordmark, Button, Card, Eyebrow, ScreenSubtitle, ScreenTitle, StatusPill } from "../components/ui";
import type { RootStackParamList } from "../navigation/types";
import { colors, radius, spacing } from "../theme";

type HomeProps = NativeStackScreenProps<RootStackParamList, "ManagerHome">;
type CallsProps = NativeStackScreenProps<RootStackParamList, "ManagerServiceCalls">;
type NewCallProps = NativeStackScreenProps<RootStackParamList, "ManagerNewServiceCall">;
type CallProps = NativeStackScreenProps<RootStackParamList, "ManagerServiceCall">;
type CustomersProps = NativeStackScreenProps<RootStackParamList, "ManagerCustomers">;
type EquipmentProps = NativeStackScreenProps<RootStackParamList, "ManagerEquipment">;
type LocationsProps = NativeStackScreenProps<RootStackParamList, "ManagerLocations">;

function errorMessage(error: unknown, fallback: string): string {
  return isApiRequestError(error) ? error.message : fallback;
}

function lifecycleLabel(state: ServiceCall["lifecycleState"]): string {
  const labels: Record<ServiceCall["lifecycleState"], string> = {
    new: "חדשה", waiting_assignment: "ממתינה להקצאה", assigned: "הוקצתה", driving: "בנסיעה",
    working: "בעבודה", waiting_for_parts: "ממתינה לחלקים", waiting_customer: "ממתינה ללקוח",
    waiting_specialist: "ממתינה למומחה", waiting_manager_closure: "ממתינה לסגירת מנהל", closed: "סגורה",
  };
  return labels[state];
}

function time(value?: string | null): string {
  return value ? new Date(value).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" }) : "—";
}

function Page({ children }: { children: React.ReactNode }) {
  return <View style={styles.page}>{children}</View>;
}

export function ManagerHomeScreen({ navigation }: HomeProps) {
  const { user, logout } = useAuth();
  return <FlatList
    style={styles.page}
    contentContainerStyle={styles.content}
    data={[
      ["קריאות שירות", "הצגה, הקצאה ודוחות עבודה", "ManagerServiceCalls"],
      ["לקוחות", "רשימת הלקוחות הפעילים", "ManagerCustomers"],
      ["ציוד", "הצי הפעיל והצי שהוסר", "ManagerEquipment"],
      ["מיקומי טכנאים", "המיקום האחרון ביום עבודה פעיל", "ManagerLocations"],
    ] as const}
    keyExtractor={([title]) => title}
    ListHeaderComponent={<View style={styles.header}><View style={styles.brandStrip}><BrandWordmark /><View style={styles.brandAccent} /></View><Eyebrow>מרכז שליטה</Eyebrow><ScreenTitle>ניהול מהנייד</ScreenTitle><ScreenSubtitle>{user?.organization.name} · גישה מהירה לעבודה בשטח</ScreenSubtitle></View>}
    renderItem={({ item: [title, subtitle, route] }) => <Pressable style={styles.menuCard} onPress={() => navigation.navigate(route)}><Text style={styles.menuTitle}>{title}</Text><Text style={styles.menuSubtitle}>{subtitle}</Text><Text style={styles.arrow}>‹</Text></Pressable>}
    ListFooterComponent={<Button label="יציאה מהחשבון" variant="secondary" onPress={() => void logout()} />}
  />;
}

export function ManagerServiceCallsScreen({ navigation }: CallsProps) {
  const { user, accessToken } = useAuth();
  const [calls, setCalls] = useState<ServiceCall[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { if (!user || !accessToken) return; setError(null); try { setCalls(await listMyServiceCalls(user.organization.id, accessToken)); } catch (e) { setError(errorMessage(e, "לא ניתן לטעון קריאות שירות")); } finally { setLoading(false); } }, [user, accessToken]);
  // The async request updates state only after the API response arrives.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  return <Page><FlatList data={calls} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { setLoading(true); void load(); }} />} keyExtractor={(item) => item.id}
    ListHeaderComponent={<><ScreenSubtitle>כל קריאות השירות בארגון. לחיצה על קריאה מאפשרת הקצאת טכנאי וצפייה בדוחות.</ScreenSubtitle><Button label="פתיחת קריאת שירות חדשה" onPress={() => navigation.navigate("ManagerNewServiceCall")} />{error ? <Text style={styles.error}>{error}</Text> : null}</>}
    ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : <Text style={styles.empty}>אין קריאות שירות להצגה.</Text>}
    renderItem={({ item }) => <Pressable style={styles.row} onPress={() => navigation.navigate("ManagerServiceCall", { serviceCallId: item.id, title: item.serviceCallNumber })}><View style={styles.rowTop}><Text style={styles.rowNumber}>{item.serviceCallNumber}</Text><StatusPill label={lifecycleLabel(item.lifecycleState)} tone={item.lifecycleState === "closed" ? "neutral" : "warning"} /></View><Text style={styles.rowTitle}>{item.title}</Text><Text style={styles.rowMeta}>{item.customer?.name ?? "ללא לקוח"} · {item.assignedUser?.displayName ?? "לא הוקצה"}</Text></Pressable>}
  /></Page>;
}

export function ManagerNewServiceCallScreen({ navigation }: NewCallProps) {
  const { user, accessToken } = useAuth();
  const [customers, setCustomers] = useState<Awaited<ReturnType<typeof listCustomers>>>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [title, setTitle] = useState(""); const [description, setDescription] = useState("");
  const [number, setNumber] = useState("AM-");
  const [customerId, setCustomerId] = useState<string | null>(null); const [equipmentId, setEquipmentId] = useState<string | null>(null);
  const [priority, setPriority] = useState<ServiceCall["priority"]>("normal"); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!user || !accessToken) return; void Promise.all([listCustomers(user.organization.id, accessToken), listEquipment(user.organization.id, accessToken)]).then(([nextCustomers, nextEquipment]) => { setCustomers(nextCustomers); setEquipment(nextEquipment); }).catch((e: unknown) => setError(errorMessage(e, "לא ניתן לטעון לקוחות וציוד"))).finally(() => setLoading(false)); }, [user, accessToken]);
  const customerEquipment = equipment.filter((item) => item.customerId === customerId && item.status !== "retired");
  async function save(): Promise<void> { if (!user || !accessToken || !customerId || !equipmentId || title.trim().length < 2) { setError("יש למלא מספר קריאה, כותרת, לקוח וציוד."); return; } setSaving(true); setError(null); try { const created = await createManagerServiceCall(user.organization.id, accessToken, { serviceCallNumber: number.trim(), title: title.trim(), description: description.trim() || undefined, priority, customerId, equipmentId }); navigation.replace("ManagerServiceCall", { serviceCallId: created.id, title: created.serviceCallNumber }); } catch (e) { setError(errorMessage(e, "לא ניתן לפתוח את הקריאה")); } finally { setSaving(false); } }
  if (loading) return <Page><ActivityIndicator color={colors.primary} style={styles.loader} /></Page>;
  if (!customerId) return <FlatList style={styles.page} contentContainerStyle={styles.content} data={customers} keyExtractor={(customer) => customer.id}
    ListHeaderComponent={<><ScreenTitle>בחירת לקוח</ScreenTitle><ScreenSubtitle>בחר לקוח כדי לעבור מיד לציוד ששייך אליו.</ScreenSubtitle>{error ? <Text style={styles.error}>{error}</Text> : null}</>}
    ListEmptyComponent={<Text style={styles.empty}>אין לקוחות פעילים להצגה.</Text>}
    renderItem={({ item: customer }) => <Pressable onPress={() => setCustomerId(customer.id)} style={styles.row}><Text style={styles.rowTitle}>{customer.name}</Text><Text style={styles.rowMeta}>{customer.customerNumber}</Text></Pressable>}
  />;
  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
    <Button label="חזרה לבחירת לקוח" variant="secondary" onPress={() => { setCustomerId(null); setEquipmentId(null); }} />
    <ScreenTitle>פתיחת קריאה</ScreenTitle><ScreenSubtitle>לקוח: {selectedCustomer?.name ?? "—"}</ScreenSubtitle>
    <Text style={styles.fieldLabel}>ציוד של הלקוח</Text>
    {customerEquipment.length ? customerEquipment.map((item) => <Pressable key={item.id} onPress={() => setEquipmentId(item.id)} style={[styles.row, equipmentId === item.id && styles.selectedRow]}><Text style={styles.rowTitle}>{item.name}</Text><Text style={styles.rowMeta}>{item.internalNumber}</Text></Pressable>) : <Text style={styles.empty}>אין ציוד פעיל ללקוח שנבחר.</Text>}
    <Text style={styles.fieldLabel}>מספר קריאה</Text><TextInput value={number} onChangeText={setNumber} style={styles.input} autoCapitalize="characters" />
    <Text style={styles.fieldLabel}>כותרת התקלה</Text><TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="לדוגמה: תקלה הידראולית" placeholderTextColor={colors.textSubtle} />
    <Text style={styles.fieldLabel}>פירוט (אופציונלי)</Text><TextInput value={description} onChangeText={setDescription} multiline style={[styles.input, styles.textArea]} placeholderTextColor={colors.textSubtle} />
    <Text style={styles.fieldLabel}>דחיפות</Text><View style={styles.priorityRow}>{(["low", "normal", "high", "urgent"] as const).map((value) => <Pressable key={value} onPress={() => setPriority(value)} style={[styles.choice, priority === value && styles.choiceSelected]}><Text style={styles.choiceText}>{({ low: "נמוכה", normal: "רגילה", high: "גבוהה", urgent: "דחופה" })[value]}</Text></Pressable>)}</View>
    {error ? <Text style={styles.error}>{error}</Text> : null}<Button label="פתיחת קריאה" loading={saving} onPress={() => void save()} />
  </ScrollView>;
}

export function ManagerServiceCallScreen({ route, navigation }: CallProps) {
  const { user, accessToken } = useAuth(); const [call, setCall] = useState<ServiceCall | null>(null); const [lifecycle, setLifecycle] = useState<ServiceCallLifecycleView | null>(null); const [technicians, setTechnicians] = useState<OrganizationMember[]>([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { if (!user || !accessToken) return; setError(null); try { const [nextCall, nextLifecycle, people] = await Promise.all([getServiceCall(user.organization.id, route.params.serviceCallId, accessToken), getServiceCallLifecycle(user.organization.id, route.params.serviceCallId, accessToken), listAssignableTechnicians(user.organization.id, accessToken)]); setCall(nextCall); setLifecycle(nextLifecycle); setTechnicians(people); } catch (e) { setError(errorMessage(e, "לא ניתן לטעון את הקריאה")); } finally { setLoading(false); } }, [user, accessToken, route.params.serviceCallId]);
  // The async request updates state only after the API response arrives.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  async function assign(technician: OrganizationMember): Promise<void> { if (!user || !accessToken) return; setBusy(true); try { await assignServiceCallTechnician(user.organization.id, route.params.serviceCallId, technician.id, accessToken); await load(); } catch (e) { Alert.alert("לא ניתן להקצות", errorMessage(e, "נסה שוב")); } finally { setBusy(false); } }
  if (loading) return <Page><ActivityIndicator color={colors.primary} style={styles.loader} /></Page>;
  if (!call) return <Page><Text style={styles.error}>{error ?? "הקריאה לא נמצאה"}</Text></Page>;
  return <FlatList style={styles.page} contentContainerStyle={styles.content} data={lifecycle?.visits ?? []} keyExtractor={(visit) => visit.id}
    ListHeaderComponent={<><Card><View style={styles.rowTop}><Text style={styles.rowNumber}>{call.serviceCallNumber}</Text><StatusPill label={lifecycleLabel(call.lifecycleState)} tone="warning" /></View><Text style={styles.detailTitle}>{call.title}</Text><Text style={styles.detailText}>לקוח: {call.customer?.name ?? "—"}</Text><Text style={styles.detailText}>ציוד: {call.equipment?.name ?? "—"}</Text><Text style={styles.detailText}>טכנאי: {call.assignedUser?.displayName ?? "לא הוקצה"}</Text>{call.description ? <Text style={styles.detailText}>{call.description}</Text> : null}</Card><Text style={styles.sectionTitle}>הקצאת טכנאי</Text><View style={styles.chips}>{technicians.map((person) => <Button key={person.id} label={person.displayName} variant="secondary" disabled={busy} onPress={() => void assign(person)} />)}</View><Text style={styles.sectionTitle}>ביקורים ודוחות</Text>{error ? <Text style={styles.error}>{error}</Text> : null}</>}
    ListEmptyComponent={<Text style={styles.empty}>טרם נוצר ביקור לקריאה זו.</Text>}
    renderItem={({ item: visit }) => <Card><Text style={styles.rowTitle}>ביקור {visit.sequence} · {visit.technician?.displayName ?? "טרם הוקצה"}</Text><Text style={styles.rowMeta}>סטטוס: {visit.status} · עודכן: {time(visit.updatedAt)}</Text><Button label="פתיחת דוח עבודה" variant="secondary" onPress={() => navigation.navigate("WorkReport", { serviceCallId: call.id, visitId: visit.id, title: call.serviceCallNumber })} /></Card>}
  />;
}

function DirectoryScreen<T>({ title, subtitle, load, itemKey, render }: { title: string; subtitle: string; load: () => Promise<T[]>; itemKey: (item: T) => string; render: (item: T) => React.ReactNode }) {
  const [items, setItems] = useState<T[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => { setError(null); try { setItems(await load()); } catch (e) { setError(errorMessage(e, "לא ניתן לטעון נתונים")); } finally { setLoading(false); } }, [load]);
  // The async request updates state only after the API response arrives.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void reload(); }, [reload]);
  return <Page><FlatList data={items} contentContainerStyle={styles.content} keyExtractor={itemKey} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { setLoading(true); void reload(); }} />} ListHeaderComponent={<><Text style={styles.sectionTitle}>{title}</Text><ScreenSubtitle>{subtitle}</ScreenSubtitle>{error ? <Text style={styles.error}>{error}</Text> : null}</>} ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : <Text style={styles.empty}>אין נתונים להצגה.</Text>} renderItem={({ item }) => <View style={styles.row}>{render(item)}</View>} /></Page>;
}

export function ManagerCustomersScreen(_: CustomersProps) { const { user, accessToken } = useAuth(); return <DirectoryScreen title="לקוחות" subtitle="לצפייה מהירה בלקוחות הקיימים. הוספה ועריכה יתווספו במסך הבא של גרסת המנהל." load={() => user && accessToken ? listCustomers(user.organization.id, accessToken) : Promise.resolve([])} itemKey={(customer) => customer.id} render={(customer) => <><Text style={styles.rowTitle}>{customer.name}</Text><Text style={styles.rowMeta}>{customer.customerNumber} · {customer.phone ?? "ללא טלפון"}</Text></>} />; }

export function ManagerEquipmentScreen(_: EquipmentProps) { const { user, accessToken } = useAuth(); return <DirectoryScreen title="ציוד" subtitle="הצי הפעיל והצי שהוסר זמינים כאן לקריאה מהירה." load={() => user && accessToken ? listEquipment(user.organization.id, accessToken) : Promise.resolve([])} itemKey={(equipment) => equipment.id} render={(equipment: Equipment) => <><Text style={styles.rowTitle}>{equipment.name}</Text><Text style={styles.rowMeta}>{equipment.internalNumber} · {equipment.manufacturer ?? "ללא יצרן"} {equipment.model ?? ""}</Text><StatusPill label={equipment.status === "retired" ? "צי שהוסר" : "צי פעיל"} tone={equipment.status === "retired" ? "neutral" : "success"} /></>} />; }

export function ManagerLocationsScreen(_: LocationsProps) { const { user, accessToken } = useAuth(); return <DirectoryScreen title="מיקומי טכנאים" subtitle="מיקום אחרון נשמר רק בזמן יום עבודה פעיל." load={() => user && accessToken ? listCurrentTechnicianLocations(user.organization.id, accessToken) : Promise.resolve([])} itemKey={(entry) => entry.userId} render={(entry: CurrentTechnicianLocation) => <><Text style={styles.rowTitle}>{entry.displayName}</Text><Text style={styles.rowMeta}>{entry.workDayId ? `יום עבודה החל ב־${time(entry.startedAt)}` : "לא ביום עבודה פעיל"}</Text>{entry.location ? <><Text style={styles.rowMeta}>עודכן: {time(entry.location.recordedAt)} · דיוק: {Math.round(entry.location.accuracy ?? 0)} מ׳</Text><Button label="פתיחה במפה" variant="secondary" onPress={() => void Linking.openURL(`https://www.google.com/maps?q=${entry.location!.latitude},${entry.location!.longitude}`)} /></> : <Text style={styles.rowMeta}>אין מיקום זמין</Text>}</>} />; }

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#444444" },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  header: { gap: spacing.sm, marginHorizontal: -spacing.md, marginTop: -spacing.md, marginBottom: spacing.sm, paddingBottom: spacing.md },
  brandStrip: { height: 76, backgroundColor: "#444444", borderBottomWidth: 4, borderBottomColor: colors.primary, flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: spacing.md },
  brandAccent: { position: "absolute", right: 0, top: 0, height: 72, width: 7, backgroundColor: colors.primary },
  menuCard: { backgroundColor: colors.bgPanel, borderColor: colors.border, borderWidth: 1, borderRightWidth: 4, borderRightColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, minHeight: 96, justifyContent: "center", gap: spacing.xs },
  menuTitle: { color: colors.text, fontSize: 19, fontWeight: "800", textAlign: "right", writingDirection: "rtl" },
  menuSubtitle: { color: colors.textMuted, fontSize: 14, textAlign: "right", writingDirection: "rtl" },
  arrow: { position: "absolute", left: spacing.lg, color: colors.primary, fontSize: 34, fontWeight: "400" },
  row: { backgroundColor: colors.bgPanel, borderColor: colors.border, borderWidth: 1, borderRightWidth: 3, borderRightColor: colors.borderStrong, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, marginTop: spacing.md },
  selectedRow: { borderColor: colors.primary, borderRightColor: colors.primary, backgroundColor: colors.primarySoft },
  rowTop: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  rowNumber: { color: colors.primary, fontSize: 13, fontWeight: "800", textAlign: "right", writingDirection: "rtl" },
  rowTitle: { color: colors.text, fontSize: 17, fontWeight: "800", textAlign: "right", writingDirection: "rtl" },
  rowMeta: { color: colors.textMuted, fontSize: 14, lineHeight: 20, textAlign: "right", writingDirection: "rtl" },
  detailTitle: { color: colors.text, fontSize: 21, fontWeight: "800", textAlign: "right", writingDirection: "rtl" },
  detailText: { color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: "right", writingDirection: "rtl" },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: "800", marginTop: spacing.md, textAlign: "right", writingDirection: "rtl" },
  chips: { gap: spacing.sm }, loader: { marginTop: spacing.xl }, empty: { color: colors.textMuted, textAlign: "right", writingDirection: "rtl", marginTop: spacing.xl }, error: { color: colors.error, marginTop: spacing.md, lineHeight: 20, textAlign: "right", writingDirection: "rtl" }, fieldLabel: { color: colors.text, fontSize: 15, fontWeight: "800", marginTop: spacing.md, textAlign: "right", writingDirection: "rtl" }, input: { minHeight: 50, backgroundColor: colors.bgPanel, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, color: colors.text, fontSize: 16, textAlign: "right", writingDirection: "rtl" }, textArea: { minHeight: 100, textAlignVertical: "top", paddingTop: spacing.md }, priorityRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm }, choice: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgPanel, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill }, choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, choiceText: { color: colors.text, fontWeight: "700", textAlign: "right", writingDirection: "rtl" }, footerBlock: { gap: spacing.sm, paddingTop: spacing.md },
});
