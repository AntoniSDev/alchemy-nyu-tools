import type { FieldValidation } from "../types/production";

export const formatNumber = (value: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4 }).format(value);
export const formatPercent = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
export function localizedName(entity: {
  nameFr: string | null;
  nameValidation: FieldValidation;
}) {
  return `${entity.nameFr ?? "Nom indisponible"}${entity.nameValidation.status === "verified" ? "" : " — FR À CONFIRMER"}`;
}
