// The city as three.js objects: ground, parks, water, buildings, fog and light (docs/decisions/2026-11-13-3d-konzept.md, step 5).
// Geometry comes from geometry.ts, colours from the CSS tokens. A theme change only sets colours, nothing is rebuilt.

import {
  BufferAttribute, BufferGeometry, CanvasTexture, Color, DirectionalLight, DynamicDrawUsage, Fog, Group, HemisphereLight, Mesh, MeshBasicMaterial,
  MeshLambertMaterial, PlaneGeometry, RepeatWrapping, SRGBColorSpace, type Material, type PerspectiveCamera, type Scene,
} from "three";
import type { SceneData } from "../osm";
import { metresForPixels } from "./camera";
import { areaMesh, buildingMesh, groupTiles, ribbonIndices, ribbonPositions, ribbonSections, ribbonSplit, ribbonUVs, type Mesh as MeshData } from "./geometry";
import type { Layer } from "./layer";
import type { Track } from "./world";

export const CITY_TOKENS = ["bg", "ground", "park", "water", "building"] as const;
export type CityColors = Record<(typeof CITY_TOKENS)[number], string>;

/**
 * Near and far plane and fog for a camera at distance d (m) from its target.
 * At the follow distance of 140 m the fog runs from 900 to 1400 m, further out it grows with the distance,
 * so the overview still shows the whole course. Nothing is drawn behind the fog.
 */
export function depthRange(d: number) {
  const fogNear = (d * 900) / 140;
  const fogFar = (d * 1400) / 140;
  return { near: d / 50, far: fogFar, fogNear, fogFar };
}

function toGeometry(m: MeshData): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(m.positions, 3));
  g.setIndex(new BufferAttribute(m.indices, 1));
  g.computeBoundingSphere();
  return g;
}

/** Flat layer on the ground: no depth writes, drawn in a fixed order before the buildings. */
function flatLayer(geometry: BufferGeometry, order: number): Mesh<BufferGeometry, MeshBasicMaterial> {
  const mesh = new Mesh(geometry, new MeshBasicMaterial({ depthWrite: false }));
  mesh.renderOrder = order;
  return mesh;
}

export interface City {
  group: Group;
  /** Building triangles over all tiles. */
  triangles: number;
  tiles: number;
  setColors(c: CityColors, scene: Scene): void;
  /** Fog and depth range follow the camera distance to its target. */
  setDistance(camera: PerspectiveCamera, scene: Scene, d: number): void;
  dispose(): void;
}

export function createCity(data: SceneData): City {
  const group = new Group();

  const ground = flatLayer(new PlaneGeometry(100_000, 100_000).rotateX(-Math.PI / 2), 0);
  const parks = flatLayer(toGeometry(areaMesh(data.parks.map((ring) => ({ ring })))), 1);
  const water = flatLayer(toGeometry(areaMesh(data.water)), 2);
  group.add(ground, parks, water);

  // One mesh per 400 m tile, so three.js skips tiles outside the view by itself.
  const buildingMat = new MeshLambertMaterial({ flatShading: true });
  let triangles = 0;
  const tiles = groupTiles(data.buildings);
  for (const t of tiles) {
    const m = buildingMesh(t.buildings);
    triangles += m.indices.length / 3;
    const mesh = new Mesh(toGeometry(m), buildingMat);
    mesh.renderOrder = 3;
    group.add(mesh);
  }

  // Roofs facing up get hemi + sun ≈ π, so they show the token colour. Walls come out darker,
  // the ones facing the sun (south west, 50° high) lighter than the others.
  const hemi = new HemisphereLight(0xffffff, 0x666666, 1.6);
  const sun = new DirectionalLight(0xffffff, 2.0);
  sun.position.set(-0.45, 0.77, 0.45);
  group.add(hemi, sun);

  const fog = new Fog(0xffffff, 900, 1400);

  return {
    group,
    triangles,
    tiles: tiles.length,
    setColors(c, scene) {
      const bg = new Color(c.bg);
      scene.background = bg;
      fog.color.copy(bg);
      scene.fog = fog;
      ground.material.color.set(c.ground);
      parks.material.color.set(c.park);
      water.material.color.set(c.water);
      buildingMat.color.set(c.building);
    },
    setDistance(camera, scene, d) {
      const r = depthRange(d);
      camera.near = r.near;
      camera.far = r.far;
      camera.updateProjectionMatrix();
      fog.near = r.fogNear;
      fog.far = r.fogFar;
      scene.fog = fog;
    },
    dispose() {
      group.traverse((o) => {
        if (!(o instanceof Mesh)) return;
        o.geometry.dispose();
        (o.material as Material).dispose();
      });
    },
  };
}

/* ---------- course ribbon ---------- */

/** Width on the ground in the follow mode, and the least width on screen from far away. */
const RIBBON_M = 10;
const RIBBON_MIN_PX = 5;
/** Length of one arrow of the texture and how fast it flows along the course. */
const PATTERN_M = 24;
const FLOW_M_PER_S = 14;
/** From this camera distance on the band is drawn over the buildings. Close up it lies on the ground between them. */
const RIBBON_ON_TOP_M = 1500;

/** Small arrow pointing along the course. The material colour tints it, so a theme change needs no new texture. */
function arrowTexture(): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#d6d6d6";
  g.fillRect(0, 0, 32, 64);
  g.strokeStyle = "#ffffff";
  g.lineWidth = 5;
  g.lineJoin = "round";
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(8, 40);
  g.lineTo(16, 26);
  g.lineTo(24, 40);
  g.stroke();
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  return t;
}

/**
 * The course as a flat band on the ground (step 7): the part already run in the route colour, the rest paler.
 * One geometry with two draw ranges plus a small tip that ends exactly under the runner. Drawn after the water
 * and before the buildings, without depth writes, like the other flat layers.
 */
export function createRibbon(track: Track, km: readonly number[]): Layer {
  const sections = ribbonSections(track.xy, km);
  const geometry = new BufferGeometry();
  const position = new BufferAttribute(ribbonPositions(sections, RIBBON_M), 3).setUsage(DynamicDrawUsage);
  geometry.setAttribute("position", position);
  geometry.setAttribute("uv", new BufferAttribute(ribbonUVs(sections, PATTERN_M), 2));
  geometry.setIndex(new BufferAttribute(ribbonIndices(sections.length), 1));
  geometry.computeBoundingSphere();
  const total = (sections.length - 1) * 6;

  const map = arrowTexture();
  const done = new MeshBasicMaterial({ map, depthWrite: false });
  const todo = new MeshBasicMaterial({ map, depthWrite: false });
  const band = new Mesh(geometry, [done, todo]);
  band.renderOrder = 2.5;

  const tipGeometry = new BufferGeometry();
  const tipPosition = new BufferAttribute(new Float32Array(12), 3).setUsage(DynamicDrawUsage);
  const tipUv = new BufferAttribute(new Float32Array(8), 2).setUsage(DynamicDrawUsage);
  tipGeometry.setAttribute("position", tipPosition);
  tipGeometry.setAttribute("uv", tipUv);
  tipGeometry.setIndex([0, 1, 3, 0, 3, 2]);
  const tip = new Mesh(tipGeometry, done);
  tip.renderOrder = 2.6;
  tip.frustumCulled = false;

  const group = new Group();
  group.add(band, tip);
  let width = RIBBON_M;
  let whole = -1;
  let onTop = false;
  const range = (n: number) => {
    geometry.clearGroups();
    geometry.addGroup(0, n * 6, 0);
    geometry.addGroup(n * 6, total - n * 6, 1);
  };
  range(0);

  return {
    object: group,
    frame(f) {
      // Far away a 10 m band would be a hairline, so it keeps a least width on screen.
      const w = Math.max(RIBBON_M, metresForPixels(RIBBON_MIN_PX, f.pose.dist, f.height));
      if (Math.abs(w - width) > 0.04 * width) {
        width = w;
        ribbonPositions(sections, width, position.array as Float32Array);
        position.needsUpdate = true;
        geometry.computeBoundingSphere();
      }
      // From far away the houses would hide the course in every street, so there it goes on top like a line on a map.
      if (f.pose.dist > RIBBON_ON_TOP_M !== onTop) {
        onTop = !onTop;
        done.depthTest = todo.depthTest = !onTop;
        band.renderOrder = onTop ? 4.5 : 2.5;
        tip.renderOrder = onTop ? 4.6 : 2.6;
      }
      if (f.animate) map.offset.y = -((f.now / 1000) * FLOW_M_PER_S) / PATTERN_M % 1;
      if (!f.sample || !f.runner) {
        tip.visible = false;
        return;
      }
      const split = ribbonSplit(sections, f.sample.km, f.runner, width, PATTERN_M);
      if (split.whole !== whole) range((whole = split.whole));
      tipPosition.set(split.positions);
      tipUv.set(split.uvs);
      tipPosition.needsUpdate = tipUv.needsUpdate = true;
      tip.visible = true;
    },
    setColors(t) {
      done.color.set(t["route"]);
      todo.color.set(t["route-todo"]);
    },
    dispose() {
      geometry.dispose();
      tipGeometry.dispose();
      done.dispose();
      todo.dispose();
      map.dispose();
    },
  };
}
