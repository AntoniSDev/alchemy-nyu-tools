import type { FieldValidation, MachineRequirement } from "./production";

export interface FertilizerDefinition {
  itemId: string;
  nutrientValue: number;
  maxNutrientRatePerSecond: number;
  validation: FieldValidation;
}
export interface FertilizerLoad {
  fertilizerItemId: string;
  nutrientPerMinute: number;
  fertilizerItemsPerMinute: number;
  effectiveNutrientValue: number;
}
export interface NurseryOutputRate {
  factoryAdjustedRatePerMinute: number;
  maximumOutputPerMinute: number;
  isConveyorLimited: boolean;
}
export interface NurseryLoad extends MachineRequirement, NurseryOutputRate {
  recipeId: string;
  itemId: string;
  fertilizerItemId: string;
  outputRatePerMinute: number;
}
