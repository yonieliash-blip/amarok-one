import { EmptyState } from "../components/EmptyState";
import { useTranslation } from "../i18n/useTranslation";

interface ModulePlaceholderPageProps {
  titleKey:
    | "technicians"
    | "calendar"
    | "mySchedule"
    | "inventory"
    | "purchaseOrders"
    | "parts"
    | "accounting"
    | "reports"
    | "myEquipment";
}

export function ModulePlaceholderPage({ titleKey }: ModulePlaceholderPageProps) {
  const { t } = useTranslation();

  return (
    <div className="page">
      <EmptyState
        title={t("titles", titleKey)}
        message={t("modules", "comingSoonMessage")}
        icon="⏳"
      />
    </div>
  );
}
