import React from "react";
import ReactDOM from "react-dom/client";
import { ProductionPage } from "../features/production/ProductionPage";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ProductionPage />
  </React.StrictMode>,
);
