"use client";

/**
 * Shared procedural floor texture for the data centre scene.
 *
 * Generates a polished-concrete tile texture at runtime via Canvas2D,
 * memoised so each consumer reuses the same GPU resource. The texture
 * is wrapped in both directions so callers can tile it freely with
 * `texture.repeat.set(...)` after consuming it.
 *
 * Used by:
 *   - `DataCenterEnvironment` (interior data hall floor)
 *   - `BuildingExterior` ground plane (so the building sits on the same
 *     visual surface as its interior)
 */

import { useMemo } from "react";
import * as THREE from "three";

export function useFloorTexture(): THREE.Texture {
  return useMemo(() => {
    const SIZE = 512;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#3a3d45";
    ctx.fillRect(0, 0, SIZE, SIZE);

    const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 14;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);

    ctx.strokeStyle = "#1c1e24";
    ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, SIZE, SIZE);

    ctx.strokeStyle = "#494c54";
    ctx.lineWidth = 1;
    ctx.strokeRect(4, 4, SIZE - 8, SIZE - 8);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 16;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
}
