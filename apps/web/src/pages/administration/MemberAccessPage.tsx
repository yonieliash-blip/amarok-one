import { useEffect, useMemo, useState } from "react";
import { MODULE_KEYS } from "@amarok-one/permissions";
import type { MemberModuleKey } from "@amarok-one/types";
import { Button } from "@amarok-one/ui";
import { useAuth } from "../../auth/useAuth";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { useTranslation } from "../../i18n/useTranslation";
import { getAuthErrorMessage } from "../../lib/auth-errors";
import {
  getMemberAccessRequest,
  listMemberAccessRequest,
  updateMemberModulesRequest,
  type MemberAccessSummary,
} from "../../lib/access-api";

type PageStatus = "loading" | "ready" | "error" | "saving";

const MODULE_LABEL_KEYS: Record<MemberModuleKey, string> = {
  core: "moduleCore",
  service: "moduleService",
  inventory: "moduleInventory",
  finance: "moduleFinance",
  administration: "moduleAdministration",
};

export function MemberAccessPage() {
  const { user, accessToken, refreshSession } = useAuth();
  const { t } = useTranslation();
  const [status, setStatus] = useState<PageStatus>("loading");
  const [members, setMembers] = useState<MemberAccessSummary[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [enabledModules, setEnabledModules] = useState<MemberModuleKey[]>([]);
  const [availableModules, setAvailableModules] = useState<
    Array<{ key: MemberModuleKey; name: string; description: string }>
  >([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [membersRetryKey, setMembersRetryKey] = useState(0);

  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedMemberId) ?? null,
    [members, selectedMemberId],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadMembers(): Promise<void> {
      if (!user || !accessToken) {
        return;
      }

      setStatus("loading");
      setErrorMessage(null);

      try {
        const rows = await listMemberAccessRequest(user.organization.id, accessToken);
        if (!cancelled) {
          setMembers(rows);
          setStatus("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(getAuthErrorMessage(error));
          setStatus("error");
        }
      }
    }

    void loadMembers();

    return () => {
      cancelled = true;
    };
  }, [accessToken, membersRetryKey, user]);

  useEffect(() => {
    let cancelled = false;

    async function loadDetail(): Promise<void> {
      if (!user || !accessToken || !selectedMemberId) {
        return;
      }

      try {
        const detail = await getMemberAccessRequest(
          user.organization.id,
          selectedMemberId,
          accessToken,
        );
        if (cancelled) {
          return;
        }
        setEnabledModules(detail.enabledModules);
        setAvailableModules(detail.availableModules);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(getAuthErrorMessage(error));
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [accessToken, selectedMemberId, user]);

  if (!user?.isOrganizationOwner) {
    return <ErrorState message={t("memberAccess", "ownerOnly")} />;
  }

  if (status === "loading" && members.length === 0) {
    return <LoadingState message={t("memberAccess", "loadingMembers")} />;
  }

  if (status === "error" && members.length === 0) {
    return (
      <ErrorState
        message={errorMessage ?? t("common", "somethingWentWrong")}
        onRetry={() => setMembersRetryKey((key) => key + 1)}
      />
    );
  }

  async function handleSave(): Promise<void> {
    if (!user || !accessToken || !selectedMemberId || !selectedMember) {
      return;
    }

    if (selectedMember.isOrganizationOwner) {
      setSaveMessage(t("memberAccess", "ownerProtected"));
      return;
    }

    setStatus("saving");
    setSaveMessage(null);
    setErrorMessage(null);

    try {
      const result = await updateMemberModulesRequest(
        user.organization.id,
        selectedMemberId,
        accessToken,
        enabledModules,
      );

      setMembers((current) =>
        current.map((member) =>
          member.id === selectedMemberId
            ? {
                ...member,
                enabledModules: result.enabledModules,
                permissionsVersion: result.permissionsVersion,
              }
            : member,
        ),
      );
      setSaveMessage(t("memberAccess", "saved"));
      setStatus("ready");
      await refreshSession();
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
      setStatus("ready");
    }
  }

  function toggleModule(moduleKey: MemberModuleKey, checked: boolean): void {
    setEnabledModules((current) => {
      if (checked) {
        return current.includes(moduleKey) ? current : [...current, moduleKey];
      }
      const next = current.filter((key) => key !== moduleKey);
      return next.length > 0 ? next : current;
    });
  }

  return (
    <div className="customers-page">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">{t("memberAccess", "eyebrow")}</p>
          <h2 className="customers-page__title">{t("memberAccess", "title")}</h2>
          <p className="customers-page__subtitle">{t("memberAccess", "subtitle")}</p>
        </div>
      </header>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {saveMessage ? <p className="form-success">{saveMessage}</p> : null}

      {members.length === 0 ? (
        <EmptyState title={t("memberAccess", "noMembers")} message="" />
      ) : (
        <div className="member-access">
          <section className="member-access__list" aria-label={t("memberAccess", "membersList")}>
            <ul className="member-access__members">
              {members.map((member) => (
                <li key={member.id}>
                  <button
                    type="button"
                    className={`member-access__member${
                      selectedMemberId === member.id ? " member-access__member--active" : ""
                    }`}
                    onClick={() => {
                      setSelectedMemberId(member.id);
                      setSaveMessage(null);
                    }}
                  >
                    <span className="member-access__member-name">{member.displayName}</span>
                    <span className="member-access__member-meta">
                      {member.primaryRole.name}
                      {member.isOrganizationOwner ? ` · ${t("memberAccess", "ownerBadge")}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="member-access__editor" aria-label={t("memberAccess", "moduleEditor")}>
            {!selectedMember ? (
              <EmptyState
                title={t("memberAccess", "selectMember")}
                message={t("memberAccess", "moduleHint")}
              />
            ) : selectedMember.isOrganizationOwner ? (
              <div className="member-access__owner-note">
                <h2>{selectedMember.displayName}</h2>
                <p>{t("memberAccess", "ownerFullAccess")}</p>
                <ul>
                  {MODULE_KEYS.map((moduleKey) => (
                    <li key={moduleKey}>{t("memberAccess", MODULE_LABEL_KEYS[moduleKey])}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <>
                <h2>{selectedMember.displayName}</h2>
                <p className="member-access__hint">{t("memberAccess", "moduleHint")}</p>
                <fieldset className="member-access__modules">
                  <legend>{t("memberAccess", "enabledModules")}</legend>
                  {(availableModules.length > 0
                    ? availableModules
                    : MODULE_KEYS.map((key) => ({ key, name: key, description: "" }))
                  ).map((module) => (
                    <label key={module.key} className="member-access__module">
                      <input
                        type="checkbox"
                        checked={enabledModules.includes(module.key)}
                        disabled={status === "saving"}
                        onChange={(event) => toggleModule(module.key, event.target.checked)}
                      />
                      <span>
                        <strong>{t("memberAccess", MODULE_LABEL_KEYS[module.key])}</strong>
                        {module.description ? (
                          <span className="member-access__module-desc">{module.description}</span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </fieldset>
                <div className="customers-page__actions">
                  <Button
                    type="button"
                    disabled={status === "saving" || enabledModules.length === 0}
                    onClick={() => void handleSave()}
                  >
                    {status === "saving"
                      ? t("common", "loading")
                      : t("memberAccess", "saveModules")}
                  </Button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
