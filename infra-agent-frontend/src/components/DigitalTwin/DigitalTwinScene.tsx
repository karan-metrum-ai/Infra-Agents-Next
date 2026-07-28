"use client";

/**
 * DigitalTwinScene - The upgraded data center 3D scene.
 *
 * A pure presentational React component. No Redux, no router, no fetch.
 * Driven entirely by props (Rack3D[] + selection + callbacks). Drop into
 * any host that can produce a list of racks.
 *
 * Wraps a React Three Fiber Canvas with:
 *   - Cinematic camera with smooth focus-on-rack lerp
 *   - Room bounds limiter so the user cannot leave the data hall
 *   - Multi-tier lighting (ambient + hemisphere + key directional)
 *   - DataCenterEnvironment, NetworkCables, and ServerRack instances
 *   - Optional `children` slot rendered INSIDE the Canvas, so the host
 *     can inject extras (e.g. <GhostTechnician />) without duplicating
 *     Canvas setup or breaking R3F's reconciler context
 */

import {
  memo,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment } from "@react-three/drei";
import * as THREE from "three";

import type { Device3D, Rack3D } from "./types";
import { DataCenterEnvironment } from "./DataCenterEnvironment";
import { NetworkCables } from "./NetworkCables";
import { ServerRack } from "./ServerRack";
import { computeAspectFov } from "./aspectFov";

import styles from "./DigitalTwinSceneStates.module.css";

export type InitialCameraPreset = "overview" | "inside-room";

interface CameraPose {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

/**
 * Room-bound clamp values (must mirror `CameraBoundsLimiter` below). Used
 * to guarantee that any computed camera pose stays inside the hall.
 */
const ROOM_BOUNDS = {
  minX: -13.65,
  maxX: 13.65,
  minY: -1.1,
  maxY: 2.75,
  minZ: -5.65,
  maxZ: 5.65,
} as const;

/**
 * Empty-state fallback used when the host mounts the scene before the
 * racks have loaded — keeps the camera in a sensible "looking at the
 * corridor" pose so we never end up staring at a blank wall.
 */
const EMPTY_OVERVIEW: CameraPose = {
  position: new THREE.Vector3(-7, 1.55, 0),
  target: new THREE.Vector3(5, 0.6, 0),
  fov: 65,
};
const EMPTY_INSIDE: CameraPose = {
  position: new THREE.Vector3(-7, 1.55, 0),
  target: new THREE.Vector3(5, 0.6, 0),
  fov: 60,
};

/**
 * Compute a camera pose that **frames the actual racks** at first load.
 *
 * Strategy:
 *   1. Build a bounding box around all rack positions on the X/Z plane.
 *   2. Aim the target at the centre of that box, slightly above the floor
 *      (y = 0.4 — roughly the vertical middle of a 2 m rack).
 *   3. Stand the camera on the +Z side (behind Row B), elevated, and
 *      pulled back proportionally to the longest extent so everything
 *      fits inside the chosen FOV. With a single rack this lands ~3 m
 *      in front of it; with 14 racks this pulls back across the hall.
 *   4. Clamp the final position into the room bounds so we never spawn
 *      outside the data hall.
 *
 * Both presets now share the same corridor camera pose: the camera
 * stands BEHIND the leftmost rack column in the central corridor
 * (z = 0) at human eye-level, looking down the +X aisle. Standback
 * scales with the rack-row length so EVERY rack stays visible in the
 * default view, regardless of consumer (split view, /digital-twin,
 * Physical Systems).
 *
 * `preset` is kept on the public API for forward compatibility but no
 * longer changes the framing — split view, /digital-twin and Physical
 * Systems all want the same "stand in the aisle and look at the racks"
 * default pose, so we deliberately collapse the two branches.
 */
function getInitialCameraFromRacks(racks: Rack3D[], preset: InitialCameraPreset): CameraPose {
  if (racks.length === 0) {
    return preset === "inside-room" ? EMPTY_INSIDE : EMPTY_OVERVIEW;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  for (const rack of racks) {
    const rx = rack.position[0];
    if (rx < minX) minX = rx;
    if (rx > maxX) maxX = rx;
  }

  const rowLength = Math.max(2, maxX - minX);

  // Pull back enough to fit the whole row in the FOV, plus a base
  // breathing-room margin behind the leftmost rack.
  const MIN_STANDBACK = 4.5;
  const STANDBACK_PER_M = 0.55; // adds ~5.5 m for a 10-rack row
  const standback = MIN_STANDBACK + rowLength * STANDBACK_PER_M;

  const EYE_Y = 1.55; // human standing eye-level
  const TARGET_Y = 0.6; // slight downward gaze toward rack mid

  const cameraX = THREE.MathUtils.clamp(
    minX - standback,
    ROOM_BOUNDS.minX + 0.5,
    ROOM_BOUNDS.maxX - 0.5,
  );
  // Aim past the rightmost rack so the gaze points down the full
  // length of the aisle, not just at the first rack.
  const targetX = THREE.MathUtils.clamp(maxX + 2, cameraX + 6, ROOM_BOUNDS.maxX - 0.5);

  return {
    position: new THREE.Vector3(cameraX, EYE_Y, 0),
    target: new THREE.Vector3(targetX, TARGET_Y, 0),
    fov: 65,
  };
}

export interface DigitalTwinSceneProps {
  /** Racks to render. Memoize this on the host side. */
  racks: Rack3D[];
  /** Region/floor name etched on the end wall. */
  regionName?: string;
  /** Controlled focused rack id. When set, the camera animates to it. */
  selectedRackId?: string | null;
  /** Controlled set of selected device ids. */
  selectedDeviceIds?: Set<string>;
  /** Show device hostname labels for the focused rack. Default true. */
  showDeviceLabels?: boolean;
  onRackClick?: (rackId: string) => void;
  onDeviceClick?: (device: Device3D) => void;
  onToggleSelection?: (deviceId: string, selected: boolean) => void;
  onToggleRackDeviceLabels?: (rackId: string) => void;
  /** Show the built-in fade-in loading overlay. Default true. */
  showLoadingOverlay?: boolean;
  /**
   * Initial camera preset. `overview` (default) is pulled back further
   * with a higher elevation. `inside-room` is tighter and lower —
   * used by the Command Center split view.
   *
   * In both cases the **actual pose is computed from the rack bounding
   * box**, so the racks are guaranteed to be in frame at first load
   * regardless of how many came back from the API.
   *
   * The same pose is also used as the fallback target when
   * `selectedRackId` is cleared (so "Reset View" returns home in the
   * same pose the scene was mounted with).
   */
  initialCamera?: InitialCameraPreset;
  /**
   * Show the built-in "Reset View" pill in the top-right of the canvas.
   * Defaults to `true`. The pill auto-appears when the user has either
   * focused a rack OR orbited the camera away from the initial pose.
   */
  showResetButton?: boolean;
  /**
   * Called when the user clicks the built-in "Reset View" pill. Hosts
   * should clear their `selectedRackId` state so any open rack focus is
   * released. The camera always animates back to the initial pose; this
   * callback only exists so the host can keep its own UI in sync.
   */
  onResetView?: () => void;
  /**
   * Optional inline style applied to the toolbar container (Hide
   * Tags / Reset View). Use to reposition the toolbar when the
   * scene is embedded under a fixed nav bar that would otherwise
   * cover it — e.g. `{ top: '90px' }`.
   */
  toolbarStyle?: CSSProperties;
  className?: string;
  style?: CSSProperties;
  /**
   * Children rendered INSIDE the <Canvas> so hosts can inject extra
   * 3D content (e.g. <GhostTechnician />) without duplicating Canvas
   * setup or breaking R3F's reconciler context.
   */
  children?: ReactNode;
}

const EMPTY_DEVICE_SET: Set<string> = new Set();

function getRackFocusView(rack: Rack3D | null, fallback: CameraPose): CameraPose {
  if (!rack) {
    return fallback;
  }

  const yaw = rack.rotation?.[1] ?? 0;
  const rackCenter = new THREE.Vector3(rack.position[0], rack.position[1] + 0.08, rack.position[2]);
  const rackLocalCenter = new THREE.Vector3(0.29, 0, 0.18).applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    yaw,
  );
  const frontDirection = new THREE.Vector3(0, 0, 1)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
    .normalize();
  const target = rackCenter.clone().add(rackLocalCenter);
  const position = target
    .clone()
    .add(frontDirection.multiplyScalar(3.35))
    .add(new THREE.Vector3(0, 0.78, 0));

  return { position, target, fov: 48 };
}

type OrbitControlsWithEvents = {
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
} & { target: THREE.Vector3; update?: () => void };

function RackCameraFocus({
  rack,
  fallback,
  resetTick,
}: {
  rack: Rack3D | null;
  fallback: CameraPose;
  /**
   * Bumped by the host whenever it wants to force the camera to
   * re-animate to the fallback pose (used by the Reset View button so
   * a click works even when no rack was focused in the first place).
   */
  resetTick: number;
}) {
  const { camera, controls, size } = useThree() as unknown as {
    camera: THREE.PerspectiveCamera;
    controls: OrbitControlsWithEvents | null;
    size: { width: number; height: number };
  };
  const isAnimating = useRef(true);
  const aspect = size.width / size.height;

  // Both poses' fov values are tuned for ~16:9; on wider viewports,
  // aspect-compensate the actual lerp target so the camera doesn't
  // settle into a pose that reveals extra empty space at the sides
  // (see aspectFov.ts). Compensating here (the animation target)
  // rather than the pose functions themselves keeps their geometry
  // math aspect-agnostic and avoids a second, competing fov writer.
  const adjustedFallback = useMemo(
    () => ({ ...fallback, fov: computeAspectFov(fallback.fov, aspect) }),
    [fallback, aspect],
  );

  const focusView = useMemo(() => {
    const base = getRackFocusView(rack, adjustedFallback);
    if (!rack) return base; // === adjustedFallback, already compensated
    return { ...base, fov: computeAspectFov(base.fov, aspect) };
  }, [rack, adjustedFallback, aspect]);

  useEffect(() => {
    isAnimating.current = true;
  }, [focusView, resetTick]);

  useEffect(() => {
    if (!controls) return;
    const stopAnim = () => {
      isAnimating.current = false;
    };
    controls.addEventListener("start", stopAnim);
    return () => {
      controls.removeEventListener("start", stopAnim);
    };
  }, [controls]);

  useFrame((_, delta) => {
    if (!isAnimating.current) return;

    const ease = 1 - Math.exp(-delta * 4);

    camera.position.lerp(focusView.position, ease);
    camera.fov = THREE.MathUtils.lerp(camera.fov, focusView.fov, ease);
    camera.updateProjectionMatrix();

    if (controls?.target) {
      controls.target.lerp(focusView.target, ease);
      controls.update?.();
    }

    const targetDistance = controls?.target ? controls.target.distanceTo(focusView.target) : 0;
    const isSettled =
      camera.position.distanceTo(focusView.position) < 0.025 &&
      targetDistance < 0.025 &&
      Math.abs(camera.fov - focusView.fov) < 0.15;

    if (isSettled) {
      isAnimating.current = false;
    }
  });

  return null;
}

/**
 * Clamps the orbit camera + target so the user can never leave the room.
 * Bounds match DataCenterEnvironment (28 long x 12 wide x 4 tall).
 */
function CameraBoundsLimiter() {
  const { camera, controls } = useThree() as unknown as {
    camera: THREE.PerspectiveCamera;
    controls: { target: THREE.Vector3 } | null;
  };

  const BOUNDS = useMemo(
    () => ({
      minX: -13.65,
      maxX: 13.65,
      minY: -1.1,
      maxY: 2.75,
      minZ: -5.65,
      maxZ: 5.65,
    }),
    [],
  );

  useFrame(() => {
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, BOUNDS.minX, BOUNDS.maxX);
    camera.position.y = THREE.MathUtils.clamp(camera.position.y, BOUNDS.minY, BOUNDS.maxY);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, BOUNDS.minZ, BOUNDS.maxZ);

    if (controls && controls.target) {
      controls.target.x = THREE.MathUtils.clamp(controls.target.x, BOUNDS.minX, BOUNDS.maxX);
      controls.target.y = THREE.MathUtils.clamp(controls.target.y, BOUNDS.minY, BOUNDS.maxY);
      controls.target.z = THREE.MathUtils.clamp(controls.target.z, BOUNDS.minZ, BOUNDS.maxZ);
    }
  });

  return null;
}

/**
 * Reports back to the host whenever the camera drifts away from (or
 * snaps back to) the initial pose. Used to auto-show / auto-hide the
 * built-in Reset View pill.
 */
function CameraDriftReporter({
  initialPose,
  onDriftChange,
}: {
  initialPose: CameraPose;
  onDriftChange: (drifted: boolean) => void;
}) {
  const { camera, controls, size } = useThree() as unknown as {
    camera: THREE.PerspectiveCamera;
    controls: { target: THREE.Vector3 } | null;
    size: { width: number; height: number };
  };
  const drifted = useRef(false);
  const aspect = size.width / size.height;
  // Must match the aspect-compensated fov that RackCameraFocus lerps
  // toward at rest, or this would report permanent drift on every
  // ultrawide viewport (see RackCameraFocus above).
  const adjustedInitialFov = useMemo(
    () => computeAspectFov(initialPose.fov, aspect),
    [initialPose.fov, aspect],
  );

  useFrame(() => {
    if (!controls?.target) return;
    const posDelta = camera.position.distanceTo(initialPose.position);
    const targetDelta = controls.target.distanceTo(initialPose.target);
    const fovDelta = Math.abs(camera.fov - adjustedInitialFov);
    const isDrifted = posDelta > 0.6 || targetDelta > 0.4 || fovDelta > 1.5;
    if (isDrifted !== drifted.current) {
      drifted.current = isDrifted;
      onDriftChange(isDrifted);
    }
  });

  return null;
}

function DigitalTwinSceneInner({
  racks,
  regionName = "DATA CENTER",
  selectedRackId = null,
  selectedDeviceIds = EMPTY_DEVICE_SET,
  showDeviceLabels = true,
  onRackClick,
  onDeviceClick,
  onToggleSelection,
  onToggleRackDeviceLabels,
  showLoadingOverlay = true,
  initialCamera = "overview",
  showResetButton = true,
  onResetView,
  toolbarStyle,
  className,
  style,
  children,
}: DigitalTwinSceneProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [resetTick, setResetTick] = useState(0);
  const [, setCameraDrifted] = useState(false);
  const [localShowTags, setLocalShowTags] = useState(showDeviceLabels);

  const initialPose = useMemo(
    () => getInitialCameraFromRacks(racks, initialCamera),
    [racks, initialCamera],
  );

  const focusedRack = useMemo(
    () => racks.find((rack) => rack.rack_id === selectedRackId) ?? null,
    [racks, selectedRackId],
  );

  const handleResetView = () => {
    setResetTick((tick) => tick + 1);
    onResetView?.();
  };

  const handleToggleTags = () => {
    setLocalShowTags((prev) => !prev);
  };

  const showToolbar = showResetButton;

  // Split-view (`inside-room`) mounts against a pitch-black dashboard
  // shell. Grey canvas/fog backdrops read as visible bezels at the edges.
  const isInsideRoom = initialCamera === "inside-room";
  const sceneBackdrop = isInsideRoom ? "#000000" : "#3b3b3b";

  const containerStyle: CSSProperties = useMemo(
    () => ({
      position: "relative",
      width: "100%",
      height: "100%",
      ...style,
    }),
    [style],
  );

  return (
    <div className={className} style={containerStyle}>
      {showLoadingOverlay && isLoading && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <div className={styles.loadingTitle}>Loading 3D Scene</div>
          <div className={styles.loadingSubtitle}>Building data center environment…</div>
        </div>
      )}

      <Canvas
        shadows={{ type: THREE.PCFShadowMap, enabled: true }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        onCreated={() => setIsLoading(false)}
        style={{ background: sceneBackdrop }}
      >
        <color attach="background" args={[sceneBackdrop]} />
        <PerspectiveCamera
          makeDefault
          position={initialPose.position.toArray()}
          fov={initialPose.fov}
          near={0.1}
          far={200}
        />

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.06}
          enableRotate
          enableZoom
          enablePan
          minDistance={1.2}
          maxDistance={26}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2 + 0.15}
          screenSpacePanning={false}
          target={initialPose.target.toArray()}
        />

        <CameraBoundsLimiter />
        <RackCameraFocus rack={focusedRack} fallback={initialPose} resetTick={resetTick} />
        <CameraDriftReporter initialPose={initialPose} onDriftChange={setCameraDrifted} />

        {/*
         * Global lights only: troffers are emissive (no per-panel point lights)
         * so the hall stays bright without 20+ expensive real-time lights.
         */}
        <ambientLight intensity={0.72} color="#d8dde4" />
        <hemisphereLight args={["#c5d0dc", "#3b3b3b", 0.78]} />
        <directionalLight
          position={[0, 14, 2]}
          intensity={0.85}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={1}
          shadow-camera-far={25}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
          shadow-bias={-0.0001}
          shadow-normalBias={0.05}
        />

        <Suspense fallback={null}>
          <DataCenterEnvironment
            regionName={regionName}
            compact={initialCamera === "inside-room"}
          />

          <NetworkCables racks={racks} />

          {racks.map((rack) => (
            <ServerRack
              key={rack.rack_id}
              rack={rack}
              selectedDeviceIds={selectedDeviceIds}
              selectedRackId={selectedRackId}
              showDeviceLabels={localShowTags && selectedRackId === rack.rack_id}
              onRackClick={onRackClick}
              onDeviceClick={onDeviceClick}
              onToggleSelection={onToggleSelection}
              onToggleRackDeviceLabels={onToggleRackDeviceLabels}
            />
          ))}

          {children}

          <Environment preset="night" background={false} frames={1} />
        </Suspense>

        <fog attach="fog" args={[sceneBackdrop, 42, 95]} />
      </Canvas>

      {/* Top toolbar - Reset View + Toggle Tags */}
      {showToolbar && (
        <div className={styles.topToolbar} style={toolbarStyle}>
          {/* Toggle Tags button */}
          <button
            type="button"
            onClick={handleToggleTags}
            className={styles.toolbarPill}
            aria-label={localShowTags ? "Hide tags" : "Show tags"}
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {localShowTags ? (
                <>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </>
              ) : (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
            <span>{localShowTags ? "Hide Tags" : "Show Tags"}</span>
          </button>

          {/* Reset View button */}
          <button
            type="button"
            onClick={handleResetView}
            className={styles.toolbarPill}
            aria-label="Reset camera to default view"
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            <span>Reset View</span>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Memoized so unrelated host re-renders (e.g. opening a side panel)
 * do not re-render the heavy Canvas tree.
 */
export const DigitalTwinScene = memo(DigitalTwinSceneInner);
DigitalTwinScene.displayName = "DigitalTwinScene";

export default DigitalTwinScene;
