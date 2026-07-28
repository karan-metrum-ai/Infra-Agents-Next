"use client";

/**
 * RackCduBay - the coolant-distribution-unit bay rendered below the
 * server bay when a rack's API data includes CDU devices: the divider
 * plates plus one `CoolantDistributionUnit` per device with its
 * hostname hover label.
 *
 * Extracted from `ServerRack` so the (conditional, only-present-on-some-
 * racks) CDU bay markup has its own home.
 */

import { Html } from "@react-three/drei";
import type { Device3D } from "./types";
import { CoolantDistributionUnit } from "./CoolantDistributionUnit";
import { getDeviceLabelPalette } from "./rackDeviceLabelStyle";
import { createDeviceClickHandler, rackPointerCursorHandlers } from "./rackInteractionHandlers";

interface RackCduBayProps {
  cduDevices: Device3D[];
  selectedDeviceIds: Set<string>;
  isRackSelected: boolean;
  showDeviceLabels: boolean;
  onDeviceClick?: (device: Device3D) => void;
  onToggleSelection?: (deviceId: string, isSelected: boolean) => void;
}

const CDU_MIN_HEIGHT_U = 4;
const CDU_LABEL_WIDTH = 80;

export function RackCduBay({
  cduDevices,
  selectedDeviceIds,
  isRackSelected,
  showDeviceLabels,
  onDeviceClick,
  onToggleSelection,
}: RackCduBayProps) {
  return (
    <>
      {/* Solid divider plate separating server bay from CDU */}
      <mesh position={[0.3, -0.95, 0.12]}>
        <boxGeometry args={[0.6, 0.035, 0.78]} />
        <meshStandardMaterial color="#1a1a1e" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Front-visible divider trim strip */}
      <mesh position={[0.3, -0.95, 0.52]}>
        <boxGeometry args={[0.62, 0.025, 0.015]} />
        <meshStandardMaterial color="#606068" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* CDU cooling units */}
      {cduDevices.map((cduDevice, idx) => {
        const cduHeightU = Math.max(
          CDU_MIN_HEIGHT_U,
          Math.floor(cduDevice.height_u || CDU_MIN_HEIGHT_U),
        );
        const cduMeshH = cduHeightU * 0.044;
        const cduY = -0.97 - 0.02 - cduMeshH / 2 - idx * (cduMeshH + 0.01);
        const cduSelected = selectedDeviceIds.has(cduDevice.device_id);
        const handleClick = createDeviceClickHandler(
          cduDevice,
          cduSelected,
          onToggleSelection,
          onDeviceClick,
        );
        const palette = getDeviceLabelPalette(
          cduSelected,
          cduDevice.health_status === "critical",
          "cdu",
        );

        return (
          <group
            key={cduDevice.device_id}
            position={[0.3, cduY, 0.12]}
            onClick={(e) => handleClick(e)}
            {...rackPointerCursorHandlers}
          >
            <CoolantDistributionUnit
              heightU={cduHeightU}
              isSelected={cduSelected}
              healthStatus={cduDevice.health_status}
              status={cduDevice.status}
            />

            {isRackSelected && showDeviceLabels && (
              <Html position={[0, 0, 0.4]} center distanceFactor={9} zIndexRange={[100, 0]}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeviceClick?.(cduDevice);
                  }}
                  aria-label={`View details for ${cduDevice.hostname}`}
                  style={{
                    background: palette.background,
                    color: palette.color,
                    padding: "1px 5px",
                    borderRadius: "2px",
                    fontSize: "5px",
                    fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: "0.01em",
                    lineHeight: 1.2,
                    width: `${CDU_LABEL_WIDTH}px`,
                    boxSizing: "border-box",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    cursor: "pointer",
                    border: palette.border,
                    transition: "all 0.15s ease",
                    boxShadow: palette.boxShadow,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = palette.hoverBackground;
                    e.currentTarget.style.transform = "scale(1.03)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = palette.background;
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  {cduDevice.hostname}
                </button>
              </Html>
            )}
          </group>
        );
      })}
    </>
  );
}

export default RackCduBay;
