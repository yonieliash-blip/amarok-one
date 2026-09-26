/* eslint-disable react-hooks/set-state-in-effect */
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type {
  Customer,
  Equipment,
  InventoryLocationDetail,
  PartCatalogCategoryGroup,
  ServiceCall,
  ServiceCallLifecycleView,
} from "@amarok-one/types";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../auth/AuthContext";
import {
  createManagerCustomer,
  createManagerCustomerContact,
  createManagerEquipment,
  listManagerCustomers,
  listManagerEquipment,
  listManagerEquipmentTypes,
} from "../api/manager";
import {
  addManagerInventoryItem,
  assignManagerTechnicianVan,
  createManagerCatalogPart,
  createManagerInventoryLocation,
  createManagerPartCategory,
  createManagerPartSubcategory,
  getManagerInventoryOverview,
  listManagerPartsCatalog,
  listManagerTechnicians,
  type ManagerTechnicianSummary,
} from "../api/manager-stock";
import {
  assignServiceCallTechnician,
  createManagerServiceCall,
  getServiceCall,
  getServiceCallLifecycle,
  listAssignableTechnicians,
  listMyServiceCalls,
} from "../api/service-calls";
import { isApiRequestError } from "../api/client";
import {
  BrandWordmark,
  Button,
  Card,
  ScreenSubtitle,
  ScreenTitle,
  StatusPill,
} from "../components/ui";
import type { RootStackParamList } from "../navigation/types";
import { colors, radius, spacing, typography } from "../theme";

type HomeProps = NativeStackScreenProps<RootStackParamList, "ManagerHome">;
type CallsProps = NativeStackScreenProps<RootStackParamList, "ManagerServiceCalls">;
type NewCallProps = NativeStackScreenProps<RootStackParamList, "ManagerNewServiceCall">;
type CallProps = NativeStackScreenProps<RootStackParamList, "ManagerServiceCall">;
type CustomersProps = NativeStackScreenProps<RootStackParamList, "ManagerCustomers">;
type EquipmentProps = NativeStackScreenProps<RootStackParamList, "ManagerEquipment">;
type PartsProps = NativeStackScreenProps<RootStackParamList, "ManagerParts">;
type InventoryProps = NativeStackScreenProps<RootStackParamList, "ManagerInventory">;
type TechniciansProps = NativeStackScreenProps<RootStackParamList, "ManagerTechnicians">;

function message(error: unknown, fallback: string): string {
  return isApiRequestError(error)
    ? error.message
    : error instanceof Error
      ? error.message
      : fallback;
}

function lifecycleLabel(state: ServiceCall["lifecycleState"]): string {
  const labels: Record<ServiceCall["lifecycleState"], string> = {
    new: "חדשה",
    waiting_assignment: "ממתינה להקצאה",
    assigned: "הוקצתה",
    driving: "בנסיעה",
    working: "בעבודה",
    waiting_for_parts: "ממתינה לחלפים",
    waiting_customer: "ממתינה ללקוח",
    waiting_specialist: "ממתינה למומחה",
    waiting_manager_closure: "ממתינה לסגירת מנהל",
    closed: "סגורה",
  };
  return labels[state];
}

function Page({ children }: { children: React.ReactNode }) {
  return <View style={styles.page}>{children}</View>;
}

function Field({
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textSubtle}
      multiline={multiline}
      style={[styles.input, multiline && styles.textArea]}
    />
  );
}

function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.choice, selected && styles.choiceSelected]}>
      <Text style={styles.choiceText}>{label}</Text>
    </Pressable>
  );
}

type ManagerMenuIcon =
  | "document-text-outline"
  | "person-add-outline"
  | "construct-outline"
  | "list-outline"
  | "people-outline"
  | "cube-outline"
  | "car-outline"
  | "log-out-outline";

function ManagerMenuButton({
  label,
  icon,
  onPress,
  danger = false,
}: {
  label: string;
  icon: ManagerMenuIcon;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuButton,
        danger && styles.menuButtonDanger,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.menuButtonContent}>
        <Ionicons name={icon} size={23} color={danger ? colors.text : colors.primary} />
        <Text style={[styles.menuButtonText, danger && styles.menuButtonTextDanger]}>{label}</Text>
      </View>
    </Pressable>
  );
}

export function ManagerHomeScreen({ navigation }: HomeProps) {
  const { logout } = useAuth();

  return (
    <Page>
      <ScrollView style={styles.page} contentContainerStyle={styles.homeContent}>
        <View style={styles.managerBrandFrame}>
          <BrandWordmark style={styles.managerWordmark} />
        </View>
        <Text style={styles.managerHeading}>מרכז שליטה מנהל</Text>

        <View style={styles.menuGrid}>
          <ManagerMenuButton
            label="פתח קריאה"
            icon="document-text-outline"
            onPress={() => navigation.navigate("ManagerNewServiceCall")}
          />
          <ManagerMenuButton
            label="הוסף לקוח"
            icon="person-add-outline"
            onPress={() => navigation.navigate("ManagerCustomers")}
          />
          <ManagerMenuButton
            label="הוסף ציוד"
            icon="construct-outline"
            onPress={() => navigation.navigate("ManagerEquipment")}
          />
          <ManagerMenuButton
            label="קריאות שירות"
            icon="list-outline"
            onPress={() => navigation.navigate("ManagerServiceCalls")}
          />
          <ManagerMenuButton
            label="לקוחות"
            icon="people-outline"
            onPress={() => navigation.navigate("ManagerCustomers")}
          />
          <ManagerMenuButton
            label="ציוד"
            icon="construct-outline"
            onPress={() => navigation.navigate("ManagerEquipment")}
          />
          <ManagerMenuButton
            label="חלפים"
            icon="cube-outline"
            onPress={() => navigation.navigate("ManagerParts")}
          />
          <ManagerMenuButton
            label="עובדים וניידות"
            icon="car-outline"
            onPress={() => navigation.navigate("ManagerTechnicians")}
          />
          <ManagerMenuButton
            label="יציאה"
            icon="log-out-outline"
            danger
            onPress={() => void logout()}
          />
        </View>
      </ScrollView>
    </Page>
  );
}

export function ManagerCustomersScreen(_: CustomersProps) {
  const { user, accessToken } = useAuth();
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  const load = useCallback(async () => {
    if (!user || !accessToken) return;
    setError(null);
    try {
      setItems(await listManagerCustomers(user.organization.id, accessToken));
    } catch (cause) {
      setError(message(cause, "לא ניתן לטעון לקוחות"));
    } finally {
      setLoading(false);
    }
  }, [accessToken, user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(): Promise<void> {
    if (!user || !accessToken) return;
    if (name.trim().length < 2) {
      setError("יש להזין שם לקוח.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const customer = await createManagerCustomer(user.organization.id, accessToken, {
        name: name.trim(),
        registrationNumber: registrationNumber.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        status: "active",
      });
      if (contactName.trim()) {
        await createManagerCustomerContact(user.organization.id, customer.id, accessToken, {
          name: contactName.trim(),
          phone: phone.trim() || undefined,
          isPrimary: true,
        });
      }
      setName("");
      setRegistrationNumber("");
      setContactName("");
      setPhone("");
      setAddress("");
      setCity("");
      await load();
      Alert.alert("נשמר", `הלקוח ${customer.name} נוסף כמספר ${customer.customerNumber}.`);
    } catch (cause) {
      setError(message(cause, "לא ניתן להוסיף לקוח"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
        ListHeaderComponent={
          <View style={styles.sectionGap}>
            <ScreenTitle>לקוחות</ScreenTitle>
            <ScreenSubtitle>מספר הלקוח נוצר אוטומטית.</ScreenSubtitle>
            <Card>
              <Field value={name} onChangeText={setName} placeholder="שם לקוח" />
              <Field
                value={registrationNumber}
                onChangeText={setRegistrationNumber}
                placeholder="ח.פ. / מספר חברה"
              />
              <Field value={contactName} onChangeText={setContactName} placeholder="איש קשר" />
              <Field value={phone} onChangeText={setPhone} placeholder="טלפון" />
              <Field value={address} onChangeText={setAddress} placeholder="כתובת" />
              <Field value={city} onChangeText={setCity} placeholder="עיר" />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button label="הוספת לקוח" loading={saving} onPress={() => void save()} />
            </Card>
            <Text style={styles.sectionTitle}>לקוחות קיימים</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.empty}>אין לקוחות.</Text>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowMeta}>{item.customerNumber}</Text>
            <Text style={styles.rowMeta}>
              {item.registrationNumber ?? "ללא ח.פ."} · {item.phone ?? "ללא טלפון"}
            </Text>
          </View>
        )}
      />
    </Page>
  );
}

export function ManagerEquipmentScreen(_: EquipmentProps) {
  const { user, accessToken } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [types, setTypes] = useState<Awaited<ReturnType<typeof listManagerEquipmentTypes>>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [internalNumber, setInternalNumber] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [equipmentTypeId, setEquipmentTypeId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !accessToken) return;
    setError(null);
    try {
      const [nextEquipment, nextCustomers, nextTypes] = await Promise.all([
        listManagerEquipment(user.organization.id, accessToken),
        listManagerCustomers(user.organization.id, accessToken),
        listManagerEquipmentTypes(user.organization.id, accessToken),
      ]);
      setEquipment(nextEquipment);
      setCustomers(nextCustomers);
      setTypes(nextTypes);
      setCustomerId((current) => current ?? nextCustomers[0]?.id ?? null);
      setEquipmentTypeId((current) => current ?? nextTypes[0]?.id ?? null);
    } catch (cause) {
      setError(message(cause, "לא ניתן לטעון ציוד"));
    } finally {
      setLoading(false);
    }
  }, [accessToken, user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(): Promise<void> {
    if (!user || !accessToken) return;
    if (!name.trim() || !internalNumber.trim() || !equipmentTypeId) {
      setError("יש למלא שם ציוד, מספר פנימי וסוג ציוד.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createManagerEquipment(user.organization.id, accessToken, {
        name: name.trim(),
        internalNumber: internalNumber.trim().toUpperCase(),
        equipmentTypeId,
        customerId: customerId ?? undefined,
        manufacturer: manufacturer.trim() || undefined,
        model: model.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
      });
      setName("");
      setInternalNumber("");
      setManufacturer("");
      setModel("");
      setSerialNumber("");
      await load();
      Alert.alert("נשמר", "הציוד נוסף בהצלחה.");
    } catch (cause) {
      setError(message(cause, "לא ניתן להוסיף ציוד"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page>
      <FlatList
        data={equipment}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
        ListHeaderComponent={
          <View style={styles.sectionGap}>
            <ScreenTitle>ציוד</ScreenTitle>
            <Card>
              <Field value={name} onChangeText={setName} placeholder="שם / תיאור כלי" />
              <Field
                value={internalNumber}
                onChangeText={setInternalNumber}
                placeholder="מספר פנימי"
              />
              <Field value={manufacturer} onChangeText={setManufacturer} placeholder="יצרן" />
              <Field value={model} onChangeText={setModel} placeholder="דגם" />
              <Field
                value={serialNumber}
                onChangeText={setSerialNumber}
                placeholder="מספר סידורי"
              />
              <Text style={styles.fieldLabel}>לקוח</Text>
              <View style={styles.choices}>
                {customers.map((customer) => (
                  <Choice
                    key={customer.id}
                    label={customer.name}
                    selected={customerId === customer.id}
                    onPress={() => setCustomerId(customer.id)}
                  />
                ))}
              </View>
              <Text style={styles.fieldLabel}>סוג ציוד</Text>
              <View style={styles.choices}>
                {types.map((type) => (
                  <Choice
                    key={type.id}
                    label={type.name}
                    selected={equipmentTypeId === type.id}
                    onPress={() => setEquipmentTypeId(type.id)}
                  />
                ))}
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button label="הוספת ציוד" loading={saving} onPress={() => void save()} />
            </Card>
            <Text style={styles.sectionTitle}>ציוד קיים</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.empty}>אין ציוד.</Text>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowMeta}>
              {item.internalNumber} · {item.manufacturer ?? ""} {item.model ?? ""}
            </Text>
            <Text style={styles.rowMeta}>{item.customer?.name ?? "ללא לקוח"}</Text>
          </View>
        )}
      />
    </Page>
  );
}

export function ManagerServiceCallsScreen({ navigation }: CallsProps) {
  const { user, accessToken } = useAuth();
  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !accessToken) return;
    try {
      setCalls(await listMyServiceCalls(user.organization.id, accessToken));
      setError(null);
    } catch (cause) {
      setError(message(cause, "לא ניתן לטעון קריאות שירות"));
    } finally {
      setLoading(false);
    }
  }, [accessToken, user]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Page>
      <FlatList
        data={calls}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
        ListHeaderComponent={
          <View style={styles.sectionGap}>
            <ScreenTitle>קריאות שירות</ScreenTitle>
            <Button
              label="פתיחת קריאה חדשה"
              onPress={() => navigation.navigate("ManagerNewServiceCall")}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.empty}>אין קריאות.</Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              navigation.navigate("ManagerServiceCall", {
                serviceCallId: item.id,
                title: item.serviceCallNumber,
              })
            }
          >
            <View style={styles.rowTop}>
              <Text style={styles.rowNumber}>{item.serviceCallNumber}</Text>
              <StatusPill
                label={lifecycleLabel(item.lifecycleState)}
                tone={item.lifecycleState === "closed" ? "neutral" : "warning"}
              />
            </View>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowMeta}>
              {item.customer?.name ?? "ללא לקוח"} · {item.assignedUser?.displayName ?? "לא הוקצה"}
            </Text>
          </Pressable>
        )}
      />
    </Page>
  );
}

export function ManagerNewServiceCallScreen({ navigation }: NewCallProps) {
  const { user, accessToken } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [equipmentId, setEquipmentId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<ServiceCall["priority"]>("normal");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !accessToken) return;
    void Promise.all([
      listManagerCustomers(user.organization.id, accessToken),
      listManagerEquipment(user.organization.id, accessToken),
    ])
      .then(([nextCustomers, nextEquipment]) => {
        setCustomers(nextCustomers);
        setEquipment(nextEquipment);
        setCustomerId(nextCustomers[0]?.id ?? null);
      })
      .catch((cause: unknown) => setError(message(cause, "לא ניתן לטעון לקוחות וציוד")));
  }, [accessToken, user]);

  const availableEquipment = useMemo(
    () => equipment.filter((item) => !customerId || item.customerId === customerId),
    [customerId, equipment],
  );

  useEffect(() => {
    if (equipmentId && availableEquipment.some((item) => item.id === equipmentId)) return;
    setEquipmentId(availableEquipment[0]?.id ?? null);
  }, [availableEquipment, equipmentId]);

  async function save(): Promise<void> {
    if (!user || !accessToken || !customerId || !equipmentId) {
      setError("יש לבחור לקוח וציוד.");
      return;
    }
    if (title.trim().length < 2) {
      setError("יש להזין תיאור קצר לקריאה.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createManagerServiceCall(user.organization.id, accessToken, {
        title: title.trim(),
        description: description.trim() || undefined,
        customerId,
        equipmentId,
        priority,
      });
      navigation.replace("ManagerServiceCall", {
        serviceCallId: created.id,
        title: created.serviceCallNumber,
      });
    } catch (cause) {
      setError(message(cause, "לא ניתן לפתוח קריאה"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle>פתח קריאת שירות</ScreenTitle>
        <ScreenSubtitle>מספר הקריאה נוצר אוטומטית.</ScreenSubtitle>
        <Text style={styles.fieldLabel}>לקוח</Text>
        <View style={styles.choices}>
          {customers.map((customer) => (
            <Choice
              key={customer.id}
              label={customer.name}
              selected={customerId === customer.id}
              onPress={() => setCustomerId(customer.id)}
            />
          ))}
        </View>
        <Text style={styles.fieldLabel}>ציוד</Text>
        <View style={styles.choices}>
          {availableEquipment.map((item) => (
            <Choice
              key={item.id}
              label={item.name}
              selected={equipmentId === item.id}
              onPress={() => setEquipmentId(item.id)}
            />
          ))}
        </View>
        <Field value={title} onChangeText={setTitle} placeholder="מה התקלה / מה נדרש?" />
        <Field
          value={description}
          onChangeText={setDescription}
          placeholder="תיאור מפורט"
          multiline
        />
        <Text style={styles.fieldLabel}>עדיפות</Text>
        <View style={styles.choices}>
          {(["low", "normal", "high", "urgent"] as const).map((value) => (
            <Choice
              key={value}
              label={{ low: "נמוכה", normal: "רגילה", high: "גבוהה", urgent: "דחופה" }[value]}
              selected={priority === value}
              onPress={() => setPriority(value)}
            />
          ))}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="פתיחת קריאה" loading={saving} onPress={() => void save()} />
      </ScrollView>
    </Page>
  );
}

export function ManagerServiceCallScreen({ route }: CallProps) {
  const { user, accessToken } = useAuth();
  const [call, setCall] = useState<ServiceCall | null>(null);
  const [lifecycle, setLifecycle] = useState<ServiceCallLifecycleView | null>(null);
  const [technicians, setTechnicians] = useState<
    Awaited<ReturnType<typeof listAssignableTechnicians>>
  >([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !accessToken) return;
    try {
      const [nextCall, nextLifecycle, nextTechnicians] = await Promise.all([
        getServiceCall(user.organization.id, route.params.serviceCallId, accessToken),
        getServiceCallLifecycle(user.organization.id, route.params.serviceCallId, accessToken),
        listAssignableTechnicians(user.organization.id, accessToken),
      ]);
      setCall(nextCall);
      setLifecycle(nextLifecycle);
      setTechnicians(nextTechnicians);
      setError(null);
    } catch (cause) {
      setError(message(cause, "לא ניתן לטעון את הקריאה"));
    } finally {
      setLoading(false);
    }
  }, [accessToken, route.params.serviceCallId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function assign(technicianId: string): Promise<void> {
    if (!user || !accessToken) return;
    setAssigning(true);
    setError(null);
    try {
      await assignServiceCallTechnician(
        user.organization.id,
        route.params.serviceCallId,
        technicianId,
        accessToken,
      );
      await load();
    } catch (cause) {
      setError(message(cause, "לא ניתן לשייך טכנאי"));
    } finally {
      setAssigning(false);
    }
  }

  if (loading) {
    return (
      <Page>
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      </Page>
    );
  }

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {call ? (
          <>
            <ScreenTitle>{call.serviceCallNumber}</ScreenTitle>
            <Text style={styles.detailTitle}>{call.title}</Text>
            <Text style={styles.rowMeta}>{call.customer?.name ?? "ללא לקוח"}</Text>
            <Text style={styles.rowMeta}>
              {call.equipment?.name ?? "ללא ציוד"} · {call.assignedUser?.displayName ?? "לא הוקצה"}
            </Text>
            <StatusPill label={lifecycleLabel(call.lifecycleState)} tone="warning" />
            {call.description ? <Text style={styles.body}>{call.description}</Text> : null}
          </>
        ) : null}

        <Text style={styles.sectionTitle}>שיוך טכנאי</Text>
        <View style={styles.choices}>
          {technicians.map((technician) => (
            <Choice
              key={technician.id}
              label={technician.displayName}
              selected={call?.assignedUserId === technician.id}
              onPress={() => void assign(technician.id)}
            />
          ))}
        </View>
        {assigning ? <ActivityIndicator color={colors.primary} /> : null}

        <Text style={styles.sectionTitle}>ביקורים</Text>
        {lifecycle?.visits.length ? (
          lifecycle.visits.map((visit) => (
            <View key={visit.id} style={styles.row}>
              <Text style={styles.rowTitle}>ביקור #{visit.sequence}</Text>
              <Text style={styles.rowMeta}>{visit.status}</Text>
              <Text style={styles.rowMeta}>{visit.technician?.displayName ?? "ללא טכנאי"}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>עדיין אין ביקורים.</Text>
        )}
      </ScrollView>
    </Page>
  );
}

export function ManagerPartsScreen({ navigation }: PartsProps) {
  const { user, accessToken } = useAuth();
  const [catalog, setCatalog] = useState<PartCatalogCategoryGroup[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [subcategoryName, setSubcategoryName] = useState("");
  const [partName, setPartName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !accessToken) return;
    try {
      const next = await listManagerPartsCatalog(user.organization.id, accessToken);
      setCatalog(next);
      setCategoryId((current) => current ?? next[0]?.id ?? null);
      setError(null);
    } catch (cause) {
      setError(message(cause, "לא ניתן לטעון קטלוג חלפים"));
    }
  }, [accessToken, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCategory = catalog.find((category) => category.id === categoryId);
  const subcategories = useMemo(() => selectedCategory?.subcategories ?? [], [selectedCategory]);

  useEffect(() => {
    if (subcategoryId && subcategories.some((item) => item.id === subcategoryId)) return;
    setSubcategoryId(subcategories[0]?.id ?? null);
  }, [subcategoryId, subcategories]);

  async function addCategory(): Promise<void> {
    if (!user || !accessToken || !categoryName.trim()) return;
    setBusy(true);
    try {
      await createManagerPartCategory(user.organization.id, accessToken, categoryName.trim());
      setCategoryName("");
      await load();
    } catch (cause) {
      setError(message(cause, "לא ניתן ליצור קטגוריה"));
    } finally {
      setBusy(false);
    }
  }

  async function addSubcategory(): Promise<void> {
    if (!user || !accessToken || !categoryId || !subcategoryName.trim()) return;
    setBusy(true);
    try {
      await createManagerPartSubcategory(user.organization.id, accessToken, {
        categoryId,
        name: subcategoryName.trim(),
      });
      setSubcategoryName("");
      await load();
    } catch (cause) {
      setError(message(cause, "לא ניתן ליצור תת-קטגוריה"));
    } finally {
      setBusy(false);
    }
  }

  async function addPart(): Promise<void> {
    if (!user || !accessToken || !categoryId || !subcategoryId || !partName.trim()) return;
    setBusy(true);
    try {
      await createManagerCatalogPart(user.organization.id, accessToken, {
        categoryId,
        subcategoryId,
        name: partName.trim(),
        partNumber: partNumber.trim() || undefined,
      });
      setPartName("");
      setPartNumber("");
      await load();
    } catch (cause) {
      setError(message(cause, "לא ניתן ליצור חלף"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle>חלפים</ScreenTitle>
        <ScreenSubtitle>קטגוריה → תת-קטגוריה → חלף.</ScreenSubtitle>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Card>
          <Text style={styles.fieldLabel}>קטגוריה חדשה</Text>
          <Field
            value={categoryName}
            onChangeText={setCategoryName}
            placeholder="לדוגמה: חלקי מיזוג"
          />
          <Button label="הוספת קטגוריה" loading={busy} onPress={() => void addCategory()} />
        </Card>

        <Text style={styles.fieldLabel}>קטגוריה</Text>
        <View style={styles.choices}>
          {catalog.map((category) => (
            <Choice
              key={category.id}
              label={category.name}
              selected={categoryId === category.id}
              onPress={() => {
                setCategoryId(category.id);
                setSubcategoryId(category.subcategories[0]?.id ?? null);
              }}
            />
          ))}
        </View>

        <Card>
          <Text style={styles.fieldLabel}>תת-קטגוריה חדשה</Text>
          <Field
            value={subcategoryName}
            onChangeText={setSubcategoryName}
            placeholder="לדוגמה: מדחסים"
          />
          <Button label="הוספת תת-קטגוריה" loading={busy} onPress={() => void addSubcategory()} />
        </Card>

        <Text style={styles.fieldLabel}>תת-קטגוריה</Text>
        <View style={styles.choices}>
          {subcategories.map((subcategory) => (
            <Choice
              key={subcategory.id}
              label={subcategory.name}
              selected={subcategoryId === subcategory.id}
              onPress={() => setSubcategoryId(subcategory.id)}
            />
          ))}
        </View>

        <Card>
          <Text style={styles.fieldLabel}>חלף חדש</Text>
          <Field value={partName} onChangeText={setPartName} placeholder="שם חלף" />
          <Field value={partNumber} onChangeText={setPartNumber} placeholder="מק״ט" />
          <Button label="הוספת חלף" loading={busy} onPress={() => void addPart()} />
        </Card>

        <Button
          label="חלפים בניידות"
          onPress={() => navigation.navigate("ManagerInventory", { kind: "service_van" })}
        />
        <Button
          label="מחסן חלפים"
          variant="secondary"
          onPress={() => navigation.navigate("ManagerInventory", { kind: "central_warehouse" })}
        />
        <Button
          label="שיוך ניידת לטכנאי"
          variant="secondary"
          onPress={() => navigation.navigate("ManagerTechnicians")}
        />

        {catalog.map((category) => (
          <View key={category.id} style={styles.row}>
            <Text style={styles.rowTitle}>{category.name}</Text>
            {category.subcategories.map((subcategory) => (
              <View key={subcategory.id} style={styles.catalogBlock}>
                <Text style={styles.rowMeta}>{subcategory.name}</Text>
                {subcategory.parts.map((part) => (
                  <Text key={part.id} style={styles.body}>
                    {part.name}
                    {part.partNumber ? ` · ${part.partNumber}` : ""}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </Page>
  );
}

function flattenParts(catalog: PartCatalogCategoryGroup[]) {
  return catalog.flatMap((category) =>
    category.subcategories.flatMap((subcategory) =>
      subcategory.parts.map((part) => ({
        ...part,
        path: `${category.name} / ${subcategory.name}`,
      })),
    ),
  );
}

export function ManagerInventoryScreen({ route }: InventoryProps) {
  const { user, accessToken } = useAuth();
  const [locations, setLocations] = useState<InventoryLocationDetail[]>([]);
  const [catalog, setCatalog] = useState<PartCatalogCategoryGroup[]>([]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [partId, setPartId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !accessToken) return;
    try {
      const [overview, nextCatalog] = await Promise.all([
        getManagerInventoryOverview(user.organization.id, accessToken),
        listManagerPartsCatalog(user.organization.id, accessToken),
      ]);
      const nextLocations =
        route.params.kind === "service_van" ? overview.vans : overview.warehouses;
      const parts = flattenParts(nextCatalog);
      setLocations(nextLocations);
      setCatalog(nextCatalog);
      setLocationId((current) =>
        current && nextLocations.some((item) => item.id === current)
          ? current
          : (nextLocations[0]?.id ?? null),
      );
      setPartId((current) =>
        current && parts.some((item) => item.id === current) ? current : (parts[0]?.id ?? null),
      );
      setError(null);
    } catch (cause) {
      setError(message(cause, "לא ניתן לטעון מלאי"));
    }
  }, [accessToken, route.params.kind, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const parts = useMemo(() => flattenParts(catalog), [catalog]);
  const selectedLocation = locations.find((item) => item.id === locationId);

  async function addLocation(): Promise<void> {
    if (!user || !accessToken || !locationName.trim()) return;
    setBusy(true);
    try {
      const created = await createManagerInventoryLocation(user.organization.id, accessToken, {
        name: locationName.trim(),
        type: route.params.kind,
      });
      setLocationName("");
      await load();
      setLocationId(created.id);
    } catch (cause) {
      setError(message(cause, "לא ניתן ליצור מיקום מלאי"));
    } finally {
      setBusy(false);
    }
  }

  async function addStock(): Promise<void> {
    if (!user || !accessToken || !locationId || !partId) {
      setError("יש לבחור מיקום וחלף.");
      return;
    }
    const count = Number(quantity);
    if (!Number.isInteger(count) || count <= 0) {
      setError("יש להזין כמות חיובית.");
      return;
    }
    setBusy(true);
    try {
      await addManagerInventoryItem(user.organization.id, accessToken, {
        locationId,
        partId,
        quantity: count,
      });
      setQuantity("1");
      await load();
    } catch (cause) {
      setError(message(cause, "לא ניתן לעדכן מלאי"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle>
          {route.params.kind === "service_van" ? "חלפים בניידות" : "מחסן חלפים"}
        </ScreenTitle>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Card>
          <Field
            value={locationName}
            onChangeText={setLocationName}
            placeholder={route.params.kind === "service_van" ? "שם ניידת" : "שם מחסן"}
          />
          <Button label="יצירת מיקום" loading={busy} onPress={() => void addLocation()} />
        </Card>

        <Text style={styles.fieldLabel}>מיקום מלאי</Text>
        <View style={styles.choices}>
          {locations.map((location) => (
            <Choice
              key={location.id}
              label={location.name}
              selected={locationId === location.id}
              onPress={() => setLocationId(location.id)}
            />
          ))}
        </View>

        <Text style={styles.fieldLabel}>חלף</Text>
        <View style={styles.choices}>
          {parts.map((part) => (
            <Choice
              key={part.id}
              label={`${part.name}${part.partNumber ? ` · ${part.partNumber}` : ""}`}
              selected={partId === part.id}
              onPress={() => setPartId(part.id)}
            />
          ))}
        </View>

        <Card>
          <Field value={quantity} onChangeText={setQuantity} placeholder="כמות" />
          <Button label="הוספה למלאי" loading={busy} onPress={() => void addStock()} />
        </Card>

        <Text style={styles.sectionTitle}>מלאי במיקום הנבחר</Text>
        {selectedLocation?.items.length ? (
          selectedLocation.items.map((item) => (
            <View key={item.id} style={styles.inventoryRow}>
              <View style={styles.flexOne}>
                <Text style={styles.rowTitle}>{item.part.name}</Text>
                <Text style={styles.rowMeta}>
                  {item.part.category?.name ?? ""} / {item.part.subcategory?.name ?? ""}
                </Text>
                {item.part.partNumber ? (
                  <Text style={styles.rowMeta}>{item.part.partNumber}</Text>
                ) : null}
              </View>
              <Text style={styles.quantity}>{item.quantity}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>אין מלאי במיקום הזה.</Text>
        )}
      </ScrollView>
    </Page>
  );
}

export function ManagerTechniciansScreen(_: TechniciansProps) {
  const { user, accessToken } = useAuth();
  const [technicians, setTechnicians] = useState<ManagerTechnicianSummary[]>([]);
  const [vans, setVans] = useState<InventoryLocationDetail[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !accessToken) return;
    try {
      const [people, overview] = await Promise.all([
        listManagerTechnicians(user.organization.id, accessToken),
        getManagerInventoryOverview(user.organization.id, accessToken),
      ]);
      setTechnicians(people);
      setVans(overview.vans);
      setError(null);
    } catch (cause) {
      setError(message(cause, "לא ניתן לטעון טכנאים וניידות"));
    }
  }, [accessToken, user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function assign(technicianId: string, vanId: string | null): Promise<void> {
    if (!user || !accessToken) return;
    setBusyId(technicianId);
    try {
      await assignManagerTechnicianVan(user.organization.id, technicianId, accessToken, vanId);
      await load();
    } catch (cause) {
      setError(message(cause, "לא ניתן לשייך ניידת"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle>עובדים וניידות</ScreenTitle>
        <ScreenSubtitle>לכל טכנאי ניתן לשייך ניידת שירות פעילה אחת.</ScreenSubtitle>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {technicians.map((technician) => (
          <Card key={technician.id}>
            <Text style={styles.rowTitle}>{technician.displayName}</Text>
            <Text style={styles.rowMeta}>
              ניידת נוכחית: {technician.assignedVan?.name ?? "לא משויכת"}
            </Text>
            <View style={styles.choices}>
              <Choice
                label="ללא ניידת"
                selected={!technician.assignedVan}
                onPress={() => void assign(technician.id, null)}
              />
              {vans.map((van) => (
                <Choice
                  key={van.id}
                  label={van.name}
                  selected={technician.assignedVan?.id === van.id}
                  onPress={() => void assign(technician.id, van.id)}
                />
              ))}
            </View>
            {busyId === technician.id ? <ActivityIndicator color={colors.primary} /> : null}
          </Card>
        ))}
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "transparent" },
  content: { padding: spacing.md, paddingBottom: 48, gap: spacing.md },
  homeContent: {
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: 72,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  managerBrandFrame: {
    width: 288,
    height: 74,
    alignItems: "center",
    justifyContent: "center",
  },
  managerWordmark: { width: 288, height: 74 },
  managerHeading: {
    color: colors.primary,
    fontFamily: typography.bold,
    fontSize: 27,
    textAlign: "center",
    writingDirection: "rtl",
    marginBottom: spacing.xl,
  },
  menuGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: spacing.md,
  },
  menuButton: {
    width: "48%",
    minHeight: 92,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.actionSurface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  menuButtonDanger: {
    backgroundColor: "rgba(143, 29, 29, 0.78)",
    borderColor: colors.text,
  },
  menuButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    minHeight: 30,
  },
  menuButtonText: {
    color: colors.primary,
    fontFamily: typography.bold,
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    writingDirection: "rtl",
  },
  menuButtonTextDanger: { color: colors.text },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  sectionGap: { gap: spacing.md, marginBottom: spacing.lg },
  sectionTitle: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: 19,
    textAlign: "right",
    writingDirection: "rtl",
  },
  fieldLabel: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: 15,
    textAlign: "right",
    writingDirection: "rtl",
  },
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    color: colors.text,
    fontFamily: typography.regular,
    paddingHorizontal: spacing.md,
    textAlign: "right",
    writingDirection: "rtl",
  },
  textArea: { minHeight: 110, textAlignVertical: "top", paddingTop: spacing.md },
  choices: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm },
  choice: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  choiceText: {
    color: colors.text,
    fontFamily: typography.regular,
    textAlign: "right",
    writingDirection: "rtl",
  },
  row: {
    backgroundColor: colors.bgPanel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  rowTop: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  rowNumber: { color: colors.primary, fontWeight: "800", fontSize: 13 },
  rowTitle: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: 17,
    textAlign: "right",
    writingDirection: "rtl",
  },
  rowMeta: {
    color: colors.textMuted,
    fontFamily: typography.regular,
    fontSize: 14,
    textAlign: "right",
    writingDirection: "rtl",
  },
  detailTitle: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: 22,
    textAlign: "right",
    writingDirection: "rtl",
  },
  body: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "right",
    writingDirection: "rtl",
  },
  error: {
    color: colors.error,
    fontFamily: typography.regular,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 20,
  },
  empty: {
    color: colors.textMuted,
    fontFamily: typography.regular,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  loader: { marginTop: 80 },
  catalogBlock: { marginTop: spacing.sm, gap: 4 },
  inventoryRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  flexOne: { flex: 1 },
  quantity: {
    color: colors.primary,
    fontSize: 22,
    fontFamily: typography.bold,
    minWidth: 44,
    textAlign: "center",
  },
});
