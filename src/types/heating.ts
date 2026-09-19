import type {
  CalculationWarning,
  FieldValidation,
  HeatingLoad,
  Machine,
} from "./production";

export interface HeatingGenerator {
  id: string;
  nameFr: string | null;
  nameValidation: FieldValidation;
  placementCapacity: number;
  baseHeatPerSecond: number;
  placementValidation: FieldValidation;
  baseHeatValidation: FieldValidation;
}
export interface Fuel {
  itemId: string;
  nameFr: string | null;
  nameValidation: FieldValidation;
  baseHeatPerItem: number;
}
export interface HeatingDataset {
  machines: Machine[];
  generators: HeatingGenerator[];
  fuels: Fuel[];
  efficiency: { bonusPerLevel: number; validation: FieldValidation };
  evidence: { id: string; description: string }[];
}
// Loads are the sole source of productive heat. Assignments only allocate physical devices.
export interface HeatingAssignment {
  machineId: string;
  constructedCount: number;
}
export interface HeatingGeneratorGroup {
  generatorId: string;
  count: number;
  assignments: HeatingAssignment[];
}
export interface HeatingRequest {
  loads: HeatingLoad[];
  generatorGroups: HeatingGeneratorGroup[];
  selectedFuelId: string;
  fuelEfficiencyLevel: number;
}
export interface PlacementCheck {
  groupIndex: number;
  generatorId: string;
  requiredPlacement: number;
  availablePlacement: number;
  remainingPlacement: number;
  isOverCapacity: boolean;
}
export interface HeatingResult {
  totalProductiveHeatPerSecond: number;
  fuelEfficiencyMultiplier: number;
  effectiveFuelHeatPerItem: number;
  fuelConsumptionPerMinute: number;
  placementChecks: PlacementCheck[];
  warnings: CalculationWarning[];
  isConfigurationValid: boolean;
}
