import { useEffect, useMemo, useState } from "react";
import { Button } from "@amarok-one/ui";
import type {
  RepairOrderAttachment,
  RepairOrderPhotoCategory,
  ServiceCall,
  ServiceCallLifecycleView,
  WorkReportEditorData,
} from "@amarok-one/types";
import { getApiErrorMessage } from "../lib/auth-errors";
import {
  getServiceCallWorkReportRequest,
  saveServiceCallWorkReportRequest,
  uploadServiceCallWorkReportPhotoRequest,
} from "../lib/service-calls-api";
import { printRepairOrder } from "../lib/repair-order-pdf";

interface Props {
  organizationId: string;
  serviceCallId: string;
  serviceCall: ServiceCall;
  accessToken: string;
  lifecycle: ServiceCallLifecycleView;
  canEdit: boolean;
}

type SignaturePoint = { x: number; y: number };
type SignatureStroke = SignaturePoint[];
type ManualPart = { name: string; partNumber: string; quantity: number };

const photoCategories: Array<{ id: RepairOrderPhotoCategory; label: string }> = [
  { id: "equipment", label: "צילום הכלי" },
  { id: "hour_meter", label: "צילום שעון שעות" },
  { id: "license_plate", label: "צילום מספר רישוי" },
  { id: "fault", label: "צילום התקלה" },
  { id: "old_parts", label: "צילום חלפים ישנים" },
  { id: "new_parts_installed", label: "צילום חלפים חדשים על הכלי" },
  { id: "old_and_new_parts", label: "חלק ישן ליד חלק חדש מחוץ לכלי" },
];

function parseSignatureData(value: string | null): SignatureStroke[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(Array.isArray)
      .map((stroke) =>
        stroke.filter(
          (point): point is SignaturePoint =>
            typeof point === "object" &&
            point !== null &&
            typeof (point as SignaturePoint).x === "number" &&
            typeof (point as SignaturePoint).y === "number",
        ),
      )
      .filter((stroke) => stroke.length > 0);
  } catch {
    return [];
  }
}

function SignaturePad({
  value,
  disabled,
  onChange,
}: {
  value: string | null;
  disabled: boolean;
  onChange: (value: string | null) => void;
}) {
  const [strokes, setStrokes] = useState<SignatureStroke[]>(() => parseSignatureData(value));
  const [activeStroke, setActiveStroke] = useState<SignatureStroke | null>(null);

  function pointFromEvent(event: React.PointerEvent<SVGSVGElement>): SignaturePoint {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1000,
      y: ((event.clientY - rect.top) / rect.height) * 320,
    };
  }

  function commit(next: SignatureStroke[]): void {
    setStrokes(next);
    onChange(next.length > 0 ? JSON.stringify(next) : null);
  }

  return (
    <div className="repair-order-signature">
      <svg
        className="repair-order-signature__canvas"
        viewBox="0 0 1000 320"
        role="img"
        aria-label="אזור חתימה דיגיטלית"
        onPointerDown={(event) => {
          if (disabled) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          setActiveStroke([pointFromEvent(event)]);
        }}
        onPointerMove={(event) => {
          if (disabled || !activeStroke) return;
          setActiveStroke([...activeStroke, pointFromEvent(event)]);
        }}
        onPointerUp={() => {
          if (!activeStroke || disabled) return;
          commit([...strokes, activeStroke]);
          setActiveStroke(null);
        }}
      >
        {[...strokes, ...(activeStroke ? [activeStroke] : [])].map((stroke, index) => (
          <polyline
            key={`${index}-${stroke.length}`}
            points={stroke.map((point) => `${point.x},${point.y}`).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      {!disabled ? (
        <Button type="button" variant="secondary" onClick={() => commit([])}>
          ניקוי חתימה
        </Button>
      ) : null}
    </div>
  );
}

export function ServiceCallWorkReportPanel({
  organizationId,
  serviceCallId,
  serviceCall,
  accessToken,
  lifecycle,
  canEdit,
}: Props) {
  const visits = lifecycle.visits;
  const [selectedVisitIdState, setSelectedVisitIdState] = useState(visits[0]?.id ?? "");
  const selectedVisitId =
    visits.find((visit) => visit.id === selectedVisitIdState)?.id ?? visits[0]?.id ?? "";
  const [editor, setEditor] = useState<WorkReportEditorData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workPerformed, setWorkPerformed] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [selectedParts, setSelectedParts] = useState<Record<string, number>>({});
  const [manualParts, setManualParts] = useState<ManualPart[]>([]);
  const [attachments, setAttachments] = useState<RepairOrderAttachment[]>([]);
  const [uploadingCategory, setUploadingCategory] = useState<RepairOrderPhotoCategory | null>(null);
  const activeVisitId = visits.some((visit) => visit.id === selectedVisitId)
    ? selectedVisitId
    : (visits[0]?.id ?? "");

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      if (!activeVisitId) {
        setLoading(false);
        setEditor(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const nextEditor = await getServiceCallWorkReportRequest(
          organizationId,
          serviceCallId,
          activeVisitId,
          accessToken,
        );
        if (cancelled) return;
        setEditor(nextEditor);
        setWorkPerformed(nextEditor.report?.workPerformed ?? "");
        setCustomerName(nextEditor.report?.customerName ?? "");
        setSignatureData(nextEditor.report?.customerSignatureData ?? null);
        setSelectedParts(
          Object.fromEntries(
            nextEditor.report?.parts.map((part) => [part.inventoryItemId, part.quantity]) ?? [],
          ),
        );
        setManualParts(
          nextEditor.report?.parts
            .filter((part) => part.manualName)
            .map((part) => ({
              name: part.manualName ?? "",
              partNumber: part.manualPartNumber ?? "",
              quantity: part.quantity,
            })) ?? [],
        );
        setAttachments(nextEditor.report?.attachments ?? []);
      } catch (cause) {
        if (!cancelled) setError(getApiErrorMessage(cause, "לא ניתן לטעון את דוח העבודה."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, activeVisitId, organizationId, serviceCallId]);

  const selectedPartRows = useMemo(
    () =>
      editor?.partGroups
        .flatMap((group) => group.items)
        .filter((item) => (selectedParts[item.inventoryItemId] ?? 0) > 0)
        .map((item) => ({ item, quantity: selectedParts[item.inventoryItemId] ?? 0 })) ?? [],
    [editor, selectedParts],
  );

  async function handleSave(): Promise<void> {
    if (!activeVisitId) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveServiceCallWorkReportRequest(
        organizationId,
        serviceCallId,
        activeVisitId,
        accessToken,
        {
          workPerformed: workPerformed.trim() || null,
          customerName: customerName.trim() || null,
          customerSignatureData: signatureData,
          parts: [
            ...Object.entries(selectedParts)
              .filter(([, quantity]) => quantity > 0)
              .map(([inventoryItemId, quantity]) => ({ inventoryItemId, quantity })),
            ...manualParts
              .filter((part) => part.name.trim() && part.quantity > 0)
              .map((part) => ({
                manualName: part.name.trim(),
                manualPartNumber: part.partNumber.trim() || null,
                quantity: part.quantity,
              })),
          ],
        },
      );
      const nextEditor: WorkReportEditorData = {
        assignedVan: editor!.assignedVan,
        partGroups: editor!.partGroups,
        report: saved,
      };
      setEditor(nextEditor);
    } catch (cause) {
      setError(getApiErrorMessage(cause, "לא ניתן לשמור את דוח העבודה."));
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(category: RepairOrderPhotoCategory, file?: File): Promise<void> {
    if (!file || !activeVisitId || !editor?.report) return;
    setUploadingCategory(category);
    setError(null);
    try {
      const attachment = await uploadServiceCallWorkReportPhotoRequest(
        organizationId,
        serviceCallId,
        activeVisitId,
        accessToken,
        category,
        file,
      );
      setAttachments((current) => [...current, attachment]);
    } catch (cause) {
      setError(getApiErrorMessage(cause, "לא ניתן להעלות את הצילום."));
    } finally {
      setUploadingCategory(null);
    }
  }

  return (
    <section className="customer-detail-card customer-detail-card--wide">
      <div className="customers-page__header">
        <div>
          <h3>הזמנת תיקון</h3>
          <p className="customers-page__subtitle">
            הזמנת תיקון, חלפים וחתימת לקוח עבור הביקור שנבחר.
          </p>
        </div>
        {visits.length > 1 ? (
          <select
            value={activeVisitId}
            onChange={(event) => setSelectedVisitIdState(event.target.value)}
          >
            {visits.map((visit) => (
              <option key={visit.id} value={visit.id}>
                ביקור #{visit.sequence}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {error ? <div className="customers-alert customers-alert--error">{error}</div> : null}
      {loading ? (
        <p className="customers-table__muted">טוען דוח עבודה...</p>
      ) : editor ? (
        <>
          <div className="repair-order-summary">
            <div>
              <span>פרטי הכלי</span>
              <strong>
                {serviceCall.equipmentModel ??
                  serviceCall.equipment?.model ??
                  serviceCall.equipment?.name ??
                  "לא נמסר"}
              </strong>
              {serviceCall.equipmentLicensePlate ? (
                <small dir="ltr">רישוי: {serviceCall.equipmentLicensePlate}</small>
              ) : null}
              {serviceCall.equipmentChassisNumber ? (
                <small dir="ltr">שלדה: {serviceCall.equipmentChassisNumber}</small>
              ) : null}
            </div>
            <div>
              <span>פירוט ותיאור התקלה</span>
              <strong>{serviceCall.title}</strong>
              {serviceCall.description ? <small>{serviceCall.description}</small> : null}
            </div>
          </div>
          <div className="customer-form__grid">
            <label className="customer-form__field customer-form__field--wide">
              <span>עבודה שבוצעה</span>
              <textarea
                rows={4}
                value={workPerformed}
                onChange={(event) => setWorkPerformed(event.target.value)}
                disabled={!canEdit}
              />
            </label>
            <label className="customer-form__field">
              <span>שם הלקוח החותם</span>
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                disabled={!canEdit}
              />
            </label>
            <div className="customer-form__field">
              <span>חתימה</span>
              <SignaturePad
                key={signatureData ?? "empty"}
                value={signatureData}
                disabled={!canEdit}
                onChange={setSignatureData}
              />
            </div>
          </div>

          {editor.assignedVan ? (
            <p className="customers-table__muted">חלפים מניידת: {editor.assignedVan.name}</p>
          ) : (
            <p className="customers-table__muted">אין ניידת משויכת; אפשר להוסיף חלפים ידניים.</p>
          )}

          <div className="inventory-report-groups">
            {editor.partGroups.map((group) => (
              <div
                key={`${group.category.id}:${group.subcategory.id}`}
                className="customer-detail-card"
              >
                <h3>
                  {group.category.name} / {group.subcategory.name}
                </h3>
                <div className="inventory-report-groups__items">
                  {group.items.map((option) => (
                    <label key={option.inventoryItemId} className="inventory-report-groups__item">
                      <span>
                        {option.inventoryItem.part.name}
                        {option.inventoryItem.part.partNumber
                          ? ` (${option.inventoryItem.part.partNumber})`
                          : ""}
                        {" · "}מלאי זמין: {option.availableQuantity}
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={selectedParts[option.inventoryItemId] ?? 0}
                        disabled={!canEdit}
                        onChange={(event) =>
                          setSelectedParts((current) => ({
                            ...current,
                            [option.inventoryItemId]: Number(event.target.value),
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <section className="repair-order-manual-parts">
            <div className="customers-page__header">
              <div>
                <h3>חלפים שהורכבו ידנית</h3>
                <p className="customers-page__subtitle">הוספת חלק שלא נמצא במאגר או בניידת.</p>
              </div>
              {canEdit ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setManualParts((parts) => [...parts, { name: "", partNumber: "", quantity: 1 }])
                  }
                >
                  הוספת חלק ידני
                </Button>
              ) : null}
            </div>
            {manualParts.map((part, index) => (
              <div className="repair-order-manual-parts__row" key={index}>
                <input
                  aria-label="שם החלק"
                  placeholder="שם החלק"
                  value={part.name}
                  disabled={!canEdit}
                  onChange={(event) =>
                    setManualParts((parts) =>
                      parts.map((entry, rowIndex) =>
                        rowIndex === index ? { ...entry, name: event.target.value } : entry,
                      ),
                    )
                  }
                />
                <input
                  aria-label="מק״ט"
                  placeholder="מק״ט (אופציונלי)"
                  value={part.partNumber}
                  disabled={!canEdit}
                  onChange={(event) =>
                    setManualParts((parts) =>
                      parts.map((entry, rowIndex) =>
                        rowIndex === index ? { ...entry, partNumber: event.target.value } : entry,
                      ),
                    )
                  }
                />
                <input
                  aria-label="כמות"
                  type="number"
                  min={1}
                  value={part.quantity}
                  disabled={!canEdit}
                  onChange={(event) =>
                    setManualParts((parts) =>
                      parts.map((entry, rowIndex) =>
                        rowIndex === index
                          ? { ...entry, quantity: Number(event.target.value) }
                          : entry,
                      ),
                    )
                  }
                />
                {canEdit ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      setManualParts((parts) => parts.filter((_, rowIndex) => rowIndex !== index))
                    }
                  >
                    הסרה
                  </Button>
                ) : null}
              </div>
            ))}
          </section>

          <section className="repair-order-photos">
            <div>
              <h3>העלאת תמונות</h3>
              <p className="customers-page__subtitle">
                כל הצילומים אופציונליים. יש לשמור את ההזמנה לפני ההעלאה.
              </p>
            </div>
            <div className="repair-order-photos__grid">
              {photoCategories.map((photo) => {
                const count = attachments.filter(
                  (attachment) => attachment.category === photo.id,
                ).length;
                return (
                  <label key={photo.id} className="repair-order-photos__field">
                    <span>{photo.label}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic"
                      disabled={!canEdit || !editor.report || uploadingCategory !== null}
                      onChange={(event) =>
                        void handlePhotoUpload(photo.id, event.target.files?.[0])
                      }
                    />
                    <small>
                      {uploadingCategory === photo.id
                        ? "מעלה..."
                        : count
                          ? `${count} צילום/ים הועלו`
                          : "לא חובה"}
                    </small>
                  </label>
                );
              })}
            </div>
          </section>

          {selectedPartRows.length > 0 ? (
            <div className="customers-table-wrap">
              <table className="customers-table">
                <thead>
                  <tr>
                    <th>חלק</th>
                    <th>מספר חלק</th>
                    <th>כמות מדווחת</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPartRows.map(({ item, quantity }) => (
                    <tr key={item.inventoryItemId}>
                      <td>{item.inventoryItem.part.name}</td>
                      <td>{item.inventoryItem.part.partNumber ?? "—"}</td>
                      <td>{quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {canEdit ? (
            <div className="customer-form__actions">
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? "שומר..." : "שמירת הזמנת תיקון"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => printRepairOrder(serviceCall, editor.report)}
              >
                הפקה / שיתוף PDF
              </Button>
            </div>
          ) : (
            <div className="customer-form__actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => printRepairOrder(serviceCall, editor.report)}
              >
                הפקה / שיתוף PDF
              </Button>
            </div>
          )}
        </>
      ) : (
        <p className="customers-table__muted">אין ביקורים להצגת דוח עבודה.</p>
      )}
    </section>
  );
}
