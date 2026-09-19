import type { UpgradeLevels } from "../../types/upgrades";
import { upgradeDefinitions } from "../../data/upgrades";
import {
  getConveyorCapacity,
  getFactorySpeedMultiplier,
  getFuelEfficiencyMultiplier,
  getFertilizerEfficiencyMultiplier,
} from "../../engine/upgrades/calculateUpgrades";
import { UpgradeLevelInput } from "../../components/UpgradeLevelInput";
import { formatNumber } from "../../utils/display";

export function UpgradesPanel({
  levels,
  onChange,
}: {
  levels: UpgradeLevels;
  onChange: (key: keyof UpgradeLevels, value: number) => void;
}) {
  const multiplier = (value: number) =>
    `×${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
  return (
    <section className="panel upgrades">
      <h2>Améliorations</h2>
      <div className="upgrade-grid">
        <UpgradeLevelInput
          label={upgradeDefinitions.fertilizerEfficiency.nameFr!}
          value={levels.fertilizerEfficiency}
          onChange={(value) => onChange("fertilizerEfficiency", value)}
          effect={multiplier(
            getFertilizerEfficiencyMultiplier(levels.fertilizerEfficiency),
          )}
        />
        <UpgradeLevelInput
          label={upgradeDefinitions.logisticsEfficiency.nameFr!}
          value={levels.logisticsEfficiency}
          onChange={(value) => onChange("logisticsEfficiency", value)}
          effect={`${formatNumber(getConveyorCapacity(levels.logisticsEfficiency))} objets/min`}
        />
        <UpgradeLevelInput
          label={upgradeDefinitions.factoryEfficiency.nameFr!}
          value={levels.factoryEfficiency}
          onChange={(value) => onChange("factoryEfficiency", value)}
          effect={multiplier(
            getFactorySpeedMultiplier(levels.factoryEfficiency),
          )}
        />
        <UpgradeLevelInput
          label={upgradeDefinitions.fuelEfficiency.nameFr!}
          value={levels.fuelEfficiency}
          onChange={(value) => onChange("fuelEfficiency", value)}
          effect={multiplier(
            getFuelEfficiencyMultiplier(levels.fuelEfficiency),
          )}
        />
      </div>
      <p className="note">
        Formules non vérifiées. Les niveaux valides actualisent les calculs.
        L’efficacité du carburant est partagée avec Chauffage.
      </p>
    </section>
  );
}
