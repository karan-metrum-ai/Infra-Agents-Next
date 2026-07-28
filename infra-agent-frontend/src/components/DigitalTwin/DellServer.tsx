"use client";

/**
 * DellServer.tsx - Realistic Dell PowerEdge 1U rack server
 *
 * Based on Dell PowerEdge R650/R660 series servers with:
 * - Metallic silver/gray chassis
 * - Drive bays on left side with latches
 * - Honeycomb ventilation grills on right
 * - Dell logo in center
 * - Blue power indicator
 * - Metal handles
 */

import * as THREE from "three";

import { DellGrill } from "./DellGrill";

/** Matches `rackSharedGeometries.deviceChassis` inner rack width. */
const SERVER_WIDTH = 0.52;
const SERVER_DEPTH = 0.7;

const sharedMaterials = {
  chassis: new THREE.MeshStandardMaterial({
    color: "#8a8a90",
    metalness: 0.85,
    roughness: 0.25,
  }),
  chassisSelected: new THREE.MeshStandardMaterial({
    color: "#00ff88",
    emissive: "#00ff88",
    emissiveIntensity: 0.3,
    metalness: 0.7,
    roughness: 0.3,
  }),
  chassisCritical: new THREE.MeshStandardMaterial({
    color: "#5a4a4a",
    emissive: "#cc3333",
    emissiveIntensity: 0.2,
    metalness: 0.7,
    roughness: 0.35,
  }),
  bezel: new THREE.MeshStandardMaterial({
    color: "#2a2a2e",
    metalness: 0.6,
    roughness: 0.35,
  }),
  driveBay: new THREE.MeshStandardMaterial({
    color: "#1a1a1e",
    metalness: 0.5,
    roughness: 0.4,
  }),
  driveLatch: new THREE.MeshStandardMaterial({
    color: "#3a3a40",
    metalness: 0.8,
    roughness: 0.2,
  }),
  driveLatchButton: new THREE.MeshStandardMaterial({
    color: "#555560",
    metalness: 0.9,
    roughness: 0.15,
  }),
  handle: new THREE.MeshStandardMaterial({
    color: "#4a4a50",
    metalness: 0.85,
    roughness: 0.2,
  }),
  handleGrip: new THREE.MeshStandardMaterial({
    color: "#303035",
    metalness: 0.4,
    roughness: 0.6,
  }),
  blueLED: new THREE.MeshStandardMaterial({
    color: "#0088ff",
    emissive: "#0088ff",
    emissiveIntensity: 1.2,
  }),
  greenLED: new THREE.MeshStandardMaterial({
    color: "#00ff44",
    emissive: "#00ff44",
    emissiveIntensity: 2.0,
  }),
  yellowLED: new THREE.MeshStandardMaterial({
    color: "#ffaa00",
    emissive: "#ffaa00",
    emissiveIntensity: 1.8,
  }),
  redLED: new THREE.MeshStandardMaterial({
    color: "#ff2200",
    emissive: "#ff2200",
    emissiveIntensity: 2.0,
  }),
  offLED: new THREE.MeshStandardMaterial({
    color: "#222",
    emissive: "#111",
    emissiveIntensity: 0.05,
  }),
  edgeAccent: new THREE.MeshStandardMaterial({
    color: "#606068",
    metalness: 0.9,
    roughness: 0.1,
  }),
  ventSlot: new THREE.MeshStandardMaterial({
    color: "#0a0a0c",
    metalness: 0.3,
    roughness: 0.7,
  }),
};

interface DellServerProps {
  height?: number;
  isSelected?: boolean;
  healthStatus?: "ok" | "warning" | "critical" | "unknown";
  status?: "online" | "offline" | "degraded";
}

export function DellServer({
  height = 0.052,
  isSelected = false,
  healthStatus = "ok",
  status = "online",
}: DellServerProps) {
  const chassisMaterial = isSelected
    ? sharedMaterials.chassisSelected
    : healthStatus === "critical"
      ? sharedMaterials.chassisCritical
      : sharedMaterials.chassis;

  const statusLED = isSelected
    ? sharedMaterials.greenLED
    : healthStatus === "critical"
      ? sharedMaterials.redLED
      : healthStatus === "warning"
        ? sharedMaterials.yellowLED
        : status === "online"
          ? sharedMaterials.greenLED
          : sharedMaterials.offLED;

  const powerLED = status === "online" ? sharedMaterials.blueLED : sharedMaterials.offLED;

  const bezelDepth = 0.012;
  const bezelZ = SERVER_DEPTH / 2 + 0.004;

  // Drive bays occupy left bezel; grill must sit fully to their right.
  const driveBayCenterX = -0.121;
  const driveBayWidth = 0.22;
  const driveBayRight = driveBayCenterX + driveBayWidth / 2;
  const grillGap = 0.014;
  const grillWidth = 0.2;
  const grillCenterX = driveBayRight + grillGap + grillWidth / 2;
  const grillHeight = height * 0.95;
  const grillHexOuter = Math.max(0.008, Math.min(0.016, height * 0.42));

  return (
    <group>
      <mesh castShadow material={chassisMaterial}>
        <boxGeometry args={[SERVER_WIDTH, height, SERVER_DEPTH]} />
      </mesh>

      <mesh position={[0, 0, bezelZ]} material={sharedMaterials.bezel}>
        <boxGeometry args={[SERVER_WIDTH + 0.02, height * 1.02, bezelDepth]} />
      </mesh>

      <DellGrill
        position={[grillCenterX, 0, bezelZ + 0.006]}
        width={grillWidth}
        height={grillHeight}
        hexOuter={grillHexOuter}
        depth={0.004}
        showLogo
        showFlanges={false}
        showLock={false}
        color={0x7e8188}
      />

      <mesh position={[0, height * 0.51, bezelZ + 0.003]} material={sharedMaterials.edgeAccent}>
        <boxGeometry args={[SERVER_WIDTH + 0.03, 0.004, 0.008]} />
      </mesh>

      <mesh position={[0, -height * 0.51, bezelZ + 0.003]} material={sharedMaterials.edgeAccent}>
        <boxGeometry args={[SERVER_WIDTH + 0.03, 0.004, 0.008]} />
      </mesh>

      <group position={[driveBayCenterX, 0, bezelZ]}>
        <mesh position={[0, 0, 0.002]} material={sharedMaterials.driveBay}>
          <boxGeometry args={[driveBayWidth, height * 0.95, 0.008]} />
        </mesh>

        {[-0.075, -0.025, 0.025, 0.075].map((xOffset, i) => (
          <group key={i} position={[xOffset, 0, 0.008]}>
            <mesh material={sharedMaterials.driveLatch}>
              <boxGeometry args={[0.042, height * 0.8, 0.006]} />
            </mesh>
            <mesh position={[0, 0, 0.002]} material={sharedMaterials.ventSlot}>
              <boxGeometry args={[0.036, height * 0.6, 0.003]} />
            </mesh>
            <mesh position={[0, height * 0.3, 0.004]} material={sharedMaterials.driveLatchButton}>
              <boxGeometry args={[0.018, 0.008, 0.004]} />
            </mesh>
            <mesh
              position={[0, -height * 0.32, 0.004]}
              material={i === 0 ? statusLED : sharedMaterials.greenLED}
            >
              <boxGeometry args={[0.006, 0.006, 0.003]} />
            </mesh>
          </group>
        ))}
      </group>

      <group position={[-0.238, 0, bezelZ + 0.005]}>
        <mesh material={sharedMaterials.handleGrip}>
          <boxGeometry args={[0.02, height * 0.4, 0.008]} />
        </mesh>
        <mesh position={[0, 0, 0.005]} material={powerLED}>
          <cylinderGeometry args={[0.004, 0.004, 0.003, 8]} />
        </mesh>
      </group>

      <group position={[-0.258, 0, bezelZ]}>
        <mesh material={sharedMaterials.handle}>
          <boxGeometry args={[0.018, height * 0.9, 0.015]} />
        </mesh>
        <mesh position={[-0.002, 0, 0.008]} material={sharedMaterials.handleGrip}>
          <boxGeometry args={[0.012, height * 0.6, 0.008]} />
        </mesh>
      </group>

      <group position={[0.258, 0, bezelZ]}>
        <mesh material={sharedMaterials.handle}>
          <boxGeometry args={[0.018, height * 0.9, 0.015]} />
        </mesh>
        <mesh position={[0.002, 0, 0.008]} material={sharedMaterials.handleGrip}>
          <boxGeometry args={[0.012, height * 0.6, 0.008]} />
        </mesh>
      </group>

      <group position={[0.19, height * 0.35, bezelZ + 0.007]}>
        <mesh material={statusLED}>
          <boxGeometry args={[0.02, 0.008, 0.003]} />
        </mesh>
      </group>

      <group position={[0.19, -height * 0.35, bezelZ + 0.007]}>
        <mesh material={status === "online" ? sharedMaterials.greenLED : sharedMaterials.offLED}>
          <boxGeometry args={[0.02, 0.008, 0.003]} />
        </mesh>
      </group>

      <mesh position={[-0.26, 0, 0]} material={sharedMaterials.edgeAccent}>
        <boxGeometry args={[0.008, height * 0.98, SERVER_DEPTH * 0.95]} />
      </mesh>
      <mesh position={[0.26, 0, 0]} material={sharedMaterials.edgeAccent}>
        <boxGeometry args={[0.008, height * 0.98, SERVER_DEPTH * 0.95]} />
      </mesh>
    </group>
  );
}

export default DellServer;
