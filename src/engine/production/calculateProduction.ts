import type {
  ProductionDataset,
  ProductionRequest,
  ProductionResult,
  ProductionNode,
  ItemFlow,
} from "../../types/production";
import {
  machineCounts,
  outputPerMinute,
  requireNonNegative,
  requirePositive,
} from "../../utils/numbers";
import { calculateHeatingLoad } from "../heating/calculateHeatingLoad";
import { checkTransport } from "../transport/checkTransport";
import { defaultUpgradeLevels, upgradeDefinitions } from "../../data/upgrades";
import {
  getConveyorCapacity,
  getFactorySpeedMultiplier,
  validateUpgradeLevels,
  getFertilizerEfficiencyMultiplier,
} from "../upgrades/calculateUpgrades";
import {
  calculateFertilizerLoad,
  calculateNurseryOutputRate,
} from "../agriculture/calculateAgriculture";
import type { FertilizerLoad, NurseryLoad } from "../../types/agriculture";

export function calculateProduction(
  dataset: ProductionDataset,
  request: ProductionRequest,
): ProductionResult {
  const upgrades = validateUpgradeLevels(
    request.upgrades ?? defaultUpgradeLevels,
  );
  const definitions = dataset.upgrades ?? upgradeDefinitions;
  const factorySpeedMultiplier = getFactorySpeedMultiplier(
    upgrades.factoryEfficiency,
    definitions.factoryEfficiency,
  );
  const conveyorCapacityPerMinute = getConveyorCapacity(
    upgrades.logisticsEfficiency,
    {
      ...definitions.logisticsEfficiency,
      baseValue: dataset.conveyorCapacityPerMinute,
    },
  );
  const items = new Map(dataset.items.map((item) => [item.id, item]));
  const machines = new Map(
    dataset.machines.map((machine) => [machine.id, machine]),
  );
  const externalIds = new Set(request.externalItemIds);
  const flowRates = new Map<string, number>();
  const externalRates = new Map<string, number>();
  // Keep counts per recipe: distinct recipes cannot share the same installed machine simultaneously.
  const recipeCounts = new Map<string, { machineId: string; count: number }>();
  const fertilizerLoads = new Map<string, FertilizerLoad>();
  const nurseryLoads = new Map<string, NurseryLoad>();
  requireNonNegative(request.target.ratePerMinute, "La quantité demandée");
  requirePositive(
    dataset.conveyorCapacityPerMinute,
    "La capacité du convoyeur",
  );
  for (const id of externalIds)
    if (!items.has(id)) throw new Error(`Objet externe inconnu : ${id}.`);

  function add(rates: Map<string, number>, id: string, rate: number) {
    rates.set(
      id,
      requireNonNegative((rates.get(id) ?? 0) + rate, "Le débit cumulé"),
    );
  }
  function visit(
    itemId: string,
    ratePerMinute: number,
    path: Set<string>,
  ): ProductionNode {
    if (!items.has(itemId)) throw new Error(`Objet inconnu : ${itemId}.`);
    requireNonNegative(ratePerMinute, "Le débit");
    add(flowRates, itemId, ratePerMinute);
    if (externalIds.has(itemId)) {
      add(externalRates, itemId, ratePerMinute);
      return { itemId, ratePerMinute, recipeId: null, inputs: [] };
    }
    if (path.has(itemId))
      throw new Error(`Cycle de production détecté : ${itemId}.`);
    const recipes = dataset.recipes.filter((recipe) =>
      recipe.outputs.some((output) => output.itemId === itemId),
    );
    if (recipes.length === 0)
      throw new Error(`Recette introuvable : ${itemId}.`);
    if (recipes.length > 1)
      throw new Error(`Plusieurs recettes possibles : ${itemId}.`);
    const recipe = recipes[0];
    if (!machines.has(recipe.machineId))
      throw new Error(`Machine inconnue : ${recipe.machineId}.`);
    if (recipe.outputs.length !== 1)
      throw new Error(
        "Les recettes à plusieurs sorties ne sont pas prises en charge.",
      );
    for (const component of [...recipe.inputs, ...recipe.outputs]) {
      if (!items.has(component.itemId))
        throw new Error(`Objet inconnu : ${component.itemId}.`);
      requirePositive(component.quantity, "La quantité de recette");
      if (component.probability !== undefined && component.probability !== 1)
        throw new Error(
          "Les recettes probabilistes ne sont pas prises en charge.",
        );
    }
    const output = recipe.outputs[0];
    let maximumOutputPerMinute: number;
    let fertilizerNode: ProductionNode | null = null;
    if (recipe.nutrientCostPerOutput !== undefined) {
      if (recipe.cycleTimeSeconds !== undefined)
        throw new Error(
          "Une recette agricole ne doit pas définir de cycle fixe.",
        );
      const fertilizer = dataset.fertilizers?.find(
        (entry) => entry.itemId === request.selectedFertilizerId,
      );
      if (!fertilizer) throw new Error("Engrais inconnu ou non sélectionné.");
      if (!items.has(fertilizer.itemId))
        throw new Error("L’objet correspondant à l’engrais est inconnu.");
      const rates = calculateNurseryOutputRate(
        fertilizer,
        recipe.nutrientCostPerOutput,
        factorySpeedMultiplier,
        conveyorCapacityPerMinute,
      );
      maximumOutputPerMinute = rates.maximumOutputPerMinute;
      const load = calculateFertilizerLoad(
        fertilizer,
        recipe.nutrientCostPerOutput,
        ratePerMinute,
        getFertilizerEfficiencyMultiplier(
          upgrades.fertilizerEfficiency,
          definitions.fertilizerEfficiency,
        ),
      );
      const priorLoad = fertilizerLoads.get(fertilizer.itemId);
      fertilizerLoads.set(fertilizer.itemId, {
        ...load,
        nutrientPerMinute: requireNonNegative(
          (priorLoad?.nutrientPerMinute ?? 0) + load.nutrientPerMinute,
          "Le besoin nutritif cumulé",
        ),
        fertilizerItemsPerMinute: requireNonNegative(
          (priorLoad?.fertilizerItemsPerMinute ?? 0) +
            load.fertilizerItemsPerMinute,
          "La consommation d’engrais cumulée",
        ),
      });
      add(externalRates, fertilizer.itemId, load.fertilizerItemsPerMinute);
      add(flowRates, fertilizer.itemId, load.fertilizerItemsPerMinute);
      fertilizerNode = {
        itemId: fertilizer.itemId,
        ratePerMinute: load.fertilizerItemsPerMinute,
        recipeId: null,
        inputs: [],
      };
      const outputRatePerMinute = requireNonNegative(
        (nurseryLoads.get(recipe.id)?.outputRatePerMinute ?? 0) + ratePerMinute,
        "La production agricole cumulée",
      );
      nurseryLoads.set(recipe.id, {
        recipeId: recipe.id,
        machineId: recipe.machineId,
        itemId,
        fertilizerItemId: fertilizer.itemId,
        outputRatePerMinute,
        ...rates,
        ...machineCounts(outputRatePerMinute / maximumOutputPerMinute),
      });
    } else {
      maximumOutputPerMinute = outputPerMinute(
        (recipe.cycleTimeSeconds ?? NaN) / factorySpeedMultiplier,
        output.quantity,
      );
    }
    const count = ratePerMinute / maximumOutputPerMinute;
    const previous = recipeCounts.get(recipe.id)?.count ?? 0;
    recipeCounts.set(recipe.id, {
      machineId: recipe.machineId,
      count: requireNonNegative(previous + count, "Le nombre de machines"),
    });
    const nextPath = new Set(path).add(itemId);
    const inputs = recipe.inputs.map((input) =>
      visit(
        input.itemId,
        (ratePerMinute / output.quantity) * input.quantity,
        nextPath,
      ),
    );
    if (fertilizerNode) inputs.push(fertilizerNode);
    return { itemId, ratePerMinute, recipeId: recipe.id, inputs };
  }

  const root = visit(
    request.target.itemId,
    request.target.ratePerMinute,
    new Set(),
  );
  const machineTotals = new Map<
    string,
    { theoreticalCount: number; constructedCount: number }
  >();
  for (const { machineId, count } of recipeCounts.values()) {
    const previous = machineTotals.get(machineId) ?? {
      theoreticalCount: 0,
      constructedCount: 0,
    };
    machineTotals.set(machineId, {
      theoreticalCount: requireNonNegative(
        previous.theoreticalCount + count,
        "Le nombre de machines",
      ),
      constructedCount: requireNonNegative(
        previous.constructedCount + machineCounts(count).constructedCount,
        "Le nombre de machines construites",
      ),
    });
  }
  const requirements = [...machineTotals].map(([machineId, counts]) => ({
    machineId,
    ...counts,
    utilization: counts.constructedCount
      ? Math.min(1, counts.theoreticalCount / counts.constructedCount)
      : 0,
  }));
  const flowsFrom = (rates: Map<string, number>): ItemFlow[] =>
    [...rates].map(([itemId, ratePerMinute]) => ({ itemId, ratePerMinute }));
  const flows = flowsFrom(flowRates);
  const transportChecks = flows
    .filter((flow) => items.get(flow.itemId)!.transportable)
    .map((flow) => checkTransport(flow, conveyorCapacityPerMinute));
  return {
    fertilizerLoads: [...fertilizerLoads.values()],
    nurseryLoads: [...nurseryLoads.values()],
    upgrades,
    factorySpeedMultiplier,
    conveyorCapacityPerMinute,
    target: { ...request.target },
    root,
    machines: requirements,
    flows,
    externalInputs: flowsFrom(externalRates),
    heatingLoads: requirements.flatMap((requirement) => {
      const load = calculateHeatingLoad(
        machines.get(requirement.machineId)!,
        requirement,
        factorySpeedMultiplier,
      );
      return load ? [load] : [];
    }),
    transportChecks,
    warnings: transportChecks
      .filter((check) => check.exceedsSingleLine)
      .map((check) => ({
        code: "transport-capacity",
        itemId: check.itemId,
        message: "Ce débit dépasse la capacité d’une seule ligne de convoyeur.",
      })),
  };
}
