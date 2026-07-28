"use client";

/**
 * DataCenterEnvironment Component
 *
 * Renders a realistic data center room based on real hyperscale facility
 * references (Switch SuperNAP, Equinix, Google DC photo galleries):
 *
 *   - Sealed concrete / polished tile floor with subtle grid
 *   - Acoustic-tile ceiling with recessed linear LED troffer panels
 *   - Overhead cable ladder/tray system running above each rack row
 *   - Overhead power bus bar / conduit down the center aisle
 *   - Subtle vertical wall accents (much less neon than before)
 *   - Region name on the end wall
 *
 * Visual aim: photo-real "operational data hall" — moody but clean,
 * not a sci-fi nightclub.
 */

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useFloorTexture } from "./floorTexture";

interface DataCenterEnvironmentProps {
  regionName?: string;
  /**
   * Compact mode hides decorative wall panels and the corner LED strips
   * that read as "extra bezels / borders" when the camera sits INSIDE the
   * room (e.g. the Command Center split view's `inside-room` preset).
   * Default false preserves the full overview look.
   */
  compact?: boolean;
}

const ROOM_WALL_HEIGHT = 3.6;
const TROFFER_MAIN_FRAME = new THREE.BoxGeometry(1.56, 0.01, 0.66);
const TROFFER_MAIN_DIFF = new THREE.BoxGeometry(1.5, 0.02, 0.6);
const TROFFER_SLIM_FRAME = new THREE.BoxGeometry(1.06, 0.01, 0.41);
const TROFFER_SLIM_DIFF = new THREE.BoxGeometry(1.0, 0.02, 0.35);
const WALL_PANEL_GEO = new THREE.BoxGeometry(2.2, ROOM_WALL_HEIGHT, 0.05);

function TrofferPanel({
  position,
  variant = "main",
}: {
  position: [number, number, number];
  variant?: "main" | "slim";
}) {
  const frameGeo = variant === "main" ? TROFFER_MAIN_FRAME : TROFFER_SLIM_FRAME;
  const diffGeo = variant === "main" ? TROFFER_MAIN_DIFF : TROFFER_SLIM_DIFF;

  return (
    <group position={position}>
      <mesh position={[0, 0.005, 0]} geometry={frameGeo}>
        <meshStandardMaterial color="#cfd3da" metalness={0.85} roughness={0.35} />
      </mesh>
      <mesh position={[0, -0.005, 0]} geometry={diffGeo}>
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={5.1}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function CableTray({
  position,
  length,
  width = 0.45,
}: {
  position: [number, number, number];
  length: number;
  width?: number;
}) {
  const RUNG_SPACING = 0.25;
  const rungCount = Math.floor(length / RUNG_SPACING);

  const railMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#3a3d44",
        metalness: 0.7,
        roughness: 0.45,
      }),
    [],
  );

  const rungs = useMemo(() => {
    const arr: number[] = [];
    const span = (rungCount - 1) * RUNG_SPACING;
    const start = -span / 2;
    for (let i = 0; i < rungCount; i++) arr.push(start + i * RUNG_SPACING);
    return arr;
  }, [rungCount]);

  const mergedRungs = useMemo(() => {
    const m = new THREE.Matrix4();
    const parts: THREE.BufferGeometry[] = [];
    for (const x of rungs) {
      const g = new THREE.BoxGeometry(0.025, 0.025, width);
      m.makeTranslation(x, 0, 0);
      g.applyMatrix4(m);
      parts.push(g);
    }
    if (parts.length === 0) return null;
    const merged = mergeGeometries(parts);
    for (const p of parts) p.dispose();
    return merged;
  }, [rungs, width]);

  useEffect(() => {
    return () => {
      mergedRungs?.dispose();
    };
  }, [mergedRungs]);

  return (
    <group position={position}>
      <mesh position={[0, 0, -width / 2]} material={railMat}>
        <boxGeometry args={[length, 0.06, 0.04]} />
      </mesh>
      <mesh position={[0, 0, width / 2]} material={railMat}>
        <boxGeometry args={[length, 0.06, 0.04]} />
      </mesh>
      {mergedRungs && <mesh geometry={mergedRungs} material={railMat} />}
      {/* Bundled cables resting in the tray */}
      <mesh position={[0, 0.04, -width * 0.3]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, length, 6]} />
        <meshStandardMaterial color="#1f2530" roughness={0.7} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.04, -width * 0.05]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.022, 0.022, length, 6]} />
        <meshStandardMaterial color="#0d1218" roughness={0.7} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.04, width * 0.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, length, 6]} />
        <meshStandardMaterial color="#2a4666" roughness={0.6} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.04, width * 0.38]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, length, 6]} />
        <meshStandardMaterial color="#3a4a2a" roughness={0.65} metalness={0.1} />
      </mesh>
      {/* Hanger straps every ~2.5m */}
      {(() => {
        const hangerCount = Math.max(2, Math.floor(length / 2.5));
        const span = length - 1.0;
        const stepX = hangerCount > 1 ? span / (hangerCount - 1) : 0;
        return Array.from({ length: hangerCount }, (_, i) => {
          const x = -span / 2 + i * stepX;
          return (
            <group key={`hanger-${i}`} position={[x, 0.4, 0]}>
              <mesh position={[0, 0, -width / 2]}>
                <boxGeometry args={[0.02, 0.8, 0.02]} />
                <meshStandardMaterial color="#5a5e66" metalness={0.7} roughness={0.4} />
              </mesh>
              <mesh position={[0, 0, width / 2]}>
                <boxGeometry args={[0.02, 0.8, 0.02]} />
                <meshStandardMaterial color="#5a5e66" metalness={0.7} roughness={0.4} />
              </mesh>
            </group>
          );
        });
      })()}
    </group>
  );
}

function PowerBusway({ position, length }: { position: [number, number, number]; length: number }) {
  const TAP_SPACING = 3;
  const tapCount = Math.max(2, Math.floor(length / TAP_SPACING));

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[length, 0.18, 0.18]} />
        <meshStandardMaterial color="#9da4ad" metalness={0.85} roughness={0.32} />
      </mesh>
      <mesh position={[0, -0.12, 0]}>
        <boxGeometry args={[length, 0.04, 0.22]} />
        <meshStandardMaterial color="#6e757e" metalness={0.8} roughness={0.4} />
      </mesh>
      {Array.from({ length: tapCount }, (_, i) => {
        const span = length - 1.0;
        const stepX = tapCount > 1 ? span / (tapCount - 1) : 0;
        const x = -span / 2 + i * stepX;
        return (
          <group key={i} position={[x, -0.18, 0]}>
            <mesh>
              <boxGeometry args={[0.32, 0.16, 0.28]} />
              <meshStandardMaterial color="#22272f" metalness={0.5} roughness={0.5} />
            </mesh>
            <mesh position={[0.16 + 0.001, 0.04, 0]}>
              <boxGeometry args={[0.005, 0.025, 0.025]} />
              <meshStandardMaterial
                color="#3df09a"
                emissive="#3df09a"
                emissiveIntensity={2.5}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}
      {(() => {
        const rodCount = Math.max(2, Math.floor(length / 3.5));
        const span = length - 1.0;
        const stepX = rodCount > 1 ? span / (rodCount - 1) : 0;
        return Array.from({ length: rodCount }, (_, i) => {
          const x = -span / 2 + i * stepX;
          return (
            <mesh key={`rod-${i}`} position={[x, 0.5, 0]}>
              <boxGeometry args={[0.025, 1.0, 0.025]} />
              <meshStandardMaterial color="#6c727b" metalness={0.8} roughness={0.35} />
            </mesh>
          );
        });
      })()}
    </group>
  );
}

function useCeilingTexture(): THREE.Texture {
  return useMemo(() => {
    const SIZE = 256;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#cfd2d8";
    ctx.fillRect(0, 0, SIZE, SIZE);

    const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 24;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);

    ctx.strokeStyle = "#4a4d54";
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, SIZE, SIZE);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function VerticalLEDStrip({
  position,
  height = 3,
  color = "#1f9bff",
}: {
  position: [number, number, number];
  height?: number;
  color?: string;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={[0.025, height, 0.015]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.6}
        toneMapped={false}
      />
    </mesh>
  );
}

export function DataCenterEnvironment({
  regionName = "US-EAST-1",
  compact = false,
}: DataCenterEnvironmentProps) {
  const ROOM_LENGTH = 28;
  const ROOM_WIDTH = 12;
  const ROOM_HEIGHT = 4;
  const FLOOR_Y = -1.2;
  const CEILING_Y = FLOOR_Y + ROOM_HEIGHT;

  const materials = useMemo(
    () => ({
      wall: new THREE.MeshStandardMaterial({
        color: "#3b3b3b",
        emissive: "#3b3b3b",
        emissiveIntensity: 0.12,
        metalness: 0.05,
        roughness: 0.88,
        envMapIntensity: 0.2,
      }),
      wallPanel: new THREE.MeshStandardMaterial({
        color: "#454545",
        emissive: "#454545",
        emissiveIntensity: 0.1,
        metalness: 0.08,
        roughness: 0.82,
        envMapIntensity: 0.2,
      }),
      tGrid: new THREE.MeshStandardMaterial({
        color: "#a8acb4",
        metalness: 0.6,
        roughness: 0.45,
      }),
    }),
    [],
  );

  const floorTexture = useFloorTexture();
  floorTexture.repeat.set(ROOM_LENGTH, ROOM_WIDTH);

  const ceilingTexture = useCeilingTexture();
  ceilingTexture.repeat.set(ROOM_LENGTH / 0.6, ROOM_WIDTH / 0.6);

  const trofferZRows = useMemo(() => [-2.5, 2.5] as const, []);
  const trofferXPositions = useMemo<number[]>(() => {
    const arr: number[] = [];
    const spacing = 3.2;
    for (let x = -ROOM_LENGTH / 2 + 2; x < ROOM_LENGTH / 2 - 1; x += spacing) {
      arr.push(x);
    }
    return arr;
  }, []);
  const corridorTrofferXPositions = useMemo<number[]>(() => {
    const arr: number[] = [];
    const spacing = 4;
    for (let x = -ROOM_LENGTH / 2 + 4; x < ROOM_LENGTH / 2 - 3; x += spacing) {
      arr.push(x);
    }
    return arr;
  }, []);

  return (
    <group>
      {/* Floor */}
      <mesh position={[0, FLOOR_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_LENGTH, ROOM_WIDTH]} />
        <meshStandardMaterial
          map={floorTexture}
          metalness={0.05}
          roughness={0.85}
          envMapIntensity={0.1}
        />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, CEILING_Y, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_LENGTH, ROOM_WIDTH]} />
        <meshStandardMaterial
          map={ceilingTexture}
          metalness={0.15}
          roughness={0.85}
          envMapIntensity={0.2}
        />
      </mesh>

      {/* Recessed troffer panels */}
      {trofferZRows.map((z) =>
        trofferXPositions.map((x) => (
          <TrofferPanel key={`troffer-${z}-${x}`} position={[x, CEILING_Y - 0.005, z]} />
        )),
      )}
      {corridorTrofferXPositions.map((x) => (
        <TrofferPanel key={`troffer-c-${x}`} position={[x, CEILING_Y - 0.005, 0]} variant="slim" />
      ))}

      {/* Overhead cable trays */}
      <CableTray position={[0, CEILING_Y - 0.45, -3.6]} length={ROOM_LENGTH - 2} width={0.45} />
      <CableTray position={[0, CEILING_Y - 0.45, 3.6]} length={ROOM_LENGTH - 2} width={0.45} />

      {/* Overhead power busway */}
      <PowerBusway position={[0, CEILING_Y - 0.55, 0]} length={ROOM_LENGTH - 2.5} />

      {/* Side Walls */}
      <mesh position={[0, FLOOR_Y + ROOM_HEIGHT / 2, -ROOM_WIDTH / 2]} material={materials.wall}>
        <boxGeometry args={[ROOM_LENGTH, ROOM_HEIGHT, 0.15]} />
      </mesh>
      <mesh position={[0, FLOOR_Y + ROOM_HEIGHT / 2, ROOM_WIDTH / 2]} material={materials.wall}>
        <boxGeometry args={[ROOM_LENGTH, ROOM_HEIGHT, 0.15]} />
      </mesh>

      {/* End Walls */}
      <mesh position={[-ROOM_LENGTH / 2, FLOOR_Y + ROOM_HEIGHT / 2, 0]} material={materials.wall}>
        <boxGeometry args={[0.15, ROOM_HEIGHT, ROOM_WIDTH]} />
      </mesh>
      <mesh position={[ROOM_LENGTH / 2, FLOOR_Y + ROOM_HEIGHT / 2, 0]} material={materials.wall}>
        <boxGeometry args={[0.15, ROOM_HEIGHT, ROOM_WIDTH]} />
      </mesh>

      {/* Decorative wall panels + corner LED strips.
          Hidden in `compact` mode (e.g. the Command Center split view's
          inside-room camera) because their seams read as extra bezels
          when viewed from inside the corridor. */}
      {!compact && (
        <>
          {/* Wall panels — back wall */}
          {Array.from({ length: 10 }, (_, i) => (
            <mesh
              key={`panel-back-${i}`}
              position={[
                -ROOM_LENGTH / 2 + 2.5 + i * 2.5,
                FLOOR_Y + ROOM_HEIGHT / 2,
                -ROOM_WIDTH / 2 + 0.1,
              ]}
              geometry={WALL_PANEL_GEO}
            >
              <primitive object={materials.wallPanel} attach="material" />
            </mesh>
          ))}

          {/* Wall panels — front wall */}
          {Array.from({ length: 10 }, (_, i) => (
            <mesh
              key={`panel-front-${i}`}
              position={[
                -ROOM_LENGTH / 2 + 2.5 + i * 2.5,
                FLOOR_Y + ROOM_HEIGHT / 2,
                ROOM_WIDTH / 2 - 0.1,
              ]}
              geometry={WALL_PANEL_GEO}
            >
              <primitive object={materials.wallPanel} attach="material" />
            </mesh>
          ))}

          {/* Subtle corner LED accents */}
          <VerticalLEDStrip
            position={[-ROOM_LENGTH / 2 + 0.18, FLOOR_Y + ROOM_HEIGHT / 2, -ROOM_WIDTH / 2 + 0.6]}
            height={ROOM_HEIGHT - 0.6}
          />
          <VerticalLEDStrip
            position={[-ROOM_LENGTH / 2 + 0.18, FLOOR_Y + ROOM_HEIGHT / 2, ROOM_WIDTH / 2 - 0.6]}
            height={ROOM_HEIGHT - 0.6}
          />
          <VerticalLEDStrip
            position={[ROOM_LENGTH / 2 - 0.18, FLOOR_Y + ROOM_HEIGHT / 2, -ROOM_WIDTH / 2 + 0.6]}
            height={ROOM_HEIGHT - 0.6}
          />
          <VerticalLEDStrip
            position={[ROOM_LENGTH / 2 - 0.18, FLOOR_Y + ROOM_HEIGHT / 2, ROOM_WIDTH / 2 - 0.6]}
            height={ROOM_HEIGHT - 0.6}
          />
        </>
      )}

      {/* Region/Floor name on end wall */}
      <Text
        position={[ROOM_LENGTH / 2 - 0.2, FLOOR_Y + ROOM_HEIGHT / 2 + 0.5, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        fontSize={0.5}
        color="#dde6f0"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.015}
        outlineColor="#0a1320"
      >
        {regionName}
      </Text>
      <mesh position={[ROOM_LENGTH / 2 - 0.18, FLOOR_Y + ROOM_HEIGHT / 2 - 0.1, 0]}>
        <boxGeometry args={[0.02, 0.02, 4]} />
        <meshStandardMaterial
          color="#1f9bff"
          emissive="#1f9bff"
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>

      {/* Single subtle floor wayfinding stripe down the center.
          Hidden in `compact` mode so the corridor floor stays clean
          when the camera sits inside the room. */}
      {!compact && (
        <mesh position={[0, FLOOR_Y + 0.005, 0]}>
          <boxGeometry args={[ROOM_LENGTH - 2, 0.005, 0.06]} />
          <meshStandardMaterial color="#5a6270" roughness={0.7} metalness={0.1} />
        </mesh>
      )}
    </group>
  );
}

export default DataCenterEnvironment;
