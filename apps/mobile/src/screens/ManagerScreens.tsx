import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Customer, Equipment, EquipmentType, OrganizationMember, ServiceCall, ServiceCallLifecycleView } from "@amarok-one/types";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { createCustomer, createEquipment, listCurrentTechnicianLocations, listCustomers, listEquipment, listEquipmentTypes, type CurrentTechnicianLocation } from "../api/manager";
import { assignServiceCallTechnician, createManagerServiceCall, getServiceCall, getServiceCallLifecycle, listAssignableTechnicians, listMyServiceCalls } from "../api/service-calls";
import { isApiRequestError } from "../api/client";
import { BrandWordmark, Button, Card, Eyebrow, ScreenSubtitle, ScreenTitle, StatusPill } from "../components/ui";
import type { RootStackParamList } from "../navigation/types";
import { colors, radius, spacing, typography } from "../theme";

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

export function ManagerCustomersScreen(_: CustomersProps) {
  const { user, accessToken } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  const load = useCallback(async () => {
    if (!user || !accessToken) return;
    setError(null);
    try { setCustomers(await listCustomers(user.organization.id, accessToken)); }
    catch (e) { setError(errorMessage(e, "לא ניתן לטעון לקוחות")); }
    finally { setLoading(false); }
  }, [user, accessToken]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function save(): Promise<void> {
    if (!user || !accessToken || name.trim().length < 2 || customerNumber.trim().length < 2) {
      setError("יש למלא שם לקוח ומספר לקוח פנימי.");
      return;
    }
    setSaving(true); setError(null);
    try {
      await createCustomer(user.organization.id, accessToken, {
        name: name.trim(), customerNumber: customerNumber.trim(), phone: phone.trim() || undefined, city: city.trim() || undefined,
      });
      setName(""); setCustomerNumber(""); setPhone(""); setCity(""); setAdding(false); setLoading(true); await load();
    } catch (e) { setError(errorMessage(e, "לא ניתן להוסיף את הלקוח")); }
    finally { setSaving(false); }
  }

  return <Page><FlatList data={customers} contentContainerStyle={styles.content} keyExtractor={(customer) => customer.id}
    refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { setLoading(true); void load(); }} />}
    ListHeaderComponent={<><ScreenTitle>לקוחות</ScreenTitle><ScreenSubtitle>ניהול לקוחות ישירות מהנייד.</ScreenSubtitle>
      {adding ? <View style={styles.formCard}><Text style={styles.formTitle}>הוספת לקוח</Text>
        <Text style={styles.fieldLabel}>שם הלקוח</Text><TextInput value={name} onChangeText={setName} style={styles.input} placeholder="לדוגמה: א.ב. עבודות עפר" placeholderTextColor={colors.textSubtle} />
        <Text style={styles.fieldLabel}>מספר לקוח פנימי</Text><TextInput value={customerNumber} onChangeText={setCustomerNumber} style={styles.input} placeholder="לדוגמה: C-001" placeholderTextColor={colors.textSubtle} autoCapitalize="characters" />
        <Text style={styles.fieldLabel}>טלפון (אופציונלי)</Text><TextInput value={phone} onChangeText={setPhone} style={styles.input} keyboardType="phone-pad" />
        <Text style={styles.fieldLabel}>עיר (אופציונלי)</Text><TextInput value={city} onChangeText={setCity} style={styles.input} />
        {error ? <Text style={styles.error}>{error}</Text> : null}<Button label="שמירת לקוח" loading={saving} onPress={() => void save()} /><Button label="ביטול" variant="secondary" onPress={() => setAdding(false)} />
      </View> : <Button label="הוספת לקוח" onPress={() => { setError(null); setAdding(true); }} />}{error && !adding ? <Text style={styles.error}>{error}</Text> : null}</>}
    ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : <Text style={styles.empty}>אין לקוחות להצגה.</Text>}
    renderItem={({ item: customer }) => <View style={styles.row}><Text style={styles.rowTitle}>{customer.name}</Text><Text style={styles.rowMeta}>{customer.customerNumber} · {customer.phone ?? "ללא טלפון"}</Text></View>}
  /></Page>;
}

export function ManagerEquipmentScreen(_: EquipmentProps) {
  const { user, accessToken } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(""); const [internalNumber, setInternalNumber] = useState("");
  const [manufacturer, setManufacturer] = useState(""); const [model, setModel] = useState(""); const [serialNumber, setSerialNumber] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null); const [equipmentTypeId, setEquipmentTypeId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !accessToken) return;
    setError(null);
    try { const [nextEquipment, nextCustomers, nextTypes] = await Promise.all([listEquipment(user.organization.id, accessToken), listCustomers(user.organization.id, accessToken), listEquipmentTypes(user.organization.id, accessToken)]); setEquipment(nextEquipment); setCustomers(nextCustomers); setTypes(nextTypes); }
    catch (e) { setError(errorMessage(e, "לא ניתן לטעון ציוד")); }
    finally { setLoading(false); }
  }, [user, accessToken]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  function cancel(): void { setAdding(false); setError(null); setName(""); setInternalNumber(""); setManufacturer(""); setModel(""); setSerialNumber(""); setCustomerId(null); setEquipmentTypeId(null); }
  async function save(): Promise<void> {
    if (!user || !accessToken || name.trim().length < 2 || internalNumber.trim().length < 2 || !customerId || !equipmentTypeId) { setError("יש למלא שם כלי, מספר צי, לקוח וסוג כלי."); return; }
    setSaving(true); setError(null);
    try { await createEquipment(user.organization.id, accessToken, { name: name.trim(), internalNumber: internalNumber.trim(), customerId, equipmentTypeId, manufacturer: manufacturer.trim() || undefined, model: model.trim() || undefined, serialNumber: serialNumber.trim() || undefined }); cancel(); setLoading(true); await load(); }
    catch (e) { setError(errorMessage(e, "לא ניתן להוסיף את הכלי")); }
    finally { setSaving(false); }
  }

  return <Page><FlatList data={equipment} contentContainerStyle={styles.content} keyExtractor={(item) => item.id}
    refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { setLoading(true); void load(); }} />}
    ListHeaderComponent={<><ScreenTitle>ציוד</ScreenTitle><ScreenSubtitle>הצי הפעיל והצי שהוסר של לקוחותיך.</ScreenSubtitle>
      {adding ? <View style={styles.formCard}><Text style={styles.formTitle}>הוספת ציוד</Text>
        <Text style={styles.fieldLabel}>לקוח</Text><View style={styles.choiceList}>{customers.map((customer) => <Pressable key={customer.id} onPress={() => setCustomerId(customer.id)} style={[styles.choice, customerId === customer.id && styles.choiceSelected]}><Text style={styles.choiceText}>{customer.name}</Text></Pressable>)}</View>
        <Text style={styles.fieldLabel}>סוג כלי</Text><View style={styles.choiceList}>{types.map((type) => <Pressable key={type.id} onPress={() => setEquipmentTypeId(type.id)} style={[styles.choice, equipmentTypeId === type.id && styles.choiceSelected]}><Text style={styles.choiceText}>{type.name}</Text></Pressable>)}</View>
        <Text style={styles.fieldLabel}>שם הכלי</Text><TextInput value={name} onChangeText={setName} style={styles.input} placeholder="לדוגמה: שופל וולוו L120H" placeholderTextColor={colors.textSubtle} />
        <Text style={styles.fieldLabel}>מספר צי פנימי</Text><TextInput value={internalNumber} onChangeText={setInternalNumber} style={styles.input} placeholder="לדוגמה: EQ-001" placeholderTextColor={colors.textSubtle} autoCapitalize="characters" />
        <Text style={styles.fieldLabel}>יצרן (אופציונלי)</Text><TextInput value={manufacturer} onChangeText={setManufacturer} style={styles.input} placeholder="לדוגמה: וולוו" placeholderTextColor={colors.textSubtle} />
        <Text style={styles.fieldLabel}>דגם (אופציונלי)</Text><TextInput value={model} onChangeText={setModel} style={styles.input} placeholder="לדוגמה: L120H" placeholderTextColor={colors.textSubtle} />
        <Text style={styles.fieldLabel}>מספר סידורי (אופציונלי)</Text><TextInput value={serialNumber} onChangeText={setSerialNumber} style={styles.input} />
        {error ? <Text style={styles.error}>{error}</Text> : null}<Button label="שמירת ציוד" loading={saving} onPress={() => void save()} /><Button label="ביטול" variant="secondary" onPress={cancel} />
      </View> : <Button label="הוספת ציוד" onPress={() => { setError(null); setAdding(true); }} />}{error && !adding ? <Text style={styles.error}>{error}</Text> : null}</>}
    ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : <Text style={styles.empty}>אין ציוד להצגה.</Text>}
    renderItem={({ item }) => <View style={styles.row}><Text style={styles.rowTitle}>{item.name}</Text><Text style={styles.rowMeta}>{item.internalNumber} · {item.manufacturer ?? "ללא יצרן"} {item.model ?? ""}</Text><StatusPill label={item.status === "retired" ? "צי שהוסר" : "צי פעיל"} tone={item.status === "retired" ? "neutral" : "success"} /></View>}
  /></Page>;
}

export function ManagerLocationsScreen(_: LocationsProps) { const { user, accessToken } = useAuth(); return <DirectoryScreen title="מיקומי טכנאים" subtitle="מיקום אחרון נשמר רק בזמן יום עבודה פעיל." load={() => user && accessToken ? listCurrentTechnicianLocations(user.organization.id, accessToken) : Promise.resolve([])} itemKey={(entry) => entry.userId} render={(entry: CurrentTechnicianLocation) => <><Text style={styles.rowTitle}>{entry.displayName}</Text><Text style={styles.rowMeta}>{entry.workDayId ? `יום עבודה החל ב־${time(entry.startedAt)}` : "לא ביום עבודה פעיל"}</Text>{entry.location ? <><Text style={styles.rowMeta}>עודכן: {time(entry.location.recordedAt)} · דיוק: {Math.round(entry.location.accuracy ?? 0)} מ׳</Text><Button label="פתיחה במפה" variant="secondary" onPress={() => void Linking.openURL(`https://www.google.com/maps?q=${entry.location!.latitude},${entry.location!.longitude}`)} /></> : <Text style={styles.rowMeta}>אין מיקום זמין</Text>}</>} />; }

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#444444" },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  header: { gap: spacing.sm, marginHorizontal: -spacing.md, marginTop: -spacing.md, marginBottom: spacing.sm, paddingBottom: spacing.md },
  brandStrip: { height: 76, backgroundColor: "#444444", borderBottomWidth: 4, borderBottomColor: colors.primary, flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: spacing.md },
  brandAccent: { position: "absolute", right: 0, top: 0, height: 72, width: 7, backgroundColor: colors.primary },
  menuCard: { backgroundColor: colors.bgPanel, borderColor: colors.border, borderWidth: 1, borderRightWidth: 4, borderRightColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, minHeight: 96, justifyContent: "center", gap: spacing.xs },
  menuTitle: { color: colors.text, fontFamily: typography.bold, fontSize: 19, textAlign: "right", writingDirection: "rtl" },
  menuSubtitle: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 14, textAlign: "right", writingDirection: "rtl" },
  arrow: { position: "absolute", left: spacing.lg, color: colors.primary, fontSize: 34, fontWeight: "400" },
  row: { backgroundColor: colors.bgPanel, borderColor: colors.border, borderWidth: 1, borderRightWidth: 3, borderRightColor: colors.borderStrong, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, marginTop: spacing.md },
  selectedRow: { borderColor: colors.primary, borderRightColor: colors.primary, backgroundColor: colors.primarySoft },
  rowTop: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  rowNumber: { color: colors.primary, fontFamily: typography.bold, fontSize: 13, textAlign: "right", writingDirection: "rtl" },
  rowTitle: { color: colors.text, fontFamily: typography.bold, fontSize: 17, textAlign: "right", writingDirection: "rtl" },
  rowMeta: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 14, lineHeight: 20, textAlign: "right", writingDirection: "rtl" },
  detailTitle: { color: colors.text, fontFamily: typography.bold, fontSize: 21, textAlign: "right", writingDirection: "rtl" },
  detailText: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 15, lineHeight: 22, textAlign: "right", writingDirection: "rtl" },
  sectionTitle: { color: colors.text, fontFamily: typography.bold, fontSize: 19, marginTop: spacing.md, textAlign: "right", writingDirection: "rtl" },
  chips: { gap: spacing.sm }, loader: { marginTop: spacing.xl }, empty: { color: colors.textMuted, fontFamily: typography.regular, textAlign: "right", writingDirection: "rtl", marginTop: spacing.xl }, error: { color: colors.error, fontFamily: typography.regular, marginTop: spacing.md, lineHeight: 20, textAlign: "right", writingDirection: "rtl" }, fieldLabel: { color: colors.text, fontFamily: typography.bold, fontSize: 15, marginTop: spacing.md, textAlign: "right", writingDirection: "rtl" }, input: { minHeight: 50, backgroundColor: colors.bgPanel, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, color: colors.text, fontFamily: typography.regular, fontSize: 16, textAlign: "right", writingDirection: "rtl" }, textArea: { minHeight: 100, textAlignVertical: "top", paddingTop: spacing.md }, priorityRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm }, choiceList: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm }, choice: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgPanel, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill }, choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, choiceText: { color: colors.text, fontFamily: typography.regular, textAlign: "right", writingDirection: "rtl" }, formCard: { backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm }, formTitle: { color: colors.text, fontFamily: typography.bold, fontSize: 20, textAlign: "right", writingDirection: "rtl" }, footerBlock: { gap: spacing.sm, paddingTop: spacing.md },
});
