import { useTranslation } from "../i18n/useTranslation";

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingState({ message, fullScreen = false }: LoadingStateProps) {
  const { t } = useTranslation();
  const className = fullScreen ? "state state--fullscreen" : "state";

  return (
    <div className={className} role="status" aria-live="polite">
      <div className="state__spinner" aria-hidden="true" />
      <p className="state__message">{message ?? t("common", "loading")}</p>
    </div>
  );
}
