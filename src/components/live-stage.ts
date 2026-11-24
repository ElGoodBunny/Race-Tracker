// Client side of LiveStage.astro: clock, source, view, HUD and controls (docs/tasks/017-claude-einbau-rennseite.md).
// Used by /dev/live and, loaded on demand, by the race page. Everything about 3D lives in src/lib/view3d.
import type { CourseData } from "../lib/course";
import { fmtAgo, fmtDur, fmtIn, fmtKm, fmtPace } from "../lib/format";
import { createClock, type Speed } from "../lib/live/clock";
import { createSpotTracker, type Spot } from "../lib/live/events";
import { upcomingSpots } from "../lib/live/upcoming";
import { mixedSource, replaySource, rescaleSource, type ReplayFile, type Sample } from "../lib/live/source";
import { createStats, finishForecast, passedLandmark } from "../lib/live/stats";
import { unpackScene, type PackedScene } from "../lib/osm";
import type { Mode } from "../lib/view3d/camera";
import { createLabels } from "../lib/view3d/labels";
import { VIEW_TOKENS, createView } from "../lib/view3d/view";
import { makeLocal, makeTrack } from "../lib/view3d/world";

type Race = { slug: string; city: string; note: string; targetSec: number; bib?: string; block?: string; course: Pick<CourseData, "route" | "km" | "landmarks">; spots: Spot[] };
const el = (id: string) => document.getElementById(id)!;
const json = async <T,>(url: string) => (await (await fetch(url)).json()) as T;

/**
 * Starts the live view in the stage of LiveStage.astro. False when WebGL is missing: the page keeps what it has under the canvas.
 * More than one race in the stage (only /dev/live): ?race=<slug> picks one, the first is the default.
 */
export async function startLive(stage: HTMLElement): Promise<boolean> {
  const canvas = document.getElementById("view") as HTMLCanvasElement;
  const root = document.documentElement;
  const races = JSON.parse(stage.dataset.races!) as Race[];
  const race = races.find((r) => r.slug === new URLSearchParams(location.search).get("race")) ?? races[0];
  for (const a of document.querySelectorAll<HTMLAnchorElement>("[data-race-link]")) if (a.dataset.raceLink === race.slug) a.setAttribute("aria-current", "page");

  const [packed, trees, replay] = await Promise.all([
    json<PackedScene>(`/data/${race.slug}/scene.json`),
    json<number[]>(`/data/${race.slug}/trees.json`),
    json<ReplayFile>(`/data/${stage.dataset.recording}/replay.json`),
  ]);
  // The recording runs on its own course as it is. On another course it is a demo, stretched by share of the distance.
  const recorded = replaySource(replay);
  const demo = race.slug === stage.dataset.recording ? recorded : rescaleSource(recorded, replay.km[replay.km.length - 1], race.course);
  // The demo as telemetry points in race time, then the mixed source on top (step 13). "Ausfall 60 s" drops points.
  const stretch = demo.duration / recorded.duration;
  const points = replay.t.map((t) => {
    const { pace: _p, quality: _q, ...p } = demo.sampleAt(t * stretch);
    return p;
  });
  /** Threshold of the demo. Live it is set after the LiveTrack measurement (phase 2b), proposal 90 s. */
  const STALE_S = 30;
  const outages: [number, number][] = [];
  const known = () => points.filter((p) => !outages.some(([a, b]) => p.t >= a && p.t < b));
  const build = () => mixedSource(known(), { staleS: STALE_S, course: race.course, targetSec: race.targetSec });
  let source = build();
  let stats = createStats(known());
  const clock = createClock(source.duration);
  const tracker = createSpotTracker();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isDark = () => (root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);

  /** Text with words in Geist and numbers in Geist Mono: each number, with a time unit behind it, gets its own span. */
  const putMixed = (id: string, text: string) => setMixed(el(id), text);
  const setMixed = (node: HTMLElement, text: string) => {
    if (node.dataset.text === text) return;
    node.dataset.text = text;
    node.replaceChildren(
      ...text.split(/(\d+(?:[:,.]\d+)*(?: (?:s|min|h)\b)?)/).map((part, i) => {
        if (i % 2 === 0) return part;
        const span = document.createElement("span");
        span.className = "mono";
        span.textContent = part;
        return span;
      }),
    );
  };
  const total = race.course.km[race.course.km.length - 1];
  el("hud-total").textContent = `/ ${fmtKm(total)} km`;
  if (race.bib || race.block) {
    putMixed("hud-who", [race.bib && `Startnummer ${race.bib}`, race.block && `Block ${race.block}`].filter(Boolean).join(", "));
    el("hud-who").hidden = false;
  }
  /** Text of a node, set only when it changed: the HUD runs every frame, the DOM changes a few times per second. */
  const put = (id: string, text: string) => {
    const node = el(id);
    if (node.textContent !== text) node.textContent = text;
  };
  const ago = (age: number) => (age < 60 ? `vor ${Math.round(age)} s` : fmtAgo(age * 1000));
  let splitCount = -1;
  let trailAt = -Infinity;
  function showHud(s: Sample) {
    const done = s.km >= total - 0.05;
    put("hud-km", fmtKm(s.km));
    el("hud-progress").style.transform = `scaleX(${Math.min(1, s.km / total)})`;
    const place = passedLandmark(race.course, s.km);
    put("hud-place", [done ? "im Ziel" : s.t <= 0 ? "vor dem Start" : "läuft", !done && s.t > 0 && place ? `hinter ${place}` : ""].filter(Boolean).join(", "));
    put("hud-pace", s.pace ? `${fmtPace(s.pace)} /km` : "k. A.");
    put("hud-avg", s.km >= 0.2 ? `${fmtPace(s.t / s.km)} /km` : "k. A.");
    put("hud-cad", s.cad ? `${Math.round(s.cad)} spm` : "k. A.");
    put("hud-alt", s.alt != null ? `${Math.round(s.alt)} m` : "k. A.");
    put("hud-hr", s.hr ? `${Math.round(s.hr)} bpm` : "k. A.");
    const hr = stats.hr(s.t);
    put("hud-hr-stats", hr ? `Ø ${Math.round(hr.avg)}, max ${hr.max}` : "");
    put("hud-time", fmtDur(s.t));
    const finish = done ? null : finishForecast(s.t, s.km, total);
    putMixed("hud-finish", finish ? `Ziel etwa ${fmtDur(finish)}` : "");
    const measured = s.quality === "measured";
    putMixed("hud-quality-text", measured ? (s.age != null ? `gemessen, ${ago(s.age)}` : "gemessen") : s.age != null ? `geschätzt, letzte Messung ${ago(s.age)}` : "geschätzt");
    el("hud-dot").classList.toggle("estimated", !measured);
    // Pulse curve of the last 10 minutes, redrawn once per 2 s of race time.
    if (Math.abs(s.t - trailAt) >= 2) {
      trailAt = s.t;
      const values = stats.hrTrail(s.t, 600);
      const lo = Math.min(...values) - 2;
      const hi = Math.max(...values) + 2;
      el("hud-trail").setAttribute("points", values.length > 1 ? values.map((v, i) => `${((i / (values.length - 1)) * 120).toFixed(1)},${(30 - ((v - lo) / (hi - lo)) * 28).toFixed(1)}`).join(" ") : "");
    }
    const splits = stats.splits(s.t);
    if (splits.length !== splitCount) showSplits(splits);
    showNext(s);
  }
  /**
   * Spots still ahead, nearest first (docs/tasks/012-claude-als-naechstes-panel.md). "Passed" comes from the tracker.
   * The arrival uses the average pace so far: the pace of the moment jumps between samples and the minutes would flicker.
   */
  let nextText = "";
  function showNext(s: Sample) {
    const avg = s.km >= 0.2 ? s.t / s.km : null;
    const next = upcomingSpots(s.km, avg, race.spots, tracker.passed).map((u) => ({
      name: u.spot.name,
      when: [`${fmtKm(u.distKm)} km`, u.etaSec != null ? fmtIn(u.etaSec * 1000) : ""].filter(Boolean).join(" · "),
    }));
    const text = JSON.stringify(next);
    if (text === nextText) return;
    nextText = text;
    const items = next.map(({ name, when }) => {
      const li = document.createElement("li");
      const n = document.createElement("span");
      n.className = "body-6 next-name";
      n.textContent = name;
      const w = document.createElement("span");
      w.className = "body-6 muted next-when";
      setMixed(w, when);
      li.append(n, w);
      return li;
    });
    if (!items.length) {
      const li = document.createElement("li");
      li.className = "body-6 muted";
      li.textContent = "Alle Spots passiert";
      items.push(li);
    }
    el("hud-next").replaceChildren(...items);
  }
  /**
   * The last 8 km as bars: the fastest full length, 20 s slower or the slowest at 30 %.
   * Proportional to speed, all bars would be 90 to 100 % long and look the same.
   * The 20 s floor keeps a 1 s difference from looking like a big one.
   */
  function showSplits(splits: number[]) {
    splitCount = splits.length;
    const list = el("hud-splits");
    const last = splits.slice(-8);
    const fastest = Math.min(...last);
    const range = Math.max(Math.max(...last) - fastest, 20);
    const length = (sec: number) => 1 - (0.7 * (sec - fastest)) / range;
    const items = last.map((sec, i) => {
      const li = document.createElement("li");
      const k = document.createElement("span");
      k.className = "caption-5 muted mono";
      k.textContent = String(splits.length - last.length + i + 1);
      const bar = document.createElement("span");
      bar.className = "split-bar";
      bar.style.transform = `scaleX(${length(sec)})`;
      const v = document.createElement("span");
      v.className = "caption-5 mono";
      v.textContent = fmtPace(sec);
      li.append(k, bar, v);
      return li;
    });
    list.replaceChildren(...items);
    if (!items.length) {
      const li = document.createElement("li");
      li.className = "caption-5 muted empty";
      li.textContent = "Nach dem ersten km";
      list.replaceChildren(li);
    }
  }

  const toast = el("toast");
  let toastTimer = 0;
  function announce(spots: Spot[]) {
    if (!spots.length) return;
    toast.textContent = `${spots.map((s) => s.name).join(", ")} passiert`;
    toast.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("on"), 4000);
  }

  const sceneData = unpackScene(packed, trees);
  const track = makeTrack(race.course, makeLocal(sceneData.origin));
  const mount = () => {
    const v = createView(canvas, {
      scene: sceneData,
      course: race.course,
      tokens: () => {
        const cs = getComputedStyle(root);
        return Object.fromEntries(VIEW_TOKENS.map((t) => [t, cs.getPropertyValue(`--${t}`).trim()]));
      },
      dark: isDark,
      reducedMotion: reduced,
      insets: coveredEdges,
      // One measurement per frame: clock, source, events, then the view and the HUD get the same sample.
      tick(now) {
        const sample = source.sampleAt(clock.time(now));
        announce(tracker.update(sample.km, race.spots));
        view.update(sample, race.spots.map((s) => ({ ...s, passed: tracker.passed(s.id) })));
        showHud(sample);
        if (clock.playing && sample.t >= source.duration) setPlaying(false, now);
      },
      onState({ mode, free }) {
        for (const b of document.querySelectorAll<HTMLButtonElement>("[data-mode]")) b.setAttribute("aria-pressed", String(!free && b.dataset.mode === mode));
        el("center").classList.toggle("on", free);
      },
    });
    v?.add(createLabels(el("labels"), track, { name: "Dima" }));
    return v;
  };
  /**
   * What HUD, camera bar and panel cover of the view, so the camera aims at the rest (docs/tasks/013-claude-freie-flaeche.md).
   * Desktop: HUD on top, bar and panel on the right. Phone: HUD on top, the collapsed sheet at the bottom.
   * An open sheet keeps the last value, it is only pulled up for a moment.
   */
  let edges = { top: 0, right: 0, bottom: 0, left: 0 };
  function coveredEdges() {
    const panel = el("panel");
    if (panel.hidden || panel.classList.contains("open")) return edges;
    const c = canvas.getBoundingClientRect();
    const hud = el("hud").getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    const phone = p.width >= c.width - 1;
    const gap = 8;
    const top = Math.max(0, Math.round(hud.bottom - c.top + gap));
    const right = phone ? 0 : Math.max(0, Math.round(c.right - Math.min(p.left, el("bar").getBoundingClientRect().left) + gap));
    const bottom = phone ? Math.max(0, Math.round(c.bottom - p.top + gap)) : 0;
    edges = { top, right, bottom, left: 0 };
    return edges;
  }
  const first = mount();
  if (!first) {
    canvas.hidden = true;
    document.getElementById("fallback")?.removeAttribute("hidden");
    return false;
  }
  let view = first;
  el("hud").hidden = false;
  el("panel").hidden = false;
  el("note").textContent = race.note;
  el("grip").addEventListener("click", () => {
    const open = el("panel").classList.toggle("open");
    el("grip").setAttribute("aria-expanded", String(open));
    el("grip").setAttribute("aria-label", open ? "Details ausblenden" : "Details zeigen");
  });
  el("bar").hidden = false;
  el("controls").hidden = false;
  // Without spots (race pages until phase 1) there is nothing to list.
  el("next-block").hidden = !race.spots.length;

  const play = el("play");
  function setPlaying(on: boolean, now = performance.now()) {
    if (on && clock.time(now) >= source.duration) {
      // "Noch einmal": back to the start, all spots armed again.
      clock.seek(0, now);
      tracker.reset(0);
    }
    if (on) clock.play(now);
    else clock.pause(now);
    play.textContent = on ? "Pause" : clock.time(now) >= source.duration ? "Noch einmal" : "Weiter";
    play.setAttribute("aria-pressed", String(on));
  }
  play.addEventListener("click", () => setPlaying(!clock.playing));
  for (const b of document.querySelectorAll<HTMLButtonElement>("[data-speed]")) {
    b.addEventListener("click", () => {
      clock.setSpeed(Number(b.dataset.speed) as Speed, performance.now());
      for (const x of document.querySelectorAll("[data-speed]")) x.setAttribute("aria-pressed", String(x === b));
    });
  }
  for (const b of document.querySelectorAll<HTMLButtonElement>("[data-mode]")) b.addEventListener("click", () => view.setMode(b.dataset.mode as Mode));
  el("center").addEventListener("click", () => view.setMode(view.mode));
  el("zoom-in").addEventListener("click", () => view.zoom(1 / 1.6));
  el("zoom-out").addEventListener("click", () => view.zoom(1.6));
  el("flat").addEventListener("click", () => {
    view.setFlat(!view.flat);
    el("flat").setAttribute("aria-pressed", String(view.flat));
  });
  document.getElementById("outage")?.addEventListener("click", () => {
    const t = clock.time(performance.now());
    outages.push([t, t + 60]);
    source = build();
    stats = createStats(known());
    splitCount = -1;
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => view.setColors());

  clock.setSpeed(10, performance.now());
  setPlaying(true);
  // Opening: a moment of overview, then the flight to the runner. Once per session, after that straight to the runner.
  let opened = false;
  try {
    opened = sessionStorage.getItem("live-opened") === "1";
    sessionStorage.setItem("live-opened", "1");
  } catch {
    // Storage blocked: every visit opens with the overview.
  }
  const opening = window.setTimeout(() => view.setMode("follow"), opened ? 0 : 1500);

  // Hooks for measurement and screenshots, like /dev/view3d.
  Object.assign(window, {
    __live: {
      get view() {
        return view;
      },
      clock,
      get source() {
        return source;
      },
      /** The course in scene metres, as the view has it (checks compute anchors from it). */
      track,
      /** Drop the telemetry from race time a to b, like the button. */
      outage(a: number, b: number) {
        outages.push([a, b]);
        source = build();
        stats = createStats(known());
        splitCount = -1;
      },
      /** Throw the view away and build it again, to check that dispose() frees everything. */
      remount() {
        view.dispose();
        view = mount()!;
      },
      /** Jump to race time t (seconds), spots behind count as passed without an event. */
      seek(t: number) {
        clearTimeout(opening);
        const now = performance.now();
        clock.seek(t, now);
        tracker.reset(source.sampleAt(t).km);
      },
      pause: () => setPlaying(false),
      play: () => setPlaying(true),
    },
  });
  stage.dataset.ready = "true";
  return true;
}
