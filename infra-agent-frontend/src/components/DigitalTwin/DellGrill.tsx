"use client";

/**
 * DellGrill.tsx - Honeycomb grill panel for Dell server racks and servers.
 *
 * Fully parametric: dimensions are world-space, hex size is configurable,
 * and the logo / mounting flanges / lock cylinder are optional. This makes
 * the same component reusable for both the rack-top banner and the
 * smaller per-server bezel grills.
 */

import { useEffect, useMemo } from "react";
import * as THREE from "three";

import { getDellGrillLogoTexture, DELL_GRILL_LOGO_ASPECT } from "./dellLogoTextures";

interface DellGrillProps {
  position?: [number, number, number];
  /** Panel width in world units. */
  width?: number;
  /** Panel height in world units. */
  height?: number;
  /** Outer radius of one hex cell in world units. */
  hexOuter?: number;
  /** Z-extrusion of the hex/frame in world units. */
  depth?: number;
  /** Show the centered Dell wordmark. */
  showLogo?: boolean;
  /** Show side rack-mount flanges. */
  showFlanges?: boolean;
  /** Show the lower-right lock cylinder. */
  showLock?: boolean;
  /** Hex / mesh body color. */
  color?: number;
}

function buildHexRingGeometry(rOuter: number, depth: number): THREE.BufferGeometry {
  const rInner = rOuter * 0.86;
  const shape = new THREE.Shape();
  const hole = new THREE.Path();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const ox = rOuter * Math.cos(angle);
    const oy = rOuter * Math.sin(angle);
    const ix = rInner * Math.cos(angle);
    const iy = rInner * Math.sin(angle);
    if (i === 0) {
      shape.moveTo(ox, oy);
      hole.moveTo(ix, iy);
    } else {
      shape.lineTo(ox, oy);
      hole.lineTo(ix, iy);
    }
  }
  shape.closePath();
  hole.closePath();
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

function buildGrillGrid(
  panelWidth: number,
  panelHeight: number,
  rOuter: number,
): [number, number][] {
  const colStep = 1.5 * rOuter;
  const rowStep = Math.sqrt(3) * rOuter;
  const vOffset = rowStep / 2;
  const clipHW = panelWidth / 2;
  const clipHH = panelHeight / 2;
  const hexHalfW = rOuter;
  const hexHalfH = (rOuter * Math.sqrt(3)) / 2;
  const colMax = Math.ceil(clipHW / colStep) + 1;
  const rowMax = Math.ceil(clipHH / rowStep) + 1;

  const pts: [number, number][] = [];
  for (let col = -colMax; col <= colMax; col++) {
    for (let row = -rowMax; row <= rowMax; row++) {
      const x = col * colStep;
      const y = row * rowStep + (Math.abs(col) % 2 === 1 ? vOffset : 0);
      if (Math.abs(x) + hexHalfW > clipHW - 1e-4) continue;
      if (Math.abs(y) + hexHalfH > clipHH - 1e-4) continue;
      pts.push([x, y]);
    }
  }
  return pts;
}

export function DellGrill({
  position = [0, 0, 0],
  width = 0.576,
  height = 0.144,
  hexOuter = 0.04,
  depth = 0.008,
  showLogo = true,
  showFlanges = true,
  showLock = true,
  color = 0x1d1d21,
}: DellGrillProps) {
  const edge = Math.min(width, height) * 0.06;
  const innerW = Math.max(0, width - edge * 2);
  const innerH = Math.max(0, height - edge * 2);

  const grid = useMemo(() => buildGrillGrid(innerW, innerH, hexOuter), [innerW, innerH, hexOuter]);

  const hexGeometry = useMemo(() => buildHexRingGeometry(hexOuter, depth), [hexOuter, depth]);

  const grillMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.62,
        metalness: 0.55,
      }),
    [color],
  );

  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x1a1a1e,
        roughness: 0.5,
        metalness: 0.9,
      }),
    [],
  );

  const logoTexture = useMemo(() => (showLogo ? getDellGrillLogoTexture() : null), [showLogo]);

  const logoMaterial = useMemo(() => {
    if (!logoTexture) return null;
    // Always draw above the hex mesh so grill lines never cut
    // through the wordmark (depthTest off + high renderOrder).
    return new THREE.MeshBasicMaterial({
      map: logoTexture,
      transparent: true,
      opacity: 1.0,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      premultipliedAlpha: true,
    });
  }, [logoTexture]);

  const hexInst = useMemo(() => {
    const mesh = new THREE.InstancedMesh(hexGeometry, grillMat, Math.max(1, grid.length));
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    const dummy = new THREE.Object3D();
    grid.forEach(([x, y], i) => {
      dummy.position.set(x, y, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    if (grid.length === 0) {
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      mesh.setMatrixAt(0, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }, [hexGeometry, grillMat, grid]);

  useEffect(() => {
    return () => {
      grillMat.dispose();
      frameMat.dispose();
      logoMaterial?.dispose();
      hexInst.dispose();
      hexGeometry.dispose();
    };
  }, [grillMat, frameMat, logoMaterial, hexInst, hexGeometry]);

  const maxLogoW = innerW * 0.88;
  const maxLogoH = innerH * 0.48;

  let logoHeight = maxLogoH;
  let logoWidth = logoHeight * DELL_GRILL_LOGO_ASPECT;
  if (logoWidth > maxLogoW) {
    logoWidth = maxLogoW;
    logoHeight = logoWidth / DELL_GRILL_LOGO_ASPECT;
  }

  const frameDepth = depth + 0.002;

  return (
    <group position={position}>
      {/* Hex honeycomb pattern */}
      <group position={[0, 0, depth / 2]}>
        <primitive object={hexInst} />
      </group>

      {/* Frame border strips */}
      <mesh position={[-(width / 2 - edge / 2), 0, 0]}>
        <boxGeometry args={[edge, height, frameDepth]} />
        <primitive object={frameMat} attach="material" />
      </mesh>
      <mesh position={[width / 2 - edge / 2, 0, 0]}>
        <boxGeometry args={[edge, height, frameDepth]} />
        <primitive object={frameMat} attach="material" />
      </mesh>
      <mesh position={[0, height / 2 - edge / 2, 0]}>
        <boxGeometry args={[width, edge, frameDepth]} />
        <primitive object={frameMat} attach="material" />
      </mesh>
      <mesh position={[0, -(height / 2 - edge / 2), 0]}>
        <boxGeometry args={[width, edge, frameDepth]} />
        <primitive object={frameMat} attach="material" />
      </mesh>

      {/* Side rack-mount flanges */}
      {showFlanges && (
        <>
          <mesh position={[-(width / 2 + edge * 2.4), 0, -depth / 2 - 0.002]}>
            <boxGeometry args={[edge * 4.8, height + edge, depth + 0.004]} />
            <meshStandardMaterial color={0x161618} roughness={0.44} metalness={0.95} />
          </mesh>
          <mesh position={[width / 2 + edge * 2.4, 0, -depth / 2 - 0.002]}>
            <boxGeometry args={[edge * 4.8, height + edge, depth + 0.004]} />
            <meshStandardMaterial color={0x161618} roughness={0.44} metalness={0.95} />
          </mesh>
        </>
      )}

      {/* Centered Dell wordmark — in front of the honeycomb */}
      {showLogo && logoMaterial && (
        <mesh position={[0, 0, depth / 2 + depth + 0.002]} renderOrder={100}>
          <planeGeometry args={[logoWidth, logoHeight]} />
          <primitive object={logoMaterial} attach="material" />
        </mesh>
      )}

      {/* Lock cylinder lower-right */}
      {showLock && (
        <group position={[width / 2 - edge * 3, -(height / 2 - edge * 1.4), depth / 2 + 0.004]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[edge * 0.45, edge * 0.45, edge * 0.35, 12]} />
            <meshStandardMaterial color={0x2c2c32} roughness={0.38} metalness={0.94} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export default DellGrill;
