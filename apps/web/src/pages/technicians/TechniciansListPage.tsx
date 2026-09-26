import { useEffect, useState } from "react";
import { Badge } from "@amarok-one/ui";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { useAuth } from "../../auth/useAuth";
import { getAuthErrorMessage } from "../../lib/auth-errors";
import { getInventoryOverviewRequest } from "../../lib/inventory-api";
import {
  assignTechnicianServiceVanRequest,
  listTechniciansRequest,
  type TechnicianSummary,
} from "../../lib/technicians-api";
import { useTranslation } from "../../i18n/useTranslation";

export function TechniciansListPage() {
  const { user, accessToken } = useAuth();
  const { t } = useTranslation();
  const [technicians, setTechnicians] = useState<TechnicianSummary[]>([]);
  const [vanOptions, setVanOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedVanByTechnician, setSelectedVanByTechnician] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      if (!user || !accessToken) return;
      setLoading(true);
      setError(null);
      try {
        const [rows, overview] = await Promise.all([
          listTechniciansRequest(user.organization.id, accessToken),
          getInventoryOverviewRequest(user.organization.id, accessToken),
        ]);
        if (!cancelled) {
          setTechnicians(rows);
          setVanOptions(overview.vans.map((van) => ({ id: van.id, name: van.name })));
          setSelectedVanByTechnician(
            Object.fromEntries(rows.map((row) => [row.id, row.assignedVan?.id ?? ""])),
          );
        }
      } catch (cause) {
        if (!cancelled) setError(getAuthErrorMessage(cause));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, retryKey, user]);

  if (loading) return <LoadingState message={t("technicians", "loading")} />;
  if (error) return <ErrorState message={error} onRetry={() => setRetryKey((key) => key + 1)} />;

  return (
    <div className="customers-page">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">{t("technicians", "eyebrow")}</p>
          <h2 className="customers-page__title">{t("technicians", "title")}</h2>
          <p className="customers-page__subtitle">
            {t("technicians", "subtitle", { organization: user?.organization.name ?? "" })}
          </p>
        </div>
      </header>
      {technicians.length === 0 ? (
        <EmptyState
          title={t("technicians", "emptyTitle")}
          message={t("technicians", "emptyMessage")}
        />
      ) : (
        <div className="customers-table-wrap">
          <table className="customers-table">
            <thead>
              <tr>
                <th>{t("technicians", "name")}</th>
                <th>{t("technicians", "email")}</th>
                <th>{t("technicians", "status")}</th>
                <th>ניידת שירות</th>
              </tr>
            </thead>
            <tbody>
              {technicians.map((technician) => (
                <tr key={technician.id}>
                  <td>
                    <strong>{technician.displayName}</strong>
                  </td>
                  <td>{technician.email}</td>
                  <td>
                    <Badge variant={technician.isActive ? "success" : "default"}>
                      {technician.isActive
                        ? t("technicians", "active")
                        : t("technicians", "inactive")}
                    </Badge>
                  </td>
                  <td>
                    <div className="inventory-assign">
                      <select
                        value={selectedVanByTechnician[technician.id] ?? ""}
                        onChange={(event) =>
                          setSelectedVanByTechnician((current) => ({
                            ...current,
                            [technician.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">ללא ניידת</option>
                        {vanOptions.map((van) => (
                          <option key={van.id} value={van.id}>
                            {van.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="customers-table__link inventory-assign__button"
                        disabled={savingId === technician.id}
                        onClick={() =>
                          void (async () => {
                            if (!user || !accessToken) return;
                            setSavingId(technician.id);
                            setError(null);
                            try {
                              await assignTechnicianServiceVanRequest(
                                user.organization.id,
                                technician.id,
                                accessToken,
                                selectedVanByTechnician[technician.id] || null,
                              );
                              setRetryKey((key) => key + 1);
                            } catch (cause) {
                              setError(getAuthErrorMessage(cause));
                            } finally {
                              setSavingId(null);
                            }
                          })()
                        }
                      >
                        {savingId === technician.id ? "שומר..." : "שמירה"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
