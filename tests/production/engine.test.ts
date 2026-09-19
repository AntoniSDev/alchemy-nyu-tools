import { describe, expect, it } from "vitest";
import { prototypeDataset, externalItemIds } from "../../src/data/prototype";
import { calculateProduction } from "../../src/engine/production/calculateProduction";
import { calculateHeatingLoad } from "../../src/engine/heating/calculateHeatingLoad";
import { checkTransport } from "../../src/engine/transport/checkTransport";
import {
  machineCounts,
  outputPerMinute,
  tolerantCeil,
} from "../../src/utils/numbers";
import type { ProductionDataset } from "../../src/types/production";

const calculate = (
  dataset = prototypeDataset,
  ratePerMinute = 15,
  itemId = "item.small_wooden_gear",
) =>
  calculateProduction(dataset, {
    target: { itemId, ratePerMinute },
    externalItemIds,
  });
const changed = (edit: (dataset: ProductionDataset) => void) => {
  const dataset = structuredClone(prototypeDataset);
  edit(dataset);
  return dataset;
};

describe("numeric rules", () => {
  it("rounds floating point noise without losing small positive demand", () => {
    expect(tolerantCeil(3.0000000000000004)).toBe(3);
    expect(tolerantCeil(3.00001)).toBe(4);
    expect(tolerantCeil(1e-12)).toBe(1);
    expect(tolerantCeil(0)).toBe(0);
  });
  it("computes utilization including zero", () => {
    expect(machineCounts(1.5)).toEqual({
      theoreticalCount: 1.5,
      constructedCount: 2,
      utilization: 0.75,
    });
    expect(machineCounts(0).utilization).toBe(0);
    expect(machineCounts(3.0000000000000004).utilization).toBe(1);
  });
  it("converts recipe output to items per minute", () =>
    expect(outputPerMinute(12, 3)).toBeCloseTo(15, 10));
  it("calculates productive heat from theoretical machines", () => {
    const load = calculateHeatingLoad(prototypeDataset.machines[2], {
      machineId: "machine.crucible",
      ...machineCounts(1.5),
    });
    expect(load?.productiveHeatPerSecond).toBeCloseTo(6, 10);
  });
  it("checks conveyor capacity and exact boundaries", () => {
    expect(
      checkTransport({ itemId: "item.stone", ratePerMinute: 60 }, 60)
        .exceedsSingleLine,
    ).toBe(false);
    const check = checkTransport(
      { itemId: "item.stone", ratePerMinute: 90 },
      60,
    );
    expect(check.theoreticalLines).toBeCloseTo(1.5, 10);
    expect(check.requiredLines).toBe(2);
    expect(check.exceedsSingleLine).toBe(true);
  });
});

describe("production validation and traversal", () => {
  it.each([0, -1, NaN, Infinity])(
    "rejects invalid cycle duration %s",
    (value) => {
      expect(() =>
        calculate(
          changed((data) => {
            data.recipes[1].cycleTimeSeconds = value;
          }),
        ),
      ).toThrow();
    },
  );
  it.each([0, -1, NaN, Infinity])(
    "rejects invalid output quantity %s",
    (value) => {
      expect(() =>
        calculate(
          changed((data) => {
            data.recipes[1].outputs[0].quantity = value;
          }),
        ),
      ).toThrow();
    },
  );
  it.each([-1, NaN, Infinity])("rejects invalid target rate %s", (rate) =>
    expect(() => calculate(prototypeDataset, rate)).toThrow(),
  );
  it("rejects an unknown item", () =>
    expect(() => calculate(prototypeDataset, 15, "item.missing")).toThrow(
      "Objet inconnu",
    ));
  it("rejects a missing recipe", () =>
    expect(() =>
      calculate(
        changed((data) => {
          data.recipes = [];
        }),
      ),
    ).toThrow("Recette introuvable"));
  it("rejects an unknown machine", () =>
    expect(() =>
      calculate(
        changed((data) => {
          data.machines = [];
        }),
      ),
    ).toThrow("Machine inconnue"));
  it("detects a recursive cycle", () => {
    expect(() =>
      calculate(
        changed((data) => {
          data.recipes[0].inputs = [
            { itemId: "item.small_wooden_gear", quantity: 1 },
          ];
        }),
      ),
    ).toThrow("Cycle de production");
  });
  it("stops at explicitly external inputs, even when a recipe exists", () => {
    const result = calculateProduction(prototypeDataset, {
      target: { itemId: "item.small_wooden_gear", ratePerMinute: 15 },
      externalItemIds: ["item.large_wooden_gear"],
    });
    expect(result.machines).toHaveLength(1);
    expect(result.externalInputs[0].ratePerMinute).toBeCloseTo(5);
  });
  it("accepts zero demand without NaN utilization", () => {
    const result = calculate(prototypeDataset, 0);
    expect(
      result.machines.every(
        (machine) =>
          machine.constructedCount === 0 && machine.utilization === 0,
      ),
    ).toBe(true);
  });
  it("uses modified dataset values and leaves inputs untouched", () => {
    const dataset = changed((data) => {
      data.recipes[1].cycleTimeSeconds = 24;
    });
    const snapshot = structuredClone(dataset);
    expect(calculate(dataset).machines[0].theoreticalCount).toBeCloseTo(2);
    expect(dataset).toEqual(snapshot);
  });
  it("aggregates shared upstream recipe demands before rounding", () => {
    const dataset = changed((data) => {
      data.recipes[1].inputs.push({
        itemId: "item.large_wooden_gear",
        quantity: 1,
      });
    });
    const result = calculate(dataset);
    expect(
      result.machines.find((machine) => machine.machineId === "machine.grinder")
        ?.constructedCount,
    ).toBe(1);
    expect(result.externalInputs[0].ratePerMinute).toBeCloseTo(10);
  });
  it("reports overloaded flows and skips nontransportable items", () => {
    const result = calculate(
      changed((data) => {
        data.items[0].transportable = false;
      }),
      90,
    );
    expect(result.transportChecks).toHaveLength(2);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].itemId).toBe("item.small_wooden_gear");
  });
  it("rejects arithmetic overflow", () =>
    expect(() =>
      calculate(
        changed((data) => {
          data.recipes[1].inputs[0].quantity = 4;
        }),
        Number.MAX_VALUE,
      ),
    ).toThrow());
  it("rejects unsupported probabilistic recipes explicitly", () =>
    expect(() =>
      calculate(
        changed((data) => {
          data.recipes[1].outputs[0].probability = 0.5;
        }),
      ),
    ).toThrow("probabilistes"));
});
