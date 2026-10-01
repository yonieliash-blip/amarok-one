import { useEffect, useState } from "react";
import { Wrench } from "lucide-react";
import type { MyVanInventory } from "@amarok-one/types";
import { useAuth } from "../../auth/useAuth";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { useTranslation } from "../../i18n/useTranslation";
import { getApiErrorMessage } from "../../lib/auth-errors";
import { getMyVanInventoryRequest } from "../../lib/inventory-api";

const EMPTY_MY_VAN: MyVanInventory = {};

export function MyEquipmentPage() {
  const { user, accessToken } = useAuth();
  const { t } = useTranslation();
  const [inventory, setInventory] = useState<MyVanInventory>(EMPTY_MY_VAN);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      if (!user || !accessToken) return;
      setLoading(true);
      setError(null);
      try {
        const result = await getMyVanInventoryRequest(user.organization.id, accessToken);
        if (!cancelled) setInventory(result);
      } catch (cause) {
        if (!cancelled) setError(getApiErrorMessage(cause, t("myEquipmentPage", "loadError")));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, reloadKey, t, user]);

  if (!user || !accessToken || loading) {
    return <LoadingState message={t("myEquipmentPage", "loading")} />;
  }
  if (error) {
    return <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} />;
  }
  if (!inventory.van) {
    return (
      <EmptyState
        title={t("myEquipmentPage", "noVanTitle")}
        message={t("myEquipmentPage", "noVanMessage")}
        icon="🚐"
      />
    );
  }

  return (
    <div className="customers-page my-equipment-page">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">{t("myEquipmentPage", "eyebrow")}</p>
          <h2 className="customers-page__title">{inventory.van.name}</h2>
          <p className="customers-page__subtitle">{t("myEquipmentPage", "subtitle")}</p>
        </div>
        <div className="my-equipment-page__van-icon" aria-hidden="true">
          <Wrench size={24} />
        </div>
      </header>

      {inventory.van.items.length === 0 ? (
        <EmptyState title={t("myEquipmentPage", "empty")} message="" />
      ) : (
        <ul className="my-equipment-page__items">
          {inventory.van.items.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.part.name}</strong>
                <span>
                  {item.part.category?.name ?? t("common", "emptyValue")}
                  {item.part.subcategory?.name ? ` · ${item.part.subcategory.name}` : ""}
                </span>
              </div>
              <div className="my-equipment-page__item-meta">
                <span>
                  {t("myEquipmentPage", "partNumber")}: {item.part.partNumber ?? "—"}
                </span>
                <strong>
                  {t("myEquipmentPage", "quantity")}: {item.quantity}
                </strong>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
