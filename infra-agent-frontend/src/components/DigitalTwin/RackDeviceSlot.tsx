"use client";

/**
 * RackDeviceSlot - one server/switch card in the rack, plus its
 * hostname hover label and telemetry-unavailable badge.
 *
 * Extracted from `ServerRack`'s device-slot render loop so the
 * per-device Html/tooltip logic has its own home.
 */

import { Html } from "@react-three/drei";
import { AlertTriangle } from "lucide-react";
import type { Device3D } from "./types";
import { hasUnavailableTelemetryStream } from "./rackUtils";
import { buildAggregateTooltip } from "@/utils/telemetryProbeTooltips";
import { DellServer } from "./DellServer";
import { NetworkSwitch } from "./NetworkSwitch";
import { getDeviceLabelPalette } from "./rackDeviceLabelStyle";
import { createDeviceClickHandler, rackPointerCursorHandlers } from "./rackInteractionHandlers";

interface RackDeviceSlotProps {
  device: Device3D;
  heightU: number;
  yPos: number;
  meshHeight: number;
  switchMeshHeight: number;
  isSwitch: boolean;
  isSelected: boolean;
  isRackSelected: boolean;
  showDeviceLabels: boolean;
  labelOffsetY: number;
  onDeviceClick?: (device: Device3D) => void;
  onToggleSelection?: (deviceId: string, isSelected: boolean) => void;
}

/** Keep hostname tags on the server bezel, inside rack rails. */
const DEVICE_LABEL_Z = 0.36;
const LABEL_MAX_WIDTH = 80;

export function RackDeviceSlot({
  device,
  heightU,
  yPos,
  meshHeight,
  switchMeshHeight,
  isSwitch,
  isSelected,
  isRackSelected,
  showDeviceLabels,
  labelOffsetY,
  onDeviceClick,
  onToggleSelection,
}: RackDeviceSlotProps) {
  const handleClick = createDeviceClickHandler(
    device,
    isSelected,
    onToggleSelection,
    onDeviceClick,
  );
  const isCritical = device.health_status === "critical";
  const palette = getDeviceLabelPalette(isSelected, isCritical, "server");

  return (
    <group
      position={[0.3, yPos, 0.09]}
      onClick={(e) => handleClick(e)}
      {...rackPointerCursorHandlers}
    >
      {isSwitch ? (
        <NetworkSwitch
          heightU={heightU}
          height={switchMeshHeight}
          isSelected={isSelected}
          healthStatus={device.health_status}
          status={device.status}
        />
      ) : (
        <DellServer
          height={meshHeight}
          isSelected={isSelected}
          healthStatus={device.health_status}
          status={device.status}
        />
      )}

      {/* Device hostname label - clickable when rack is selected */}
      {isRackSelected && showDeviceLabels && (
        <Html
          position={[0, labelOffsetY, DEVICE_LABEL_Z]}
          center
          distanceFactor={9}
          zIndexRange={[100, 0]}
        >
          <div style={{ position: "relative", overflow: "visible" }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeviceClick?.(device);
              }}
              aria-label={`View details for ${device.hostname}`}
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
                width: `${LABEL_MAX_WIDTH}px`,
                boxSizing: "border-box",
                textAlign: "center",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                cursor: "pointer",
                border: palette.border,
                transition: "all 0.15s ease",
                boxShadow: palette.boxShadow,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
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
              <span>{device.hostname}</span>
            </button>
            {hasUnavailableTelemetryStream(device) && (
              <span
                title={
                  device.telemetry_probes
                    ? buildAggregateTooltip(device.telemetry_probes)
                    : "Telemetry unavailable"
                }
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              >
                <AlertTriangle
                  size={8}
                  color="rgba(251, 191, 36, 0.75)"
                  strokeWidth={2.25}
                  aria-hidden="true"
                />
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

export default RackDeviceSlot;
