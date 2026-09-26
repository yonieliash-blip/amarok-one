import { useEffect, useMemo, useState } from "react";
import { Button } from "@amarok-one/ui";
import { useAuth } from "../../auth/useAuth";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { getApiErrorMessage } from "../../lib/auth-errors";
import {
  createCatalogPartRequest,
  createPartCategoryRequest,
  createPartSubcategoryRequest,
  listPartsCatalogRequest,
} from "../../lib/parts-api";
import type { PartCatalogCategoryGroup } from "@amarok-one/types";

export function PartsCatalogPage() {
  const { user, accessToken } = useAuth();
  const [catalog, setCatalog] = useState<PartCatalogCategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"category" | "subcategory" | "part" | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [subcategoryCategoryId, setSubcategoryCategoryId] = useState("");
  const [subcategoryName, setSubcategoryName] = useState("");
  const [partCategoryId, setPartCategoryId] = useState("");
  const [partSubcategoryId, setPartSubcategoryId] = useState("");
  const [partName, setPartName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      if (!user || !accessToken) return;
      setLoading(true);
      setError(null);
      try {
        const nextCatalog = await listPartsCatalogRequest(user.organization.id, accessToken);
        if (cancelled) return;
        setCatalog(nextCatalog);
        if (!subcategoryCategoryId && nextCatalog[0]) {
          setSubcategoryCategoryId(nextCatalog[0].id);
        }
        if (!partCategoryId && nextCatalog[0]) {
          setPartCategoryId(nextCatalog[0].id);
          setPartSubcategoryId(nextCatalog[0].subcategories[0]?.id ?? "");
        }
      } catch (cause) {
        if (!cancelled) setError(getApiErrorMessage(cause, "לא ניתן לטעון את קטלוג החלפים."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, partCategoryId, reloadToken, subcategoryCategoryId, user]);

  const selectedPartCategory = useMemo(
    () => catalog.find((category) => category.id === partCategoryId) ?? catalog[0],
    [catalog, partCategoryId],
  );

  async function reload(): Promise<void> {
    setReloadToken((value) => value + 1);
  }

  if (!user || !accessToken) return <LoadingState message="טוען..." />;
  if (loading) return <LoadingState message="טוען את קטלוג החלפים..." />;
  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;

  return (
    <div className="customers-page">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">קטלוג חלפים</p>
          <h2 className="customers-page__title">ניהול היררכיית חלפים</h2>
          <p className="customers-page__subtitle">
            יצירת קטגוריות, תתי-קטגוריות וחלקי קטלוג עבור המלאי והדוחות.
          </p>
        </div>
      </header>

      {error ? <div className="customers-alert customers-alert--error">{error}</div> : null}
      {success ? <div className="customers-alert customers-alert--success">{success}</div> : null}

      <section className="customer-form__section">
        <h3>יצירת קטלוג</h3>
        <div className="customer-form__grid">
          <label className="customer-form__field">
            <span>קטגוריה חדשה</span>
            <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} />
          </label>
          <div className="customer-form__actions">
            <Button
              variant="primary"
              onClick={() =>
                void (async () => {
                  setSaving("category");
                  setSuccess(null);
                  setError(null);
                  try {
                    await createPartCategoryRequest(user.organization.id, accessToken, {
                      name: categoryName,
                    });
                    setCategoryName("");
                    setSuccess("הקטגוריה נוספה.");
                    await reload();
                  } catch (cause) {
                    setError(getApiErrorMessage(cause, "לא ניתן ליצור קטגוריה."));
                  } finally {
                    setSaving(null);
                  }
                })()
              }
              disabled={!categoryName.trim()}
            >
              {saving === "category" ? "שומר..." : "הוספת קטגוריה"}
            </Button>
          </div>

          <label className="customer-form__field">
            <span>קטגוריה</span>
            <select
              value={subcategoryCategoryId}
              onChange={(event) => setSubcategoryCategoryId(event.target.value)}
            >
              {catalog.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="customer-form__field">
            <span>תת-קטגוריה חדשה</span>
            <input
              value={subcategoryName}
              onChange={(event) => setSubcategoryName(event.target.value)}
            />
          </label>
          <div className="customer-form__actions customer-form__field--wide">
            <Button
              variant="secondary"
              onClick={() =>
                void (async () => {
                  setSaving("subcategory");
                  setSuccess(null);
                  setError(null);
                  try {
                    await createPartSubcategoryRequest(user.organization.id, accessToken, {
                      categoryId: subcategoryCategoryId,
                      name: subcategoryName,
                    });
                    setSubcategoryName("");
                    setSuccess("תת-הקטגוריה נוספה.");
                    await reload();
                  } catch (cause) {
                    setError(getApiErrorMessage(cause, "לא ניתן ליצור תת-קטגוריה."));
                  } finally {
                    setSaving(null);
                  }
                })()
              }
              disabled={!subcategoryCategoryId || !subcategoryName.trim()}
            >
              {saving === "subcategory" ? "שומר..." : "הוספת תת-קטגוריה"}
            </Button>
          </div>

          <label className="customer-form__field">
            <span>קטגוריה</span>
            <select
              value={partCategoryId}
              onChange={(event) => {
                const nextCategoryId = event.target.value;
                setPartCategoryId(nextCategoryId);
                const nextCategory = catalog.find((category) => category.id === nextCategoryId);
                setPartSubcategoryId(nextCategory?.subcategories[0]?.id ?? "");
              }}
            >
              {catalog.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="customer-form__field">
            <span>תת-קטגוריה</span>
            <select
              value={partSubcategoryId}
              onChange={(event) => setPartSubcategoryId(event.target.value)}
            >
              {selectedPartCategory?.subcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>
                  {subcategory.name}
                </option>
              ))}
            </select>
          </label>
          <label className="customer-form__field">
            <span>שם חלק</span>
            <input value={partName} onChange={(event) => setPartName(event.target.value)} />
          </label>
          <label className="customer-form__field">
            <span>מק״ט / מספר חלק</span>
            <input value={partNumber} onChange={(event) => setPartNumber(event.target.value)} />
          </label>
          <div className="customer-form__actions customer-form__field--wide">
            <Button
              variant="primary"
              onClick={() =>
                void (async () => {
                  setSaving("part");
                  setSuccess(null);
                  setError(null);
                  try {
                    await createCatalogPartRequest(user.organization.id, accessToken, {
                      categoryId: partCategoryId,
                      subcategoryId: partSubcategoryId,
                      name: partName,
                      partNumber: partNumber.trim() || undefined,
                    });
                    setPartName("");
                    setPartNumber("");
                    setSuccess("החלק נוסף לקטלוג.");
                    await reload();
                  } catch (cause) {
                    setError(getApiErrorMessage(cause, "לא ניתן ליצור חלק קטלוגי."));
                  } finally {
                    setSaving(null);
                  }
                })()
              }
              disabled={!partCategoryId || !partSubcategoryId || !partName.trim()}
            >
              {saving === "part" ? "שומר..." : "הוספת חלק"}
            </Button>
          </div>
        </div>
      </section>

      {catalog.map((category) => (
        <section key={category.id} className="customer-detail-card">
          <h3>{category.name}</h3>
          <div className="customer-detail-grid">
            {category.subcategories.map((subcategory) => (
              <div key={subcategory.id} className="customer-detail-card">
                <h3>{subcategory.name}</h3>
                {subcategory.parts.length === 0 ? (
                  <p className="customers-table__muted">עדיין אין חלקים בתת-הקטגוריה.</p>
                ) : (
                  <ul className="parts-catalog__list">
                    {subcategory.parts.map((part) => (
                      <li key={part.id}>
                        <strong>{part.name}</strong>
                        <span>{part.partNumber ? ` · ${part.partNumber}` : " · ללא מספר חלק"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
