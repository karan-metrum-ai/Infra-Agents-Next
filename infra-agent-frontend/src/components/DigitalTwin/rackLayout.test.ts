/**
 * Unit tests for strict row-aware rack layout (API fields only).
 */

import { describe, expect, it } from "vitest";
import type { Location, Rack } from "./types";
import {
  collectRowRackGroups,
  groupRacksByRowBand,
  layoutRacksTo3D,
  mergeLayoutWarnings,
} from "./rackLayout";

function makeRack(name: string, locationName: string, cabinetIndex: number | null): Rack {
  return {
    id: name.length,
    name,
    status: "active",
    role: "",
    u_height: 42,
    serial: "",
    site_id: 1,
    location_id: 1,
    location_name: locationName,
    location_path: ["Building", "Floor", locationName],
    tenant: null,
    tenant_id: null,
    tenant_slug: null,
    devices: [],
    device_count: 0,
    total_u_used: 0,
    cabinet_index: cabinetIndex,
  };
}

function makeLocation(
  name: string,
  racks: Rack[],
  rowSortKey: number | null,
  children: Location[] = [],
): Location {
  return {
    id: name.length,
    name,
    status: "active",
    site_id: 1,
    parent_id: null,
    racks,
    devices: [],
    children,
    rack_count: racks.length,
    device_count: 0,
    row_sort_key: rowSortKey,
  };
}

describe("collectRowRackGroups", () => {
  it("emits groups only for locations with racks and row_sort_key", () => {
    const tree: Location[] = [
      makeLocation("Building", [], null, [
        makeLocation("Row-1", [], 1),
        makeLocation(
          "Row-2",
          [makeRack("R2-CAB3-GPU", "Row-2", 3), makeRack("R2-CAB4-GPU", "Row-2", 4)],
          2,
        ),
        makeLocation("Row-3", [makeRack("R3-CAB2-STORAGE", "Row-3", 2)], 3),
      ]),
    ];

    const groups = collectRowRackGroups(tree);
    expect(groups).toHaveLength(2);
    expect(groups[0].rowLabel).toBe("Row-2");
    expect(groups[1].rowLabel).toBe("Row-3");
  });

  it("skips locations missing row_sort_key even when racks exist", () => {
    const tree: Location[] = [makeLocation("Row-2", [makeRack("R2-CAB3-GPU", "Row-2", 3)], null)];

    expect(collectRowRackGroups(tree)).toHaveLength(0);
  });

  it("sorts row groups by row_sort_key", () => {
    const tree: Location[] = [
      makeLocation("Row-3", [makeRack("R3-CAB1-A", "Row-3", 1)], 3),
      makeLocation("Row-1", [makeRack("R1-CAB1-A", "Row-1", 1)], 1),
      makeLocation("Row-2", [makeRack("R2-CAB1-A", "Row-2", 1)], 2),
    ];

    const groups = collectRowRackGroups(tree);
    expect(groups.map((g) => g.rowLabel)).toEqual(["Row-1", "Row-2", "Row-3"]);
  });
});

describe("layoutRacksTo3D", () => {
  it("leaves an X gap when cabinet numbers skip", () => {
    const groups = collectRowRackGroups([
      makeLocation(
        "Row-2",
        [
          makeRack("R2-CAB3-GPU", "Row-2", 3),
          makeRack("R2-CAB4-GPU", "Row-2", 4),
          makeRack("R2-CAB5-GPU", "Row-2", 5),
          makeRack("R2-CAB7-GPU", "Row-2", 7),
          makeRack("R2-CAB8-GPU", "Row-2", 8),
        ],
        2,
      ),
    ]);

    const { racks } = layoutRacksTo3D(groups, {
      xStart: 0,
      xSpacing: 2,
    });

    expect(racks).toHaveLength(5);
    const xPositions = racks.map((rack) => rack.position[0]);
    expect(xPositions).toEqual([0, 2, 4, 8, 10]);
  });

  it("places single-rack rows on separate Z bands", () => {
    const groups = collectRowRackGroups([
      makeLocation("Row-2", [makeRack("R2-CAB3-GPU", "Row-2", 3)], 2),
      makeLocation("Row-3", [makeRack("R3-CAB2-STORAGE", "Row-3", 2)], 3),
    ]);

    const { racks } = layoutRacksTo3D(groups, {
      xStart: 0,
      xSpacing: 2,
      rowSpacing: 4,
    });

    expect(racks).toHaveLength(2);
    expect(racks[0].position[2]).not.toBe(racks[1].position[2]);
    expect(racks[0].row_name).toBe("Row-2");
    expect(racks[1].row_name).toBe("Row-3");
  });

  it("omits racks without cabinet_index instead of sequential placement", () => {
    const groups: ReturnType<typeof collectRowRackGroups> = [
      {
        rowLabel: "Row-2",
        locationPath: ["Row-2"],
        rowSortKey: 2,
        treeOrder: 0,
        racks: [makeRack("R2-CAB3-GPU", "Row-2", 3), makeRack("R2-CAB-MISSING", "Row-2", null)],
      },
    ];

    const { racks, warnings } = layoutRacksTo3D(groups, {});
    expect(racks).toHaveLength(1);
    expect(racks[0].rack_name).toBe("R2-CAB3-GPU");
    expect(warnings.some((w) => w.includes("R2-CAB-MISSING"))).toBe(true);
  });

  it("lays out multi-row lab inventory with cabinet gap at CAB6", () => {
    const tree: Location[] = [
      makeLocation("Building", [], null, [
        makeLocation("Row-1", [], 1),
        makeLocation(
          "Row-2",
          [
            makeRack("R2-CAB3-MI300X", "Row-2", 3),
            makeRack("R2-CAB4-MI300X", "Row-2", 4),
            makeRack("R2-CAB5-MI300X", "Row-2", 5),
            makeRack("R2-CAB7-H200", "Row-2", 7),
            makeRack("R2-CAB8-H200", "Row-2", 8),
          ],
          2,
        ),
        makeLocation("Row-3", [makeRack("R3-CAB2-R760XA", "Row-3", 2)], 3),
      ]),
    ];

    const groups = collectRowRackGroups(tree);
    expect(groups).toHaveLength(2);

    const { racks } = layoutRacksTo3D(groups, {
      xStart: 0,
      xSpacing: 2,
      rowSpacing: 4,
    });

    expect(racks).toHaveLength(6);
    expect(racks.map((rack) => rack.rack_name)).toEqual([
      "R2-CAB3-MI300X",
      "R2-CAB4-MI300X",
      "R2-CAB5-MI300X",
      "R2-CAB7-H200",
      "R2-CAB8-H200",
      "R3-CAB2-R760XA",
    ]);
    expect(racks.map((rack) => rack.position[0])).toEqual([0, 2, 4, 8, 10, 0]);
    expect(racks[0].position[2]).not.toBe(racks[5].position[2]);
    expect(racks.every((rack) => !rack.rack_id.startsWith("placeholder"))).toBe(true);
  });
});

describe("mergeLayoutWarnings", () => {
  it("dedupes local and API warnings", () => {
    const merged = mergeLayoutWarnings(
      ["rack 'A' missing cabinet_index"],
      ["rack 'A' missing cabinet_index", "rack 'B' missing cabinet_index"],
    );
    expect(merged).toHaveLength(2);
  });
});

describe("groupRacksByRowBand", () => {
  it("groups racks by Z position from layout output", () => {
    const groups = collectRowRackGroups([
      makeLocation("Row-2", [makeRack("R2-CAB3-GPU", "Row-2", 3)], 2),
      makeLocation("Row-3", [makeRack("R3-CAB2-STORAGE", "Row-3", 2)], 3),
    ]);
    const { racks } = layoutRacksTo3D(groups, { rowSpacing: 4 });
    const bands = groupRacksByRowBand(racks);
    expect(bands).toHaveLength(2);
    expect(bands[0][0].row_name).toBe("Row-2");
    expect(bands[1][0].row_name).toBe("Row-3");
  });
});
