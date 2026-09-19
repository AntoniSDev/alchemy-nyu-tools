import { describe, expect, it } from "vitest";
import {
  defaultUpgradeLevels,
  upgradeDefinitions,
} from "../../src/data/upgrades";
import { prototypeDataset, externalItemIds } from "../../src/data/prototype";
import { heatingDataset } from "../../src/data/heating";
import {
  getConveyorCapacity,
  getFactorySpeedMultiplier,
  getFuelEfficiencyMultiplier,
} from "../../src/engine/upgrades/calculateUpgrades";
import { calculateProduction } from "../../src/engine/production/calculateProduction";
import {
  calculateHeating,
  createManualHeatingLoad,
} from "../../src/engine/heating/calculateHeating";
import { checkTransport } from "../../src/engine/transport/checkTransport";

const production = (factoryEfficiency: number) =>
  calculateProduction(prototypeDataset, {
    target: { itemId: "item.quicklime_powder", ratePerMinute: 20 },
    externalItemIds,
    upgrades: { ...defaultUpgradeLevels, factoryEfficiency },
  });

describe("PROTO-003 reference cases", () => {
  it.each([
    [0, 60],
    [1, 75],
    [4, 120],
    [12, 240],
    [13, 243],
    [20, 264],
  ])("U1 logistics level %s gives %s items/min", (level, capacity) => {
    expect(getConveyorCapacity(level)).toBeCloseTo(capacity, 10);
  });
  it.each([
    [0, 1],
    [1, 1.25],
    [4, 2],
    [12, 4],
    [13, 4.05],
    [20, 4.4],
  ])("U2 factory level %s gives multiplier %s", (level, multiplier) => {
    expect(getFactorySpeedMultiplier(level)).toBeCloseTo(multiplier, 10);
  });
  it.each([
    [0, 1],
    [1, 1.1],
    [5, 1.5],
    [10, 2],
  ])("fuel level %s gives multiplier %s", (level, multiplier) => {
    expect(getFuelEfficiencyMultiplier(level)).toBeCloseTo(multiplier, 10);
  });
  it("U3 reduces both machine fleets at factory level 4 without changing material flows", () => {
    const accelerated = production(4);
    expect(accelerated.machines).toHaveLength(2);
    for (const machine of accelerated.machines) {
      expect(machine.theoreticalCount).toBeCloseTo(1.5, 10);
      expect(machine.constructedCount).toBe(2);
      expect(machine.utilization).toBeCloseTo(0.75, 10);
    }
    expect(accelerated.flows).toEqual(production(0).flows);
    expect(accelerated.externalInputs).toEqual(production(0).externalInputs);
    expect(accelerated.upgrades.factoryEfficiency).toBe(4);
  });
  it("U4 preserves total productive heat while increasing instantaneous machine heat", () => {
    const load = production(4).heatingLoads[0];
    expect(load.factorySpeedMultiplier).toBeCloseTo(2, 10);
    expect(load.effectiveMachineHeatPerSecond).toBeCloseTo(8, 10);
    expect(load.theoreticalCount).toBeCloseTo(1.5, 10);
    expect(load.productiveHeatPerSecond).toBeCloseTo(12, 10);
  });
  it.each([
    [0, 48, 15],
    [5, 72, 10],
  ])(
    "U5 fuel level %s: effective energy %s, consumption %s",
    (fuelEfficiencyLevel, effective, consumption) => {
      const result = calculateHeating(heatingDataset, {
        loads: production(4).heatingLoads,
        fuelEfficiencyLevel,
        selectedFuelId: "item.charcoal_powder",
        generatorGroups: [
          {
            generatorId: "heating_generator.stone_furnace",
            count: 1,
            assignments: [
              { machineId: "machine.crucible", constructedCount: 2 },
            ],
          },
        ],
      });
      expect(result.totalProductiveHeatPerSecond).toBeCloseTo(12, 10);
      expect(result.effectiveFuelHeatPerItem).toBeCloseTo(effective, 10);
      expect(result.fuelConsumptionPerMinute).toBeCloseTo(consumption, 10);
      expect(result.placementChecks[0].requiredPlacement).toBe(6);
    },
  );
  it.each([
    [0, 60, 2, true],
    [4, 120, 1, false],
  ] as const)(
    "U6 transport at logistics level %s",
    (logisticsEfficiency, capacity, lines, limited) => {
      const direct = checkTransport(
        { itemId: "item.small_wooden_gear", ratePerMinute: 100 },
        getConveyorCapacity(logisticsEfficiency),
      );
      const integrated = calculateProduction(prototypeDataset, {
        target: { itemId: "item.small_wooden_gear", ratePerMinute: 100 },
        externalItemIds,
        upgrades: { ...defaultUpgradeLevels, logisticsEfficiency },
      }).transportChecks[0];
      expect(integrated).toEqual(direct);
      expect(integrated.capacityPerLine).toBe(capacity);
      expect(integrated.theoreticalLines).toBeCloseTo(100 / capacity, 10);
      expect(integrated.requiredLines).toBe(lines);
      expect(integrated.exceedsSingleLine).toBe(limited);
    },
  );
});

describe("upgrade invariants and validation", () => {
  it.each([0, 1, 4, 12, 13, 20, 1000])(
    "keeps heat per item invariant at factory level %s",
    (level) => {
      const result = production(level);
      expect(result.heatingLoads[0].productiveHeatPerSecond).toBeCloseTo(
        12,
        10,
      );
      expect(
        (result.heatingLoads[0].productiveHeatPerSecond * 60) /
          result.target.ratePerMinute,
      ).toBeCloseTo(36, 10);
    },
  );
  it("does not mutate recipes, upgrade data or request levels", () => {
    const dataset = structuredClone(prototypeDataset);
    const upgrades = { ...defaultUpgradeLevels, factoryEfficiency: 4 };
    const before = structuredClone({ dataset, upgrades });
    const result = calculateProduction(dataset, {
      target: { itemId: "item.quicklime_powder", ratePerMinute: 20 },
      externalItemIds,
      upgrades,
    });
    expect({ dataset, upgrades }).toEqual(before);
    upgrades.factoryEfficiency = 12;
    expect(result.upgrades.factoryEfficiency).toBe(4);
  });
  it("keeps level-zero behavior as the default", () => {
    const target = { itemId: "item.quicklime_powder", ratePerMinute: 20 };
    expect(
      calculateProduction(prototypeDataset, { target, externalItemIds }),
    ).toEqual(production(0));
  });
  it("takes tier bonuses from data", () => {
    const dataset = structuredClone(prototypeDataset);
    dataset.upgrades!.factoryEfficiency.bonusPerLevel = 0.5;
    dataset.upgrades!.logisticsEfficiency.bonusPerLevel = 30;
    const result = calculateProduction(dataset, {
      target: { itemId: "item.quicklime_powder", ratePerMinute: 20 },
      externalItemIds,
      upgrades: {
        ...defaultUpgradeLevels,
        factoryEfficiency: 2,
        logisticsEfficiency: 2,
      },
    });
    expect(result.factorySpeedMultiplier).toBe(2);
    expect(result.conveyorCapacityPerMinute).toBe(120);
    expect(result.machines[0].theoreticalCount).toBeCloseTo(1.5, 10);
  });
  it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid levels %s in every formula and Production",
    (level) => {
      for (const formula of [
        getConveyorCapacity,
        getFactorySpeedMultiplier,
        getFuelEfficiencyMultiplier,
      ])
        expect(() => formula(level)).toThrow();
      for (const key of [
        "logisticsEfficiency",
        "factoryEfficiency",
        "fuelEfficiency",
      ] as const) {
        expect(() =>
          calculateProduction(prototypeDataset, {
            target: { itemId: "item.quicklime_powder", ratePerMinute: 20 },
            externalItemIds,
            upgrades: { ...defaultUpgradeLevels, [key]: level },
          }),
        ).toThrow();
      }
    },
  );
  it("rejects overflowing upgrade data", () => {
    expect(() =>
      getFactorySpeedMultiplier(12, {
        ...upgradeDefinitions.factoryEfficiency,
        bonusPerLevel: Number.MAX_VALUE,
      }),
    ).toThrow();
  });
  it("keeps detailed rules unverified", () => {
    expect(
      Object.values(upgradeDefinitions).every(
        (definition) => definition.validation.status === "unverified",
      ),
    ).toBe(true);
  });
  it("applies factory speed once in autonomous Heating", () => {
    const load = createManualHeatingLoad(
      heatingDataset,
      "machine.crucible",
      2,
      1.5,
      4,
    );
    expect(load.utilization).toBeCloseTo(0.75, 10);
    expect(load.productiveHeatPerSecond).toBeCloseTo(12, 10);
    const result = calculateHeating(heatingDataset, {
      loads: [load],
      selectedFuelId: "item.charcoal_powder",
      fuelEfficiencyLevel: 5,
      generatorGroups: [],
    });
    expect(result.fuelConsumptionPerMinute).toBeCloseTo(10, 10);
  });
  it("rejects invalid manual factory level", () => {
    expect(() =>
      createManualHeatingLoad(heatingDataset, "machine.crucible", 2, 1.5, -1),
    ).toThrow();
  });
});
