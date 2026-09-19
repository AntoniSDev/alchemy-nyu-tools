import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  externalItemIds,
  prototypeDataset as dataset,
  targetItemIds,
} from "../../data/prototype";
import { calculateProduction } from "../../engine/production/calculateProduction";
import type {
  ProductionResult,
  ProductionTarget,
} from "../../types/production";
import type { UpgradeLevels } from "../../types/upgrades";
import { UpgradesPanel } from "./UpgradesPanel";
import { AgricultureResults } from "../agriculture/AgricultureResults";
import {
  formatNumber as number,
  formatPercent as percent,
  localizedName as label,
} from "../../utils/display";

const itemName = (id: string) =>
  label(dataset.items.find((item) => item.id === id)!);
const machineName = (id: string) =>
  label(dataset.machines.find((machine) => machine.id === id)!);

export function ProductionPage({
  upgrades,
  onUpgradeChange,
  onResultChange,
  onConfigureHeating,
}: {
  upgrades: UpgradeLevels;
  onUpgradeChange: (key: keyof UpgradeLevels, value: number) => void;
  onResultChange: (result: ProductionResult | null) => void;
  onConfigureHeating: (result: ProductionResult) => void;
}) {
  const [itemId, setItemId] = useState(targetItemIds[0]);
  const [rate, setRate] = useState("15");
  const [selectedFertilizerId, setSelectedFertilizerId] = useState(
    dataset.fertilizers![0].itemId,
  );
  const [target, setTarget] = useState<ProductionTarget | null>(null);
  const { result, error } = useMemo(() => {
    if (!target) return { result: null, error: "" };
    try {
      return {
        result: calculateProduction(dataset, {
          target,
          externalItemIds,
          upgrades,
          selectedFertilizerId,
        }),
        error: "",
      };
    } catch (caught) {
      return {
        result: null,
        error: caught instanceof Error ? caught.message : "Le calcul a échoué.",
      };
    }
  }, [target, upgrades, selectedFertilizerId]);
  function submit(event: FormEvent) {
    event.preventDefault();
    setTarget({ itemId, ratePerMinute: rate.trim() ? Number(rate) : NaN });
  }
  const stale =
    result &&
    (result.target.itemId !== itemId ||
      !rate.trim() ||
      result.target.ratePerMinute !== Number(rate));
  useEffect(() => {
    onResultChange(stale ? null : result);
  }, [result, stale, onResultChange]);
  const intermediateFlows =
    result?.flows.filter(
      (flow) =>
        flow.itemId !== result.target.itemId &&
        !result.externalInputs.some((input) => input.itemId === flow.itemId),
    ) ?? [];

  return (
    <section aria-label="Production">
      <div className="intro">
        <p className="eyebrow">ATELIER DE CALCUL</p>
        <h1>Planifier votre production</h1>
        <p>
          Des matières premières aux appareils nécessaires, dimensionnez une
          petite chaîne de production.
        </p>
      </div>
      <UpgradesPanel levels={upgrades} onChange={onUpgradeChange} />
      <form onSubmit={submit} className="panel form">
        <label>
          Produit à fabriquer
          <select
            value={itemId}
            onChange={(event) => {
              setItemId(event.target.value);
            }}
          >
            {targetItemIds.map((id) => (
              <option key={id} value={id}>
                {itemName(id)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Quantité par minute
          <input
            type="number"
            min="0"
            step="any"
            required
            value={rate}
            onChange={(event) => {
              setRate(event.target.value);
            }}
          />
        </label>
        <button type="submit">
          Calculer <span aria-hidden="true">→</span>
        </button>
      </form>
      <section className="panel fertilizer-selection">
        <label>
          Engrais pour les cultures
          <select
            value={selectedFertilizerId}
            onChange={(event) => setSelectedFertilizerId(event.target.value)}
          >
            {dataset.fertilizers!.map((fertilizer) => (
              <option key={fertilizer.itemId} value={fertilizer.itemId}>
                {itemName(fertilizer.itemId)}
              </option>
            ))}
          </select>
        </label>
        <p className="note">
          Ressource externe utilisée uniquement par les chaînes agricoles. Le
          choix actualise la chaîne calculée.
        </p>
      </section>
      <p className="note">
        Données des cahiers des charges du prototype. Les noms marqués « FR À
        CONFIRMER » restent à vérifier dans le jeu.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {stale && (
        <p className="notice" role="status">
          L’objectif a changé. Cliquez sur Calculer pour actualiser les
          résultats.
        </p>
      )}
      {!result && !error && (
        <section className="panel empty">
          <h2>Votre chaîne commence ici</h2>
          <p>Choisissez un produit et une cadence, puis lancez le calcul.</p>
          <p>
            Références : 15 petits engrenages/min ou 20 poudres de chaux
            vive/min.
          </p>
        </section>
      )}
      {result && (
        <div className="results" aria-live="polite">
          <section className="target">
            <div>
              <p className="eyebrow">PRODUCTION DEMANDÉE</p>
              <h2>{itemName(result.target.itemId)}</h2>
            </div>
            <strong>
              {number(result.target.ratePerMinute)} <small>objets/min</small>
            </strong>
          </section>
          {result.nurseryLoads.length > 0 && (
            <AgricultureResults result={result} />
          )}
          <section className="panel">
            <h2>Machines nécessaires</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Appareil</th>
                    <th>Quantité théorique</th>
                    <th>À construire</th>
                    <th>Utilisation moyenne</th>
                  </tr>
                </thead>
                <tbody>
                  {result.machines.map((machine) => (
                    <tr key={machine.machineId}>
                      <td>{machineName(machine.machineId)}</td>
                      <td>{number(machine.theoreticalCount)}</td>
                      <td>
                        <strong>{machine.constructedCount}</strong>
                      </td>
                      <td>{percent(machine.utilization)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="note">
              Les quantités à construire sont arrondies à l’entier supérieur.
              L’utilisation indique la part moyenne de fonctionnement.
            </p>
          </section>
          <div className="grid">
            <section className="panel">
              <h2>Entrées externes</h2>
              <p className="note">À fournir à la chaîne.</p>
              {result.externalInputs.map((flow) => (
                <div className="flow" key={flow.itemId}>
                  <span>{itemName(flow.itemId)}</span>
                  <strong>{number(flow.ratePerMinute)} /min</strong>
                </div>
              ))}
            </section>
            <section className="panel">
              <h2>Débits intermédiaires</h2>
              <p className="note">Produits puis consommés dans la chaîne.</p>
              {intermediateFlows.map((flow) => (
                <div className="flow" key={flow.itemId}>
                  <span>{itemName(flow.itemId)}</span>
                  <strong>{number(flow.ratePerMinute)} /min</strong>
                </div>
              ))}
            </section>
          </div>
          <section className="panel">
            <h2>Transport</h2>
            <p className="note">
              Capacité du convoyeur : {number(result.conveyorCapacityPerMinute)}{" "}
              objets/min par ligne. Contrôle de chaque flux, sans simulation de
              trajet.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Flux</th>
                    <th>Objets/min</th>
                    <th>Lignes théoriques</th>
                    <th>Lignes nécessaires</th>
                    <th>Une seule ligne</th>
                  </tr>
                </thead>
                <tbody>
                  {result.transportChecks.map((check) => (
                    <tr key={check.itemId}>
                      <td>{itemName(check.itemId)}</td>
                      <td>{number(check.ratePerMinute)}</td>
                      <td>{number(check.theoreticalLines)}</td>
                      <td>{check.requiredLines}</td>
                      <td
                        className={
                          check.exceedsSingleLine ? "warning" : "success"
                        }
                      >
                        {check.exceedsSingleLine
                          ? "Capacité dépassée"
                          : "Capacité suffisante"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel heating">
            <div className="section-heading">
              <h2>Chauffage</h2>
              <span className="badge">CHARGE PRODUCTIVE</span>
            </div>
            {result.heatingLoads.length === 0 ? (
              <p>Aucun chauffage nécessaire</p>
            ) : (
              <>
                <h3>Appareils à chauffer</h3>
                {result.heatingLoads.map((load) => (
                  <div key={load.machineId} className="heat-load">
                    <h3>{machineName(load.machineId)}</h3>
                    <dl>
                      <div>
                        <dt>Quantité construite</dt>
                        <dd>{load.constructedCount}</dd>
                      </div>
                      <div>
                        <dt>Équivalent en fonctionnement</dt>
                        <dd>{number(load.theoreticalCount)}</dd>
                      </div>
                      <div>
                        <dt>Taux d’utilisation</dt>
                        <dd>{percent(load.utilization)}</dd>
                      </div>
                      <div>
                        <dt>Besoin thermique productif</dt>
                        <dd className="heat-value">
                          {number(load.productiveHeatPerSecond)} P/s
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
                <p className="note">
                  La charge dépend de l’équivalent en fonctionnement, et non du
                  seul nombre d’appareils construits.
                </p>
              </>
            )}
            <button
              disabled={!!stale || result.heatingLoads.length === 0}
              onClick={() => onConfigureHeating(result)}
              className="secondary"
            >
              Configurer le chauffage
            </button>
            <p className="note">
              Transférer les appareils et leur charge productive vers le
              configurateur.
            </p>
          </section>
        </div>
      )}
    </section>
  );
}
