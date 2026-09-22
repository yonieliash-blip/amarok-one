import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { WorkReport, WorkReportPartCategory } from "@amarok-one/types";
import { useAuth } from "../auth/AuthContext";
import { Button, Card, Eyebrow, ScreenTitle } from "../components/ui";
import { colors, spacing } from "../theme";
import type { RootStackParamList } from "../navigation/types";
import {
  getWorkReport,
  listWorkReportParts,
  saveWorkReport,
  uploadWorkReportMedia,
} from "../api/work-reports";
import { isApiRequestError } from "../api/client";

type Props = NativeStackScreenProps<RootStackParamList, "WorkReport">;
type Item = { partId: string; quantity: number };

export function WorkReportScreen({ route }: Props) {
  const { serviceCallId, visitId, title } = route.params;
  const { user, accessToken } = useAuth();
  const [report, setReport] = useState<WorkReport | null>(null);
  const [catalog, setCatalog] = useState<WorkReportPartCategory[]>([]);
  const [description, setDescription] = useState("");
  const [representative, setRepresentative] = useState("");
  const [role, setRole] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [signature, setSignature] = useState<number[][][]>([]);
  const [media, setMedia] = useState<
    { uri: string; type: "image" | "video"; name: string; mimeType: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partsPickerOpen, setPartsPickerOpen] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const activeStroke = useRef<number | null>(null);
  useEffect(() => {
    if (!user || !accessToken) return;
    void Promise.all([
      getWorkReport(user.organization.id, serviceCallId, visitId, accessToken),
      listWorkReportParts(user.organization.id, accessToken),
    ])
      .then(([r, c]) => {
        setReport(r);
        setCatalog(c);
        setDescription(r.workDescription);
        setRepresentative(r.customerRepresentative ?? "");
        setRole(r.customerRepresentativeRole ?? "");
        setItems(r.parts.map((item) => ({ partId: item.partId, quantity: item.quantity })));
        setSignature(r.signatureStrokes ?? []);
      })
      .catch((e) => setError(isApiRequestError(e) ? e.message : "לא ניתן לטעון דוח עבודה"));
  }, [user, accessToken, serviceCallId, visitId]);
  const selected = useMemo(() => new Map(items.map((x) => [x.partId, x.quantity])), [items]);
  function changePart(partId: string, delta: number) {
    setItems((current) => {
      const found = current.find((x) => x.partId === partId);
      if (!found && delta > 0) return [...current, { partId, quantity: 1 }];
      if (!found) return current;
      const quantity = Math.max(0, found.quantity + delta);
      return quantity
        ? current.map((x) => (x.partId === partId ? { ...x, quantity } : x))
        : current.filter((x) => x.partId !== partId);
    });
  }
  function signaturePoint(event: {
    nativeEvent: { locationX: number; locationY: number };
  }): number[] {
    return [Math.round(event.nativeEvent.locationX), Math.round(event.nativeEvent.locationY)];
  }
  const signatureResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        const point = signaturePoint(event);
        setSignature((current) => {
          activeStroke.current = current.length;
          return [...current, [point]];
        });
      },
      onPanResponderMove: (event) => {
        const index = activeStroke.current;
        if (index === null) return;
        const point = signaturePoint(event);
        setSignature((current) =>
          current.map((stroke, strokeIndex) =>
            strokeIndex === index ? [...stroke, point] : stroke,
          ),
        );
      },
      onPanResponderRelease: () => {
        activeStroke.current = null;
      },
      onPanResponderTerminate: () => {
        activeStroke.current = null;
      },
    }),
  ).current;
  function signatureLine(from: number[], to: number[]) {
    const fromX = from[0] ?? 0;
    const fromY = from[1] ?? 0;
    const toX = to[0] ?? fromX;
    const toY = to[1] ?? fromY;
    const deltaX = toX - fromX;
    const deltaY = toY - fromY;
    return {
      left: fromX,
      top: fromY,
      width: Math.sqrt(deltaX ** 2 + deltaY ** 2),
      transform: [{ rotate: `${(Math.atan2(deltaY, deltaX) * 180) / Math.PI}deg` }],
    };
  }
  async function addMedia() {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return setError("נדרשת הרשאה לתמונות ולסרטונים.");
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.7,
    });
    const a = r.assets?.[0];
    if (!r.canceled && a?.uri)
      setMedia((x) => [
        ...x,
        {
          uri: a.uri,
          type: a.type === "video" ? "video" : "image",
          name: a.fileName ?? `media-${Date.now()}`,
          mimeType: a.mimeType ?? (a.type === "video" ? "video/mp4" : "image/jpeg"),
        },
      ]);
  }
  async function save() {
    if (!user || !accessToken || !report) return;
    if (!description.trim()) return setError("יש למלא פירוט עבודה.");
    setBusy(true);
    setError(null);
    try {
      const next = await saveWorkReport(user.organization.id, report.id, accessToken, {
        workDescription: description,
        customerRepresentative: representative || undefined,
        customerRepresentativeRole: role || undefined,
        signatureStrokes: signature.length ? signature : undefined,
        parts: items,
      });
      for (const file of media)
        await uploadWorkReportMedia(
          user.organization.id,
          report.id,
          accessToken,
          file.uri,
          file.name,
          file.mimeType,
        );
      setReport(next);
      setMedia([]);
      Alert.alert("נשמר", `דוח ${next.reportNumber} נשמר ומופיע למנהל.`);
    } catch (e) {
      setError(isApiRequestError(e) ? e.message : "לא ניתן לשמור את הדוח");
    } finally {
      setBusy(false);
    }
  }
  if (!report)
    return (
      <View style={styles.center}>
        <Text>{error ?? "טוען דוח עבודה…"}</Text>
      </View>
    );
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Eyebrow>דוח עבודה · {report.reportNumber}</Eyebrow>
      <ScreenTitle>{title}</ScreenTitle>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Card>
        <Text style={styles.title}>פירוט העבודה *</Text>
        <TextInput
          multiline
          value={description}
          onChangeText={setDescription}
          style={styles.input}
          placeholder="תאר את התקלה, העבודה שבוצעה והפעולה הבאה…"
          placeholderTextColor={colors.textMuted}
        />
      </Card>
      <Card>
        <Text style={styles.title}>חלקים</Text>
        <Text style={styles.hint}>בחר חלקים מתוך תיבת הבחירה והגדר כמות לכל חלק.</Text>
        {catalog.length === 0 ? (
          <Text style={styles.hint}>עדיין אין חלקים ברשימה. המנהל יכול להוסיף אותם במערכת.</Text>
        ) : (
          <>
            <Button
              label="בחירת חלקים"
              variant="secondary"
              onPress={() => setPartsPickerOpen(true)}
            />
            {items.length ? (
              catalog
                .flatMap((category) => category.parts)
                .filter((part) => selected.has(part.id))
                .map((part) => (
                  <View key={part.id} style={styles.part}>
                    <View>
                      <Text style={styles.partName}>{part.name}</Text>
                      <Text style={styles.hint}>
                        {part.partNumber ? `${part.partNumber} · ` : ""}
                        {part.unit}
                      </Text>
                    </View>
                    <View style={styles.counter}>
                      <TouchableOpacity onPress={() => changePart(part.id, -1)}>
                        <Text style={styles.counterButton}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.quantity}>{selected.get(part.id) ?? 0}</Text>
                      <TouchableOpacity onPress={() => changePart(part.id, 1)}>
                        <Text style={styles.counterButton}>＋</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
            ) : (
              <Text style={styles.hint}>לא נבחרו חלקים.</Text>
            )}
          </>
        )}
      </Card>
      <Card>
        <Text style={styles.title}>תמונות או סרטונים</Text>
        <Text style={styles.hint}>לא חובה. עד 50MB לכל קובץ.</Text>
        <Button label="הוספת תמונה או סרטון" variant="secondary" onPress={() => void addMedia()} />
        {media.map((m) => (
          <View key={m.uri} style={styles.media}>
            <Text>
              {m.type === "video" ? "סרטון" : "תמונה"}: {m.name}
            </Text>
            {m.type === "image" ? <Image source={{ uri: m.uri }} style={styles.thumbnail} /> : null}
          </View>
        ))}
      </Card>
      <Card>
        <Text style={styles.title}>אישור לקוח וחתימה</Text>
        <TextInput
          value={representative}
          onChangeText={setRepresentative}
          style={styles.shortInput}
          placeholder="שם נציג הלקוח (לא חובה)"
          placeholderTextColor={colors.textMuted}
        />
        <TextInput
          value={role}
          onChangeText={setRole}
          style={styles.shortInput}
          placeholder="תפקיד / הערה (לא חובה)"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.hint}>החתימה תיפתח בחלון קבוע, ללא גלילת המסך בזמן החתימה.</Text>
        <Button
          label={signature.length ? "עריכת חתימה" : "חתימת לקוח"}
          variant="secondary"
          onPress={() => setSignatureModalOpen(true)}
        />
        {signature.length ? (
          <Text style={styles.signatureSaved}>החתימה מוכנה לשמירה בדוח.</Text>
        ) : null}
      </Card>
      <Button
        label={`שמירת דוח ${report.reportNumber}`}
        loading={busy}
        onPress={() => void save()}
      />
      <Text style={styles.hint}>
        הדוח והכמויות ניתנים לעריכה גם לאחר השמירה על ידי מנהל השירות.
      </Text>
      <Modal
        visible={partsPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPartsPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPartsPickerOpen(false)}>
          <Pressable style={styles.partsModal} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.title}>בחירת חלקים</Text>
            <ScrollView>
              {catalog.map((category) => (
                <View key={category.id}>
                  <Text style={styles.category}>{category.name}</Text>
                  {category.parts.map((part) => {
                    const isSelected = selected.has(part.id);
                    return (
                      <Pressable
                        key={part.id}
                        style={[styles.partOption, isSelected && styles.partOptionSelected]}
                        onPress={() =>
                          changePart(part.id, isSelected ? -selected.get(part.id)! : 1)
                        }
                      >
                        <View>
                          <Text style={styles.partName}>{part.name}</Text>
                          <Text style={styles.hint}>
                            {part.partNumber ? `${part.partNumber} · ` : ""}
                            {part.unit}
                          </Text>
                        </View>
                        <Text style={styles.optionMark}>{isSelected ? "✓" : "+"}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
            <Button label="סיום בחירה" onPress={() => setPartsPickerOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={signatureModalOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setSignatureModalOpen(false)}
      >
        <View style={styles.signatureModal}>
          <Text style={styles.signatureModalTitle}>חתימת לקוח</Text>
          <Text style={styles.hint}>חתום בתוך המסגרת. המסך נשאר קבוע בזמן החתימה.</Text>
          <View style={styles.signatureCanvas} {...signatureResponder.panHandlers}>
            {signature.flatMap((stroke, strokeIndex) =>
              stroke
                .slice(1)
                .map((point, pointIndex) => (
                  <View
                    key={`${strokeIndex}-${pointIndex}`}
                    style={[styles.signatureLine, signatureLine(stroke[pointIndex]!, point)]}
                  />
                )),
            )}
          </View>
          <View style={styles.signatureActions}>
            <Button label="ניקוי" variant="secondary" onPress={() => setSignature([])} />
            <Button label="אישור חתימה" onPress={() => setSignatureModalOpen(false)} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
    textAlign: "right",
    writingDirection: "rtl",
  },
  input: {
    minHeight: 130,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
    textAlignVertical: "top",
  },
  shortInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 8,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 10,
    textAlign: "right",
    writingDirection: "rtl",
  },
  error: { color: colors.error, fontWeight: "700", textAlign: "right", writingDirection: "rtl" },
  category: {
    fontWeight: "800",
    color: colors.primary,
    marginTop: 10,
    textAlign: "right",
    writingDirection: "rtl",
  },
  part: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  partName: { color: colors.text, fontWeight: "600", textAlign: "right", writingDirection: "rtl" },
  counter: { flexDirection: "row", alignItems: "center", gap: 14 },
  counterButton: { fontSize: 24, color: colors.primary, fontWeight: "800" },
  quantity: { color: colors.text, fontWeight: "800", minWidth: 18, textAlign: "center" },
  media: { marginTop: 10 },
  thumbnail: { width: 90, height: 70, borderRadius: 8, marginTop: 4, alignSelf: "flex-end" },
  signatureCanvas: {
    flex: 1,
    minHeight: 360,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginVertical: 10,
    overflow: "hidden",
    position: "relative",
  },
  signatureLine: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.text,
    position: "absolute",
    transformOrigin: "left center",
  },
  signatureModal: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl * 2,
    backgroundColor: colors.bg,
    gap: spacing.md,
  },
  signatureModalTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    writingDirection: "rtl",
  },
  signatureActions: { gap: spacing.sm },
  signatureSaved: {
    color: colors.primary,
    fontWeight: "700",
    textAlign: "right",
    writingDirection: "rtl",
  },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.62)" },
  partsModal: {
    maxHeight: "78%",
    backgroundColor: colors.bgPanel,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  partOption: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginTop: 8,
  },
  partOptionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionMark: { fontSize: 24, fontWeight: "800", color: colors.primary },
});
