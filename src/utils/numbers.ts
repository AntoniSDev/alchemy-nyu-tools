export function requireNonNegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0)
    throw new Error(`${label} doit être un nombre fini positif ou nul.`);
  return value;
}
export function requirePositive(value: number, label: string): number {
  requireNonNegative(value, label);
  if (value === 0) throw new Error(`${label} doit être strictement positif.`);
  return value;
}
export function tolerantCeil(value: number): number {
  requireNonNegative(value, "La quantité");
  const nearest = Math.round(value);
  return nearest > 0 && Math.abs(value - nearest) <= 1e-10
    ? nearest
    : Math.ceil(value);
}
export function machineCounts(theoreticalCount: number) {
  const constructedCount = tolerantCeil(theoreticalCount);
  return {
    theoreticalCount,
    constructedCount,
    utilization:
      constructedCount === 0
        ? 0
        : Math.min(1, theoreticalCount / constructedCount),
  };
}
export function outputPerMinute(
  cycleTimeSeconds: number,
  outputQuantity: number,
): number {
  requirePositive(cycleTimeSeconds, "La durée du cycle");
  requirePositive(outputQuantity, "La quantité produite");
  return requirePositive(
    (60 / cycleTimeSeconds) * outputQuantity,
    "Le débit produit",
  );
}
