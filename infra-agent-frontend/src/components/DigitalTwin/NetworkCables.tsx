"use client";

/**
 * NetworkCables Component
 *
 * Renders network cable infrastructure in the 3D data center:
 * - Overhead cable trays running along rack rows
 * - Cross-row cable trays connecting rows
 * - Individual cables with realistic sag (catenary curves)
 * - Vertical cable drops from trays to racks
 * - Server-to-server connections between adjacent racks
 */

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { groupRacksByRowBand } from "./rackLayout";
import type { Rack3D } from "./types";

const TRAY_BOTTOM_MAT = new THREE.MeshStandardMaterial({
  color: "#3a3a3a",
  metalness: 0.7,
  roughness: 0.3,
});
const TRAY_SIDE_MAT = new THREE.MeshStandardMaterial({
  color: "#444",
  metalness: 0.6,
  roughness: 0.3,
});

const TRAY_UNIT_BOTTOM = new THREE.BoxGeometry(1, 0.02, 1);
const TRAY_UNIT_SIDE = new THREE.BoxGeometry(1, 0.06, 0.02);

const CABLE_WIRE_MAT = new THREE.MeshStandardMaterial({
  color: "#9ca3af",
  roughness: 0.55,
  metalness: 0.08,
  envMapIntensity: 0.55,
});

interface NetworkCablesProps {
  racks: Rack3D[];
}

interface CableSpec {
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
  thickness?: number;
  sag?: number;
}

const TUBE_TUBULAR = 8;
const TUBE_RADIAL = 4;
const PATH_SEGMENTS = 12;

function createCableTubeGeometry({
  ax,
  ay,
  az,
  bx,
  by,
  bz,
  thickness = 0.015,
  sag = 0.2,
}: CableSpec): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  const adaptiveSag = sag * Math.min(1, distance / 2);

  for (let i = 0; i <= PATH_SEGMENTS; i++) {
    const t = i / PATH_SEGMENTS;
    const smoothT = t * t * (3 - 2 * t);

    const x = ax + dx * smoothT;
    const z = az + dz * smoothT;

    const sagT = Math.sin(Math.PI * t);
    const sagAmount = adaptiveSag * sagT * sagT;
    const y = ay + dy * smoothT - sagAmount;

    points.push(new THREE.Vector3(x, y, z));
  }

  const curve = new THREE.CatmullRomCurve3(points);
  curve.curveType = "centripetal";
  return new THREE.TubeGeometry(curve, TUBE_TUBULAR, thickness, TUBE_RADIAL, false);
}

function buildCableSpecs(
  racks: Rack3D[],
  trayHeight: number,
  _corridorLength: number,
): CableSpec[] {
  const specs: CableSpec[] = [];
  const rowBands = groupRacksByRowBand(racks);
  if (rowBands.length === 0) {
    return specs;
  }

  const minX = Math.min(...racks.map((rack) => rack.position[0])) - 2;
  const maxX = Math.max(...racks.map((rack) => rack.position[0])) + 2;

  for (const band of rowBands) {
    const trayZ = band[0].position[2];
    for (const offset of [-0.12, -0.06, 0, 0.06, 0.12]) {
      specs.push({
        ax: minX,
        ay: trayHeight + 0.06,
        az: trayZ + offset,
        bx: maxX,
        by: trayHeight + 0.06,
        bz: trayZ + offset,
        thickness: 0.015,
        sag: 0.15,
      });
    }
  }

  if (rowBands.length >= 2) {
    const zMin = rowBands[0][0].position[2];
    const zMax = rowBands[rowBands.length - 1][0].position[2];
    const crossXs = [-6, -3, 0, 3, 6].filter((xPos) => xPos >= minX && xPos <= maxX);
    const xs = crossXs.length > 0 ? crossXs : [0];
    for (const xPos of xs) {
      for (const offset of [-0.08, 0, 0.08]) {
        specs.push({
          ax: xPos + offset,
          ay: trayHeight + 0.06,
          az: zMin,
          bx: xPos + offset,
          by: trayHeight + 0.06,
          bz: zMax,
          thickness: 0.012,
          sag: 0.18,
        });
      }
    }
  }

  const RACK_BACK_OFFSET = 0.28;
  const RACK_CENTER_X_OFFSET = 0.3;
  const RACK_RIGHT_EDGE = 0.62;
  const RACK_LEFT_EDGE = -0.02;

  rowBands.forEach((band, bandIdx) => {
    const facesForward = bandIdx % 2 === 0;
    const trayZ = band[0].position[2];
    const backSign = facesForward ? -1 : 1;

    for (const rack of band.filter((_, idx) => idx % 2 === 0)) {
      const rackCenterX = rack.position[0] + RACK_CENTER_X_OFFSET;
      const rackTopY = rack.position[1] + 0.9;
      const rackBackZ = rack.position[2] + backSign * RACK_BACK_OFFSET;
      for (const offset of [-0.08, 0.08]) {
        specs.push({
          ax: rackCenterX + offset,
          ay: trayHeight,
          az: trayZ,
          bx: rackCenterX + offset,
          by: rackTopY,
          bz: rackBackZ,
          thickness: 0.012,
          sag: 0.05,
        });
      }
    }

    const connRacks = band
      .slice(0, -1)
      .filter((_, idx) => idx % 3 === 0)
      .flatMap((rack) => {
        const nextRack = band[band.indexOf(rack) + 1];
        if (!nextRack) {
          return [];
        }

        return [8, 14].map((uPos) => {
          const y = rack.position[1] - 0.6 + uPos * 0.076;
          const z = rack.position[2] + backSign * -RACK_BACK_OFFSET;
          return {
            ax: rack.position[0] + (facesForward ? RACK_RIGHT_EDGE : -RACK_LEFT_EDGE),
            ay: y,
            az: z,
            bx: nextRack.position[0] + (facesForward ? RACK_LEFT_EDGE : -RACK_RIGHT_EDGE),
            by: y,
            bz: z,
            thickness: 0.008,
            sag: 0.03,
          } satisfies CableSpec;
        });
      });
    specs.push(...connRacks);
  });

  return specs;
}

interface CableTrayProps {
  position: [number, number, number];
  length: number;
  width?: number;
  rotation?: [number, number, number];
}

function CableTray({ position, length, width = 0.3, rotation = [0, 0, 0] }: CableTrayProps) {
  return (
    <group position={position} rotation={rotation}>
      <mesh scale={[length, 1, width]} geometry={TRAY_UNIT_BOTTOM}>
        <primitive object={TRAY_BOTTOM_MAT} attach="material" />
      </mesh>
      <mesh position={[0, 0.04, width / 2 - 0.01]} scale={[length, 1, 1]} geometry={TRAY_UNIT_SIDE}>
        <primitive object={TRAY_SIDE_MAT} attach="material" />
      </mesh>
      <mesh
        position={[0, 0.04, -width / 2 + 0.01]}
        scale={[length, 1, 1]}
        geometry={TRAY_UNIT_SIDE}
      >
        <primitive object={TRAY_SIDE_MAT} attach="material" />
      </mesh>
    </group>
  );
}

export function NetworkCables({ racks }: NetworkCablesProps) {
  const trayHeight = 2.0;
  const CORRIDOR_LENGTH = 18;
  const rowBands = useMemo(() => groupRacksByRowBand(racks), [racks]);

  const corridorSpan = useMemo(() => {
    if (racks.length === 0) {
      return CORRIDOR_LENGTH;
    }
    const minX = Math.min(...racks.map((rack) => rack.position[0])) - 2;
    const maxX = Math.max(...racks.map((rack) => rack.position[0])) + 2;
    return Math.max(CORRIDOR_LENGTH, maxX - minX);
  }, [racks]);

  // Phase 15: `buildCableSpecs` only reads each rack's `position`/`row_name`
  // (confirmed above) — never device/health data — but `racks` gets a
  // brand-new object graph from `useDigitalTwinTelemetry`'s 30s poll even
  // when no rack has actually moved. Depending the geometry memo on the
  // full `racks` array meant every telemetry-only poll disposed and
  // rebuilt the entire merged cable-tube geometry (a `mergeGeometries`
  // over dozens of tubes), the exact "dispose+recreate on data update"
  // anti-pattern `005-echarts.mdc`'s 3D-scene equivalent bans. Keying on a
  // derived, position-only string means telemetry-only updates leave this
  // memo — and the geometry it produces — untouched.
  const rackPositionsKey = useMemo(
    () => racks.map((r) => `${r.rack_id}:${r.row_name}:${r.position.join(",")}`).join("|"),
    [racks],
  );

  const mergedCableGeometry = useMemo(() => {
    const specs = buildCableSpecs(racks, trayHeight, CORRIDOR_LENGTH);
    const parts = specs.map((s) => createCableTubeGeometry(s));
    if (parts.length === 0) return null;
    const merged = mergeGeometries(parts);
    for (const p of parts) p.dispose();
    return merged;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: rebuild only when rack positions/rows actually change (rackPositionsKey), not on every telemetry-only `racks` reference change; `racks` itself is still read fresh in the body.
  }, [rackPositionsKey]);

  useEffect(() => {
    return () => {
      mergedCableGeometry?.dispose();
    };
  }, [mergedCableGeometry]);

  return (
    <group>
      {rowBands.map((band, index) => (
        <CableTray
          key={`row-tray-${band[0].row_name}-${index}`}
          position={[0, trayHeight, band[0].position[2]]}
          length={corridorSpan}
          width={0.5}
        />
      ))}

      {rowBands.length >= 2 && (
        <>
          {[-6, -3, 0, 3, 6].map((xPos, i) => (
            <CableTray
              key={`cross-tray-${i}`}
              position={[xPos, trayHeight, 0]}
              length={
                Math.abs(
                  rowBands[rowBands.length - 1][0].position[2] - rowBands[0][0].position[2],
                ) + 1.4
              }
              width={0.4}
              rotation={[0, Math.PI / 2, 0]}
            />
          ))}
        </>
      )}

      {mergedCableGeometry && <mesh geometry={mergedCableGeometry} material={CABLE_WIRE_MAT} />}
    </group>
  );
}

export default NetworkCables;
