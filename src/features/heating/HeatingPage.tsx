import { useState, type FormEvent } from "react";
import { heatingDataset as dataset } from "../../data/heating";
import {
  calculateHeating,
  createManualHeatingLoad,
} from "../../engine/heating/calculateHeating";
import type { HeatingLoad } from "../../types/production";
import type { HeatingResult } from "../../types/heating";
import type { UpgradeLevels } from "../../types/upgrades";
import { UpgradeLevelInput } from "../../components/UpgradeLevelInput";
import { getFactorySpeedMultiplier } from "../../engine/upgrades/calculateUpgrades";
import {
  formatNumber as number,
  formatPercent as percent,
  localizedName,
} from "../../utils/display";

interface GroupDraft {
  generatorId: string;
  count: string;
  assignments: Record<string, string>;
}
function numericInput(value: string, label: string): number {
  if (!value.trim()) throw new Error(`Renseignez ${label}.`);
  return Number(value);
}

export function HeatingPage({
  upgrades,
  onUpgradeChange,
  importedFactoryLevel,
  initialLoads,
  imported,
  canImport,
  productionChanged,
  onImport,
}: {
  upgrades: UpgradeLevels;
  onUpgradeChange: (key: keyof UpgradeLevels, value: number) => void;
  importedFactoryLevel: number;
  initialLoads: HeatingLoad[];
  imported: boolean;
  canImport: boolean;
  productionChanged: boolean;
  onImport: () => void;
}) {
  const [savedLoads, setLoads] = useState<HeatingLoad[]>(() =>
    initialLoads.map((load) => ({ ...load })),
  );
  const [source, setSource] = useState(imported ? "production" : "manual");
  const [groups, setGroups] = useState<GroupDraft[]>([]);
  const [selectedFuelId, setSelectedFuelId] = useState("item.charcoal_powder");
  const [manualCount, setManualCount] = useState("1");
  const [manualActive, setManualActive] = useState("1");
  const [manualError, setManualError] = useState("");
  const machineName = (id: string) =>
    localizedName(dataset.machines.find((machine) => machine.id === id)!);

  function saveManual(event: FormEvent) {
    event.preventDefault();
    try {
      const load = createManualHeatingLoad(
        dataset,
        "machine.crucible",
        numericInput(manualCount, "la quantité construite"),
        numericInput(manualActive, "l’équivalent actif"),
        upgrades.factoryEfficiency,
      );
      setLoads([load]);
      setGroups((previous) =>
        previous.map((group) => ({ ...group, assignments: {} })),
      );
      setSource("manual");
      setManualError("");
    } catch (error) {
      setManualError(
        error instanceof Error ? error.message : "La saisie est invalide.",
      );
    }
  }
  function updateGroup(index: number, patch: Partial<GroupDraft>) {
    setGroups((previous) =>
      previous.map((group, current) =>
        current === index ? { ...group, ...patch } : group,
      ),
    );
  }
  let loads = savedLoads;
  let result: HeatingResult | null = null;
  let calculationError = "";
  try {
    if (source === "manual")
      loads = savedLoads.map((load) =>
        createManualHeatingLoad(
          dataset,
          load.machineId,
          load.constructedCount,
          load.theoreticalCount,
          upgrades.factoryEfficiency,
        ),
      );
    result = calculateHeating(dataset, {
      loads,
      selectedFuelId,
      fuelEfficiencyLevel: upgrades.fuelEfficiency,
      generatorGroups: groups.map((group) => ({
        generatorId: group.generatorId,
        count: numericInput(group.count, "la quantité de générateurs"),
        assignments: loads.map((load) => ({
          machineId: load.machineId,
          constructedCount: numericInput(
            group.assignments[load.machineId] ?? "0",
            "la quantité affectée",
          ),
        })),
      })),
    });
  } catch (error) {
    calculationError =
      error instanceof Error ? error.message : "Le calcul a échoué.";
  }

  return (
    <section aria-label="Chauffage">
      <div className="intro">
        <p className="eyebrow">CONFIGURATEUR DE CHAUFFAGE</p>
        <h1>Dimensionner votre chauffage</h1>
        <p>
          Choisissez vos générateurs, affectez vos appareils et estimez votre
          consommation de combustible.
        </p>
      </div>
      <div className="import-bar panel">
        <div>
          <strong>
            {source === "production"
              ? "Appareils importés depuis Production"
              : "Configuration manuelle"}
          </strong>
          <p className="note">
            L’import remplace les appareils et réinitialise les générateurs, les
            affectations et le combustible. Les niveaux globaux sont conservés.
            La navigation seule conserve votre configuration.
          </p>
        </div>
        <button onClick={onImport} disabled={!canImport}>
          Importer depuis la chaîne actuelle
        </button>
      </div>
      {!canImport && (
        <p className="note">
          Calculez une chaîne dans Production pour permettre son import.
        </p>
      )}
      {productionChanged && source === "production" && (
        <p className="notice" role="status">
          La chaîne Production a changé. Votre configuration conserve l’import
          précédent jusqu’à une réimportation explicite.
        </p>
      )}
      <div className="results">
        <section className="panel">
          <h2>Appareils à chauffer</h2>
          {source === "production" ? (
            <p className="note">
              Efficacité de l’usine importée : niveau {importedFactoryLevel} · ×
              {number(getFactorySpeedMultiplier(importedFactoryLevel))}. La
              vitesse est déjà incluse dans les charges ; elle n’est pas
              appliquée une seconde fois.
            </p>
          ) : (
            <UpgradeLevelInput
              label="Efficacité de l’usine"
              value={upgrades.factoryEfficiency}
              onChange={(value) => onUpgradeChange("factoryEfficiency", value)}
              effect={`Vitesse usine : ×${number(getFactorySpeedMultiplier(upgrades.factoryEfficiency))}`}
            />
          )}
          {loads.length === 0 ? (
            <p>
              Aucun appareil à chauffer. Ajoutez des creusets manuellement ou
              importez une chaîne.
            </p>
          ) : (
            loads.map((load) => (
              <div className="heat-load" key={load.machineId}>
                <h3>{machineName(load.machineId)}</h3>
                {load.effectiveMachineHeatPerSecond !== undefined && (
                  <p className="note">
                    Chaleur instantanée par appareil actif :{" "}
                    {number(load.effectiveMachineHeatPerSecond)} P/s
                  </p>
                )}
                <dl>
                  <div>
                    <dt>Quantité construite</dt>
                    <dd>{number(load.constructedCount)}</dd>
                  </div>
                  <div>
                    <dt>Équivalent actif</dt>
                    <dd>{number(load.theoreticalCount)}</dd>
                  </div>
                  <div>
                    <dt>Utilisation</dt>
                    <dd>{percent(load.utilization)}</dd>
                  </div>
                  <div>
                    <dt>Charge productive</dt>
                    <dd className="heat-value">
                      {number(load.productiveHeatPerSecond)} P/s
                    </dd>
                  </div>
                </dl>
              </div>
            ))
          )}
          <details open={loads.length === 0}>
            <summary>Saisir manuellement des creusets</summary>
            <p className="note">
              Cette saisie remplace les appareils actuels et remet leurs
              affectations à zéro.
            </p>
            <form className="form" onSubmit={saveManual}>
              <label>
                Quantité construite
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={manualCount}
                  onChange={(event) => setManualCount(event.target.value)}
                />
              </label>
              <label>
                Équivalent actif
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={manualActive}
                  onChange={(event) => setManualActive(event.target.value)}
                />
              </label>
              <button type="submit">Appliquer les appareils</button>
            </form>
            {manualError && (
              <p role="alert" className="error">
                {manualError}
              </p>
            )}
          </details>
        </section>
        <section className="panel">
          <h2>Générateurs et affectations</h2>
          <p className="note">
            Vous choisissez les quantités. Affectez chaque appareil une seule
            fois. Le placement utilise les appareils construits, même lorsqu’ils
            sont inactifs.
          </p>
          {groups.map((group, index) => (
            <fieldset key={index} className="generator-group">
              <legend>Groupe {index + 1}</legend>
              <div className="form">
                <label>
                  Générateur du groupe {index + 1}
                  <select
                    value={group.generatorId}
                    onChange={(event) =>
                      updateGroup(index, { generatorId: event.target.value })
                    }
                  >
                    {dataset.generators.map((generator) => (
                      <option key={generator.id} value={generator.id}>
                        {localizedName(generator)} ·{" "}
                        {generator.placementCapacity} unités
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Quantité de générateurs du groupe {index + 1}
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={group.count}
                    onChange={(event) =>
                      updateGroup(index, { count: event.target.value })
                    }
                  />
                </label>
                <button
                  className="secondary"
                  onClick={() =>
                    setGroups((previous) =>
                      previous.filter((_, current) => current !== index),
                    )
                  }
                >
                  Retirer le groupe {index + 1}
                </button>
              </div>
              {loads.map((load) => (
                <label className="assignment" key={load.machineId}>
                  {machineName(load.machineId)} — affectés au groupe {index + 1}
                  <input
                    type="number"
                    min="0"
                    max={load.constructedCount}
                    step="1"
                    value={group.assignments[load.machineId] ?? "0"}
                    onChange={(event) =>
                      updateGroup(index, {
                        assignments: {
                          ...group.assignments,
                          [load.machineId]: event.target.value,
                        },
                      })
                    }
                  />
                </label>
              ))}
            </fieldset>
          ))}
          <button
            className="secondary"
            onClick={() =>
              setGroups((previous) => [
                ...previous,
                {
                  generatorId: dataset.generators[0].id,
                  count: "0",
                  assignments: {},
                },
              ])
            }
          >
            Ajouter un groupe de générateurs
          </button>
          <p className="note">
            Capacités de 9 et 42 unités : données non vérifiées. Le contrôle
            porte sur la capacité cumulée du groupe, sans simulation de
            placement. Coût thermique propre des générateurs en 1.0 : 0 P/s.
          </p>
        </section>
        <section className="panel">
          <h2>Combustible et efficacité</h2>
          <div className="grid">
            <label>
              Combustible
              <select
                value={selectedFuelId}
                onChange={(event) => setSelectedFuelId(event.target.value)}
              >
                {dataset.fuels.map((fuel) => (
                  <option key={fuel.itemId} value={fuel.itemId}>
                    {localizedName(fuel)} · {number(fuel.baseHeatPerItem)}{" "}
                    P/objet
                  </option>
                ))}
              </select>
            </label>
            <UpgradeLevelInput
              label="Niveau d’efficacité du carburant"
              value={upgrades.fuelEfficiency}
              onChange={(value) => onUpgradeChange("fuelEfficiency", value)}
              effect="Niveau partagé avec Production."
            />
          </div>
          <p className="note">
            Formule candidate non vérifiée : +
            {percent(dataset.efficiency.bonusPerLevel)} par niveau, sans plafond
            défini.{" "}
            {result && (
              <>
                Multiplicateur : ×{number(result.fuelEfficiencyMultiplier)} (
                {percent(result.fuelEfficiencyMultiplier)}).
              </>
            )}
          </p>
        </section>
        <section className="panel" aria-live="polite">
          <h2>Résultat du chauffage</h2>
          {calculationError && (
            <p role="alert" className="error">
              {calculationError}
            </p>
          )}
          {result && (
            <>
              {result.warnings.map((warning, index) => (
                <p className="notice" role="status" key={index}>
                  {warning.groupIndex !== undefined
                    ? `Groupe ${warning.groupIndex + 1} — `
                    : ""}
                  {warning.message}
                </p>
              ))}
              {result.isConfigurationValid && (
                <p className="success">
                  {loads.length
                    ? "Configuration valide selon les capacités renseignées."
                    : "Aucun chauffage nécessaire."}
                </p>
              )}
              {!result.isConfigurationValid && (
                <p className="note">
                  La consommation ci-dessous est le besoin théorique de tous les
                  appareils ; la configuration doit être corrigée pour les
                  chauffer.
                </p>
              )}
              <dl className="heating-summary">
                <div>
                  <dt>Besoin thermique</dt>
                  <dd>{number(result.totalProductiveHeatPerSecond)} P/s</dd>
                </div>
                <div>
                  <dt>Valeur effective du combustible</dt>
                  <dd>{number(result.effectiveFuelHeatPerItem)} P/objet</dd>
                </div>
                <div>
                  <dt>Consommation</dt>
                  <dd className="heat-value">
                    {number(result.fuelConsumptionPerMinute)} /min
                  </dd>
                </div>
              </dl>
              {result.placementChecks.map((check) => (
                <div className="placement-result" key={check.groupIndex}>
                  <h3>
                    Groupe {check.groupIndex + 1} —{" "}
                    {localizedName(
                      dataset.generators.find(
                        (generator) => generator.id === check.generatorId,
                      )!,
                    )}
                  </h3>
                  <p>
                    Capacité utilisée :{" "}
                    <strong>
                      {number(check.requiredPlacement)} /{" "}
                      {number(check.availablePlacement)}
                    </strong>{" "}
                    unités · Capacité restante :{" "}
                    <strong>{number(check.remainingPlacement)}</strong> unités
                  </p>
                </div>
              ))}
            </>
          )}
        </section>
      </div>
    </section>
  );
}
