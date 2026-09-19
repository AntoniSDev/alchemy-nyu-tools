import type { FieldValidation } from "./production";

export interface UpgradeLevels {
  logisticsEfficiency: number;
  factoryEfficiency: number;
  fuelEfficiency: number;
  fertilizerEfficiency: number;
}
export interface UpgradeDefinition {
  id: string;
  nameFr: string | null;
  effectType:
    "logistics" | "factory_speed" | "fuel_efficiency" | "fertilizer_efficiency";
  validation: FieldValidation;
  baseValue: number;
  bonusPerLevel: number;
  threshold?: number;
  bonusAfterThreshold?: number;
}
export type UpgradeDefinitions = Record<keyof UpgradeLevels, UpgradeDefinition>;
