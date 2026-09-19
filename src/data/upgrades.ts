import type { UpgradeDefinitions, UpgradeLevels } from "../types/upgrades";

// Candidate rules transcribed from PROTO-003, without independent primary evidence.
export const upgradeDefinitions: UpgradeDefinitions = {
  logisticsEfficiency: {
    id: "upgrade.logistics_efficiency",
    nameFr: "Logistique",
    effectType: "logistics",
    validation: { status: "unverified", evidenceIds: [] },
    baseValue: 60,
    bonusPerLevel: 15,
    threshold: 12,
    bonusAfterThreshold: 3,
  },
  factoryEfficiency: {
    id: "upgrade.factory_efficiency",
    nameFr: "Efficacité de l’usine",
    effectType: "factory_speed",
    validation: { status: "unverified", evidenceIds: [] },
    baseValue: 1,
    bonusPerLevel: 0.25,
    threshold: 12,
    bonusAfterThreshold: 0.05,
  },
  fuelEfficiency: {
    id: "upgrade.fuel_efficiency",
    nameFr: "Efficacité du carburant",
    effectType: "fuel_efficiency",
    validation: { status: "unverified", evidenceIds: [] },
    baseValue: 1,
    bonusPerLevel: 0.1,
  },
};
export const defaultUpgradeLevels: Readonly<UpgradeLevels> = {
  logisticsEfficiency: 0,
  factoryEfficiency: 0,
  fuelEfficiency: 0,
};
