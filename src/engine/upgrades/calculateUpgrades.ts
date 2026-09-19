import { upgradeDefinitions } from "../../data/upgrades";
import type { UpgradeDefinition, UpgradeLevels } from "../../types/upgrades";
import { requireNonNegative, requirePositive } from "../../utils/numbers";

export function validateUpgradeLevel(level: number): number {
  if (!Number.isSafeInteger(level) || level < 0)
    throw new Error(
      "Le niveau doit être un entier positif ou nul représentable sans perte de précision.",
    );
  return level;
}
export function validateUpgradeLevels(levels: UpgradeLevels): UpgradeLevels {
  validateUpgradeLevel(levels.logisticsEfficiency);
  validateUpgradeLevel(levels.factoryEfficiency);
  validateUpgradeLevel(levels.fuelEfficiency);
  validateUpgradeLevel(levels.fertilizerEfficiency);
  return { ...levels };
}
function calculateEffect(level: number, definition: UpgradeDefinition): number {
  validateUpgradeLevel(level);
  requirePositive(definition.baseValue, "La valeur de base");
  requireNonNegative(definition.bonusPerLevel, "Le bonus par niveau");
  const threshold = definition.threshold ?? level;
  validateUpgradeLevel(threshold);
  const laterBonus = definition.bonusAfterThreshold ?? definition.bonusPerLevel;
  requireNonNegative(laterBonus, "Le bonus après le seuil");
  return requirePositive(
    definition.baseValue +
      Math.min(level, threshold) * definition.bonusPerLevel +
      Math.max(0, level - threshold) * laterBonus,
    "La valeur effective",
  );
}
export function getConveyorCapacity(
  level: number,
  definition = upgradeDefinitions.logisticsEfficiency,
): number {
  return calculateEffect(level, definition);
}
export function getFertilizerEfficiencyMultiplier(
  level: number,
  definition = upgradeDefinitions.fertilizerEfficiency,
): number {
  return calculateEffect(level, definition);
}
export function getFactorySpeedMultiplier(
  level: number,
  definition = upgradeDefinitions.factoryEfficiency,
): number {
  return calculateEffect(level, definition);
}
export function getFuelEfficiencyMultiplier(
  level: number,
  bonusPerLevel = upgradeDefinitions.fuelEfficiency.bonusPerLevel,
): number {
  return calculateEffect(level, {
    ...upgradeDefinitions.fuelEfficiency,
    bonusPerLevel,
  });
}
