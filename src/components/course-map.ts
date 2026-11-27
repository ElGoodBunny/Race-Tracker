// Live layer of CourseMap.astro (docs/tasks/034-claude-karte.md): runner, the part already run and the spots,
// from the same estimate and Supabase rows as the rest of the page. Only for the fallback without 3D.
// Spot names come from guests and go out via textContent.
import { latLngAt, makeProjection, type CourseData, type LatLng } from "../lib/course";
import { doneRoute } from "../lib/live/map";
import { watchRace } from "../lib/live/page";
import { raceEstimate, type RacePlan } from "../lib/live/spots";
import { emptyState, type LiveState } from "../lib/live/supabase";
import { getSupabase } from "../lib/supabase";

const SVG = "http://www.w3.org/2000/svg";
/** Like the status card. */
const REFRESH_MS = 15_000;

export function startMap(fig: HTMLElement): void {
  if (fig.dataset.started) return;
  fig.dataset.started = "1";
  const slug = fig.dataset.slug!;
  const plan = JSON.parse(fig.dataset.plan!) as RacePlan;
  const course = JSON.parse(fig.dataset.course!) as Pick<CourseData, "route" | "km" | "bounds">;
  const { project } = makeProjection(course.bounds);
  const done = fig.querySelector<SVGPathElement>(".done")!;
  const runner = fig.querySelector<SVGGElement>(".runner")!;
  const spotsG = fig.querySelector<SVGGElement>(".spots")!;
  let state: LiveState = emptyState();

  const svg = fig.querySelector<SVGSVGElement>("svg")!;
  const VBW = 1000;
  /** Map units per screen pixel, at least 1: markers and text keep their size on screen. */
  let k = 1;
  const scale = () => {
    k = Math.max(1, (VBW / (svg.clientWidth || VBW)) * 0.95);
    svg.style.setProperty("--k", k.toFixed(3));
  };
  new ResizeObserver(() => {
    scale();
    render();
  }).observe(svg);
  scale();

  const d = (pts: LatLng[]) => pts.map((p, i) => `${i ? "L" : "M"}${project(p).map((v) => v.toFixed(1)).join(",")}`).join("");

  function render() {
    const est = raceEstimate(state.race, state.checkpoints, plan, Date.now());
    const km = est.phase === "pre" ? 0 : est.km;
    done.setAttribute("d", d(doneRoute(course, km)));
    const [x, y] = project(latLngAt(course as CourseData, km));
    runner.setAttribute("transform", `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${k.toFixed(3)})`);
    runner.setAttribute("visibility", est.phase === "pre" ? "hidden" : "visible");
    spotsG.replaceChildren(
      ...state.spots.map((s) => {
        const [sx, sy] = project(latLngAt(course as CourseData, s.km));
        const g = document.createElementNS(SVG, "g");
        g.setAttribute("transform", `translate(${sx.toFixed(1)},${sy.toFixed(1)}) scale(${k.toFixed(3)})`);
        const c = document.createElementNS(SVG, "circle");
        c.setAttribute("r", "7");
        c.setAttribute("fill", "var(--surface)");
        c.setAttribute("stroke", "var(--signal)");
        c.setAttribute("stroke-width", "3");
        const t = document.createElementNS(SVG, "text");
        t.setAttribute("class", "spot-name");
        t.setAttribute("style", "font-size:12px;stroke-width:4px");
        t.setAttribute("x", "12");
        t.setAttribute("dy", "4");
        t.setAttribute("fill", "var(--ink)");
        t.setAttribute("paint-order", "stroke");
        t.setAttribute("stroke", "var(--land)");
        t.setAttribute("stroke-width", "4");
        t.textContent = s.name;
        g.append(c, t);
        return g;
      }),
    );
  }

  render();
  const client = getSupabase();
  if (client) {
    watchRace(client, slug, (s) => {
      state = s;
      render();
    });
  }
  window.setInterval(render, REFRESH_MS);
}
