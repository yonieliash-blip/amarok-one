interface EmptyStateProps {
  title: string;
  message: string;
  icon?: string;
}

export function EmptyState({ title, message, icon = "◫" }: EmptyStateProps) {
  return (
    <div className="state state--empty">
      <div className="state__icon" aria-hidden="true">
        {icon}
      </div>
      <h2 className="state__title">{title}</h2>
      <p className="state__message">{message}</p>
    </div>
  );
}
