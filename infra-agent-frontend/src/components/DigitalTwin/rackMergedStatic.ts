"use client";

/**
 * Pre-merged static rack geometry (one buffer per material group).
 * Fully enclosed Dell-style server rack - no gaps on sides or top.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rackGeo } from "./rackSharedGeometries";

interface Part {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  rotation?: [number, number, number];
}

function mergeParts(parts: Part[]): THREE.BufferGeometry {
  const clones: THREE.BufferGeometry[] = parts.map((p) => {
    const g = p.geometry.clone();
    g.translate(p.position[0], p.position[1], p.position[2]);
    if (p.rotation) {
      const euler = new THREE.Euler(p.rotation[0], p.rotation[1], p.rotation[2]);
      const matrix = new THREE.Matrix4().makeRotationFromEuler(euler);
      g.applyMatrix4(matrix);
    }
    return g;
  });
  const merged = mergeGeometries(clones, false);
  if (!merged) throw new Error("mergeGeometries failed");
  clones.forEach((c) => c.dispose());
  return merged;
}

const CX = 0.3;
const CZ = 0.1;

export const mergedRackStaticGeo = {
  rackFrame: mergeParts([
    { geometry: rackGeo.post, position: [0.02, 0, 0.45] },
    { geometry: rackGeo.post, position: [0.58, 0, 0.45] },
    { geometry: rackGeo.post, position: [0.02, 0, -0.25] },
    { geometry: rackGeo.post, position: [0.58, 0, -0.25] },
  ]),

  rackBack: mergeParts([{ geometry: rackGeo.rackBack, position: [CX, 0, -0.27] }]),

  topPanel: mergeParts([{ geometry: rackGeo.topPanel, position: [CX, 0.96, CZ] }]),

  bottomPanel: mergeParts([{ geometry: rackGeo.bottomPanel, position: [CX, -0.96, CZ] }]),

  sidePanels: mergeParts([
    { geometry: rackGeo.sidePanel, position: [-0.02, 0, CZ] },
    { geometry: rackGeo.sidePanel, position: [0.62, 0, CZ] },
  ]),

  doorFrame: mergeParts([
    { geometry: rackGeo.doorFrameVertical, position: [-0.01, 0, 0.5] },
    { geometry: rackGeo.doorFrameVertical, position: [0.61, 0, 0.5] },
    { geometry: rackGeo.doorFrameHorizontal, position: [CX, 0.92, 0.5] },
    { geometry: rackGeo.doorFrameHorizontal, position: [CX, -0.92, 0.5] },
  ]),

  meshDoor: mergeParts([{ geometry: rackGeo.meshDoor, position: [CX, 0, 0.5] }]),

  edgeTrim: mergeParts([
    { geometry: rackGeo.edgeTrimVertical, position: [-0.02, 0, 0.52] },
    { geometry: rackGeo.edgeTrimVertical, position: [0.62, 0, 0.52] },
    { geometry: rackGeo.edgeTrimHorizontal, position: [CX, 0.96, 0.52] },
    { geometry: rackGeo.edgeTrimHorizontal, position: [CX, -0.96, 0.52] },
  ]),

  doorHandle: mergeParts([{ geometry: rackGeo.doorHandle, position: [0.58, 0, 0.52] }]),

  feet: mergeParts([
    { geometry: rackGeo.foot, position: [0.08, -0.99, 0.4], rotation: [0, 0, 0] },
    { geometry: rackGeo.foot, position: [0.52, -0.99, 0.4], rotation: [0, 0, 0] },
    { geometry: rackGeo.foot, position: [0.08, -0.99, -0.2], rotation: [0, 0, 0] },
    { geometry: rackGeo.foot, position: [0.52, -0.99, -0.2], rotation: [0, 0, 0] },
  ]),
} as const;
