"use client";

/**
 * Static rack-shell materials shared by every `RackShell` instance.
 * Created once at module scope (rather than per-rack) to keep draw-call
 * and allocation overhead down when many racks are on screen at once.
 */

import * as THREE from "three";

export const sharedRackMaterials = {
  frame: new THREE.MeshStandardMaterial({
    color: "#1a1a1a",
    metalness: 0.85,
    roughness: 0.3,
  }),
  back: new THREE.MeshStandardMaterial({
    color: "#0a0a0a",
    metalness: 0.5,
    roughness: 0.5,
  }),
  doorFrame: new THREE.MeshStandardMaterial({
    color: "#1a1a1a",
    metalness: 0.9,
    roughness: 0.25,
  }),
  sidePanel: new THREE.MeshStandardMaterial({
    color: "#151518",
    metalness: 0.7,
    roughness: 0.4,
  }),
  edgeTrim: new THREE.MeshStandardMaterial({
    color: "#808088",
    metalness: 0.95,
    roughness: 0.15,
  }),
  handle: new THREE.MeshStandardMaterial({
    color: "#2a2a2e",
    metalness: 0.9,
    roughness: 0.2,
  }),
  handleGrip: new THREE.MeshStandardMaterial({
    color: "#404048",
    metalness: 0.8,
    roughness: 0.3,
  }),
  feet: new THREE.MeshStandardMaterial({
    color: "#1a1a1a",
    metalness: 0.6,
    roughness: 0.5,
  }),
  logoBadge: new THREE.MeshStandardMaterial({
    color: "#1a1a1e",
    metalness: 0.8,
    roughness: 0.3,
  }),
};
