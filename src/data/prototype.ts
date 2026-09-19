import type { FieldValidation, ProductionDataset } from "../types/production";

const unverified: FieldValidation = { status: "unverified", evidenceIds: [] };

// Values transcribed from the PROTO-001 specification, not independently verified in game.
export const prototypeDataset: ProductionDataset = {
  conveyorCapacityPerMinute: 60,
  items: [
    {
      id: "item.plank",
      nameFr: "Planche",
      category: "material",
      transportable: true,
      nameValidation: unverified,
    },
    {
      id: "item.large_wooden_gear",
      nameFr: "Grand engrenage en bois",
      category: "component",
      transportable: true,
      nameValidation: unverified,
    },
    {
      id: "item.small_wooden_gear",
      nameFr: "Petit engrenage en bois",
      category: "component",
      transportable: true,
      nameValidation: unverified,
    },
    {
      id: "item.stone",
      nameFr: "Pierre",
      category: "material",
      transportable: true,
      nameValidation: unverified,
    },
    {
      id: "item.quicklime",
      nameFr: "Chaux vive",
      category: "material",
      transportable: true,
      nameValidation: unverified,
    },
    {
      id: "item.quicklime_powder",
      nameFr: "Poudre de chaux vive",
      category: "material",
      transportable: true,
      nameValidation: unverified,
    },
  ],
  machines: [
    { id: "machine.grinder", nameFr: "Broyeur", nameValidation: unverified },
    {
      id: "machine.processor",
      nameFr: "Processeur",
      nameValidation: unverified,
    },
    {
      id: "machine.crucible",
      nameFr: "Creuset",
      nameValidation: unverified,
      heating: { baseHeatPerSecond: 4, placementUnits: 3 },
    },
  ],
  recipes: [
    {
      id: "recipe.large_wooden_gear",
      machineId: "machine.grinder",
      inputs: [{ itemId: "item.plank", quantity: 1 }],
      outputs: [{ itemId: "item.large_wooden_gear", quantity: 1 }],
      cycleTimeSeconds: 6,
    },
    {
      id: "recipe.small_wooden_gear",
      machineId: "machine.processor",
      inputs: [{ itemId: "item.large_wooden_gear", quantity: 1 }],
      outputs: [{ itemId: "item.small_wooden_gear", quantity: 3 }],
      cycleTimeSeconds: 12,
    },
    {
      id: "recipe.quicklime",
      machineId: "machine.crucible",
      inputs: [{ itemId: "item.stone", quantity: 1 }],
      outputs: [{ itemId: "item.quicklime", quantity: 1 }],
      cycleTimeSeconds: 9,
    },
    {
      id: "recipe.quicklime_powder",
      machineId: "machine.grinder",
      inputs: [{ itemId: "item.quicklime", quantity: 1 }],
      outputs: [{ itemId: "item.quicklime_powder", quantity: 1 }],
      cycleTimeSeconds: 9,
    },
  ],
};
export const externalItemIds = ["item.plank", "item.stone"];
export const targetItemIds = [
  "item.small_wooden_gear",
  "item.quicklime_powder",
];
