"use client";

/**
 * RackPSU.tsx - CyberPower-style Rack-mounted PDU for server rack visualization
 *
 * A 1U power distribution unit with:
 * - Black chassis with rounded edges
 * - Power button with red ring indicator
 * - CyberPower-style branding
 * - NEMA power outlets on the right side
 * - Rack mount ears
 *
 * Optimized for low triangle count using shared materials and geometries.
 */

import { useMemo } from "react";
import * as THREE from "three";

let sharedPSULogoTexture: THREE.CanvasTexture | null = null;

function getSharedPSULogoTexture(): THREE.CanvasTexture {
  if (sharedPSULogoTexture) return sharedPSULogoTexture;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 48;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.font = '500 18px "Arial", sans-serif';
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = "#cccccc";
  ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
  ctx.shadowBlur = 2;
  ctx.fillText("CyberPower", canvas.width / 2, canvas.height / 2);

  sharedPSULogoTexture = new THREE.CanvasTexture(canvas);
  sharedPSULogoTexture.anisotropy = 8;
  sharedPSULogoTexture.colorSpace = THREE.SRGBColorSpace;
  sharedPSULogoTexture.needsUpdate = true;
  return sharedPSULogoTexture;
}

const sharedPSUMaterials = {
  chassis: new THREE.MeshStandardMaterial({
    color: "#1a1a1e",
    metalness: 0.2,
    roughness: 0.85,
  }),
  faceplate: new THREE.MeshStandardMaterial({
    color: "#7e8188",
    metalness: 0.75,
    roughness: 0.35,
  }),
  rackEar: new THREE.MeshStandardMaterial({
    color: "#1a1a1e",
    metalness: 0.25,
    roughness: 0.8,
  }),
  outletPanel: new THREE.MeshStandardMaterial({
    color: "#0a0a0c",
    metalness: 0.1,
    roughness: 0.85,
  }),
  outlet: new THREE.MeshStandardMaterial({
    color: "#1a1a1e",
    metalness: 0.2,
    roughness: 0.8,
  }),
  outletSlot: new THREE.MeshStandardMaterial({
    color: "#050505",
    metalness: 0.1,
    roughness: 0.9,
  }),
  powerButtonRing: new THREE.MeshStandardMaterial({
    color: "#cc0000",
    emissive: "#cc0000",
    emissiveIntensity: 0.8,
  }),
  powerButtonCenter: new THREE.MeshStandardMaterial({
    color: "#1a1a1e",
    metalness: 0.3,
    roughness: 0.7,
  }),
  powerLEDOn: new THREE.MeshStandardMaterial({
    color: "#00cc44",
    emissive: "#00cc44",
    emissiveIntensity: 1.5,
  }),
  mountScrew: new THREE.MeshStandardMaterial({
    color: "#505058",
    metalness: 0.5,
    roughness: 0.6,
  }),
  edgeAccent: new THREE.MeshStandardMaterial({
    color: "#2a2a2e",
    metalness: 0.3,
    roughness: 0.75,
  }),
  modelLabel: new THREE.MeshStandardMaterial({
    color: "#888888",
    metalness: 0.15,
    roughness: 0.8,
  }),
};

const sharedPSUGeometries = {
  screw: new THREE.CylinderGeometry(0.003, 0.003, 0.004, 6),
  outletSlot: new THREE.BoxGeometry(0.004, 0.008, 0.002),
};

export interface RackPSUProps {
  heightU?: number;
  isSelected?: boolean;
  isPoweredOn?: boolean;
  outletCount?: number;
}

export function RackPSU({
  heightU = 1,
  isSelected = false,
  isPoweredOn = true,
  outletCount = 4,
}: RackPSUProps) {
  const height = heightU * 0.044;
  const psuWidth = 0.6;
  const psuDepth = 0.75;
  const faceplateZ = psuDepth / 2;

  const chassisMaterial = isSelected
    ? new THREE.MeshStandardMaterial({
        color: "#00aa66",
        emissive: "#00aa66",
        emissiveIntensity: 0.2,
        metalness: 0.6,
        roughness: 0.4,
      })
    : sharedPSUMaterials.chassis;

  const powerRingMaterial = isPoweredOn
    ? sharedPSUMaterials.powerButtonRing
    : new THREE.MeshStandardMaterial({
        color: "#333333",
        metalness: 0.5,
        roughness: 0.4,
      });

  const powerLEDMaterial = isPoweredOn
    ? sharedPSUMaterials.powerLEDOn
    : new THREE.MeshStandardMaterial({
        color: "#1a1a1a",
        metalness: 0.3,
        roughness: 0.5,
      });

  const logoMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: getSharedPSULogoTexture(),
      transparent: true,
    });
  }, []);

  return (
    <group>
      {/* Main chassis body */}
      <mesh castShadow material={chassisMaterial}>
        <boxGeometry args={[psuWidth, height, psuDepth]} />
      </mesh>

      {/* Front faceplate */}
      <mesh position={[0, 0, faceplateZ]} material={sharedPSUMaterials.faceplate}>
        <boxGeometry args={[psuWidth + 0.02, height * 1.02, 0.008]} />
      </mesh>

      {/* Rack mount ears - left */}
      <mesh
        position={[-psuWidth / 2 - 0.012, 0, faceplateZ - 0.004]}
        material={sharedPSUMaterials.rackEar}
      >
        <boxGeometry args={[0.025, height * 0.92, 0.016]} />
      </mesh>

      {/* Rack mount ears - right */}
      <mesh
        position={[psuWidth / 2 + 0.012, 0, faceplateZ - 0.004]}
        material={sharedPSUMaterials.rackEar}
      >
        <boxGeometry args={[0.025, height * 0.92, 0.016]} />
      </mesh>

      {/* Mount screws - left ear */}
      {[-1, 1].map((yMult, i) => (
        <mesh
          key={`screw-left-${i}`}
          position={[-psuWidth / 2 - 0.018, yMult * height * 0.25, faceplateZ + 0.002]}
          rotation={[Math.PI / 2, 0, 0]}
          geometry={sharedPSUGeometries.screw}
          material={sharedPSUMaterials.mountScrew}
        />
      ))}

      {/* Mount screws - right ear */}
      {[-1, 1].map((yMult, i) => (
        <mesh
          key={`screw-right-${i}`}
          position={[psuWidth / 2 + 0.018, yMult * height * 0.25, faceplateZ + 0.002]}
          rotation={[Math.PI / 2, 0, 0]}
          geometry={sharedPSUGeometries.screw}
          material={sharedPSUMaterials.mountScrew}
        />
      ))}

      {/* Power button with red ring - center-left area */}
      <group position={[-psuWidth * 0.15, 0, faceplateZ + 0.006]}>
        {/* Outer red ring */}
        <mesh material={powerRingMaterial}>
          <ringGeometry args={[0.008, 0.012, 24]} />
        </mesh>
        {/* Center button */}
        <mesh position={[0, 0, 0.001]} material={sharedPSUMaterials.powerButtonCenter}>
          <circleGeometry args={[0.007, 16]} />
        </mesh>
        {/* Small power LED indicator */}
        <mesh position={[0.02, 0, 0]} material={powerLEDMaterial}>
          <boxGeometry args={[0.004, 0.004, 0.002]} />
        </mesh>
      </group>

      {/* CyberPower logo */}
      <mesh position={[-psuWidth * 0.32, 0, faceplateZ + 0.01]} material={logoMaterial}>
        <planeGeometry args={[0.08, 0.015]} />
      </mesh>

      {/* Model number label */}
      <mesh
        position={[-psuWidth * 0.05, height * 0.25, faceplateZ + 0.006]}
        material={sharedPSUMaterials.modelLabel}
      >
        <boxGeometry args={[0.05, 0.004, 0.001]} />
      </mesh>

      {/* Outlet panel area - right side */}
      <mesh
        position={[psuWidth * 0.25, 0, faceplateZ + 0.004]}
        material={sharedPSUMaterials.outletPanel}
      >
        <boxGeometry args={[psuWidth * 0.45, height * 0.85, 0.008]} />
      </mesh>

      {/* NEMA power outlets */}
      <group position={[psuWidth * 0.25, 0, faceplateZ + 0.01]}>
        {Array.from({ length: Math.min(outletCount, 4) }).map((_, i) => {
          const spacing = 0.055;
          const startX = -((outletCount - 1) * spacing) / 2;
          const xPos = startX + i * spacing;

          return (
            <group key={`outlet-${i}`} position={[xPos, 0, 0]}>
              {/* Outlet housing */}
              <mesh material={sharedPSUMaterials.outlet}>
                <boxGeometry args={[0.032, 0.028, 0.006]} />
              </mesh>
              {/* Outlet face (darker recessed area) */}
              <mesh position={[0, 0, 0.004]} material={sharedPSUMaterials.outletPanel}>
                <boxGeometry args={[0.026, 0.022, 0.002]} />
              </mesh>
              {/* Left vertical slot */}
              <mesh
                position={[-0.006, 0.004, 0.006]}
                geometry={sharedPSUGeometries.outletSlot}
                material={sharedPSUMaterials.outletSlot}
              />
              {/* Right vertical slot */}
              <mesh
                position={[0.006, 0.004, 0.006]}
                geometry={sharedPSUGeometries.outletSlot}
                material={sharedPSUMaterials.outletSlot}
              />
              {/* Ground slot (round hole) */}
              <mesh position={[0, -0.006, 0.006]} material={sharedPSUMaterials.outletSlot}>
                <circleGeometry args={[0.003, 8]} />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* Edge accent strips - top */}
      <mesh
        position={[0, height * 0.48, faceplateZ + 0.002]}
        material={sharedPSUMaterials.edgeAccent}
      >
        <boxGeometry args={[psuWidth - 0.02, 0.002, 0.004]} />
      </mesh>

      {/* Edge accent strips - bottom */}
      <mesh
        position={[0, -height * 0.48, faceplateZ + 0.002]}
        material={sharedPSUMaterials.edgeAccent}
      >
        <boxGeometry args={[psuWidth - 0.02, 0.002, 0.004]} />
      </mesh>

      {/* Side rails */}
      <mesh position={[-psuWidth / 2 - 0.002, 0, 0]} material={sharedPSUMaterials.edgeAccent}>
        <boxGeometry args={[0.004, height * 0.95, psuDepth * 0.85]} />
      </mesh>
      <mesh position={[psuWidth / 2 + 0.002, 0, 0]} material={sharedPSUMaterials.edgeAccent}>
        <boxGeometry args={[0.004, height * 0.95, psuDepth * 0.85]} />
      </mesh>

      {/* Rear cable entry area */}
      <mesh position={[0, 0, -psuDepth / 2 + 0.006]} material={sharedPSUMaterials.outletPanel}>
        <boxGeometry args={[psuWidth * 0.4, height * 0.6, 0.01]} />
      </mesh>
    </group>
  );
}

export default RackPSU;
