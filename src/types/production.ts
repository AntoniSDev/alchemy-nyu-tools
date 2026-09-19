import type { UpgradeDefinitions, UpgradeLevels } from "./upgrades";
import type {
  FertilizerDefinition,
  FertilizerLoad,
  NurseryLoad,
} from "./agriculture";

export type ValidationStatus =
  "verified" | "unverified" | "conflict" | "obsolete";
export interface FieldValidation {
  status: ValidationStatus;
  evidenceIds: string[];
}
export interface Item {
  id: string;
  nameFr: string | null;
  nameValidation: FieldValidation;
  category: string;
  transportable: boolean;
}
export interface RecipeComponent {
  itemId: string;
  quantity: number;
  probability?: number;
}
export interface Recipe {
  id: string;
  machineId: string;
  inputs: RecipeComponent[];
  outputs: RecipeComponent[];
  cycleTimeSeconds?: number;
  nutrientCostPerOutput?: number;
  nutrientValidation?: FieldValidation;
}
export interface MachineHeatingRequirement {
  baseHeatPerSecond: number;
  placementUnits: number | null;
}
export interface Machine {
  id: string;
  nameFr: string | null;
  nameValidation: FieldValidation;
  heating?: MachineHeatingRequirement;
}
export interface ProductionDataset {
  fertilizers?: FertilizerDefinition[];
  upgrades?: UpgradeDefinitions;
  items: Item[];
  machines: Machine[];
  recipes: Recipe[];
  conveyorCapacityPerMinute: number;
}
export interface ProductionTarget {
  itemId: string;
  ratePerMinute: number;
}
export interface ProductionRequest {
  selectedFertilizerId?: string;
  upgrades?: UpgradeLevels;
  target: ProductionTarget;
  externalItemIds: string[];
}
export interface MachineRequirement {
  machineId: string;
  theoreticalCount: number;
  constructedCount: number;
  utilization: number;
}
export interface HeatingLoad extends MachineRequirement {
  factorySpeedMultiplier?: number;
  effectiveMachineHeatPerSecond?: number;
  productiveHeatPerSecond: number;
}
export interface ItemFlow {
  itemId: string;
  ratePerMinute: number;
}
export interface ProductionNode extends ItemFlow {
  recipeId: string | null;
  inputs: ProductionNode[];
}
export interface TransportFlowCheck extends ItemFlow {
  capacityPerLine: number;
  theoreticalLines: number;
  requiredLines: number;
  exceedsSingleLine: boolean;
}
export interface CalculationWarning {
  code:
    | "transport-capacity"
    | "CAPACITE_CHAUFFAGE_INSUFFISANTE"
    | "UNASSIGNED_HEATING_LOAD";
  itemId?: string;
  groupIndex?: number;
  message: string;
}
export interface ProductionResult {
  fertilizerLoads: FertilizerLoad[];
  nurseryLoads: NurseryLoad[];
  upgrades: UpgradeLevels;
  factorySpeedMultiplier: number;
  conveyorCapacityPerMinute: number;
  target: ProductionTarget;
  root: ProductionNode;
  machines: MachineRequirement[];
  flows: ItemFlow[];
  externalInputs: ItemFlow[];
  heatingLoads: HeatingLoad[];
  transportChecks: TransportFlowCheck[];
  warnings: CalculationWarning[];
}
