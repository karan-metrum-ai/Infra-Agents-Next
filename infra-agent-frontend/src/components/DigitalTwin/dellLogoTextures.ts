"use client";

/**
 * Shared canvas textures for Dell branding on rack grill panels.
 */

import * as THREE from "three";

let dellGrillLogoTexture: THREE.CanvasTexture | null = null;

/** Canvas width / height — must match plane sizing in `DellGrill`. */
export const DELL_GRILL_LOGO_ASPECT = 1024 / 256;

/**
 * Stylized Dell wordmark for rack front grill panels.
 */
export function getDellGrillLogoTexture(): THREE.CanvasTexture {
  if (dellGrillLogoTexture) {
    return dellGrillLogoTexture;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const fontSize = 150;
  ctx.font = `900 ${fontSize}px "Arial Narrow", Arial, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 8;

  const centerY = canvas.height / 2;
  const measure = (text: string) => ctx.measureText(text).width;
  const dWidth = measure("D");
  const eWidth = measure("E");
  const llWidth = measure("LL");
  const totalWidth = dWidth + eWidth + llWidth;
  let cursorX = (canvas.width - totalWidth) / 2;

  ctx.textAlign = "left";
  ctx.fillText("D", cursorX, centerY);
  cursorX += dWidth;

  ctx.save();
  ctx.translate(cursorX + eWidth / 2, centerY);
  ctx.rotate((-45 * Math.PI) / 180);
  ctx.textAlign = "center";
  ctx.fillText("E", 0, 0);
  ctx.restore();
  cursorX += eWidth;

  ctx.textAlign = "left";
  ctx.fillText("LL", cursorX, centerY);

  dellGrillLogoTexture = new THREE.CanvasTexture(canvas);
  dellGrillLogoTexture.anisotropy = 16;
  dellGrillLogoTexture.colorSpace = THREE.SRGBColorSpace;
  dellGrillLogoTexture.premultiplyAlpha = true;
  dellGrillLogoTexture.needsUpdate = true;
  return dellGrillLogoTexture;
}
