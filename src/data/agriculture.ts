import type { FertilizerDefinition } from "../types/agriculture";
import type { Item } from "../types/production";

// PROTO-004 specification values; translations and values are not independently verified.
const unverified = { status: "unverified" as const, evidenceIds: [] };
export const fertilizers: FertilizerDefinition[] = [
  {
    itemId: "item.basic_fertilizer",
    nutrientValue: 144,
    maxNutrientRatePerSecond: 12,
    validation: unverified,
  },
  {
    itemId: "item.advanced_fertilizer",
    nutrientValue: 720,
    maxNutrientRatePerSecond: 144,
    validation: unverified,
  },
  {
    itemId: "item.growth_potion",
    nutrientValue: 6480,
    maxNutrientRatePerSecond: 2160,
    validation: unverified,
  },
  {
    itemId: "item.panacea",
    nutrientValue: 200000,
    maxNutrientRatePerSecond: 20000,
    validation: unverified,
  },
];
export const agricultureItems: Item[] = [
  {
    id: "item.flax",
    nameFr: "Lin",
    category: "plant",
    transportable: true,
    nameValidation: unverified,
  },
  {
    id: "item.flax_fiber",
    nameFr: "Fibre de lin",
    category: "material",
    transportable: true,
    nameValidation: unverified,
  },
  {
    id: "item.basic_fertilizer",
    nameFr: "Engrais basique",
    category: "fertilizer",
    transportable: true,
    nameValidation: unverified,
  },
  {
    id: "item.advanced_fertilizer",
    nameFr: "Engrais avancé",
    category: "fertilizer",
    transportable: true,
    nameValidation: unverified,
  },
  {
    id: "item.growth_potion",
    nameFr: "Potion de croissance",
    category: "fertilizer",
    transportable: true,
    nameValidation: unverified,
  },
  {
    id: "item.panacea",
    nameFr: "Panacée",
    category: "fertilizer",
    transportable: true,
    nameValidation: unverified,
  },
];
