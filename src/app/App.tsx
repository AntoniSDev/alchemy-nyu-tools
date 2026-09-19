import { useState } from "react";
import { ProductionPage } from "../features/production/ProductionPage";
import { HeatingPage } from "../features/heating/HeatingPage";
import type { ProductionResult } from "../types/production";

export function App() {
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
        <span className="badge">PROTO-002 · 1.0.x</span>
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
            onResultChange={setCurrentProduction}
            onConfigureHeating={importProduction}
          />
        </div>
        <div hidden={page !== "heating"}>
          <HeatingPage
            key={importVersion}
            initialLoads={importedProduction?.heatingLoads ?? []}
            imported={importedProduction !== null}
            canImport={currentProduction !== null}
            productionChanged={
              importedProduction !== null &&
              importedProduction !== currentProduction
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
