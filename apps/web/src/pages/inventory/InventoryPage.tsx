import { useEffect, useMemo, useState } from "react";
import { Button } from "@amarok-one/ui";
import { useAuth } from "../../auth/useAuth";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { getApiErrorMessage } from "../../lib/auth-errors";
import {
  addInventoryItemRequest,
  createInventoryLocationRequest,
  getInventoryOverviewRequest,
} from "../../lib/inventory-api";
import { listPartsCatalogRequest } from "../../lib/parts-api";
import type { InventoryLocationDetail, InventoryOverview, PartCatalogCategoryGroup } from "@amarok-one/types";

const EMPTY_OVERVIEW: InventoryOverview = { vans: [], warehouses: [] };

function flattenParts(catalog: PartCatalogCategoryGroup[]) {
  return catalog.flatMap((category) =>
    category.subcategories.flatMap((subcategory) =>
      subcategory.parts.map((part) => ({
        ...part,
        categoryName: category.name,
        subcategoryName: subcategory.name,
      })),
    ),
  );
}

function InventorySection({
  title,
  locations,
}: {
  title: string;
  locations: InventoryLocationDetail[];
}) {
  return (
    <section className="customer-detail-card customer-detail-card--wide">
      <h3>{title}</h3>
      {locations.length === 0 ? (
        <p className="customers-table__muted">אין מיקומים להצגה.</p>
      ) : (
        locations.map((location) => (
          <div key={location.id} className="inventory-location">
            <div className="inventory-location__header">
              <strong>{location.name}</strong>
              {location.assignedUserName ? <span>משויך אל: {location.assignedUserName}</span> : null}
            </div>
            {location.items.length === 0 ? (
              <p className="customers-table__muted">אין מלאי במיקום זה.</p>
            ) : (
              <div className="customers-table-wrap">
                <table className="customers-table">
                  <thead>
                    <tr>
                      <th>קטגוריה</th>
                      <th>תת-קטגוריה</th>
                      <th>חלק</th>
                      <th>מספר חלק</th>
                      <th>כמות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {location.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.part.category?.name}</td>
                        <td>{item.part.subcategory?.name}</td>
                        <td>{item.part.name}</td>
                        <td>{item.part.partNumber ?? "—"}</td>
                        <td>{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}
    </section>
  );
}

export function InventoryPage() {
  const { user, accessToken } = useAuth();
  const [overview, setOverview] = useState<InventoryOverview>(EMPTY_OVERVIEW);
  const [catalog, setCatalog] = useState<PartCatalogCategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [locationName, setLocationName] = useState("");
  const [locationType, setLocationType] = useState<"service_van" | "central_warehouse">("service_van");
  const [stockLocationId, setStockLocationId] = useState("");
  const [stockPartId, setStockPartId] = useState("");
  const [stockQuantity, setStockQuantity] = useState("1");
  const [saving, setSaving] = useState<"location" | "stock" | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      if (!user || !accessToken) return;
      setLoading(true);
      setError(null);
      try {
        const [nextOverview, nextCatalog] = await Promise.all([
          getInventoryOverviewRequest(user.organization.id, accessToken),
          listPartsCatalogRequest(user.organization.id, accessToken),
        ]);
        if (cancelled) return;
        setOverview(nextOverview);
        setCatalog(nextCatalog);
        const locations = [...nextOverview.vans, ...nextOverview.warehouses];
        if (!stockLocationId && locations[0]) {
          setStockLocationId(locations[0].id);
        }
        const parts = flattenParts(nextCatalog);
        if (!stockPartId && parts[0]) {
          setStockPartId(parts[0].id);
        }
      } catch (cause) {
        if (!cancelled) setError(getApiErrorMessage(cause, "לא ניתן לטעון את המלאי."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, reloadToken, stockLocationId, stockPartId, user]);

  const allLocations = useMemo(
    () => [...overview.vans, ...overview.warehouses],
    [overview.vans, overview.warehouses],
  );
  const allParts = useMemo(() => flattenParts(catalog), [catalog]);

  async function reload(): Promise<void> {
    setReloadToken((value) => value + 1);
  }

  if (!user || !accessToken) return <LoadingState message="טוען..." />;
  if (loading) return <LoadingState message="טוען את המלאי..." />;
  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;

  return (
    <div className="customers-page">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">מלאי חלפים</p>
          <h2 className="customers-page__title">ניהול מלאי בניידות ובמחסן</h2>
          <p className="customers-page__subtitle">כל פריט מלאי מקושר לחלק מהקטלוג בלבד.</p>
        </div>
      </header>

      {success ? <div className="customers-alert customers-alert--success">{success}</div> : null}

      <section className="customer-form__section">
        <h3>יצירת מיקום מלאי</h3>
        <div className="customer-form__grid">
          <label className="customer-form__field">
            <span>שם מיקום</span>
            <input value={locationName} onChange={(event) => setLocationName(event.target.value)} />
          </label>
          <label className="customer-form__field">
            <span>סוג מיקום</span>
            <select
              value={locationType}
              onChange={(event) =>
                setLocationType(event.target.value as "service_van" | "central_warehouse")
              }
            >
              <option value="service_van">ניידת שירות</option>
              <option value="central_warehouse">מחסן מרכזי</option>
            </select>
          </label>
          <div className="customer-form__actions customer-form__field--wide">
            <Button
              onClick={() =>
                void (async () => {
                  setSaving("location");
                  setSuccess(null);
                  try {
                    await createInventoryLocationRequest(user.organization.id, accessToken, {
                      name: locationName,
                      type: locationType,
                    });
                    setLocationName("");
                    setSuccess("מיקום המלאי נוצר.");
                    await reload();
                  } catch (cause) {
                    setError(getApiErrorMessage(cause, "לא ניתן ליצור מיקום מלאי."));
                  } finally {
                    setSaving(null);
                  }
                })()
              }
              disabled={!locationName.trim()}
            >
              {saving === "location" ? "שומר..." : "הוספת מיקום"}
            </Button>
          </div>
        </div>
      </section>

      <section className="customer-form__section">
        <h3>הוספת מלאי</h3>
        <div className="customer-form__grid">
          <label className="customer-form__field">
            <span>מיקום</span>
            <select value={stockLocationId} onChange={(event) => setStockLocationId(event.target.value)}>
              {allLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <label className="customer-form__field">
            <span>חלק קטלוגי</span>
            <select value={stockPartId} onChange={(event) => setStockPartId(event.target.value)}>
              {allParts.map((part) => (
                <option key={part.id} value={part.id}>
                  {part.categoryName} / {part.subcategoryName} / {part.name}
                  {part.partNumber ? ` (${part.partNumber})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="customer-form__field">
            <span>כמות</span>
            <input
              type="number"
              min={1}
              value={stockQuantity}
              onChange={(event) => setStockQuantity(event.target.value)}
            />
          </label>
          <div className="customer-form__actions customer-form__field--wide">
            <Button
              variant="secondary"
              onClick={() =>
                void (async () => {
                  setSaving("stock");
                  setSuccess(null);
                  try {
                    await addInventoryItemRequest(user.organization.id, accessToken, {
                      locationId: stockLocationId,
                      partId: stockPartId,
                      quantity: Number(stockQuantity),
                    });
                    setSuccess("המלאי עודכן.");
                    await reload();
                  } catch (cause) {
                    setError(getApiErrorMessage(cause, "לא ניתן לעדכן את המלאי."));
                  } finally {
                    setSaving(null);
                  }
                })()
              }
              disabled={!stockLocationId || !stockPartId || Number(stockQuantity) <= 0}
            >
              {saving === "stock" ? "שומר..." : "הוספת כמות"}
            </Button>
          </div>
        </div>
      </section>

      <InventorySection title="חלפים בניידות" locations={overview.vans} />
      <InventorySection title="מחסן חלפים" locations={overview.warehouses} />
    </div>
  );
}
