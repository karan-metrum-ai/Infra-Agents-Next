"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { computeAspectFov } from "./aspectFov";
import type { AspectFovProps } from "./AspectFov.types";

/**
 * Place inside a <Canvas>, alongside its camera, to keep the horizontal
 * FOV pinned to the 16:9 design aspect on ultrawide/super-ultrawide
 * viewports instead of revealing extra empty space at the sides. See
 * aspectFov.ts for the math. Only for scenes where nothing else writes
 * camera.fov per frame -- DigitalTwinScene's animated focus poses fold
 * the same helper into their own fov values instead of using this.
 */
export function AspectFov({ baseFov }: AspectFovProps) {
  const camera = useThree((state) => state.camera);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera) || height === 0) return;
    camera.fov = computeAspectFov(baseFov, width / height);
    camera.updateProjectionMatrix();
  }, [camera, baseFov, width, height]);

  return null;
}

export default AspectFov;
