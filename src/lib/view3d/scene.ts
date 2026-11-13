// The city as three.js objects: ground, parks, water, buildings, fog and light (docs/decisions/2026-11-13-3d-konzept.md, step 5).
// Geometry comes from geometry.ts, colours from the CSS tokens. A theme change only sets colours, nothing is rebuilt.

import {
  BufferAttribute, BufferGeometry, Color, DirectionalLight, Fog, Group, HemisphereLight, Mesh, MeshBasicMaterial,
  MeshLambertMaterial, PlaneGeometry, type Material, type PerspectiveCamera, type Scene,
} from "three";
import type { SceneData } from "../osm";
import { areaMesh, buildingMesh, groupTiles, type Mesh as MeshData } from "./geometry";

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
