export type PaywallFeatureKey =
  | "details"
  | "auxSends"
  | "fxSends"
  | "dcaGroups"
  | "muteGroups"
  | "scenes"
  | "patching";

type FeatureMeta = { name: string; description: string };

const FEATURE_META: Record<PaywallFeatureKey, FeatureMeta> = {
  details:    { name: "Details",       description: "Ajuste EQ, dinâmica, envios e parâmetros avançados de cada canal." },
  auxSends:   { name: "Aux Sends",     description: "Envie para auxiliares com mais controle e flexibilidade." },
  fxSends:    { name: "FX Sends",      description: "Envie para FX com mais controle e flexibilidade." },
  dcaGroups:  { name: "DCA Groups",    description: "Controle grupos de canais com mais agilidade durante a operação ao vivo." },
  muteGroups: { name: "Mute Groups",   description: "Crie atalhos de mute para operar cenas, entradas e grupos com mais segurança." },
  scenes:     { name: "Scenes",        description: "Salve e recupere configurações da mesa para cultos, shows, ensaios e eventos." },
  patching:   { name: "Patching",      description: "Organize entradas, saídas e roteamentos com mais controle dentro do app." },
};

type UpgradeModalProps = {
  featureKey?: PaywallFeatureKey;
  canStartTrial: boolean;
  onUpgrade: () => void;
  onStartTrial: () => void;
  onClose: () => void;
};

function IconSparkle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 L13.5 9 L19.5 9 L14.7 13.2 L16.5 19.5 L12 16 L7.5 19.5 L9.3 13.2 L4.5 9 L10.5 9 Z" />
    </svg>
  );
}

export function UpgradeModal({ featureKey, canStartTrial, onUpgrade, onStartTrial, onClose }: UpgradeModalProps) {
  const feature = featureKey ? FEATURE_META[featureKey] : null;
  const featureName = feature?.name ?? "Este recurso";

  const title = `${featureName} está no Plus`;
  const bodyFree = canStartTrial
    ? "No Free, você pode usar o Mixer. Com o Plus, você libera o controle completo da mesa: Details, Aux/FX Sends, DCA, Mute Groups, Scenes e Patching."
    : "Seu teste gratuito já foi usado. Ative o Plus para voltar ao controle completo da mesa: Details, Aux/FX Sends, DCA, Mute Groups, Scenes e Patching.";

  return (
    <div
      className="upg-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="upg-card">
        <div className="upg-badge">
          <IconSparkle />
          AX Control+
        </div>

        <div className="upg-body">
          <h2 className="upg-heading">{title}</h2>
          <p className="upg-desc">{bodyFree}</p>
          {canStartTrial && (
            <p className="upg-trial-note">Teste grátis por 7 dias, sem cartão.</p>
          )}
        </div>

        <div className="upg-actions">
          {canStartTrial ? (
            <>
              <button type="button" className="upg-btn upg-btn--primary" onClick={onStartTrial}>
                Iniciar teste grátis
              </button>
              <button type="button" className="upg-btn upg-btn--secondary" onClick={onUpgrade}>
                Comprar agora
              </button>
            </>
          ) : (
            <button type="button" className="upg-btn upg-btn--primary" onClick={onUpgrade}>
              Ativar Plus
            </button>
          )}
          <button type="button" className="upg-btn upg-btn--ghost" onClick={onClose}>
            Continuar no Free
          </button>
        </div>
      </div>
    </div>
  );
}
