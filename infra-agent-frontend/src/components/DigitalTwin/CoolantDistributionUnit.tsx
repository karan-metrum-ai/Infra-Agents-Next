"use client";

/**
 * CoolantDistributionUnit.tsx - Supermicro-style rack-mount CDU
 *
 * A 2U-4U coolant distribution unit with:
 * - Dark silver / gunmetal chassis (subtle, blends with rack)
 * - Small LCD status panel on the left
 * - Modular pump cartridges with perforated fronts
 * - Blue quick-connect coolant fittings
 * - Rack mount ears and status LEDs
 *
 * Positioned at the bottom of the rack, below all servers.
 */

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const sharedCduMaterials = {
  chassis: new THREE.MeshStandardMaterial({
    color: "#5a5a60",
    metalness: 0.82,
    roughness: 0.28,
  }),
  chassisSelected: new THREE.MeshStandardMaterial({
    color: "#00cc88",
    emissive: "#00cc88",
    emissiveIntensity: 0.25,
    metalness: 0.7,
    roughness: 0.3,
  }),
  chassisCritical: new THREE.MeshStandardMaterial({
    color: "#4a3a3a",
    emissive: "#cc3333",
    emissiveIntensity: 0.15,
    metalness: 0.7,
    roughness: 0.35,
  }),
  faceplate: new THREE.MeshStandardMaterial({
    color: "#6a6a70",
    metalness: 0.85,
    roughness: 0.22,
  }),
  cartridgeFace: new THREE.MeshStandardMaterial({
    color: "#707078",
    metalness: 0.8,
    roughness: 0.25,
  }),
  cartridgeVent: new THREE.MeshStandardMaterial({
    color: "#3a3a3e",
    metalness: 0.5,
    roughness: 0.5,
  }),
  cartridgeDivider: new THREE.MeshStandardMaterial({
    color: "#4a4a50",
    metalness: 0.75,
    roughness: 0.3,
  }),
  cartridgeHandle: new THREE.MeshStandardMaterial({
    color: "#888890",
    metalness: 0.9,
    roughness: 0.15,
  }),
  lcdBezel: new THREE.MeshStandardMaterial({
    color: "#1a1a1e",
    metalness: 0.3,
    roughness: 0.7,
  }),
  lcdScreen: new THREE.MeshStandardMaterial({
    color: "#0a2a1a",
    emissive: "#0a4a2a",
    emissiveIntensity: 0.4,
    metalness: 0.1,
    roughness: 0.5,
  }),
  lcdScreenCritical: new THREE.MeshStandardMaterial({
    color: "#2a0a0a",
    emissive: "#cc2222",
    emissiveIntensity: 0.4,
    metalness: 0.1,
    roughness: 0.5,
  }),
  fitting: new THREE.MeshStandardMaterial({
    color: "#3070b0",
    metalness: 0.85,
    roughness: 0.2,
  }),
  fittingRing: new THREE.MeshStandardMaterial({
    color: "#5090d0",
    metalness: 0.9,
    roughness: 0.15,
  }),
  rackEar: new THREE.MeshStandardMaterial({
    color: "#505058",
    metalness: 0.8,
    roughness: 0.25,
  }),
  mountScrew: new THREE.MeshStandardMaterial({
    color: "#606068",
    metalness: 0.95,
    roughness: 0.1,
  }),
  edgeAccent: new THREE.MeshStandardMaterial({
    color: "#808088",
    metalness: 0.9,
    roughness: 0.12,
  }),
  greenLED: new THREE.MeshStandardMaterial({
    color: "#00cc44",
    emissive: "#00cc44",
    emissiveIntensity: 1.8,
  }),
  blueLED: new THREE.MeshStandardMaterial({
    color: "#0088ff",
    emissive: "#0088ff",
    emissiveIntensity: 1.5,
  }),
  redLED: new THREE.MeshStandardMaterial({
    color: "#ff2200",
    emissive: "#ff2200",
    emissiveIntensity: 2.0,
  }),
  yellowLED: new THREE.MeshStandardMaterial({
    color: "#ffaa00",
    emissive: "#ffaa00",
    emissiveIntensity: 1.8,
  }),
  offLED: new THREE.MeshStandardMaterial({
    color: "#222",
    emissive: "#111",
    emissiveIntensity: 0.05,
  }),
};

const sharedCduGeometries = {
  screw: new THREE.CylinderGeometry(0.003, 0.003, 0.004, 6),
  led: new THREE.BoxGeometry(0.005, 0.005, 0.003),
  fittingCylinder: new THREE.CylinderGeometry(0.006, 0.006, 0.018, 8),
  fittingRing: new THREE.CylinderGeometry(0.008, 0.008, 0.004, 8),
  ventHole: new THREE.CircleGeometry(0.003, 6),
};

let sharedCduLogoTexture: THREE.CanvasTexture | null = null;

function getSharedCduLogoTexture(): THREE.CanvasTexture {
  if (sharedCduLogoTexture) return sharedCduLogoTexture;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.font = '600 20px "Arial", sans-serif';
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = "#a0a0a8";
  ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
  ctx.shadowBlur = 2;
  ctx.fillText("CDU", canvas.width / 2, canvas.height / 2);

  sharedCduLogoTexture = new THREE.CanvasTexture(canvas);
  sharedCduLogoTexture.anisotropy = 8;
  sharedCduLogoTexture.colorSpace = THREE.SRGBColorSpace;
  sharedCduLogoTexture.needsUpdate = true;
  return sharedCduLogoTexture;
}

export interface CoolantDistributionUnitProps {
  heightU?: number;
  isSelected?: boolean;
  healthStatus?: "ok" | "warning" | "critical" | "unknown";
  status?: "online" | "offline" | "degraded";
}

export function CoolantDistributionUnit({
  heightU = 4,
  isSelected = false,
  healthStatus = "ok",
  status = "online",
}: CoolantDistributionUnitProps) {
  const height = heightU * 0.044;
  const cduWidth = 0.6;
  const cduDepth = 0.8;
  const faceplateZ = cduDepth / 2;

  const chassisMaterial = isSelected
    ? sharedCduMaterials.chassisSelected
    : healthStatus === "critical"
      ? sharedCduMaterials.chassisCritical
      : sharedCduMaterials.chassis;

  const statusLED = isSelected
    ? sharedCduMaterials.greenLED
    : healthStatus === "critical"
      ? sharedCduMaterials.redLED
      : healthStatus === "warning"
        ? sharedCduMaterials.yellowLED
        : status === "online"
          ? sharedCduMaterials.greenLED
          : sharedCduMaterials.offLED;

  const lcdMaterial =
    healthStatus === "critical"
      ? sharedCduMaterials.lcdScreenCritical
      : sharedCduMaterials.lcdScreen;

  const lcdPulseRef = useRef<THREE.Mesh>(null);
  const pulseTime = useRef(0);

  useFrame((_s, delta: number) => {
    if (lcdPulseRef.current && status === "online") {
      pulseTime.current += delta;
      const mat = lcdPulseRef.current.material as THREE.MeshStandardMaterial;
      const base = healthStatus === "critical" ? 0.3 : 0.3;
      const amp = healthStatus === "critical" ? 0.3 : 0.15;
      mat.emissiveIntensity = base + Math.sin(pulseTime.current * 2) * amp;
    }
  });

  const logoMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: getSharedCduLogoTexture(),
      transparent: true,
    });
  }, []);

  const cartridgeCount = 3;
  const cartridgeAreaWidth = cduWidth * 0.55;
  const cartridgeSpacing = cartridgeAreaWidth / cartridgeCount;
  const cartridgeWidth = cartridgeSpacing - 0.006;
  const cartridgeHeight = height * 0.78;
  const cartridgeStartX = cduWidth * 0.08;

  return (
    <group>
      {/* Main chassis body */}
      <mesh castShadow material={chassisMaterial}>
        <boxGeometry args={[cduWidth, height, cduDepth]} />
      </mesh>

      {/* Front faceplate - slightly lighter silver */}
      <mesh position={[0, 0, faceplateZ]} material={sharedCduMaterials.faceplate}>
        <boxGeometry args={[cduWidth + 0.02, height * 1.02, 0.008]} />
      </mesh>

      {/* Top edge accent strip */}
      <mesh
        position={[0, height * 0.49, faceplateZ + 0.002]}
        material={sharedCduMaterials.edgeAccent}
      >
        <boxGeometry args={[cduWidth + 0.02, 0.003, 0.006]} />
      </mesh>

      {/* Bottom edge accent strip */}
      <mesh
        position={[0, -height * 0.49, faceplateZ + 0.002]}
        material={sharedCduMaterials.edgeAccent}
      >
        <boxGeometry args={[cduWidth + 0.02, 0.003, 0.006]} />
      </mesh>

      {/* === LEFT SECTION: LCD Panel + Status LEDs === */}
      <group position={[-cduWidth * 0.3, 0, faceplateZ]}>
        {/* LCD bezel */}
        <mesh position={[0, height * 0.05, 0.006]} material={sharedCduMaterials.lcdBezel}>
          <boxGeometry args={[0.1, height * 0.55, 0.008]} />
        </mesh>

        {/* LCD screen (with subtle glow) */}
        <mesh ref={lcdPulseRef} position={[0, height * 0.05, 0.012]} material={lcdMaterial}>
          <boxGeometry args={[0.085, height * 0.42, 0.003]} />
        </mesh>

        {/* Status LEDs below LCD */}
        <group position={[0, -height * 0.34, 0.008]}>
          {/* Power LED */}
          <mesh
            position={[-0.018, 0, 0]}
            geometry={sharedCduGeometries.led}
            material={status === "online" ? sharedCduMaterials.blueLED : sharedCduMaterials.offLED}
          />
          {/* Status LED */}
          <mesh position={[0, 0, 0]} geometry={sharedCduGeometries.led} material={statusLED} />
          {/* Activity LED */}
          <mesh
            position={[0.018, 0, 0]}
            geometry={sharedCduGeometries.led}
            material={status === "online" ? sharedCduMaterials.greenLED : sharedCduMaterials.offLED}
          />
        </group>

        {/* CDU label below LEDs */}
        <mesh position={[0, -height * 0.44, 0.01]} material={logoMaterial}>
          <planeGeometry args={[0.06, 0.015]} />
        </mesh>
      </group>

      {/* === RIGHT SECTION: Pump Cartridges === */}
      <group position={[cartridgeStartX, 0, faceplateZ]}>
        {Array.from({ length: cartridgeCount }).map((_, i) => {
          const xPos = i * cartridgeSpacing - (cartridgeAreaWidth - cartridgeSpacing) / 2;

          return (
            <group key={`cart-${i}`} position={[xPos, 0, 0]}>
              {/* Cartridge face panel */}
              <mesh position={[0, 0, 0.005]} material={sharedCduMaterials.cartridgeFace}>
                <boxGeometry args={[cartridgeWidth, cartridgeHeight, 0.008]} />
              </mesh>

              {/* Perforated vent area */}
              <mesh position={[0, 0, 0.01]} material={sharedCduMaterials.cartridgeVent}>
                <boxGeometry args={[cartridgeWidth * 0.85, cartridgeHeight * 0.7, 0.004]} />
              </mesh>

              {/* Vent dot pattern (simplified) */}
              {Array.from({ length: 3 }).map((_, row) =>
                Array.from({ length: 2 }).map((_, col) => {
                  const dotX = (col - 0.5) * cartridgeWidth * 0.35;
                  const dotY = (row - 1) * cartridgeHeight * 0.2;
                  return (
                    <mesh
                      key={`vent-${i}-${row}-${col}`}
                      position={[dotX, dotY, 0.013]}
                      geometry={sharedCduGeometries.ventHole}
                      material={sharedCduMaterials.lcdBezel}
                    />
                  );
                }),
              )}

              {/* Pull handle at top */}
              <mesh
                position={[0, cartridgeHeight * 0.42, 0.01]}
                material={sharedCduMaterials.cartridgeHandle}
              >
                <boxGeometry args={[cartridgeWidth * 0.6, 0.006, 0.006]} />
              </mesh>
            </group>
          );
        })}

        {/* Dividers between cartridges */}
        {Array.from({ length: cartridgeCount - 1 }).map((_, i) => {
          const xPos = (i + 0.5) * cartridgeSpacing - (cartridgeAreaWidth - cartridgeSpacing) / 2;
          return (
            <mesh
              key={`div-${i}`}
              position={[xPos, 0, 0.006]}
              material={sharedCduMaterials.cartridgeDivider}
            >
              <boxGeometry args={[0.004, cartridgeHeight * 1.05, 0.01]} />
            </mesh>
          );
        })}
      </group>

      {/* === RACK MOUNT EARS === */}
      <mesh
        position={[-cduWidth / 2 - 0.012, 0, faceplateZ - 0.004]}
        material={sharedCduMaterials.rackEar}
      >
        <boxGeometry args={[0.025, height * 0.92, 0.016]} />
      </mesh>
      <mesh
        position={[cduWidth / 2 + 0.012, 0, faceplateZ - 0.004]}
        material={sharedCduMaterials.rackEar}
      >
        <boxGeometry args={[0.025, height * 0.92, 0.016]} />
      </mesh>

      {/* Mount screws */}
      {[-1, 1].map((side) =>
        [-1, 1].map((yMult, yi) => (
          <mesh
            key={`screw-${side}-${yi}`}
            position={[side * (cduWidth / 2 + 0.018), yMult * height * 0.25, faceplateZ + 0.002]}
            rotation={[Math.PI / 2, 0, 0]}
            geometry={sharedCduGeometries.screw}
            material={sharedCduMaterials.mountScrew}
          />
        )),
      )}

      {/* === COOLANT FITTINGS on top (supply + return) === */}
      <group position={[cduWidth * 0.15, height / 2 + 0.005, 0]}>
        {[-0.08, -0.03, 0.02, 0.07].map((xOff, i) => (
          <group key={`fitting-${i}`} position={[xOff, 0, 0]}>
            <mesh position={[0, 0.012, 0]} material={sharedCduMaterials.fitting}>
              <cylinderGeometry args={[0.008, 0.008, 0.022, 10]} />
            </mesh>
            <mesh position={[0, 0.003, 0]} material={sharedCduMaterials.fittingRing}>
              <cylinderGeometry args={[0.011, 0.011, 0.006, 10]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Coolant supply/return labels (color coded) */}
      <mesh
        position={[-cduWidth * 0.12, height / 2 + 0.018, 0]}
        material={sharedCduMaterials.fitting}
      >
        <boxGeometry args={[0.04, 0.004, 0.004]} />
      </mesh>
      <mesh position={[cduWidth * 0.28, height / 2 + 0.018, 0]}>
        <boxGeometry args={[0.04, 0.004, 0.004]} />
        <meshStandardMaterial color="#cc4422" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Side rails */}
      <mesh position={[-cduWidth / 2 - 0.002, 0, 0]} material={sharedCduMaterials.edgeAccent}>
        <boxGeometry args={[0.004, height * 0.95, cduDepth * 0.85]} />
      </mesh>
      <mesh position={[cduWidth / 2 + 0.002, 0, 0]} material={sharedCduMaterials.edgeAccent}>
        <boxGeometry args={[0.004, height * 0.95, cduDepth * 0.85]} />
      </mesh>

      {/* Rear coolant manifold (supply + return pipes) */}
      <mesh position={[0, 0, -cduDepth / 2 + 0.015]} material={sharedCduMaterials.cartridgeDivider}>
        <boxGeometry args={[cduWidth * 0.7, height * 0.7, 0.025]} />
      </mesh>
      {/* Manifold pipe runs (horizontal along X) */}
      <mesh
        position={[0, height * 0.15, -cduDepth / 2 + 0.03]}
        rotation={[0, 0, Math.PI / 2]}
        material={sharedCduMaterials.fitting}
      >
        <cylinderGeometry args={[0.006, 0.006, cduWidth * 0.5, 8]} />
      </mesh>
      <mesh
        position={[0, -height * 0.15, -cduDepth / 2 + 0.03]}
        rotation={[0, 0, Math.PI / 2]}
        material={sharedCduMaterials.fittingRing}
      >
        <cylinderGeometry args={[0.006, 0.006, cduWidth * 0.5, 8]} />
      </mesh>
    </group>
  );
}

export default CoolantDistributionUnit;
