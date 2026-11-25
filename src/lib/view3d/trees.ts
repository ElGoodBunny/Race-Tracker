// Trees from OSM as one instanced mesh (docs/decisions/2026-11-13-3d-konzept.md, step 6).
// Only near the camera target and only up close: in the overview the green park areas carry the city.
// Which trees and how they vary comes from geometry.ts (nearestTrees, treeLook), so it is tested without WebGL.

import {
  BufferAttribute, Color, CylinderGeometry, DynamicDrawUsage, IcosahedronGeometry, InstancedMesh, Matrix4, MeshLambertMaterial, Quaternion,
  Vector3, type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { TREE_MAX, TREE_RADIUS_M, nearestTrees, treeGrid, treeLook } from "./geometry";
import type { Layer } from "./layer";
import { toThree } from "./world";

/** Trees show up to this camera distance (m). The follow mode is at 140 m, zoomed out to 400 m the city alone fills the budget (km 33: 125,000 triangles with trees). */
const TREES_UNTIL_M = 300;
/** The set of trees is looked up again when the camera target has moved this far (m). */
const REFILL_M = 30;

/**
 * One tree: a crown of 20 faces on a short trunk of 3 sides, 26 triangles, about 8 m high.
 * Crown first, then trunk, so the colour attribute can tell them apart.
 */
function treeGeometry(): { geometry: BufferGeometry; crownVertices: number } {
  const crown = new IcosahedronGeometry(3, 0).translate(0, 6, 0);
  const trunk = new CylinderGeometry(0.25, 0.35, 4, 3, 1, true).translate(0, 2, 0).toNonIndexed();
  const crownVertices = crown.getAttribute("position").count;
  const geometry = mergeGeometries([crown, trunk])!;
  crown.dispose();
  trunk.dispose();
  geometry.setAttribute("color", new BufferAttribute(new Float32Array(geometry.getAttribute("position").count * 3), 3));
  return { geometry, crownVertices };
}

export function createTrees(trees: readonly number[]): Layer {
  const grid = treeGrid(trees);
  const { geometry, crownVertices } = treeGeometry();
  const material = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const mesh = new InstancedMesh(geometry, material, TREE_MAX);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.count = 0;
  mesh.renderOrder = 3;
  // All instances lie around the camera target, so testing them against the view would save nothing.
  mesh.frustumCulled = false;
  mesh.visible = false;

  const m = new Matrix4();
  const q = new Quaternion();
  const up = new Vector3(0, 1, 0);
  const pos = new Vector3();
  const size = new Vector3();
  const shade = new Color();
  let filledAt: { x: number; y: number } | null = null;

  function fill(x: number, y: number) {
    const near = nearestTrees(grid, x, y, TREE_RADIUS_M, TREE_MAX);
    for (let i = 0; i < near.length / 2; i++) {
      const [tx, ty] = [near[2 * i], near[2 * i + 1]];
      const look = treeLook(tx, ty);
      pos.set(...toThree(tx, ty));
      q.setFromAxisAngle(up, look.turn);
      size.setScalar(look.scale);
      mesh.setMatrixAt(i, m.compose(pos, q, size));
      mesh.setColorAt(i, shade.setScalar(look.shade));
    }
    mesh.count = near.length / 2;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    filledAt = { x, y };
  }

  return {
    object: mesh,
    frame(f) {
      mesh.visible = f.pose.dist <= TREES_UNTIL_M && trees.length > 0;
      if (!mesh.visible) return;
      if (!filledAt || Math.hypot(f.pose.x - filledAt.x, f.pose.y - filledAt.y) > REFILL_M) fill(f.pose.x, f.pose.y);
    },
    setColors(t) {
      const colors = geometry.getAttribute("color") as BufferAttribute;
      const crown = new Color(t["tree"]);
      const trunk = new Color(t["trunk"]);
      for (let i = 0; i < colors.count; i++) {
        const c = i < crownVertices ? crown : trunk;
        colors.setXYZ(i, c.r, c.g, c.b);
      }
      colors.needsUpdate = true;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    },
  };
}
