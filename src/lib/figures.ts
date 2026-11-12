// Runner, cheering pins, spectators and confetti for the 3D view. Everything is modelled in code.
// Sizes follow the legacy View3D (runner about 36 units tall, facing +x, y up), so the port can drop these in.
// Look: docs/reference/munich-video/frame-04.jpg. Colors: docs/decisions/2026-11-12-figuren.md.

import {
  CapsuleGeometry, CircleGeometry, Color, CylinderGeometry, DoubleSide, Euler, Group, InstancedMesh, LatheGeometry, Matrix4, Mesh,
  MeshBasicMaterial, MeshLambertMaterial, MeshPhongMaterial, PlaneGeometry, Quaternion, RingGeometry, SphereGeometry, TorusGeometry, Vector2, Vector3,
  type BufferGeometry, type Material, type Texture,
} from "three";

export interface FigurePalette {
  skin: string[]; // --figure-skin-1..3, the runner uses the first
  hair: string[]; // --figure-hair-1..3, the runner uses the first
  shirt: string; // runner: shirt and shorts. Dark on light ground, light on dark ground, so he stands out in both modes
  bib: string;
  bibInk: string;
  shoes: string;
  ring: string; // pulsing ring under the runner, the signal color
  face: string; // eyes and mouth
  pants: string; // spectators
  shadow: string;
  flags: string[];
}

/** Maps design tokens (names without the leading --) to figure colors. */
export function figurePalette(t: Record<string, string>, dark: boolean): FigurePalette {
  return {
    skin: [1, 2, 3].map((i) => t[`figure-skin-${i}`]),
    hair: [1, 2, 3].map((i) => t[`figure-hair-${i}`]),
    shirt: t["ink"],
    bib: t["pressed-ink"],
    bibInk: t["ink"],
    shoes: t["signal"],
    ring: t["signal"],
    face: t["toast"],
    pants: t["muted"],
    shadow: dark ? t["bg"] : t["ink"],
    flags: [1, 2, 3, 4, 5, 6].map((i) => t[`flag-${i}`]),
  };
}

const lambert = (color: string) => new MeshLambertMaterial({ color });

function part(parent: Group, geo: BufferGeometry, mat: Material, x = 0, y = 0, z = 0): Mesh {
  const m = new Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function pivot(parent: Group, x: number, y: number, z: number): Group {
  const g = new Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

function blobShadow(parent: Group, color: string, radius: number): Mesh {
  const mat = new MeshBasicMaterial({ color, transparent: true, opacity: 0.16, depthWrite: false });
  const m = part(parent, new CircleGeometry(radius, 24).rotateX(-Math.PI / 2), mat, 0, 0.3, 0);
  m.name = "shadow";
  return m;
}

/** Eyes and mouth on the front (+x) of a head sphere with radius r. open: cheering mouth instead of a smile. */
function face(head: Group, color: string, r: number, open: boolean) {
  const mat = lambert(color);
  const on = (y: number, z: number) => Math.sqrt(r * r - y * y - z * z);
  const eyeY = -0.08 * r, eyeZ = 0.36 * r;
  for (const side of [1, -1]) part(head, new SphereGeometry(0.14 * r, 10, 8), mat, on(eyeY, eyeZ) - 0.02 * r, eyeY, eyeZ * side);
  const mouthY = -0.42 * r;
  if (open) {
    part(head, new SphereGeometry(0.2 * r, 12, 8), mat, on(mouthY, 0) - 0.08 * r, mouthY, 0).scale.set(0.5, 1, 1.15);
  } else {
    const smile = new TorusGeometry(0.22 * r, 0.045 * r, 6, 12, Math.PI).rotateZ(Math.PI).rotateY(Math.PI / 2);
    part(head, smile, mat, on(mouthY, 0) - 0.01 * r, mouthY + 0.1 * r, 0);
  }
}

/* ---------- runner ---------- */

export interface RunPose {
  thighL: number; thighR: number;
  kneeL: number; kneeR: number;
  armL: number; armR: number;
  bob: number;
  lean: number;
}

/** Joint angles in radians for one stride. phase runs 0..2π per stride, speed 0 stands, 1 is race pace. */
export function runPose(phase: number, speed: number): RunPose {
  const s = Math.min(1.6, Math.max(0, speed));
  const amp = Math.min(1, s);
  const swing = 0.95 * amp * Math.sin(phase);
  // Knee folds while the leg swings forward, stays almost straight when it pushes off.
  const knee = (ph: number) => -amp * (0.25 + 1.25 * Math.max(0, Math.cos(ph)));
  return {
    thighL: swing,
    thighR: -swing,
    kneeL: knee(phase),
    kneeR: knee(phase + Math.PI),
    armL: -0.85 * swing,
    armR: 0.85 * swing,
    bob: 1.5 * amp * Math.abs(Math.cos(phase)),
    lean: -0.14 * amp,
  };
}

export interface Runner {
  group: Group;
  /** phase 0..2π per stride, speed 0..1.6 */
  pose(phase: number, speed: number): void;
  /** Pulsing ring under the runner. t in seconds, animate false holds it still (reduced motion). 1.4 s per pulse as in the legacy View3D. */
  pulse(t: number, animate: boolean): void;
}

/** Comic runner as in the Munich video: big head, short dark hair, dark shirt with a light bib. bibTexture comes from the page (canvas), without it the bib stays blank. */
export function createRunner(p: FigurePalette, bibTexture?: Texture): Runner {
  const group = new Group();
  blobShadow(group, p.shadow, 8);
  // A steady ring marks the runner, a second one pulses outward from it. The legacy had only the pulsing one,
  // which was too faint to find the runner at 40 px.
  const ringGeo = new RingGeometry(13, 17, 48).rotateX(-Math.PI / 2);
  part(group, ringGeo, new MeshBasicMaterial({ color: p.ring, depthWrite: false }), 0, 0.5, 0);
  const ringMat = new MeshBasicMaterial({ color: p.ring, transparent: true, opacity: 0.35, depthWrite: false });
  const ring = part(group, ringGeo, ringMat, 0, 0.6, 0);
  ring.name = "pulse";
  const body = pivot(group, 0, 0, 0);
  const skin = lambert(p.skin[0]), shirt = lambert(p.shirt), shoes = lambert(p.shoes), hair = lambert(p.hair[0]);

  part(body, new CapsuleGeometry(4.3, 4, 6, 16), shirt, 0, 16.2, 0);
  part(body, new CylinderGeometry(4.2, 3.9, 3.6, 16), shirt, 0, 12, 0);

  // Bib on chest and back: a slice of a cylinder hugging the shirt.
  const bibMat = new MeshLambertMaterial(bibTexture ? { map: bibTexture } : { color: p.bib });
  for (const mid of [Math.PI / 2, (3 * Math.PI) / 2]) {
    part(body, new CylinderGeometry(4.48, 4.48, 4, 10, 1, true, mid - 0.7, 1.4), bibMat, 0, 16.3, 0);
  }

  const HEAD = 8;
  const head = pivot(body, 0, 28.4, 0);
  part(head, new SphereGeometry(HEAD, 28, 18), skin);
  part(head, new SphereGeometry(HEAD + 0.35, 28, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, -0.3, 0.2, 0).rotation.z = 0.42;
  face(head, p.face, HEAD, false);

  const thighGeo = new CapsuleGeometry(1.9, 2.6, 4, 10).translate(0, -2.4, 0);
  const shinGeo = new CapsuleGeometry(1.6, 2.6, 4, 10).translate(0, -2.3, 0);
  const shoeGeo = new CapsuleGeometry(1.5, 2.6, 4, 8).rotateZ(Math.PI / 2).translate(1.1, -5.2, 0);
  const upperArmGeo = new CapsuleGeometry(1.3, 2.6, 4, 8).translate(0, -2, 0);
  const forearmGeo = new CapsuleGeometry(1.2, 2.6, 4, 8).translate(0, -1.9, 0);

  const legs = [1, -1].map((side) => {
    const thigh = pivot(body, 0, 11.6, 2.2 * side);
    part(thigh, thighGeo, skin);
    const shin = pivot(thigh, 0, -4.9, 0);
    part(shin, shinGeo, skin);
    part(shin, shoeGeo, shoes);
    return { thigh, shin };
  });
  const arms = [1, -1].map((side) => {
    const upper = pivot(body, 0, 19.4, 5.3 * side);
    part(upper, upperArmGeo, shirt);
    const fore = pivot(upper, 0, -3.8, 0);
    part(fore, forearmGeo, skin);
    return { upper, fore };
  });

  function pose(phase: number, speed: number) {
    const a = runPose(phase, speed);
    legs[0].thigh.rotation.z = a.thighL;
    legs[1].thigh.rotation.z = a.thighR;
    legs[0].shin.rotation.z = a.kneeL;
    legs[1].shin.rotation.z = a.kneeR;
    arms[0].upper.rotation.z = a.armL;
    arms[1].upper.rotation.z = a.armR;
    const elbow = 1.45 * Math.min(1, speed);
    arms[0].fore.rotation.z = elbow;
    arms[1].fore.rotation.z = elbow;
    body.position.y = a.bob;
    body.rotation.z = a.lean;
  }
  function pulse(t: number, animate: boolean) {
    const k = animate ? (t % 1.4) / 1.4 : 0.5;
    ring.scale.setScalar(1 + k * 1.4);
    ringMat.opacity = animate ? 0.7 * (1 - k) : 0.35;
  }
  pose(0, 0);
  pulse(0, false);
  return { group, pose, pulse };
}

/* ---------- spectators ---------- */

export interface Spectator {
  group: Group;
  /** t in seconds, cheer 0..1 */
  cheer(t: number): void;
}

/** Small cheering friend with a big head. style 0: short hair, 1: bun, 2: long hair. Faces +x. */
export function createSpectator(p: FigurePalette, opts: { shirt: string; skin: string; hair: string; style: 0 | 1 | 2 }): Spectator {
  const group = new Group();
  blobShadow(group, p.shadow, 6.5);
  const body = pivot(group, 0, 0, 0);
  const skin = lambert(opts.skin), shirt = lambert(opts.shirt), pants = lambert(p.pants), hair = lambert(opts.hair);

  const legGeo = new CapsuleGeometry(1.7, 4, 4, 8);
  for (const side of [1, -1]) part(body, legGeo, pants, 0, 3.7, 2 * side);
  part(body, new CapsuleGeometry(4, 4, 6, 14), shirt, 0, 11.6, 0);

  const HEAD = 6.8;
  const head = pivot(body, 0, 22, 0);
  part(head, new SphereGeometry(HEAD, 24, 16), skin);
  part(head, new SphereGeometry(HEAD + 0.3, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, -0.3, 0.2, 0).rotation.z = 0.42;
  if (opts.style === 1) part(head, new SphereGeometry(3, 14, 10), hair, -3.4, 7, 0);
  if (opts.style === 2) part(head, new SphereGeometry(HEAD + 0.3, 24, 12, Math.PI * 1.5, Math.PI, 0, Math.PI * 0.8), hair, -0.5, -0.4, 0);
  face(head, p.face, HEAD, true);

  const armGeo = new CapsuleGeometry(1.25, 7, 4, 8).translate(0, 4.3, 0);
  const arms = [1, -1].map((side) => {
    const arm = pivot(body, 0, 14.2, 4.4 * side);
    part(arm, armGeo, skin);
    return arm;
  });
  const offset = opts.style * 1.7 + opts.shirt.charCodeAt(2) * 0.3;

  function cheer(t: number) {
    const w = t * 7 + offset;
    body.position.y = 1.6 * Math.abs(Math.sin(w * 0.5));
    arms[0].rotation.x = 0.7 + 0.25 * Math.sin(w);
    arms[1].rotation.x = -0.7 - 0.25 * Math.sin(w + 1.2);
  }
  cheer(0);
  return { group, cheer };
}

/* ---------- pins ---------- */

/** Outline of the balloon pin as [radius, height], tip on the ground. A cone that runs tangent into a sphere. */
export function pinProfile(radius = 11, centerY = 30, arcSteps = 14): [number, number][] {
  const a = Math.asin(radius / centerY);
  const pts: [number, number][] = [[0, 0]];
  for (let i = 0; i <= arcSteps; i++) {
    const th = -a + ((Math.PI / 2 + a) * i) / arcSteps;
    pts.push([Math.max(0, radius * Math.cos(th)), centerY + radius * Math.sin(th)]);
  }
  pts[pts.length - 1][0] = 0;
  return pts;
}

let pinGeo: LatheGeometry | null = null;

/** Glossy balloon pin, about 41 units tall. One shared geometry for all pins. */
export function createPin(color: string): Group {
  pinGeo ??= new LatheGeometry(pinProfile().map(([r, y]) => new Vector2(r, y)), 28);
  const g = new Group();
  part(g, pinGeo, new MeshPhongMaterial({ color, shininess: 110, specular: 0x777777 }));
  return g;
}

/* ---------- confetti ---------- */

interface Piece { x: number; y: number; z: number; vx: number; vy: number; vz: number; rx: number; ry: number; sx: number; sy: number; life: number; col: number }

export interface Confetti {
  mesh: InstancedMesh;
  burst(x: number, y: number, z: number): void;
  step(dt: number): void;
  active(): number;
}

/** One instanced mesh, recycled, as in the legacy View3D. Piece size and speeds are scaled down to fit the figures. */
export function createConfetti(colors: string[], slots = 320, perBurst = 140): Confetti {
  const mesh = new InstancedMesh(new PlaneGeometry(1.6, 2.5), new MeshBasicMaterial({ side: DoubleSide }), slots);
  mesh.frustumCulled = false;
  const cols = colors.map((c) => new Color(c));
  const zero = new Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < slots; i++) {
    mesh.setMatrixAt(i, zero);
    mesh.setColorAt(i, cols[0]);
  }
  let pieces: Piece[] = [];
  const m4 = new Matrix4(), q = new Quaternion(), e = new Euler(), pos = new Vector3(), one = new Vector3(1, 1, 1);

  function burst(x: number, y: number, z: number) {
    for (let i = 0; i < perBurst; i++) {
      const ang = Math.random() * Math.PI * 2, v = 16 + Math.random() * 28;
      pieces.push({ x, y, z, vx: Math.cos(ang) * v, vy: 26 + Math.random() * 30, vz: Math.sin(ang) * v, rx: Math.random() * 6, ry: Math.random() * 6, sx: (Math.random() - 0.5) * 14, sy: (Math.random() - 0.5) * 14, life: 2.4 + Math.random() * 0.8, col: i % cols.length });
    }
    if (pieces.length > slots) pieces = pieces.slice(-slots);
  }

  function step(dt: number) {
    pieces = pieces.filter((o) => (o.life -= dt) > 0);
    for (let i = 0; i < slots; i++) {
      const o = pieces[i];
      if (!o) {
        mesh.setMatrixAt(i, zero);
        continue;
      }
      o.vy -= 40 * dt;
      o.vx *= 0.985;
      o.vz *= 0.985;
      o.x += o.vx * dt;
      o.y = Math.max(0.5, o.y + o.vy * dt);
      o.z += o.vz * dt;
      o.rx += o.sx * dt;
      o.ry += o.sy * dt;
      m4.compose(pos.set(o.x, o.y, o.z), q.setFromEuler(e.set(o.rx, o.ry, 0)), one);
      mesh.setMatrixAt(i, m4);
      mesh.setColorAt(i, cols[o.col]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  return { mesh, burst, step, active: () => pieces.length };
}
