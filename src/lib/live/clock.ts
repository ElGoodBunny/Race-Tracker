// Race clock for replay and simulation (docs/decisions/2026-11-13-3d-konzept.md).
// No timers inside: the caller passes the wall time (e.g. from requestAnimationFrame),
// so the clock is a pure function of its inputs and easy to test.

export const SPEEDS = [1, 10, 30, 60] as const;
export type Speed = (typeof SPEEDS)[number];

export interface Clock {
  readonly playing: boolean;
  readonly speed: Speed;
  /** Race time in seconds at wall time `now` (ms), between 0 and the duration. */
  time(now: number): number;
  play(now: number): void;
  pause(now: number): void;
  setSpeed(speed: Speed, now: number): void;
  seek(t: number, now: number): void;
}

/** Starts paused at `start` seconds, at 1x. */
export function createClock(duration: number, start = 0): Clock {
  const clamp = (t: number) => Math.max(0, Math.min(duration, t));
  // Every change re-anchors the clock at the current time, so changing the speed never jumps.
  let anchorT = clamp(start);
  let anchorNow = 0;
  let playing = false;
  let speed: Speed = 1;

  const time = (now: number) => clamp(playing ? anchorT + ((now - anchorNow) / 1000) * speed : anchorT);
  const anchor = (now: number) => {
    anchorT = time(now);
    anchorNow = now;
  };

  return {
    get playing() {
      return playing;
    },
    get speed() {
      return speed;
    },
    time,
    play(now) {
      anchor(now);
      playing = true;
    },
    pause(now) {
      anchor(now);
      playing = false;
    },
    setSpeed(s, now) {
      if (!SPEEDS.includes(s)) throw new RangeError(`speed ${s} not supported`);
      anchor(now);
      speed = s;
    },
    seek(t, now) {
      anchorT = clamp(t);
      anchorNow = now;
    },
  };
}
