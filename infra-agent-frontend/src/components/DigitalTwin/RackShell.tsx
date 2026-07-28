"use client";

/**
 * RackShell - the static/animated rack enclosure: frame, panels, feet,
 * the animated front door, the health status strip, and the rack-name
 * toggle chip shown when the rack is selected.
 *
 * Extracted from `ServerRack` so the (fairly large) shell geometry and
 * its door/status-pulse animation live apart from device placement and
 * selection concerns.
 */

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { RackHealthStatus } from "./useRackLayout";
import { sharedRackMaterials } from "./serverRackMaterials";
import { mergedRackStaticGeo } from "./rackMergedStatic";
import {
  rackGeo,
  rackHighlightBounds,
  getPerforatedDoorTexture,
  getDellLogoBadgeTexture,
} from "./rackSharedGeometries";
import { createRackClickHandler, rackPointerCursorHandlers } from "./rackInteractionHandlers";

interface RackShellProps {
  rackId: string;
  rackName: string;
  hasCdu: boolean;
  cduBayHeight: number;
  rackHealthStatus: RackHealthStatus;
  isRackSelected: boolean;
  showDeviceLabels: boolean;
  onRackClick?: (rackId: string) => void;
  onToggleRackDeviceLabels?: (rackId: string) => void;
}

export function RackShell({
  rackId,
  rackName,
  hasCdu,
  cduBayHeight,
  rackHealthStatus,
  isRackSelected,
  showDeviceLabels,
  onRackClick,
  onToggleRackDeviceLabels,
}: RackShellProps) {
  const doorRef = useRef<THREE.Group>(null);
  const doorRotation = useRef(0);
  const targetRotation = isRackSelected ? -Math.PI * 0.45 : 0;

  useFrame((_state, delta: number) => {
    if (doorRef.current) {
      const speed = 3;
      doorRotation.current += (targetRotation - doorRotation.current) * speed * delta;
      doorRef.current.rotation.y = doorRotation.current;
    }
  });

  const statusIndicatorRef = useRef<THREE.Mesh>(null);
  const statusGlowRef = useRef<THREE.PointLight>(null);
  const pulseTime = useRef(0);

  // Pulse strip + soft wash only for warning/critical so issues
  // read from aisle distance without a loud healthy LED.
  useFrame((_s, delta: number) => {
    if (rackHealthStatus === "ok") return;
    pulseTime.current += delta;
    const pulse =
      Math.sin(pulseTime.current * (rackHealthStatus === "critical" ? 3.2 : 1.8)) * 0.5 + 0.5;
    if (statusIndicatorRef.current) {
      const material = statusIndicatorRef.current.material as THREE.MeshStandardMaterial;
      const base = rackHealthStatus === "critical" ? 1.4 : 1.0;
      material.emissiveIntensity = base + pulse * 1.2;
    }
    if (statusGlowRef.current) {
      const baseGlow = rackHealthStatus === "critical" ? 0.55 : 0.35;
      statusGlowRef.current.intensity = baseGlow + pulse * 0.35;
    }
  });

  const statusInsetMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0a0a0a",
        metalness: 0.7,
        roughness: 0.45,
      }),
    [],
  );

  const statusIndicatorMaterial = useMemo(() => {
    if (rackHealthStatus === "critical") {
      return new THREE.MeshStandardMaterial({
        color: "#cc1a00",
        emissive: "#ff3300",
        emissiveIntensity: 1.6,
        toneMapped: false,
      });
    }
    if (rackHealthStatus === "warning") {
      return new THREE.MeshStandardMaterial({
        color: "#cc8800",
        emissive: "#ffaa00",
        emissiveIntensity: 1.2,
        toneMapped: false,
      });
    }
    // Healthy: soft glowing green, sits proud of the inset
    return new THREE.MeshStandardMaterial({
      color: "#2dff7a",
      emissive: "#3dff88",
      emissiveIntensity: 1.15,
      toneMapped: false,
    });
  }, [rackHealthStatus]);

  const statusGlowColor = useMemo(() => {
    if (rackHealthStatus === "critical") return "#ff3300";
    if (rackHealthStatus === "warning") return "#ffaa00";
    return "#3dff88";
  }, [rackHealthStatus]);

  const meshDoorMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: getPerforatedDoorTexture(),
      metalness: 0.6,
      roughness: 0.4,
      transparent: true,
      opacity: 0.95,
    });
  }, []);

  const logoMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: getDellLogoBadgeTexture(),
      transparent: true,
    });
  }, []);

  const rackClickMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );

  const handleRackClick = createRackClickHandler(rackId, onRackClick);

  const doorH = 1.85 + cduBayHeight;
  const meshH = 1.82 + cduBayHeight;
  const trimV = 1.92 + cduBayHeight;
  const doorCenterY = -cduBayHeight / 2;
  const bottomFrameY = -0.92 - cduBayHeight;
  const bottomTrimY = -0.96 - cduBayHeight;

  const highlightBaseH = rackHighlightBounds.size[1];
  const highlightExtraH = hasCdu ? cduBayHeight + 0.04 : 0;
  const highlightTotalH = highlightBaseH + highlightExtraH;
  const highlightCenterY = rackHighlightBounds.center[1] - highlightExtraH / 2;

  return (
    <>
      {/* Rack highlight box -- extends to cover CDU bay */}
      <mesh
        position={[rackHighlightBounds.center[0], highlightCenterY, rackHighlightBounds.center[2]]}
        material={rackClickMaterial}
        onClick={(e) => handleRackClick(e)}
        {...rackPointerCursorHandlers}
      >
        <boxGeometry
          args={[rackHighlightBounds.size[0], highlightTotalH, rackHighlightBounds.size[2]]}
        />
      </mesh>

      {/* Corner posts */}
      {hasCdu ? (
        <>
          {[
            [0.02, 0.45],
            [0.58, 0.45],
            [0.02, -0.25],
            [0.58, -0.25],
          ].map(([px, pz], i) => (
            <mesh
              key={`post-${i}`}
              castShadow
              position={[px, -cduBayHeight / 2, pz]}
              material={sharedRackMaterials.frame}
            >
              <boxGeometry args={[0.03, 1.8 + cduBayHeight, 0.03]} />
            </mesh>
          ))}
        </>
      ) : (
        <mesh
          castShadow
          geometry={mergedRackStaticGeo.rackFrame}
          material={sharedRackMaterials.frame}
        />
      )}

      {/* Back panel */}
      {hasCdu ? (
        <mesh position={[0.3, -cduBayHeight / 2, -0.27]} material={sharedRackMaterials.back}>
          <boxGeometry args={[0.64, 1.92 + cduBayHeight, 0.02]} />
        </mesh>
      ) : (
        <mesh geometry={mergedRackStaticGeo.rackBack} material={sharedRackMaterials.back} />
      )}

      {/* Top panel - always the same */}
      <mesh
        castShadow
        geometry={mergedRackStaticGeo.topPanel}
        material={sharedRackMaterials.sidePanel}
      />

      {/* Status light: dark inset channel + slightly bulged bar */}
      <mesh position={[0.3, 0.961, 0.485]} material={statusInsetMaterial}>
        <boxGeometry args={[0.5, 0.01, 0.024]} />
      </mesh>
      <mesh
        ref={statusIndicatorRef}
        position={[0.3, 0.972, 0.485]}
        rotation={[0, 0, Math.PI / 2]}
        material={statusIndicatorMaterial}
      >
        <cylinderGeometry args={[0.009, 0.009, 0.46, 16]} />
      </mesh>

      {/* Soft wash — stronger for issues, faint for healthy glow */}
      <pointLight
        ref={statusGlowRef}
        position={[0.3, 1.02, 0.42]}
        color={statusGlowColor}
        intensity={
          rackHealthStatus === "critical" ? 0.55 : rackHealthStatus === "warning" ? 0.35 : 0.18
        }
        distance={rackHealthStatus === "ok" ? 1.2 : 1.8}
        decay={2}
      />

      {/* Bottom panel -- shifts down when CDU present */}
      <mesh
        castShadow
        receiveShadow
        position={[0.3, -0.96 - cduBayHeight, 0.1]}
        material={sharedRackMaterials.sidePanel}
      >
        <boxGeometry args={[0.64, 0.02, 0.8]} />
      </mesh>

      {/* Side panels */}
      {hasCdu ? (
        <>
          <mesh position={[-0.02, -cduBayHeight / 2, 0.1]} material={sharedRackMaterials.sidePanel}>
            <boxGeometry args={[0.02, 1.92 + cduBayHeight, 0.8]} />
          </mesh>
          <mesh position={[0.62, -cduBayHeight / 2, 0.1]} material={sharedRackMaterials.sidePanel}>
            <boxGeometry args={[0.02, 1.92 + cduBayHeight, 0.8]} />
          </mesh>
        </>
      ) : (
        <mesh geometry={mergedRackStaticGeo.sidePanels} material={sharedRackMaterials.sidePanel} />
      )}

      {/*
       * Front-facing side fascia + interior walls keep empty racks
       * looking enclosed from the aisle camera (perforated door is
       * semi-transparent, so an empty interior reads as skeletal).
       */}
      {(() => {
        const shellCenterY = -cduBayHeight / 2;
        const shellHeight = 1.92 + cduBayHeight;
        const innerHeight = shellHeight - 0.06;
        return (
          <>
            <mesh
              castShadow
              receiveShadow
              position={[0.01, shellCenterY, 0.49]}
              material={sharedRackMaterials.sidePanel}
            >
              <boxGeometry args={[0.025, innerHeight, 0.018]} />
            </mesh>
            <mesh
              castShadow
              receiveShadow
              position={[0.59, shellCenterY, 0.49]}
              material={sharedRackMaterials.sidePanel}
            >
              <boxGeometry args={[0.025, innerHeight, 0.018]} />
            </mesh>
            <mesh
              castShadow
              receiveShadow
              position={[0.045, shellCenterY, 0.08]}
              material={sharedRackMaterials.sidePanel}
            >
              <boxGeometry args={[0.01, innerHeight, 0.68]} />
            </mesh>
            <mesh
              castShadow
              receiveShadow
              position={[0.555, shellCenterY, 0.08]}
              material={sharedRackMaterials.sidePanel}
            >
              <boxGeometry args={[0.01, innerHeight, 0.68]} />
            </mesh>
            <mesh
              castShadow
              receiveShadow
              position={[0.3, shellCenterY, -0.18]}
              material={sharedRackMaterials.back}
            >
              <boxGeometry args={[0.5, innerHeight, 0.012]} />
            </mesh>
          </>
        );
      })()}

      {/* Feet */}
      {hasCdu ? (
        <>
          {[
            [0.08, 0.4],
            [0.52, 0.4],
            [0.08, -0.2],
            [0.52, -0.2],
          ].map(([fx, fz], i) => (
            <mesh
              key={`foot-${i}`}
              position={[fx, -0.99 - cduBayHeight, fz]}
              geometry={rackGeo.foot}
              material={sharedRackMaterials.feet}
            />
          ))}
        </>
      ) : (
        <mesh geometry={mergedRackStaticGeo.feet} material={sharedRackMaterials.feet} />
      )}

      {/* === ANIMATED DOOR GROUP === */}
      <group position={[-0.01, 0, 0.5]} ref={doorRef}>
        <group position={[0.31, 0, 0]}>
          {/* Left door frame */}
          <mesh position={[-0.295, doorCenterY, 0]} material={sharedRackMaterials.doorFrame}>
            <boxGeometry args={[0.03, doorH, 0.025]} />
          </mesh>
          {/* Right door frame */}
          <mesh position={[0.315, doorCenterY, 0]} material={sharedRackMaterials.doorFrame}>
            <boxGeometry args={[0.03, doorH, 0.025]} />
          </mesh>
          {/* Top door frame */}
          <mesh position={[0.01, 0.92, 0]} material={sharedRackMaterials.doorFrame}>
            <boxGeometry args={[0.62, 0.03, 0.025]} />
          </mesh>
          {/* Bottom door frame */}
          <mesh position={[0.01, bottomFrameY, 0]} material={sharedRackMaterials.doorFrame}>
            <boxGeometry args={[0.62, 0.03, 0.025]} />
          </mesh>

          {/* Perforated mesh door panel */}
          <mesh position={[0.01, doorCenterY, 0]} material={meshDoorMaterial}>
            <boxGeometry args={[0.56, meshH, 0.015]} />
          </mesh>

          {/* Silver edge trim - vertical */}
          <mesh position={[-0.31, doorCenterY, 0.02]} material={sharedRackMaterials.edgeTrim}>
            <boxGeometry args={[0.02, trimV, 0.02]} />
          </mesh>
          <mesh position={[0.33, doorCenterY, 0.02]} material={sharedRackMaterials.edgeTrim}>
            <boxGeometry args={[0.02, trimV, 0.02]} />
          </mesh>
          {/* Silver edge trim - horizontal */}
          <mesh position={[0.01, 0.96, 0.02]} material={sharedRackMaterials.edgeTrim}>
            <boxGeometry args={[0.64, 0.02, 0.02]} />
          </mesh>
          <mesh position={[0.01, bottomTrimY, 0.02]} material={sharedRackMaterials.edgeTrim}>
            <boxGeometry args={[0.64, 0.02, 0.02]} />
          </mesh>

          {/* Horizontal divider between server bay and CDU bay */}
          {hasCdu && (
            <mesh position={[0.01, -0.92, 0.02]} material={sharedRackMaterials.edgeTrim}>
              <boxGeometry args={[0.64, 0.02, 0.025]} />
            </mesh>
          )}

          {/* Door handle */}
          <mesh position={[0.29, 0, 0.02]} material={sharedRackMaterials.handle}>
            <boxGeometry args={[0.02, 0.15, 0.025]} />
          </mesh>
          {/* Handle grip */}
          <mesh
            position={[0.305, 0, 0.035]}
            rotation={[Math.PI / 2, 0, 0]}
            geometry={rackGeo.doorHandleGrip}
            material={sharedRackMaterials.handleGrip}
          />

          {/* Dell logo badge at top */}
          <group position={[0.01, 0.85, 0.02]}>
            <mesh
              rotation={[Math.PI / 2, 0, 0]}
              geometry={rackGeo.logoBadge}
              material={sharedRackMaterials.logoBadge}
            />
            <mesh position={[0, 0, 0.005]} material={logoMaterial}>
              <planeGeometry args={[0.07, 0.07]} />
            </mesh>
          </group>
        </group>
      </group>

      {/* Rack name label - shown when rack is selected */}
      {isRackSelected && (
        <Html position={[0.38, 1.38, 0.05]} center distanceFactor={8} zIndexRange={[100, 0]}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleRackDeviceLabels?.(rackId);
            }}
            aria-label={
              showDeviceLabels
                ? `Hide server tags for rack ${rackName}`
                : `Show server tags for rack ${rackName}`
            }
            title={showDeviceLabels ? "Hide server tags" : "Show server tags"}
            style={{
              background: "#252528",
              color: "#fff",
              padding: "5px 12px",
              borderRadius: "3px",
              fontSize: "11px",
              fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.03em",
              whiteSpace: "nowrap",
              cursor: "pointer",
              border: "1px solid #3f3f46",
              boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
            }}
          >
            {rackName}
          </button>
        </Html>
      )}
    </>
  );
}

export default RackShell;
