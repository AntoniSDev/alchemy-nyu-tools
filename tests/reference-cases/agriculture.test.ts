import { describe, expect, it } from "vitest";
import { fertilizers } from "../../src/data/agriculture";
import { prototypeDataset, externalItemIds } from "../../src/data/prototype";
import { defaultUpgradeLevels } from "../../src/data/upgrades";
import {
  calculateNurseryOutputRate,
  calculateFertilizerLoad,
} from "../../src/engine/agriculture/calculateAgriculture";
import { calculateProduction } from "../../src/engine/production/calculateProduction";
import { getFertilizerEfficiencyMultiplier } from "../../src/engine/upgrades/calculateUpgrades";

const basic = fertilizers[0];
const advanced = fertilizers[1];
const target = { itemId: "item.flax_fiber", ratePerMinute: 20 };
const request = { target, externalItemIds, selectedFertilizerId: basic.itemId };

describe("PROTO-004 reference cases", () => {
  it("A1 basic fertilizer produces 30 flax/min per nursery", () => {
    expect(
      calculateNurseryOutputRate(basic, 24, 1, 60).maximumOutputPerMinute,
    ).toBeCloseTo(30, 10);
  });
  it("A2 consumes nutrients according to actual demand", () => {
    const load = calculateFertilizerLoad(basic, 24, 20, 1);
    expect(load.nutrientPerMinute).toBeCloseTo(480, 10);
    expect(load.fertilizerItemsPerMinute).toBeCloseTo(10 / 3, 10);
  });
  it("A3 fractional nursery uses the shared machine rounding rules", () => {
    const load = calculateProduction(prototypeDataset, request).nurseryLoads[0];
    expect(load.theoreticalCount).toBeCloseTo(2 / 3, 10);
    expect(load.constructedCount).toBe(1);
    expect(load.utilization).toBeCloseTo(2 / 3, 10);
  });
  it("A4 advanced fertilizer is limited to 60 by logistics level 0", () => {
    const rate = calculateNurseryOutputRate(advanced, 24, 1, 60);
    expect(rate.factoryAdjustedRatePerMinute).toBeCloseTo(360, 10);
    expect(rate.maximumOutputPerMinute).toBeCloseTo(60, 10);
    expect(rate.isConveyorLimited).toBe(true);
  });
  it("A5 logistics level 4 raises the nursery limit to 120", () => {
    const result = calculateProduction(prototypeDataset, {
      ...request,
      selectedFertilizerId: advanced.itemId,
      upgrades: { ...defaultUpgradeLevels, logisticsEfficiency: 4 },
    });
    expect(result.nurseryLoads[0].maximumOutputPerMinute).toBeCloseTo(120, 10);
  });
  it("A6 factory level 4 doubles basic fertilizer nursery speed", () => {
    const result = calculateProduction(prototypeDataset, {
      ...request,
      upgrades: { ...defaultUpgradeLevels, factoryEfficiency: 4 },
    });
    expect(result.nurseryLoads[0].maximumOutputPerMinute).toBeCloseTo(60, 10);
  });
  it("A7 fertilizer efficiency improves value without changing maximum speed", () => {
    const baseline = calculateProduction(prototypeDataset, {
      ...request,
      target: { ...target, ratePerMinute: 30 },
    });
    const efficient = calculateProduction(prototypeDataset, {
      ...request,
      target: { ...target, ratePerMinute: 30 },
      upgrades: { ...defaultUpgradeLevels, fertilizerEfficiency: 5 },
    });
    expect(baseline.fertilizerLoads[0].nutrientPerMinute).toBe(720);
    expect(baseline.fertilizerLoads[0].fertilizerItemsPerMinute).toBeCloseTo(
      5,
      10,
    );
    expect(efficient.fertilizerLoads[0].effectiveNutrientValue).toBeCloseTo(
      216,
      10,
    );
    expect(efficient.fertilizerLoads[0].fertilizerItemsPerMinute).toBeCloseTo(
      10 / 3,
      10,
    );
    expect(efficient.nurseryLoads).toEqual(baseline.nurseryLoads);
  });
  it("calculates the full nursery → flax → grinder → flax fiber chain", () => {
    const result = calculateProduction(prototypeDataset, request);
    expect(result.machines).toHaveLength(2);
    expect(
      result.machines.find(
        (machine) => machine.machineId === "machine.grinder",
      ),
    ).toMatchObject({
      theoreticalCount: 1,
      constructedCount: 1,
      utilization: 1,
    });
    expect(
      result.flows.find((flow) => flow.itemId === "item.flax")?.ratePerMinute,
    ).toBeCloseTo(20, 10);
    expect(result.externalInputs).toHaveLength(1);
    expect(result.externalInputs[0].itemId).toBe(basic.itemId);
    expect(result.externalInputs[0].ratePerMinute).toBeCloseTo(10 / 3, 10);
    expect(result.heatingLoads).toEqual([]);
    expect(result.transportChecks).toHaveLength(3);
    expect(result.root.inputs[0].inputs[0].recipeId).toBeNull();
  });
});

describe("agriculture invariants and validation", () => {
  it.each([0, 1, 4, 12, 13, 20])(
    "keeps nutrient and fertilizer consumption fixed at factory level %s",
    (factoryEfficiency) => {
      const result = calculateProduction(prototypeDataset, {
        ...request,
        upgrades: { ...defaultUpgradeLevels, factoryEfficiency },
      });
      expect(result.fertilizerLoads[0].nutrientPerMinute).toBeCloseTo(480, 10);
      expect(result.fertilizerLoads[0].fertilizerItemsPerMinute).toBeCloseTo(
        10 / 3,
        10,
      );
      expect(result.machines[0].theoreticalCount).toBeLessThanOrEqual(1);
    },
  );
  it("does not mutate dataset or fertilizer values", () => {
    const dataset = structuredClone(prototypeDataset);
    const before = structuredClone(dataset);
    calculateProduction(dataset, {
      ...request,
      upgrades: {
        ...defaultUpgradeLevels,
        factoryEfficiency: 4,
        fertilizerEfficiency: 5,
      },
    });
    expect(dataset).toEqual(before);
    expect(
      dataset.recipes.find((recipe) => recipe.id === "recipe.flax")
        ?.cycleTimeSeconds,
    ).toBeUndefined();
  });
  it("aggregates shared agricultural inputs before rounding and sums fertilizer loads", () => {
    const dataset = structuredClone(prototypeDataset);
    dataset.recipes
      .find((recipe) => recipe.id === "recipe.flax_fiber")!
      .inputs.push({ itemId: "item.flax", quantity: 1 });
    const result = calculateProduction(dataset, request);
    expect(result.nurseryLoads).toHaveLength(1);
    expect(result.nurseryLoads[0].theoreticalCount).toBeCloseTo(4 / 3, 10);
    expect(result.nurseryLoads[0].constructedCount).toBe(2);
    expect(result.fertilizerLoads).toHaveLength(1);
    expect(result.fertilizerLoads[0].nutrientPerMinute).toBeCloseTo(960, 10);
    expect(result.externalInputs[0].ratePerMinute).toBeCloseTo(20 / 3, 10);
  });
  it.each(fertilizers)("supports fertilizer $itemId", (fertilizer) => {
    const result = calculateProduction(prototypeDataset, {
      ...request,
      selectedFertilizerId: fertilizer.itemId,
    });
    expect(result.fertilizerLoads[0].fertilizerItemsPerMinute).toBeCloseTo(
      480 / fertilizer.nutrientValue,
      10,
    );
    expect(result.externalInputs[0].itemId).toBe(fertilizer.itemId);
  });
  it("handles zero demand without invalid utilization", () => {
    const result = calculateProduction(prototypeDataset, {
      ...request,
      target: { ...target, ratePerMinute: 0 },
    });
    expect(result.nurseryLoads[0].constructedCount).toBe(0);
    expect(result.nurseryLoads[0].utilization).toBe(0);
    expect(result.fertilizerLoads[0].fertilizerItemsPerMinute).toBe(0);
  });
  it("includes external fertilizer in conveyor checks", () => {
    const result = calculateProduction(prototypeDataset, {
      ...request,
      target: { ...target, ratePerMinute: 600 },
    });
    expect(
      result.transportChecks.find((flow) => flow.itemId === basic.itemId),
    ).toMatchObject({
      ratePerMinute: 100,
      requiredLines: 2,
      exceedsSingleLine: true,
    });
  });
  it("never recursively produces the selected fertilizer", () => {
    const dataset = structuredClone(prototypeDataset);
    dataset.recipes.push({
      id: "recipe.external_fertilizer",
      machineId: "machine.grinder",
      inputs: [{ itemId: "item.flax", quantity: 1 }],
      outputs: [{ itemId: basic.itemId, quantity: 1 }],
      cycleTimeSeconds: 3,
    });
    expect(calculateProduction(dataset, request).machines).toHaveLength(2);
  });
  it.each([0, -1, NaN, Infinity])(
    "rejects invalid nutrient data %s",
    (value) => {
      expect(() => calculateNurseryOutputRate(basic, value, 1, 60)).toThrow();
      for (const key of [
        "nutrientValue",
        "maxNutrientRatePerSecond",
      ] as const) {
        expect(() =>
          calculateNurseryOutputRate({ ...basic, [key]: value }, 24, 1, 60),
        ).toThrow();
        expect(() =>
          calculateFertilizerLoad({ ...basic, [key]: value }, 24, 20, 1),
        ).toThrow();
      }
      const dataset = structuredClone(prototypeDataset);
      dataset.recipes.find(
        (recipe) => recipe.id === "recipe.flax",
      )!.nutrientCostPerOutput = value;
      expect(() => calculateProduction(dataset, request)).toThrow();
    },
  );
  it.each([-1, 0.5, NaN, Infinity])(
    "rejects invalid fertilizer efficiency %s",
    (fertilizerEfficiency) => {
      expect(() =>
        getFertilizerEfficiencyMultiplier(fertilizerEfficiency),
      ).toThrow();
      expect(() =>
        calculateProduction(prototypeDataset, {
          ...request,
          upgrades: { ...defaultUpgradeLevels, fertilizerEfficiency },
        }),
      ).toThrow();
    },
  );
  it("rejects an unknown or absent fertilizer", () => {
    expect(() =>
      calculateProduction(prototypeDataset, {
        ...request,
        selectedFertilizerId: "unknown",
      }),
    ).toThrow("Engrais inconnu");
    expect(() =>
      calculateProduction(prototypeDataset, { target, externalItemIds }),
    ).toThrow("Engrais inconnu");
  });
  it("rejects ambiguous fixed-cycle agricultural recipes", () => {
    const dataset = structuredClone(prototypeDataset);
    dataset.recipes.find(
      (recipe) => recipe.id === "recipe.flax",
    )!.cycleTimeSeconds = 1;
    expect(() => calculateProduction(dataset, request)).toThrow("cycle fixe");
  });
  it("rejects numeric overflow", () => {
    expect(() =>
      calculateNurseryOutputRate(basic, Number.MIN_VALUE, 1, 60),
    ).toThrow();
    expect(() =>
      calculateFertilizerLoad(basic, 24, Number.MAX_VALUE, 1),
    ).toThrow();
  });
});
