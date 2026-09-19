import type {
  FertilizerDefinition,
  FertilizerLoad,
  NurseryOutputRate,
} from "../../types/agriculture";
import { requirePositive, requireNonNegative } from "../../utils/numbers";

function validateFertilizer(fertilizer: FertilizerDefinition) {
  requirePositive(fertilizer.nutrientValue, "La valeur nutritive");
  requirePositive(fertilizer.maxNutrientRatePerSecond, "Le débit nutritif");
}
export function calculateNurseryOutputRate(
  fertilizer: FertilizerDefinition,
  nutrientCostPerOutput: number,
  factorySpeedMultiplier: number,
  conveyorCapacityPerMinute: number,
): NurseryOutputRate {
  validateFertilizer(fertilizer);
  requirePositive(nutrientCostPerOutput, "Le coût nutritif");
  requirePositive(factorySpeedMultiplier, "La vitesse usine");
  requirePositive(conveyorCapacityPerMinute, "La capacité du convoyeur");
  const factoryAdjustedRatePerMinute = requirePositive(
    (fertilizer.maxNutrientRatePerSecond / nutrientCostPerOutput) *
      60 *
      factorySpeedMultiplier,
    "Le débit agricole",
  );
  return {
    factoryAdjustedRatePerMinute,
    maximumOutputPerMinute: Math.min(
      factoryAdjustedRatePerMinute,
      conveyorCapacityPerMinute,
    ),
    isConveyorLimited: factoryAdjustedRatePerMinute > conveyorCapacityPerMinute,
  };
}
export function calculateFertilizerLoad(
  fertilizer: FertilizerDefinition,
  nutrientCostPerOutput: number,
  actualOutputRatePerMinute: number,
  fertilizerEfficiencyMultiplier: number,
): FertilizerLoad {
  validateFertilizer(fertilizer);
  requirePositive(nutrientCostPerOutput, "Le coût nutritif");
  requireNonNegative(
    actualOutputRatePerMinute,
    "La production agricole demandée",
  );
  requirePositive(fertilizerEfficiencyMultiplier, "L’efficacité de l’engrais");
  const nutrientPerMinute = requireNonNegative(
    actualOutputRatePerMinute * nutrientCostPerOutput,
    "Le besoin nutritif",
  );
  const effectiveNutrientValue = requirePositive(
    fertilizer.nutrientValue * fertilizerEfficiencyMultiplier,
    "La valeur nutritive effective",
  );
  return {
    fertilizerItemId: fertilizer.itemId,
    nutrientPerMinute,
    effectiveNutrientValue,
    fertilizerItemsPerMinute: requireNonNegative(
      nutrientPerMinute / effectiveNutrientValue,
      "La consommation d’engrais",
    ),
  };
}
