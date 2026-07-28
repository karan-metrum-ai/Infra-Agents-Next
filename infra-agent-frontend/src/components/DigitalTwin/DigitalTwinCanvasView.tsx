"use client";

/**
 * The main 3D canvas composition for `DataCenterDigitalTwin`'s
 * interior/exterior view modes: `DigitalTwinScene` (rack floor) for
 * interior, or a plain react-three-fiber `Canvas` + `BuildingExterior`
 * for exterior — plus the layout-metadata-warning banner shared by both.
 */

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { AspectFov } from "./AspectFov";
import { BuildingExterior } from "./BuildingExterior";
import { DigitalTwinScene } from "./DigitalTwinScene";
import styles from "./DataCenterDigitalTwin.module.css";
import type { DigitalTwinCanvasViewProps } from "./DataCenterDigitalTwin.types";

export function DigitalTwinCanvasView({
  viewMode,
  racks,
  regionName,
  currentFloor,
  totalFloors,
  floorHeight,
  selectedRackId,
  selectedDeviceIds,
  layoutWarnings,
  showContent,
  onRackClick,
  onDeviceClick,
  onToggleSelection,
  onResetView,
  onFloorClickFromExterior,
}: DigitalTwinCanvasViewProps) {
  return (
    <div
      className={`${styles.canvasStage} ${showContent ? styles.canvasStageVisible : styles.canvasStageHidden}`}
    >
      {layoutWarnings.length > 0 && (
        <div role="alert" className={styles.layoutWarningBanner}>
          Layout metadata incomplete — check CSV upload ({layoutWarnings.length} skipped)
        </div>
      )}

      {viewMode === "interior" ? (
        <DigitalTwinScene
          racks={racks}
          regionName={`${regionName} - Floor ${currentFloor}`}
          selectedRackId={selectedRackId}
          selectedDeviceIds={selectedDeviceIds}
          onRackClick={onRackClick}
          onDeviceClick={onDeviceClick}
          onToggleSelection={onToggleSelection}
          onResetView={onResetView}
          toolbarStyle={{ top: "90px" }}
        />
      ) : (
        <Canvas shadows>
          {/* Front-facing camera: stand directly in front of the building
              (+Z side) at building mid-height, looking straight at the
              centre of the facade. The whole structure fits inside the
              frame at fov 50 from ~45 m back. */}
          <PerspectiveCamera
            makeDefault
            position={[0, (totalFloors * floorHeight) / 2, 45]}
            fov={50}
          />
          <AspectFov baseFov={50} />
          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            minDistance={15}
            maxDistance={100}
            maxPolarAngle={Math.PI / 2}
            enableDamping
            dampingFactor={0.05}
            target={[0, (totalFloors * floorHeight) / 2, 0]}
          />

          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
          <pointLight position={[-5, 3, 0]} intensity={0.6} color="#00aaff" />
          <pointLight position={[5, 3, 0]} intensity={0.6} color="#ff6600" />

          <Suspense fallback={null}>
            <BuildingExterior
              floors={totalFloors}
              floorHeight={floorHeight}
              regionName={regionName}
              currentFloor={currentFloor}
              onFloorClick={onFloorClickFromExterior}
            />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}
