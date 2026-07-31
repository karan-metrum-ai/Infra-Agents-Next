"use client";

/**
 * ServerRack Component
 *
 * Enhanced 3D server rack with:
 * - Multi-U device support (devices spanning multiple slots)
 * - Rack color coding (Row A = cyan, Row B = orange)
 * - Rack selection state with expanded labels
 * - Device selection with visual highlighting
 * - LED status indicators based on health
 * - Hostname labels on selected rack/devices
 * - Animated door that opens when rack is selected
 * - Health status strip on top front edge (soft for ok, lit for issues)
 *
 * Composed from sibling sub-components:
 *   - `useRackLayout` — pure device-placement math (no rendering)
 *   - `RackShell` — the static/animated rack enclosure + status strip
 *   - `RackDeviceSlot` — one server/switch card + hostname label
 *   - `RackCduBay` — the coolant-distribution-unit bay (when present)
 */

import { memo } from "react";
import type { Device3D, Rack3D } from "./types";
import { getCardMeshFactor, isSwitchDevice } from "./rackUtils";
import { RackPSU } from "./RackPSU";
import { RackShell } from "./RackShell";
import { RackDeviceSlot } from "./RackDeviceSlot";
import { RackCduBay } from "./RackCduBay";
import { useRackLayout } from "./useRackLayout";

export type { Device3D, Rack3D };

export interface AgentActivityInfo {
  deviceName: string;
  bmcIp: string;
  agentName: string | null;
  query: string | null;
  status: string | null;
}

interface ServerRackProps {
  rack: Rack3D;
  selectedDeviceIds: Set<string>;
  selectedRackId: string | null;
  showDeviceLabels?: boolean;
  onDeviceClick?: (device: Device3D) => void;
  onToggleSelection?: (deviceId: string, isSelected: boolean) => void;
  onRackClick?: (rackId: string) => void;
  onToggleRackDeviceLabels?: (rackId: string) => void;
}

function ServerRackComponent({
  rack,
  selectedDeviceIds,
  selectedRackId,
  showDeviceLabels = true,
  onDeviceClick,
  onToggleSelection,
  onRackClick,
  onToggleRackDeviceLabels,
}: ServerRackProps) {
  const isRackSelected = selectedRackId === rack.rack_id;

  const {
    rackHealthStatus,
    slotSpacing,
    rackDevices,
    cduDevices,
    hasCdu,
    cduBayHeight,
    rackLiftY,
    deviceWorldYs,
    deviceLabelYOffsets,
  } = useRackLayout(rack);

  return (
    <group
      position={[rack.position[0], rack.position[1] + rackLiftY, rack.position[2]]}
      rotation={rack.rotation || [0, 0, 0]}
    >
      <RackShell
        rackId={rack.rack_id}
        rackName={rack.rack_name}
        hasCdu={hasCdu}
        cduBayHeight={cduBayHeight}
        rackHealthStatus={rackHealthStatus}
        isRackSelected={isRackSelected}
        showDeviceLabels={showDeviceLabels}
        onRackClick={onRackClick}
        onToggleRackDeviceLabels={onToggleRackDeviceLabels}
      />

      {/* Server slots */}
      {rackDevices.map((device) => {
        const heightU = Math.max(1, Math.floor(device.height_u || 1));
        const isSwitch = isSwitchDevice(device);
        const yPos = deviceWorldYs.get(device.device_id) ?? 0;
        const meshHeight = slotSpacing * heightU * getCardMeshFactor(heightU);
        const switchMeshHeight = meshHeight * 0.86;
        const isSelected = selectedDeviceIds.has(device.device_id);
        const labelOffsetY = deviceLabelYOffsets.get(device.device_id) ?? 0;

        return (
          <RackDeviceSlot
            key={device.device_id}
            device={device}
            heightU={heightU}
            yPos={yPos}
            meshHeight={meshHeight}
            switchMeshHeight={switchMeshHeight}
            isSwitch={isSwitch}
            isSelected={isSelected}
            isRackSelected={isRackSelected}
            showDeviceLabels={showDeviceLabels}
            labelOffsetY={labelOffsetY}
            onDeviceClick={onDeviceClick}
            onToggleSelection={onToggleSelection}
          />
        );
      })}

      {/* PDU unit at the bottom of the internal rack space */}
      <group position={[0.3, -0.92, 0.12]}>
        <RackPSU isPoweredOn outletCount={4} />
      </group>

      {/* === CDU BAY (only when CDU data present in API) === */}
      {hasCdu && (
        <RackCduBay
          cduDevices={cduDevices}
          selectedDeviceIds={selectedDeviceIds}
          isRackSelected={isRackSelected}
          showDeviceLabels={showDeviceLabels}
          onDeviceClick={onDeviceClick}
          onToggleSelection={onToggleSelection}
        />
      )}
    </group>
  );
}

/**
 * Memoized (Phase 15): a digital twin scene can have dozens of these, one
 * per rack. Without `memo`, every rack re-renders whenever any parent
 * state changes (camera move, selection elsewhere in the scene, an
 * unrelated rack's telemetry update) instead of only the racks actually
 * affected. Full identity-stability for unchanged racks upstream (in
 * `layoutRacksTo3D`/`useDigitalTwinTelemetry`) is a separate, larger
 * follow-up not undertaken in this pass — see `CLAUDE.md`'s Phase 15 notes.
 */
export const ServerRack = memo(ServerRackComponent);

export default ServerRack;
