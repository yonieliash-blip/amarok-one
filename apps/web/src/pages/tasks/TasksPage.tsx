import { useEffect, useMemo, useState } from "react";
import { Button } from "@amarok-one/ui";
import type { TaskPriority, TaskStatus } from "@amarok-one/types";
import { hasPermission, permissionSlugsFromCarrier, PERMISSIONS } from "@amarok-one/permissions";
import { useAuth } from "../../auth/useAuth";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { getApiErrorMessage } from "../../lib/auth-errors";
import {
  createTaskRequest,
  listTaskAssigneesRequest,
  listTasksRequest,
  updateTaskRequest,
} from "../../lib/tasks-api";

const STATUS_LABELS: Record<TaskStatus, string> = {
  open: "פתוחה",
  in_progress: "בטיפול",
  waiting: "ממתינה",
  completed: "בוצעה",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "נמוכה",
  normal: "רגילה",
  high: "גבוהה",
  urgent: "דחופה",
};

export function TasksPage() {
  const { user, accessToken } = useAuth();
  const [tasks, setTasks] = useState<Awaited<ReturnType<typeof listTasksRequest>>["data"]>([]);
  const [assignees, setAssignees] = useState<Awaited<ReturnType<typeof listTaskAssigneesRequest>>>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [dueDate, setDueDate] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [status, setStatus] = useState<TaskStatus | "all">("all");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [completionNotes, setCompletionNotes] = useState<Record<string, string>>({});
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const canManage = hasPermission(permissionSlugsFromCarrier(user), PERMISSIONS.TASKS_MANAGE);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      if (!user || !accessToken) return;
      setLoading(true);
      setError(null);
      try {
        const [taskResponse, nextAssignees] = await Promise.all([
          listTasksRequest(user.organization.id, accessToken, {
            status: status === "all" ? undefined : status,
            assignedToId: canManage ? assigneeFilter || undefined : undefined,
            dueOn: dueOn || undefined,
            includeArchived,
          }),
          canManage
            ? listTaskAssigneesRequest(user.organization.id, accessToken)
            : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setTasks(taskResponse.data ?? []);
        setAssignees(nextAssignees);
        if (!assignedToId && nextAssignees[0]) setAssignedToId(nextAssignees[0].id);
      } catch (cause) {
        if (!cancelled) setError(getApiErrorMessage(cause, "לא ניתן לטעון את המשימות."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    assignedToId,
    assigneeFilter,
    canManage,
    dueOn,
    includeArchived,
    reloadToken,
    status,
    user,
  ]);

  const taskHeading = useMemo(() => (canManage ? "כל המשימות" : "המשימות שלי"), [canManage]);

  async function reload(): Promise<void> {
    setReloadToken((value) => value + 1);
  }

  if (!user || !accessToken) return <LoadingState message="טוען…" />;
  if (loading) return <LoadingState message="טוען משימות…" />;
  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;

  return (
    <div className="customers-page tasks-page">
      <header className="customers-page__header">
        <div>
          <p className="customers-page__eyebrow">ניהול משרד</p>
          <h2 className="customers-page__title">{taskHeading}</h2>
          <p className="customers-page__subtitle">
            משימות פתוחות, בטיפול וממתינות. משימה שבוצעה עוברת לארכיון.
          </p>
        </div>
      </header>

      {canManage ? (
        <section className="customer-form__section">
          <h3>משימה חדשה</h3>
          <div className="customer-form__grid">
            <label className="customer-form__field customer-form__field--wide">
              <span>כותרת</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="customer-form__field">
              <span>אחראי</span>
              <select
                value={assignedToId}
                onChange={(event) => setAssignedToId(event.target.value)}
              >
                {assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="customer-form__field">
              <span>עדיפות</span>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as TaskPriority)}
              >
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="customer-form__field">
              <span>יעד</span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>
            <label className="customer-form__field customer-form__field--wide">
              <span>פירוט</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
              />
            </label>
            <label className="customer-form__field customer-form__field--wide">
              <span>קישור (אופציונלי)</span>
              <input
                type="url"
                dir="ltr"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                placeholder="https://"
              />
            </label>
            <div className="customer-form__actions customer-form__field--wide">
              <Button
                variant="primary"
                disabled={!title.trim() || !assignedToId || saving}
                onClick={() =>
                  void (async () => {
                    setSaving(true);
                    setError(null);
                    try {
                      await createTaskRequest(user.organization.id, accessToken, {
                        title,
                        description: description.trim() || undefined,
                        assignedToId,
                        priority,
                        dueAt: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : undefined,
                        linkUrl: linkUrl.trim() || undefined,
                      });
                      setTitle("");
                      setDescription("");
                      setDueDate("");
                      setLinkUrl("");
                      await reload();
                    } catch (cause) {
                      setError(getApiErrorMessage(cause, "לא ניתן ליצור משימה."));
                    } finally {
                      setSaving(false);
                    }
                  })()
                }
              >
                {saving ? "שומר…" : "יצירת משימה"}
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="customer-form__section">
        <div className="customer-form__actions">
          <label className="customer-form__field">
            <span>סינון מצב</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as TaskStatus | "all")}
            >
              <option value="all">הכול</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="customer-form__field">
            <span>ארכיון</span>
            <span>
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(event) => setIncludeArchived(event.target.checked)}
              />{" "}
              הצגת משימות שבוצעו
            </span>
          </label>
          {canManage ? (
            <label className="customer-form__field">
              <span>אחראי</span>
              <select
                value={assigneeFilter}
                onChange={(event) => setAssigneeFilter(event.target.value)}
              >
                <option value="">כל העובדים</option>
                {assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.displayName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="customer-form__field">
            <span>תאריך יעד</span>
            <input type="date" value={dueOn} onChange={(event) => setDueOn(event.target.value)} />
          </label>
        </div>
        {tasks.length === 0 ? (
          <p className="customers-table__muted">אין משימות להצגה.</p>
        ) : (
          <div className="customer-detail-grid">
            {tasks.map((task) => (
              <article key={task.id} className="customer-detail-card">
                <div className="tasks-page__card-header">
                  <h3>{task.title}</h3>
                  <span className={`tasks-page__status tasks-page__status--${task.status}`}>
                    {STATUS_LABELS[task.status]}
                  </span>
                </div>
                {task.description ? <p>{task.description}</p> : null}
                {task.linkUrl ? (
                  <p>
                    <a href={task.linkUrl} target="_blank" rel="noreferrer">
                      פתיחת קישור מצורף
                    </a>
                  </p>
                ) : null}
                <p className="customers-table__muted">אחראי: {task.assignedTo.displayName}</p>
                <p className="customers-table__muted">עדיפות: {PRIORITY_LABELS[task.priority]}</p>
                {task.dueAt ? (
                  <p className="customers-table__muted">
                    יעד: {new Date(task.dueAt).toLocaleDateString("he-IL")}
                  </p>
                ) : null}
                {task.completedAt ? (
                  <p className="customers-table__muted">
                    בוצעה: {new Date(task.completedAt).toLocaleString("he-IL")}
                  </p>
                ) : null}
                {task.completionNote ? (
                  <p className="customers-table__muted">הערת סיום: {task.completionNote}</p>
                ) : null}
                <div className="customer-form__actions">
                  <label className="customer-form__field">
                    <span>הערת סיום</span>
                    <input
                      value={completionNotes[task.id] ?? ""}
                      onChange={(event) =>
                        setCompletionNotes((current) => ({
                          ...current,
                          [task.id]: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <select
                    aria-label={`מצב ${task.title}`}
                    value={task.status}
                    disabled={updatingTaskId === task.id}
                    onChange={(event) =>
                      void (async () => {
                        setUpdatingTaskId(task.id);
                        try {
                          await updateTaskRequest(user.organization.id, accessToken, task.id, {
                            status: event.target.value as TaskStatus,
                            completionNote: completionNotes[task.id]?.trim() || undefined,
                          });
                          setCompletionNotes((current) => {
                            const { [task.id]: _removed, ...rest } = current;
                            return rest;
                          });
                          await reload();
                        } catch (cause) {
                          setError(getApiErrorMessage(cause, "לא ניתן לעדכן את המשימה."));
                        } finally {
                          setUpdatingTaskId(null);
                        }
                      })()
                    }
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
