import type { WorkDayLocationPoint } from "./attendance-api";

export function buildRoutePolyline(points: WorkDayLocationPoint[]): string {
  if (points.length === 0) return "";
  const longitudes = points.map((point) => point.longitude);
  const latitudes = points.map((point) => point.latitude);
  const minX = Math.min(...longitudes);
  const maxX = Math.max(...longitudes);
  const minY = Math.min(...latitudes);
  const maxY = Math.max(...latitudes);
  const rangeX = Math.max(maxX - minX, 0.001);
  const rangeY = Math.max(maxY - minY, 0.001);
  return points
    .map((point) => {
      const x = 24 + ((point.longitude - minX) / rangeX) * 552;
      const y = 24 + ((maxY - point.latitude) / rangeY) * 212;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
