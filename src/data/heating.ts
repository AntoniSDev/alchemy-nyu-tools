import { prototypeDataset } from "./prototype";
import { upgradeDefinitions } from "./upgrades";
import type { FieldValidation } from "../types/production";
import type { HeatingDataset } from "../types/heating";

const unverified: FieldValidation = {
  status: "unverified",
  evidenceIds: ["spec.proto002"],
};
export const heatingDataset: HeatingDataset = {
  machines: prototypeDataset.machines,
  evidence: [
    {
      id: "spec.proto002",
      description:
        "Cahier des charges PROTO-002 fourni par le propriétaire du projet : règle 1.0 retenue, sans vérification primaire indépendante des capacités ni de l’efficacité.",
    },
  ],
  generators: [
    {
      id: "heating_generator.stone_furnace",
      nameFr: "Four en pierre",
      nameValidation: unverified,
      placementCapacity: 9,
      baseHeatPerSecond: 0,
      placementValidation: unverified,
      baseHeatValidation: {
        status: "verified",
        evidenceIds: ["spec.proto002"],
      },
    },
    {
      id: "heating_generator.blast_furnace",
      nameFr: "Haut-fourneau",
      nameValidation: unverified,
      placementCapacity: 42,
      baseHeatPerSecond: 0,
      placementValidation: unverified,
      baseHeatValidation: {
        status: "verified",
        evidenceIds: ["spec.proto002"],
      },
    },
  ],
  fuels: [
    {
      itemId: "item.charcoal",
      nameFr: "Charbon de bois",
      baseHeatPerItem: 40,
      nameValidation: unverified,
    },
    {
      itemId: "item.charcoal_powder",
      nameFr: "Poudre de charbon de bois",
      baseHeatPerItem: 48,
      nameValidation: unverified,
    },
    {
      itemId: "item.coal",
      nameFr: "Charbon",
      baseHeatPerItem: 540,
      nameValidation: unverified,
    },
    {
      itemId: "item.coke",
      nameFr: "Coke",
      baseHeatPerItem: 600,
      nameValidation: unverified,
    },
    {
      itemId: "item.coke_powder",
      nameFr: "Poudre de coke",
      baseHeatPerItem: 660,
      nameValidation: unverified,
    },
    {
      itemId: "item.black_powder",
      nameFr: "Poudre noire",
      baseHeatPerItem: 6000,
      nameValidation: unverified,
    },
    {
      itemId: "item.explosive_potion",
      nameFr: "Potion explosive",
      baseHeatPerItem: 24000,
      nameValidation: unverified,
    },
    {
      itemId: "item.panacea",
      nameFr: "Panacée",
      baseHeatPerItem: 320000,
      nameValidation: unverified,
    },
  ],
  efficiency: upgradeDefinitions.fuelEfficiency,
};
