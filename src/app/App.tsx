import { useState } from "react";
import { ProductionPage } from "../features/production/ProductionPage";
import { HeatingPage } from "../features/heating/HeatingPage";
import type { ProductionResult } from "../types/production";
import type { UpgradeLevels } from "../types/upgrades";
import { defaultUpgradeLevels } from "../data/upgrades";

export function App() {
  const [upgrades, setUpgrades] = useState<UpgradeLevels>({
    ...defaultUpgradeLevels,
  });
  function changeUpgrade(key: keyof UpgradeLevels, value: number) {
    setUpgrades((previous) =>
      previous[key] === value ? previous : { ...previous, [key]: value },
    );
  }
  const [page, setPage] = useState<"production" | "heating">("production");
  const [currentProduction, setCurrentProduction] =
    useState<ProductionResult | null>(null);
  const [importedProduction, setImportedProduction] =
    useState<ProductionResult | null>(null);
  const [importVersion, setImportVersion] = useState(0);
  function importProduction(result: ProductionResult) {
    setImportedProduction(result);
    setImportVersion((version) => version + 1);
    setPage("heating");
  }
  return (
    <div className="shell">
      <header>
        <a className="brand" href="./">
          ALCHEMY <span>NYU TOOLS</span>
        </a>
        <span className="badge">PROTO-003 · 1.0.x</span>
      </header>
      <nav aria-label="Modules">
        <button
          aria-current={page === "production" ? "page" : undefined}
          onClick={() => setPage("production")}
        >
          Production
        </button>
        <button
          aria-current={page === "heating" ? "page" : undefined}
          onClick={() => setPage("heating")}
        >
          Chauffage
        </button>
      </nav>
      <main>
        <div hidden={page !== "production"}>
          <ProductionPage
            upgrades={upgrades}
            onUpgradeChange={changeUpgrade}
            onResultChange={setCurrentProduction}
            onConfigureHeating={importProduction}
          />
        </div>
        <div hidden={page !== "heating"}>
          <HeatingPage
            upgrades={upgrades}
            onUpgradeChange={changeUpgrade}
            importedFactoryLevel={
              importedProduction?.upgrades.factoryEfficiency ?? 0
            }
            key={importVersion}
            initialLoads={importedProduction?.heatingLoads ?? []}
            imported={importedProduction !== null}
            canImport={currentProduction !== null}
            productionChanged={
              importedProduction !== null &&
              (currentProduction === null ||
                importedProduction.target.itemId !==
                  currentProduction.target.itemId ||
                importedProduction.target.ratePerMinute !==
                  currentProduction.target.ratePerMinute ||
                importedProduction.upgrades.factoryEfficiency !==
                  currentProduction.upgrades.factoryEfficiency)
            }
            onImport={() => {
              if (currentProduction) importProduction(currentProduction);
            }}
          />
        </div>
      </main>
      <footer>
        Alchemy Factory · Outil de calcul indépendant · Prototype fonctionnel
      </footer>
    </div>
  );
}
