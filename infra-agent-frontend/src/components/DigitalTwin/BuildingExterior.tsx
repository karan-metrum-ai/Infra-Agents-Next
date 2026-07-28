"use client";

/**
 * BuildingExterior Component
 *
 * Renders a 3D exterior view of the data center building:
 * - Multi-floor glass building structure
 * - Clickable floor panels to navigate inside
 * - Active floor highlighting
 * - Rooftop equipment (HVAC units)
 * - Building name signage
 * - Ground plane with parking grid
 */

import { useMemo } from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { useFloorTexture } from "./floorTexture";

interface BuildingExteriorProps {
  floors: number;
  floorHeight: number;
  regionName: string;
  currentFloor: number;
  onFloorClick: (floor: number) => void;
}

export function BuildingExterior({
  floors,
  floorHeight,
  regionName,
  currentFloor,
  onFloorClick,
}: BuildingExteriorProps) {
  const buildingHeight = floors * floorHeight;
  const buildingWidth = 14;
  const buildingDepth = 10;

  // Shared procedural concrete-tile texture (same one used inside the
  // data hall floor) so the building sits on a matching surface.
  const groundTexture = useFloorTexture();
  // Tile the texture across the 50x50 ground plane (one tile per metre).
  groundTexture.repeat.set(50, 50);

  const materials = useMemo(
    () => ({
      glass: new THREE.MeshStandardMaterial({
        color: "#1a3a5a",
        transparent: true,
        opacity: 0.6,
        metalness: 0.9,
        roughness: 0.1,
      }),
      frame: new THREE.MeshStandardMaterial({
        color: "#333",
        metalness: 0.8,
        roughness: 0.2,
      }),
      concrete: new THREE.MeshStandardMaterial({
        color: "#555",
        roughness: 0.9,
      }),
      activeFloor: new THREE.MeshStandardMaterial({
        color: "#00aaff",
        emissive: "#00aaff",
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8,
      }),
    }),
    [],
  );

  return (
    <group>
      {/* Ambient lighting for building exterior */}
      <ambientLight intensity={0.4} />
      <hemisphereLight
        color="#ffffff"
        groundColor="#444444"
        intensity={0.6}
        position={[0, 50, 0]}
      />

      {/* Building base/foundation */}
      <mesh position={[0, -0.5, 0]} material={materials.concrete}>
        <boxGeometry args={[buildingWidth + 2, 1, buildingDepth + 2]} />
      </mesh>

      {/* Building structure - each floor */}
      {Array.from({ length: floors }, (_, i) => {
        const floorY = i * floorHeight;
        const isActive = i + 1 === currentFloor;

        return (
          <group key={`floor-${i}`} position={[0, floorY, 0]}>
            {/* Floor slab */}
            <mesh position={[0, 0, 0]} material={materials.concrete}>
              <boxGeometry args={[buildingWidth, 0.15, buildingDepth]} />
            </mesh>

            {/* Glass panels - front (clickable) */}
            <mesh
              position={[0, floorHeight / 2, buildingDepth / 2]}
              material={isActive ? materials.activeFloor : materials.glass}
              onClick={(e) => {
                e.stopPropagation();
                onFloorClick(i + 1);
              }}
              onPointerOver={() => {
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                document.body.style.cursor = "default";
              }}
            >
              <boxGeometry args={[buildingWidth - 0.2, floorHeight - 0.3, 0.05]} />
            </mesh>

            {/* Glass panels - back */}
            <mesh
              position={[0, floorHeight / 2, -buildingDepth / 2]}
              material={isActive ? materials.activeFloor : materials.glass}
            >
              <boxGeometry args={[buildingWidth - 0.2, floorHeight - 0.3, 0.05]} />
            </mesh>

            {/* Glass panels - left */}
            <mesh
              position={[-buildingWidth / 2, floorHeight / 2, 0]}
              material={isActive ? materials.activeFloor : materials.glass}
            >
              <boxGeometry args={[0.05, floorHeight - 0.3, buildingDepth - 0.2]} />
            </mesh>

            {/* Glass panels - right */}
            <mesh
              position={[buildingWidth / 2, floorHeight / 2, 0]}
              material={isActive ? materials.activeFloor : materials.glass}
            >
              <boxGeometry args={[0.05, floorHeight - 0.3, buildingDepth - 0.2]} />
            </mesh>

            {/* Vertical frame columns at corners */}
            {[
              [-buildingWidth / 2, 0, -buildingDepth / 2],
              [-buildingWidth / 2, 0, buildingDepth / 2],
              [buildingWidth / 2, 0, -buildingDepth / 2],
              [buildingWidth / 2, 0, buildingDepth / 2],
            ].map((pos, idx) => (
              <mesh
                key={`col-${i}-${idx}`}
                position={[pos[0], floorHeight / 2, pos[2]]}
                material={materials.frame}
              >
                <boxGeometry args={[0.3, floorHeight, 0.3]} />
              </mesh>
            ))}

            {/* Floor number label with background panel */}
            <group position={[0, floorHeight / 2, buildingDepth / 2 + 0.06]}>
              {/* Background panel for floor number */}
              <mesh position={[0, 0, 0]}>
                <planeGeometry args={[1.8, 1.2]} />
                <meshStandardMaterial
                  color={isActive ? "#003366" : "#1a1a1a"}
                  emissive={isActive ? "#00aaff" : "#000000"}
                  emissiveIntensity={isActive ? 0.3 : 0}
                  transparent
                  opacity={0.9}
                />
              </mesh>
              {/* Floor number text */}
              <Text
                position={[0, 0, 0.01]}
                fontSize={0.8}
                color={isActive ? "#00ffff" : "#cccccc"}
                anchorX="center"
                anchorY="middle"
                fontWeight={isActive ? 700 : 500}
                outlineWidth={isActive ? 0.02 : 0}
                outlineColor={isActive ? "#003366" : "#000000"}
              >
                {`F${i + 1}`}
              </Text>
            </group>
          </group>
        );
      })}

      {/* Roof */}
      <mesh position={[0, buildingHeight + 0.1, 0]} material={materials.concrete}>
        <boxGeometry args={[buildingWidth + 0.5, 0.2, buildingDepth + 0.5]} />
      </mesh>

      {/* Roof equipment - HVAC units */}
      {[-3, 0, 3].map((x, i) => (
        <mesh key={`hvac-${i}`} position={[x, buildingHeight + 0.6, 0]} material={materials.frame}>
          <boxGeometry args={[1.5, 1, 1.5]} />
        </mesh>
      ))}

      {/* Building name on front */}
      <Text
        position={[0, buildingHeight - 1, buildingDepth / 2 + 0.1]}
        fontSize={0.6}
        color="#00aaff"
        anchorX="center"
      >
        {regionName}
      </Text>

      {/* Ground plane — concrete-tile texture matches the interior
                data hall floor so the building reads as part of the same
                visual world. */}
      <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial
          map={groundTexture}
          metalness={0.05}
          roughness={0.85}
          envMapIntensity={0.1}
        />
      </mesh>
    </group>
  );
}

export default BuildingExterior;
