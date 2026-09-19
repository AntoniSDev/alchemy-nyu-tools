import { describe, expect, it } from "vitest";
import { prototypeDataset, externalItemIds } from "../../src/data/prototype";
import { calculateProduction } from "../../src/engine/production/calculateProduction";

describe("PROTO-001 reference cases", () => {
  it.each([
    {
      name: "A",
      item: "small_wooden_gear",
      rate: 15,
      primary: "processor",
      theoretical: 1,
      constructed: 1,
      grinder: 0.5,
      grinderBuilt: 1,
      external: "plank",
      input: 5,
      intermediate: "large_wooden_gear",
      heat: 0,
    },
    {
      name: "A2",
      item: "small_wooden_gear",
      rate: 30,
      primary: "processor",
      theoretical: 2,
      constructed: 2,
      grinder: 1,
      grinderBuilt: 1,
      external: "plank",
      input: 10,
      intermediate: "large_wooden_gear",
      heat: 0,
    },
    {
      name: "B",
      item: "quicklime_powder",
      rate: 20,
      primary: "crucible",
      theoretical: 3,
      constructed: 3,
      grinder: 3,
      grinderBuilt: 3,
      external: "stone",
      input: 20,
      intermediate: "quicklime",
      heat: 12,
    },
    {
      name: "B2",
      item: "quicklime_powder",
      rate: 10,
      primary: "crucible",
      theoretical: 1.5,
      constructed: 2,
      grinder: 1.5,
      grinderBuilt: 2,
      external: "stone",
      input: 10,
      intermediate: "quicklime",
      heat: 6,
    },
  ])("$name", (reference) => {
    const result = calculateProduction(prototypeDataset, {
      target: {
        itemId: `item.${reference.item}`,
        ratePerMinute: reference.rate,
      },
      externalItemIds,
    });
    expect(result.machines).toHaveLength(2);
    for (const [id, theoretical, built] of [
      [reference.primary, reference.theoretical, reference.constructed],
      ["grinder", reference.grinder, reference.grinderBuilt],
    ] as const) {
      const machine = result.machines.find(
        (entry) => entry.machineId === `machine.${id}`,
      )!;
      expect(machine.theoreticalCount).toBeCloseTo(theoretical, 10);
      expect(machine.constructedCount).toBe(built);
      expect(machine.utilization).toBeCloseTo(theoretical / built, 10);
    }
    expect(result.externalInputs).toHaveLength(1);
    expect(result.externalInputs[0].itemId).toBe(`item.${reference.external}`);
    expect(result.externalInputs[0].ratePerMinute).toBeCloseTo(
      reference.input,
      10,
    );
    expect(
      result.flows.find(
        (flow) => flow.itemId === `item.${reference.intermediate}`,
      )?.ratePerMinute,
    ).toBeCloseTo(reference.input, 10);
    expect(
      result.flows.find((flow) => flow.itemId === `item.${reference.item}`)
        ?.ratePerMinute,
    ).toBeCloseTo(reference.rate, 10);
    expect(result.transportChecks).toHaveLength(3);
    expect(
      result.transportChecks.every(
        (check) => !check.exceedsSingleLine && check.requiredLines === 1,
      ),
    ).toBe(true);
    expect(result.warnings).toEqual([]);
    if (reference.heat) {
      expect(result.heatingLoads).toHaveLength(1);
      expect(result.heatingLoads[0].productiveHeatPerSecond).toBeCloseTo(
        reference.heat,
        10,
      );
      expect(result.heatingLoads[0].constructedCount).toBe(
        reference.constructed,
      );
      expect(result.heatingLoads[0].theoreticalCount).toBeCloseTo(
        reference.theoretical,
        10,
      );
      expect(result.heatingLoads[0].utilization).toBeCloseTo(
        reference.theoretical / reference.constructed,
        10,
      );
    } else expect(result.heatingLoads).toEqual([]);
  });
});
