import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { hydrate as hydrateSecureStore } from "./lib/secureStore";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./design-system/tokens/tokens.css";
import "./design-system/components/components.css";
import "./App.css";

function mount() {
  const rootEl = document.getElementById("root") as HTMLElement;
  // DEV-only: galeria de variants do PlanCard via #gallery (não vai pra produção).
  if (import.meta.env.DEV && window.location.hash === "#gallery") {
    void import("./screens/settings/__PlanCardGallery").then(({ PlanCardGallery }) => {
      ReactDOM.createRoot(rootEl).render(<PlanCardGallery />);
    });
    return;
  }
  if (import.meta.env.DEV && window.location.hash === "#modals") {
    void import("./screens/__ModalsGallery").then(({ ModalsGallery }) => {
      ReactDOM.createRoot(rootEl).render(<ModalsGallery />);
    });
    return;
  }
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
      {/* Região de arraste da janela (titlebar overlay) — global, em qualquer tela. */}
      <div className="titlebar-drag" data-tauri-drag-region />
    </React.StrictMode>,
  );
}

// Hidrata o store seguro (credenciais/PII) ANTES de renderizar, para que as
// leituras síncronas no boot já enxerguem o espelho em memória. Se falhar,
// monta mesmo assim (degrada para estado vazio, nunca tela morta).
hydrateSecureStore().catch(() => {}).finally(mount);
