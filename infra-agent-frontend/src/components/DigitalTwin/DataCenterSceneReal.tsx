"use client";

/**
 * Note: the Vite source redeclares its own local `Device3D`/`Rack3D`/
 * `DeviceData` interfaces here instead of importing the canonical ones from
 * `types.ts`. Field-by-field they're a strict subset (this component never
 * reads `height_u`/`is_full_depth`/telemetry fields), so importing the
 * canonical types from `./types` instead keeps this component's props
 * compatible with what `rackLayout.ts`/`rackUtils.ts` actually produce,
 * without duplicating (and risking diverging from) the shared shape.
 */

import { useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import type { Device3D, DeviceData, Rack3D } from "./types";

interface DataCenterSceneRealProps {
  racks: Rack3D[];
  selectedDeviceIds: Set<string>;
  onDeviceClick?: (deviceData: DeviceData) => void;
  onToggleSelection?: (deviceId: string, isSelected: boolean) => void;
}

export default function DataCenterSceneReal({
  racks,
  selectedDeviceIds,
  onDeviceClick,
  onToggleSelection,
}: DataCenterSceneRealProps) {
  // Shared geometries and materials
  const materials = useMemo(
    () => ({
      floor: new THREE.MeshStandardMaterial({ color: "#2a2a2a" }),
      wall: new THREE.MeshStandardMaterial({
        color: "#f0f0f0",
        transparent: true,
        opacity: 0.3,
      }),
      rackFrame: new THREE.MeshStandardMaterial({ color: "#444" }),
      rackBack: new THREE.MeshStandardMaterial({ color: "#333" }),
      rail: new THREE.MeshStandardMaterial({ color: "#777" }),
      serverChassis: new THREE.MeshStandardMaterial({ color: "#2a2a2a" }),
      serverChassisSelected: new THREE.MeshStandardMaterial({
        color: "#00ff88",
        emissive: "#00ff88",
        emissiveIntensity: 0.3,
      }),
      serverBezel: new THREE.MeshStandardMaterial({ color: "#1a1a1a" }),
      handle: new THREE.MeshStandardMaterial({ color: "#666" }),
      greenLED: new THREE.MeshStandardMaterial({
        color: "#0f0",
        emissive: "#0f0",
        emissiveIntensity: 1.5,
      }),
      yellowLED: new THREE.MeshStandardMaterial({
        color: "#ff0",
        emissive: "#ff0",
        emissiveIntensity: 1.2,
      }),
      redLED: new THREE.MeshStandardMaterial({
        color: "#f00",
        emissive: "#f00",
        emissiveIntensity: 1.5,
      }),
      offlineLED: new THREE.MeshStandardMaterial({
        color: "#333",
        emissive: "#333",
        emissiveIntensity: 0.1,
      }),
    }),
    [],
  );

  // Get LED material based on device status and health
  const getLEDMaterial = (
    device: Device3D | null | undefined,
    isSelected: boolean,
  ): THREE.Material => {
    if (isSelected) return materials.greenLED;
    if (!device) return materials.offlineLED;

    const health = device.health_status || "unknown";
    if (health === "critical") return materials.redLED;
    if (health === "warning") return materials.yellowLED;
    if (device.status === "online") return materials.greenLED;
    return materials.offlineLED;
  };

  // Single server rack component with real devices
  const ServerRack = ({ rack }: { rack: Rack3D }) => {
    const handleDeviceClick = (e: { stopPropagation: () => void }, device: Device3D) => {
      e.stopPropagation();
      const isSelected = selectedDeviceIds.has(device.device_id);

      // Transform Device3D to DeviceData format for the info card
      const deviceData: DeviceData = {
        device_id: device.device_id,
        hostname: device.hostname,
        ip_address: device.ip_address,
        device_type: device.device_type,
        status: device.status,
        manufacturer: device.manufacturer || "Unknown",
        model: device.model || "Unknown",
        firmware_version: device.firmware_version,
        location: `${rack.row_name}`,
        rack_position: device.rack_position,
        power_consumption: device.power_consumption,
        temperature: device.temperature,
        health_status: device.health_status,
        management_interface: device.management_interface,
        protocols_found: device.protocols_found,
        ports_count: device.ports_count,
        // New fields from updated API
        bmc_ip: device.bmc_ip,
        bmc_type: device.bmc_type,
        bmc_username: device.bmc_username,
        accelerators: device.accelerators,
        gpu_count: device.gpu_count,
        cluster_id: device.cluster_id,
        tenant: device.tenant,
        tags: device.tags,
        serial: device.serial,
        asset_tag: device.asset_tag,
        service_tag: device.service_tag,
      };

      if (onToggleSelection) {
        onToggleSelection(device.device_id, !isSelected);
      }
      if (onDeviceClick) {
        onDeviceClick(deviceData);
      }
    };

    const handlePointerOver = (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      document.body.style.cursor = "pointer";
    };

    const handlePointerOut = (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      document.body.style.cursor = "default";
    };

    // Determine rack density and spacing based on reported U height and devices
    const maxDeviceU = rack.devices.reduce((max, d) => Math.max(max, d.u_position || 0), 0);
    const slotCount = Math.max(rack.u_height || 0, maxDeviceU, 20);
    const slotHeight = 1.6 / slotCount;
    const slotDepth = 0.62;
    const chassisHeight = slotHeight * 0.9;
    const bezelThickness = Math.min(0.005, slotHeight * 0.08);
    const startY = -0.8 + slotHeight / 2;

    // Create device map by U position
    const deviceMap = new Map<number, Device3D>();
    rack.devices.forEach((device) => {
      deviceMap.set(device.u_position, device);
    });

    return (
      <group position={rack.position} rotation={rack.rotation || [0, 0, 0]}>
        {/* Removed rack-level click handler - only device clicks now */}

        {/* Rack frame */}
        <mesh castShadow receiveShadow material={materials.rackFrame}>
          <boxGeometry args={[0.02, 1.8, 0.02]} />
        </mesh>
        <mesh position={[0.58, 0, 0]} castShadow receiveShadow material={materials.rackFrame}>
          <boxGeometry args={[0.02, 1.8, 0.02]} />
        </mesh>
        <mesh position={[0.29, 0, -0.43]} receiveShadow material={materials.rackBack}>
          <boxGeometry args={[0.6, 1.8, 0.02]} />
        </mesh>
        <mesh position={[0.29, 0.88, 0]} castShadow material={materials.rackFrame}>
          <boxGeometry args={[0.6, 0.02, 0.9]} />
        </mesh>
        <mesh position={[0.29, -0.88, 0]} castShadow material={materials.rackFrame}>
          <boxGeometry args={[0.6, 0.02, 0.9]} />
        </mesh>

        {/* Mounting rails */}
        <mesh position={[0.05, 0, 0.4]} material={materials.rail}>
          <boxGeometry args={[0.02, 1.6, 0.03]} />
        </mesh>
        <mesh position={[0.53, 0, 0.4]} material={materials.rail}>
          <boxGeometry args={[0.02, 1.6, 0.03]} />
        </mesh>

        {/* Render server slots dynamically based on rack height */}
        {Array.from({ length: slotCount }, (_, j) => {
          const uPosition = j + 1;
          const device = deviceMap.get(uPosition);
          const isSelected = device ? selectedDeviceIds.has(device.device_id) : false;
          const yPos = startY + j * slotHeight;

          return (
            <group key={j} position={[0.29, yPos, 0.15]}>
              {/* SERVER CHASSIS */}
              <mesh
                castShadow
                receiveShadow
                material={isSelected ? materials.serverChassisSelected : materials.serverChassis}
                onClick={device ? (e) => handleDeviceClick(e, device) : undefined}
                onPointerOver={device ? handlePointerOver : undefined}
                onPointerOut={device ? handlePointerOut : undefined}
              >
                <boxGeometry args={[0.48, chassisHeight, slotDepth]} />
              </mesh>

              {/* FRONT BEZEL */}
              <mesh position={[0, 0, slotDepth / 2]} material={materials.serverBezel}>
                <boxGeometry args={[0.5, chassisHeight, bezelThickness]} />
              </mesh>

              {/* LED indicators with real status */}
              <mesh position={[-0.18, 0, 0.315]} material={getLEDMaterial(device, isSelected)}>
                <boxGeometry args={[0.015, 0.015, 0.002]} />
              </mesh>
              <mesh
                position={[-0.15, 0, 0.315]}
                material={device?.status === "online" ? materials.yellowLED : materials.offlineLED}
              >
                <boxGeometry args={[0.015, 0.015, 0.002]} />
              </mesh>

              {/* Server handles */}
              <mesh position={[-0.22, 0, 0.31]} material={materials.handle}>
                <boxGeometry args={[0.02, 0.04, 0.01]} />
              </mesh>
              <mesh position={[0.22, 0, 0.31]} material={materials.handle}>
                <boxGeometry args={[0.02, 0.04, 0.01]} />
              </mesh>

              {/* Device label for real devices */}
              {device && isSelected && (
                <Html
                  position={[0, 0, 0.35]}
                  center
                  zIndexRange={[100, 0]}
                  style={{ pointerEvents: "none" }}
                >
                  <div
                    style={{
                      background: "rgba(0, 255, 136, 0.9)",
                      color: "#000",
                      padding: "2px 6px",
                      borderRadius: "3px",
                      fontSize: "9px",
                      fontWeight: "bold",
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <span>{device.hostname}</span>
                    {device.service_tag && (
                      <span style={{ fontSize: "7px", fontWeight: 400, opacity: 0.8 }}>
                        {device.service_tag}
                      </span>
                    )}
                  </div>
                </Html>
              )}
            </group>
          );
        })}
      </group>
    );
  };

  return (
    <group>
      {/* Floor */}
      <mesh position={[0, -1.2, 0]} receiveShadow material={materials.floor}>
        <boxGeometry args={[10, 0.1, 6]} />
      </mesh>

      {/* Walls */}
      <mesh position={[0, 0.3, -3]} receiveShadow material={materials.wall}>
        <boxGeometry args={[10, 3, 0.1]} />
      </mesh>
      <mesh position={[0, 0.3, 3]} receiveShadow material={materials.wall}>
        <boxGeometry args={[10, 3, 0.1]} />
      </mesh>
      <mesh position={[-5, 0.3, 0]} receiveShadow material={materials.wall}>
        <boxGeometry args={[0.1, 3, 6]} />
      </mesh>
      <mesh position={[5, 0.3, 0]} receiveShadow material={materials.wall}>
        <boxGeometry args={[0.1, 3, 6]} />
      </mesh>
      <mesh position={[0, 1.8, 0]} receiveShadow material={materials.wall}>
        <boxGeometry args={[10, 0.02, 6]} />
      </mesh>

      {/* Ceiling lights */}
      {Array.from({ length: 4 }, (_, i) => (
        <group key={i} position={[-3 + i * 2, 1.7, 0]}>
          <mesh>
            <boxGeometry args={[0.4, 0.03, 0.4]} />
            <meshStandardMaterial color="#fff" />
          </mesh>
          <pointLight intensity={1} distance={5} castShadow={i % 2 === 0} />
        </group>
      ))}

      {/* Render real racks */}
      {racks.map((rack, index) => (
        <ServerRack key={`rack-${rack.rack_id}-${index}`} rack={rack} />
      ))}
    </group>
  );
}

// Helper functions (exported for potential reuse)
export function calculateRackStatus(devices: Device3D[]): "operational" | "warning" | "critical" {
  const criticalCount = devices.filter((d) => d.health_status === "critical").length;
  const warningCount = devices.filter((d) => d.health_status === "warning").length;

  if (criticalCount > 0) return "critical";
  if (warningCount > 0) return "warning";
  return "operational";
}

export function calculateTotalPower(devices: Device3D[]): string {
  const total = devices.reduce((sum, d) => sum + (d.power_consumption || 0), 0);
  return (total / 1000).toFixed(1); // Convert W to kW
}

export function calculateAvgTemperature(devices: Device3D[]): string {
  const temps = devices.filter((d) => d.temperature).map((d) => d.temperature!);
  if (temps.length === 0) return "24.0";
  const avg = temps.reduce((sum, t) => sum + t, 0) / temps.length;
  return avg.toFixed(1);
}
