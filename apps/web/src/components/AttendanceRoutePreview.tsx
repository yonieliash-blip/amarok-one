import type { WorkDayLocationPoint } from "../lib/attendance-api";
import { formatDateTime } from "../i18n/format";
import { buildRoutePolyline } from "../lib/attendance-route-preview";

interface Props {
  employeeName: string;
  points: WorkDayLocationPoint[];
  title: string;
  emptyMessage: string;
  startLabel: string;
  endLabel: string;
  closeLabel: string;
  onClose: () => void;
}

function mapsUrl(point: WorkDayLocationPoint): string {
  return `https://www.google.com/maps?q=${point.latitude},${point.longitude}`;
}

export function AttendanceRoutePreview({
  employeeName,
  points,
  title,
  emptyMessage,
  startLabel,
  endLabel,
  closeLabel,
  onClose,
}: Props) {
  const first = points[0];
  const last = points.at(-1);
  const path = buildRoutePolyline(points);
  const [startX = "24", startY = "24"] = path.split(" ")[0]?.split(",") ?? [];
  const [endX = "24", endY = "24"] = path.split(" ").at(-1)?.split(",") ?? [];
  return (
    <section className="attendance-route" aria-label={title}>
      <div className="attendance-route__header">
        <div>
          <h3>{title}</h3>
          <p>{employeeName}</p>
        </div>
        <button type="button" onClick={onClose}>
          {closeLabel}
        </button>
      </div>
      {points.length === 0 ? (
        <p>{emptyMessage}</p>
      ) : (
        <>
          <svg
            className="attendance-route__plot"
            viewBox="0 0 600 260"
            role="img"
            aria-label={title}
          >
            <polyline
              points={path}
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle cx={startX} cy={startY} r="9" className="attendance-route__start" />
            <circle cx={endX} cy={endY} r="9" className="attendance-route__end" />
          </svg>
          <div className="attendance-route__points">
            {first ? (
              <a href={mapsUrl(first)} target="_blank" rel="noreferrer">
                {startLabel}: {formatDateTime(first.recordedAt)}
              </a>
            ) : null}
            {last ? (
              <a href={mapsUrl(last)} target="_blank" rel="noreferrer">
                {endLabel}: {formatDateTime(last.recordedAt)}
              </a>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
