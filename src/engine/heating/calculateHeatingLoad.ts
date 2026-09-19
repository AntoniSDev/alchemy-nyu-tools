import type {
  HeatingLoad,
  Machine,
  MachineRequirement,
} from "../../types/production";
import { requireNonNegative, requirePositive } from "../../utils/numbers";

export function calculateHeatingLoad(
  machine: Machine,
  requirement: MachineRequirement,
  factorySpeedMultiplier = 1,
): HeatingLoad | null {
  if (!machine.heating) return null;
  const baseHeat = requireNonNegative(
    machine.heating.baseHeatPerSecond,
    "La chaleur de base",
  );
  requirePositive(factorySpeedMultiplier, "La vitesse usine");
  const effectiveMachineHeatPerSecond = requireNonNegative(
    baseHeat * factorySpeedMultiplier,
    "La chaleur instantanée",
  );
  return {
    ...requirement,
    factorySpeedMultiplier,
    effectiveMachineHeatPerSecond,
    productiveHeatPerSecond: requireNonNegative(
      requirement.theoreticalCount * effectiveMachineHeatPerSecond,
      "La charge thermique",
    ),
  };
}
