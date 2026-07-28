/**
 * Integration: live digital-twin API shape → layout pipeline.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectRowRackGroups, layoutRacksTo3D } from "./rackLayout";
import type { Location, Rack } from "./types";

interface ApiRack {
  id: number;
  name: string;
  status: string;
  cabinet_index?: number | null;
  devices?: unknown[];
  device_count?: number;
  total_u_used?: number;
  path?: string[];
}

interface ApiLocation {
  id: number;
  name: string;
  status: string;
  row_sort_key?: number | null;
  racks?: ApiRack[];
  children?: ApiLocation[];
}

function mapRack(apiRack: ApiRack, locationName: string): Rack {
  return {
    id: apiRack.id,
    name: apiRack.name,
    status: apiRack.status,
    role: "",
    u_height: 42,
    serial: "",
    site_id: 1,
    location_id: 1,
    location_name: locationName,
    location_path: [locationName],
    tenant: null,
    tenant_id: null,
    tenant_slug: null,
    devices: [],
    device_count: apiRack.device_count || 0,
    total_u_used: apiRack.total_u_used || 0,
    cabinet_index: apiRack.cabinet_index ?? null,
  };
}

function mapLocation(apiLoc: ApiLocation): Location {
  return {
    id: apiLoc.id,
    name: apiLoc.name,
    status: apiLoc.status,
    site_id: 1,
    parent_id: null,
    racks: (apiLoc.racks || []).map((r) => mapRack(r, apiLoc.name)),
    devices: [],
    children: (apiLoc.children || []).map(mapLocation),
    rack_count: apiLoc.racks?.length || 0,
    device_count: 0,
    row_sort_key: apiLoc.row_sort_key ?? null,
  };
}

function loadLiveFixture(): Location[] {
  const raw = readFileSync("/tmp/digital-twin-live.json", "utf-8");
  const payload = JSON.parse(raw) as {
    regions?: Array<{ sites?: Array<{ locations?: ApiLocation[] }> }>;
  };
  const locations: Location[] = [];
  for (const region of payload.regions || []) {
    for (const site of region.sites || []) {
      locations.push(...(site.locations || []).map(mapLocation));
    }
  }
  return locations;
}

describe("rackLayout live API integration", () => {
  it("lays out all 6 Broadcom racks with cabinet gaps from API metadata", () => {
    const locations = loadLiveFixture();
    const groups = collectRowRackGroups(locations);
    expect(groups.length).toBeGreaterThanOrEqual(2);

    const { racks, warnings } = layoutRacksTo3D(groups, {
      xStart: 0,
      xSpacing: 2,
      rowSpacing: 4,
    });

    expect(warnings).toEqual([]);
    expect(racks).toHaveLength(6);
    expect(racks.map((r) => r.rack_name).sort()).toEqual([
      "R2-CAB3-MI300X",
      "R2-CAB4-MI300X",
      "R2-CAB5-MI300X",
      "R2-CAB7-H200",
      "R2-CAB8-H200",
      "R3-CAB2-R760XA",
    ]);

    const row2 = racks.filter((r) => r.row_name === "Row-2");
    const xRow2 = row2.map((r) => r.position[0]).sort((a, b) => a - b);
    expect(xRow2).toEqual([0, 2, 4, 8, 10]);
  });
});
