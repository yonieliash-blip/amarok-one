import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DirectConversationSummary, DirectMessageMember } from "@amarok-one/types";
import { Button } from "@amarok-one/ui";
import { hasPermission, permissionSlugsFromCarrier, PERMISSIONS } from "@amarok-one/permissions";
import { Search } from "lucide-react";
import { useAuth } from "../../auth/useAuth";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { formatDate } from "../../i18n/format";
import { useTranslation } from "../../i18n/useTranslation";
import { getApiErrorMessage } from "../../lib/auth-errors";
import {
  listConversationMessagesRequest,
  listConversationsRequest,
  listMessageMembersRequest,
  markConversationReadRequest,
  deleteConversationRequest,
  sendDirectMessageRequest,
} from "../../lib/messages-api";

type PageStatus = "loading" | "ready" | "error";

function initial(name: string): string {
  return name.trim().slice(0, 1).toLocaleUpperCase("he");
}

export function MessagesPage() {
  const { user, accessToken } = useAuth();
  const { t, locale } = useTranslation();
  const [status, setStatus] = useState<PageStatus>("loading");
  const [members, setMembers] = useState<DirectMessageMember[]>([]);
  const [conversations, setConversations] = useState<DirectConversationSummary[]>([]);
  const [selectedMember, setSelectedMember] = useState<DirectMessageMember | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    Awaited<ReturnType<typeof listConversationMessagesRequest>>
  >([]);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const canManageMessages = hasPermission(
    permissionSlugsFromCarrier(user),
    PERMISSIONS.MESSAGES_MANAGE,
  );

  const refreshLists = useCallback(async (): Promise<void> => {
    if (!user || !accessToken) return;
    const [nextMembers, nextConversations] = await Promise.all([
      listMessageMembersRequest(user.organization.id, accessToken),
      listConversationsRequest(user.organization.id, accessToken),
    ]);
    setMembers(nextMembers);
    setConversations(nextConversations);
  }, [accessToken, user]);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      if (!user || !accessToken) return;
      setStatus("loading");
      setError(null);
      try {
        const [nextMembers, nextConversations] = await Promise.all([
          listMessageMembersRequest(user.organization.id, accessToken),
          listConversationsRequest(user.organization.id, accessToken),
        ]);
        if (cancelled) return;
        setMembers(nextMembers);
        setConversations(nextConversations);
        setStatus("ready");
      } catch (cause) {
        if (cancelled) return;
        setError(getApiErrorMessage(cause, t("messages", "loadError")));
        setStatus("error");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, t, user]);

  useEffect(() => {
    let cancelled = false;
    async function loadMessages(): Promise<void> {
      if (!user || !accessToken || !selectedConversationId) {
        setMessages([]);
        return;
      }
      try {
        const nextMessages = await listConversationMessagesRequest(
          user.organization.id,
          selectedConversationId,
          accessToken,
        );
        await markConversationReadRequest(
          user.organization.id,
          selectedConversationId,
          accessToken,
        );
        if (!cancelled) {
          setMessages(nextMessages);
          await refreshLists();
        }
      } catch (cause) {
        if (!cancelled) setError(getApiErrorMessage(cause, t("messages", "loadError")));
      }
    }
    void loadMessages();
    const interval = window.setInterval(() => void loadMessages(), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [accessToken, refreshLists, selectedConversationId, t, user]);

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    thread.scrollTop = thread.scrollHeight;
  }, [messages, selectedConversationId]);

  const visibleMembers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("he");
    if (!term) return members;
    return members.filter((member) =>
      [member.displayName, member.role.name, member.email]
        .join(" ")
        .toLocaleLowerCase("he")
        .includes(term),
    );
  }, [members, search]);

  function selectMember(member: DirectMessageMember): void {
    setSelectedMember(member);
    setError(null);
    setDraft("");
    const conversation = conversations.find((entry) => entry.member.id === member.id);
    setSelectedConversationId(conversation?.id ?? null);
  }

  async function handleSend(): Promise<void> {
    if (!user || !accessToken || !selectedMember || !draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      const result = await sendDirectMessageRequest(
        user.organization.id,
        selectedMember.id,
        draft.trim(),
        accessToken,
      );
      setDraft("");
      setSelectedConversationId(result.conversationId);
      const nextMessages = await listConversationMessagesRequest(
        user.organization.id,
        result.conversationId,
        accessToken,
      );
      setMessages(nextMessages);
      // The conversation list has no message preview. Avoid a second list refresh here so
      // sending a message only updates the fixed-height thread, not the surrounding page.
    } catch (cause) {
      setError(getApiErrorMessage(cause, t("messages", "sendError")));
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteConversation(): Promise<void> {
    if (!user || !accessToken || !selectedConversationId || !canManageMessages) return;
    if (!window.confirm("למחוק את הצ׳אט? הוא יוסר מהמערכת, וההודעות יישמרו לתיעוד.")) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteConversationRequest(user.organization.id, selectedConversationId, accessToken);
      setConversations((current) =>
        current.filter((conversation) => conversation.id !== selectedConversationId),
      );
      setSelectedConversationId(null);
      setMessages([]);
    } catch (cause) {
      setError(getApiErrorMessage(cause, "לא ניתן למחוק את הצ׳אט."));
    } finally {
      setDeleting(false);
    }
  }

  if (!user || !accessToken || status === "loading") {
    return <LoadingState message={t("messages", "loading")} />;
  }
  if (status === "error") {
    return (
      <ErrorState
        message={error ?? t("messages", "loadError")}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="messages-page">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">{t("messages", "eyebrow")}</p>
          <h2 className="customers-page__title">{t("messages", "title")}</h2>
        </div>
      </header>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="messages-page__layout">
        <aside className="messages-page__people" aria-label={t("messages", "employees")}>
          <label className="messages-page__search">
            <Search size={18} aria-hidden="true" />
            <span className="visually-hidden">{t("messages", "searchEmployees")}</span>
            <input
              type="search"
              value={search}
              placeholder={t("messages", "searchEmployees")}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          {visibleMembers.length ? (
            <ul className="messages-page__member-list">
              {visibleMembers.map((member) => {
                const conversation = conversations.find((entry) => entry.member.id === member.id);
                return (
                  <li key={member.id}>
                    <button
                      type="button"
                      className={`messages-page__member${selectedMember?.id === member.id ? " messages-page__member--selected" : ""}`}
                      onClick={() => selectMember(member)}
                    >
                      <span className="messages-page__avatar" aria-hidden="true">
                        {initial(member.displayName)}
                      </span>
                      <span className="messages-page__member-copy">
                        <span className="messages-page__member-name">{member.displayName}</span>
                        <span className="messages-page__member-role">{member.role.name}</span>
                      </span>
                      {conversation?.unreadCount ? (
                        <span
                          className="messages-page__unread"
                          aria-label={t("messages", "unread")}
                        >
                          {conversation.unreadCount}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="messages-page__empty">{t("messages", "noEmployees")}</p>
          )}
        </aside>
        <section className="messages-page__conversation" aria-live="polite">
          {selectedMember ? (
            <>
              <header className="messages-page__conversation-header">
                <span
                  className="messages-page__avatar messages-page__avatar--recipient"
                  aria-hidden="true"
                >
                  {initial(selectedMember.displayName)}
                </span>
                <div>
                  <h3>{selectedMember.displayName}</h3>
                  <p>{selectedMember.role.name}</p>
                </div>
                {canManageMessages && selectedConversationId ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={deleting}
                    onClick={() => void handleDeleteConversation()}
                  >
                    {deleting ? "מוחק…" : "מחיקת צ׳אט"}
                  </Button>
                ) : null}
              </header>
              <div className="messages-page__thread-shell">
                <div className="messages-page__thread" ref={threadRef}>
                  {messages.length ? (
                    messages.map((message) => {
                      const mine = message.senderId === user.id;
                      const senderName = mine ? user.displayName : selectedMember.displayName;
                      return (
                        <div
                          key={message.id}
                          className={`messages-page__message-row${mine ? " messages-page__message-row--mine" : ""}`}
                        >
                          <span
                            className={`messages-page__message-avatar${mine ? " messages-page__message-avatar--sender" : " messages-page__message-avatar--recipient"}`}
                            aria-hidden="true"
                          >
                            {initial(senderName)}
                          </span>
                          <article
                            className={`messages-page__message${mine ? " messages-page__message--mine" : ""}`}
                          >
                            <p>{message.body}</p>
                            <time dateTime={message.createdAt}>
                              {formatDate(message.createdAt, locale, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </time>
                          </article>
                        </div>
                      );
                    })
                  ) : (
                    <p className="messages-page__empty">{t("messages", "noConversation")}</p>
                  )}
                </div>
              </div>
              <form
                className="messages-page__composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSend();
                }}
              >
                <textarea
                  rows={2}
                  value={draft}
                  placeholder={t("messages", "writeMessage")}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={2000}
                />
                <Button type="submit" disabled={sending || !draft.trim()}>
                  {sending ? t("messages", "sending") : t("messages", "send")}
                </Button>
              </form>
            </>
          ) : (
            <p className="messages-page__empty messages-page__empty--center">
              {t("messages", "chooseEmployee")}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
