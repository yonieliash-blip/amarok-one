import { useEffect, useMemo, useState } from "react";
import { Button } from "@amarok-one/ui";
import type { ServiceCallLifecycleView, WorkReportEditorData } from "@amarok-one/types";
import { getApiErrorMessage } from "../lib/auth-errors";
import {
  getServiceCallWorkReportRequest,
  saveServiceCallWorkReportRequest,
} from "../lib/service-calls-api";

interface Props {
  organizationId: string;
  serviceCallId: string;
  accessToken: string;
  lifecycle: ServiceCallLifecycleView;
  canEdit: boolean;
}

export function ServiceCallWorkReportPanel({
  organizationId,
  serviceCallId,
  accessToken,
  lifecycle,
  canEdit,
}: Props) {
  const visits = lifecycle.visits;
  const [selectedVisitId, setSelectedVisitId] = useState(visits[0]?.id ?? "");
  const [editor, setEditor] = useState<WorkReportEditorData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workPerformed, setWorkPerformed] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [selectedParts, setSelectedParts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!visits.find((visit) => visit.id === selectedVisitId) && visits[0]) {
      setSelectedVisitId(visits[0].id);
    }
  }, [selectedVisitId, visits]);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      if (!selectedVisitId) {
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
          selectedVisitId,
          accessToken,
        );
        if (cancelled) return;
        setEditor(nextEditor);
        setWorkPerformed(nextEditor.report?.workPerformed ?? "");
        setCustomerName(nextEditor.report?.customerName ?? "");
        setSignatureData(nextEditor.report?.customerSignatureData ?? null);
        setSelectedParts(
          Object.fromEntries(nextEditor.report?.parts.map((part) => [part.inventoryItemId, part.quantity]) ?? []),
        );
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
  }, [accessToken, organizationId, selectedVisitId, serviceCallId]);

  const selectedPartRows = useMemo(
    () =>
      editor?.partGroups
        .flatMap((group) => group.items)
        .filter((item) => selectedParts[item.inventoryItemId] > 0)
        .map((item) => ({ item, quantity: selectedParts[item.inventoryItemId] })) ?? [],
    [editor, selectedParts],
  );

  async function handleSave(): Promise<void> {
    if (!selectedVisitId) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveServiceCallWorkReportRequest(
        organizationId,
        serviceCallId,
        selectedVisitId,
        accessToken,
        {
          workPerformed: workPerformed.trim() || null,
          customerName: customerName.trim() || null,
          customerSignatureData: signatureData,
          parts: Object.entries(selectedParts)
            .filter(([, quantity]) => quantity > 0)
            .map(([inventoryItemId, quantity]) => ({ inventoryItemId, quantity })),
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

  return (
    <section className="customer-detail-card customer-detail-card--wide">
      <div className="customers-page__header">
        <div>
          <h3>דוח עבודה</h3>
          <p className="customers-page__subtitle">עריכת חלקים וחתימת לקוח עבור הביקור שנבחר.</p>
        </div>
        {visits.length > 1 ? (
          <select value={selectedVisitId} onChange={(event) => setSelectedVisitId(event.target.value)}>
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
              <div className="customers-alert customers-alert--info">
                {signatureData ? "קיימת חתימה שמורה." : "טרם נשמרה חתימה."}
              </div>
            </div>
          </div>

          <div className="inventory-report-groups">
            {editor.partGroups.map((group) => (
              <div key={`${group.category.id}:${group.subcategory.id}`} className="customer-detail-card">
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
                {saving ? "שומר..." : "שמירת דוח עבודה"}
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <p className="customers-table__muted">אין ביקורים להצגת דוח עבודה.</p>
      )}
    </section>
  );
}
