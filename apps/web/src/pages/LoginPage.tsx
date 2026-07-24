import { useEffect, useRef, useState } from "react";
import { Button, Logo } from "@amarok-one/ui";
import { getAuthErrorMessage } from "../lib/auth-errors";
import { useAuth } from "../auth/useAuth";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { useTranslation } from "../i18n/useTranslation";

export function LoginPage() {
  const { login, status } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("admin@demo.amarok.one");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    passwordRef.current?.focus();
  }, []);

  if (status === "loading") {
    return <LoadingState fullScreen />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login({ email: email.trim(), password });
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-page__panel">
        <div className="login-page__brand">
          <Logo label={t("common", "appName")} />
          <p className="login-page__tagline">{t("common", "brandTagline")}</p>
        </div>

        {error ? (
          <ErrorState
            title={t("auth", "signInFailed")}
            message={error}
            onRetry={() => setError(null)}
          />
        ) : (
          <form className="login-form" onSubmit={(event) => void handleSubmit(event)}>
            <div className="login-form__field">
              <label htmlFor="email">{t("auth", "email")}</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                dir="ltr"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={submitting}
                placeholder={t("auth", "emailPlaceholder")}
              />
            </div>

            <div className="login-form__field">
              <label htmlFor="password">{t("auth", "password")}</label>
              <input
                ref={passwordRef}
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={submitting}
                placeholder={t("auth", "passwordPlaceholder")}
              />
            </div>

            <Button
              variant="primary"
              type="submit"
              disabled={submitting}
              className="login-form__submit"
            >
              {submitting ? t("auth", "signingIn") : t("auth", "signIn")}
            </Button>
          </form>
        )}

        <p className="login-page__hint">{t("auth", "loginHint")}</p>
      </div>
    </div>
  );
}
