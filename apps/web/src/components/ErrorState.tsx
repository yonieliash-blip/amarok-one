import { Button } from "@amarok-one/ui";
import { useTranslation } from "../i18n/useTranslation";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  fullScreen?: boolean;
}

export function ErrorState({ title, message, onRetry, fullScreen = false }: ErrorStateProps) {
  const { t } = useTranslation();
  const className = fullScreen ? "state state--error state--fullscreen" : "state state--error";

  return (
    <div className={className} role="alert">
      <h2 className="state__title">{title ?? t("common", "somethingWentWrong")}</h2>
      <p className="state__message">{message}</p>
      {onRetry ? (
        <Button variant="primary" onClick={onRetry}>
          {t("common", "tryAgain")}
        </Button>
      ) : null}
    </div>
  );
}
