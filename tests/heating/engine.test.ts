import { describe, expect, it } from "vitest";
import { heatingDataset } from "../../src/data/heating";
import {
  calculateHeating,
  createManualHeatingLoad,
} from "../../src/engine/heating/calculateHeating";
import type { HeatingRequest } from "../../src/types/heating";

function request(): HeatingRequest {
  return {
    loads: [
      createManualHeatingLoad(heatingDataset, "machine.crucible", 2, 1.5),
    ],
    selectedFuelId: "item.charcoal_powder",
    fuelEfficiencyLevel: 0,
    generatorGroups: [
      {
        generatorId: "heating_generator.stone_furnace",
        count: 1,
        assignments: [{ machineId: "machine.crucible", constructedCount: 2 }],
      },
    ],
  };
}

describe("heating validation and assignments", () => {
  it("leaves request and dataset unchanged", () => {
    const input = request();
    const dataset = structuredClone(heatingDataset);
    const before = structuredClone({ input, dataset });
    calculateHeating(dataset, input);
    expect({ input, dataset }).toEqual(before);
  });
  it("supports an empty configuration and zero consumption", () => {
    const input = request();
    input.loads = [];
    input.generatorGroups = [];
    expect(calculateHeating(heatingDataset, input)).toMatchObject({
      totalProductiveHeatPerSecond: 0,
      fuelConsumptionPerMinute: 0,
      isConfigurationValid: true,
    });
  });
  it("uses physical space for idle devices without fuel consumption", () => {
    const input = request();
    input.loads = [
      createManualHeatingLoad(heatingDataset, "machine.crucible", 2, 0),
    ];
    const result = calculateHeating(heatingDataset, input);
    expect(result.fuelConsumptionPerMinute).toBe(0);
    expect(result.placementChecks[0].requiredPlacement).toBe(6);
  });
  it("reports missing assignments without dropping productive heat", () => {
    const input = request();
    input.generatorGroups = [];
    const result = calculateHeating(heatingDataset, input);
    expect(result.isConfigurationValid).toBe(false);
    expect(result.totalProductiveHeatPerSecond).toBe(6);
    expect(result.warnings[0].code).toBe("UNASSIGNED_HEATING_LOAD");
  });
  it("reports partially assigned devices", () => {
    const input = request();
    input.generatorGroups[0].assignments[0].constructedCount = 1;
    expect(calculateHeating(heatingDataset, input).warnings[0].code).toBe(
      "UNASSIGNED_HEATING_LOAD",
    );
  });
  it("supports split assignments and mixed generators without doubling heat", () => {
    const input = request();
    input.generatorGroups[0].assignments[0].constructedCount = 1;
    input.generatorGroups.push({
      generatorId: "heating_generator.blast_furnace",
      count: 1,
      assignments: [{ machineId: "machine.crucible", constructedCount: 1 }],
    });
    const result = calculateHeating(heatingDataset, input);
    expect(result.isConfigurationValid).toBe(true);
    expect(result.fuelConsumptionPerMinute).toBeCloseTo(7.5);
    expect(
      result.placementChecks.map((check) => check.requiredPlacement),
    ).toEqual([3, 3]);
  });
  it("refuses double assignment across groups", () => {
    const input = request();
    input.generatorGroups.push(structuredClone(input.generatorGroups[0]));
    expect(() => calculateHeating(heatingDataset, input)).toThrow(
      "Trop d’appareils",
    );
  });
  it("refuses double assignment inside a group", () => {
    const input = request();
    input.generatorGroups[0].assignments.push({
      machineId: "machine.crucible",
      constructedCount: 2,
    });
    expect(() => calculateHeating(heatingDataset, input)).toThrow(
      "Trop d’appareils",
    );
  });
  it("reports zero generator capacity with assigned devices", () => {
    const input = request();
    input.generatorGroups[0].count = 0;
    expect(calculateHeating(heatingDataset, input).warnings[0].code).toBe(
      "CAPACITE_CHAUFFAGE_INSUFFISANTE",
    );
  });
  it("scales available placement by generator count", () => {
    const input = request();
    input.generatorGroups[0].count = 2;
    expect(
      calculateHeating(heatingDataset, input).placementChecks[0]
        .availablePlacement,
    ).toBe(18);
  });
  it.each([-1, 0.5, NaN, Infinity])(
    "rejects invalid integer inputs: %s",
    (value) => {
      for (const edit of [
        (input: HeatingRequest) => {
          input.generatorGroups[0].count = value;
        },
        (input: HeatingRequest) => {
          input.generatorGroups[0].assignments[0].constructedCount = value;
        },
        (input: HeatingRequest) => {
          input.loads[0].constructedCount = value;
        },
        (input: HeatingRequest) => {
          input.fuelEfficiencyLevel = value;
        },
      ]) {
        const input = request();
        edit(input);
        expect(() => calculateHeating(heatingDataset, input)).toThrow();
      }
    },
  );
  it.each([-1, NaN, Infinity])(
    "rejects invalid productive heat: %s",
    (value) => {
      const input = request();
      input.loads[0].productiveHeatPerSecond = value;
      expect(() => calculateHeating(heatingDataset, input)).toThrow();
    },
  );
  it("rejects incompatible active equivalents and utilization", () => {
    const input = request();
    input.loads[0].theoreticalCount = 3;
    expect(() => calculateHeating(heatingDataset, input)).toThrow(
      "incohérente",
    );
    input.loads[0].theoreticalCount = 1.5;
    input.loads[0].utilization = 1;
    expect(() => calculateHeating(heatingDataset, input)).toThrow(
      "incohérente",
    );
  });
  it("rejects duplicated loads", () => {
    const input = request();
    input.loads.push({ ...input.loads[0] });
    expect(() => calculateHeating(heatingDataset, input)).toThrow(
      "plusieurs fois",
    );
  });
  it("rejects unknown references", () => {
    for (const edit of [
      (input: HeatingRequest) => {
        input.selectedFuelId = "unknown";
      },
      (input: HeatingRequest) => {
        input.generatorGroups[0].generatorId = "unknown";
      },
      (input: HeatingRequest) => {
        input.generatorGroups[0].assignments[0].machineId = "unknown";
      },
      (input: HeatingRequest) => {
        input.loads[0].machineId = "unknown";
      },
    ]) {
      const input = request();
      edit(input);
      expect(() => calculateHeating(heatingDataset, input)).toThrow();
    }
  });
  it.each([0, -1, NaN, Infinity])(
    "rejects invalid fuel energy: %s",
    (value) => {
      const dataset = structuredClone(heatingDataset);
      dataset.fuels[1].baseHeatPerItem = value;
      expect(() => calculateHeating(dataset, request())).toThrow();
    },
  );
  it("rejects unknown placement data", () => {
    const dataset = structuredClone(heatingDataset);
    dataset.machines[2].heating!.placementUnits = null;
    expect(() => calculateHeating(dataset, request())).toThrow("inconnues");
  });
  it("rejects obsolete generator self-consumption", () => {
    const dataset = structuredClone(heatingDataset);
    dataset.generators[0].baseHeatPerSecond = 1;
    expect(() => calculateHeating(dataset, request())).toThrow("règle 1.0");
  });
  it("rejects overflow rather than returning Infinity", () => {
    const input = request();
    input.loads[0].productiveHeatPerSecond = Number.MAX_VALUE;
    expect(() => calculateHeating(heatingDataset, input)).toThrow();
  });
  it("accepts high efficiency levels without a game-specific ceiling", () => {
    const input = request();
    input.fuelEfficiencyLevel = 1000;
    expect(
      calculateHeating(heatingDataset, input).fuelEfficiencyMultiplier,
    ).toBeCloseTo(101);
  });
  it("uses the efficiency bonus from the dataset", () => {
    const dataset = structuredClone(heatingDataset);
    dataset.efficiency.bonusPerLevel = 0.2;
    const input = request();
    input.fuelEfficiencyLevel = 1;
    expect(
      calculateHeating(dataset, input).effectiveFuelHeatPerItem,
    ).toBeCloseTo(57.6);
  });
  it("validates manual loads and computes partial utilization", () => {
    expect(
      createManualHeatingLoad(heatingDataset, "machine.crucible", 2, 1.5),
    ).toMatchObject({ utilization: 0.75, productiveHeatPerSecond: 6 });
    expect(() =>
      createManualHeatingLoad(heatingDataset, "machine.crucible", 2, 3),
    ).toThrow();
    expect(() =>
      createManualHeatingLoad(heatingDataset, "machine.crucible", 2.5, 1),
    ).toThrow();
    expect(() =>
      createManualHeatingLoad(heatingDataset, "machine.crucible", 2, NaN),
    ).toThrow();
  });
  it("keeps candidate rules unverified and lists all eight fuels", () => {
    expect(heatingDataset.efficiency.validation.status).toBe("unverified");
    expect(
      heatingDataset.generators.every(
        (generator) =>
          generator.placementValidation.status === "unverified" &&
          generator.baseHeatPerSecond === 0,
      ),
    ).toBe(true);
    expect(heatingDataset.fuels.map((fuel) => fuel.baseHeatPerItem)).toEqual([
      40, 48, 540, 600, 660, 6000, 24000, 320000,
    ]);
  });
});
