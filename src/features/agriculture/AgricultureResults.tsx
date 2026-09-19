import type { ProductionResult } from "../../types/production";
import { prototypeDataset as dataset } from "../../data/prototype";
import {
  formatNumber as number,
  formatPercent as percent,
  localizedName,
} from "../../utils/display";

export function AgricultureResults({ result }: { result: ProductionResult }) {
  return (
    <section className="panel">
      <h2>Agriculture</h2>
      {result.nurseryLoads.map((load) => (
        <div className="heat-load" key={load.recipeId}>
          <h3>
            {localizedName(
              dataset.machines.find(
                (machine) => machine.id === load.machineId,
              )!,
            )}{" "}
            —{" "}
            {localizedName(
              dataset.items.find((item) => item.id === load.itemId)!,
            )}
          </h3>
          <dl>
            <div>
              <dt>Quantité théorique</dt>
              <dd>{number(load.theoreticalCount)}</dd>
            </div>
            <div>
              <dt>Quantité à construire</dt>
              <dd>{load.constructedCount}</dd>
            </div>
            <div>
              <dt>Utilisation</dt>
              <dd>{percent(load.utilization)}</dd>
            </div>
            <div>
              <dt>Production demandée</dt>
              <dd>{number(load.outputRatePerMinute)} /min</dd>
            </div>
          </dl>
          <p>
            Débit avant convoyeur : {number(load.factoryAdjustedRatePerMinute)}{" "}
            /min · Maximum par pépinière :{" "}
            <strong>{number(load.maximumOutputPerMinute)} /min</strong>
          </p>
          {load.isConveyorLimited && (
            <p className="warning">
              Débit de la pépinière plafonné par le convoyeur.
            </p>
          )}
        </div>
      ))}
      {result.fertilizerLoads.map((load) => {
        const fertilizer = dataset.fertilizers!.find(
          (entry) => entry.itemId === load.fertilizerItemId,
        )!;
        return (
          <div key={load.fertilizerItemId}>
            <h3>
              Engrais sélectionné :{" "}
              {localizedName(
                dataset.items.find(
                  (item) => item.id === load.fertilizerItemId,
                )!,
              )}
            </h3>
            <dl>
              <div>
                <dt>Valeur nutritive de base</dt>
                <dd>{number(fertilizer.nutrientValue)} V/objet</dd>
              </div>
              <div>
                <dt>Valeur nutritive effective</dt>
                <dd>{number(load.effectiveNutrientValue)} V/objet</dd>
              </div>
              <div>
                <dt>Débit nutritif maximal de base</dt>
                <dd>{number(fertilizer.maxNutrientRatePerSecond)} V/s</dd>
              </div>
              <div>
                <dt>Consommation d’engrais</dt>
                <dd>{number(load.fertilizerItemsPerMinute)} /min</dd>
              </div>
            </dl>
            <p>
              Besoin nutritif réel :{" "}
              <strong>{number(load.nutrientPerMinute)} V/min</strong>
            </p>
          </div>
        );
      })}
      <p className="note">
        Données et formule non vérifiées. L’efficacité de l’engrais augmente sa
        valeur nutritive, sans augmenter son débit maximal. Les engrais sont
        fournis de l’extérieur.
      </p>
    </section>
  );
}
