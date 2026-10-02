import { useEffect, useMemo, useState } from "react";
import { getDefaultModulesForRole, MODULE_KEYS } from "@amarok-one/permissions";
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
  createMemberRequest,
  updateMemberBirthDateRequest,
  updateMemberModulesRequest,
  updateMemberStatusRequest,
  type MemberAccessSummary,
} from "../../lib/access-api";

type PageStatus = "loading" | "ready" | "error" | "saving";
type StaffRoleSlug = "technician" | "service-coordinator";

const MODULE_LABEL_KEYS: Record<MemberModuleKey, string> = {
  core: "moduleCore",
  service: "moduleService",
  inventory: "moduleInventory",
  finance: "moduleFinance",
  office: "moduleOffice",
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
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [changingMemberStatus, setChangingMemberStatus] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [savingBirthDate, setSavingBirthDate] = useState(false);
  const [newMember, setNewMember] = useState<{
    displayName: string;
    email: string;
    initialPassword: string;
    primaryRoleSlug: StaffRoleSlug;
    enabledModules: MemberModuleKey[];
    birthDate: string;
  }>({
    displayName: "",
    email: "",
    initialPassword: "",
    primaryRoleSlug: "technician",
    enabledModules: [...getDefaultModulesForRole("technician")] as MemberModuleKey[],
    birthDate: "",
  });

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
        setBirthDate(detail.birthDate ?? "");
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

  async function handleCreate(): Promise<void> {
    if (!user || !accessToken || newMember.enabledModules.length === 0) return;
    setCreating(true);
    setErrorMessage(null);
    setSaveMessage(null);
    try {
      const created = await createMemberRequest(user.organization.id, accessToken, newMember);
      setMembers((current) =>
        [...current, created].sort((a, b) => a.displayName.localeCompare(b.displayName)),
      );
      setSelectedMemberId(created.id);
      setCreateOpen(false);
      setNewMember({
        displayName: "",
        email: "",
        initialPassword: "",
        primaryRoleSlug: "technician",
        enabledModules: [...getDefaultModulesForRole("technician")] as MemberModuleKey[],
        birthDate: "",
      });
      setSaveMessage(t("memberAccess", "memberCreated"));
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  async function handleMemberStatus(): Promise<void> {
    if (!user || !accessToken || !selectedMember || selectedMember.isOrganizationOwner) return;
    const nextStatus = selectedMember.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const confirmation =
      nextStatus === "SUSPENDED"
        ? t("memberAccess", "suspendConfirm", { name: selectedMember.displayName })
        : t("memberAccess", "reactivateConfirm", { name: selectedMember.displayName });
    if (!window.confirm(confirmation)) return;

    setChangingMemberStatus(true);
    setErrorMessage(null);
    setSaveMessage(null);
    try {
      const result = await updateMemberStatusRequest(
        user.organization.id,
        selectedMember.id,
        accessToken,
        nextStatus,
      );
      setMembers((current) =>
        current.map((member) =>
          member.id === result.id
            ? {
                ...member,
                status: result.status,
                permissionsVersion: result.permissionsVersion,
              }
            : member,
        ),
      );
      setSaveMessage(
        nextStatus === "SUSPENDED"
          ? t("memberAccess", "memberSuspended")
          : t("memberAccess", "memberReactivated"),
      );
      await refreshSession();
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setChangingMemberStatus(false);
    }
  }

  async function handleBirthDateSave(): Promise<void> {
    if (!user || !accessToken || !selectedMember) return;
    setSavingBirthDate(true);
    setErrorMessage(null);
    setSaveMessage(null);
    try {
      const result = await updateMemberBirthDateRequest(
        user.organization.id,
        selectedMember.id,
        accessToken,
        birthDate || null,
      );
      setMembers((current) =>
        current.map((member) =>
          member.id === result.id ? { ...member, birthDate: result.birthDate } : member,
        ),
      );
      setSaveMessage(t("memberAccess", "birthdaySaved"));
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setSavingBirthDate(false);
    }
  }

  return (
    <div className="customers-page">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">{t("memberAccess", "eyebrow")}</p>
          <h2 className="customers-page__title">{t("memberAccess", "title")}</h2>
          <p className="customers-page__subtitle">{t("memberAccess", "subtitle")}</p>
        </div>
        <Button type="button" onClick={() => setCreateOpen((value) => !value)}>
          {createOpen ? t("memberAccess", "cancelCreate") : t("memberAccess", "addMember")}
        </Button>
      </header>

      {createOpen ? (
        <section className="member-access__create" aria-labelledby="member-create-title">
          <h3 id="member-create-title">{t("memberAccess", "addMember")}</h3>
          <div className="member-access__create-grid">
            <label>
              <span>{t("memberAccess", "name")}</span>
              <input
                value={newMember.displayName}
                onChange={(event) =>
                  setNewMember((current) => ({ ...current, displayName: event.target.value }))
                }
              />
            </label>
            <label>
              <span>{t("memberAccess", "email")}</span>
              <input
                type="email"
                dir="ltr"
                value={newMember.email}
                onChange={(event) =>
                  setNewMember((current) => ({ ...current, email: event.target.value }))
                }
              />
            </label>
            <label>
              <span>{t("memberAccess", "initialPassword")}</span>
              <input
                type="password"
                dir="ltr"
                value={newMember.initialPassword}
                onChange={(event) =>
                  setNewMember((current) => ({ ...current, initialPassword: event.target.value }))
                }
              />
            </label>
            <label>
              <span>{t("memberAccess", "role")}</span>
              <select
                value={newMember.primaryRoleSlug}
                onChange={(event) => {
                  const primaryRoleSlug = event.target.value as StaffRoleSlug;
                  setNewMember((current) => ({
                    ...current,
                    primaryRoleSlug,
                    enabledModules: [
                      ...getDefaultModulesForRole(primaryRoleSlug),
                    ] as MemberModuleKey[],
                  }));
                }}
              >
                <option value="technician">{t("memberAccess", "roleTechnician")}</option>
                <option value="service-coordinator">{t("memberAccess", "roleCoordinator")}</option>
              </select>
            </label>
            <label>
              <span>{t("memberAccess", "birthday")}</span>
              <input
                type="date"
                value={newMember.birthDate}
                onChange={(event) =>
                  setNewMember((current) => ({ ...current, birthDate: event.target.value }))
                }
              />
            </label>
          </div>
          <fieldset className="member-access__modules">
            <legend>{t("memberAccess", "enabledModules")}</legend>
            {MODULE_KEYS.map((moduleKey) => (
              <label key={moduleKey} className="member-access__module">
                <input
                  type="checkbox"
                  checked={newMember.enabledModules.includes(moduleKey)}
                  onChange={(event) =>
                    setNewMember((current) => ({
                      ...current,
                      enabledModules: event.target.checked
                        ? [...new Set([...current.enabledModules, moduleKey])]
                        : current.enabledModules.filter((key) => key !== moduleKey),
                    }))
                  }
                />
                <span>
                  <strong>{t("memberAccess", MODULE_LABEL_KEYS[moduleKey])}</strong>
                </span>
              </label>
            ))}
          </fieldset>
          <Button
            type="button"
            disabled={
              creating ||
              newMember.displayName.trim().length < 2 ||
              !newMember.email ||
              newMember.initialPassword.length < 12 ||
              newMember.enabledModules.length === 0
            }
            onClick={() => void handleCreate()}
          >
            {creating ? t("common", "loading") : t("memberAccess", "createMember")}
          </Button>
        </section>
      ) : null}

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
                    <span className="member-access__member-birthday">
                      {member.birthDate
                        ? `${t("memberAccess", "birthday")}: ${new Intl.DateTimeFormat("he-IL", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          }).format(new Date(`${member.birthDate}T00:00:00`))}`
                        : `${t("memberAccess", "birthday")}: ${t("memberAccess", "birthdayNotSet")}`}
                    </span>
                    <span
                      className={`member-access__member-status member-access__member-status--${member.status.toLowerCase()}`}
                    >
                      {member.status === "ACTIVE"
                        ? t("memberAccess", "statusActive")
                        : t("memberAccess", "statusSuspended")}
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
                <div className="member-access__birthday-editor">
                  <label className="member-access__birthday-field">
                    <span>{t("memberAccess", "birthday")}</span>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(event) => setBirthDate(event.target.value)}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={savingBirthDate}
                    onClick={() => void handleBirthDateSave()}
                  >
                    {savingBirthDate ? t("common", "loading") : t("memberAccess", "saveBirthday")}
                  </Button>
                </div>
                <ul>
                  {MODULE_KEYS.map((moduleKey) => (
                    <li key={moduleKey}>{t("memberAccess", MODULE_LABEL_KEYS[moduleKey])}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <>
                <h2>{selectedMember.displayName}</h2>
                <div className="member-access__birthday-editor">
                  <label className="member-access__birthday-field">
                    <span>{t("memberAccess", "birthday")}</span>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(event) => setBirthDate(event.target.value)}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={savingBirthDate}
                    onClick={() => void handleBirthDateSave()}
                  >
                    {savingBirthDate ? t("common", "loading") : t("memberAccess", "saveBirthday")}
                  </Button>
                </div>
                {selectedMember.status === "SUSPENDED" ? (
                  <p className="member-access__suspended-note">
                    {t("memberAccess", "suspendedHint")}
                  </p>
                ) : null}
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
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={changingMemberStatus || status === "saving"}
                    onClick={() => void handleMemberStatus()}
                  >
                    {changingMemberStatus
                      ? t("common", "loading")
                      : selectedMember.status === "ACTIVE"
                        ? t("memberAccess", "suspendMember")
                        : t("memberAccess", "reactivateMember")}
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
