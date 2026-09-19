import type { HeatingLoad, CalculationWarning } from "../../types/production";
import type {
  HeatingDataset,
  HeatingRequest,
  HeatingResult,
} from "../../types/heating";
import { requireNonNegative, requirePositive } from "../../utils/numbers";

export function requireCount(value: number, label: string): number {
  requireNonNegative(value, label);
  if (!Number.isSafeInteger(value))
    throw new Error(
      `${label} doit être un entier représentable sans perte de précision.`,
    );
  return value;
}

function heatingMachine(dataset: HeatingDataset, machineId: string) {
  const machine = dataset.machines.find((entry) => entry.id === machineId);
  if (!machine?.heating) throw new Error("Appareil chauffé inconnu.");
  return machine;
}

export function createManualHeatingLoad(
  dataset: HeatingDataset,
  machineId: string,
  constructedCount: number,
  theoreticalCount: number,
): HeatingLoad {
  requireCount(constructedCount, "La quantité construite");
  requireNonNegative(theoreticalCount, "L’équivalent actif");
  if (theoreticalCount > constructedCount)
    throw new Error(
      "L’équivalent actif ne peut pas dépasser la quantité construite.",
    );
  const machine = heatingMachine(dataset, machineId);
  const baseHeat = requireNonNegative(
    machine.heating!.baseHeatPerSecond,
    "La chaleur de base",
  );
  return {
    machineId,
    constructedCount,
    theoreticalCount,
    utilization: constructedCount ? theoreticalCount / constructedCount : 0,
    productiveHeatPerSecond: requireNonNegative(
      theoreticalCount * baseHeat,
      "La charge productive",
    ),
  };
}

export function calculateHeating(
  dataset: HeatingDataset,
  request: HeatingRequest,
): HeatingResult {
  const loads = new Map<string, HeatingLoad>();
  const placementUnits = new Map<string, number>();
  let totalProductiveHeatPerSecond = 0;
  for (const load of request.loads) {
    if (loads.has(load.machineId))
      throw new Error("Un appareil apparaît plusieurs fois dans les charges.");
    const machine = heatingMachine(dataset, load.machineId);
    requireCount(load.constructedCount, "La quantité construite");
    requireNonNegative(load.theoreticalCount, "L’équivalent actif");
    requireNonNegative(load.productiveHeatPerSecond, "La charge productive");
    requireNonNegative(load.utilization, "L’utilisation");
    const expectedUtilization = load.constructedCount
      ? load.theoreticalCount / load.constructedCount
      : 0;
    if (
      load.theoreticalCount > load.constructedCount + 1e-10 ||
      load.utilization > 1 ||
      Math.abs(load.utilization - expectedUtilization) > 1e-10 ||
      (load.theoreticalCount === 0 && load.productiveHeatPerSecond !== 0)
    ) {
      throw new Error(
        "La charge importée contient une quantité, une utilisation ou une chaleur incohérente.",
      );
    }
    const units = machine.heating!.placementUnits;
    if (units === null)
      throw new Error(
        "Les unités de placement de cet appareil sont inconnues.",
      );
    placementUnits.set(
      load.machineId,
      requirePositive(units, "Les unités de placement"),
    );
    loads.set(load.machineId, load);
    totalProductiveHeatPerSecond = requireNonNegative(
      totalProductiveHeatPerSecond + load.productiveHeatPerSecond,
      "La chaleur totale",
    );
  }

  const assignedCounts = new Map<string, number>();
  const warnings: CalculationWarning[] = [];
  const placementChecks = request.generatorGroups.map((group, groupIndex) => {
    const generator = dataset.generators.find(
      (entry) => entry.id === group.generatorId,
    );
    if (!generator) throw new Error("Générateur inconnu.");
    requireCount(group.count, "La quantité de générateurs");
    requirePositive(generator.placementCapacity, "La capacité de placement");
    if (generator.baseHeatPerSecond !== 0)
      throw new Error(
        "La règle 1.0 exige un coût thermique propre nul pour ces générateurs.",
      );
    const availablePlacement = requireNonNegative(
      group.count * generator.placementCapacity,
      "La capacité disponible",
    );
    let requiredPlacement = 0;
    for (const assignment of group.assignments) {
      const load = loads.get(assignment.machineId);
      if (!load)
        throw new Error(
          "Une affectation référence un appareil absent des charges.",
        );
      requireCount(assignment.constructedCount, "La quantité affectée");
      const assigned = requireCount(
        (assignedCounts.get(assignment.machineId) ?? 0) +
          assignment.constructedCount,
        "La quantité affectée totale",
      );
      if (assigned > load.constructedCount)
        throw new Error(
          "Trop d’appareils affectés : un appareil ne peut pas être compté dans plusieurs groupes.",
        );
      assignedCounts.set(assignment.machineId, assigned);
      requiredPlacement = requireNonNegative(
        requiredPlacement +
          assignment.constructedCount *
            placementUnits.get(assignment.machineId)!,
        "Le placement requis",
      );
    }
    const isOverCapacity = requiredPlacement > availablePlacement;
    if (isOverCapacity)
      warnings.push({
        code: "CAPACITE_CHAUFFAGE_INSUFFISANTE",
        groupIndex,
        message:
          "Configuration impossible : la capacité de chauffage sélectionnée est insuffisante.",
      });
    return {
      groupIndex,
      generatorId: generator.id,
      requiredPlacement,
      availablePlacement,
      remainingPlacement: availablePlacement - requiredPlacement,
      isOverCapacity,
    };
  });
  for (const load of loads.values()) {
    if ((assignedCounts.get(load.machineId) ?? 0) < load.constructedCount)
      warnings.push({
        code: "UNASSIGNED_HEATING_LOAD",
        message:
          "Configuration incomplète : des appareils restent à affecter à un générateur.",
      });
  }

  const fuel = dataset.fuels.find(
    (entry) => entry.itemId === request.selectedFuelId,
  );
  if (!fuel) throw new Error("Combustible inconnu.");
  requirePositive(fuel.baseHeatPerItem, "La valeur du combustible");
  requireCount(request.fuelEfficiencyLevel, "Le niveau d’efficacité");
  requireNonNegative(dataset.efficiency.bonusPerLevel, "Le bonus d’efficacité");
  const fuelEfficiencyMultiplier = requirePositive(
    1 + request.fuelEfficiencyLevel * dataset.efficiency.bonusPerLevel,
    "Le multiplicateur d’efficacité",
  );
  const effectiveFuelHeatPerItem = requirePositive(
    fuel.baseHeatPerItem * fuelEfficiencyMultiplier,
    "La valeur effective du combustible",
  );
  const fuelConsumptionPerMinute = requireNonNegative(
    (totalProductiveHeatPerSecond * 60) / effectiveFuelHeatPerItem,
    "La consommation",
  );
  return {
    totalProductiveHeatPerSecond,
    fuelEfficiencyMultiplier,
    effectiveFuelHeatPerItem,
    fuelConsumptionPerMinute,
    placementChecks,
    warnings,
    isConfigurationValid: warnings.length === 0,
  };
}
