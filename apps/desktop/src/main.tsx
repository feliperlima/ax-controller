import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { hydrate as hydrateSecureStore } from "./lib/secureStore";
import "./design-system/tokens/tokens.css";
import "./App.css";

function mount() {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

// Hidrata o store seguro (credenciais/PII) ANTES de renderizar, para que as
// leituras síncronas no boot já enxerguem o espelho em memória. Se falhar,
// monta mesmo assim (degrada para estado vazio, nunca tela morta).
hydrateSecureStore().catch(() => {}).finally(mount);
