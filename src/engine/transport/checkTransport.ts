import type { ItemFlow, TransportFlowCheck } from "../../types/production";
import { requirePositive, tolerantCeil } from "../../utils/numbers";

export function checkTransport(
  flow: ItemFlow,
  capacityPerLine: number,
): TransportFlowCheck {
  requirePositive(capacityPerLine, "La capacité du convoyeur");
  const theoreticalLines = flow.ratePerMinute / capacityPerLine;
  const requiredLines = tolerantCeil(theoreticalLines);
  return {
    ...flow,
    capacityPerLine,
    theoreticalLines,
    requiredLines,
    exceedsSingleLine: requiredLines > 1,
  };
}
