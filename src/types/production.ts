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
  cycleTimeSeconds: number;
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
  code: "transport-capacity";
  itemId: string;
  message: string;
}
export interface ProductionResult {
  target: ProductionTarget;
  root: ProductionNode;
  machines: MachineRequirement[];
  flows: ItemFlow[];
  externalInputs: ItemFlow[];
  heatingLoads: HeatingLoad[];
  transportChecks: TransportFlowCheck[];
  warnings: CalculationWarning[];
}
