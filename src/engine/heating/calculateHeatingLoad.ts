import type {
  HeatingLoad,
  Machine,
  MachineRequirement,
} from "../../types/production";
import { requireNonNegative } from "../../utils/numbers";

export function calculateHeatingLoad(
  machine: Machine,
  requirement: MachineRequirement,
): HeatingLoad | null {
  if (!machine.heating) return null;
  const baseHeat = requireNonNegative(
    machine.heating.baseHeatPerSecond,
    "La chaleur de base",
  );
  return {
    ...requirement,
    productiveHeatPerSecond: requireNonNegative(
      requirement.theoreticalCount * baseHeat,
      "La charge thermique",
    ),
  };
}
