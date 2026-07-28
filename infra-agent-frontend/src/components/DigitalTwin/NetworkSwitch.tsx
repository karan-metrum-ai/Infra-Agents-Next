"use client";

/**
 * NetworkSwitch.tsx - Optimized network switch for rack visualization
 *
 * Supports variable U heights (1U, 2U, 3U, 4U) with:
 * - Black chassis with silver accents
 * - SFP/QSFP port arrays on front panel
 * - Status LEDs and power indicators
 * - Rack mount ears
 *
 * Optimized for low triangle count using:
 * - Shared materials (reduces draw calls)
 * - Merged geometries where possible
 * - Simplified port representations
 * - Instanced meshes for repeated elements
 */

import { useMemo } from "react";
import * as THREE from "three";

import { DellGrill } from "./DellGrill";

const sharedSwitchMaterials = {
  chassis: new THREE.MeshStandardMaterial({
    color: "#1a1a1e",
    metalness: 0.7,
    roughness: 0.35,
  }),
  chassisSelected: new THREE.MeshStandardMaterial({
    color: "#00aa66",
    emissive: "#00aa66",
    emissiveIntensity: 0.25,
    metalness: 0.6,
    roughness: 0.35,
  }),
  chassisCritical: new THREE.MeshStandardMaterial({
    color: "#2a1a1a",
    emissive: "#aa2222",
    emissiveIntensity: 0.15,
    metalness: 0.6,
    roughness: 0.4,
  }),
  bezel: new THREE.MeshStandardMaterial({
    color: "#0f0f12",
    metalness: 0.5,
    roughness: 0.4,
  }),
  rackEar: new THREE.MeshStandardMaterial({
    color: "#2a2a2e",
    metalness: 0.8,
    roughness: 0.25,
  }),
  portPanel: new THREE.MeshStandardMaterial({
    color: "#0a0a0c",
    metalness: 0.4,
    roughness: 0.5,
  }),
  sfpPort: new THREE.MeshStandardMaterial({
    color: "#1a1a1e",
    metalness: 0.6,
    roughness: 0.4,
  }),
  sfpCage: new THREE.MeshStandardMaterial({
    color: "#3a3a40",
    metalness: 0.85,
    roughness: 0.2,
  }),
  ventGrill: new THREE.MeshStandardMaterial({
    color: "#0c0c0e",
    metalness: 0.3,
    roughness: 0.6,
  }),
  edgeAccent: new THREE.MeshStandardMaterial({
    color: "#505058",
    metalness: 0.9,
    roughness: 0.15,
  }),
  mountScrew: new THREE.MeshStandardMaterial({
    color: "#606068",
    metalness: 0.95,
    roughness: 0.1,
  }),
  powerLED: new THREE.MeshStandardMaterial({
    color: "#00cc44",
    emissive: "#00cc44",
    emissiveIntensity: 2.0,
  }),
  activityLED: new THREE.MeshStandardMaterial({
    color: "#00aaff",
    emissive: "#00aaff",
    emissiveIntensity: 1.5,
  }),
  warningLED: new THREE.MeshStandardMaterial({
    color: "#ffaa00",
    emissive: "#ffaa00",
    emissiveIntensity: 1.8,
  }),
  criticalLED: new THREE.MeshStandardMaterial({
    color: "#ff2200",
    emissive: "#ff2200",
    emissiveIntensity: 2.0,
  }),
  offLED: new THREE.MeshStandardMaterial({
    color: "#1a1a1a",
    emissive: "#0a0a0a",
    emissiveIntensity: 0.05,
  }),
  consoleBorder: new THREE.MeshStandardMaterial({
    color: "#00aaff",
    metalness: 0.6,
    roughness: 0.3,
  }),
};

const sharedSwitchGeometries = {
  led: new THREE.BoxGeometry(0.006, 0.006, 0.003),
  smallLed: new THREE.BoxGeometry(0.004, 0.004, 0.002),
  screw: new THREE.CylinderGeometry(0.003, 0.003, 0.004, 6),
  sfpPort: new THREE.BoxGeometry(0.018, 0.012, 0.008),
  qsfpPort: new THREE.BoxGeometry(0.028, 0.014, 0.008),
  ventSlot: new THREE.BoxGeometry(0.003, 0.025, 0.004),
};

export interface NetworkSwitchProps {
  heightU?: number;
  /** Chassis height in scene units; defaults to one U slot (0.10). */
  height?: number;
  isSelected?: boolean;
  healthStatus?: "ok" | "warning" | "critical" | "unknown";
  status?: "online" | "offline" | "degraded";
  portCount?: number;
  switchType?: "sfp" | "qsfp" | "mixed";
}

export function NetworkSwitch({
  heightU = 1,
  height: heightProp,
  isSelected = false,
  healthStatus = "ok",
  status = "online",
  portCount = 24,
  switchType = "mixed",
}: NetworkSwitchProps) {
  const height = heightProp ?? heightU * 0.1;
  const switchWidth = 0.52;
  const switchDepth = 0.7;
  const bezelZ = switchDepth / 2 + 0.004;
  const bezelDepth = 0.01;

  const chassisMaterial = isSelected
    ? sharedSwitchMaterials.chassisSelected
    : healthStatus === "critical"
      ? sharedSwitchMaterials.chassisCritical
      : sharedSwitchMaterials.chassis;

  const statusLED = isSelected
    ? sharedSwitchMaterials.powerLED
    : healthStatus === "critical"
      ? sharedSwitchMaterials.criticalLED
      : healthStatus === "warning"
        ? sharedSwitchMaterials.warningLED
        : status === "online"
          ? sharedSwitchMaterials.powerLED
          : sharedSwitchMaterials.offLED;

  const activityLED =
    status === "online" ? sharedSwitchMaterials.activityLED : sharedSwitchMaterials.offLED;

  const portConfig = useMemo(() => {
    const config: Array<{
      type: "sfp" | "qsfp";
      x: number;
      y: number;
    }> = [];

    if (switchType === "qsfp") {
      const cols = Math.min(portCount, 32);
      const rows = heightU >= 2 ? 2 : 1;
      const portsPerRow = Math.ceil(cols / rows);
      const spacing = 0.032;
      const startX = -((portsPerRow - 1) * spacing) / 2;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < portsPerRow; col++) {
          if (config.length >= portCount) break;
          config.push({
            type: "qsfp",
            x: startX + col * spacing,
            y: rows > 1 ? (row - 0.5) * 0.018 : 0,
          });
        }
      }
    } else if (switchType === "sfp") {
      const cols = Math.min(portCount, 48);
      const rows = heightU >= 2 ? 2 : 1;
      const portsPerRow = Math.ceil(cols / rows);
      const spacing = 0.022;
      const startX = -((portsPerRow - 1) * spacing) / 2;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < portsPerRow; col++) {
          if (config.length >= portCount) break;
          config.push({
            type: "sfp",
            x: startX + col * spacing,
            y: rows > 1 ? (row - 0.5) * 0.015 : 0,
          });
        }
      }
    } else {
      const sfpCount = Math.floor(portCount * 0.75);
      const qsfpCount = portCount - sfpCount;

      const sfpSpacing = 0.022;
      const sfpStartX = -switchWidth * 0.15;

      for (let i = 0; i < sfpCount; i++) {
        const row = i % 2;
        const col = Math.floor(i / 2);
        config.push({
          type: "sfp",
          x: sfpStartX + col * sfpSpacing,
          y: (row - 0.5) * 0.014,
        });
      }

      const qsfpSpacing = 0.032;
      const qsfpStartX = switchWidth * 0.15;

      for (let i = 0; i < qsfpCount; i++) {
        const row = i % 2;
        const col = Math.floor(i / 2);
        config.push({
          type: "qsfp",
          x: qsfpStartX + col * qsfpSpacing,
          y: (row - 0.5) * 0.016,
        });
      }
    }

    return config;
  }, [portCount, switchType, heightU, switchWidth]);

  const ventSlotCount = Math.floor(switchWidth * 8);

  const grillWidth = switchWidth - 0.04;
  const grillHeight = height * 0.9;
  const grillHexOuter = Math.max(0.012, Math.min(0.022, height * 0.45));

  return (
    <group>
      {/* Main chassis body - single box */}
      <mesh castShadow material={chassisMaterial}>
        <boxGeometry args={[switchWidth, height, switchDepth]} />
      </mesh>

      {/* Front bezel panel */}
      <mesh position={[0, 0, bezelZ]} material={sharedSwitchMaterials.bezel}>
        <boxGeometry args={[switchWidth + 0.02, height * 1.05, bezelDepth]} />
      </mesh>

      {/* Silver honeycomb grill — covers the full front face */}
      <DellGrill
        position={[0, 0, bezelZ + 0.006]}
        width={grillWidth}
        height={grillHeight}
        hexOuter={grillHexOuter}
        depth={0.004}
        showLogo={false}
        showFlanges={false}
        showLock={false}
        color={0x7e8188}
      />

      {/* Top edge accent strip */}
      <mesh
        position={[0, height * 0.48, bezelZ + 0.002]}
        material={sharedSwitchMaterials.edgeAccent}
      >
        <boxGeometry args={[switchWidth - 0.04, 0.003, 0.006]} />
      </mesh>

      {/* Bottom edge accent strip */}
      <mesh
        position={[0, -height * 0.48, bezelZ + 0.002]}
        material={sharedSwitchMaterials.edgeAccent}
      >
        <boxGeometry args={[switchWidth - 0.04, 0.003, 0.006]} />
      </mesh>

      {/* Rack mount ears - left */}
      <mesh
        position={[-switchWidth / 2 - 0.012, 0, bezelZ - 0.005]}
        material={sharedSwitchMaterials.rackEar}
      >
        <boxGeometry args={[0.025, height * 0.95, 0.02]} />
      </mesh>

      {/* Rack mount ears - right */}
      <mesh
        position={[switchWidth / 2 + 0.012, 0, bezelZ - 0.005]}
        material={sharedSwitchMaterials.rackEar}
      >
        <boxGeometry args={[0.025, height * 0.95, 0.02]} />
      </mesh>

      {/* Mount screws - left ear */}
      {[-1, 1].map((yMult, i) => (
        <mesh
          key={`screw-left-${i}`}
          position={[-switchWidth / 2 - 0.018, yMult * height * 0.3, bezelZ + 0.003]}
          rotation={[Math.PI / 2, 0, 0]}
          geometry={sharedSwitchGeometries.screw}
          material={sharedSwitchMaterials.mountScrew}
        />
      ))}

      {/* Mount screws - right ear */}
      {[-1, 1].map((yMult, i) => (
        <mesh
          key={`screw-right-${i}`}
          position={[switchWidth / 2 + 0.018, yMult * height * 0.3, bezelZ + 0.003]}
          rotation={[Math.PI / 2, 0, 0]}
          geometry={sharedSwitchGeometries.screw}
          material={sharedSwitchMaterials.mountScrew}
        />
      ))}

      {/* Network ports - optimized rendering */}
      <group position={[0, 0, bezelZ + 0.014]}>
        {portConfig.map((port, idx) => (
          <group key={idx} position={[port.x, port.y, 0]}>
            {/* Port cage */}
            <mesh
              geometry={
                port.type === "qsfp"
                  ? sharedSwitchGeometries.qsfpPort
                  : sharedSwitchGeometries.sfpPort
              }
              material={sharedSwitchMaterials.sfpCage}
            />
            {/* Port opening (dark interior) */}
            <mesh position={[0, 0, 0.003]} material={sharedSwitchMaterials.sfpPort}>
              <boxGeometry
                args={port.type === "qsfp" ? [0.024, 0.01, 0.004] : [0.014, 0.008, 0.004]}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* Status LEDs - far left section */}
      <group position={[-switchWidth * 0.4, 0, bezelZ + 0.014]}>
        {/* Power LED */}
        <mesh
          position={[0, height * 0.2, 0]}
          geometry={sharedSwitchGeometries.led}
          material={statusLED}
        />
        {/* Activity LED */}
        <mesh
          position={[0, -height * 0.2, 0]}
          geometry={sharedSwitchGeometries.led}
          material={activityLED}
        />
      </group>

      {/* Console/Management port - far right */}
      <group position={[switchWidth * 0.38, 0, bezelZ + 0.014]}>
        {/* Console port border (blue accent) */}
        <mesh material={sharedSwitchMaterials.consoleBorder}>
          <boxGeometry args={[0.018, 0.012, 0.004]} />
        </mesh>
        {/* Console port opening */}
        <mesh position={[0, 0, 0.002]} material={sharedSwitchMaterials.portPanel}>
          <boxGeometry args={[0.014, 0.008, 0.003]} />
        </mesh>
      </group>

      {/* Model label area */}
      <mesh
        position={[switchWidth * 0.25, height * 0.35, bezelZ + 0.014]}
        material={sharedSwitchMaterials.edgeAccent}
      >
        <boxGeometry args={[0.08, 0.006, 0.002]} />
      </mesh>

      {/* Side ventilation grills - left side */}
      <group position={[-switchWidth / 2 - 0.001, 0, 0]}>
        {Array.from({ length: Math.min(ventSlotCount, 12) }).map((_, i) => (
          <mesh
            key={`vent-left-${i}`}
            position={[0, 0, -switchDepth * 0.3 + i * 0.025]}
            rotation={[0, 0, Math.PI / 2]}
            geometry={sharedSwitchGeometries.ventSlot}
            material={sharedSwitchMaterials.ventGrill}
          />
        ))}
      </group>

      {/* Side ventilation grills - right side */}
      <group position={[switchWidth / 2 + 0.001, 0, 0]}>
        {Array.from({ length: Math.min(ventSlotCount, 12) }).map((_, i) => (
          <mesh
            key={`vent-right-${i}`}
            position={[0, 0, -switchDepth * 0.3 + i * 0.025]}
            rotation={[0, 0, Math.PI / 2]}
            geometry={sharedSwitchGeometries.ventSlot}
            material={sharedSwitchMaterials.ventGrill}
          />
        ))}
      </group>

      {/* Side rails for rack mounting */}
      <mesh position={[-switchWidth / 2 - 0.003, 0, 0]} material={sharedSwitchMaterials.edgeAccent}>
        <boxGeometry args={[0.006, height * 0.98, switchDepth * 0.9]} />
      </mesh>
      <mesh position={[switchWidth / 2 + 0.003, 0, 0]} material={sharedSwitchMaterials.edgeAccent}>
        <boxGeometry args={[0.006, height * 0.98, switchDepth * 0.9]} />
      </mesh>

      {/* Rear exhaust area indication */}
      <mesh position={[0, 0, -switchDepth / 2 + 0.005]} material={sharedSwitchMaterials.ventGrill}>
        <boxGeometry args={[switchWidth * 0.6, height * 0.7, 0.01]} />
      </mesh>
    </group>
  );
}

export default NetworkSwitch;
