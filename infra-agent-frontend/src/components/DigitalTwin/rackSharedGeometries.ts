"use client";

/**
 * Shared rack geometries - created once, reused across all ServerRack instances.
 * Optimized for minimal triangle count.
 */
import * as THREE from "three";

const RACK_WIDTH = 0.6;
const RACK_HEIGHT = 1.9;
const RACK_DEPTH = 0.8;
const POST_SIZE = 0.03;
const DOOR_FRAME_WIDTH = 0.03;
const PANEL_THICKNESS = 0.02;

/** Outer shell span derived from merged static rack parts. */
const RACK_SHELL_WIDTH = RACK_WIDTH + 0.04;
const RACK_SHELL_HEIGHT = RACK_HEIGHT + 0.05;
const RACK_SHELL_DEPTH = 0.8;
const RACK_SHELL_CENTER: [number, number, number] = [0.3, -0.015, 0.12];

/** Padding around the rack shell for selection highlight and clicks. */
const RACK_HIGHLIGHT_PAD = 0.05;

export const rackHighlightBounds = {
  center: RACK_SHELL_CENTER,
  size: [
    RACK_SHELL_WIDTH + RACK_HIGHLIGHT_PAD,
    RACK_SHELL_HEIGHT + RACK_HIGHLIGHT_PAD * 2,
    RACK_SHELL_DEPTH + RACK_HIGHLIGHT_PAD,
  ] as [number, number, number],
};

export const rackGeo = {
  rackHighlight: new THREE.BoxGeometry(
    rackHighlightBounds.size[0],
    rackHighlightBounds.size[1],
    rackHighlightBounds.size[2],
  ),

  post: new THREE.BoxGeometry(POST_SIZE, RACK_HEIGHT - 0.1, POST_SIZE),

  rackBack: new THREE.BoxGeometry(RACK_WIDTH + 0.04, RACK_HEIGHT + 0.02, PANEL_THICKNESS),

  topPanel: new THREE.BoxGeometry(RACK_WIDTH + 0.04, PANEL_THICKNESS, RACK_DEPTH),

  bottomPanel: new THREE.BoxGeometry(RACK_WIDTH + 0.04, PANEL_THICKNESS, RACK_DEPTH),

  sidePanel: new THREE.BoxGeometry(PANEL_THICKNESS, RACK_HEIGHT + 0.02, RACK_DEPTH),

  doorFrameVertical: new THREE.BoxGeometry(DOOR_FRAME_WIDTH, RACK_HEIGHT - 0.05, 0.025),
  doorFrameHorizontal: new THREE.BoxGeometry(RACK_WIDTH + 0.02, DOOR_FRAME_WIDTH, 0.025),

  meshDoor: new THREE.BoxGeometry(RACK_WIDTH - 0.04, RACK_HEIGHT - 0.08, 0.015),

  doorHandle: new THREE.BoxGeometry(0.02, 0.15, 0.025),
  doorHandleGrip: new THREE.CylinderGeometry(0.008, 0.008, 0.12, 8),

  edgeTrimVertical: new THREE.BoxGeometry(0.02, RACK_HEIGHT + 0.02, 0.02),
  edgeTrimHorizontal: new THREE.BoxGeometry(RACK_WIDTH + 0.04, 0.02, 0.02),

  logoBadge: new THREE.CylinderGeometry(0.04, 0.04, 0.008, 16),
  logoBadgeRing: new THREE.RingGeometry(0.035, 0.042, 16),

  foot: new THREE.CylinderGeometry(0.02, 0.015, 0.03, 6),

  deviceChassis: new THREE.BoxGeometry(0.52, 1, 0.8),
  deviceBezel: new THREE.BoxGeometry(0.54, 1, 0.006),
  deviceEdgeAccent: new THREE.BoxGeometry(0.55, 0.006, 0.01),
  ledSquare: new THREE.BoxGeometry(0.022, 0.022, 0.004),
  ledStrip: new THREE.BoxGeometry(0.12, 0.012, 0.003),
  handle: new THREE.BoxGeometry(0.022, 1, 0.012),
} as const;

let sharedDoorTexture: THREE.CanvasTexture | null = null;

export function getPerforatedDoorTexture(): THREE.CanvasTexture {
  if (sharedDoorTexture) return sharedDoorTexture;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0a0a0c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const holeRadius = 3;
  const spacingX = 10;
  const spacingY = 10;

  ctx.fillStyle = "#1a1a1e";

  for (let y = spacingY / 2; y < canvas.height; y += spacingY) {
    const offset = (Math.floor(y / spacingY) % 2) * (spacingX / 2);
    for (let x = spacingX / 2 + offset; x < canvas.width; x += spacingX) {
      ctx.beginPath();
      ctx.arc(x, y, holeRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  sharedDoorTexture = new THREE.CanvasTexture(canvas);
  sharedDoorTexture.wrapS = THREE.RepeatWrapping;
  sharedDoorTexture.wrapT = THREE.RepeatWrapping;
  sharedDoorTexture.repeat.set(2, 4);
  sharedDoorTexture.colorSpace = THREE.SRGBColorSpace;
  sharedDoorTexture.needsUpdate = true;
  return sharedDoorTexture;
}

let sharedRackLogoTexture: THREE.CanvasTexture | null = null;

export function getDellLogoBadgeTexture(): THREE.CanvasTexture {
  if (sharedRackLogoTexture) return sharedRackLogoTexture;

  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#1a1a1e";
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#404048";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.stroke();

  ctx.font = '900 28px "Arial Narrow", Arial, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 4;

  ctx.fillText("D", 35, 64);
  ctx.save();
  ctx.translate(54, 64);
  ctx.rotate((45 * Math.PI) / 180);
  ctx.fillText("E", 0, 0);
  ctx.restore();
  ctx.fillText("LL", 82, 64);

  sharedRackLogoTexture = new THREE.CanvasTexture(canvas);
  sharedRackLogoTexture.colorSpace = THREE.SRGBColorSpace;
  sharedRackLogoTexture.needsUpdate = true;
  return sharedRackLogoTexture;
}
