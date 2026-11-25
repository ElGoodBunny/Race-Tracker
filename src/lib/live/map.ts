// Live layer of the SVG course map (docs/tasks/034-claude-karte.md). The map is the fallback when the 3D view
// does not run (no WebGL, no scene.json). Pure geometry here, drawing in src/components/course-map.ts.
import { latLngAt, type CourseData, type LatLng } from "../course";

/** The part of the route already run: every passed route point, then the runner's position. Empty before the start. */
export function doneRoute(c: Pick<CourseData, "route" | "km">, km: number): LatLng[] {
  if (km <= 0) return [];
  const last = c.km[c.km.length - 1];
  if (km >= last) return c.route.slice();
  const pts: LatLng[] = [];
  for (let i = 0; i < c.km.length && c.km[i] < km; i++) pts.push(c.route[i]);
  pts.push(latLngAt(c as CourseData, km));
  return pts;
}
