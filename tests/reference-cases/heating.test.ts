import { describe, expect, it } from "vitest";
import { heatingDataset } from "../../src/data/heating";
import { prototypeDataset, externalItemIds } from "../../src/data/prototype";
import {
  calculateHeating,
  createManualHeatingLoad,
} from "../../src/engine/heating/calculateHeating";
import { calculateProduction } from "../../src/engine/production/calculateProduction";

describe("PROTO-002 heating references", () => {
  it.each([
    {
      name: "H1",
      built: 3,
      active: 3,
      heat: 12,
      level: 0,
      generator: "stone_furnace",
      required: 9,
      available: 9,
      fuel: 15,
      effective: 48,
      overload: false,
    },
    {
      name: "H2",
      built: 2,
      active: 1.5,
      heat: 6,
      level: 0,
      generator: "stone_furnace",
      required: 6,
      available: 9,
      fuel: 7.5,
      effective: 48,
      overload: false,
    },
    {
      name: "H3",
      built: 3,
      active: 3,
      heat: 12,
      level: 2,
      generator: "stone_furnace",
      required: 9,
      available: 9,
      fuel: 12.5,
      effective: 57.6,
      overload: false,
    },
    {
      name: "H4",
      built: 4,
      active: 4,
      heat: 16,
      level: 0,
      generator: "stone_furnace",
      required: 12,
      available: 9,
      fuel: 20,
      effective: 48,
      overload: true,
    },
    {
      name: "H5",
      built: 14,
      active: 14,
      heat: 56,
      level: 0,
      generator: "blast_furnace",
      required: 42,
      available: 42,
      fuel: 70,
      effective: 48,
      overload: false,
    },
    {
      name: "H5 overload",
      built: 15,
      active: 15,
      heat: 60,
      level: 0,
      generator: "blast_furnace",
      required: 45,
      available: 42,
      fuel: 75,
      effective: 48,
      overload: true,
    },
  ])("$name", (reference) => {
    const load = createManualHeatingLoad(
      heatingDataset,
      "machine.crucible",
      reference.built,
      reference.active,
    );
    const result = calculateHeating(heatingDataset, {
      loads: [load],
      selectedFuelId: "item.charcoal_powder",
      fuelEfficiencyLevel: reference.level,
      generatorGroups: [
        {
          generatorId: `heating_generator.${reference.generator}`,
          count: 1,
          assignments: [
            {
              machineId: load.machineId,
              constructedCount: load.constructedCount,
            },
          ],
        },
      ],
    });
    expect(result.totalProductiveHeatPerSecond).toBeCloseTo(reference.heat, 10);
    expect(result.effectiveFuelHeatPerItem).toBeCloseTo(
      reference.effective,
      10,
    );
    expect(result.fuelConsumptionPerMinute).toBeCloseTo(reference.fuel, 10);
    expect(result.placementChecks[0]).toMatchObject({
      requiredPlacement: reference.required,
      availablePlacement: reference.available,
      remainingPlacement: reference.available - reference.required,
      isOverCapacity: reference.overload,
    });
    expect(result.isConfigurationValid).toBe(!reference.overload);
    expect(result.warnings.map((warning) => warning.code)).toEqual(
      reference.overload ? ["CAPACITE_CHAUFFAGE_INSUFFISANTE"] : [],
    );
  });

  it.each([
    { rate: 20, heat: 12, placement: 9, fuel: 15 },
    { rate: 10, heat: 6, placement: 6, fuel: 7.5 },
  ])("preserves Production B/B2 at $rate per minute", (reference) => {
    const production = calculateProduction(prototypeDataset, {
      target: {
        itemId: "item.quicklime_powder",
        ratePerMinute: reference.rate,
      },
      externalItemIds,
    });
    const snapshot = structuredClone(production);
    const result = calculateHeating(heatingDataset, {
      loads: production.heatingLoads,
      selectedFuelId: "item.charcoal_powder",
      fuelEfficiencyLevel: 0,
      generatorGroups: [
        {
          generatorId: "heating_generator.stone_furnace",
          count: 1,
          assignments: production.heatingLoads.map((load) => ({
            machineId: load.machineId,
            constructedCount: load.constructedCount,
          })),
        },
      ],
    });
    expect(result.totalProductiveHeatPerSecond).toBeCloseTo(reference.heat, 10);
    expect(result.placementChecks[0].requiredPlacement).toBe(
      reference.placement,
    );
    expect(result.fuelConsumptionPerMinute).toBeCloseTo(reference.fuel, 10);
    expect(production).toEqual(snapshot);
  });
});
